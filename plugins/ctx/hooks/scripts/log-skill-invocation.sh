#!/bin/bash
# PostToolUse hook — logs Skill invocations to a session log file
# The log is read by ctx-park's skill audit step

INPUT=$(cat)
TOOL_NAME=$(echo "$INPUT" | jq -r '.tool_name // empty' 2>/dev/null)

# Only log Skill tool invocations
[ "$TOOL_NAME" != "Skill" ] && exit 0

SKILL_NAME=$(echo "$INPUT" | jq -r '.tool_input.skill // empty' 2>/dev/null)
[ -z "$SKILL_NAME" ] && exit 0

# Log to a session file in the worktree
LOG_DIR=".claude"
LOG_FILE="${LOG_DIR}/skill-invocations.log"
mkdir -p "$LOG_DIR"

TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")

echo "${TIMESTAMP}|${SKILL_NAME}|${BRANCH}" >> "$LOG_FILE"
