# ctx-plugin

A Claude Code plugin built on **context economy** — deterministic operations run as shell scripts at CPU speed, skills handle judgment only.

20 skills, 11 scripts, 3 agents, and 7 hooks covering the full development lifecycle: brainstorm, plan, execute, ship, debug, test, verify, QA.

## Why this exists

Every token in a prompt either increases or decreases the probability of the desired output. Most AI-assisted tooling burns tokens having the LLM interpret bash steps it could skip entirely. ctx-plugin separates **what needs judgment** from **what needs execution**:

- **Scripts** handle deterministic operations — git worktrees, artifact scanning, PR creation. Args in, structured output out. Zero LLM tokens for mechanical work.
- **Skills** handle judgment — when to create a worktree, what context to preserve, which risk signals matter. Thin wrappers that call scripts and interpret results.

This **skill-script symbiosis** reduces tool calls by 87% and wall-clock time by 65% compared to markdown-only skill approaches.

**Lineage:** Inspired by the discipline patterns in [superpowers](https://github.com/obra/superpowers) (verification gates, rationalization tables, hard gates). Restructured for token economy and extended with original systems: session continuity, QA testing, critical thinking coaching, prompt calibration, complexity gating, and the shell-native execution model.

## Important: Setup Notes

**Platform:** macOS. Terminal support: tmux, iTerm2, Terminal.app. Core skills and scripts are POSIX-compatible. Windows is untested.

**Path detection:** Cross-repo edit blocking auto-detects sibling projects from your git repo's parent directory — no hardcoded paths.

## Install

```sh
/plugin marketplace add Garabed96/ctx-plugin
/plugin install ctx@ctx-plugin
```

## Getting Started

The core loop is: **brainstorm → plan → worktree → execute → ship**

```
/ctx-brainstorm          # Explore the problem, surface blind spots
/ctx-plan                # Produce a tagged implementation plan
/ctx-worktree            # Create an isolated git worktree for the work
/ctx-execute             # Dispatch subagents per plan task
/ctx-ship                # Preflight → verify → PR (gated at each phase)
```

**Minimal workflow** (skip brainstorm/plan for small fixes):

```
/ctx-worktree            # Isolate the work
# ... make changes ...
/ctx-verify              # Evidence before claims
/ctx-ship                # Create PR
```

**Session continuity** — when you need to stop and resume later:

```
/ctx-park                # Save context handoff for next session
# ... close session, reopen later ...
/ctx-grab                # Restore context from park file
```

**Debugging:**

```
/ctx-debug               # Systematic root cause investigation (blocks premature fixes)
/ctx-tdd                 # Red-Green-Refactor with enforcement
```

## Scripts

Shell scripts that handle deterministic operations. Each follows the same contract: args in, progress to stderr, structured `key=value` output to stdout.

| Script | What it does |
|--------|-------------|
| `worktree-create.sh` | Creates git worktree, symlinks gitignored env files (including nested monorepo), installs deps. |
| `worktree-post-setup.sh` | Symlinks env files and installs deps in an existing worktree. Runs after `EnterWorktree` creates the worktree. |
| `worktree-open.sh` | Opens a new terminal window (tmux, iTerm2, or Terminal.app) with Claude in the given worktree. |
| `park-scan.sh` | Scans worktree for artifacts (plans, specs, docs), reads skill invocation log. |
| `grab-restore.sh` | Finds handoff file, reads content, archives with date stamp, gathers git log. |
| `ship-preflight.sh` | Gathers git context, counts production files/lines, detects risk signals (auth, data model, config). |
| `ship-pr.sh` | Stages files, commits, pushes, creates PR — all from args. |
| `auto-pr.sh` | Post-push hook: typechecks and creates a draft PR using commit messages. Zero LLM tokens on happy path. |
| `kill-wt.sh` | Teardown: kills dev server port, removes worktree, deletes branch. Supports `--detach` for self-teardown. |
| `open-webstorm.sh` | Opens a directory in WebStorm. macOS only. |
| `sim-interact.sh` | Xcode iOS Simulator CLI: screenshot, scroll, tap, open URL, boot/list devices. For QA workflows. |

`test-scripts.sh` provides integration tests for the above — creates a throwaway git repo and exercises each script.

## Skills

Skills are namespaced `ctx-*` and invoked with `/ctx:<skill-name>`.

### Ideation

| Skill | What it does |
|-------|-------------|
| `ctx-brainstorm` | Lean brainstorming for small-to-medium tasks. Self-review, no subagents. Auto-escalates to `ctx-brainstorm-ss` when complexity warrants it. |
| `ctx-brainstorm-ss` | Tier 2 brainstorming for complex features — subagent spec reviewer with fresh context, scope decomposition, design-for-isolation principles. |
| `ctx-discuss` | Discussion and exploration mode. No code changes. Think out loud, discover what to build, challenge assumptions. |
| `ctx-architect-growth` | Critical thinking coach for architectural decisions. Pushes you to reason about tradeoffs, identify hidden assumptions, and map second-order effects. |

### Planning & Execution

| Skill | What it does |
|-------|-------------|
| `ctx-plan` | Reads complexity tags from brainstorm specs and produces an implementation plan with task breakdown and agent budgets. |
| `ctx-execute` | Dispatches subagents per task, gated by complexity tags — `[LOW]` gets 1 agent, `[MED]` gets 2, `[HIGH]` gets full review. |
| `ctx-ship` | Full gated pipeline: preflight, architect, implement, verify, PR, ship. Each phase requires user confirmation. Uses DORA two-stage verification. |
| `ctx-parallel` | Ad-hoc parallel subagent dispatch. Decision framework for when to parallelize vs. sequence. Complements `ctx-execute`. |

### Quality & Verification

| Skill | What it does |
|-------|-------------|
| `ctx-qa` | QA test any web app and fix bugs. Uses Playwright connected to your real Chrome session via CDP. |
| `ctx-tdd` | Test-driven development with Iron Law enforcement. Red-Green-Refactor cycle, rationalization prevention, testing anti-patterns reference. |
| `ctx-verify` | Standalone evidence-before-claims gate. Run the command, read the output, THEN make the claim. Composable into any workflow. |
| `ctx-debug` | Systematic 4-phase debugging: root cause investigation, pattern analysis, hypothesis testing, implementation. Blocks fixes before Phase 1 completion. |
| `ctx-review-receive` | How to handle incoming code review feedback. Anti-sycophancy rules, verify-before-implementing protocol, YAGNI checks, push-back guidance. |

### Calibration

| Skill | What it does |
|-------|-------------|
| `ctx-engineering` | Prompt calibration coach. Flags prompts that are too specific (brittle) or too vague (no success criteria) and guides toward the "just right" zone. |

### Session & Workspace Management

| Skill | What it does |
|-------|-------------|
| `ctx-park` | End-of-session handoff. Scans worktree for artifacts, distills insights, writes a structured handoff file for the next session. |
| `ctx-grab` | Start-of-session restore. Reads the handoff from `ctx-park`, follows artifact links, and re-aligns context. |
| `ctx-resume` | Resume after crash or context loss. Lists active plans from global storage and relaunches into the correct worktree. |
| `ctx-worktree` | Creates an isolated git worktree with env symlinks and dependency install so parallel work is immediately runnable. |
| `ctx-kill-wt` | Teardown a worktree — kills dev server port, removes worktree, deletes branch. Safe from inside or outside the worktree. |
| `ctx-open` | Opens the current working directory in WebStorm. |

## Agents

Dispatched automatically by `ctx-execute` and `ctx-ship` based on task complexity.

| Agent | Role |
|-------|------|
| `implementer` | Fresh-context implementation agent. Implements changes, writes tests, commits. |
| `code-reviewer` | Reviews git diffs for correctness, architecture, testing, and production readiness. |
| `reviewer` | Reviews diffs for spec compliance and code quality. Used for `[MED]` and `[HIGH]` tasks. |

## Hooks

| Event | Hook | Purpose |
|-------|------|---------|
| `PreToolUse` | `worktree-guard` | Blocks Edit/Write/Bash mutations outside the current repo's worktree. Also blocks cross-repo edits to sibling projects. |
| `PreToolUse` | `enforce-ship-pr` | Blocks manual `gh pr create` — redirects to `ship-pr.sh` to save tokens. |
| `SessionStart` | `session-start` | Injects context at the start of every session. |
| `PostToolUse` | `log-skill-invocation` | Logs which skills are invoked (fires on `Skill` tool use). |
| `PostToolUse` | `auto-pr` | After `git push`, runs typecheck and creates a draft PR. |
| `PostToolUse` | test coverage nudge | After test runs, checks if tests cover service-layer concerns or only unit-level. |
| `UserPromptSubmit` | `altitude-check` | Nudges when it detects altitude oscillation — micromanaging vs. hand-waving. |

## Philosophy

Context is finite. This plugin treats it as a budget:

- **Skill-script symbiosis** — deterministic ops in scripts, judgment in skills. The LLM never interprets bash it could skip.
- **Complexity gating** — simple tasks get simple treatment. Subagents and multi-phase pipelines only activate when tags warrant them.
- **Signal over ceremony** — each skill says what it needs to say and stops. No boilerplate.
- **Session continuity** — `park` and `grab` carry context across sessions without re-explaining.

## Recommended Settings

Claude Code runs background forks that silently consume tokens (prompt suggestions, auto-dream consolidation, memory extraction). Disable them to keep your token budget under your control:

```json
// ~/.claude/settings.json
{
  "promptSuggestionEnabled": false,
  "autoDreamEnabled": false
}
```

See `ctx-engineering/references/hidden_token_costs.md` for the full breakdown of what each system does.

## Factory Server

The brainstorm skill includes an optional factory web UI for visual design exploration.

```bash
# Start the factory server
bash plugins/ctx/skills/ctx-brainstorm/factory/start.sh \
  --project-dir /path/to/your/project \
  --port 52341

# Options:
#   --project-dir <path>  Required. The project to brainstorm against.
#   --port <port>         Default: 52341
#   --rescan              Force re-scan of project styles (normally cached)
```

The server provides:
- **Portfolio** at `http://localhost:<port>/factory` — landing page listing all prototype pages
- **Factory editor** at `http://localhost:<port>/factory/<page>` — per-page visual brainstorming with click-to-select options, style controls, and version pills
- **Brainstorm preview** at `http://localhost:<port>/` — ephemeral view of the newest HTML from the current brainstorm session
- **API** at `/api/write`, `/api/page-status`, `/api/slots`, `/api/style-profile` — used by the brainstorm skill to persist events and query state

Pages and events are stored in `<project-dir>/factory/pages/<page>/.events`.

The root-level `factory/` directory is **tracked in git** so prototype
iteration history is preserved across sessions. New worktrees created via
`worktree-create.sh` exclude it through `git sparse-checkout` so dev branches
stay focused on source code — all worktrees still share the same portfolio
at runtime via `git rev-parse --git-common-dir`.

## Status

**v0.2.9.6** — Private, actively iterating. Session learning capture (distill), epic documentation aggregation, safe worktree teardown, auto-PR hooks, enforce-ship-pr guard, companion factory, iOS simulator interaction.

## License

Personal use. No license yet.
