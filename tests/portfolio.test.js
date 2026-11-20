const test = require('node:test');
const assert = require('node:assert/strict');
const { isListed } = require('../lib/portfolio');
const { decideScreenshot } = require('../lib/automation');
const { check } = require('../scripts/check-health');
const repo = { full_name:'owner/tool', private:false, html_url:'https://github.com/owner/tool' };
const listed = (data, entries={}, exclude=[]) => isListed(data, entries, new Set(exclude));
test('manual inclusion supplements homepage discovery without overriding privacy or exclusion', () => {
  const entries = { [repo.full_name]:{} };
  assert.equal(listed(repo), false);
  assert.equal(listed(repo, entries), true);
  assert.equal(listed({...repo, homepage:'https://example.org'}), true);
  assert.equal(listed({...repo, private:true}, entries), false);
  assert.equal(listed(repo, entries, [repo.full_name]), false);
});
test('source-only tools skip screenshots and health checks', async () => {
  assert.equal(decideScreenshot(repo).capture, false);
  assert.equal((await check(repo)).reason, 'no-homepage');
});
