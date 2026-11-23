import { daysBetween, hoursBetween } from './concurrency.js';
import { shouldMonitorProject } from './listing.js';

export function currentCommitFingerprint(project) {
  return project.latestCommitSha || project.pushedAt || project.updatedAt || '';
}

/**
 * Screenshot policy, unchanged from the previous implementation because the
 * rules encoded here are the ones that keep the repo small:
 *   - no new commit  → never re-capture
 *   - new commit     → at most once every `minDays`
 *   - failure        → retry after `retryHours`
 *   - fork / no site → never
 */
export function decideScreenshot(project, state = {}, options = {}) {
  if (!shouldMonitorProject(project)) {
    return { capture: false, reason: project?.fork ? 'fork-not-monitored' : 'no-homepage' };
  }

  const now = options.now instanceof Date ? options.now : new Date(options.now ?? Date.now());
  const minDays = Number.isFinite(options.minDays) ? options.minDays : 10;
  const retryHours = Number.isFinite(options.retryHours) ? options.retryHours : 24;
  const coverExists = Boolean(options.coverExists);

  if (state.lastError && hoursBetween(state.lastAttemptAt, now) < retryHours) {
    return { capture: false, reason: 'failure-retry-cooldown' };
  }
  if (!coverExists || !state.lastScreenshotAt) {
    return { capture: true, reason: coverExists ? 'never-captured' : 'missing-cover' };
  }

  const current = currentCommitFingerprint(project);
  const captured = state.lastScreenshotCommit || state.lastScreenshotPushedAt || '';
  if (!current || current === captured) return { capture: false, reason: 'no-new-commit' };

  const age = daysBetween(state.lastScreenshotAt, now);
  if (age < minDays) {
    return {
      capture: false,
      reason: 'changed-but-in-cooldown',
      eligibleAt: new Date(Date.parse(state.lastScreenshotAt) + minDays * 86_400_000).toISOString(),
    };
  }
  return { capture: true, reason: 'new-commit-and-cooldown-complete' };
}
