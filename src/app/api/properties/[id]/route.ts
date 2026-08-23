import { prisma } from "@/lib/prisma";
import { ApiError, authed, handler, ok } from "@/lib/api";
import { propertyInputSchema } from "@/lib/validation/property";
import { getStorage } from "@/lib/storage";

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Loads a listing and asserts the caller may modify it.
 * Owners may touch only their own; admins may touch any.
 */
async function loadEditable(id: string, user: { id: string; role: string }) {
  const property = await prisma.property.findUnique({
    where: { id },
    include: { images: true },
  });

  if (!property) throw new ApiError("Listing not found.", 404);
  if (property.ownerId !== user.id && user.role !== "ADMIN") {
    throw new ApiError("You can only manage your own listings.", 403);
  }
  return property;
}

/** PATCH /api/properties/:id — full replace of the editable fields. */
export const PATCH = handler(async (request: Request, context: RouteContext) => {
  const user = await authed();
  const { id } = await context.params;
  const existing = await loadEditable(id, user);

  const input = propertyInputSchema.parse(await request.json());

  const keptUrls = new Set(input.images.map((image) => image.url));
  const removed = existing.images.filter((image) => !keptUrls.has(image.url));

  const property = await prisma.$transaction(async (tx) => {
    // Gallery is replaced wholesale: simpler and safe, because the client always
    // submits the complete desired ordering.
    await tx.propertyImage.deleteMany({ where: { propertyId: id } });

    return tx.property.update({
      where: { id },
      data: {
        title: input.title,
        description: input.description,
        type: input.type,
        listingType: input.listingType,
        price: input.price,
        deposit: input.listingType === "RENT" ? (input.deposit ?? null) : null,
        city: input.city,
        locality: input.locality,
        address: input.address || null,
        pincode: input.pincode || null,
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
        // Any owner edit re-enters the moderation queue; admin edits stay live.
        ...(user.role === "ADMIN"
          ? {}
          : { status: "PENDING" as const, rejectionReason: null }),
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
  });

  // Blob cleanup happens after the transaction commits — a failed CDN delete
  // must never roll back a successful edit.
  const storage = getStorage();
  await Promise.all(
    removed.filter((image) => image.storageKey).map((image) => storage.remove(image.storageKey!)),
  );

  return ok({ property });
});

/** DELETE /api/properties/:id */
export const DELETE = handler(async (_request: Request, context: RouteContext) => {
  const user = await authed();
  const { id } = await context.params;
  const existing = await loadEditable(id, user);

  // Cascades wipe images, favourites, views and enquiries (see schema).
  await prisma.property.delete({ where: { id } });

  const storage = getStorage();
  await Promise.all(
    existing.images.filter((image) => image.storageKey).map((image) => storage.remove(image.storageKey!)),
  );

  return ok({ deleted: true });
});
