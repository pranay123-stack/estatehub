import { prisma } from "@/lib/prisma";
import { SELLER_ROLES, requireRole } from "@/lib/auth/guards";
import { ListingRow } from "@/components/dashboard/listing-row";
import { Alert, ButtonLink, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MyListingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const user = await requireRole(SELLER_ROLES, "/dashboard/listings");
  const { saved } = await searchParams;

  const listings = await prisma.property.findMany({
    // Admins see the whole catalogue here; owners and agents see only their own.
    where: user.role === "ADMIN" ? {} : { ownerId: user.id },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      slug: true,
      title: true,
      type: true,
      listingType: true,
      price: true,
      city: true,
      locality: true,
      areaSqft: true,
      status: true,
      views: true,
      rejectionReason: true,
      createdAt: true,
      images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
      _count: { select: { enquiries: true } },
    },
  });

  return (
    <div className="space-y-4">
      <SectionHeading
        title={user.role === "ADMIN" ? "All listings" : "My listings"}
        description={`${listings.length} ${listings.length === 1 ? "listing" : "listings"} total.`}
        action={<ButtonLink href="/dashboard/listings/new">Add new property</ButtonLink>}
      />

      {saved && <Alert tone="success">Listing saved.</Alert>}

      {listings.length > 0 ? (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ListingRow key={listing.id} listing={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          title="You haven't listed anything yet"
          description="Post your first property — it takes about five minutes and costs nothing."
          action={<ButtonLink href="/dashboard/listings/new">Post a property</ButtonLink>}
        />
      )}
    </div>
  );
}
