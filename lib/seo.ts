import type { Metadata } from "next";
import { siteConfig } from "@/lib/content/site";

/** Per-page title, description, canonical and social cards (the root layout supplies the defaults). */
export function pageMeta(title: string, description: string, path: string, opts: { noindex?: boolean } = {}): Metadata {
  const full = `${title} — ${siteConfig.fullName}`;
  return {
    title: full,
    description,
    alternates: { canonical: path },
    openGraph: { title: full, description, url: path, siteName: siteConfig.fullName, locale: "en_KE", type: "website", images: [{ url: "/og-image.jpg", width: 1200, height: 630, alt: full }] },
    twitter: { card: "summary_large_image", title: full, description, images: ["/og-image.jpg"] },
    ...(opts.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}
