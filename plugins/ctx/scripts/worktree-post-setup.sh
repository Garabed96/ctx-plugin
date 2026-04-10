#!/bin/bash
# worktree-post-setup.sh — Copy env files and install deps in an existing worktree.
# Extracted from worktree-create.sh. Designed to run AFTER EnterWorktree creates the worktree.
#
# Usage:
#   worktree-post-setup.sh --source <main-repo-root> --target <worktree-path> [--skip-deps]
#
# Exit codes:
#   0 — success
#   1 — bad arguments
#   3 — dependency install failed (worktree still usable)

set -euo pipefail

# ── Defaults ──────────────────────────────────────────────
SOURCE=""
TARGET=""
SKIP_DEPS=false

log() { echo "[post-setup] $*" >&2; }

# ── Parse args ────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --source)    SOURCE="$2"; shift 2 ;;
    --target)    TARGET="$2"; shift 2 ;;
    --skip-deps) SKIP_DEPS=true; shift ;;
    -h|--help)
      echo "Usage: worktree-post-setup.sh --source <main-repo-root> --target <worktree-path> [--skip-deps]"
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$SOURCE" ]] && { echo "Error: --source is required" >&2; exit 1; }
[[ -z "$TARGET" ]] && { echo "Error: --target is required" >&2; exit 1; }
[[ -d "$SOURCE" ]] || { echo "Error: source directory does not exist: $SOURCE" >&2; exit 1; }
[[ -d "$TARGET" ]] || { echo "Error: target directory does not exist: $TARGET" >&2; exit 1; }

log "source=$SOURCE target=$TARGET skip_deps=$SKIP_DEPS"

# ── Copy env files ────────────────────────────────────────
ENV_COUNT=0

# Root-level env files (only gitignored real files — templates/examples are tracked)
log "checking root .env files..."
for f in "$SOURCE"/.env*; do
  BASENAME=$(basename "$f")
  if [[ ! -f "$f" || -L "$f" ]]; then
    log "found $BASENAME — not a regular file → skipping"
    continue
  fi
  if ! git -C "$SOURCE" check-ignore -q "$f" 2>/dev/null; then
    log "found $BASENAME — gitignored=no → skipping (tracked)"
    continue
  fi
  DEST="$TARGET/$BASENAME"
  if [[ -e "$DEST" ]]; then
    log "found $BASENAME — gitignored=yes, already exists in target → skipping"
    continue
  fi
  cp "$f" "$DEST" && ENV_COUNT=$((ENV_COUNT + 1))
  log "found $BASENAME — gitignored=yes → copied"
done

# Monorepo: recreate copies of symlinked env files
log "checking monorepo symlinks..."
MONO_FOUND=0
while IFS= read -r link; do
  [[ -z "$link" ]] && continue
  MONO_FOUND=$((MONO_FOUND + 1))
  REL_PATH="${link#$SOURCE/}"
  LINK_TARGET=$(readlink "$link")
  DEST="$TARGET/$REL_PATH"
  DEST_DIR=$(dirname "$DEST")
  if [[ ! -d "$DEST_DIR" ]]; then
    log "found $REL_PATH → $LINK_TARGET — creating dest dir $DEST_DIR"
    mkdir -p "$DEST_DIR"
  fi
  if [[ -e "$DEST" ]]; then
    log "found $REL_PATH → $LINK_TARGET — already exists → skipping"
    continue
  fi
  cp -L "$link" "$DEST" && ENV_COUNT=$((ENV_COUNT + 1))
  log "found $REL_PATH → $LINK_TARGET → copied"
done < <(find "$SOURCE" -name ".env*" -type l 2>/dev/null)
[[ $MONO_FOUND -eq 0 ]] && log "no monorepo symlinks found"

# Nested gitignored env files (e.g. src/app/.env) — real files in subdirectories
log "checking nested env files..."
NESTED_FOUND=0
while IFS= read -r envfile; do
  [[ -z "$envfile" ]] && continue
  # Skip root-level (already handled above) and symlinks
  [[ "$envfile" == "$SOURCE"/.env* ]] && continue
  [[ -L "$envfile" ]] && continue
  NESTED_FOUND=$((NESTED_FOUND + 1))
  REL_PATH="${envfile#$SOURCE/}"
  if ! git -C "$SOURCE" check-ignore -q "$envfile" 2>/dev/null; then
    log "found $REL_PATH — gitignored=no → skipping (tracked)"
    continue
  fi
  DEST="$TARGET/$REL_PATH"
  DEST_DIR=$(dirname "$DEST")
  if [[ ! -d "$DEST_DIR" ]]; then
    log "found $REL_PATH — gitignored=yes, creating dest dir $DEST_DIR"
    mkdir -p "$DEST_DIR"
  fi
  if [[ -e "$DEST" ]]; then
    log "found $REL_PATH — gitignored=yes, already exists → skipping"
    continue
  fi
  cp "$envfile" "$DEST" && ENV_COUNT=$((ENV_COUNT + 1))
  log "found $REL_PATH — gitignored=yes → copied"
done < <(find "$SOURCE" -name ".env*" -type f 2>/dev/null)
[[ $NESTED_FOUND -eq 0 ]] && log "no nested env files found"

log "copied $ENV_COUNT env file(s) total"

# ── Install dependencies ──────────────────────────────────
DEPS_STATUS="skipped"
if [[ "$SKIP_DEPS" == false ]]; then
  log "detecting package manager..."
  if [[ -f "$TARGET/pnpm-lock.yaml" ]]; then
    log "found pnpm-lock.yaml → running pnpm install"
    (cd "$TARGET" && pnpm install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$TARGET/yarn.lock" ]]; then
    log "found yarn.lock → running yarn install"
    (cd "$TARGET" && yarn install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$TARGET/package-lock.json" ]]; then
    log "found package-lock.json → running npm install"
    (cd "$TARGET" && npm install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$TARGET/Pipfile.lock" ]]; then
    log "found Pipfile.lock → running pipenv install"
    (cd "$TARGET" && pipenv install 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  elif [[ -f "$TARGET/requirements.txt" ]]; then
    log "found requirements.txt → running pip install"
    (cd "$TARGET" && pip install -r requirements.txt 2>&1 >&2) && DEPS_STATUS="ok" || DEPS_STATUS="failed"
  else
    DEPS_STATUS="none"
    log "no lockfile found → skipping deps"
  fi

  if [[ "$DEPS_STATUS" == "failed" ]]; then
    log "deps: failed — worktree still usable, install manually"
  elif [[ "$DEPS_STATUS" == "ok" ]]; then
    log "deps: ok"
  fi
else
  log "deps: skipped (--skip-deps)"
fi

# ── Structured output (stdout) ────────────────────────────
cat <<EOF
env_count=$ENV_COUNT
deps=$DEPS_STATUS
EOF

[[ "$DEPS_STATUS" == "failed" ]] && exit 3
exit 0
