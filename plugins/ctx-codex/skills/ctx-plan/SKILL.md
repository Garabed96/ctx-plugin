---
name: ctx-plan
description: Create execution-oriented implementation plans from approved specs or requirements. Use before implementation when work must be decomposed into an explicit dependency graph with safe parallelism, file ownership, interface dependencies, review batches, and tiered verification for inline, delegated, or persistent-goal execution.
---

# ctx-plan — Execution-Oriented Implementation Planning

Create a plan that a fresh worker or persistent-goal orchestrator can execute without rediscovering scope, dependencies, scheduling, or verification strategy.

Treat planning as construction of a lightweight build graph. Reason about execution before writing task prose.

## Process

1. **Lock the requirements** — identify approved behavior, constraints, exclusions, and unresolved decisions. Stop for a material unresolved product decision.
2. **Inspect the codebase** — verify exact paths, current interfaces, ownership hotspots, existing test commands, and reusable patterns.
3. **Build the execution model** — follow `./references/execution-model.md` to derive tasks, dependency chains, interface edges, ownership claims, safe parallelism, waves, review batches, and verification levels.
4. **Write execution-ready tasks** — make each task independently understandable, scoped, and releasable after targeted GREEN verification.
5. **Validate the graph** — run `python3 ./scripts/validate_plan.py <draft-plan.md>`, fix every error, then reject any remaining semantic issue the structural validator cannot detect: hidden interface dependencies, unsupported parallel claims, or misplaced verification.
6. **Save the plan** — write `~/.codex/ctx-codex/plans/<topic-slug>.md` with the required structure.
7. **Self-review and hand off** — state audit posture, then offer the appropriate execution path.

## Required Plan Structure

Write these sections in order:

1. Frontmatter and plan header
2. Requirements and boundaries
3. Execution summary
4. Execution graph
5. Task specifications
6. Review batches
7. Scheduling policy
8. Final verification
9. Handoff

Use `./references/example-plan.md` as the canonical output example.

## Plan Header

```markdown
---
status: active
branch: null
worktree: null
created: YYYY-MM-DD
topic: <topic-slug>
---

# [Feature Name] Implementation Plan

**Goal:** [One sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [Key technologies]
**Total tasks:** N ([X LOW] [Y MED] [Z HIGH])
**Critical path:** T1 -> T3 -> T5
**Maximum safe parallelism:** N tasks
**Review batches:** N
**Execution posture:** [inline only | mixed | delegated]
```

Derive `topic` and the filename from the feature name: lowercase, hyphenated, and stripped of special characters.

## Execution Graph

Include one deterministic table:

```markdown
| Task | Depends on | Chain | Ownership | Interface dependency | Parallel-safe with | Wave | Review batch |
|---|---|---|---|---|---|---|---|
| T1 | — | contract | exclusive: `src/types.ts` | produces `Options` | T2 | 1 | B1 |
```

Use stable IDs (`T1`, `T2`, `B1`). `Depends on` is authoritative. Waves are advisory snapshots of initially-ready work; workers may start later tasks as soon as dependencies pass and ownership is released.

## Task Specification

Every task must use this shape:

````markdown
### Task T1: [Outcome] `[LOW|MED|HIGH]`

**Chain:** [short stable chain name]
**Depends on:** [task IDs or `none`]
**Unlocks:** [task IDs or `none`]
**Parallel-safe with:** [task IDs or `none`]
**Review batch:** [batch ID]

**Ownership:**
- Exclusive: `exact/path` — [classification]
- Shared: `exact/path` — [classification, or `none`]
- Expected new files: `exact/path` or `none`
- Acquire: [all write targets before editing]
- Hold: [until targeted GREEN and scoped diff acceptance]
- Release: [explicit release condition]

**Interfaces:**
- Produces: [named contract, schema, route, export, or `none`]
- Consumes: [provider task + named interface, or `none`]

**Files:**
- Create: `exact/path`
- Modify: `exact/path`
- Test: `exact/path`

**Steps:**
- [ ] Write the targeted failing test when behavior changes
- [ ] Run `[exact targeted command]` — expect RED
- [ ] Implement the minimal scoped change
- [ ] Run `[exact targeted command]` — expect GREEN
- [ ] Inspect the scoped diff against the task completion criteria
- [ ] Release ownership

