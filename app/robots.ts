import type { MetadataRoute } from "next";

const BASE_URL = "https://ashok.navac.co.ke";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Client-record and staff areas — never for search engines.
      disallow: ["/portal", "/admin"],
    },
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
