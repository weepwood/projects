'use strict';
const {icon}=require('./ui');
// Shared case cards and detail pages; URLs are relative to the Pages project root.
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const caseUrl = p => `cases/${encodeURIComponent(p.name)}.html`;
function feature(p, i) {
  const e = p.editorial;
  const tab=p.name==='ATab';
  const art=tab?`<div class="browser"><small>● ● ●　 /　WORKSPACE</small><strong>Workspace<span>.</span></strong><i>▤　 Research tabs</i><i>▦　 Saved sessions</i></div>`:`<div class="lens">${icon('aperture')}</div>`;
  return `<article class="feature"><a class="poster ${tab?'peach':'lilac'}" href="${caseUrl(p)}" aria-label="查看 ${esc(p.name)} 详情"><small>PROJECT　/　${String(i+1).padStart(2,'0')}</small>${art}<b>${icon('arrow-up-right')}</b></a><div class="note"><small>${esc(e.category)}</small><h3><a href="${caseUrl(p)}">${esc(e.title||p.name)}</a></h3><p>${esc(p.description)}</p><a href="${esc(p.repo)}#readme">${esc(e.action||'查看说明')} ↗</a></div></article>`;
}
function home(featured,count,monitored){
  return `<section class="hero"><div class="lead"><small class="kicker">INDEPENDENT DEVELOPER PORTFOLIO</small><h1>Project<br><em>Index</em><span>.</span></h1><p>个人项目索引 <i>/</i> 工具、应用与创意实验。</p><div class="actions"><a class="button primary" href="catalog.html">浏览项目目录 ${icon('arrow-right')}</a><a class="text-link" href="#selected">查看代表作 ↓</a></div></div><figure><div class="coordinates">FORM STUDIES　 /　 001</div><img src="assets/fold.svg" alt="朱红色折纸环形雕塑"><figcaption><span>PLATE 01</span>　 Folded Orbit <b>＋</b></figcaption></figure></section><section id="selected"><div class="section-heading"><div><small class="kicker">CURATED SELECTION　 /　 01</small><h2>Selected <em>work</em><span>.</span></h2></div><a href="catalog.html">全部项目 (${count}) ${icon('arrow-up-right')}</a></div><div class="features">${featured.map(feature).join('')}</div></section><aside class="archive-strip" aria-label="档案概览">${[[count,'收录项目','catalog.html'],[featured.length,'代表作品','#selected'],[monitored,'监控网页','status.html']].map(([n,label,url])=>`<a href="${url}"><strong>${n}</strong><span>${label}</span> ↗</a>`).join('')}</aside>`;
}
function detail(p) {
  const e = p.editorial;
  return `<article class="intro"><small>项目笔记　/　${esc(e.category)}</small><h2>${esc(e.title || p.name)}</h2><p>${esc(p.description)}</p>${p.coverAvailable ? `<img class="case-cover" src="../${esc(p.cover)}" alt="${esc(p.name)} 项目截图">` : e.illustration ? `<img class="case-cover" src="../${esc(e.illustration)}" alt="${esc(p.name)} 使用流程图">` : ''}<h3>适合谁</h3><p>${esc(e.audience)}</p><h3>如何解决</h3><p>${esc(e.approach)}</p><div class="actions"><a class="button primary" href="${esc(p.repo)}#readme">${esc(e.action || '查看说明')} ↗</a>${p.monitorHomepage ? `<a class="button" href="${esc(p.homepage)}">项目信息页 ↗</a>` : ''}</div></article>`;
}
module.exports = { caseUrl, home, detail };
