# Example Plan — Canonical Reference

This is what a good implementation plan looks like. Note: complexity tags, exact paths, TDD steps.

---

```markdown
# ICP Link Feature Implementation Plan

> **For agentic workers:** Use ctx-execute to implement this plan task-by-task.

**Goal:** Add a badge to the Edit Scoring sidebar that links to the other transport mode's scoring page
**Architecture:** Frontend-only change. Reuse existing lead-preferences API data and pipeline utilities.
**Tech Stack:** React, TanStack Query (existing useLeadPreferences hook)
**Total tasks:** 3 ([2 LOW] [1 MED])
**Estimated agent budget:** 4 agents (2×1 for LOW, 1×2 for MED)

---

### Task 1: Remove ExclusionRow component `[LOW]`

**Files:**
- Delete: `src/components/scoring/ExclusionRow.tsx`
- Modify: `src/components/scoring/PipelineInsightPanel.tsx`

**Steps:**
- [ ] Grep for ExclusionRow imports — confirm only PipelineInsightPanel uses it
- [ ] Remove the import and `<ExclusionRow />` render from PipelineInsightPanel
- [ ] Delete `ExclusionRow.tsx`
- [ ] Run: `pnpm type-check` — expect PASS
- [ ] Commit: `refactor: remove ExclusionRow component`

**Context:** ExclusionRow shows "WHY NOT MORE?" breakdown. No longer needed after removing exclusion filtering.

### Task 2: Add skipPreviouslyAssigned flag `[LOW]`

**Files:**
- Modify: `src/services/PipelineMetricsService.ts:89-95`

**Steps:**
- [ ] Add `skipPreviouslyAssigned?: boolean` to `GetMetricsOptions` interface
- [ ] In `getMetrics()`, when flag is true, skip the exclusion subquery in Query 3
- [ ] Run: `pnpm test:unit tests/services/PipelineMetricsService.test.ts` — expect PASS
- [ ] Commit: `feat: add skipPreviouslyAssigned flag to pipeline metrics`

**Context:** Query 3 calculates exclusions. Admin endpoint still needs it, so we skip with a flag rather than removing.

### Task 3: Replace count with weeks label `[MED]`

**Files:**
- Modify: `src/components/scoring/PipelineInsightPanel.tsx`
- Test: `tests/components/scoring/PipelineInsightPanel.test.tsx`

**Steps:**
- [ ] Write failing test: render PipelineInsightPanel with `available: 50`, assert text contains "~" (weeks label format)
- [ ] Run: `pnpm test:unit tests/components/scoring/PipelineInsightPanel.test.tsx` — expect FAIL
- [ ] Import `getWeeksLabel` from `src/utils/pipeline.ts`
- [ ] Replace `{data.available}` with `{getWeeksLabel(data.available)}`
- [ ] Pass `skipPreviouslyAssigned: true` to the metrics hook
- [ ] Run test — expect PASS
- [ ] Run: `pnpm type-check` — expect PASS
- [ ] Commit: `feat: show weeks-based pipeline language on scoring page`

**Context:** Reuses existing utility. Thresholds are 4/8/16 weeks — don't modify them.
```
