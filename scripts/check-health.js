"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = readJson(path.join(ROOT, "automation.config.json"), {});
const PROJECTS_PATH = path.join(ROOT, "projects_enriched.json");
const HEALTH_PATH = path.join(ROOT, "health_data.json");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function check(project, previous = {}) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), Number(CONFIG.healthTimeoutMs) || 12000);
  try {
    const response = await fetch(project.homepage, {
      method: "GET",
      redirect: "follow",
      signal: controller.signal,
      headers: { "User-Agent": "weepwood-projects-health-check/1.0" },
    });
    const latency = Date.now() - started;
    const ok = response.status >= 200 && response.status < 400;
    if (ok) {
      const wasFailing = Number(previous.consecutiveFailures) > 0;
      return {
        status: wasFailing ? "recovered" : "online",
        statusCode: response.status,
        latency,
        finalUrl: response.url,
        consecutiveFailures: 0,
        checkedAt: new Date().toISOString(),
        error: null,
      };
    }
    throw new Error(`HTTP ${response.status}`);
  } catch (error) {
    const failures = Number(previous.consecutiveFailures || 0) + 1;
    return {
      status: failures >= 3 ? "offline" : failures === 2 ? "degraded" : "unstable",
      statusCode: null,
      latency: Date.now() - started,
      finalUrl: project.homepage,
      consecutiveFailures: failures,
      checkedAt: new Date().toISOString(),
      error: error.name === "AbortError" ? "timeout" : error.message,
    };
  } finally {
    clearTimeout(timer);
  }
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
  const projects = readJson(PROJECTS_PATH, []);
  const previous = readJson(HEALTH_PATH, { version: 1, projects: {} });
  const checks = await mapConcurrent(
    projects,
    Number(CONFIG.healthConcurrency) || 8,
    (project) => check(project, previous.projects?.[project.fullName]),
  );
  const next = { version: 1, checkedAt: new Date().toISOString(), projects: {} };
  projects.forEach((project, index) => { next.projects[project.fullName] = checks[index]; });
  writeJson(HEALTH_PATH, next);
  const counts = Object.values(next.projects).reduce((result, item) => {
    result[item.status] = (result[item.status] || 0) + 1;
    return result;
  }, {});
  console.log("Health summary:", counts);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
