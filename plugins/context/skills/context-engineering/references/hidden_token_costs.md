# Hidden Token Costs in Claude Code

Claude Code has several background systems that consume tokens beyond your visible conversation. Understanding these helps you control actual spend.

## Background Forks (`runForkedAgent()`)

Every `runForkedAgent()` call spawns a separate model request that shares the prompt cache but adds its own token cost. These run silently after turns.

| System | What it does | Setting to disable |
|--------|--------------|--------------------|
| **Prompt suggestions** | Generates suggested next prompts after each turn | Settings > "Prompt suggestions" toggle, or `promptSuggestions: false` |
| **Speculative execution** | Pre-computes likely next steps before you ask | Internal/experimental (`USER_TYPE === 'ant'` gated as of early 2025) |
| **Memory extraction** | Background fork that extracts memories from conversation | Settings > "Auto-memory" toggle |
| **Auto-dream consolidation** | Consolidates conversation context in background | Part of the auto-dream system |
| **Agent progress summaries** | Summarizes agent progress for status display | Always on during agent execution |

## Token-Target Mechanic

When the user says things like "+500k" or "spend 2M tokens," the system prompt tells the agent that's a hard minimum. The continuation message says "Keep working — do not summarize." This directly increases output length and turn count.

**Mitigation**: Avoid open-ended token targets. Use task-scoped instructions ("implement X") rather than budget-scoped ones ("use 500k tokens on this").

## Fast Mode

Labeled as "premium extra-usage billing." Uses the same model (Opus 4.6) with faster output, billed at extra-usage rates. Not a different model — just a billing/priority tier.

## What You Can Control

### In Claude Code settings

```
promptSuggestions: false    # stops post-turn suggestion forks
autoMemory: false           # stops background memory extraction
```

### In your prompts and skills

- **Closed-ended outputs** — skills that produce a specific artifact (a plan, a report, a diff) give less surface area for speculative execution than open-ended "explore and discuss" prompts.
- **Explicit stop signals** — "Output the result and stop" is clearer than "let me know what you think."
- **Concise skill instructions** — shorter skill files = fewer tokens loaded per invocation. Keep skills under 200 lines, use reference files for detail.

### In plugin design

- **Complexity gating** — `context-execute` only spawns subagents when complexity tags warrant it. `[LOW]` tasks get 1 agent, not 3.
- **Session continuity** — `context-park`/`context-grab` avoid re-explaining context from scratch, which would trigger more background processing on a larger context window.
- **Altitude check hook** — by catching rambling early, reduces the turn count and therefore the number of background forks triggered.

## Sources

- Claude Code source: `constants/prompts.ts`, `utils/tokenBudget.ts`
- Background forks: `services/PromptSuggestion/`, `services/extractMemories/`, `services/autoDream/`, `services/AgentSummary/`
- Billing: `commands/fast/fast.tsx`, `utils/model/modelOptions.ts`
