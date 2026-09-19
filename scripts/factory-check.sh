#!/usr/bin/env bash
# Software factory gate runner.
#
# Usage: scripts/factory-check.sh [gates|quick|full]
#   quick  -> typecheck + lint            (fast inner-loop check)
#   gates  -> typecheck + lint + build    (alias of full; matches manifest.gates)
#   full   -> typecheck + lint + build    (pre-ship / pre-stop gate)
set -euo pipefail
cd "$(git rev-parse --show-toplevel 2>/dev/null || dirname "$0"/..)"

MODE="${1:-full}"

run_typecheck() {
  echo "==> typecheck (tsc --noEmit)"
  npx tsc --noEmit
}

run_lint() {
  echo "==> lint (next lint)"
  npm run lint
}

run_build() {
  echo "==> build (next build)"
  npm run build
}

case "$MODE" in
  quick)
    run_typecheck
    run_lint
    ;;
  gates|full)
    run_typecheck
    run_lint
    run_build
    ;;
  *)
    echo "Usage: $0 [quick|gates|full]" >&2
    exit 1
    ;;
esac

echo "factory-check (${MODE}): PASS"
