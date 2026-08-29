---
name: ctx-plan
description: Produces a concise, execution-ready dependency plan for an approved CTX specification.
user-invocable: true
---

# ctx-plan — Execution graph

Do not implement. Require an approved design/specification or an explicitly bounded repair request.

1. Read the specification and inspect exact repository paths, interfaces, conventions, ownership hotspots, test seams, and existing verification commands.
2. Read `skill://ctx-plan/references/execution-model.md` before deriving independently releasable tasks, interface edges, ownership claims, dependency chains, safe parallel waves, review batches, and per-task proof.
3. Use `skill://ctx-plan/references/example-plan.md` for the required structure. Every task states purpose, owned files, exact changes, interfaces, dependencies, acceptance criteria, and proportional verification; tag it `[LOW]`, `[MED]`, or `[HIGH]`.
4. Resolve the active plan directory only with `ctx_paths({ schemaVersion: 1, kind: "plans" })`; stop before writing if resolution fails. Save the plan there with atomic replacement semantics supplied by the runtime.
5. Validate graph completeness with careful review: no hidden interface dependency, overlapping ownership, unsupported parallelism, broad task, or untestable acceptance condition. The runtime validator is an integration concern; do not assemble or invoke a local helper from this skill.
6. State the execution order and offer `skill://ctx-ruthless/SKILL.md` for adversarial scope review before `skill://ctx-execute/SKILL.md`.

A plan is complete only when another fresh worker can execute each task without rediscovering intent.