#!/bin/bash
# preview-device.sh — Open any localhost URL in Xcode iOS Simulator.
# Works with companion prototypes, dev servers, or any local URL.
#
# Usage:
#   preview-device.sh --url <full-url>
#   preview-device.sh --port <port> [--path <url-path>]
#   preview-device.sh --port <port> --file <prototype-file>    (companion mode)
#
# Examples:
#   preview-device.sh --url http://localhost:3000/plotter
#   preview-device.sh --port 52341 --device "iPhone 13"
#   preview-device.sh --port 52341 --file "pk-plotter/v3.html"
#
# Exit codes: 0=success, 1=bad args, 2=simulator error

set -euo pipefail

PORT=""
DEVICE=""
PROTO_FILE=""
URL_PATH=""
FULL_URL=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --port)   PORT="$2"; shift 2 ;;
    --device) DEVICE="$2"; shift 2 ;;
    --file)   PROTO_FILE="$2"; shift 2 ;;
    --path)   URL_PATH="$2"; shift 2 ;;
    --url)    FULL_URL="$2"; shift 2 ;;
    -h|--help)
      echo "Usage: preview-device.sh --url <url> | --port <port> [--path <path>] [--file <proto>]"
      echo ""
      echo "Available iPhone simulators:"
      xcrun simctl list devices available 2>/dev/null | grep -E 'iPhone' | sed 's/^/  /'
      exit 0 ;;
    *) echo "Unknown arg: $1" >&2; exit 1 ;;
  esac
done

[[ -z "$FULL_URL" && -z "$PORT" ]] && { echo "Error: --url or --port is required" >&2; exit 1; }

# ── Pick device (default: first available iPhone) ────────
if [[ -z "$DEVICE" ]]; then
  DEVICE=$(xcrun simctl list devices available 2>/dev/null | grep -oE 'iPhone [^(]+' | head -1 | sed 's/ *$//')
  [[ -z "$DEVICE" ]] && { echo "Error: no iPhone simulators found. Install via Xcode." >&2; exit 2; }
fi

echo "Device: $DEVICE" >&2

# ── Build URL ────────────────────────────────────────────
if [[ -n "$FULL_URL" ]]; then
  URL="$FULL_URL"
elif [[ -n "$PROTO_FILE" ]]; then
  URL="http://localhost:${PORT}/prototype?file=$(python3 -c "import urllib.parse; print(urllib.parse.quote('${PROTO_FILE}'))")"
elif [[ -n "$URL_PATH" ]]; then
  URL="http://localhost:${PORT}${URL_PATH}"
else
  URL="http://localhost:${PORT}/"
fi

# ── Boot simulator ───────────────────────────────────────
echo "Booting simulator..." >&2
xcrun simctl boot "$DEVICE" 2>/dev/null || true
open -a Simulator

# Wait for runtime to be ready
RETRIES=0
while ! xcrun simctl openurl booted "about:blank" 2>/dev/null; do
  RETRIES=$((RETRIES + 1))
  [[ $RETRIES -gt 10 ]] && { echo "Error: simulator failed to boot after 10s" >&2; exit 2; }
  sleep 1
done

# ── Open prototype ───────────────────────────────────────
echo "Opening: $URL" >&2
xcrun simctl openurl booted "$URL"

# ── Structured output ────────────────────────────────────
cat <<EOF
device=$DEVICE
port=$PORT
url=$URL
proto_file=${PROTO_FILE:-none}
status=opened
EOF
