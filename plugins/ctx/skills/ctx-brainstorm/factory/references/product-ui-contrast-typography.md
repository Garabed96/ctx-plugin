# Product UI Contrast And Typography

Use this reference for product UI, dashboards, workflow tools, editors, admin screens, and dense operational surfaces. It is intentionally narrow: contrast, state color, and type hierarchy. It is not a full design system.

## Contrast Pass

Before posting a polished product UI prototype, verify the design still works at laptop brightness around 80%.

- Body text on any surface should target WCAG AA contrast, roughly 4.5:1.
- Small metadata, labels, timestamps, and helper copy should remain readable. Do not let muted text become decorative.
- Avoid gray text on colored backgrounds. On green, amber, blue, or red surfaces, use a darker shade of that hue or near-black text with enough contrast.
- Accent color should be rare. If every card, rail item, badge, and border is highlighted, the active state loses meaning.
- Use colored backgrounds at low chroma. Put emphasis into a border, icon, badge, weight, or one saturated action.
- Do not rely on color alone for state. Pair color with text, icon, position, or weight.
- Disabled and future states can be quiet, but not illegible. Quiet means lower emphasis, not low contrast.

## State Color Hierarchy

Product workflows usually need several states on one page. Keep the hierarchy explicit:

- Current or needs-action: strongest state treatment, but preserve content readability.
- Completed or sent: calm positive tint, readable body text, no shouting.
- Prepared or future: neutral surface with modest metadata, not washed out.
- Warning or pending: amber works best as a small signal. Large amber panels often overpower the work area.
- Primary action: one saturated button per decision area.

When a state card contains substantial text, prefer a white or nearly neutral content area inside a lightly tinted state frame. The frame carries status; the content stays readable.

## Typography Pass

For product UI, use fixed type scales and predictable rhythm.

- Use fixed rem sizes for app and dashboard UI. Do not use viewport-scaled type in dense tools.
- Use fewer sizes with clearer jumps. A flat 12, 13, 14, 15px scale makes hierarchy muddy.
- Metadata needs more than small size. Pair size with weight, hue, or placement.
- Keep operational body text around 65 to 75 characters per line when possible.
- Use tabular numbers for timestamps, counts, and metrics if alignment matters.
- Use all-caps tracking only for short labels. Long uppercase text is hard to scan.
- Do not tighten letter spacing globally. Reserve tracking for small all-caps labels.

## Factory Preflight

Ask these before considering a product UI prototype high fidelity:

- Can every label be read at a glance?
- Are state colors helping the workflow, or competing with the content?
- Is the active item obvious without flooding the page?
- Are muted labels still legible?
- Does the primary action stand apart from secondary actions?
- Does the UI still work when viewed quickly, on a dim screen, or at 90% zoom?
