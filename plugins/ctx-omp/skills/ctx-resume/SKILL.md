---
name: ctx-resume
description: Lists active CTX plans for the active OMP profile and resumes the chosen worktree safely.
user-invocable: true
---

# ctx-resume — Resume active work

1. Call `ctx_paths` with `{ schemaVersion: 1, kind: "plans" }`; if it fails, report its resolution error and stop before reading or writing state.
2. Use `glob` and `read` under the returned path. Keep plans with active status and present their topic, branch, worktree, status, and next action.
3. Use `ask` to select a plan when more than one is active.
4. If the selected plan's recorded worktree exists, call `ctx_workflow` with `{ schemaVersion: 1, operation: "open_worktree", path: <absolute worktree path> }` and report its returned launch command/result.
5. If the worktree is absent but the plan gives a branch, ask before creating a replacement using `ctx_workflow` `create_worktree`; then update only the selected plan at the resolved plans path. If neither exists, ask whether to create a new worktree and stop if declined.
6. Read the repository handoff through `ctx_workflow` `grab_context` before implementation when the plan indicates parked work.

Never reconstruct the plan root, helper locations, or editor launch command.