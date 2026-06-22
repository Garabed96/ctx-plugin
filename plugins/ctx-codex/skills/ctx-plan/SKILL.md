---
name: ctx-plan
description: >
  Use when you have a spec or requirements and need an implementation plan before
  writing code.
user-invocable: true
---

# ctx-plan — Implementation Planning

Write plans that a fresh agent with zero codebase knowledge can execute. Tag every task with a complexity level that drives review depth and delegation posture in `ctx-execute`.

## Process

1. **Read the spec** — if coming from `ctx-brainstorm`, the spec may already have complexity tags
2. **Map the file structure** — which files are created or modified and what each is responsible for
3. **Decompose into tasks** — each task produces a self-contained, testable change
4. **Tag each task** — `[LOW]`, `[MED]`, or `[HIGH]`
5. **Write the plan** — save to `~/.codex/ctx-codex/plans/<topic-slug>.md` with frontmatter
6. **Self-review** — apply the checks below, fix inline
7. **Offer execution** — inline vs delegated

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
- [ ] Run any required type-check or lint command
- [ ] Commit: `feat: <what>`

**Context:** [1-2 sentences — what this task does and how it fits into the whole]
````

---

## Complexity Tags

Classify each task based on change breadth and review risk:

| Tag | Signals | Default execution | Review posture |
|-----|---------|-------------------|----------------|
| `[LOW]` | 1 file, copy existing pattern, no new logic | Inline by default | Local review only |
| `[MED]` | 2-3 files, adapted pattern, conditional logic | Inline or delegated | Local review, optionally one fresh-context review |
| `[HIGH]` | 4+ files, new abstraction, cross-cutting | Inline or delegated on current branch; new worktree only by request | Fresh-context review expected |

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
**Execution posture:** [inline only | mixed | delegated]

---
```

**Frontmatter fields:**
- `status`: `active` on creation, then `completed` or `abandoned`
- `branch`: `null` until execution starts, then the current feature branch or explicitly requested worktree branch
- `worktree`: `null` until execution starts, then the current checkout/worktree absolute path
- `created`: date the plan was written
- `topic`: the filename slug — lowercase, hyphenated, derived from feature name

The `topic` slug is also the filename. Derive it from the feature name: lowercase, spaces or underscores to hyphens, strip special characters.

---

## Granularity Rules

- Each task is **one logical change** that can usually be completed in 5-20 minutes
- Each task produces a **passing targeted test command** when complete
- Tasks should be **independently committable**
- Include **exact file paths** and **exact commands** with expected output
- Include **acceptance criteria** for any non-obvious behavior
- Include **code snippets only where ambiguity is real**
- For `[HIGH]` tasks, include enough detail that a fresh implementer can act without inventing behavior. That means exact files, exact commands, edge cases, and any required interface shapes. It does **not** mean pasting full production code into the plan.

Plan failures:
- `TBD`, `TODO`, or placeholders that hide unresolved scope
- "Add validation" / "handle errors" without saying which cases matter
- "Write tests for the above" without naming the test file and assertion target
- "Similar to Task N" when the later task depends on hidden context
- Commands like "run the tests" without the exact command

---

## Self-Review

Before presenting the plan:

- [ ] **Every task has a complexity tag**
- [ ] **File paths are exact**
- [ ] **TDD steps are present where appropriate**
- [ ] **Commands are exact**
- [ ] **No circular dependencies**
- [ ] **No tasks outside the approved spec**

---

## Skill Files

- `SKILL.md` — this file
- `./references/example-plan.md` — canonical plan example

---

## Handoff

After the plan is approved, offer the user two paths:

```text
1. Inline execution
   Stay in the current session and implement directly.
   Best for all-LOW plans and many small MED plans.

2. Delegated execution on the current branch
   Run ctx-execute without creating another worktree.
   Best for HIGH tasks or when the user explicitly wants subagents.

3. New isolated worktree
   Use ctx-worktree only when the user explicitly wants parallel work or a disposable branch.
```

The default route is:

```text
ctx-plan -> ctx-execute on current branch
```

Do not force `ctx-worktree` between planning and execution. Existing feature branches and open PR branches are valid execution targets.

---

## Gotchas

- **Plans that are too granular waste time.** "Export a constant" and "add the import" should usually be one task.
- **Plans that are too coarse hide risk.** If a task touches 4+ files, it is probably `[HIGH]` or needs to be split.
- **Don't write architecture essays in the plan.** The spec covers the why.
- **Commands must be exact.** Not "run the tests" — specify the real command.
- **Do not split active PRs by accident.** If the user gives you a branch name or PR URL, that branch is the execution target unless they explicitly ask for a new worktree.
