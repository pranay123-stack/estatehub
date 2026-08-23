import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth/guards";
import { propertyCardSelect } from "@/lib/queries/properties";
import { PropertyGrid } from "@/components/property/property-grid";
import { ButtonLink, EmptyState, SectionHeading } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function SavedPropertiesPage() {
  const user = await requireUser("/dashboard/saved");

  const saved = await prisma.favorite.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    select: { propertyId: true, property: { select: propertyCardSelect } },
  });

  // Everything on this page is saved by definition, so all hearts render filled.
  const favoriteIds = new Set(saved.map((row) => row.propertyId));

  return (
    <div>
      <SectionHeading
        title="Saved properties"
        description="Shortlisted listings, newest first. Unsaving one removes it from this list."
      />

      {saved.length > 0 ? (
        <PropertyGrid
          properties={saved.map((row) => row.property)}
          favoriteIds={favoriteIds}
          columns={2}
        />
      ) : (
        <EmptyState
          icon={
            <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" aria-hidden="true">
              <path
                d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5c0 5.15-7 9.5-7 9.5Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          }
          title="No saved properties yet"
          description="Tap the heart on any listing to shortlist it and compare later."
          action={<ButtonLink href="/properties">Browse properties</ButtonLink>}
        />
      )}
    </div>
  );
}
