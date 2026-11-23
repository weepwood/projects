#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { loadConfig } from '../lib/config.js';
import { ROOT, readJson, writeJson, requireJson } from '../lib/fsx.js';
import { createLogger } from '../lib/log.js';
import { currentCommitFingerprint, decideScreenshot } from '../lib/screenshot.js';

const log = createLogger('screenshots');
const config = loadConfig();
const COVERS_DIR = path.join(ROOT, 'public', 'covers');
const PLAN_PATH = '.cache/screenshot-plan.json';
const STATE_PATH = '.cache/screenshot-state.json';

const safeName = (name) => String(name).replace(/[\\/:*?"<>|]/g, '-');

export function createPlan() {
  const projects = requireJson('.cache/enriched.json', 'npm run enrich');
  const state = readJson(STATE_PATH, { version: 2, projects: {} });
  const now = new Date();
  const candidates = [];
  const decisions = [];

  for (const project of projects) {
    const projectState = state.projects?.[project.fullName] ?? {};
    const coverPath = path.join(COVERS_DIR, `${safeName(project.name)}.png`);
    const decision = decideScreenshot(project, projectState, {
      now,
      minDays: config.screenshotMinDays,
      retryHours: config.screenshotFailureRetryHours,
      coverExists: fs.existsSync(coverPath),
    });
    decisions.push({ fullName: project.fullName, ...decision });
    if (decision.capture) candidates.push({ ...project, coverPath, reason: decision.reason });
  }

  const plan = {
    generatedAt: now.toISOString(),
    minDays: config.screenshotMinDays,
    count: Math.min(config.maxScreenshotsPerRun, candidates.length),
    deferredCount: Math.max(0, candidates.length - config.maxScreenshotsPerRun),
    projects: candidates.slice(0, config.maxScreenshotsPerRun),
    decisions,
  };

  writeJson(PLAN_PATH, plan);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `count=${plan.count}\n`);
  log.info(`截图计划 ${plan.count} 张，延后 ${plan.deferredCount} 张`);
  return plan;
}

async function capture() {
  const plan = readJson(PLAN_PATH, null) ?? createPlan();
  if (!plan.projects?.length) {
    log.info('没有需要截图的页面');
    return;
  }

  const { chromium } = await import('playwright');
  const state = readJson(STATE_PATH, { version: 2, projects: {} });
  state.projects ??= {};
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const browser = await chromium.launch({ headless: true });
  try {
    for (const project of plan.projects) {
      const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
      const attemptAt = new Date().toISOString();
      const previous = state.projects[project.fullName] ?? {};
      try {
        await page.goto(project.homepage, { waitUntil: 'domcontentloaded', timeout: 45_000 });
        // Give webfonts and entry animations a beat; a screenshot of an empty
        // skeleton is worse than no screenshot.
        await page.waitForTimeout(2500);
        await page.screenshot({ path: project.coverPath, type: 'png', fullPage: false });
        state.projects[project.fullName] = {
          ...previous,
          lastScreenshotAt: new Date().toISOString(),
          lastScreenshotCommit: project.latestCommitSha ?? '',
          lastScreenshotPushedAt: project.pushedAt ?? '',
          lastAttemptAt: attemptAt,
          lastReason: project.reason,
          lastError: null,
        };
        log.info(`已截图 ${project.fullName}`);
      } catch (error) {
        state.projects[project.fullName] = {
          ...previous,
          lastAttemptAt: attemptAt,
          lastError: error.message,
          pendingCommit: currentCommitFingerprint(project),
        };
        log.warn(`截图失败 ${project.fullName}：${error.message}`);
      } finally {
        await page.close();
        writeJson(STATE_PATH, state);
      }
    }
  } finally {
    await browser.close();
  }
}

if (process.argv.includes('--plan')) {
  try {
    createPlan();
  } catch (error) {
    log.error(error.message);
    process.exitCode = 1;
  }
} else {
  capture().catch((error) => {
    log.error(error.message);
    process.exitCode = 1;
  });
}
