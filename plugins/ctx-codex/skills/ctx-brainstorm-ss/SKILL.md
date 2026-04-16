---
name: ctx-brainstorm-ss
description: >
  Use when ambiguity is high, scope spans multiple systems, or you need blind-spot
  catching that same-context self-review can't provide. Escalation target from
  ctx-brainstorm.
user-invocable: true
---

# ctx-brainstorm-ss — Deep Design Exploration

Same core as `ctx-brainstorm` but with fresh-context review and stronger guardrails for complex work. The SS tax is 3-4x tokens, so only pay it when the problem warrants it.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any
implementation action until you have presented a design and the user has approved it.
</HARD-GATE>

## Process

1. **Explore context** — check files, docs, recent commits relevant to the idea
2. **Scope check** — if the request covers multiple independent systems, decompose into sub-projects first. Each sub-project gets its own spec -> plan -> implementation cycle. Brainstorm the first sub-project through the normal flow.
3. **Visual factory gate** — before asking any questions, evaluate: will this brainstorm involve architecture diagrams, layout comparisons, option cards, or spatial content? If yes, offer the factory as its own message and wait for the user's response before continuing (read `..ctx-brainstorm/references/factory-guide.md`). If no, proceed directly to questions.
4. **Ask questions** — one at a time, prefer multiple choice, understand purpose, constraints, and success criteria
5. **Propose 2-3 approaches** — with tradeoffs, lead with your recommendation. If the factory is active, present visually.
6. **Present design** — sections scaled to complexity, get approval incrementally. Apply design-for-isolation (see below).
7. **Write spec** — save to `docs/specs/YYYY-MM-DD-<topic>-design.md`
8. **Spec review loop** — run a fresh-context review if delegation is available and allowed in the current runtime (see below)
9. **User reviews spec** — ask the user to review the written spec before proceeding
10. **Tag complexity** — mark each planned unit (see `..ctx-brainstorm/references/complexity-tags.md`)

---

## Design-for-Isolation

When presenting the design (step 6), apply these principles:

- Break the system into units that each have **one clear purpose**, communicate through **well-defined interfaces**, and can be **understood and tested independently**
- For each unit, answer: what does it do, how do you use it, what does it depend on?
- Can someone understand a unit without reading its internals? Can you change internals without breaking consumers? If not, the boundaries need work.
- Smaller, well-bounded units are easier for agents to work with. They reason better about code they can hold in context, and edits are more reliable when files are focused.

---

## Spec Review Loop

After writing the spec, prefer a fresh-context reviewer:

1. Read `./references/spec-reviewer-prompt.md` for the review template
2. If the runtime supports delegation and the user has opted into SS / fresh-context review, dispatch a reviewer with `spawn_agent`
3. Prefer `agent_type: "explorer"` for the reviewer. Use `gpt-5.4-mini` for a lightweight pass, or inherit the session model when that is simpler.
4. **If Issues Found:** fix the issues in the spec, then re-run the reviewer
5. **Max 3 iterations.** If the same issue persists, surface it to the user instead of looping
6. **Fallback:** if delegation is unavailable in the current runtime, do one local review pass and explicitly say the review was same-context rather than fresh-context

The whole point is to catch blind spots you have normalized in the main thread. If you cannot get genuine fresh context, say so plainly.

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
- **Reviewer disagreement loops**: If the reviewer keeps flagging the same section after your fix, the spec likely has a genuine ambiguity. Surface it to the user instead of looping.
- **Tag drift**: Complexity tags can be wrong. `ctx-execute` should re-classify mid-flight.
- **Question marathon**: If you're past 5 questions and still unclear, stop asking and summarize what you know. Ask "what am I missing?" instead of question #6.
- **Inventing thresholds that already exist**: When designing states or edge cases for a component that consumes an existing utility, derive the cases from that utility's thresholds. Run `Grep` for the source function before proposing breakpoints.
- **Proposing new API work when data already flows**: Before suggesting backend changes to serve data, trace the data path from where it's consumed: component -> hook/query -> API endpoint.
- **Proposing implementation details without checking conventions**: Before recommending libraries, patterns, or API styles in the design, check the repository instructions first. Wrong conventions here propagate downstream.
- **Skipping factory for visual content**: Architecture diagrams, A/B/C option cards, layout comparisons, and design decisions are visual. Use the factory when the choice is spatial.

---

## Skill Files

- `SKILL.md` — this file
- `./references/spec-reviewer-prompt.md` — review template for the fresh-context pass
- Shared with brainstorm: `..ctx-brainstorm/references/complexity-tags.md`, `..ctx-brainstorm/references/factory-guide.md`
- Shared factory server: `..ctx-brainstorm/factory/`

---

## Handoff

When the spec is approved and tagged, the next step is `ctx-plan`.

```text
ctx-brainstorm-ss -> ctx-plan
```

If the user later chooses delegated implementation, the full Codex-native route is:

```text
ctx-brainstorm-ss -> ctx-plan -> ctx-worktree -> ctx-execute
```
