import assert from "node:assert/strict";
import test from "node:test";

import { blockedShippingCommand, isSkillRead, needsTestCoverageNudge } from "../hooks/policy.ts";

for (const command of [
  "gh pr create --title x",
  "TOKEN=x gh pr create",
  "command gh api /repos/acme/repo/pulls --method POST",
  "env TOKEN=x gh api https://api.github.com/repos/acme/repo/pulls",
  "curl https://api.github.com/repos/acme/repo/pulls -d '{}'",
]) {
  test(`blocks supported direct shipping form: ${command}`, () => {
    assert.ok(blockedShippingCommand(command));
  });
}

for (const command of [
  "bash -c 'gh pr create --title x'",
  "./release.sh",
  "hub pr create",
  "curl https://api.github.com/repos/acme/repo/issues",
  "gh api /repos/acme/repo/pulls/12",
]) {
  test(`does not claim coverage outside the direct-command boundary: ${command}`, () => {
    assert.equal(blockedShippingCommand(command), undefined);
  });
}

test("logs only successful ctx skill reads", () => {
  assert.equal(isSkillRead("skill://ctx-ship"), true);
  assert.equal(isSkillRead("skill://other"), false);
});

test("test nudge requires unit evidence without higher-level evidence", () => {
  assert.equal(needsTestCoverageNudge("42 tests passed\nunit tests complete"), true);
  assert.equal(needsTestCoverageNudge("42 tests passed\nintegration tests passed"), false);
});
