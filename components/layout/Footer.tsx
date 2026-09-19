import Link from "next/link";
import { nav } from "@/lib/nav";
import { siteConfig } from "@/lib/content/site";
import { SocialLinks } from "@/components/layout/SocialLinks";

const houseSlugs = [
  "atelier",
  "bespoke",
  "made-to-measure",
  "fabric-library",
  "process",
  "portfolio",
  "weddings-corporate",
];
const shopSlugs = ["shop", "cart", "checkout"];
const accountLinks: { slug: string; label: string }[] = [
  { slug: "auth", label: "Sign In" },
  { slug: "portal", label: "Your Record with the House" },
  { slug: "booking", label: "Book a Consultation" },
  { slug: "contact", label: "Contact" },
];

function findLinks(slugs: string[]) {
  return slugs
    .map((slug) => nav.find((item) => item.slug === slug))
    .filter((item): item is NonNullable<typeof item> => Boolean(item));
}

export function Footer() {
  const houseLinks = findLinks(houseSlugs);
  const shopLinks = findLinks(shopSlugs);

  return (
    <footer className="bg-ink px-6 py-16 text-cream md:px-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg">{siteConfig.fullName}</p>
          <p className="mt-3 text-sm text-cream/70">{siteConfig.address}</p>
          <p className="mt-1 text-sm text-cream/70">{siteConfig.phone}</p>
          <p className="mt-1 text-sm text-cream/70">{siteConfig.email}</p>
          <SocialLinks className="mt-4" />
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-cream/60">The House</p>
          <ul className="mt-3 space-y-1.5">
            {houseLinks.map((item) => (
              <li key={item.slug}>
                <Link href={item.href} className="text-sm hover:text-oxblood">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-cream/60">Shop</p>
          <ul className="mt-3 space-y-1.5">
            {shopLinks.map((item) => (
              <li key={item.slug}>
                <Link href={item.href} className="text-sm hover:text-oxblood">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-cream/60">Account</p>
          <ul className="mt-3 space-y-1.5">
            {accountLinks.map(({ slug, label }) => {
              const item = nav.find((n) => n.slug === slug);
              if (!item) return null;
              return (
                <li key={slug}>
                  <Link href={item.href} className="text-sm hover:text-oxblood">
                    {label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-12 flex max-w-6xl flex-col items-start justify-between gap-3 text-xs text-cream/50 sm:flex-row sm:items-center">
        <p>
          © {new Date().getFullYear()} {siteConfig.fullName}, {siteConfig.address}.
        </p>
        <p>
          Designed by{" "}
          <a
            href="https://navac.co.ke"
            target="_blank"
            rel="noopener noreferrer"
            className="text-cream/50 hover:text-oxblood"
          >
            NAVAC GLOBAL
          </a>
        </p>
      </div>
    </footer>
  );
}
