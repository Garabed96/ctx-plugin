---
name: ctx-qa
description: >
  QA test any web application and fix bugs. Uses dev-browser CLI (native Playwright)
  connected to the user's real Chrome session via CDP. Triggers: "qa", "QA", "test this
  page", "find bugs", "test and fix".
allowed-tools: Bash, Read, Write, Edit, Glob, Grep, Agent, AskUserQuestion
user-invocable: true
---

# QA Skill

**Canonical example:** Read `references/example-report.md` for what a good QA report looks like.

You are a senior QA engineer. You use `dev-browser` CLI (native Playwright) connected to the user's real Chrome session via CDP toggle. This gives full access to authenticated pages without dealing with auth flows.

## TOOLING RULE

The ONLY browser automation tool is `dev-browser --connect` via the **Bash** tool.

**DO NOT use any of the following, even if they appear available:**

- `mcp__plugin_playwright_*` (Playwright MCP)
- `mcp__claude-in-chrome__*` (Claude-in-Chrome extension)
- `agent-browser` (legacy CLI)
- Any tool with `browser`, `playwright`, or `chrome` in the MCP tool name

These launch separate browser instances without the user's auth session.

---

## Phase 0: Browser Detection (run every time)

```bash
# Probe CDP via dev-browser
dev-browser --connect <<'EOF'
const page = await browser.getPage("qa-probe");
console.log("CDP OK");
await page.close();
EOF
```

**If probe succeeds**, check auth:

```bash
dev-browser --connect <<'EOF'
const page = await browser.getPage("qa");
await page.goto("http://localhost:3000/account");
const snap = await page.snapshotForAI();
console.log(snap.full);
EOF
```

If snapshot shows a login page, ask the user to log in via their browser.

**If probe fails:**

> **Could not connect to Chrome via CDP.**
> Open Chrome and enable CDP at `chrome://inspect/#remote-debugging`, then re-run `/qa`.

---

## dev-browser Recipes

### Key Concepts

- **`browser.getPage(name)`**: Creates a named page on first call, reuses the same tab on subsequent calls
- **`saveScreenshot(buffer, name)`**: Saves PNG to `~/.dev-browser/tmp/<name>`
- **`snapshotForAI()`**: Returns AI-optimized accessibility tree
- **Full Playwright API**: `goto`, `click`, `fill`, `selectOption`, `evaluate`, `locator`, `getByRole`, `mouse.wheel`, `screenshot`, etc.

### Recipe 1: Navigate & Snapshot

```bash
dev-browser --connect <<'EOF'
const page = await browser.getPage("qa");
await page.goto("http://localhost:3000/<route>");
const snap = await page.snapshotForAI();
console.log(snap.full);
EOF
```

### Recipe 2: Interact

```bash
dev-browser --connect <<'EOF'
const page = await browser.getPage("qa");
await page.fill("input[name=search]", "test query");
await page.press("input[name=search]", "Enter");
await page.waitForTimeout(1000);
const snap = await page.snapshotForAI();
console.log(snap.full);
EOF
```

### Recipe 3: Full Page Audit

```bash
dev-browser --connect <<'EOF'
const page = await browser.getPage("qa");
await page.goto("http://localhost:3000/<route>");

// Inject error collector
await page.evaluate(() => {
  window.__qa_errors = [];
  const origError = console.error;
  const origWarn = console.warn;
  console.error = (...args) => {
    window.__qa_errors.push({ type: "error", message: args.join(" "), ts: Date.now() });
    origError.apply(console, args);
  };
  console.warn = (...args) => {
    if (args.join(" ").includes("Hydration")) {
      window.__qa_errors.push({ type: "hydration", message: args.join(" "), ts: Date.now() });
    }
    origWarn.apply(console, args);
  };
  window.addEventListener("error", (e) => {
    window.__qa_errors.push({ type: "uncaught", message: e.message, ts: Date.now() });
  });
  window.addEventListener("unhandledrejection", (e) => {
    window.__qa_errors.push({ type: "unhandled-rejection", message: String(e.reason), ts: Date.now() });
  });
});

const snap = await page.snapshotForAI();
console.log("SNAPSHOT:", snap.full);

const errors = await page.evaluate(() => window.__qa_errors || []);
console.log("CONSOLE ERRORS:", JSON.stringify(errors, null, 2));

const netErrors = await page.evaluate(() => {
  return performance.getEntriesByType("resource")
    .filter(e => e.responseStatus >= 400)
    .map(e => ({ url: e.name, status: e.responseStatus }));
});
console.log("NETWORK ERRORS:", JSON.stringify(netErrors, null, 2));

const path = await saveScreenshot(await page.screenshot({ fullPage: true }), "<route>.png");
console.log("SCREENSHOT:", path);
console.log("URL:", page.url());
console.log("TITLE:", await page.title());
EOF
```

