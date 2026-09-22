// Build a tutorial project's index.html from scene-plan.json + the take package's words.
// Usage: node build-tutorial.mjs <project-dir>
// Reads:  <project>/scene-plan.json, <project>/take/manifest.json, <project>/take/words.remapped.json
// Writes: <project>/index.html, <project>/captions.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIcon } from './icon-cache.mjs';
import { validatePanelScene, isBrandSlug } from './panel-plan.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.resolve(process.argv[2] || '.');
const read = (p) => JSON.parse(fs.readFileSync(path.join(project, p), 'utf8'));
const fail = (m) => { console.error('build-tutorial: ' + m); process.exit(1); };
for (const f of ['scene-plan.json', 'take/manifest.json', 'take/words.remapped.json']) if (!fs.existsSync(path.join(project, f))) fail(`missing ${f} (run scaffold-tutorial.mjs first)`);

const manifest = read('take/manifest.json');
const words = read('take/words.remapped.json');
const plan = read('scene-plan.json');
const screen = manifest.media?.screen; const camera = manifest.media?.camera;
if (!screen || !camera) fail('the take package needs both screen and camera clips for a tutorial');
const duration = Number(manifest.duration?.finished);
if (!(duration > 0)) fail('manifest.duration.finished is missing');

// ---- plan: defaults + validation with messages that say what to change ----
plan.scenes = (plan.scenes || []).map((s) => ({ ...s })).sort((a, b) => a.start - b.start);
plan.overlays = plan.overlays || [];
if (!plan.scenes.length) plan.scenes = [{ type: 'screen', start: 0, end: duration }];
const SCENES = new Set(['screen', 'presenter', 'split']);
const iconSlugs = new Set();
plan.scenes.forEach((s, i) => {
  if (!SCENES.has(s.type)) fail(`scene ${i}: type must be screen, presenter or split (got ${s.type})`);
  if (!(s.start >= 0 && s.end > s.start && s.end <= duration + 0.05)) fail(`scene ${i}: start/end must be seconds inside 0..${duration} (got ${s.start}..${s.end})`);
  if (i === 0 && s.start !== 0) fail('the first scene must start at 0');
  if (i > 0 && Math.abs(s.start - plan.scenes[i - 1].end) > 0.05) fail(`scene ${i} must start where scene ${i - 1} ends (${plan.scenes[i - 1].end})`);
  if (s.type === 'split') validatePanelScene(s, i, { project, fail, iconSlugs });
});
const unit = (v) => typeof v === 'number' && v >= 0 && v <= 1;
plan.overlays.forEach((o, i) => {
  if (!['chapter', 'callout', 'zoom', 'logo', 'stat'].includes(o.type)) fail(`overlay ${i}: type must be chapter, callout, zoom, logo or stat`);
  if (!(o.at >= 0 && o.duration > 0.8 && o.at + o.duration <= duration + 0.05)) fail(`overlay ${i}: needs at >= 0, duration > 0.8 and at+duration <= ${duration}`);
  if (o.type === 'chapter' && !o.text) fail(`overlay ${i}: chapter needs text`);
  if (o.type === 'callout' && !(o.text && unit(o.x) && unit(o.y))) fail(`overlay ${i}: callout needs text and x,y as 0..1 fractions of the screen`);
  if (o.icon !== undefined) { if (!o.icon) fail(`overlay ${i}: icon is empty`); if (isBrandSlug(o.icon)) iconSlugs.add(o.icon); }
  if (o.type === 'logo' && !o.icon) fail(`overlay ${i}: a logo overlay needs icon (a Simple Icons slug like googlechrome, a glyph: camera | tab | film, or text:Aa)`);
  if ((o.type === 'logo' || o.type === 'stat') && ((o.x !== undefined && !unit(o.x)) || (o.y !== undefined && !unit(o.y)))) fail(`overlay ${i}: x and y are 0..1 fractions of the whole video frame`);
  if (o.type === 'stat' && !o.value) fail(`overlay ${i}: a stat overlay needs value (and a label)`);
  if (o.type === 'zoom' && !(Array.isArray(o.region) && o.region.length === 4 && o.region.every(unit) && o.region[2] > 0.1 && o.region[3] > 0.1)) fail(`overlay ${i}: zoom needs region [x,y,w,h] as 0..1 fractions (w,h > 0.1)`);
});

// ---- layout from the real screen clip size ----
let w = 1824; let h = Math.round(w * screen.height / screen.width);
if (h > 800) { h = 800; w = Math.round(h * screen.width / screen.height); }
const frame = { x: Math.round((1920 - w) / 2), y: 48, w: w + 6, h: h + 6 };
const below = frame.y + frame.h + 16;
const d = Math.max(110, Math.min(200, 1080 - below - 20));
const bubble = { x: Math.max(24, frame.x), y: Math.round(below + (1080 - below - d) / 2), d };
const capsX = bubble.x + d + 40; const capsY = Math.min(below + 8, 900);
const caps = { x: capsX, y: capsY, w: 1920 - 64 - capsX, h: 1080 - capsY - 24 };

// ---- caption groups from the remapped words ----
const groups = []; let cur = [];
const flush = () => { if (cur.length) { groups.push({ words: cur }); cur = []; } };
words.forEach((word, i) => {
  const previous = cur[cur.length - 1];
  if (previous && (word.start - previous.end > 0.5 || word.end - cur[0].start > 3.2 || cur.length >= 6)) flush();
  cur.push({ text: word.text, start: word.start, end: word.end });
  if (/[.!?]$/.test(word.text)) flush();
});
flush();
groups.forEach((g, i) => {
  g.start = g.words[0].start;
  const next = groups[i + 1];
  g.end = Math.min(g.words[g.words.length - 1].end + 0.15, next ? next.words[0].start : duration);
  if (g.end <= g.start) g.end = g.start + 0.2;
});
fs.writeFileSync(path.join(project, 'captions.json'), JSON.stringify({ timing_source: 'take_package', groups }, null, 1));

const icons = {};
for (const slug of iconSlugs) { try { icons[slug] = await getIcon(slug); } catch (e) { fail(e.message); } }
const DATA = { duration, layout: { frame, bubble, caps }, plan, captions: groups, icons };
const voice = camera.hasAudio ? 'assets/camera.mp4' : 'assets/screen.mp4';
const template = fs.readFileSync(path.join(skillRoot, 'templates/tutorial-16x9/template.html'), 'utf8');
const html = template
  .replaceAll('__DURATION__', String(Math.round(duration * 1000) / 1000))
  .replaceAll('__VOICE__', voice)
  .replace('/*__DATA__*/', () => 'const DATA = ' + JSON.stringify(DATA).replaceAll('<', '\\u003c') + ';')
  .replace('/*__PANEL_KIT_CSS__*/', () => fs.readFileSync(path.join(skillRoot, 'templates/shared/panel-kit.css'), 'utf8'))
  .replace('/*__PANEL_KIT_JS__*/', () => fs.readFileSync(path.join(skillRoot, 'templates/shared/panel-kit.js'), 'utf8'));
fs.writeFileSync(path.join(project, 'index.html'), html);
console.log(`Built ${path.join(project, 'index.html')}: ${duration}s, ${plan.scenes.length} scene(s), ${plan.overlays.length} overlay(s), ${groups.length} caption group(s). Frame ${frame.w}x${frame.h}, bubble ${d}px.`);
