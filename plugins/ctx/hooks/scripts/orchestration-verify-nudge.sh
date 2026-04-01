#!/bin/bash
# PostToolUse hook: nudge when test commands complete but service orchestration
# files are in the diff — reminder to verify path-level side effects, not just
# function-level test results.
#
# Pattern: "Green CI, broken contract" — tests pass ≠ orchestration verified.

INPUT=$(cat)
command -v jq &>/dev/null || exit 0

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[ "$TOOL_NAME" != "Bash" ] && exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$COMMAND" ] && exit 0

# Only fire when the command looks like a test run
echo "$COMMAND" | grep -qiE '(vitest|jest|npm\s+(run\s+)?test|npx\s+vitest|npx\s+jest)' || exit 0

# Check if service/provider files are in the current branch's diff
DIFF_FILES=$(git diff --name-only main...HEAD 2>/dev/null || git diff --name-only HEAD~1 2>/dev/null)
[ -z "$DIFF_FILES" ] && exit 0

echo "$DIFF_FILES" | grep -qiE '(Service|Provider)\.ts$' || exit 0

echo "🔍 Green CI, broken contract?"
echo ""
echo "Tests ran, but the diff touches service orchestration files."
echo "Did the tests verify each code path's side effects — or just the downstream functions?"
exit 0
