"use strict";

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const projects = readJson(path.join(ROOT, "projects_enriched.json"), []);
const health = readJson(path.join(ROOT, "health_data.json"), { projects: {} });
const config = readJson(path.join(ROOT, "automation.config.json"), {});
const generatedAt = new Date().toISOString();

function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, "utf8")); } catch { return fallback; }
}
function inline(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]));
}

const items = projects.map((project) => {
  const status = health.projects?.[project.fullName] || { status: "unknown", latency: null };
  const coverExists = fs.existsSync(path.join(ROOT, project.cover || ""));
  return { ...project, health: status, coverAvailable: coverExists };
});
const featured = items
  .filter((item) => !item.archived && !item.fork && !["offline"].includes(item.health.status))
  .sort((a, b) => b.recommendationScore - a.recommendationScore)
  .slice(0, Number(config.featuredCount) || 6);
const stats = items.reduce((result, item) => {
  result.total += 1;
  if (["online", "recovered"].includes(item.health.status)) result.online += 1;
  if (["unstable", "degraded"].includes(item.health.status)) result.warning += 1;
  if (item.health.status === "offline") result.offline += 1;
  result.categories.add(item.category);
  return result;
}, { total: 0, online: 0, warning: 0, offline: 0, categories: new Set() });

const featuredHtml = featured.map((project) => `
<article class="featured-card">
  ${project.coverAvailable ? `<img src="${escapeHtml(project.cover)}" alt="${escapeHtml(project.name)} 项目截图" loading="lazy">` : `<div class="cover-fallback">${escapeHtml(project.name.slice(0, 1).toUpperCase())}</div>`}
  <div class="featured-body">
    <div class="eyebrow">${escapeHtml(project.category)} · ${escapeHtml(project.platform)}</div>
    <h2>${escapeHtml(project.name)}</h2>
    <p>${escapeHtml(project.description)}</p>
    <div class="tags">${project.tags.slice(0, 4).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>
    <div class="actions"><a class="button primary" href="${escapeHtml(project.homepage)}" target="_blank" rel="noopener noreferrer">在线体验</a><a class="button" href="${escapeHtml(project.repo)}" target="_blank" rel="noopener noreferrer">源码</a></div>
  </div>
</article>`).join("");

