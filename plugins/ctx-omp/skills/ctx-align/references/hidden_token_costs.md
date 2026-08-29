# Hidden context costs

A request can consume more context than its visible prose suggests. Treat these as design constraints, not budgeting prompts.

| Source | Cost | Mitigation |
|---|---|---|
| Broad repository discovery | Irrelevant files and delayed judgment | Start from named paths and narrow searches. |
| Unbounded worker dispatch | Repeated context and integration cost | Dispatch only independent, bounded tasks. |
| Verbose generated artifacts | Review burden and stale duplication | Preserve canonical artifacts; project concise views. |
| Large browser/terminal output | Lost signal | Capture the smallest evidence that proves behavior. |
| Repeated context restatement | Drift and token waste | Link the source artifact and summarize only the decision. |

Avoid instructions expressed as token targets. Prefer outcome, scope, evidence, and stop conditions. A useful prompt gives enough context to act reliably without reproducing the entire project state.