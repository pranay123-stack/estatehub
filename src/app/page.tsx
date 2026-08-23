import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/guards";
import { getCityCounts, getFeaturedProperties } from "@/lib/queries/properties";
import { Hero } from "@/components/home/hero";
import { ValueProps } from "@/components/home/value-props";
import { PopularCities } from "@/components/home/popular-cities";
import { Cta } from "@/components/home/cta";
import { PropertyGrid } from "@/components/property/property-grid";
import { ButtonLink, EmptyState, SectionHeading } from "@/components/ui";

/**
 * Landing page.
 *
 * Rendered per-request rather than statically generated, because it reads the
 * session cookie to pre-fill the saved-property hearts. If personalisation is
 * ever dropped, adding `export const revalidate = 3600` here makes the whole
 * page ISR-cached — the queries below are already shaped for it.
 */

export default async function HomePage() {
  const user = await getCurrentUser();

  // Independent reads run concurrently — one round-trip of latency, not four.
  const [featured, cityCounts, listingCount, favorites] = await Promise.all([
    getFeaturedProperties(6),
    getCityCounts(),
    prisma.property.count({ where: { status: "APPROVED" } }),
    user
      ? prisma.favorite.findMany({ where: { userId: user.id }, select: { propertyId: true } })
      : Promise.resolve([]),
  ]);

  const favoriteIds = new Set(favorites.map((favorite) => favorite.propertyId));

  return (
    <>
      <Hero stats={{ listings: listingCount, cities: cityCounts.length || 8 }} />
      <ValueProps />

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow="Handpicked"
          title="Featured properties"
          description="Listings our team has verified and highlighted this week."
          action={
            <ButtonLink href="/properties" variant="secondary">
              View all properties
            </ButtonLink>
          }
        />

        {featured.length > 0 ? (
          <PropertyGrid properties={featured} favoriteIds={favoriteIds} />
        ) : (
          <EmptyState
            title="No listings yet"
            description="Run the seed script or post the first property to see it here."
            action={<ButtonLink href="/dashboard/listings/new">Post a property</ButtonLink>}
          />
        )}
      </section>

      <div className="bg-white">
        <PopularCities counts={cityCounts} />
      </div>

      <div className="pt-14">
        <Cta />
      </div>
    </>
  );
}
