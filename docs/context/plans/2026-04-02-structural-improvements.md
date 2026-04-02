# Structural Improvements Implementation Plan

**Goal:** Apply Claude Code source insights to improve ctx-plugin skill compaction survival, path portability, and hook precision.
**Spec:** `docs/specs/2026-04-02-structural-improvements-design.md`
**Branch:** `feature/structural-improvements-from-source-analysis`
**Total tasks:** 6 ([4 LOW] [1 MED] [1 LOW — batch])
**Estimated agent budget:** 8 agents (4x1 + 1x2 + 1x1)

---

### Task 1: Reorder skills — brainstorm tier `[LOW]`

**Files:**
- Modify: `plugins/ctx/skills/ctx-brainstorm/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-brainstorm-ss/SKILL.md`

**Steps:**
- [ ] In ctx-brainstorm: move "Skill Files" section (currently at line 14) to after "Gotchas" section. Hard gate and Process must be the first content after frontmatter + title.
- [ ] In ctx-brainstorm-ss: move "Skill Files" section (currently at line 14) to after "Gotchas" section. Same principle.
- [ ] Verify both files still read correctly — no broken section references.
- [ ] Commit: `refactor: reorder brainstorm skills for compaction survival`

**Context:** These two skills have "Skill Files" listings (navigational content) before their HARD-GATE and Process sections. During compaction truncation, the navigational content wastes the ~5K token budget that should go to hard gates and process steps.

---

### Task 2: Reorder skills — planning/execution tier `[LOW]`

**Files:**
- Modify: `plugins/ctx/skills/ctx-plan/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-execute/SKILL.md`

**Steps:**
- [ ] In ctx-plan: move "Skill Files" section (line 13) to after "Self-Review" section.
- [ ] In ctx-execute: move "Skill Files" section (line 15) to after "Gotchas" section. The HARD-GATE (Worktree Gate) and Process must be first.
- [ ] Verify both files read correctly.
- [ ] Commit: `refactor: reorder plan/execute skills for compaction survival`

**Context:** Same issue as Task 1. ctx-execute is especially important — its worktree hard gate is the most critical instruction and currently sits after the Skill Files listing.

---

### Task 3: Reorder skills — quality tier `[LOW]`

**Files:**
- Modify: `plugins/ctx/skills/ctx-tdd/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-debug/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-review-receive/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-qa/SKILL.md`

**Steps:**
- [ ] In ctx-tdd: move "Skill Files" section (line 15) to after "Rationalization Prevention" section. The Iron Law hard gate must be first content.
- [ ] In ctx-debug: move "Skill Files" section (line 15) to after "Gotchas" section. The Iron Law hard gate must be first content.
- [ ] In ctx-review-receive: move "Skill Files" section (line 14) to after the last critical section. The Response Protocol must come first.
- [ ] In ctx-qa: move "Skill Files" section (line 17) to after "Gotchas" section. TOOLING RULE must come first.
- [ ] Verify all four files read correctly.
- [ ] Commit: `refactor: reorder quality-tier skills for compaction survival`

**Context:** These are the longest skills (196-278 lines). They're most at risk of compaction truncation, so getting the ordering right matters most here.

---

### Task 4: Adopt `${CLAUDE_SKILL_DIR}` and `${CLAUDE_PLUGIN_ROOT}` variables `[LOW]`

**Files:**
- Modify: `plugins/ctx/skills/ctx-brainstorm/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-brainstorm-ss/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-plan/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-execute/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-tdd/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-debug/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-qa/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-ship/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-park/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-grab/SKILL.md`
- Modify: `plugins/ctx/skills/ctx-worktree/SKILL.md`

**Substitution rules:**
- `references/<file>` → `${CLAUDE_SKILL_DIR}/references/<file>` (same-skill)
- `companion/` → `${CLAUDE_SKILL_DIR}/companion/` (same-skill)
- `../ctx-brainstorm/references/<file>` → `${CLAUDE_PLUGIN_ROOT}/skills/ctx-brainstorm/references/<file>` (cross-skill)
- `../ctx-brainstorm/companion/` → `${CLAUDE_PLUGIN_ROOT}/skills/ctx-brainstorm/companion/` (cross-skill)
- `../../agents/<file>` → `${CLAUDE_PLUGIN_ROOT}/agents/<file>` (cross-boundary)
- `../../scripts/<file>` → `${CLAUDE_PLUGIN_ROOT}/scripts/<file>` (cross-boundary)
- `<base-directory>/../../scripts/<file>` → `${CLAUDE_PLUGIN_ROOT}/scripts/<file>` (already resolved by runtime)

