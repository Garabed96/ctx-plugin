---
name: ctx-verify
description: >
  Use when about to claim work is complete, fixed, or passing — requires running
  verification commands and reading output before making any success claims.
user-invocable: true
---

# /ctx-verify — Evidence Before Claims

Claiming completion without verification is dishonesty, not efficiency. This skill enforces a hard gate: run the command, read the output, THEN make the claim.

Invoke standalone any time you need to verify work, or compose into other skills (e.g., `/ctx-ship` Phase 3, `/ctx-execute` final verification).

## Skill Files

- `SKILL.md` — this file

---

## The Iron Law

```
NO COMPLETION CLAIMS WITHOUT FRESH VERIFICATION EVIDENCE
```

If you haven't run the verification command in this message, you cannot claim it passes. Violating the letter of this rule is violating the spirit of this rule.

---

<HARD-GATE>

## The Gate Function

Before claiming any status or expressing satisfaction:

```
1. IDENTIFY — What command proves this claim?
2. RUN     — Execute the FULL command (fresh, not cached, complete)
3. READ    — Full output. Check exit code. Count failures.
4. VERIFY  — Does output actually confirm the claim?
              YES → State claim WITH evidence (command + output)
              NO  → State actual status with evidence
5. CLAIM   — Only now may you assert the result
```

**Skip any step = lying, not verifying.**

</HARD-GATE>

---

## What Counts as Verification

| Claim | Requires | Not Sufficient |
|-------|----------|----------------|
| Tests pass | Test command output: 0 failures | Previous run, "should pass" |
| Linter clean | Linter output: 0 errors | Partial check, extrapolation |
| Build succeeds | Build command: exit 0 | Linter passing, "logs look good" |
| Bug fixed | Reproduce original symptom: passes | Code changed, assumed fixed |
| Regression test works | Red-green cycle verified | Test passes once |
| Agent completed | VCS diff shows actual changes | Agent reports "success" |
| Requirements met | Line-by-line checklist against spec | "Tests passing" |
| Orchestration correct | Path-level: trace data written per code path, assert full side-effect contract | Tests pass, tsc clean (function-level only) |

---

## Red Flags — STOP Immediately

Catch yourself if you notice any of these:

- Using **"should"**, **"probably"**, **"seems to"** about work state
- Expressing satisfaction before verification ("Great!", "Perfect!", "Done!")
- About to commit, push, or open a PR without running checks
- Trusting a subagent's success report without verifying the diff
- Relying on partial verification (lint passed, so build must pass)
- Thinking **"just this once"** — no exceptions
- **Any wording implying success without having run verification**

---

## Rationalization Prevention

| Excuse | Reality |
|--------|---------|
| "Should work now" | Run the verification |
| "I'm confident" | Confidence is not evidence |
| "Just this once" | No exceptions |
| "Linter passed" | Linter is not the compiler |
| "Agent said success" | Verify independently |
| "Partial check is enough" | Partial proves nothing |
| "Different words so rule doesn't apply" | Spirit over letter |

---

## Key Patterns

**Tests:**
```
CORRECT:  [Run test command] → [See: 34/34 pass] → "All tests pass"
WRONG:    "Should pass now" / "Looks correct"
```

**Regression tests (TDD red-green):**
```
CORRECT:  Write test → Run (pass) → Revert fix → Run (MUST FAIL) → Restore → Run (pass)
WRONG:    "I've written a regression test" (without red-green cycle)
```

**Build:**
```
CORRECT:  [Run build] → [See: exit 0] → "Build passes"
WRONG:    "Linter passed" (linter does not check compilation)
```

**Requirements:**
```
CORRECT:  Re-read spec → Create checklist → Verify each item → Report gaps or completion
WRONG:    "Tests pass, phase complete"
```

**Subagent delegation:**
```
CORRECT:  Agent reports success → Check VCS diff → Verify changes match intent → Report
WRONG:    Trust agent report at face value
```

---

## When To Apply

**Always before:**
- Any variation of success or completion claims
- Any expression of satisfaction about work state
- Committing, pushing, PR creation, task sign-off
- Moving to the next task in a plan
- Reporting subagent results back to the user

**The rule applies to:**
- Exact phrases ("all tests pass")
- Paraphrases and synonyms ("everything looks good")
- Implications of success ("we're ready to ship")
- Any communication suggesting completion or correctness

---

## Composability

This skill is standalone but composes naturally with:

```
/ctx-ship   → Phase 3 (Verify) invokes this gate
/ctx-execute → Final verification uses this gate
Any workflow    → Invoke before claiming DONE
```

---

## Gotchas

- **Stale evidence decays fast.** If you made changes after the last test run, the evidence is stale. Re-run.
- **Partial verification is not verification.** Running unit tests does not verify the build. Running lint does not verify tests. Each claim needs its own evidence.
- **Subagents lie (unintentionally).** An agent reporting "DONE" means it thinks it's done. Check the diff yourself.
- **Time pressure is when this matters most.** The urge to skip verification correlates with the likelihood of bugs. Resist.
- **Green CI, broken contract.** When changes reorder control flow, add early exits, or reroute side effects, "tests pass + tsc clean" verifies function shape, not orchestration. Trace data written by each code path and assert the full contract (activities created, IDs consistent, associations linked). Signal: diff touches service-layer method ordering or adds `return` before existing logic.
