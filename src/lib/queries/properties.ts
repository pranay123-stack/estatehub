import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE } from "@/lib/constants";
import type { PropertySearchParams } from "@/lib/validation/property";

/**
 * The shape every listing card needs. Declared once with `satisfies` so the
 * card component's props stay in sync with the query automatically.
 */
export const propertyCardSelect = {
  id: true,
  slug: true,
  title: true,
  type: true,
  listingType: true,
  price: true,
  city: true,
  locality: true,
  bedrooms: true,
  bathrooms: true,
  areaSqft: true,
  status: true,
  featured: true,
  createdAt: true,
  images: {
    select: { url: true, alt: true },
    orderBy: { sortOrder: "asc" },
    take: 1, // cover image only — the grid never shows the rest
  },
} satisfies Prisma.PropertySelect;

export type PropertyCardData = Prisma.PropertyGetPayload<{
  select: typeof propertyCardSelect;
}>;

/**
 * Translates validated search params into a Prisma filter.
 * `status: APPROVED` is hard-coded here rather than passed in, so no public
 * caller can accidentally surface unmoderated listings.
 */
function buildWhere(params: PropertySearchParams): Prisma.PropertyWhereInput {
  const where: Prisma.PropertyWhereInput = { status: "APPROVED" };

  if (params.city) where.city = { equals: params.city, mode: "insensitive" };
  if (params.type) where.type = params.type;
  if (params.listingType) where.listingType = params.listingType;

  // Bedrooms filter is a floor, not an exact match ("3+ BHK").
  if (params.bedrooms !== undefined) where.bedrooms = { gte: params.bedrooms };

  if (params.minPrice !== undefined || params.maxPrice !== undefined) {
    where.price = {
      ...(params.minPrice !== undefined ? { gte: params.minPrice } : {}),
      ...(params.maxPrice !== undefined ? { lte: params.maxPrice } : {}),
    };
  }

  // Free-text search across the fields a buyer would actually type into.
  // Postgres ILIKE is enough at MVP scale; swap for tsvector/pg_trgm when the
  // table outgrows a sequential scan.
  if (params.q) {
    where.OR = [
      { title: { contains: params.q, mode: "insensitive" } },
      { locality: { contains: params.q, mode: "insensitive" } },
      { city: { contains: params.q, mode: "insensitive" } },
      { address: { contains: params.q, mode: "insensitive" } },
    ];
  }

  return where;
}

function buildOrderBy(sort: PropertySearchParams["sort"]): Prisma.PropertyOrderByWithRelationInput[] {
  switch (sort) {
    case "price_asc":
      return [{ price: "asc" }, { createdAt: "desc" }];
    case "price_desc":
      return [{ price: "desc" }, { createdAt: "desc" }];
    default:
      return [{ createdAt: "desc" }];
  }
}

export type SearchResult = {
  items: PropertyCardData[];
  total: number;
  page: number;
  pageCount: number;
};

/** Paginated public search. Count and page run in one round-trip. */
export async function searchProperties(params: PropertySearchParams): Promise<SearchResult> {
  const where = buildWhere(params);
  const page = Math.max(1, params.page);

  const [items, total] = await prisma.$transaction([
    prisma.property.findMany({
      where,
      select: propertyCardSelect,
      orderBy: buildOrderBy(params.sort),
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / PAGE_SIZE)),
  };
}

/**
 * Result count on its own. The search page awaits this to render its heading
 * and filter badge immediately, then streams the cards separately.
 */
export async function countProperties(params: PropertySearchParams): Promise<number> {
  return prisma.property.count({ where: buildWhere(params) });
}

/** Landing-page carousel: admin-featured first, newest as filler. */
export async function getFeaturedProperties(limit = 6): Promise<PropertyCardData[]> {
  return prisma.property.findMany({
    where: { status: "APPROVED" },
    select: propertyCardSelect,
    orderBy: [{ featured: "desc" }, { createdAt: "desc" }],
    take: limit,
  });
}

/** Listing counts per city for the "Popular cities" tiles. */
export async function getCityCounts(): Promise<{ city: string; count: number }[]> {
  const grouped = await prisma.property.groupBy({
    by: ["city"],
    where: { status: "APPROVED" },
    _count: { _all: true },
    orderBy: { _count: { city: "desc" } },
    take: 8,
  });

  return grouped.map((row) => ({ city: row.city, count: row._count._all }));
}

/** Full detail payload for the property page. */
export async function getPropertyBySlug(slug: string) {
  return prisma.property.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { sortOrder: "asc" } },
      owner: { select: { id: true, name: true, role: true, createdAt: true } },
    },
  });
}

/** Similar listings shown under the detail page — same city, same intent. */
export async function getSimilarProperties(
  property: { id: string; city: string; listingType: "RENT" | "SALE" },
  limit = 3,
): Promise<PropertyCardData[]> {
  return prisma.property.findMany({
    where: {
      status: "APPROVED",
      city: property.city,
      listingType: property.listingType,
      id: { not: property.id },
    },
    select: propertyCardSelect,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}
