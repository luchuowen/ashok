"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { portalTabs } from "@/lib/nav";

export function PortalTabs() {
  const pathname = usePathname();

  return (
    <nav className="overflow-x-auto border-b border-line px-6 md:px-12">
      <ul className="mx-auto flex max-w-6xl gap-6">
        {portalTabs.map((tab) => {
          const isActive = pathname === tab.href;
          return (
            <li key={tab.slug}>
              <Link
                href={tab.href}
                className={`inline-block whitespace-nowrap border-b-2 py-4 text-sm ${
                  isActive
                    ? "border-oxblood text-ink"
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
