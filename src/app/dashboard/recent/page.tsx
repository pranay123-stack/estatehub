import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { propertyCardSelect } from "@/lib/queries/properties";
import { PropertyGrid } from "@/components/property/property-grid";
import { ButtonLink, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function RecentlyViewedPage() {
  const user = await requireUser("/dashboard/recent");

  const [recent, favorites] = await Promise.all([
    prisma.recentView.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: "desc" },
      take: 24, // a browsing history, not an archive
      select: { property: { select: propertyCardSelect } },
    }),
    prisma.favorite.findMany({ where: { userId: user.id }, select: { propertyId: true } }),
  ]);

  const favoriteIds = new Set(favorites.map((favorite) => favorite.propertyId));

  return (
    <div>
      <SectionHeading
        title="Recently viewed"
        description="The last 24 properties you opened, most recent first."
      />

      {recent.length > 0 ? (
        <PropertyGrid
          properties={recent.map((row) => row.property)}
          favoriteIds={favoriteIds}
          columns={2}
        />
      ) : (
        <EmptyState
          title="No viewing history yet"
          description="Open a property listing and it will appear here."
          action={<ButtonLink href="/properties">Browse properties</ButtonLink>}
        />
      )}
    </div>
  );
}
