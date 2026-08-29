---
name: ctx-verify
description: Verifies completion claims against observed repository and runtime evidence.
user-invocable: true
---

# ctx-verify — Evidence, not assertion

Never claim completion from a worker report, a green narrow check, or a plausible diff alone.

1. Turn requirements into an explicit checklist of observable outcomes, boundaries, error cases, state transitions, and non-functional constraints.
2. Read the actual changed code and inspect the diff against that checklist. Trace meaningful paths through to their outputs or side effects.
3. Run the proportional proof: reproduce a bug before/after for a fix; run changed-contract tests for a permanent API; launch and exercise changed UI/CLI behavior; use a smoke scenario for an experiment. Do not substitute a unit test for a required runtime surface check.
4. Match every claim to observed output. Mark unexercised outcomes as unverified rather than inferring them.
5. Report each requirement as PASS, FAIL, or UNVERIFIED with command/scenario evidence and precise gaps. If gaps remain, route back to the owning implementation workflow.

A verification report is complete only when a reviewer can reproduce its evidence without trusting prose.