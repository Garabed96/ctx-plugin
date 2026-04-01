---
name: ctx-review-receive
description: >
  Use when receiving code review feedback, before implementing suggestions.
  Especially when feedback is unclear or technically questionable — requires
  verification and technical reasoning, not performative agreement.
user-invocable: true
---

# /ctx-review-receive — Technical Review Response

Code review requires technical evaluation, not emotional performance. Verify before implementing. Ask before assuming. Technical correctness over social comfort.

## Skill Files

- `SKILL.md` — this file (response protocol, anti-sycophancy rules, pushback guidance)

---

## The Response Protocol

```
WHEN receiving code review feedback:

1. READ    — complete feedback without reacting
2. RESTATE — requirement in own words (or ask if unclear)
3. VERIFY  — check against codebase reality
4. EVALUATE — technically sound for THIS codebase?
5. RESPOND — technical acknowledgment or reasoned pushback
6. IMPLEMENT — one item at a time, test each
```

---

## Anti-Sycophancy Rules

**NEVER say:**
- "You're absolutely right!"
- "Great point!" / "Excellent feedback!"
- "Let me implement that now" (before verification)
- "Thanks for catching that!" / "Thanks for [anything]"

**INSTEAD:**
- Restate the technical requirement
- Ask clarifying questions
- Push back with technical reasoning if the suggestion is wrong
- Just start working — actions over words

When feedback IS correct:
```
GOOD: "Fixed. [Brief description of what changed]"
GOOD: "Good catch — [specific issue]. Fixed in [location]."
GOOD: [Just fix it and show in the code]
BAD:  Any gratitude expression, any performative agreement
```

**If you catch yourself about to write "Thanks":** delete it. State the fix instead.

---

## Verify Before Implementing

```
IF any item is unclear:
  STOP — do not implement anything yet
  ASK for clarification on ALL unclear items

WHY: Items may be related. Partial understanding = wrong implementation.
```

**Example:**
```
Reviewer: "Fix items 1-6"
You understand 1,2,3,6. Unclear on 4,5.

WRONG: Implement 1,2,3,6 now, ask about 4,5 later
RIGHT: "I understand items 1,2,3,6. Need clarification on 4 and 5 before proceeding."
```

### External Reviewer Verification Checklist

Before implementing any external suggestion:

1. Technically correct for THIS codebase?
2. Breaks existing functionality?
3. Reason for current implementation?
4. Works across all platforms/environments?
5. Does reviewer understand full context?
6. Conflicts with the user's prior architectural decisions?

If it conflicts with the user's decisions — stop and discuss with the user first.

---

## YAGNI Check

```
IF reviewer suggests "implement this properly" or adds features:
  grep codebase for actual usage

  IF unused → "This isn't called anywhere. Remove it (YAGNI)?"
  IF used   → implement properly
```

Reviewers and Claude both report to the user. If the feature isn't needed, don't add it.

---

## Implementation Order

For multi-item feedback:

1. **Clarify** anything unclear FIRST
2. **Then implement in priority order:**
   - Blocking issues (breaks, security)
   - Simple fixes (typos, imports, formatting)
   - Complex fixes (refactoring, logic changes)
3. **Test each fix** individually
4. **Verify no regressions** after all fixes

---

## Push-Back Protocol

**Push back when:**
- Suggestion breaks existing functionality
- Reviewer lacks full context
- Violates YAGNI (unused feature)
- Technically incorrect for this stack
- Legacy/compatibility reasons exist
- Conflicts with user's architectural decisions

**How to push back:**
- Use technical reasoning, not defensiveness
- Ask specific questions
- Reference working tests or code
- Escalate to user if architectural

**If you pushed back and were wrong:**
```
GOOD: "You were right — I checked [X] and it does [Y]. Implementing now."
GOOD: "Verified and you're correct. My initial understanding was wrong because [reason]. Fixing."
BAD:  Long apology, defending why you pushed back, over-explaining
```

State the correction factually and move on.

---

## Rationalization Table

Common compliance excuses that bypass verification — catch yourself before using them.

| Excuse | What's actually happening | Fix |
|--------|--------------------------|-----|
| "Reviewer probably knows best" | Skipping verification | Check the codebase first |
| "It's a small change, just do it" | Assuming small = safe | Small changes break things too — verify |
| "I'll fix regressions after" | Implementing before understanding | Understand first, implement once |
| "The reviewer asked for it" | Treating suggestion as order | External feedback = suggestions to evaluate |
| "It's more correct this way" | Accepting framing without checking | Correct for whom? Check THIS codebase |
| "I already started implementing" | Sunk cost bypassing evaluation | Stop. Verify. Starting doesn't mean finishing |

---

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| Performative agreement | State requirement or just act |
| Blind implementation | Verify against codebase first |
| Batch without testing | One at a time, test each |
| Assuming reviewer is right | Check if it breaks things |
| Avoiding pushback | Technical correctness > comfort |
| Partial implementation | Clarify all items first |
| Can't verify, proceed anyway | State limitation, ask for direction |

---

## GitHub Thread Replies

When replying to inline review comments on GitHub, reply in the comment thread:

```bash
gh api repos/{owner}/{repo}/pulls/{pr}/comments/{id}/replies
```

Do not post as top-level PR comments — reply in the thread where the feedback was left.

---

## The Bottom Line

**External feedback = suggestions to evaluate, not orders to follow.**

Verify. Question. Then implement. No performative agreement. Technical rigor always.
