# Change: TaifaPay end-to-end review — reconcile from poll as well as webhook

- **Date:** 2026-09-22
- **Session / branch:** main
- **Batch scope:** `app/api/checkout/status`, `app/api/webhooks/taifapay`, `app/checkout/complete`,
  `lib/taifapay.ts`, new `lib/payment-reconcile.ts`, `lib/order-stages.ts`, `lib/pricing.ts`.
  No protected path touched.

## Summary

Review of the TaifaPay hosted-checkout flow. The gateway calls themselves (token, create
invoice, get transaction) were sound; the gap was that only the webhook ever wrote the
payment outcome to Firestore. If the webhook is not registered, has the wrong secret, or a
delivery is dropped, the customer saw "Payment received" while the order stayed in
"Payment Pending" with its stock still reserved. Reconciliation now lives in one idempotent
module used by both the webhook and the polled status endpoint, so whichever signal lands
first wins and the other is a no-op (no double restock, no duplicate customer receipt, a
late completion after a cancel is flagged for staff rather than silently deducting twice).
The webhook also now uses the same status normaliser as the polled path instead of
comparing against the literal `"complete"`.

Also fixed a pre-existing `next build` failure: client pages imported *values*
(`ORDER_STAGES`, `effectivePrice`) from server-only modules, dragging `firebase-admin` into
browser bundles. Moved them into client-safe `lib/order-stages.ts` / `lib/pricing.ts`.

## Files touched

- `lib/payment-reconcile.ts` — new; single idempotent order/payment/stock reconciliation.
- `app/api/webhooks/taifapay/route.ts` — delegates to reconcile; normalised status.
- `app/api/checkout/status/route.ts` — reconciles on a final status; customer-safe errors.
- `app/checkout/complete/page.tsx` — falls back to `?transactionId=` when sessionStorage is gone.
- `lib/taifapay.ts` — exports `normalizeTransactionStatus`.
- `next.config.mjs` — client-only alias `firebase-admin: false`.
- `lib/order-stages.ts`, `lib/pricing.ts` — new client-safe modules; `lib/db.ts` and
  `lib/inventory.ts` re-export them; `app/admin/page.tsx`, `app/admin/products/page.tsx`,
  `app/shop/[slug]/page.tsx` import from them.

## Gates

- [x] `bash scripts/factory-check.sh quick` (typecheck + lint)
- [x] `bash scripts/factory-check.sh full` — green. The last client-bundle leak
  (protected `components/commerce/ProductCard.tsx` importing `effectivePrice` from
  `@/lib/inventory`) is handled in `next.config.mjs` by aliasing `firebase-admin` to an empty
  module in the *client* webpack build only; the protected file was not touched.
  Follow-up for the owner: switch that import to `@/lib/pricing` when convenient.
- [x] Mocked end-to-end simulation (webhook signature, 10 reconcile scenarios) — scratchpad only.

## Decisions / follow-ups

- Live TaifaPay could not be exercised from this session (host blocked by egress proxy, no
  credentials). Verify in production: place a sandbox/live order, confirm order flips to
  Paid via both the return page and the webhook log line `reconcile <tx>: paid|noop`.
- `/api/checkout/status` is unauthenticated and returns amount/status for any transaction id;
  ids are unguessable but consider rate-limiting.
