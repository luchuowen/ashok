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
      <div className="relative mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-3 md:px-12">
        <Link
          href="/"
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 md:static md:left-auto md:top-auto md:translate-x-0 md:translate-y-0"
          aria-label={siteConfig.fullName}
        >
          <Image
            src="/logo.avif"
            alt={siteConfig.fullName}
            width={80}
            height={80}
            className="h-16 w-16 md:h-20 md:w-20"
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

        <MobileNav links={headerLinks} className="ml-auto md:ml-0" />
      </div>
    </header>
  );
}
