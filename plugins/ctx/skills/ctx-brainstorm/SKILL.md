---
name: ctx-brainstorm
description: >
  Use before building any feature. Lean tier for small-to-medium tasks —
  self-review, no subagents. Auto-escalates to /ctx-brainstorm-ss when
  complexity signals detected (3+ subsystems, high ambiguity, new domain).
user-invocable: true
---

# /ctx-brainstorm — Lean Design Exploration

Core principle: understand what to build before building it. Spend tokens on discovery, not ceremony.

<HARD-GATE>
Do NOT invoke any implementation skill, write any code, scaffold any project, or take any
implementation action until you have presented a design and the user has approved it.
Return to this skill if you catch yourself reaching for /ctx-plan or /ctx-execute
before the spec is written and approved.
</HARD-GATE>

## Process

1. **Explore context** — check files, docs, recent commits relevant to the idea
2. **Scope check** — if the request covers multiple independent systems, decompose first. If scope is large or ambiguity is high, suggest `/ctx-brainstorm-ss` (see Escalation below)
3. **Visual companion gate** — before asking any questions, evaluate: will this brainstorm involve architecture diagrams, layout comparisons, option cards, or spatial content? If yes, offer the companion as its own message and wait for the user's response before continuing (read `${CLAUDE_SKILL_DIR}/references/companion-guide.md`). If the project has a `companion/style-profile.json`, suggest factory mode (`/factory` URL) for style-aware prototyping.
3b. **Factory mode** — when the companion is running at `/factory`:
    - Read `companion/style-profile.json` for design tokens when generating prototypes (just-in-time — don't preload)
    - Write prototypes via `POST http://localhost:<port>/api/write` with `{ "page": "<name>", "content": "<html>" }` — auto-versions and reloads
    - Read `<screen-dir>/.events` for `option-select` (user clicked a choice) and `style` (user changed controls) events
    - Use `data-option` on comparison pages — see "Prototype structure" in companion-guide.md
4. **Ask questions** — one at a time, prefer multiple choice, understand purpose/constraints/success criteria
5. **Propose 2-3 approaches** — with tradeoffs, lead with your recommendation. If companion is active, present visually.
6. **Present design** — sections scaled to complexity, get approval incrementally
7. **Write spec** — save to `docs/specs/YYYY-MM-DD-<topic>-design.md`, commit
8. **Self-review** — apply the five checks below, fix issues inline
9. **User reviews spec** — ask user to review before proceeding
10. **Tag complexity** — mark each planned unit as `[LOW]`, `[MED]`, or `[HIGH]` (see `${CLAUDE_SKILL_DIR}/references/complexity-tags.md`)

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

## Escalation to /ctx-brainstorm-ss

Suggest tier 2 when you detect these signals:

- **Multiple independent systems** — scope check (step 2) finds 3+ subsystems that need separate specs
- **High ambiguity after 3+ questions** — you're still unclear on core requirements
- **Mostly [HIGH] tags** — early exploration reveals cross-cutting concerns everywhere
- **New domain** — neither you nor the codebase has established patterns to follow

Prompt:
> "This is looking complex enough that a fresh-context review would catch blind spots I might miss. Want to go SS? (`/ctx-brainstorm-ss`)"

The user can also invoke `/ctx-brainstorm-ss` directly.

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
- **Tag drift**: Complexity tags set during brainstorming can be wrong — complexity is often discovered during implementation. `/ctx-execute` should have an escape hatch to re-classify mid-flight.
- **Question marathon**: If you're past 5 questions and still unclear, stop asking and summarize what you know. Ask "what am I missing?" instead of question #6.
- **Inventing thresholds that already exist**: When designing states or edge cases for a component that consumes an existing utility, derive the cases from that utility's thresholds — don't invent new ones. Run `Grep` for the source function before proposing breakpoints.
- **Proposing new API work when data already flows**: Before suggesting backend changes to serve data, trace the data path from where it's consumed: component → hook/query → API endpoint. The endpoint often already returns what you need — you just haven't followed the chain. If you've read a component that has the data, ask "where does this come from?" and trace upstream before proposing new API fields.
- **Proposing implementation details without checking conventions**: Before recommending specific libraries, patterns, or API styles in the design, check CLAUDE.md for project conventions. The brainstorm output feeds directly into implementation — wrong conventions here propagate downstream.
- **Skipping companion for visual content**: Architecture diagrams, A/B/C option cards, layout comparisons, and design decisions are visual — use the companion. Text walls with ASCII art are not a substitute. If you're about to present 3+ options with diagrams or spatial content, that's a companion question. The gate at step 3 exists because by the time you're synthesizing, you've already committed to text mode and won't backtrack.

---

## Skill Files

- `SKILL.md` — this file (process, self-review, principles, gotchas)
- `${CLAUDE_SKILL_DIR}/references/example-spec.md` — canonical spec example (read this before writing your first spec)
- `${CLAUDE_SKILL_DIR}/references/complexity-tags.md` — LOW/MED/HIGH tagging guide (shared with brainstorm-ss)
- `${CLAUDE_SKILL_DIR}/references/companion-guide.md` — visual companion CSS classes, loop, terminal-vs-browser guide
- `${CLAUDE_SKILL_DIR}/companion/` — server, frame template, launcher (read only when user accepts companion offer)

---

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Too simple to need a design" | Simple is where unexamined assumptions waste the most time. The design can be short. |
| "I already know how to build this" | You know ONE way. The design process surfaces alternatives. |
| "Let me just start coding and see" | Exploration without design = undirected token burn. |
| "The user seems impatient" | A 5-minute brainstorm saves a 2-hour rework. |
| "This is just a config change" | Config changes have blast radius. Document it. |

---

## Handoff

When the spec is approved and tagged, the ONLY next step is `/ctx-plan`. Do NOT invoke `/ctx-execute`, `/ctx-ship`, or any implementation skill directly from brainstorm.

```
/ctx-brainstorm → /ctx-plan (ONLY valid next skill)
```

The complexity tags you set here drive the agent budget in `/ctx-execute`.
