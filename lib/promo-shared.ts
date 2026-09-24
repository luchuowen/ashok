/**
 * Promo codes & gift cards — client-safe types and the discount maths shared
 * by the bag/checkout preview and the server (which always recomputes).
 */
export interface PromoCode {
  /** Upper-case code; also the Firestore document id. */
  code: string;
  kind: "promo" | "giftcard";
  type: "percent" | "fixed";
  /** Percent (1–90) or KES amount. */
  value: number;
  /** "suits" limits the discount to custom-suit lines. */
  appliesTo: "all" | "suits";
  minSpend: number;
  active: boolean;
  /** ISO date (inclusive), or "" for no expiry. */
  expiresAt: string;
  /** 0 = unlimited. Counted on paid orders only. */
  maxUses: number;
  uses: number;
  description: string;
  createdAt: string;
  updatedAt: string;
}

export const PROMO_STORAGE_KEY = "ashok-promo-code";

export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, "").slice(0, 24);
}

export function evaluatePromo(
  promo: PromoCode | null,
  totals: { subtotal: number; suitsSubtotal: number },
  today: string,
): { ok: true; discount: number; label: string } | { ok: false; error: string } {
  if (!promo || !promo.active) return { ok: false, error: "That code isn't valid." };
  if (promo.expiresAt && promo.expiresAt < today) return { ok: false, error: "That code has expired." };
  if (promo.maxUses > 0 && promo.uses >= promo.maxUses) return { ok: false, error: "That code has been fully used." };
  const base = promo.appliesTo === "suits" ? totals.suitsSubtotal : totals.subtotal;
  if (base <= 0) return { ok: false, error: promo.appliesTo === "suits" ? "That code applies to custom suits only." : "Your bag is empty." };
  if (totals.subtotal < promo.minSpend) {
    return { ok: false, error: `That code needs a spend of KES ${promo.minSpend.toLocaleString("en-KE")} or more.` };
  }
  const raw = promo.type === "percent" ? Math.round((base * Math.min(90, Math.max(1, promo.value))) / 100) : Math.round(promo.value);
  const discount = Math.max(0, Math.min(raw, base));
  const label =
    promo.kind === "giftcard"
      ? `Gift card ${promo.code}${promo.value > discount ? ` (KES ${(promo.value - discount).toLocaleString("en-KE")} left after this order)` : ""}`
      : `${promo.code}${promo.type === "percent" ? ` (${promo.value}% off${promo.appliesTo === "suits" ? " suits" : ""})` : ""}`;
  return { ok: true, discount, label };
}
