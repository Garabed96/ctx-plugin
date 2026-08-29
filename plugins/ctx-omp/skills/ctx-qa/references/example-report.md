# Example QA Report — Canonical Reference

This is what a good QA report looks like. Passes the "WTF gate" — only real bugs, not nitpicks.

---

```markdown
# QA Report — Edit Scoring Page

**Date:** 2026-03-28
**Tier:** Standard
**URL tested:** http://localhost:3000/scoring/edit/ocean-123
**Branch:** feature/icp-link-scoring

## Summary

3 issues found (1 high, 1 medium, 1 low). Page is functional but has a data
display regression on narrow viewports.

## Issues

### HIGH: Pipeline weeks label truncated on mobile (< 768px)
- **Page:** Edit Scoring → Sidebar → Pipeline Insight Panel
- **Steps:** Resize browser to 375px width, observe sidebar
- **Expected:** "~2-3 months" label wraps or abbreviates
- **Actual:** Text overflows container, clipped by `overflow: hidden`
- **Screenshot:** `qa-reports/screenshots/truncated-label.png`

### MEDIUM: ScoringModeBadge links to 404 when no air scoring exists
- **Page:** Edit Scoring → Sidebar → Mode badge
- **Steps:** Open an ocean-only account's scoring page, click air badge
- **Expected:** Badge hidden or disabled when other mode has no scoring
- **Actual:** Badge renders with link to `/scoring/edit/undefined`
- **Root cause:** `air_scoring_definition_id` is null, not checked

### LOW: ExclusionRow ghost margin remains after component removal
- **Page:** Edit Scoring → Sidebar → below Pipeline Insight Panel
- **Steps:** Inspect sidebar layout, note 24px gap
- **Expected:** No gap where ExclusionRow was
- **Actual:** Parent div still has `margin-bottom: 24px` from old layout
- **Fix:** Remove `mb-6` class from `PipelineInsightPanel` wrapper

## Passed Checks

- [x] Pipeline insight panel loads with weeks-based language
- [x] Sidebar data matches leads page data
- [x] Admin endpoint still returns exclusion data
- [x] Page load time < 2s
```
