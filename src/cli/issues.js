#!/usr/bin/env node
import { loadConfig } from '../lib/config.js';
import { readJson, requireJson } from '../lib/fsx.js';
import { createLogger } from '../lib/log.js';
import { shouldMonitorProject } from '../lib/listing.js';

const log = createLogger('issues');
const config = loadConfig();
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';
const OWNER = config.owner;
const REPO = 'projects';

async function api(pathname, options = {}) {
  if (!token) return null;
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'User-Agent': 'weepwood-projects-status-issues',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.headers ?? {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${pathname}`);
  return response.status === 204 ? null : response.json();
}

/**
 * Open issues keyed by title. One list request replaces one search request per
 * project: the Search API allows 30 requests/minute per user, so a 49-project
 * loop guaranteed a 403 on every scheduled run.
 */
async function listOpenIssues() {
  const open = new Map();
  for (let page = 1; page <= 5; page += 1) {
    const batch = await api(`/repos/${OWNER}/${REPO}/issues?state=open&per_page=100&page=${page}`);
    if (!Array.isArray(batch) || batch.length === 0) break;
    for (const issue of batch) {
      // The issues endpoint also returns pull requests.
      if (issue.pull_request) continue;
      open.set(issue.title, issue);
    }
    if (batch.length < 100) break;
  }
  return open;
}

async function main() {
  if (!token) {
    log.warn('未设置 GH_TOKEN，跳过 Issue 同步');
    return;
  }

  const projects = requireJson('.cache/enriched.json', 'npm run enrich');
  const health = readJson('.cache/health.json', { projects: {} });
  const openIssues = await listOpenIssues();
  let opened = 0;
  let closed = 0;

  for (const project of projects) {
    if (!shouldMonitorProject(project)) continue;
    const item = health.projects?.[project.fullName];
    if (!item) continue;

    const title = `[Site Offline] ${project.fullName}`;
    const existing = openIssues.get(title) ?? null;

    if (item.status === 'offline' && !existing) {
      await api(`/repos/${OWNER}/${REPO}/issues`, {
        method: 'POST',
        body: JSON.stringify({
          title,
          body: [
            '自动在线状态检测连续失败三次。',
            '',
            `- 项目：${project.fullName}`,
            `- URL：${project.homepage}`,
            `- 最后检查：${item.checkedAt}`,
            `- 错误：${item.error ?? 'unknown'}`,
            `- 连续失败：${item.consecutiveFailures}`,
            '',
            '站点恢复后，该 Issue 会自动关闭。',
          ].join('\n'),
        }),
      });
      opened += 1;
      openIssues.set(title, { title });
      log.info(`新建 Issue：${project.fullName}`);
    } else if (existing && ['online', 'recovered'].includes(item.status)) {
      await api(`/repos/${OWNER}/${REPO}/issues/${existing.number}`, {
        method: 'PATCH',
        body: JSON.stringify({ state: 'closed', state_reason: 'completed' }),
      });
      closed += 1;
      openIssues.delete(title);
      log.info(`关闭 Issue：${project.fullName}`);
    }
  }

  log.info(`Issue 同步完成：新建 ${opened}，关闭 ${closed}`);
}

main().catch((error) => {
  log.error(error.message);
  process.exitCode = 1;
});
