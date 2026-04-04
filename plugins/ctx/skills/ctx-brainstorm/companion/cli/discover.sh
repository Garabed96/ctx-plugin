#!/bin/bash
# List all prototypes grouped by slot
set -e
: "${PROJECT_DIR:?Set PROJECT_DIR to the project root}"
cd "$PROJECT_DIR" && pnpm exec protosmith discover
