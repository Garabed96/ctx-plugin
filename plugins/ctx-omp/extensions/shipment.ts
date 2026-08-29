import { randomUUID } from "node:crypto";

import { sha256 } from "./bridge.ts";

export type CanonicalRemotePayload = {
  schemaVersion: 1;
  operation: "publish_prepared_shipment";
  repositoryRoot: string;
  branch: string;
  headSha: string;
  remote: "origin";
  base: string;
  title: string;
  body: string;
  draft: boolean;
};
export type PreparedShipment = {
  schemaVersion: 1;
  shipmentId: string;
  repositoryRoot: string;
  branch: string;
  commitSha: string;
  headSha: string;
  files: readonly string[];
  canonicalPayload: CanonicalRemotePayload;
  payloadHash: string;
};
type Approval = { approvalId: string; sessionId: string; shipmentId: string; repositoryRoot: string; branch: string; headSha: string; payloadHash: string; expiresAt: number; consumed: boolean };
type RepositoryState = { repositoryRoot: string; branch: string; headSha: string };
type PublishData = { shipmentId: string; headSha: string; push: "pushed" | "already_at_prepared_head"; pullRequest: { number: number; url: string; created: boolean; draft: boolean } };
type FailureCode = "CTX_PREPARED_SHIPMENT_NOT_FOUND" | "CTX_PREPARED_SHIPMENT_INVALID" | "CTX_REMOTE_APPROVAL_REQUIRED" | "CTX_REMOTE_APPROVAL_INVALID" | "CTX_REMOTE_APPROVAL_DENIED" | "CTX_REPOSITORY_STATE_CHANGED" | "CTX_UI_REQUIRED" | "CTX_REMOTE_PUBLISH_FAILED" | "CTX_UNEXPECTED_HELPER_OUTPUT" | "CTX_CANCELLED";
export type ShipmentResult = { ok: true; approvalId?: string; shipment?: PreparedShipment; expiresAt?: string; data?: PublishData } | { ok: false; error: { code: FailureCode; stage?: "approval" | "push" | "pull_request"; remoteState?: "unknown" | "prepared_head_confirmed" } };

function sortObject(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortObject);
  if (value && typeof value === "object") {
    const source = value as Record<string, unknown>;
    const result: Record<string, unknown> = {};
    for (const key of Object.keys(source).sort()) result[key] = sortObject(source[key]);
    return result;
  }
  return value;
}

/** RFC 8785-equivalent for this all-string/boolean/integer remote-payload schema. */
export function canonicalJson(payload: CanonicalRemotePayload): string {
  return JSON.stringify(sortObject(payload));
}
export function hashCanonicalPayload(payload: CanonicalRemotePayload): string { return sha256(canonicalJson(payload)); }

function freeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const child of Object.values(value as Record<string, unknown>)) freeze(child);
  }
  return value;
}
function failure(code: FailureCode, extra: { stage?: "approval" | "push" | "pull_request"; remoteState?: "unknown" | "prepared_head_confirmed" } = {}): ShipmentResult { return { ok: false, error: { code, ...extra } }; }
export class RemotePublishFailure extends Error {
  constructor(readonly stage: "push" | "pull_request", readonly remoteState: "unknown" | "prepared_head_confirmed") { super("Remote publication failed"); }
}
export class ShipmentBridgeFailure extends Error {
  constructor(readonly code: "CTX_UNEXPECTED_HELPER_OUTPUT" | "CTX_CANCELLED") { super(code); }
}

export class ShipmentService {
  private readonly shipments = new Map<string, PreparedShipment>();
  private readonly approvals = new Map<string, Approval>();
  private readonly locks = new Map<string, Promise<void>>();
  private publisher: (shipment: PreparedShipment) => Promise<PublishData>;

  constructor(private readonly dependencies: {
    now?: () => number;
    randomId?: () => string;
    sessionId: () => string;
    inspect: (repositoryRoot: string) => Promise<RepositoryState>;
    confirm: (shipment: PreparedShipment) => Promise<boolean>;
    publish: (shipment: PreparedShipment) => Promise<PublishData>;
  }) { this.publisher = dependencies.publish; }

  setPublisher(publisher: (shipment: PreparedShipment) => Promise<PublishData>) { this.publisher = publisher; }
  private key(sessionId: string, shipmentId: string) { return `${sessionId}\u0000${shipmentId}`; }
  getPrepared(shipmentId: string): PreparedShipment | undefined {
    return this.shipments.get(this.key(this.dependencies.sessionId(), shipmentId));
  }

  private now() { return this.dependencies.now?.() ?? Date.now(); }
  private id() { return this.dependencies.randomId?.() ?? randomUUID(); }

