import { randomUUID } from "node:crypto";
import { appendFile, mkdir, stat } from "node:fs/promises";
import path from "node:path";
import type { ExtensionAPI } from "@oh-my-pi/pi-coding-agent";

import { BridgeValidationError, bridgeFailure, canonicalizeRepoRelativePaths, invalidArgument, parseApprovalRequest, parsePathsRequest, parseWorkflowRequest, type BridgeFailure, type WorkflowOperation } from "./contracts.ts";
import { canonicalRepository, helperPath, inspectRepository, profileRoot, runJsonHelper } from "./bridge.ts";
import { RemotePublishFailure, ShipmentBridgeFailure, ShipmentService, hashCanonicalPayload, type PreparedShipment } from "./shipment.ts";
import { adaptOrdinaryWorkflow } from "./workflow.ts";
import { altitudeNudge, blockedShippingCommand, isSkillRead, needsTestCoverageNudge } from "../hooks/policy.ts";

const ordinaryOperations: Record<Exclude<WorkflowOperation, "ship_prepare" | "ship_publish">, true> = { grab_context: true, scan_park: true, create_worktree: true, post_setup_worktree: true, open_worktree: true, kill_worktree: true, ship_preflight: true };
const isFailure = (value: unknown): value is BridgeFailure => typeof value === "object" && value !== null && (value as { ok?: unknown }).ok === false;
function hasExactKeys(value: unknown, expected: readonly string[]): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const keys = Object.keys(value).sort();
  return keys.length === expected.length && keys.every((key, index) => key === expected[index]);
}

const success = (value: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(value) }], details: value });
const failure = (value: BridgeFailure, operation?: WorkflowOperation) => {
  const body = operation ? { ...value, operation } : value;
  return { content: [{ type: "text" as const, text: JSON.stringify(body) }], details: body };
};

