/**
 * Order stages — client-safe. Kept out of lib/db.ts because that module
 * imports firebase-admin (server-only): a "use client" page importing a
 * *value* like ORDER_STAGES from it drags the whole Admin SDK into the
 * browser bundle and `next build` fails on `fs`/`net`. Types are erased at
 * build time, so `import type` from lib/db.ts is fine; values are not.
 * lib/db.ts re-exports both so existing server-side imports keep working.
 */
export type OrderStage =
  | "Consultation"
  | "Measurements Taken"
  | "Cutting"
  | "First Fitting"
  | "Final Fitting"
  | "Ready for Collection"
  | "Collected"
  | "Payment Pending"
  | "Paid"
  | "Cancelled"
  | "Returned"
  | "Refunded";

/** Single source of truth for every valid stage — the admin stage dropdown
 *  and the PATCH /api/admin/orders/:id validation both read this instead of
 *  each keeping their own copy of the list. */
export const ORDER_STAGES: readonly OrderStage[] = [
  "Consultation",
  "Measurements Taken",
  "Cutting",
  "First Fitting",
  "Final Fitting",
  "Ready for Collection",
  "Collected",
  "Payment Pending",
  "Paid",
  "Cancelled",
  "Returned",
  "Refunded",
];

/** Bespoke-only progress stages — an off-the-shelf (shop) order has no
 *  tailoring process behind it, so these never apply to one. Used to keep
 *  them out of the staff stage dropdown and to reject them server-side for
 *  a shop order (see PATCH /api/admin/orders/:id). */
export const BESPOKE_ONLY_STAGES: readonly OrderStage[] = [
  "Measurements Taken",
  "Cutting",
  "First Fitting",
  "Final Fitting",
];

/** Where an order came from: the shop, a staff-created bespoke order, or a
 *  suit designed online in the custom-suit configurator. */
export type OrderSource = "shop" | "bespoke" | "custom";

/** Stages staff may set on an order, filtered by its source. Custom
 *  (configurator) suits go through the full tailoring process, same as
 *  bespoke. */
export function stagesFor(source: OrderSource): readonly OrderStage[] {
  if (source === "shop") {
    return ORDER_STAGES.filter((stage) => !BESPOKE_ONLY_STAGES.includes(stage));
  }
  return ORDER_STAGES;
}

/** True when an order has some money against it but isn't settled —
 *  distinct from the order's `stage`, which only tracks business progress
 *  (Cutting, Fitting, ...) and can't itself say "partially paid". Used to
 *  show a clearer status than a payment-link row's stale "Outstanding" tag
 *  next to an order that's had a partial payment recorded against it. */
export function isPartiallyPaid(order: { balanceDue: number; price: number }): boolean {
  return order.balanceDue > 0 && order.balanceDue < order.price;
}
