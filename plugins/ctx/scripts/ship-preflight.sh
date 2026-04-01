#!/bin/bash
# ship-preflight.sh — Gather git context for risk classification before shipping.
# Pure function: reads repo state, outputs structured data. Changes nothing.
#
# Usage:
#   ship-preflight.sh [--base <branch>]
#
# Exit codes:
#   0 — success
#   1 — not in a git repo
#   2 — not in a worktree (on main checkout)

set -euo pipefail

BASE="main"
while [[ $# -gt 0 ]]; do
  case "$1" in
    --base) BASE="$2"; shift 2 ;;
    -h|--help) echo "Usage: ship-preflight.sh [--base <branch>]"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Resolve context ───────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not in a git repo" >&2; exit 1; }
BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo "detached")
WORKTREE_DIR=$(pwd)

# Worktree check
MAIN_WORKTREE=$(git -C "$REPO_ROOT" worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')
if [[ "$REPO_ROOT" == "$MAIN_WORKTREE" && "$BRANCH" == "$BASE" ]]; then
  echo "Warning: on main checkout ($BRANCH) — consider using a worktree" >&2
fi

# ── Guard: on base branch means nothing to ship ──────────
if [[ "$BRANCH" == "$BASE" ]]; then
  echo "branch=$BRANCH"
  echo "base=$BASE"
  echo "worktree=$WORKTREE_DIR"
  echo "prod_files=0"
  echo "prod_lines=0"
  echo "all_stat=no changes (on $BASE)"
  echo "prod_stat=no production changes"
  echo "---files---"
  echo "none"
  echo "---risk-signals---"
  echo "on-base-branch"
  echo "---commits---"
  echo "none"
  exit 0
fi

# ── Changed files ─────────────────────────────────────────
ALL_FILES=$(git diff "$BASE"...HEAD --name-only 2>/dev/null || echo "")
ALL_STAT=$(git diff "$BASE"...HEAD --shortstat 2>/dev/null || echo "no changes")

# Production code only (exclude docs, tests, migrations, scripts, plans, skills)
PROD_STAT=$(git diff "$BASE"...HEAD --shortstat -- \
  '*.ts' '*.tsx' '*.py' '*.go' '*.rs' '*.js' '*.jsx' \
  ':!__tests__' ':!*/test/*' ':!*/tests/*' ':!scripts/*' \
  ':!docs/*' ':!migrations/*' ':!*.md' 2>/dev/null || echo "no production changes")

# Extract line count from shortstat
PROD_LINES=0
if [[ "$PROD_STAT" =~ ([0-9]+)\ insertion ]]; then
  PROD_LINES=${BASH_REMATCH[1]}
fi
if [[ "$PROD_STAT" =~ ([0-9]+)\ deletion ]]; then
  PROD_LINES=$((PROD_LINES + ${BASH_REMATCH[1]}))
fi

# File count
PROD_FILE_COUNT=$(git diff "$BASE"...HEAD --name-only -- \
  '*.ts' '*.tsx' '*.py' '*.go' '*.rs' '*.js' '*.jsx' \
  ':!__tests__' ':!*/test/*' ':!*/tests/*' ':!scripts/*' 2>/dev/null | wc -l | tr -d ' ')

# ── Risk signals ──────────────────────────────────────────
RISK_SIGNALS=""

# Auth/security files
if echo "$ALL_FILES" | grep -qiE '(auth|security|permission|session|token|middleware)'; then
  RISK_SIGNALS="${RISK_SIGNALS}auth-related-files\n"
fi

# Data model changes
if echo "$ALL_FILES" | grep -qiE '(migration|schema|model|prisma|drizzle)'; then
  RISK_SIGNALS="${RISK_SIGNALS}data-model-changes\n"
fi

# Config changes
if echo "$ALL_FILES" | grep -qiE '(config|\.env|docker|ci|deploy)'; then
  RISK_SIGNALS="${RISK_SIGNALS}config-changes\n"
fi

# Scope warning
if [[ $PROD_LINES -ge 500 ]]; then
  RISK_SIGNALS="${RISK_SIGNALS}scope-over-500-lines\n"
elif [[ $PROD_LINES -ge 400 ]]; then
  RISK_SIGNALS="${RISK_SIGNALS}scope-warning-400-plus\n"
fi

# ── Commit log ────────────────────────────────────────────
COMMIT_LOG=$(git log "$BASE"...HEAD --oneline 2>/dev/null || echo "no commits ahead of $BASE")

# ── Structured output ────────────────────────────────────
echo "branch=$BRANCH"
echo "base=$BASE"
echo "worktree=$WORKTREE_DIR"
echo "prod_files=$PROD_FILE_COUNT"
echo "prod_lines=$PROD_LINES"
echo "all_stat=$ALL_STAT"
echo "prod_stat=$PROD_STAT"
echo "---files---"
if [[ -n "$ALL_FILES" ]]; then
  echo "$ALL_FILES"
else
  echo "none"
fi
echo "---risk-signals---"
if [[ -n "$RISK_SIGNALS" ]]; then
  echo -e "$RISK_SIGNALS" | sed '/^$/d'
else
  echo "none"
fi
echo "---commits---"
echo "$COMMIT_LOG"
