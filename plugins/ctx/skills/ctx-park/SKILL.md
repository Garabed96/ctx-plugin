---
name: ctx-park
description: >
  Use when closing a session, when context is getting large, or when
  altitude oscillation suggests a fresh start.
user-invocable: true
allowed-tools: Bash, Read, Glob, Write
---

# /ctx-park — Save Session Context

Delegates artifact scanning to `scripts/park-scan.sh`. This skill handles context distillation.

**Announce at start:** "Parking context for this session."

## 1. Scan artifacts

The script is at `../../scripts/park-scan.sh` relative to this skill's base directory.

```bash
bash <base-directory>/../../scripts/park-scan.sh --clean-log
```

The script outputs `key=value` metadata, `---artifacts---` section, and `---skill-log---` section.

## 2. Distill smart context (judgment)

From the current conversation, extract ONLY what is NOT captured in files:

- Decisions made and their rationale
- Approaches tried that failed (and why)
- Current blockers or open questions
- What should happen next

**Exclude:** info already in plans/docs, committed code, general project knowledge.
Be ruthless — 5 items beats a 20-item dump.

## 3. Write handoff

Write to the `handoff_path` from scan output (`docs/ctx/park.md`):

```markdown
# Context Park — {worktree}

**Parked:** {timestamp}
**Branch:** {branch}
**Session:** {One sentence — what this session accomplished}

## Artifacts

{Relevant paths from scan — skip anything not touched this session.}

## Smart Context

{Numbered list. Each item: decision/insight + why.}

## Next Steps

{Ordered — what the next agent should do first.}
```

## 4. Skill audit (judgment)

If `---skill-log---` was not `none`: assess each invocation — was it the right skill for the task scope? If wrong, append a gotcha to that skill's `## Gotchas` section.

## 5. Confirm

```
Context parked to docs/ctx/park.md
Artifacts linked: {N} files
Smart context: {N} items
Skill audit: {N} gotchas added | clean
Ready to close session.
```
