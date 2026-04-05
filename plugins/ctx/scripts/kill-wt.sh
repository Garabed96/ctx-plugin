#!/bin/bash
# kill-wt.sh — Teardown a git worktree: kill port, remove worktree, delete branch.
#
# Usage:
#   kill-wt.sh [--port <port>] [--force] [--keep-branch]
#
# Must be run from inside the worktree you want to kill.
# Exit codes: 0=success, 1=bad args, 2=git error

set -euo pipefail

PORT=""
FORCE=false
KEEP_BRANCH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)        PORT="$2"; shift 2 ;;
    --force)       FORCE=true; shift ;;
    --keep-branch) KEEP_BRANCH=true; shift ;;
    -h|--help)
      echo "Usage: kill-wt.sh [--port <port>] [--force] [--keep-branch]"
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Detect worktree ──────────────────────────────────────
WORKTREE_PATH=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not in a git repo" >&2; exit 2; }
MAIN_REPO=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/\.git$||')

if [[ "$WORKTREE_PATH" == "$MAIN_REPO" ]]; then
  echo "Error: you are in the main worktree, not a linked worktree" >&2
  exit 2
fi

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")

echo "Worktree: $WORKTREE_PATH" >&2
echo "Branch:   $BRANCH" >&2

# ── Kill port ────────────────────────────────────────────
PORT_KILLED="none"
if [[ -n "$PORT" ]]; then
  PIDS=$(lsof -ti:"$PORT" 2>/dev/null || true)
  if [[ -n "$PIDS" ]]; then
    echo "Killing processes on port $PORT: $PIDS" >&2
    echo "$PIDS" | xargs kill -9 2>/dev/null || true
    PORT_KILLED="$PORT"
  else
    echo "No process found on port $PORT" >&2
  fi
fi

# ── Switch to main repo before removal ───────────────────
cd "$MAIN_REPO"

# ── Remove worktree ──────────────────────────────────────
if [[ "$FORCE" == true ]]; then
  git worktree remove --force "$WORKTREE_PATH" 2>&1 >&2
else
  git worktree remove "$WORKTREE_PATH" 2>&1 >&2
fi
echo "Worktree removed" >&2

# ── Delete branch if merged ──────────────────────────────
BRANCH_STATUS="kept"
if [[ "$KEEP_BRANCH" == false && -n "$BRANCH" && "$BRANCH" != "main" && "$BRANCH" != "master" ]]; then
  if git branch -d "$BRANCH" 2>/dev/null; then
    BRANCH_STATUS="deleted"
    echo "Branch '$BRANCH' deleted (was merged)" >&2
  else
    BRANCH_STATUS="kept (not fully merged)"
    echo "Branch '$BRANCH' not deleted (not fully merged)" >&2
  fi
fi

# ── Structured output ───────────────────────────────────
cat <<EOF
worktree=$WORKTREE_PATH
branch=$BRANCH
branch_status=$BRANCH_STATUS
port_killed=$PORT_KILLED
main_repo=$MAIN_REPO
EOF
