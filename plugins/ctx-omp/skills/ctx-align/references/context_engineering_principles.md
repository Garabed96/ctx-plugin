# Context engineering principles

1. State the outcome and the boundary before prescribing implementation.
2. Supply current evidence: exact paths, observations, constraints, and source-of-truth artifacts.
3. Define observable success and proportionate proof.
4. Keep stable rules separate from task-specific detail; link durable references instead of duplicating them.
5. Prefer named seams and explicit ownership over long conditional instruction lists.
6. Give a worker a clear stop condition and authority boundary.
7. Ask only questions whose answer materially changes the next action.
8. Treat uncertain statements as assumptions and verify them from the repository or runtime.

Good context enables judgment. It avoids both underspecified intent and brittle micro-instructions that duplicate the codebase's existing decisions.