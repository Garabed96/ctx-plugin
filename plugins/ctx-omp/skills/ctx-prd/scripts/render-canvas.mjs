#!/usr/bin/env node

import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const args = process.argv.slice(2);
const value = (flag) => {
  const index = args.indexOf(flag);
  return index >= 0 ? args[index + 1] : undefined;
};

const inputPath = value("--input");
const outputPath = value("--output");
const markdownPath = value("--markdown");

if (!inputPath || !outputPath) {
  console.error(
    "Usage: render-canvas.mjs --input <bundle.json> [--markdown <topic.md>] --output <topic.canvas>",
  );
  process.exit(2);
}

const id = (key) => createHash("sha256").update(key).digest("hex").slice(0, 16);
const required = (value, label) => {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
};

const bundle = JSON.parse(await readFile(resolve(inputPath), "utf8"));
const title = required(bundle.title, "title");
const outcome = required(bundle.outcome, "outcome");
const prdFile = required(bundle.prdFile, "prdFile");
const bundleFile = required(bundle.bundleFile, "bundleFile");
const canvasFile = required(bundle.canvasFile, "canvasFile");
const revision = required(bundle.revision, "revision");
const syncState = required(bundle.syncState, "syncState");
const bundleStatus = required(bundle.status, "status");
const bundleStatuses = new Set([
  "DRAFT",
  "READY",
  "APPROVED",
  "EXECUTING",
  "DEMO_READY",
  "BLOCKED",
]);
if (!bundleStatuses.has(bundleStatus)) throw new Error(`Unsupported bundle status: ${bundleStatus}`);
if (!new Set(["SYNC_PENDING", "SYNCED", "UNSYNCED"]).has(syncState)) {
  throw new Error(`Unsupported syncState: ${syncState}`);
}

if (!Array.isArray(bundle.gates) || bundle.gates.length < 3 || bundle.gates.length > 5) {
  throw new Error("gates must contain 3 to 5 entries");
}
if (!Array.isArray(bundle.guardrails) || bundle.guardrails.length < 1 || bundle.guardrails.length > 5) {
  throw new Error("guardrails must contain 1 to 5 entries");
}

const isPlaceholder = (value) =>
  typeof value !== "string" ||
  value.trim() === "" ||
  /^(pending\b|tbd\b|todo\b|unknown\b|n\/?a\b|not applicable\b)/i.test(value.trim());

const review = Array.isArray(bundle.review) ? bundle.review : [];
const reviewIds = review.map((item) => item?.id);
for (const requiredId of ["R1", "R2", "R3", "R4", "R5"]) {
  if (!reviewIds.includes(requiredId)) {
    throw new Error(`review must include the checklist questions R1-R5; missing ${requiredId}`);
  }
}
if (new Set(reviewIds).size !== reviewIds.length) {
  throw new Error("review question IDs must be unique");
}
for (const [index, item] of review.entries()) {
  required(item?.question, `review[${index}].question`);
}

const approval = bundle.approval ?? {};
const visual = bundle.visualDirection ?? {};
if (typeof bundle.uiApplicable !== "boolean") {
  throw new Error("uiApplicable must be true or false");
}
if (bundleStatus === "BLOCKED" && isPlaceholder(bundle.blockedReason)) {
  throw new Error("BLOCKED requires blockedReason naming the blocking decision or system");
}

const allowedStatuses = new Set([
  "NOT_STARTED",
  "BUILDING",
  "VERIFYING",
  "PASS",
  "FAIL",
  "BLOCKED",
  "WAITING_FOR_MANUAL_CONFIRMATION",
]);
const statusColors = {
  NOT_STARTED: "3",
  BUILDING: "5",
  VERIFYING: "2",
  PASS: "4",
  FAIL: "1",
  BLOCKED: "6",
  WAITING_FOR_MANUAL_CONFIRMATION: "6",
};

