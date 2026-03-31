# Example PR — Canonical Reference

This is what a good PR description looks like from context-ship.

---

```markdown
## Summary

- Remove "WHY NOT MORE?" exclusion breakdown from Edit Scoring sidebar — speeds up page load by skipping the exclusion ClickHouse query
- Replace raw lead count ("336") with weeks-based pipeline language ("~2-3 months") using existing `getWeeksLabel()` utility
- Add ScoringModeBadge linking ocean ↔ air scoring pages

## Changes

- **PipelineInsightPanel.tsx** — removed ExclusionRow render, replaced count display with getWeeksLabel()
- **PipelineMetricsService.ts** — added `skipPreviouslyAssigned` flag to skip exclusion calc
- **ScoringModeBadge.tsx** — new component, reads both scoring IDs from lead-preferences API
- **ExclusionRow.tsx** — deleted (no other consumers)

## Risk level

**Low.** 3 files modified, 1 deleted, 1 created. All changes are frontend except one flag addition to an existing service method. Admin endpoint unaffected (Query 3 still runs when flag is false).

## Validation

```bash
pnpm type-check                    # PASS
pnpm test:unit tests/scoring/      # PASS (4 tests)
pnpm test:integration tests/scoring/ # PASS
```

Manual QA: Edit Scoring page loads, shows weeks label, badge links correctly.

## Rollback plan

Revert this PR. No migrations, no schema changes, no API contract changes.
```
