---
name: ctx-align
description: Calibrates a request so it contains enough context for reliable execution without brittle over-specification.
user-invocable: true
---

# ctx-align — Context calibration

Read `skill://ctx-align/references/context_engineering_principles.md` before evaluating a substantial prompt; consult `skill://ctx-align/references/hidden_token_costs.md` and `skill://ctx-align/references/persuasion_principles.md` when relevant.

1. Identify the goal, current state, constraints, success criteria, supplied evidence, decision rights, and requested output.
2. Flag brittle over-specification: implementation micro-rules, duplicated constraints, premature file/API choices, and invented thresholds that reduce judgment without protecting a real invariant.
3. Flag vague under-specification: missing outcome, actor, boundary, source of truth, acceptance proof, or blocking dependency.
4. Recommend the smallest revision that makes the task actionable. Preserve valuable constraints and label assumptions rather than smuggling them in.
5. When the request needs product decisions clarified, hand off to `skill://ctx-grilling/SKILL.md`; when it needs an execution graph, hand off to `skill://ctx-plan/SKILL.md`.

Return a compact verdict: aligned, too specific, too vague, or missing a material decision; include a revised prompt when useful.