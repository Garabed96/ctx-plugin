# Changelog

## 0.2.9.10 (2026-07-15)

- **CTX Ruthless plan audits** — adds mirrored `ctx-ruthless` skills for evidence-backed scope review before execution. The audit maps plan tasks to approved requirements, separates required behavior and verified safety from optional capability and speculative machinery, uses bounded fresh-context review for high-risk plans, and hard-gates plan edits on user approval. `ctx-plan` now recommends the audit selectively for HIGH, multi-system, explicitly requested, or time-boxed work.

## 0.2.9.9 (2026-06-28)

- **CTX Aligned rename** — `ctx-engineering` is now `ctx-align` across the Claude and Codex plugin skill trees. The skill keeps CTX Engineering and `ctx-engineering` as legacy trigger language, README links now point at `ctx-align`, and `ctx-discuss` now references the aligned calibration gate by its new name.

## 0.2.9.7 (2026-05-15)

- **Factory portfolio chrome** — portfolio cards now use responsive preview scaling, larger readable metadata, grouped default sections, category-scoped URLs (`/factory?category=...`), and an explicit `All pages` escape path. The editor top bar now includes a stable `Factory` back link, keeps page/version controls fixed on the right, promotes versions and the only rescan action into the Pages area, adds compact/expanded page group modes, clarifies style controls as preview overrides, supports icon-led edit mode with modal-confirmed soft archiving plus archive restore from `factory/archive/`, and removes the obsolete bottom prompt bar. Bare `/` redirects to `/factory` when no transient brainstorm preview exists.

## 0.2.9.6 (2026-04-22)

- **Factory grouped navigation (CTX-46)** — factory prototypes can now be stored under `factory/pages/<group>/<page>/`, `scanSlots()` exposes group metadata, `/api/write` accepts a `group` field, the editor sidebar renders collapsible group sections, the top-bar version dropdown is scoped to the active page, and left/right arrows switch pages independently of version selection. Deep links and portfolio cards now support grouped page paths.

## 0.2.9.4 (2026-04-08)

- **Factory rename — skill source** — completes the rename started in v0.2.9.2. `plugins/ctx/skills/ctx-brainstorm/companion/` → `factory/`, plus all path references, reference docs (`companion-guide.md` → `factory-guide.md`, `companion-frontend.md` → `factory-frontend.md`), and UX/feature language in the `ctx-brainstorm` and `ctx-brainstorm-ss` skill docs. Plugin interface file `companion.config.js` stays unchanged.
- **Factory page scanner follows symlinks (CTX-22)** — `scanSlots()` in `factory/server.js` now uses `fs.statSync()` instead of `Dirent.isDirectory()` so symlinked page directories under `factory/pages/` are traversed. Broken symlinks are skipped safely. Unblocks using the factory with symlinked portfolios.
- **Collapsible left sidebar (CTX-26)** — `factory.html` gains a toggle button in the top-bar that collapses the controls sidebar to zero width. Default state is collapsed so the preview area is maximized on first load; user preference persists in `localStorage`.
- **Worktree sparse-checkout excludes root `factory/` (CTX-21)** — `worktree-create.sh` now runs `git sparse-checkout set --no-cone '/*' '!/factory/'` against new worktrees. The root `factory/` dir is tracked in git (iteration history preserved) but kept out of dev worktrees. Anchored pattern leaves nested paths like `plugins/ctx/skills/ctx-brainstorm/factory/` intact. README documents the convention.

## 0.2.9.3 (2026-04-07)

- **Spec reviewer verification protocol** — `ctx-brainstorm-ss` reviewer now verifies claims before flagging. Unverifiable claims go to Recommendations, not Issues. Three sentences added to the existing Calibration section in `spec-reviewer-prompt.md` — no new sections, no new vocabulary. Fixes false positives where reviewers escalated unverified theoretical risks (#17).

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
