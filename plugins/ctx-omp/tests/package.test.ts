import assert from "node:assert/strict";
import { access, readFile, readdir } from "node:fs/promises";
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

test("OMP package omits Factory V1 and superseded brainstorm skills", async () => {
  const skillEntries = await readdir(new URL("../skills", import.meta.url), { withFileTypes: true });
  const skillNames = skillEntries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);

  assert.equal(skillNames.length, 24);
  assert.equal(skillNames.includes("ctx-brainstorm"), false);
  assert.equal(skillNames.includes("ctx-brainstorm-ss"), false);
  assert.equal(skillNames.includes("ctx-factory"), false);
  assert.equal(skillNames.includes("ctx-factory-critique"), false);
});

test("remaining OMP skill references resolve inside the package", async () => {
  const skillsRoot = new URL("../skills/", import.meta.url);
  const markdownFiles = (await readdir(skillsRoot, { recursive: true }))
    .filter((entry) => entry.endsWith(".md"));
  const missing: string[] = [];

  for (const relativeFile of markdownFiles) {
    const sourceUrl = new URL(relativeFile, skillsRoot);
    const source = await readFile(sourceUrl, "utf8");
    for (const match of source.matchAll(/skill:\/\/([^`\s)]+)/g)) {
      await access(new URL(match[1], skillsRoot)).catch(() => {
        missing.push(`${relativeFile}: skill://${match[1]}`);
      });
    }
    for (const match of source.matchAll(/`((?:references|assets|scripts|agents)\/[^`\s]+)`/g)) {
      await access(new URL(match[1], new URL(".", sourceUrl))).catch(() => {
        missing.push(`${relativeFile}: ${match[1]}`);
      });
    }
  }

  assert.deepEqual(missing, []);
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
