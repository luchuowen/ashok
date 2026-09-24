# Change: Custom suit configurator & ordering engine

- **Date:** 2026-09-24
- **Session / branch:** main
- **Batch scope:** new routes under `app/custom-suits`, `app/admin/custom-orders`, `app/portal/designs`,
  `app/api/suits/*`, `app/api/admin/custom-orders`, `app/dev/mock-pay` (dev only); new `lib/suit/*`,
  `lib/suit-db.ts`, `lib/currency.ts`, `lib/dev/fake-firestore.ts`, `components/suit/*`. Owner-requested
  edits to protected files: `lib/nav.ts` (new routes), `components/layout/Header.tsx` + `Footer.tsx`
  (Custom Suits link), `components/layout/StickyBookBar.tsx` (hidden where a page has its own action bar),
  `components/admin/AdminNav.tsx` (nested active state), `components/portal/LedgerTable.tsx` (top-aligned cells).

## Summary

Hockerty-equivalent made-to-measure journey, built the Ashok way: landing with base styles →
four-step designer (fabric with search/filters/fabric sheets, style with essentials/advanced views,
details: lining incl. kitenge prints, buttons, contrast threads, monogram, pick stitching, felt,
patches, pocket square, priority make, cutter notes, review with full spec + price breakdown) and a
live parametric SVG preview (front/back/inside/waistcoat, zoom), dependency rules with explanations,
KES/USD display, share links, saved designs (device or customer record) → bag with suit lines
(edit/duplicate/qty/spec) → fit profile (estimate & review, self-measure with guides, measurements on
file, or measure at the atelier) → checkout (details, delivery, fit, pay in full or 50% deposit,
terms) → TaifaPay → completion page → confirmation email with spec → portal order spec → admin
production queue + printable work ticket.

## Files touched

See the commit. Server re-prices and re-validates every suit (`lib/suit/rules.ts#validateConfigStrict`,
`lib/suit/pricing.ts#priceSuit`) in `app/api/checkout/create-invoice/route.ts`; payment reconcile is now
amount-aware (`lib/payment-reconcile.ts`).

## Gates

- [x] typecheck + lint
- [x] build
- [x] End-to-end journeys run locally (desktop 1440 / tablet 820 / mobile 390) with the dev-only mock
      gateway + in-memory Firestore: design → bag → measurements → checkout → pay/decline → admin → portal.

## Decisions / follow-ups

See DECISIONS.md 2026-09-24. Follow-ups: real garment photography could replace procedural swatches
per fabric (`image` field); consider a deny-all `firestore.rules` since all access is via Admin SDK.
