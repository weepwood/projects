import test from 'node:test';
import assert from 'node:assert/strict';
import { safeHttpUrl, platformOf, hostOf, hostKey, hashBucket } from '../src/lib/url.js';

test('safeHttpUrl only accepts http(s) URLs', () => {
  assert.equal(safeHttpUrl('https://example.com/demo'), 'https://example.com/demo');
  assert.equal(safeHttpUrl('http://example.com'), 'http://example.com/');
  assert.equal(safeHttpUrl('javascript:alert(1)'), null);
  assert.equal(safeHttpUrl('ftp://example.com'), null);
  assert.equal(safeHttpUrl('not a url'), null);
  assert.equal(safeHttpUrl(''), null);
  assert.equal(safeHttpUrl(null), null);
});

test('platformOf recognises the deploy targets that actually appear in the catalog', () => {
  assert.equal(platformOf('https://demo.netlify.app'), 'Netlify');
  assert.equal(platformOf('https://demo.vercel.app'), 'Vercel');
  assert.equal(platformOf('https://weepwood.github.io/projects/'), 'GitHub Pages');
  assert.equal(platformOf('https://demo.pages.dev'), 'Cloudflare Pages');
  assert.equal(platformOf('https://example.com/demo/'), '自定义域名');
  assert.equal(platformOf(null), '未部署');
});

test('hostOf keeps the path and hashBucket is stable', () => {
  assert.equal(hostOf('https://example.com/demo/'), 'example.com/demo');
  assert.equal(hostKey('https://Example.com/'), 'https://example.com');
  assert.equal(hashBucket('ATab', 3), hashBucket('ATab', 3));
  assert.ok(hashBucket('anything', 3) < 3);
});
