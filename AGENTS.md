# AGENTS.md

Guidance for agents working on `ctx-plugin` itself.

## Purpose

This repository contains the source for the same workflow toolkit in two runtimes:

- `plugins/ctx` — Claude plugin
- `plugins/ctx-codex` — Codex port

Top-level docs and release notes describe the product as a whole. Most maintainer work is either:

- mirrored across both plugin trees, or
- intentionally runtime-specific and limited to one tree

## Repo Map

- `README.md` — user-facing product overview and workflow description
- `CHANGELOG.md` — release history; update for user-visible changes
- `docs/maintainer-notes.md` — maintainer landmines and release-tagging rules
- `plugins/ctx/.claude-plugin/plugin.json` — Claude plugin manifest
- `plugins/ctx-codex/.codex-plugin/plugin.json` — Codex plugin manifest
- `plugins/ctx/skills/` — Claude skill prompts and references
- `plugins/ctx-codex/skills/` — Codex skill prompts and references
- `plugins/ctx/scripts/` — Claude-side shell helpers
- `plugins/ctx-codex/scripts/` — Codex-side shell helpers
- `plugins/ctx/hooks/` — Claude hook wiring and shell hooks
- `plugins/ctx/agents/` — Claude subagent prompts

## Change Strategy

- Treat `plugins/ctx` and `plugins/ctx-codex` as sibling products with intentionally similar structure.
- If a change affects workflow behavior, shell script contracts, prompt logic, reference docs, or naming conventions, check whether the equivalent file exists in the other tree and update it too unless the behavior is runtime-specific.
- Keep mirrored files aligned in layout and semantics. Avoid letting one tree drift accidentally.
- Prefer editing the existing mirrored script or skill instead of creating a one-off variant with a different contract.

## Script Conventions

- Shell helpers are expected to take args in, print progress to stderr, and return structured `key=value` output on stdout.
- Preserve script names and flag shapes unless the user explicitly wants a breaking change.
- When changing a script in one runtime, inspect the counterpart in the other runtime before finishing.

## Release Discipline

- For user-visible changes, update `CHANGELOG.md` in the same change.
- Bump the manifest version for the runtime you changed:
  - `plugins/ctx/.claude-plugin/plugin.json`
  - `plugins/ctx-codex/.codex-plugin/plugin.json`
- Follow `docs/maintainer-notes.md` for release tagging. Starting with `v0.2.9.4`, tags are annotated, not lightweight.

## Validation

- For script changes, run the matching integration harness:
  - `plugins/ctx/scripts/test-scripts.sh`
  - `plugins/ctx-codex/scripts/test-scripts.sh`
- For skill or doc changes, verify referenced relative paths still exist and still match the repo layout.
- For mirrored changes, sanity-check both plugin trees before concluding the work is done.

## Known Landmines

- The `companion` to `factory` rename is incomplete by design. Preserve literal `companion.config.js` references where existing source still depends on that name.
- Worktrees created by the plugin intentionally sparse-exclude the repo-root `factory/` directory. Do not assume `factory/pages/` exists inside every generated worktree.
- Factory routing is easy to misread:
  - `/factory` serves the portfolio landing page
  - `/factory/<page>` serves the editor UI

## Scope Hygiene

- Do not treat `.claude/skill-invocations.log` or similar runtime logs as durable product source.
- Avoid incidental repo-wide rewrites unless they are required for the task.
- If a docs statement and the code disagree, trust the code only after checking `docs/maintainer-notes.md` and `CHANGELOG.md` for intentional exceptions.
