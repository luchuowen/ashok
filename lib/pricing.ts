import type { Product, ProductVariant } from "@/lib/inventory";

/**
 * Pure pricing helper — client-safe (no firebase-admin import), so /shop
 * and /admin/products can compute displayed prices in the browser. Same
 * reason lib/order-stages.ts exists; lib/inventory.ts re-exports it so
 * server callers are unchanged.
 */
/** Effective selling price for a variant, discount applied, rounded to the shilling. */
export function effectivePrice(product: Pick<Product, "price" | "discountPercent">, variant?: Pick<ProductVariant, "priceOverride">): number {
  const base = variant?.priceOverride ?? product.price;
  const pct = product.discountPercent ?? 0;
  if (!pct) return base;
  return Math.round(base * (1 - pct / 100));
}
