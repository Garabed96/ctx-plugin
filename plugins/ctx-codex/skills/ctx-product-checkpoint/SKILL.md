---
name: ctx-product-checkpoint
description: Create or update an evidence-backed product checkpoint and design-decision hub in Obsidian. Use when the user needs a product-manager view of what changed for users, what works today, what remains incomplete, business value and hypotheses, QA evidence, screenshots, visual design options, implementation handoffs, or concise Linear/Slack/lead-developer status projections. Also use when product ambiguity should be made reviewable through current-state evidence and image-based directions before implementation.
---

# CTX Product Checkpoint

Create one durable product review surface that answers four questions quickly:

1. What changed for users?
2. What is verified, incomplete, or still hypothetical?
3. Which product or design decision is open?
4. What should the next person do?

Obsidian is the human review surface. Code, tests, browser captures, PRDs, and issue history remain the evidence.

Do not implement production code while creating or updating a checkpoint unless the user separately authorizes implementation.

## Choose the mode

- **Status checkpoint:** summarize implemented work, boundaries, value, and QA.
- **Design decision:** make an ambiguous UI or product decision reviewable with evidence and visual options.
- **Combined checkpoint:** maintain the status page and link one or more focused decision notes.
- **Update:** revise an existing checkpoint after implementation, QA, review, or a decision.

Prefer a combined checkpoint when a feature is mostly understood but contains one focused ambiguity. Keep the main status page concise; put visual exploration in a linked decision note.

## Resolve the destination

Use, in order:

1. the vault, folder, or review hub named by the user;
2. an existing related Obsidian checkpoint or issue hub found in the supplied context;
3. an available Obsidian connector configured for the project.

If no destination can be established without scanning unrelated personal files, ask one short question. Never persist secrets, customer data, tokens, or private credentials.

Prefer the Obsidian connector when available. If only filesystem access exists, obtain authorization before writing outside the active workspace. If sync is unavailable, produce the packet in a safe staging location and mark it `UNSYNCED`; do not claim it is in Obsidian.

Read [references/artifact-contract.md](references/artifact-contract.md) before creating or restructuring a packet. Use [assets/product-checkpoint-template.md](assets/product-checkpoint-template.md) as the starting projection.

## Gather evidence narrowly

Inspect only sources that can change the product conclusion:

- issue or PRD scope and settled decisions;
- current branch, commit, and relevant diffs;
- user-facing code paths and exact UI copy;
- focused automated tests and verification output;
- browser QA reports and screenshots;
- existing design artifacts and related checkpoints;
- known downstream or adjacent-ticket boundaries.

Treat claims according to evidence:

- **Verified:** observed in code plus an appropriate test, browser run, persisted state, or other direct proof.
- **Implemented, unverified:** code exists, but the required proof has not run.
- **Inference:** a reasoned conclusion from evidence; label it.
- **Hypothesis:** expected user or business impact without measured results.
- **Planned:** decided scope not yet implemented.
- **Incomplete:** required behavior that is absent or failing.
- **Out of scope:** deliberately deferred behavior, not a hidden failure.

Never turn a ticket description, mock, TODO, or agent claim into verified product behavior without checking it.

## Build the status checkpoint

Lead with the current decision-relevant status, not a chronology. Use these sections when applicable:

1. **Executive status** — branch/release state, verification state, blockers, and the user-level change.
2. **What changed for users** — observable capabilities and recovery paths, grouped by outcome.
3. **What the product does or learns today** — the present behavioral boundary.
4. **What is not complete** — missing behavior, unproven wiring, pilot gaps, or accepted deferrals.
5. **Business value and hypothesis** — why the change matters, separated from measured results.
6. **Relationship to adjacent work** — ownership boundaries and the chain into later tickets.
7. **Implementation evidence** — branch, commit, key changes, and primary source links.
8. **QA evidence** — verdict, flows exercised, defects, screenshots, and untested paths.
9. **Communication summaries** — concise lead-developer, Linear, and Slack-ready projections.
10. **Checkpoint history** — append the material status or decision transition; do not log every edit.

Use sparse screenshots that prove distinct states. Link the full QA gallery rather than embedding every capture in the status page.

## Build a design-decision note

Use a separate linked note for focused ambiguity. Include:

1. **Decision to make** — one sentence naming the user-visible choice.
2. **Current implementation** — current screenshot and exact friction.
3. **State model** — list states that the UI must distinguish.
4. **Directions** — visual artifacts with one clear trade-off each.
5. **Recommendation** — choose a default and explain why in product terms.
6. **Implementation contract** — behavior, copy, transitions, accessibility, responsive behavior, reuse constraints, and QA.
7. **Selection** — record the user's choice and date; do not infer approval.
8. **Related notes** — link the status checkpoint, PRD, QA report, and relevant adjacent work.

### Visual exploration lane

Use visual exploration only when seeing alternatives materially improves the decision.

- Capture and inspect the current surface first.
- Ground every direction in the existing design system and nearby product patterns.
- When Product Design and ImageGen are available, run the Product Design context gate and ideation workflow.
- Generate exactly three independent directions unless the user requests another count.
- Vary hierarchy, interaction, or state disclosure before changing visual style.
- Save every generated image beside the Obsidian note and embed it; chat-only images are not a durable checkpoint.
- Stop for user selection before frontend implementation.
- If the best answer combines directions, generate or specify the combined selected target before handoff.

Do not hide essential meaning behind hover alone. Hover may supplement a focusable/clickable disclosure.

## Update rather than duplicate

When a checkpoint already exists:

- preserve its useful links, decisions, and evidence;
- update stale status, branch, commit, blockers, and verification claims;
- retract disproven claims explicitly;
- move detailed new ambiguity into a linked decision note;
- append one dated history entry for a material transition;
- avoid creating `final-v2`, `latest`, or disconnected status documents.

## Produce communication projections

Generate summaries from the checkpoint; never maintain separate facts manually.

- **Lead developer:** current state, user impact, blocker/limit, and next decision.
- **Linear:** concise evidence-backed update with the checkpoint link and explicit incomplete scope.
- **Slack:** conversational status with the same boundary and one next action.
- **Implementation agent:** selected visual target, behavior contract, source paths, acceptance criteria, and non-goals.

Do not post comments or messages without explicit authorization. Drafting them is allowed.

## Verify the packet

Before reporting completion:

- confirm the Markdown and embedded assets exist at the destination;
- re-read for overclaims and stale blockers;
- confirm every embedded image and wiki-link resolves;
- confirm branch, commit, and test claims against current evidence;
- confirm design directions appear once and match their labels;
- confirm the history records the current material transition;
- report `SYNCED` or `UNSYNCED` accurately.

Completion means the user can open one hub, understand the product state, inspect evidence, make any open decision, and hand the selected contract to the next person without reconstructing context from chat.
