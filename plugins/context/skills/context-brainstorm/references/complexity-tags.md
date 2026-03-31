# Complexity Tags

Tag each unit of work in the spec. These tags flow into `/context-plan` and `/context-execute`:

| Tag | Signals | Example |
|-----|---------|---------|
| `[LOW]` | 1 file, copy existing pattern exactly, no new logic | Export a constant, add a CSS class, wire an event |
| `[MED]` | 2-3 files, adapt existing pattern, conditional logic | New component using existing data flow, add a hook |
| `[HIGH]` | 4+ files, new abstraction, cross-cutting concerns | New system, auth changes, data model + API + UI |

When in doubt, tag up. A `[MED]` that turns out easy is cheaper than a `[LOW]` that blows up.

## Tag Drift

Complexity tags set during brainstorming can be wrong — complexity is often discovered during implementation. `/context-execute` should have an escape hatch to re-classify mid-flight.
