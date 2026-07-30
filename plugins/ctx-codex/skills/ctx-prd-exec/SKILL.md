---
name: ctx-prd-exec
description: >
  Execute an approved gated Demo PRD through coordinator-led orchestration,
  model-routed discovery and implementation, and evidence-backed gate
  verification. Use when the user asks to implement, orchestrate, build, or
  continue from a ctx-prd bundle.
user-invocable: true
---

# ctx-prd-exec — Gate-by-Gate Execution

Execute the product story gate by gate. The PRD defines outcomes and proof; the coordinator derives implementation work just in time from the current repository.

## Require an executable bundle

Before editing, read the canonical `<topic>.prd.json` bundle plus its generated PRD and paired Canvas from `~/.codex/ctx-codex/prds/<topic-slug>/`. Confirm:

- status is `APPROVED` with approval evidence; when the original instruction pre-authorized execution, store its exact text as that evidence and update the bundle before editing;
- all three artifacts exist at the paths named by `bundleFile`, `prdFile`, and `canvasFile` and share the same revision, gate IDs, order, statuses, proof, and verifier;
- every gate has proof and a verifier;
- unresolved decisions do not change product behavior, architecture, risk, or irreversible effects;
- repository-specific contract tracing, parity, safety, and QA rules are preserved.

If the bundle is inconsistent, return it to `ctx-prd`. Do not repair product intent during implementation. A stale vault copy (`UNSYNCED`) does not revoke execution authority — the canonical filesystem bundle is authoritative; resync when the MCP returns.

## Keep the coordinator in charge

The main Codex session running this skill is the coordinator. It owns task selection, delegation, dependency judgment, integration, gate state, recovery, and user communication. Workers never re-orchestrate the project. If invoked inside a worker or subagent context, stop and emit the handoff packet from the ctx-prd artifact contract.

Use the routing table in [references/model-routing.md](references/model-routing.md):

- Sol Medium: bounded research, repository reading, contract tracing, and evidence gathering; read-only.
- Sol High: implementation workers with disjoint write ownership and exact gate outcomes.
- Sol XHigh: architect only when complexity crosses the escalation threshold; otherwise omit it.
- Computer use or an equivalent independent verifier: gate verification on a running user-owned surface.

## Execute one gate at a time

For each gate:

1. Re-read that gate, its guardrails, dependencies, parity requirement, and proof contract.
2. Inspect current code and derive the smallest implementation slice that can pass the gate. Read-only preparation for future gates is allowed; their implementation is not.
3. Delegate independent read-only discovery concurrently when useful.
4. Ask the Sol XHigh architect for a compact decision record only when escalation criteria apply.
5. Delegate implementation to one or more Sol High workers with disjoint files or worktrees, explicit interfaces, and targeted verification.
6. Integrate under the coordinator. Resolve ownership and interface conflicts before accepting worker output.
7. Run automated checks before visual or interaction QA.
8. Move the gate to `VERIFYING`; use a fresh verifier that did not implement the slice.
9. Record evidence and the new gate status (`PASS`, `FAIL`, `BLOCKED`, or `WAITING_FOR_MANUAL_CONFIRMATION`) in the canonical JSON bundle, then regenerate Markdown and Canvas and synchronize all three artifacts through the `obsidian-war-room` MCP. If the MCP is unavailable, mark `UNSYNCED` and continue; resync later.
10. When a gate produced a shared contract (API shape, schema, cross-surface interface) a later gate depends on, record that interface compactly in the bundle's decisions. Freeze contracts, not steps.
11. Start the next gate only after the current gate passes or the user explicitly accepts a documented exception recorded as `acceptedException` on that gate.

Do not convert the whole PRD into a frozen ctx-plan graph. Plan only the active gate and any interface it must produce for the next gate.

## Verification routing

- Web UI: use computer use against the existing user-owned app.
- Mobile UI: first name the QA target — EAS Preview, TestFlight, or Expo Go — and do not mix evidence across targets.
- Non-UI behavior: prefer exact tests, API responses, logs, or durable state evidence.
- Subjective UI quality: use the selected visual target and hardening criteria, then compare source and implementation at the same viewport/state.

If the named verifier is unavailable, an equivalent verifier may substitute only when it can produce the same class of proof — never weaken the proof to fit the available tool.

Never start, stop, restart, or take over Next.js, Expo, Metro, simulator bridge, or preview servers unless the user explicitly delegates server ownership for the current task. If no running surface is available, set the gate to `WAITING_FOR_MANUAL_CONFIRMATION`; do not claim it passed.

## Recover without scope drift

On failure, the coordinator chooses one:

- retry the same implementation approach with corrected evidence;
- revise the active gate's technical approach without changing product intent;
- return to `ctx-prd` when product behavior, scope, or a guardrail must change;
- escalate to the user for an irreversible or materially different decision.

After two failed implementation approaches, require Sol XHigh architecture review before another attempt. Do not weaken proof to make a gate pass.

Follow the recovery transitions in the artifact contract. Only the coordinator may resume `FAIL` or `BLOCKED`; only the user or named verifier may release `WAITING_FOR_MANUAL_CONFIRMATION` back to `VERIFYING`.

## Finish

Declare **DEMO READY** only when every gate is `PASS` or carries a user-accepted exception, the guardrails still hold, final cross-gate regression checks pass, and the PRD/Canvas contain evidence locators.

Report compactly:

- gates passed and any accepted exceptions;
- verification evidence;
- parity action;
- residual risk or follow-up;
- PR, commit, files, and Canvas/PRD pointers.
