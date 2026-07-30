# Demo PRD artifact contract

One accountable coordinator — the main session running this skill — owns the bundle, gate state, and scope. Workers never mutate the PRD, gate status, or scope.

## Bundle state

Use only:

`DRAFT -> READY -> APPROVED -> EXECUTING -> DEMO_READY`, plus `BLOCKED` from any state.

- Coordinator: `DRAFT -> READY`, `APPROVED -> EXECUTING`, `EXECUTING -> DEMO_READY`, and any state `-> BLOCKED` with `blockedReason` naming the single blocking decision or system.
- User: `READY -> APPROVED` with an approval evidence locator.
- Pre-authorized execution: the coordinator may record `APPROVED` only by storing the exact authorizing user instruction as evidence.
- `BLOCKED` returns to its prior state once the blocker clears, with resolution evidence.
- Any material product-scope revision returns the bundle to `DRAFT`, resets current gate states to `NOT_STARTED`, and retains prior evidence as history or references rather than current pass evidence.
- `DRAFT`, `READY`, and `APPROVED` contain only `NOT_STARTED` gates. Active or completed gate state belongs to `EXECUTING` or `DEMO_READY`.
- `APPROVED`, `EXECUTING`, and `DEMO_READY` require both an approver and an approval evidence locator.
- `DEMO_READY` requires every gate to be `PASS` with non-placeholder evidence, or to carry a user-accepted exception.

## Gate state

Use only:

| From | To | Authority | Evidence required |
|---|---|---|---|
| NOT_STARTED | BUILDING | Coordinator | Active-gate brief |
| BUILDING | VERIFYING | Coordinator | Targeted checks pass |
| VERIFYING | PASS | Named verifier | Proof contract satisfied |
| VERIFYING | FAIL | Named verifier | Failure evidence |
| Any active state | BLOCKED | Coordinator | Blocking decision/system |
| VERIFYING | WAITING_FOR_MANUAL_CONFIRMATION | Coordinator | Missing running surface or human judgment |
| FAIL | BUILDING | Coordinator | Revised approach and retained failure evidence |
| BLOCKED | BUILDING | Coordinator after blocker clears | Resolution evidence |
| WAITING_FOR_MANUAL_CONFIRMATION | VERIFYING | User or named verifier | Confirmation or available surface |

A gate may be `PASS` only when its named verifier produced the required evidence, and the verifier did not implement the gate. A screenshot proves appearance, not persistence or backend behavior. A test proves its assertions, not the full user journey.

A `FAIL`, `BLOCKED`, or `WAITING_FOR_MANUAL_CONFIRMATION` gate may be left behind only by recording `acceptedException` — an evidence locator for the user's explicit acceptance. The exception is a documented loss, not a pass.

## Required gate fields

- Stable ID (`G1`–`G5`) and title
- Start state
- Happy-path action
- Observable result
- Proof and verifier
- Edge cases and failure/recovery behavior
- Timebox
- Status and evidence locator

## Guardrails

Use one to five; two or three is the sweet spot. A timebox ceiling and explicit non-goals count as real guardrails — do not invent filler to reach a quota. Prefer constraints that change execution decisions:

- explicit non-goals;
- time or cost ceiling;
- no mocks/stubs or a precise allowance;
- safety, privacy, or destructive-action boundary;
- compatibility, parity, or performance floor.

## Review

Every PRD answers the five checklist questions `R1`–`R5` before `READY`. Route the reviewer by risk:

- Default: the coordinator self-reviews with fresh eyes and records findings with evidence.
- Escalate to one fresh external reviewer with no drafting context when the PRD touches an irreversible, security, payment, migration, or shared cross-system decision, or leaves architecture unresolved.

The reviewer critiques; the coordinator decides and synthesizes.

## Handoff packet

Use only when the current runtime has no qualified coordinator — for example, this skill was invoked inside a worker or subagent session, or the work must move to another runtime. Stop, emit the packet, and let the user open it in a coordinator session.

```yaml
objective: <one outcome>
phase: <research | product-design | review | execute | verify>
inputs:
  - <artifact or source>
constraints:
  - <guardrail>
required_skills:
  - <skill>
return:
  - findings
  - evidence_locators
  - decisions
  - unresolved_gaps
stop_condition: <observable end state>
```

## Visual direction handoff

For UI-applicable work, the invariant is: the user selects the visual target whenever new visual direction is explored. Bind the strongest visual tools the runtime offers (see the skill body) and record what was used.

```yaml
target: <surface or flow>
user_outcome: <observable outcome>
candidate_gates: [G1, G2, G3]
constraints: [<guardrail>]
references: [<readable artifact>]
return:
  iterations: []
  selected_target: null
  selection_evidence: null
  decision_notes: []
stop_condition: user selected or explicitly accepted one visual target
```

Persist the result in the canonical bundle before `READY`:

```yaml
uiApplicable: true
visualDirection:
  selectedTarget: <readable artifact or screenshot>
  selectionEvidence: <user message or decision locator>
  designDecision: <chosen direction and reason>
  iterations: [<artifact or iteration locator>]
  hardeningFindings: <UX/state/accessibility findings incorporated into the PRD>
  hardeningEvidence: <command output or result locator>
```

Waiver: when the change stays inside an existing user-approved design system and explores no new visual direction, record `visualDirection.waiver` with the reason and the user's acceptance locator instead of the fields above. If `uiApplicable` is `false`, these fields may be omitted and the generated artifacts state that visual work is not applicable.

## Cross-gate interface records

Derive implementation just in time — but when a gate produces a shared contract (API shape, persistence schema, cross-surface interface) that a later gate depends on, record that interface compactly in the bundle's decisions. Freeze contracts, not steps.

## Artifact synchronization

The canonical `<topic>.prd.json` bundle on the local filesystem is authoritative. Markdown and Canvas are generated projections — never hand-edit them. The Obsidian War Room vault holds synced copies for review; sync them only through the configured `obsidian-war-room` MCP. Never write to the vault through the filesystem or Obsidian CLI, and never claim vault sync without a successful MCP read-back.

1. Set a new `revision` and `syncState: SYNC_PENDING` in the canonical bundle.
2. Render both projections from the bundle with `render-canvas.mjs`.
3. Write the JSON bundle, Markdown, and Canvas to the vault through MCP, then read all three back.
4. If their revision and gate data match, set `syncState: SYNCED`, rerender, write all three locally and to the vault, and read all three back again.
5. If the MCP is unavailable or read-back mismatches, set `syncState: UNSYNCED`, rerender locally, and continue working. `UNSYNCED` blocks `READY` (gate review happens in Obsidian) but never blocks `DRAFT` work and never revokes execution authority already granted.
6. Treat a missing artifact or mismatched revision as a sync failure. Never claim a prior state was preserved after a partial write; reconcile from the canonical JSON bundle.
