# Context Engineering Principles

Distilled from Anthropic's official docs and engineering blog. For the calibration framework (three gates, red zone detection, WHAT vs HOW), see the `/context-engineering` skill.

## Reduce Hallucinations (Anthropic official)

1. Allow Claude to say "I don't know" — explicitly give permission to admit uncertainty
2. Use direct quotes for factual grounding — extract word-for-word quotes before reasoning
3. Verify with citations — cite sources for each claim; retract unsupported claims
4. Chain-of-thought verification — explain reasoning step-by-step before final answer
5. External knowledge restriction — only use information from provided documents

## Increase Output Consistency (Anthropic official)

1. Specify desired output format precisely (JSON, XML, templates)
2. Constrain with examples — few diverse canonical examples > abstract instructions
3. Use retrieval for contextual consistency — ground in fixed information sets
4. Chain prompts for complex tasks — smaller consistent subtasks
5. Keep Claude in character — system prompts for role, prepare for common scenarios

## Context Engineering vs Prompt Engineering (Anthropic blog)

- Prompt engineering = how to write effective prompts (especially system prompts)
- Context engineering = curating the optimal set of tokens during LLM inference (system instructions + tools + MCP + external data + message history)
- As models get smarter, less prescriptive engineering needed
- "Do the simplest thing that works" — Anthropic's actual advice

## Long-Horizon Techniques

1. **Compaction** — summarize context window, reinitiate with summary + recent files
2. **Structured note-taking** — agent writes notes persisted outside context window
3. **Sub-agent architectures** — specialized sub-agents with clean context windows, return condensed summaries

## Claude 4.6 Specific (from best practices)

- More proactive about tool use — dial back "CRITICAL: YOU MUST" language
- Better at parallel tool calling natively
- Adaptive thinking replaces manual budget_tokens
- Tends to overengineer — add "avoid over-engineering" guidance if needed
- Prefilled responses deprecated — use structured outputs or system prompt instructions
- Context-aware — tracks remaining context window

## Sources

- Best Practices: platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices
- Context Engineering Blog: anthropic.com/engineering/effective-context-engineering-for-ai-agents
