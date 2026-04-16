#!/bin/bash
# Switch factory preview to a prototype
set -e
: "${SCREEN_DIR:?Set SCREEN_DIR to the factory session directory}"
SLUG="${1:?Usage: select.sh <slug>}"

echo "{\"type\":\"select\",\"slug\":\"$SLUG\",\"timestamp\":$(date +%s)}" >> "$SCREEN_DIR/.events"
echo "Selected: $SLUG"
