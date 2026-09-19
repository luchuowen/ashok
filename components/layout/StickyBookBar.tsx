import { Button } from "@/components/ui/Button";

/** Mobile-only sticky bottom booking CTA, hidden at/above 900px. Included on every page. */
export function StickyBookBar() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 flex items-center justify-center border-t border-line bg-cream p-4 min-[900px]:hidden">
      <Button href="/booking" className="!px-4 !py-2 text-xs">
        Book a Consultation
      </Button>
    </div>
  );
}
