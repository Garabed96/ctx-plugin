---
name: ctx-factory-critique
description: Critiques a CTX Factory prototype against a reference and produces a prioritized next-version checklist.
user-invocable: true
---

# ctx-factory-critique — Reference-led critique

1. Open the current and reference prototypes through the Factory viewer. Resolve and supervise Factory only through `ctx_paths` and `hub` as described in `skill://ctx-factory/SKILL.md`.
2. Compare the same viewport and state. Evaluate hierarchy, information architecture, user flow, layout, typography, spacing, visual language, responsiveness, accessibility, empty/error/loading states, and interaction clarity.
3. Identify regressions before proposing novelty. Cite visible evidence and distinguish must-fix fidelity breaks from optional refinement.
4. Produce a prioritized checklist with: observed gap, why it matters to the product/user, exact affected surface, recommended correction, and acceptance observation. Reject vague preferences and ungrounded polish requests.
5. Do not alter the prototype or application. Hand the agreed checklist to `skill://ctx-brainstorm/SKILL.md` or the owning delivery plan.

The critique is complete when a designer or implementer can produce the next version without rediscovering the comparison.