  async rememberPrepared(shipment: PreparedShipment): Promise<ShipmentResult> {
    if (shipment.commitSha !== shipment.headSha || shipment.canonicalPayload.headSha !== shipment.headSha || shipment.canonicalPayload.repositoryRoot !== shipment.repositoryRoot || shipment.canonicalPayload.branch !== shipment.branch || hashCanonicalPayload(shipment.canonicalPayload) !== shipment.payloadHash) return failure("CTX_PREPARED_SHIPMENT_INVALID");
    const state = await this.dependencies.inspect(shipment.repositoryRoot);
    if (state.repositoryRoot !== shipment.repositoryRoot || state.branch !== shipment.branch || state.headSha !== shipment.headSha) return failure("CTX_REPOSITORY_STATE_CHANGED");
    const frozen = freeze(structuredClone(shipment));
    this.shipments.set(this.key(this.dependencies.sessionId(), shipment.shipmentId), frozen);
    return { ok: true, shipment: frozen };
  }

  async requestApproval(shipmentId: string): Promise<ShipmentResult> {
    const sessionId = this.dependencies.sessionId();
    const shipment = this.shipments.get(this.key(sessionId, shipmentId));
    if (!shipment) return failure("CTX_PREPARED_SHIPMENT_NOT_FOUND");
    if (hashCanonicalPayload(shipment.canonicalPayload) !== shipment.payloadHash) return failure("CTX_PREPARED_SHIPMENT_INVALID");
    const state = await this.dependencies.inspect(shipment.repositoryRoot);
    if (state.repositoryRoot !== shipment.repositoryRoot || state.branch !== shipment.branch || state.headSha !== shipment.headSha) return failure("CTX_REPOSITORY_STATE_CHANGED");
    const granted = await this.dependencies.confirm(shipment);
    if (!granted) return failure("CTX_REMOTE_APPROVAL_DENIED", { stage: "approval" });
    const approvalId = this.id();
    const expiresAt = this.now() + 10 * 60 * 1000;
    this.approvals.set(approvalId, { approvalId, sessionId, shipmentId, repositoryRoot: shipment.repositoryRoot, branch: shipment.branch, headSha: shipment.headSha, payloadHash: shipment.payloadHash, expiresAt, consumed: false });
    return { ok: true, approvalId, expiresAt: new Date(expiresAt).toISOString() };
  }

  async publish(shipmentId: string, approvalId: string): Promise<ShipmentResult> {
    const sessionId = this.dependencies.sessionId();
    const shipment = this.shipments.get(this.key(sessionId, shipmentId));
    if (!shipment) return failure("CTX_PREPARED_SHIPMENT_NOT_FOUND");
    return this.withRepositoryLock(shipment.repositoryRoot, async () => {
      const approval = this.approvals.get(approvalId);
      if (!approval) return failure("CTX_REMOTE_APPROVAL_REQUIRED");
      if (approval.consumed || approval.expiresAt <= this.now()) return failure("CTX_REMOTE_APPROVAL_INVALID");
      if (approval.sessionId !== sessionId || approval.shipmentId !== shipmentId || approval.repositoryRoot !== shipment.repositoryRoot || approval.branch !== shipment.branch || approval.headSha !== shipment.headSha || approval.payloadHash !== shipment.payloadHash || hashCanonicalPayload(shipment.canonicalPayload) !== shipment.payloadHash) return failure("CTX_PREPARED_SHIPMENT_INVALID");
      const state = await this.dependencies.inspect(shipment.repositoryRoot);
      if (state.repositoryRoot !== shipment.repositoryRoot || state.branch !== shipment.branch || state.headSha !== shipment.headSha) return failure("CTX_REPOSITORY_STATE_CHANGED");
      approval.consumed = true;
      try { return { ok: true, data: await this.publisher(shipment) }; }
      catch (error) {
        if (error instanceof ShipmentBridgeFailure) return failure(error.code);
        if (error instanceof RemotePublishFailure) return failure("CTX_REMOTE_PUBLISH_FAILED", { stage: error.stage, remoteState: error.remoteState });
        return failure("CTX_REMOTE_PUBLISH_FAILED", { stage: "push", remoteState: "unknown" });
      }
    });
  }

  private async withRepositoryLock<T>(repositoryRoot: string, action: () => Promise<T>): Promise<T> {
    const prior = this.locks.get(repositoryRoot) ?? Promise.resolve();
    const deferred = Promise.withResolvers<void>();
    const tail = prior.then(() => deferred.promise);
    this.locks.set(repositoryRoot, tail);
    await prior;
    try { return await action(); }
    finally {
      deferred.resolve();
      if (this.locks.get(repositoryRoot) === tail) this.locks.delete(repositoryRoot);
    }
  }
}