const gates = bundle.gates.map((gate, index) => {
  const gateId = required(gate.id, `gates[${index}].id`);
  if (gateId !== `G${index + 1}`) {
    throw new Error(`gates[${index}].id must be G${index + 1}`);
  }
  const status = required(gate.status ?? "NOT_STARTED", `gates[${index}].status`);
  if (!allowedStatuses.has(status)) throw new Error(`Unsupported status: ${status}`);
  const evidence =
    typeof gate.evidence === "string" && gate.evidence.trim() ? gate.evidence.trim() : "pending";
  if (status !== "NOT_STARTED" && isPlaceholder(evidence)) {
    throw new Error(`${gateId}.evidence must identify evidence for status ${status}`);
  }
  const acceptedException =
    typeof gate.acceptedException === "string" && !isPlaceholder(gate.acceptedException)
      ? gate.acceptedException.trim()
      : null;
  if (acceptedException && !["FAIL", "BLOCKED", "WAITING_FOR_MANUAL_CONFIRMATION"].includes(status)) {
    throw new Error(`${gateId}.acceptedException applies only to FAIL, BLOCKED, or WAITING gates`);
  }
  return {
    id: gateId,
    title: required(gate.title, `${gateId}.title`),
    startState: required(gate.startState, `${gateId}.startState`),
    happyPath: required(gate.happyPath, `${gateId}.happyPath`),
    observableResult: required(gate.observableResult, `${gateId}.observableResult`),
    proof: required(gate.proof, `${gateId}.proof`),
    verifier: required(gate.verifier, `${gateId}.verifier`),
    timebox: required(gate.timebox, `${gateId}.timebox`),
    status,
    edgeCases: Array.isArray(gate.edgeCases) ? gate.edgeCases.filter(Boolean) : [],
    evidence,
    acceptedException,
  };
});

const settled = (gate) => gate.status === "PASS" || gate.acceptedException !== null;

const planningStatuses = new Set(["DRAFT", "READY", "APPROVED"]);
if (planningStatuses.has(bundleStatus) && gates.some((gate) => gate.status !== "NOT_STARTED")) {
  throw new Error(`${bundleStatus} bundles may contain only NOT_STARTED gates`);
}
if (["APPROVED", "EXECUTING", "DEMO_READY"].includes(bundleStatus)) {
  if (isPlaceholder(approval.by) || isPlaceholder(approval.evidence)) {
    throw new Error(`${bundleStatus} requires approval.by and approval.evidence`);
  }
}
if (bundleStatus === "EXECUTING") {
  let encounteredCurrentGate = false;
  for (const gate of gates) {
    if (!encounteredCurrentGate && settled(gate)) continue;
    if (!encounteredCurrentGate) {
      encounteredCurrentGate = true;
      continue;
    }
    if (gate.status !== "NOT_STARTED") {
      throw new Error(
        "EXECUTING gates must be sequential: later gates remain NOT_STARTED until earlier gates pass or carry a user-accepted exception",
      );
    }
  }
}
if (bundleStatus === "DEMO_READY" && !gates.every(settled)) {
  throw new Error("DEMO_READY requires every gate to be PASS or carry a user-accepted exception");
}

const reviewEnforced = ["READY", "APPROVED", "EXECUTING", "DEMO_READY"].includes(bundleStatus);
if (reviewEnforced) {
  for (const [index, item] of review.entries()) {
    for (const field of ["question", "finding", "evidence", "resolution", "residualRisk"]) {
      if (isPlaceholder(item?.[field])) {
        throw new Error(`review[${index}].${field} must be resolved before ${bundleStatus}`);
      }
    }
  }
  if (bundle.uiApplicable) {
    const waived = !isPlaceholder(visual.waiver);
    if (!waived) {
      for (const field of [
        "selectedTarget",
        "selectionEvidence",
        "designDecision",
        "hardeningFindings",
        "hardeningEvidence",
      ]) {
        if (isPlaceholder(visual[field])) {
          throw new Error(
            `visualDirection.${field} is required before ${bundleStatus} (or record visualDirection.waiver for existing-design-system changes)`,
          );
        }
      }
      if (!Array.isArray(visual.iterations) || visual.iterations.length === 0) {
        throw new Error(`visualDirection.iterations is required before ${bundleStatus}`);
      }
      visual.iterations.forEach((item, index) => {
        if (isPlaceholder(item)) {
          throw new Error(`visualDirection.iterations[${index}] must be an evidence locator`);
        }
      });
    }
  }
}

const nodes = [];
const edges = [];
const laneWidth = 500;
const gateStartX = 0;

