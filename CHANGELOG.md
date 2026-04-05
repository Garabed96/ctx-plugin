# Changelog

## 0.2.8 (2026-04-05)

- **Companion factory MVP** — portfolio landing page at `/factory`, per-page events persisted to `companion/pages/<page>/.events`, `/factory/<page>` deep-linking, `/api/page-status` endpoint
- **Cross-repo edit guard** — `worktree-guard.sh` blocks Edit/Write to sibling project repos under `~/WebstormProjects/`
- **Factory handoff flow** — prototype approved → worktree in target repo → plan the port
- **Companion frontend reference** — prototype design pipeline (strategy, copy, visual design, quality checklist)
- **Cleanup** — removed dead protosmith CLI scripts (apply, diff, discover, triage), added `.gitignore`
- **`/api/write` convention enforced** — SKILL.md mandates `POST /api/write` over direct file edits

## 0.2.7 (2026-04-05)

- **ctx-open** — open current worktree in WebStorm (#8)
- **ctx-kill-wt** — remove worktrees interactively (#9)

## 0.2.6 (2026-04-04)

- **Auto-PR hook** — PostToolUse hook triggers typecheck + draft PR creation after `git push` (#7)

## 0.2.5 (2026-04-02)

- **Companion design** — ctx-companion spec, visual brainstorming canvas (#6)
- **Structural improvements** — plugin architecture from Claude Code source analysis (#5)
- **Worktree auto-swap** — native `EnterWorktree` integration (#4)

## 0.2.4 (2026-04-01)

- **Skill-script symbiosis** — extract deterministic shell scripts from hybrid skills (#2)
- **ctx-verify** — green CI gate, broken contract pattern (#1)

## 0.1.0

- Initial release. 17 skills, session continuity (park/grab), worktree management, brainstorm/plan/execute/ship pipeline.
