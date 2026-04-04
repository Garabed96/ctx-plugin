#!/bin/bash
# Cycle or set triage status — no LLM
set -e
: "${PROJECT_DIR:?Set PROJECT_DIR to the project root}"
SLUG="${1:?Usage: triage.sh <slug> [backlog|todo|in_progress|done]}"
STATUS="${2:-}"

cd "$PROJECT_DIR"
node --input-type=module -e "
  const { loadConfig } = await import('./packages/protosmith/dist/index.js');
  const config = await loadConfig();
  const current = await config.store.getTriage('$SLUG');
  const cycle = ['backlog','todo','in_progress','done'];
  const curStatus = current?.status || 'backlog';
  const next = '${STATUS}' || cycle[(cycle.indexOf(curStatus) + 1) % 4];
  await config.store.upsertTriage('$SLUG', { status: next });
  console.log('$SLUG → ' + next);
"
