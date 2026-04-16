---
name: ctx-park
description: >
  Use when closing a session, when context is getting large, or when
  altitude oscillation suggests a fresh start.
user-invocable: true
allowed-tools: Bash, Read, Glob, Write
---

# ctx-park — Save Session Context

Delegates artifact scanning to `../../scripts/park-scan.sh`. This skill handles context distillation.

**Announce at start:** "Parking context for this session."

## 1. Scan artifacts

The script is at `../../scripts/park-scan.sh`.

```bash
bash ../../scripts/park-scan.sh --clean-log
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

## 4. Distill learnings (judgment)

Review the session for non-obvious learnings. Apply the filter: **"Would a future agent make the wrong decision without this knowledge?"**

**Capture:**
- Assumptions that turned out wrong and why
- Patterns that worked unexpectedly well
- Constraints discovered during implementation (not in specs/docs)
- Corrections the user made to agent behavior

**Skip:**
- Anything derivable from reading the code or git log
- Solutions already in committed code
- Obvious patterns the next agent would figure out from context
- Verbose explanations (1-2 sentences per learning max)

If nothing meets the filter, output `Distill: clean` and move to step 5.

### 4b. Route to memory

For each learning, write a memory file to `~/.codex/ctx-codex/projects/<project-hash>/memory/`:

```markdown
---
name: {learning title}
description: {one-line — specific enough for future relevance matching}
type: feedback
---

{The learning. 1-2 sentences.}

**Why:** {What happened that surfaced this.}
**How to apply:** {When this matters in future sessions.}
```

Derive `<project-hash>` from `PROJECT_ROOT` using `echo "$PROJECT_ROOT" | tr '/' '-'`.

Update `MEMORY.md` index with a pointer to the new file. If `MEMORY.md` doesn't exist yet (first distill for this project), create it.

### 4c. Gotcha promotion (prompt-based, on recurrence)

Before writing a new memory, scan existing memories **in the current project only** for similar themes. Compare the new learning against existing memories and ask:

> "Does this new learning match a pattern already captured in an existing memory? If yes, which one — and has this now occurred enough times (2+) to be promoted to a gotcha in the relevant skill file?"

- **No match:** Write as new memory. Done.
- **Match found, first recurrence:** Update the existing memory to note the second occurrence. Don't promote yet.
- **Match found, 2+ occurrences:** Promote to gotcha — append to the relevant skill's `## Gotchas` section following the existing format (bolded title + explanation). Delete or archive the staging memory.

## 5. Skill audit (judgment)

If `---skill-log---` was not `none`: assess each invocation — was it the right skill for the task scope? If wrong, append a gotcha to that skill's `## Gotchas` section.

## 6. Confirm

```
Context parked to docs/ctx/park.md
Artifacts linked: {N} files
Smart context: {N} items
Distill: {N} memories written | {N} gotchas promoted | clean
Skill audit: {N} gotchas added | clean
Ready to close session.
```
