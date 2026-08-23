import { prisma } from "@/lib/prisma";
import { SELLER_ROLES, requireRole } from "@/lib/auth/guards";
import { PropertyForm } from "@/components/dashboard/property-form";
import { emptyPropertyForm } from "@/components/dashboard/property-form-values";
import { SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function NewListingPage() {
  const user = await requireRole(SELLER_ROLES, "/dashboard/listings/new");

  // Prefill the contact block from the seller's profile — nobody wants to retype
  // their own phone number on every listing.
  const profile = await prisma.user.findUnique({
    where: { id: user.id },
    select: { name: true, email: true, phone: true },
  });

  return (
    <div>
      <SectionHeading
        title="Post a property"
        description="Fill in the details below. Your listing goes live once an admin approves it."
      />

      <PropertyForm
        mode="create"
        initialValues={{
          ...emptyPropertyForm,
          contactName: profile?.name ?? "",
          contactPhone: profile?.phone ?? "",
          contactEmail: profile?.email ?? "",
        }}
      />
    </div>
  );
}
