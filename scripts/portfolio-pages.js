'use strict';
const {icon}=require('./ui');
// Shared case cards and detail pages; URLs are relative to the Pages project root.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const caseUrl = p => `cases/${encodeURIComponent(p.name)}.html`;
function feature(p, i) {
  const e = p.editorial;
  const art = p.name === 'ATab' ? '<div class="windows"><i></i><i></i><i><b>● ● ●</b><em></em><em></em><em></em></i></div>' : `<div class="aperture"><b>${icon('aperture')}</b></div>`;
  return `<article class="feature"><a class="plate plate-${i%2}" href="${caseUrl(p)}" aria-label="查看 ${esc(p.name)} 详情"><span>FIG. ${String(i+1).padStart(2,'0')} / PROJECT STUDY</span>${art}<span class="plate-id">${esc(p.name.toUpperCase())}　＋</span></a><div class="note"><small class="category-chip">${icon(p.name === "ATab" ? "panels-top-left" : "aperture")} ${esc(e.category)}</small><h3><a href="${caseUrl(p)}">${esc(e.title || p.name)} ${icon("arrow-up-right")}</a></h3><p>${esc(p.description)}</p><a href="${esc(p.repo)}#readme">${icon("book-open")} ${esc(e.action || '查看说明')}</a></div></article>`;
}
function home(featured, count, monitored) {
  return `<section class="hero"><div><small class="eyebrow">${icon("square-terminal")}　FIELD NOTES <i></i> 开发者手记</small><h1>项目档案<span>.</span></h1><p>记录个人开发的工具、应用与创意实验。<br>从本地优先的日常工具，到浏览器里的交互探索。</p><div class="actions"><a class="button primary" href="catalog.html">浏览项目目录 ${icon("arrow-right")}</a><a class="button" href="#selected">查看代表作 ${icon("arrow-down")}</a></div></div><figure><small>${icon("scan-line")}　FIG. 00　 /　 TOPOGRAPHIC STUDY</small><img src="assets/terrain.svg" alt="层叠等高线构成的地形图"><figcaption>地形研究　 ·　 生成式线稿 <b>${icon("crosshair")}</b></figcaption></figure></section><div class="archive-strip" aria-label="档案概览">${[["library",count,"收录项目","catalog.html"],["orbit",featured.length,"代表作品","#selected"],["globe",monitored,"监控网页","status.html"]].map(([glyph,n,label,url])=>`<a href="${url}">${icon(glyph)}<strong>${n}</strong><span>${label}</span>${icon("arrow-up-right")}</a>`).join('')}</div><section id="selected"><div class="section-heading"><div><small>01　/　SELECTED WORKS</small><h2>代表作品</h2></div><a href="catalog.html">全部项目 ${icon("arrow-up-right")}</a></div><div class="features">${featured.map(feature).join('')}</div></section>`;
}
function detail(p) {
  const e = p.editorial;
  return `<article class="intro"><small>项目笔记　/　${esc(e.category)}</small><h2>${esc(e.title || p.name)}</h2><p>${esc(p.description)}</p>${p.coverAvailable ? `<img class="case-cover" src="../${esc(p.cover)}" alt="${esc(p.name)} 项目截图">` : e.illustration ? `<img class="case-cover" src="../${esc(e.illustration)}" alt="${esc(p.name)} 使用流程图">` : ''}<h3>适合谁</h3><p>${esc(e.audience)}</p><h3>如何解决</h3><p>${esc(e.approach)}</p><div class="actions"><a class="button primary" href="${esc(p.repo)}#readme">${esc(e.action || '查看说明')} ↗</a>${p.monitorHomepage ? `<a class="button" href="${esc(p.homepage)}">项目信息页 ↗</a>` : ''}</div></article>`;
}
module.exports = { caseUrl, home, detail };
