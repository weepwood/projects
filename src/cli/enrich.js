#!/usr/bin/env node
import { loadConfig } from '../lib/config.js';
import { readJson, writeJson, requireJson } from '../lib/fsx.js';
import { mapConcurrent } from '../lib/concurrency.js';
import { createLogger } from '../lib/log.js';
import { isListed, findDuplicateHomepages } from '../lib/listing.js';
import { cleanReadmeSummary, inferCategory, inferTags } from '../lib/classify.js';
import { platformOf, hostOf, safeHttpUrl } from '../lib/url.js';

const log = createLogger('enrich');
const config = loadConfig();
const curated = readJson('content/projects.json', {
  taxonomy: { categories: [] },
  featured: [],
  overrides: {},
});
const portfolio = { ...curated.overrides };
for (const item of curated.featured) portfolio[item.fullName] = item;
const excluded = new Set(config.exclude);
const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || '';

async function github(pathname, accept = 'application/vnd.github+json') {
  const headers = {
    Accept: accept,
    'User-Agent': 'weepwood-projects-automation',
    'X-GitHub-Api-Version': '2022-11-28',
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  const response = await fetch(`https://api.github.com${pathname}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${pathname}`);
  return accept.includes('raw') ? response.text() : response.json();
}

function manifestPathFor(repo) {
  const language = String(repo.language ?? '').toLowerCase();
  if (['javascript', 'typescript', 'vue', 'html', 'css'].includes(language)) return 'package.json';
  if (language === 'rust') return 'Cargo.toml';
  if (language === 'go') return 'go.mod';
  if (language === 'java') return 'pom.xml';
  if (language === 'python') return 'pyproject.toml';
  return null;
}

async function enrichRepo(repo, previous) {
  const fingerprint = [
    repo.pushed_at,
    repo.default_branch,
    repo.homepage,
    repo.description,
    ...(repo.topics ?? []),
  ].join('|');
  if (previous?.fingerprint === fingerprint) return { ...previous, cached: true };

  const errors = [];
  let readme = '';
  let latestCommitSha = '';
  let manifestText = '';
  let packageJson = null;

  try {
    readme = (await github(`/repos/${repo.full_name}/readme`, 'application/vnd.github.raw+json')) ?? '';
  } catch (error) {
    errors.push(`readme: ${error.message}`);
  }
  try {
    const commit = await github(
      `/repos/${repo.full_name}/commits/${encodeURIComponent(repo.default_branch || 'main')}`,
    );
    latestCommitSha = commit?.sha ?? '';
  } catch (error) {
    errors.push(`commit: ${error.message}`);
  }
  try {
    const manifestPath = manifestPathFor(repo);
    if (manifestPath) {
      const value = await github(
        `/repos/${repo.full_name}/contents/${manifestPath}?ref=${encodeURIComponent(repo.default_branch || 'main')}`,
        'application/vnd.github.raw+json',
      );
      manifestText = String(value ?? '').slice(0, 30_000);
      if (manifestPath === 'package.json' && value) {
        try {
          packageJson = JSON.parse(value);
        } catch {
          errors.push('manifest: package.json is not valid JSON');
        }
      }
    }
  } catch (error) {
    errors.push(`manifest: ${error.message}`);
  }

  return {
    fingerprint,
    readme: String(readme).slice(0, 50_000),
    latestCommitSha,
    manifestText,
    packageJson,
    errors,
    enrichedAt: new Date().toISOString(),
  };
}

async function main() {
  const repos = requireJson(
    'repos_raw.json',
    'gh api --paginate "users/weepwood/repos?per_page=100&type=owner" | jq -s add > repos_raw.json',
  );
  const cache = readJson('.cache/enrichment.json', { version: 1, repos: {} });
  const candidates = repos.filter((repo) => isListed(repo, portfolio, excluded));

  log.info(`${repos.length} 个仓库，${candidates.length} 个入选`);

  const enriched = await mapConcurrent(candidates, config.enrichmentConcurrency, async (repo) => {
    try {
      return await enrichRepo(repo, cache.repos?.[repo.full_name]);
    } catch (error) {
      return {
        ...(cache.repos?.[repo.full_name] ?? {}),
        errors: [error.message],
        enrichedAt: new Date().toISOString(),
      };
    }
  });

  const nextCache = { version: 2, generatedAt: new Date().toISOString(), repos: {} };
  const taxonomy = curated.taxonomy;

  const projects = candidates.map((repo, index) => {
    const extra = enriched[index] ?? {};
    nextCache.repos[repo.full_name] = extra;

    const base = {
      name: String(repo.name ?? '未命名项目'),
      fullName: String(repo.full_name ?? repo.name),
      description: String(repo.description || cleanReadmeSummary(extra.readme) || '暂无描述'),
      homepage: safeHttpUrl(repo.homepage),
      repo: safeHttpUrl(repo.html_url),
      language: repo.language ?? null,
      stars: Math.max(0, Number(repo.stargazers_count) || 0),
      forks: Math.max(0, Number(repo.forks_count) || 0),
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      createdAt: repo.created_at ?? '',
      updatedAt: repo.updated_at ?? '',
      pushedAt: repo.pushed_at ?? '',
      defaultBranch: repo.default_branch ?? 'main',
      latestCommitSha: extra.latestCommitSha ?? '',
      archived: Boolean(repo.archived),
      fork: Boolean(repo.fork),
      license: repo.license?.spdx_id ?? null,
      platform: platformOf(repo.homepage),
      host: hostOf(repo.homepage),
      readme: extra.readme ?? '',
      manifestText: extra.manifestText ?? '',
      packageJson: extra.packageJson ?? null,
      enrichmentErrors: extra.errors ?? [],
      cached: Boolean(extra.cached),
    };

    const inferred = inferCategory(base, taxonomy);
    base.category = inferred.category;
    base.categoryConfidence = inferred.confidence;
    base.tags = inferTags(base);

    return base;
  });

  projects.sort(
    (a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt)) || a.name.localeCompare(b.name, 'zh-CN'),
  );

  const report = {
    generatedAt: new Date().toISOString(),
    projectCount: projects.length,
    monitoredCount: projects.filter((project) => !project.fork && project.homepage).length,
    forkCount: projects.filter((project) => project.fork).length,
    uncategorised: projects.filter((project) => project.category === taxonomy.defaultCategory).length,
    lowConfidence: projects
      .filter((project) => project.categoryConfidence < 0.65)
      .map((project) => ({
        fullName: project.fullName,
        category: project.category,
        confidence: project.categoryConfidence,
      })),
    duplicates: findDuplicateHomepages(projects),
    enrichmentErrors: projects
      .filter((project) => project.enrichmentErrors.length)
      .map((project) => ({ fullName: project.fullName, errors: project.enrichmentErrors })),
  };

  writeJson('.cache/enriched.json', projects);
  writeJson('.cache/enrichment.json', nextCache);
  writeJson('.cache/enrichment-report.json', report);

  const otherShare = Math.round((report.uncategorised / Math.max(1, projects.length)) * 100);
  log.info(`富化 ${projects.length} 个项目，未分类 ${otherShare}%，Fork ${report.forkCount} 个`);
  if (report.duplicates.length) log.warn(`${report.duplicates.length} 组重复 Homepage`);
}

main().catch((error) => {
  log.error(error.message);
  process.exitCode = 1;
});
