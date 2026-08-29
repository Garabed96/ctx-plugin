import { bridgeFailure, type BridgeFailure, type WorkflowOperation } from "./contracts.ts";

export type WorkflowSuccess = { ok: true; schemaVersion: 1; operation: WorkflowOperation; data: Record<string, unknown>; warnings: readonly string[] };
export type WorkflowResult = WorkflowSuccess | (BridgeFailure & { operation: WorkflowOperation });

export function adaptOrdinaryWorkflow(operation: Exclude<WorkflowOperation, "ship_prepare" | "ship_publish">, value: Record<string, unknown>): WorkflowResult {
  const keys = Object.keys(value).sort();
  if (keys.join(",") !== "data,ok,operation,schemaVersion" || value.ok !== true || value.schemaVersion !== 1 || value.operation !== operation || !value.data || typeof value.data !== "object" || Array.isArray(value.data)) {
    return { ...bridgeFailure("CTX_UNEXPECTED_HELPER_OUTPUT", `Unexpected ${operation} helper output`), operation };
  }
  const data = value.data as Record<string, unknown>;
  const valid = validateData(operation, data);
  if (!valid) return { ...bridgeFailure("CTX_UNEXPECTED_HELPER_OUTPUT", `Invalid ${operation} helper result data`), operation };
  return { ok: true, schemaVersion: 1, operation, data, warnings: [] };
}

function absolute(value: unknown): value is string { return typeof value === "string" && value.startsWith("/"); }
function stringArray(value: unknown): value is string[] { return Array.isArray(value) && value.length <= 1000 && value.every((item) => typeof item === "string"); }
function count(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
function validateData(operation: Exclude<WorkflowOperation, "ship_prepare" | "ship_publish">, data: Record<string, unknown>): boolean {
  switch (operation) {
    case "grab_context": return Object.keys(data).every((key) => ["status", "branch", "worktree", "gitLog", "archive", "handoff"].includes(key)) && ["status", "branch", "worktree", "gitLog"].every((key) => key in data) && ["restored", "no_handoff", "archived"].includes(data.status as string) && typeof data.branch === "string" && absolute(data.worktree) && stringArray(data.gitLog) && (data.archive === undefined || absolute(data.archive)) && (data.handoff === undefined || absolute(data.handoff));
    case "scan_park": return Object.keys(data).sort().join(",") === "artifacts,branch,handoffPath,skillInvocations,worktree" && typeof data.branch === "string" && absolute(data.worktree) && absolute(data.handoffPath) && stringArray(data.artifacts) && stringArray(data.skillInvocations);
    case "create_worktree": return Object.keys(data).sort().join(",") === "base,branch,deps,path" && absolute(data.path) && typeof data.branch === "string" && typeof data.base === "string" && ["installed", "skipped", "not_required"].includes(data.deps as string);
    case "post_setup_worktree": return Object.keys(data).sort().join(",") === "deps,envCount" && count(data.envCount) && ["installed", "skipped", "not_required"].includes(data.deps as string);
    case "open_worktree": return Object.keys(data).sort().join(",") === "launchCommand,launched,path" && absolute(data.path) && stringArray(data.launchCommand) && typeof data.launched === "boolean";
    case "kill_worktree": return Object.keys(data).every((key) => ["worktreePath", "branch", "branchDeleted", "stoppedPort"].includes(key)) && ["worktreePath", "branch", "branchDeleted"].every((key) => key in data) && absolute(data.worktreePath) && typeof data.branch === "string" && typeof data.branchDeleted === "boolean" && (data.stoppedPort === undefined || (Number.isInteger(data.stoppedPort) && (data.stoppedPort as number) > 0));
    case "ship_preflight": return Object.keys(data).sort().join(",") === "branch,onBaseBranch,prodFiles,riskSignals" && typeof data.branch === "string" && typeof data.onBaseBranch === "boolean" && Array.isArray(data.prodFiles) && Array.isArray(data.riskSignals);
  }
}
