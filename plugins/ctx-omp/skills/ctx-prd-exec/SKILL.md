---
name: ctx-prd-exec
description: Executes an approved gated demo PRD while preserving its canonical artifact and gate evidence.
user-invocable: true
---

# ctx-prd-exec — Gated PRD delivery

1. Call `ctx_paths({ schemaVersion: 1, kind: "prds" })` before locating a bundle. Use only its returned profile-scoped canonical root; stop before execution if resolution fails.
2. Locate the canonical PRD bundle beneath that root. Before editing, read its JSON, Markdown, and Canvas projections; confirm APPROVED status, approval evidence, matching revision/gates/proof, and all named artifacts.
3. Convert the approved gates into bounded delivery slices. Preserve named seams, non-goals, acceptance criteria, and evidence requirements; do not silently change product scope.
4. Dispatch or execute slices through `skill://ctx-execute/SKILL.md` only after their gate is satisfied. Keep progress and proof reflected in the canonical JSON before projecting it into Markdown and Canvas.
5. For web UI, use `skill://ctx-qa/SKILL.md` and OMP `browser` against the existing user-owned surface. For mobile UI, name one QA target and do not mix evidence. For non-UI behavior, use tests, API responses, logs, or durable state appropriate to the contract.
6. At every gate, record observed proof, verifier, status, unresolved risk, and next decision. Stop and ask when a required gate is not approved.
7. Finish only when every approved acceptance check has evidence and the canonical bundle plus projections agree.

Read `skill://ctx-prd-exec/references/model-routing.md` for task-routing guidance. Never infer runtime bundle or profile paths.