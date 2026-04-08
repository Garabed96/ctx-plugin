# iOS Mobile — Real Device Checklist

**When to apply:** Any page that will be viewed on iPhone. Chrome DevTools mobile emulation lies — it uses Blink, not WebKit. These rules close the gap between emulation and reality.

---

## Viewport

```css
/* NEVER use 100vh — iOS Safari's URL bar makes it taller than the visible area */
height: 100dvh;           /* dynamic viewport height — adjusts with URL bar */
min-height: 100svh;       /* small viewport — URL bar expanded (safe minimum) */
min-height: -webkit-fill-available; /* legacy fallback */
```

## Safe Areas (notch, home indicator, Dynamic Island)

```css
/* Always pad content away from hardware intrusions */
padding-top: env(safe-area-inset-top);
padding-bottom: env(safe-area-inset-bottom);
padding-left: env(safe-area-inset-left);
padding-right: env(safe-area-inset-right);

/* Required in <meta> for safe areas to work */
/* <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"> */
```

**FABs and bottom-fixed elements** — position above the home indicator:
```css
.fab {
  bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

## Form Controls

iOS renders native `<input>`, `<select>`, `<textarea>` with its own styling. Chrome emulation shows Chrome-styled controls.

```css
/* Normalize form appearance across engines */
input, select, textarea {
  -webkit-appearance: none;
  appearance: none;
  border-radius: 0;          /* iOS adds rounded corners */
  font-size: 16px;           /* CRITICAL: below 16px triggers iOS auto-zoom on focus */
}
```

**Date inputs:** iOS shows a native date picker wheel. There's no way to match this in Chrome. If pixel-perfect is needed, use a JS date picker library instead of `<input type="date">`.

**Select dropdowns:** iOS shows a native scroll wheel. Same story — use a custom dropdown if you need visual consistency.

## Touch Targets

```css
/* Apple HIG minimum: 44x44pt. Anything smaller is a tap-miss on real fingers. */
button, a, [role="button"] {
  min-height: 44px;
  min-width: 44px;
}
```

## Position Fixed

`position: fixed` on iOS Safari bounces during scroll momentum and can disappear behind the keyboard.

```css
/* Prefer sticky for in-flow elements */
.header { position: sticky; top: 0; }

/* For true fixed elements (modals, FABs), use: */
.fixed-element {
  position: fixed;
  /* Add will-change to prevent repaint flicker */
  will-change: transform;
}
```

**Keyboard avoidance:** When an input is focused, `position: fixed` elements get pushed up. Use `visualViewport` API to detect keyboard:
```js
visualViewport.addEventListener('resize', () => {
  const keyboardHeight = window.innerHeight - visualViewport.height;
  document.documentElement.style.setProperty('--keyboard-h', `${keyboardHeight}px`);
});
```

## Scrolling

```css
/* Smooth momentum scrolling (default in modern iOS but explicit is safer) */
-webkit-overflow-scrolling: touch;

/* Prevent overscroll bounce on scroll containers */
overscroll-behavior: contain;
```

## Text Rendering

```css
/* iOS Safari renders text thinner than Chrome. Normalize: */
-webkit-font-smoothing: antialiased;
-moz-osx-font-smoothing: grayscale;

/* Prevent iOS text size inflation on rotation */
-webkit-text-size-adjust: 100%;
text-size-adjust: 100%;
```

## Common Traps

| Trap | Fix |
|------|-----|
| `100vh` includes hidden URL bar | Use `100dvh` or `100svh` |
| Input zoom on focus | Set `font-size: 16px` minimum on inputs |
| FAB hidden behind Safari bottom bar | Add `env(safe-area-inset-bottom)` |
| Tap targets too small | Minimum 44x44px |
| `position: fixed` bounces on scroll | Use `position: sticky` or `will-change: transform` |
| Hover styles stuck after tap | Use `@media (hover: hover)` for hover-only styles |
| `backdrop-filter` flickers | Add `will-change: backdrop-filter` or `-webkit-backdrop-filter` |
| Custom select looks wrong | iOS renders native — use `-webkit-appearance: none` |

## Verification

Don't trust Chrome emulation for final QA. Use one of:
1. **Xcode Simulator** (free) — `open -a Simulator`, pick device, navigate to dev URL
2. **Real device + Safari Web Inspector** — USB, `Safari > Develop > [phone name]`
3. **Safari Responsive Design Mode** — same WebKit engine (no native controls though)
