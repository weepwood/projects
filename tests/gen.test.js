"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");

const {
  buildHtml,
  hostOf,
  normalizeRepos,
  platformOf,
  safeHttpUrl,
  serializeForInlineScript,
} = require("../gen");

test("safeHttpUrl only accepts HTTP(S) URLs", () => {
  assert.equal(safeHttpUrl("https://example.com/demo"), "https://example.com/demo");
  assert.equal(safeHttpUrl("http://example.com"), "http://example.com/");
  assert.equal(safeHttpUrl("javascript:alert(1)"), null);
  assert.equal(safeHttpUrl("ftp://example.com"), null);
  assert.equal(safeHttpUrl("not a url"), null);
});

test("platform and host detection handle common deployment providers", () => {
  assert.equal(platformOf("https://demo.netlify.app"), "Netlify");
  assert.equal(platformOf("https://demo.vercel.app"), "Vercel");
  assert.equal(platformOf("https://weepwood.github.io/projects/"), "GitHub Pages");
  assert.equal(platformOf("https://example.com/demo/"), "自定义");
  assert.equal(hostOf("https://example.com/demo/"), "example.com/demo");
});

test("normalizeRepos filters unsafe links and sorts newest projects first", () => {
  const items = normalizeRepos([
    {
      name: "old",
      full_name: "weepwood/old",
      description: null,
      homepage: "https://old.example.com",
      html_url: "https://github.com/weepwood/old",
      language: null,
      stargazers_count: 2,
      updated_at: "2025-01-01T00:00:00Z",
    },
    {
      name: "unsafe",
      homepage: "javascript:alert(1)",
      html_url: "https://github.com/weepwood/unsafe",
      updated_at: "2026-01-01T00:00:00Z",
    },
    {
      name: "new",
      full_name: "weepwood/new",
      description: "Newest",
      homepage: "https://new.vercel.app",
      html_url: "https://github.com/weepwood/new",
      language: "TypeScript",
      stargazers_count: 5,
      updated_at: "2026-01-01T00:00:00Z",
    },
  ]);

  assert.equal(items.length, 2);
  assert.equal(items[0].name, "new");
  assert.equal(items[0].platform, "Vercel");
  assert.equal(items[1].description, "暂无描述");
});

test("inline JSON serialization prevents script tag breakout", () => {
  const serialized = serializeForInlineScript([
    { description: "</script><script>alert(1)</script>" },
  ]);

  assert.equal(serialized.includes("</script>"), false);
  assert.match(serialized, /\\u003c\/script>/);
});

test("generated page includes accessible controls and safe DOM rendering", () => {
  const html = buildHtml([
    {
      name: "demo",
      fullName: "weepwood/demo",
      description: "Demo project",
      homepage: "https://demo.example.com/",
      repo: "https://github.com/weepwood/demo",
      language: "JavaScript",
      stars: 1,
      updated: "2026-07-12",
      platform: "自定义",
      host: "demo.example.com",
    },
  ]);

  assert.match(html, /id="platformFilter"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /createElement\("article", "card"\)/);
  assert.equal(html.includes("card.innerHTML"), false);
});
