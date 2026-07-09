// Generator: build a self-contained GitHub project demo-aggregation page
// from the current user's repos that have a `homepage` (Website) set.
const fs = require("fs");

const repos = JSON.parse(fs.readFileSync("repos_raw.json", "utf8"));

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

function platformOf(url) {
  try {
    const h = new URL(url).hostname;
    if (h.endsWith("netlify.app")) return "Netlify";
    if (h.endsWith("vercel.app")) return "Vercel";
    if (h.endsWith("github.io")) return "GitHub Pages";
    return "自定义";
  } catch {
    return "自定义";
  }
}

function hostOf(url) {
  try {
    const u = new URL(url);
    return u.host + (u.pathname === "/" ? "" : u.pathname);
  } catch {
    return url;
  }
}

const items = repos
  .filter((r) => r.homepage)
  .map((r) => ({
    name: r.name,
    fullName: r.full_name,
    description: r.description || "暂无描述",
    homepage: r.homepage,
    repo: r.html_url,
    language: r.language || null,
    stars: r.stargazers_count || 0,
    updated: (r.updated_at || "").slice(0, 10),
    platform: platformOf(r.homepage),
    host: hostOf(r.homepage),
  }))
  .sort((a, b) => b.updated.localeCompare(a.updated));

const data = JSON.stringify(items, null, 2);
const genDate = new Date().toISOString().slice(0, 10);

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>weepwood · 项目演示聚合</title>
<style>
  :root {
    --bg: #f6f8fa;
    --card: #ffffff;
    --border: #d8dee4;
    --text: #1f2328;
    --muted: #656d76;
    --accent: #0969da;
    --accent-soft: #ddf4ff;
    --shadow: 0 1px 3px rgba(27,31,36,.08), 0 1px 2px rgba(27,31,36,.04);
  }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans SC", Helvetica, Arial, sans-serif;
    background: var(--bg);
    color: var(--text);
    line-height: 1.5;
  }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 32px 20px 64px; }
  header.hero {
    display: flex; align-items: center; gap: 16px; flex-wrap: wrap;
    padding-bottom: 22px; border-bottom: 1px solid var(--border); margin-bottom: 24px;
  }
  .avatar { width: 56px; height: 56px; border-radius: 50%; background: #0969da22; display: flex; align-items: center; justify-content: center; font-size: 26px; font-weight: 700; color: var(--accent); }
  .hero h1 { margin: 0; font-size: 26px; }
  .hero p { margin: 4px 0 0; color: var(--muted); font-size: 14px; }
  .hero .meta { margin-left: auto; text-align: right; color: var(--muted); font-size: 13px; }
  .hero .meta a { color: var(--accent); text-decoration: none; }
  .controls { display: flex; gap: 12px; flex-wrap: wrap; align-items: center; margin-bottom: 18px; }
  .search { flex: 1; min-width: 220px; padding: 9px 12px; border: 1px solid var(--border); border-radius: 8px; font-size: 14px; background: var(--card); }
  .search:focus { outline: 2px solid var(--accent-soft); border-color: var(--accent); }
  .chips { display: flex; gap: 8px; flex-wrap: wrap; }
  .chip { cursor: pointer; border: 1px solid var(--border); background: var(--card); color: var(--muted); padding: 6px 12px; border-radius: 999px; font-size: 13px; user-select: none; }
  .chip.active { background: var(--accent); border-color: var(--accent); color: #fff; }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(310px, 1fr)); gap: 16px; }
  .card { background: var(--card); border: 1px solid var(--border); border-radius: 12px; padding: 18px; box-shadow: var(--shadow); display: flex; flex-direction: column; transition: transform .12s ease, box-shadow .12s ease; }
  .card:hover { transform: translateY(-3px); box-shadow: 0 6px 18px rgba(27,31,36,.12); }
  .card h3 { margin: 0 0 6px; font-size: 16px; word-break: break-all; }
  .card h3 a { color: var(--text); text-decoration: none; }
  .card h3 a:hover { color: var(--accent); }
  .desc { color: var(--muted); font-size: 13.5px; flex: 1; margin: 0 0 14px; }
  .tags { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
  .tag { font-size: 12px; color: var(--muted); display: inline-flex; align-items: center; gap: 5px; }
  .dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
  .plat { background: #eaeef2; color: #424a53; padding: 2px 8px; border-radius: 999px; font-size: 11.5px; }
  .actions { display: flex; gap: 8px; }
  .btn { flex: 1; text-align: center; padding: 9px 10px; border-radius: 8px; font-size: 13.5px; font-weight: 600; text-decoration: none; border: 1px solid var(--border); color: var(--text); }
  .btn.demo { background: var(--accent); border-color: var(--accent); color: #fff; }
  .btn.demo:hover { background: #0860ca; }
  .btn.code { background: var(--card); }
  .btn.code:hover { background: #f3f4f6; border-color: #c2cad2; }
  footer { margin-top: 40px; text-align: center; color: var(--muted); font-size: 12.5px; }
  .empty { text-align: center; color: var(--muted); padding: 40px; }
</style>
</head>
<body>
<div class="wrap">
  <header class="hero">
    <div class="avatar">W</div>
    <div>
      <h1>weepwood · 项目演示聚合</h1>
      <p>从 GitHub 仓库详情的 Website 字段提取，汇集全部在线演示网址</p>
    </div>
    <div class="meta">
      <div><strong id="count">0</strong> 个演示项目</div>
      <div>更新于 ${genDate} · <a href="https://github.com/weepwood" target="_blank" rel="noopener">@weepwood</a></div>
    </div>
  </header>

  <div class="controls">
    <input id="search" class="search" type="text" placeholder="搜索项目名、描述或语言…" />
    <div class="chips" id="platformChips"></div>
    <div class="chips" id="langChips"></div>
  </div>

  <div class="grid" id="grid"></div>
  <div class="empty" id="empty" style="display:none">没有匹配的项目</div>

  <footer>
    数据来源于 weepwood 的 GitHub 公开仓库 · 本页为静态生成，部署于 GitHub Pages
  </footer>
</div>

<script>
const REPOS = ${data};

const langColors = ${JSON.stringify(LANGS)};
const grid = document.getElementById("grid");
const empty = document.getElementById("empty");
const searchEl = document.getElementById("search");
const platformChips = document.getElementById("platformChips");
const langChips = document.getElementById("langChips");

let activePlatform = "全部";
let activeLang = "全部";

document.getElementById("count").textContent = REPOS.length;

const platforms = ["全部", ...Array.from(new Set(REPOS.map(r => r.platform)))];
const langs = ["全部", ...Array.from(new Set(REPOS.map(r => r.language || "其他").filter(Boolean)))];

function renderChips(container, values, active) {
  container.innerHTML = "";
  values.forEach(v => {
    const c = document.createElement("span");
    c.className = "chip" + (v === active ? " active" : "");
    c.textContent = v;
    c.addEventListener("click", () => {
      if (container === platformChips) activePlatform = v;
      else activeLang = v;
      renderAll();
    });
    container.appendChild(c);
  });
}

function renderAll() {
  renderChips(platformChips, platforms, activePlatform);
  renderChips(langChips, langs, activeLang);
  renderGrid();
}

function renderGrid() {
  const q = searchEl.value.trim().toLowerCase();
  const list = REPOS.filter(r => {
    const matchP = activePlatform === "全部" || r.platform === activePlatform;
    const matchL = activeLang === "全部" || (r.language || "其他") === activeLang;
    const matchQ = !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q) || (r.language || "").toLowerCase().includes(q);
    return matchP && matchL && matchQ;
  });
  grid.innerHTML = "";
  empty.style.display = list.length ? "none" : "block";
  list.forEach(r => {
    const color = langColors[r.language] || langColors.null;
    const card = document.createElement("div");
    card.className = "card";
    card.innerHTML = \`
      <h3><a href="\${r.repo}" target="_blank" rel="noopener">\${r.name}</a></h3>
      <p class="desc">\${r.description}</p>
      <div class="tags">
        <span class="tag"><span class="dot" style="background:\${color}"></span>\${r.language || "其他"}</span>
        <span class="plat">\${r.platform}</span>
        <span class="tag">★ \${r.stars}</span>
      </div>
      <div class="actions">
        <a class="btn demo" href="\${r.homepage}" target="_blank" rel="noopener">在线演示</a>
        <a class="btn code" href="\${r.repo}" target="_blank" rel="noopener">源码</a>
      </div>\`;
    grid.appendChild(card);
  });
}

searchEl.addEventListener("input", renderGrid);
renderAll();
</script>
</body>
</html>
`;

fs.writeFileSync("index.html", html, "utf8");
console.log("Wrote index.html with", items.length, "projects");
fs.writeFileSync("projects_data.json", data, "utf8");
