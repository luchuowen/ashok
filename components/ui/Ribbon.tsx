/** Small "Phase 2" style label for anything not live yet. */
export function Ribbon({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-tag border border-oxblood bg-oxblood px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-cream">
      {children}
    </span>
  );
}
