# Example Briefing — Canonical Reference

This is what a good ctx-grab briefing looks like after restoring a parked session.

---

```markdown
## Session Briefing

**Resuming:** bead-icp-refactor / feature/icp-link-scoring
**Last session:** Implemented "link to other ICP" feature on Edit Scoring sidebar

### What was done
- ScoringModeBadge component created — links ocean ↔ air scoring pages
- PipelineMetricsService updated with skipPreviouslyAssigned flag
- ExclusionRow deleted (no other consumers)

### Key decisions (from smart context)
- No backend changes needed — lead-preferences API already serves both IDs
- Reused getWeeksLabel() thresholds, didn't invent new ones
- Query 3 kept alive for admin endpoint dependency

### What's next
1. Run integration tests
2. QA in browser
3. Open PR

### Alignment check
- Is this still the right direction?
- What does "done" look like for this session?
```
