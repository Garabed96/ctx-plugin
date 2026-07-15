---
name: ctx-ruthless
description: >
  Audit an existing implementation plan against approved requirements and current
  code before execution. Use for a ruthless scope review, plan audit, feature-creep
  check, or when safety guardrails may have been cut along with optional scope.
---

# ctx-ruthless — Evidence-Backed Plan Audit

Find the smallest plan that fully satisfies the approved requirements **and** preserves necessary correctness. The plan is the audit target, not the source of truth.

This skill reviews an existing plan. It does not create the initial plan, make unresolved business decisions, or implement code.

<HARD-GATE>
Do not edit the plan, code, tickets, or specifications during the audit. Present the findings and wait for explicit user approval before changing the plan. If the user requested review only, stop after the audit.
</HARD-GATE>

## Evidence Order

Use evidence in this order when sources disagree:

1. Explicit user decisions made for this scope
2. Acceptance criteria in the source ticket or approved specification
3. Repository rules and documented architecture
4. Current production code and tests
5. The implementation plan

Say "I don't know" when a source cannot be accessed or a claim cannot be verified. Do not convert assumptions into blocking findings.

## Audit Workflow

### 1. Establish the boundary

- Locate the plan and its source ticket, specification, or approved requirements.
- Read the repository's `AGENTS.md`, `CLAUDE.md`, or equivalent instructions.
- Record explicit non-goals, deferred work, deadlines, and accepted product decisions.
- Identify the workflows that must not regress.
- If the plan has no discoverable source of truth, state that limitation before continuing.

### 2. Build an acceptance ledger

Map each approved requirement to the plan tasks that deliver it. Record requirements that are missing, only partially covered, or implemented more broadly than requested.

Use this classification for every material plan element:

| Class | Meaning | Default disposition |
|---|---|---|
| Required behavior | Directly satisfies an approved acceptance criterion | Keep |
| Necessary safety | Prevents a demonstrated regression or correctness failure introduced by the required change | Keep, but seek the smallest proven mechanism |
| Optional capability | Useful product behavior not required for acceptance | Cut or defer |
| Speculative machinery | Infrastructure, abstraction, or test surface justified mainly by hypothetical future needs | Cut or simplify |

### 3. Audit current patterns before accepting new machinery

Trace the narrow code paths affected by the plan. Search for an existing mechanism before approving a new one.

Apply extra scrutiny to proposed:

- tables, queues, events, cron fallbacks, retry state, or background functions
- notification channels, permissions, endpoints, or UI surfaces
- libraries, feature flags, operator tools, or generalized abstractions
- duplicate sources of truth or parallel reporting systems
- tests and harnesses broader than the behavior being added

These are review signals, not automatic cuts. Keep one only when the requirements or a verified failure mode need it and the current system cannot provide the guardrail more simply.

### 4. Protect the safety floor

Ruthless scope control does not mean deleting correctness. Check the real execution boundaries for:

- authorization and policy checks before irreversible side effects
- retry, idempotency, concurrency, and re-entrancy behavior
- persistence and external-call ordering
- partial failure and recovery behavior
- existing manual, automated, and scheduled paths touched by the change
- denial/error surfaces that callers already depend on

Require code or test evidence for a safety claim. A component named "retry" or "fallback" is not evidence that it is necessary; a demonstrated duplicate side effect or stranded state is.

### 5. Use fresh-context review when it pays for itself

For a plan with any `[HIGH]` task or three or more independent subsystems, dispatch up to three fresh-context reviewers, one per independent boundary. Give each reviewer the plan, source requirements, repository root, and only its assigned boundary. Do not prime reviewers with the current conversation's conclusions.

Read `./references/plan-audit-reviewer.md` for the dispatch template. If subagents are unavailable, run the same template as separate self-review passes.

### 6. Synthesize without editing

Reconcile reviewer claims against primary evidence. Deduplicate overlapping findings and separate blockers from advisory improvements.

## Output Contract

Return this structure:

```markdown
# CTX Ruthless Audit

**Status:** Approved | Reduce Scope | Restore Safety | Reduce Scope + Restore Safety
**Source of truth:** [ticket/spec/user decisions]
**Audit boundary:** [systems and workflows reviewed]

## Keep
- [plan element] — [requirement or verified safety evidence]

## Cut or Defer
- [plan element] — [why it is outside acceptance]

## Simplify
- [plan element] — [smaller existing pattern or narrower mechanism]

## Restore or Clarify
- [missing requirement, correctness gate, or unresolved business decision]

## Revised Shape
- [minimal task order, dependency changes, and revised complexity]

## Evidence Gaps
- [only claims that could not be verified]
```

Omit empty sections. Cite file paths, line numbers, ticket clauses, or exact plan headings near each material claim.

## Approval and Revision

After the user approves the findings:

1. Apply the smallest plan-only diff that implements the approved audit.
2. Preserve requirements and verified safety gates; remove or defer optional capability.
3. Reconcile task numbers, dependencies, complexity counts, execution order, paths, and acceptance criteria.
4. Search the full plan for stale references to removed tasks or mechanisms.
5. Present the revised plan summary. Offer an orchestration prompt only if requested.

If the audit reveals a business decision rather than an implementation defect, surface the decision instead of inventing a default.

## Relationship to Other Skills

```text
ctx-align -> ctx-plan -> ctx-ruthless -> approval -> ctx-worktree -> ctx-execute
```

- Use `ctx-align` when intent is unclear.
- Use `ctx-plan` to create or revise the implementation plan.
- Use `ctx-ruthless` as a deliberate audit for high-risk, multi-system, or time-boxed work. It is not a mandatory tax on every small plan.
- Use `ctx-execute` only after the approved audit changes are reflected in the plan.

## Gotchas

- **Scope hidden as safety:** New product behavior does not become required because it is labeled a guardrail.
- **Safety hidden as scope:** Retry or ordering protection is not optional when the required change creates a verified double-charge, duplicate side effect, or stranded-state risk.
- **Ticket literalism:** Acceptance criteria define outcomes, not necessarily new infrastructure. Prefer existing patterns that deliver the outcome.
- **Reviewer invention:** Unverified risks belong in Evidence Gaps or recommendations, not blocking findings.
- **Audit drift:** Do not turn the audit into architecture cleanup, naming polish, or a second brainstorm.

## Skill Files

- `SKILL.md` — audit process, hard gate, and output contract
- `./references/plan-audit-reviewer.md` — fresh-context reviewer prompt
