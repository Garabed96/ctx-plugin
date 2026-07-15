# Factory Guardrails And Plan Contracts

**Date:** 2026-06-23
**Status:** Draft for maintainer review
**Repository:** `ctx-plugin`
**Scope:** CTX plugin workflow prompts and deterministic helper scripts

## Problem

CTX has two valuable workflow strengths:

- the factory gives agents a practical visual workspace for product and UI exploration
- `ctx-plan` turns approved specs into tagged implementation plans

The weak points are in long-running and iterative work:

- Factory iterations can drift into full rewrites instead of targeted changes.
- Agents can spend too many tokens regenerating prototype HTML that already exists.
- Factory sessions can keep producing visual versions after the decision should have been converted into a spec or plan.
- Plan tasks do not explicitly state the contracts they consume from earlier tasks or produce for later tasks.
- Long implementation sessions can lose their place after context compaction and accidentally replay completed work.

This spec strengthens CTX without turning the lean brainstorm path into a heavier Superpowers-style process.

## Decision

Add three workflow upgrades:

1. **Factory hard guardrails**: iteration budgets, decision questions, patch-first iteration, and explicit exit rules.
2. **Per-task interfaces** in `ctx-plan`: every task declares what it consumes and what it produces.
3. **Progress ledger** for plan execution: durable task completion state that survives compaction and worktree loss.
4. **Simplification checkpoints**: lightweight clean-code review built into specs, plans, and task completion.

Do not add a mandatory `Global Constraints` section. Repository-level rules already belong in the project instructions file for the target repo. CTX plans may still include task-specific constraints when the approved spec creates local boundaries such as "do not change schema" or "prototype is visual reference only."

## Goals

- Reduce token waste during factory iteration.
- Prevent visual exploration from drifting past the point of decision.
- Make plan tasks easier for fresh agents and subagents to execute without inventing neighboring contracts.
- Give long sessions a durable recovery map after compaction or restart.
- Reduce junior-looking drift: dead branches, duplicated logic, one-off abstractions, excessive defensive code, and convention drift.
- Keep `ctx-brainstorm` lean by default and preserve `ctx-brainstorm-ss` as the escalation path.

## Non-Goals

- Do not replace CTX with Superpowers.
- Do not make subagent review mandatory for normal brainstorms.
- Do not require `ctx-execute` for the progress ledger to be useful.
- Do not create a heavy "simplify subagent" requirement for every task.
- Do not chase line-count reduction when explicit code is clearer.
- Do not add project-specific examples, file paths, or business-domain language.
- Do not create a new visual design system for the factory.

## Design

### 1. Factory Guardrails

Factory mode should distinguish between first creation, narrow iteration, reset, and exit. Guardrails need a canonical state shape so agents do not each invent their own budget tracking.

#### Factory session state

Each factory page should track a small metadata record:

- `cycle_id`: stable identifier for one decision question, for example `sidebar-density-20260623`
- `decision_question`: the current question the prototype is meant to answer
- `version_count`: number of versions produced in the current decision cycle
- `source_version`: the version copied or patched to produce the current version
- `change_summary`: what changed from the prior version
- `fixed_decisions`: decisions that should not be revisited without explicit reset
- `status`: `exploring`, `approved`, `reset-requested`, or `exited`

Canonical state should live in a sidecar file next to the page versions:

```text
factory/pages/<group>/<page>/.ctx-factory.json
```

The visible prototype should not carry large process notes by default. For approved interactive prototypes, the latest approved HTML still needs visible `Implementation context` or `Interaction behavior` when behavior matters.

#### Iteration budget

Default rule:

- Allow at most 3 versions for a single decision question.
- After version 3, stop and ask for one of:
  - approve one version
  - name the concrete criterion that is still unresolved
  - explicitly reset with a new direction

Agents must not continue generating "one more pass" without a sharper decision criterion.

#### Patch-first iteration

Version 1 may be generated from the design prompt.

Version 2 and later must be derived from the latest active or approved source version in the same decision cycle:

1. Locate the latest version for the target group/page.
2. Copy it to the next version path.
3. Apply only the requested changes.
4. Preserve unrelated structure, copy, interactions, and implementation notes.

Full regeneration is allowed only when the user explicitly says `restart`, `new direction`, or equivalent. A reset starts a new `cycle_id` and resets `version_count`.

#### Required iteration notes

Every factory version after v1 must update `.ctx-factory.json` with:

