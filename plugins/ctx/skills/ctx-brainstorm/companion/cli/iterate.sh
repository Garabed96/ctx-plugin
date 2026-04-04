#!/bin/bash
# Iterate on a prototype with tinker context from companion browser
set -e
: "${PROJECT_DIR:?Set PROJECT_DIR to the project root}"
SLUG="${1:?Usage: iterate.sh <slug> <instruction...>}"
shift
INSTRUCTION="$*"

if [ -z "$INSTRUCTION" ]; then
  echo "Usage: iterate.sh <slug> <instruction...>" >&2
  exit 1
fi

# Read tinker context from .events (deterministic, no LLM)
TINKER_CONTEXT=""
if [ -n "$SCREEN_DIR" ] && [ -f "$SCREEN_DIR/.events" ]; then
  TINKER_CONTEXT=$(node -e "
const fs = require('fs');
const DEFAULTS = {
  layout:'single-column',density:'balanced',heroStyle:'minimal',
  navStyle:'top-bar',sectionCount:4,contentTone:'clinical',
  colorScheme:'dark',viewport:'desktop',spacingScale:1.0,borderRadius:8
};
const eventsFile = process.env.SCREEN_DIR + '/.events';
if (!fs.existsSync(eventsFile)) process.exit(0);
const lines = fs.readFileSync(eventsFile,'utf8').trim().split('\n');
let state = null;
for (let i = lines.length-1; i >= 0; i--) {
  try { const e = JSON.parse(lines[i]); if (e.type==='tinker') { state=e.state; break; } } catch {}
}
if (!state) process.exit(0);
const parts = [];
if (state.layout !== DEFAULTS.layout) parts.push(state.layout.replace(/-/g,' ')+' layout');
if (state.density !== DEFAULTS.density) parts.push(state.density+' density');
if (state.heroStyle !== DEFAULTS.heroStyle) parts.push(state.heroStyle+' hero style');
if (state.navStyle !== DEFAULTS.navStyle) parts.push(state.navStyle.replace(/-/g,' ')+' navigation');
if (state.sectionCount !== DEFAULTS.sectionCount) parts.push(state.sectionCount+' sections');
if (state.contentTone !== DEFAULTS.contentTone) parts.push(state.contentTone+' content tone');
if (state.colorScheme !== DEFAULTS.colorScheme) parts.push(state.colorScheme+' color scheme');
if (state.viewport !== DEFAULTS.viewport) parts.push('optimized for '+state.viewport+' viewport');
if (state.spacingScale !== DEFAULTS.spacingScale) parts.push(state.spacingScale.toFixed(1)+'x spacing');
if (state.borderRadius !== DEFAULTS.borderRadius) parts.push(state.borderRadius+'px border radius');
if (parts.length > 0) console.log('Use ' + parts.join(', ') + '.');
")
fi

# Merge tinker context with user instruction
if [ -n "$TINKER_CONTEXT" ]; then
  MERGED="$TINKER_CONTEXT $INSTRUCTION"
else
  MERGED="$INSTRUCTION"
fi

echo "Iterating $SLUG..."
if [ -n "$TINKER_CONTEXT" ]; then
  echo "  Tinker context: $TINKER_CONTEXT"
fi
echo "  Instruction: $INSTRUCTION"
echo "  Merged: $MERGED"
echo ""

# Call protosmith iterate (this calls Claude)
cd "$PROJECT_DIR" && pnpm exec protosmith iterate "$SLUG" --instruction "$MERGED"
