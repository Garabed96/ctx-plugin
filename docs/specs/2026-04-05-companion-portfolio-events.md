# Companion Factory — Portfolio & Per-Page Events

**Date:** 2026-04-05
**Status:** Approved
**Complexity:** [LOW] per-page events, [LOW] factory/<page> routing, [MED] portfolio landing

## Problem

Events write to `screenDir/.events` (ephemeral temp dir). A fresh session can't see that "Option B was selected for mobile-nav." And `/factory` dumps you straight into the first page — no way to see all brainstorm work at a glance or deep-link to a specific page.

## Decision

Three changes:

1. **Per-page events** — route events to `companion/pages/<page>/.events` so they persist across sessions
2. **`/factory/<page>` routing** — deep-link to a specific page's sidebar+preview
3. **Portfolio landing** — `/factory` shows a card grid of all pages with thumbnails + selected options

## Design

### Sub-project 1: Per-page events `[LOW]`

**Modify:** `plugins/ctx/skills/ctx-brainstorm/companion/factory.html`

The `sendEvent()` function adds `page: activePage` to every event before sending over WebSocket.

**Modify:** `plugins/ctx/skills/ctx-brainstorm/companion/server.js`

`handleMessage()` checks for `event.page`. If present, writes to `companion/pages/<page>/.events`. If absent, falls back to `screenDir/.events` (backwards compat for brainstorm mode).

```javascript
// In handleMessage:
if (event.page && projectDir) {
  const pageEventsFile = path.join(projectDir, "companion/pages", event.page, ".events");
  if (fs.existsSync(path.dirname(pageEventsFile))) {
    fs.appendFileSync(pageEventsFile, JSON.stringify(event) + "\n");
    return;
  }
}
// Fallback: screenDir
const eventsFile = path.join(screenDir, ".events");
fs.appendFileSync(eventsFile, JSON.stringify(event) + "\n");
```

### Sub-project 2: `/factory/<page>` routing `[LOW]`

**Modify:** `plugins/ctx/skills/ctx-brainstorm/companion/server.js`

Change the factory route from exact match to prefix match:

```javascript
} else if (parsed.pathname === "/factory" && !parsed.pathname.slice("/factory".length + 1)) {
  servePortfolio(res);  // portfolio landing (sub-project 3)
} else if (parsed.pathname.startsWith("/factory/")) {
  const targetPage = parsed.pathname.slice("/factory/".length);
  serveFactory(res, targetPage);  // existing experience, with target page
} else {
```

**Modify:** `serveFactory()` to accept an optional `targetPage` parameter. Inject `<script>window.__factoryPage = "<page>";</script>` before `</body>` when set.

**Modify:** `plugins/ctx/skills/ctx-brainstorm/companion/factory.html`

On load, if `window.__factoryPage` is set, auto-navigate to that page instead of showing the first slot:

```javascript
// In the slot loading .then() callback:
if (window.__factoryPage) {
  var target = window.__factoryPage;
  for (var s = 0; s < slots.length; s++) {
    if (slots[s].slot === target) { activatePage(target, true); return; }
  }
}
// Otherwise fall through to existing behavior (activate first slot)
```

### Sub-project 3: Portfolio landing page `[MED]`

**Create:** `plugins/ctx/skills/ctx-brainstorm/companion/portfolio.html`

Served at `/factory` when no page is specified. Dark theme matching factory.html aesthetic.

**Card grid** — one card per page (data from new `/api/page-status` endpoint):
- Page name
- Version count badge (e.g., "3 versions")
- Selected option badge if present (e.g., "B — Grouped" in a teal pill)
- Last modified relative timestamp
- Thumbnail: small iframe rendering the latest version via `/prototype?file=<latest>`
- Click navigates to `/factory/<page>`

**New API endpoint:** `GET /api/page-status`

**Modify:** `plugins/ctx/skills/ctx-brainstorm/companion/server.js`

Returns per-page metadata by combining `scanSlots()` with per-page `.events` data:

```json
[
  {
    "page": "mobile-nav",
    "versions": 3,
    "latestFile": "mobile-nav/mobile-nav-v3.html",
    "selectedOption": "B — Grouped",
    "lastModified": "2026-04-05T09:48:00Z"
  }
]
```

Implementation: iterate `scanSlots()`, for each slot read `companion/pages/<slot>/.events` to find the last `option-select` event, stat the latest HTML file for `lastModified`.

**New function:** `servePortfolio(res)` — reads and serves `portfolio.html`, same pattern as `serveFactory()`.

## Data flow

```
Per-page events:
  User clicks option in factory → sendEvent({ ..., page: activePage })
  → WebSocket → handleMessage → sees event.page
  → writes to companion/pages/<page>/.events
  → fresh session reads that file → knows what was selected

Portfolio:
  User navigates to /factory
  → servePortfolio() serves portfolio.html
  → portfolio.html fetches /api/page-status
  → renders card grid with thumbnails (iframes to /prototype?file=...)
  → user clicks card → navigates to /factory/<page>
  → serveFactory(res, page) injects __factoryPage
  → factory.html auto-navigates to that page
```

## What does NOT change

- Existing sidebar+preview experience (now at `/factory/<page>`)
- Brainstorm mode at `/` (screenDir-based)
- All existing API endpoints
- WebSocket protocol
- Style injection and base layer
- Click-to-select contract (`data-option`)

## Success Criteria

- [ ] Events from factory write to `companion/pages/<page>/.events` when `activePage` is set
- [ ] Events without a page field still write to `screenDir/.events` (brainstorm mode)
- [ ] `GET /api/page-status` returns page metadata including selected option from `.events`
- [ ] `/factory` shows portfolio card grid with thumbnails and selected options
- [ ] `/factory/mobile-nav` deep-links to the sidebar+preview for mobile-nav
- [ ] Clicking a card in the portfolio navigates to `/factory/<page>`
- [ ] Existing factory sidebar+preview behavior is unchanged

## Complexity Tags

- `[LOW]` Per-page events — add `page` field in factory JS `sendEvent`, route in server `handleMessage`
- `[LOW]` `/factory/<page>` routing — prefix match + `__factoryPage` injection + auto-navigate on load
- `[MED]` Portfolio landing — new HTML file + new API endpoint + card grid with iframe thumbnails
