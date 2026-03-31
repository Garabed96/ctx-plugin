---
name: context-execute
description: >
  Use when you have a tagged implementation plan from /context-plan. Requires
  an isolated worktree.
user-invocable: true
---

# /context-execute — Complexity-Gated Subagent Execution

Execute plans by dispatching fresh subagents per task. The complexity tag on each task determines the agent budget and model selection — no review sandwich for simple work, full review for complex work.

## Skill Files

- `SKILL.md` — this file
- `references/example-dispatch.md` — canonical dispatch examples for LOW/MED tiers
- `../../agents/implementer.md` — implementer subagent definition
- `../../agents/reviewer.md` — reviewer subagent definition

---

## Process

0. **Worktree gate** — verify we're in an isolated worktree (see below)
1. **Read the plan** — extract all tasks with full text, note complexity tags
2. **Verify tags** — every task must have `[LOW]`, `[MED]`, or `[HIGH]`
3. **Execute sequentially** — one task at a time, never parallel implementation
4. **Gate agents by tag** — see budget table below
5. **Mark complete** — check off each task as it passes
6. **Final verification** — run full test suite + type-check after all tasks

---

<HARD-GATE>

## Step 0: Worktree Gate

Before doing anything else, check if we're running inside a git worktree:

```bash
[ -f .git ] && echo "worktree" || echo "main checkout"
```

**If `worktree`:** Proceed to Step 1.

**If `main checkout`:** STOP. Do not read the plan, do not dispatch agents. Tell the user:

> "You're on the main checkout. `/context-execute` requires an isolated worktree so implementation doesn't touch your main working directory. Run `/context-worktree` first, then relaunch Claude from the worktree and re-invoke `/context-execute`."

**Why this is a hard gate:** Subagents write code and commit. If they do that on the main checkout, a failed or partial implementation leaves debris on `main` that's harder to clean up than deleting a worktree branch. The worktree is the undo button.

</HARD-GATE>

---

## Agent Budget Per Task

| Tag | Agents | Flow | Model |
|-----|--------|------|-------|
| `[LOW]` | 1 | Implement → commit | sonnet (default) |
| `[MED]` | 2 | Implement → code review → fix if needed → commit | sonnet |
| `[HIGH]` | 3 | Implement → spec review → code review → fix if needed → commit | opus for reviews |

**The budget is a ceiling, not a floor.** If the implementer reports DONE with no concerns on a `[MED]` task and the diff is clean, you can skip the review. Use judgment.

---

## Per-Task Execution

### For `[LOW]` tasks

Dispatch implementer with the task text and context. When it reports DONE, verify the commit landed and move on. No review.

```
You → Implementer: "Here's the task, here's the context, implement and commit."
Implementer → You: "DONE. Committed abc123."
You → Next task.
```

### For `[MED]` tasks

Dispatch implementer, then one review pass.

```
You → Implementer: "Implement and commit."
Implementer → You: "DONE."
You → Reviewer: "Review the diff since <base-sha>."
Reviewer → You: "Approved" or "Issues: [...]"
If issues → Implementer fixes → move on.
```

### For `[HIGH]` tasks

Full review sandwich — spec compliance first, then code quality. Use opus for the review agents.

```
You → Implementer: "Implement and commit."
Implementer → You: "DONE."
You → Reviewer (spec mode, opus): "Does this match the spec?"
You → Reviewer (quality mode, opus): "Is this well-built?"
If issues → Implementer fixes → re-review.
```

---

## Re-Classification Mid-Flight

If a task tagged `[LOW]` turns out to be harder than expected (implementer reports BLOCKED or DONE_WITH_CONCERNS), **re-classify up**:

- `[LOW]` → `[MED]`: add a review pass
- `[MED]` → `[HIGH]`: add spec review, consider opus

If a `[HIGH]` task turns out trivial (implementer finishes in one clean commit), you can skip the second review. **Tag drift is expected.** The plan's tags are estimates, not contracts.

---

## Implementer Status Handling

The implementer reports one of four statuses:

| Status | Action |
|--------|--------|
| **DONE** | Proceed to review (or next task if `[LOW]`) |
| **DONE_WITH_CONCERNS** | Read concerns. If correctness/scope → address before review. If observations → note and proceed. |
| **NEEDS_CONTEXT** | Provide missing context, re-dispatch same agent |
| **BLOCKED** | Assess: context problem → provide more; task too hard → re-classify up; plan wrong → escalate to user |

Never ignore an escalation. If the implementer says it's stuck, something needs to change.

---

## Dispatching Subagents

When dispatching, provide:

1. **Full task text** from the plan (don't make the agent read the plan file)
2. **Scene-setting context** — what was done in previous tasks, what files exist
3. **Relevant file contents** — if the task modifies an existing file, include it or tell the agent where to read it
4. **The spec section** for `[HIGH]` tasks — so the reviewer can check compliance

Use the `model` parameter on the Agent tool:
- `model: "sonnet"` for `[LOW]` and `[MED]` implementers
- `model: "opus"` for `[HIGH]` reviewers

---

## Final Verification

After all tasks complete:

```bash
# Run the project's test + type-check commands
# (discover from package.json, Makefile, or ask the user)
```

If final verification fails, dispatch a fix agent targeting the specific failure.

---

## When to Stop

STOP executing immediately when:

- **Blocker**: implementer reports BLOCKED and you can't resolve with context alone
- **Plan gaps**: a task references something that doesn't exist or contradicts another task
- **Repeated verification failure**: final verification fails after 2 fix attempts
- **Scope discovery**: implementation reveals work not covered by the plan

When you stop, tell the user what happened and suggest the appropriate next step (update the plan, re-brainstorm, or investigate).

---

## Gotchas

- **Don't over-review `[LOW]` tasks.** The whole point of tagging is to skip ceremony for simple work. If you review every task, you've rebuilt superpowers.
- **Don't under-review `[HIGH]` tasks.** Cross-cutting changes are where bugs hide. The opus reviewer earns its tokens here.
- **Context for the implementer matters more than review.** A well-briefed implementer with clear task text produces fewer issues than a poorly-briefed one with three reviewers.
- **Sequential, not parallel.** Never dispatch two implementers at once — they'll conflict on shared files.
- **Re-classification is cheap.** Upgrading a tag costs one extra agent. Shipping a bug from a mis-tagged `[LOW]` costs a debugging session.
