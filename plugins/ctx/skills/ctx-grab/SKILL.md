---
name: ctx-grab
description: >
  Use when starting a new session to continue work from a previous session.
  Reads the handoff file left by /ctx-park.
user-invocable: true
allowed-tools: Bash, Read, Glob, Write
---

# /ctx-grab — Restore Session Context

**Canonical example:** Read `references/example-briefing.md` for what a good session briefing looks like.

Grab context from a previous session's `/ctx-park` handoff.

**Announce at start:** "Grabbing context from previous session."

## Workflow

### 1. Find the handoff

```bash
ls .claude/ctx-park.md 2>/dev/null
```

If no handoff file exists:

```
No parked context found in this worktree.
Starting fresh — what are we working on?
```

Stop here.

### 2. Read the handoff

Read `.claude/ctx-park.md`. Note:
- Session summary (what was the previous session about)
- Artifact paths (what files exist)
- Smart context (decisions, rationale, blockers)
- Next steps (what to do first)

### 3. Follow artifact links (selectively)

Read artifacts in priority order. Stop when you have enough context:

1. **Active plan** — read the status/progress section, not the entire plan
2. **Smart context** — this is the highest-value section, already read
3. **Recent git log** — `git log --oneline -5` for what changed since park
4. **Docs/changelogs** — skim if referenced in smart context

DO NOT read every linked file. Read what's needed to understand
current state and next steps.

### 4. Archive the handoff

```bash
mv .claude/ctx-park.md ".claude/ctx-park-$(date +%Y-%m-%d).md"
```

### 5. Present briefing and align

Present a concise briefing, then run ctx-engineering gates:

```
## Restored Context

**Previous session:** {summary}
**Branch:** {branch} | **Parked:** {date}

**Smart context:**
- {key item 1}
- {key item 2}

**Next steps:**
1. {first priority}
2. {second priority}

---

Before we proceed:
- Is this still the right direction?
- What does "done" look like for this session?
```

Wait for user confirmation before starting work. Do not proceed
autonomously after a grab — the user may want to change direction.
