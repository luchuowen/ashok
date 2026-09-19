#!/usr/bin/env bash
# Stop hook: refuses to let the session end while the gates are red.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

if [ ! -f scripts/factory-check.sh ]; then
  # Bootstrapping: gates don't exist yet, nothing to enforce.
  exit 0
fi

if bash scripts/factory-check.sh full > /tmp/factory-stop-gate.log 2>&1; then
  exit 0
fi

echo "STOP BLOCKED: 'bash scripts/factory-check.sh full' is red. Fix the failing gate before ending the session." >&2
tail -n 40 /tmp/factory-stop-gate.log >&2
exit 2
