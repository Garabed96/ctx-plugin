#!/bin/bash
# Apply approved prototype to a real component — calls Claude via protosmith
set -e
: "${PROJECT_DIR:?Set PROJECT_DIR to the project root}"
SLUG="${1:?Usage: apply.sh <slug> <target-component> [instruction]}"
TARGET="${2:?Usage: apply.sh <slug> <target-component> [instruction]}"
INSTRUCTION="${3:-}"

echo "Applying $SLUG → $TARGET"

# Build the command
CMD="pnpm exec protosmith apply \"$SLUG\" --target \"$TARGET\""
if [ -n "$INSTRUCTION" ]; then
  CMD="$CMD --instruction \"$INSTRUCTION\""
fi

# Call protosmith apply (this calls Claude)
cd "$PROJECT_DIR" && eval "$CMD"

# Record the apply event
if [ -n "$SCREEN_DIR" ] && [ -d "$SCREEN_DIR" ]; then
  echo "{\"type\":\"applied\",\"slug\":\"$SLUG\",\"target\":\"$TARGET\",\"timestamp\":$(date +%s)}" >> "$SCREEN_DIR/.events"
fi

echo "✓ Applied $SLUG to $TARGET"
