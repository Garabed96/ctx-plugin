---
name: ctx-plan
description: >
  Use when you have a spec or requirements and need an implementation plan before
  writing code.
user-invocable: true
---

# /ctx-plan — Implementation Planning

Write plans that a fresh agent with zero codebase knowledge can execute. Tag every task with a complexity level that drives agent budget in `/ctx-execute`.

## Process

1. **Read the spec** — if coming from `/ctx-brainstorm`, the spec already has complexity tags
2. **Map the file structure** — which files are created/modified and what each is responsible for
3. **Decompose into tasks** — each task produces a self-contained, testable change
4. **Tag each task** — `[LOW]`, `[MED]`, or `[HIGH]` (inherit from spec or classify here)
5. **Write the plan** — save to `~/.claude/plugins/marketplaces/ctx-plugin/plans/<topic-slug>.md` with frontmatter, commit
6. **Self-review** — apply the checks below, fix inline
7. **Choose the handoff** — offer `/ctx-ruthless` for a deliberate scope audit when risk warrants it; otherwise offer execution

---

## Task Structure

Each task follows this template:

````markdown
### Task N: [Component Name] `[LOW]`

**Files:**
- Create: `exact/path/to/file.ts`
- Modify: `exact/path/to/existing.ts`
- Test: `tests/path/to/test.ts`

**Steps:**
- [ ] Write failing test
- [ ] Run test — expect FAIL
- [ ] Write minimal implementation
- [ ] Run test — expect PASS
- [ ] Commit: `feat: <what>`

**Context:** [1-2 sentences — what this task does and how it fits into the whole]
````

---

## Complexity Tags

Inherit from the spec if `/ctx-brainstorm` was used. Otherwise classify here:

| Tag | Signals | Agent Budget | Model |
|-----|---------|-------------|-------|
| `[LOW]` | 1 file, copy existing pattern, no new logic | 1 agent (implement only) | sonnet |
| `[MED]` | 2-3 files, adapt pattern, conditional logic | 2 agents (implement + review) | sonnet |
| `[HIGH]` | 4+ files, new abstraction, cross-cutting | 3 agents (implement + spec review + code review) | opus for reviews |

When in doubt, tag up.

---

## Plan Header

Every plan starts with frontmatter + header:

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
**Estimated agent budget:** [sum based on tags]

---
```

**Frontmatter fields:**
- `status`: `active` (on creation) → `completed` (by `/ctx-execute` on success) or `abandoned`
- `branch`: `null` until `/ctx-worktree` links it, then e.g. `feat/my-feature`
- `worktree`: `null` until linked, then absolute path
- `created`: date the plan was written
- `topic`: the filename slug — lowercase, hyphenated, derived from feature name

The `topic` slug is the **filename** (e.g., `download-csv-email-opens.md`). Derive it from the feature name: lowercase, spaces/underscores to hyphens, strip special chars.

The agent budget line makes the cost visible before execution starts.

---

## Granularity Rules

- Each task is **one logical change** (2-10 minutes of work)
- Each task produces a **passing test suite** when complete
- Tasks should be **independently committable** — no task depends on uncommitted work from another
- Include **exact file paths** and **exact commands** with expected output
- Include **code snippets** where the implementation isn't obvious
- Skip code snippets for `[LOW]` tasks where the pattern is just "copy X and change Y"
- **`[HIGH]` tasks require full code in every step** — no placeholders, no "similar to Task N", no "add appropriate error handling". These are plan failures:
  - "TBD", "TODO", "implement later", "fill in details"
  - "Add appropriate error handling" / "add validation" / "handle edge cases"
  - "Write tests for the above" (without actual test code)
  - "Similar to Task N" (repeat the code — the agent may read tasks out of order)
  - Steps that describe what to do without showing how

---

## Self-Review

Before presenting the plan:

- [ ] **Every task has a complexity tag** — no untagged tasks
- [ ] **File paths are exact** — no "somewhere in src/"
- [ ] **TDD steps present** — test before implementation for each task
- [ ] **Commit message per task** — conventional format
- [ ] **No circular dependencies** — tasks can execute top-to-bottom
- [ ] **YAGNI** — no tasks that aren't in the spec
- [ ] **Audit posture stated** — say whether `/ctx-ruthless` is worth the extra pass and why

---

## Skill Files

- `SKILL.md` — this file
- `${CLAUDE_SKILL_DIR}/references/example-plan.md` — canonical plan example with complexity tags and TDD steps

---

## Handoff

After the plan is approved, choose between an independent audit and execution.

Recommend `/ctx-ruthless` before execution when the plan has a `[HIGH]` task, spans three or more independent subsystems, is under a hard time constraint, or the user explicitly asks for a scope audit. It is optional for narrow, all-LOW plans.

```
/ctx-plan → /ctx-ruthless → user approval → /ctx-worktree → /ctx-execute
/ctx-plan → /ctx-worktree → /ctx-execute (narrow delegated plans)
```

Do not invoke `/ctx-brainstorm` or `/ctx-ship` from here. `/ctx-ruthless` audits an existing plan; it does not replace this skill's self-review.

Offer execution choice:

```
Plan saved to ~/.claude/plugins/marketplaces/ctx-plugin/plans/<topic-slug>.md

Agent budget: [N agents total — X×1 for LOW, Y×2 for MED, Z×3 for HIGH]

Audit posture: [/ctx-ruthless recommended because ... | additional audit not warranted because ...]

Two execution options:

1. Subagent-Driven (recommended for plans with HIGH tasks)
   — run /ctx-worktree, then use fresh agents per task via /ctx-execute

2. Inline Execution (for small plans or all-LOW tasks)
   — execute tasks in this session, batch with checkpoints

Which approach?
```

---

## Gotchas

- **Plans that are too granular waste agents.** "Export a constant" and "add the import" should be one task, not two. Group trivially related changes.
- **Plans that are too coarse hide complexity.** If a task touches 4+ files, it's probably `[HIGH]` and should be split.
- **Don't write the plan in the plan.** Code snippets should be implementation, not architecture discussion. The spec covers the "why."
- **Test commands must be exact.** Not "run the tests" — specify `pnpm test:unit tests/path/file.test.ts` or equivalent.
