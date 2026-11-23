import test from 'node:test';
import assert from 'node:assert/strict';
import { decideScreenshot, currentCommitFingerprint } from '../src/lib/screenshot.js';

const site = { latestCommitSha: 'abc', homepage: 'https://a.test' };

test('no new commit is never re-captured', () => {
  const decision = decideScreenshot(
    site,
    { lastScreenshotAt: '2026-06-01T00:00:00Z', lastScreenshotCommit: 'abc' },
    { now: '2026-07-18T00:00:00Z', minDays: 10, coverExists: true },
  );
  assert.equal(decision.reason, 'no-new-commit');
});

test('a new commit waits out the cooldown, then captures', () => {
  const inCooldown = decideScreenshot(
    { ...site, latestCommitSha: 'new' },
    { lastScreenshotAt: '2026-07-12T00:00:00Z', lastScreenshotCommit: 'old' },
    { now: '2026-07-18T00:00:00Z', minDays: 10, coverExists: true },
  );
  assert.equal(inCooldown.reason, 'changed-but-in-cooldown');
  assert.ok(inCooldown.eligibleAt);

  const due = decideScreenshot(
    { ...site, latestCommitSha: 'new' },
    { lastScreenshotAt: '2026-07-01T00:00:00Z', lastScreenshotCommit: 'old' },
    { now: '2026-07-18T00:00:00Z', minDays: 10, coverExists: true },
  );
  assert.equal(due.capture, true);
});

test('a missing cover is captured immediately', () => {
  const decision = decideScreenshot(
    site,
    { lastScreenshotAt: '2026-07-01T00:00:00Z', lastScreenshotCommit: 'abc' },
    {
      now: '2026-07-18T00:00:00Z',
      coverExists: false,
    },
  );
  assert.equal(decision.capture, true);
  assert.equal(decision.reason, 'missing-cover');
});

test('a failure backs off for the retry window', () => {
  const decision = decideScreenshot(
    site,
    { lastError: 'timeout', lastAttemptAt: '2026-07-18T00:00:00Z' },
    {
      now: '2026-07-18T06:00:00Z',
      retryHours: 24,
      coverExists: true,
    },
  );
  assert.equal(decision.reason, 'failure-retry-cooldown');
});

test('forks and homepage-less tools are never captured', () => {
  assert.equal(decideScreenshot({ fork: true, homepage: 'https://x.test' }).reason, 'fork-not-monitored');
  assert.equal(decideScreenshot({ fork: false, homepage: null }).reason, 'no-homepage');
});

test('commit fingerprint prefers the sha, then the push time', () => {
  assert.equal(currentCommitFingerprint({ latestCommitSha: 'sha', pushedAt: 'p' }), 'sha');
  assert.equal(currentCommitFingerprint({ pushedAt: 'p' }), 'p');
  assert.equal(currentCommitFingerprint({}), '');
});
