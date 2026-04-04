#!/bin/bash
# Diff current vs previous version — pure unix
set -e
: "${PROJECT_DIR:?Set PROJECT_DIR to the project root}"
SLUG="${1:?Usage: diff.sh <slug>}"

cd "$PROJECT_DIR"
PATHS=$(node --input-type=module -e "
  const { discover, groupByIterations, loadConfig } = await import('./packages/protosmith/dist/index.js');
  const config = await loadConfig();
  const entries = await discover(config.prototypesDir);
  const groups = groupByIterations(entries);
  for (const [base, items] of groups) {
    const idx = items.findIndex(e => e.slug === '$SLUG');
    if (idx > 0) {
      console.log(items[idx-1].path);
      console.log(items[idx].path);
      process.exit(0);
    }
    if (idx === 0) {
      console.error('No previous version for $SLUG');
      process.exit(1);
    }
  }
  console.error('Slug not found: $SLUG');
  process.exit(1);
")

echo "$PATHS" | xargs -n2 diff -u --color || true
