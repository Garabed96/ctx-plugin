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

# Read style + selection context from .events (deterministic, no LLM)
FACTORY_CONTEXT=""
if [ -n "$SCREEN_DIR" ] && [ -f "$SCREEN_DIR/.events" ]; then
  FACTORY_CONTEXT=$(node -e "
const fs = require('fs');
const eventsFile = process.env.SCREEN_DIR + '/.events';
if (!fs.existsSync(eventsFile)) process.exit(0);
const lines = fs.readFileSync(eventsFile,'utf8').trim().split('\n');
let styleState = null;
let selectedOption = null;
for (let i = lines.length-1; i >= 0; i--) {
  try {
    const e = JSON.parse(lines[i]);
    if (e.type === 'style' && !styleState) styleState = e.overrides;
    if (e.type === 'option-select' && !selectedOption) selectedOption = e.label || e.value;
    if (styleState && selectedOption) break;
  } catch {}
}
const parts = [];
if (selectedOption) parts.push('Selected: ' + selectedOption);
if (styleState) {
  const sp = [];
  if (styleState.primary) sp.push('primary ' + styleState.primary);
  if (styleState.accent) sp.push('accent ' + styleState.accent);
  const fd = styleState['font-display'];
  if (fd) sp.push(fd.split(',')[0].replace(/'/g,'').trim() + ' font');
  const rm = styleState['radius-md'];
  if (rm) sp.push(rm + ' radius');
  if (sp.length > 0) parts.push('Use ' + sp.join(', '));
}
if (parts.length > 0) console.log(parts.join('. ') + '.');
")
fi

# Merge factory context with user instruction
if [ -n "$FACTORY_CONTEXT" ]; then
  MERGED="$FACTORY_CONTEXT $INSTRUCTION"
else
  MERGED="$INSTRUCTION"
fi

echo "Iterating $SLUG..."
if [ -n "$FACTORY_CONTEXT" ]; then
  echo "  Factory context: $FACTORY_CONTEXT"
fi
echo "  Instruction: $INSTRUCTION"
echo "  Merged: $MERGED"
echo ""

# Call protosmith iterate (this calls Claude)
cd "$PROJECT_DIR" && pnpm exec protosmith iterate "$SLUG" --instruction "$MERGED"
