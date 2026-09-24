"use client";

import { useEffect, useState } from "react";
import { usePromoCode } from "./stores";

export interface PromoPreview {
  code: string;
  discount: number;
  label: string;
}

/**
 * "Promo code or gift card" — applies a code against the bag and reports the
 * previewed discount. The code persists to checkout; the server re-validates.
 */
export function PromoField({
  subtotal,
  suitsSubtotal,
  onChange,
}: {
  subtotal: number;
  suitsSubtotal: number;
  onChange: (p: PromoPreview | null) => void;
}) {
  const [code, setCode] = usePromoCode();
  const [text, setText] = useState("");
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [applied, setApplied] = useState<PromoPreview | null>(null);

  async function check(c: string, quiet = false) {
    if (!c) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, subtotal, suitsSubtotal }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) {
        setApplied(null);
        onChange(null);
        if (!quiet) setError(data.error || "That code isn't valid.");
        else setError(`${c}: ${data.error || "no longer valid"}`);
        return;
      }
      const p = { code: data.code, discount: data.discount, label: data.label };
      setApplied(p);
      onChange(p);
      setCode(data.code);
      setOpen(false);
    } catch {
      setError("Couldn't check that code just now.");
    } finally {
      setBusy(false);
    }
  }

  // Re-check a remembered code whenever the bag total changes.
  useEffect(() => {
    if (code && subtotal > 0) check(code, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, subtotal, suitsSubtotal]);

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="text-oxblood">{applied.label}</span>
        <button
          type="button"
          onClick={() => {
            setApplied(null);
            onChange(null);
            setCode("");
            setText("");
          }}
          className="text-[11px] uppercase tracking-wide text-muted hover:text-oxblood"
        >
          Remove
        </button>
      </div>
    );
  }

  return (
    <div className="text-sm">
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="text-xs text-muted underline underline-offset-2 hover:text-oxblood">
          Have a promo code or gift card?
        </button>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            check(text.trim().toUpperCase());
          }}
          className="flex gap-2"
        >
          <label className="sr-only" htmlFor="promo-code">
            Promo code or gift card
          </label>
          <input
            id="promo-code"
            value={text}
            onChange={(e) => setText(e.target.value.toUpperCase())}
            placeholder="Code"
            autoComplete="off"
            className="min-w-0 flex-1 border border-line bg-paper px-3 py-2 text-sm uppercase tracking-wide focus:border-oxblood focus:outline-none"
          />
          <button type="submit" disabled={busy || !text.trim()} className="cta ghost !px-3 !py-2 text-xs disabled:opacity-50">
            {busy ? "…" : "Apply"}
          </button>
        </form>
      )}
      {error ? (
        <p className="mt-1 text-xs text-oxblood" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
