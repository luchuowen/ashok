"use client";

import { disabledReason } from "@/lib/suit/rules";
import type { OptionGroup, SuitConfig } from "@/lib/suit/types";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import { OptionGlyph, glyphIsWide, hasGlyph } from "./OptionGlyph";

function priceTag(price: number | undefined, currency: DisplayCurrency) {
  if (!price) return null;
  return <span className="text-[11px] text-oxblood">+{formatMoney(price, currency)}</span>;
}

/** One option group rendered as glyph tiles, chips or colour swatches, with disabled reasons. */
export function OptionTiles({
  group,
  config,
  onChange,
  currency,
}: {
  group: OptionGroup;
  config: SuitConfig;
  onChange: (groupId: string, valueId: string) => void;
  currency: DisplayCurrency;
}) {
  const current = config.options[group.id];
  const currentValue = group.values.find((v) => v.id === current);
  const reasons = group.values.map((v) => disabledReason(group.id, v.id, config));
  const firstReason = reasons.find(Boolean);

  return (
    <fieldset className="border-t border-line py-5 first:border-t-0">
      <legend className="sr-only">{group.label}</legend>
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium">{group.label}</p>
        <p className="truncate text-xs text-muted">{currentValue?.label}</p>
      </div>
      {group.help ? <p className="-mt-1 mb-3 text-xs text-muted">{group.help}</p> : null}

      {group.display === "glyph" ? (
        <div className={`grid gap-x-3 gap-y-5 ${group.values.some((v) => glyphIsWide(v.glyph)) ? "grid-cols-2" : "grid-cols-3"}`}>
          {group.values.map((v, i) => {
            const selected = v.id === current;
            const reason = reasons[i];
            const wide = glyphIsWide(v.glyph);
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => !reason && onChange(group.id, v.id)}
                aria-pressed={selected}
                aria-disabled={Boolean(reason)}
                title={reason ?? v.description ?? v.label}
                className={`group relative flex flex-col items-center gap-2 px-1 pb-1 pt-2 text-center outline-none transition-colors focus-visible:ring-1 focus-visible:ring-ink ${
                  reason ? "cursor-not-allowed opacity-35" : ""
                }`}
              >
                <span className={`relative block transition-colors duration-200 ${selected ? "text-ink" : "text-[#9d9a94] group-hover:text-ink/70"}`}>
                  {selected ? (
                    <svg viewBox="0 0 16 16" className="absolute -left-2 -top-1 h-4 w-4 text-ink" aria-hidden="true">
                      <circle cx="8" cy="8" r="7" fill="#fff" stroke="currentColor" strokeWidth="0.8" />
                      <path d="M4.8 8.2 L7 10.3 L11.2 5.8" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                  {hasGlyph(v.glyph) ? <OptionGlyph name={v.glyph} className={wide ? "h-[96px] w-[108px]" : "h-[96px] w-[72px]"} /> : null}
                </span>
                <span className={`max-w-[9rem] text-[11px] leading-snug tracking-wide transition-colors ${selected ? "text-ink" : "text-muted"}`}>{v.label}</span>
                {priceTag(v.price, currency)}
              </button>
            );
          })}
        </div>
      ) : group.display === "swatch" ? (
        <div className="flex flex-wrap gap-2">
          {group.values.map((v, i) => {
            const selected = v.id === current;
            const reason = reasons[i];
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => !reason && onChange(group.id, v.id)}
                aria-pressed={selected}
                aria-disabled={Boolean(reason)}
                title={reason ?? `${v.label}${v.price ? ` (+${formatMoney(v.price, currency)})` : ""}`}
                className={`flex items-center gap-2 border py-1.5 pl-1.5 pr-3 text-xs transition-colors ${
                  selected ? "border-ink bg-paper ring-1 ring-ink" : reason ? "cursor-not-allowed border-line opacity-40" : "border-line hover:border-ink/60"
                }`}
              >
                <span
                  className="h-5 w-5 flex-none rounded-full border border-line"
                  style={v.hex ? { background: v.hex } : { background: "repeating-linear-gradient(45deg,#ddd3c1 0 2px,transparent 2px 5px)" }}
                  aria-hidden="true"
                />
                <span>{v.label}</span>
                {priceTag(v.price, currency)}
              </button>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {group.values.map((v, i) => {
            const selected = v.id === current;
            const reason = reasons[i];
            return (
              <button
                key={v.id}
                type="button"
                onClick={() => !reason && onChange(group.id, v.id)}
                aria-pressed={selected}
                aria-disabled={Boolean(reason)}
                title={reason ?? v.description ?? v.label}
                className={`flex flex-col items-start border px-3 py-2 text-left text-xs transition-colors ${
                  selected ? "border-ink bg-ink text-cream" : reason ? "cursor-not-allowed border-line text-muted/50" : "border-line text-ink hover:border-ink/60 hover:bg-cream"
                }`}
              >
                <span>{v.label}</span>
                {v.description ? <span className={`mt-0.5 text-[10px] ${selected ? "text-cream/70" : "text-muted"}`}>{v.description}</span> : null}
                {v.price ? <span className={`mt-0.5 text-[10px] ${selected ? "text-cream/80" : "text-oxblood"}`}>+{formatMoney(v.price, currency)}</span> : null}
              </button>
            );
          })}
        </div>
      )}
      {firstReason ? <p className="mt-2 text-[11px] text-muted">Some options are unavailable: {firstReason}</p> : null}
    </fieldset>
  );
}
