import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CITIES } from "@/lib/constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/**
 * Generated per request rather than prerendered at build time.
 *
 * Two reasons. A sitemap frozen at build time would only ever list the
 * listings that existed when the bundle was built, which is wrong for a
 * catalogue that changes hourly. And prerendering it makes `next build` require
 * a reachable, migrated database — so a first deploy whose build runs before
 * migrations fails outright. Crawlers hit this rarely, so the per-request query
 * costs nothing in practice.
 */
export const dynamic = "force-dynamic";

/** Static pages, per-city search pages, and every approved listing. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // A database blip should degrade the sitemap, not return a 500 to a crawler.
  const properties = await prisma.property
    .findMany({
      where: { status: "APPROVED" },
      select: { slug: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take: 5000, // sitemap spec caps a single file at 50k URLs
    })
    .catch(() => []);

  return [
    { url: siteUrl, changeFrequency: "daily", priority: 1 },
    { url: `${siteUrl}/properties`, changeFrequency: "hourly", priority: 0.9 },
    ...CITIES.map((city) => ({
      url: `${siteUrl}/properties?city=${encodeURIComponent(city)}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    ...properties.map((property) => ({
      url: `${siteUrl}/properties/${property.slug}`,
      lastModified: property.updatedAt,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
