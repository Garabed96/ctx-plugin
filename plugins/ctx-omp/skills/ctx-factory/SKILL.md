---
name: ctx-factory
description: Opens the current CTX Factory design viewer without starting a new design workflow.
user-invocable: true
---

# ctx-factory — View designs

This is view-only. It does not start brainstorming, create a prototype, or modify an application.

1. Resolve the Factory launcher with `ctx_paths({ schemaVersion: 1, kind: "factory_launcher" })`. If resolution fails, report its structured error and stop; do not search marketplace or checkout paths.
2. Use OMP-supervised `hub` process ownership to start or reuse the returned Factory launcher. Wait for its explicit ready state before presenting the local viewer address.
3. Report the available prototype groups and explain that choosing or changing a design enters the appropriate design workflow, normally `skill://ctx-brainstorm/SKILL.md`.
4. Stop the supervised process through `hub` only when the user asks or Factory ownership ends.

Never invoke another runtime or derive a launcher/script location.