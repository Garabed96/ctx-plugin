---
name: ctx-kill-wt
description: >
  Teardown a git worktree — kill dev server port, remove worktree, delete branch.
  Use after merging a PR when you're done with a worktree, or when the user says
  "kill worktree", "tear down", "clean up worktree", "remove worktree", or /ctx-kill-wt.
user-invocable: true
---

# /ctx-kill-wt — Worktree Teardown

Kills the dev server, removes the worktree directory, and cleans up the branch. The inverse of `/ctx-worktree`.

## 1. Gather inputs

You need:

- **Port** (optional): the dev server port to kill. If unknown, check for a running Next.js/Vite/etc process or ask.
- **Force?**: use `--force` if there are uncommitted changes the user wants to discard.
- **Keep branch?**: use `--keep-branch` if the branch shouldn't be deleted (e.g., PR still open).

## 2. Run teardown

Must be run from inside the worktree being killed:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/kill-wt.sh --port <port>
```

The script:
1. Validates you're in a linked worktree (not main)
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

After teardown, you're back in the main repo. Let the user know they can `cd` there or that the terminal session should be closed.
