"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { NavItem } from "@/lib/nav";

/**
 * Header's mobile nav — the header hides its nav links and the "Book a
 * Consultation" button entirely below md with nothing standing in for them,
 * so mobile visitors had no way to reach any page except by scrolling to the
 * footer. This is the standing in: a hamburger button that opens a
 * full-width panel under the header with the same links + CTA, centered to
 * match the mobile-centered content elsewhere on the site.
 */
export function MobileNav({ links }: { links: NavItem[] }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Open menu"
        aria-expanded={open}
        className="flex h-10 w-10 items-center justify-center border border-line text-ink"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
          <path d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open ? (
        <div
          className="fixed inset-0 z-50 bg-ink/60"
          onClick={() => setOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Site menu"
            className="absolute inset-x-0 top-0 flex max-h-screen flex-col overflow-y-auto border-b border-line bg-cream px-6 py-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <span className="font-display text-lg text-ink">Menu</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close menu"
                className="flex h-10 w-10 items-center justify-center text-ink"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" className="h-5 w-5" aria-hidden="true">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>

            <nav className="mt-6 flex flex-col items-center gap-6 py-4">
              {links.map((item) => (
                <Link
                  key={item.slug}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="text-lg text-ink hover:text-oxblood"
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="mt-2 flex justify-center pb-2">
              <Link href="/booking" onClick={() => setOpen(false)} className="cta">
                Book a Consultation
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
