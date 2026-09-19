---
name: ship
description: Verify gates are green, then commit and push the current change to origin, prompt-free. Use when a scoped change from /change is complete and ready to land.
---

# /ship

1. Run `/verify full`. Do not proceed if it's red.
2. `git status` — confirm only the files intended for this change are staged. Never
   `git add -A` blindly; add files by name.
3. Commit with a conventional commit message (`feat:`, `fix:`, `chore:`, etc.) describing the
   change, not the mechanics.
4. `git push -u origin <current-branch>`.
5. Update the change record under `.factory/changes/` with the final gate results and mark it
   done. Add a `.factory/DECISIONS.md` entry only if this change made an architectural or scope
   decision worth remembering for later sessions.

Never force-push, rebase, or amend a commit that's already been pushed — `.claude/settings.json`
denies these and `git commit --amend`/`git push --force` should not be attempted even if a hook
doesn't catch it.
