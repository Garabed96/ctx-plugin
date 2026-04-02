# Worktree Auto-Swap

**Date:** 2026-04-02
**Status:** Draft
**Complexity:** [LOW] post-setup script, [MED] skill rewrite

## Problem

After `/ctx-worktree` creates an isolated worktree, it prints "quit and relaunch
in the worktree" — forcing a manual session break. This is the #1 friction point
in the ctx workflow. Ironic for a tool that automates developer workflows.

## Decision

Replace the manual handoff with `EnterWorktree` — a native Claude Code tool that
swaps the session into a worktree with zero token overhead. Keep the skill as a
thin wrapper that adds env symlinks and dependency install after the swap.

**Why not the osascript/terminal approach (original plan)?** `EnterWorktree` was
discovered after the original plan was written. It handles session swap natively
inside Claude Code — no terminal detection, no osascript, no `{"continue": false}`
JSON protocol. The entire `worktree-swap.sh` script is unnecessary.

**Why keep the skill wrapper?** `EnterWorktree` doesn't handle env symlinks or
dependency install. The skill adds that post-swap, plus provides cleanup docs.

## Design

### Flow

```
User: "/ctx-worktree" or "create a worktree"
  → Skill gathers name (only required input now)
  → Calls EnterWorktree(name: "<name>")
  → Session swaps into .claude/worktrees/<name>
  → Skill runs worktree-post-setup.sh (env symlinks + deps)
  → Ready to work
```

### Script: worktree-post-setup.sh

Extracted from the env-symlink and deps-install sections of `worktree-create.sh`.
Accepts `--source <main-repo-root>` and `--target <worktree-path>`.

Handles:
- Root-level gitignored `.env*` files → symlink to worktree
- Monorepo symlinks that point to root env files → recreate in worktree
- Nested gitignored `.env*` files in subdirectories → symlink to worktree
- Dependency install (pnpm/yarn/npm/pipenv/pip) based on lockfile detection

Does NOT handle (EnterWorktree does these):
- Worktree creation
- Branch creation
- Session CWD swap

### SKILL.md changes

Replace the current 5-section flow with:

1. **Gather inputs** — only `name` is required now (no base branch, no prefix, no skip-deps)
2. **Call EnterWorktree** — `EnterWorktree(name: "<name>")`
3. **Post-setup** — run `worktree-post-setup.sh --source <original-root> --target <worktree-path>`
4. **Present result** — show path, branch, env count, deps status
5. **Cleanup reference** — unchanged

### What we intentionally drop

- Custom parent directory (`$PARENT_DIR/$PROJECT_NAME-$NAME`) → `.claude/worktrees/` is fine
- Branch prefix control (`feat/`, `fix/`) → `EnterWorktree` names branches itself
- Base branch selection → `EnterWorktree` branches from HEAD; `git rebase` if needed
- `worktree-create.sh` is NOT deleted — it still works for manual use outside Claude

### Data flow

```
EnterWorktree(name)
  → creates .claude/worktrees/<name>/ (git worktree)
  → creates branch, switches session CWD
  → clears CWD-dependent caches

worktree-post-setup.sh --source /original/repo --target /new/worktree
  → finds .env* in source (gitignored only)
  → symlinks to target
  → detects lockfile in target
  → runs package manager install
  → prints key=value summary to stdout
```

## Success Criteria

- [ ] `/ctx-worktree` swaps session into worktree without user quitting
- [ ] Env files symlinked in new worktree
- [ ] Deps installed when lockfile present
- [ ] `ctx-execute` worktree guard (`[ -f .git ]`) still passes
- [ ] `ExitWorktree(action: "keep")` returns to original directory
- [ ] `worktree-create.sh` still works independently (no regression)

## Complexity Tags

- [LOW] Extract env+deps logic into `worktree-post-setup.sh`
- [MED] Rewrite `ctx-worktree/SKILL.md` to use `EnterWorktree` + post-setup flow
