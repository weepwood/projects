/**
 * Internal links must work both at localhost/ (dev) and at
 * https://weepwood.github.io/projects/ (Pages). Astro exposes the configured
 * `base` as import.meta.env.BASE_URL; every internal URL goes through here so
 * there is exactly one place that knows about the subpath.
 */
const BASE = import.meta.env?.BASE_URL ?? '/';

export function href(path = '') {
  const clean = String(path).replace(/^\/+/, '');
  return `${BASE}${clean}`.replace(/\/{2,}/g, '/');
}

/** Link to an asset that lives in public/. */
export function asset(path) {
  return href(path);
}
