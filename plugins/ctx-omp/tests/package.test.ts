import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import test from "node:test";
import ctxRuntime from "../extensions/ctx-runtime.ts";

const pluginRoot = fileURLToPath(new URL("..", import.meta.url));
const marketplaceRoot = fileURLToPath(new URL("../../..", import.meta.url));

test("marketplace and package publish the same ctx-omp version and extension entry", async () => {
  const marketplace = JSON.parse(await readFile(new URL(".omp-plugin/marketplace.json", `file://${marketplaceRoot}/`), "utf8"));
  const pkg = JSON.parse(await readFile(new URL("package.json", `file://${pluginRoot}/`), "utf8"));
  const entry = marketplace.plugins.find((plugin: { name: string }) => plugin.name === "ctx-omp");
  assert.equal(pkg.name, "ctx-omp");
  assert.equal(entry.version, pkg.version);
  assert.deepEqual(pkg.omp.extensions, ["./extensions/ctx-runtime.ts"]);
});

const schema = {
  strict() { return this; },
  optional() { return this; },
  default() { return this; },
  int() { return this; },
  min() { return this; },
  max() { return this; },
};

const ompZodSurface = {
  object: () => ({ ...schema, kind: "object" }),
  literal: () => schema,
  enum: () => schema,
  string: () => schema,
  boolean: () => schema,
  number: () => schema,
  array: () => schema,
  union: () => ({ ...schema, kind: "union" }),
};

test("extension registers against the OMP zod-compatible schema surface", () => {
  const tools: Array<{ name: string; parameters: { kind: string } }> = [];
  ctxRuntime({
    zod: ompZodSurface,
    registerTool(tool: { name: string; parameters: { kind: string } }) {
      tools.push(tool);
    },
    on() {},
    sendMessage() {},
  } as never);

  assert.deepEqual(tools.map((tool) => tool.name), ["ctx_paths", "ctx_workflow", "ctx_remote_approval"]);
  assert.equal(tools.find((tool) => tool.name === "ctx_workflow")?.parameters.kind, "object");
});
