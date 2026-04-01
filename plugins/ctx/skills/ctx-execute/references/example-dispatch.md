# Example Dispatch — Canonical Reference

Shows what a subagent dispatch looks like for each complexity tier and how to handle responses.

---

## LOW task dispatch (1 agent, no review)

```
Dispatch: Agent tool (subagent_type: "general-purpose")

Prompt:
"Execute Task 1 from docs/context/plans/2026-03-28-icp-link.md.

Task: Remove ExclusionRow component [LOW]

Files:
- Delete: src/components/scoring/ExclusionRow.tsx
- Modify: src/components/scoring/PipelineInsightPanel.tsx

Steps:
1. Grep for ExclusionRow imports — confirm only PipelineInsightPanel uses it
2. Remove the import and <ExclusionRow /> render from PipelineInsightPanel
3. Delete ExclusionRow.tsx
4. Run: pnpm type-check — expect PASS
5. Commit: refactor: remove ExclusionRow component

Report back: DONE, DONE_WITH_CONCERNS, or BLOCKED (with details)."
```

### Expected response — DONE:
```
DONE. ExclusionRow removed. Only consumer was PipelineInsightPanel.
type-check passes. Committed as refactor: remove ExclusionRow component.
```

## MED task dispatch (implement + review)

```
Agent 1 (implement): same format as above, with full task text

Agent 2 (review): 
"Review the changes from Task 3 in docs/context/plans/2026-03-28-icp-link.md.

Read the modified files:
- src/components/scoring/PipelineInsightPanel.tsx
- tests/components/scoring/PipelineInsightPanel.test.tsx

Check:
- Does the implementation match the plan?
- Are there any regressions or missed edge cases?
- Do tests cover the new behavior?

Report: APPROVED, or list specific issues to fix."
```

### Expected response — DONE_WITH_CONCERNS:
```
DONE_WITH_CONCERNS. Implementation matches plan. Test passes.
Concern: getWeeksLabel returns "< 1 week" for available=0, which renders
as a valid label. Should this case show "No leads" instead? Not in spec
but worth flagging.
```

**How to handle:** Surface the concern to the user. Don't auto-fix — it's a design question.
