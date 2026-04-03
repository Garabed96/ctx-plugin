# Global Plan Storage & Session Recovery

**Date:** 2026-04-03
**Status:** Approved
**Complexity:** [LOW] ctx-plan path, [MED] ctx-execute lookup, [MED] ctx-worktree linking, [MED] ctx-resume

## Problem

Plans are stored inside worktrees (`docs/ctx/plans/`), so they're lost when a worktree is deleted or an iTerm session crashes. `/ctx-execute` receives a slim park file summary instead of the full plan when launching a new session. There's no way to list and resume active work after a crash.

## Decision

Move plan storage to a global plugin directory. Plans are named by topic slug, linked to branches via frontmatter. A new `/ctx-resume` skill lists active plans for crash recovery.

**Why global, not per-worktree?** Plans are created before worktrees exist (`/ctx-plan` runs before `/ctx-worktree`). Plans must survive worktree deletion. Multiple sessions may need to reference the same plan.

**Why topic slug, not branch name?** The branch doesn't exist when the plan is written. The topic slug is the immutable identifier; the branch links to it later.

## Design

### Plan Storage Location

```
~/.claude/plugins/marketplaces/ctx-plugin/plans/
  download-csv-email-opens.md
  bug-history-ledger.md
```

### Plan File Format

Frontmatter added to existing plan content:

```yaml
---
status: active          # active | completed | abandoned
branch: null            # null until worktree created, then e.g. feat/download-csv-email-opens
worktree: null          # null until created, then absolute path
created: 2026-04-03
topic: download-csv-email-opens
---
```

Plan body follows existing `/ctx-plan` format unchanged (header, tasks, complexity tags, TDD steps).

### Skill Changes

#### `/ctx-plan` — write to global path `[LOW]`

Current: `docs/ctx/plans/YYYY-MM-DD-<feature>.md`
New: `~/.claude/plugins/marketplaces/ctx-plugin/plans/<topic-slug>.md`

- Derive topic slug from feature name (lowercase, hyphenated)
- Add frontmatter block: `status: active`, `branch: null`, `worktree: null`, `created: <date>`, `topic: <slug>`
- Plan body format unchanged
- Update handoff output to show global path

#### `/ctx-execute` — read plan from global path `[MED]`

Step 1 ("Read the plan") changes:

1. Get current branch: `git branch --show-current`
2. Search global plans for frontmatter where `branch` matches current branch
3. If found: read full plan, proceed with execution
4. If not found: list all `status: active` plans, ask user to pick
5. On final verification pass: update plan frontmatter `status: active` → `status: completed`

#### `/ctx-worktree` — link branch to plan `[MED]`

After worktree creation:

1. Scan `~/.claude/plugins/marketplaces/ctx-plugin/plans/` for `status: active` + `branch: null`
2. If exactly one unlinked plan: update `branch` and `worktree` fields in frontmatter
3. If multiple unlinked plans: ask user which plan this worktree is for
4. If zero: no-op (worktree created for ad-hoc work, not from a plan)

#### New: `/ctx-resume` — crash recovery `[MED]`

```
User: /ctx-resume
Skill: lists plans where status=active
  1. download-csv-email-opens (2026-04-03, feat/download-csv-email-opens)
  2. bug-history-ledger (2026-04-03, feat/bug-history-ledger)
User: 1
Skill:
  - worktree exists? → launch via worktree-open.sh
  - worktree gone, branch exists? → recreate worktree from branch → launch
  - neither? → offer to create fresh worktree
```

### Data Flow

```
/ctx-brainstorm → writes spec to docs/specs/ (committed to main)
    ↓
/ctx-plan → writes plan to ~/.../ctx-plugin/plans/<topic>.md
            frontmatter: status=active, branch=null
    ↓
/ctx-worktree → creates worktree
              → updates plan frontmatter: branch=X, worktree=Y
    ↓
/ctx-execute → reads plan from global path (matched by branch)
             → dispatches agents with FULL plan content
             → on completion: status=completed
    ↓
(crash happens at any point)
    ↓
/ctx-resume → lists active plans → user picks → relaunches
```

### What Doesn't Change

- Plan content format (headers, task structure, complexity tags, TDD steps)
- `/ctx-park` and `/ctx-grab` (slim handoffs for human session pauses)
- `worktree-open.sh` and `worktree-create.sh`
- Agent dispatch logic in `/ctx-execute` (only the plan reading step changes)

## Success Criteria

- [ ] `/ctx-plan` writes plans to global plugin directory
- [ ] Plans have frontmatter with status, branch, worktree, created, topic
- [ ] `/ctx-execute` reads full plan from global path, matched by branch
- [ ] `/ctx-resume` lists active plans and relaunches into correct worktree
- [ ] `worktree-open.sh` is the single launch mechanism (no inline osascript)
- [ ] Crashed session is recoverable from any terminal via `/ctx-resume`

## Complexity Tags

- `[LOW]` ctx-plan output path + frontmatter — one path change, add template
- `[MED]` ctx-execute plan lookup — branch matching, fallback list, status update
- `[MED]` ctx-worktree frontmatter linking — scan plans, update fields
- `[MED]` ctx-resume — new skill (list, filter, launch)
