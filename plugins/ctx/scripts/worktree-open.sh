#!/usr/bin/env bash
# worktree-open.sh — Open a new terminal window with claude in the given worktree.
# Supports: tmux, iTerm2, Terminal.app. Falls back to manual instructions.
# Usage: worktree-open.sh <worktree-path>

set -euo pipefail

WORKTREE_PATH="${1:?Usage: worktree-open.sh <worktree-path>}"

if [[ ! -d "$WORKTREE_PATH" ]]; then
  echo "Error: worktree path does not exist: $WORKTREE_PATH" >&2
  exit 1
fi

# IMPORTANT: Never use `claude -p` or `claude '<prompt>'` — both run one prompt
# and exit. Launch interactive `claude`, then send /ctx-grab via keystroke after delay.

OPENED=false
TERM_APP="${TERM_PROGRAM:-}"

# ── tmux (terminal-agnostic, works inside any emulator) ──
if [[ -n "${TMUX:-}" ]]; then
  tmux new-window -c "$WORKTREE_PATH" "claude"
  # Send /ctx-grab after delay in background
  (sleep 5 && tmux send-keys "/ctx-grab" Enter) &
  OPENED=true

# ── iTerm2 (prefer env var, fall back to process check) ──
elif [[ "$TERM_APP" == "iTerm.app" ]] || pgrep -q iTerm2 2>/dev/null; then
  osascript -e "
    tell application \"iTerm2\"
      set newWindow to (create window with default profile)
      tell current session of newWindow
        write text \"cd '${WORKTREE_PATH}' && claude\"
        delay 5
        write text \"/ctx-grab\"
      end tell
    end tell
  " 2>/dev/null && OPENED=true

# ── Terminal.app ─────────────────────────────────────────
elif [[ "$TERM_APP" == "Apple_Terminal" ]] || [[ -z "$TERM_APP" ]]; then
  osascript -e "
    tell application \"Terminal\"
      do script \"cd '${WORKTREE_PATH}' && claude\"
      delay 5
      tell front window
        do script \"/ctx-grab\" in selected tab
      end tell
    end tell
  " 2>/dev/null && OPENED=true
fi

# ── Fallback ─────────────────────────────────────────────
if [[ "$OPENED" == false ]]; then
  echo "warn: could not open terminal — run manually: cd '${WORKTREE_PATH}' && claude" >&2
  exit 0
fi

echo "opened=true"
echo "path=${WORKTREE_PATH}"
