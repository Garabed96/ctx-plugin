# Visual Companion Guide

The browser is a **display**. You talk in the terminal.

## Starting the companion

```bash
skills/ctx-brainstorm/companion/start.sh --project-dir <project-root> [--port 52341]
# Returns: { port, url, screen_dir }
```

Save `screen_dir`. Tell the user to open the URL.

## The loop

1. **Write an HTML content fragment** to `screen_dir/` — semantic filename, never reuse names
2. **Tell the user** what's on screen: "Check the browser — 3 layout options"
3. **User responds in terminal**: "B" or "the second one but tighter spacing"
4. **Iterate or advance** — write a new file if feedback changes current screen

Content fragments are wrapped automatically by the frame template (dark theme, option/card/mockup CSS classes). Write just the content — no `<html>`, no `<style>`, no boilerplate.

## CSS classes available

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

## When to use terminal vs companion

| Terminal (text) | Companion (visual) |
|---|---|
| Requirements questions | Layout comparisons |
| Conceptual A/B/C choices | Wireframes and mockups |
| Tradeoff lists | Side-by-side designs |
| Technical decisions | Architecture diagrams |
| Clarifying questions | Color/typography exploration |

A question *about* UI is not automatically visual. "What kind of wizard?" -> terminal. "Which wizard layout?" -> companion.
