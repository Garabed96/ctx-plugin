#!/bin/bash
# park-scan.sh — Gather artifacts and session metadata for ctx-park handoff.
# Pure function: scans worktree, outputs structured data. Does NOT write the handoff.
#
# Usage:
#   park-scan.sh [--clean-log]
#
# Options:
#   --clean-log   Remove skill-invocations.log after reading it
#
# Exit codes:
#   0 — success
#   1 — not in a git repo

set -euo pipefail

CLEAN_LOG=false
while [[ $# -gt 0 ]]; do
  case "$1" in
    --clean-log) CLEAN_LOG=true; shift ;;
    -h|--help) echo "Usage: park-scan.sh [--clean-log]"; exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

# ── Resolve context ───────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not in a git repo" >&2; exit 1; }
BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo "detached")
WORKTREE=$(basename "$REPO_ROOT")
TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# ── Scan for artifacts ────────────────────────────────────
ARTIFACTS=""
scan_dir() {
  local dir="$1"
  local label="$2"
  if [[ -d "$REPO_ROOT/$dir" ]]; then
    while IFS= read -r f; do
      [[ -z "$f" ]] && continue
      REL="${f#$REPO_ROOT/}"
      ARTIFACTS="${ARTIFACTS}${label}|${REL}\n"
    done < <(find "$REPO_ROOT/$dir" -name '*.md' -type f 2>/dev/null)
  fi
}

# Plans
scan_dir "docs/superpowers/plans" "plan"
scan_dir "docs/ctx/plans" "plan"
scan_dir "docs/plans" "plan"

# Specs
scan_dir "docs/superpowers/specs" "spec"
scan_dir "docs/ctx/specs" "spec"
scan_dir "docs/specs" "spec"

# Docs
if [[ -d "$REPO_ROOT/docs" ]]; then
  for f in "$REPO_ROOT"/docs/*.md; do
    [[ -f "$f" ]] || continue
    REL="${f#$REPO_ROOT/}"
    ARTIFACTS="${ARTIFACTS}doc|${REL}\n"
  done
fi

# Playgrounds
if [[ -d "$REPO_ROOT/playground" ]]; then
  for f in "$REPO_ROOT"/playground/*.html; do
    [[ -f "$f" ]] || continue
    REL="${f#$REPO_ROOT/}"
    ARTIFACTS="${ARTIFACTS}playground|${REL}\n"
  done
fi

# Global plans — only recent (modified in last 24h, likely this session)
if [[ -d "$HOME/.claude/plans" ]]; then
  while IFS= read -r f; do
    [[ -z "$f" ]] && continue
    ARTIFACTS="${ARTIFACTS}global-plan|${f}\n"
  done < <(find "$HOME/.claude/plans" -name '*.md' -type f -mtime -1 2>/dev/null)
fi

# ── Skill invocation log ─────────────────────────────────
SKILL_LOG=""
LOG_PATH="$REPO_ROOT/.claude/skill-invocations.log"
if [[ -f "$LOG_PATH" ]]; then
  SKILL_LOG=$(cat "$LOG_PATH")
  if [[ "$CLEAN_LOG" == true ]]; then
    rm "$LOG_PATH"
    echo "Cleared skill-invocations.log" >&2
  fi
fi

# ── Structured output ────────────────────────────────────
echo "branch=$BRANCH"
echo "worktree=$WORKTREE"
echo "timestamp=$TIMESTAMP"
echo "repo_root=$REPO_ROOT"
echo "handoff_path=$REPO_ROOT/docs/ctx/park.md"
echo "---artifacts---"
if [[ -n "$ARTIFACTS" ]]; then
  echo -e "$ARTIFACTS" | sed '/^$/d'
else
  echo "none"
fi
echo "---skill-log---"
if [[ -n "$SKILL_LOG" ]]; then
  echo "$SKILL_LOG"
else
  echo "none"
fi