export default function ctxRuntime(pi: ExtensionAPI) {
  const z = pi.zod;
  const runtime = pi as unknown as { on: Function; registerTool: Function; sendMessage: Function };
  const services = new Map<string, ShipmentService>();
  const stagedNudges = new Map<string, string>();
  const agentRoot = profileRoot();
  const pathsSchema = z.object({ schemaVersion: z.literal(1), kind: z.enum(["plans", "progress", "prds", "handoff", "factory_launcher"]), cwd: z.string().optional() }).strict();
  const workflowSchema = z.object({
    schemaVersion: z.literal(1),
    operation: z.enum(["grab_context", "scan_park", "create_worktree", "post_setup_worktree", "open_worktree", "kill_worktree", "ship_preflight", "ship_prepare", "ship_publish"]),
    cwd: z.string().optional(),
    noArchive: z.boolean().optional(),
    cleanSkillLog: z.boolean().optional(),
    name: z.string().optional(),
    base: z.string().optional(),
    prefix: z.string().optional(),
    skipDeps: z.boolean().optional(),
    source: z.string().optional(),
    target: z.string().optional(),
    path: z.string().optional(),
    worktreePath: z.string().optional(),
    port: z.number().int().min(1).max(65535).optional(),
    detach: z.boolean().optional(),
    files: z.array(z.string()).min(1).max(1000).optional(),
    title: z.string().optional(),
    body: z.string().optional(),
    message: z.string().optional(),
    draft: z.boolean().optional(),
    shipmentId: z.string().optional(),
    approvalId: z.string().optional(),
  }).strict();
  const approvalSchema = z.object({ schemaVersion: z.literal(1), action: z.literal("request"), shipmentId: z.string() }).strict();

  const serviceFor = (ctx: any, signal?: AbortSignal) => {
    const sessionId = ctx.sessionManager.getSessionId();
    const existing = services.get(sessionId);
    if (existing) return existing;
    const service = new ShipmentService({
      sessionId: () => ctx.sessionManager.getSessionId(),
      inspect: async (repositoryRoot) => {
        const state = await inspectRepository(repositoryRoot, signal);
        if (isFailure(state)) throw new Error(state.error.message);
        return state;
      },
      confirm: async (shipment) => {
        if (!ctx.hasUI || signal?.aborted) return false;
        const payload = shipment.canonicalPayload;
        return Boolean(await ctx.ui.confirm("Publish prepared shipment?", `Repository: ${payload.repositoryRoot}\nBranch: ${payload.branch}\nSHA: ${payload.headSha}\nDestination: origin/${payload.branch}\nBase: ${payload.base}\nTitle: ${payload.title}\nBody: ${payload.body}\nDraft: ${payload.draft}`));
      },
      publish: async (shipment) => {
        const output = await runJsonHelper("ctx-omp-ship", { schemaVersion: 1, operation: "ship_publish", shipment }, signal);
        if (isFailure(output)) {
          if (output.error.code === "CTX_CANCELLED" || output.error.code === "CTX_UNEXPECTED_HELPER_OUTPUT") throw new ShipmentBridgeFailure(output.error.code);
          throw new RemotePublishFailure(output.error.exitCode === 41 ? "pull_request" : "push", output.error.exitCode === 41 ? "prepared_head_confirmed" : "unknown");
        }
        const data = output.data;
        if (!hasExactKeys(output, ["data", "ok", "operation", "schemaVersion"]) || output.ok !== true || output.schemaVersion !== 1 || output.operation !== "ship_publish" || !hasExactKeys(data, ["headSha", "pullRequest", "push", "shipmentId"])) throw new ShipmentBridgeFailure("CTX_UNEXPECTED_HELPER_OUTPUT");
        const pullRequest = data.pullRequest;
        if (data.shipmentId !== shipment.shipmentId || data.headSha !== shipment.headSha || (data.push !== "pushed" && data.push !== "already_at_prepared_head") || !hasExactKeys(pullRequest, ["created", "draft", "number", "url"]) || !Number.isInteger(pullRequest.number) || pullRequest.number < 1 || typeof pullRequest.created !== "boolean" || typeof pullRequest.draft !== "boolean" || typeof pullRequest.url !== "string" || !/^https:\/\/github\.com\//.test(pullRequest.url)) throw new ShipmentBridgeFailure("CTX_UNEXPECTED_HELPER_OUTPUT");
        return data as any;
      },
    });
    services.set(sessionId, service);
    return service;
  };

  runtime.registerTool({ name: "ctx_paths", label: "CTX Paths", description: "Resolve OMP profile, repository, and plugin paths for CTX workflows.", parameters: pathsSchema, strict: true, loadMode: "essential", approval: "read",
    async execute(_id: string, params: unknown, _signal: AbortSignal | undefined, _update: unknown, _ctx: any) {
      try {
        const request = parsePathsRequest(params);
        if (request.kind === "plans" || request.kind === "progress" || request.kind === "prds") return success({ ok: true, schemaVersion: 1, kind: request.kind, path: path.join(agentRoot, "ctx", request.kind), scope: "profile", profileId: agentRoot });
        if (request.kind === "factory_launcher") return success({ ok: true, schemaVersion: 1, kind: request.kind, path: helperPath("ctx-omp-workflow"), scope: "plugin" });
        const repositoryRoot = await canonicalRepository(request.cwd!);
        return success({ ok: true, schemaVersion: 1, kind: request.kind, path: path.join(repositoryRoot, "docs", "ctx", "park.md"), scope: "repository", repositoryRoot });
      } catch (error) { return failure(error instanceof BridgeValidationError ? invalidArgument(error) : bridgeFailure("CTX_PROFILE_RESOLUTION_FAILED", "Could not resolve CTX runtime path", true)); }
    },
  });

  runtime.registerTool({ name: "ctx_workflow", label: "CTX Workflow", description: "Run a validated local CTX workflow operation.", parameters: workflowSchema, strict: true, loadMode: "essential",
    async execute(_id: string, params: unknown, signal: AbortSignal | undefined, _update: unknown, ctx: any) {
      let request: any;
      try { request = parseWorkflowRequest(params); } catch (error) { return failure(invalidArgument(error), (params as any)?.operation); }
      const operation = request.operation as WorkflowOperation;
      if (signal?.aborted) return failure(bridgeFailure("CTX_CANCELLED", "Workflow was cancelled", true), operation);
      if (operation in ordinaryOperations) {
        const rootField = request.cwd ? "cwd" : request.source ? "source" : request.path ? "path" : "worktreePath";
        request[rootField] = await canonicalRepository(request[rootField]).catch(() => request[rootField]);
        const output = await runJsonHelper("ctx-omp-workflow", { ...request, profileRoot: agentRoot }, signal);
        if (isFailure(output)) return failure(output, operation);
        return success(adaptOrdinaryWorkflow(operation as Exclude<WorkflowOperation, "ship_prepare" | "ship_publish">, output));
      }
      if (operation === "ship_prepare") {
        const repositoryRoot = await canonicalRepository(request.cwd).catch(() => "");
        if (!repositoryRoot) return failure(bridgeFailure("CTX_REPOSITORY_STATE_CHANGED", "Repository path no longer resolves", true), operation);
        const files = canonicalizeRepoRelativePaths(request.files);
        const output = await runJsonHelper("ctx-omp-ship", { schemaVersion: 1, operation, cwd: repositoryRoot, files, message: request.message }, signal);
        if (isFailure(output)) return failure(output, operation);
        const data = output.data as any;
        if (!hasExactKeys(output, ["data", "ok", "operation", "schemaVersion"]) || output.ok !== true || output.schemaVersion !== 1 || output.operation !== operation || !hasExactKeys(data, ["branch", "commitSha", "files", "headSha", "repositoryRoot"]) || typeof data.branch !== "string" || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/.test(data.commitSha) || data.repositoryRoot !== repositoryRoot || data.commitSha !== data.headSha || JSON.stringify(data.files) !== JSON.stringify(files)) return failure(bridgeFailure("CTX_UNEXPECTED_HELPER_OUTPUT", "Invalid ship_prepare helper output"), operation);
        const state = await inspectRepository(repositoryRoot, signal);
        if (isFailure(state) || state.branch !== data.branch || state.headSha !== data.headSha) return failure(bridgeFailure("CTX_REPOSITORY_STATE_CHANGED", "Repository changed after local shipment preparation", true), operation);
        const shipment: PreparedShipment = { schemaVersion: 1, shipmentId: randomUUID(), repositoryRoot, branch: data.branch, commitSha: data.commitSha, headSha: data.headSha, files, canonicalPayload: { schemaVersion: 1, operation: "publish_prepared_shipment", repositoryRoot, branch: data.branch, headSha: data.headSha, remote: "origin", base: request.base, title: request.title, body: request.body, draft: request.draft }, payloadHash: "" };
        shipment.payloadHash = hashCanonicalPayload(shipment.canonicalPayload);
        const prepared = await serviceFor(ctx, signal).rememberPrepared(shipment);
        if (!prepared.ok) return failure(bridgeFailure(prepared.error.code as any, "Prepared shipment was invalid", true), operation);
        return success({ ok: true, schemaVersion: 1, operation, data: { shipment: prepared.shipment }, warnings: [] });
      }
      const published = await serviceFor(ctx, signal).publish(request.shipmentId, request.approvalId);
      if (!published.ok) return failure(bridgeFailure(published.error.code as any, "Shipment publish was not authorized or did not complete", published.error.code === "CTX_REMOTE_PUBLISH_FAILED", { stage: published.error.stage, remoteState: published.error.remoteState }), operation);
      return success({ ok: true, schemaVersion: 1, operation, data: published.data, warnings: [] });
    },
  });

  runtime.registerTool({ name: "ctx_remote_approval", label: "CTX Remote Approval", description: "Request one-time interactive approval for a prepared shipment.", parameters: approvalSchema, strict: true, loadMode: "essential",
    async execute(_id: string, params: unknown, signal: AbortSignal | undefined, _update: unknown, ctx: any) {
      try {
        const request = parseApprovalRequest(params);
        if (signal?.aborted) return failure(bridgeFailure("CTX_CANCELLED", "Approval request was cancelled", true));
        if (!ctx.hasUI) return failure(bridgeFailure("CTX_UI_REQUIRED", "Interactive UI is required to approve remote publication"));
        const service = serviceFor(ctx, signal); const approval = await service.requestApproval(request.shipmentId);
        if (!approval.ok) return failure(bridgeFailure(approval.error.code as any, "Remote approval was not granted", approval.error.code === "CTX_REMOTE_APPROVAL_REQUIRED", { stage: approval.error.stage }));
        const shipment = service.getPrepared(request.shipmentId)!;
        return success({ ok: true, schemaVersion: 1, approvalId: approval.approvalId, operation: "publish_prepared_shipment", shipmentId: shipment.shipmentId, repositoryRoot: shipment.repositoryRoot, branch: shipment.branch, headSha: shipment.headSha, payloadHash: shipment.payloadHash, expiresAt: approval.expiresAt });
      } catch (error) { return failure(invalidArgument(error)); }
    },
  });

  runtime.on("session_start", async (_event: unknown, ctx: any) => {
    try { await stat(path.join(ctx.cwd, "docs", "ctx", "park.md")); stagedNudges.set(ctx.sessionManager.getSessionId(), "A parked CTX handoff is available; use ctx_workflow grab_context when ready."); } catch { /* no parked context */ }
  });
  runtime.on("input", (event: any, ctx: any) => { if (event.source === "extension" || (event.source !== "interactive" && event.source !== "rpc")) return; const nudge = altitudeNudge(String(event.text ?? "")); if (nudge) stagedNudges.set(ctx.sessionManager.getSessionId(), nudge); });
  runtime.on("before_agent_start", (_event: unknown, ctx: any) => { const sessionId = ctx.sessionManager.getSessionId(); const nudge = stagedNudges.get(sessionId); if (!nudge) return; stagedNudges.delete(sessionId); runtime.sendMessage({ customType: "com.ctx.omp.altitude", content: nudge, display: false, attribution: "user" }, { deliverAs: "nextTurn", triggerTurn: false }); });
  runtime.on("tool_call", (event: any) => { if (event.toolName !== "bash" || event.source === "user") return; const reason = blockedShippingCommand(String(event.input?.command ?? "")); if (reason) return { block: true, reason }; });
  runtime.on("tool_result", async (event: any, ctx: any) => {
    if (event.toolName === "read" && !event.result?.isError && isSkillRead(event.input?.path)) { const log = path.join(profileRoot(), "ctx", "skill-invocations.log"); await mkdir(path.dirname(log), { recursive: true }); await appendFile(log, `${new Date().toISOString()}|${String(event.input.path)}|${ctx.sessionManager.getSessionId()}\n`, "utf8"); }
    if (event.toolName === "bash" && !event.result?.isError && needsTestCoverageNudge(String(event.result?.content?.map((part: any) => part.text ?? "").join("\n") ?? ""))) stagedNudges.set(ctx.sessionManager.getSessionId(), "Unit-test evidence is present; consider whether service, integration, or end-to-end coverage is needed.");
  });
  runtime.on("session_shutdown", (_event: unknown, ctx: any) => { const sessionId = ctx.sessionManager.getSessionId(); services.delete(sessionId); stagedNudges.delete(sessionId); });
}
