import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth/guards";
import { ModerationRow } from "@/components/dashboard/moderation-row";
import { STATUS_LABELS } from "@/lib/constants";
import { EmptyState, SectionHeading } from "@/components/ui";
import type { ListingStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const TABS: { status: ListingStatus | "ALL"; label: string }[] = [
  { status: "PENDING", label: "Pending" },
  { status: "APPROVED", label: "Live" },
  { status: "REJECTED", label: "Rejected" },
  { status: "ALL", label: "All" },
];

export default async function AdminModerationPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requireRole(["ADMIN"], "/dashboard/admin");

  const { status } = await searchParams;
  const active = TABS.find((tab) => tab.status === status)?.status ?? "PENDING";

  const [listings, counts] = await Promise.all([
    prisma.property.findMany({
      where: active === "ALL" ? {} : { status: active },
      orderBy: { createdAt: "desc" },
      take: 50,
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
        featured: true,
        createdAt: true,
        images: { select: { url: true }, orderBy: { sortOrder: "asc" }, take: 1 },
        owner: { select: { name: true, email: true, role: true } },
      },
    }),
    prisma.property.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const countByStatus = new Map(counts.map((row) => [row.status, row._count._all]));
  const total = counts.reduce((sum, row) => sum + row._count._all, 0);

  return (
    <div>
      <SectionHeading
        title="Moderation queue"
        description="Approve genuine listings, reject incomplete ones with a reason, and delete spam."
      />

      <div className="no-scrollbar mb-4 flex gap-1.5 overflow-x-auto border-b border-line pb-px">
        {TABS.map((tab) => {
          const count = tab.status === "ALL" ? total : (countByStatus.get(tab.status) ?? 0);
          const isActive = tab.status === active;
          return (
            <Link
              key={tab.status}
              href={`/dashboard/admin?status=${tab.status}`}
              className={
                "shrink-0 rounded-t-lg border-b-2 px-3.5 py-2 text-sm font-medium transition-colors " +
                (isActive
                  ? "border-brand-700 text-brand-800"
                  : "border-transparent text-slate-600 hover:text-ink")
              }
            >
              {tab.label}
              <span className="ml-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600">
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {listings.length > 0 ? (
        <div className="space-y-3">
          {listings.map((listing) => (
            <ModerationRow key={listing.id} item={listing} />
          ))}
        </div>
      ) : (
        <EmptyState
          title={active === "PENDING" ? "Queue is clear" : `No ${STATUS_LABELS[active as ListingStatus] ?? ""} listings`}
          description={
            active === "PENDING"
              ? "Every submitted listing has been reviewed. New submissions will appear here."
              : "Nothing to show for this filter."
          }
        />
      )}
    </div>
  );
}
