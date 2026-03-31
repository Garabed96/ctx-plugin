---
name: context-ship
description: >
  Use when ready to take a feature from plan through to merged PR. Triggers: "ship this",
  "full pipeline", "/ship".
user-invocable: true
---

# /context-ship — Gated Development Pipeline

**Canonical example:** Read `references/example-pr.md` for what a good PR description looks like.

Pipeline: **Preflight → Architect → Implement → Verify → PR Readiness → Ship**

Each phase ends with a gate. Do not advance past a gate without explicit user confirmation.

## Skill Files

- `SKILL.md` — this file

---

## Phase 0 — Preflight

Before touching any file, verify context:

```bash
pwd
git branch --show-current
git worktree list
```

If the active path or branch doesn't match the intended work, stop and ask.

**Risk classification:**

```bash
git diff main...HEAD --name-only
# Count only production code — exclude docs, plans, skills, tests, migrations, scripts
git diff main...HEAD --shortstat -- '*.ts' '*.tsx' '*.py' '*.go' '*.rs' ':!__tests__' ':!*/test/*' ':!scripts/*'
```

Classify the change:

| Risk | Signals |
|------|---------|
| LOW | Config, docs, copy changes. No logic. |
| MEDIUM | New feature in existing patterns. 1-3 files with logic. |
| HIGH | New system, auth changes, data model changes, 4+ files with logic. |

**Gate 0:** User confirms branch, feature description, and risk level.

---

## Phase 1 — Architect

Goal: written plan before any code.

**If the feature needs design exploration**, invoke `/context-brainstorm` first. Otherwise go straight to planning.

**Key questions to answer:**
- What does the user need to read/write?
- New files or modifications to existing?
- What existing patterns apply?
- What's the test scope?

**Write the plan** using `/context-plan` — this tags each task `[LOW]/[MED]/[HIGH]` and calculates the agent budget.

**Gate A:** User approves the plan. Do not write code until confirmed.

---

## Phase 2 — Implement

Execute the plan using `/context-execute` — complexity-gated subagents.

Or implement inline if the plan is small enough (1-2 `[LOW]` tasks don't need subagent overhead).

Follow project conventions. If project-level skills exist (e.g., TanStack, API design), compose with them.

**Gate B:** Static checks pass:

```bash
# Discover the project's lint/type commands from package.json, Makefile, etc.
# Common patterns:
# pnpm type-check && pnpm lint
# npm run lint
# cargo clippy
# mypy .
```

Fix all errors before proceeding.

---

## Phase 3 — Verify (DORA Two-Stage)

Farley's principle: run cheap checks first. Don't run slow acceptance tests until fast commit checks pass.

### Commit stage (~30s)

```bash
# Type-check + lint + unit tests
# Discover from project config
```

If commit stage fails → fix before running acceptance stage.

### Acceptance stage (only after commit passes)

```bash
# Integration tests scoped to changed files
# Full suite only if high-impact files changed (middleware, auth, config, lockfiles)
```

### Scope check

Count only production code — docs, plans, skills, test utilities, migrations, and scripts do not count toward scope gates.

```bash
# Production code only (excludes docs, tests, migrations, scripts, plans, skills)
git diff main...HEAD --shortstat -- '*.ts' '*.tsx' '*.py' '*.go' '*.rs' ':!__tests__' ':!*/test/*' ':!scripts/*'
```

- Under 400 lines: proceed
- 400-499 lines: warn user, suggest splitting
- 500+ lines: hard stop, must split before continuing

**Gate C:** Commit stage passes AND acceptance stage passes AND diff is within scope.

---

## Phase 4 — PR Readiness

Review the diff for common issues:

```bash
git diff main...HEAD --name-only
git diff main...HEAD -- '*.ts' '*.tsx' '*.py' '*.go' '*.rs'
```

**Universal checks:**

| Check | Flag when |
|-------|-----------|
| Tests for logic changes | New logic with no test file touched |
| No leaked internals | Error details, stack traces in API responses |
| No hardcoded secrets | API keys, tokens, passwords in code |
| No TODO debris | TODO/FIXME/HACK in new code without a tracking issue |

**Project-specific checks:** If the project has a `/ship` skill in `.claude/skills/`, defer to its PR readiness rules for domain-specific validation.

**Risk-adjusted enforcement:**

- **LOW:** Advisory only. Document any findings in PR body.
- **MEDIUM:** HIGH-severity findings block until fixed or user accepts risk. User must acknowledge Gate D.
- **HIGH:** HIGH-severity findings hard block. PR body must include architecture review section.

**Gate D:** Risk-appropriate findings cleared.

---

## Phase 5 — Ship

### Commit

Stage specific files (never `git add -A`):

```bash
git add <specific files>
git status  # verify only intended files staged
```

Commit with conventional message:

```bash
git commit -m "$(cat <<'EOF'
<type>: <what changed and why — max 50 chars>

<optional body, wrap at 72 chars>

Co-Authored-By: Claude <model> <noreply@anthropic.com>
EOF
)"
```

### Push and PR

```bash
git push -u origin <branch>
```

```bash
gh pr create --draft --title "<title under 70 chars>" --body "$(cat <<'EOF'
## What changed
- <bullet points>

## Why
<one sentence>

## Risk
<low/medium/high> — <one sentence>

## Validation
<commands run and their results>

## Rollback
<revert instructions>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

**Gate E:** PR is open, CI is green.

---

## Composability

This skill orchestrates other context-* skills:

```
/context-ship
  └─ Phase 0: Preflight (standalone)
  └─ Phase 1: /context-brainstorm (if needed) → /context-plan
  └─ Phase 2: /context-execute (or inline for trivial plans)
  └─ Phase 3: Verify (standalone)
  └─ Phase 4: PR Readiness (standalone)
  └─ Phase 5: Ship (standalone)
```

Project-specific conventions stay in project-level skill overrides, not here.

---

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Just skip Gate A, the plan is obvious" | Obvious plans still have scope drift. Gate A catches it. |
| "Tests pass, skip PR review" | Tests verify code, not intent. Review verifies intent. |
| "It's a small change, ship directly" | Small changes still get risk-classified at Gate 0. |
| "CI will catch it" | CI checks syntax, not architecture. Gates check architecture. |
| "The user is waiting" | A 2-minute gate saves a 2-hour rollback. |
| "I already verified in Phase 2" | Phase 3 re-verifies after all changes. Stale evidence is not evidence. |

---

## Gotchas

- **Don't skip gates under time pressure.** Gates exist because skipping them is how bugs ship. If you're tempted to skip Gate A (plan approval), that's the time you need it most.
- **Scope creep during implementation.** If Phase 2 reveals work not in the plan, stop and update the plan — don't silently expand scope.
- **Risk classification is not optional.** Every change gets a risk level at Gate 0. It drives enforcement for the rest of the pipeline.
- **Never `git add -A`.** Stage specific files. Accidental commits of `.env`, credentials, or large binaries are hard to undo.
