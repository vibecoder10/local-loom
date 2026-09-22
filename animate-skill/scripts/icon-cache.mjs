// Real brand icons for /animate: Simple Icons (CC0 SVG paths; the marks themselves are their owners' trademarks, so use them
// to name the product you are talking about, nothing more). First use fetches from the Simple Icons CDN and caches the SVG in
// <skill>/assets/icons/<slug>.svg, so later renders work offline.
// Usage (library): import { getIcon } from './icon-cache.mjs';  await getIcon('googlechrome') -> { slug, d, viewBox, color, title }
// CLI: node icon-cache.mjs <slug> [slug ...]   (find slugs at https://simpleicons.org: "Google Chrome" is googlechrome, "Apple" is apple)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(skillRoot, 'assets/icons');

export async function getIcon(slug) {
  if (!/^[a-z0-9]+$/.test(slug)) throw new Error(`icon slug "${slug}" must be lowercase letters and digits (Simple Icons slug, e.g. googlechrome)`);
  fs.mkdirSync(cacheDir, { recursive: true });
  const file = path.join(cacheDir, `${slug}.svg`);
  if (!fs.existsSync(file)) {
    const res = await fetch(`https://cdn.simpleicons.org/${slug}`);
    if (!res.ok) throw new Error(`no Simple Icons brand mark called "${slug}" (HTTP ${res.status}). Look up the slug at simpleicons.org, or use a text tile: icon "text:Aa".`);
    fs.writeFileSync(file, await res.text());
  }
  const svg = fs.readFileSync(file, 'utf8');
  const d = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  if (!d) throw new Error(`cached icon ${file} has no <path>`);
  return {
    slug, d,
    viewBox: svg.match(/viewBox="([^"]+)"/)?.[1] || '0 0 24 24',
    color: svg.match(/<svg[^>]*\sfill="(#[0-9a-fA-F]{3,8})"/)?.[1] || '#161819',
    title: svg.match(/<title>([^<]*)<\/title>/)?.[1] || slug,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const slugs = process.argv.slice(2);
  if (!slugs.length) { console.error('usage: node icon-cache.mjs <simple-icons-slug> [...]'); process.exit(1); }
  for (const s of slugs) { try { const i = await getIcon(s); console.log(`${s}: ${i.title} ${i.color} cached at ${path.join(cacheDir, s + '.svg')}`); } catch (e) { console.error(`${s}: ${e.message}`); process.exitCode = 1; } }
}
