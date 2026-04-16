---
name: ctx-debug
description: >
  Use when encountering any bug, test failure, or unexpected behavior,
  before proposing fixes.
user-invocable: true
---

# ctx-debug — Systematic Root Cause Debugging

Random fixes waste tokens and create new bugs. Quick patches mask underlying issues.

**Core principle:** ALWAYS find root cause before attempting fixes. Symptom fixes are failure.

## The Iron Law

```
NO FIXES WITHOUT ROOT CAUSE INVESTIGATION FIRST
```

<HARD-GATE>
You MUST complete Phase 1 before proposing any fix.
If you have not traced the data flow, reproduced the issue, and identified the root cause,
you are not allowed to suggest, implement, or commit a change.
Return to Phase 1.
</HARD-GATE>

---

## When to Use

Use for ANY technical issue: test failures, bugs, unexpected behavior, performance problems, build failures, integration issues.

**Especially when:**
- Under time pressure (emergencies make guessing tempting)
- "Just one quick fix" seems obvious
- You've already tried multiple fixes that didn't work
- You don't fully understand the issue

**Don't skip when:**
- Issue seems simple (simple bugs have root causes too)
- You're in a hurry (systematic is faster than thrashing)

---

## The Four Phases

Complete each phase before proceeding to the next.

### Phase 1: Root Cause Investigation

**BEFORE attempting ANY fix:**

1. **Read error messages carefully** — don't skip past errors or warnings. Read stack traces completely. Note line numbers, file paths, error codes.

2. **Reproduce consistently** — can you trigger it reliably? What are the exact steps? If not reproducible, gather more data. Don't guess.

3. **Check recent changes** — `git diff`, recent commits, new dependencies, config changes, environmental differences.

4. **Gather evidence in multi-component systems** — before proposing fixes, add diagnostic instrumentation at each component boundary. Log what enters and exits each layer. Run once to gather evidence showing WHERE it breaks, THEN analyze.

5. **Trace data flow** — where does the bad value originate? What called this with the bad value? Keep tracing up until you find the source. Fix at source, not at symptom. See `./references/root-cause-tracing.md` for the full backward tracing technique.

### Phase 2: Pattern Analysis

1. **Find working examples** — locate similar working code in the same codebase
2. **Compare against references** — if implementing a pattern, read the reference implementation completely. Don't skim.
3. **Identify differences** — list every difference between working and broken, however small
4. **Understand dependencies** — what other components, settings, config, environment does this need?

### Phase 3: Hypothesis and Testing

1. **Form a single hypothesis** — state clearly: "I think X is the root cause because Y"
2. **Test minimally** — make the SMALLEST possible change to test the hypothesis. One variable at a time.
3. **Verify before continuing** — did it work? Yes: Phase 4. No: form NEW hypothesis. Don't stack fixes.
4. **When you don't know** — say "I don't understand X." Don't pretend. Research more.

### Phase 4: Implementation

1. **Create failing test case** — simplest possible reproduction. Automated if possible. MUST have before fixing.
2. **Implement single fix** — address the root cause. ONE change at a time. No "while I'm here" improvements.
3. **Verify fix** — test passes? No other tests broken? Issue actually resolved?
4. **If fix doesn't work** — STOP. Count how many fixes you've tried.
   - If < 3: return to Phase 1 with new information
   - If >= 3: STOP and question architecture (see below)

### When 3+ Fixes Fail: Question Architecture

Pattern indicating an architectural problem:
- Each fix reveals new shared state or coupling in a different place
- Fixes require massive refactoring to implement
- Each fix creates new symptoms elsewhere

**STOP and question fundamentals.** Is this pattern sound? Should we refactor the architecture instead of continuing to fix symptoms? Discuss with the user before attempting more fixes. This is not a failed hypothesis — it's a wrong architecture.

---

## Red Flags — STOP and Return to Phase 1

If you catch yourself thinking any of these:

