import { createHash } from "node:crypto";
import { access, realpath } from "node:fs/promises";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

import { BridgeValidationError, absolutePath, bridgeFailure, type BridgeFailure } from "./contracts.ts";

export type ProcessResult = { code: number | null; stdout: string; stderr: string; cancelled: boolean };
export type ProcessRunner = (file: string, args: readonly string[], options: { cwd?: string; input?: string; signal?: AbortSignal }) => Promise<ProcessResult>;

export function profileRoot(env: NodeJS.ProcessEnv = process.env, home = process.env.HOME ?? "") {
  if (env.PI_CODING_AGENT_DIR) return path.resolve(env.PI_CODING_AGENT_DIR);
  const configRoot = env.PI_CONFIG_DIR ? path.resolve(env.PI_CONFIG_DIR) : path.join(home, ".omp");
  return path.join(configRoot, "agent");
}

export function helperPath(name: string) {
  if (!/^[a-z0-9-]+$/.test(name)) throw new BridgeValidationError("invalid helper name");
  return fileURLToPath(new URL(`../scripts/${name}`, import.meta.url));
}

export async function canonicalRepository(cwd: string): Promise<string> {
  return realpath(absolutePath(cwd, "cwd"));
}

export function parseSingleJsonObject(stdout: string): Record<string, unknown> {
  const text = stdout.trim();
  if (!text || !/^[{]/.test(text)) throw new BridgeValidationError("helper stdout must be one JSON object");
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new BridgeValidationError("helper stdout was not JSON"); }
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new BridgeValidationError("helper stdout must be one JSON object");
  return value as Record<string, unknown>;
}

export const runProcess: ProcessRunner = async (file, args, options) => new Promise((resolve) => {
  if (options.signal?.aborted) { resolve({ code: null, stdout: "", stderr: "cancelled", cancelled: true }); return; }
  const child = spawn(file, [...args], { cwd: options.cwd, detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"] });
  let stdout = "";
  let stderr = "";
  let cancelled = false;
  child.stdout.on("data", (chunk) => { stdout += String(chunk); });
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  const stop = () => {
    cancelled = true;
    if (child.pid && process.platform !== "win32") { try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); } }
    else child.kill("SIGTERM");
  };
  options.signal?.addEventListener("abort", stop, { once: true });
  child.on("error", (error) => resolve({ code: null, stdout, stderr: `${stderr}${error.message}`, cancelled }));
  child.on("close", (code) => resolve({ code, stdout, stderr, cancelled }));
  if (options.input !== undefined) child.stdin.end(options.input); else child.stdin.end();
});

export async function runJsonHelper(name: string, request: Record<string, unknown>, signal?: AbortSignal, runner: ProcessRunner = runProcess): Promise<Record<string, unknown> | BridgeFailure> {
  const helper = helperPath(name);
  try { await access(helper); } catch { return bridgeFailure("CTX_HELPER_MISSING", `Packaged helper missing for ${name}: ${helper}`); }
  const result = await runner(process.execPath, [helper], { input: JSON.stringify(request), signal });
  if (result.cancelled || signal?.aborted) return bridgeFailure("CTX_CANCELLED", "Helper execution was cancelled", true);
  if (result.code !== 0) return bridgeFailure("CTX_HELPER_FAILED", result.stderr.trim() || `${name} exited ${result.code ?? "without a status"}`, true, { exitCode: result.code ?? undefined });
  try { return parseSingleJsonObject(result.stdout); } catch (error) { return bridgeFailure("CTX_UNEXPECTED_HELPER_OUTPUT", error instanceof Error ? error.message : "Helper output was invalid"); }
}

export async function inspectRepository(cwd: string, signal?: AbortSignal, runner: ProcessRunner = runProcess): Promise<{ repositoryRoot: string; branch: string; headSha: string } | BridgeFailure> {
  const repositoryRoot = await canonicalRepository(cwd).catch(() => "");
  if (!repositoryRoot) return bridgeFailure("CTX_REPOSITORY_STATE_CHANGED", "Repository path no longer resolves", true);
  const result = await runner("git", ["-C", repositoryRoot, "rev-parse", "--show-toplevel", "--abbrev-ref", "HEAD", "HEAD"], { signal });
  if (result.cancelled || signal?.aborted) return bridgeFailure("CTX_CANCELLED", "Repository inspection was cancelled", true);
  if (result.code !== 0) return bridgeFailure("CTX_REPOSITORY_STATE_CHANGED", result.stderr.trim() || "Repository state could not be read", true);
  const values = result.stdout.trim().split("\n");
  if (values.length !== 3 || !values[1] || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(values[2])) return bridgeFailure("CTX_REPOSITORY_STATE_CHANGED", "Repository state was malformed", true);
  const resolvedRoot = await canonicalRepository(values[0]).catch(() => "");
  if (resolvedRoot !== repositoryRoot) return bridgeFailure("CTX_REPOSITORY_STATE_CHANGED", "Repository root changed while resolving", true);
  return { repositoryRoot, branch: values[1], headSha: values[2] };
}

export function sha256(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}
