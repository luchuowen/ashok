"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalTabs } from "@/lib/nav";

/**
 * Vertical rail on md+ (a slim left column, oxblood mark on the active
 * item) so "Your Record" reads like an account ledger rather than another
 * page of top tabs. Collapses to a horizontal scrollable row on mobile,
 * where a sidebar would just eat the screen.
 */
export function PortalTabs() {
  const pathname = usePathname();

  return (
    <nav className="flex-shrink-0 border-b border-line px-6 md:w-56 md:border-b-0 md:border-r md:px-0 md:py-10 md:pl-12">
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:gap-0 md:overflow-visible">
        {portalTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.slug} className="flex-shrink-0">
              <Link
                href={tab.href}
                className={`block whitespace-nowrap border-b-2 py-4 text-sm md:border-b-0 md:border-l-2 md:py-3 md:pl-6 md:pr-8 ${
                  isActive
                    ? "border-oxblood font-medium text-ink"
                    : "border-transparent text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
