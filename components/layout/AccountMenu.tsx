"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuthSession } from "@/app/auth-context";

/**
 * Top-right account affordance for the site header (desktop and mobile
 * rows). Before this, the only way to see "am I signed in" or reach Sign
 * Out was to scroll all the way to the footer — this puts it one click
 * away everywhere, matching the account name + Sign Out (signed in) /
 * account-creation pitch (signed out) that a tester asked for.
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
        className="flex h-10 w-10 items-center justify-center text-ink transition-colors hover:text-oxblood"
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
        <div className="absolute right-0 top-full z-40 mt-2 w-72 border border-line bg-cream p-5 text-left shadow-lg">
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
              <p className="font-display text-lg text-ink">Create Your Free Ashok Sunny Account</p>
              <p className="mt-2 text-sm text-muted">
                Create an account to easily manage your appointments, orders, payments, and personal
                details in one place.
              </p>
              <div className="mt-4 flex items-center gap-5">
                <Link
                  href="/auth"
                  onClick={() => setOpen(false)}
                  className="cta !px-4 !py-2 !text-xs"
                >
                  Create Account
                </Link>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm text-muted underline hover:text-ink"
                >
                  Maybe Later
                </button>
              </div>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
