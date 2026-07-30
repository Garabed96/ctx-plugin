# Model routing (Claude runtime)

| Role | Binding | Permissions | Returns |
|---|---|---|---|
| Coordinator | Main session (session model, high effort) | Coordinates; integrates; updates gate state | Decisions, task briefs, integrated result |
| Research/read | Sonnet subagent (medium/high effort) | Read-only | Findings, exact evidence, uncertainty |
| Implementation | Implementer subagent (session model or Sonnet by task weight) | Scoped writes in owned files/worktree | Diff, tests, residual risk |
| Architect | Fresh high-effort subagent (Opus or stronger) | Read-only unless explicitly reassigned | Decision record, interfaces, risks |
| Verifier | `ctx-qa` or independent test/observation | Read/test/observe | Pass/fail evidence per gate |

One active coordinator owns decisions and state. Workers are evidence and implementation tools; they never redefine scope or mutate the bundle.

## Escalate to the architect when any apply

- a security, payment, destructive, migration, or durable-data decision is irreversible or lacks an established safe pattern;
- a shared API, persistence, or cross-surface contract has material interface uncertainty and no established repository pattern resolves it;
- three or more systems must coordinate across uncertain interfaces;
- two implementation approaches failed;
- a decision is hard to reverse or materially affects later gates.

Use one compact architecture decision. Do not create a parallel planning bureaucracy.

## Worker brief

```text
Gate outcome:
Owned paths:
Inputs/interfaces:
Guardrails:
Verification:
Forbidden actions:
Return: diff summary, evidence, uncertainty, follow-up.
```

The coordinator assigns disjoint ownership before parallel writes. Workers may research in parallel without file ownership. Workers do not change the PRD, Canvas, gate status, scope, or another worker's files.
