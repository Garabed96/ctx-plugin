#!/bin/bash
# kill-wt.sh — Teardown a git worktree: kill port, remove worktree, delete branch.
#
# Usage:
#   kill-wt.sh [--port <port>] [--force] [--keep-branch] [--worktree <path>] [--detach]
#
# Can be run from inside the worktree OR from outside with --worktree <path>.
# Use --detach when running from inside the worktree being killed — spawns
# the teardown in a background shell so the calling session isn't destroyed.
# Exit codes: 0=success, 1=bad args, 2=git error

set -euo pipefail

PORT=""
FORCE=false
KEEP_BRANCH=false
WORKTREE_ARG=""
DETACH=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)        PORT="$2"; shift 2 ;;
    --force)       FORCE=true; shift ;;
    --keep-branch) KEEP_BRANCH=true; shift ;;
    --worktree)    WORKTREE_ARG="$2"; shift 2 ;;
    --detach)      DETACH=true; shift ;;
    -h|--help)
      echo "Usage: kill-wt.sh [--port <port>] [--force] [--keep-branch] [--worktree <path>] [--detach]"
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Detect worktree ──────────────────────────────────────
if [[ -n "$WORKTREE_ARG" ]]; then
  # Worktree path provided explicitly — resolve and validate
  WORKTREE_PATH=$(cd "$WORKTREE_ARG" && git rev-parse --show-toplevel 2>/dev/null) || {
    echo "Error: '$WORKTREE_ARG' is not a valid git worktree" >&2; exit 2;
  }
  MAIN_REPO=$(cd "$WORKTREE_ARG" && git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/\.git$||')
  BRANCH=$(cd "$WORKTREE_ARG" && git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
else
  # Detect from current directory
  WORKTREE_PATH=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not in a git repo" >&2; exit 2; }
  MAIN_REPO=$(git rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/\.git$||')
  BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")
fi

if [[ "$WORKTREE_PATH" == "$MAIN_REPO" ]]; then
  echo "Error: target is the main worktree, not a linked worktree" >&2
  exit 2
fi

echo "Worktree: $WORKTREE_PATH" >&2
echo "Branch:   $BRANCH" >&2

# ── Detach mode: re-launch from main repo in background ──
if [[ "$DETACH" == true ]]; then
  LOG="/tmp/kill-wt-$(date +%s).log"
  # Build the args to forward (without --detach, with explicit --worktree)
  FWD_ARGS=("--worktree" "$WORKTREE_PATH")
  [[ -n "$PORT" ]]           && FWD_ARGS+=("--port" "$PORT")
  [[ "$FORCE" == true ]]     && FWD_ARGS+=("--force")
  [[ "$KEEP_BRANCH" == true ]] && FWD_ARGS+=("--keep-branch")

  SCRIPT_PATH="$(cd "$(dirname "$0")" && pwd)/$(basename "$0")"
  nohup bash -c "cd '$MAIN_REPO' && bash '$SCRIPT_PATH' ${FWD_ARGS[*]}" > "$LOG" 2>&1 &
  echo "Detached teardown spawned (pid $!, log: $LOG)" >&2
  cat <<EOF
detached=true
log=$LOG
main_repo=$MAIN_REPO
worktree=$WORKTREE_PATH
branch=$BRANCH
EOF
  exit 0
fi

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

# ── Fetch latest so branch -d knows what's merged ───────
git fetch origin 2>/dev/null && echo "Fetched latest from origin" >&2 || echo "warn: fetch failed (offline?)" >&2

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
