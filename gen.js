// Generator: build a self-contained GitHub project demo aggregation page
// from repositories that have a valid HTTP(S) homepage.
"use strict";

const fs = require("fs");

const LANGS = {
  JavaScript: "#f1e05a",
  TypeScript: "#3178c6",
  HTML: "#e34c26",
  CSS: "#563d7c",
  Vue: "#41b883",
  Python: "#3572A5",
  Java: "#b07219",
  Go: "#00ADD8",
  C: "#555555",
  "C++": "#f34b7d",
  "C#": "#178600",
  GDScript: "#355570",
  Shell: "#89e051",
  Rust: "#dea584",
  null: "#8b949e",
};

function safeHttpUrl(value) {
  if (typeof value !== "string" || !value.trim()) return null;

  try {
    const url = new URL(value.trim());
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.toString()
      : null;
  } catch {
    return null;
  }
}

function platformOf(url) {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return "自定义";

  const hostname = new URL(safeUrl).hostname.toLowerCase();
  if (hostname === "netlify.app" || hostname.endsWith(".netlify.app")) return "Netlify";
  if (hostname === "vercel.app" || hostname.endsWith(".vercel.app")) return "Vercel";
  if (hostname === "github.io" || hostname.endsWith(".github.io")) return "GitHub Pages";
  return "自定义";
}

function hostOf(url) {
  const safeUrl = safeHttpUrl(url);
  if (!safeUrl) return "";

  const parsed = new URL(safeUrl);
  const pathname = parsed.pathname === "/" ? "" : parsed.pathname.replace(/\/$/, "");
  return `${parsed.host}${pathname}`;
}

