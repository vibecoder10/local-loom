// Turn a camera-only Local Loom take package recorded at Longform/16:9 (no screen) into a HyperFrames 16:9
// landscape talking-head project, Ryan's What We Built style. Counterpart to scaffold-short.mjs (portrait).
// Usage: node scaffold-talking-head-16x9.mjs <take-package-dir> <project-dir>
// Then edit <project>/scene-plan.json and run: node build-talking-head-16x9.mjs <project-dir>
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [takeArg, projectArg] = process.argv.slice(2);
const fail = (m) => { console.error('scaffold-talking-head-16x9: ' + m); process.exit(1); };
if (!takeArg || !projectArg) fail('usage: node scaffold-talking-head-16x9.mjs <take-package-dir> <project-dir>');
const take = path.resolve(takeArg); const project = path.resolve(projectArg);
const manifestPath = path.join(take, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail(`no manifest.json in ${take}. Pick a take-package folder written by Local Loom 0.14+.`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
if (manifest.version !== 1) fail(`unsupported take package version ${manifest.version}`);
if (manifest.capture !== 'camera' || manifest.format !== 'longform') fail(`this take is "${manifest.capture}" (${manifest.format}); the 16:9 talking-head recipe needs a Longform take with Screen share OFF (camera only). Screen share ON goes to scaffold-tutorial.mjs; Shorts + camera only goes to scaffold-short.mjs.`);
const camera = manifest.media?.camera;
if (!camera || !fs.existsSync(path.join(take, camera.file))) fail('take package is missing the camera clip');
if (fs.existsSync(path.join(project, 'index.html'))) fail(`${project} already has an index.html; choose a new folder (your scene-plan.json is never overwritten)`);

fs.mkdirSync(path.join(project, 'assets'), { recursive: true });
fs.mkdirSync(path.join(project, 'take'), { recursive: true });
fs.mkdirSync(path.join(project, 'renders'), { recursive: true });
const assets = path.join(skillRoot, 'templates/tutorial-16x9/assets'); // fonts + GSAP are shared across every recipe
for (const f of fs.readdirSync(assets)) fs.copyFileSync(path.join(assets, f), path.join(project, 'assets', f));
fs.copyFileSync(path.join(skillRoot, 'templates/talking-head-16x9/hyperframes.json'), path.join(project, 'hyperframes.json'));
const pinned = 'hyperframes@0.8.41';
fs.writeFileSync(path.join(project, 'package.json'), JSON.stringify({ name: path.basename(project), private: true, type: 'module', scripts: {
  build: `node ${path.join(skillRoot, 'scripts/build-talking-head-16x9.mjs')} .`,
  dev: `npx --yes ${pinned} preview`, check: `npx --yes ${pinned} check`, lint: `npx --yes ${pinned} lint`,
  render: `npx --yes ${pinned} render -o renders/final.mp4 --fps 30` } }, null, 2));
// Media: hard link when possible (same disk, no copy), else copy. The take package stays untouched.
const place = (from, to) => { try { fs.linkSync(from, to); } catch (_) { fs.copyFileSync(from, to); } };
place(path.join(take, camera.file), path.join(project, 'assets', 'camera.mp4'));
for (const f of ['manifest.json', 'words.remapped.json', 'words.original.json', 'script.txt', 'cuts.json']) if (fs.existsSync(path.join(take, f))) fs.copyFileSync(path.join(take, f), path.join(project, 'take', f));

const planPath = path.join(project, 'scene-plan.json');
if (!fs.existsSync(planPath)) {
  const D = manifest.duration.finished; const hook = Math.min(5, Math.round(D * 0.15 * 10) / 10);
  fs.writeFileSync(planPath, JSON.stringify({
    _help: 'scenes: back to back on the finished timeline (seconds), last must end at duration. presenter = camera full-screen (hook, sign-off). split = animated panel on the left + camera plate on the right: title, kicker, points[{text,at}] (numbered:true for steps), stat{value,label}, visual: keycap (key, keyLabel, visualAt) | timeline (visualAt). Tie each point/visual to the word that explains it.',
    scenes: [
      { type: 'presenter', start: 0, end: hook },
      { type: 'split', start: hook, end: D, kicker: 'TOPIC', title: 'Replace this title', points: [] },
    ],
    captions: { enabled: true },
  }, null, 2));
}
console.log(`Scaffolded ${project}. Take: ${manifest.duration.finished}s, camera ${camera.width}x${camera.height}.`);
console.log(`Next: edit ${planPath}, then  node ${path.join(skillRoot, 'scripts/build-talking-head-16x9.mjs')} ${project}`);
