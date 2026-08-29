---
name: ctx-ruthless
description: Audits an implementation plan against requirements and current code before execution.
user-invocable: true
---

# ctx-ruthless — Adversarial plan audit

Do not execute or rewrite the plan by default. Read the approved requirements, current repository state, and every task in the proposed plan.

1. Trace each requirement to one owned task and each task back to a requirement. Flag omissions, duplicate ownership, hidden dependencies, false parallelism, unbounded tasks, unclear source of truth, unsupported assumptions, and feature creep.
2. Check existing patterns and seams before accepting a new abstraction, interface, storage path, dependency, or verification approach.
3. Verify each task gives a fresh implementer sufficient context: exact files, change intent, interface impact, acceptance contract, proof, and stop condition.
4. Check ordering: dependencies precede consumers; migration/cutover includes callers and deletion; reviews and proof occur at meaningful boundaries.
5. When risk warrants it, dispatch a fresh named `reviewer` through `task` using `skill://ctx-ruthless/references/plan-audit-reviewer.md`. Reconcile only evidence-backed findings.
6. Return **APPROVED** or **ISSUES_FOUND**, citing requirements and file/task locations with precise corrections. An unresolved critical issue blocks `skill://ctx-execute/SKILL.md`.

Audit scope, not style. Do not invent optional work.