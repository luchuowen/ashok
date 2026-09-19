import type { MetadataRoute } from "next";

const BASE_URL = "https://ashok.navac.co.ke";

// Canonical marketing pages only — cart/checkout/auth/portal are
// transactional or private and deliberately left out, and /journal isn't
// built yet (Phase 2).
const ROUTES: { path: string; priority: number }[] = [
  { path: "", priority: 1 },
  { path: "/atelier", priority: 0.8 },
  { path: "/bespoke", priority: 0.8 },
  { path: "/made-to-measure", priority: 0.8 },
  { path: "/fabric-library", priority: 0.6 },
  { path: "/process", priority: 0.6 },
  { path: "/portfolio", priority: 0.7 },
  { path: "/weddings-corporate", priority: 0.7 },
  { path: "/shop", priority: 0.6 },
  { path: "/contact", priority: 0.5 },
  { path: "/booking", priority: 0.9 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return ROUTES.map(({ path, priority }) => ({
    url: `${BASE_URL}${path}`,
    lastModified,
    changeFrequency: "weekly",
    priority,
  }));
}
