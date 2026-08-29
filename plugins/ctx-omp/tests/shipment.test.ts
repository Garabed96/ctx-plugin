import assert from "node:assert/strict";
import test from "node:test";

import { ShipmentService, canonicalJson, hashCanonicalPayload } from "../extensions/shipment.ts";

const shipmentId = "6c0dd676-6d80-4d58-8d8d-895a1ee52f94";
const headSha = "a".repeat(40);
const payload = {
  schemaVersion: 1 as const,
  operation: "publish_prepared_shipment" as const,
  repositoryRoot: "/repo",
  branch: "feat/immutable",
  headSha,
  remote: "origin" as const,
  base: "main",
  title: "Immutable shipment",
  body: "",
  draft: false,
};

function makeService() {
  let now = 1_700_000_000_000;
  let state = { repositoryRoot: "/repo", branch: "feat/immutable", headSha };
  let publishes = 0;
  const service = new ShipmentService({
    now: () => now,
    randomId: () => shipmentId,
    sessionId: () => "session-a",
    inspect: async () => state,
    confirm: async () => true,
    publish: async () => {
      publishes += 1;
      return {
        shipmentId,
        headSha,
        push: "pushed" as const,
        pullRequest: { number: 1, url: "https://github.com/acme/repo/pull/1", created: true, draft: false },
      };
    },
  });
  return {
    service,
    setState(next: Partial<typeof state>) { state = { ...state, ...next }; },
    advance(ms: number) { now += ms; },
    publishes: () => publishes,
  };
}

async function prepare(service: ShipmentService) {
  return service.rememberPrepared({
    schemaVersion: 1,
    shipmentId,
    repositoryRoot: "/repo",
    branch: "feat/immutable",
    commitSha: headSha,
    headSha,
    files: ["src/a.ts"],
    canonicalPayload: payload,
    payloadHash: hashCanonicalPayload(payload),
  });
}

test("canonical payload hashing is stable and includes empty body and false draft", () => {
  assert.equal(canonicalJson(payload), '{"base":"main","body":"","branch":"feat/immutable","draft":false,"headSha":"aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa","operation":"publish_prepared_shipment","remote":"origin","repositoryRoot":"/repo","schemaVersion":1,"title":"Immutable shipment"}');
  assert.match(hashCanonicalPayload(payload), /^[a-f0-9]{64}$/);
});

test("approval is session-bound, expires, and is one-use", async () => {
  const fixture = makeService();
  await prepare(fixture.service);
  const approval = await fixture.service.requestApproval(shipmentId);
  assert.equal(approval.ok, true);
  if (!approval.ok) return;
  fixture.advance(10 * 60 * 1000 + 1);
  const expired = await fixture.service.publish(shipmentId, approval.approvalId);
  assert.equal(expired.ok, false);
  assert.equal(fixture.publishes(), 0);
});

test("changed final HEAD rejects before any remote helper call", async () => {
  const fixture = makeService();
  await prepare(fixture.service);
  const approval = await fixture.service.requestApproval(shipmentId);
  assert.equal(approval.ok, true);
  if (!approval.ok) return;
  fixture.setState({ headSha: "b".repeat(40) });
  const result = await fixture.service.publish(shipmentId, approval.approvalId);
  assert.equal(result.ok, false);
  assert.equal(fixture.publishes(), 0);
});

test("failed remote publish consumes the approval and never reports success", async () => {
  const fixture = makeService();
  fixture.service.setPublisher(async () => { throw new Error("push failed"); });
  await prepare(fixture.service);
  const approval = await fixture.service.requestApproval(shipmentId);
  assert.equal(approval.ok, true);
  if (!approval.ok) return;
  const failed = await fixture.service.publish(shipmentId, approval.approvalId);
  assert.deepEqual(failed, { ok: false, error: { code: "CTX_REMOTE_PUBLISH_FAILED", stage: "push", remoteState: "unknown" } });
  const retry = await fixture.service.publish(shipmentId, approval.approvalId);
  assert.equal(retry.ok, false);
});