```markdown
Decision question: <what this version is trying to decide>
Cycle ID: <decision-cycle-id>
Source version: <group/page-vN>
What changed: <short list>
What stayed fixed: <short list>
Exit condition: <approval criterion or remaining blocker>
```

The factory should prefer concise metadata over large visible notes when a prototype is intended as a polished implementation reference.

#### No vague iteration

If the user says "make it better", "more premium", "cleaner", or similar, the agent must convert that into 1-3 concrete criteria before writing a new version.

Examples:

- reduce density in the sidebar
- make the primary action easier to find
- preserve layout but improve typography hierarchy

If the agent cannot name the criteria, it must ask instead of generating.

#### Factory exit ramp

When the user approves a version:

1. Mark the version as approved.
2. Summarize the implementation-relevant decisions.
3. Stop factory iteration.
4. Move to spec or plan work.

Approval should not lead to more visual exploration unless the user explicitly opens a new decision question.

### 2. Factory CLI Support

Add a new helper so agents do not need to manually regenerate latest-version mechanics. Do not break the existing `factory/cli/iterate.sh <slug> <instruction...>` shape.

Proposed command shape:

```bash
factory/cli/prepare-iteration.sh <group> <page> --from latest --note "<instruction>"
```

Expected behavior:

- find the latest `<page>-vN.html`
- copy it to `<page>-vN+1.html`
- print the new file path
- print the source file path
- create or update `.ctx-factory.json`
- never overwrite an existing version
- return non-zero when the decision cycle has exceeded the 3-version budget and no explicit reset flag was provided

The helper should emit structured output that is cheap for an agent to parse:

```text
source=factory/pages/<group>/<page>/<page>-v3.html
target=factory/pages/<group>/<page>/<page>-v4.html
version=4
cycle_id=sidebar-density-20260623
budget_status=ok
```

The agent still applies the actual HTML changes, but the helper removes the token-heavy and error-prone parts: finding latest, copying, version naming, and budget accounting.

The existing `/api/write` path remains the normal creation path for v1 and can remain the normal final submission path for changed content. The new helper prepares a patch target for v2+; implementation should either make the factory server notice the copied file or add a small reload/broadcast path so the browser can show prepared versions without manual refresh.

### 3. Per-Task Interfaces In Plans

Extend `ctx-plan` task structure with an `Interfaces` block for cross-task and public contracts only. Do not restate files already listed under `Files`.

```markdown
### Task N: <Task Name> `[MED]`

**Files:**
- Modify: `path/to/file`
- Test: `path/to/test`

**Interfaces:**
- Consumes:
  - `<name/signature/path>` from Task M
- Produces:
  - `<name/signature/path>` for Task K

**Steps:**
- [ ] ...
```

`Consumes` means the task depends on a contract created earlier or already present.

`Produces` means later tasks rely on the task's output. It should name exact functions, commands, files, metadata keys, CLI output fields, or prompt sections when those details matter.

If a task is isolated, the block should explicitly say:

```markdown
**Interfaces:**
- Consumes: none
- Produces: none outside this task
```

This prevents fresh workers from inventing nearby names, changing contracts silently, or assuming context from the full plan.

### 4. Progress Ledger

Add a durable progress ledger for plans so execution can resume after compaction, restart, or worktree deletion.

Canonical ledger path:

```text
Claude: ~/.claude/plugins/marketplaces/ctx-plugin/progress/<plan-slug>.md
Codex:  ~/.codex/ctx-codex/progress/<plan-slug>.md
```

Each plan frontmatter must include:

```yaml
progress_ledger: <runtime-progress-path>
```

Rationale:

- current `ctx-plan`, `ctx-execute`, and `ctx-resume` already discover plans from runtime-global storage
- a runtime-global ledger survives deleted worktrees
- the plan frontmatter gives inline execution, delegated execution, and resume the same source of truth
- the ledger is separate from the plan, so agents can update progress without rewriting the plan document

Optional worktree mirror:

```text
.ctx/progress/<plan-slug>.md
```

The mirror is only a convenience for agents already inside a worktree. The runtime-global ledger is authoritative when the two disagree.

Example:

```markdown
# Progress Ledger: factory-guardrails-plan-contracts

Plan: docs/context/plans/2026-06-23-factory-guardrails-plan-contracts.md
Branch: <branch-or-null>
Started: 2026-06-23T00:00:00Z

## Current State

- Task 1: complete
  - commits: abc1234..def5678
  - verification: `bash plugins/ctx-codex/scripts/test-scripts.sh` passed
  - notes: none
- Task 2: in_progress
  - owner: current session
  - started: 2026-06-23T00:00:00Z

## Events

- 2026-06-23T00:00:00Z Task 1 marked in_progress by current session
- 2026-06-23T00:05:00Z Task 1 marked complete after verification
```

