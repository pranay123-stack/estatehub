/**
 * Seeds demo users and 20 property listings.
 *
 * Run with: npm run db:seed
 *
 * Idempotent — users are upserted and properties are matched on their
 * deterministic slug, so running it twice will not create duplicates.
 */
import "dotenv/config";
import { mkdir, writeFile, access } from "node:fs/promises";
import path from "node:path";
import bcrypt from "bcryptjs";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { localUploadDir } from "../src/lib/storage/local";
import { SEED_PROPERTIES, type SeedProperty } from "./seed-data";

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

// Resolved by the storage driver itself rather than hardcoded, so seeding
// honours LOCAL_UPLOAD_DIR. Hardcoding it meant the E2E environment (which
// points that variable elsewhere) served 404s for every seeded photo.
const UPLOAD_DIR = localUploadDir();
const DEMO_PASSWORD = "Password123";

/**
 * Downloads a demo photo into storage/uploads once, and returns the URL that
 * /api/files serves it from.
 * If the network is unavailable the seed still succeeds — the listing simply
 * renders with the card's placeholder graphic.
 */
async function fetchPhoto(photoId: string): Promise<string | null> {
  const filename = `seed-${photoId}.jpg`;
  const target = path.join(UPLOAD_DIR, filename);

  // Already downloaded on a previous run.
  try {
    await access(target);
    return `/api/files/${filename}`;
  } catch {
    // not cached yet — fall through and download
  }

  try {
    const response = await fetch(
      `https://images.unsplash.com/photo-${photoId}?auto=format&fit=crop&w=1200&q=70`,
      { signal: AbortSignal.timeout(20_000) },
    );
    if (!response.ok) return null;

    await writeFile(target, Buffer.from(await response.arrayBuffer()));
    return `/api/files/${filename}`;
  } catch {
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
  await mkdir(UPLOAD_DIR, { recursive: true });

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

    // Photos are fetched sequentially per listing to stay polite to the CDN.
    const urls: string[] = [];
    for (const photoId of item.photos) {
      const url = await fetchPhoto(photoId);
      if (url) urls.push(url);
    }

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

    await prisma.property.upsert({
      where: { slug },
      update: data,
      create: {
        ...data,
        slug,
        images: {
          create: urls.map((url, order) => ({ url, alt: item.title, sortOrder: order })),
        },
      },
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
