"use strict";

const fs = require("fs");
const path = require("path");
const {
  cleanReadmeSummary,
  computeScores,
  findDuplicateHomepages,
  hostOf,
  inferCategory,
  inferTags,
  inferType,
  platformOf,
  safeHttpUrl,
} = require("../lib/automation");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = readJson(path.join(ROOT, "automation.config.json"), {});
const RAW_PATH = path.join(ROOT, process.argv[2] || "repos_raw.json");
const OUTPUT_PATH = path.join(ROOT, "projects_enriched.json");
const CACHE_PATH = path.join(ROOT, "enrichment_cache.json");
const REPORT_PATH = path.join(ROOT, "automation_report.json");
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function github(pathname, accept = "application/vnd.github+json") {
  const headers = {
    Accept: accept,
    "User-Agent": "weepwood-projects-automation",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`;
  const response = await fetch(`https://api.github.com${pathname}`, { headers });
  if (response.status === 404) return null;
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${pathname}`);
  if (accept.includes("raw")) return response.text();
  return response.json();
}

function manifestPathFor(repo) {
  const language = String(repo.language || "").toLowerCase();
  if (["javascript", "typescript", "vue", "html", "css"].includes(language)) return "package.json";
  if (language === "rust") return "Cargo.toml";
  if (language === "go") return "go.mod";
  if (language === "java") return "pom.xml";
  if (language === "python") return "pyproject.toml";
  return null;
}

async function fetchManifest(repo) {
  const manifestPath = manifestPathFor(repo);
  if (!manifestPath) return { manifestText: "", packageJson: null };
  const encodedPath = manifestPath.split("/").map(encodeURIComponent).join("/");
  const value = await github(`/repos/${repo.full_name}/contents/${encodedPath}?ref=${encodeURIComponent(repo.default_branch || "main")}`, "application/vnd.github.raw+json");
  if (!value) return { manifestText: "", packageJson: null };
  let packageJson = null;
  if (manifestPath === "package.json") {
    try { packageJson = JSON.parse(value); } catch { packageJson = null; }
  }
  return { manifestText: String(value).slice(0, 30000), packageJson };
}

async function enrichRepo(repo, previous) {
  const fingerprint = [repo.pushed_at, repo.default_branch, repo.homepage, repo.description, ...(repo.topics || [])].join("|");
  if (previous && previous.fingerprint === fingerprint) return previous;

  let readme = "";
  let latestCommitSha = "";
  let manifestText = "";
  let packageJson = null;
  const errors = [];

  try {
    readme = (await github(`/repos/${repo.full_name}/readme`, "application/vnd.github.raw+json")) || "";
  } catch (error) {
    errors.push(`readme: ${error.message}`);
  }
  try {
    const commit = await github(`/repos/${repo.full_name}/commits/${encodeURIComponent(repo.default_branch || "main")}`);
    latestCommitSha = commit?.sha || "";
  } catch (error) {
    errors.push(`commit: ${error.message}`);
  }
  try {
    ({ manifestText, packageJson } = await fetchManifest(repo));
  } catch (error) {
    errors.push(`manifest: ${error.message}`);
  }

  return {
    fingerprint,
    readme: String(readme).slice(0, 50000),
    latestCommitSha,
    manifestText,
    packageJson,
    errors,
    enrichedAt: new Date().toISOString(),
  };
}

async function mapConcurrent(items, limit, worker) {
  const results = new Array(items.length);
  let cursor = 0;
  async function run() {
    while (cursor < items.length) {
      const index = cursor++;
      results[index] = await worker(items[index], index);
    }
  }
  await Promise.all(Array.from({ length: Math.max(1, Math.min(limit, items.length)) }, run));
  return results;
}

async function main() {
  const repos = readJson(RAW_PATH, []);
  const cache = readJson(CACHE_PATH, { version: 1, repos: {} });
  const excluded = new Set(CONFIG.exclude || []);
  const overrides = CONFIG.overrides || {};
  const candidates = repos.filter((repo) => {
    return !repo.private && !excluded.has(repo.full_name) && safeHttpUrl(repo.homepage) && safeHttpUrl(repo.html_url);
  });

  const enrichedCacheEntries = await mapConcurrent(
    candidates,
    Number(CONFIG.enrichmentConcurrency) || 5,
    async (repo) => {
      try {
        return await enrichRepo(repo, cache.repos?.[repo.full_name]);
      } catch (error) {
        return {
          ...(cache.repos?.[repo.full_name] || {}),
          errors: [error.message],
          enrichedAt: new Date().toISOString(),
        };
      }
    },
  );

  const nextCache = { version: 1, generatedAt: new Date().toISOString(), repos: {} };
  const projects = candidates.map((repo, index) => {
    const extra = enrichedCacheEntries[index] || {};
    nextCache.repos[repo.full_name] = extra;
    const base = {
      name: String(repo.name || "未命名项目"),
      fullName: String(repo.full_name || repo.name || "未命名项目"),
      description: String(repo.description || cleanReadmeSummary(extra.readme) || "暂无描述"),
      descriptionSource: repo.description ? "github" : extra.readme ? "readme" : "fallback",
      homepage: safeHttpUrl(repo.homepage),
      repo: safeHttpUrl(repo.html_url),
      language: repo.language || null,
      stars: Math.max(0, Number(repo.stargazers_count) || 0),
      forks: Math.max(0, Number(repo.forks_count) || 0),
      topics: Array.isArray(repo.topics) ? repo.topics : [],
      createdAt: repo.created_at || "",
      updatedAt: repo.updated_at || "",
      pushedAt: repo.pushed_at || "",
      defaultBranch: repo.default_branch || "main",
      latestCommitSha: extra.latestCommitSha || "",
      archived: Boolean(repo.archived),
      fork: Boolean(repo.fork),
      license: repo.license?.spdx_id || null,
      platform: platformOf(repo.homepage),
      host: hostOf(repo.homepage),
      readme: extra.readme || "",
      manifestText: extra.manifestText || "",
      packageJson: extra.packageJson || null,
      enrichmentErrors: extra.errors || [],
    };
    const category = inferCategory(base);
    base.category = category.category;
    base.categoryConfidence = category.confidence;
    base.type = inferType(base);
    base.tags = inferTags(base);
    Object.assign(base, computeScores(base));
    Object.assign(base, overrides[base.fullName] || {});
    base.cover = `covers/${base.name}.png`;
    delete base.readme;
    delete base.manifestText;
    delete base.packageJson;
    return base;
  });

  projects.sort((a, b) => b.recommendationScore - a.recommendationScore || String(b.pushedAt).localeCompare(String(a.pushedAt)));
  const duplicates = findDuplicateHomepages(projects);
  const report = {
    generatedAt: new Date().toISOString(),
    projectCount: projects.length,
    duplicateHomepages: duplicates,
    lowConfidenceProjects: projects
      .filter((project) => project.categoryConfidence < 0.65)
      .map((project) => ({ fullName: project.fullName, category: project.category, confidence: project.categoryConfidence })),
    enrichmentErrors: projects
      .filter((project) => project.enrichmentErrors.length)
      .map((project) => ({ fullName: project.fullName, errors: project.enrichmentErrors })),
  };

  writeJson(OUTPUT_PATH, projects);
  writeJson(CACHE_PATH, nextCache);
  writeJson(REPORT_PATH, report);
  console.log(`Enriched ${projects.length} projects; ${duplicates.length} duplicate homepage group(s).`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
