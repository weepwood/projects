import test from 'node:test';
import assert from 'node:assert/strict';
import { buildProjects, classifyReport } from '../src/lib/merge.js';
import { esc, serializeForInlineScript, cx } from '../src/lib/html.js';

const taxonomy = {
  id: 'taxonomy',
  categories: [
    { id: 'efficiency', label: '效率工具' },
    { id: 'media', label: '媒体管理' },
    { id: 'other', label: '其他项目' },
  ],
  defaultCategory: 'other',
};

const curated = {
  taxonomy,
  featured: [
    {
      fullName: 'owner/tabs',
      order: 1,
      category: 'efficiency',
      title: 'Tabs',
      description: '精选描述',
      poster: { kind: 'browser', tone: 'paper', caption: 'Workspace' },
    },
  ],
  overrides: { 'owner/secret': { hidden: true } },
  exclude: [],
};

const enriched = [
  {
    name: 'tabs',
    fullName: 'owner/tabs',
    description: '来自 GitHub 的描述',
    homepage: 'https://tabs.github.io/',
    repo: 'https://github.com/owner/tabs',
    language: 'TypeScript',
    stars: 3,
    topics: ['chrome-extension'],
    pushedAt: '2026-11-01T00:00:00Z',
    fork: false,
  },
  {
    name: 'photos',
    fullName: 'owner/photos',
    description: 'photo library',
    homepage: 'https://photos.vercel.app/',
    repo: 'https://github.com/owner/photos',
    language: 'Vue',
    stars: 1,
    topics: [],
    pushedAt: '2026-11-10T00:00:00Z',
    fork: false,
  },
  {
    name: 'forked',
    fullName: 'owner/forked',
    description: 'x',
    homepage: 'https://f.test',
    repo: 'https://github.com/owner/forked',
    fork: true,
    pushedAt: '2026-11-11T00:00:00Z',
  },
  {
    name: 'secret',
    fullName: 'owner/secret',
    description: 'x',
    homepage: 'https://s.test',
    repo: 'https://github.com/owner/secret',
    fork: false,
    pushedAt: '2026-11-12T00:00:00Z',
  },
];

const projects = buildProjects({
  enriched,
  health: {
    projects: {
      'owner/tabs': { status: 'online', statusCode: 200, latency: 120, checkedAt: '2026-11-20T00:00:00Z' },
    },
  },
  curated,
  registry: { projects: { 'owner/tabs': { tier: 'A', status: 'developing' } } },
  config: { overrides: {} },
});

test('hidden overrides are removed from the catalog entirely', () => {
  assert.equal(
    projects.some((project) => project.fullName === 'owner/secret'),
    false,
  );
  assert.equal(projects.length, 3);
});

test('projects are sorted newest-first', () => {
  assert.deepEqual(
    projects.map((project) => project.name),
    ['forked', 'photos', 'tabs'],
  );
});

test('curated copy wins over GitHub copy for featured entries', () => {
  const tabs = projects.find((project) => project.fullName === 'owner/tabs');
  assert.equal(tabs.description, '精选描述');
  assert.equal(tabs.featured.title, 'Tabs');
  assert.equal(tabs.categorySource, 'curated');
  assert.equal(tabs.categoryLabel, '效率工具');
  assert.equal(tabs.registry.tier, 'A');
});

test('health falls back to unknown for monitored and not_monitored for forks', () => {
  const tabs = projects.find((project) => project.fullName === 'owner/tabs');
  const photos = projects.find((project) => project.fullName === 'owner/photos');
  const forked = projects.find((project) => project.fullName === 'owner/forked');
  assert.equal(tabs.health.status, 'online');
  assert.equal(photos.health.status, 'unknown');
  assert.equal(forked.health.status, 'not_monitored');
  assert.equal(forked.monitorHomepage, false);
});

test('low-confidence and fallback classifications are reported', () => {
  const report = classifyReport(projects);
  assert.ok(report.every((entry) => entry.confidence < 0.65 || entry.source === 'fallback'));
});

test('esc handles every character that can break markup or attributes', () => {
  assert.equal(esc(`<a href="x">&'`), '&lt;a href=&quot;x&quot;&gt;&amp;&#39;');
  assert.equal(esc(null), '');
  assert.equal(esc(0), '0');
});

test('inline JSON cannot close its script tag', () => {
  const serialized = serializeForInlineScript([{ description: '</script><script>alert(1)</script>' }]);
  assert.equal(serialized.includes('</script>'), false);
  assert.match(serialized, /\\u003c\/script>/);
  assert.deepEqual(JSON.parse(serialized), [{ description: '</script><script>alert(1)</script>' }]);
});

test('cx drops falsy class names', () => {
  assert.equal(cx('a', null, undefined, false, 'b'), 'a b');
});
