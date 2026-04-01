#!/bin/bash
# PreToolUse hook: block Edit/Write unless session is in a git worktree.
# The ctx workflow expects all implementation to happen in isolated worktrees
# created via /ctx-worktree. Edits to the main checkout are blocked.
#
# Reads tool_input from stdin (JSON), exits 2 to block.

INPUT=$(cat)

# If jq is not installed, allow through to avoid blocking
command -v jq &>/dev/null || exit 0

FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
[ -z "$FILE_PATH" ] && exit 0

# Resolve the repo root for the file being edited
REPO_ROOT=$(git -C "$(dirname "$FILE_PATH" 2>/dev/null)" rev-parse --show-toplevel 2>/dev/null) || exit 0

# Check if this repo root is a worktree (not the main checkout)
# git worktree list marks the main working tree — if our root IS that, we're not in a worktree
MAIN_WORKTREE=$(git -C "$REPO_ROOT" worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')

if [ "$REPO_ROOT" = "$MAIN_WORKTREE" ]; then
  BRANCH=$(git -C "$REPO_ROOT" branch --show-current 2>/dev/null)
  echo "BLOCKED — you're editing in the main checkout (branch: $BRANCH)." >&2
  echo "Create an isolated worktree first: /ctx-worktree" >&2
  exit 2
fi

exit 0
