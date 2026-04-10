---
name: ctx-docs
description: >
  Aggregate completed work into human-readable epic documentation.
  Use when an epic or batch of issues is complete and you want a documentation
  package. Triggers: "document this epic", "generate docs", "ctx-docs",
  or after a batch of issues is shipped.
user-invocable: true
allowed-tools: Bash, Read, Glob, Grep, Write
---

# /ctx-docs — Epic Documentation Aggregation

Synthesize completed work into structured, human-readable docs. Pulls from Linear, specs, plans, git history, and distilled memories.

---

## 1. Parse arguments

Two entry points:

- **Epic mode:** `/ctx-docs <epic-name>` — queries Linear for the epic/project's issues
- **Issue mode:** `/ctx-docs <epic-name> CTX-33 CTX-28 CTX-16` — user provides issue IDs directly

`<epic-name>` is always required — becomes the directory name and index title.

If no issue IDs provided, use the Linear MCP (`mcp__plugin_linear_linear__list_issues`) to find issues belonging to the named epic/project. If Linear is unavailable or returns nothing, ask the user for issue IDs.

---

## 2. Resolve issues

For each issue ID:
1. Fetch metadata from Linear via `mcp__plugin_linear_linear__get_issue` (title, description, status, labels)
2. If Linear unavailable, proceed with issue ID only — artifact discovery still works

---

## 3. Gather artifacts

For each issue, scan these locations:

| Artifact | Location | Match strategy |
|----------|----------|---------------|
| Spec | `docs/specs/*.md` | Grep for issue ID in filename or content |
| Plan | `~/.claude/plugins/marketplaces/ctx-plugin/plans/*.md` | Grep for issue ID in content |
| Park smart context | `docs/ctx/park.md` or git history | Branch name or issue ID reference |
| Git history | `git log --all --oneline --grep="{issue-id}"` | Commit messages |
| Linear metadata | From step 2 | Already fetched |
| Distilled memories | `~/.claude/projects/<project-hash>/memory/*.md` | Grep for issue ID in content or description |

Not every issue will have every artifact. Work with what exists — skip missing artifacts gracefully.

---

## 4. Generate docs

Create `docs/ctx/<epic-name>/` with:

### `index.md`

````markdown
# <Epic Name>

**Generated:** {timestamp}
**Issues:** {N} completed
**Branches:** {list}

## Summary

{2-3 paragraph narrative synthesized from specs and plans}

## Issues

| ID | Title | Complexity | Status | Branch |
|----|-------|-----------|--------|--------|
| ... | ... | ... | ... | ... |

## Key Decisions

{Aggregated from park smart context and spec "Why this approach" sections — only non-obvious decisions}

## Learnings

{Aggregated from distilled memories related to these issues}
````

### Per-issue docs (`<issue-id>.md`)

````markdown
# <issue-id> — {title}

**Status:** {from Linear or git}
**Branch:** {from git}
**Spec:** {relative path to spec file, if found}
**Plan:** {relative path to plan file, if found}

## Design

{From spec — problem, chosen approach, tradeoffs}

## Implementation

{From plan — what was built, key files touched}

## Outcome

{From git log — commits. From park — what actually happened}

## Learnings

{From park smart context + distilled memories}
````

If a section has no data (e.g., no park file found), omit that section rather than writing "N/A".

---

## 5. Commit

```bash
git add docs/ctx/<epic-name>/
git commit -m "docs: <epic-name> epic documentation"
```
