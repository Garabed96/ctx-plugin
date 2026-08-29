---
name: ctx-debug
description: Diagnoses a bug or unexpected behavior from evidence before proposing a root-cause fix.
user-invocable: true
---

# ctx-debug — Root cause before repair

**Iron law:** no fix proposal before a reproducible symptom and an evidence-backed causal explanation.

1. Capture the exact failure, environment, expected versus actual behavior, and smallest reliable reproduction. User-reported failures are ground truth; do not rerun them merely to challenge the report.
2. Read the affected code and trace the failing control/data flow backward to the earliest incorrect state or decision. Read `skill://ctx-debug/references/root-cause-tracing.md` for deep traces.
3. Compare the failing path with a working analogue, identify the condition that differs, and state the falsifiable root-cause hypothesis.
4. Test the hypothesis with the narrowest observation possible. If disproved, discard it and continue; do not layer symptom suppressions.
5. Repair the source cause, add defense at appropriate boundaries only when it preserves the product contract, and verify the original reproduction no longer fails. Read `skill://ctx-debug/references/defense-in-depth.md` when layered validation is warranted.
6. Prefer condition-based waiting over arbitrary delay; see `skill://ctx-debug/references/condition-based-waiting.md`.

Report reproduction, causal chain, correction, and observed confirmation. Escalate multi-step changes to `skill://ctx-plan/SKILL.md`.