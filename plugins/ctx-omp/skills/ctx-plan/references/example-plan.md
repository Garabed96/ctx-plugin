# Example Plan — Canonical Reference

This example demonstrates the required execution graph, ownership lifecycle, interface edges, review batching, and verification levels.

---

```markdown
---
status: active
branch: null
worktree: null
created: 2026-07-16
topic: pipeline-weeks-label
---

# Pipeline Weeks Label Implementation Plan

> **For agentic workers:** Execute this plan's graph and scheduling policy through `/ctx-execute` after `/ctx-worktree` links the plan.

**Goal:** Replace the raw available-company count with a weeks-of-pipeline label while preserving admin exclusion metrics.
**Architecture:** Add two independent foundation interfaces—a service option and a formatting utility—then consume both in one UI integration task. Keep broad verification at the integration review boundary.
**Tech Stack:** TypeScript, React, TanStack Query, Vitest
**Total tasks:** 3 ([1 LOW] [2 MED] [0 HIGH])
**Critical path:** T1 + T2 -> T3
**Maximum safe parallelism:** 2 tasks
**Review batches:** 1
**Estimated agent budget:** 5 agents

## Requirements and Boundaries

- R1: The scoring panel shows a weeks label instead of the raw available count.
- R2: The scoring request can skip previously assigned-company exclusion work.
- R3: Admin metrics retain the current exclusion calculation by default.
- Excluded: Changing weeks thresholds, admin UI, or pipeline query semantics beyond the new option.

## Execution Summary

- Wave 1: Run T1 and T2 concurrently; they own disjoint files and publish independent interfaces.
- Wave 2: Run T3 after both interfaces are GREEN, accepted, and released.
- Review B1: Verify the integrated UI behavior, affected types/lint, and the cumulative diff once.

## Execution Graph

| Task | Depends on | Chain | Ownership | Interface dependency | Parallel-safe with | Wave | Review batch |
|---|---|---|---|---|---|---|---|
| T1 | — | metrics-contract | exclusive service + unit test | produces `GetMetricsOptions.skipPreviouslyAssigned` | T2 | 1 | B1 |
| T2 | — | weeks-format | exclusive utility + unit test | produces `getWeeksLabel(count)` | T1 | 1 | B1 |
| T3 | T1, T2 | scoring-ui | exclusive component + component test | consumes T1 option and T2 utility | none | 2 | B1 |

## Task Specifications

### Task T1: Add the metrics exclusion option `[MED]`

**Chain:** metrics-contract
**Depends on:** none
**Unlocks:** T3
**Parallel-safe with:** T2
**Review batch:** B1

**Ownership:**
- Exclusive: `src/services/PipelineMetricsService.ts` — shared service contract; `tests/services/PipelineMetricsService.test.ts` — task-owned unit test
- Shared: none
- Expected new files: none
- Acquire: Both exclusive files before editing
- Hold: Until targeted GREEN and the contract diff is accepted
- Release: After `skipPreviouslyAssigned` defaults to `false` and the focused test passes

**Interfaces:**
- Produces: `GetMetricsOptions.skipPreviouslyAssigned?: boolean`
- Consumes: none

**Files:**
- Modify: `src/services/PipelineMetricsService.ts`
- Test: `tests/services/PipelineMetricsService.test.ts`

**Steps:**
- [ ] Add a failing test proving `skipPreviouslyAssigned: true` omits the exclusion subquery while the default path retains it
- [ ] Run `pnpm test:unit tests/services/PipelineMetricsService.test.ts` — expect RED
- [ ] Add the optional flag and guard only the exclusion subquery
- [ ] Run `pnpm test:unit tests/services/PipelineMetricsService.test.ts` — expect GREEN
- [ ] Inspect the scoped diff for unchanged default behavior
- [ ] Release ownership

**Targeted verification:** `pnpm test:unit tests/services/PipelineMetricsService.test.ts`
**Completion criteria:** Both option paths pass and the public options type exposes the optional boolean.
**Commit:** `feat: add pipeline exclusion option`
**Context:** Publishes the service contract T3 needs without coupling it to UI work.

### Task T2: Add the weeks-label formatter `[LOW]`

**Chain:** weeks-format
**Depends on:** none
**Unlocks:** T3
**Parallel-safe with:** T1
**Review batch:** B1

**Ownership:**
- Exclusive: `src/utils/pipeline.ts` — production utility; `tests/utils/pipeline.test.ts` — task-owned unit test
- Shared: none
- Expected new files: none
- Acquire: Both exclusive files before editing
- Hold: Until threshold cases are GREEN and the utility diff is accepted
- Release: After the focused test proves existing 4/8/16-week thresholds

**Interfaces:**
- Produces: `getWeeksLabel(count: number): string`
- Consumes: none

**Files:**
- Modify: `src/utils/pipeline.ts`
- Test: `tests/utils/pipeline.test.ts`

**Steps:**
- [ ] Add failing boundary assertions for the existing 4/8/16-week thresholds
- [ ] Run `pnpm test:unit tests/utils/pipeline.test.ts` — expect RED
- [ ] Implement and export `getWeeksLabel(count)` without changing thresholds
- [ ] Run `pnpm test:unit tests/utils/pipeline.test.ts` — expect GREEN
- [ ] Inspect the scoped diff for stable label copy and boundaries
- [ ] Release ownership

**Targeted verification:** `pnpm test:unit tests/utils/pipeline.test.ts`
**Completion criteria:** Boundary cases pass and the formatter is exported for UI consumers.
**Commit:** `feat: add pipeline weeks formatter`
**Context:** Publishes an independent formatting interface so service and utility work can proceed concurrently.

### Task T3: Integrate the weeks label in the scoring panel `[MED]`

**Chain:** scoring-ui
**Depends on:** T1, T2
**Unlocks:** B1
**Parallel-safe with:** none
**Review batch:** B1

**Ownership:**
- Exclusive: `src/components/scoring/PipelineInsightPanel.tsx` — production component; `tests/components/scoring/PipelineInsightPanel.test.tsx` — task-owned component test
- Shared: none
- Expected new files: none
- Acquire: Both exclusive files after T1 and T2 release their interfaces
- Hold: Until component behavior is GREEN and the integrated diff is accepted
- Release: After the panel consumes both released interfaces and no raw count is rendered

**Interfaces:**
- Produces: User-visible weeks label behavior
- Consumes: T1 `GetMetricsOptions.skipPreviouslyAssigned`; T2 `getWeeksLabel(count)`

**Files:**
- Modify: `src/components/scoring/PipelineInsightPanel.tsx`
- Test: `tests/components/scoring/PipelineInsightPanel.test.tsx`

**Steps:**
- [ ] Add a failing component test asserting the weeks label and the metrics option
- [ ] Run `pnpm test:unit tests/components/scoring/PipelineInsightPanel.test.tsx` — expect RED
- [ ] Pass `skipPreviouslyAssigned: true` and render `getWeeksLabel(data.available)`
- [ ] Run `pnpm test:unit tests/components/scoring/PipelineInsightPanel.test.tsx` — expect GREEN
- [ ] Inspect the scoped diff against R1-R3 and excluded scope
- [ ] Release ownership

**Targeted verification:** `pnpm test:unit tests/components/scoring/PipelineInsightPanel.test.tsx`
**Completion criteria:** The panel renders the weeks label, requests the skip path, and preserves loading/error behavior.
**Commit:** `feat: show weeks-based pipeline language`
**Context:** Integrates the two released foundation interfaces at the only user-facing ownership boundary.

## Review Batches

### B1: Pipeline weeks-label integration

**Includes:** T1, T2, T3
**Unlocks:** Final verification

**Verification:**
- `pnpm test:unit tests/services/PipelineMetricsService.test.ts tests/utils/pipeline.test.ts tests/components/scoring/PipelineInsightPanel.test.tsx`
- `pnpm type-check`
- `pnpm lint -- src/services/PipelineMetricsService.ts src/utils/pipeline.ts src/components/scoring/PipelineInsightPanel.tsx`

**Review scope:** Review the cumulative diff for default admin behavior, threshold stability, contract compatibility, and UI copy. Fresh-context review is optional because the graph has no HIGH task.
**Pass criteria:** All commands pass, R1-R3 are demonstrated, and no excluded behavior changed.

## Scheduling Policy

Run dependent tasks sequentially. Run ready tasks concurrently only when dependencies are satisfied, exclusive ownership does not overlap, shared files do not overlap, interface dependencies are released, and there is one writer per file and dependent chain. Release ownership immediately after targeted GREEN and scoped diff acceptance. Treat waves as advisory; start newly-ready tasks dynamically. Run broad verification at review-batch boundaries and final release, not after every unchanged task.

## Final Verification

- Run `pnpm test` once after B1 passes.
- Confirm `git diff --check` passes.
- Confirm every requirement maps to passing evidence and excluded scope is absent from the cumulative diff.

## Handoff

**Audit posture:** Additional `/ctx-ruthless` audit is optional because the plan is narrow, contains no HIGH task, and isolates two foundation interfaces before integration.

Create and link a worktree, then execute the authoritative graph. A persistent goal should say: "Execute the pipeline-weeks-label plan graph and scheduling policy to final verification."
```
