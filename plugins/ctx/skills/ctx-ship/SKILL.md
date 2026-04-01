---
name: ctx-ship
description: >
  Use when ready to take a feature from plan through to merged PR. Triggers: "ship this",
  "full pipeline", "/ship".
user-invocable: true
---

# /ctx-ship — Gated Development Pipeline

Delegates git mechanics to `scripts/ship-preflight.sh` and `scripts/ship-pr.sh`. This skill handles gating and judgment.

Pipeline: **Preflight → Architect → Implement → Verify → PR Readiness → Ship**

Each phase ends with a gate. Do not advance without explicit user confirmation.

---

## Phase 0 — Preflight

```bash
PLUGIN_ROOT="${CLAUDE_PLUGIN_ROOT:-$(dirname "$(dirname "$(realpath "$0")")")}"
bash "$PLUGIN_ROOT/scripts/ship-preflight.sh" --base main
```

Parse the output. Classify risk from `prod_files`, `prod_lines`, and `---risk-signals---`:

| Risk | Signals |
|------|---------|
| LOW | Config, docs, copy. No logic. |
| MEDIUM | New feature in existing patterns. 1-3 prod files. |
| HIGH | New system, auth/data model changes, 4+ prod files, or `scope-over-500-lines` signal. |

If `scope-warning-400-plus` or `scope-over-500-lines`: warn or block before proceeding.

**Gate 0:** User confirms branch, feature description, and risk level.

---

## Phase 1 — Architect (judgment)

Goal: written plan before any code. Invoke `/ctx-brainstorm` if design exploration needed, then `/ctx-plan`.

**Gate A:** User approves the plan.

## Phase 2 — Implement (judgment)

Execute via `/ctx-execute` or inline for small plans. Follow project conventions.

**Gate B:** Static checks pass (discover lint/type commands from project config).

---

## Phase 3 — Verify (DORA Two-Stage)

Cheap checks first (type-check + lint + unit tests), then acceptance tests only after commit stage passes.

Scope check uses `prod_lines` from preflight. Re-run preflight if implementation changed the diff:
- Under 400 lines: proceed
- 400-499: warn, suggest splitting
- 500+: hard stop, must split

**Gate C:** Commit + acceptance pass, diff within scope.

---

## Phase 4 — PR Readiness (judgment)

Review the diff (use `---files---` from preflight) for:

| Check | Flag when |
|-------|-----------|
| Tests for logic changes | New logic with no test file touched |
| No leaked internals | Error details, stack traces in API responses |
| No hardcoded secrets | API keys, tokens, passwords in code |
| No TODO debris | TODO/FIXME/HACK without tracking issue |

Risk-adjusted enforcement: LOW = advisory, MEDIUM = user acknowledges, HIGH = hard block.

**Gate D:** Risk-appropriate findings cleared.

---

## Phase 5 — Ship

Prepare commit message and PR body (judgment), then delegate mechanics:

```bash
bash "$PLUGIN_ROOT/scripts/ship-pr.sh" \
  --files file1.ts file2.ts \
  --message "feat: description" \
  --title "PR title under 70 chars" \
  --body "PR body with ## What changed, ## Why, ## Risk, ## Validation" \
  --draft
```

PR body template:

```
## What changed
- <bullet points>

## Why
<one sentence>

## Risk
<low/medium/high> — <one sentence>

## Validation
<commands run and their results>
```

**Gate E:** PR is open, CI is green.

---

## Composability

```
/ctx-ship
  └─ Phase 0: ship-preflight.sh
  └─ Phase 1: /ctx-brainstorm → /ctx-plan
  └─ Phase 2: /ctx-execute (or inline)
  └─ Phase 3: Verify (re-run preflight if needed)
  └─ Phase 4: PR Readiness (judgment)
  └─ Phase 5: ship-pr.sh
```

---

## Gotchas

- **Don't skip gates under time pressure.** That's when you need them most.
- **Scope creep during implementation.** If Phase 2 reveals unplanned work, update the plan first.
- **Risk classification is not optional.** Every change gets a level at Gate 0.
- **Never `git add -A`.** The script stages specific files only — always pass explicit `--files`.
