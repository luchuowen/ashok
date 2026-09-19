---
name: factory
description: Orient in the Ashok Sunny Tailored software factory — read the manifest, decisions log, and nav map before making changes. Use at the start of a session on this repo.
---

# /factory

Orientation command. Run this before touching code in a new session.

1. Read `.factory/manifest.json` — note `phase`, `critical_paths`, `append_only_dirs`, and
   `protected`. Anything in `protected` may only be edited if the human owner names that exact
   file for this session.
2. Read `.factory/DECISIONS.md` (most recent entries first) for context on why things are the
   way they are.
3. Read `lib/nav.ts` for the authoritative list of all routes, slugs, and nav groups. Never
   invent a route path or label that isn't there — if a route is missing, add it to `lib/nav.ts`
   in the same change (it's protected only insofar as no unrelated edits are allowed).
4. Read `CLAUDE.md` for stack conventions and the design system reference.
5. Report back: what phase we're in, what's already built (skim `app/` and `components/`), and
   what this session's change should scope to.
