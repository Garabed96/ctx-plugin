---
name: ctx-kill-wt
description: Safely tears down a completed isolated worktree and its branch through the runtime workflow bridge.
user-invocable: true
---

# ctx-kill-wt — Tear down worktree

1. Determine the absolute target worktree path and optional known service port. Inspect the worktree and branch state; do not target the current base worktree.
2. Use `ask` for explicit confirmation of the path, branch deletion, and whether a supplied port may be stopped. Explain that this is destructive.
3. Call `ctx_workflow` with `{ schemaVersion: 1, operation: "kill_worktree", worktreePath, port?, detach? }` only after confirmation.
4. Report the returned stopped port, removed worktree, branch, and whether the branch was deleted. If it fails, report the structured error and do not claim partial cleanup.

The bridge owns process stopping, worktree removal, and branch deletion. Never reconstruct or execute a helper path.