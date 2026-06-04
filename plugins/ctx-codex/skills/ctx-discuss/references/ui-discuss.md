# UI Discuss

Use this reference when discussion is about UI, frontend implementation, component behavior, layout, copy, interaction states, or visual polish.

## Response Shape

Use terse, implementation-shaped answers:

```md
**Topic Name**
- Recommendation: ...
- CSS/state: `...`
- Behavior: `...`
- Risk: ...
```

## Preferences

- Prefer bullets over prose.
- Prefer code tokens over explanation.
- Include exact implementation primitives when useful:
  - `max-h-[184px]`
  - `overflow-y-auto`
  - `scrollbar-gutter: stable`
  - `scrollHeight - scrollTop - clientHeight > 1`
  - `ml-8`
  - `z-10`
  - `shadow-[...]`
- Name the component or UI region first.
- Include one tradeoff or risk only when it changes the decision.

## Avoid

- Long rationale.
- Generic encouragement.
- Repeating obvious screen context.
- Marketing copy unless copy is the topic.
