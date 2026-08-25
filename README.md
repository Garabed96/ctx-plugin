# ctx-plugin

> **Alpha** — I'm building this in public. It works for my workflow. It may break for yours. Issues welcome.

A context economy plugin for [Claude Code](https://docs.anthropic.com/en/docs/claude-code). Controls what the model sees at every phase of development — from first idea to merged PR.

## What it looks like

```
You: "I need to add search to the dashboard"

/ctx-discuss           →  Think it through — what kind of search? What are the tradeoffs?
/ctx-align             →  Make sure Claude understands the intent before moving forward
/ctx-brainstorm        →  Spec with blind spots caught before you write code
/ctx-lean              →  Discover first, derive a compact plan, then risk-route ruthless review
/ctx-plan              →  Execution graph with ownership, safe parallelism, and review batches
/ctx-ruthless          →  Cut scope creep without cutting verified safety
/ctx-worktree          →  Isolated git worktree, deps installed, ready to go
/ctx-execute           →  Subagents implement each task, reviewers verify
/ctx-ship              →  Preflight checks, verification gate, PR created

# End of day
/ctx-park              →  Context saved — decisions, learnings, next steps

# Next morning
/ctx-grab              →  Pick up exactly where you left off
```

No re-explaining. No lost context. No "wait, what were we doing?"

## Install

```sh
/plugin marketplace add Garabed96/ctx-plugin
/plugin install ctx@ctx-plugin
```

**Platform:** macOS (tmux, iTerm2, Terminal.app). Core skills are POSIX-compatible. Windows untested.

## How I use it

**Before building anything:**

- `/ctx-discuss` — think before you build. No code changes, just conversation. Explore the problem, challenge assumptions, discover what to build
- `/ctx-align` — make sure Claude clearly understands what you're saying. Flags prompts that are too brittle or too vague before they waste a cycle. If you say CTX Engineering, use this skill.

Either can come first. Once the direction is clear, move to brainstorm.

**Full feature workflow:**

1. `/ctx-brainstorm` — surfaces blind spots, writes a spec, and self-reviews (or escalates to a subagent reviewer for complex features)
2. `/ctx-plan` — turns the spec into an execution graph with tagged tasks, dependency chains, ownership, safe parallelism, review batches, and tiered verification
3. `/ctx-ruthless` — for HIGH, multi-system, or time-boxed plans, audits every task against approved requirements and verified safety before touching the plan
4. `/ctx-worktree` — spins up an isolated git worktree with env files copied and deps installed
5. `/ctx-execute` — walks the plan task by task, dispatching implementer and reviewer agents based on complexity
6. `/ctx-ship` — preflight risk scan, verification gate, PR creation. Each phase is gated — I approve before it continues

**Quick fix workflow:**

1. `/ctx-worktree` — isolate the change
2. Make the fix
3. `/ctx-verify` — prove it works before claiming it does
4. `/ctx-ship` — PR it

**When I get stuck:**

- `/ctx-debug` — blocks me from jumping to fixes before investigating root cause
- `/ctx-tdd` — enforces Red-Green-Refactor. Catches me when I write the implementation first

**End of session:**

- `/ctx-park` — saves a handoff: what happened, what I learned, what's next. Also captures non-obvious learnings as memories that accumulate into skill-level gotchas over time
- `/ctx-grab` — next session, picks up the handoff and re-aligns context

## Architecture

The plugin separates **judgment** from **execution**:

- **Skills** (29) — markdown instruction sets that handle decisions: when to create a worktree, what context to preserve, which risk signals matter
- **Scripts** (11) — shell scripts that handle deterministic operations: git worktrees, artifact scanning, PR creation. Args in, structured output out
- **Agents** (3) — fresh-context subagents dispatched by `ctx-execute` for implementation and review
- **Hooks** (7) — guardrails that fire automatically: block edits outside your worktree, prevent direct pushes to main, detect altitude oscillation

Scripts do the mechanical work at shell speed. Skills decide when and why to call them. The model never wastes tokens interpreting bash it could skip.

### Skills

Invoked with `/ctx:<skill-name>`.

**Ideation**

| Skill | Purpose |
|-------|---------|
| `ctx-brainstorm` | Lean brainstorming with self-review. Auto-escalates to `ctx-brainstorm-ss` when complexity warrants it. |
| `ctx-brainstorm-ss` | Tier 2 — subagent spec reviewer with fresh context, scope decomposition, design-for-isolation. |
| `ctx-discuss` | Think before you build. No code changes — discuss direction, then move to `/ctx-plan` when ready. |
| `ctx-architect-growth` | Critical thinking coach. Pushes you to reason about tradeoffs and map second-order effects. |

**Planning & Execution**

| Skill | Purpose |
|-------|---------|
| `ctx-lean` | Main-agent planning with minimal read-only discovery, blocking questions only, and a risk-routed `ctx-ruthless` audit. |
| `ctx-prd` | Gated Demo PRD: canonical JSON bundle with generated Markdown + Obsidian Canvas, 3–5 evidence-gated demo gates, risk-routed review, and vault sync. |
| `ctx-product-checkpoint` | Create or update an Obsidian product review packet with user-visible changes, verified boundaries, QA evidence, visual design options, decisions, and concise handoffs. |
| `ctx-prd-exec` | Executes an approved Demo PRD gate by gate with just-in-time slices, independent verification, and evidence-backed state transitions. |
| `ctx-plan` | Produces an orchestration-ready implementation graph with explicit dependencies, ownership, safe parallelism, and verification boundaries. |
| `ctx-ruthless` | Audits an existing plan for scope creep and accidentally removed safety, with evidence and an approval gate before edits. |
| `ctx-execute` | Dispatches subagents per task — `[LOW]` 1 agent, `[MED]` 2, `[HIGH]` full review sandwich. |
| `ctx-ship` | Gated pipeline: preflight → verify → PR. Each phase requires your approval. |
| `ctx-parallel` | Ad-hoc parallel dispatch for independent tasks. |

**Quality**

| Skill | Purpose |
|-------|---------|
| `ctx-qa` | QA test any web app via Playwright connected to your real Chrome session. |
| `ctx-tdd` | Test-driven development with enforcement. Blocks implementation before a failing test exists. |
| `ctx-verify` | Evidence-before-claims gate. Run it, read it, then claim it. |
| `ctx-debug` | 4-phase root cause investigation. Blocks fixes before Phase 1 completes. |
| `ctx-review-receive` | Handle code review feedback without sycophancy. Verify before implementing. |

**Session Management**

| Skill | Purpose |
|-------|---------|
| `ctx-park` | End-of-session handoff with learning capture and gotcha promotion. |
| `ctx-grab` | Restore context from a parked session. |
| `ctx-resume` | Resume after crash or context loss. Finds active plans and their worktrees. |
| `ctx-worktree` | Isolated git worktree with env files and deps, ready immediately. |
| `ctx-kill-wt` | Teardown: kill port, remove worktree, delete branch. |
| `ctx-docs` | Create evidence-grounded architecture checkpoint docs with source-of-truth boundaries, verification, and Mermaid diagrams. |

**Calibration**

| Skill | Purpose |
|-------|---------|
| `ctx-align` | Use consistently when prompting. Makes sure Claude clearly understands what you're saying — flags instructions that are too brittle or too vague. Legacy references to CTX Engineering or `ctx-engineering` mean this skill. |

### Scripts

Shell scripts with a consistent contract: args in, progress to stderr, structured `key=value` output to stdout.

| Script | Purpose |
|--------|---------|
| `worktree-create.sh` | Create git worktree, copy env files, install deps |
| `worktree-post-setup.sh` | Post-setup for env + deps after `EnterWorktree` |
| `worktree-open.sh` | Open terminal window in worktree (tmux/iTerm2/Terminal.app) |
| `park-scan.sh` | Scan worktree for artifacts and skill invocation log |
| `grab-restore.sh` | Find and restore handoff file with git log |
| `ship-preflight.sh` | Gather git context, count files, detect risk signals |
| `ship-pr.sh` | Stage, commit, push, create PR from args |
| `auto-pr.sh` | Post-push hook: typecheck + draft PR, zero LLM tokens |
| `kill-wt.sh` | Teardown worktree safely, supports `--detach` for self-teardown |
| `sim-interact.sh` | iOS Simulator CLI: screenshot, scroll, tap, boot |

### Hooks

| Event | Hook | Purpose |
|-------|------|---------|
| `PreToolUse` | enforce-ship-pr | Blocks manual `gh pr create`, redirects to `ship-pr.sh` |
| `SessionStart` | session-start | Injects context at session start |
| `PostToolUse` | log-skill-invocation | Tracks which skills are invoked |
| `PostToolUse` | auto-pr | Typecheck + draft PR after `git push` |
| `PostToolUse` | test coverage nudge | Checks if tests cover service-layer concerns |
| `UserPromptSubmit` | altitude-check | Detects altitude oscillation (micromanaging vs. hand-waving) |

### Agents

Dispatched automatically by `ctx-execute` and `ctx-ship`.

| Agent | Role |
|-------|------|
| `implementer` | Fresh-context agent. Implements, tests, commits. |
| `code-reviewer` | Reviews diffs for correctness and production readiness. |
| `reviewer` | Spec compliance + code quality review for `[MED]`/`[HIGH]` tasks. |

## Factory

Optional web UI for visual design exploration during brainstorming.

```bash
bash plugins/ctx/skills/ctx-brainstorm/factory/start.sh \
  --project-dir /path/to/your/project \
  --port 52341
```

- **Portfolio** at `/factory` — all prototype pages
- **Editor** at `/factory/<group>/<page>` — visual brainstorming with click-to-select, grouped navigation, style controls, version pills
- **Preview** at `/` — ephemeral view of current brainstorm output
- **API** at `/api/write`, `/api/page-status`, `/api/slots`, `/api/style-profile`

Pages stored in `<project-dir>/factory/pages/<group>/<page>/.events`. Tracked in git for iteration history. Excluded from dev worktrees via sparse-checkout.

## Recommended Settings

```json
{
  "promptSuggestionEnabled": false,
  "autoDreamEnabled": false
}
```

These disable background token consumers. See `ctx-align/references/hidden_token_costs.md` for details.

## Lineage

Inspired by the discipline patterns in [superpowers](https://github.com/obra/superpowers) (verification gates, rationalization tables, hard gates). Extended with session continuity, QA testing, critical thinking coaching, prompt calibration, complexity gating, and the shell-native execution model.

## Status

**v0.2.9.11** — Alpha. Building in public.

## License

Personal use. No license yet.
