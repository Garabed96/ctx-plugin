---
name: ctx-resume
description: >
  Use when resuming work after a crash, session close, or context loss.
  Lists active plans from global storage and locates the correct worktree.
  Triggers: "resume", "pick up where I left off", "what was I working on".
user-invocable: true
allowed-tools: Bash, Read, Glob
---

# ctx-resume — Resume Active Work

List active plans from global storage and identify the right worktree.

## Process

1. **Scan plans** — read all `.md` files in `~/.codex/ctx-codex/plans/`
2. **Filter active** — parse YAML frontmatter, keep only `status: active`
3. **Present list** — show numbered options:

```
Active plans:

1. download-csv-email-opens (created: 2026-04-03, branch: feat/download-csv-email-opens)
2. bug-history-ledger (created: 2026-04-03, branch: feat/bug-history-ledger)
3. global-plan-storage (created: 2026-04-03, branch: null — no worktree yet)

Which plan? (number)
```

4. **User picks** — wait for selection
5. **Resolve** — based on the plan's state:

| Plan state | Action |
|------------|--------|
| `worktree` path exists on disk | Report the worktree path and branch |
| `worktree` gone but `branch` exists in git | Recreate the worktree from the branch via `worktree-create.sh` |
| Neither (branch is null) | Offer to create a new worktree: ask for name, run `worktree-create.sh`, and link the plan |

6. **Confirm** —

```
Resuming: <topic>
  Worktree: <path>
  Branch:   <branch>
  Plan:     ~/.codex/ctx-codex/plans/<topic>.md

Continue from the worktree path and run ctx-execute.
```

## Edge Cases

- **No active plans:** "No active plans found. Nothing to resume."
- **Plan has branch but worktree was deleted:** Recreate silently from the branch — the code is still there.
- **Plan has no branch:** This plan was written but never executed. Offer to create a worktree and link it.
