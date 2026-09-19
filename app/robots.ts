import type { MetadataRoute } from "next";

const BASE_URL = "https://ashok.navac.co.ke";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Client-record area — not for search engines even though there's no
      // auth gate yet in Phase 1.
      disallow: "/portal",
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
