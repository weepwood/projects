"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const {
  decideScreenshot,
  findDuplicateHomepages,
  inferCategory,
  platformOf,
} = require("../lib/automation");

test("screenshot is skipped forever when no new commit exists", () => {
  const decision = decideScreenshot(
    { latestCommitSha: "abc", pushedAt: "2026-07-01T00:00:00Z" },
    { lastScreenshotAt: "2026-06-01T00:00:00Z", lastScreenshotCommit: "abc" },
    { now: "2026-07-18T00:00:00Z", minDays: 10, coverExists: true },
  );
  assert.equal(decision.capture, false);
  assert.equal(decision.reason, "no-new-commit");
});

test("new commit waits until screenshot is at least ten days old", () => {
  const decision = decideScreenshot(
    { latestCommitSha: "new" },
    { lastScreenshotAt: "2026-07-12T00:00:00Z", lastScreenshotCommit: "old" },
    { now: "2026-07-18T00:00:00Z", minDays: 10, coverExists: true },
  );
  assert.equal(decision.capture, false);
  assert.equal(decision.reason, "changed-but-in-cooldown");
});

test("new commit is captured after the ten day cooldown", () => {
  const decision = decideScreenshot(
    { latestCommitSha: "new" },
    { lastScreenshotAt: "2026-07-01T00:00:00Z", lastScreenshotCommit: "old" },
    { now: "2026-07-18T00:00:00Z", minDays: 10, coverExists: true },
  );
  assert.equal(decision.capture, true);
  assert.equal(decision.reason, "new-commit-and-cooldown-complete");
});

test("missing covers are captured immediately", () => {
  const decision = decideScreenshot(
    { latestCommitSha: "abc" },
    {},
    { now: "2026-07-18T00:00:00Z", minDays: 10, coverExists: false },
  );
  assert.equal(decision.capture, true);
  assert.equal(decision.reason, "missing-cover");
});

test("category and platform inference use deterministic rules", () => {
  assert.equal(inferCategory({ name: "linear-algebra-viz", description: "interactive math visualization" }).category, "学习与知识可视化");
  assert.equal(platformOf("https://demo.pages.dev"), "Cloudflare Pages");
});

test("duplicate homepages are reported", () => {
  const duplicates = findDuplicateHomepages([
    { fullName: "a/a", homepage: "https://example.com/" },
    { fullName: "a/b", homepage: "https://example.com" },
  ]);
  assert.equal(duplicates.length, 1);
  assert.deepEqual(duplicates[0].projects, ["a/a", "a/b"]);
});
