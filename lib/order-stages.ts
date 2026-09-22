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
