# Change: <short title>

- **Date:**
- **Session / branch:**
- **Batch scope:** (which routes/components this change touched — cross-check against
  `.factory/manifest.json` `protected` and `append_only_dirs`)

## Summary

One paragraph: what changed and why, in plain language.

## Files touched

- `path/to/file` — what changed

## Gates

- [ ] `bash scripts/factory-check.sh quick` (typecheck + lint)
- [ ] `bash scripts/factory-check.sh full` (typecheck + lint + build)
- [ ] `npm run dev` smoke check against the reference design

## Decisions / follow-ups

Anything worth a `.factory/DECISIONS.md` entry, or a TODO left for the next session.
