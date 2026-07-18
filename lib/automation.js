"use strict";

const CATEGORY_RULES = [
  ["镜像与复刻", /\b(mirror|clone|replica|copy|复刻|镜像)\b/i],
  ["游戏与模拟", /\b(game|games|chess|billiard|sakana|board[- ]?game|游戏|象棋|围棋|五子棋)\b/i],
  ["3D 与创意交互", /\b(three(?:\.js)?|webgl|webgpu|3d|particle|shader|canvas[- ]?art|粒子|三维)\b/i],
  ["复杂系统与科学模拟", /\b(cellular|automata|emergence|complex|pid|physics|simulation|simulator|仿真|元胞|涌现|复杂系统)\b/i],
  ["学习与知识可视化", /\b(visuali[sz]|learn|guide|tutorial|docs?|principle|math|algebra|algorithm|knowledge|course|学习|教程|指南|原理|算法|数学|知识|可视化)\b/i],
  ["开发者工具", /\b(tool|tools|calculator|converter|generator|detector|url|scheme|file|image|sync|cli|devtool|工具|计算器|转换|检测|生成器)\b/i],
  ["完整应用", /\b(blog|diary|admin|management|system|dashboard|platform|cms|app|应用|管理系统|博客|日记)\b/i],
  ["设计与 UI", /\b(ui|design|icon|style|glass|component|gallery|theme|设计|图标|组件|界面)\b/i],
];

const TYPE_RULES = [
  ["mirror", /\b(mirror|clone|replica|复刻|镜像)\b/i],
  ["game", /\b(game|games|chess|billiard|游戏|象棋|围棋|五子棋)\b/i],
  ["guide", /\b(guide|tutorial|docs?|course|教程|指南|文档)\b/i],
  ["visualization", /\b(visuali[sz]|chart|graph|可视化|图谱)\b/i],
  ["tool", /\b(tool|calculator|converter|generator|detector|工具|计算器|转换|检测)\b/i],
  ["application", /\b(app|system|platform|dashboard|management|blog|diary|应用|系统|平台)\b/i],
];

const DEPENDENCY_TAGS = new Map([
  ["react", "React"],
  ["next", "Next.js"],
  ["vue", "Vue"],
  ["vite", "Vite"],
  ["three", "Three.js"],
  ["@react-three/fiber", "React Three Fiber"],
  ["echarts", "ECharts"],
  ["d3", "D3.js"],
  ["pixi.js", "PixiJS"],
  ["phaser", "Phaser"],
  ["express", "Express"],
  ["fastify", "Fastify"],
  ["@supabase/supabase-js", "Supabase"],
  ["tailwindcss", "Tailwind CSS"],
  ["@playwright/test", "Playwright"],
]);

function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function normalizeText(...parts) {
  return parts
    .flat()
    .filter(Boolean)
    .map((value) => String(value))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanReadmeSummary(readme) {
  if (!readme) return "";
  const text = String(readme)
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/!\[[^\]]*\]\([^)]*\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/^[-*>]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  const firstSentence = text.split(/(?<=[。！？.!?])\s+/)[0] || text;
  return firstSentence.slice(0, 180).trim();
}

function inferCategory(project) {
  const text = normalizeText(project.name, project.description, project.topics, project.readme, project.manifestText);
  for (const [category, pattern] of CATEGORY_RULES) {
    if (pattern.test(text)) return { category, confidence: 0.88 };
  }
  return { category: "其他项目", confidence: 0.52 };
}

function inferType(project) {
  const text = normalizeText(project.name, project.description, project.topics, project.readme);
  for (const [type, pattern] of TYPE_RULES) {
    if (pattern.test(text)) return type;
  }
  return "project";
}

function inferTags(project) {
  const tags = new Set();
  if (project.language) tags.add(project.language);
  for (const topic of project.topics || []) {
    const value = String(topic).trim();
    if (value) tags.add(value);
  }

  if (project.packageJson && typeof project.packageJson === "object") {
    const dependencies = {
      ...(project.packageJson.dependencies || {}),
      ...(project.packageJson.devDependencies || {}),
    };
    for (const dependency of Object.keys(dependencies)) {
      if (DEPENDENCY_TAGS.has(dependency)) tags.add(DEPENDENCY_TAGS.get(dependency));
    }
  }

  const text = normalizeText(project.name, project.description, project.readme);
  const inferred = [
    ["WebGL", /\bwebgl\b/i],
    ["WebGPU", /\bwebgpu\b/i],
    ["Canvas", /\bcanvas\b/i],
    ["AI", /\b(ai|llm|chatgpt|claude)\b/i],
    ["算法", /\b(algorithm|leetcode|算法)\b/i],
    ["数学", /\b(math|algebra|数学|代数)\b/i],
    ["可视化", /\b(visuali[sz]|可视化)\b/i],
  ];
  for (const [tag, pattern] of inferred) {
    if (pattern.test(text)) tags.add(tag);
  }
  return [...tags].slice(0, 8);
}

