"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const OWNER = "weepwood";
const REPO = "projects";

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
async function api(pathname, options = {}) {
  if (!TOKEN) return null;
  const response = await fetch(`https://api.github.com${pathname}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "User-Agent": "weepwood-projects-status-issues",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) throw new Error(`GitHub API ${response.status}: ${pathname}`);
  return response.status === 204 ? null : response.json();
}

async function findOpenIssue(title) {
  const query = encodeURIComponent(`repo:${OWNER}/${REPO} is:issue is:open in:title \"${title}\"`);
  const result = await api(`/search/issues?q=${query}`);
  return result?.items?.[0] || null;
}

async function main() {
  if (!TOKEN) {
    console.log("No GitHub token; skip offline issue synchronization.");
    return;
  }
  const projects = readJson(path.join(ROOT, "projects_enriched.json"), []);
  const health = readJson(path.join(ROOT, "health_data.json"), { projects: {} });
  for (const project of projects) {
    const item = health.projects?.[project.fullName];
    const title = `[Site Offline] ${project.fullName}`;
    const existing = await findOpenIssue(title);
    if (item?.status === "offline" && !existing) {
      await api(`/repos/${OWNER}/${REPO}/issues`, {
        method: "POST",
        body: JSON.stringify({
          title,
          body: [
            "自动在线状态检测连续失败三次。",
            "",
            `- 项目：${project.fullName}`,
            `- URL：${project.homepage}`,
            `- 最后检查：${item.checkedAt}`,
            `- 错误：${item.error || "unknown"}`,
            `- 连续失败：${item.consecutiveFailures}`,
            "",
            "站点恢复后，该 Issue 会由自动化流程关闭。",
          ].join("\n"),
        }),
      });
      console.log(`Created offline issue for ${project.fullName}`);
    } else if (item && ["online", "recovered"].includes(item.status) && existing) {
      await api(`/repos/${OWNER}/${REPO}/issues/${existing.number}`, {
        method: "PATCH",
        body: JSON.stringify({ state: "closed", state_reason: "completed" }),
      });
      console.log(`Closed recovered issue for ${project.fullName}`);
    }
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
