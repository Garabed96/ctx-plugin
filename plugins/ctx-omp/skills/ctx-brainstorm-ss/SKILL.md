---
name: ctx-brainstorm-ss
description: Uses independent review to design high-ambiguity or multi-system work before planning.
user-invocable: true
---

# ctx-brainstorm-ss — Deep design exploration

Use when lean brainstorming finds multiple independent systems, a new domain, broad uncertainty, or mostly high-complexity units. **Hard gate:** no implementation or execution workflow before the user approves the specification.

1. Explore existing code, product constraints, and the current blocked battle. Split independent product areas only when they can receive separate designs and delivery paths.
2. Offer Factory before spatial design decisions; follow `skill://ctx-brainstorm/references/factory-guide.md` and use `ctx_paths` plus `hub` for Factory runtime ownership.
3. Ask one recommended decision at a time with `ask`. Define outcomes, users, boundaries, data authority, risks, non-goals, and measurable completion.
4. Present alternatives and a recommended architecture. Design for isolation: named seams, explicit contracts, dependency direction, artifact ownership, and verification per unit.
5. Write the candidate specification. Read `skill://ctx-brainstorm-ss/references/spec-reviewer-prompt.md`, then dispatch one fresh-context named `reviewer` with `task` to audit the spec. Correct evidenced issues and repeat at most three times; surface unresolved conflict to the user.
6. Tag every unit from `skill://ctx-brainstorm/references/complexity-tags.md`; self-review YAGNI, existing-pattern reuse, data flow, success criteria, and testability.
7. Obtain user review of the spec, then hand off only to `skill://ctx-plan/SKILL.md`.

Do not use generic worker schemas or hardcode provider models.