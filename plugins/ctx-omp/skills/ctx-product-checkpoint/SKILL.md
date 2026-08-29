---
name: ctx-product-checkpoint
description: Creates an evidence-backed product checkpoint and design-decision hub for current work.
user-invocable: true
---

# ctx-product-checkpoint — Product evidence hub

1. Read the current implementation, user-facing states, tests/QA evidence, product artifacts, and prior checkpoint. Separate current fact, decision, assumption, and proposed option.
2. Read `skill://ctx-product-checkpoint/assets/product-checkpoint-template.md` and `skill://ctx-product-checkpoint/references/artifact-contract.md`; use their required artifact and projection contract.
3. Produce a decision hub covering user value, working behavior, incomplete work, business hypothesis, QA evidence, visual direction/options, implementation handoff, risks, and next decision. Use images or prototypes only where they materially clarify a product choice.
4. Preserve source-of-truth links to code, proof, and canonical product artifacts. Do not turn an unverified design concept into a completion claim.
5. Use `ask` to gate material product decisions. When a visual prototype is needed, follow `skill://ctx-factory/SKILL.md`; when delivery is ready, hand off to `skill://ctx-prd/SKILL.md` or `skill://ctx-plan/SKILL.md` as appropriate.

The checkpoint is a product view of evidence, not a replacement for code, tests, or the canonical PRD.