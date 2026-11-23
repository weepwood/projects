/**
 * Health model. Three consecutive failures before a site is called offline keeps
 * a single slow response from paging anyone; a success after a failure streak is
 * reported as `recovered` so history shows the transition.
 */

export const HEALTH_LABELS = {
  online: '在线',
  recovered: '已恢复',
  unstable: '波动',
  degraded: '异常',
  offline: '离线',
  unknown: '未知',
  not_monitored: '不监控',
};

export const HEALTH_ORDER = [
  'online',
  'recovered',
  'unstable',
  'degraded',
  'offline',
  'unknown',
  'not_monitored',
];

const STATUS_CODE_PATTERN = /^HTTP (\d{3})$/;

export function nextHealthStatus(previous = {}, outcome) {
  if (outcome.ok) {
    const status = Number(previous.consecutiveFailures) > 0 ? 'recovered' : 'online';
    return { status, consecutiveFailures: 0, error: null };
  }
  const failures = Number(previous.consecutiveFailures ?? 0) + 1;
  return {
    status: failures >= 3 ? 'offline' : failures === 2 ? 'degraded' : 'unstable',
    consecutiveFailures: failures,
    error: outcome.error,
  };
}

export function statusCodeFromError(error) {
  const match = STATUS_CODE_PATTERN.exec(String(error ?? ''));
  return match ? Number(match[1]) : null;
}

export function summarizeHealth(projects = {}) {
  const summary = { monitored: 0, online: 0, warning: 0, offline: 0, unknown: 0, notMonitored: 0 };
  for (const item of Object.values(projects)) {
    if (item.status === 'not_monitored') {
      summary.notMonitored += 1;
      continue;
    }
    summary.monitored += 1;
    if (item.status === 'online' || item.status === 'recovered') summary.online += 1;
    else if (item.status === 'unstable' || item.status === 'degraded') summary.warning += 1;
    else if (item.status === 'offline') summary.offline += 1;
    else summary.unknown += 1;
  }
  return summary;
}

export function summarizeProjects(projects) {
  const summary = { total: 0, forks: 0, monitored: 0, online: 0, attention: 0, archived: 0 };
  for (const project of projects) {
    summary.total += 1;
    if (project.fork) summary.forks += 1;
    if (project.archived) summary.archived += 1;
    if (!shouldMonitorLabel(project)) continue;
    summary.monitored += 1;
    if (project.health?.status === 'online' || project.health?.status === 'recovered') summary.online += 1;
    if (['unstable', 'degraded', 'offline'].includes(project.health?.status)) summary.attention += 1;
  }
  return summary;
}

function shouldMonitorLabel(project) {
  return !project.fork && Boolean(project.homepage);
}

/**
 * History stays small on purpose: one row per day plus a row per *transition*.
 * Re-appending an unchanged status would grow without bound.
 */
export function updateHealthHistory(history, previousProjects, currentProjects, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const day = now.toISOString().slice(0, 10);
  const maxDays = Number(options.maxDays) || 180;
  const maxEvents = Number(options.maxEvents) || 1000;

  const next = {
    version: 1,
    updatedAt: now.toISOString(),
    daily: Array.isArray(history?.daily) ? [...history.daily] : [],
    events: Array.isArray(history?.events) ? [...history.events] : [],
  };

  next.daily = next.daily.filter((entry) => entry.date !== day);
  next.daily.push({ date: day, ...summarizeHealth(currentProjects) });
  next.daily.sort((a, b) => a.date.localeCompare(b.date));

  const cutoff = new Date(now.getTime() - Math.max(1, maxDays - 1) * 86_400_000).toISOString().slice(0, 10);
  next.daily = next.daily.filter((entry) => entry.date >= cutoff).slice(-maxDays);

  for (const [fullName, current] of Object.entries(currentProjects ?? {})) {
    const previous = previousProjects?.[fullName];
    if (!previous?.status || previous.status === current.status) continue;
    next.events.push({
      at: now.toISOString(),
      fullName,
      from: previous.status,
      to: current.status,
      statusCode: current.statusCode ?? null,
      latency: current.latency ?? null,
      error: current.error ?? null,
    });
  }
  next.events = next.events.slice(-maxEvents);

  return next;
}
