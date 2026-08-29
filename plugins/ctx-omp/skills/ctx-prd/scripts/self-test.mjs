#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const renderer = resolve(scriptDir, "render-canvas.mjs");
const example = resolve(scriptDir, "../assets/canvas-input.example.json");
const scratch = await mkdtemp(join(tmpdir(), "ctx-prd-self-test-"));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const clone = (value) => structuredClone(value);
const resolvedReview = (review) =>
  review.map((item, index) => ({
    ...item,
    finding: "No unresolved issue.",
    evidence: `review://finding-${index + 1}`,
    resolution: "Resolved by the coordinator.",
    residualRisk: "none",
  }));

const render = async (name, bundle, expectedError) => {
  const input = join(scratch, `${name}.json`);
  const markdown = join(scratch, `${name}.md`);
  const canvas = join(scratch, `${name}.canvas`);
  await writeFile(input, `${JSON.stringify(bundle, null, 2)}\n`, "utf8");
  const result = spawnSync(
    process.execPath,
    [renderer, "--input", input, "--markdown", markdown, "--output", canvas],
    { encoding: "utf8" },
  );
  const output = `${result.stdout}${result.stderr}`;
  if (expectedError) {
    assert(result.status !== 0, `${name} unexpectedly passed`);
    assert(output.includes(expectedError), `${name} failed for the wrong reason: ${output}`);
    return null;
  }
  assert(result.status === 0, `${name} failed: ${output}`);
  return { markdown, canvas };
};

