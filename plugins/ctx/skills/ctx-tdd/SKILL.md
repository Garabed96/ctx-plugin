---
name: ctx-tdd
description: >
  Use when implementing any feature or bugfix, before writing production code.
  Triggers: "tdd", "test first", "test-driven", "write a failing test".
user-invocable: true
---

# /ctx-tdd -- Test-Driven Development

Write the test first. Watch it fail. Write minimal code to pass.

**Core principle:** If you didn't watch the test fail, you don't know if it tests the right thing.

## When to Use

**Always:**
- New features
- Bug fixes
- Refactoring
- Behavior changes

**Exceptions (ask the user):**
- Throwaway prototypes
- Generated code
- Configuration files

Thinking "skip TDD just this once"? That's rationalization. See the table below.

---

## The Iron Law

<HARD-GATE>
NO PRODUCTION CODE WITHOUT A FAILING TEST FIRST

Write code before the test? Delete it. Start over.

- Don't keep it as "reference"
- Don't "adapt" it while writing tests
- Don't look at it
- Delete means delete

Implement fresh from tests. Period.
</HARD-GATE>

---

## Red-Green-Refactor

### RED -- Write Failing Test

Write one minimal test showing what should happen.

<Good>
```typescript
test('retries failed operations 3 times', async () => {
  let attempts = 0;
  const operation = () => {
    attempts++;
    if (attempts < 3) throw new Error('fail');
    return 'success';
  };

  const result = await retryOperation(operation);

  expect(result).toBe('success');
  expect(attempts).toBe(3);
});
```
Clear name, tests real behavior, one assertion focus
</Good>

<Bad>
```typescript
test('retry works', async () => {
  const mock = jest.fn()
    .mockRejectedValueOnce(new Error())
    .mockRejectedValueOnce(new Error())
    .mockResolvedValueOnce('success');
  await retryOperation(mock);
  expect(mock).toHaveBeenCalledTimes(3);
});
```
Vague name, tests the mock not the code
</Bad>

**Requirements:**
- One behavior per test
- Clear name describing that behavior
- Real code paths (mocks only when unavoidable)

### Verify RED -- Watch It Fail

**MANDATORY. Never skip.**

Run the test. Confirm:
- Test **fails** (not errors from typos/syntax)
- Failure message matches your expectation
- Fails because the feature is missing, not because setup is broken

Test passes immediately? You're testing existing behavior. Fix the test.

Test errors? Fix the error, re-run until it fails correctly.

### GREEN -- Minimal Code

Write the simplest code that makes the test pass.

<Good>
```typescript
async function retryOperation<T>(fn: () => Promise<T>): Promise<T> {
  for (let i = 0; i < 3; i++) {
    try {
      return await fn();
    } catch (e) {
      if (i === 2) throw e;
    }
  }
  throw new Error('unreachable');
}
```
Just enough to pass
</Good>

<Bad>
```typescript
async function retryOperation<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    backoff?: 'linear' | 'exponential';
    onRetry?: (attempt: number) => void;
  }
): Promise<T> { /* YAGNI */ }
```
Over-engineered beyond what the test demands
</Bad>

Don't add features, refactor unrelated code, or "improve" beyond the test.

### Verify GREEN -- Watch It Pass

**MANDATORY.**

Run the test. Confirm:
- New test passes
- All existing tests still pass
- Output is clean (no warnings, no errors)

Test fails? Fix production code, not the test.

Other tests break? Fix those now before moving on.

### REFACTOR -- Clean Up (After Green Only)

- Remove duplication
- Improve names
- Extract helpers

Keep tests green throughout. Don't add behavior during refactor.

### Repeat

Next failing test for the next behavior.

---

## Common Rationalizations

| Excuse | Reality |
|--------|---------|
| "Too simple to test" | Simple code breaks. The test takes 30 seconds. |
| "I'll test after" | Tests passing immediately prove nothing. |
| "Tests after achieve the same goals" | Tests-after = "what does this do?" Tests-first = "what should this do?" |
| "Already manually tested" | Ad-hoc is not systematic. No record, can't re-run. |
| "Deleting X hours is wasteful" | Sunk cost fallacy. Keeping unverified code is technical debt. |
| "Keep as reference, write tests first" | You'll adapt it. That's testing after. Delete means delete. |
| "Need to explore first" | Fine. Throw away exploration, then start with TDD. |
| "Test hard = design unclear" | Listen to the test. Hard to test = hard to use. |
| "TDD will slow me down" | TDD is faster than debugging. "Pragmatic" shortcuts = debugging in production. |
| "This is different because..." | It's not. |

---

## Red Flags -- STOP and Start Over

Any of these mean: delete the code and restart with TDD.

- Production code written before a test
- Test passes on first run (you're testing existing behavior)
- Can't explain why the test failed
- Tests added "later"
- Rationalizing "just this once"
- "Keep as reference" or "adapt existing code"

---

## Bug Fix Workflow

Bug found? Write a failing test that reproduces it first. Then follow the cycle.

**RED**
```typescript
test('rejects empty email', async () => {
  const result = await submitForm({ email: '' });
  expect(result.error).toBe('Email required');
});
```

**Verify RED** -- test fails, `expected 'Email required', got undefined`

**GREEN**
```typescript
function submitForm(data: FormData) {
  if (!data.email?.trim()) {
    return { error: 'Email required' };
  }
  // ...
}
```

**Verify GREEN** -- all tests pass

**REFACTOR** -- extract validation if needed

Never fix bugs without a failing test first.

---

## When Stuck

| Problem | Solution |
|---------|----------|
| Don't know how to test | Write the wished-for API. Write the assertion first. Ask the user. |
| Test too complicated | Design too complicated. Simplify the interface. |
| Must mock everything | Code too coupled. Use dependency injection. |
| Test setup is huge | Extract helpers. Still complex? Simplify the design. |

---

## Verification Checklist

Before claiming work is complete:

- [ ] Every new function/method has a test
- [ ] Watched each test fail before implementing
- [ ] Each test failed for the expected reason (feature missing, not typo)
- [ ] Wrote minimal code to pass each test
- [ ] All tests pass
- [ ] Output is clean (no errors, no warnings)
- [ ] Tests use real code (mocks only when unavoidable)
- [ ] Edge cases and error paths covered

Can't check all boxes? You skipped TDD. Start over.

---

## Anti-Patterns

When adding mocks or test utilities, read `${CLAUDE_SKILL_DIR}/references/testing-anti-patterns.md` to avoid common pitfalls. The short version: mocks are tools to isolate, not things to test.

---

## Gotchas

- **"Too simple to need TDD"**: Simple is where unexamined assumptions cause the most wasted work. The cycle can be fast, but you must follow it.
- **Test runner discovery**: Before writing the first test, check the project for an existing test runner (package.json scripts, Makefile targets, pytest.ini). Match the existing pattern.
- **Mocking creep**: If mock setup exceeds test logic, you're testing mocks, not code. Read the anti-patterns reference.
- **Refactor drift**: Refactoring is for cleaning up, not adding behavior. If you catch yourself adding a feature during refactor, stop -- write a new failing test first.

---

## Skill Files

- `SKILL.md` -- this file (process, Iron Law, cycle, rationalizations)
- `${CLAUDE_SKILL_DIR}/references/testing-anti-patterns.md` -- 5 anti-patterns with gate functions and Good/Bad examples
