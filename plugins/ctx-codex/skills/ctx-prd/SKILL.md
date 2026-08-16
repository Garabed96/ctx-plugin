---
name: ctx-prd
description: >
  Create a decision-ready Demo PRD — a canonical JSON bundle with generated
  Markdown and Obsidian Canvas projections — from a voice note, rough idea,
  feature request, or product discussion. Use when the user asks for a PRD,
  demo goals, happy paths, gated scope, an Obsidian Canvas plan, or a
  product/design brief that should be ready for later execution without
  prescribing implementation details.
user-invocable: true
---

# ctx-prd — Gated Demo PRD

Turn product intent into one rich reference: a Demo PRD plus a visual gate map. Be specific about **what, why, and proof**; leave implementation sequencing to the executor.

Do not implement production code while creating the PRD.

## Own the orchestration

- The main Codex session running this skill is the coordinator. It owns the interview, delegation, synthesis, final PRD judgment, and all bundle state. Workers never mutate the PRD, gate status, or scope.
- If this skill is invoked inside a worker or subagent context with no authority to coordinate, stop and emit the handoff packet from [references/artifact-contract.md](references/artifact-contract.md) for the user to open in a coordinator session.
- Delegate bounded read-only discovery to a Sol Medium worker (the main coding model at medium reasoning effort) when external evidence or current behavior can change the PRD.
- Route the review by risk (below); external review, when required, goes to one fresh Sol XHigh reviewer with no drafting context.

## Build the product story

1. Extract the outcome, intended user, why now, timebox, constraints, explicit non-goals, and unresolved decisions from the user's words.
2. Inspect the cheapest relevant product and repository context. Delegate bounded read-only discovery when it can change the PRD.
3. Define three to five ordered demo gates. If the story cannot support three meaningful observable transitions, this workflow is oversized — route the work to `ctx-lean` instead of padding gates.
4. For every gate, specify:
   - start state and user intent;
   - one happy-path action;
   - observable result;
   - proof required to pass;
   - verifier: computer use, automated test, log, screenshot, persisted state, or manual confirmation;
   - material edge cases and failure behavior;
   - timebox and exit condition.
5. Add one to five guardrails that keep the slice feasible (two or three is the sweet spot). A timebox ceiling and explicit non-goals count; do not invent filler. Guardrails constrain scope, risk, or quality; they are not extra implementation steps.

## Route UI work through a visual decision

Use this phase only when the PRD changes a user-facing interface.

- Invariant: the user selects the visual target whenever new visual direction is explored. Never freeze a UI-applicable PRD on a prose-only visual decision.
- Explore direction with the strongest available visual tools — Product Design (`get-context` then `ideate`) with ImageGen iterations when available. Generate genuinely independent directions and stop for the user's selection.
- Harden the selected direction (states, hierarchy, accessibility, responsive behavior) with `impeccable shape <surface>` when available, or an equivalent structured UX pass, and record the findings.
- Waiver: when the change stays inside an existing user-approved design system and explores no new direction, record `visualDirection.waiver` with the reason and the user's acceptance instead of running the full lane.
- Record the chosen visual target, selection evidence, and hardening findings in the bundle per [references/artifact-contract.md](references/artifact-contract.md). Skip this phase entirely for backend-only work.

## Discover edge cases before freezing scope

Challenge the happy path independently before synthesis. Keep an edge case only when it changes a gate, guardrail, proof method, recovery behavior, or scope decision. Do not grow a speculative encyclopedia.

Every PRD answers the five review questions (`R1`–`R5` in the template) before `READY`:

- Is every gate user-observable and independently passable?
- Can the demo be faked by mocks, stubs, display-only controls, or missing persistence?
- Which omitted edge case would most likely break the story?
- Do the guardrails fit the stated timebox?
- Is any irreversible, security, payment, migration, or shared-contract decision unresolved?

Route the reviewer by risk: coordinator self-review with recorded evidence by default; one fresh Sol XHigh reviewer (no drafting context) when the PRD touches an irreversible, security, payment, migration, or cross-system decision, or leaves architecture unresolved.

## Create the paired artifacts

Use [assets/demo-prd-template.md](assets/demo-prd-template.md) for the Markdown projection and [references/artifact-contract.md](references/artifact-contract.md) for gate statuses, evidence rules, and synchronization.

Write the free-text bundle fields for digestibility — the same layout rules as a lean plan:

- `why` or `demoStory` may open with one mermaid diagram; each diagram answers exactly ONE orienting question, stated in the surrounding prose, ≤15 nodes. Detail goes in bullets under it, never inside the nodes.
- Every entry in `decisions` carries date, owner, and accepted cost — `**Owner decision (DD Mon): <what>.** <why, and the accepted cost>` — not just the choice.
- Give each complex mechanism one plain-language framing line before implementation detail; pin verified findings to a commit SHA.

The canonical bundle lives on the local filesystem at `~/.codex/ctx-codex/prds/<topic-slug>/`:

- `<topic>.prd.json` — authoritative canonical bundle and execution state;
- `<topic>.md` — generated narrative and acceptance contract;
- `<topic>.canvas` — visual sequence of the same gate IDs.

Generate the projections from the bundle:

```bash
node <skill-dir>/scripts/render-canvas.mjs \
  --input <topic>.prd.json \
  --markdown <topic>.md \
  --output <topic>.canvas
```

Sync all three artifacts to the Obsidian War Room through the `obsidian-war-room` MCP per the contract's synchronization steps. If the MCP is unavailable, mark the bundle `UNSYNCED` and keep drafting — `UNSYNCED` blocks `READY`, not work. Never write to the vault through the filesystem or Obsidian CLI.

The Canvas and Markdown are generated-only. Do not hand-edit them or add custom Canvas nodes that the next render would erase. Keep gate IDs, titles, statuses, proof, and verifier identical across all three artifacts.

## Readiness gate

Declare **PRD READY** only when:

- the outcome and timebox are explicit;
- the happy path is coherent end to end;
- every gate has an observable pass condition and verifier;
- edge cases have been incorporated or deliberately deferred;
- guardrails are real constraints, not filler;
- UI work has a user-selected visual target with selection evidence and hardening findings, or a recorded waiver;
- the five review questions are resolved or explicitly accepted, with the risk-appropriate reviewer;
- the canonical bundle is persisted, linked from the projections, and `SYNCED` to the vault.

The coordinator may transition `DRAFT -> READY`. Only the user may transition `READY -> APPROVED`, unless the original request explicitly pre-authorized execution and its exact text is stored as approval evidence. If a single decision or unavailable system prevents readiness, set the bundle to `BLOCKED` with `blockedReason` naming it.

Stop after artifacts and sync. Invoke `ctx-prd-exec` only after the PRD is approved, or when the user's original instruction explicitly authorized implementation after PRD readiness.
