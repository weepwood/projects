import { inferCategory, inferTags } from './classify.js';
import { shouldMonitorProject } from './listing.js';
import { safeHttpUrl, platformOf, hostOf } from './url.js';

/**
 * Merge enriched GitHub facts + health cache + human intent into the single
 * view model that pages render. Ordering of precedence is the whole point:
 *
 *   human intent (projects.json) > explicit config override > inferred
 *
 * `hidden` removes a repository from the public catalog without pretending it
 * does not exist (MRR is private; the governance repo is this repo).
 */
export function buildProjects({ enriched, health, curated, registry, config, coverExists = () => false }) {
  const taxonomy = curated.taxonomy;
  const labels = new Map(taxonomy.categories.map((category) => [category.id, category.label]));
  const featuredByName = new Map(curated.featured.map((item) => [item.fullName, item]));
  const overrides = { ...(config.overrides ?? {}), ...(curated.overrides ?? {}) };
  const excluded = new Set(curated.exclude ?? []);

  const projects = [];

  for (const repo of enriched) {
    const override = overrides[repo.fullName] ?? {};
    if (override.hidden || excluded.has(repo.fullName)) continue;

    const inferred = inferCategory(repo, taxonomy);
    const featured = featuredByName.get(repo.fullName) ?? null;

    const category =
      featured?.category ??
      override.category ??
      (inferred.category === taxonomy.defaultCategory ? null : inferred.category);
    const categoryConfidence = featured?.category ? 0.99 : override.category ? 0.95 : inferred.confidence;

    const project = {
      name: repo.name,
      fullName: repo.fullName,
      description: featured?.description ?? override.description ?? repo.description ?? '暂无描述',
      repo: safeHttpUrl(repo.repo),
      homepage: safeHttpUrl(repo.homepage),
      language: repo.language ?? null,
      stars: Number(repo.stars) || 0,
      forks: Number(repo.forks) || 0,
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      tags: inferTags(repo).slice(0, 4),
      createdAt: repo.createdAt ?? '',
      updatedAt: repo.updatedAt ?? '',
      pushedAt: repo.pushedAt ?? '',
      latestCommitSha: repo.latestCommitSha ?? '',
      archived: Boolean(repo.archived),
      fork: Boolean(repo.fork),
      platform: platformOf(repo.homepage),
      host: hostOf(repo.homepage),
      category: category ?? taxonomy.defaultCategory,
      categoryLabel: labels.get(category ?? taxonomy.defaultCategory) ?? '其他项目',
      categoryConfidence,
      categorySource: featured?.category
        ? 'curated'
        : override.category
          ? 'override'
          : inferred.category === taxonomy.defaultCategory
            ? 'fallback'
            : 'inferred',
      featured: featured ? featuredView(featured, repo.name) : null,
      registry: registry.projects?.[repo.fullName] ?? null,
      monitorHomepage: shouldMonitorProject(repo),
      cover: `covers/${repo.name}.png`,
      coverAvailable: !repo.fork && coverExists(`public/covers/${repo.name}.png`),
      health: health.projects?.[repo.fullName] ?? {
        status: shouldMonitorProject(repo) ? 'unknown' : 'not_monitored',
        statusCode: null,
        latency: null,
        checkedAt: null,
        error: null,
      },
    };

    projects.push(project);
  }

  projects.sort(
    (a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt)) || a.name.localeCompare(b.name, 'zh-CN'),
  );

  return projects;
}

function featuredView(entry, name) {
  return {
    order: entry.order,
    title: entry.title ?? name,
    audience: entry.audience ?? '',
    approach: entry.approach ?? '',
    action: entry.action ?? '查看说明',
    poster: entry.poster ?? { kind: 'type', tone: 'paper', caption: name },
    caseStudy: entry.order,
  };
}

/**
 * The subset of the site that lives in git: featured work, copy and taxonomy.
 * Used when `.cache/enriched.json` is absent (a fresh clone, or CI before the
 * pipeline has run) so pages still render instead of failing the build.
 */
export function curatedOnlyProjects({ curated, registry, config = {} }) {
  const taxonomy = curated.taxonomy;
  const labels = new Map(taxonomy.categories.map((category) => [category.id, category.label]));
  const overrides = { ...(config.overrides ?? {}), ...(curated.overrides ?? {}) };

  return curated.featured
    .filter((entry) => !overrides[entry.fullName]?.hidden)
    .map((entry) => {
      const name = entry.fullName.split('/').pop();
      const category = entry.category ?? taxonomy.defaultCategory;
      return {
        name,
        fullName: entry.fullName,
        description: entry.description ?? '暂无描述',
        repo: safeHttpUrl(entry.repo ?? `https://github.com/${entry.fullName}`),
        homepage: safeHttpUrl(entry.homepage),
        language: null,
        stars: 0,
        forks: 0,
        topics: [],
        tags: [],
        createdAt: '',
        updatedAt: '',
        pushedAt: '',
        latestCommitSha: '',
        archived: false,
        fork: false,
        platform: platformOf(entry.homepage),
        host: hostOf(entry.homepage),
        category,
        categoryLabel: labels.get(category) ?? '其他项目',
        categoryConfidence: 0.99,
        categorySource: 'curated',
        featured: featuredView(entry, name),
        registry: registry.projects?.[entry.fullName] ?? null,
        monitorHomepage: Boolean(safeHttpUrl(entry.homepage)),
        cover: `covers/${name}.png`,
        coverAvailable: false,
        health: {
          status: safeHttpUrl(entry.homepage) ? 'unknown' : 'not_monitored',
          statusCode: null,
          latency: null,
          checkedAt: null,
          error: null,
        },
      };
    })
    .sort((a, b) => a.featured.order - b.featured.order);
}

/** Projects whose category fell back to "other", for the enrichment report. */
export function classifyReport(projects) {
  return projects
    .filter((project) => project.categorySource === 'fallback' || project.categoryConfidence < 0.65)
    .map((project) => ({
      fullName: project.fullName,
      category: project.category,
      confidence: project.categoryConfidence,
      source: project.categorySource,
    }));
}
