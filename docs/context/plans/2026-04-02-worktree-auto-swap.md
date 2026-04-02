# Worktree Auto-Swap Implementation Plan

**Goal:** Replace the manual "quit and relaunch" worktree handoff with `EnterWorktree` native tool, keeping env symlinks + deps as a post-swap step.
**Architecture:** Thin skill wrapper calls `EnterWorktree` for session swap, then runs `worktree-post-setup.sh` for env symlinks and dependency install. Verbose stderr logging throughout.
**Tech Stack:** Bash, Claude Code native tools (`EnterWorktree`/`ExitWorktree`)
**Total tasks:** 2 ([1 LOW] [1 MED])
**Estimated agent budget:** 3 (1×1 for LOW, 1×2 for MED)

---

### Task 1: Extract env+deps into `worktree-post-setup.sh` `[LOW]`

**Files:**
- Create: `plugins/ctx/scripts/worktree-post-setup.sh`
- Modify: `plugins/ctx/scripts/test-scripts.sh` (add test section)

**Steps:**
- [ ] Create `worktree-post-setup.sh` extracted from `worktree-create.sh` lines 69-134
  - Accepts args: `--source <main-repo-root>` `--target <worktree-path>` `[--skip-deps]`
  - Exit codes: 0 = success, 1 = bad args, 3 = deps failed (worktree still usable)
  - **Logging:** every decision logged to stderr with `[post-setup]` prefix:
    - `[post-setup] source=/path/to/repo target=/path/to/worktree`
    - `[post-setup] checking root .env files...`
    - `[post-setup] found .env.local — gitignored=yes, symlink=no → symlinking`
    - `[post-setup] found .env.example — gitignored=no → skipping (tracked)`
    - `[post-setup] found .env.local — already exists in target → skipping`
    - `[post-setup] checking monorepo symlinks...`
    - `[post-setup] found packages/api/.env → symlink to ../../.env.local → recreating`
    - `[post-setup] checking nested env files...`
    - `[post-setup] found src/app/.env — gitignored=yes → symlinking`
    - `[post-setup] symlinked 3 env file(s)`
    - `[post-setup] detecting package manager...`
    - `[post-setup] found pnpm-lock.yaml → running pnpm install`
    - `[post-setup] deps: ok` / `[post-setup] deps: failed (exit code 1)` / `[post-setup] deps: none (no lockfile)`
  - Structured stdout output (same as worktree-create.sh pattern):
    ```
    env_count=3
    deps=ok
    ```
- [ ] `chmod +x worktree-post-setup.sh`
- [ ] Add test section to `test-scripts.sh`:
  - Create test repo with `.env.local` (gitignored), `.env.example` (tracked), nested `src/.env` (gitignored)
  - Run `worktree-post-setup.sh --source <repo> --target <worktree> --skip-deps`
  - Assert: `env_count=2` (gitignored files only), symlinks exist, tracked file not symlinked
  - Run with missing `--source` → assert exit 1
- [ ] Run: `bash plugins/ctx/scripts/test-scripts.sh` — expect all tests PASS
- [ ] Commit: `feat: add worktree-post-setup.sh for env symlinks and deps`

**Context:** This is a pure extraction from `worktree-create.sh` with added verbose logging. The logging is the main new value — the current script is silent about *why* it skips files, making debugging impossible.

---

### Task 2: Rewrite `ctx-worktree/SKILL.md` to use `EnterWorktree` + post-setup `[MED]`

**Files:**
- Modify: `plugins/ctx/skills/ctx-worktree/SKILL.md`

**Steps:**
- [ ] Rewrite SKILL.md with the following sections:

**Section 1: Gather inputs**
- Only `name` is required (short identifier like `fix-email-bug`)
- No base branch, no prefix, no skip-deps — `EnterWorktree` handles worktree/branch creation
- If user didn't provide a name, ask for one

**Section 2: Capture source root**
- Before calling `EnterWorktree`, capture the current repo root: `git rev-parse --show-toplevel`
- Store this — it's needed for the post-setup script's `--source` arg
- Log: the skill should note this in its output so the user sees it

**Section 3: Call EnterWorktree**
- `EnterWorktree(name: "<name>")`
- Session CWD swaps to the new worktree
- If the tool errors (already in a worktree, not a git repo), report and stop

**Section 4: Post-setup**
- Run: `bash <base-directory>/../../scripts/worktree-post-setup.sh --source <source-root> --target $(pwd)`
- Parse stdout for `env_count` and `deps` values
- If exit 3 (deps failed), note worktree is still usable

**Section 5: Present result**
```
Worktree ready:
  Path:   <pwd>
  Branch: <git branch --show-current>
  .env:   <env_count> file(s) symlinked
  Deps:   <deps status>

You're now working in the worktree. Use ExitWorktree when done.
```

**Section 6: Cleanup reference** (keep unchanged from current)
- `ExitWorktree(action: "keep")` or `ExitWorktree(action: "remove")`
- `git worktree list` to see all active worktrees

**Section 7: Gotchas**
- Update: remove "claude --continue doesn't work across directories" (no longer relevant — session stays live)
- Add: "If you need a specific base branch, `git rebase <base>` after entering the worktree"
- Add: "EnterWorktree branches from HEAD — ensure you're on the right branch before invoking"

- [ ] Verify the skill's `allowed-tools` frontmatter includes `EnterWorktree` and `ExitWorktree`
- [ ] Read the rewritten SKILL.md end-to-end — verify flow is coherent and no references to old `worktree-create.sh` flow remain (except cleanup docs mentioning it still exists for manual use)
- [ ] Commit: `feat: ctx-worktree uses EnterWorktree for native session swap`

**Context:** This is the core behavior change. The skill goes from "create worktree + tell user to quit" to "swap session into worktree + run post-setup." The `EnterWorktree` tool does the heavy lifting; the skill adds env/deps and user-facing presentation.

---

## Open questions (resolve during Task 2)

1. **`allowed-tools` in frontmatter** — does `EnterWorktree` need to be listed in the skill's `allowed-tools`? If the skill can only use tools listed there, we need to add it. If unlisted tools are still callable, skip it.
2. **Source root after swap** — after `EnterWorktree` swaps CWD, can we still reference the original repo root from the captured variable, or does the session state reset? Task 2 step 2 captures it pre-swap as a safeguard.
