---
name: ctx-lean
description: Creates a concise evidence-backed implementation plan for a small-to-medium change.
user-invocable: true
---

# ctx-lean — Bounded implementation plan

Use after a requirement is sufficiently understood; do not implement.

1. Read the request and inspect the smallest relevant repository surface: consumer, data/control flow, existing pattern, tests, and current behavior.
2. Ask only blocking questions with `ask`; state derived assumptions when action can proceed without a question.
3. Produce a compact plan with goal, non-goals, exact files, ordered changes, interfaces, risks, acceptance criteria, and verification. Keep work in a reviewable file set.
4. Route higher-risk, security-sensitive, multi-system, or unclear work to `skill://ctx-plan/SKILL.md`; route feature ambiguity to `skill://ctx-brainstorm/SKILL.md`.
5. Audit the plan using `skill://ctx-ruthless/SKILL.md` principles: no feature creep, no invented abstractions, every requirement covered, no unverified assumptions.
6. Resolve the plan directory only through `ctx_paths({ schemaVersion: 1, kind: "plans" })` when persistence is requested. Report the exact evidence informing the plan and the next approval gate.

A lean plan is not a substitute for approval or for execution.