Minimum required fields:

- task number
- status: `pending`, `in_progress`, `complete`, `blocked`
- commit range when available
- verification command and result when available
- blocker summary when blocked

Agents resuming a plan must read the ledger before executing tasks. Completed tasks in the ledger must not be replayed unless the user explicitly asks to redo them.

Ledger update semantics:

- update `Current State` as a mutable table/list for cheap resume parsing
- append every transition to `Events` for auditability
- treat the runtime-global ledger as authoritative over any worktree mirror
- stop and ask if the ledger, plan frontmatter, and git history contradict each other

### 5. Prompt Updates

Update `ctx-plan` to require:

- `Interfaces` block in every task
- exact consumed/produced names when tasks depend on each other
- task-specific constraints when relevant
- `progress_ledger` in the plan frontmatter
- creation of the runtime-global ledger when a plan is written

Update inline execution guidance to require:

- read the progress ledger before starting
- update the ledger after each verified task
- skip tasks already marked `complete`

Update `ctx-execute` to require:

- read ledger before starting
- create ledger if missing
- mark task `in_progress` before work starts
- mark task `complete` only after verification evidence exists
- preserve completed entries after compaction
- stop if ledger contradicts the plan or git history

Update `ctx-resume` to require:

- show the `progress_ledger` path when listing active plans
- read the ledger before relaunching a worktree
- tell the next session which task should be resumed first
- preserve the runtime-global ledger when recreating a deleted worktree

Update factory references to require:

- patch-first iteration after v1
- version budget
- decision question per cycle
- explicit reset language for full rewrites
- exit ramp on approval

Equivalent behavior must be implemented in both plugin trees, or a runtime-specific exception must be documented next to the changed file and in the implementation plan.

### 6. Simplification Checkpoints

CTX should make clean-code review part of the normal workflow without turning every plan into a refactor project.

The source pattern is the local `simplify` discipline:

- remove dead code
- remove duplication
- remove unnecessary complexity
- preserve behavior
- stay inside the scope of recent changes
- avoid new abstractions with only one call site
- prefer project conventions over invented patterns

For CTX itself, this should be generalized into runtime-agnostic guidance and applied at three points.

#### Brainstorm spec guardrails

`ctx-brainstorm` specs should include a small "Simplicity Guardrails" section when the feature changes code behavior, creates new helpers, or adds UI/workflow complexity.

The section should answer:

```markdown
## Simplicity Guardrails

- Existing patterns to reuse:
- Complexity to avoid:
- Abstractions explicitly not being introduced:
- Behavior that must not change:
- Files or areas outside scope:
```

This belongs in the spec because it sets design altitude before implementation. It should not become a generic checklist on every tiny change; if the feature is truly `[LOW]`, the section may be omitted or reduced to one sentence.

#### Plan task guardrails

`ctx-plan` should add a short `Simplification Check` to each task that modifies production code:

```markdown
**Simplification Check:**
- Remove dead code introduced or made obsolete by this task.
- Collapse duplicated logic created by this task.
- Do not add an abstraction unless at least two call sites need it, or the approved spec names it.
- Do not refactor outside the task's files.
- Preserve behavior not explicitly changed by the spec.
```

For task-specific risks, the plan should be more concrete:

```markdown
**Simplification Check:**
- Reuse the existing parser helper; do not add a second parsing path.
- Keep the new state in the existing reducer; do not add a parallel state holder.
- Delete the old branch only after the replacement path is covered by the task test.
```

The plan self-review should reject vague cleanup tasks such as "simplify later" or "clean up the code" unless they name the exact changed files and the exact class of complexity to remove.

#### Completion-time cleanup

After each task is implemented and verified, the executing agent should run a local simplification pass over only the files changed by that task.

This is a review step, not a new feature step:

1. Inspect the task diff.
2. Remove dead imports, unused variables, obsolete branches, and commented-out code.
3. Collapse duplicated logic introduced by the task.
4. Remove one-off abstractions unless the plan/spec explicitly requires them.
5. Re-run the task's targeted verification after any cleanup edit.