nodes.push({
  id: id(`${title}:prd`),
  type: "file",
  x: -1040,
  y: -40,
  width: 420,
  height: 260,
  file: prdFile,
});
nodes.push({
  id: id(`${title}:bundle`),
  type: "file",
  x: -1040,
  y: 650,
  width: 420,
  height: 220,
  file: bundleFile,
});
const statusLine =
  bundleStatus === "BLOCKED"
    ? `**Bundle** BLOCKED — ${bundle.blockedReason.trim()}`
    : `**Bundle** ${bundleStatus}`;
nodes.push({
  id: id(`${title}:outcome`),
  type: "text",
  x: -520,
  y: -40,
  width: 420,
  height: 260,
  color: "5",
  text: `# ${title}\n\n## Outcome\n\n${outcome}\n\n${statusLine}\n**Revision** ${revision}\n**Sync** ${syncState}`,
});

gates.forEach((gate, index) => {
  const x = gateStartX + index * laneWidth;
  const groupId = id(`${title}:${gate.id}:group`);
  const gateNodeId = id(`${title}:${gate.id}:gate`);
  const edgeNodeId = id(`${title}:${gate.id}:edge-cases`);
  const exceptionLine = gate.acceptedException
    ? `\n**Accepted exception** ${gate.acceptedException}`
    : "";
  nodes.push({
    id: groupId,
    type: "group",
    x: x - 20,
    y: -80,
    width: 440,
    height: 680,
    label: `${gate.id} — ${gate.title}`,
    color: statusColors[gate.status],
  });
  nodes.push({
    id: gateNodeId,
    type: "text",
    x,
    y: -20,
    width: 400,
    height: 350,
    color: statusColors[gate.status],
    text: `# ${gate.id} — ${gate.title}\n\n**Start** ${gate.startState}\n\n**Happy path**\n${gate.happyPath}\n\n**Observable result**\n${gate.observableResult}\n\n**Proof**\n${gate.proof}\n\n**Verifier** ${gate.verifier}\n**Timebox** ${gate.timebox}\n**Status** ${gate.status}\n**Evidence** ${gate.evidence}${exceptionLine}`,
  });
  nodes.push({
    id: edgeNodeId,
    type: "text",
    x,
    y: 360,
    width: 400,
    height: 200,
    text: `## Edge cases / recovery\n\n${gate.edgeCases.length ? gate.edgeCases.map((item) => `- ${item}`).join("\n") : "- None retained"}`,
  });

  const previousNodeId = index === 0 ? id(`${title}:outcome`) : id(`${title}:G${index}:gate`);
  edges.push({
    id: id(`${title}:edge:${index}`),
    fromNode: previousNodeId,
    fromSide: "right",
    toNode: gateNodeId,
    toSide: "left",
    toEnd: "arrow",
    label: index === 0 ? "starts" : "then",
  });
});

const guardrailWidth = Math.max(
  940,
  gates.length * laneWidth - 80,
  bundle.guardrails.length * 360,
);
nodes.push({
  id: id(`${title}:guardrails:group`),
  type: "group",
  x: -20,
  y: 700,
  width: guardrailWidth,
  height: 320,
  label: "Guardrails",
  color: "6",
});

bundle.guardrails.forEach((guardrail, index) => {
  const item = required(guardrail, `guardrails[${index}]`);
  nodes.push({
    id: id(`${title}:guardrail:${index}`),
    type: "text",
    x: 20 + index * 360,
    y: 760,
    width: 320,
    height: 180,
    color: "6",
    text: `# Guardrail ${index + 1}\n\n${item}`,
  });
});

if (Array.isArray(bundle.references) && bundle.references.filter(Boolean).length) {
  nodes.push({
    id: id(`${title}:references`),
    type: "text",
    x: -1040,
    y: 300,
    width: 420,
    height: 300,
    text: `# References\n\n${bundle.references.filter(Boolean).map((item) => `- ${item}`).join("\n")}`,
  });
}

const allIds = [...nodes, ...edges].map((item) => item.id);
if (new Set(allIds).size !== allIds.length) throw new Error("Generated duplicate Canvas IDs");
const nodeIds = new Set(nodes.map((node) => node.id));
for (const edge of edges) {
  if (!nodeIds.has(edge.fromNode) || !nodeIds.has(edge.toNode)) {
    throw new Error(`Dangling edge: ${edge.id}`);
  }
}

await mkdir(dirname(resolve(outputPath)), { recursive: true });
await writeFile(resolve(outputPath), `${JSON.stringify({ nodes, edges }, null, 2)}\n`, "utf8");
console.log(`Wrote ${nodes.length} nodes and ${edges.length} edges to ${resolve(outputPath)}`);

