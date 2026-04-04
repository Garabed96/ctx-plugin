#!/bin/bash
# auto-pr.sh — Post-push: typecheck + create draft PR.
# Runs as a PostToolUse hook after `git push`. Zero LLM tokens on happy path.
#
# Flow:
#   1. Skip if on main/master
#   2. Skip if PR already exists
#   3. Typecheck (environment-aware: turbo > pnpm script > tsc > skip)
#   4. Create draft PR with --fill (uses commit messages as body)
#
# Exit codes:
#   0 — success or no-op
#   2 — typecheck or PR creation failed (blocks model, injects error)

set -euo pipefail

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Not in a git repo" >&2; exit 0; }
BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null || echo "detached")
BASE="main"

# ── Guard: detect base branch name ──────────────────────
if git -C "$REPO_ROOT" show-ref --verify --quiet refs/heads/master 2>/dev/null && \
   ! git -C "$REPO_ROOT" show-ref --verify --quiet refs/heads/main 2>/dev/null; then
  BASE="master"
fi

# ── Guard: no-op on base branch ─────────────────────────
if [[ "$BRANCH" == "$BASE" || "$BRANCH" == "detached" ]]; then
  exit 0
fi

# ── Guard: PR already exists ────────────────────────────
EXISTING_PR=$(gh pr view --json url --jq '.url' 2>/dev/null || echo "")
if [[ -n "$EXISTING_PR" ]]; then
  echo "pr_url=$EXISTING_PR"
  echo "status=existing"
  exit 0
fi

# ── Typecheck (environment-aware) ────────────────────────
TYPECHECK_SCOPE="none"

run_typecheck() {
  if [[ -f "$REPO_ROOT/turbo.json" ]]; then
    # Monorepo with Turborepo — check cross-package
    CHANGED_PKGS=$(git diff --name-only "$BASE"...HEAD 2>/dev/null | cut -d/ -f1-2 | sort -u | grep -E '^(apps|packages)/' || true)
    PKG_COUNT=$(echo "$CHANGED_PKGS" | grep -c . || true)

    if [[ $PKG_COUNT -eq 0 ]]; then
      TYPECHECK_SCOPE="skipped (no app/package changes)"
      return 0
    elif [[ $PKG_COUNT -eq 1 ]]; then
      TYPECHECK_SCOPE="scoped: $CHANGED_PKGS"
      echo "Typechecking $CHANGED_PKGS..." >&2
      (cd "$REPO_ROOT" && turbo run type-check --filter="$CHANGED_PKGS" 2>&1) >&2
    else
      TYPECHECK_SCOPE="full ($PKG_COUNT packages)"
      echo "Typechecking $PKG_COUNT packages..." >&2
      (cd "$REPO_ROOT" && turbo run type-check 2>&1) >&2
    fi

  elif [[ -f "$REPO_ROOT/package.json" ]] && grep -qE '"type-check"|"typecheck"' "$REPO_ROOT/package.json"; then
    # Single repo with typecheck script
    TYPECHECK_SCOPE="package script"
    SCRIPT_NAME=$(grep -oE '"type-check"|"typecheck"' "$REPO_ROOT/package.json" | head -1 | tr -d '"')
    echo "Running $SCRIPT_NAME..." >&2
    (cd "$REPO_ROOT" && pnpm run "$SCRIPT_NAME" 2>&1) >&2

  elif [[ -f "$REPO_ROOT/tsconfig.json" ]] && command -v tsc &>/dev/null; then
    # Raw tsc (only if tsconfig exists)
    TYPECHECK_SCOPE="tsc --noEmit"
    echo "Running tsc --noEmit..." >&2
    (cd "$REPO_ROOT" && tsc --noEmit 2>&1) >&2

  else
    TYPECHECK_SCOPE="skipped (no typecheck available)"
    return 0
  fi
}

if ! run_typecheck; then
  echo "Typecheck failed (scope: $TYPECHECK_SCOPE). Fix type errors before PR can be created." >&2
  exit 2
fi

# ── Create draft PR ──────────────────────────────────────
echo "Creating draft PR..." >&2
PR_OUTPUT=$(gh pr create --draft --fill 2>&1) || {
  echo "gh pr create failed:" >&2
  echo "$PR_OUTPUT" >&2
  exit 2
}
PR_URL=$(echo "$PR_OUTPUT" | grep -oE 'https://github\.com/[^ ]+' | head -1)

echo "Draft PR created: $PR_URL" >&2

# ── Structured output ────────────────────────────────────
echo "pr_url=$PR_URL"
echo "branch=$BRANCH"
echo "base=$BASE"
echo "typecheck_scope=$TYPECHECK_SCOPE"
echo "status=created"
