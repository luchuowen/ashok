"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthSession } from "@/app/auth-context";

/**
 * Top-right account affordance for the site header (desktop and mobile
 * rows). Before this, the only way to see "am I signed in" or reach Sign
 * Out was to scroll all the way to the footer — this puts it one click
 * away everywhere, matching the account name + Sign Out (signed in) /
 * account-creation pitch (signed out) that a tester asked for. Visual
 * language ("Refined Card" — Owen's pick from three mockups): a hairline
 * card with an oxblood top accent, a small icon badge, and a full-width
 * primary action, echoing MobileNav's own oxblood-accent card treatment.
 */
export function AccountMenu({ className = "" }: { className?: string }) {
  const { loading, signedIn, phone, name, signOut } = useAuthSession();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    window.addEventListener("keydown", handleKey);
    return () => {
      document.removeEventListener("mousedown", handleClick);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  if (loading) {
    // Reserve the button's footprint so the header doesn't jump once the
    // session check resolves.
    return <span className={`block h-10 w-10 ${className}`} aria-hidden="true" />;
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={signedIn ? `Account — ${name || phone}` : "Sign in or create an account"}
        className={`flex h-10 w-10 items-center justify-center transition-colors hover:text-oxblood ${
          open ? "text-oxblood" : "text-ink"
        }`}
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
          <circle cx="12" cy="8" r="3.4" />
          <path d="M4.8 20c1.5-3.9 4.4-5.8 7.2-5.8s5.7 1.9 7.2 5.8" />
        </svg>
      </button>

      {open ? (
        <div className="absolute right-0 top-full z-40 mt-2 w-[300px] border border-t-[3px] border-line border-t-oxblood bg-cream p-7 text-left shadow-xl">
          {signedIn ? (
            <>
              <p className="text-xs uppercase tracking-wide text-muted">Signed in as</p>
              <p className="mt-1 truncate font-display text-lg text-ink">{name || phone}</p>
              <div className="mt-4 flex flex-col gap-3">
                <Link
                  href="/portal"
                  onClick={() => setOpen(false)}
                  className="text-sm text-ink hover:text-oxblood"
                >
                  My Account
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    void signOut();
                  }}
                  className="text-left text-sm text-ink hover:text-oxblood"
                >
                  Sign Out
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-oxblood">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4 text-oxblood"
                  aria-hidden="true"
                >
                  <circle cx="12" cy="8" r="3.4" />
                  <path d="M4.8 20c1.5-3.9 4.4-5.8 7.2-5.8s5.7 1.9 7.2 5.8" />
                </svg>
              </div>
              <p className="mt-4 font-display text-xl font-medium leading-snug text-ink">
                Create Your Free Ashok Sunny Account
              </p>
              <p className="mt-2.5 text-sm leading-relaxed text-muted">
                Create an account to easily manage your appointments, orders, payments, and personal
                details in one place.
              </p>
              <Link
                href="/auth"
                onClick={() => setOpen(false)}
                className="cta mt-6 block !px-4 !py-3.5 !text-xs text-center"
              >
                Create Account
              </Link>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="mt-3.5 block w-full text-center text-xs text-muted underline hover:text-ink"
              >
                Maybe Later
              </button>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
