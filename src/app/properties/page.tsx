import type { Metadata } from "next";
import { Suspense } from "react";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth/guards";
import { countProperties, searchProperties } from "@/lib/queries/properties";
import { searchParamsSchema, type PropertySearchParams } from "@/lib/validation/property";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { PropertyFilters } from "@/components/property/property-filters";
import { ResultsToolbar } from "@/components/property/results-toolbar";
import { PropertyGrid } from "@/components/property/property-grid";
import { Pagination } from "@/components/property/pagination";
import { ResultsSkeleton } from "@/components/property/results-skeleton";
import { ButtonLink, EmptyState } from "@/components/ui";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** Flattens Next's `string | string[]` params into the flat shape Zod expects. */
function flatten(raw: Record<string, string | string[] | undefined>): Record<string, string> {
  const flat: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const single = Array.isArray(value) ? value[0] : value;
    if (single) flat[key] = single;
  }
  return flat;
}

/** Search pages get a descriptive, filter-aware title for SEO. */
export async function generateMetadata({ searchParams }: PageProps): Promise<Metadata> {
  const params = searchParamsSchema.parse(flatten(await searchParams));

  const parts = [
    params.type ? PROPERTY_TYPE_LABELS[params.type] : "Property",
    params.listingType ? LISTING_TYPE_LABELS[params.listingType].toLowerCase() : "for sale and rent",
    params.city ? `in ${params.city}` : "in India",
  ];

  const title = parts.join(" ");
  return {
    title,
    description: `Browse ${title.toLowerCase()} on EstateHub. Filter by budget, bedrooms and property type, and contact owners directly.`,
    // Filtered permutations are near-duplicates — point crawlers at the canonical list.
    alternates: { canonical: "/properties" },
  };
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const raw = flatten(await searchParams);
  const params = searchParamsSchema.parse(raw);
  const layout = raw.view === "list" ? "list" : "grid";

  // Only the count is awaited up front — it drives the heading and the filter
  // badge. The result cards stream in behind a Suspense boundary below.
  const total = await countProperties(params);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
          {params.city ? `Property in ${params.city}` : "All properties"}
        </h1>
        <p className="mt-1 text-sm text-muted">
          {total.toLocaleString("en-IN")} listings match your search
          {params.q && (
            <>
              {" for "}
              <strong className="text-ink">&ldquo;{params.q}&rdquo;</strong>
            </>
          )}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
        {/* Filters read from useSearchParams, which requires a Suspense boundary
            so the rest of the page can stream while they hydrate. */}
        <Suspense fallback={<div className="h-96 rounded-card border border-line bg-white" />}>
          <PropertyFilters resultCount={total} />
        </Suspense>

        <div>
          <Suspense fallback={<div className="mb-5 h-9" />}>
            <ResultsToolbar total={total} layout={layout} />
          </Suspense>

          {/* Keyed on the query string so changing a filter shows the skeleton
              again instead of holding the previous results on screen. */}
          <Suspense key={JSON.stringify(raw)} fallback={<ResultsSkeleton />}>
            <Results params={params} raw={raw} layout={layout} />
          </Suspense>
        </div>
      </div>
    </div>
  );
}

/** Streamed results: the actual page query plus the viewer's saved-property ids. */
async function Results({
  params,
  raw,
  layout,
}: {
  params: PropertySearchParams;
  raw: Record<string, string>;
  layout: "grid" | "list";
}) {
  const user = await getCurrentUser();
  const [results, favorites] = await Promise.all([
    searchProperties(params),
    user
      ? prisma.favorite.findMany({ where: { userId: user.id }, select: { propertyId: true } })
      : Promise.resolve([]),
  ]);

  const favoriteIds = new Set(favorites.map((favorite) => favorite.propertyId));

  if (results.items.length === 0) {
    return (
      <EmptyState
        icon={
          <svg viewBox="0 0 24 24" fill="none" className="h-12 w-12" aria-hidden="true">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5" />
            <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        }
        title="No properties match these filters"
        description="Try widening your budget, removing the bedroom filter, or searching a different city."
        action={
          <ButtonLink href="/properties" variant="secondary">
            Clear all filters
          </ButtonLink>
        }
      />
    );
  }

  return (
    <>
      <PropertyGrid properties={results.items} favoriteIds={favoriteIds} layout={layout} />
      <Pagination page={results.page} pageCount={results.pageCount} searchParams={raw} />
    </>
  );
}
