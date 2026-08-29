---
name: ctx-prd
description: Produces a decision-ready gated demo PRD with canonical JSON, Markdown, and Canvas projections.
user-invocable: true
---

# ctx-prd — Gated demo PRD

1. Before creating or locating a bundle, call `ctx_paths({ schemaVersion: 1, kind: "prds" })`. Treat its absolute profile-scoped path as the only canonical PRD root; stop before reading or writing if resolution fails.
2. Explore the product request with one recommended decision at a time through `ask`. Establish user, problem, evidence, outcome, happy path, constraints, non-goals, risks, and gateable scope.
3. Read `skill://ctx-prd/assets/demo-prd-template.md`, `skill://ctx-prd/references/artifact-contract.md`, and `skill://ctx-prd/assets/canvas-input.example.json` before creating artifacts.
4. Create the topic bundle beneath the resolved PRD root and generate its Markdown and Canvas projections from canonical JSON. Keep the bundle's revision, gate IDs, ordering, status, proof, and verifier synchronized across all three representations.
5. Record decisions, assumptions, open questions, success metrics, acceptance checks, named seams, and explicit gates. Do not prescribe implementation beyond product-relevant contracts.
6. Require decision approval before marking the bundle APPROVED. If the original request pre-authorizes execution, preserve that exact text as approval evidence.
7. Validate the canonical bundle and projections through the adapter-supported artifact surface when it is available. On missing runtime support, finish all non-execution work and report the capability gap; do not assemble or invoke a local helper.
8. Hand approved work to `skill://ctx-prd-exec/SKILL.md`; hand uncertain product direction to `skill://ctx-grilling/SKILL.md`.
