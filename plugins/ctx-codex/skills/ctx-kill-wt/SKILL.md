---
name: ctx-kill-wt
description: >
  Teardown a git worktree — kill dev server port, remove worktree, delete branch.
  Use after merging a PR when you're done with a worktree, or when the user says
  "kill worktree", "tear down", "clean up worktree", "remove worktree", or ctx-kill-wt.
user-invocable: true
---

# ctx-kill-wt — Worktree Teardown

Kills the dev server, removes the worktree directory, and cleans up the branch. The inverse of `ctx-worktree`.

## 1. Gather inputs

You need:

- **Port** (optional): the dev server port to kill. If unknown, check for a running Next.js/Vite/etc process or ask.
- **Force?**: use `--force` if there are uncommitted changes the user wants to discard.
- **Keep branch?**: use `--keep-branch` if the branch shouldn't be deleted (e.g., PR still open).

## 2. Run teardown

**Critical: avoid destroying your own working directory.**

Check: is this session's project root the worktree you're about to kill?
- Run `pwd` — if it matches the worktree path, you're inside it.

### Case A: Session is in the main repo (or a different worktree)

Safe to kill directly with `--worktree`:

```bash
bash ../../scripts/kill-wt.sh --worktree <worktree-path> --port <port>
```

### Case B: Session started from inside the worktree being killed

Claude Code's project root IS the worktree — `cd` won't persist, and removing the directory kills the session. Use `--detach` to spawn the teardown in a background process:

```bash
bash ../../scripts/kill-wt.sh --detach --port <port>
```

This:
1. Spawns `nohup` teardown from the main repo
2. Returns immediately with `detached=true` and a log path
3. Leaves the session alive long enough to show the result

After showing the result, tell the user: **"This session's directory will be removed. Close this tab and open a new session from `<main_repo>`."**

### What the script does

1. Validates the target is a linked worktree (not main — hard block)
2. Kills processes on the port
3. `cd`s to the main repo and runs `git worktree remove`
4. Deletes the branch if it's fully merged (safe `git branch -d`)

Parse the `key=value` stdout output.

## 3. Present result

```
Worktree killed:
  Path:     <worktree path>
  Branch:   <branch> (<deleted|kept>)
  Port:     <killed|none>
  Main repo: <path>
```

If detached, also show the log path and remind the user to close the session.
