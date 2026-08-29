# Testing Anti-Patterns

Load this reference when writing or changing tests, adding mocks, or tempted to add test-only methods to production code.

**Core principle:** Test what the code does, not what the mocks do.

## The Iron Laws

```
1. NEVER test mock behavior
2. NEVER add test-only methods to production classes
3. NEVER mock without understanding dependencies
```

## Anti-Pattern 1: Testing Mock Behavior

```typescript
// WRONG: Testing that the mock exists
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByTestId('sidebar-mock')).toBeInTheDocument();
});

// RIGHT: Test real component or don't mock it
test('renders sidebar', () => {
  render(<Page />);
  expect(screen.getByRole('navigation')).toBeInTheDocument();
});
```

**Gate:** Before asserting on any mock element, ask: "Am I testing real behavior or just mock existence?" If mock existence — delete the assertion or unmock.

## Anti-Pattern 2: Test-Only Methods in Production

```typescript
// WRONG: destroy() only used in tests
class Session {
  async destroy() { /* cleanup */ }
}

// RIGHT: Test utilities handle test cleanup
// Session has no destroy() — it's stateless in production
export async function cleanupSession(session: Session) {
  const workspace = session.getWorkspaceInfo();
  if (workspace) await workspaceManager.destroyWorkspace(workspace.id);
}
```

**Gate:** Before adding any method to a production class, ask: "Is this only used by tests?" If yes — put it in test utilities instead.

## Anti-Pattern 3: Mocking Without Understanding

```typescript
// WRONG: Mock prevents config write that test depends on
vi.mock('ToolCatalog', () => ({
  discoverAndCacheTools: vi.fn().mockResolvedValue(undefined)
}));

// RIGHT: Mock the slow part, preserve behavior test needs
vi.mock('MCPServerManager'); // Just mock slow server startup
```

**Gate:** Before mocking any method: (1) What side effects does the real method have? (2) Does this test depend on any of those side effects? (3) If unsure — run with real implementation first, observe, THEN mock minimally.

## Anti-Pattern 4: Incomplete Mocks

```typescript
// WRONG: Partial mock — only fields you think you need
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' }
  // Missing: metadata that downstream code uses
};

// RIGHT: Mirror real API completeness
const mockResponse = {
  status: 'success',
  data: { userId: '123', name: 'Alice' },
  metadata: { requestId: 'req-789', timestamp: 1234567890 }
};
```

**Gate:** Before creating mock responses, check what fields the real API returns. Include ALL fields the system might consume downstream. Partial mocks fail silently.

## Anti-Pattern 5: Integration Tests as Afterthought

```
WRONG: ✅ Implementation complete → ❌ No tests → "Ready for testing"
RIGHT: Write failing test → Implement to pass → Refactor → THEN claim complete
```

## Red Flags

- Assertion checks for `*-mock` test IDs
- Methods only called in test files
- Mock setup is >50% of test
- Test fails when you remove a mock
- Can't explain why a mock is needed
- Mocking "just to be safe"

## Quick Reference

| Anti-Pattern | Fix |
|--------------|-----|
| Assert on mock elements | Test real component or unmock |
| Test-only production methods | Move to test utilities |
| Mock without understanding | Understand deps first, mock minimally |
| Incomplete mocks | Mirror real API completely |
| Tests as afterthought | TDD — tests first |
| Over-complex mocks | Consider integration tests |
