#!/bin/bash
# Open companion factory in browser
set -e
: "${SCREEN_DIR:?Set SCREEN_DIR to the companion session directory}"

if [ ! -f "$SCREEN_DIR/.server-info" ]; then
  echo "No server running. Start with companion/start.sh first." >&2
  exit 1
fi

URL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCREEN_DIR/.server-info','utf8')).url)")
open "$URL/factory" 2>/dev/null || xdg-open "$URL/factory" 2>/dev/null || echo "Open: $URL/factory"
