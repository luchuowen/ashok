#!/usr/bin/env bash
# SessionStart hook: surfaces the factory's standing rules as context.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MANIFEST="$ROOT/.factory/manifest.json"

[ -f "$MANIFEST" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

echo "## Software factory context (.factory/manifest.json)"
echo
echo "Phase: $(jq -r '.phase' "$MANIFEST")"
echo
echo "Protected (only touch if the owner names the exact file):"
jq -r '.protected[]? | "  - " + .' "$MANIFEST"
echo
echo "Append-only dirs (add files, never remove, in this phase):"
jq -r '.append_only_dirs[]? | "  - " + .' "$MANIFEST"
echo
echo "Critical paths (extra-careful, standing-only-sized changes):"
CRIT_COUNT="$(jq -r '.critical_paths | length' "$MANIFEST")"
if [ "$CRIT_COUNT" = "0" ]; then
  echo "  (none yet)"
else
  jq -r '.critical_paths[]? | "  - " + .' "$MANIFEST"
fi
echo
echo "Before ending a session: bash scripts/factory-check.sh full"
echo "See CLAUDE.md, .factory/DECISIONS.md, and lib/nav.ts before adding routes."
