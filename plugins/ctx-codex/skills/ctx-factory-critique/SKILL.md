---
name: ctx-factory-critique
description: >
  Critique CTX factory prototypes against a reference prototype before iterating.
  Use when reviewing factory pages, comparing vN to vN+1, checking whether a
  factory prototype regressed from a known reference, or preparing a prioritized
  next-version checklist for a high-fidelity factory mockup.
user-invocable: true
---

# /ctx-factory-critique — Factory Prototype Critique

Use this before producing the next CTX factory version when the design needs a
structured critique against a known reference. This is lighter than live-site QA:
read the prototype files, compare them, and produce a clear next-version
checklist.

## Inputs

Prefer these inputs:

- **Current prototype**: the factory HTML being reviewed, such as
  `factory/pages/auto-outreach/auto-outreach-v11.html`.
- **Reference prototype**: the approved or target visual reference, such as
  `factory/pages/cor9-search/cor9-search-v26.html`.
- **Context**: what the surface is, who uses it, and what stage it is in.
- **Focus**: optional, such as sidebar behavior, mobile, typography, or
  interaction states.

If the reference is unclear, ask for it before doing broad critique.

## Critique Criteria

Use the baseline design-critique lens:

### 1. First Impression

- What draws the eye first?
- Is that the correct focal point?
- Is the purpose immediately clear?
- What is the emotional reaction?

### 2. Usability

- Can the user accomplish their goal?
- Is navigation intuitive?
- Are interactive elements obvious?
- Are there unnecessary steps?
- Are state changes clear after interaction?

### 3. Visual Hierarchy

- Is there a clear reading order?
- Are the right elements emphasized?
- Is whitespace used effectively?
- Is typography creating the right hierarchy?

### 4. Consistency

- Does it follow the design system or chosen reference?
- Are spacing, colors, and typography consistent?
- Do similar elements behave similarly?
- Did the new version regress from the reference?

### 5. Accessibility

- Is key text readable?
- Are muted labels still legible?
- Are touch/click targets large enough?
- Is state communicated by more than color alone?

## Factory-Specific Checks

When comparing CTX factory prototypes, explicitly inspect:

- **Reference parity**: where the current version diverges from the reference and
  whether the divergence is intentional.
- **Sidebar behavior**: collapsible state, independent scroll, filter footer,
  reopen control, and mobile fallback.
- **Facet interactions**: include/exclude actions, selected states, row tint,
  search fields, count badges, and clear actions.
- **Result cards**: density, tag language, action placement, hover/focus states,
  and whether cards match the reference chrome.
- **Curation states**: pinned, removed, skipped, empty states, restore paths, and
  modal confirmations.
- **Implementation context**: the latest version should include a visible
  `Implementation context` or `Interaction behavior` section with state model,
  interactions, disabled/loading/error states, and non-goals.
- **Product UI contrast/type**: for dense app surfaces, apply
  `ctx-brainstorm/factory/references/product-ui-contrast-typography.md` when
  available.

## Output Format

```markdown
## Design Critique: [Prototype Name]

### Overall Impression
[1-2 sentence first reaction: what works, biggest opportunity]

### Findings
| Area | Severity | Issue | Recommendation |
|---|---|---|---|
| [Area] | 🔴 Critical / 🟡 Moderate / 🟢 Minor | [Specific issue] | [Specific fix] |

### First Impression
- **Eye draw**: [Element] — [correct or not]
- **Purpose clarity**: [clear/unclear and why]
- **Emotional reaction**: [concise observation]

### Usability
- [Finding with concrete consequence]
- [Finding with concrete consequence]

### Visual Hierarchy
- [Reading order / emphasis / whitespace / typography]

### Consistency
- [Reference parity and regression notes]

### Accessibility
- **Contrast/readability**: [pass/fail/concern]
- **Targets**: [adequate/concern]
- **State clarity**: [adequate/concern]

### What Works Well
- [Positive observation 1]
- [Positive observation 2]

### Priority For Next Version
1. **[Most impactful change]** — [why and how]
2. **[Second priority]** — [why and how]
3. **[Third priority]** — [why and how]

### Ready-To-Implement Checklist
- [ ] [Concrete change]
- [ ] [Concrete change]
- [ ] [Concrete change]
```

## Feedback Rules

- Be specific: say which component or region regressed.
- Explain why: connect feedback to user goals or design principles.
- Suggest alternatives: identify the fix, not just the flaw.
- Acknowledge what works.
- Match the stage: early exploration can accept rough edges; implementation
  reference versions need precise interaction notes.
- Do not critique production code quality. This skill critiques the factory
  design and prototype behavior.

