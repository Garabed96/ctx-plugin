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

Uses Claude Code's native `EnterWorktree` tool for session swap, then runs `worktree-post-setup.sh` for env symlinks and dependency install.

## 1. Gather inputs

Ask the user if not already provided:

- **Name**: short identifier (e.g., `fix-email-bug`, `new-search-ui`)

That's it. `EnterWorktree` handles branch creation and worktree setup internally.

## 2. Capture source root

Before swapping, capture the current repo root — it's needed for the post-setup script:

```bash
SOURCE_ROOT=$(git rev-parse --show-toplevel)
```

Store this value. After `EnterWorktree` swaps the session, the original repo root is no longer the CWD.

## 3. Call EnterWorktree

```
EnterWorktree(name: "<name>")
```

This:
- Creates a worktree under `.claude/worktrees/<name>/`
- Creates a new branch based on HEAD
- Switches the session's working directory to the worktree
- Clears CWD-dependent caches

If the tool errors (already in a worktree, not a git repo), report the error and stop.

## 4. Post-setup

Run the post-setup script to symlink env files and install dependencies:

```bash
bash <base-directory>/../../scripts/worktree-post-setup.sh \
  --source "$SOURCE_ROOT" --target "$(pwd)"
```

The script is at `../../scripts/worktree-post-setup.sh` relative to this skill's base directory (shown in the skill loading message). Resolve the full path before running.

Parse the stdout values (`env_count`, `deps`). The script logs detailed progress to stderr with `[post-setup]` prefix — this is visible in the Bash tool output.

If the script exits with code 3 (deps failed), note the worktree is still usable — deps can be installed manually.

## 5. Present result

```
Worktree ready:
  Path:   <pwd>
  Branch: <git branch --show-current>
  .env:   <env_count> file(s) symlinked
  Deps:   <deps status>

You're now working in the worktree. Use ExitWorktree when done.
```

## 6. Cleanup reference

When the user asks about leaving or removing worktrees:

- **Keep worktree, return to original dir:** `ExitWorktree(action: "keep")`
- **Remove worktree and branch:** `ExitWorktree(action: "remove")`
- **List all worktrees:** `git worktree list`

The old `worktree-create.sh` script still exists for manual worktree creation outside Claude.

## Gotchas

- `EnterWorktree` branches from HEAD. If the user needs a specific base branch, they should checkout that branch first or `git rebase <base>` after entering the worktree.
- On session exit while still in a worktree, Claude Code prompts the user to keep or remove it.
- The post-setup script creates missing directories for nested env files (e.g., `src/app/` may not exist in the worktree if its only content was gitignored).
