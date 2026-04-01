#!/bin/bash
# PreToolUse hook: block file mutations unless session is in a git worktree.
# The ctx workflow expects all implementation to happen in isolated worktrees
# created via /ctx-worktree. Edits to the main checkout are blocked.
#
# Matches: Edit, Write, Bash (write-like commands only)
# Reads tool_input from stdin (JSON), exits 2 to block.

INPUT=$(cat)

# If jq is not installed, allow through to avoid blocking
command -v jq &>/dev/null || exit 0

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# --- Determine the file path or repo context to check ---

if [ "$TOOL_NAME" = "Edit" ] || [ "$TOOL_NAME" = "Write" ]; then
  FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // empty' 2>/dev/null)
  [ -z "$FILE_PATH" ] && exit 0
  CHECK_DIR=$(dirname "$FILE_PATH" 2>/dev/null)

elif [ "$TOOL_NAME" = "Bash" ]; then
  COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
  [ -z "$COMMAND" ] && exit 0

  # Only intercept write-like commands — let reads through
  # Extract command names (first token of each chained/piped segment), match as whole words
  CMDS=$(echo "$COMMAND" | grep -oE '(^|[;&|]+)\s*[a-zA-Z_][a-zA-Z0-9_.-]*' | grep -oE '[a-zA-Z_][a-zA-Z0-9_.-]*')
  WRITE_CMDS='(mkdir|touch|cp|mv|rm|cat|tee|echo|printf|sed|chmod|chown|install|rsync|tar|dd|scp)'
  echo "$CMDS" | grep -qxE "$WRITE_CMDS" || exit 0

  # Use pwd as the context — Bash doesn't have a file_path
  CHECK_DIR=$(pwd)
else
  exit 0
fi

# --- Only guard the current project's repo, not unrelated repos on disk ---

PROJECT_ROOT=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
# Never guard ~/.claude (memory, plugins, settings)
case "$CHECK_DIR" in "$HOME/.claude"*) exit 0 ;; esac
FILE_REPO=$(git -C "$CHECK_DIR" rev-parse --show-toplevel 2>/dev/null) || exit 0

# If the file is in a different repo (e.g. plugin cache, dotfiles), let it through
[ "$FILE_REPO" != "$PROJECT_ROOT" ] && exit 0
  
  # Allow writes to plugin dev repos (constantly edited via sed, etc.)
  REPO_NAME=$(basename "$FILE_REPO")
  case "$REPO_NAME" in ctx-plugin) exit 0 ;; esac

# --- Check if we're in a worktree ---

MAIN_WORKTREE=$(git -C "$PROJECT_ROOT" worktree list --porcelain 2>/dev/null | head -1 | sed 's/^worktree //')

if [ "$PROJECT_ROOT" = "$MAIN_WORKTREE" ]; then
  BRANCH=$(git -C "$PROJECT_ROOT" branch --show-current 2>/dev/null)
  echo "BLOCKED — you're editing in the main checkout (branch: $BRANCH)." >&2
  echo "Create an isolated worktree first: /ctx-worktree" >&2
  exit 2
fi

exit 0
