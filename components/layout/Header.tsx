"use client";

import Link from "next/link";
import Image from "next/image";
import { nav } from "@/lib/nav";
import { siteConfig } from "@/lib/content/site";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "@/components/layout/MobileNav";
import { useCart } from "@/app/cart-context";
import { AccountMenu } from "@/components/layout/AccountMenu";

// Approved Home page nav is a curated subset of "core" (Atelier, Fabric Library,
// Process, Portfolio) plus the Shop entry point from "commerce" — not the full
// 8-item core group. Sourced from lib/nav by slug so hrefs/labels stay centralized.
const HEADER_SLUGS = ["atelier", "custom-suits", "fabric-library", "process", "portfolio", "shop"];
// Tablet widths (md–lg) can't fit every link beside the account/cart/book
// controls; these stay in the footer and appear again from lg up.
const TABLET_HIDDEN = ["process", "portfolio"];
const headerLinks = HEADER_SLUGS.map((slug) => nav.find((item) => item.slug === slug)).filter(
  (item): item is NonNullable<typeof item> => Boolean(item),
);

function CartLink({ count }: { count: number }) {
  return (
    <Link
      href="/cart"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart"}
      className="relative flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-oxblood"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="h-5 w-5"
        aria-hidden="true"
      >
        <path d="M3 4h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 6M7 13l-1.6 5.2A1 1 0 0 0 6.36 19.5H18" />
        <circle cx="9" cy="21" r="1" />
        <circle cx="18" cy="21" r="1" />
      </svg>
      {count > 0 ? (
        <span className="absolute right-0 top-0 flex h-4 w-4 items-center justify-center rounded-full bg-oxblood text-[10px] leading-none text-cream">
          {count > 9 ? "9+" : count}
        </span>
      ) : null}
    </Link>
  );
}

export function Header() {
  const { items } = useCart();
  const cartCount = items.reduce((sum, item) => sum + item.qty, 0);

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

        <nav className="hidden items-center gap-4 md:flex lg:gap-6">
          {headerLinks.map((item) => (
            <Link
              key={item.slug}
              href={item.href}
              className={`whitespace-nowrap text-[13px] text-ink hover:text-oxblood lg:text-sm ${TABLET_HIDDEN.includes(item.slug) ? "hidden lg:inline" : ""}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <AccountMenu />
          <CartLink count={cartCount} />
          <Button href="/booking" className="whitespace-nowrap !px-4 !py-2 !text-xs">
            <span className="lg:hidden">Book</span>
            <span className="hidden lg:inline">Book a Consultation</span>
          </Button>
        </div>

        <div className="ml-auto flex items-center gap-1 md:hidden">
          <AccountMenu />
          <CartLink count={cartCount} />
          <MobileNav links={headerLinks} />
        </div>
      </div>
    </header>
  );
}