if (markdownPath) {
  const list = (items, empty = "- None") =>
    Array.isArray(items) && items.length ? items.map((item) => `- ${item}`).join("\n") : empty;
  const cell = (input, label) => required(input, label).replaceAll("|", "\\|").replaceAll("\n", " ");

  const gateSections = gates
    .map(
      (gate) => `### ${gate.id} — ${gate.title}

- Start state: ${gate.startState}
- Happy-path action: ${gate.happyPath}
- Observable result: ${gate.observableResult}
- Proof: ${gate.proof}
- Verifier: ${gate.verifier}
- Edge cases / recovery:\n${list(gate.edgeCases).split("\n").map((line) => `  ${line}`).join("\n")}
- Timebox: ${gate.timebox}
- Status: \`${gate.status}\`
- Evidence: ${gate.evidence}${gate.acceptedException ? `\n- Accepted exception: ${gate.acceptedException}` : ""}`,
    )
    .join("\n\n");

  const proofRows = gates
    .map((gate) => `| ${gate.id} | ${gate.status} | ${gate.verifier} | ${gate.evidence} |`)
    .join("\n");
  const reviewRows = review
    .map(
      (item) =>
        `| ${item.id} | ${cell(item.question, "review.question")} | ${cell(item.finding ?? "pending", "review.finding")} | ${cell(item.evidence ?? "pending", "review.evidence")} | ${cell(item.resolution ?? "pending", "review.resolution")} | ${cell(item.residualRisk ?? "pending", "review.residualRisk")} |`,
    )
    .join("\n");

  const waived = bundle.uiApplicable && !isPlaceholder(visual.waiver);
  const visualLines = !bundle.uiApplicable
    ? "- UI applicable: false"
    : waived
      ? `- UI applicable: true
- Waiver: ${visual.waiver.trim()}`
      : `- UI applicable: true
- Selected target: ${visual.selectedTarget ?? "pending"}
- Selection evidence: ${visual.selectionEvidence ?? "pending"}
- Design decision: ${visual.designDecision ?? "pending"}
- Iterations: ${Array.isArray(visual.iterations) && visual.iterations.length ? visual.iterations.join(", ") : "pending"}
- Hardening findings: ${visual.hardeningFindings ?? "pending"}
- Hardening evidence: ${visual.hardeningEvidence ?? "pending"}`;

  const markdown = `---
status: ${bundleStatus}
sync_state: ${syncState}
revision: ${JSON.stringify(revision)}
type: demo-prd
canvas: ${JSON.stringify(canvasFile)}
bundle: ${JSON.stringify(bundleFile)}
created: ${JSON.stringify(required(bundle.created, "created"))}
timebox: ${JSON.stringify(required(bundle.timebox, "timebox"))}
blocked_reason: ${bundleStatus === "BLOCKED" ? JSON.stringify(bundle.blockedReason.trim()) : "null"}
approved_by: ${approval.by ? JSON.stringify(approval.by) : "null"}
approval_evidence: ${approval.evidence ? JSON.stringify(approval.evidence) : "null"}
---

# ${title}

## Why

${required(bundle.why, "why")}

## Demo story

${required(bundle.demoStory, "demoStory")}

## Outcome

${outcome}

## Visual direction

${visualLines}

## Demo gates

${gateSections}

## Guardrails

${bundle.guardrails.map((item, index) => `${index + 1}. ${item}`).join("\n")}

## Non-goals

${list(bundle.nonGoals)}

## Decisions and assumptions

${list(bundle.decisions)}

## Edge cases deferred

${list(bundle.deferredEdgeCases)}

## Proof summary

| Gate | Status | Verifier | Evidence |
|---|---|---|---|
${proofRows}

## Research and references

${list(bundle.references)}

## Review

| ID | Question | Finding | Evidence | Resolution | Accepted residual risk |
|---|---|---|---|---|---|
${reviewRows}

## Approval

- Approved by: ${approval.by ?? "pending"}
- Evidence: ${approval.evidence ?? "pending"}
`;

  await mkdir(dirname(resolve(markdownPath)), { recursive: true });
  await writeFile(resolve(markdownPath), markdown, "utf8");
  console.log(`Wrote Markdown PRD to ${resolve(markdownPath)}`);
}
