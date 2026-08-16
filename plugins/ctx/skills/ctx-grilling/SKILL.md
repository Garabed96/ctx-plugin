---
name: ctx-grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, says a plan is confusing or underspecified, or uses any 'grill' trigger phrases.
---

# /ctx-grilling — Design-Tree Interview

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round, then wait for the user's answers before the next round.

## Ask through AskUserQuestion, never prose

Put every frontier question through the **AskUserQuestion tool**. Do not emit a numbered markdown list of questions for the user to type answers to — the typing is the friction, and it is why sessions stall.

- **First option is your recommendation**, labeled `(Recommended)`, with the one-line reason in its `description`. Every question carries a recommendation; a question you can't recommend an answer to is one you haven't thought about yet.
- `header` is the decision's short name (≤12 chars) — it's the chip the user scans.
- `multiSelect: true` when the choices aren't mutually exclusive.
- Use `preview` for concrete artifacts to react to — layout sketches, schema shapes, state-machine or reducer snippets, copy variants. Single-select only. This is the cheapest way to raise the fidelity of the discussion: something concrete to react to, without building anything.
- **Never add an "Other" option** — the tool supplies free text automatically, and that's the escape hatch for when the framing itself is wrong. If the user reaches for it twice on one topic, your tree is wrong, not their answer.

**The tool caps at 4 questions per call, 2–4 options each.** A frontier wider than 4 becomes consecutive calls in the same round — split it, never drop from it. If a decision genuinely has more than four live options, it isn't one decision; break it up the tree.

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

## Explain before you ask

When the user is confused by part of the artifact under grill, they cannot answer questions about it. Decode the confusing part first — grounded in the actual code or document, not the artifact's own prose — then put the decision it was hiding to them as a frontier question. A section the user calls confusing usually contains an unstated decision.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), dispatch a sub-agent to find it — don't ask the user for anything you could look up yourself. Don't block on it: a running exploration is an unsettled prerequisite, so only the questions downstream of it wait for the sub-agent to report — ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Where the answers go

Grilling produces a settled design tree, not a document of its own. Route the tree by what was grilled:

- **An existing `/ctx-lean` plan** — fold the settled decisions back into that plan and rewrite it to the ctx-lean layout template (one-question diagrams, intuition before mechanics, dated owner decisions with accepted cost, SHA-pinned evidence). Record the grilling pass, dated, in the plan's audit route.
- **Product intent with no plan yet** — hand the tree to `/ctx-prd`, the canonical output format: the PRD bundle, its Markdown, and its Canvas projection. Do not invent a spec format here.

Carry the tree over intact: each settled decision, the option chosen, and — where the user picked against the recommendation or annotated a preview — the reason. That reasoning is the part the artifact can't reconstruct later.
