import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Private and non-indexable areas.
      disallow: ["/dashboard", "/api", "/login", "/register"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
