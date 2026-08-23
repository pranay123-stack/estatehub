import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { SELLER_ROLES, requireRole } from "@/lib/auth/guards";
import { formatRelative } from "@/lib/format";
import { ButtonLink, Card, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function EnquiriesPage() {
  const user = await requireRole(SELLER_ROLES, "/dashboard/enquiries");

  const enquiries = await prisma.enquiry.findMany({
    // Scoped through the relation, so a seller can only ever read enquiries on
    // their own listings.
    where: user.role === "ADMIN" ? {} : { property: { ownerId: user.id } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { property: { select: { title: true, slug: true, city: true } } },
  });

  return (
    <div>
      <SectionHeading
        title="Enquiries received"
        description="Buyers who asked about your listings. Reply directly by phone or email."
      />

      {enquiries.length > 0 ? (
        <div className="space-y-3">
          {enquiries.map((enquiry) => (
            <Card key={enquiry.id} className="p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">{enquiry.name}</p>
                  <p className="text-sm text-muted">
                    <a href={`mailto:${enquiry.email}`} className="hover:text-brand-700">
                      {enquiry.email}
                    </a>
                    {" · "}
                    <a href={`tel:${enquiry.phone}`} className="hover:text-brand-700">
                      {enquiry.phone}
                    </a>
                  </p>
                </div>
                <span className="shrink-0 text-xs text-muted">{formatRelative(enquiry.createdAt)}</span>
              </div>

              <p className="mt-3 rounded-lg bg-slate-50 px-3 py-2.5 text-sm text-slate-700">
                {enquiry.message}
              </p>

              <p className="mt-2.5 text-xs text-muted">
                About{" "}
                <Link
                  href={`/properties/${enquiry.property.slug}`}
                  className="font-medium text-brand-700 hover:underline"
                >
                  {enquiry.property.title}
                </Link>{" "}
                · {enquiry.property.city}
              </p>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="No enquiries yet"
          description="Once your listings are live, buyer enquiries land here with their contact details."
          action={<ButtonLink href="/dashboard/listings">View my listings</ButtonLink>}
        />
      )}
    </div>
  );
}
