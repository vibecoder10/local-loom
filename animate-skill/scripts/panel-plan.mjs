// Shared validation for 'split' scene panels (used by build-short.mjs and build-tutorial.mjs). Messages say what to change.
// A panel = kicker, title (+ titleAt, accent), points[{text,at}], stat, icons{items,connector,tint}, image, visual (keycap | timeline).
import fs from 'node:fs';
import path from 'node:path';

export const GLYPHS = new Set(['camera', 'tab', 'film']); // built-in pixel glyphs; any other icon is a Simple Icons brand slug, text:XX makes a text tile
// keycap: a key presses and bursts into pixels. timeline: a playhead sweeps a clip strip, a mistake block is cut, the gap closes.
// tokenize: a word visibly breaks apart into its token pieces (word, pieces[], pieceCount). window: a context-window grid fills
// cell by cell until full (no config - always 10 cells). diskfiles: labelled file tiles fly in and land stacked (files[], up to 4).
// flow: A->B->C boxes with pulsing arrows (steps[], 2-4). beforeafter: one value strikes through into another (before, after).
// compare: two columns with a VS badge (left{label,items}, right{label,items}). cycle: nodes land in a circle, loop arrow spins
// (steps[], 3-4). searchfilter: items scanned in turn, one locks in highlighted (items[], matchIndex, label). network: a hub
// connects to spokes with drawn lines (nodes[], first is the hub). merge: two tiles converge into one (a, b, result). branch:
// a start forks into paths, one locks in chosen (from, paths[], chosen).
const VISUALS = new Set(['keycap', 'timeline', 'tokenize', 'window', 'diskfiles', 'flow', 'beforeafter', 'compare', 'cycle', 'searchfilter', 'network', 'merge', 'branch']);

export function isBrandSlug(icon) { return Boolean(icon) && !GLYPHS.has(icon) && !icon.startsWith('text:'); }

/** Normalises scene s in place; adds brand icon slugs to iconSlugs. `fail` must exit. */
export function validatePanelScene(s, i, { project, fail, iconSlugs }) {
  if (!s.title) fail(`scene ${i}: a split scene needs a title`);
  if (s.visual && !VISUALS.has(s.visual)) fail(`scene ${i}: visual must be one of ${[...VISUALS].join(', ')} (got ${s.visual})`);
  if (s.stat && !s.stat.value) fail(`scene ${i}: stat needs a value (and a label)`);
  const n = (s.points || []).length;
  s.points = (s.points || []).map((p, k) => {
    const q = typeof p === 'string' ? { text: p } : { ...p };
    if (!q.text) fail(`scene ${i}, point ${k}: needs text`);
    // no time given: spread the points across the scene after the transition settles
    if (!(q.at >= s.start)) q.at = Math.round((s.start + 0.6 + (k * (s.end - s.start - 1.2)) / Math.max(1, n)) * 100) / 100;
    if (q.at >= s.end) fail(`scene ${i}, point ${k}: at (${q.at}) must fall before the scene ends (${s.end})`);
    return q;
  });
  if (s.visualAt !== undefined && !(s.visualAt >= s.start && s.visualAt < s.end)) fail(`scene ${i}: visualAt must be inside the scene (${s.start}..${s.end})`);
  const SOLO_VISUALS = new Set(['timeline', 'tokenize', 'window', 'diskfiles', 'flow', 'beforeafter', 'compare', 'cycle', 'searchfilter', 'network', 'merge', 'branch']);
  if (SOLO_VISUALS.has(s.visual) && (s.points.length || s.stat)) fail(`scene ${i}: the ${s.visual} visual fills the panel; drop points/stat or use keycap`);
  if (s.titleAt !== undefined && !(Array.isArray(s.titleAt) && s.titleAt.every((v) => v === null || (v >= s.start && v < s.end)))) fail(`scene ${i}: titleAt must be a list of seconds inside the scene (${s.start}..${s.end}), one per title word (null to use the default stagger)`);
  if (s.icons) {
    const ic = s.icons;
    if (!Array.isArray(ic.items) || ic.items.length < 1 || ic.items.length > 5) fail(`scene ${i}: icons.items needs 1 to 5 tiles ({icon, label, at})`);
    if (ic.connector && !['plus', 'arrow', 'none'].includes(ic.connector)) fail(`scene ${i}: icons.connector must be plus, arrow or none`);
    if (s.visual || s.image || s.points.length > 2) fail(`scene ${i}: icons share the panel with at most a stat or two points; drop the visual/image or the extra points`);
    ic.items.forEach((it, k) => {
      if (!it.icon) fail(`scene ${i}, icon ${k}: needs icon (a Simple Icons slug like googlechrome, a glyph: camera | tab | film, or text:Aa)`);
      if (it.at !== undefined && !(it.at >= s.start && it.at < s.end)) fail(`scene ${i}, icon ${k}: at (${it.at}) must fall inside the scene (${s.start}..${s.end})`);
      if (isBrandSlug(it.icon)) iconSlugs.add(it.icon);
    });
  }
  if (s.image) {
    if (!s.image.src) fail(`scene ${i}: image needs src (a local file path)`);
    const from = path.resolve(project, s.image.src);
    if (!fs.existsSync(from)) fail(`scene ${i}: image ${s.image.src} not found (paths are relative to the project folder)`);
    fs.mkdirSync(path.join(project, 'assets/images'), { recursive: true });
    const to = path.join(project, 'assets/images', path.basename(from));
    if (path.resolve(from) !== path.resolve(to)) fs.copyFileSync(from, to);
    s.image.src = 'assets/images/' + path.basename(from);
  }
}
