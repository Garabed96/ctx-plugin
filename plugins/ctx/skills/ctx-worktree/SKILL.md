---
name: ctx-worktree
description: >
  Use when the user wants to work on something in parallel — creates an isolated git
  worktree with env symlinks and dependency install so it's immediately runnable.
  Triggers: "worktree", "new worktree", "isolated branch", "parallel branch".
allowed-tools: Bash, Read, Glob
user-invocable: true
---

# /worktree — Create an Isolated Git Worktree

Delegates mechanical work to `scripts/worktree-create.sh`. This skill handles judgment only.

## 1. Gather inputs

Ask the user if not already provided:

- **Name**: short identifier (e.g., `fix-email-bug`, `new-search-ui`)
- **Base branch**: default `main`
- **Branch prefix**: `feat/`, `fix/`, `hotfix/`, or `--no-prefix`. Default: `feat/`
- **Skip deps?** If they say they won't need a dev server, add `--skip-deps`

## 2. Run the script

```bash
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(realpath "$0")")")}"
bash "$PLUGIN_ROOT/scripts/worktree-create.sh" \
  --name <name> --base <base> --prefix <prefix>
```

The script prints progress to stderr and a `key=value` summary to stdout. Parse the stdout values.

## 3. Interpret result and present

On **success** (exit 0), present:

```
Worktree ready:
  Path:   <path>
  Branch: <branch>
  Base:   <base>
  .env:   <env_count> file(s) symlinked
  Deps:   <deps status>

To work here, quit and relaunch:
  cd <path> && claude
```

On **failure** (exit 2 = git error, exit 3 = deps failed), report the stderr message and ask the user how to proceed.

If `deps=failed`, note the worktree still exists and is usable — deps can be installed manually.

## 4. Cleanup reference

When the user asks about removing worktrees:

```bash
git worktree remove <path>        # clean removal
git worktree remove --force <path> # if changes were discarded
git branch -d <branch-name>       # delete branch if no longer needed
git worktree list                  # see all active worktrees
```

## Gotcha

`claude --continue` doesn't work across directories. Always start a NEW session in the worktree.
