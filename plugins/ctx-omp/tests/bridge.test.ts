import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { helperPath, parseSingleJsonObject, profileRoot, runJsonHelper } from "../extensions/bridge.ts";
import { adaptOrdinaryWorkflow } from "../extensions/workflow.ts";

test("profile root honors PI_CONFIG_DIR without source checkout fallback", () => {
  assert.equal(profileRoot({ PI_CONFIG_DIR: "/profiles/omp" }, "/home/test"), "/profiles/omp/agent");
  assert.equal(profileRoot({ PI_CODING_AGENT_DIR: "/profiles/named/agent" }, "/home/test"), "/profiles/named/agent");
});

test("helper discovery is extension-relative", () => {
  assert.match(helperPath("ctx-omp-ship"), /plugins\/ctx-omp\/scripts\/ctx-omp-ship$/);
});

test("packaged workflow preflight reads Node stdin and includes untracked production files", async () => {
  const repositoryRoot = await mkdtemp(path.join(tmpdir(), "ctx-omp-preflight-"));
  try {
    execFileSync("git", ["init", "-b", "main"], { cwd: repositoryRoot });
    execFileSync("git", ["config", "user.email", "test@example.com"], { cwd: repositoryRoot });
    execFileSync("git", ["config", "user.name", "CTX Test"], { cwd: repositoryRoot });
    await writeFile(path.join(repositoryRoot, "README.md"), "base\n");
    execFileSync("git", ["add", "README.md"], { cwd: repositoryRoot });
    execFileSync("git", ["commit", "-m", "base"], { cwd: repositoryRoot });
    execFileSync("git", ["checkout", "-b", "feat/test"], { cwd: repositoryRoot });
    await writeFile(path.join(repositoryRoot, "adapter.ts"), "export const adapter = true;\n");

    const child = Bun.spawn([helperPath("ctx-omp-workflow")], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
    child.stdin.write(JSON.stringify({ schemaVersion: 1, operation: "ship_preflight", cwd: repositoryRoot, base: "main", profileRoot: "/tmp/ctx-omp-test" }));
    child.stdin.end();
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(child.stdout).text(),
      new Response(child.stderr).text(),
      child.exited,
    ]);

    assert.equal(exitCode, 0, stderr);
    const result = JSON.parse(stdout);
    assert.equal(result.operation, "ship_preflight");
    assert.deepEqual(result.data.prodFiles, [{ path: "adapter.ts", lines: 1 }]);
  } finally {
    await rm(repositoryRoot, { recursive: true, force: true });
  }
});

test("packaged shipping helper reads stdin through its declared Node entrypoint", async () => {
  const child = Bun.spawn([helperPath("ctx-omp-ship")], {
    stdin: "pipe",
    stdout: "pipe",
    stderr: "pipe",
  });
  child.stdin.write(JSON.stringify({ schemaVersion: 1, operation: "ship_publish", shipment: null }));
  child.stdin.end();
  const [stderr, exitCode] = await Promise.all([
    new Response(child.stderr).text(),
    child.exited,
  ]);

  assert.equal(exitCode, 1);
  assert.match(stderr, /invalid immutable shipment/);
});

test("helper stdout must be one JSON object", () => {
  assert.deepEqual(parseSingleJsonObject('{"ok":true}'), { ok: true });
  assert.throws(() => parseSingleJsonObject('log\n{"ok":true}'));
  assert.throws(() => parseSingleJsonObject('[]'));
});

test("helper cancellation and malformed output map to bridge errors", async () => {
  const cancelled = await runJsonHelper("ctx-omp-workflow", { schemaVersion: 1 }, undefined, async () => ({ code: null, stdout: "", stderr: "", cancelled: true }));
  assert.equal(cancelled.ok, false);
  if (!cancelled.ok) assert.equal(cancelled.error.code, "CTX_CANCELLED");
  const malformed = await runJsonHelper("ctx-omp-workflow", { schemaVersion: 1 }, undefined, async () => ({ code: 0, stdout: "not-json", stderr: "", cancelled: false }));
  assert.equal(malformed.ok, false);
  if (!malformed.ok) assert.equal(malformed.error.code, "CTX_UNEXPECTED_HELPER_OUTPUT");
});

test("ordinary workflow adapter preserves the requested operation correlation", () => {
  const result = adaptOrdinaryWorkflow("grab_context", {
    ok: true,
    schemaVersion: 1,
    operation: "grab_context",
    data: { status: "restored", branch: "main", worktree: "/repo", gitLog: [] },
  });
  assert.equal(result.operation, "grab_context");
  const mismatched = adaptOrdinaryWorkflow("grab_context", { ok: true, schemaVersion: 1, operation: "scan_park", data: {} });
  assert.equal(mismatched.ok, false);
});
