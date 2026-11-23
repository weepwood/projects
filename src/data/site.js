/**
 * Server-side data access for pages. Astro components are pure: everything they
 * need arrives as props, and everything here is read-only file access.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from '../lib/fsx.js';
import { buildProjects, classifyReport } from '../lib/merge.js';
import { loadConfig } from '../lib/config.js';
import { summarizeProjects } from '../lib/health.js';
import { selectFeatured } from '../lib/listing.js';

export const site = readJson('content/site.json', {});
export const curated = readJson('content/projects.json', { taxonomy: { categories: [] }, featured: [] });
export const registry = readJson('content/registry.json', { projects: {} });

const coverExists = (relative) => fs.existsSync(path.join(ROOT, relative));

export function loadSiteData() {
  const enriched = readJson('.cache/enriched.json', []);
  const health = readJson('.cache/health.json', { checkedAt: null, projects: {} });
  const history = readJson('.cache/history.json', { daily: [], events: [] });

  const projects = buildProjects({
    enriched,
    health,
    curated,
    registry,
    config: loadConfig(),
    coverExists,
  });

  return {
    projects,
    featured: selectFeatured(projects),
    stats: summarizeProjects(projects),
    health,
    history,
    categories: curated.taxonomy.categories,
    categoryLabels: Object.fromEntries(
      curated.taxonomy.categories.map((category) => [category.id, category.label]),
    ),
    report: classifyReport(projects),
    builtAt: new Date().toISOString(),
  };
}

export function casePage(slug) {
  return readJson(`content/cases/${slug}.json`, null);
}
