---
name: ctx-worktree
description: >
  Use when the user wants to work on something in parallel — creates an isolated git
  worktree with env symlinks and dependency install so it's immediately runnable.
  Triggers: "worktree", "new worktree", "isolated branch", "parallel branch".
allowed-tools: Bash, Read, Glob, EnterWorktree, ExitWorktree
user-invocable: true
---

# /worktree — Create an Isolated Git Worktree

Uses `EnterWorktree` for session auto-swap. Handles base branch selection and post-setup.

## 1. Gather inputs

Ask the user if not already provided:

- **Name**: short identifier (e.g., `fix-email-bug`, `new-search-ui`)
- **Base branch**: default `main`
- **Skip deps?** If they say they won't need a dev server, note for step 4.

## 2. Checkout base branch

If the requested base branch is not the current branch:

```bash
git fetch origin <base>
git checkout <base>
```

This moves HEAD so `EnterWorktree` branches from the right starting point.

## 3. Enter worktree

```
EnterWorktree(name: "<name>")
```

This creates the worktree, new branch from HEAD, and swaps the session into it.

If it errors (already in a worktree, not a git repo), report and stop.

## 4. Post-setup

Capture the source root (the original repo, not the worktree) and run post-setup for env symlinks and deps:

```bash
SOURCE_ROOT=$(git -C "$(git rev-parse --git-common-dir)/.." rev-parse --show-toplevel 2>/dev/null || echo "")
```

If SOURCE_ROOT is found, run:

```bash
bash <base-directory>/../../scripts/worktree-post-setup.sh \
  --source "$SOURCE_ROOT" --target "$(pwd)"
```

The script is at `../../scripts/worktree-post-setup.sh` relative to this skill's base directory (shown in the skill loading message). Resolve the full path before running.

Parse stdout values (`env_count`, `deps`). If exit code 3 (deps failed), note worktree is still usable.

## 5. Present result

```
Worktree ready:
  Path:   <pwd>
  Branch: <git branch --show-current>
  Base:   <base>
  .env:   <env_count> file(s) symlinked
  Deps:   <deps status>

Session swapped. Use ExitWorktree when done.
```

## 6. Cleanup reference

When the user asks about leaving or removing worktrees:

- **Keep worktree, return to original dir:** `ExitWorktree(action: "keep")`
- **Remove worktree and branch:** `ExitWorktree(action: "remove")`
- **List all worktrees:** `git worktree list`
