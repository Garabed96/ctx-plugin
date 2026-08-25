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

# ── Claude keeps terminal handoff without WebStorm ──────────────
echo ""
echo "=== TEST: terminal-only worktree handoff ==="

if [[ ! -e "$SCRIPT_DIR/open-webstorm.sh" ]] &&
   [[ ! -d "$SCRIPT_DIR/../skills/ctx-open" ]] &&
   grep -q "claude" "$SCRIPT_DIR/worktree-open.sh" &&
   ! grep -qi "webstorm" "$SCRIPT_DIR/worktree-open.sh"; then
  echo "  PASS: Claude keeps terminal handoff without WebStorm"
  PASS=$((PASS + 1))
else
  echo "  FAIL: Claude WebStorm capability still exists or terminal handoff is missing"
  FAIL=$((FAIL + 1))
fi

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
assert_contains "outputs handoff_path" "$OUTPUT" "handoff_path=$TEMP_DIR/test-repo/docs/ctx/park.md"
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
mkdir -p docs/ctx
cat > docs/ctx/park.md <<'HANDOFF'
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
if [[ -f "docs/ctx/park-$(date +%Y-%m-%d).md" ]]; then
  echo "  PASS: handoff archived"
  PASS=$((PASS + 1))
else
  echo "  FAIL: handoff not archived"
  FAIL=$((FAIL + 1))
fi

# Verify original removed
if [[ ! -f docs/ctx/park.md ]]; then
  echo "  PASS: original handoff removed"
  PASS=$((PASS + 1))
else
  echo "  FAIL: original handoff still exists"
  FAIL=$((FAIL + 1))
fi

# Archive collision (create another handoff, grab again)
cat > docs/ctx/park.md <<'HANDOFF'
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
OUTPUT=$(bash "$SCRIPT_DIR/ship-pr.sh" 2>&1 || true)
assert_contains "requires --title" "$OUTPUT" "--title is required"

OUTPUT=$(bash "$SCRIPT_DIR/ship-pr.sh" --files bar.ts --title "t" --body "b" 2>&1 || true)
assert_contains "requires --message with --files" "$OUTPUT" "--message is required"

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: worktree-post-setup.sh ==="

# Setup: fresh repo for isolated post-setup testing
POST_SETUP_SRC="$TEMP_DIR/post-setup-src-bare"
mkdir -p "$POST_SETUP_SRC"
git -C "$POST_SETUP_SRC" init --bare -q
POST_SETUP_REPO="$TEMP_DIR/post-setup-src"
git clone -q "$POST_SETUP_SRC" "$POST_SETUP_REPO"
cd "$POST_SETUP_REPO"
git config user.email "test@test.com"
git config user.name "Test"

# Initial commit + gitignore rules
echo "hello" > file.txt
printf ".env.local\nsrc/app/.env\n" > .gitignore
git add file.txt .gitignore
git commit -q -m "init with gitignore"

# Tracked env file (should NOT be symlinked)
echo "PUBLIC=xyz" > .env.example
git add .env.example
git commit -q -m "add tracked env example"
git push -q origin main

# Create gitignored env files on disk (not tracked)
echo "SECRET=abc" > .env.local
mkdir -p src/app
echo "NESTED_SECRET=123" > src/app/.env

# Create a plain worktree (simulates EnterWorktree — no worktree-create.sh)
git worktree add -b post-setup-test "$TEMP_DIR/post-setup-target" origin/main 2>/dev/null
POST_SETUP_TARGET="$TEMP_DIR/post-setup-target"

# Happy path: symlink env files, skip deps
OUTPUT=$(bash "$SCRIPT_DIR/worktree-post-setup.sh" --source "$POST_SETUP_REPO" --target "$POST_SETUP_TARGET" --skip-deps 2>/dev/null)
assert_contains "env_count=2" "$OUTPUT" "env_count=2"
assert_contains "deps=skipped" "$OUTPUT" "deps=skipped"

# Verify symlinks exist
if [[ -L "$POST_SETUP_TARGET/.env.local" ]]; then
  echo "  PASS: .env.local symlinked"
  PASS=$((PASS + 1))
else
  echo "  FAIL: .env.local not symlinked"
  FAIL=$((FAIL + 1))
