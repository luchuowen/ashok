#!/usr/bin/env bash
# PreToolUse hook (Edit|Write|NotebookEdit|Bash).
#
# Enforces .factory/manifest.json:
#   - `protected`         : files/dirs a batch session may only touch if the human
#                            owner names that exact file. Blocked unless
#                            FACTORY_ALLOW_PROTECTED=1 is set (set that only after
#                            the owner has explicitly named the file in this session).
#   - `append_only_dirs`  : dirs whose files may be added to but never removed
#                            from, in Phase 1. Blocks destructive shell commands
#                            (rm/git rm/mv out of the dir) that target them.
set -euo pipefail
ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
MANIFEST="$ROOT/.factory/manifest.json"

INPUT="$(cat)"
[ -f "$MANIFEST" ] || exit 0
command -v jq >/dev/null 2>&1 || exit 0

# Bootstrap exception: before the first commit exists, this *is* the session
# that produces the protected files in the first place (the walking skeleton).
# Protection applies to *later* sessions, once history exists.
if ! git -C "$ROOT" rev-parse HEAD >/dev/null 2>&1; then
  exit 0
fi

TOOL_NAME="$(echo "$INPUT" | jq -r '.tool_name // empty')"
FILE_PATH="$(echo "$INPUT" | jq -r '.tool_input.file_path // empty')"
COMMAND="$(echo "$INPUT" | jq -r '.tool_input.command // empty')"

if [ "${FACTORY_ALLOW_PROTECTED:-0}" = "1" ]; then
  exit 0
fi

if [ -n "$FILE_PATH" ]; then
  REL="${FILE_PATH#"$ROOT"/}"
  while IFS= read -r p; do
    [ -n "$p" ] || continue
    if [ "$REL" = "$p" ] || [[ "$REL" == "$p"* && "$p" == */ ]]; then
      echo "BLOCKED: '$p' is protected in .factory/manifest.json. It is this session's output — a later batch session may only touch it if the human owner names this exact file in their request. Set FACTORY_ALLOW_PROTECTED=1 only once that approval has been given." >&2
      exit 2
    fi
  done < <(jq -r '.protected[]?' "$MANIFEST")
fi

if [ "$TOOL_NAME" = "Bash" ] && [ -n "$COMMAND" ]; then
  if echo "$COMMAND" | grep -qE '(^|[[:space:]])(rm|git rm|mv)([[:space:]]|$)'; then
    while IFS= read -r dir; do
      [ -n "$dir" ] || continue
      if echo "$COMMAND" | grep -qE "(^|[[:space:]])$dir/"; then
        echo "BLOCKED: '$dir' is append-only in .factory/manifest.json — files may be added, never removed, in Phase 1. Set FACTORY_ALLOW_PROTECTED=1 only with explicit owner approval." >&2
        exit 2
      fi
    done < <(jq -r '.append_only_dirs[]?' "$MANIFEST")
    while IFS= read -r p; do
      [ -n "$p" ] || continue
      if echo "$COMMAND" | grep -qF "$p"; then
        echo "BLOCKED: command touches protected path '$p' (.factory/manifest.json)." >&2
        exit 2
      fi
    done < <(jq -r '.protected[]?' "$MANIFEST")
  fi
fi

exit 0