**Targeted verification:** `[exact command]`
**Completion criteria:** [observable behavior, interface state, and accepted diff]
**Commit:** `type: concise outcome`
**Context:** [why this task exists and how it fits the graph]
````

Do not claim two tasks are parallel-safe when they write the same file, share an integration test, or one consumes an interface the other has not released.

<HARD-GATE>

Do not emit or save the plan until every task contains every field in the template. The execution-graph row does not substitute for task metadata. Never abbreviate later task specifications, even when the requested plan is concise; reduce prose inside fields instead.

</HARD-GATE>

## Complexity Tags

| Tag | Signals | Default execution | Review posture |
|---|---|---|---|
| `[LOW]` | Narrow known pattern, usually 1 production concern | Inline or delegated | Scoped review |
| `[MED]` | Several files, adapted pattern, interface consumer, or conditional logic | Inline or delegated | Review-batch coverage |
| `[HIGH]` | New abstraction, cross-system contract, migration, or broad shared ownership | Delegated after `ctx-worktree` | Fresh-context review expected |

Tag for reasoning and review risk, not merely line count. When uncertain, tag up.

## Granularity Rules

- Make each task one independently committable outcome, usually 5-20 minutes.
- Split work at ownership or interface boundaries, not at arbitrary file counts.
- Keep producer and consumer separate when releasing the producer's interface unlocks useful concurrency.
- Combine trivial edits that always acquire the same files and verification command.
- Name exact paths, commands, expected results, and acceptance criteria.
- Include code shapes only where the implementer would otherwise invent a contract.
- Do not paste full production implementations into the plan.
- Use TDD where behavior changes; do not force a synthetic RED step for pure docs, generated output, or mechanical configuration.

Plan failures include `TBD`, hidden shared files, vague validation, circular dependencies, impossible parallel claims, and full-suite reruns after every task.

## Self-Review

- [ ] Approved requirements map to tasks; excluded scope maps to no task
- [ ] Every task has a stable ID, complexity tag, chain, dependencies, ownership, interfaces, verification, and completion criteria
- [ ] Number of complete task specifications equals the plan's `Total tasks`
- [ ] Every modified file has exactly one active writer at a time
- [ ] Shared files create explicit serialization edges
- [ ] Interface producers precede consumers even without file overlap
- [ ] `Parallel-safe with` agrees with the dependency graph and ownership claims
- [ ] Execution waves are acyclic and the critical path is credible
- [ ] Broad checks appear in review batches or final verification, not every task
- [ ] Review batches name exact commands and review scope
- [ ] Scheduling policy is present verbatim or semantically equivalent
- [ ] Audit posture states whether `ctx-ruthless` is warranted and why

## Handoff

Recommend `ctx-ruthless` when the plan has a `[HIGH]` task, spans three or more systems, carries a hard time constraint, or the user requests a scope audit. It is optional for narrow, all-LOW plans.

```text
ctx-plan -> ctx-ruthless -> user approval -> ctx-worktree -> ctx-execute
ctx-plan -> ctx-worktree -> ctx-execute
```

Offer inline execution for narrow work and delegated execution after `ctx-worktree` for high-risk or explicitly delegated work. For a persistent goal, keep the goal small: instruct the orchestrator to execute the plan's authoritative graph and scheduling policy rather than duplicating scheduling logic in the goal.

Do not send delegated work directly from `ctx-plan` to `ctx-execute` without a linked worktree.

## Skill Files

- `SKILL.md` — entry point and required output contract
- `./scripts/validate_plan.py` — deterministic plan-schema and graph validator
- `./references/execution-model.md` — graph construction and scheduling rules
- `./references/example-plan.md` — canonical execution-oriented plan

## Gotchas

- A file list is not an ownership model. Classify the role of every touched file.
- No file overlap does not prove independence. Check interface production and consumption.
- Waves are not barriers. Release ready work dynamically after scoped acceptance.
- Review batches amortize broad checks; they do not replace targeted task verification.
- Do not hide scheduler logic in prose. Encode it in the graph and metadata.
