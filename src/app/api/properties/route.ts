import { randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { SELLER_ROLES } from "@/lib/auth/guards";
import { authedWithRole, handler, ok } from "@/lib/api";
import { propertyInputSchema, searchParamsSchema } from "@/lib/validation/property";
import { searchProperties } from "@/lib/queries/properties";
import { slugify } from "@/lib/format";

/**
 * GET /api/properties — public JSON search.
 * The website itself renders results server-side; this exists for external
 * consumers (a future mobile app) and reuses the exact same query builder.
 */
export const GET = handler(async (request: Request) => {
  const url = new URL(request.url);
  const params = searchParamsSchema.parse(Object.fromEntries(url.searchParams));
  return ok(await searchProperties(params));
});

/** POST /api/properties — create a listing (owners, agents, admins). */
export const POST = handler(async (request: Request) => {
  const user = await authedWithRole(SELLER_ROLES);
  const input = propertyInputSchema.parse(await request.json());

  const property = await prisma.property.create({
    data: {
      ownerId: user.id,
      slug: slugify(`${input.title}-${input.locality}-${input.city}`, randomBytes(3).toString("hex")),
      title: input.title,
      description: input.description,
      type: input.type,
      listingType: input.listingType,
      price: input.price,
      // Deposit only makes sense on rentals; drop it silently on sale listings.
      deposit: input.listingType === "RENT" ? (input.deposit ?? null) : null,
      city: input.city,
      locality: input.locality,
      address: input.address || null,
      pincode: input.pincode || null,
      // Bedroom/bathroom counts are meaningless for plots and commercial units.
      bedrooms: input.type === "PLOT" || input.type === "COMMERCIAL" ? 0 : input.bedrooms,
      bathrooms: input.type === "PLOT" ? 0 : input.bathrooms,
      areaSqft: input.areaSqft,
      furnishing: input.furnishing || null,
      floor: input.floor || null,
      ageYears: input.ageYears ?? null,
      amenities: input.amenities,
      contactName: input.contactName,
      contactPhone: input.contactPhone,
      contactEmail: input.contactEmail || null,
      // Admins publish directly; everyone else queues for moderation.
      status: user.role === "ADMIN" ? "APPROVED" : "PENDING",
      images: {
        create: input.images.map((image, index) => ({
          url: image.url,
          storageKey: image.storageKey ?? null,
          alt: image.alt ?? input.title,
          sortOrder: index,
        })),
      },
    },
    select: { id: true, slug: true, status: true },
  });

  return ok({ property }, 201);
});
