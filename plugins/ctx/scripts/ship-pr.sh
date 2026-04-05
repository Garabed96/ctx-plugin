#!/bin/bash
# ship-pr.sh — Commit, push, and create a PR in one shot.
# Takes LLM-generated content as arguments. Handles the git mechanics.
#
# Usage:
#   ship-pr.sh --files <file1> [<file2>...] --message <commit-msg> \
#              --title <pr-title> --body <pr-body> [--base <branch>] [--draft]
#
# Exit codes:
#   0 — success (PR created)
#   1 — bad arguments
#   2 — git error (commit/push failed)
#   3 — gh pr create failed

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
FILES=()
MESSAGE=""
TITLE=""
BODY=""
BASE="main"
DRAFT=false

# ── Parse args ────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --files)
      shift
      while [[ $# -gt 0 && ! "$1" =~ ^-- ]]; do
        FILES+=("$1"); shift
      done
      ;;
    --message) MESSAGE="$2"; shift 2 ;;
    --title)   TITLE="$2"; shift 2 ;;
    --body)    BODY="$2"; shift 2 ;;
    --base)    BASE="$2"; shift 2 ;;
    --draft)   DRAFT=true; shift ;;
    -h|--help)
      echo "Usage: ship-pr.sh --files <files...> --message <msg> --title <title> --body <body> [--base <branch>] [--draft]"
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$TITLE" ]] && { echo "Error: --title is required" >&2; exit 1; }
[[ -z "$BODY" ]] && { echo "Error: --body is required" >&2; exit 1; }

BRANCH=$(git branch --show-current 2>/dev/null || echo "detached")
COMMIT_SHA=$(git rev-parse --short HEAD)

# ── Stage + Commit (skip if nothing to commit) ───────────
if [[ ${#FILES[@]} -gt 0 ]]; then
  [[ -z "$MESSAGE" ]] && { echo "Error: --message is required when --files are provided" >&2; exit 1; }

  echo "Staging ${#FILES[@]} file(s)..." >&2
  git add "${FILES[@]}" 2>&1 >&2 || { echo "Error: git add failed" >&2; exit 2; }

  STAGED=$(git diff --cached --name-only)
  if [[ -n "$STAGED" ]]; then
    echo "Staged: $(echo "$STAGED" | wc -l | tr -d ' ') file(s)" >&2
    echo "Committing..." >&2
    git commit -m "$MESSAGE" 2>&1 >&2 || { echo "Error: git commit failed" >&2; exit 2; }
    COMMIT_SHA=$(git rev-parse --short HEAD)
    echo "Committed: $COMMIT_SHA" >&2
  else
    echo "Nothing to commit — files already committed" >&2
  fi
else
  echo "No --files provided — skipping stage/commit" >&2
fi

# ── Push (skip if already up to date) ────────────────────
echo "Pushing $BRANCH..." >&2
git push -u origin "$BRANCH" 2>&1 >&2 || echo "Already up to date" >&2

# ── Create PR ─────────────────────────────────────────────
echo "Creating PR..." >&2
DRAFT_FLAG=""
if [[ "$DRAFT" == true ]]; then
  DRAFT_FLAG="--draft"
fi

PR_URL=$(gh pr create \
  --base "$BASE" \
  --title "$TITLE" \
  --body "$BODY" \
  $DRAFT_FLAG 2>&1) || { echo "Error: gh pr create failed" >&2; echo "$PR_URL" >&2; exit 3; }

echo "PR created: $PR_URL" >&2

# ── Structured output ────────────────────────────────────
echo "commit=$COMMIT_SHA"
echo "branch=$BRANCH"
echo "base=$BASE"
echo "pr_url=$PR_URL"
echo "draft=$DRAFT"
