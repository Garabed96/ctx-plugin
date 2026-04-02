# What the Claude Code Source Reveals for Plugin Authors

Derived from reading the leaked Claude Code source (March 2026). Every claim references a specific file path in the codebase. This is not speculation — it's what the runtime actually does.

---

## 1. Compaction Will Truncate Your Skills

**Source:** `src/services/compact/compact.ts:129`

When the conversation gets long, Claude Code compacts it. During compaction, invoked skills are preserved — but with hard limits:

- **5,000 tokens per skill** (`POST_COMPACT_MAX_TOKENS_PER_SKILL`)
- **25,000 tokens total across all skills** (`POST_COMPACT_SKILLS_TOKEN_BUDGET`)
- Skills are sorted **most-recent-first** — older skills get dropped first if budget is exceeded
- Truncation keeps the **head of the file**: `content.slice(0, charBudget)` (line 1670)

The source comment says it explicitly: *"instructions at the top of a skill file are usually the critical part"* (line 127-128).

**Commandment:** Front-load your skill files. Hard gates, process steps, and critical rules go at the top. Examples, references, and gotchas go at the bottom or in separate files. Anything below ~5,000 tokens may be silently cut during compaction.

---

## 2. `${CLAUDE_SKILL_DIR}` Is Free Path Portability

**Source:** `src/tools/SkillTool/SkillTool.ts:1077`

The SkillTool performs variable substitution before injecting skill content. Available variables:

| Variable | Resolves To | Source |
|----------|-------------|--------|
| `${CLAUDE_SKILL_DIR}` | The skill's own directory path | SkillTool.ts:1077 |
| `${CLAUDE_PLUGIN_ROOT}` | The plugin's root directory | SkillTool.ts (plugin var substitution) |
| `${CLAUDE_PLUGIN_DATA}` | `~/.claude/plugins/data/{plugin}/` | SkillTool.ts (plugin var substitution) |
| `${CLAUDE_SESSION_ID}` | Current session UUID | SkillTool.ts:1079 |

The system also injects a `Base directory for this skill:` header automatically (line 1076), which the model uses to resolve relative paths.

**Commandment:** Never hardcode absolute paths in skills. Use `${CLAUDE_SKILL_DIR}` for skill-local references (like `references/` subdirectories) and `${CLAUDE_PLUGIN_ROOT}` for plugin-wide resources. This makes the plugin portable across installations.

---

## 3. Skills Survive Compaction via Re-injection, Not Memory

**Source:** `src/services/compact/compact.ts:1488-1534`

`createSkillAttachmentIfNeeded()` re-injects skill content as an `invoked_skills` attachment after compaction. This means:

- Skills don't need to be re-invoked after compaction — the system handles it
- But the re-injected content is the truncated version (see Commandment 1)
- Plan files are explicitly excluded from post-compact restore (line 1682) — they have their own preservation mechanism

**Commandment:** Don't instruct users to re-invoke skills after compaction. The runtime handles it. But do structure skills knowing only the first ~5K tokens survive.

---

## 4. Four Hook Types Exist, Not Just Shell Commands

**Source:** `src/schemas/hooks.ts:31-155`

Most plugins only use `type: "command"` hooks. But the schema defines four:

| Type | What It Does | Default Model |
|------|-------------|---------------|
| `command` | Runs a shell command, reads stdout/stderr | N/A |
| `prompt` | Sends a prompt to an LLM, returns `{ok, reason}` | Small fast model (Haiku) |
| `agent` | Multi-turn LLM query with tool access | Haiku |
| `http` | POSTs hook input JSON to a URL | N/A |

`prompt` hooks are evaluated as structured output with a forced JSON schema: `{ok: boolean, reason?: string}`. They run with thinking disabled and default to Haiku (line 79 of `execPromptHook.ts`).

`agent` hooks get a full tool-call loop — they can Read files, Grep, run Bash — and respond with the same `{ok, reason}` schema. They're mini verification agents.

**Commandment:** Use `prompt` hooks for lightweight checks (is this commit message well-formed? does this edit touch a protected file?). Use `agent` hooks for verification that requires reading code. Reserve `command` hooks for deterministic operations that don't need judgment.

---

## 5. Hook Flags You Should Know

**Source:** `src/schemas/hooks.ts:51-64`

