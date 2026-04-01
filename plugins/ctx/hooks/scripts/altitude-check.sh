#!/bin/bash
# Altitude oscillation detector — fires on UserPromptSubmit
# Reads user prompt from stdin (JSON), checks for oscillation patterns

INPUT=$(cat)
PROMPT=$(echo "$INPUT" | jq -r '.user_prompt // empty' 2>/dev/null)

[ -z "$PROMPT" ] && exit 0

# Pattern 1: Terse oscillation — frustration-driven brevity
if echo "$PROMPT" | grep -qiE '(just\s+(do|make|fix|build|change|add)\b|why\s+did\s+you\b)'; then
  echo "⚠️ Altitude check — terse oscillation detected"
  echo ""
  echo "You're going short — that might be frustration talking."
  echo "Add one sentence of specificity: what was wrong, and what 'right' looks like."
  exit 0
fi

# Pattern 2: Emotional escalation — left the altitude spectrum entirely
if echo "$PROMPT" | grep -qiE '(\bfuck\b|\bshit\b|\bwtf\b|\bffs\b|\bbullshit\b|\bdamn\s*it\b|this\s+is\s+(broken|garbage|trash|useless)|nothing\s+(works|is\s+working)|\bi\s+give\s+up\b)'; then
  echo "⚠️ Pause."
  echo ""
  echo "The frustration is valid. But the next message from this state will cost more tokens than it saves."
  echo "What is the single concrete blocker right now?"
  exit 0
fi

# Pattern 3: Verbose oscillation — over-explaining after a miss
if echo "$PROMPT" | grep -qiE "(no[,.]?\s*what\s+i\s+meant|that's?\s+not\s+what\s+i\s+(asked|wanted)|i\s+didn'?t\s+ask\s+for|i\s+already\s+(told|said)|for\s+the\s+(second|third|fourth|fifth|\w+th)\s+time)"; then
  echo "⚠️ Altitude check — verbose oscillation detected"
  echo ""
  echo "You're about to re-explain. What *one thing* failed? Name it in one sentence."
  echo "A single precise correction lands better than a rewrite."
  exit 0
fi
