#!/usr/bin/env bash
# worktree-open.sh — Open a new iTerm2 window with claude in the given worktree.
# Usage: worktree-open.sh <worktree-path>

set -euo pipefail

WORKTREE_PATH="${1:?Usage: worktree-open.sh <worktree-path>}"

if [[ ! -d "$WORKTREE_PATH" ]]; then
  echo "Error: worktree path does not exist: $WORKTREE_PATH" >&2
  exit 1
fi

osascript -e "
  tell application \"iTerm2\"
    set newWindow to (create window with default profile)
    tell current session of newWindow
      write text \"cd '${WORKTREE_PATH}' && claude '/ctx-grab'\"
    end tell
  end tell
" 2>/dev/null || {
  echo "warn: iTerm2 osascript failed — open manually: cd '${WORKTREE_PATH}' && claude '/ctx-grab'" >&2
  exit 0
}

echo "opened=true"
echo "path=${WORKTREE_PATH}"
