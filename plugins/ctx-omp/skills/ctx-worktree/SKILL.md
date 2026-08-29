---
name: ctx-worktree
description: Creates an isolated worktree, links eligible plan context, and opens it through OMP.
user-invocable: true
---

# ctx-worktree — Isolated work

1. Use `ask` for the worktree name, base ref, branch prefix, and whether dependency installation is wanted. Confirm the target is not the base branch.
2. Call `ctx_workflow` with `{ schemaVersion: 1, operation: "create_worktree", cwd: <absolute cwd>, name, base, prefix, skipDeps }`. Stop on an error; do not fall back to a shell helper.
3. Call `ctx_workflow` `post_setup_worktree` with the source and returned target paths when setup is required. Report the returned environment and dependency outcome.
4. Resolve plans only with `ctx_paths({ schemaVersion: 1, kind: "plans" })`. Link an eligible active plan with no branch only after choosing it through `ask`; if several qualify, require a selection.
5. Write the repository handoff only through the handoff path returned by `ctx_workflow` `scan_park` or `grab_context`. Include purpose, decisions, current state, plan reference, and first action; omit transcript and secrets.
6. Call `ctx_workflow` `open_worktree` with the returned path. Report its OMP launch command and whether it launched.

Use `ctx_workflow` for every worktree action. Do not infer runtime roots, invoke another runtime, or construct a helper path.