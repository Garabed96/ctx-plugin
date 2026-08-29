---
name: ctx-docs
description: Creates evidence-grounded architecture checkpoint documentation for completed CTX work.
user-invocable: true
---

# ctx-docs — Architecture checkpoint

Use after meaningful implementation or migration work; do not invent future architecture.

1. Read changed code, tests, migrations, existing documentation, and durable artifacts. Distinguish verified facts from inference.
2. Identify the current source-of-truth boundaries, request/data flows, module responsibilities, invariants, operational dependencies, decisions and rationale, user-visible behavior, and remaining gaps.
3. Write a concise checkpoint in the project documentation convention. Use Mermaid only for genuine flows or ownership structure. Cite paths, commits, tests, and artifacts rather than copying raw code or transcripts.
4. Explain migration status: completed cutovers, compatibility boundaries, removed paths, and exact next action. Do not document a claim that has not been verified.
5. Review for stale descriptions, duplicate authority, misleading certainty, and sensitive material. Report the document path and evidence basis.

When a plan/progress artifact is required, resolve its location through `ctx_paths`; never build a runtime profile path.