| Flag | Effect |
|------|--------|
| `once` | Hook runs once, then is removed. Good for one-time session setup. |
| `async` | Hook runs in background without blocking the model. |
| `asyncRewake` | Hook runs in background, wakes the model on exit code 2 (blocking error). Implies async. |
| `if` | Permission rule syntax filter (e.g., `"Bash(git *)"`) — hook only fires on matching tool calls. |
| `timeout` | Per-hook timeout in seconds. Prompt hooks default to 30s. |
| `statusMessage` | Custom spinner text while hook runs. |

**Commandment:** Use `async: true` for observational hooks (logging, telemetry) that don't need to block. Use `if` conditions to avoid spawning hooks for every tool call — `"if": "Bash(npm *)"` is cheaper than matching all Bash calls and filtering in the script.

---

## 6. Skill Precedence Has a Fixed Order

**Source:** `src/utils/plugins/loadPluginCommands.ts`, `src/tools/SkillTool/SkillTool.ts`

When multiple sources define the same skill name, the resolution order is:

1. **Bundled skills** (ship with Claude Code) — highest priority
2. **Built-in plugin skills** (registered via `builtinPlugins.ts`)
3. **Plugin commands** (from `commandsPath`)
4. **Plugin skills** (from `skillsPath`)

Plugin skills are namespaced as `plugin-name:skill-name` to avoid collisions, but if a plugin skill shares a name with a bundled skill, the bundled one wins silently.

**Commandment:** Always namespace your skills. `ctx-brainstorm` is safe because no bundled skill uses that name. But never name a skill `commit`, `review`, `plan`, or any other common word — bundled skills will shadow it without warning.

---

## 7. The `userConfig` System Gives You Configurable Settings

**Source:** `src/utils/plugins/schemas.ts:587-651`

Plugin manifests can declare a `userConfig` section. Users are prompted at enable time. Values are stored in settings (non-sensitive) or macOS keychain (sensitive). They're available as `${user_config.KEY}` in hooks, MCP server config, and non-sensitive skill content.

```json
{
  "userConfig": {
    "preferred_model": {
      "type": "string",
      "title": "Preferred Model",
      "description": "Model for subagent dispatch",
      "default": "sonnet"
    }
  }
}
```

**Commandment:** Use `userConfig` for anything that varies between users — model preferences, API keys, feature toggles. Don't hardcode configuration that should be user-settable.

---

## 8. Twenty-Four Hook Events Exist

**Source:** `src/entrypoints/sdk/coreSchemas.ts:355-383`

The full list of hookable events:

```
PreToolUse, PostToolUse, PostToolUseFailure, Notification,
UserPromptSubmit, SessionStart, SessionEnd, Stop, StopFailure,
SubagentStart, SubagentStop, PreCompact, PostCompact,
PermissionRequest, PermissionDenied, Setup, TeammateIdle,
TaskCreated, TaskCompleted, Elicitation, ElicitationResult,
ConfigChange, WorktreeCreate, WorktreeRemove,
InstructionsLoaded, CwdChanged, FileChanged
```

Every hook receives at minimum: `session_id`, `transcript_path`, `cwd`, and optionally `permission_mode`, `agent_id`, `agent_type`.

**Commandment:** Hook the event closest to what you care about. Don't use `PostToolUse` with filtering when `SubagentStop` or `TaskCompleted` exists for exactly that purpose. `transcript_path` gives you the full conversation as a file path — use it for context-aware hooks.

---

## 9. The Plugin Loader Is Cache-First

**Source:** `src/utils/plugins/pluginLoader.ts`

At startup, Claude Code calls `loadAllPluginsCacheOnly()` — no network. Full loads (with network) happen on demand. Plugin caches are memoized per component (commands, skills, agents, hooks separately). `clearPluginCache()` invalidates everything.

Hook hot-reload watches for settings changes and does an atomic clear-then-register swap to prevent stale references.

**Commandment:** If you change hook configuration at runtime, the hot-reload will pick it up. But skill/command discovery is memoized — changes to skill files may not be reflected until the next session or until the user runs `/plugin refresh`.

---

## 10. Exit Code 2 Is Special

**Source:** `src/utils/hooks.ts:236-238`

When a hook command exits with code 2, it's treated as a **blocking error**. The output becomes a system-reminder injected into the conversation. Exit code 0 is success, non-zero (except 2) is a warning. Only exit code 2 actually stops and injects.

For `asyncRewake` hooks, exit code 2 is what triggers the model wake-up.

**Commandment:** Use `exit 0` for observations and logging. Use `exit 2` with a message on stderr when you need to block the model and inject feedback. This is how your altitude-check and worktree-guard hooks communicate — make sure every blocking hook uses exit 2 with a clear, actionable message.
