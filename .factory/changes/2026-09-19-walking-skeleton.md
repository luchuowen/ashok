# Change: Walking skeleton — factory install + Measured House design system + Home page

- **Date:** 2026-09-19
- **Session / branch:** `claude/vibrant-hypatia-2ozqc0`
- **Batch scope:** repo bootstrap (§7 Mode B init), design system, full component library,
  route map, demo fixtures, Firebase client stub, and the Home page (`/`).

## Summary

Bootstrapped the empty repo with Next.js 14 (App Router, TypeScript, Tailwind CSS, ESLint),
installed the software factory (`.factory/`, `.claude/`, `scripts/factory-check.sh`), built the
"Measured House" design system as reusable components, and shipped the Home page as the first
fully composed route — proving the design system, nav model, and content fixtures end to end
before the remaining 23 routes fan out to later sessions.

## Files touched

- Scaffold: `package.json`, `tsconfig.json`, `next.config.mjs`, `tailwind.config.ts`,
  `postcss.config.mjs`, `.eslintrc.json`, `.gitignore`.
- Factory: `CLAUDE.md`, `.factory/manifest.json`, `.factory/DECISIONS.md`,
  `.factory/changes/TEMPLATE.md`, `.claude/settings.json`, `.claude/hooks/{guard,stop-gate,session-context}.sh`,
  `.claude/skills/{factory,change,verify,ship}/SKILL.md`, `.claude/agents/{reviewer,explorer}.md`,
  `scripts/factory-check.sh`.
- Design tokens: `app/globals.css`, `app/layout.tsx` (Fraunces + Work Sans via `next/font/google`).
- Data layer: `lib/nav.ts`, `lib/content/site.ts`, `lib/fixtures/*.ts` (products, fabrics,
  portfolio, measurements, orders, quotes, payments, appointments, preferences), `lib/firebase.ts`,
  `.env.example`.
- Components: `components/ui/*` (16 components), `components/layout/*` (Header, Footer,
  StickyBookBar), `components/portal/*` (PortalHeader, PortalTabs, StatCard, LedgerTable,
  Balance), `components/commerce/ProductCard.tsx`.
- Page: `app/page.tsx` (Home).

## Gates

- [x] `bash scripts/factory-check.sh quick` (typecheck + lint)
- [x] `bash scripts/factory-check.sh full` (typecheck + lint + build)
- [x] `npm run dev` smoke check — verified Home renders correctly at desktop and mobile widths
      against the Measured House reference (full-bleed hero with overlay copy, hairline
      dividers throughout, no rounded corners except 2px tags, gradient `ImagePlaceholder`
      boxes everywhere a photo will eventually go, sticky mobile booking bar hidden ≥900px).

## Decisions / follow-ups

- Header nav is a curated subset of `lib/nav.ts` (Atelier, Fabric Library, Process, Portfolio,
  Shop) matching the approved Home page copy exactly, not the full 8-item "core" group — see
  `components/layout/Header.tsx` comment.
- Home hero uses a full-bleed `ImagePlaceholder` background with an overlay gradient rather than
  a side-by-side layout, matching the approved reference's `.hero`/`.overlay` treatment. Built
  with `min-height` (not a fixed `aspect-ratio` + `overflow-hidden`) specifically so the
  headline never clips on narrow viewports when the copy wraps to more lines — confirmed via a
  390×844 mobile screenshot.
- `/journal` (phase2 group in `lib/nav.ts`) and the Style Advisor quiz logic behind `QuizBand`
  are explicitly out of scope for Phase 1 — see TODOs in `components/ui/QuizBand.tsx` and
  `.factory/DECISIONS.md`.
- Next session: pick up any other route from `lib/nav.ts`'s `core`/`commerce`/`portal` groups.
  Do not touch anything in `.factory/manifest.json`'s `protected` list unless the owner names
  that exact file.
