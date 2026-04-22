# Visual Factory Guide

The browser is a **display**. You talk in the terminal.

## Two modes

### 1. Brainstorm mode (content fragments → `screen_dir/`)

For quick exploration during brainstorm questions — option cards, wireframes, comparisons.

```bash
skillsctx-brainstorm/factory/start.sh --project-dir <project-root> [--port 52341]
# Returns: { port, url, screen_dir }
```

Save `screen_dir`. Tell the user to open `http://localhost:<port>` (the brainstorm viewer).

**The loop:**
1. Write an HTML content fragment to `screen_dir/` — semantic filename, never reuse names
2. Tell the user what's on screen: "Check the browser — 3 layout options"
3. User responds in terminal: "B" or "the second one but tighter spacing"
4. Iterate or advance — write a new file if feedback changes current screen

Content fragments are wrapped automatically by the frame template (dark theme, option/card/mockup CSS classes). Write just the content — no `<html>`, no `<style>`, no boilerplate.

### 2. Factory mode (full pages → `factory/pages/`)

For detailed prototyping with live style controls. Tell the user to open `http://localhost:<port>/factory`.

**Storage:** `<project-root>/factory/pages/<group>/<page-name>/<page-name>-v<n>.html`

Example:
```
factory/pages/
  tracker/
    landing/
      landing-v1.html
      landing-v2.html
  pricing/
    pricing/
      pricing-v1.html
```

**The loop:**
1. Write a full HTML page to `factory/pages/<group>/<page>/<page>-v<n>.html`
2. Factory sidebar shows collapsible group headers, page rows, and per-page versions — user clicks to preview
3. User adjusts sidebar controls (colors, font, radius) to explore variations live
4. User describes iteration in prompt bar → copies it → pastes in terminal
5. You write the next version file

**Style-aware prototyping:** The server automatically injects a base CSS layer from the project's style profile. Your prototype will inherit the project's font, colors, and radius without any extra work. Just write clean HTML — the controls handle the rest.

**What the base layer does:**
- `body` gets font-family, color, background from the profile
- `h1-h6` inherit the profile font
- `code/pre` gets the monospace font
- `button/input` gets the profile border-radius
- All via `!important` so sidebar controls always take effect

**You do NOT need to:**
- Reference `var(--cp-*)` in your CSS (the base layer does this)
- Import Google Fonts (the base layer sets font-family)
- Set body background/color (the base layer handles it)
- Worry about matching the project's design tokens (they're injected automatically)

**You CAN optionally use `var(--cp-*)` for deeper integration:**
```css
.hero-accent { color: var(--cp-primary); }
.card { background: var(--cp-card); border-color: var(--cp-border); }
```

Available CSS variables:
- `--cp-primary`, `--cp-secondary`, `--cp-accent` — brand colors
- `--cp-bg`, `--cp-fg`, `--cp-muted` — background/text/muted
- `--cp-border`, `--cp-card`, `--cp-ring` — UI chrome
- `--cp-destructive` — error/danger
- `--cp-font-sans`, `--cp-font-mono` — typography
- `--cp-radius-sm`, `--cp-radius-md`, `--cp-radius-lg` — border radius

## CSS classes available (brainstorm mode)

- `.options` > `.option` > `.letter` + `.content` — A/B/C choice cards
- `.cards` > `.card` > `.card-image` + `.card-body` — visual design cards
- `.mockup` > `.mockup-header` + `.mockup-body` — wireframe container
- `.split` — side-by-side comparison (two `.mockup` children)
- `.pros-cons` > `.pros` + `.cons` — tradeoff display
- `.mock-nav`, `.mock-sidebar`, `.mock-content`, `.mock-button`, `.mock-input` — wireframe elements
- `.placeholder` — dashed placeholder area
- `.waiting` — centered message for "continuing in terminal..."

## Design principles for mockups

When rendering visual content, apply:
- **`frontend-design`** — bold aesthetics, typography, color, spatial composition. Avoid generic AI slop.
- **`frontend-marketer`** — Apple/Jobs copy: empathy, focus, villain→hero. One idea per line. Active voice.

Do NOT pull in the composite `frontend` skill — it bundles TanStack/Zod implementation concerns irrelevant during brainstorming.

## When to use terminal vs factory

| Terminal (text) | Factory (visual) |
|---|---|
| Requirements questions | Layout comparisons |
| Conceptual A/B/C choices | Wireframes and mockups |
| Tradeoff lists | Side-by-side designs |
| Technical decisions | Architecture diagrams |
| Clarifying questions | Color/typography exploration |

A question *about* UI is not automatically visual. "What kind of wizard?" -> terminal. "Which wizard layout?" -> factory.

## Style profile

The factory auto-scans the project on first start (`start.sh` runs `cli/scan-styles.js`). It detects:
- Tailwind config (v3 `theme.extend` + v4 `@theme` blocks)
- CSS custom properties from `:root` and `@theme` blocks
- Component libraries and frameworks from `package.json`
- Monorepo `apps/*/` subdirectories

Output: `<project-root>/factory/style-profile.json`

Re-scan: `start.sh --rescan` or click "Re-scan project" in the factory sidebar.

## Prototype structure

### Comparison page (A/B/C options)

Each selectable option MUST have `data-option` and `data-label`. The base layer JS handles click → visual feedback → event propagation. No JS needed in the prototype.

```html
<div class="option-card" data-option="A" data-label="A — Minimal sidebar">
  <!-- option A content -->
</div>
<div class="option-card" data-option="B" data-label="B — Grouped navigation">
  <!-- option B content -->
</div>
```

### Single page prototype

Clean HTML. No `data-option` needed. The base layer handles font, color, background, and radius automatically.

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Page Title</title>
  <style>
    /* Your layout CSS here. Use var(--cp-primary) etc. for accent elements. */
  </style>
</head>
<body>
  <!-- Content — base layer applies profile font, colors, radius -->
</body>
</html>
```

### What NOT to do

- Don't set `body { font-family: ... }` — the base layer handles it via `!important`
- Don't hardcode the profile's hex colors — use `var(--cp-primary)` or let inheritance work
- Don't add `<meta name="darkreader-lock">` — the base layer injects it
- Don't import Google Fonts for the profile font — the base layer sets `font-family` on body/headings