- "Quick fix for now, investigate later"
- "Just try changing X and see if it works"
- "Add multiple changes, run tests"
- "Skip the test, I'll manually verify"
- "It's probably X, let me fix that"
- "I don't fully understand but this might work"
- "Here are the main problems: [lists fixes without investigation]"
- Proposing solutions before tracing data flow
- "One more fix attempt" (when already tried 2+)
- Each fix reveals new problem in different place

**ALL of these mean: STOP. The `<HARD-GATE>` applies.**

---

## Common Rationalizations

These are the excuses the agent will reach for to skip root cause analysis. Recognize them.

| Excuse | Reality |
|--------|---------|
| "Issue is simple, don't need process" | Simple issues have root causes too. Process is fast for simple bugs. |
| "Emergency, no time for process" | Systematic debugging is FASTER than guess-and-check thrashing. |
| "Just try this first, then investigate" | First fix sets the pattern. Do it right from the start. |
| "I'll write test after confirming fix works" | Untested fixes don't stick. Test first proves it. |
| "Multiple fixes at once saves time" | Can't isolate what worked. Causes new bugs. |
| "Reference too long, I'll adapt the pattern" | Partial understanding guarantees bugs. Read it completely. |
| "I see the problem, let me fix it" | Seeing symptoms != understanding root cause. |
| "One more fix attempt" (after 2+ failures) | 3+ failures = architectural problem. Question the pattern, don't fix again. |

---

## Quick Reference

| Phase | Key Activities | Success Criteria |
|-------|---------------|------------------|
| **1. Root Cause** | Read errors, reproduce, check changes, trace data flow | Understand WHAT and WHY |
| **2. Pattern** | Find working examples, compare differences | Identify what's different |
| **3. Hypothesis** | Form theory, test minimally | Confirmed or new hypothesis |
| **4. Implementation** | Create test, fix, verify | Bug resolved, tests pass |

---

## User Signals You're Doing It Wrong

Watch for these redirections:
- "Is that not happening?" — you assumed without verifying
- "Will it show us...?" — you should have added evidence gathering
- "Stop guessing" — you're proposing fixes without understanding
- "Ultrathink this" — question fundamentals, not just symptoms
- "We're stuck?" (frustrated) — your approach isn't working

**When you see these:** STOP. Return to Phase 1.

---

## When Process Reveals "No Root Cause"

If systematic investigation reveals the issue is truly environmental, timing-dependent, or external:

1. You've completed the process
2. Document what you investigated
3. Implement appropriate handling (retry, timeout, error message)
4. Add monitoring/logging for future investigation

But: 95% of "no root cause" cases are incomplete investigation.

---

## Gotchas

_Built from real failures. Update this section as you hit new edge cases._

- **Jumping to fix after reading the error message**: The #1 failure mode. Reading the error is step 1 of Phase 1, not a shortcut to Phase 4. You still need to reproduce, check changes, and trace data flow.
- **Stacking diagnostic changes**: When adding instrumentation in Phase 1, add it all in one pass, run once, then analyze. Don't add one log, run, add another log, run. That's thrashing with extra steps.
- **Confusing correlation with causation**: "It broke after we changed X" does not mean X caused it. Verify the causal chain, don't just note temporal proximity.
- **Skipping Phase 2 for "obvious" bugs**: Pattern analysis catches the cases where your fix would introduce a new inconsistency with how the rest of the codebase handles the same thing.

---

## Skill Files

- `SKILL.md` — this file (iron law, four phases, rationalizations, gotchas)
- `./references/root-cause-tracing.md` — backward tracing technique for deep call stacks
- `./references/defense-in-depth.md` — 4-layer validation pattern after root cause fix
- `./references/condition-based-waiting.md` — replacing arbitrary timeouts with condition polling

---

## Handoff

After the bug is fixed and verified:
- If it revealed a design gap, suggest `ctx-brainstorm` to design the proper fix
- If it requires multi-step changes, suggest `ctx-plan` to break it into tasks
- Add defense-in-depth validation at each layer (see `./references/defense-in-depth.md`)
