#!/usr/bin/env node
import { loadConfig } from '../lib/config.js';
import { readJson, writeJson, requireJson } from '../lib/fsx.js';
import { mapConcurrent } from '../lib/concurrency.js';
import { createLogger } from '../lib/log.js';
import { shouldMonitorProject } from '../lib/listing.js';
import { nextHealthStatus, statusCodeFromError, updateHealthHistory } from '../lib/health.js';

const log = createLogger('health');
const config = loadConfig();

export async function check(project, previous = {}) {
  const checkedAt = new Date().toISOString();

  if (!shouldMonitorProject(project)) {
    return {
      status: 'not_monitored',
      statusCode: null,
      latency: null,
      finalUrl: null,
      consecutiveFailures: 0,
      checkedAt,
      error: null,
      reason: project.fork ? 'fork' : 'no-homepage',
    };
  }

  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), config.healthTimeoutMs);

  try {
    const response = await fetch(project.homepage, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'User-Agent': 'weepwood-projects-health-check/2.0' },
    });
    const latency = Date.now() - started;
    if (response.status >= 200 && response.status < 400) {
      const outcome = nextHealthStatus(previous, { ok: true });
      return {
        ...outcome,
        statusCode: response.status,
        latency,
        finalUrl: response.url,
        checkedAt,
        // A homepage that redirects elsewhere is not a failure, but it is worth
        // surfacing: a stale Pages URL usually lands on a 404 page with 200.
        redirected: response.url !== project.homepage,
        error: null,
      };
    }
    const outcome = nextHealthStatus(previous, { ok: false, error: `HTTP ${response.status}` });
    return { ...outcome, statusCode: response.status, latency, finalUrl: response.url, checkedAt };
  } catch (error) {
    const outcome = nextHealthStatus(previous, {
      ok: false,
      error: error.name === 'AbortError' ? 'timeout' : error.message,
    });
    return {
      ...outcome,
      statusCode: statusCodeFromError(outcome.error),
      latency: Date.now() - started,
      finalUrl: project.homepage,
      checkedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

async function main() {
  const projects = requireJson('.cache/enriched.json', 'npm run enrich');
  const previous = readJson('.cache/health.json', { version: 2, projects: {} });

  const checks = await mapConcurrent(projects, config.healthConcurrency, (project) =>
    check(project, previous.projects?.[project.fullName] ?? {}),
  );

  const next = { version: 2, checkedAt: new Date().toISOString(), projects: {} };
  projects.forEach((project, index) => {
    next.projects[project.fullName] = checks[index];
  });

  const history = updateHealthHistory(
    readJson('.cache/history.json', { version: 1, daily: [], events: [] }),
    previous.projects,
    next.projects,
    { now: next.checkedAt, maxDays: config.healthHistoryDays, maxEvents: config.healthHistoryMaxEvents },
  );

  writeJson('.cache/health.json', next);
  writeJson('.cache/history.json', history);

  const ok = checks.filter((item) => item.status === 'online' || item.status === 'recovered').length;
  const bad = checks.filter((item) => ['unstable', 'degraded', 'offline'].includes(item.status)).length;
  log.info(`${checks.length} 个项目：${ok} 正常，${bad} 需关注；Fork 未发起请求`);
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    log.error(error.message);
    process.exitCode = 1;
  });
}
