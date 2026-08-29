---
name: ctx-ship
description: Takes an approved feature from preflight through a draft pull request with explicit gates and immutable remote approval.
user-invocable: true
---

# ctx-ship — Gated development pipeline

Pipeline: **Preflight → Architect → Implement → Verify → Readiness → Ship**. Every phase has an explicit user gate; do not advance without it.

## 0. Preflight

Call `ctx_workflow` with `{ schemaVersion: 1, operation: "ship_preflight", cwd: <absolute cwd>, base }`. Classify risk from returned production files, line count, and risk signals: low for documentation/configuration, medium for a bounded feature using existing patterns, high for a new system, authentication/data-model change, four or more production files, or a scope-over-500-lines signal. Warn at 400 lines and hard-stop at 500. **Gate 0:** confirm branch, feature, and risk with `ask`.

## 1–4. Architect, implement, verify, readiness

Use `skill://ctx-grilling/SKILL.md` or `skill://ctx-prd/SKILL.md` when product decisions remain unresolved, then `skill://ctx-plan/SKILL.md`; **Gate A:** approved plan. Execute through `skill://ctx-execute/SKILL.md` or inline only for a genuinely small approved plan; **Gate B:** required static proof. Run cheap proof before acceptance proof; re-run preflight if the diff changed; **Gate C:** proof passes and scope remains acceptable. Review exact changed files for missing tests, leaked internals, secrets, and untracked TODO/FIXME/HACK debt. Low risk is advisory, medium requires acknowledgement, high blocks. **Gate D:** findings cleared.

## 5. Prepare and publish

Use `ask` to confirm exact files, commit message, title, body, base, and draft state. Call `ctx_workflow` `ship_prepare` with that complete local-only request. It commits exactly the declared file set and returns the immutable shipment. Present its canonical payload; obtain interactive consent only through `ctx_remote_approval({ schemaVersion: 1, action: "request", shipmentId })`. On a grant, call `ctx_workflow` `ship_publish` with only the shipment and approval IDs. **Gate E:** report the resulting draft PR and CI state.

Never stage broadly, call a raw GitHub command, create a remote resource without the approval grant, or use a legacy combined shipping operation. The supported sequence is preflight → local preparation → approval → publish.

Read `skill://ctx-ship/references/example-pr.md` for the PR body shape.