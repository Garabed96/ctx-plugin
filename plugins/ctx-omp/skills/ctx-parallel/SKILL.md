---
name: ctx-parallel
description: Coordinates one bounded wave of genuinely independent CTX work through named OMP task roles.
user-invocable: true
---

# ctx-parallel — One independent wave

Use this only for two or more tasks that can complete without reading, editing, or depending on each other's output. For dependent plan execution, use `skill://ctx-execute/SKILL.md`.

1. Inspect files and imports first. Prove disjoint ownership, independent interfaces, separate verification, and no shared fixture/configuration collision. If any dependency exists, sequence the work instead.
2. Prepare focused prompts: one outcome, exact files, context, acceptance criteria, proof, stop condition, and no remote or unrelated changes.
3. Dispatch every independent assignment together in one batched `task` request, using named `implementer`, `reviewer`, or `code-reviewer` as appropriate. Do not serialize a parallel wave or dispatch a generic role.
4. Wait for all reports, inspect actual diffs and proof, resolve conflicts at the coordinator, and run only the integration verification that the combined changes require.
5. If an unexpected dependency appears, stop the wave, retain completed isolated work, and switch to a sequential plan.

Report the ownership proof, assignments, evidence, and any task that was intentionally not parallelized.