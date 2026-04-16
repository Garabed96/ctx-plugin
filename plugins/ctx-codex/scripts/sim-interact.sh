#!/bin/bash
# sim-interact.sh — Interact with Xcode iOS Simulator from the CLI.
# Provides screenshot, scroll, tap, open, and device management for QA workflows.
#
# Usage:
#   sim-interact.sh <command> [options]
#
# Commands:
#   boot [--device <name>]              Boot a simulator (default: first iPhone)
#   open --url <url>                    Open URL in simulator Safari
#   screenshot [--out <path>]           Take screenshot (default: /tmp/sim-screenshot.png)
#   scroll --dir <up|down> [--amount <n>]  Scroll the simulator window
#   tap --x <x> --y <y>                Tap at coordinates on the simulator
#   shake                              Shake gesture (useful for dev menus)
#   devices                            List available iPhone simulators
#
# Exit codes: 0=success, 1=bad args, 2=simulator error

set -euo pipefail

CMD="${1:-}"
shift 2>/dev/null || true

case "$CMD" in
  # ── Boot simulator ───────────────────────────────────────
  boot)
    DEVICE=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --device) DEVICE="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    if [[ -z "$DEVICE" ]]; then
      DEVICE=$(xcrun simctl list devices available 2>/dev/null | grep -oE 'iPhone [^(]+' | head -1 | sed 's/ *$//')
    fi
    [[ -z "$DEVICE" ]] && { echo "Error: no iPhone simulators found" >&2; exit 2; }
    echo "Booting $DEVICE..." >&2
    xcrun simctl boot "$DEVICE" 2>/dev/null || true
    open -a Simulator
    # Wait for ready
    RETRIES=0
    while ! xcrun simctl openurl booted "about:blank" 2>/dev/null; do
      RETRIES=$((RETRIES + 1))
      [[ $RETRIES -gt 10 ]] && { echo "Error: boot timeout" >&2; exit 2; }
      sleep 1
    done
    echo "device=$DEVICE"
    echo "status=booted"
    ;;

  # ── Open URL ─────────────────────────────────────────────
  open)
    URL=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --url) URL="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    [[ -z "$URL" ]] && { echo "Error: --url required" >&2; exit 1; }
    xcrun simctl openurl booted "$URL" 2>/dev/null || { echo "Error: failed to open URL" >&2; exit 2; }
    echo "url=$URL"
    echo "status=opened"
    ;;

  # ── Screenshot ───────────────────────────────────────────
  screenshot)
    OUT="/tmp/sim-screenshot.png"
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --out) OUT="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    xcrun simctl io booted screenshot "$OUT" 2>/dev/null || { echo "Error: screenshot failed" >&2; exit 2; }
    echo "path=$OUT"
    echo "status=captured"
    ;;

  # ── Scroll ───────────────────────────────────────────────
  scroll)
    DIR="down"
    AMOUNT=5
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --dir)    DIR="$2"; shift 2 ;;
        --amount) AMOUNT="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    # key code 125 = arrow down, 126 = arrow up
    if [[ "$DIR" == "down" ]]; then KEY_CODE=125; else KEY_CODE=126; fi
    osascript -e "
      tell application \"Simulator\" to activate
      delay 0.3
      tell application \"System Events\"
        tell process \"Simulator\"
          repeat ${AMOUNT} times
            key code ${KEY_CODE}
            delay 0.1
          end repeat
        end tell
      end tell
    " 2>/dev/null || { echo "Error: scroll failed — grant accessibility permissions" >&2; exit 2; }
    echo "direction=$DIR"
    echo "amount=$AMOUNT"
    echo "status=scrolled"
    ;;

  # ── Tap ──────────────────────────────────────────────────
  tap)
    X="" Y=""
    while [[ $# -gt 0 ]]; do
      case "$1" in
        --x) X="$2"; shift 2 ;;
        --y) Y="$2"; shift 2 ;;
        *) shift ;;
      esac
    done
    [[ -z "$X" || -z "$Y" ]] && { echo "Error: --x and --y required" >&2; exit 1; }
    osascript -e "
      tell application \"Simulator\" to activate
      delay 0.3
      tell application \"System Events\"
        tell process \"Simulator\"
          click at {${X}, ${Y}}
        end tell
      end tell
    " 2>/dev/null || { echo "Error: tap failed — grant accessibility permissions" >&2; exit 2; }
    echo "x=$X"
    echo "y=$Y"
    echo "status=tapped"
    ;;

  # ── Shake ────────────────────────────────────────────────
  shake)
    osascript -e '
      tell application "Simulator" to activate
      tell application "System Events"
        keystroke "z" using {control down, command down}
      end tell
    ' 2>/dev/null || true
    echo "status=shook"
    ;;

  # ── List devices ─────────────────────────────────────────
  devices)
    xcrun simctl list devices available 2>/dev/null | grep -E 'iPhone|iPad'
    ;;

  # ── Help ─────────────────────────────────────────────────
  ""|--help|-h)
    echo "Usage: sim-interact.sh <command> [options]"
    echo ""
    echo "Commands:"
    echo "  boot [--device <name>]                Boot simulator"
    echo "  open --url <url>                      Open URL in Safari"
    echo "  screenshot [--out <path>]             Take screenshot"
    echo "  scroll --dir <up|down> [--amount <n>] Scroll window"
    echo "  tap --x <x> --y <y>                   Tap at coordinates"
    echo "  shake                                 Shake gesture"
    echo "  devices                               List simulators"
    ;;

  *)
    echo "Unknown command: $CMD" >&2
    exit 1
    ;;
esac
