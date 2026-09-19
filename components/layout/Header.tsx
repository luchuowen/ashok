import Link from "next/link";
import Image from "next/image";
import { nav } from "@/lib/nav";
import { siteConfig } from "@/lib/content/site";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "@/components/layout/MobileNav";

// Approved Home page nav is a curated subset of "core" (Atelier, Fabric Library,
// Process, Portfolio) plus the Shop entry point from "commerce" — not the full
// 8-item core group. Sourced from lib/nav by slug so hrefs/labels stay centralized.
const HEADER_SLUGS = ["atelier", "fabric-library", "process", "portfolio", "shop"];
const headerLinks = HEADER_SLUGS.map((slug) => nav.find((item) => item.slug === slug)).filter(
  (item): item is NonNullable<typeof item> => Boolean(item),
);

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3 md:px-12">
        <Link href="/" className="flex items-center gap-2" aria-label={siteConfig.fullName}>
          <Image
            src="/logo.avif"
            alt={siteConfig.fullName}
            width={56}
            height={56}
            className="h-12 w-12 md:h-14 md:w-14"
            priority
          />
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {headerLinks.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className="text-sm text-ink hover:text-oxblood"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <Button href="/booking" className="hidden md:inline-flex">
          Book a Consultation
        </Button>

        <MobileNav links={headerLinks} />
      </div>
    </header>
  );
}
