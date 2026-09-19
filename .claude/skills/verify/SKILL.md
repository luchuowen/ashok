---
name: verify
description: Run the project's gates (typecheck, lint, build) via scripts/factory-check.sh. Use before ending a session or before /ship.
---

# /verify [quick|full]

Runs `bash scripts/factory-check.sh <mode>` (default `full`):

- `quick` — typecheck + lint. Use for a fast inner-loop check while iterating.
- `full` — typecheck + lint + build. Required before `/ship` and before ending any session; the
  `Stop` hook (`.claude/hooks/stop-gate.sh`) also enforces this automatically.

If a gate fails, fix the root cause — do not skip, disable, or weaken a check to get green.