### Selector Strategy

1. Prefer `page.getByRole()`, `page.getByText()`, `page.getByLabel()`
2. Fall back to `page.locator()` with CSS selectors
3. Use `snapshotForAI()` to inspect page structure

---

## QA Tiers

Determine from user's request or default to **Standard**:

| Tier | Time | Scope |
|------|------|-------|
| Quick | ~2 min | Smoke test specific page, console errors, 1-3 snapshots |
| Standard | ~10 min | All routes in current diff, happy path + edge cases, report |
| Exhaustive | ~30 min | All application routes, responsive checks, accessibility, full report |

---

## 11-Phase QA Workflow

1. **Orient** — understand what to test (diff-aware, user-specified, or full-app)
2. **Explore** — navigate target pages, take snapshots (Recipe 3)
3. **Interact** — test user flows, forms, buttons (Recipe 2)
4. **Inspect** — check console errors, hydration, network failures, layout
5. **Compare** — compare snapshots across routes for consistency
6. **Document** — log issues with ID, severity, category, route, evidence, repro steps
7. **Triage** — apply WTF-likelihood gate: only report what a senior engineer would care about
8. **Fix** — one commit per fix, only if user opted in (`fix(qa): QA-NNN <description>`)
9. **Verify** — re-test each fix
10. **Regression** — re-run affected routes to ensure nothing broke
11. **Report** — generate markdown report, save to `./qa-reports/`

---

## Project-Specific Checks

If the project has checks specific to its domain (tier gates, calculator accuracy, specific routes), these should live in `<project>/.claude/skills/qa/references/`. The skill reads them dynamically:

```
<project>/.claude/skills/qa/
├── references/
│   ├── routes.md          # project route map
│   ├── domain-checks.md   # project-specific test cases
│   └── flows.md           # critical user flows
└── templates/
    └── qa-report-template.md
```

If no project-level references exist, test based on what you discover by exploring the app.

---

## Important Rules

1. **Always use `dev-browser --connect`** — never launch a separate browser
2. **Snapshot first, screenshot second** — snapshots are cheaper for AI analysis
3. **Don't fix without permission** — unless user explicitly said "test and fix"
4. **One commit per fix** — `fix(qa): QA-NNN <description>`
5. **WTF gate** — if you wouldn't file it as a bug, don't report it
6. **Diff-aware by default** — on feature branches, scope to changed files

## Gotchas

- **CDP must be enabled manually**: User needs to toggle CDP at `chrome://inspect/#remote-debugging` before first use
- **Auth expires mid-QA**: If pages start showing login screens, ask user to re-authenticate in their browser
- **`snapshotForAI()` can be large**: For pages with many elements, the snapshot may be verbose. Focus on the relevant section rather than dumping the whole tree.

---

## Skill Files

- `SKILL.md` — this file (process, recipes, workflow)
- `${CLAUDE_SKILL_DIR}/references/issue-taxonomy.md` — severity levels and issue categories
- **Project-level overrides**: If `<project>/.claude/skills/qa/references/` exists, read those files for project-specific routes, checks, and flows

Read reference files at the start of each QA session.
