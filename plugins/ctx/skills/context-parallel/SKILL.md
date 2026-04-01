---
name: context-parallel
description: >
  Use when facing 2+ independent tasks that can run without shared state
  or sequential dependencies. Ad-hoc parallel dispatch — complements
  /context-execute (which dispatches sequentially per-plan).
user-invocable: true
---

# /context-parallel — Ad-Hoc Parallel Subagent Dispatch

Dispatch independent tasks to parallel subagents when sequencing them would waste time. Each agent gets isolated context, a focused scope, and a clear deliverable.

**Core principle:** one agent per independent problem domain. Let them work concurrently.

## When This Skill vs /context-execute

| Situation | Use |
|-----------|-----|
| You have a tagged plan from `/context-plan` | `/context-execute` |
| 2+ unrelated tasks, no plan needed | `/context-parallel` |
| Multiple test failures across independent files | `/context-parallel` |
| Sequential tasks that share state | `/context-execute` |

---

## Decision Framework

Before dispatching, verify all three conditions:

1. **Independent** — fixing/completing task A doesn't affect task B
2. **No shared state** — agents won't edit the same files or use the same resources
3. **Self-contained** — each task can be understood without the others' context

If any condition fails, use sequential execution instead.

**Use when:**
- 2+ test files failing with different root causes
- Multiple subsystems broken independently
- Parallel investigations (different logs, different modules)
- Batch file changes across unrelated areas

**Don't use when:**
- Failures are related (fix one, fix others) — investigate together first
- Agents would edit the same files — they'll conflict
- You don't know what's broken yet — explore first, parallelize later
- Tasks need results from each other — that's sequential work

---

## Process

### 1. Identify Independent Domains

Group work by what's actually independent:

```
Domain A: Auth service — token refresh bug
Domain B: Dashboard — chart rendering regression
Domain C: CLI — missing flag validation
```

Each domain is self-contained. Fixing auth doesn't affect chart rendering.

### 2. Craft Focused Agent Prompts

Each agent gets exactly what it needs — no more:

- **Scope** — one file, one subsystem, one concern
- **Goal** — concrete deliverable (fix these tests, refactor this module)
- **Context** — error messages, relevant file paths, recent changes
- **Constraints** — what NOT to touch, what assumptions to hold
- **Output format** — what to report back (summary, root cause, changes made)

### 3. Dispatch in Parallel

Use the Agent tool. All calls go in the same message so they run concurrently:

```
Agent 1 → "Fix auth token refresh in src/auth/refresh.ts. Error: ..."
Agent 2 → "Fix chart rendering in src/dashboard/Chart.tsx. Symptom: ..."
Agent 3 → "Add --dry-run flag validation to src/cli/flags.ts. Spec: ..."
```

### 4. Integrate and Verify

When all agents return:

1. **Read each summary** — understand what changed and why
2. **Check for conflicts** — did any agents touch overlapping files?
3. **Run full test suite** — verify all fixes work together
4. **Spot check** — agents can make systematic errors; review diffs

---

## Agent Prompt Template

```markdown
[TASK DESCRIPTION — one sentence]

Context:
- [Error message or symptom]
- [Relevant file paths]
- [Recent changes that may have caused this]

Your task:
1. Read [specific files] to understand the problem
2. Identify root cause
3. Fix by [specific approach or constraints]

Constraints:
- Do NOT modify [files outside scope]
- Do NOT [specific anti-pattern to avoid]

Return: Summary of root cause and changes made.
```

**What makes a good prompt:** self-contained context, specific scope, clear output format. The agent should never need to ask "where do I start?"

---

## Common Mistakes

**Too broad:** "Fix all the tests" — agent gets lost in scope.
Better: "Fix the 3 failures in `auth.test.ts` — timing issues in token refresh."

**No context:** "Fix the race condition" — agent doesn't know where to look.
Better: paste the error messages, test names, and file paths.

**No constraints:** agent may refactor everything in sight.
Better: "Only modify `src/auth/refresh.ts`. Do not change test expectations."

**Vague deliverable:** "Fix it" — you don't know what changed.
Better: "Return summary of root cause and what you changed."

**Overlapping scope:** two agents editing the same module.
Better: split by file, not by symptom, when domains overlap.

---

## Re-Merge Checklist

After agents complete, before considering the work done:

- [ ] All agent summaries reviewed
- [ ] No file conflicts between agents
- [ ] Full test suite passes
- [ ] Type-check passes (if applicable)
- [ ] Changes make sense together — no contradictory fixes

If conflicts exist, resolve manually or dispatch a single integration agent.

---

## Gotchas

- **Premature parallelization.** If you don't understand the failure yet, dispatching agents wastes tokens. Investigate first, parallelize when you know the domains are independent.
- **Hidden dependencies.** Two "independent" test files may share a fixture or setup module. Check imports before dispatching.
- **Agent context isolation cuts both ways.** Agents don't see each other's work — that's the point. But it means agent B can't build on agent A's fix. If you discover mid-flight that tasks are coupled, stop and switch to sequential.
- **Over-dispatching.** Two agents is the sweet spot for most work. Five agents means you probably haven't grouped well enough. Prefer fewer, well-scoped agents over many narrow ones.

---

## Handoff

After integration and verification:
- If this was part of a larger plan, return to `/context-execute` for the next sequential task
- If this was ad-hoc, commit the combined work and summarize what changed
