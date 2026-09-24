"use client";

import { disabledReason } from "@/lib/suit/rules";
import type { OptionGroup, SuitConfig } from "@/lib/suit/types";
import { formatMoney, type DisplayCurrency } from "@/lib/currency";
import { OptionGlyph, hasGlyph } from "./OptionGlyph";

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
        <div className="grid grid-cols-3 gap-2">
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
                className={`flex flex-col items-center gap-1 border px-1.5 pb-2 pt-2.5 text-center transition-colors ${
                  selected ? "border-ink bg-paper text-ink ring-1 ring-ink" : reason ? "cursor-not-allowed border-line text-muted/50" : "border-line text-ink hover:border-ink/60 hover:bg-paper"
                }`}
              >
                {hasGlyph(v.glyph) ? <OptionGlyph name={v.glyph} className="h-11 w-11" /> : null}
                <span className="text-[11px] leading-tight">{v.label}</span>
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
                  selected ? "border-ink bg-ink text-cream" : reason ? "cursor-not-allowed border-line text-muted/50" : "border-line text-ink hover:border-ink/60 hover:bg-paper"
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
