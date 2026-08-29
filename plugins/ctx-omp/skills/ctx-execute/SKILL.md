---
name: ctx-execute
description: Executes an approved CTX plan through bounded implementer and reviewer task dispatch.
user-invocable: true
---

# ctx-execute — Plan execution

Require an approved plan. Resolve plans only through `ctx_paths({ schemaVersion: 1, kind: "plans" })`, select the matching active plan and read it completely before dispatch.

1. Reconfirm the current branch/worktree and plan dependencies. Stop for a plan correction when repository state invalidates its assumptions.
2. Execute tasks in dependency order. A task prompt must include exact owned files, required context, acceptance criteria, proof, stop condition, and prohibition on remote actions or scope expansion.
3. Dispatch independent work in a single batched `task` request only when ownership and interfaces are disjoint. Use named `implementer`; model selection stays in OMP configuration.
4. For medium tasks, dispatch a `reviewer` after implementation. For high tasks, require independent spec-compliance review and then `code-reviewer` quality review. Feed verified findings back only to the owning implementer; re-review corrections.
5. Read actual diffs and observed proof rather than trusting worker status. Integrate one completed task before dependent tasks begin. Do not run project-wide validation during concurrent work unless the plan requires it at the integration boundary.
6. Update the resolved plan status/progress atomically through the runtime-owned path and report completed tasks, evidence, findings, and next dependency.

Use `skill://ctx-execute/references/example-dispatch.md` for dispatch shape. A worker reports DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED; the coordinator decides plan state.