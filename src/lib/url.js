/**
 * URL helpers shared by the CLI pipeline and the site build.
 * Everything that leaves this module is either a validated http(s) URL or null:
 * a javascript: homepage in repos_raw.json must never reach an href.
 */

export function safeHttpUrl(value) {
  if (typeof value !== 'string' || !value.trim()) return null;
  try {
    const url = new URL(value.trim());
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

const PLATFORMS = [
  ['Netlify', /(^|\.)netlify\.app$/],
  ['Vercel', /(^|\.)vercel\.app$/],
  ['GitHub Pages', /(^|\.)github\.io$/],
  ['Cloudflare Pages', /(^|\.)pages\.dev$/],
  ['Render', /(^|\.)onrender\.com$/],
  ['Railway', /(^|\.)up\.railway\.app$/],
  ['Firebase', /(^|\.)(web\.app|firebaseapp\.com)$/],
  ['Hugging Face', /(^|\.)hf\.space$/],
];

export function platformOf(value) {
  const url = safeHttpUrl(value);
  if (!url) return '未部署';
  const hostname = new URL(url).hostname.toLowerCase();
  for (const [name, pattern] of PLATFORMS) if (pattern.test(hostname)) return name;
  return '自定义域名';
}

export function hostOf(value) {
  const url = safeHttpUrl(value);
  if (!url) return '';
  const parsed = new URL(url);
  const pathname = parsed.pathname === '/' ? '' : parsed.pathname.replace(/\/$/, '');
  return `${parsed.host}${pathname}`;
}

/** Normalized key for duplicate-homepage detection. */
export function hostKey(value) {
  const url = safeHttpUrl(value);
  return url ? url.replace(/\/$/, '').toLowerCase() : '';
}

/** Stable 0..n-1 bucket for a string, used for deterministic placeholder tones. */
export function hashBucket(value, buckets) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.codePointAt(0)) >>> 0;
  return hash % Math.max(1, buckets);
}
