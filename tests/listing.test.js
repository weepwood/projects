import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isListed,
  shouldMonitorProject,
  findDuplicateHomepages,
  selectFeatured,
} from '../src/lib/listing.js';

const repo = { full_name: 'owner/tool', private: false, html_url: 'https://github.com/owner/tool' };
const listed = (data, curated = {}, exclude = []) => isListed(data, curated, new Set(exclude));

test('manual inclusion supplements homepage discovery without overriding privacy', () => {
  const curated = { [repo.full_name]: {} };
  assert.equal(listed(repo), false, 'no homepage and no curation');
  assert.equal(listed(repo, curated), true);
  assert.equal(listed({ ...repo, homepage: 'https://example.org' }), true);
  assert.equal(listed({ ...repo, private: true }, curated), false);
  assert.equal(listed(repo, curated, [repo.full_name]), false);
  assert.equal(listed({ ...repo, html_url: 'javascript:alert(1)' }, curated), false);
});

test('forks and homepage-less tools are not monitored', () => {
  assert.equal(shouldMonitorProject({ fork: true, homepage: 'https://example.com' }), false);
  assert.equal(shouldMonitorProject({ fork: false, homepage: 'javascript:x' }), false);
  assert.equal(shouldMonitorProject({ fork: false, homepage: 'https://example.com' }), true);
});

test('duplicate homepages ignore forks and trailing slashes', () => {
  const projects = [
    { fullName: 'a/a', homepage: 'https://example.com/' },
    { fullName: 'a/b', homepage: 'https://example.com' },
    { fullName: 'a/c', homepage: 'https://example.com', fork: true },
    { fullName: 'a/d', homepage: 'https://other.test' },
  ];
  const duplicates = findDuplicateHomepages(projects);
  assert.equal(duplicates.length, 1);
  assert.deepEqual(duplicates[0].projects, ['a/a', 'a/b']);
});

test('featured selection is ordered, excludes forks and ignores unordered entries', () => {
  const featured = selectFeatured([
    { fullName: 'a/b', featured: { order: 2 }, fork: false },
    { fullName: 'a/a', featured: { order: 1 }, fork: false },
    { fullName: 'a/c', featured: { order: 3 }, fork: true },
    { fullName: 'a/d', featured: null, fork: false },
  ]);
  assert.deepEqual(
    featured.map((project) => project.fullName),
    ['a/a', 'a/b'],
  );
});
