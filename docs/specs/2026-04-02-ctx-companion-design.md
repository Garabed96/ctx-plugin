# ctx-companion — AI Companion for Claude Code

**Date:** 2026-04-02
**Status:** Design complete — implementation not started
**Author:** Garo Nazarian

---

## TL;DR

A toggleable ASCII companion that lives in a Zellij floating pane beside Claude Code, watches your coding session via the transcript file, and reacts through a personality powered by a cheap/fast model (Haiku). Think of it as your own buddy system — but one you control, with swappable personalities, and no dependency on Anthropic's internal rendering layer.

---

## Background: How Anthropic's Buddy System Works

This design is informed by reading the leaked Claude Code source (March 2026). The buddy system architecture is documented in `docs/anthropic.md` in this repo. Key findings:

### The Bones/Soul Split

Every buddy has two halves:

- **Bones** (deterministic, never stored) — species, eyes, hat, rarity, stats. Derived from `hash(userId + salt)` via a seeded Mulberry32 PRNG. Re-computed on every read so users can't fake a legendary by editing config.
- **Soul** (LLM-generated, stored once) — name and personality string. Generated on first `/buddy` invocation ("hatching") and persisted in `~/.claude/config`.

Source: `src/buddy/companion.ts`, `src/buddy/types.ts`

### The Observer Pattern

After every Claude response completes, `fireCompanionObserver(messagesRef.current, callback)` is called (REPL.tsx:2804). The observer:
1. Receives the **full conversation message array** (prompts, responses, tool results, diffs)
2. Calls a cheap model with the companion's personality
3. Returns a short reaction string
4. The reaction is set as `AppState.companionReaction`
5. `CompanionSprite.tsx` renders it in a speech bubble that fades after ~10 seconds

Source: `src/screens/REPL.tsx:2804-2808`, `src/state/AppStateStore.ts:168-171`

The observer source file (`src/buddy/observer.ts`) is missing from the leak — the comment in AppStateStore references it but the file wasn't included.

### The Sprite System

Each species has 3 animation frames (5 lines tall, 12 wide):
- Frame 0: idle rest
- Frame 1: fidget (ear twitch, tentacle wave)
- Frame 2: special (smoke, spores, antenna blink)

Eyes are templated with `{E}` and replaced per-companion. Hats overlay line 0. A 500ms tick timer drives idle animation via a predetermined sequence: `[0,0,0,0,1,0,0,0,-1,0,0,2,0,0,0]` — mostly rest, occasional fidget, rare blink.

Source: `src/buddy/sprites.ts`, `src/buddy/CompanionSprite.tsx:23`

### The Personality Stats

Five stats tuned per companion: DEBUGGING, PATIENCE, CHAOS, WISDOM, SNARK. Stats have a peak and a dump stat, with rarity boosting the floor. These are fed to the observer prompt so the model's reactions reflect the companion's character.

Source: `src/buddy/types.ts:91-98`, `src/buddy/companion.ts:62-82`

### What Plugins Cannot Do

Buddy renders as a React/Ink component inside `REPL.tsx`. It reserves terminal columns via `companionReservedColumns()` and the `PromptInput` component shrinks to make room. **There is no plugin API to inject components into the Claude Code rendering tree.** This is the fundamental constraint that drives our architecture.

Source: `src/buddy/CompanionSprite.tsx:167-174`, `src/screens/REPL.tsx:4590-4995`

---

## Architecture

### Why Zellij

We evaluated five approaches:

| Approach | Left-side visual | Zero config | Works today | Verdict |
|----------|-----------------|-------------|-------------|---------|
| Wait for Anthropic plugin API | Yes | Yes | No | Not happening — buddy is a differentiator |
| statusLine hack | Bottom only | Yes | Yes | Wrong location, one line of text |
| `prompt` hook (text-only) | No visual | Yes | Yes | Good brain, no body |
| iTerm2 split pane via osascript | Yes | Mostly | Yes | Feels like a sidebar, not a companion |
| **Zellij floating pane** | **Yes** | **Opt-in** | **Yes** | **Floating overlay, mouse-draggable, pinnable** |

