---
name: ctx-execute
description: >
  Use when you have a tagged implementation plan from /ctx-plan. Requires an
  isolated worktree or a dedicated feature branch — never the default branch.
user-invocable: true
---

# /ctx-execute — Complexity-Gated Subagent Execution

Execute plans by dispatching fresh subagents per task. The complexity tag on each task determines the agent budget and model selection — no review sandwich for simple work, full review for complex work.

## Process

0. **Isolation gate** — verify we're in a worktree or on a feature branch, never the default branch (see below)
1. **Read the plan from global storage** — find and load the plan (see below)
2. **Verify tags** — every task must have `[LOW]`, `[MED]`, or `[HIGH]`
3. **Execute sequentially** — one task at a time, never parallel implementation
4. **Gate agents by tag** — see budget table below
5. **Mark complete** — check off each task as it passes
6. **Final verification** — run full test suite + type-check after all tasks

---

<HARD-GATE>

## Step 0: Isolation Gate

Before doing anything else, work out where we're executing — a worktree, a feature branch, or the default branch:

```bash
if [ -f .git ]; then
  echo "worktree"
else
  branch=$(git branch --show-current)
  default=$(git symbolic-ref --quiet --short refs/remotes/origin/HEAD 2>/dev/null | sed 's|^origin/||')
  [ -n "$default" ] || default=main
  case "$branch" in
    "$default"|main|master) echo "default branch ($branch)" ;;
    "")                     echo "detached HEAD" ;;
    *)                      echo "feature branch ($branch)" ;;
  esac
fi
```

**If `worktree`:** Proceed to Step 1.

**If `feature branch`:** Proceed to Step 1 and execute in place — do not create a worktree. Tell the user in one line which branch you're executing on, e.g. "Executing in place on `feat/dose-guard` — the branch is the undo button."

**If `default branch` or `detached HEAD`:** STOP. Do not read the plan, do not dispatch agents. Tell the user:

> "You're on `main` in the main checkout. `/ctx-execute` won't commit subagent work here. Two ways forward, your call: create a feature branch and re-invoke `/ctx-execute` to run in place, or run `/ctx-worktree` to get an isolated checkout — it will swap you in automatically."

**Why this is the only hard stop:** Subagents write code and commit. The gate exists so a failed or partial implementation is cheap to throw away. A dedicated feature branch already buys that — revert is `git branch -D`, same as deleting a worktree. Forcing a worktree on top of it adds nothing and costs real things: the session loses continuity, and dev servers, simulators, and editor state stay pointed at the checkout you started in. The one case that isn't cheap to undo is debris committed straight onto the default branch, so that's the case worth stopping for.

</HARD-GATE>

---

## Step 1: Read the Plan

Plans are stored globally at `~/.claude/plugins/marketplaces/ctx-plugin/plans/`.

1. Get current branch: `git branch --show-current`
2. Scan the plans directory for `.md` files. For each, read the YAML frontmatter and check if `branch` matches the current branch.
3. **If found:** Read the full plan content. Extract all tasks with their complexity tags. Proceed to Step 2 (Verify tags).
4. **If not found:** List all plans where `status: active`, show topic + created date, and ask the user to pick one.
5. Pass the **full plan content** to agents — not a summary, not a path. The agent needs every task, every file path, every code snippet.

After all tasks pass final verification (Step 6), update the plan's frontmatter `status` from `active` to `completed`.

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

---

## Skill Files

- `SKILL.md` — this file
- `${CLAUDE_SKILL_DIR}/references/example-dispatch.md` — canonical dispatch examples for LOW/MED tiers
- `${CLAUDE_PLUGIN_ROOT}/agents/implementer.md` — implementer subagent definition
- `${CLAUDE_PLUGIN_ROOT}/agents/reviewer.md` — reviewer subagent definition
