---
name: ctx-worktree
description: >
  Use when the user wants to work on something in parallel — creates an isolated git
  worktree with env symlinks and dependency install so it's immediately runnable.
  Triggers: "worktree", "new worktree", "isolated branch", "parallel branch".
allowed-tools: Bash, Read, Glob, Write
user-invocable: true
---

# /worktree — Create an Isolated Git Worktree

Creates a durable worktree via `${CLAUDE_PLUGIN_ROOT}/scripts/worktree-create.sh`, parks conversation context into it, then opens a new iTerm2 tab with claude. The new session can `/ctx-grab` to restore context instantly.

## 1. Gather inputs

Ask the user if not already provided:

- **Name**: short identifier (e.g., `fix-email-bug`, `new-search-ui`)
- **Base branch**: default `main`
- **Branch prefix**: `feat/`, `fix/`, `hotfix/`, or `--no-prefix`. Default: `feat/`
- **Skip deps?** If they say they won't need a dev server, add `--skip-deps`

## 2. Create worktree

The script is at `${CLAUDE_PLUGIN_ROOT}/scripts/worktree-create.sh`. Run:

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/worktree-create.sh \
  --name <name> --base <base> --prefix <prefix>
```

Parse the `key=value` stdout output. On failure (exit 2 or 3), report and stop.

## 3. Park context

Distill the current conversation into a handoff for the new session. This is a judgment call — include only what the next session needs to hit the ground running.

**Include:**
- The task/goal (one sentence)
- Key decisions and their rationale (only non-obvious ones)
- Approaches tried or ruled out and why
- Paths to relevant plans or specs (e.g. `docs/ctx/plans/...`)
- What should happen first in the worktree

**Exclude:**
- Session noise (tool issues, tangential discussions, plugin fixes)
- Info already in committed docs, plans, or specs (just reference the path)
- General project knowledge derivable from the codebase

5 items max. If you can say it in 3, say it in 3.

Write to `<worktree-path>/docs/ctx/park.md`:

```bash
mkdir -p <worktree-path>/docs/ctx
```

Then use the Write tool:

```markdown
# Context Park — {name}

**Parked:** {ISO timestamp}
**Branch:** {branch from script output}
**Session:** {One sentence — what this worktree is for}

## Smart Context

{Numbered list — decisions, rationale, key file paths}

## Next Steps

{Ordered — what the next session should do first}
```

## 4. Open iTerm2 tab

After the park file is written, open a new tab and launch claude:

```bash
osascript -e "
  tell application \"iTerm2\"
    set newWindow to (create window with default profile)
    tell current session of newWindow
      write text \"cd '<worktree-path>' && claude\"
    end tell
  end tell
" 2>/dev/null || true
```

## 5. Present result

```
Worktree ready:
  Path:   <path>
  Branch: <branch>
  Base:   <base>
  .env:   <env_count> file(s) symlinked
  Deps:   <deps status>
  Context: parked to docs/ctx/park.md

New iTerm2 tab opening. Run /ctx-grab in the new session to restore context.
```

## 6. Cleanup reference

When the user asks about removing worktrees:

```bash
git worktree remove <path>        # clean removal
git worktree remove --force <path> # if changes were discarded
git branch -d <branch-name>       # delete branch if no longer needed
git worktree list                  # see all active worktrees
```
