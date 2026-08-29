---
name: ctx-grab
description: Restores the repository's parked CTX context at the start of a new session.
user-invocable: true
---

# ctx-grab — Restore session context

1. Announce that prior context is being restored.
2. Call `ctx_workflow` with `{ schemaVersion: 1, operation: "grab_context", cwd: <absolute current working directory> }`.
3. On `status: "no_handoff"`, say that no parked context exists, ask what to work on, and stop. On `status: "archived"`, state the archive location and stop unless the returned handoff identifies active work.
4. For `status: "restored"`, read the returned `handoff` and inspect the returned worktree and recent git log only as needed. Summarize the goal, completed work, current evidence, decisions, and next action.
5. If the handoff is stale or contradicts repository state, state the discrepancy and use the repository as current truth.

`ctx_workflow` owns handoff and archive resolution. Do not construct profile paths or locate helper scripts.

## Reference

Read `skill://ctx-grab/references/example-briefing.md` before presenting a substantial restored briefing.