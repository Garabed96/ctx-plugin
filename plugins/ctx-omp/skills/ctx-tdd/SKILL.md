---
name: ctx-tdd
description: Implements behavior through a disciplined red-green-refactor cycle.
user-invocable: true
---

# ctx-tdd — Red, green, refactor

**Iron law:** do not write production behavior until a focused test demonstrates the missing observable contract.

1. State one externally observable behavior, boundary, invariant, transition, precedence rule, or real error case. Locate the existing test convention and narrowest useful seam.
2. Write one deterministic test that fails for the intended missing reason. Run that test and observe the failure; if it passes, the test is not proving the change—correct the test or choose a different contract.
3. Implement the smallest production change that makes the test pass. Run the same test and observe success.
4. Refactor only while green, preserving behavior. Re-run affected tests after every meaningful refactor.
5. Repeat for the next behavior. Avoid tests that merely assert plumbing, source text, incidental defaults, mock interactions, or implementation details.
6. Use `skill://ctx-tdd/references/testing-anti-patterns.md` before adding mocks or shared test utilities.

At completion, report each red/green observation and the behavior it defends. For a bug, include confirmation that the original reproduction no longer triggers.