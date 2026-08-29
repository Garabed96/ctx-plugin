import path from "node:path";

export const SCHEMA_VERSION = 1 as const;
export type BridgeErrorCode =
  | "CTX_INVALID_ARGUMENT" | "CTX_PROFILE_RESOLUTION_FAILED" | "CTX_HELPER_MISSING"
  | "CTX_HELPER_FAILED" | "CTX_UNEXPECTED_HELPER_OUTPUT" | "CTX_REPOSITORY_STATE_CHANGED"
  | "CTX_PREPARED_SHIPMENT_NOT_FOUND" | "CTX_PREPARED_SHIPMENT_INVALID"
  | "CTX_REMOTE_APPROVAL_REQUIRED" | "CTX_REMOTE_APPROVAL_INVALID" | "CTX_REMOTE_APPROVAL_DENIED"
  | "CTX_REMOTE_PUBLISH_FAILED" | "CTX_UI_REQUIRED" | "CTX_CANCELLED";
export type BridgeError = { code: BridgeErrorCode; message: string; retryable: boolean; exitCode?: number; stage?: "validation" | "prepare" | "approval" | "push" | "pull_request"; remoteState?: "not_contacted" | "unknown" | "prepared_head_confirmed" };
export type BridgeFailure = { ok: false; schemaVersion: 1; error: BridgeError };
export type WorkflowFailure = BridgeFailure & { operation: WorkflowOperation };
export type WorkflowOperation = "grab_context" | "scan_park" | "create_worktree" | "post_setup_worktree" | "open_worktree" | "kill_worktree" | "ship_preflight" | "ship_prepare" | "ship_publish";

export class BridgeValidationError extends Error {}
const record = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const own = (value: Record<string, unknown>, keys: readonly string[]) => Object.keys(value).every((key) => keys.includes(key)) && keys.every((key) => key in value);
const string = (value: unknown, field: string) => { if (typeof value !== "string") throw new BridgeValidationError(`${field} must be a string`); return value; };
const boolean = (value: unknown, field: string) => { if (typeof value !== "boolean") throw new BridgeValidationError(`${field} must be a boolean`); return value; };
const required = (value: Record<string, unknown>, keys: readonly string[]) => { if (!own(value, keys)) throw new BridgeValidationError("request contains missing or unknown fields"); };
const exact = (value: unknown, expected: string) => { if (value !== expected) throw new BridgeValidationError(`expected ${expected}`); };

export function bridgeFailure(code: BridgeErrorCode, message: string, retryable = false, extra: Omit<BridgeError, "code" | "message" | "retryable"> = {}): BridgeFailure {
  return { ok: false, schemaVersion: 1, error: { code, message, retryable, ...extra } };
}
export function invalidArgument(error: unknown): BridgeFailure { return bridgeFailure("CTX_INVALID_ARGUMENT", error instanceof Error ? error.message : "Invalid request", false, { stage: "validation" }); }
export function isAbsolutePath(value: unknown): value is string { return typeof value === "string" && value.length > 0 && path.isAbsolute(value) && !value.includes("\0"); }
export function absolutePath(value: unknown, field: string): string { if (!isAbsolutePath(value)) throw new BridgeValidationError(`${field} must be a nonempty absolute path`); return path.normalize(value); }
export function gitSha(value: unknown, field: string): string { const result = string(value, field); if (!/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(result)) throw new BridgeValidationError(`${field} must be a lowercase Git SHA`); return result; }
export function branchSegment(value: unknown, field: string): string { const result = string(value, field); if (!/^[A-Za-z0-9][A-Za-z0-9._/-]*$/.test(result) || result.includes("..")) throw new BridgeValidationError(`${field} must be a branch-safe segment`); return result; }
export function gitRef(value: unknown): string { const result = string(value, "base"); if (!result || /[\s\x00-\x1f]/.test(result) || result.includes("..") || result.includes("@{")) throw new BridgeValidationError("base must be a safe Git ref"); return result; }
export function boundedText(value: unknown, field: string, max: number, allowEmpty = false): string { const result = string(value, field); if ((!allowEmpty && !result.trim()) || [...result].length > max) throw new BridgeValidationError(`${field} must be within its allowed length`); return allowEmpty ? result : result.trim(); }

export function canonicalizeRepoRelativePaths(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 1000) throw new BridgeValidationError("files must contain 1 to 1,000 paths");
  const normalized = value.map((item) => {
    const source = string(item, "files entry");
    if (!source || source.includes("\0") || path.posix.isAbsolute(source)) throw new BridgeValidationError("files entries must be relative paths");
    const result = path.posix.normalize(source);
    if (result === "." || result === ".." || result.startsWith("../") || source.split("/").includes("..")) throw new BridgeValidationError("files entries may not traverse upward");
    return result;
  }).sort();
  if (new Set(normalized).size !== normalized.length) throw new BridgeValidationError("files entries must be unique after normalization");
  return normalized;
}

