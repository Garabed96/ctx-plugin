#!/bin/bash
# grab-restore.sh — Find, read, and archive a ctx-park handoff file.
# Pure function: reads handoff, archives it, gathers git context.
#
# Usage:
#   grab-restore.sh [--no-archive]
#
# Options:
#   --no-archive   Read the handoff but don't archive it (for preview)
#
# Exit codes:
#   0 — success (handoff found and read)
#   1 — no handoff file found
#   2 — not in a git repo

set -euo pipefail

NO_ARCHIVE=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-archive) NO_ARCHIVE=true; shift ;;
    -h|--help) echo "Usage: grab-restore.sh [--no-archive]"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Resolve context ───────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not in a git repo" >&2; exit 2; }
HANDOFF="$REPO_ROOT/.claude/ctx-park.md"
BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo "detached")
WORKTREE=$(basename "$REPO_ROOT")

# ── Find handoff ──────────────────────────────────────────
if [[ ! -f "$HANDOFF" ]]; then
  echo "status=not_found"
  echo "branch=$BRANCH"
  echo "worktree=$WORKTREE"
  exit 1
fi

# ── Read handoff ──────────────────────────────────────────
HANDOFF_CONTENT=$(cat "$HANDOFF")

# ── Archive ───────────────────────────────────────────────
ARCHIVE_PATH=""
if [[ "$NO_ARCHIVE" == false ]]; then
  ARCHIVE_PATH="$REPO_ROOT/.claude/ctx-park-$(date +%Y-%m-%d).md"
  # Handle multiple grabs on same day
  if [[ -f "$ARCHIVE_PATH" ]]; then
    COUNTER=1
    while [[ -f "${ARCHIVE_PATH%.md}-${COUNTER}.md" ]]; do
      ((COUNTER++))
    done
    ARCHIVE_PATH="${ARCHIVE_PATH%.md}-${COUNTER}.md"
  fi
  mv "$HANDOFF" "$ARCHIVE_PATH"
  echo "Archived to $(basename "$ARCHIVE_PATH")" >&2
fi

# ── Git log since park ────────────────────────────────────
GIT_LOG=$(git -C "$REPO_ROOT" log --oneline -10 2>/dev/null || echo "no commits")

# ── Structured output ────────────────────────────────────
echo "status=found"
echo "branch=$BRANCH"
echo "worktree=$WORKTREE"
echo "archive=$ARCHIVE_PATH"
echo "---handoff---"
echo "$HANDOFF_CONTENT"
echo "---git-log---"
echo "$GIT_LOG"
