# Product Checkpoint Artifact Contract

## Packet shape

Keep one feature or initiative in one Obsidian folder:

```text
<Issue or Initiative> Review/
├── <Issue> Status and Evidence.md
├── <Focused Decision>.md
├── Evidence/
│   └── <QA run or state>/
├── Assets/
│   └── <current and generated design images>
├── Planning/
│   └── <linked PRDs, specs, or handoffs when locally mirrored>
└── HTML/
    └── <interactive artifacts when supplied>
```

Create only the directories the packet needs. A shared multi-ticket hub may link several status and decision notes when their boundaries are explicit.

## Frontmatter

Use concise metadata that helps search and maintenance:

```yaml
---
title: <human title>
created: YYYY-MM-DD
updated: YYYY-MM-DD
tags:
  - <project>
  - <issue>
  - product-checkpoint
status: draft | review | qa-blocked | ready | shipped | archived
issue: <issue id when known>
branch: <branch when relevant>
commit: <verified commit when relevant>
sync: SYNCED | UNSYNCED
---
```

Omit unknown optional fields rather than inventing them.

## Evidence rules

- Link directly to primary sources where possible.
- Put captions beneath screenshots that say what the image proves.
- Use screenshots for visible states, tests for contracts, logs for runtime events, and persisted records for durability.
- A screenshot proves only the state visible in that frame.
- A code path proves implementation, not successful runtime behavior.
- A passing focused test proves its asserted contract, not the full user journey.
- Label inference and hypothesis in prose.

## Design direction rules

- Store the current-state capture and generated directions under `Assets/`.
- Use descriptive filenames such as `personal-memory-current.png` and `personal-memory-direction-2-checklist.png`.
- Embed each image exactly once in its decision note.
- Keep one trade-off immediately below each image.
- Record selection as `**Owner decision (DD Mon YYYY): ...**` with the accepted cost.
- Do not label a direction approved until the user selects it.

## Checkpoint history

Use an append-only table for material transitions:

```markdown
## Checkpoint history

| Date | State | Evidence or decision |
| --- | --- | --- |
| 2026-08-20 | QA blocked | Browser QA found one user-impacting edit-path defect. |
```

Record changes such as implementation complete, QA blocked, blocker fixed, design selected, approved, merged, or shipped. Do not log formatting edits or every test rerun.

## Projection rules

Every communication summary must agree with the checkpoint on:

- current status;
- user-visible change;
- verified limitation or blocker;
- adjacent-ticket boundary;
- next action.

Link back to the checkpoint when the target supports links. Keep implementation detail only when it changes a decision.

## Synchronization

`SYNCED` means the Markdown and every referenced local asset exist in the intended Obsidian destination. A generated chat image, staging file, or unresolved link is not synced.

Never overwrite an unrelated vault note. Update known packet files in place and preserve user-authored material outside the affected sections.
