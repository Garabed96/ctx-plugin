---
name: ctx-qa
description: Tests a web application through OMP browser automation, reports evidence, and fixes defects only when asked.
user-invocable: true
---

# ctx-qa — Evidence-led browser QA

Read `skill://ctx-qa/references/issue-taxonomy.md` and `skill://ctx-qa/references/example-report.md` before a substantive QA run. Use `browser` against the user's existing application surface; do not start a server, launch a second browser, bypass project-owned process rules, or substitute another browser CLI.

1. Establish the requested target, authenticated state, route, viewport, and whether the request includes fixes. Use `ask` for material ambiguity.
2. Inspect the current page accessibility/state first, then exercise each named user journey through `browser`. Capture concise evidence for actual failures and screenshot only when visual proof matters.
3. Test happy path, important boundaries, error/recovery paths, and responsive/accessible behavior relevant to the target. Do not claim unexercised coverage.
4. Classify findings with the issue taxonomy and report reproduction, expected versus actual behavior, impact, evidence, and recommended priority using `skill://ctx-qa/templates/qa-report-template.md`.
5. If fixing was authorized, diagnose each confirmed defect with `skill://ctx-debug/SKILL.md`, implement the root fix, then repeat the exact browser repro and applicable targeted proof. If fixes were not authorized, stop after the report.

No remote operations. If OMP browser capability is unavailable, report the capability gap after completing all non-browser inspection; never replace it with a prohibited tool.