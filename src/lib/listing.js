import { safeHttpUrl, hostKey } from './url.js';

/** A fork is never fetched, screenshotted or health-checked: it is not ours. */
export function shouldMonitorProject(project) {
  return !project?.fork && Boolean(safeHttpUrl(project?.homepage));
}

/**
 * Manual inclusion in content/projects.json adds repositories without a
 * homepage, but never overrides privacy or an explicit exclusion.
 */
export function isListed(repo, curated, excluded = new Set()) {
  if (repo?.private !== false) return false;
  if (excluded.has(repo.full_name)) return false;
  if (!safeHttpUrl(repo.html_url)) return false;
  return Boolean(safeHttpUrl(repo.homepage)) || Boolean(curated?.[repo.full_name]);
}

export function findDuplicateHomepages(projects) {
  const groups = new Map();
  for (const project of projects) {
    if (!shouldMonitorProject(project)) continue;
    const key = hostKey(project.homepage);
    if (!key) continue;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(project.fullName ?? project.name);
  }
  return [...groups.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([homepage, projects]) => ({ homepage, projects }));
}

/** Featured items are ordered, non-fork, and explicitly curated. */
export function selectFeatured(projects) {
  return projects
    .filter((project) => !project.fork && Number.isInteger(project.featured?.order))
    .sort((a, b) => a.featured.order - b.featured.order);
}
