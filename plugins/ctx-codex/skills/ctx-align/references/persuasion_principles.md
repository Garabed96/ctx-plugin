# Persuasion Principles for Skill Design

LLMs respond to the same persuasion principles as humans. Understanding this helps design skills that stick even under pressure.

**Research:** Meincke et al. (2025), N=28,000 AI conversations. Persuasion techniques more than doubled compliance rates (33% → 72%, p < .001).

## Effective Principles

### Authority
Imperative language ("YOU MUST", "Never", "No exceptions") eliminates decision fatigue and rationalization. Most effective for discipline-enforcing skills.

### Commitment
Force explicit choices and announcements. Require tracking (checklists, task updates). Creates consistency pressure.

### Scarcity
Time-bound requirements ("Before proceeding", "IMMEDIATELY after X"). Prevents "I'll do it later" drift.

### Social Proof
Universal patterns ("Every time", "X without Y = failure"). Establishes norms. Effective for documenting universal practices.

### Unity
Collaborative language ("we're colleagues", "our codebase"). Best for non-hierarchical, collaborative workflows.

## Principles to Avoid

### Reciprocity
Rarely needed. Can feel manipulative. Other principles are more effective.

### Liking
**Never use for compliance.** Conflicts with honest feedback culture. Creates sycophancy. This is why ctx-review-receive bans "Great point!" — liking-based compliance bypasses technical evaluation.

## Combinations by Skill Type

| Skill Type | Use | Avoid |
|------------|-----|-------|
| Discipline (TDD, verification) | Authority + Commitment + Social Proof | Liking, Reciprocity |
| Guidance (debugging, planning) | Moderate Authority + Unity | Heavy authority |
| Collaborative (brainstorm, discuss) | Unity + Commitment | Authority, Liking |
| Reference (principles, anti-patterns) | Clarity only | All persuasion |

## Why This Works

- **Bright-line rules reduce rationalization.** "YOU MUST" removes the "is this an exception?" question.
- **Implementation intentions create automatic behavior.** "When X, do Y" > "generally do Y."
- **LLMs are parahuman.** Authority language precedes compliance in training data. Commitment sequences (statement → action) are frequently modeled.

## The Ethics Test

Would this technique serve the user's genuine interests if they fully understood it?

If yes → legitimate. If no → manipulation.

## Sources

- Cialdini (2021). *Influence: The Psychology of Persuasion.* Harper Business.
- Meincke et al. (2025). "Call Me A Jerk: Persuading AI to Comply." U. Penn. N=28,000, compliance 33% → 72%.
