# ctx-codex

Codex port of the `plugins/ctx` workflow toolkit in this repository.

## Layout

- `.codex-plugin/plugin.json` — Codex plugin manifest
- `skills/` — Codex skill prompts and references
- `scripts/` — shell helpers invoked by the skills

## Notes

- Skill docs reference scripts with plugin-relative paths so the folder can be moved or cloned without machine-specific rewrites.
- Runtime plans and memories are stored under `~/.codex/ctx-codex/`.
- This folder is additive and does not replace the Claude plugin in `plugins/ctx`.
