# OMP task dispatch reference

## Low-complexity implementation

Dispatch a named `implementer` through `task` with one bounded prompt:

```text
Task: <outcome>
Files: <exact owned paths>
Context: <relevant conventions and current state>
Changes: <ordered required changes>
Acceptance: <observable conditions>
Proof: <commands or scenario>
Stop: do not edit outside the owned paths; do not perform remote operations.
Report: DONE, DONE_WITH_CONCERNS, NEEDS_CONTEXT, or BLOCKED with evidence.
```

## Medium-complexity implementation and review

After implementation proof, dispatch a named `reviewer` through `task` with the task, requirements, changed paths, base-to-head range, and explicit request for a read-only evidence-backed verdict. Give all independent dispatches to one batched `task` request only when their ownership and interfaces are disjoint.

A concern that changes product behavior is surfaced to the user through `ask`; it is not auto-fixed.