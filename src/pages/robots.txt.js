import { site } from '../data/site.js';
import { href } from '../lib/paths.js';

export async function GET() {
  const sitemap = new URL(href('sitemap-index.xml'), site.url).href;
  const body = `User-agent: *\nAllow: /\n\nSitemap: ${sitemap}\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
