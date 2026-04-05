#!/bin/bash
# PreToolUse hook: block manual `gh pr create` — redirect to ship-pr.sh.
# The script handles stage + commit + push + PR in one shot, saving tokens.
#
# Matches: Bash (only when command contains `gh pr create`)
# Reads tool_input from stdin (JSON), exits 2 to block.

INPUT=$(cat)

command -v jq &>/dev/null || exit 0

TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)
[ "$TOOL_NAME" = "Bash" ] || exit 0

COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command // empty' 2>/dev/null)
[ -z "$COMMAND" ] && exit 0

# Only intercept gh pr create
echo "$COMMAND" | grep -q 'gh pr create' || exit 0

echo "BLOCKED — don't create PRs manually with 'gh pr create'." >&2
echo "Use ship-pr.sh instead (stage + commit + push + PR in one command):" >&2
echo "" >&2
echo '  bash ${CLAUDE_PLUGIN_ROOT}/scripts/ship-pr.sh \' >&2
echo '    --files file1 file2 \' >&2
echo '    --message "feat: description" \' >&2
echo '    --title "PR title" \' >&2
echo '    --body "PR body" \' >&2
echo '    --draft' >&2
echo "" >&2
echo "Or use /ctx-ship for the full gated pipeline." >&2
exit 2
