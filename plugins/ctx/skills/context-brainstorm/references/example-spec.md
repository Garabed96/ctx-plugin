# Example Spec — Canonical Reference

This is what a good brainstorm spec looks like. Use as a template, not a copy-paste.

---

```markdown
# Lead Pipeline Display Redesign

**Date:** 2026-03-15
**Status:** Approved
**Complexity:** [LOW] sidebar change, [MED] data transformation

## Problem

The Edit Scoring page shows raw lead counts (e.g., "336") which don't convey
pipeline health. The Leads page already solved this with `getWeeksLabel()` which
converts counts to time-based language ("~2-3 months").

## Decision

Reuse `getWeeksLabel()` from `src/utils/pipeline.ts` — don't create new thresholds.
Feed `data.available` directly into existing thresholds.

**Why not a new utility?** `getWeeksLabel()` already handles the edge cases
(zero leads, overflow, rounding). Pattern audit confirmed no gaps.

## Design

### Component: PipelineInsightPanel
- Remove ExclusionRow component entirely (dead code after this change)
- Replace numeric `<span>{count}</span>` with `<span>{getWeeksLabel(available)}</span>`
- Import `getWeeksLabel` from existing `src/utils/pipeline.ts`

### Service: PipelineMetricsService
- Add `skipPreviouslyAssigned: true` flag to Query 3 options
- Don't remove Query 3 — admin endpoint depends on it

### Data flow
```
PipelineMetricsService.getMetrics(scoringId, { skipPreviouslyAssigned: true })
  → ClickHouse Query 3 (skips exclusion calc)
  → { available: number }
  → PipelineInsightPanel
  → getWeeksLabel(available)
  → "~2-3 months"
```

## Success Criteria

- [ ] "WHY NOT MORE?" card no longer renders
- [ ] Lead count shows weeks-based language, not raw numbers
- [ ] No regression on admin endpoint that uses Query 3
- [ ] getWeeksLabel thresholds unchanged

## Complexity Tags

- [LOW] Remove ExclusionRow component and its render call
- [LOW] Add skipPreviouslyAssigned flag to service
- [MED] Replace count display with getWeeksLabel — needs data flow verification
```