export type PathsRequest = { schemaVersion: 1; kind: "plans" | "progress" | "prds" | "handoff"; cwd?: string };
export function parsePathsRequest(value: unknown): PathsRequest {
  if (!record(value)) throw new BridgeValidationError("ctx_paths request must be an object");
  const kind = value.kind;
  if (kind !== "plans" && kind !== "progress" && kind !== "prds" && kind !== "handoff") throw new BridgeValidationError("unknown ctx_paths kind");
  required(value, kind === "handoff" ? ["schemaVersion", "kind", "cwd"] : value.cwd === undefined ? ["schemaVersion", "kind"] : ["schemaVersion", "kind", "cwd"]);
  exact(value.schemaVersion, 1);
  if (kind === "handoff" && value.cwd === undefined) throw new BridgeValidationError("handoff requires cwd");
  return { schemaVersion: 1, kind, ...(value.cwd === undefined ? {} : { cwd: absolutePath(value.cwd, "cwd") }) };
}

export type WorkflowRequest = Record<string, unknown> & { schemaVersion: 1; operation: WorkflowOperation };
export function parseWorkflowRequest(value: unknown): WorkflowRequest {
  if (!record(value)) throw new BridgeValidationError("ctx_workflow request must be an object");
  exact(value.schemaVersion, 1);
  const operation = value.operation;
  const base = ["schemaVersion", "operation"];
  const withKeys = (requiredKeys: string[], optionalKeys: string[] = []) => {
    const keys = [...base, ...requiredKeys, ...optionalKeys];
    if (!Object.keys(value).every((key) => keys.includes(key)) || !requiredKeys.every((key) => key in value)) throw new BridgeValidationError("request contains missing or unknown fields");
  };
  const defaults: Record<string, boolean> = {};
  switch (operation) {
    case "grab_context": withKeys(["cwd"], ["noArchive"]); absolutePath(value.cwd, "cwd"); defaults.noArchive = value.noArchive === undefined ? false : boolean(value.noArchive, "noArchive"); break;
    case "scan_park": withKeys(["cwd"], ["cleanSkillLog"]); absolutePath(value.cwd, "cwd"); defaults.cleanSkillLog = value.cleanSkillLog === undefined ? false : boolean(value.cleanSkillLog, "cleanSkillLog"); break;
    case "create_worktree": withKeys(["cwd", "name", "base", "prefix"], ["skipDeps"]); absolutePath(value.cwd, "cwd"); branchSegment(value.name, "name"); gitRef(value.base); branchSegment(value.prefix, "prefix"); defaults.skipDeps = value.skipDeps === undefined ? false : boolean(value.skipDeps, "skipDeps"); break;
    case "post_setup_worktree": withKeys(["source", "target"], ["skipDeps"]); absolutePath(value.source, "source"); absolutePath(value.target, "target"); defaults.skipDeps = value.skipDeps === undefined ? false : boolean(value.skipDeps, "skipDeps"); break;
    case "open_worktree": withKeys(["path"]); absolutePath(value.path, "path"); break;
    case "kill_worktree": withKeys(["worktreePath"], ["port", "detach"]); absolutePath(value.worktreePath, "worktreePath"); if (value.port !== undefined && (!Number.isInteger(value.port) || (value.port as number) < 1 || (value.port as number) > 65535)) throw new BridgeValidationError("port must be 1 through 65535"); defaults.detach = value.detach === undefined ? false : boolean(value.detach, "detach"); break;
    case "ship_preflight": withKeys(["cwd", "base"]); absolutePath(value.cwd, "cwd"); gitRef(value.base); break;
    case "ship_prepare": withKeys(["cwd", "files", "title", "body", "message", "base"], ["draft"]); absolutePath(value.cwd, "cwd"); canonicalizeRepoRelativePaths(value.files); boundedText(value.title, "title", 256); boundedText(value.body, "body", 65536, true); boundedText(value.message, "message", 512); gitRef(value.base); defaults.draft = value.draft === undefined ? false : boolean(value.draft, "draft"); break;
    case "ship_publish": withKeys(["shipmentId", "approvalId"]); if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(string(value.shipmentId, "shipmentId"))) throw new BridgeValidationError("shipmentId must be UUID v4"); if (!string(value.approvalId, "approvalId")) throw new BridgeValidationError("approvalId is required"); break;
    default: throw new BridgeValidationError("unknown ctx_workflow operation");
  }
  return { ...value, ...defaults } as WorkflowRequest;
}

export type ApprovalRequest = { schemaVersion: 1; action: "request"; shipmentId: string };
export function parseApprovalRequest(value: unknown): ApprovalRequest {
  if (!record(value)) throw new BridgeValidationError("ctx_remote_approval request must be an object");
  required(value, ["schemaVersion", "action", "shipmentId"]); exact(value.schemaVersion, 1); exact(value.action, "request");
  return { schemaVersion: 1, action: "request", shipmentId: string(value.shipmentId, "shipmentId") };
}
