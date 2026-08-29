---
name: ctx-park
description: Distills current work into durable repository handoff context before a session closes.
user-invocable: true
---

# ctx-park — Save session context

1. Announce that the session is being parked.
2. Call `ctx_workflow` with `{ schemaVersion: 1, operation: "scan_park", cwd: <absolute current working directory>, cleanSkillLog: true }`. Treat its returned handoff path, artifacts, and skill invocations as authoritative runtime state.
3. Read the relevant implementation, proof, decisions, and returned artifacts. Write a concise handoff at the returned `handoffPath`: goal, completed work, current status, decisions and rationale, exact next action, and evidence pointers. Do not include raw transcript noise or secrets.
4. Preserve the existing handoff/archive semantics: when prior context exists, use the archive arrangement supplied by the workflow; never recreate it from guessed paths.
5. Audit logged skill invocations only when they reveal a durable skill correction. Do not mutate a skill merely because an invocation occurred.
6. Report the handoff path, what was captured, and the next action.

Use `skill://ctx-park/references/example-handoff.md` when composing a substantial handoff. `ctx_workflow` owns all runtime profile, log, and archive paths.