Zellij is a terminal multiplexer with a WASM plugin system. Floating panes overlay the terminal content rather than splitting it. They can be positioned at specific coordinates, sized to exact dimensions, pinned, and dragged with the mouse.

The companion renders as a small floating pane (22 cols x 16 rows) anchored to the bottom-left. Claude Code runs in the main pane. Buddy (Anthropic's) sits in the bottom-right of Claude Code. The result: companion on the left, buddy on the right, full terminal in between.

### System Components

```
┌─────────────────────────────────────────────────┐
│                                                 │
│  ┌──────────┐                                   │
│  │ Companion│     Claude Code (main pane)       │
│  │ floating │                                   │
│  │ pane     │     > user prompt_                │
│  │          │                          ∧  ∧     │
│  │ (· · )  │                         (·  · )   │
│  │ "nice   │                         ( .. )    │
│  │  squint │                         `------´  │
│  │  test"  │                         Siltquill │
│  └──────────┘                                   │
│  claude-code [Opus]  main  20%  $16  session 97k│
└─────────────────────────────────────────────────┘
```

### Data Flow

```
Claude Code writes to transcript file (every turn)
        │
        ▼
Companion watches transcript via fs.watch()
        │
        ▼
On change: read last N messages from transcript
        │
        ▼
Call Haiku with personality prompt + recent context
        │
        ▼
Render reaction in speech bubble (floating pane)
```

### Two Operating Modes

**Mode 1: Prompt Hook (zero-config, text-only)**
- Uses Claude Code's `Stop` hook with `type: "prompt"`
- No API key needed — hooks use Claude Code's authenticated session
- Reaction appears as hook output text in the conversation
- No ASCII sprite, no floating pane
- Available to all users, even without Zellij

**Mode 2: Zellij Floating Pane (opt-in, full visual)**
- Requires Zellij installed
- `/ctx-companion` launches Zellij session with companion layout
- Companion runs as a separate process in the floating pane
- Watches transcript file independently
- Calls Haiku via Anthropic SDK (requires API key)
- Full ASCII sprite with animation, speech bubbles, personality display

Mode 1 is the fallback. Mode 2 is the full experience.

---

## The Companion Identity

### Bones (Deterministic)

Like Anthropic's system, bones are derived from a hash — but instead of species/hat/rarity, we use personality-relevant traits:

```typescript
type CompanionBones = {
  stats: {
    TASTE: number      // visual hierarchy, aesthetics, design quality
    ACCESSIBILITY: number  // a11y concerns, reduced motion, contrast
    SNARK: number      // how sharp the criticism is
    FOCUS: number      // how aggressively it enforces "one focal point"
    SKEPTICISM: number // how much it pushes back on complexity
  }
}
```

Stats are derived from `hash(userId + personality-name)` using the same Mulberry32 PRNG approach Anthropic uses. One peak stat, one dump stat, rest scattered.

### Soul (Personality Prompt)

The soul is a system prompt distilled from reference documents. The v1 personality is **frontend design critic**, derived from the user's own `/frontend` skill:

**Source material:**
- `reference/apple-copy-design.md` — Apple copy formula, villain→hero framework, Jobs' simplicity rules
- `reference/interaction-design.md` — 8 interactive states, focus rings, destructive action patterns
- `reference/motion-design.md` — 100/300/500 rule, easing curves, reduced motion
- `reference/spatial-design.md` — 4pt grid, squint test, visual hierarchy, container queries
- `reference/typography.md` — vertical rhythm, modular scale, font pairing, OpenType features

**Distilled personality prompt:**

```
You are a frontend design critic watching a coding session.

Your beliefs:
- One focal point per section. If everything is bold, nothing is.
- Villain→hero copy. Name the pain before offering the solution.
- "Can you describe this in one sentence a stranger would repeat at dinner?"
- Shadows: if you can clearly see it, it's too strong.
- Motion: ease-out for entrances, ease-in for exits. Never bounce. Never elastic.
- prefers-reduced-motion is not optional. 35% of adults over 40.
- Cards are overused. Spacing and alignment create grouping naturally.
- Empty states should motivate, not inform.
- The squint test: blur your eyes. Can you still identify the hierarchy?
- Generic AI aesthetics (Inter, purple gradients, cookie-cutter layouts) are unforgivable.

You have these stats (higher = more aggressive on that dimension):
TASTE: {taste}/100, ACCESSIBILITY: {a11y}/100, SNARK: {snark}/100,
FOCUS: {focus}/100, SKEPTICISM: {skepticism}/100

React to what just happened in the conversation in ONE short sentence.
Be in-character. A high stat means you lean into that trait hard.
The reaction will be shown to the developer as a floating speech bubble.
```

### Future Personalities

The personality system is designed to be swappable:

| Personality | Source Material | Watches For |
|-------------|----------------|-------------|
| **Frontend Critic** (v1) | `/frontend` skill references | Visual hierarchy, motion, a11y, copy quality |
| **Systems Thinker** | (future) | Data flow, failure modes, missing error states |
| **Testing Skeptic** | `/ctx-tdd` references | Coverage gaps, missing edge cases, mock coupling |
| **Scope Cop** | `/ctx-execute` references | Tag drift, over-engineering, yak shaving |

Users would switch with `/ctx-companion personality <name>`.

---

## The `/ctx-companion` Skill

### Commands

```
/ctx-companion              — toggle on/off
/ctx-companion start        — launch companion (auto-detects Zellij availability)
/ctx-companion stop         — close companion
/ctx-companion personality  — show current personality and stats
/ctx-companion personality <name>  — switch personality
/ctx-companion info         — show full companion card (name, rarity, stats, personality)
```

### Toggle Behavior

State is stored in a flag file at `${CLAUDE_PLUGIN_DATA}/companion-active`. The `Stop` hook checks this file before firing. `/ctx-companion` toggles the flag.

When Zellij is available:
1. Check if already in a Zellij session
2. If yes: open floating pane with companion
3. If no: launch new Zellij session with companion layout, Claude Code in main pane

When Zellij is not available:
1. Register a `Stop` hook with `type: "prompt"` for text-only reactions
2. Inform user: "Companion running in text mode. Install Zellij for the full visual experience."

---

## Rendering (Zellij Mode)

### Layout File

```kdl
layout {
    floating_panes {
        pane x=1 y="75%" width=22 height=16 {
            command "node"
            args "${CLAUDE_PLUGIN_ROOT}/companion/tui.js"
            borderless true
        }
    }
    pane {
        focus true
        command "claude"
    }
}
```

### TUI Script (`companion/tui.js`)

A Node.js script that:
1. Reads companion identity (bones from hash, soul from config)
2. Watches transcript file via `fs.watch()`
3. On transcript change: reads last 3-5 messages, calls Haiku with personality prompt
4. Renders to stdout using ANSI escape codes:
   - ASCII sprite with tick-based idle animation (reposition via `tput cup`, no `clear`)
   - Speech bubble with word-wrapped reaction text
   - Companion name below sprite
5. Sprite animation: 500ms tick, idle sequence `[0,0,0,0,1,0,0,0,-1,0,0,2,0,0,0]`
6. Bubble auto-fades after ~10 seconds (dims, then clears)

### Sprite Format

Same conventions as Anthropic's buddy:
- 5 lines tall, 12 characters wide (after eye substitution)
- 3 frames: idle, fidget, special
- `{E}` template for eyes
- Line 0 reserved for hat/accessory

v1 ships with one character. Community can contribute more.

### Transcript Discovery

The companion needs to find Claude Code's transcript file. Options:
1. **Environment variable** — `/ctx-companion start` sets `COMPANION_TRANSCRIPT_PATH` before launching
2. **Convention** — transcript files live in `~/.claude/projects/<hash>/transcript.jsonl` (discoverable)
3. **Session ID** — passed as argument to the TUI script

---

## Rendering (Text-Only Mode)

A `Stop` hook registered dynamically when companion is toggled on:

```json
{
  "hooks": {
    "Stop": [{
      "matcher": "",
      "hooks": [{
        "type": "prompt",
        "prompt": "<personality prompt> React to what just happened: $ARGUMENTS",
        "timeout": 10
      }]
    }]
  }
}
```

The reaction appears as hook output in the conversation — no sprite, no floating pane, but the brain still works.

---

## API Key Strategy

**Text-only mode (prompt hook):** No API key needed. Hooks use Claude Code's authenticated session.

**Zellij mode (standalone TUI):** Needs an API key for Haiku calls. Resolution order:
1. `ANTHROPIC_API_KEY` environment variable
2. `~/.anthropic/api_key` file (convention)
3. Plugin `userConfig` — prompted on first `/ctx-companion start`
4. Prompt the user with instructions

Cost: ~$0.001 per reaction. A heavy session with 100 turns = $0.10.

---

## What's NOT in Scope

- **Multiple simultaneous companions** — v1 is one companion at a time
- **Companion-to-companion interaction** — no buddy↔companion chat
- **Leveling or progression** — no XP, no evolution, no unlocks
- **Custom ASCII art editor** — v1 ships one character, contributors add more via PR
- **Non-macOS support** — Zellij works on Linux too, but testing is macOS-first
- **WASM plugin** — v1 uses a Node.js script in the floating pane, not a compiled WASM plugin. WASM is a future optimization.

---

## Success Criteria

1. `/ctx-companion` toggles the companion on/off
2. In text-only mode: reactions appear as hook output after each Claude response
3. In Zellij mode: ASCII sprite renders in a floating pane with speech bubble reactions
4. Reactions are contextually relevant to what just happened in the conversation
5. Frontend critic personality catches real design issues (empty states, a11y, hierarchy)
6. No impact on Claude Code performance (companion is a separate process)
7. Graceful degradation: no Zellij → text mode, no API key → prompt hook mode

---

## Complexity Tags

| Component | Tag | Rationale |
|-----------|-----|-----------|
| `/ctx-companion` skill (toggle, state management) | `[LOW]` | Flag file + conditional hook registration |
| Personality prompt system (distill references → prompt) | `[LOW]` | One prompt template, stat substitution |
| Text-only mode (Stop hook integration) | `[MED]` | Dynamic hook registration, $ARGUMENTS handling |
| TUI script (ASCII rendering, transcript watching) | `[HIGH]` | Animation loop, fs.watch, Haiku SDK calls, ANSI rendering |
| Zellij layout + launch integration | `[MED]` | Layout KDL file, osascript/launch detection, session management |
| Bones/identity system (PRNG, stat generation) | `[LOW]` | Port Mulberry32 from source, straightforward |

---

## Open Questions

1. **Transcript file format** — is it JSONL? What's the schema? Need to verify by examining an actual transcript.
2. **Zellij session management** — if the user is already in a Zellij session, do we add a floating pane to it, or is that not supported?
3. **Rate limiting the observer** — should we debounce Haiku calls? During fast tool-call loops, the transcript changes rapidly. Maybe only fire on `Stop` events (end of full response), not every message.
4. **Character design** — the v1 character needs ASCII art. The mockup uses a generic chonk. This needs artistic input.

---

## Existing Mockup

A working Zellij floating pane demo exists at `/tmp/ctx-companion-demo/`:
- `companion.sh` — animated ASCII sprite with speech bubbles and cursor repositioning
- `layout-floating.kdl` — Zellij layout with 22x16 floating pane at bottom-left
- `layout.kdl` — alternate side-panel layout (rejected — feels like a sidebar)

Launch: `zellij --layout /tmp/ctx-companion-demo/layout-floating.kdl`