fi

if [[ -L "$POST_SETUP_TARGET/src/app/.env" ]]; then
  echo "  PASS: src/app/.env symlinked"
  PASS=$((PASS + 1))
else
  echo "  FAIL: src/app/.env not symlinked"
  FAIL=$((FAIL + 1))
fi

# .env.example is tracked — should NOT be symlinked (it's already in the worktree via git)
if [[ ! -L "$POST_SETUP_TARGET/.env.example" ]]; then
  echo "  PASS: .env.example not symlinked (tracked)"
  PASS=$((PASS + 1))
else
  echo "  FAIL: .env.example was symlinked (should be tracked)"
  FAIL=$((FAIL + 1))
fi

# Missing --source
OUTPUT=$(bash "$SCRIPT_DIR/worktree-post-setup.sh" --target /tmp 2>&1 || true)
assert_contains "requires --source" "$OUTPUT" "--source is required"

# Missing --target
OUTPUT=$(bash "$SCRIPT_DIR/worktree-post-setup.sh" --source /tmp 2>&1 || true)
assert_contains "requires --target" "$OUTPUT" "--target is required"

# Verbose logging check (stderr should contain [post-setup] lines)
STDERR_OUTPUT=$(bash "$SCRIPT_DIR/worktree-post-setup.sh" --source "$POST_SETUP_REPO" --target "$POST_SETUP_TARGET" --skip-deps 2>&1 >/dev/null)
if echo "$STDERR_OUTPUT" | grep -q "\[post-setup\]"; then
  echo "  PASS: stderr contains [post-setup] logging"
  PASS=$((PASS + 1))
else
  echo "  FAIL: no [post-setup] logging in stderr"
  FAIL=$((FAIL + 1))
fi

# ══════════════════════════════════════════════════════════
echo ""
echo "=== TEST: kill-wt.sh ==="

# Setup: go back to main test repo, create a worktree to kill
cd "$TEMP_DIR/test-repo"
git checkout -q main 2>/dev/null || true

git worktree add -b kill-test "$TEMP_DIR/test-repo-kill-wt" main 2>/dev/null

# Main repo hard block (no args, from main repo)
OUTPUT=$(bash "$SCRIPT_DIR/kill-wt.sh" 2>&1 || true)
assert_contains "blocks main repo" "$OUTPUT" "main worktree"

# Main repo hard block (--worktree pointing at main)
OUTPUT=$(bash "$SCRIPT_DIR/kill-wt.sh" --worktree "$TEMP_DIR/test-repo" 2>&1 || true)
assert_contains "blocks --worktree=main" "$OUTPUT" "main worktree"

# Invalid path
OUTPUT=$(bash "$SCRIPT_DIR/kill-wt.sh" --worktree "/nonexistent" 2>&1 || true)
assert_contains "rejects invalid path" "$OUTPUT" "not a valid git worktree"

# Happy path: kill via --worktree from main repo
OUTPUT=$(bash "$SCRIPT_DIR/kill-wt.sh" --worktree "$TEMP_DIR/test-repo-kill-wt" 2>/dev/null)
assert_contains "outputs worktree path" "$OUTPUT" "worktree=$TEMP_DIR/test-repo-kill-wt"
assert_contains "outputs branch" "$OUTPUT" "branch=kill-test"
assert_contains "branch deleted" "$OUTPUT" "branch_status=deleted"

# Verify worktree is gone
if [[ ! -d "$TEMP_DIR/test-repo-kill-wt" ]]; then
  echo "  PASS: worktree directory removed"
  PASS=$((PASS + 1))
else
  echo "  FAIL: worktree directory still exists"
  FAIL=$((FAIL + 1))
fi

# Verify branch is gone
if ! git branch --list kill-test | grep -q kill-test; then
  echo "  PASS: branch deleted"
  PASS=$((PASS + 1))
else
  echo "  FAIL: branch still exists"
  FAIL=$((FAIL + 1))
fi

# ══════════════════════════════════════════════════════════
echo ""
echo "════════════════════════════════"
echo "Results: $PASS passed, $FAIL failed"
echo "════════════════════════════════"

[[ $FAIL -eq 0 ]] && exit 0 || exit 1