function normalizeRepos(repos) {
  if (!Array.isArray(repos)) {
    throw new TypeError("repos_raw.json must contain a JSON array");
  }

  return repos
    .map((repo) => {
      const homepage = safeHttpUrl(repo?.homepage);
      const repoUrl = safeHttpUrl(repo?.html_url);
      if (!homepage || !repoUrl) return null;

      const updated = String(repo.updated_at || "").slice(0, 10);
      return {
        name: String(repo.name || "未命名项目"),
        fullName: String(repo.full_name || repo.name || "未命名项目"),
        description: String(repo.description || "暂无描述"),
        homepage,
        repo: repoUrl,
        language: repo.language ? String(repo.language) : null,
        stars: Number.isFinite(repo.stargazers_count)
          ? Math.max(0, repo.stargazers_count)
          : 0,
        updated,
        platform: platformOf(homepage),
        host: hostOf(homepage),
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const updatedOrder = b.updated.localeCompare(a.updated);
      return updatedOrder || a.name.localeCompare(b.name, "zh-CN");
    });
}

function serializeForInlineScript(value) {
  return JSON.stringify(value, null, 2)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}

function buildHtml(items) {
  const data = serializeForInlineScript(items);
  const langColors = serializeForInlineScript(LANGS);
  const genDate = items.length
    ? items.reduce((latest, repo) => (repo.updated > latest ? repo.updated : latest), "")
    : new Date().toISOString().slice(0, 10);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="description" content="weepwood 的在线项目演示聚合页，支持搜索、筛选与排序。" />
<meta name="color-scheme" content="light dark" />
<meta name="theme-color" content="#f6f8fa" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="#0d1117" media="(prefers-color-scheme: dark)" />
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests" />
<title>weepwood · 项目演示聚合</title>
<style>
  :root {
    color-scheme: light;
    --bg: #f6f8fa;
    --surface: rgba(255, 255, 255, 0.86);
    --surface-strong: #ffffff;
    --border: #d8dee4;
    --border-hover: #b6bec8;
    --text: #1f2328;
    --muted: #656d76;
    --accent: #0969da;
    --accent-hover: #075bbd;
    --accent-soft: #ddf4ff;
    --shadow: 0 1px 2px rgba(31, 35, 40, 0.04), 0 8px 24px rgba(31, 35, 40, 0.06);
    --shadow-hover: 0 12px 32px rgba(31, 35, 40, 0.12);
  }

  :root[data-theme="dark"] {
    color-scheme: dark;
    --bg: #0d1117;
    --surface: rgba(22, 27, 34, 0.86);
    --surface-strong: #161b22;
    --border: #30363d;
    --border-hover: #484f58;
    --text: #f0f6fc;
    --muted: #8b949e;
    --accent: #58a6ff;
    --accent-hover: #79c0ff;
    --accent-soft: rgba(56, 139, 253, 0.16);
    --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.22);
    --shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.38);
  }

  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      color-scheme: dark;
      --bg: #0d1117;
      --surface: rgba(22, 27, 34, 0.86);
      --surface-strong: #161b22;
      --border: #30363d;
      --border-hover: #484f58;
      --text: #f0f6fc;
      --muted: #8b949e;
      --accent: #58a6ff;
      --accent-hover: #79c0ff;
      --accent-soft: rgba(56, 139, 253, 0.16);
      --shadow: 0 1px 2px rgba(0, 0, 0, 0.3), 0 8px 24px rgba(0, 0, 0, 0.22);
      --shadow-hover: 0 12px 32px rgba(0, 0, 0, 0.38);
    }
  }

  * { box-sizing: border-box; }

  html {
    min-width: 320px;
    scrollbar-gutter: stable;
  }

  body {
    margin: 0;
    min-height: 100vh;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", Helvetica, Arial, sans-serif;
    background:
      radial-gradient(circle at 10% 0%, var(--accent-soft), transparent 32rem),
      var(--bg);
    color: var(--text);
    line-height: 1.5;
    text-rendering: optimizeLegibility;
  }

  button,
  input,
  select {
    font: inherit;
  }

  a,
  button,
  input,
  select {
    -webkit-tap-highlight-color: transparent;
  }

  :focus-visible {
    outline: 3px solid color-mix(in srgb, var(--accent) 45%, transparent);
    outline-offset: 2px;
  }

  .wrap {
    width: min(1180px, 100%);
    margin: 0 auto;
    padding: 40px 22px 72px;
  }

  .hero {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto;
    align-items: center;
    gap: 16px;
    padding-bottom: 24px;
    border-bottom: 1px solid var(--border);
    margin-bottom: 24px;
  }

  .avatar {
    width: 58px;
    height: 58px;
    border: 1px solid color-mix(in srgb, var(--accent) 28%, var(--border));
    border-radius: 18px;
    background: linear-gradient(145deg, var(--accent-soft), var(--surface-strong));
    display: grid;
    place-items: center;
    font-size: 24px;
    font-weight: 750;
    color: var(--accent);
    box-shadow: var(--shadow);
  }

  .hero h1 {
    margin: 0;
    font-size: clamp(23px, 4vw, 30px);
    letter-spacing: -0.03em;
  }

  .hero p {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 14px;
  }

  .hero-meta {
    display: flex;
    align-items: center;
    gap: 12px;
    text-align: right;
    color: var(--muted);
    font-size: 13px;
  }

  .hero-meta a {
    color: var(--accent);
    text-decoration: none;
  }

  .theme-toggle,
  .reset {
    border: 1px solid var(--border);
    background: var(--surface-strong);
    color: var(--text);
    border-radius: 10px;
    cursor: pointer;
    transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
  }

  .theme-toggle {
    width: 38px;
    height: 38px;
    display: grid;
    place-items: center;
    font-size: 16px;
  }

  .theme-toggle:hover,
  .reset:hover {
    border-color: var(--border-hover);
    background: var(--accent-soft);
  }

  .theme-toggle:active,
  .reset:active {
    transform: translateY(1px);
  }

  .controls {
    position: sticky;
    top: 12px;
    z-index: 10;
    display: grid;
    grid-template-columns: minmax(240px, 1.8fr) repeat(3, minmax(130px, 0.7fr)) auto;
    gap: 10px;
    padding: 12px;
    margin-bottom: 14px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface);
    box-shadow: var(--shadow);
    backdrop-filter: blur(18px);
  }

  .field {
    position: relative;
    min-width: 0;
  }

  .field label {
    position: absolute;
    left: 12px;
    top: 7px;
    z-index: 1;
    color: var(--muted);
    font-size: 10px;
    line-height: 1;
    pointer-events: none;
  }

  .field input,
  .field select {
    width: 100%;
    min-height: 46px;
    padding: 18px 12px 6px;
    border: 1px solid var(--border);
    border-radius: 10px;
    background: var(--surface-strong);
    color: var(--text);
    transition: border-color 160ms ease, box-shadow 160ms ease;
  }

  .field input::placeholder {
    color: color-mix(in srgb, var(--muted) 78%, transparent);
  }

  .field input:focus,
  .field select:focus {
    border-color: var(--accent);
    box-shadow: 0 0 0 3px var(--accent-soft);
    outline: none;
  }

  .reset {
    min-height: 46px;
    padding: 0 14px;
    font-size: 13px;
    font-weight: 650;
  }

  .summary {
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-height: 34px;
    margin: 0 2px 12px;
    color: var(--muted);
    font-size: 13px;
  }

  .summary strong {
    color: var(--text);
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(min(100%, 320px), 1fr));
    gap: 16px;
  }

  .card {
    min-width: 0;
    min-height: 248px;
    padding: 19px;
    border: 1px solid var(--border);
    border-radius: 16px;
    background: var(--surface-strong);
    box-shadow: var(--shadow);
    display: flex;
    flex-direction: column;
    transition: transform 180ms ease, border-color 180ms ease, box-shadow 180ms ease;
    content-visibility: auto;
    contain-intrinsic-size: auto 248px;
  }

  .card:hover {
    transform: translateY(-3px);
    border-color: var(--border-hover);
    box-shadow: var(--shadow-hover);
  }

  .card-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
  }

  .card h2 {
    min-width: 0;
    margin: 0;
    font-size: 17px;
    line-height: 1.35;
    overflow-wrap: anywhere;
  }

  .card h2 a {
    color: var(--text);
    text-decoration: none;
  }

  .card h2 a:hover {
    color: var(--accent);
  }

  .platform {
    flex: none;
    padding: 3px 8px;
    border: 1px solid var(--border);
    border-radius: 999px;
    color: var(--muted);
    background: var(--bg);
    font-size: 11px;
    white-space: nowrap;
  }

  .host {
    margin: 5px 0 0;
    color: var(--muted);
    font-size: 12px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .description {
    display: -webkit-box;
    min-height: 61px;
    margin: 14px 0;
    color: var(--muted);
    font-size: 13.5px;
    overflow: hidden;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 3;
  }

  .metadata {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 14px;
    margin-top: auto;
    margin-bottom: 14px;
    color: var(--muted);
    font-size: 12px;
  }

  .metadata-item {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }

  .language-dot {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.12);
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }

  .button {
    min-height: 40px;
    display: inline-grid;
    place-items: center;
    padding: 8px 10px;
    border: 1px solid var(--border);
    border-radius: 10px;
    color: var(--text);
    background: var(--surface-strong);
    font-size: 13px;
    font-weight: 650;
    text-decoration: none;
    transition: background 160ms ease, border-color 160ms ease, transform 160ms ease;
  }

  .button:hover {
    border-color: var(--border-hover);
    background: var(--accent-soft);
  }

  .button:active {
    transform: translateY(1px);
  }

  .button.primary {
    border-color: var(--accent);
    background: var(--accent);
    color: #ffffff;
  }

  .button.primary:hover {
    border-color: var(--accent-hover);
    background: var(--accent-hover);
  }

  .empty {
    display: none;
    padding: 64px 20px;
    border: 1px dashed var(--border);
    border-radius: 16px;
    text-align: center;
    color: var(--muted);
    background: var(--surface);
  }

  .empty h2 {
    margin: 0 0 6px;
    color: var(--text);
    font-size: 18px;
  }

  footer {
    margin-top: 44px;
    text-align: center;
    color: var(--muted);
    font-size: 12.5px;
  }

  .visually-hidden {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  @media (max-width: 860px) {
    .controls {
      position: static;
      grid-template-columns: 1fr 1fr;
    }

    .field.search-field {
      grid-column: 1 / -1;
    }

    .reset {
      grid-column: span 1;
    }
  }

  @media (max-width: 620px) {
    .wrap {
      padding: 24px 14px 52px;
    }

    .hero {
      grid-template-columns: auto minmax(0, 1fr);
    }

    .hero-meta {
      grid-column: 1 / -1;
      justify-content: space-between;
      width: 100%;
      text-align: left;
    }

    .controls {
      grid-template-columns: 1fr;
      padding: 10px;
    }

    .field.search-field,
    .reset {
      grid-column: auto;
    }

    .card {
      min-height: 0;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      scroll-behavior: auto !important;
      transition-duration: 0.01ms !important;
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
    }
  }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="avatar" aria-hidden="true">W</div>
    <div>
      <h1>weepwood · 项目演示聚合</h1>
      <p>集中浏览设有 Website 的 GitHub 项目，快速查找演示与源码</p>
    </div>
    <div class="hero-meta">
      <div>
        <div><strong id="totalCount">0</strong> 个演示项目</div>
        <div>更新于 ${genDate} · <a href="https://github.com/weepwood" target="_blank" rel="noopener noreferrer">@weepwood</a></div>
      </div>
      <button id="themeToggle" class="theme-toggle" type="button" aria-label="切换深色模式" title="切换主题">◐</button>
    </div>
  </header>

  <main>
    <section class="controls" aria-label="项目筛选">
      <div class="field search-field">
        <label for="search">搜索</label>
        <input id="search" type="search" autocomplete="off" placeholder="项目名、描述、语言或网址" />
      </div>
      <div class="field">
        <label for="platformFilter">部署平台</label>
        <select id="platformFilter"></select>
      </div>
      <div class="field">
        <label for="languageFilter">开发语言</label>
        <select id="languageFilter"></select>
      </div>
      <div class="field">
        <label for="sortBy">排序方式</label>
        <select id="sortBy">
          <option value="updated">最近更新</option>
          <option value="stars">Stars 较多</option>
          <option value="name">项目名称</option>
        </select>
      </div>
      <button id="resetFilters" class="reset" type="button">重置筛选</button>
    </section>

    <div class="summary" aria-live="polite">
      <span id="resultSummary"></span>
      <span id="activeSummary"></span>
    </div>

    <section class="grid" id="grid" aria-label="项目列表"></section>

    <section class="empty" id="empty">
      <h2>没有匹配的项目</h2>
      <div>尝试缩短关键词或重置筛选条件。</div>
    </section>
  </main>

  <footer>
    数据来自 GitHub 仓库元信息 · 静态生成并部署于 GitHub Pages
  </footer>
</div>

<script>
"use strict";

const REPOS = ${data};
const LANG_COLORS = ${langColors};
const ALL = "全部";

const elements = {
  grid: document.getElementById("grid"),
  empty: document.getElementById("empty"),
  search: document.getElementById("search"),
  platform: document.getElementById("platformFilter"),
  language: document.getElementById("languageFilter"),
  sort: document.getElementById("sortBy"),
  reset: document.getElementById("resetFilters"),
  totalCount: document.getElementById("totalCount"),
  resultSummary: document.getElementById("resultSummary"),
  activeSummary: document.getElementById("activeSummary"),
  themeToggle: document.getElementById("themeToggle"),
};

const dateFormatter = new Intl.DateTimeFormat("zh-CN", {
  year: "numeric",
  month: "short",
  day: "numeric",
});

function createElement(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function externalLink(url, className, text, label) {
  const link = createElement("a", className, text);
  link.href = url;
  link.target = "_blank";
  link.rel = "noopener noreferrer";
  if (label) link.setAttribute("aria-label", label);
  return link;
}

function formatDate(value) {
  if (!value) return "未知";
  const date = new Date(value + "T00:00:00Z");
  return Number.isNaN(date.getTime()) ? value : dateFormatter.format(date);
}

function fillSelect(select, values, label) {
  const fragment = document.createDocumentFragment();
  [ALL, ...values].forEach((value) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = value === ALL ? "全部" + label : value;
    fragment.appendChild(option);
  });
  select.replaceChildren(fragment);
}

function readState() {
  const params = new URLSearchParams(location.search);
  return {
    query: params.get("q") || "",
    platform: params.get("platform") || ALL,
    language: params.get("language") || ALL,
    sort: ["updated", "stars", "name"].includes(params.get("sort"))
      ? params.get("sort")
      : "updated",
  };
}

function writeState() {
  const params = new URLSearchParams();
  const query = elements.search.value.trim();

  if (query) params.set("q", query);
  if (elements.platform.value !== ALL) params.set("platform", elements.platform.value);
  if (elements.language.value !== ALL) params.set("language", elements.language.value);
  if (elements.sort.value !== "updated") params.set("sort", elements.sort.value);

  const nextUrl = params.size ? "?" + params.toString() : location.pathname;
  history.replaceState(null, "", nextUrl);
}

function createMetadataItem(text, dotColor) {
  const item = createElement("span", "metadata-item");
  if (dotColor) {
    const dot = createElement("span", "language-dot");
    dot.style.backgroundColor = dotColor;
    dot.setAttribute("aria-hidden", "true");
    item.appendChild(dot);
  }
  item.appendChild(document.createTextNode(text));
  return item;
}

function createCard(repo) {
  const card = createElement("article", "card");

  const head = createElement("div", "card-head");
  const titleGroup = createElement("div");
  const title = createElement("h2");
  title.appendChild(externalLink(repo.repo, "", repo.name, "打开 " + repo.name + " 的 GitHub 仓库"));
  titleGroup.appendChild(title);
  titleGroup.appendChild(createElement("p", "host", repo.host));
  head.appendChild(titleGroup);
  head.appendChild(createElement("span", "platform", repo.platform));

  const description = createElement("p", "description", repo.description);

  const metadata = createElement("div", "metadata");
  metadata.appendChild(
    createMetadataItem(
      repo.language || "其他",
      LANG_COLORS[repo.language] || LANG_COLORS.null,
    ),
  );
  metadata.appendChild(createMetadataItem("★ " + repo.stars));
  metadata.appendChild(createMetadataItem("更新于 " + formatDate(repo.updated)));

  const actions = createElement("div", "actions");
  actions.appendChild(
    externalLink(repo.homepage, "button primary", "在线演示 ↗", "打开 " + repo.name + " 在线演示"),
  );
  actions.appendChild(
    externalLink(repo.repo, "button", "查看源码", "打开 " + repo.name + " 源码"),
  );

  card.append(head, description, metadata, actions);
  return card;
}

function getFilteredRepos() {
  const query = elements.search.value.trim().toLocaleLowerCase("zh-CN");
  const platform = elements.platform.value;
  const language = elements.language.value;
  const sort = elements.sort.value;

  const result = REPOS.filter((repo) => {
    const searchable = [
      repo.name,
      repo.fullName,
      repo.description,
      repo.language || "",
      repo.platform,
      repo.host,
    ]
      .join(" ")
      .toLocaleLowerCase("zh-CN");

    return (
      (!query || searchable.includes(query)) &&
      (platform === ALL || repo.platform === platform) &&
      (language === ALL || (repo.language || "其他") === language)
    );
  });

  result.sort((a, b) => {
    if (sort === "stars") {
      return b.stars - a.stars || b.updated.localeCompare(a.updated);
    }
    if (sort === "name") {
      return a.name.localeCompare(b.name, "zh-CN");
    }
    return b.updated.localeCompare(a.updated) || a.name.localeCompare(b.name, "zh-CN");
  });

  return result;
}

function render() {
  const repos = getFilteredRepos();
  const fragment = document.createDocumentFragment();

  repos.forEach((repo) => fragment.appendChild(createCard(repo)));
  elements.grid.replaceChildren(fragment);
  elements.empty.style.display = repos.length ? "none" : "block";
  elements.grid.hidden = repos.length === 0;

  elements.resultSummary.textContent =
    "显示 " + repos.length + " / " + REPOS.length + " 个项目";

  const active = [];
  if (elements.platform.value !== ALL) active.push(elements.platform.value);
  if (elements.language.value !== ALL) active.push(elements.language.value);
  if (elements.search.value.trim()) active.push("关键词：" + elements.search.value.trim());
  elements.activeSummary.textContent = active.join(" · ");

  writeState();
}

function resetFilters() {
  elements.search.value = "";
  elements.platform.value = ALL;
  elements.language.value = ALL;
  elements.sort.value = "updated";
  render();
  elements.search.focus();
}

function applyTheme(theme) {
  if (theme === "light" || theme === "dark") {
    document.documentElement.dataset.theme = theme;
  } else {
    delete document.documentElement.dataset.theme;
  }

  const isDark =
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      matchMedia("(prefers-color-scheme: dark)").matches);

  elements.themeToggle.textContent = isDark ? "☀" : "☾";
  elements.themeToggle.setAttribute(
    "aria-label",
    isDark ? "切换浅色模式" : "切换深色模式",
  );
}

