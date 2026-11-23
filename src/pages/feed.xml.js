import { loadSiteData, site } from '../data/site.js';
import { esc } from '../lib/html.js';
import { href } from '../lib/paths.js';

/** RSS for projects added or updated recently — the archive's "what's new". */
export async function GET() {
  const { projects } = loadSiteData();
  const items = [...projects]
    .sort((a, b) => String(b.pushedAt).localeCompare(String(a.pushedAt)))
    .slice(0, 30);

  const body = items
    .map((project) => {
      const url = project.homepage ?? project.repo ?? site.url;
      return `    <item>
      <title>${esc(project.name)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="false">${esc(project.fullName)}</guid>
      <pubDate>${new Date(project.pushedAt || Date.now()).toUTCString()}</pubDate>
      <description>${esc(project.description)}</description>
    </item>`;
    })
    .join('\n');

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(site.title)} · 新增项目</title>
    <link>${new URL(href(), site.url).href}</link>
    <description>${esc(site.description)}</description>
    <language>zh-cn</language>
${body}
  </channel>
</rss>
`;

  return new Response(xml, { headers: { 'Content-Type': 'application/rss+xml; charset=utf-8' } });
}
