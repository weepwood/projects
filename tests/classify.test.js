import test from 'node:test';
import assert from 'node:assert/strict';
import { inferCategory, inferTags, cleanReadmeSummary } from '../src/lib/classify.js';
import { readJson } from '../src/lib/fsx.js';

const taxonomy = readJson('content/projects.json', {}).taxonomy;

test('classification uses the strongest signals, not the first matching rule', () => {
  // Mentions both "dashboard" and "visualization"; visualization is the subject.
  const result = inferCategory(
    { name: 'linear-algebra-viz', description: 'interactive math visualization dashboard' },
    taxonomy,
  );
  assert.equal(result.category, 'learning');
  assert.ok(result.confidence > 0.5);
});

test('name and topics outweigh incidental README words', () => {
  const readmeOnly = inferCategory(
    { name: 'notes', description: 'a small app', readme: 'uses a game loop' },
    taxonomy,
  );
  const named = inferCategory({ name: 'sakana-game', description: 'a small app' }, taxonomy);
  assert.ok(named.scores.games > readmeOnly.scores.games);
  assert.equal(named.category, 'games');
});

test('unknown projects fall back to the default category with low confidence', () => {
  const result = inferCategory({ name: 'zzz', description: '' }, taxonomy);
  assert.equal(result.category, taxonomy.defaultCategory);
  assert.ok(result.confidence < 0.4);
});

test('browser-extension topics add efficiency weight', () => {
  const result = inferCategory({ name: 'tab-thing', topics: ['chrome-extension'] }, taxonomy);
  assert.equal(result.category, 'efficiency');
});

test('tags come from language, topics, dependencies and inferred terms', () => {
  const tags = inferTags({
    name: 'gl',
    description: 'WebGL particle experiment',
    language: 'TypeScript',
    topics: ['visualization'],
    packageJson: { dependencies: { three: '1', '@react-three/fiber': '1' } },
  });
  for (const expected of ['TypeScript', 'visualization', 'Three.js', 'React Three Fiber', 'WebGL']) {
    assert.ok(tags.includes(expected), `expected tag ${expected}`);
  }
  assert.ok(tags.length <= 8);
});

test('README summaries strip code, HTML and images, then take the first sentence', () => {
  const summary = cleanReadmeSummary(
    '# Title\n\n```js\nconst x = 1;\n```\n<img src=x>\n![img](a.png)\n这是第一句。这是第二句。',
  );
  assert.equal(summary, 'Title 这是第一句。');
});
