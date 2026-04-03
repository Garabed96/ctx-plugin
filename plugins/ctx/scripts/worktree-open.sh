#!/usr/bin/env bash
# worktree-open.sh — Open a new iTerm2 window with claude in the given worktree.
# Usage: worktree-open.sh <worktree-path>

set -euo pipefail

WORKTREE_PATH="${1:?Usage: worktree-open.sh <worktree-path>}"

if [[ ! -d "$WORKTREE_PATH" ]]; then
  echo "Error: worktree path does not exist: $WORKTREE_PATH" >&2
  exit 1
fi

# IMPORTANT: Never use `claude -p` or `claude '<prompt>'` — both run one prompt
# and exit. Launch interactive `claude`, then send /ctx-grab via keystroke after delay.
osascript -e "
  tell application \"iTerm2\"
    set newWindow to (create window with default profile)
    tell current session of newWindow
      write text \"cd '${WORKTREE_PATH}' && claude\"
      delay 5
      write text \"/ctx-grab\"
    end tell
  end tell
" 2>/dev/null || {
  # Fallback: try Terminal.app
  osascript -e "
    tell application \"Terminal\"
      do script \"cd '${WORKTREE_PATH}' && claude\"
      delay 5
      tell front window
        do script \"/ctx-grab\" in selected tab
      end tell
    end tell
  " 2>/dev/null || {
    echo "warn: could not open terminal — run manually: cd '${WORKTREE_PATH}' && claude" >&2
    exit 0
  }
}

echo "opened=true"
echo "path=${WORKTREE_PATH}"
