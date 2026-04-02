# Example Handoff — Canonical Reference

This is what a good ctx-park handoff looks like. 5 smart context items, not 20.

---

```markdown
# Context Park — bead-icp-refactor

**Parked:** 2026-03-28T14:30:00Z
**Branch:** feature/icp-link-scoring
**Session:** Implemented "link to other ICP" feature on Edit Scoring sidebar

## Artifacts

- `docs/ctx/plans/2026-03-28-icp-link.md` — implementation plan (3 tasks, all LOW)
- `src/components/scoring/ScoringModeBadge.tsx` — new component, links to other mode's scoring page
- `src/services/PipelineMetricsService.ts` — added skipPreviouslyAssigned flag

## Smart Context

1. `/api/user/lead-preferences` already returns both `ocean_scoring_definition_id` and `air_scoring_definition_id` — no backend changes were needed. Discovered by tracing TransportBadges → useLeadPreferences → API endpoint.
2. Used `getWeeksLabel()` from pipeline utils instead of creating new thresholds — thresholds are 4/8/16 weeks, derived from the utility not invented.
3. ExclusionRow component was deleted entirely, not hidden — it had no other consumers.
4. Admin endpoint still depends on Query 3 — used `skipPreviouslyAssigned` flag instead of removing the query.
5. CTO prefers weeks-based language over raw counts across all pipeline views — this is a pattern to follow in future scoring work.

## Next Steps

1. Run integration tests for scoring page: `pnpm test:integration tests/scoring/`
2. QA the Edit Scoring sidebar in browser — verify badge links to correct scoring page
3. Open PR against `main` — low risk, 3 files changed
```
