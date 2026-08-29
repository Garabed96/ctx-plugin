import assert from "node:assert/strict";
import test from "node:test";

import {
  BridgeValidationError,
  canonicalizeRepoRelativePaths,
  parseApprovalRequest,
  parsePathsRequest,
  parseWorkflowRequest,
} from "../extensions/contracts.ts";

test("ctx_paths accepts only schemaVersion 1 and declared keys", () => {
  assert.deepEqual(parsePathsRequest({ schemaVersion: 1, kind: "plans" }), {
    schemaVersion: 1,
    kind: "plans",
  });
  assert.deepEqual(parsePathsRequest({ schemaVersion: 1, kind: "prds" }), {
    schemaVersion: 1,
    kind: "prds",
  });
  assert.throws(
    () => parsePathsRequest({ schemaVersion: 2, kind: "plans" }),
    BridgeValidationError,
  );
  assert.throws(
    () => parsePathsRequest({ schemaVersion: 1, kind: "plans", extra: true }),
    BridgeValidationError,
  );
  assert.throws(
    () => parsePathsRequest({ schemaVersion: 1, kind: "factory_launcher" }),
    BridgeValidationError,
  );
});

test("ctx_workflow rejects unknown fields and correlates operation fields", () => {
  assert.throws(
    () => parseWorkflowRequest({ schemaVersion: 1, operation: "ship_publish", shipmentId: "x", approvalId: "y", title: "override" }),
    BridgeValidationError,
  );
  assert.throws(
    () => parseWorkflowRequest({ schemaVersion: 1, operation: "ship_prepare", cwd: "/repo", files: [], title: "x", body: "", message: "x", base: "main", draft: false }),
    BridgeValidationError,
  );
});

test("ctx_remote_approval cannot carry caller-selected payload fields", () => {
  assert.throws(
    () => parseApprovalRequest({ schemaVersion: 1, action: "request", shipmentId: "id", payloadHash: "forged" }),
    BridgeValidationError,
  );
});

test("repository relative paths are normalized, sorted, and reject traversal", () => {
  assert.deepEqual(canonicalizeRepoRelativePaths(["src/a.ts", "docs/readme.md"]), ["docs/readme.md", "src/a.ts"]);
  assert.throws(() => canonicalizeRepoRelativePaths(["src/../src/a.ts"]), BridgeValidationError);
  assert.throws(() => canonicalizeRepoRelativePaths(["../secret"]), BridgeValidationError);
  assert.throws(() => canonicalizeRepoRelativePaths(["src/a.ts", "src//a.ts"]), BridgeValidationError);
});
