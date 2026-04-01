#!/bin/bash
# test-scripts.sh — Integration tests for ctx-plugin scripts.
# Creates a throwaway git repo, exercises each script, asserts structured output.
#
# Usage:
#   test-scripts.sh
#
# Exit codes:
#   0 — all tests pass
#   1 — one or more tests failed

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Resolve symlinks (macOS /tmp → /private/var/folders)
TEMP_DIR=$(cd "$(mktemp -d)" && pwd -P)
PASS=0
FAIL=0

cleanup() {
  # Remove worktrees before deleting the repo
  if [[ -d "$TEMP_DIR/test-repo" ]]; then
    git -C "$TEMP_DIR/test-repo" worktree list --porcelain 2>/dev/null | \
      grep '^worktree ' | sed 's/^worktree //' | \
      while read -r wt; do
        [[ "$wt" == "$TEMP_DIR/test-repo" ]] && continue
        git -C "$TEMP_DIR/test-repo" worktree remove --force "$wt" 2>/dev/null || true
      done
  fi
  rm -rf "$TEMP_DIR"
}
trap cleanup EXIT

assert_contains() {
  local label="$1" output="$2" expected="$3"
  if echo "$output" | grep -qF -- "$expected"; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — expected '$expected' in output"
    echo "  GOT: $output"
    FAIL=$((FAIL + 1))
  fi
}

