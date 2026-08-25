---
name: ctx-worktree
description: >
  Use when the user wants to work on something in parallel or when delegated
  execution needs an isolated branch. Creates a git worktree with env copies and
  optional dependency install so it is runnable.
  Triggers: "worktree", "new worktree", "isolated branch", "parallel branch".
allowed-tools: Bash, Read, Glob, Write
user-invocable: true
---

# ctx-worktree — Create an Isolated Git Worktree

Creates a durable worktree via `../../scripts/worktree-create.sh`, links any active plan to the new branch, and parks context into it.

Use this before `ctx-execute`. The delegated route is:

```text
ctx-plan -> ctx-worktree -> ctx-execute
```

## 1. Gather inputs

Ask the user if not already provided:

- **Name**: short identifier (for example `fix-email-bug`, `new-search-ui`)
- **Base branch**: default `main`
- **Branch prefix**: `feat/`, `fix/`, `hotfix/`, or `--no-prefix`. Default: `feat/`
- **Skip deps?** If they do not need a dev server right away, add `--skip-deps`

## 2. Create worktree

The script is at `../../scripts/worktree-create.sh`. Run:

```bash
bash ../../scripts/worktree-create.sh \
  --name <name> --base <base> --prefix <prefix>
```

Parse the `key=value` stdout output. On failure, report and stop.

Codex note: `git fetch` and dependency install may require approval in some environments. Treat those as normal permissioned steps, not hidden plumbing.

## 3. Link plan

After worktree creation, check if there is an active plan to link to this branch:

1. Scan `~/.codex/ctx-codex/plans/` for `.md` files
2. Read frontmatter and look for `status: active` and `branch: null`
3. **If exactly one** unlinked plan exists, update its `branch` and `worktree`
4. **If multiple** unlinked plans exist, ask the user which one this worktree is for
5. **If zero** exist, do nothing

This link matters because `ctx-execute` resolves the plan by current branch.

## 4. Park context

Distill the current conversation into a handoff for the new session.

Include:
- The task or goal
- Key decisions and why they matter
- Approaches tried or ruled out
- Paths to the relevant plan or spec
- What should happen first in the worktree

Exclude:
- Session noise
- Information already captured in committed docs
- General project knowledge that can be re-derived cheaply

5 items max.

Write to `<worktree-path>/docs/ctx/park.md`:

```markdown
# Context Park — {name}

**Parked:** {ISO timestamp}
**Branch:** {branch}
**Session:** {one-sentence goal}

## Smart Context

{Numbered list — decisions, rationale, key file paths}

## Next Steps

{Ordered list — what the next session should do first}
```

## 5. Present result

```text
Worktree ready:
  Path:   <path>
  Branch: <branch>
  Base:   <base>
  .env:   <env_count> file(s) copied
  Deps:   <deps status>
  Context: parked to docs/ctx/park.md

Next: run ctx-execute in the worktree if the user chose delegated execution.
```

## 6. Cleanup reference

When the user asks about removing worktrees:

```bash
git worktree remove <path>
git worktree remove --force <path>
git branch -d <branch-name>
git worktree list
```
