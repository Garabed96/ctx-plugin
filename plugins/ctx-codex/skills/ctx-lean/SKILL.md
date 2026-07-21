---
name: ctx-lean
description: Create a concise, evidence-backed implementation plan through main-agent orchestration, bounded read-only discovery, blocking-question-only clarification, and a risk-routed ctx-ruthless audit. Use when the user asks to plan, scope, map, or prepare a small-to-medium feature, refactor, bug fix, or technical change and full ctx-plan ceremony would be excessive. Also use for requests such as "quick plan", "lean plan", or "simpler ctx plan"; escalate broad or high-blast-radius work to ctx-plan.
---

# CTX Lean

Create the smallest trustworthy bridge from user intent to implementation. Keep the main agent as architect and use subagents as bounded evidence tools.

Do not implement production code while running this skill.

## Follow the required state machine

```text
FRAME -> DISCOVER -> SYNTHESIZE
  -> BLOCKED ON DECISION
  -> ESCALATED TO CTX-PLAN
  -> LEAN PLAN V1 -> LOW SELF-CHECK | MED/HIGH CTX-RUTHLESS -> STOP
```

<HARD-GATES>
- Do not return a generic plan that omits task risk tags, the audit route, or the terminal state.
- Do not return a MED/HIGH plan before completing the ctx-ruthless audit and presenting its findings.
- Do not revise a frozen audited plan until the user explicitly approves the findings.
</HARD-GATES>

## Preserve ownership

- Keep goal interpretation, scope, architecture, tradeoffs, user interaction, synthesis, and final decisions with the main agent.
- Always make an explicit routing decision. For plan-worthy work, use one fresh read-only discovery worker by default; use zero only when the task is atomic and the necessary evidence is already present.
- Add at most one first-wave worker for a genuinely independent evidence lane, such as current framework documentation or external practice.
- Do not delegate synthesis, ask workers to make the product decision, or nest workers by default.
- Use the strictest available read-only sandbox or tool allowlist. If the runtime cannot enforce read-only capabilities, forbid mutations in the worker brief and disclose that limitation.

## 1. Frame the intent

Extract:

- the outcome and observable success condition;
- known constraints and explicit non-goals;
- repository or product rules that govern the change;
- facts, assumptions, and unresolved decisions.

Inspect the cheapest direct context before asking the user. Ask immediately only when authorization, safety, or an irreversible choice blocks discovery.

Escalate to `ctx-plan` when the work cannot remain a short linear plan, when failure has material blast radius, or when implementation requires durable coordination across multiple boundaries. Typical signals include migrations, security or payment behavior, destructive operations, shared contract changes, operational rollout, or more than six meaningful implementation units.

## 2. Route read-only discovery

Give each worker only the task-local context it needs:

```text
Objective:
Boundary:
Preferred sources and tools:
Forbidden actions:
Budget or stop condition:
Return: findings, evidence with locators, uncertainty, contradictions, and gaps
```

Route by evidence type:

- Use a repository explorer for current behavior, reusable patterns, tests, and exact file paths.
- Use Context7 or official documentation for a named, current library or API question.
- Use web or X research only when current external evidence can change a plan decision.

Run independent workers concurrently. Permit one targeted follow-up only when a material success criterion remains unsupported.

Do not let a straggling worker block synthesis. At the stated budget or stop condition, request the best available findings, continue with verified evidence, and record the remaining gap.

## 3. Synthesize before asking

Verify material claims against primary sources or exact repository locations. Separate:

- verified fact;
- reasonable inference;
- unresolved gap.

Discard duplicated research and findings that do not change scope, architecture, sequencing, risk, or verification.

Classify decisions:

- **Mechanical:** infer from established repository patterns.
- **Taste:** recommend a default and record the assumption.
- **User decision:** ask only when the answer materially changes the goal, scope, architecture, sequence, risk, or irreversible behavior and cannot be responsibly discovered or inferred.

Treat a mismatch between the requested surface or entity and the discoverable code as a blocking user decision. Do not silently substitute a nearby screen, route, or workflow.

If no blocking decision remains, continue without asking and make assumptions visible.

## 4. Draft Lean Plan v1

Assign risk from behavior, not diff size:

- **LOW:** localized, reversible presentation or copy with no asynchronous state, shared contract, or recovery behavior.
- **MED:** asynchronous state transitions, cache mutation, rollback or failure recovery, shared behavior, or contract-adjacent change.
- **HIGH:** security, payments, destructive or irreversible effects, migrations, durable data correctness, or operational rollout.

When uncertain between two levels, use the higher level and explain why.

Produce:

```markdown
# Lean Plan: <outcome>

## Goal
<observable result>

## Evidence and decisions
- <verified finding or explicit assumption>

## Scope
- In: <included behavior>
- Out: <explicit non-goal>

## Tasks
### L1 [LOW|MED|HIGH] <outcome>
- Paths: <exact likely paths>
- Change: <behavioral or structural change>
- Verify: <exact command or observable check>
- Done when: <completion condition>

## Risks and follow-ups
- <only material items>

## Audit route
<audit required or skipped, with reason>
```

Use one to six meaningful, outcome-oriented tasks. Preserve stable task IDs, exact paths when known, risk tags, verification commands, and observable done conditions. Include dependencies only when real.

Resolve verification commands from repository scripts, CI configuration, or documented project commands. If a command cannot be verified, record the gap instead of guessing. Preserve repository-mandated planning gates, such as contract tracing or cross-surface parity, in the plan.

Do not pre-write production code, invent unknown paths or contracts, or decompose work into minute-by-minute microtasks.

## 5. Route the ruthless audit

Make the audit decision explicit:

- Invoke `ctx-ruthless` for any MED/HIGH plan, weak or conflicting evidence, shared-contract risk, three or more independent systems, hard time constraints, or an explicit audit request. Optimistic updates, rollback, cache mutation, and failure recovery are MED by default.
- Skip the full audit only for a narrow all-LOW plan with strong evidence. Record the reason and perform a compact self-check for requirement coverage, unnecessary machinery, and executable verification.

When invoking `ctx-ruthless`:

1. Freeze Lean Plan v1.
2. Give the reviewer the user decisions, acceptance criteria, repository rules, relevant evidence, and frozen plan.
3. Follow the `ctx-ruthless` skill completely.
4. Present its status and evidence-backed findings without changing the plan.

**HARD GATE:** Do not revise the frozen plan during the audit. Wait for explicit user approval of the audit findings. A request made before the audit to "plan and implement" does not approve findings the user has not seen.

After approval, apply the smallest plan-only revision that resolves the approved findings. Reconcile task IDs, paths, dependencies, risk tags, verification, and completion criteria. If the audit shows that lean planning is no longer appropriate, replace it with `ctx-plan` and audit the materially new plan.

## Finish clearly

State one of:

- **LEAN PLAN READY** — narrow all-LOW plan; full ruthless audit skipped with reason.
- **BLOCKED ON DECISION** — discovery found a user choice that materially changes the plan.
- **AWAITING AUDIT APPROVAL** — ruthless findings presented; frozen plan unchanged.
- **ESCALATED TO CTX-PLAN** — lean scope is unsafe or insufficient.

Do not begin implementation until the applicable planning and approval gates are satisfied.