**Steps:**
- [ ] Apply substitutions across all 11 files per the rules above
- [ ] In skills that use `<base-directory>/../../scripts/...` in code blocks (ctx-ship, ctx-park, ctx-grab, ctx-worktree): replace `<base-directory>/../../scripts/` with `${CLAUDE_PLUGIN_ROOT}/scripts/`
- [ ] Verify no raw relative paths remain: `grep -r '\.\./\|references/' plugins/ctx/skills/*/SKILL.md` should return only ${CLAUDE_SKILL_DIR} or ${CLAUDE_PLUGIN_ROOT} prefixed paths
- [ ] Commit: `refactor: adopt CLAUDE_SKILL_DIR and CLAUDE_PLUGIN_ROOT variables`

**Context:** The SkillTool substitutes these variables before injecting content. Using them makes paths explicit, portable across installations, and consistent with the runtime's own conventions.

---

### Task 5: Upgrade orchestration-verify-nudge to prompt hook `[MED]`

**Files:**
- Modify: `plugins/ctx/hooks/hooks.json`
- Delete: `plugins/ctx/hooks/scripts/orchestration-verify-nudge.sh`

**Steps:**
- [ ] In hooks.json, replace the PostToolUse Bash entry for orchestration-verify-nudge (currently a `command` type calling the shell script) with a `prompt` type hook:
  ```json
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "prompt",
        "prompt": "A Bash command just completed during a coding session. The hook input JSON is: $ARGUMENTS\n\nDetermine:\n1. Was this a test run (unit tests, integration tests, e2e tests)?\n2. If yes, check the tool_input.command and tool_output.stdout for test results.\n3. Check if service-layer or orchestration files (files matching *Service*.ts, *Provider*.ts, or similar patterns) appear in the branch diff.\n4. If tests ran AND service files were modified, assess whether the test output suggests adequate coverage of service-layer side effects.\n\nReturn {\"ok\": true} if no nudge is needed (not a test run, or tests appear to cover the changes adequately).\nReturn {\"ok\": false, \"reason\": \"<one-sentence nudge about what service-layer coverage might be missing>\"} if tests ran but likely missed service-layer side effects.",
        "if": "Bash(npm *|npx *|bun *|pnpm *|vitest*|jest*|pytest*|make test*)",
        "timeout": 10
      }
    ]
  }
  ```
- [ ] Keep the existing PostToolUse Skill entry (log-skill-invocation) unchanged.
- [ ] Delete `plugins/ctx/hooks/scripts/orchestration-verify-nudge.sh`
- [ ] Verify hooks.json is valid JSON after edit.
- [ ] Commit: `feat: upgrade orchestration-verify-nudge to prompt hook`

**Context:** The prompt hook type sends the hook input to Haiku (default small fast model) with a structured JSON output schema (`{ok: boolean, reason?: string}`). The `if` field pre-filters to test-like commands so the hook doesn't spawn for every Bash call. This replaces fragile regex matching with LLM judgment while adding negligible latency (~0.1-0.5s) and cost (~$0.001 per fire).

---

### Task 6: Refine existing hooks `[LOW]`

**Files:**
- Modify: `plugins/ctx/hooks/scripts/altitude-check.sh`

**Steps:**
- [ ] Reorder the three patterns: keep Pattern 1 (terse) first, move Pattern 3 (verbose) to second position, move Pattern 2 (emotional) to third position. The script exits on first match, so most-common patterns should come first. Emotional escalation is rarest and has the most expensive regex.
- [ ] Verify the script still functions — the logic is identical, only order changes.
- [ ] Commit: `refactor: reorder altitude-check patterns by frequency`

**Context:** Pure optimization. The exit-on-first-match behavior means frequently matched patterns should be tested first. Terse oscillation is most common in practice, verbose is next, emotional is rarest.

---

## Execution Notes

- Tasks 1-3 can be done in parallel (independent skill files) but should be committed separately for clean git history.
- Task 4 depends on Tasks 1-3 completing first (so we don't reorder and then re-edit the same files).
- Task 5 is independent of all other tasks.
- Task 6 is independent of all other tasks.
- All tasks are in the ctx-plugin repo at `/Users/azendo/.claude/plugins/marketplaces/ctx-plugin/`.
