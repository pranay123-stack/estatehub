import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { StatCard } from "@/components/dashboard/stat-card";
import { PropertyGrid } from "@/components/property/property-grid";
import { propertyCardSelect } from "@/lib/queries/properties";
import { Alert, ButtonLink, Card, EmptyState, SectionHeading } from "@/components/ui";

/** Dashboards are per-user and must never be cached across requests. */
export const dynamic = "force-dynamic";

export default async function DashboardOverviewPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireUser();
  // Set by requireRole() when someone lands on a page their role can't access.
  const { error } = await searchParams;
  const isSeller = user.role !== "BUYER";
  const isAdmin = user.role === "ADMIN";

  const [savedCount, viewedCount, listingCounts, enquiryCount, pendingCount, userCount, recent] =
    await Promise.all([
      prisma.favorite.count({ where: { userId: user.id } }),
      prisma.recentView.count({ where: { userId: user.id } }),
      isSeller
        ? prisma.property.groupBy({
            by: ["status"],
            where: { ownerId: user.id },
            _count: { _all: true },
          })
        : Promise.resolve([]),
      isSeller
        ? prisma.enquiry.count({ where: { property: { ownerId: user.id } } })
        : Promise.resolve(0),
      isAdmin ? prisma.property.count({ where: { status: "PENDING" } }) : Promise.resolve(0),
      isAdmin ? prisma.user.count() : Promise.resolve(0),
      prisma.recentView.findMany({
        where: { userId: user.id },
        orderBy: { viewedAt: "desc" },
        take: 3,
        select: { property: { select: propertyCardSelect } },
      }),
    ]);

  const byStatus = new Map(listingCounts.map((row) => [row.status, row._count._all]));
  const liveListings = byStatus.get("APPROVED") ?? 0;
  const pendingListings = byStatus.get("PENDING") ?? 0;

  return (
    <div className="space-y-8">
      {error === "forbidden" && (
        <Alert>Your account does not have access to that page.</Alert>
      )}

      <section>
        <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">
          At a glance
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Saved properties" value={savedCount} href="/dashboard/saved" />
          <StatCard label="Recently viewed" value={viewedCount} href="/dashboard/recent" />

          {isSeller && (
            <>
              <StatCard label="Live listings" value={liveListings} href="/dashboard/listings" tone="success" />
              <StatCard
                label="Awaiting approval"
                value={pendingListings}
                href="/dashboard/listings"
                tone={pendingListings > 0 ? "warning" : "neutral"}
              />
              <StatCard label="Enquiries received" value={enquiryCount} href="/dashboard/enquiries" />
            </>
          )}

          {isAdmin && (
            <>
              <StatCard
                label="Pending moderation"
                value={pendingCount}
                href="/dashboard/admin"
                tone={pendingCount > 0 ? "warning" : "neutral"}
              />
              <StatCard label="Registered users" value={userCount} href="/dashboard/admin/users" />
            </>
          )}
        </div>
      </section>

      {isSeller && pendingListings > 0 && (
        <Card className="border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-medium text-amber-900">
            You have {pendingListings} listing{pendingListings === 1 ? "" : "s"} awaiting admin
            approval. They will go live automatically once reviewed.
          </p>
        </Card>
      )}

      <section>
        <SectionHeading
          title="Recently viewed"
          description="Pick up where you left off."
          action={
            recent.length > 0 ? (
              <ButtonLink href="/dashboard/recent" variant="secondary" size="sm">
                View all
              </ButtonLink>
            ) : undefined
          }
        />

        {recent.length > 0 ? (
          <PropertyGrid properties={recent.map((row) => row.property)} />
        ) : (
          <EmptyState
            title="Nothing viewed yet"
            description="Properties you open will show up here so you can find them again."
            action={<ButtonLink href="/properties">Browse properties</ButtonLink>}
          />
        )}
      </section>
    </div>
  );
}
