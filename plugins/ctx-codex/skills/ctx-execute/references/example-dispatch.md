# Example Dispatch — Codex Reference

Shows what a worker or reviewer dispatch should look like in Codex.

---

## MED or HIGH implementation worker

Use `spawn_agent` with `agent_type: "worker"` and a bounded file ownership list.

```text
Implement Task 3 from ~/.codex/ctx-codex/plans/2026-03-28-icp-link.md.

You are responsible for:
- src/components/scoring/PipelineInsightPanel.tsx
- tests/components/scoring/PipelineInsightPanel.test.tsx

Task:
- Write the failing test described in the plan
- Make the minimal implementation change
- Run the exact test command from the plan
- Report one of: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, BLOCKED

Constraints:
- You are not alone in the codebase
- Do not revert unrelated edits
- Do not edit files outside the ownership list unless you report why first
```

Expected success response:

```text
DONE. Implemented the weeks-label change in PipelineInsightPanel, added the targeted test,
and the specified test command passes.
Changed files:
- src/components/scoring/PipelineInsightPanel.tsx
- tests/components/scoring/PipelineInsightPanel.test.tsx
```

---

## Focused reviewer

Use `spawn_agent` with `agent_type: "explorer"` for a bounded question.

```text
Review Task 3 from ~/.codex/ctx-codex/plans/2026-03-28-icp-link.md.

Focus:
- Does the implementation match the plan?
- Are there obvious regressions or missing edge cases?
- Are the targeted tests covering the intended behavior?

Read:
- src/components/scoring/PipelineInsightPanel.tsx
- tests/components/scoring/PipelineInsightPanel.test.tsx

Return:
- APPROVED
- or ISSUES: [specific issue list]
```

Expected concern response:

```text
ISSUES:
- The new label path handles positive counts but still renders a misleading label for zero available items.
  The plan did not mention that case, so either update the plan or add an explicit product decision before shipping.
```
