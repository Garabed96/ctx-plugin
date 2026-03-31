# Context Plugin

A Claude Code plugin built on **context economy** — every skill optimizes for minimal token spend with maximum signal.

12 skills, 3 agents, and 3 hooks that cover the full development lifecycle: brainstorm, plan, execute, ship, QA.

## Install

```sh
/plugin marketplace add Garabed96/context-plugin
/plugin install context@context-plugin
```

## Skills

Skills are namespaced `context-*` and invoked with `/context:<skill-name>`.

### Ideation

| Skill | What it does |
|-------|-------------|
| `context-brainstorm` | Lean brainstorming for small-to-medium tasks. Self-review, no subagents. Auto-escalates to `context-brainstorm-ss` when complexity warrants it. |
| `context-brainstorm-ss` | Tier 2 brainstorming for complex features — subagent spec reviewer with fresh context, scope decomposition, design-for-isolation principles. |
| `context-discuss` | Discussion and exploration mode. No code changes. Think out loud, discover what to build, challenge assumptions. |
| `context-architect-growth` | Critical thinking coach for architectural decisions. Pushes you to reason about tradeoffs, identify hidden assumptions, and map second-order effects. |

### Planning & Execution

| Skill | What it does |
|-------|-------------|
| `context-plan` | Reads complexity tags from brainstorm specs and produces an implementation plan with task breakdown and agent budgets. |
| `context-execute` | Dispatches subagents per task, gated by complexity tags — `[LOW]` gets 1 agent, `[MED]` gets 2, `[HIGH]` gets full review. |
| `context-ship` | Full gated pipeline: preflight, architect, implement, verify, PR, ship. Each phase requires user confirmation. Uses DORA two-stage verification. |

### Quality & Calibration

| Skill | What it does |
|-------|-------------|
| `context-qa` | QA test any web app and fix bugs. Uses Playwright connected to your real Chrome session via CDP. |
| `context-engineering` | Prompt calibration coach. Flags prompts that are too specific (brittle) or too vague (no success criteria) and guides toward the "just right" zone. |

### Session Management

| Skill | What it does |
|-------|-------------|
| `context-park` | End-of-session handoff. Scans worktree for artifacts, distills insights, writes a structured handoff file for the next session. |
| `context-grab` | Start-of-session restore. Reads the handoff from `context-park`, follows artifact links, and re-aligns context. |
| `context-worktree` | Creates an isolated git worktree with env symlinks and dependency install so parallel work is immediately runnable. |

## Agents

Dispatched automatically by `context-execute` and `context-ship` based on task complexity.

| Agent | Role |
|-------|------|
| `implementer` | Fresh-context implementation agent. Implements changes, writes tests, commits. |
| `code-reviewer` | Reviews git diffs for correctness, architecture, testing, and production readiness. |
| `reviewer` | Reviews diffs for spec compliance and code quality. Used for `[MED]` and `[HIGH]` tasks. |

## Hooks

| Event | Hook | Purpose |
|-------|------|---------|
| `SessionStart` | `session-start` | Injects context at the start of every session. |
| `PostToolUse` | `log-skill-invocation` | Logs which skills are invoked (fires on `Skill` tool use). |
| `UserPromptSubmit` | `altitude-check` | Nudges when it detects altitude oscillation — micromanaging vs. hand-waving. |

## Philosophy

Context is finite. Every token in a prompt either increases or decreases the probability of the desired output. This plugin treats context as a budget:

- **Right altitude** — stay at the level of abstraction that matches the task. Don't micromanage implementation or hand-wave requirements.
- **Signal over ceremony** — no boilerplate instructions. Each skill says what it needs to say and stops.
- **Complexity-gated resources** — simple tasks get simple treatment. Subagents, reviewers, and multi-phase pipelines only activate when complexity tags warrant them.
- **Session continuity** — `park` and `grab` let you carry context across sessions without re-explaining.

## Status

**v0.2.0** — Private, actively iterating. Structure is stable but skill content is still being refined.

## License

Personal use. No license yet.
