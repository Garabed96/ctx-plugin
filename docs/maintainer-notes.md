# Maintainer Notes

Conventions and landmines for anyone (human or Claude) working on ctx-plugin itself. Not for plugin users — for the person maintaining the plugin source.

## Release tagging

**Starting v0.2.9.4, release tags are annotated (with a description), not lightweight.** Earlier tags (v0.2.4 through v0.2.9.3) are lightweight — leave them alone, but match the new style going forward.

When cutting a release:

1. Bump `plugins/ctx/.claude-plugin/plugin.json` and add a `CHANGELOG.md` entry in the same commit
2. Merge the PR
3. Tag the **merge commit** on `main` with an annotated tag:
   ```bash
   git fetch origin main
   git tag -a vX.Y.Z <merge-sha> -m "vX.Y.Z — one-line summary

   <body: per-ticket or per-change bullets, same structure as the CHANGELOG entry>

   PR: https://github.com/Garabed96/ctx-plugin/pull/<n>"
   git push origin vX.Y.Z
   ```
4. The tag body should mirror the merged PR body — not the raw commit list, but the human-readable summary of what changed and why.

If you need to replace a tag that's already on the remote (e.g. to add a message to a tag that was pushed as lightweight), delete both locally and remote-side before re-creating:
```bash
git push origin :refs/tags/vX.Y.Z
git tag -d vX.Y.Z
git tag -a vX.Y.Z <sha> -m "..."
git push origin vX.Y.Z
```

## Landmines (things that look like mistakes but aren't)

- **`companion.config.js`** — despite the `companion` → `factory` rename completed in v0.2.9.4, the plugin interface file at project root stays named `companion.config.js`. This is intentional per the v0.2.9.2 release notes. The literal string `companion.config.js` must be preserved in any source that references it (currently `plugins/ctx/skills/ctx-brainstorm/factory/server.js:117,133,587`).
- **`factory/` at repo root is tracked but sparse-excluded in worktrees** — new worktrees created by `plugins/ctx/scripts/worktree-create.sh` apply `git sparse-checkout set --no-cone '/*' '!/factory/'`. If you expect `factory/pages/` to exist in a worktree's filesystem and it doesn't, that's by design — the server resolves it via `git rev-parse --git-common-dir` to the main repo.

## Factory server routing reference

`factory/server.js` routes:

| URL | Handler | Serves |
|---|---|---|
| `/` | `serveBrainstorm` | newest HTML from the transient brainstorm session dir (ephemeral) |
| `/factory` or `/factory/` | `servePortfolio` | `portfolio.html` — persistent prototype landing page |
| `/factory/<group>/<page>` | `serveFactory(page)` | `factory.html` — per-page editor with grouped sidebar, click-to-select, style controls |
| `/playground` | `servePlayground` | `playground.html` |
| `/prototype?file=...` | `servePrototype` | raw prototype HTML, used by iframes |
| `/api/*` | various | slots, write, compare, style-profile, scan, etc. |

**Common gotcha:** `/factory` alone does NOT serve `factory.html` — it serves `portfolio.html` (the landing page). To reach the editor with the sidebar you need `/factory/<group>/<page>`.
