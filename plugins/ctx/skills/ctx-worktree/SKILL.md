---
name: ctx-worktree
description: >
  Use when the user wants to work on something in parallel — creates an isolated git
  worktree with env symlinks and dependency install so it's immediately runnable.
  Triggers: "worktree", "new worktree", "isolated branch", "parallel branch".
allowed-tools: Bash, Read, Glob, Write, EnterWorktree, ExitWorktree
user-invocable: true
---

# /worktree — Create an Isolated Git Worktree

Uses Claude Code's native `EnterWorktree` tool for session swap, then runs `worktree-post-setup.sh` for env symlinks and dependency install. Parks conversation context into the new worktree so `/ctx-grab` can restore it.

## 1. Gather inputs

Ask the user if not already provided:

- **Name**: short identifier (e.g., `fix-email-bug`, `new-search-ui`)

That's it. `EnterWorktree` handles branch creation and worktree setup internally.

## 2. Capture source root and park context

Before swapping, two things must happen:

**a) Capture source root** — needed for the post-setup script:

```bash
SOURCE_ROOT=$(git rev-parse --show-toplevel)
```

**b) Distill conversation context** — from the current conversation, extract:

- What the user is trying to accomplish (the task/goal)
- Key decisions made and their rationale
- Approaches tried or ruled out
- Relevant file paths, specs, or plans discussed
- What should happen next in the worktree

Store this as a string — it will be written to the worktree after the swap.

## 3. Call EnterWorktree

```
EnterWorktree(name: "<name>")
```

This:
- Creates a worktree under `.claude/worktrees/<name>/`
- Creates a new branch based on HEAD
- Switches the session's working directory to the worktree
- Clears CWD-dependent caches

If the tool errors (already in a worktree, not a git repo), report the error and stop.

## 4. Write handoff into worktree

Write the distilled context to `.claude/ctx-park.md` in the new worktree so `/ctx-grab` can find it:

```bash
mkdir -p .claude
```

Then use the Write tool to create `.claude/ctx-park.md`:

```markdown
# Context Park — {worktree-name}

**Parked:** {timestamp}
**Branch:** {branch from git branch --show-current}
**Session:** {One sentence — what this session is for}

## Smart Context

{Numbered list from step 2b — decisions, rationale, key files}

## Next Steps

{What to do first in this worktree}
```

This means if the session ends or context gets large, `/ctx-grab` can restore it.

## 5. Post-setup

Run the post-setup script to symlink env files and install dependencies:

```bash
bash <base-directory>/../../scripts/worktree-post-setup.sh \
  --source "$SOURCE_ROOT" --target "$(pwd)"
```

The script is at `../../scripts/worktree-post-setup.sh` relative to this skill's base directory (shown in the skill loading message). Resolve the full path before running.

Parse the stdout values (`env_count`, `deps`). The script logs detailed progress to stderr with `[post-setup]` prefix — this is visible in the Bash tool output.

If the script exits with code 3 (deps failed), note the worktree is still usable — deps can be installed manually.

## 6. Present result

```
Worktree ready:
  Path:   <pwd>
  Branch: <git branch --show-current>
  .env:   <env_count> file(s) symlinked
  Deps:   <deps status>
  Context: parked to .claude/ctx-park.md

You're now working in the worktree. Use ExitWorktree when done.
```

## 7. Cleanup reference

When the user asks about leaving or removing worktrees:

- **Keep worktree, return to original dir:** `ExitWorktree(action: "keep")`
- **Remove worktree and branch:** `ExitWorktree(action: "remove")`
- **List all worktrees:** `git worktree list`

The old `worktree-create.sh` script still exists for manual worktree creation outside Claude.

## Gotchas

- `EnterWorktree` branches from HEAD. If the user needs a specific base branch, they should checkout that branch first or `git rebase <base>` after entering the worktree.
- On session exit while still in a worktree, Claude Code prompts the user to keep or remove it.
- The post-setup script creates missing directories for nested env files (e.g., `src/app/` may not exist in the worktree if its only content was gitignored).
- The handoff written in step 4 is a snapshot of conversation context at worktree creation time. If the session continues with significant new context, `/ctx-park` should be run again before ending the session.
