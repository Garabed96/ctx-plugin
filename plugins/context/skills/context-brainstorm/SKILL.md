---
name: context-brainstorm
description: >
  Use before building any feature. Lean tier for small-to-medium tasks —
  self-review, no subagents. Auto-escalates to /context-brainstorm-ss when
  complexity signals detected (3+ subsystems, high ambiguity, new domain).
user-invocable: true
---

# /context-brainstorm — Lean Design Exploration

Core principle: understand what to build before building it. Spend tokens on discovery, not ceremony.

## Skill Files

- `SKILL.md` — this file (process, self-review, principles, gotchas)
- `references/example-spec.md` — canonical spec example (read this before writing your first spec)
- `references/complexity-tags.md` — LOW/MED/HIGH tagging guide (shared with brainstorm-ss)
- `references/companion-guide.md` — visual companion CSS classes, loop, terminal-vs-browser guide
- `companion/` — server, frame template, launcher (read only when user accepts companion offer)

---

## Process

1. **Explore context** — check files, docs, recent commits relevant to the idea
2. **Scope check** — if the request covers multiple independent systems, decompose first. If scope is large or ambiguity is high, suggest `/context-brainstorm-ss` (see Escalation below)
3. **Ask questions** — one at a time, prefer multiple choice, understand purpose/constraints/success criteria
4. **Visual companion** — offer once if upcoming questions are visual (read `references/companion-guide.md`)
5. **Propose 2-3 approaches** — with tradeoffs, lead with your recommendation
6. **Present design** — sections scaled to complexity, get approval incrementally
7. **Write spec** — save to `docs/specs/YYYY-MM-DD-<topic>-design.md`, commit
8. **Self-review** — apply the five checks below, fix issues inline
9. **User reviews spec** — ask user to review before proceeding
10. **Tag complexity** — mark each planned unit as `[LOW]`, `[MED]`, or `[HIGH]` (see `references/complexity-tags.md`)

---

## Spec Self-Review

Before presenting the spec to the user, verify:

- [ ] **YAGNI** — every component earns its place. Remove anything speculative.
- [ ] **Pattern audit** — before proposing new abstractions, API fields, or data paths, search codebase for existing patterns that already solve the problem. Trace from consumer (component) → hook/query → API endpoint to verify what data is already available.
- [ ] **Data flow** — can you trace input -> transform -> output for every feature?
- [ ] **Success criteria** — does the spec define what "done" looks like?
- [ ] **Testability** — can each unit be tested independently?

If any check fails, fix it before showing the user. No subagent needed — you already have the context.

---

## Escalation to /context-brainstorm-ss

Suggest tier 2 when you detect these signals:

- **Multiple independent systems** — scope check (step 2) finds 3+ subsystems that need separate specs
- **High ambiguity after 3+ questions** — you're still unclear on core requirements
- **Mostly [HIGH] tags** — early exploration reveals cross-cutting concerns everywhere
- **New domain** — neither you nor the codebase has established patterns to follow

Prompt:
> "This is looking complex enough that a fresh-context review would catch blind spots I might miss. Want to go SS? (`/context-brainstorm-ss`)"

The user can also invoke `/context-brainstorm-ss` directly.

---

## Key Principles

- **One question at a time** — don't overwhelm
- **YAGNI ruthlessly** — remove speculative features
- **Pattern audit before new abstractions** — search before inventing
- **Incremental validation** — present design, get approval, then proceed
- **Context budget** — if past 5 questions and still unclear, summarize what you know and ask "what am I missing?"

---

## Gotchas

_Built from real failures. Update this section as you hit new edge cases._

- **Over-engineering abstractions**: The #1 failure mode. Before proposing a context/provider/service, search the codebase for existing patterns. The simpler pattern usually exists already.
- **"Too simple to need a design"**: Every project goes through this process. A config change, a single utility — all of them. "Simple" projects are where unexamined assumptions cause the most wasted work. The design can be short, but you must present it.
- **Tag drift**: Complexity tags set during brainstorming can be wrong — complexity is often discovered during implementation. `/context-execute` should have an escape hatch to re-classify mid-flight.
- **Question marathon**: If you're past 5 questions and still unclear, stop asking and summarize what you know. Ask "what am I missing?" instead of question #6.
- **Inventing thresholds that already exist**: When designing states or edge cases for a component that consumes an existing utility, derive the cases from that utility's thresholds — don't invent new ones. Run `Grep` for the source function before proposing breakpoints.
- **Proposing new API work when data already flows**: Before suggesting backend changes to serve data, trace the data path from where it's consumed: component → hook/query → API endpoint. The endpoint often already returns what you need — you just haven't followed the chain. If you've read a component that has the data, ask "where does this come from?" and trace upstream before proposing new API fields.
- **Proposing implementation details without checking conventions**: Before recommending specific libraries, patterns, or API styles in the design, check CLAUDE.md for project conventions. The brainstorm output feeds directly into implementation — wrong conventions here propagate downstream.

---

## Handoff

When the spec is approved and tagged:
- Suggest `/context-plan` to create the implementation plan
- The complexity tags you set here drive the agent budget in `/context-execute`
