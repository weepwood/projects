/**
 * Server-side data access for pages. Astro components are pure: everything they
 * need arrives as props, and everything here is read-only file access.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ROOT, readJson } from '../lib/fsx.js';
import { buildProjects, classifyReport, curatedOnlyProjects } from '../lib/merge.js';
import { loadConfig } from '../lib/config.js';
import { summarizeProjects } from '../lib/health.js';
import { selectFeatured } from '../lib/listing.js';

export const site = readJson('content/site.json', {});
export const curated = readJson('content/projects.json', {
  taxonomy: { categories: [] },
  featured: [],
});
export const registry = readJson('content/registry.json', { projects: {} });

const coverExists = (relative) => fs.existsSync(path.join(ROOT, relative));

/**
 * True when the pipeline has run and `.cache/enriched.json` exists. Templates are
 * still built without it (CI runs `npm run build` before any enrichment), so
 * everything that lives in git — site copy, taxonomy, featured work, case
 * studies — must render from `content/` alone.
 */
export const hasPipelineData = fs.existsSync(path.join(ROOT, '.cache/enriched.json'));

let warned = false;

function warnMissingPipelineData(count) {
  if (count || warned) return;
  warned = true;
  // Not an error: a fresh clone and CI's pre-pipeline build both land here. It is
  // worth one line in the log so a broken pipeline step is not mistaken for a
  // successful deploy of a two-project site.
  console.warn('[site] .cache/enriched.json 缺失，只渲染 content/ 中的代表作；请先运行 npm run enrich');
}

export function loadSiteData() {
  const enriched = readJson('.cache/enriched.json', []);
  const health = readJson('.cache/health.json', { checkedAt: null, projects: {} });
  const history = readJson('.cache/history.json', { daily: [], events: [] });

  // Without pipeline output, fall back to the curated entries so the site (and
  // its case pages) render exactly as committed rather than failing the build.
  warnMissingPipelineData(enriched.length);
  const projects = enriched.length
    ? buildProjects({ enriched, health, curated, registry, config: loadConfig(), coverExists })
    : curatedOnlyProjects({ curated, registry, config: loadConfig() });

  return {
    projects,
    featured: selectFeatured(projects),
    stats: summarizeProjects(projects),
    health,
    history,
    hasPipelineData: enriched.length > 0,
    categories: curated.taxonomy.categories,
    categoryLabels: Object.fromEntries(
      curated.taxonomy.categories.map((category) => [category.id, category.label]),
    ),
    report: classifyReport(projects),
    builtAt: new Date().toISOString(),
  };
}
