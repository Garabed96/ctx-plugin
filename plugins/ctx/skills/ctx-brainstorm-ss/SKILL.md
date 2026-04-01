---
name: ctx-brainstorm-ss
description: >
  Use when ambiguity is high, scope spans multiple systems, or you need blind-spot
  catching that same-context self-review can't provide. Escalation target from
  /ctx-brainstorm.
user-invocable: true
---

# /ctx-brainstorm-ss — Deep Design Exploration

Same core as `/ctx-brainstorm` but with fresh-context review and stronger guardrails for complex work. The SS tax is 3-4x tokens — only pay it when the problem warrants it.

## Skill Files

- `SKILL.md` — this file (process, reviewer loop, design principles)
- `references/spec-reviewer-prompt.md` — subagent dispatch template
- Shared with brainstorm: `../ctx-brainstorm/references/complexity-tags.md`, `../ctx-brainstorm/references/companion-guide.md`
- Shared companion server: `../ctx-brainstorm/companion/`

---

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any
implementation action until you have presented a design and the user has approved it.
</HARD-GATE>

## Process

1. **Explore context** — check files, docs, recent commits relevant to the idea
2. **Scope check** — if the request covers multiple independent systems, decompose into sub-projects first. Each sub-project gets its own spec -> plan -> implementation cycle. Brainstorm the first sub-project through the normal flow.
3. **Visual companion gate** — before asking any questions, evaluate: will this brainstorm involve architecture diagrams, layout comparisons, option cards, or spatial content? If yes, offer the companion as its own message and wait for the user's response before continuing (read `../ctx-brainstorm/references/companion-guide.md`). If no, proceed directly to questions — no extra message.
4. **Ask questions** — one at a time, prefer multiple choice, understand purpose/constraints/success criteria
5. **Propose 2-3 approaches** — with tradeoffs, lead with your recommendation. If companion is active, present visually.
6. **Present design** — sections scaled to complexity, get approval incrementally. Apply design-for-isolation (see below).
7. **Write spec** — save to `docs/specs/YYYY-MM-DD-<topic>-design.md`, commit
8. **Spec review loop** — dispatch reviewer subagent (see below), fix issues, re-dispatch until approved (max 3 iterations, then surface to user)
9. **User reviews spec** — ask user to review the written spec before proceeding
10. **Tag complexity** — mark each planned unit (see `../ctx-brainstorm/references/complexity-tags.md`)

---

## Design-for-Isolation

When presenting the design (step 6), apply these principles:

- Break the system into units that each have **one clear purpose**, communicate through **well-defined interfaces**, and can be **understood and tested independently**
- For each unit, answer: what does it do, how do you use it, what does it depend on?
- Can someone understand a unit without reading its internals? Can you change internals without breaking consumers? If not, the boundaries need work.
- Smaller, well-bounded units are easier for agents to work with — they reason better about code they can hold in context, and edits are more reliable when files are focused.

---

## Spec Review Loop

After writing the spec (step 7), dispatch a fresh-context reviewer:

1. Read `references/spec-reviewer-prompt.md` for the dispatch template
2. Dispatch via Agent tool (`subagent_type: "general-purpose"`) with the spec file path
3. **If Issues Found:** fix the issues in the spec, re-dispatch. Repeat until Approved.
4. **Max 3 iterations.** If still failing after 3 rounds, surface remaining issues to the user for guidance.
5. **If Approved:** proceed to user review (step 9)

The reviewer has fresh context — no accumulated assumptions from the brainstorming conversation. This is the whole point: blind spots you've normalized get caught.

---

## Key Principles

- **One question at a time** — don't overwhelm
- **YAGNI ruthlessly** — remove speculative features
- **Pattern audit before new abstractions** — search before inventing
- **Incremental validation** — present design, get approval, then proceed
- **Scope decomposition first** — if it's too large for one spec, break it up before diving in
- **Design for isolation** — every unit should be independently understandable and testable
- **Context budget** — if past 5 questions and still unclear, summarize what you know and ask "what am I missing?"

---

## Gotchas

- **"Too simple to need a design"**: Every project goes through this process. "Simple" projects are where unexamined assumptions cause the most wasted work.
- **Over-engineering abstractions**: Before proposing a context/provider/service, search the codebase for existing patterns. The simpler pattern usually exists already.
- **Reviewer disagreement loops**: If the reviewer keeps flagging the same section after your fix, the spec likely has a genuine ambiguity. Surface it to the user — don't keep iterating in a loop.
- **Tag drift**: Complexity tags can be wrong — `/ctx-execute` should re-classify mid-flight.
- **Question marathon**: If you're past 5 questions and still unclear, stop asking and summarize what you know. Ask "what am I missing?" instead of question #6.
- **Inventing thresholds that already exist**: When designing states or edge cases for a component that consumes an existing utility, derive the cases from that utility's thresholds — don't invent new ones. Run `Grep` for the source function before proposing breakpoints.
- **Proposing new API work when data already flows**: Before suggesting backend changes to serve data, trace the data path from where it's consumed: component → hook/query → API endpoint. The endpoint often already returns what you need — you just haven't followed the chain. If you've read a component that has the data, ask "where does this come from?" and trace upstream before proposing new API fields.
- **Proposing implementation details without checking conventions**: Before recommending specific libraries, patterns, or API styles in the design, check CLAUDE.md for project conventions. The brainstorm output feeds directly into implementation — wrong conventions here propagate downstream.
- **Skipping companion for visual content**: Architecture diagrams, A/B/C option cards, layout comparisons, and design decisions are visual — use the companion. Text walls with ASCII art are not a substitute. If you're about to present 3+ options with diagrams or spatial content, that's a companion question. The gate at step 3 exists because by the time you're synthesizing, you've already committed to text mode and won't backtrack.

---

## Handoff

When the spec is approved, reviewed, and tagged, the ONLY next step is `/ctx-plan`. Do NOT invoke `/ctx-execute`, `/ctx-ship`, or any implementation skill directly from brainstorm.

```
/ctx-brainstorm-ss → /ctx-plan (ONLY valid next skill)
```

The complexity tags you set here drive the agent budget in `/ctx-execute`.
