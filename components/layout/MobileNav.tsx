"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/nav";
import { SocialLinks } from "@/components/layout/SocialLinks";

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
  className = "",
}: {
  links: NavItem[];
  className?: string;
}) {
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
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center border border-line text-ink transition-colors hover:border-oxblood hover:text-oxblood"
      >
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
              <SocialLinks tone="light" className="mt-4 justify-center" />
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