const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="description" content="weepwood 的项目目录：自动发现、分类、截图并监控所有具有在线演示地址的项目。">
<meta name="color-scheme" content="light dark">
<meta http-equiv="Content-Security-Policy" content="default-src 'self'; img-src 'self' data:; style-src 'unsafe-inline'; script-src 'unsafe-inline'; connect-src 'none'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests">
<title>weepwood Projects</title>
<style>
:root{color-scheme:light;--bg:#f6f8fa;--surface:#fff;--surface-soft:rgba(255,255,255,.86);--border:#d8dee4;--text:#1f2328;--muted:#656d76;--accent:#0969da;--accent-soft:#ddf4ff;--shadow:0 8px 26px rgba(31,35,40,.08)}
:root[data-theme="dark"]{color-scheme:dark;--bg:#0d1117;--surface:#161b22;--surface-soft:rgba(22,27,34,.88);--border:#30363d;--text:#f0f6fc;--muted:#8b949e;--accent:#58a6ff;--accent-soft:rgba(56,139,253,.16);--shadow:0 10px 30px rgba(0,0,0,.3)}
@media(prefers-color-scheme:dark){:root:not([data-theme="light"]){color-scheme:dark;--bg:#0d1117;--surface:#161b22;--surface-soft:rgba(22,27,34,.88);--border:#30363d;--text:#f0f6fc;--muted:#8b949e;--accent:#58a6ff;--accent-soft:rgba(56,139,253,.16);--shadow:0 10px 30px rgba(0,0,0,.3)}}
*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0,var(--accent-soft),transparent 32rem),var(--bg);color:var(--text);font-family:-apple-system,BlinkMacSystemFont,"Segoe UI","Noto Sans SC",sans-serif;line-height:1.5}.wrap{width:min(1240px,100%);margin:auto;padding:42px 22px 72px}.hero{display:grid;grid-template-columns:1fr auto;gap:24px;align-items:start;margin-bottom:28px}.hero h1{font-size:clamp(30px,6vw,58px);letter-spacing:-.055em;margin:0}.hero p{max-width:720px;color:var(--muted);font-size:16px}.theme{width:42px;height:42px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--text);cursor:pointer}.stats{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:24px 0 34px}.stat{padding:16px;border:1px solid var(--border);border-radius:16px;background:var(--surface-soft);box-shadow:var(--shadow)}.stat strong{display:block;font-size:25px}.stat span{color:var(--muted);font-size:13px}.section-title{display:flex;justify-content:space-between;align-items:end;margin:30px 0 14px}.section-title h2{margin:0;font-size:22px}.section-title p{margin:0;color:var(--muted);font-size:13px}.featured{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px}.featured-card{display:grid;grid-template-columns:46% 1fr;overflow:hidden;border:1px solid var(--border);border-radius:20px;background:var(--surface);box-shadow:var(--shadow)}.featured-card img,.cover-fallback{width:100%;height:100%;min-height:250px;object-fit:cover;background:linear-gradient(145deg,var(--accent-soft),var(--surface));display:grid;place-items:center;font-size:64px;font-weight:800;color:var(--accent)}.featured-body{padding:20px;display:flex;flex-direction:column}.eyebrow{font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.08em}.featured-body h2{margin:6px 0;font-size:21px}.featured-body p{margin:0 0 14px;color:var(--muted);font-size:13.5px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.tags{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto}.tags span,.badge{font-size:11px;padding:3px 8px;border-radius:999px;border:1px solid var(--border);background:var(--bg)}.actions{display:flex;gap:8px;margin-top:14px}.button{display:inline-grid;place-items:center;min-height:38px;padding:8px 12px;border:1px solid var(--border);border-radius:10px;color:var(--text);text-decoration:none;font-size:13px;font-weight:650}.button.primary{background:var(--accent);border-color:var(--accent);color:white}.controls{position:sticky;top:10px;z-index:10;display:grid;grid-template-columns:2fr repeat(3,1fr) auto;gap:10px;padding:12px;border:1px solid var(--border);border-radius:17px;background:var(--surface-soft);backdrop-filter:blur(18px);box-shadow:var(--shadow)}input,select,button{font:inherit}.control{min-height:46px;border:1px solid var(--border);border-radius:10px;background:var(--surface);color:var(--text);padding:0 12px}.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));gap:15px;margin-top:15px}.card{display:flex;flex-direction:column;min-height:330px;overflow:hidden;border:1px solid var(--border);border-radius:17px;background:var(--surface);box-shadow:var(--shadow)}.card-cover{height:160px;background:linear-gradient(145deg,var(--accent-soft),var(--surface));object-fit:cover;width:100%}.card-cover-fallback{height:160px;display:grid;place-items:center;background:linear-gradient(145deg,var(--accent-soft),var(--surface));font-size:44px;font-weight:800;color:var(--accent)}.card-body{display:flex;flex-direction:column;flex:1;padding:16px}.card-head{display:flex;justify-content:space-between;gap:10px}.card h3{margin:0;font-size:17px}.card p{color:var(--muted);font-size:13px;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:3;overflow:hidden}.meta{display:flex;flex-wrap:wrap;gap:8px;color:var(--muted);font-size:11px;margin-top:auto}.status{display:inline-flex;align-items:center;gap:5px}.status::before{content:"";width:7px;height:7px;border-radius:50%;background:#8c959f}.status.online::before,.status.recovered::before{background:#1a7f37}.status.unstable::before,.status.degraded::before{background:#bf8700}.status.offline::before{background:#cf222e}.summary{color:var(--muted);font-size:13px;margin:12px 2px}.empty{display:none;padding:54px;text-align:center;color:var(--muted)}footer{margin-top:46px;text-align:center;color:var(--muted);font-size:12px}@media(max-width:900px){.featured{grid-template-columns:1fr}.controls{grid-template-columns:1fr 1fr}.controls input{grid-column:1/-1}}@media(max-width:640px){.wrap{padding:26px 14px 52px}.stats{grid-template-columns:1fr 1fr}.featured-card{grid-template-columns:1fr}.featured-card img,.cover-fallback{min-height:190px}.controls{position:static;grid-template-columns:1fr}.controls input{grid-column:auto}.hero{grid-template-columns:1fr auto}}
</style>
</head>
<body><div class="wrap">
<header class="hero"><div><h1>weepwood Projects</h1><p>自动发现、理解、分类、截图并监控我的在线项目。数据来自 GitHub，页面会随仓库变化自动更新。</p></div><button id="theme" class="theme" aria-label="切换主题">◐</button></header>
<section class="stats"><div class="stat"><strong>${stats.total}</strong><span>在线项目</span></div><div class="stat"><strong>${stats.online}</strong><span>运行正常</span></div><div class="stat"><strong>${stats.categories.size}</strong><span>项目分类</span></div><div class="stat"><strong>${stats.warning + stats.offline}</strong><span>需要关注</span></div></section>
<section><div class="section-title"><div><h2>自动精选</h2><p>根据活跃度、完整度、在线状态和项目多样性自动计算</p></div></div><div class="featured">${featuredHtml}</div></section>
<section><div class="section-title"><div><h2>全部项目</h2><p>截图仅在检测到新提交且距离上次截图满 10 天时更新</p></div></div>
<div class="controls"><input class="control" id="search" type="search" placeholder="搜索名称、描述、标签或技术栈"><select class="control" id="category"></select><select class="control" id="status"></select><select class="control" id="sort"><option value="recommendation">自动推荐</option><option value="recent">最近提交</option><option value="stars">Stars</option><option value="name">名称</option></select><button class="control" id="reset">重置</button></div><div id="summary" class="summary"></div><div id="grid" class="grid"></div><div id="empty" class="empty">没有匹配的项目</div></section>
<footer>目录生成于 ${escapeHtml(generatedAt)} · 状态检测与截图更新均由 GitHub Actions 自动执行</footer>
</div>
<script>
"use strict";
const PROJECTS=${inline(items)};
const $=(id)=>document.getElementById(id);const els={grid:$("grid"),search:$("search"),category:$("category"),status:$("status"),sort:$("sort"),reset:$("reset"),summary:$("summary"),empty:$("empty"),theme:$("theme")};
function option(select,label,values){select.innerHTML=["全部",...values].map(v=>'<option value="'+v.replaceAll('"','&quot;')+'">'+(v==="全部"?"全部"+label:v)+'</option>').join("")}
option(els.category,"分类",[...new Set(PROJECTS.map(p=>p.category))].sort((a,b)=>a.localeCompare(b,"zh-CN")));option(els.status,"状态",["online","recovered","unstable","degraded","offline","unknown"]);
function e(tag,cls,text){const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n}
function link(url,cls,text){const a=e("a",cls,text);a.href=url;a.target="_blank";a.rel="noopener noreferrer";return a}
function card(p){const article=e("article","card");if(p.coverAvailable){const img=e("img","card-cover");img.src=p.cover;img.alt=p.name+" 项目截图";img.loading="lazy";article.append(img)}else{article.append(e("div","card-cover-fallback",p.name.slice(0,1).toUpperCase()))}const body=e("div","card-body");const head=e("div","card-head");head.append(e("h3","",p.name),e("span","badge",p.category));const desc=e("p","",p.description);const tags=e("div","tags");p.tags.slice(0,4).forEach(t=>tags.append(e("span","",t)));const meta=e("div","meta");const status=e("span","status "+p.health.status,p.health.status+(p.health.latency?" · "+p.health.latency+"ms":""));meta.append(status,e("span","",p.platform),e("span","","★ "+p.stars),e("span","","更新 "+String(p.pushedAt||p.updatedAt).slice(0,10)));const actions=e("div","actions");actions.append(link(p.homepage,"button primary","在线体验"),link(p.repo,"button","源码"));body.append(head,desc,tags,meta,actions);article.append(body);return article}
function render(){const q=els.search.value.trim().toLocaleLowerCase("zh-CN");let list=PROJECTS.filter(p=>{const text=[p.name,p.description,p.category,p.language,...p.tags].join(" ").toLocaleLowerCase("zh-CN");return(!q||text.includes(q))&&(els.category.value==="全部"||p.category===els.category.value)&&(els.status.value==="全部"||p.health.status===els.status.value)});list.sort((a,b)=>els.sort.value==="recent"?String(b.pushedAt).localeCompare(String(a.pushedAt)):els.sort.value==="stars"?b.stars-a.stars:els.sort.value==="name"?a.name.localeCompare(b.name,"zh-CN"):b.recommendationScore-a.recommendationScore);const f=document.createDocumentFragment();list.forEach(p=>f.append(card(p)));els.grid.replaceChildren(f);els.summary.textContent="显示 "+list.length+" / "+PROJECTS.length+" 个项目";els.empty.style.display=list.length?"none":"block";els.grid.hidden=!list.length}
[els.search,els.category,els.status,els.sort].forEach(el=>el.addEventListener(el===els.search?"input":"change",render));els.reset.addEventListener("click",()=>{els.search.value="";els.category.value="全部";els.status.value="全部";els.sort.value="recommendation";render()});function applyTheme(value){if(value)document.documentElement.dataset.theme=value;else delete document.documentElement.dataset.theme}els.theme.addEventListener("click",()=>{const dark=document.documentElement.dataset.theme==="dark"||(!document.documentElement.dataset.theme&&matchMedia("(prefers-color-scheme: dark)").matches);const next=dark?"light":"dark";localStorage.setItem("theme",next);applyTheme(next)});applyTheme(localStorage.getItem("theme"));render();
</script></body></html>`;

fs.writeFileSync(path.join(ROOT, "index.html"), html, "utf8");
fs.writeFileSync(path.join(ROOT, "projects_data.json"), `${JSON.stringify(items, null, 2)}\n`, "utf8");
console.log(`Built site with ${items.length} projects and ${featured.length} featured projects.`);
