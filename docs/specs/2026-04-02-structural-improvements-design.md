# Structural Improvements from Claude Code Source Analysis

**Date:** 2026-04-02
**Status:** Draft — pending user approval

---

## Context

Reading the leaked Claude Code source (March 2026) revealed how the plugin runtime actually handles skills, hooks, and compaction internally. This spec applies those findings to ctx-plugin.

**Source evidence:** `docs/anthropic.md` — 10 commandments with file path citations.

---

## Stream 1: Reorder SKILL.md Files for Compaction Survival

**Why:** The compaction system truncates skills to ~5,000 tokens, keeping the head of the file. Critical instructions buried after examples or navigation sections get silently cut.

**Source:** `src/services/compact/compact.ts:127-129` — *"instructions at the top of a skill file are usually the critical part"*

**Target section order for all skills:**

```
1. Frontmatter (name, description)
2. Title + one-line purpose
3. HARD-GATE (if applicable)
4. Process steps
5. Decision tables / budget tables
6. Rationalization Prevention
7. Gotchas
8. Skill Files listing (navigational — moved down)
9. Examples / Key Patterns (expendable)
10. Composability / Handoff (expendable)
```

**Affected skills** (those with Skill Files or navigational content above hard gates/process):

| Skill | Lines | Issue | Tag |
|-------|-------|-------|-----|
| ctx-brainstorm | 121 | Skill Files at L14, before hard gate | `[LOW]` |
| ctx-execute | 179 | Skill Files at L14, before process | `[LOW]` |
| ctx-tdd | 277 | Skill Files at L17, before process | `[LOW]` |
| ctx-verify | 165 | Skill Files at L17, before Iron Law | `[LOW]` |
| ctx-plan | 153 | Needs assessment | `[LOW]` |
| ctx-ship | 140 | Needs assessment | `[LOW]` |
| ctx-debug | 196 | Needs assessment | `[LOW]` |
| ctx-review-receive | 195 | Needs assessment | `[LOW]` |
| ctx-qa | 223 | Needs assessment | `[LOW]` |
| ctx-parallel | 168 | Needs assessment | `[LOW]` |
| ctx-architect-growth | 178 | Needs assessment | `[LOW]` |
| ctx-brainstorm-ss | 102 | Needs assessment | `[LOW]` |
| ctx-park | 74 | Needs assessment | `[LOW]` |
| ctx-grab | 62 | Needs assessment | `[LOW]` |
| ctx-worktree | 115 | Needs assessment | `[LOW]` |
| ctx-engineering | 90 | Needs assessment | `[LOW]` |
| ctx-discuss | 29 | Likely fine — very short | `[LOW]` |

**Rule:** Only reorder if expendable content currently precedes critical content. If a skill already has the right order, leave it alone.

---

## Stream 2: Adopt `${CLAUDE_SKILL_DIR}` Variables

**Why:** The SkillTool substitutes `${CLAUDE_SKILL_DIR}` with the skill's directory path before injecting content. Using it makes paths explicit, portable, and consistent with the runtime's own conventions.

**Source:** `src/tools/SkillTool/SkillTool.ts:1077`

**Changes:**
- Replace relative paths like `references/example-spec.md` with `${CLAUDE_SKILL_DIR}/references/example-spec.md` in skill body content
- Replace cross-boundary references like `../../agents/implementer.md` with `${CLAUDE_PLUGIN_ROOT}/agents/implementer.md`
- Leave frontmatter paths untouched (frontmatter is parsed separately)

**Tag:** `[LOW]` — find-and-replace with verification.

---

## Stream 3: Upgrade orchestration-verify-nudge to Prompt Hook

**Why:** The current shell script uses regex to detect test commands and grep to check for service files in the diff. It can't judge whether tests actually covered the changed code paths. A `prompt` hook gives Haiku the full context and lets it make that judgment.

**Source:** `src/schemas/hooks.ts:67-95` (prompt hook schema), `src/utils/hooks/execPromptHook.ts:62-100` (execution with structured JSON output)

**Current:** Shell script, fires on all `PostToolUse(Bash)`, regex-matches test commands, greps diff for Service/Provider files.

**New:** Prompt hook with `if` pre-filter.

```json
{
  "matcher": "Bash",
  "hooks": [
    {
      "type": "prompt",
      "prompt": "A Bash command just completed. Hook input: $ARGUMENTS\n\nWas this a test run? If yes, do the test results adequately cover the service-layer and orchestration files modified in this branch?\n\nReturn {\"ok\": true} if no nudge needed. Return {\"ok\": false, \"reason\": \"...\"} if tests ran but likely missed service-layer side effects.",
      "if": "Bash(npm *|npx *|bun *|vitest*|jest*|pytest*)",
      "timeout": 10
    }
  ]
}
```

**Tradeoffs:**
- Adds ~0.1-0.5s latency per matching Bash call (Haiku inference)
- Costs ~$0.001 per fire
- Gains: can judge coverage, not just pattern match; no jq dependency; structured output

**The old shell script is deleted, not kept as fallback.** Clean cut.

**Tag:** `[MED]` — new hook type, needs validation.

---

## Stream 4: Refine Existing Hooks

### 4a. Add `if` condition documentation to worktree-guard

The worktree-guard script already does sophisticated write-detection (always-write commands vs redirect-write commands). The `if` permission syntax isn't expressive enough to replicate this. Keep the script as-is but add a comment in hooks.json explaining why the `if` field isn't used here.

**Tag:** `[LOW]`

### 4b. Reorder altitude-check patterns

Currently ordered: terse (Pattern 1) → emotional (Pattern 2) → verbose (Pattern 3).

Reorder to: terse → verbose → emotional. Rationale: emotional escalation is the rarest pattern and uses the most expensive regex (many alternations). Verbose oscillation is more common than emotional. Script exits on first match, so frequent patterns should come first.

**Tag:** `[LOW]`

---

## Success Criteria

1. All SKILL.md files have hard gates and process steps in the first ~100 lines
2. No hardcoded relative paths remain in skill body content — all use `${CLAUDE_SKILL_DIR}` or `${CLAUDE_PLUGIN_ROOT}`
3. orchestration-verify-nudge fires as a prompt hook with structured output
4. altitude-check patterns reordered by frequency
5. All existing hooks still function (no regressions)

---

## Complexity Summary

| Stream | Tasks | Tags |
|--------|-------|------|
| 1. Skill reordering | 17 files | All `[LOW]` |
| 2. Variable adoption | ~10 files | `[LOW]` |
| 3. Prompt hook upgrade | 1 hook + delete script | `[MED]` |
| 4. Hook refinement | 2 files | `[LOW]` |
