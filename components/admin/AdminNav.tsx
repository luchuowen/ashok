"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { adminTabs } from "@/lib/nav";

/**
 * Horizontal scrollable row of the 9 admin sections (a vertical rail like
 * PortalTabs would crowd the wide tables most of these pages show).
 */
export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-line px-6 md:px-12">
      <ul className="flex gap-1 overflow-x-auto">
        {adminTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.slug} className="flex-shrink-0">
              <Link
                href={tab.href}
                className={`block whitespace-nowrap border-b-2 px-3 py-3 text-sm ${
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
