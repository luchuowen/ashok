---
name: change
description: Start a new scoped change on the Ashok Sunny Tailored codebase — creates a change record from the template and confirms scope against manifest boundaries. Use when beginning a new batch of work (e.g. a new route or component set).
---

# /change <short description>

1. Copy `.factory/changes/TEMPLATE.md` to `.factory/changes/<yyyy-mm-dd>-<slug>.md` and fill in
   the date, session/branch, and intended scope.
2. Cross-check the intended scope against `.factory/manifest.json`:
   - If it touches a `protected` path, stop and confirm the human owner named that exact file.
   - If it removes a file from an `append_only_dirs` directory, stop and confirm explicitly.
   - If it touches a `critical_paths` entry, treat it as standing-only-sized: smaller diff,
     extra self-review, call out the risk in the change record.
3. Do the work.
4. Before wrapping up, run `/verify` and fill in the "Gates" checklist in the change record.
