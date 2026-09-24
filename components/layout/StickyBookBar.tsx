"use client";

import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/Button";

/** Routes that render their own sticky mobile action bar (price + next
 *  step), plus checkout, where a booking CTA would only cover the form. */
const OWN_ACTION_BAR = ["/custom-suits/design", "/custom-suits/measurements", "/checkout"];

/** Mobile-only sticky bottom booking CTA, hidden at/above 900px. Included on every page. */
export function StickyBookBar() {
  const pathname = usePathname();
  if (OWN_ACTION_BAR.some((p) => pathname?.startsWith(p))) return null;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center border-t border-line bg-cream p-4 min-[900px]:hidden">
      <Button href="/booking" className="!px-4 !py-2 text-xs">
        Book a Consultation
      </Button>
    </div>
  );
}
