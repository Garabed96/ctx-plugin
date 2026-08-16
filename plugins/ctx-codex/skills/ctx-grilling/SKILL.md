---
name: ctx-grilling
description: Grill the user relentlessly about a plan, decision, or idea. Use when the user wants to stress-test their thinking, says a plan is confusing or underspecified, or uses any 'grill' trigger phrases.
---

# CTX Grilling — Design-Tree Interview

Interview the user relentlessly until you reach a shared understanding. Map this as a **design tree**: every decision branches into the decisions that hang off it.

Work the tree in **rounds**. The **frontier** is every decision whose prerequisites are already settled — the questions you can ask _now_ without guessing at answers you haven't heard yet. Ask the whole frontier in one round, then wait for the user's answers before the next round.

## Ask in compact option blocks, never open prose

Frame every frontier question as a lettered option list the user can answer with two keystrokes, not an essay. The typing is the friction, and it is why sessions stall.

```text
1. <Decision short name> — <the question>?
   A. <option> (Recommended — <one-line reason>)
   B. <option> — <tradeoff>
   C. <option> — <tradeoff>
```

- **Option A is always your recommendation.** Every question carries one; a question you can't recommend an answer to is one you haven't thought about yet.
- Give each question a short decision name (≤12 chars) the user can scan.
- 2–4 options per question. If a decision genuinely has more, it isn't one decision — break it up the tree.
- Attach a concrete **preview** where it raises fidelity — a layout sketch in a fenced block, a schema shape, a state-machine snippet, copy variants. Something to react to, without building anything.
- Close each round with: "Reply like `1A 2C`, or free text where the framing is wrong." Free text is the escape hatch; if the user reaches for it twice on one topic, your tree is wrong, not their answer.
- Cap a round at 4 questions. A wider frontier becomes consecutive blocks in the same round — split it, never drop from it.

Each round the user answers reshapes the tree — settled decisions push the frontier outward and unblock questions that depended on them. Recompute the frontier and ask the next round. A question whose answer depends on another question still open in this round belongs to a _later_ round, not this one.

## Explain before you ask

When the user is confused by part of the artifact under grill, they cannot answer questions about it. Decode the confusing part first — grounded in the actual code or document, not the artifact's own prose — then put the decision it was hiding to them as a frontier question. A section the user calls confusing usually contains an unstated decision.

Finding _facts_ is your job, never the user's. When a frontier question needs a fact from the environment (filesystem, tools, etc.), look it up or dispatch a bounded read-only worker — don't ask the user for anything you could discover yourself. Don't block on it: only the questions downstream of the missing fact wait; ask the rest of the frontier now. The _decisions_ are the user's — put each to them and wait.

The session is done when the frontier is empty: every branch of the design tree visited, nothing left silently assumed. Do not act on it until the user confirms you have reached a shared understanding.

## Where the answers go

Grilling produces a settled design tree, not a document of its own. Route the tree by what was grilled:

- **An existing `ctx-lean` plan** — fold the settled decisions back into that plan and rewrite it to the ctx-lean layout template (one-question diagrams, intuition before mechanics, dated owner decisions with accepted cost, SHA-pinned evidence). Record the grilling pass, dated, in the plan's audit route.
- **Product intent with no plan yet** — hand the tree to `ctx-prd`, the canonical output format: the PRD bundle, its Markdown, and its Canvas projection. Do not invent a spec format here.

Carry the tree over intact: each settled decision, the option chosen, and — where the user picked against the recommendation or annotated a preview — the reason. That reasoning is the part the artifact can't reconstruct later.