assert_exit_code() {
  local label="$1" actual="$2" expected="$3"
  if [[ "$actual" == "$expected" ]]; then
    echo "  PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "  FAIL: $label — expected exit $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

# ── Setup: create a throwaway git repo with a remote ──────
echo "Setting up test repo..."
mkdir -p "$TEMP_DIR/test-repo-bare"
git -C "$TEMP_DIR/test-repo-bare" init --bare -q

git clone -q "$TEMP_DIR/test-repo-bare" "$TEMP_DIR/test-repo"
cd "$TEMP_DIR/test-repo"
git config user.email "test@test.com"
git config user.name "Test"

# Initial commit on main
echo "hello" > file.txt
git add file.txt
git commit -q -m "init"
git push -q origin main

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: worktree-create.sh ==="

# Happy path
OUTPUT=$(bash "$SCRIPT_DIR/worktree-create.sh" --name test-wt --base main --prefix feat/ --skip-deps 2>/dev/null)
assert_contains "outputs path" "$OUTPUT" "path=$TEMP_DIR/test-repo-test-wt"
assert_contains "outputs branch" "$OUTPUT" "branch=feat/test-wt"
assert_contains "outputs base" "$OUTPUT" "base=main"
assert_contains "outputs deps=skipped" "$OUTPUT" "deps=skipped"

# Verify worktree actually exists
if [[ -d "$TEMP_DIR/test-repo-test-wt" ]]; then
  echo "  PASS: worktree directory exists"
  PASS=$((PASS + 1))
else
  echo "  FAIL: worktree directory not created"
  FAIL=$((FAIL + 1))
fi

# Already exists
OUTPUT=$(bash "$SCRIPT_DIR/worktree-create.sh" --name test-wt --base main --skip-deps 2>&1 || true)
assert_contains "detects existing dir" "$OUTPUT" "already exists"

# Missing --name
OUTPUT=$(bash "$SCRIPT_DIR/worktree-create.sh" --skip-deps 2>&1 || true)
assert_contains "requires --name" "$OUTPUT" "--name is required"

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: park-scan.sh ==="

# No artifacts, no skill log
OUTPUT=$(bash "$SCRIPT_DIR/park-scan.sh" 2>/dev/null)
assert_contains "outputs branch" "$OUTPUT" "branch=main"
assert_contains "outputs worktree" "$OUTPUT" "worktree=test-repo"
assert_contains "outputs handoff_path" "$OUTPUT" "handoff_path=$TEMP_DIR/test-repo/.claude/ctx-park.md"
assert_contains "no artifacts" "$OUTPUT" "none"

# With artifacts
mkdir -p docs/specs
echo "# Spec" > docs/specs/test-spec.md
OUTPUT=$(bash "$SCRIPT_DIR/park-scan.sh" 2>/dev/null)
assert_contains "finds spec artifact" "$OUTPUT" "spec|docs/specs/test-spec.md"

# With skill log
mkdir -p .claude
echo "2026-04-01T12:00:00Z|ctx-brainstorm|main" > .claude/skill-invocations.log
OUTPUT=$(bash "$SCRIPT_DIR/park-scan.sh" --clean-log 2>/dev/null)
assert_contains "reads skill log" "$OUTPUT" "ctx-brainstorm"

# Verify log was cleaned
if [[ ! -f .claude/skill-invocations.log ]]; then
  echo "  PASS: skill log cleaned"
  PASS=$((PASS + 1))
else
  echo "  FAIL: skill log not cleaned"
  FAIL=$((FAIL + 1))
fi

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: grab-restore.sh ==="

# No handoff
OUTPUT=$(bash "$SCRIPT_DIR/grab-restore.sh" 2>/dev/null || true)
assert_contains "status not_found" "$OUTPUT" "status=not_found"

# Create handoff and test happy path
mkdir -p .claude
cat > .claude/ctx-park.md <<'HANDOFF'
# Context Park — test-repo

**Parked:** 2026-04-01T12:00:00Z
**Branch:** feat/test
**Session:** Test session

## Smart Context

1. This is a test handoff
HANDOFF

OUTPUT=$(bash "$SCRIPT_DIR/grab-restore.sh" 2>/dev/null)
assert_contains "status found" "$OUTPUT" "status=found"
assert_contains "handoff content" "$OUTPUT" "This is a test handoff"
assert_contains "has git log" "$OUTPUT" "---git-log---"

# Verify archived
if [[ -f ".claude/ctx-park-$(date +%Y-%m-%d).md" ]]; then
  echo "  PASS: handoff archived"
  PASS=$((PASS + 1))
else
  echo "  FAIL: handoff not archived"
  FAIL=$((FAIL + 1))
fi

# Verify original removed
if [[ ! -f .claude/ctx-park.md ]]; then
  echo "  PASS: original handoff removed"
  PASS=$((PASS + 1))
else
  echo "  FAIL: original handoff still exists"
  FAIL=$((FAIL + 1))
fi

# Archive collision (create another handoff, grab again)
cat > .claude/ctx-park.md <<'HANDOFF'
# Second handoff
HANDOFF
OUTPUT=$(bash "$SCRIPT_DIR/grab-restore.sh" 2>/dev/null)
assert_contains "second grab works" "$OUTPUT" "status=found"

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: ship-preflight.sh ==="

# On base branch
OUTPUT=$(bash "$SCRIPT_DIR/ship-preflight.sh" --base main 2>/dev/null)
assert_contains "on-base-branch signal" "$OUTPUT" "on-base-branch"
assert_contains "prod_lines=0" "$OUTPUT" "prod_lines=0"

# On feature branch with diff
git checkout -q -b feat/test-preflight
echo "export const foo = 42;" > feature.ts
git add feature.ts
git commit -q -m "add feature"

OUTPUT=$(bash "$SCRIPT_DIR/ship-preflight.sh" --base main 2>&1 || true)
assert_contains "branch detected" "$OUTPUT" "branch=feat/test-preflight"
assert_contains "finds changed file" "$OUTPUT" "feature.ts"
assert_contains "prod_files > 0" "$OUTPUT" "prod_files=1"

# Risk signal: auth file
echo "export const auth = true;" > auth-middleware.ts
git add auth-middleware.ts
git commit -q -m "add auth"

OUTPUT=$(bash "$SCRIPT_DIR/ship-preflight.sh" --base main 2>&1 || true)
assert_contains "auth risk signal" "$OUTPUT" "auth-related-files"

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: ship-pr.sh ==="

# Create a change to commit
echo "export const bar = 99;" > bar.ts

OUTPUT=$(bash "$SCRIPT_DIR/ship-pr.sh" \
  --files bar.ts \
  --message "feat: add bar" \
  --title "Add bar feature" \
  --body "Test PR body" \
  --base main 2>&1 || true)
EXIT_CODE=$?

# ship-pr.sh will fail at gh pr create (no GitHub remote), but commit+push should work
# Check if commit landed
LAST_COMMIT=$(git log --oneline -1)
if echo "$LAST_COMMIT" | grep -qF "feat: add bar"; then
  echo "  PASS: commit created"
  PASS=$((PASS + 1))
else
  echo "  FAIL: commit not found — got: $LAST_COMMIT"
  FAIL=$((FAIL + 1))
fi

# Missing args
OUTPUT=$(bash "$SCRIPT_DIR/ship-pr.sh" --files bar.ts 2>&1 || true)
assert_contains "requires --message" "$OUTPUT" "--message is required"

# ══════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════"
echo "Results: $PASS passed, $FAIL failed"
echo "════════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
