# Specification document reviewer prompt

Dispatch one named `reviewer` through `task` with the specification path and this prompt:

```text
Review this specification for implementation readiness.

Specification: <path>

Check:
- Completeness: no TODOs, placeholders, TBDs, or incomplete sections.
- Consistency: no contradictory requirements or gates.
- Clarity: no ambiguity that could produce materially different implementations.
- Scope: focused enough for one plan; independent systems are split deliberately.
- YAGNI: no unrequested behavior or unjustified abstraction.

Only report issues that would cause a flawed implementation plan. Verify claims against repository evidence where available; uncertain observations are recommendations, not blockers.

Return:
Status: Approved | Issues Found
Issues: <section, specific gap, planning impact>
Recommendations: <advisory only>
```