For `[LOW]` and most `[MED]` tasks, this should be same-context. Fresh-context simplification review is reserved for `[HIGH]` tasks, repeated drift, or when the user explicitly requests it.

The progress ledger should record the simplification checkpoint:

```markdown
- simplification: checked changed files; removed unused helper; verification re-run
```

or:

```markdown
- simplification: checked changed files; no changes needed
```

This keeps compaction recovery honest: a resumed agent can tell whether the task was merely made to pass or also cleaned up.

## Data Flow

### Factory iteration

```text
User feedback
  -> agent identifies decision question and concrete criteria
  -> factory prepare-iteration helper copies latest version to next version
  -> agent patches only requested HTML/CSS/JS changes
  -> factory server displays next version
  -> user approves, asks for concrete next version, or resets
```

### Plan execution recovery

```text
Agent resumes work
  -> reads approved plan
  -> resolves progress_ledger from plan frontmatter
  -> reads runtime-global progress ledger
  -> skips complete tasks
  -> resumes first pending/in_progress task
  -> verifies task
  -> updates Current State and appends Events entry
```

### Clean-code checkpoint

```text
Task implementation passes verification
  -> agent inspects task diff
  -> removes dead code, duplication, and one-off complexity inside task scope
  -> re-runs targeted verification if cleanup changed code
  -> writes simplification result to progress ledger
```

## Success Criteria

- [ ] Factory docs state that v2+ must copy and patch the previous version unless reset is explicit.
- [ ] Factory docs enforce a default 3-version budget per decision question.
- [ ] Factory docs require decision question, change summary, fixed decisions, and exit condition for iterations.
- [ ] Factory docs define an approval exit ramp into spec or plan work.
- [ ] Factory state has a canonical `.ctx-factory.json` schema with `cycle_id`, status, budget, and approval fields.
- [ ] Factory CLI has a deterministic helper for latest-version copy, next-version naming, metadata updates, and budget warnings.
- [ ] `ctx-plan` task template includes `Interfaces: Consumes / Produces`.
- [ ] `ctx-plan` self-review checks for missing or vague task interfaces.
- [ ] `ctx-plan` writes `progress_ledger` in frontmatter and creates the runtime-global ledger.
- [ ] `ctx-brainstorm` can capture task-relevant simplicity guardrails without forcing ceremony onto trivial changes.
- [ ] `ctx-plan` task template includes a scoped `Simplification Check` for production-code tasks.
- [ ] Execution guidance runs a post-task simplification pass over only the task diff before marking the task complete.
- [ ] Progress ledger records whether simplification was checked and whether it changed code.
- [ ] Inline execution, `ctx-execute`, and `ctx-resume` read and update the same durable progress ledger.
- [ ] Resuming after compaction or deleted worktree cannot replay tasks marked complete in the runtime-global ledger.
- [ ] Equivalent behavior is implemented for both Claude and Codex plugin trees, with documented exceptions if needed.
- [ ] User-visible changes update `CHANGELOG.md` and the relevant manifest versions.
- [ ] Script changes pass the matching script harnesses for changed runtimes.

## Complexity Tags

- [LOW] Update `ctx-plan` prompt and example plan with `Interfaces` block.
- [LOW] Add optional `Simplicity Guardrails` guidance to `ctx-brainstorm` and `ctx-brainstorm-ss`.
- [MED] Add scoped `Simplification Check` guidance to `ctx-plan`, inline execution, and `ctx-execute`.
- [MED] Add progress ledger requirements to `ctx-plan`, inline execution guidance, `ctx-execute`, and `ctx-resume`.
- [MED] Update factory prompt references with version budget, decision question, patch-first iteration, and exit ramp.
- [MED] Add factory CLI helper for latest-version copy, metadata, budget warnings, and structured output.
- [LOW] Mirror prompt/reference changes across Claude and Codex trees.
- [LOW] Replace or neutralize project-specific example-plan content touched by this change.
- [LOW] Update CHANGELOG, manifest versions, README, or maintainer docs if user-visible workflow behavior changes.

## Open Questions

- Should `prepare-iteration.sh` be purely filesystem-based, or should it call a new factory server endpoint so browser reload/broadcast behavior stays centralized?
- What exact `.ctx-factory.json` schema should be documented as v1?
- Should docs-only and prompt-only tasks accept a review checklist as verification evidence, or require a script/doc-link validation command?
- Should `[HIGH]` tasks get a default fresh-context simplification review, or should that remain explicit/user-triggered to control token spend?
