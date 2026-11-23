import test from 'node:test';
import assert from 'node:assert/strict';
import {
  nextHealthStatus,
  statusCodeFromError,
  summarizeHealth,
  summarizeProjects,
  updateHealthHistory,
} from '../src/lib/health.js';

test('health state machine: unstable → degraded → offline, then recovered', () => {
  let state = {};
  state = nextHealthStatus(state, { ok: false, error: 'timeout' });
  assert.equal(state.status, 'unstable');
  state = nextHealthStatus(state, { ok: false, error: 'timeout' });
  assert.equal(state.status, 'degraded');
  state = nextHealthStatus(state, { ok: false, error: 'HTTP 500' });
  assert.equal(state.status, 'offline');
  assert.equal(state.consecutiveFailures, 3);

  state = nextHealthStatus(state, { ok: true });
  assert.equal(state.status, 'recovered');
  assert.equal(state.consecutiveFailures, 0);

  state = nextHealthStatus(state, { ok: true });
  assert.equal(state.status, 'online', 'a second success is plain online');
});

test('a single failure after a healthy period is only unstable', () => {
  const state = nextHealthStatus({ consecutiveFailures: 0 }, { ok: false, error: 'HTTP 502' });
  assert.equal(state.status, 'unstable');
  assert.equal(state.error, 'HTTP 502');
});

test('status codes are recovered from the error string', () => {
  assert.equal(statusCodeFromError('HTTP 503'), 503);
  assert.equal(statusCodeFromError('timeout'), null);
});

test('summary counts never double-count a project', () => {
  const summary = summarizeHealth({
    a: { status: 'online' },
    b: { status: 'recovered' },
    c: { status: 'degraded' },
    d: { status: 'offline' },
    e: { status: 'unknown' },
    f: { status: 'not_monitored' },
  });
  assert.deepEqual(summary, { monitored: 5, online: 2, warning: 1, offline: 1, unknown: 1, notMonitored: 1 });
});

test('project summary separates forks from monitored projects', () => {
  const summary = summarizeProjects([
    { fork: false, homepage: 'https://a.test', health: { status: 'online' } },
    { fork: true, homepage: 'https://b.test', health: { status: 'not_monitored' } },
    { fork: false, homepage: null, health: { status: 'not_monitored' } },
    { fork: false, homepage: 'https://c.test', health: { status: 'offline' } },
  ]);
  assert.equal(summary.total, 4);
  assert.equal(summary.forks, 1);
  assert.equal(summary.monitored, 2);
  assert.equal(summary.online, 1);
  assert.equal(summary.attention, 1);
});

test('history stores one row per day and only records real transitions', () => {
  const first = updateHealthHistory(
    { daily: [], events: [] },
    {},
    { 'a/a': { status: 'online' } },
    { now: '2026-07-18T00:00:00Z', maxDays: 180, maxEvents: 1000 },
  );
  assert.equal(first.daily.length, 1);
  assert.equal(first.events.length, 0, 'no previous status means no transition');

  const second = updateHealthHistory(
    first,
    { 'a/a': { status: 'online' } },
    { 'a/a': { status: 'offline', error: 'timeout' } },
    { now: '2026-07-18T06:00:00Z', maxDays: 180, maxEvents: 1000 },
  );
  assert.equal(second.daily.length, 1, 'same day replaces the row instead of appending');
  assert.equal(second.daily[0].offline, 1);
  assert.equal(second.events.length, 1);
  assert.equal(second.events[0].from, 'online');
  assert.equal(second.events[0].to, 'offline');

  const third = updateHealthHistory(
    second,
    { 'a/a': { status: 'offline' } },
    { 'a/a': { status: 'offline' } },
    { now: '2026-07-18T12:00:00Z', maxDays: 180, maxEvents: 1000 },
  );
  assert.equal(third.events.length, 1, 'an unchanged status is not an event');
});

test('history is trimmed to the retention window and event cap', () => {
  const old = {
    daily: [{ date: '2020-01-01' }],
    events: Array.from({ length: 5 }, (_, i) => ({ at: String(i) })),
  };
  const next = updateHealthHistory(old, {}, {}, { now: '2026-07-18T00:00:00Z', maxDays: 180, maxEvents: 3 });
  assert.equal(
    next.daily.some((entry) => entry.date === '2020-01-01'),
    false,
  );
  assert.equal(next.events.length, 3);
});
