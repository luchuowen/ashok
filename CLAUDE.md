# Ashok Sunny Tailored

Bespoke / made-to-measure tailoring site for Nairobi, Kenya. This file is read by every session
that touches this repo — later sessions should trust it over guessing.

## Stack

- Next.js 14 (App Router), TypeScript, Tailwind CSS, ESLint (`eslint-config-next`).
- No test runner yet. Phase 1 gates are **typecheck + lint + build** — see
  `scripts/factory-check.sh`.
- No backend yet: `lib/firebase.ts` initializes the Firebase client SDK from
  `NEXT_PUBLIC_FIREBASE_*` env vars but is not called from any page. `lib/fixtures/*.ts` holds
  typed demo data shaped 1:1 like the eventual Firestore documents — swapping to a live read
  later should be a one-file change per fixture.

## The software factory

- `.factory/manifest.json` — machine-readable source of truth for scope boundaries:
  - `critical_paths` — empty in Phase 1 (no auth, no payments, no live-DB migrations). Phase 2
    will add `auth/`, `lib/payments/`, `firestore.rules` here; those get smaller, more carefully
    reviewed changes.
  - `append_only_dirs` — `["app"]`. Route folders only ever gain new files in Phase 1; existing
    route files are not removed.
  - `protected` — `components/`, `lib/nav.ts`, `lib/content/site.ts`, `app/layout.tsx`,
    `app/globals.css`, `tailwind.config.ts`. These are this session's walking-skeleton output.
    A later batch session may only touch one if the human owner names that **exact file** in
    their request. `.claude/hooks/guard.sh` enforces this at the tool-call level.
- `.factory/DECISIONS.md` — append-only log of architectural/scope decisions. Read it before
  making a decision that might already have been made.
- `.factory/changes/` — one file per scoped change, from `TEMPLATE.md`. Use `/change` to start
  one.
- `scripts/factory-check.sh [quick|gates|full]` — the gate runner. `quick` = typecheck+lint,
  `full`/`gates` = typecheck+lint+build. Run `full` before ending any session.
- Skills: `/factory` (orient), `/change` (start scoped work), `/verify` (run gates), `/ship`
  (verify + commit + push, prompt-free once gates are green).
- Agents: `reviewer` (design-system + boundary review before shipping), `explorer` (fast
  read-only "where is X" lookups).

## Routes

`lib/nav.ts` is the single source of truth for all 24 routes (slug, href, label, group). Never
hardcode a nav href or label elsewhere — import from `lib/nav.ts`. Groups: `core` (8 marketing
pages), `commerce` (7: shop/cart/checkout/booking/contact/auth), `phase2` (1: `/journal`, not
built yet), `portal` (8 client-account pages under `/portal`).

## Design system — "Measured House"

Approved and exact. Do not invent alternatives.

- **Colors** (CSS variables in `app/globals.css`, mirrored into `tailwind.config.ts` theme):
  `--ink #14120F` (fg), `--cream #F4EEE3` (bg), `--oxblood #8A4432` (accent), `--muted #5b5648`,
  `--line #ddd3c1`.
- **Fonts**: display = Fraunces (400/500, optical size axis), body/UI = Work Sans (400/500/600).
  Loaded via `next/font/google` in `app/layout.tsx` — never a `<link>` tag.
- **No rounded corners** anywhere except a 2px radius on small tags/labels (`Tag`, `PriceChip`).
- **Hairline 1px borders** (`var(--line)`) are the primary structural device — not shadows, not
  shadow-cards.
- **Photography placeholders**: every image slot uses `ImagePlaceholder` (labelled gradient box)
  until real photography exists — never a broken `<img>`, never an unlabeled grey box. Label
  format: `"IMG-## · short shot description"`.

## The seven improvements (built as real components, not labels)

1. `QuizBand` (Style Advisor) — Phase 1: static promo banner linking to `/booking?ref=style-advisor`.
   Quiz logic is Phase 2 (see TODO in the component).
2. `/weddings-corporate` is its own route (built in a later batch).
3. `PriceChip` on every service page with a starting price.
4. `WaCTA` on Contact, Booking confirmation, and Portal Appointments.
5. Portal pages read "Your Record with the House" — never "Dashboard" or "Account".
6. `StickyBookBar` — mobile-only sticky bottom booking CTA, hidden ≥900px, included on every page.
7. No invented statistics in copy (no "500+ clients"). Trust-building details are specific and
   plausible, never round numbers.

## Conventions

- Business constants (name, address, phone, email, WhatsApp link) live in `lib/content/site.ts`
  — never re-typed inline.
- Component props should be typed explicitly; fixture field names should match what a Firestore
  document would look like.
- Don't start building any of the other routes beyond what a session was explicitly scoped to —
  check `.factory/manifest.json` and the relevant `.factory/changes/*.md` first.

## Custom suit engine (added 2026-09-24)

- Routes: `/custom-suits` (landing), `/custom-suits/design` (configurator; `?preset=`, `?fabric=`,
  `?d=<share code>`, `?edit=<bag line id>`, `?step=`), `/custom-suits/measurements` (fit profile),
  `/admin/custom-orders` (+ `/[id]` work ticket), `/portal/designs`.
- `lib/suit/` is client-safe and the single source of truth: `catalogue.ts` (fabrics, palettes,
  option groups + KES surcharges, presets, delivery), `rules.ts` (dependencies, normalisation, strict
  server validation), `pricing.ts`, `spec.ts`, `measurements.ts`, `codec.ts`. Never price a suit
  anywhere else. Bump `CATALOGUE_VERSION` when prices change.
- `components/suit/SuitPreview.tsx` draws every visible option; add drawing there when adding an
  option that changes the silhouette. Cloth textures: `public/textures/fabrics/<id>.jpg`, generated by
  `python3 scripts/generate-fabric-textures.py` — rerun it when adding a fabric.
- Orders: `source: "custom"` with `suits[]`, `fitProfile`, `delivery`, `paymentPlan`. Reconcile is
  amount-aware (deposits). See `.factory/DECISIONS.md` 2026-09-24.
- Promo codes & gift cards: `lib/promo-shared.ts` (maths, client-safe), `lib/promo.ts` (server),
  `/admin/promo-codes`. Discounts come off goods before delivery; checkout re-validates.
- Local dev without credentials: `.env.local` with `TAIFAPAY_ENV=mock`, `ASHOK_FAKE_FIRESTORE=1`.