function platformOf(url) {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return "自定义";
  const hostname = new URL(safeUrl).hostname.toLowerCase();
  const platforms = [
    ["Netlify", /(^|\.)netlify\.app$/],
    ["Vercel", /(^|\.)vercel\.app$/],
    ["GitHub Pages", /(^|\.)github\.io$/],
    ["Cloudflare Pages", /(^|\.)pages\.dev$/],
    ["Render", /(^|\.)onrender\.com$/],
    ["Railway", /(^|\.)up\.railway\.app$/],
    ["Firebase", /(^|\.)(web\.app|firebaseapp\.com)$/],
    ["Hugging Face", /(^|\.)hf\.space$/],
  ];
  for (const [name, pattern] of platforms) {
    if (pattern.test(hostname)) return name;
  }
  return "自定义";
}

function hostOf(url) {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return "";
  const parsed = new URL(safeUrl);
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return `${parsed.host}${pathname}`;
}

function computeScores(project) {
  let quality = 40;
  let recommendation = 35;
  const now = Date.now();
  const pushed = Date.parse(project.pushedAt || project.updatedAt || 0);
  const daysSincePush = Number.isFinite(pushed) ? Math.max(0, (now - pushed) / 86400000) : 9999;

  if (project.description && project.description !== "暂无描述") quality += 10;
  if (project.readme && project.readme.length > 300) quality += 10;
  if ((project.tags || []).length >= 3) quality += 6;
  if (project.license) quality += 4;
  if (project.homepage) quality += 10;
  if (project.archived) quality -= 35;
  if (project.fork) quality -= 12;

  if (daysSincePush <= 14) recommendation += 25;
  else if (daysSincePush <= 60) recommendation += 16;
  else if (daysSincePush <= 180) recommendation += 8;
  if (project.stars > 0) recommendation += Math.min(10, Math.log2(project.stars + 1) * 3);
  if (project.category !== "其他项目") recommendation += 8;
  if (project.type === "mirror") recommendation -= 8;
  if (project.archived) recommendation -= 30;
  if (project.fork) recommendation -= 10;
  recommendation += Math.round((quality - 50) * 0.35);

  return {
    qualityScore: Math.max(0, Math.min(100, Math.round(quality))),
    recommendationScore: Math.max(0, Math.min(100, Math.round(recommendation))),
  };
}

function daysBetween(older, newer = new Date()) {
  const oldTime = Date.parse(older || "");
  const newTime = newer instanceof Date ? newer.getTime() : Date.parse(newer || "");
  if (!Number.isFinite(oldTime) || !Number.isFinite(newTime)) return Infinity;
  return Math.max(0, (newTime - oldTime) / 86400000);
}

function hoursBetween(older, newer = new Date()) {
  return daysBetween(older, newer) * 24;
}

function currentCommitFingerprint(project) {
  return project.latestCommitSha || project.pushedAt || project.updatedAt || "";
}

function decideScreenshot(project, state = {}, options = {}) {
  const now = options.now instanceof Date ? options.now : new Date(options.now || Date.now());
  const minDays = Number.isFinite(options.minDays) ? options.minDays : 10;
  const retryHours = Number.isFinite(options.retryHours) ? options.retryHours : 24;
  const coverExists = Boolean(options.coverExists);
  const current = currentCommitFingerprint(project);
  const captured = state.lastScreenshotCommit || state.lastScreenshotPushedAt || "";

  if (state.lastError && hoursBetween(state.lastAttemptAt, now) < retryHours) {
    return { capture: false, reason: "failure-retry-cooldown" };
  }
  if (!coverExists || !state.lastScreenshotAt) {
    return { capture: true, reason: "missing-cover" };
  }
  if (!current || current === captured) {
    return { capture: false, reason: "no-new-commit" };
  }
  const ageDays = daysBetween(state.lastScreenshotAt, now);
  if (ageDays < minDays) {
    return {
      capture: false,
      reason: "changed-but-in-cooldown",
      eligibleAt: new Date(Date.parse(state.lastScreenshotAt) + minDays * 86400000).toISOString(),
    };
  }
  return { capture: true, reason: "new-commit-and-cooldown-complete" };
}

function findDuplicateHomepages(projects) {
  const groups = new Map();
  for (const project of projects) {
    const homepage = safeHttpUrl(project.homepage);
    if (!homepage) continue;
    const key = homepage.replace(/\/$/, "").toLowerCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(project.fullName || project.name);
  }
  return [...groups.entries()]
    .filter(([, names]) => names.length > 1)
    .map(([homepage, projects]) => ({ homepage, projects }));
}

module.exports = {
  cleanReadmeSummary,
  computeScores,
  currentCommitFingerprint,
  daysBetween,
  decideScreenshot,
  findDuplicateHomepages,
  hostOf,
  inferCategory,
  inferTags,
  inferType,
  normalizeText,
  platformOf,
  safeHttpUrl,
};
