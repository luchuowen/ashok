# Decisions Log

Append-only record of architectural and scope decisions for Ashok Sunny Tailored.
Newest entries at the bottom. Each entry: date, decision, why, alternatives considered.

## 2026-09-19 — Walking skeleton (Batch 1)

**Decision:** Bootstrapped the repo with Next.js 14 (App Router, TypeScript, Tailwind CSS,
ESLint), installed the software factory (`.factory/`, `.claude/`, `scripts/factory-check.sh`),
built the "Measured House" design system as reusable components, and shipped the Home page
(`/`) as the first fully composed route.

**Why:** The Home page is the highest-value single page to prove the design system, nav model,
and content fixtures end to end before fanning out the remaining 23 routes to later sessions.

**Scope for this session:** design tokens, `lib/nav.ts` (all 24 routes), `lib/content/site.ts`,
`lib/fixtures/*`, `lib/firebase.ts` (uninitialized client, env-driven), the full `components/ui`,
`components/layout`, `components/portal`, `components/commerce` libraries, and `app/page.tsx`.

**Alternatives considered:** Scaffolding every route as a stub in this session. Rejected —
the playbook's walking-skeleton pattern favors one deeply-finished path over many shallow
stubs, and `lib/nav.ts` already gives later sessions the authoritative route list without
needing placeholder files to exist yet.

**Phase 2 flag:** `/journal` is listed in `lib/nav.ts` under the `"phase2"` group and is not
built in Phase 1. The Style Advisor quiz logic behind `QuizBand` is also Phase 2 scope; Phase 1
ships it as a static promo banner (see TODO in `components/ui/QuizBand.tsx`).

## 2026-09-24 — Custom suit engine (designer, fit profile, deposits)

**Decision:** Firestore stays the store. Orders designed online are ordinary `orders` documents with
`source: "custom"`, embedding a full snapshot per suit (config, human-readable spec, price lines,
catalogue version), the customer's fit profile, delivery and payment plan. New collections:
`suit_designs` (saved designs, keyed by `clientId`) and `fit_profiles/{phone}` (self-reported fit,
separate from the staff-owned `measurements`).

**Why:** All access is server-side through the Admin SDK; each order is written once and read whole
(admin ticket, portal, email, reconcile), documents are a few KB, and every query is a single-field
equality (auto-indexed) — no composite indexes, no cross-document transactions needed beyond the
existing per-line stock transaction. A relational store would add a second database for no gain.

**Catalogue in code, not Firestore:** `lib/suit/catalogue.ts` is shared by the browser (live price)
and the server (charged price), so they cannot disagree, and it costs zero reads per page view.
Adding a cloth or option is a one-line data change; `CATALOGUE_VERSION` is stamped on every order.

**Payments:** TaifaPay is KES-only, so USD is display-only (`NEXT_PUBLIC_KES_PER_USD`). Custom orders
can be paid in full or with a 50% deposit. `reconcileTransaction` became amount-aware — it reduces
`balanceDue` by the amount of the transaction instead of zeroing it and forcing stage "Paid" (which
also fixes staff balance links on bespoke orders mid-production). Idempotency now keys off the
payment record's status.

**Stages:** custom orders use the full tailoring pipeline. After first payment they move to
"Measurements Taken" (measurements supplied) or "Consultation" (measure at the atelier; recording
staff measurements auto-advances them, as for bespoke).

**Alternatives considered:** a separate `custom_orders` collection (rejected — would fork reconcile,
admin, portal and reports); forcing suits into `items[]` with fake productIds (rejected — breaks
stock, returns and restock paths); 3D rendering (rejected for now — no garment render assets; the
parametric SVG technical drawing is exact, fast and reflects every option).

**Dev tooling:** `TAIFAPAY_ENV=mock` and `ASHOK_FAKE_FIRESTORE=1` allow the whole journey locally;
both are ignored when `NODE_ENV=production`.

## 2026-09-25 — Hockerty parity pass: accessories, promo codes/gift cards, overseas orders

**Decision:** Added the remaining reference-site features: accessory add-ons in the designer
(necktie, bow tie, braces, belt — with rules: tie xor bow tie, braces bring braces buttons, belt
needs belt loops), "no sleeve buttons", guest "email me this design", promo codes and gift cards
(`promo_codes/{CODE}`, admin at `/admin/promo-codes`, applied in bag/checkout, re-validated
server-side, uses counted and gift-card balances drawn down on first payment), and international
courier delivery with foreign phone numbers (international format, email required) for overseas
suit buyers.

**Why:** Hockerty's configurator sells accessories inline, accepts coupons/gift cards in the bag,
lets guests save designs by email, and ships worldwide; USD display implied overseas buyers who
previously couldn't complete checkout (Kenyan-mobile-only rule).

**Not replicated:** photo-realistic 3D renders with skin tones (no render assets — the parametric
drawing stands in), fabric "looks" photos, body-profile photo upload (would need Firebase Storage).

## 2026-09-25 — Photo-style suit preview, close-up zoom, hide jacket

- `SuitPreview` redrawn as a lit product flat-lay (jacket large, trousers folded beneath) to match
  Hockerty's photographic renders without per-option photography. Cloth comes from generated,
  seamless textures in `public/textures/fabrics/<fabric id>.jpg` — run
  `python3 scripts/generate-fabric-textures.py` after adding a fabric. Volume comes from inner/cast
  shadows and layered-stroke creases (no blur filters on thin paths: they clip to the bounding box).
- Zoom opens a full-screen white close-up (Esc/× closes, +/− levels, scroll indicator) instead of
  an in-place scale.
- "Hide jacket" shows the shirt (and waistcoat on a three-piece) over the trousers; preview-only,
  not part of the order spec.

## 2026-09-25 — On-model photographic preview (owner picked option C)

- The designer's default view is now **On model**: studio photos of one model in a neutral light-grey
  suit, re-dyed in the browser (`components/suit/ModelPreview.tsx`). Per pose,
  `scripts/build-model-poses.py` turns `design/model-src/<pose>.jpg` into `public/model/<pose>/`
  (photo, normalised shading, part masks, background mask) + `lib/suit/model-poses.json`. The chosen
  fabric texture is tiled and multiplied by the shading inside the jacket/trousers/waistcoat masks;
  tie colour and skin tone (4 tones) are re-coloured the same way; the studio backdrop is made
  transparent.
- Poses: sb2 (with tie / without / bow tie), sb1 (with / without tie), double-breasted (with / without
  tie), three-piece (with / without tie), waistcoat-only and shirt-only (hide jacket), back, mandarin.
  `choosePose()` maps a configuration to a pose.
- Photos were AI-generated (Canva) from one base shot so pose, light and framing match. Details the
  photos can't show (lapel width, pocket style, buttons, vents, lining, monogram…) switch the stage to
  the flat drawings ("Flat", "Flat back", "Inside", "Waistcoat"), which still render every option.
  Swapping in a real photoshoot later = same poses, same file names, re-run the script.
- Bag, checkout, admin and saved-design thumbnails keep the flat drawing (no canvas work in lists).
