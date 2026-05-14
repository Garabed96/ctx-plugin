---
name: ctx-factory
description: >
  Open the brainstorm factory design viewer to browse prototype pages.
  Use when the user says "factory", "open factory", "show designs",
  "view designs", "see my designs", "open the factory", or invokes ctx-factory.
  This is a view-only launcher — it does NOT start a brainstorm session.
user-invocable: true
---

# ctx-factory — Open Design Viewer

Launch the factory design viewer so the user can browse their prototype pages.

## Prototype Authoring Rule

When a factory session creates or edits a high-fidelity prototype, treat the latest version as both a visual reference and an implementation reference.

If the prototype is interactive, the latest version must include a visible bottom context section similar to `playbook-funnel-v4`:

- Name the section `Interaction behavior` or `Implementation context`.
- Describe state transitions, click/tap behavior, keyboard expectations, mobile differences, and any disabled/loading/error states that matter.
- Call out the source-of-truth data/state model when it affects implementation.
- Mark intentional non-goals so implementation sessions do not expand scope.
- Keep this section on the latest/approved version only unless the user asks to preserve notes across older versions.

Do not rely on hidden comments, chat memory, or visual affordances alone for interactive behavior. The prototype file itself should carry enough context for a fresh implementation session to preserve the behavior, not just copy the static layout.

## Steps

1. Check if port 52341 is already listening:
   ```bash
   lsof -i :52341 -sTCP:LISTEN -t
   ```

2. **If not listening**, start the factory server:
   ```bash
   bash ..ctx-brainstorm/factory/start.sh --project-dir "$(pwd)"
   ```
   Wait for the JSON output confirming `server-started` before proceeding.

3. Open the factory in the browser:
   ```bash
   open http://localhost:52341/factory
   ```

4. Tell the user: "Factory is open at http://localhost:52341/factory"

No confirmation needed — just do it.
