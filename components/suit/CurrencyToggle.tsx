"use client";

import type { DisplayCurrency } from "@/lib/currency";

/** KES / USD display switch (display conversion; the payment page confirms the charged amount). */
export function CurrencyToggle({ value, onChange }: { value: DisplayCurrency; onChange: (v: DisplayCurrency) => void }) {
  return (
    <div className="inline-flex border border-line bg-cream text-[11px]" role="group" aria-label="Display currency">
      {(["KES", "USD"] as const).map((c) => (
        <button key={c} type="button" onClick={() => onChange(c)} aria-pressed={value === c} className={`px-2 py-1 tracking-wide ${value === c ? "bg-ink text-cream" : "text-muted hover:text-ink"}`}>
          {c}
        </button>
      ))}
    </div>
  );
}
