---
status: DRAFT
sync_state: SYNC_PENDING
revision: "<stable revision id>"
type: demo-prd
canvas: "<topic>.canvas"
bundle: "<topic>.prd.json"
created: YYYY-MM-DD
timebox: "<duration or deadline>"
blocked_reason: null
approved_by: null
approval_evidence: null
---

# <Product outcome>

## Why

<User problem, intended user, and why now.>

## Demo story

<One short narrative describing what the user will accomplish end to end.>

## Visual direction

- UI applicable: <true or false>
- Waiver: <reason + user evidence when the change stays inside an existing approved design system; otherwise omit>
- Selected target: <image, screenshot, route, or not applicable>
- Selection evidence: <user decision locator or not applicable>
- Design decision: <what was selected and why>
- Iterations: <one or more artifact locators, or not applicable>
- Hardening findings: <UI/UX constraints or not applicable>
- Hardening evidence: <shape/audit result locator or not applicable>

## Demo gates

### G1 — <observable transition>

- Start state:
- Happy-path action:
- Observable result:
- Proof:
- Verifier:
- Edge cases / recovery:
- Timebox:
- Status: `NOT_STARTED`
- Evidence: pending

<!-- Repeat for G2–G3; add G4–G5 only when the story needs them. Fewer than 3 gates means this workflow is oversized — use ctx-lean instead. -->

## Guardrails

1. <scope, risk, time, or quality boundary — 2 or 3 is the sweet spot; a timebox ceiling or a non-goal counts>

## Non-goals

- <explicitly excluded behavior>

## Decisions and assumptions

- <decision, owner, and rationale>

## Edge cases deferred

- <edge case and why it does not belong in this timebox>

## Proof summary

| Gate | Status | Verifier | Evidence |
|---|---|---|---|
| G1 | NOT_STARTED | <method> | pending |

## Research and references

- <source, artifact, screenshot, or code pointer>

## Review

| ID | Question | Finding | Evidence | Resolution | Accepted residual risk |
|---|---|---|---|---|---|
| R1 | Is every gate user-observable and independently passable? | pending | pending | pending | pending |
| R2 | Can mocks, stubs, display-only controls, or missing persistence fake the demo? | pending | pending | pending | pending |
| R3 | Which omitted edge case would most likely break the story? | pending | pending | pending | pending |
| R4 | Do the guardrails fit the stated timebox? | pending | pending | pending | pending |
| R5 | Is an irreversible or high-risk product decision unresolved? | pending | pending | pending | pending |

- Approval: pending
