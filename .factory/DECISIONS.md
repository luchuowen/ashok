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
