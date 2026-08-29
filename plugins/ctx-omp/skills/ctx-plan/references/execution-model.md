# Execution Model Reference

Build this model before writing task prose. The plan is the source of truth for scheduling.

## 1. Derive task nodes

Split approved requirements into independently verifiable outcomes. Give each node a stable ID and one dependency-chain name. Avoid splitting trivial edits that always move together.

For every task, record:

- exact files created, modified, deleted, or generated
- the role of each file
- named interfaces produced and consumed
- targeted RED/GREEN command
- completion and ownership-release condition

## 2. Classify ownership

Classify every touched file before computing parallelism:

| Classification | Examples | Scheduling consequence |
|---|---|---|
| Exclusive production | Service, component, utility | One writer until accepted |
| Exclusive test | Unit test owned by one task | One writer until targeted GREEN |
| Shared test | Integration or end-to-end suite | Serialize writers or assign one integration task |
| Fixture or factory | Shared test data | Treat as shared unless ownership can be partitioned |
| Schema or migration | Database schema, migration files | Usually interface-producing and ordered |
| Generated artifact | Generated client, snapshot, lockfile | Assign one generating task; consumers depend on it |
| Barrel or public export | `index.ts`, package exports | Shared interface hotspot; serialize |
| Route registration | Router table, endpoint registry | Shared interface hotspot; serialize |
| Shared type or DTO | Public types, schemas, provider contracts | Producer task releases before consumers |
| Configuration | Build, lint, CI, feature flags | Shared by default; serialize writers |

Use exclusive ownership for writes. `shared` describes a scheduling hotspot, not permission for concurrent writers.

## 3. Add dependency edges

Add a hard edge when any condition holds:

1. A task consumes an interface another task produces.
2. Tasks write the same file or shared ownership hotspot.
3. A task's targeted verification requires another task's output.
4. A migration, generated artifact, route, schema, provider, service, DTO, or public export must exist first.
5. A user-visible integration cannot be tested until its foundations are released.

Do not add an edge merely because tasks belong to the same feature. Do not omit an edge merely because their file lists differ.

Reject cycles. If a cycle appears, merge inseparable work or extract a stable interface task.

## 4. Compute safe parallelism

Two tasks are parallel-safe only when all are true:

- neither transitively depends on the other
- exclusive ownership does not overlap
- shared files do not overlap
- all consumed interfaces are already released
- targeted verification does not mutate or depend on the same unstable resource
- each file and dependent chain has one active writer

List only useful parallel pairs. Use `none` when serialization is safer than a weak concurrency claim.

## 5. Compute waves and critical path

Assign Wave 1 to nodes with no dependencies. Remove them conceptually, then assign the next ready nodes to Wave 2, continuing until complete. Record the longest or highest-risk dependency chain as the critical path.

Waves are advisory, not barriers. A scheduler may release a downstream task immediately when its dependencies pass targeted verification, its scoped diff is accepted, and ownership is released.

## 6. Build review batches

Group completed tasks into review batches at meaningful integration boundaries. A batch must state:

- included task IDs and resulting behavior
- exact integration test, typecheck, and lint commands that apply
- cumulative diff or contract review scope
- required reviewer posture, including fresh-context review when warranted
- pass criteria and which downstream work the batch unlocks

Do not rerun broad unchanged verification after every task. Put it at the narrowest batch boundary that can detect cross-task failure.

Ownership release makes a task schedulable as a dependency; it does not make the task batch-accepted. No task in a review batch is accepted until the batch gate passes.

## 7. Separate verification levels

Use three levels:

1. **Task verification** — RED/GREEN targeted tests and scoped diff acceptance for one task.
2. **Review-batch verification** — integration suite, affected typecheck/lint, cumulative diff, and review across a set of tasks.
3. **Final verification** — everything required for release, run once after all batches pass.

Name exact commands at every applicable level. State `not applicable` with a reason instead of inventing a command.

## 8. Ownership lifecycle

Each task must say what it acquires, how long it holds it, and the exact release condition. Default release condition:

```text
targeted GREEN + scoped diff accepted + produced interfaces recorded
```

Release ownership immediately after acceptance so newly-ready tasks can start.

Distinguish scoped task acceptance from review-batch acceptance: the former releases ownership; the latter approves the cumulative behavior.

## 9. Scheduling policy

Include this policy in every non-trivial plan:

```text
Run dependent tasks sequentially. Run ready tasks concurrently only when dependencies are satisfied, exclusive ownership does not overlap, shared files do not overlap, interface dependencies are released, and there is one writer per file and dependent chain. Release ownership immediately after targeted GREEN and scoped diff acceptance. Treat waves as advisory; start newly-ready tasks dynamically. Run broad verification at review-batch boundaries and final release, not after every unchanged task.
```

For a persistent goal, instruct the orchestrator to execute this graph and policy. Do not duplicate or reinterpret the graph in the goal prompt.
