// Build a talking-head 9:16 project's index.html from scene-plan.json + the take package's words.
// Usage: node build-short.mjs <project-dir>
// Reads:  <project>/scene-plan.json, <project>/take/manifest.json, <project>/take/words.remapped.json
// Writes: <project>/index.html, <project>/captions.json
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getIcon } from './icon-cache.mjs';
import { validatePanelScene } from './panel-plan.mjs';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const project = path.resolve(process.argv[2] || '.');
const read = (p) => JSON.parse(fs.readFileSync(path.join(project, p), 'utf8'));
const fail = (m) => { console.error('build-short: ' + m); process.exit(1); };
for (const f of ['scene-plan.json', 'take/manifest.json', 'take/words.remapped.json']) if (!fs.existsSync(path.join(project, f))) fail(`missing ${f} (run scaffold-short.mjs first)`);

const manifest = read('take/manifest.json');
const words = read('take/words.remapped.json');
const plan = read('scene-plan.json');
const camera = manifest.media?.camera;
if (!camera) fail('the take package needs a camera clip');
const duration = Number(manifest.duration?.finished);
if (!(duration > 0)) fail('manifest.duration.finished is missing');

// ---- plan: defaults + validation with messages that say what to change ----
plan.scenes = (plan.scenes || []).map((s) => ({ ...s })).sort((a, b) => a.start - b.start);
if (!plan.scenes.length) plan.scenes = [{ type: 'split', start: 0, end: duration, kicker: 'TOPIC', title: 'Replace this title' }];
const SCENES = new Set(['presenter', 'split']);
const iconSlugs = new Set();
plan.scenes.forEach((s, i) => {
  if (!SCENES.has(s.type)) fail(`scene ${i}: type must be presenter or split (got ${s.type})`);
  if (!(s.start >= 0 && s.end > s.start && s.end <= duration + 0.05)) fail(`scene ${i}: start/end must be seconds inside 0..${duration} (got ${s.start}..${s.end})`);
  if (i === 0 && s.start !== 0) fail('the first scene must start at 0');
  if (i > 0 && Math.abs(s.start - plan.scenes[i - 1].end) > 0.05) fail(`scene ${i} must start where scene ${i - 1} ends (${plan.scenes[i - 1].end})`);
  if (i === plan.scenes.length - 1 && Math.abs(s.end - duration) > 0.1) fail(`the last scene must end at the video's end (${duration}), got ${s.end}`);
  if (s.type === 'split') {
    validatePanelScene(s, i, { project, fail, iconSlugs });
  }
});

// ---- layout (1080x1920): panel on top, camera plate below, captions under the plate ----
const ratio = camera.height / camera.width;               // 0.75 for a 640x480 webcam
const plateW = 952; let plateH = Math.round(plateW * ratio);
plateH = Math.max(560, Math.min(860, plateH));
const panel = { x: 64, y: 96, w: 952, h: 810 };
const plate = { x: 64, y: panel.y + panel.h + 56, w: plateW, h: plateH };
const capY = plate.y + plate.h + 44;
const layout = {
  panel, plate,
  capsPlate: { x: 64, y: capY, w: 952, h: Math.max(120, 1920 - 40 - capY) },
  capsFull: { x: 48, y: 1330, w: 984, h: 260 },
};
if (capY + 120 > 1920 - 24) fail(`camera plate too tall (${plate.h}px): captions would not fit under it`);

// ---- caption groups from the remapped words (portrait: shorter lines) ----
const groups = []; let cur = [];
const flush = () => { if (cur.length) { groups.push({ words: cur }); cur = []; } };
words.forEach((word) => {
  const previous = cur[cur.length - 1];
  if (previous && (word.start - previous.end > 0.5 || word.end - cur[0].start > 3 || cur.length >= 5)) flush();
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
const DATA = { duration, layout, plan, captions: groups, icons };
const template = fs.readFileSync(path.join(skillRoot, 'templates/talking-head-9x16/template.html'), 'utf8');
const html = template
  .replaceAll('__DURATION__', String(Math.round(duration * 1000) / 1000))
  .replaceAll('__CAMERA__', 'assets/camera.mp4')
  .replace('/*__DATA__*/', () => 'const DATA = ' + JSON.stringify(DATA).replaceAll('<', '\\u003c') + ';')
  .replace('/*__PANEL_KIT_CSS__*/', () => fs.readFileSync(path.join(skillRoot, 'templates/shared/panel-kit.css'), 'utf8'))
  .replace('/*__PANEL_KIT_JS__*/', () => fs.readFileSync(path.join(skillRoot, 'templates/shared/panel-kit.js'), 'utf8'));
fs.writeFileSync(path.join(project, 'index.html'), html);
const soft = camera.height < 1080 && plan.scenes.some((s) => s.type === 'presenter');
console.log(`Built ${path.join(project, 'index.html')}: ${duration}s, ${plan.scenes.length} scene(s), ${groups.length} caption group(s), ${iconSlugs.size} brand icon(s). Plate ${plate.w}x${plate.h}.`);
if (soft) console.log(`Note: camera is ${camera.width}x${camera.height}; presenter (full-screen) scenes upscale ${(1920 / camera.height).toFixed(1)}x. Check them in the snapshots.`);
