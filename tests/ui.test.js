const test = require('node:test');
const assert = require('node:assert/strict');
const { navigation } = require('../scripts/ui');
const { home } = require('../scripts/portfolio-pages');

test('shared navigation preserves nested paths and names the active page', () => {
  const html = navigation('projects', '../');
  assert.match(html, /aria-current="page" href="\.\.\/catalog.html"/);
  assert.equal((html.match(/aria-current=/g) || []).length, 1);
  assert.match(html, /aria-label="切换明暗主题"/);
  assert.match(html, /aria-hidden="true" focusable="false"/);
});

test('archive overview uses build counts and links to the associated sections', () => {
  const html = home([], 17, 9);
  assert.match(html, /href="status.html">[\s\S]*?<strong>9<\/strong><span>监控网页/);
  assert.match(html, /<strong>17<\/strong><span>收录项目/);
  assert.match(html, /id="selected"/);
});
