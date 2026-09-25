"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/nav";
import { SocialLinks } from "@/components/layout/SocialLinks";
import { useAuthSession } from "@/app/auth-context";

/**
 * Header's mobile nav — the header hides its nav links and the "Book a
 * Consultation" button entirely below md with nothing standing in for them,
 * so mobile visitors had no way to reach any page except by scrolling to the
 * footer. This is the standing in: a compact card dropdown anchored under
 * the header (Owen's chosen direction — "Nav C"), styled like the rest of
 * the house: oxblood accent rule, numbered rows, hairline dividers.
 */
export function MobileNav({
  links,
  cartCount = 0,
  className = "",
}: {
  links: NavItem[];
  cartCount?: number;
  className?: string;
}) {
  const { loading, signedIn, phone, name, signOut } = useAuthSession();
  // `open` mounts the dropdown; `visible` drives the enter/exit transition
  // so it fades/scales in on mount and back out before unmounting on close.
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);

  function openMenu() {
    setOpen(true);
  }

  function closeMenu() {
    setVisible(false);
    window.setTimeout(() => setOpen(false), 200);
  }

  useEffect(() => {
    if (!open) return;
    const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") closeMenu();
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      cancelAnimationFrame(raf);
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className={`md:hidden ${className}`.trim()}>
      <button
        type="button"
        onClick={openMenu}
        aria-label={cartCount > 0 ? `Open menu, ${cartCount} in cart` : "Open menu"}
        aria-expanded={open}
        className="relative flex h-10 w-10 items-center justify-center border border-line text-ink transition-colors hover:border-oxblood hover:text-oxblood"
      >
        {cartCount > 0 ? (
          <span
            className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-oxblood px-1 text-[10px] leading-none text-cream"
            aria-hidden="true"
          >
            {cartCount > 9 ? "9+" : cartCount}
          </span>
        ) : null}
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
          className="h-5 w-5"
          aria-hidden="true"
        >
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open ? (
        <div
          className={`fixed inset-0 z-50 bg-ink/35 transition-opacity duration-200 ${
            visible ? "opacity-100" : "opacity-0"
          }`}
          onClick={closeMenu}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className={`absolute left-4 right-4 top-4 origin-top border-t-[3px] border-oxblood bg-paper shadow-2xl transition-all duration-200 ease-out ${
              visible ? "translate-y-0 scale-100 opacity-100" : "-translate-y-2 scale-[0.98] opacity-0"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pb-3 pt-4">
              <span className="font-display text-base text-ink">Where to?</span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Close menu"
                className="flex h-8 w-8 items-center justify-center border border-line text-ink transition-colors hover:border-oxblood hover:text-oxblood"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  className="h-3.5 w-3.5"
                  aria-hidden="true"
                >
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            {/* Account + cart (moved here from the phone header bar). */}
            <div className="grid grid-cols-2 gap-2 px-5 pb-4">
              <Link
                href={signedIn ? "/portal" : "/auth"}
                onClick={closeMenu}
                className="flex min-w-0 items-center gap-2.5 border border-line px-3 py-3 text-ink transition-colors hover:border-oxblood"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 shrink-0" aria-hidden="true">
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M4.8 20c1.5-3.9 4.4-5.8 7.2-5.8s5.7 1.9 7.2 5.8" />
                </svg>
                <span className="min-w-0">
                  <span className="block truncate text-sm">{loading ? "Account" : signedIn ? name || phone || "My Account" : "Sign In"}</span>
                  <span className="block text-[11px] text-muted">{signedIn ? "My Account" : "or create account"}</span>
                </span>
              </Link>
              <Link
                href="/cart"
                onClick={closeMenu}
                className="flex items-center gap-2.5 border border-line px-3 py-3 text-ink transition-colors hover:border-oxblood"
              >
                <span className="relative shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">
                    <path d="M3 4h2l.4 2M7 13h10l3-8H6.4M7 13L5.4 6M7 13l-1.6 5.2A1 1 0 0 0 6.36 19.5H18" />
                    <circle cx="9" cy="21" r="1" />
                    <circle cx="18" cy="21" r="1" />
                  </svg>
                </span>
                <span>
                  <span className="block text-sm">Cart</span>
                  <span className="block text-[11px] text-muted">
                    {cartCount > 0 ? `${cartCount} item${cartCount === 1 ? "" : "s"}` : "Empty"}
                  </span>
                </span>
              </Link>
            </div>

            <nav className="px-2">
              {links.map((item, index) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  onClick={closeMenu}
                  className="flex items-center justify-between gap-3 border-t border-line px-3 py-[14px] text-ink"
                >
                  <span className="flex items-center gap-3">
                    <span className="flex h-[26px] w-[26px] items-center justify-center rounded-full border border-line text-[11px] text-oxblood">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <span className="font-display text-[17px]">{item.label}</span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    className="h-3.5 w-3.5 text-muted"
                    aria-hidden="true"
                  >
                    <path d="M9 6l6 6-6 6" />
                  </svg>
                </Link>
              ))}
            </nav>

            <div className="border-t border-line px-5 pb-6 pt-5">
              <Link href="/booking" onClick={closeMenu} className="cta w-full">
                Book a Consultation
              </Link>
              {signedIn ? (
                <button
                  type="button"
                  onClick={() => {
                    closeMenu();
                    void signOut();
                  }}
                  className="mt-4 block w-full text-center text-xs text-muted underline hover:text-ink"
                >
                  Sign Out
                </button>
              ) : null}
              <SocialLinks tone="light" className="mt-4 justify-center" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
