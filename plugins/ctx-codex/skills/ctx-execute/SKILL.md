---
name: ctx-execute
description: >
  Use when you have a tagged implementation plan from ctx-plan and the user wants
  to execute it. Continue on the current branch/worktree by default; create a new
  worktree only when the user explicitly asks for isolation or parallel work.
user-invocable: true
---

# ctx-execute — Complexity-Gated Delegated Execution

Execute a plan task-by-task on the intended current branch/worktree. Use task complexity to decide how much fresh context to buy, but stay pragmatic: simple tasks do not deserve orchestration theater.

## Process

0. **Execution location gate** — verify the current branch/worktree is the intended place to continue
1. **Delegation gate** — verify whether the user wants inline or delegated execution
2. **Read the plan** — load the active plan for the current branch, or link an unlinked plan to the current branch
3. **Verify tags** — every task must have `[LOW]`, `[MED]`, or `[HIGH]`
4. **Execute sequentially** — one task at a time
5. **Choose review depth by tag** — see table below
6. **Mark complete** — check off each task as it passes
7. **Final verification** — run the plan's required tests plus any project-wide checks that are warranted

---

<HARD-GATE>

## Step 0: Execution Location Gate

Before doing anything else, identify the current repo location:

```bash
pwd
git branch --show-current
git worktree list
```

Use the current checkout as the default execution location. Do **not** create or switch to a new worktree just because a plan exists.

Proceed when any of these are true:

- The current branch matches the plan frontmatter `branch`.
- The user explicitly told you to continue on the current branch or PR.
- The plan frontmatter has `branch: null` and the current branch is a non-base feature branch; link the plan to this current branch/worktree instead of creating another one.

Stop and ask before proceeding when:

- The current branch is `main`, `master`, or another protected base branch and the user has not explicitly asked to edit it.
- The plan frontmatter names a different branch that currently exists in another worktree.
- There is already an open PR branch for this work and you are not on it.

Tell the user exactly which branch/worktree you are on and which branch/worktree the plan or PR points to. Ask whether to switch/link instead of inventing a new worktree.

Only run `ctx-worktree` when the user explicitly asks for a new isolated branch, parallel branch, or disposable worktree. Existing PR branches should be continued in-place.

</HARD-GATE>

---

## Step 1: Delegation Gate

This skill can execute inline or with bounded delegation.

- If the user explicitly chose delegated or subagent-driven execution in `ctx-plan`, use the delegation rules below.
- If the user did not choose delegation, execute inline in the current session and use fresh-context help only for review or bounded exploration when it is clearly useful.

Do not silently spawn agents just because a plan exists. In Codex, delegation is an explicit user choice.

---

## Step 2: Read the Plan

Plans live at `~/.codex/ctx-codex/plans/`.

1. Get the current branch: `git branch --show-current`
2. Scan the plans directory for `.md` files
3. Read YAML frontmatter and prefer the active plan whose `branch` matches the current branch
4. If no branch match exists, look for exactly one active plan with `branch: null`; ask before linking it to the current branch/worktree
5. If active plans point to other branches/worktrees, list them and ask which existing branch to continue. Do not create a new worktree as a fallback
6. If found, read the full plan and extract its tasks

After all tasks pass final verification, update the plan frontmatter from `status: active` to `status: completed`.

---

## Complexity Table

| Tag | Default action in `ctx-execute` | Fresh-context help |
|-----|----------------------------------|--------------------|
| `[LOW]` | Implement inline in the current session | None by default |
| `[MED]` | Implement inline or use one worker if isolation helps | Optional local review or one explorer pass |
| `[HIGH]` | Prefer one worker plus one reviewer pass | Fresh-context review expected |

**Important:** complexity controls review depth, not mandatory agent count. If a `[HIGH]` task becomes simple in practice, scale down. If a `[LOW]` task grows teeth, re-classify up.

---

## Delegation Rules

When you do delegate, use Codex-native agents:

- Use `spawn_agent` with `agent_type: "worker"` for bounded implementation
- Use `spawn_agent` with `agent_type: "explorer"` for focused review or spec-compliance questions
- Prefer `gpt-5.4-mini` for bounded workers
- Prefer inherited default model or `gpt-5.4` for difficult review or integration questions

When dispatching a worker:

1. Include the **full task text**
2. Include **scene-setting context** from prior completed tasks
3. Name the **exact files** the worker owns
4. Tell the worker it is **not alone in the codebase** and must not revert unrelated edits
5. Require one of these statuses on return: `DONE`, `DONE_WITH_CONCERNS`, `NEEDS_CONTEXT`, `BLOCKED`

Do not dispatch two implementers at once for sequential plan tasks.

---

## Per-Task Execution

### `[LOW]`

Default: implement directly in the current session.

Only delegate a `[LOW]` task if the user explicitly asked to delegate every task or there is a clear isolation benefit.

### `[MED]`

Pick the lighter path that preserves clarity:

- Inline implementation plus local review is usually enough
- Use one worker when the task is bounded but context-heavy
- Add one explorer review pass if the change has meaningful regression risk

### `[HIGH]`

Prefer the delegated path:

1. Worker implements the task
2. Explorer or local review checks spec compliance and major risks
3. Integrate any fixes
4. Run targeted verification before moving on

If the task touches multiple subsystems and keeps expanding, stop and surface the plan gap instead of grinding forward.

---

## Re-Classification Mid-Flight

If a task is harder than expected:

- `[LOW]` -> `[MED]`: add review depth or one worker
- `[MED]` -> `[HIGH]`: add fresh-context review and consider splitting the task

If a `[HIGH]` task turns out smaller than expected, reduce ceremony. Complexity tags are estimates, not contracts.

---

## Implementer Status Handling

The implementer or delegated worker reports one of:

| Status | Action |
|--------|--------|
| `DONE` | Verify and move to the next task |
| `DONE_WITH_CONCERNS` | Read the concern and decide whether it is a correctness issue, scope issue, or advisory note |
| `NEEDS_CONTEXT` | Provide the missing context and retry |
| `BLOCKED` | Resolve the blocker, re-classify the task, or stop and surface the plan gap |

Never ignore a blocker report.

---

## Final Verification

After all tasks complete:

1. Run the exact task-level test commands required by the plan
2. Run any broader project checks that the plan or repository conventions require
3. If verification fails, fix the failure before marking the plan complete

If final verification fails twice for the same underlying reason, stop and surface the failure instead of looping.

---

## When to Stop

Stop immediately when:

- A task is blocked and you cannot unblock it with local context
- The plan contradicts the codebase
- Verification keeps failing and the failure suggests the plan is wrong
- Implementation reveals scope that is not covered by the plan

When you stop, tell the user what happened and whether the next step is to update the plan, re-brainstorm, or investigate.

---

## Gotchas

- **Do not spawn by reflex.** Delegation has coordination cost.
- **Do not over-review `[LOW]` tasks.** You are just rebuilding ceremony.
- **Do not under-review `[HIGH]` tasks.** That is where the blind spots hide.
- **Sequential tasks stay sequential.** One worker at a time for implementation unless the plan explicitly splits ownership into disjoint files.
- **Context quality matters more than model swapping.** A well-briefed worker beats a vague prompt sent to a bigger model.
- **Do not split active PRs by accident.** If the user gives you a branch name or PR URL, that branch is the execution target unless they explicitly ask for a new worktree.

---

## Skill Files

- `SKILL.md` — this file
- `./references/example-dispatch.md` — Codex-native dispatch examples
