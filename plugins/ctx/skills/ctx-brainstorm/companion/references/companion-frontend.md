# Companion Frontend — Prototype Design Reference

**When to apply:** Every time you generate or iterate a prototype in factory mode. This is not optional — prototypes are the user's first impression of the design direction.

---

## Hard Gate

Do NOT write prototype HTML until you have:
1. Identified the competitive position (Phase 1 — even briefly)
2. Written the copy first (headlines, labels, CTAs, empty states)

Prototypes with lorem ipsum or placeholder copy are plan failures.

---

## Phase 1 — Strategy (60 seconds)

Answer the five questions:

1. **Who is the enemy?** — What is this UI replacing? (spreadsheet, manual process, existing page, competitor)
2. **What is their weakness?** — Why does the current solution fail?
3. **What is our angle of attack?** — The one dimension where this UI wins decisively
4. **What is the trojan horse?** — The low-resistance entry that pulls users in
5. **Fight or ally?** — Does this complement or replace existing UX?

For prototypes, this can be one sentence each. The point is intention — not a strategy document.

---

## Phase 2 — Copy & Design

Apply the Apple copy formula:

### Copy Rules
- **Sell the transformation, not the spec.** "10,000 songs in your pocket" not "32GB storage"
- **Declarative headline** — short, benefit-focused, often a fragment
- **One-breath explanation** — 1-2 sentences max
- **Text CTAs** — "Learn more >" not loud buttons. One per section.
- **Strip until you can't.** One job per label. Active voice always.
- **Villain > Hero** — name the pain, position the user as empowered

### Visual Design Rules
- **Typography:** Distinctive fonts via `--cp-font-sans` / `--cp-font-mono`. Tight letter-spacing on display text. Large size differential between heading and body.
- **Color:** Use `--cp-*` CSS variables from the style profile. One accent color dominates. Dark backgrounds with high-contrast text.
- **Spacing:** Generous. 80-120px equivalent vertical padding between sections. Single focal point per section.
- **Motion:** CSS-first. One well-orchestrated page load > scattered micro-interactions. Transitions 200-300ms.
- **Atmosphere:** Gradient meshes, subtle noise patterns, layered transparencies for depth. Never flat.

---

## Phase 3 — Prototype Implementation

### Delivery
**Always** `POST /api/write` with `{ "page": "<name>", "content": "<html>" }`. Never Edit/Write directly — the cross-repo guard blocks it and you lose auto-versioning.

### Code Rules
- **Vanilla HTML/CSS/JS only.** No build step, no frameworks, no imports.
- **Self-contained single file.** Everything in one `<!DOCTYPE html>` document.
- **CSS variables for theming.** Use `var(--cp-primary)`, `var(--cp-bg)`, `var(--cp-font-sans)`, etc. with fallback values. The server injects these from the style profile.
- **`data-option` for selectable elements.** Clicking posts `option-select` to the factory parent frame. See companion-guide.md.
- **Responsive.** Desktop and mobile. Use `@media (min-width: 768px)` as the breakpoint. Mobile is the base; desktop adds the enhancements (side panels, larger type, additional columns).
- **No external dependencies.** No CDN links, no Google Fonts loads, no external images. Use inline SVGs for icons. Use CSS for all visual effects.

### Quality Bar
Before submitting the prototype, verify:
- [ ] Real copy — no lorem ipsum, no "placeholder text"
- [ ] Responsive — works at 375px and 1280px
- [ ] Animations are CSS-only, respect `prefers-reduced-motion`
- [ ] Uses `--cp-*` variables with fallbacks
- [ ] Single focal point per section
- [ ] CTAs are text links, not loud buttons (per Apple rules)
- [ ] Typography has clear hierarchy (3+ distinct sizes)

---

## Phase 4 — Iteration Audit

After user views the prototype and requests changes:

1. **What changed?** — Identify the specific feedback
2. **Copy audit** — Does the copy still pass the Apple formula?
3. **Visual audit** — Is there still a single focal point? Is spacing generous? Is motion intentional?
4. **Submit via `/api/write`** — auto-increments version, factory reloads

Do not rebuild from scratch on iteration. Edit the existing HTML and resubmit.
