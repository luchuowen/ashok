/**
 * Single source of truth for every route in the site. Read this file to get exact
 * paths and nav labels — never re-type an href or label inline elsewhere, and never
 * edit this file except to add a route that doesn't exist yet.
 */

export type NavGroup = "core" | "commerce" | "phase2" | "portal" | "admin";

export interface NavItem {
  slug: string;
  href: string;
  label: string;
  group: NavGroup;
}

export const nav: NavItem[] = [
  // core (8)
  { slug: "home", href: "/", label: "Home", group: "core" },
  { slug: "atelier", href: "/atelier", label: "The Atelier", group: "core" },
  { slug: "bespoke", href: "/bespoke", label: "Bespoke", group: "core" },
  {
    slug: "made-to-measure",
    href: "/made-to-measure",
    label: "Made-to-Measure",
    group: "core",
  },
  {
    slug: "fabric-library",
    href: "/fabric-library",
    label: "Fabric Library",
    group: "core",
  },
  { slug: "process", href: "/process", label: "The Process", group: "core" },
  { slug: "portfolio", href: "/portfolio", label: "Portfolio", group: "core" },
  {
    slug: "weddings-corporate",
    href: "/weddings-corporate",
    label: "Weddings & Corporate",
    group: "core",
  },

  // commerce (7)
  { slug: "shop", href: "/shop", label: "Shop", group: "commerce" },
  { slug: "custom-suits", href: "/custom-suits", label: "Custom Suits", group: "commerce" },
  { slug: "suit-designer", href: "/custom-suits/design", label: "Design Your Suit", group: "commerce" },
  { slug: "suit-measurements", href: "/custom-suits/measurements", label: "Your Measurements", group: "commerce" },
  {
    slug: "shop-pdp",
    href: "/shop/[slug]",
    label: "Product",
    group: "commerce",
  },
  { slug: "cart", href: "/cart", label: "Cart", group: "commerce" },
  { slug: "checkout", href: "/checkout", label: "Checkout", group: "commerce" },
  { slug: "booking", href: "/booking", label: "Book a Consultation", group: "commerce" },
  { slug: "contact", href: "/contact", label: "Contact", group: "commerce" },
  { slug: "auth", href: "/auth", label: "Sign In", group: "commerce" },

  // phase2 (1) — not built yet, see .factory/DECISIONS.md
  { slug: "journal", href: "/journal", label: "Journal", group: "phase2" },

  // portal (8) — "My Account"
  { slug: "portal", href: "/portal", label: "Overview", group: "portal" },
  {
    slug: "portal-measurements",
    href: "/portal/measurements",
    label: "Measurements",
    group: "portal",
  },
  { slug: "portal-orders", href: "/portal/orders", label: "Orders", group: "portal" },
  { slug: "portal-designs", href: "/portal/designs", label: "Suit Designs", group: "portal" },
  { slug: "portal-quotes", href: "/portal/quotes", label: "Quotes", group: "portal" },
  {
    slug: "portal-payments",
    href: "/portal/payments",
    label: "Payments",
    group: "portal",
  },
  {
    slug: "portal-appointments",
    href: "/portal/appointments",
    label: "Appointments",
    group: "portal",
  },
  {
    slug: "portal-preferences",
    href: "/portal/preferences",
    label: "Preferences",
    group: "portal",
  },
  {
    slug: "portal-settings",
    href: "/portal/settings",
    label: "Settings",
    group: "portal",
  },

  // admin (9) — staff dashboard
  { slug: "admin-customers", href: "/admin", label: "Customers", group: "admin" },
  { slug: "admin-custom-orders", href: "/admin/custom-orders", label: "Custom Suits", group: "admin" },
  { slug: "admin-products", href: "/admin/products", label: "Products", group: "admin" },
  { slug: "admin-categories", href: "/admin/categories", label: "Categories", group: "admin" },
  { slug: "admin-stock", href: "/admin/stock", label: "Stock", group: "admin" },
  {
    slug: "admin-stock-takes",
    href: "/admin/stock-takes",
    label: "Stock Takes",
    group: "admin",
  },
  { slug: "admin-suppliers", href: "/admin/suppliers", label: "Suppliers", group: "admin" },
  {
    slug: "admin-purchase-orders",
    href: "/admin/purchase-orders",
    label: "Purchase Orders",
    group: "admin",
  },
  { slug: "admin-returns", href: "/admin/returns", label: "Returns", group: "admin" },
  { slug: "admin-reports", href: "/admin/reports", label: "Reports", group: "admin" },
];

export const navByGroup = (group: NavGroup): NavItem[] =>
  nav.filter((item) => item.group === group);

export const portalTabs: NavItem[] = navByGroup("portal");
export const adminTabs: NavItem[] = navByGroup("admin");