try {
  const draft = JSON.parse(await readFile(example, "utf8"));
  const draftOutput = await render("draft", draft);
  const canvas = JSON.parse(await readFile(draftOutput.canvas, "utf8"));
  const markdown = await readFile(draftOutput.markdown, "utf8");
  const ids = [...canvas.nodes, ...canvas.edges].map((item) => item.id);
  const nodeIds = new Set(canvas.nodes.map((item) => item.id));
  assert(canvas.nodes.length === 20, "draft Canvas should contain 20 nodes");
  assert(canvas.edges.length === 4, "draft Canvas should contain 4 edges");
  assert(new Set(ids).size === ids.length, "Canvas IDs must be unique");
  assert(
    canvas.edges.every((edge) => nodeIds.has(edge.fromNode) && nodeIds.has(edge.toNode)),
    "Canvas must not contain dangling edges",
  );
  assert(markdown.match(/^### G\d —/gm)?.length === 4, "Markdown should contain four gates");
  assert(markdown.includes(`bundle: ${JSON.stringify(draft.bundleFile)}`), "bundle link missing");
  assert(
    canvas.nodes.some((node) => node.type === "file" && node.file === draft.bundleFile),
    "Canvas canonical bundle link missing",
  );

  const threeGates = clone(draft);
  threeGates.gates = threeGates.gates.slice(0, 3);
  await render("three-gates", threeGates);

  const twoGates = clone(draft);
  twoGates.gates = twoGates.gates.slice(0, 2);
  await render("two-gates", twoGates, "gates must contain 3 to 5 entries");

  const oneGuardrail = clone(draft);
  oneGuardrail.guardrails = oneGuardrail.guardrails.slice(0, 1);
  await render("one-guardrail", oneGuardrail);

  const noGuardrails = clone(draft);
  noGuardrails.guardrails = [];
  await render("no-guardrails", noGuardrails, "guardrails must contain 1 to 5 entries");

  const missingReviewId = clone(draft);
  missingReviewId.review = missingReviewId.review.filter((item) => item.id !== "R3");
  await render("missing-review-id", missingReviewId, "missing R3");

  const unsynced = clone(draft);
  unsynced.syncState = "UNSYNCED";
  await render("draft-unsynced", unsynced);

  const ready = clone(draft);
  ready.status = "READY";
  ready.syncState = "SYNCED";
  ready.review = resolvedReview(ready.review);
  ready.visualDirection = {
    waiver: null,
    selectedTarget: "Designs/conversational-protocol-selected.png",
    selectionEvidence: "message://user-selected-direction-2",
    designDecision: "Direction 2 selected for explicit review hierarchy.",
    iterations: ["design://iteration-001", "design://selected-001"],
    hardeningFindings: "Expose pending mutations and confirmation boundary.",
    hardeningEvidence: "hardening://shape-conversational-assistant",
  };
  await render("ready", ready);

  const readyWaived = clone(ready);
  readyWaived.visualDirection = {
    waiver:
      "Change stays within the approved design system; waiver accepted in message://user-waived-visual-lane",
  };
  await render("ready-waived", readyWaived);

  const noApproval = clone(ready);
  noApproval.status = "APPROVED";
  await render("approved-without-evidence", noApproval, "requires approval.by and approval.evidence");

  const incompleteUi = clone(ready);
  delete incompleteUi.visualDirection.hardeningEvidence;
  await render("ready-without-hardening", incompleteUi, "visualDirection.hardeningEvidence");

  const placeholderUi = clone(ready);
  placeholderUi.visualDirection.selectedTarget = "pending visual selection";
  await render("ready-with-placeholder-ui", placeholderUi, "visualDirection.selectedTarget");

  const blockedNoReason = clone(draft);
  blockedNoReason.status = "BLOCKED";
  await render("blocked-without-reason", blockedNoReason, "BLOCKED requires blockedReason");

  const blocked = clone(draft);
  blocked.status = "BLOCKED";
  blocked.blockedReason = "Anonymous-access decision Q1 is unresolved and changes gate G2.";
  await render("blocked-with-reason", blocked);

  const illegalEvidence = clone(ready);
  illegalEvidence.status = "EXECUTING";
  illegalEvidence.uiApplicable = false;
  illegalEvidence.approval = { by: "user", evidence: "message://approval" };
  illegalEvidence.gates[0].status = "BUILDING";
  await render("active-without-evidence", illegalEvidence, "G1.evidence");

  const placeholderEvidence = clone(illegalEvidence);
  placeholderEvidence.gates[0].evidence = "pending test output";
  await render("active-with-placeholder-evidence", placeholderEvidence, "G1.evidence");

  const illegalSequence = clone(illegalEvidence);
  illegalSequence.gates[0].status = "PASS";
  illegalSequence.gates[0].evidence = "test://g1-pass";
  illegalSequence.gates[2].status = "BUILDING";
  illegalSequence.gates[2].evidence = "brief://g3";
  await render("non-sequential-execution", illegalSequence, "gates must be sequential");

  const acceptedException = clone(illegalSequence);
  acceptedException.gates[1].status = "FAIL";
  acceptedException.gates[1].evidence = "test://g2-fail";
  acceptedException.gates[1].acceptedException = "message://user-accepted-g2-exception";
  await render("accepted-exception-sequence", acceptedException);

  const exceptionOnPass = clone(illegalEvidence);
  exceptionOnPass.gates[0].status = "PASS";
  exceptionOnPass.gates[0].evidence = "test://g1-pass";
  exceptionOnPass.gates[0].acceptedException = "message://not-applicable";
  await render("exception-on-pass", exceptionOnPass, "acceptedException applies only to");

  const prematureDemo = clone(ready);
  prematureDemo.status = "DEMO_READY";
  prematureDemo.approval = { by: "user", evidence: "message://approval" };
  await render("premature-demo", prematureDemo, "requires every gate to be PASS");

  const demoReady = clone(prematureDemo);
  demoReady.gates = demoReady.gates.map((gate) => ({
    ...gate,
    status: "PASS",
    evidence: `evidence://${gate.id.toLowerCase()}-pass`,
  }));
  await render("demo-ready", demoReady);

  const demoWithException = clone(demoReady);
  demoWithException.gates[3] = {
    ...demoWithException.gates[3],
    status: "WAITING_FOR_MANUAL_CONFIRMATION",
    evidence: "message://awaiting-device-check",
    acceptedException: "message://user-accepted-g4-exception",
  };
  await render("demo-ready-with-exception", demoWithException);

  console.log("ctx-prd self-test passed");
} finally {
  await rm(scratch, { recursive: true, force: true });
}
