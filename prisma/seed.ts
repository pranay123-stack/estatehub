/**
 * Seeds demo users and 20 property listings.
 *
 * Photos come from public/seed, which is committed, so this runs offline and
 * needs no image host — the listings render the same locally and on Vercel.
 *
 * Run with: npm run db:seed
 *
 * Idempotent — users are upserted and properties are matched on their
 * deterministic slug, so running it twice will not create duplicates.
 */
import "dotenv/config";
import { access } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { SEED_PROPERTIES, type SeedProperty } from "./seed-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

const DEMO_PASSWORD = "Password123";

/**
 * Demo photos live in public/seed and are committed to the repository, so they
 * are served as ordinary static assets everywhere the app runs — including
 * Vercel, which needs no object store for them.
 *
 * They deliberately do NOT go through the storage driver. That path is for
 * runtime user uploads, which have a different lifecycle: they are written
 * after the build, so they cannot live in public/ and need real object storage
 * in production. Conflating the two is what previously left every seeded
 * listing with a broken image.
 */
const SEED_PHOTO_DIR = path.join(process.cwd(), "public", "seed");

async function seedPhotoUrl(photoId: string): Promise<string | null> {
  const filename = `${photoId}.jpg`;
  try {
    await access(path.join(SEED_PHOTO_DIR, filename));
    return `/seed/${filename}`;
  } catch {
    // Missing asset: the card falls back to its placeholder graphic rather
    // than the seed failing outright.
    return null;
  }
}

/** Deterministic slug so re-seeding updates rather than duplicates. */
function seedSlug(property: SeedProperty, index: number): string {
  const base = `${property.title}-${property.locality}-${property.city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return `${base}-s${String(index).padStart(2, "0")}`;
}

async function main() {
  console.log("Seeding EstateHub…");

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  // `admin` is created but not referenced again — the array position is skipped.
  const [, owner, agent, buyer] = await Promise.all([
    prisma.user.upsert({
      where: { email: "admin@estatehub.in" },
      update: {},
      create: {
        name: "Aarti Desai",
        email: "admin@estatehub.in",
        passwordHash,
        phone: "+91 98200 10001",
        role: "ADMIN",
      },
    }),
    prisma.user.upsert({
      where: { email: "owner@estatehub.in" },
      update: {},
      create: {
        name: "Rohan Mehta",
        email: "owner@estatehub.in",
        passwordHash,
        phone: "+91 98200 10002",
        role: "OWNER",
      },
    }),
    prisma.user.upsert({
      where: { email: "agent@estatehub.in" },
      update: {},
      create: {
        name: "Priya Nair",
        email: "agent@estatehub.in",
        passwordHash,
        phone: "+91 98200 10003",
        role: "AGENT",
      },
    }),
    prisma.user.upsert({
      where: { email: "buyer@estatehub.in" },
      update: {},
      create: {
        name: "Karan Malhotra",
        email: "buyer@estatehub.in",
        passwordHash,
        phone: "+91 98200 10004",
        role: "BUYER",
      },
    }),
  ]);

  console.log("  ✓ 4 demo users");

  const ownersByKey = { owner, agent };
  let created = 0;

  for (const [index, item] of SEED_PROPERTIES.entries()) {
    const slug = seedSlug(item, index);

    const urls = (await Promise.all(item.photos.map(seedPhotoUrl))).filter(
      (url): url is string => url !== null,
    );

    const data = {
      ownerId: ownersByKey[item.owner].id,
      title: item.title,
      description: item.description,
      type: item.type,
      listingType: item.listingType,
      price: item.price,
      deposit: item.listingType === "RENT" ? (item.deposit ?? null) : null,
      city: item.city,
      locality: item.locality,
      address: item.address ?? null,
      pincode: item.pincode ?? null,
      bedrooms: item.bedrooms,
      bathrooms: item.bathrooms,
      areaSqft: item.areaSqft,
      furnishing: item.furnishing ?? null,
      floor: item.floor ?? null,
      ageYears: item.ageYears ?? null,
      amenities: item.amenities,
      contactName: ownersByKey[item.owner].name,
      contactPhone: ownersByKey[item.owner].phone ?? "+91 98200 10000",
      contactEmail: ownersByKey[item.owner].email,
      // Seeded listings are pre-approved so the site has content immediately.
      status: "APPROVED" as const,
      featured: item.featured ?? false,
      // A plausible spread of view counts, derived from the index so re-runs
      // produce identical data.
      views: 40 + index * 17,
    };

    const images = urls.map((url, order) => ({ url, alt: item.title, sortOrder: order }));

    await prisma.property.upsert({
      where: { slug },
      // Replace the gallery on re-seed. Without deleteMany the update path left
      // stale image rows behind, so a changed URL never took effect.
      update: { ...data, images: { deleteMany: {}, create: images } },
      create: { ...data, slug, images: { create: images } },
    });

    created += 1;
    process.stdout.write(`\r  … ${created}/${SEED_PROPERTIES.length} listings`);
  }

  console.log(`\n  ✓ ${created} listings (${SEED_PROPERTIES.filter((p) => p.featured).length} featured)`);

  // Give the demo buyer a couple of saved properties so the dashboard isn't empty.
  const firstTwo = await prisma.property.findMany({ take: 2, orderBy: { createdAt: "asc" }, select: { id: true } });
  for (const property of firstTwo) {
    await prisma.favorite.upsert({
      where: { userId_propertyId: { userId: buyer.id, propertyId: property.id } },
      update: {},
      create: { userId: buyer.id, propertyId: property.id },
    });
  }

  console.log("  ✓ sample favourites for buyer@estatehub.in");
  console.log(`\nDone. Sign in with any demo account using password: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
