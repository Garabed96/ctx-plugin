#!/bin/bash
# Start the ctx-brainstorm companion server
# Usage: start.sh --project-dir /path/to/project [--port 52341]

PROJECT_DIR=""
PORT="52341"

while [[ $# -gt 0 ]]; do
  case $1 in
    --project-dir) PROJECT_DIR="$2"; shift 2 ;;
    --port) PORT="$2"; shift 2 ;;
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
