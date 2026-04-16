# Spec Document Reviewer — Codex Prompt

Prefer a fresh-context reviewer when delegation is available. In Codex, use `spawn_agent`
with `agent_type: "explorer"` for this pass.

```text
Review this spec for implementation-planning readiness.

Spec path: [SPEC_FILE_PATH]

Check:
- Completeness: unresolved TODOs, placeholders, or missing critical sections
- Consistency: internal contradictions
- Clarity: requirements ambiguous enough to produce materially different implementations
- Scope: too broad for one implementation plan
- YAGNI: unrequested features or speculative abstractions

Calibration:
- Only flag issues that would cause real implementation-planning problems
- If you cannot verify a claim, say "I don't know" and keep it advisory
- Approve unless the spec has serious gaps

Return:
Status: Approved | Issues Found

Issues:
- [Section]: [specific issue] — [why it matters for planning]

Recommendations:
- [non-blocking suggestion]
```
