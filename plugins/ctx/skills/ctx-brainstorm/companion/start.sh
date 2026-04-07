#!/bin/bash
# Start the ctx-brainstorm companion server
# Usage: start.sh --project-dir /path/to/project [--port 52341]

PROJECT_DIR=""
PORT="52341"
RESCAN=0

while [[ $# -gt 0 ]]; do
  case $1 in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
    --rescan) RESCAN=1; shift ;;
    *) shift ;;
  esac
done

if [ -z "$PROJECT_DIR" ]; then
  echo "Usage: start.sh --project-dir <path> [--port <port>]" >&2
  exit 1
fi

TIMESTAMP=$(date +%s)
SCREEN_DIR="$PROJECT_DIR/.ctx-brainstorm/$TIMESTAMP"
mkdir -p "$SCREEN_DIR"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Resolve pages root — main repo if in a worktree, else PROJECT_DIR
PAGES_ROOT="$PROJECT_DIR"
COMMON_DIR=$(cd "$PROJECT_DIR" && git rev-parse --git-common-dir 2>/dev/null)
if [ -n "$COMMON_DIR" ]; then
  case "$COMMON_DIR" in
    /*) PAGES_ROOT=$(dirname "$COMMON_DIR") ;;  # Absolute → worktree case
    *)  PAGES_ROOT="$PROJECT_DIR" ;;            # Relative (.git) → main repo case
  esac
fi

# Style profile check (pagesRoot = main repo, shared across worktrees)
STYLE_PROFILE="$PAGES_ROOT/factory/style-profile.json"
if [ "$RESCAN" -eq 1 ] || [ ! -f "$STYLE_PROFILE" ]; then
  echo "[factory] Scanning styles..." >&2
  node "$SCRIPT_DIR/cli/scan-styles.js" --project-dir "$PAGES_ROOT"
else
  echo "[factory] Using existing style profile at $STYLE_PROFILE" >&2
fi

# Start server in background
node "$SCRIPT_DIR/server.js" --dir "$SCREEN_DIR" --port "$PORT" --project-dir "$PROJECT_DIR" &
SERVER_PID=$!

# Give it a moment to start
sleep 0.5

if kill -0 "$SERVER_PID" 2>/dev/null; then
  echo "{\"type\":\"server-started\",\"port\":$PORT,\"url\":\"http://localhost:$PORT\",\"screen_dir\":\"$SCREEN_DIR\",\"pid\":$SERVER_PID}"
else
  echo "Server failed to start" >&2
  exit 1
fi
