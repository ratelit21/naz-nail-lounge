/** Prefix site paths with Astro `base` so GitHub Pages project URLs resolve. */
export function withBase(path: string) {
  if (/^(https?:|tel:|mailto:|data:)/i.test(path)) return path;
  const raw = import.meta.env.BASE_URL || '/';
  const base = raw.endsWith('/') ? raw : `${raw}/`;
  if (path.startsWith('/#')) return `${base.replace(/\/$/, '')}${path}`;
  if (path.startsWith('#')) return path;
  return `${base}${path.replace(/^\//, '')}`;
}
