# OMP task routing

| Role | Use when | Boundaries | Returns |
|---|---|---|---|
| `implementer` | A bounded delivery slice owns code changes | Exact files, no remote operations, targeted proof | Status and evidence |
| `reviewer` | Spec compliance or medium-risk quality needs independent judgment | Read-only, no scope expansion | Approved or evidenced issues |
| `code-reviewer` | High-risk production-readiness review is required | Read-only, surrounding-context inspection | Severity-ordered verdict |

Model selection is OMP configuration, not skill content. Use one batched `task` request only for independent assignments with disjoint ownership.