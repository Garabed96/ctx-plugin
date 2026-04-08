#!/bin/bash
# Push A/B/C comparison to factory browser via server API
set -e
: "${SCREEN_DIR:?Set SCREEN_DIR to the factory session directory}"

if [ $# -lt 2 ]; then
  echo "Usage: compare.sh <slug-a> <slug-b> [slug-c]" >&2
  exit 1
fi

# Read server URL from .server-info
if [ ! -f "$SCREEN_DIR/.server-info" ]; then
  echo "No server running. Start with factory/start.sh first." >&2
  exit 1
fi

SERVER_URL=$(node -e "console.log(JSON.parse(require('fs').readFileSync('$SCREEN_DIR/.server-info','utf8')).url)")

# Build JSON array of slugs
SLUGS_JSON=$(printf '%s\n' "$@" | sed 's/.*/"&"/' | paste -sd, - | sed 's/^/[/;s/$/]/')

# POST to /api/compare
curl -s -X POST "$SERVER_URL/api/compare" \
  -H "Content-Type: application/json" \
  -d "{\"slugs\":$SLUGS_JSON}" | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      const r=JSON.parse(d);
      if(r.ok) console.log('Compare pushed: ' + r.items.map(i=>i.slug).join(' vs '));
      else console.error('Error:', r.error);
    });
  "
