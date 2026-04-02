---
name: ctx-grab
description: >
  Use when starting a new session to continue work from a previous session.
  Reads the handoff file left by /ctx-park.
user-invocable: true
allowed-tools: Bash, Read, Glob
---

# /ctx-grab — Restore Session Context

Delegates file operations to `${CLAUDE_PLUGIN_ROOT}/scripts/grab-restore.sh`. This skill handles interpretation.

**Announce at start:** "Grabbing context from previous session."

## 1. Run the script

The script is at `${CLAUDE_PLUGIN_ROOT}/scripts/grab-restore.sh`.

```bash
bash ${CLAUDE_PLUGIN_ROOT}/scripts/grab-restore.sh
```

If exit code 1: no handoff found. Say "No parked context — starting fresh. What are we working on?" and stop.

The script outputs `status`, `branch`, `worktree`, `archive` metadata, then `---handoff---` and `---git-log---` sections.

## 2. Follow artifact links (judgment)

From the handoff content, read artifacts selectively — priority order:

1. **Active plan** — status/progress section only, not the full plan
2. **Smart context** — highest-value, already in the handoff
3. **Git log** — already provided by the script
4. **Docs** — only if referenced in smart context

DO NOT read every linked file. Stop when you have enough context.

## 3. Present briefing and align

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

Wait for user confirmation. Do not proceed autonomously after a grab.