function toggleTheme() {
  const isDark =
    document.documentElement.dataset.theme === "dark" ||
    (!document.documentElement.dataset.theme &&
      matchMedia("(prefers-color-scheme: dark)").matches);
  const nextTheme = isDark ? "light" : "dark";
  localStorage.setItem("theme", nextTheme);
  applyTheme(nextTheme);
}

const platforms = [...new Set(REPOS.map((repo) => repo.platform))].sort((a, b) =>
  a.localeCompare(b, "zh-CN"),
);
const languages = [
  ...new Set(REPOS.map((repo) => repo.language || "其他")),
].sort((a, b) => a.localeCompare(b, "zh-CN"));

fillSelect(elements.platform, platforms, "平台");
fillSelect(elements.language, languages, "语言");
elements.totalCount.textContent = String(REPOS.length);

const initialState = readState();
elements.search.value = initialState.query;
elements.platform.value = platforms.includes(initialState.platform)
  ? initialState.platform
  : ALL;
elements.language.value = languages.includes(initialState.language)
  ? initialState.language
  : ALL;
elements.sort.value = initialState.sort;

elements.search.addEventListener("input", render);
elements.platform.addEventListener("change", render);
elements.language.addEventListener("change", render);
elements.sort.addEventListener("change", render);
elements.reset.addEventListener("click", resetFilters);
elements.themeToggle.addEventListener("click", toggleTheme);

applyTheme(localStorage.getItem("theme"));
render();
</script>
</body>
</html>
`;
}

function main() {
  const sourcePath = process.argv[2] || "repos_raw.json";
  const repos = JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  const items = normalizeRepos(repos);

  fs.writeFileSync("index.html", buildHtml(items), "utf8");
  fs.writeFileSync("projects_data.json", `${JSON.stringify(items, null, 2)}\n`, "utf8");
  console.log(`Wrote index.html with ${items.length} projects`);
}

if (require.main === module) {
  main();
}

module.exports = {
  LANGS,
  buildHtml,
  hostOf,
  normalizeRepos,
  platformOf,
  safeHttpUrl,
  serializeForInlineScript,
};
