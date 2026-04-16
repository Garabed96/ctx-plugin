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
