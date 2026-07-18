"use strict";

const fs = require("fs");
const path = require("path");
const { decideScreenshot, currentCommitFingerprint } = require("../lib/automation");

const ROOT = path.resolve(__dirname, "..");
const CONFIG = readJson(path.join(ROOT, "automation.config.json"), {});
const PROJECTS_PATH = path.join(ROOT, "projects_enriched.json");
const STATE_PATH = path.join(ROOT, "screenshot_state.json");
const PLAN_PATH = path.join(ROOT, "screenshot_plan.json");
const COVERS_DIR = path.join(ROOT, "covers");

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function safeName(name) {
  return String(name).replace(/[\\/:*?"<>|]/g, "-");
}

function createPlan() {
  const projects = readJson(PROJECTS_PATH, []);
  const state = readJson(STATE_PATH, { version: 1, projects: {} });
  const now = new Date();
  const candidates = [];
  const decisions = [];

  for (const project of projects) {
    const projectState = state.projects?.[project.fullName] || {};
    const coverPath = path.join(COVERS_DIR, `${safeName(project.name)}.png`);
    const decision = decideScreenshot(project, projectState, {
      now,
      minDays: Number(CONFIG.screenshotMinDays) || 10,
      retryHours: Number(CONFIG.screenshotFailureRetryHours) || 24,
      coverExists: fs.existsSync(coverPath),
    });
    decisions.push({ fullName: project.fullName, ...decision });
    if (decision.capture) candidates.push({ ...project, coverPath, reason: decision.reason });
  }

  const limit = Number(CONFIG.maxScreenshotsPerRun) || 8;
  const plan = {
    generatedAt: now.toISOString(),
    minDays: Number(CONFIG.screenshotMinDays) || 10,
    count: Math.min(limit, candidates.length),
    deferredCount: Math.max(0, candidates.length - limit),
    projects: candidates.slice(0, limit),
    decisions,
  };
  writeJson(PLAN_PATH, plan);
  if (process.env.GITHUB_OUTPUT) {
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${plan.count}\n`, "utf8");
  }
  console.log(`Screenshot plan: ${plan.count} capture(s), ${plan.deferredCount} deferred by run limit.`);
  return plan;
}

async function capture() {
  const plan = readJson(PLAN_PATH, null) || createPlan();
  if (!plan.projects?.length) return;
  const { chromium } = require("playwright");
  const state = readJson(STATE_PATH, { version: 1, projects: {} });
  state.projects ||= {};
  fs.mkdirSync(COVERS_DIR, { recursive: true });
  const browser = await chromium.launch({ headless: true });

  try {
    for (const project of plan.projects) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const attemptAt = new Date().toISOString();
      const previous = state.projects[project.fullName] || {};
      try {
        await page.goto(project.homepage, { waitUntil: "domcontentloaded", timeout: 45000 });
        await page.waitForTimeout(2500);
        await page.screenshot({ path: project.coverPath, type: "png", fullPage: false });
        state.projects[project.fullName] = {
          ...previous,
          lastScreenshotAt: new Date().toISOString(),
          lastScreenshotCommit: project.latestCommitSha || "",
          lastScreenshotPushedAt: project.pushedAt || "",
          lastAttemptAt: attemptAt,
          lastReason: project.reason,
          lastError: null,
        };
        console.log(`Captured ${project.fullName}: ${project.reason}`);
      } catch (error) {
        state.projects[project.fullName] = {
          ...previous,
          lastAttemptAt: attemptAt,
          lastError: error.message,
          pendingCommit: currentCommitFingerprint(project),
        };
        console.error(`Screenshot failed for ${project.fullName}: ${error.message}`);
      } finally {
        await page.close();
        writeJson(STATE_PATH, state);
      }
    }
  } finally {
    await browser.close();
  }
}

if (process.argv.includes("--plan")) {
  createPlan();
} else {
  capture().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
