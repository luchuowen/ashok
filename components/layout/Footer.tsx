import Link from "next/link";
import { nav } from "@/lib/nav";
import { siteConfig, waLink } from "@/lib/content/site";

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
    <footer className="border-t border-line px-6 py-16 md:px-12">
      <div className="mx-auto grid max-w-6xl grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="font-display text-lg">{siteConfig.fullName}</p>
          <p className="mt-3 text-sm text-muted">{siteConfig.address}</p>
          <p className="mt-1 text-sm text-muted">{siteConfig.phone}</p>
          <p className="mt-1 text-sm text-muted">{siteConfig.email}</p>
          <a
            href={waLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm text-oxblood hover:underline"
          >
            Message us on WhatsApp
          </a>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-muted">The House</p>
          <ul className="mt-4 space-y-2">
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
          <p className="text-xs uppercase tracking-wide text-muted">Shop</p>
          <ul className="mt-4 space-y-2">
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
          <p className="text-xs uppercase tracking-wide text-muted">Account</p>
          <ul className="mt-4 space-y-2">
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

      <p className="mx-auto mt-12 max-w-6xl text-xs text-muted">
        © {new Date().getFullYear()} {siteConfig.fullName}, {siteConfig.address}.
      </p>
    </footer>
  );
}
