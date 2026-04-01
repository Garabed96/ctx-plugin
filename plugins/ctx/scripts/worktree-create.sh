#!/bin/bash
# worktree-create.sh — Create an isolated git worktree with env symlinks and deps.
# Pure function: args in, structured output out. No interactive prompts.
#
# Usage:
#   worktree-create.sh --name <name> [--base <branch>] [--prefix <prefix>] [--skip-deps] [--skip-tests]
#
# Exit codes:
#   0 — success
#   1 — bad arguments
#   2 — git error (branch exists, fetch failed, etc.)
#   3 — dependency install failed

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
NAME=""
BASE="main"
PREFIX="feat/"
SKIP_DEPS=false
SKIP_TESTS=false

# ── Parse args ────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --name)      NAME="$2"; shift 2 ;;
    --base)      BASE="$2"; shift 2 ;;
    --prefix)    PREFIX="$2"; shift 2 ;;
    --no-prefix) PREFIX=""; shift ;;
    --skip-deps) SKIP_DEPS=true; shift ;;
    --skip-tests) SKIP_TESTS=true; shift ;;
    -h|--help)
      echo "Usage: worktree-create.sh --name <name> [--base <branch>] [--prefix <prefix>] [--skip-deps] [--skip-tests]"
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$NAME" ]] && { echo "Error: --name is required" >&2; exit 1; }

# ── Resolve paths ─────────────────────────────────────────
REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || { echo "Error: not in a git repo" >&2; exit 2; }
PROJECT_NAME=$(basename "$REPO_ROOT")
PARENT_DIR=$(dirname "$REPO_ROOT")
WORKTREE_DIR="$PARENT_DIR/$PROJECT_NAME-$NAME"
BRANCH_NAME="${PREFIX}${NAME}"

# ── Check if worktree already exists ──────────────────────
if [[ -d "$WORKTREE_DIR" ]]; then
  echo "Error: directory already exists: $WORKTREE_DIR" >&2
  echo "  To reuse: cd $WORKTREE_DIR" >&2
  echo "  To remove: git worktree remove $WORKTREE_DIR" >&2
  exit 2
fi

# ── Fetch and create worktree ─────────────────────────────
echo "Fetching origin/$BASE..." >&2
git fetch origin "$BASE" 2>&1 >&2 || { echo "Error: failed to fetch origin/$BASE" >&2; exit 2; }

# Check if branch already exists
if git show-ref --verify --quiet "refs/heads/$BRANCH_NAME" 2>/dev/null; then
  echo "Branch '$BRANCH_NAME' already exists — attaching worktree..." >&2
  git worktree add "$WORKTREE_DIR" "$BRANCH_NAME" 2>&1 >&2 || { echo "Error: git worktree add failed" >&2; exit 2; }
else
  echo "Creating worktree at $WORKTREE_DIR (branch: $BRANCH_NAME)..." >&2
  git worktree add -b "$BRANCH_NAME" "$WORKTREE_DIR" "origin/$BASE" 2>&1 >&2 || { echo "Error: git worktree add failed" >&2; exit 2; }
fi

# ── Symlink env files ─────────────────────────────────────
ENV_COUNT=0

# Root-level env files (only gitignored real files — templates/examples are tracked)
for f in "$REPO_ROOT"/.env*; do
  [[ -f "$f" && ! -L "$f" ]] || continue
  git -C "$REPO_ROOT" check-ignore -q "$f" 2>/dev/null || continue
  BASENAME=$(basename "$f")
  TARGET="$WORKTREE_DIR/$BASENAME"
  if [[ ! -e "$TARGET" ]]; then
    ln -s "$f" "$TARGET" && ENV_COUNT=$((ENV_COUNT + 1))
  fi
done

# Monorepo: recreate symlinks that point to root env files
while IFS= read -r link; do
  [[ -z "$link" ]] && continue
  REL_PATH="${link#$REPO_ROOT/}"
  LINK_TARGET=$(readlink "$link")
  DEST="$WORKTREE_DIR/$REL_PATH"
  DEST_DIR=$(dirname "$DEST")
  [[ -d "$DEST_DIR" ]] && [[ ! -e "$DEST" ]] && ln -s "$LINK_TARGET" "$DEST" && ENV_COUNT=$((ENV_COUNT + 1))
done < <(find "$REPO_ROOT" -name ".env*" -type l 2>/dev/null)

# Nested gitignored env files (e.g. src/app/.env) — real files in subdirectories
while IFS= read -r envfile; do
  [[ -z "$envfile" ]] && continue
  # Skip root-level (already handled above) and symlinks
  [[ "$envfile" == "$REPO_ROOT"/.env* ]] && continue
  [[ -L "$envfile" ]] && continue
  # Only symlink if gitignored (tracked files are already in the worktree)
  git -C "$REPO_ROOT" check-ignore -q "$envfile" 2>/dev/null || continue
  REL_PATH="${envfile#$REPO_ROOT/}"
  DEST="$WORKTREE_DIR/$REL_PATH"
  DEST_DIR=$(dirname "$DEST")
  [[ -d "$DEST_DIR" ]] && [[ ! -e "$DEST" ]] && ln -s "$envfile" "$DEST" && ENV_COUNT=$((ENV_COUNT + 1))
done < <(find "$REPO_ROOT" -name ".env*" -type f 2>/dev/null)

echo "Symlinked $ENV_COUNT env file(s)" >&2

# ── Install dependencies ──────────────────────────────────
DEPS_STATUS="skipped"
if [[ "$SKIP_DEPS" == false ]]; then
  if [[ -f "$WORKTREE_DIR/pnpm-lock.yaml" ]]; then
    echo "Installing deps (pnpm)..." >&2
    (cd "$WORKTREE_DIR" && pnpm install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$WORKTREE_DIR/yarn.lock" ]]; then
    echo "Installing deps (yarn)..." >&2
    (cd "$WORKTREE_DIR" && yarn install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$WORKTREE_DIR/package-lock.json" ]]; then
    echo "Installing deps (npm)..." >&2
    (cd "$WORKTREE_DIR" && npm install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$WORKTREE_DIR/Pipfile.lock" ]]; then
    echo "Installing deps (pipenv)..." >&2
    (cd "$WORKTREE_DIR" && pipenv install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$WORKTREE_DIR/requirements.txt" ]]; then
    echo "Installing deps (pip)..." >&2
    (cd "$WORKTREE_DIR" && pip install -r requirements.txt 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  else
    DEPS_STATUS="none"
  fi

  if [[ "$DEPS_STATUS" == "failed" ]]; then
    echo "Warning: dependency install failed — worktree still created" >&2
  fi
fi

# ── Structured output (stdout) ────────────────────────────
cat <<EOF
path=$WORKTREE_DIR
branch=$BRANCH_NAME
base=$BASE
env_count=$ENV_COUNT
deps=$DEPS_STATUS
project=$PROJECT_NAME
EOF
