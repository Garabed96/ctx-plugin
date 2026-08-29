---
name: ctx-review-receive
description: Evaluates review feedback critically before applying any requested code change.
user-invocable: true
---

# ctx-review-receive — Evidence before agreement

1. Read the feedback, affected code, tests, surrounding pattern, and requirement that the feedback claims to protect.
2. For every comment, classify it as correct, incorrect, incomplete, unclear, or out of scope. Do not agree performatively.
3. Verify the claimed failure path or contract with code and proportionate evidence. Ask the reviewer/user for clarification through `ask` only when the missing information is material and unavailable in the repository.
4. State the decision and rationale before editing: accept, reject, or adapt. Preserve behavior when the feedback's proposed correction would introduce a regression or contradict an approved requirement.
5. Apply accepted changes narrowly, then run the proof that exercises the actual concern. Report what changed and the observed result.

Reply constructively and specifically: acknowledge valid risk, explain disagreement with evidence, and avoid unrelated refactors.