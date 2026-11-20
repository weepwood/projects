'use strict';
const fs = require('node:fs');
const path = require('node:path');
const cache = new Map();
// Only developer-supplied names; inline Lucide at build time for currentColor and offline use.
function icon(name) {
  if (!cache.has(name)) {
    const source = fs.readFileSync(path.join(__dirname, '../assets/lucide', `${name}.svg`), 'utf8');
    cache.set(name, source.slice(source.indexOf('<svg')).trim().replace('<svg', '<svg aria-hidden="true" focusable="false"'));
  }
  return cache.get(name);
}
const pages = [
  ['home', 'index.html', 'compass', '作品集'], ['projects', 'catalog.html', 'library', '项目目录'],
  ['status', 'status.html', 'activity', '当前状态'], ['history', 'history.html', 'history', '历史状态'],
];
function navigation(active, prefix) {
  return `<nav class="nav" aria-label="主导航">${pages.map(([id, url, glyph, label]) => `<a ${active === id ? 'class="active" aria-current="page"' : ''} href="${prefix}${url}">${icon(glyph)}${label}</a>`).join('')}<button aria-label="切换明暗主题" title="切换明暗主题" id="theme" class="theme">${icon('sun-moon')}</button></nav>`;
}
module.exports = { icon, navigation };
