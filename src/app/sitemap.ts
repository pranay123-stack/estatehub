import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { CITIES } from "@/lib/constants";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Static pages, per-city search pages, and every approved listing. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const properties = await prisma.property.findMany({
    where: { status: "APPROVED" },
    select: { slug: true, updatedAt: true },
    orderBy: { updatedAt: "desc" },
    take: 5000, // sitemap spec caps a single file at 50k URLs
  });

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
