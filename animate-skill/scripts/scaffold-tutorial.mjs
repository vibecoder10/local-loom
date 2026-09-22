// Turn a Local Loom take package into a HyperFrames tutorial project (16:9, Ryan's What We Built style).
// Usage: node scaffold-tutorial.mjs <take-package-dir> <project-dir>
// Then edit <project>/scene-plan.json and run: node build-tutorial.mjs <project-dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [takeArg, projectArg] = process.argv.slice(2);
const fail = (m) => { console.error('scaffold-tutorial: ' + m); process.exit(1); };
if (!takeArg || !projectArg) fail('usage: node scaffold-tutorial.mjs <take-package-dir> <project-dir>');
const take = path.resolve(takeArg); const project = path.resolve(projectArg);
const manifestPath = path.join(take, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail(`no manifest.json in ${take}. Pick a take-package folder written by Local Loom 0.14+.`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== 1) fail(`unsupported take package version ${manifest.version}`);
if (manifest.capture !== 'tutorial') fail(`this take is "${manifest.capture}" (${manifest.format}); the 16:9 tutorial kit needs a Longform + Screen take. 9:16 and camera-only recipes are not built yet.`);
if (manifest.format !== 'longform') fail('the tutorial kit is 16:9 only');
for (const name of ['screen', 'camera']) if (!manifest.media?.[name] || !fs.existsSync(path.join(take, manifest.media[name].file))) fail(`take package is missing the ${name} clip`);
if (fs.existsSync(path.join(project, 'index.html'))) fail(`${project} already has an index.html; choose a new folder (your scene-plan.json is never overwritten)`);

fs.mkdirSync(path.join(project, 'assets'), { recursive: true });
fs.mkdirSync(path.join(project, 'take'), { recursive: true });
fs.mkdirSync(path.join(project, 'renders'), { recursive: true });
const assets = path.join(skillRoot, 'templates/tutorial-16x9/assets');
for (const f of fs.readdirSync(assets)) fs.copyFileSync(path.join(assets, f), path.join(project, 'assets', f));
fs.copyFileSync(path.join(skillRoot, 'templates/tutorial-16x9/hyperframes.json'), path.join(project, 'hyperframes.json'));
const pinned = 'hyperframes@0.8.41';
fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: path.basename(project), private: true, type: 'module', scripts: {
  build: `node ${path.join(skillRoot, 'scripts/build-tutorial.mjs')} .`,
  dev: `npx --yes ${pinned} preview`, check: `npx --yes ${pinned} check`, lint: `npx --yes ${pinned} lint`,
  render: `npx --yes ${pinned} render -o renders/final.mp4 --fps 30` } }, null, 2));
// Media: hard link when possible (same disk, no copy), else copy. The take package stays untouched.
const place = (from, to) => { try { fs.linkSync(from, to); } catch (_) { fs.copyFileSync(from, to); } };
for (const name of ['screen', 'camera']) place(path.join(take, manifest.media[name].file), path.join(project, 'assets', `${name}.mp4`));
for (const f of ['manifest.json', 'words.remapped.json', 'words.original.json', 'script.txt', 'cuts.json']) if (fs.existsSync(path.join(take, f))) fs.copyFileSync(path.join(take, f), path.join(project, 'take', f));

const planPath = path.join(project, 'scene-plan.json');
if (!fs.existsSync(planPath)) {
  const D = manifest.duration.finished; const hook = Math.min(4, Math.round(D * 0.25 * 10) / 10);
  fs.writeFileSync(planPath, JSON.stringify({
    _help: 'scenes: back to back, types screen | presenter | split(title, kicker, points[]). overlays: chapter{at,duration,text,label} | callout{at,duration,text,x,y,side} | zoom{at,duration,region:[x,y,w,h]} with x/y/region as 0..1 fractions of the SCREEN clip. Times are seconds on the finished timeline (same as the words).',
    bubble: 'corner',
    scenes: [{ type: 'presenter', start: 0, end: hook }, { type: 'screen', start: hook, end: D }],
    overlays: [],
    captions: { enabled: true },
  }, null, 2));
}
console.log(`Scaffolded ${project}. Take: ${manifest.duration.finished}s, screen ${manifest.media.screen.width}x${manifest.media.screen.height}, camera ${manifest.media.camera.width}x${manifest.media.camera.height}.`);
console.log(`Next: edit ${planPath}, then  node ${path.join(skillRoot, 'scripts/build-tutorial.mjs')} ${project}`);
