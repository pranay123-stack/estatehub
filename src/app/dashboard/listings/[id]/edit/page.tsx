import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SELLER_ROLES, requireRole } from "@/lib/auth/guards";
import { PropertyForm } from "@/components/dashboard/property-form";
import { SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EditListingPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireRole(SELLER_ROLES, "/dashboard/listings");
  const { id } = await params;

  const property = await prisma.property.findUnique({
    where: { id },
    include: { images: { orderBy: { sortOrder: "asc" } } },
  });

  // 404 rather than 403 for someone else's listing — no reason to confirm it exists.
  if (!property) notFound();
  if (property.ownerId !== user.id && user.role !== "ADMIN") notFound();

  return (
    <div>
      <SectionHeading
        title="Edit listing"
        description="Changes are re-reviewed by an admin before the listing goes live again."
      />

      <PropertyForm
        mode="edit"
        initialValues={{
          id: property.id,
          title: property.title,
          description: property.description,
          type: property.type,
          listingType: property.listingType,
          // The form works in strings because every input is a string; the API
          // coerces back to numbers via Zod.
          price: String(property.price),
          deposit: property.deposit === null ? "" : String(property.deposit),
          city: property.city,
          locality: property.locality,
          address: property.address ?? "",
          pincode: property.pincode ?? "",
          bedrooms: String(property.bedrooms),
          bathrooms: String(property.bathrooms),
          areaSqft: String(property.areaSqft),
          furnishing: property.furnishing ?? "",
          floor: property.floor ?? "",
          ageYears: property.ageYears === null ? "" : String(property.ageYears),
          amenities: property.amenities,
          contactName: property.contactName,
          contactPhone: property.contactPhone,
          contactEmail: property.contactEmail ?? "",
          images: property.images.map((image) => ({
            url: image.url,
            storageKey: image.storageKey,
            alt: image.alt,
          })),
        }}
      />
    </div>
  );
}
