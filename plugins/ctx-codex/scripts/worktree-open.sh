#!/usr/bin/env bash
# worktree-open.sh — Open the given worktree in WebStorm.
# Falls back to a manual `open` command if WebStorm cannot be launched.
# Usage: worktree-open.sh <worktree-path>

set -euo pipefail

WORKTREE_PATH="${1:?Usage: worktree-open.sh <worktree-path>}"

if [[ ! -d "$WORKTREE_PATH" ]]; then
  echo "Error: worktree path does not exist: $WORKTREE_PATH" >&2
  exit 1
fi

if open -a "WebStorm" "$WORKTREE_PATH" 2>/dev/null; then
  echo "opened=true"
  echo "path=${WORKTREE_PATH}"
  echo "app=WebStorm"
  exit 0
fi

echo "warn: could not open WebStorm — run manually: open -a \"WebStorm\" '${WORKTREE_PATH}'" >&2
exit 0
