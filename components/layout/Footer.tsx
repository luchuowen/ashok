"use client";

import Link from "next/link";
import { nav } from "@/lib/nav";
import { siteConfig } from "@/lib/content/site";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { useAuthSession } from "@/app/auth-context";

interface FooterLink {
  slug: string;
  href: string;
  label: string;
}

const houseSlugs = [
  "atelier",
  "bespoke",
  "made-to-measure",
  "fabric-library",
  "process",
  "portfolio",
  "weddings-corporate",
];
const shopSlugs = ["custom-suits", "suit-designer", "shop", "cart", "checkout"];
// "auth" is handled separately below (AccountLinks) since it needs to
// switch between "Sign In" and the signed-in phone/Sign Out state.
const accountOverrides: { slug: string; label: string }[] = [
  { slug: "portal", label: "My Account" },
  { slug: "booking", label: "Book a Consultation" },
  { slug: "contact", label: "Contact" },
];

function resolveLinks(slugs: string[]): FooterLink[] {
  return slugs
    .map((slug) => nav.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({ slug: item.slug, href: item.href, label: item.label }));
}

function resolveAccountLinks(entries: { slug: string; label: string }[]): FooterLink[] {
  return entries
    .map(({ slug, label }) => {
      const item = nav.find((n) => n.slug === slug);
      return item ? { slug, href: item.href, label } : null;
    })
    .filter((item): item is FooterLink => Boolean(item));
}

/** Shared column heading + link list — used inside both the desktop grid
 * column and the mobile accordion panel below, so the two never drift. */
function FooterLinkList({ links }: { links: FooterLink[] }) {
  return (
    <ul className="space-y-1.5">
      {links.map((item) => (
        <li key={item.slug}>
          <Link href={item.href} className="text-sm hover:text-ember">
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The "Sign In" link (signed out) or phone number + Sign Out control
 * (signed in), rendered before the rest of the Account links. Reads the
 * real session via useAuthSession — see app/auth-context.tsx. */
function AccountAuthItem({ className = "" }: { className?: string }) {
  const { loading, signedIn, phone, name, signOut } = useAuthSession();

  if (loading) {
    // Reserve the line's height so the column doesn't jump once the
    // session check resolves.
    return <li className={`text-sm text-cream/0 ${className}`}>Sign In</li>;
  }

  if (!signedIn) {
    return (
      <li className={className}>
        <Link href="/auth" className="text-sm hover:text-ember">
          Sign In
        </Link>
      </li>
    );
  }

  return (
    <li className={className}>
      <p className="text-sm text-cream/70">{name || phone}</p>
      <button
        type="button"
        onClick={() => void signOut()}
        className="text-sm hover:text-ember"
      >
        Sign Out
      </button>
    </li>
  );
}

/** Mobile-only accordion panel (native <details>/<summary> — no JS needed,
 * collapsed by default, expands on tap). Desktop never renders this. */
function FooterAccordionSection({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <details className="group border-b border-cream/15 py-4 first:border-t">
      <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-wide text-cream/60 [&::-webkit-details-marker]:hidden">
        {title}
        <span
          className="text-base leading-none text-cream/40 transition-transform duration-200 group-open:rotate-45"
          aria-hidden="true"
        >
          +
        </span>
      </summary>
      <div className="mt-4 pb-1">
        <FooterLinkList links={links} />
      </div>
    </details>
  );
}

export function Footer() {
  const houseLinks = resolveLinks(houseSlugs);
  const shopLinks = resolveLinks(shopSlugs);
  const accountLinks = resolveAccountLinks(accountOverrides);

  return (
    <footer className="bg-ink px-6 py-16 text-cream md:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-2 md:text-left lg:grid-cols-4">
          <div>
            <p className="font-display text-lg">{siteConfig.fullName}</p>
            <p className="mt-3 text-sm text-cream/70">{siteConfig.address}</p>
            <p className="mt-1 text-sm text-cream/70">{siteConfig.phone}</p>
            <p className="mt-1 text-sm text-cream/70">{siteConfig.email}</p>
            <SocialLinks className="mt-4 justify-center md:justify-start" />
          </div>

          {/* Desktop nav columns — unchanged behaviour, just hidden below md
              now that the same links are available as the mobile accordion. */}
          <div className="hidden md:block">
            <p className="text-xs uppercase tracking-wide text-cream/60">The House</p>
            <div className="mt-3">
              <FooterLinkList links={houseLinks} />
            </div>
          </div>

          <div className="hidden md:block">
            <p className="text-xs uppercase tracking-wide text-cream/60">Shop</p>
            <div className="mt-3">
              <FooterLinkList links={shopLinks} />
            </div>
          </div>

          <div className="hidden md:block">
            <p className="text-xs uppercase tracking-wide text-cream/60">Account</p>
            <div className="mt-3">
              <ul className="space-y-1.5">
                <AccountAuthItem />
                {accountLinks.map((item) => (
                  <li key={item.slug}>
                    <Link href={item.href} className="text-sm hover:text-ember">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Mobile accordion — collapsed by default, one open panel at a time
            isn't enforced (each <details> is independent, standard pattern). */}
        <div className="mt-10 md:hidden">
          <FooterAccordionSection title="The House" links={houseLinks} />
          <FooterAccordionSection title="Shop" links={shopLinks} />
          <details className="group border-b border-cream/15 py-4 first:border-t">
            <summary className="flex cursor-pointer list-none items-center justify-between text-xs uppercase tracking-wide text-cream/60 [&::-webkit-details-marker]:hidden">
              Account
              <span
                className="text-base leading-none text-cream/40 transition-transform duration-200 group-open:rotate-45"
                aria-hidden="true"
              >
                +
              </span>
            </summary>
            <div className="mt-4 pb-1">
              <ul className="space-y-1.5">
                <AccountAuthItem />
                {accountLinks.map((item) => (
                  <li key={item.slug}>
                    <Link href={item.href} className="text-sm hover:text-ember">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </details>
        </div>

        <div className="mx-auto mt-12 flex max-w-6xl flex-col items-center justify-between gap-3 border-t border-cream/15 pt-6 text-center text-xs text-cream/50 md:flex-row md:items-center md:text-left">
          <p>
            © {new Date().getFullYear()} {siteConfig.fullName}, {siteConfig.address}.
          </p>
          <p>
            Designed by{" "}
            <a
              href="https://navac.co.ke"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cream/50 hover:text-ember"
            >
              NAVAC GLOBAL
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
