---
name: ctx-brainstorm
description: Explores a small-to-medium feature and produces an approved, testable design before planning.
user-invocable: true
---

# ctx-brainstorm — Lean design exploration

**Hard gate:** do not implement, scaffold, or invoke an execution workflow until the user approves a written design.

1. Explore relevant repository context, current behavior, constraints, and existing patterns. State the current one battle and surface blocked sequencing.
2. If scope spans three or more independent systems, is highly ambiguous, or introduces a new domain, recommend `skill://ctx-brainstorm-ss/SKILL.md`.
3. Before questions, evaluate whether diagrams, options, layout comparisons, or other spatial content need Factory. If yes, offer Factory and wait. Read `skill://ctx-brainstorm/references/factory-guide.md`; for an active Factory, use `ctx_paths({ schemaVersion: 1, kind: "factory_launcher" })` and supervised `hub` process ownership rather than resolving files yourself.
4. Ask one decision at a time with `ask`, preferring a recommended choice. Establish purpose, users, constraints, success criteria, and unknowns.
5. Present two or three viable approaches and tradeoffs, recommend one, then present a design covering flow, boundaries, artifacts, risks, verification, and completion criteria.
6. After approval, write the specification using `skill://ctx-brainstorm/references/example-spec.md`; consult `skill://ctx-brainstorm/references/complexity-tags.md`, tag units, self-review YAGNI, pattern reuse, data flow, success criteria, and testability.
7. Ask the user to review the saved specification. The only workflow handoff is `skill://ctx-plan/SKILL.md`.

For Factory prototypes, read `skill://ctx-brainstorm/factory/references/factory-frontend.md` and use Factory's owned write interface; do not write prototype files directly.
For mobile prototype work, also read `skill://ctx-brainstorm/factory/references/ios-mobile.md`; for visual hierarchy, contrast, and type decisions, read `skill://ctx-brainstorm/factory/references/product-ui-contrast-typography.md`.