# Companion Factory — Workflow Integration

**Date:** 2026-04-05
**Status:** Draft
**Complexity:** [LOW] auto-versioning, [LOW] write endpoint, [LOW] SKILL.md update, [LOW] template contract

## Problem

The companion factory has working controls, style injection, and click-to-select — but the workflow loop is manual. Claude doesn't auto-version prototypes, doesn't read the style profile when generating, and doesn't know about the factory mode conventions. Each step requires manual intervention that should be automated.

## Decision

Three changes that close the loop:

1. **Auto-versioning** — a script + API endpoint that finds the next version number and writes the file
2. **Brainstorm skill integration** — SKILL.md learns about factory mode so Claude uses the right conventions automatically
3. **Prototype template contract** — documented structure for comparison pages and single pages so `data-option` and consistency aren't accidental

## Design

### Sub-project 1: Auto-versioning `[LOW]`

**New file:** `companion/cli/next-version.js`

```bash
node next-version.js --project-dir /path --page mobile-nav
# → companion/pages/mobile-nav/mobile-nav-v2.html
```

- Reads `companion/pages/<page>/`, finds highest `<page>-v<n>.html`, returns path for `v(n+1)`
- If directory doesn't exist or is empty, returns `v1`
- Creates the directory if needed
- Prints the full path to stdout

**New endpoint:** `POST /api/write` on server.js

```json
// Request
{ "page": "mobile-nav", "content": "<html>..." }

// Response
{ "file": "mobile-nav/mobile-nav-v3.html", "version": "v3" }
```

- Uses the same next-version logic inline (no subprocess needed — it's a few lines)
- Writes the file to `companion/pages/<page>/<page>-v<n>.html`
- File watcher picks up the change and broadcasts reload automatically
- Returns the written path and version number

### Sub-project 2: Brainstorm Skill Integration `[LOW]`

**Modify:** `plugins/ctx/skills/ctx-brainstorm/SKILL.md`

Add a section after step 3 (visual companion gate):

```markdown
### Factory mode (step 3b)

When the companion is running with `--project-dir` (factory mode at `/factory`):

1. **Read style profile** — `<project-dir>/companion/style-profile.json` has the user's
   design tokens (colors, fonts, radius). Use these as context when generating prototypes.
   Don't invent colors — use the profile values.

2. **Write prototypes via API** — `POST http://localhost:<port>/api/write` with
   `{ "page": "<name>", "content": "<html>" }`. This auto-versions (v1, v2, v3...)
   and the factory reloads automatically. Don't manually compute filenames.

3. **Read user selections** — check `<screen-dir>/.events` for:
   - `option-select` events: user clicked a choice in the browser
   - `style` events: user changed colors/font/radius via sidebar controls
   Use these to inform iterations.

4. **Use data-option on comparisons** — see "Prototype structure" in companion-guide.md.
```

Also update the existing companion gate (step 3) to mention factory mode:

```markdown
If yes → offer the companion. If the project has a `companion/style-profile.json`,
suggest factory mode (`/factory` URL) for style-aware prototyping.
```

**Modify:** `plugins/ctx/skills/ctx-brainstorm/companion/cli/iterate.sh`

Update the tinker context reader to read `style` events instead of the old `tinker` events. Same logic, different event type and field names.

### Sub-project 3: Prototype Template Contract `[LOW]`

**Modify:** `plugins/ctx/skills/ctx-brainstorm/references/companion-guide.md`

Add a "Prototype structure" section with two templates:

**Comparison page** (A/B/C options):
```html
<!-- Each selectable option MUST have data-option and data-label -->
<div class="option-card" data-option="A" data-label="A — Short description">
  <!-- option content -->
</div>
```

**Single page prototype** (standalone design):
```html
<!-- No data-option needed. Just clean HTML. -->
<!-- The base layer handles font, color, background, radius. -->
<!-- Optionally use var(--cp-primary) etc. for accent elements. -->
```

**What NOT to do:**
- Don't set `body { font-family }` — base layer handles it
- Don't hardcode the profile's colors — use `var(--cp-primary)` or let inheritance work
- Don't add `<meta name="darkreader-lock">` — base layer adds it
- Don't import Google Fonts for the profile font — base layer sets font-family

## Data flow

```
Claude runs /ctx-brainstorm
  → reads companion/style-profile.json for design context
  → generates HTML using profile tokens
  → POST /api/write { page: "landing", content: html }
  → server auto-versions → writes companion/pages/landing/landing-v3.html
  → file watcher triggers → WebSocket broadcast → factory reloads
  → user clicks option / changes controls → .events file updated
  → Claude reads .events → generates next iteration
```

## Success Criteria

- [ ] `POST /api/write` with `{ page, content }` creates the next version file and factory shows it
- [ ] `node next-version.js --project-dir X --page Y` prints the correct next path
- [ ] SKILL.md references factory mode — Claude reads profile and writes via API during brainstorm
- [ ] iterate.sh reads `style` events instead of old `tinker` events
- [ ] Companion guide documents comparison page structure with `data-option`
- [ ] Companion guide documents single page structure (what to skip)

## Complexity Tags

- `[LOW]` Auto-versioning script + API endpoint — ~30 lines of logic
- `[LOW]` SKILL.md update — documentation, no code
- `[LOW]` iterate.sh update — swap event type, update field names
- `[LOW]` Companion guide template contract — documentation
