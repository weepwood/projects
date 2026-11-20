'use strict';
// Shared case cards and detail pages; URLs are relative to the Pages project root.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const caseUrl = p => `cases/${encodeURIComponent(p.name)}.html`;
function feature(p, i) {
  const e = p.editorial;
  return `<article class="feature">${e.illustration ? `<img class="case-cover" src="${esc(e.illustration)}" alt="${esc(p.name)} 使用流程图">` : ''}<small>作品 ${String(i + 1).padStart(2,'0')}　/　${esc(e.category)}</small><h3><a href="${caseUrl(p)}">${esc(e.title || p.name)}</a></h3><p>${esc(p.description)}</p><a href="${esc(p.repo)}#readme">${esc(e.action || '查看说明')} ↗</a></article>`;
}
function home(featured, count) {
  return `<section class="intro"><small>WEEPWOOD　/　PROJECT COLLECTION</small><h2>个人作品集</h2><p>从本地优先的日常工具，到可以在浏览器里动手体验的实验。</p><a class="button primary" href="catalog.html">浏览全部 ${count} 个项目 →</a></section><section><h2>代表作品</h2><div class="features">${featured.map(feature).join('')}</div></section>`;
}
function detail(p) {
  const e = p.editorial;
  return `<article class="intro"><small>项目笔记　/　${esc(e.category)}</small><h2>${esc(e.title || p.name)}</h2><p>${esc(p.description)}</p>${p.coverAvailable ? `<img class="case-cover" src="../${esc(p.cover)}" alt="${esc(p.name)} 项目截图">` : e.illustration ? `<img class="case-cover" src="../${esc(e.illustration)}" alt="${esc(p.name)} 使用流程图">` : ''}<h3>适合谁</h3><p>${esc(e.audience)}</p><h3>如何解决</h3><p>${esc(e.approach)}</p><div class="actions"><a class="button primary" href="${esc(p.repo)}#readme">${esc(e.action || '查看说明')} ↗</a>${p.monitorHomepage ? `<a class="button" href="${esc(p.homepage)}">项目信息页 ↗</a>` : ''}</div></article>`;
}
module.exports = { caseUrl, home, detail };
