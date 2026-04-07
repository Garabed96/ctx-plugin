# Changelog

## 0.2.9.2 (2026-04-07)

- **Factory rename** — `companion/pages/` → `factory/pages/`, `companion/style-profile.json` → `factory/style-profile.json`. Plugin interface file at project root (`companion.config.js`) unchanged.
- **Main-repo-rooted pages** — factory pages now live at the main repo root, not per-worktree. All worktrees of a project share one portfolio. Server auto-resolves via `git rev-parse --git-common-dir` with fallback to `--project-dir` for non-git projects.
- **Auto-setup** — `factory/pages/` is created on first server start. No manual setup needed per project.
- **Migration required** — existing users: `mv <main-repo>/companion <main-repo>/factory` once. Per-worktree `companion/` dirs become orphaned and can be deleted.

## 0.2.9.1 (2026-04-06)

- **Terminal detection fix** — `worktree-open.sh` now uses `$TERM_PROGRAM` env var to detect the current terminal emulator instead of `pgrep`. Prevents silent fall-through from iTerm2 to Terminal.app when AppleScript permissions block automation.

## 0.2.9 (2026-04-05)

- **Enforce ship-pr.sh** — PreToolUse hook blocks manual `gh pr create`, redirects to script
- **ship-pr.sh handles pre-committed work** — `--files`/`--message` optional, skips stage/commit when nothing to do
- **Path audit** — worktree-guard auto-detects siblings from git root parent, worktree-open.sh supports tmux + iTerm2 + Terminal.app
- **Worktree-guard same-repo fix** — worktrees of the same repo no longer blocked as cross-repo edits
- **kill-wt fetch before teardown** — `git fetch origin` before branch delete to verify merge status
- **grab-restore.sh bugfix** — `set -e` no longer kills script before outputting `status=not_found`
- **Script tests** — kill-wt + worktree-guard regression tests, 47/47 passing
- **Docs** — Getting Started workflow, companion server setup, updated hooks table
- **iOS Simulator QA pipeline** — `sim-interact.sh` (boot, open, screenshot, scroll, tap) + `preview-device.sh` for real WebKit QA on iPhone
- **iOS mobile reference** — `ios-mobile.md` checklist for safe areas, dvh, form controls, touch targets

## 0.2.8.1 (2026-04-05)

- **kill-wt safe teardown** — `--worktree` flag for remote kill from main repo, `--detach` flag for background teardown when session is inside the worktree being killed. Prevents destroying Claude Code session.

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
