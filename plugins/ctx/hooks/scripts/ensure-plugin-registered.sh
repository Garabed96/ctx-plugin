#!/usr/bin/env bash
# Ensures context plugin skills and agents are symlinked to ~/.claude/
# This is the simple approach — no fake marketplaces, just symlinks.

set -euo pipefail

SOURCE="${HOME}/WebstormProjects/claude-files/plugins/context"

# Symlink skills
if [ -d "$SOURCE/skills" ]; then
  for dir in "$SOURCE"/skills/context-*/; do
    [ -d "$dir" ] || continue
    name=$(basename "$dir")
    if [ ! -L "${HOME}/.claude/skills/$name" ]; then
      ln -sfn "$dir" "${HOME}/.claude/skills/$name"
    fi
  done
fi

# Symlink agents
if [ -d "$SOURCE/agents" ]; then
  mkdir -p "${HOME}/.claude/agents"
  for f in "$SOURCE"/agents/*.md; do
    [ -f "$f" ] || continue
    name=$(basename "$f")
    if [ ! -L "${HOME}/.claude/agents/$name" ]; then
      ln -sfn "$f" "${HOME}/.claude/agents/$name"
    fi
  done
fi
