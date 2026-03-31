---
name: context-park
description: >
  End-of-session handoff. Scans the worktree for artifacts, distills
  conversation-only insights, and writes a structured handoff file so a
  new session can pick up via /context-grab. Use when closing a session,
  when context is getting large, or when altitude oscillation suggests
  a fresh start.
user-invocable: true
allowed-tools: Bash, Read, Glob, Write
---

# /context-park — Save Session Context

**Canonical example:** Read `references/example-handoff.md` before writing your first handoff.

Park the current session's context into a handoff file. A future session
uses `/context-grab` to restore it.

**Announce at start:** "Parking context for this session."

## Workflow

### 1. Scan for artifacts

Identify relevant files in the worktree and known global locations:

```bash
BRANCH=$(git branch --show-current)
WORKTREE=$(basename "$(pwd)")

# Plans (both superpowers and context plugin)
find docs/superpowers/plans docs/context/plans -name '*.md' 2>/dev/null

# Plans in global (check for any that were used this session)
ls ~/.claude/plans/ 2>/dev/null

# Specs (both superpowers and context plugin)
find docs/superpowers/specs docs/specs docs/context/specs -name '*.md' 2>/dev/null

# Docs, playgrounds
ls docs/*.md 2>/dev/null
ls playground/*.html 2>/dev/null
```

Include only artifacts relevant to the current work. If a file wasn't
referenced or relevant this session, skip it.

### 2. Distill smart context

From the current conversation, extract ONLY what is NOT already captured
in any file:

**Include:**
- Decisions made and their rationale
- Approaches tried that failed (and why)
- Current blockers or open questions
- Design constraints or preferences discovered
- What should happen next

**Exclude:**
- Information already in plan files or docs
- Code already committed
- General project knowledge
- Conversation meta-discussion (this discussion about parking, etc.)

Be ruthless about signal-to-noise. A 5-item smart context section is
better than a 20-item dump.

### 3. Write the handoff file

Write to `.claude/context-park.md` in the worktree root:

```markdown
# Context Park — {worktree-name}

**Parked:** {ISO 8601 timestamp}
**Branch:** {branch-name}
**Session:** {One sentence — what this session accomplished}

## Artifacts

{Full paths — pointers, not copies. One-line description each.}

## Smart Context

{Numbered list. Each item: decision/insight + why.}

## Next Steps

{Ordered — what the next agent should do first.}
```

### 4. Skill audit

Check for `.claude/skill-invocations.log` in the worktree. If it exists:

1. Read the log — each line is `timestamp|skill-name|branch`
2. For each skill invoked, assess: **was it the right choice for the task scope?**
   - Consider: task size (files changed), complexity, whether a lighter/heavier alternative existed
   - If the right call: skip it
   - If wrong call: write a gotcha entry
3. **Append the gotcha to the skill that was misused** (not a central file):
   - Find the skill's `SKILL.md` in `plugins/context/skills/` (or `~/.claude/skills/`)
   - Append to its `## Gotchas` section
   - Format: `- **{Pattern name}**: {What happened}. {What should have been used instead}. Signal: {heuristic for next time}.`
4. If the gotcha belongs to a skill outside this plugin (e.g., superpowers), note it in smart context instead
5. Commit the updated skill file(s) with message: `fix({skill}): add gotcha from session {date}`
6. Clear the log: `rm .claude/skill-invocations.log`

If no log exists or all invocations were correct, skip this step.

### 5. Confirm

```
Context parked to .claude/context-park.md
Artifacts linked: {N} files
Smart context: {N} items
Skill audit: {N} gotchas added | clean
Ready to close session.
```
