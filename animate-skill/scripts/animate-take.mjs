// The "Animate" button, deterministic side. Turns a Local Loom take package into a rendered,
// overlaid video with ONE AI call in the middle (planning only): scaffold -> claude -p writes
// scene-plan.json -> build (validates the plan; one retry with the plain-language error fed
// back) -> lint -> render. Everything except the plan itself is ordinary code.
//
// The AI call is `claude -p` run as a local subprocess with no tools, authenticated with the
// logged-in Claude subscription on this Mac (no ANTHROPIC_API_KEY, no webhook, no server Claude
// polls) - see HANDOFF.md 2026-09-21. It only ever returns text; this script parses that text as
// JSON and writes it to scene-plan.json itself, so the model never touches the filesystem.
//
// Usage: node animate-take.mjs <take-package-dir> <project-dir>
// Always writes <project-dir>/animate-result.json ({ok, error} or {ok:true, finalPath, ...}).
// On success also writes <project-dir>/renders/final.mp4 via the normal scaffold/build/render kit.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const skillRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [takeArg, projectArg] = process.argv.slice(2);

function finish(result, code) {
  if (projectArg) {
    try {
      const project = path.resolve(projectArg);
      fs.mkdirSync(project, { recursive: true });
      fs.writeFileSync(path.join(project, 'animate-result.json'), JSON.stringify(result, null, 2));
    } catch (_) { /* best-effort: stdout/exit code still carry the outcome */ }
  }
  if (result.ok) console.log('animate-take: ' + JSON.stringify(result));
  else console.error('animate-take: ' + result.error);
  process.exit(code);
}
const fail = (m) => finish({ ok: false, error: m }, 1);

if (!takeArg || !projectArg) fail('usage: node animate-take.mjs <take-package-dir> <project-dir>');
const take = path.resolve(takeArg);
const project = path.resolve(projectArg);
const manifestPath = path.join(take, 'manifest.json');
if (!fs.existsSync(manifestPath)) fail(`no manifest.json in ${take}`);
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

let recipe;
if (manifest.capture === 'tutorial' && manifest.format === 'longform') recipe = 'tutorial';
else if (manifest.capture === 'camera' && manifest.format === 'shorts') recipe = 'short';
else if (manifest.capture === 'camera' && manifest.format === 'longform') recipe = 'talking-head-16x9';
else fail(`no Animate recipe yet for capture "${manifest.capture}" (${manifest.format}). Built so far: Longform+Screen tutorials, Shorts camera-only talking heads, Longform camera-only talking heads.`);

const SCRIPTS = { tutorial: ['scaffold-tutorial.mjs', 'build-tutorial.mjs'], short: ['scaffold-short.mjs', 'build-short.mjs'], 'talking-head-16x9': ['scaffold-talking-head-16x9.mjs', 'build-talking-head-16x9.mjs'] };
const scaffoldScript = path.join(skillRoot, 'scripts', SCRIPTS[recipe][0]);
const buildScript = path.join(skillRoot, 'scripts', SCRIPTS[recipe][1]);
const run = (cmd, args, opts = {}) => execFileSync(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, ...opts });
const errText = (e) => String(e.stderr || e.stdout || e.message || e).trim();

// A fresh project dir is the normal case; be idempotent if the button is clicked again for the same job.
if (fs.existsSync(path.join(project, 'index.html'))) fs.rmSync(path.join(project, 'index.html'));
fs.mkdirSync(project, { recursive: true });
try {
  run('node', [scaffoldScript, take, project]);
} catch (e) {
  fail(`scaffold failed: ${errText(e)}`);
}

const planPath = path.join(project, 'scene-plan.json');
const starterPlan = fs.readFileSync(planPath, 'utf8');
const words = JSON.parse(fs.readFileSync(path.join(project, 'take/words.remapped.json'), 'utf8'));
const scriptText = fs.existsSync(path.join(project, 'take/script.txt')) ? fs.readFileSync(path.join(project, 'take/script.txt'), 'utf8') : '';
const duration = Number(manifest.duration.finished);

// Keep the prompt bounded on a long tutorial; words carry their own timing regardless of trimming.
const wordLine = (w) => `${w.text}@${w.start.toFixed(2)}`;
const wordsBrief = words.length > 500 ? words.slice(0, 500).map(wordLine).join(' ') + ' ...(truncated)' : words.map(wordLine).join(' ');

const RULE9 = `Style rule (never skip it): every element enters on the spoken word that explains it - nothing sits static on screen. Something is always moving (progress bar, drifting grid, floating plate). Show information as a picture, not a sentence: a named company or product gets its real logo tile (icon = a Simple Icons slug like googlechrome, apple, openai), a visible metaphor gets a pixel glyph (camera | tab | film) or a "visual" (see the SCENES list below), text-only tiles (text:Aa) are a last resort. Do not just restate the spoken words as a title card sitting still - place overlays/panel content on the beat that supports what is being said, spread across the runtime, not all crammed at the start. Do not use the "image" panel field (no source images are available to this planner).

DO NOT DEFAULT TO THE SAME TEMPLATE EVERY SCENE. Reusing icon tiles, bullet points and stat counters on every beat reads as generic and repetitive even when the timing is perfect - actually look at what each specific sentence is describing and pick (or combine) the visual that embodies THAT concept, not just whatever is easiest. If a scene explains a mechanism, a process, or a specific concrete thing (not just a list of facts), a "visual" almost always beats points/icons/stat - prefer it. Vary which visual you reach for across the plan; do not use the same one twice back to back unless the content genuinely repeats.`;

const VISUALS_BLOCK = `VISUALS (pick the one that actually embodies the sentence, do not just default to keycap/timeline):
- "visual":"flow","steps":["INPUT","PROCESS","OUTPUT"] (2-4 short labels) - boxes land left-to-right connected by arrows that pulse to show motion through the pipeline. Use for any multi-step process/pipeline (A leads to B leads to C).
- "visual":"beforeafter","before":"OLD STATE","after":"NEW STATE" - the old value strikes through and fades, the new value pops in beside it. Use whenever one thing visibly transforms into another (a change, an upgrade, a fix).
- "visual":"compare","left":{"label":"...","items":["...","..."]},"right":{"label":"...","items":["...","..."]} (up to 4 items each) - two columns slide in from opposite sides with a VS badge between them. Use for this-vs-that, two options/tools/approaches side by side.
- "visual":"cycle","steps":["PLAN","BUILD","SHIP"] (3-4 short labels) - nodes land in a circle, a loop arrow spins continuously at the center. Use for a circular/repeating process or feedback loop.
- "visual":"searchfilter","items":["OPTION A","OPTION B","OPTION C"],"matchIndex":N (optional, default last),"label":"MATCH FOUND" - items land, a scanner dims each in turn, the match locks in highlighted while the rest stay dim. Use for finding/filtering/narrowing down to the one that matters.
- "visual":"network","nodes":["HUB","A","B","C"] (first is the hub, 2-5 more as spokes) - a hub lands, spokes connect to it one by one with drawn lines, then pulse. Use for systems/relationships/nodes linking to each other.
- "visual":"merge","a":"THIS","b":"THAT","result":"THIS+THAT" - two source tiles slide in from the sides, converge, and fade into a single result tile. Use for two things combining into one.
- "visual":"branch","from":"START","paths":["OPTION A","OPTION B"] (2-3),"chosen":N (optional, default 0) - a start node forks into labelled paths, the chosen path locks in highlighted while the others dim. Use for a fork/decision point, picking one path among options.
- "visual":"keycap","key":"X","keyLabel":"..." - a key presses and bursts into pixels. Use for a literal keyboard shortcut/hotkey.
- "visual":"timeline" - a playhead sweeps a clip strip, a bad block is cut out, the gap closes. Use for editing/cutting/trimming a recording.
- "visual":"tokenize","word":"EXAMPLE","pieces":["EX","AMP","LE"] (pieces optional, auto-split if omitted) - a whole word visibly breaks apart into its token pieces with a running count. Use whenever tokens/tokenization/"what is a token" is the actual subject.
- "visual":"window" (no extra fields) - a grid fills cell by cell until it's completely full, then shakes - literally a context window filling up. Use for context-window/capacity/running-out-of-room explanations.
- "visual":"diskfiles","files":["short label","short label","short label"] (up to 4) - labelled file tiles fly in and land stacked. Use for memory/persistence/"saved to disk" explanations.`;

function tutorialBrief() {
  return `You are planning the overlay/scene timeline for a 16:9 tutorial video, built by deterministic code from your plan. Return ONLY a single JSON object - no markdown fences, no commentary, no explanation before or after it.

${RULE9}

INPUT
Duration (finished timeline, seconds): ${duration}
Screen clip: ${manifest.media.screen.width}x${manifest.media.screen.height}
Camera clip: ${manifest.media.camera.width}x${manifest.media.camera.height}
Teleprompter script (may be empty): """${scriptText}"""
Spoken words with start time in seconds (text@start): ${wordsBrief}

OUTPUT SHAPE (must validate against this exactly)
{
  "bubble": "corner",
  "scenes": [ ... ],
  "overlays": [ ... ],
  "captions": { "enabled": true }
}

SCENES - back to back covering 0..${duration} with no gaps or overlaps (scene[i].start === scene[i-1].end; scene[0].start === 0):
- {"type":"screen","start":N,"end":N} - the clean tab full-width, camera in a corner bubble. Default for anything explaining what is on screen.
- {"type":"presenter","start":N,"end":N} - camera full-screen. Use for hooks/sign-offs/emphasis beats, not the whole video.
- {"type":"split","start":N,"end":N,"kicker":"...","title":"...","titleAt":[seconds,...one per title word...],"accent":"oneWordFromTitle", "points":[{"text":"...","at":N}] OR "stat":{"value":"...","label":"...","count":true} OR "icons":{"connector":"none|plus|arrow","items":[{"icon":"slugOrGlyph","label":"...","at":N}]} (1-5 items) OR a "visual" (VISUALS below), "visualAt":N} - concept beat with no screen. Pick at most ONE of points/stat/icons/visual per split scene (icons may pair with a stat or up to 2 points; a visual fills the whole panel alone). titleAt must have one entry per word in title, each a spoken-word time inside the scene.

OVERLAYS - only during "screen" scenes, at/duration/at+duration must stay inside that "screen" scene's start..end, duration > 0.8s:
- {"type":"chapter","at":N,"duration":N,"label":"01","text":"...","icon":"optional glyph"} - marks a new topic starting.
- {"type":"callout","at":N,"duration":N,"text":"...","x":0..1,"y":0..1,"side":"up-left|up-right|down-left|down-right","icon":"optional"} - points at a spot on the screen clip (x,y as fractions of the screen clip).
- {"type":"zoom","at":N,"duration":N,"region":[x,y,w,h]} - all 0..1 fractions of the screen clip, w and h > 0.1. Punch in on the area being discussed.
- {"type":"logo","at":N,"duration":N,"icon":"slug|glyph|text:Aa","label":"...","x":0..1,"y":0..1} - x,y are fractions of the WHOLE video frame. Use whenever a company/product/tool is named.
- {"type":"stat","at":N,"duration":N,"value":"...","label":"...","count":true,"x":0..1,"y":0..1} - x,y fractions of the whole video frame.

Plan the beats from the spoken words: put a chapter at each new topic, callouts/zooms on things being pointed at or discussed on screen, logos when something is named, split scenes for concept explanations that do not need the screen. Use the script above for narrative structure if it is not empty; otherwise infer topics from the words' pacing (gaps between words mark sentence/topic boundaries).

${VISUALS_BLOCK}

STARTER PLAN (a scaffolded default - replace it, do not just resubmit it):
${starterPlan}`;
}

function shortBrief() {
  return `You are planning the scene timeline for a 9:16 talking-head short, built by deterministic code from your plan. Return ONLY a single JSON object - no markdown fences, no commentary, no explanation before or after it.

${RULE9}

INPUT
Duration (finished timeline, seconds): ${duration}
Camera clip: ${manifest.media.camera.width}x${manifest.media.camera.height}
Teleprompter script (may be empty): """${scriptText}"""
Spoken words with start time in seconds (text@start): ${wordsBrief}

OUTPUT SHAPE (must validate against this exactly)
{ "scenes": [ ... ], "captions": { "enabled": true } }

SCENES - back to back covering 0..${duration} with no gaps or overlaps (scene[0].start === 0, last scene's end === ${duration} exactly):
- {"type":"presenter","start":N,"end":N} - camera full-screen, ink-stroked captions. Use only briefly (hook, sign-off) - if the camera clip is under 1080p tall it upscales and looks soft full-screen.
- {"type":"split","start":N,"end":N,"kicker":"...","title":"...","titleAt":[seconds,...one per title word...],"accent":"oneWordFromTitle", plus AT MOST ONE of: "points":[{"text":"...","at":N}] (numbered:true for a step list) | "stat":{"value":"...","label":"...","count":true} | "icons":{"connector":"none|plus|arrow","items":[{"icon":"slugOrGlyph","label":"...","at":N}]} (1-5 items, may pair with a stat or up to 2 points) | a "visual" (VISUALS below) (fills the whole panel alone) - camera plate stays visible under the panel throughout. titleAt must have one entry per word in title, each a spoken-word time inside the scene.

Plan scene breaks on topic changes in the words/script; tie every title/point/stat/icon/visual "at" to the moment the matching word is spoken. Use the script above for narrative structure if it is not empty; otherwise infer topics from the words' pacing.

${VISUALS_BLOCK}

STARTER PLAN (a scaffolded default - replace it, do not just resubmit it):
${starterPlan}`;
}

function talkingHead16x9Brief() {
  return `You are planning the scene timeline for a 16:9 landscape talking-head video, built by deterministic code from your plan. Return ONLY a single JSON object - no markdown fences, no commentary, no explanation before or after it.

${RULE9}

INPUT
Duration (finished timeline, seconds): ${duration}
Camera clip: ${manifest.media.camera.width}x${manifest.media.camera.height}
Teleprompter script (may be empty): """${scriptText}"""
Spoken words with start time in seconds (text@start): ${wordsBrief}

OUTPUT SHAPE (must validate against this exactly)
{ "scenes": [ ... ], "captions": { "enabled": true } }

SCENES - back to back covering 0..${duration} with no gaps or overlaps (scene[0].start === 0, last scene's end === ${duration} exactly):
- {"type":"presenter","start":N,"end":N} - camera full-screen, ink-stroked captions. Use only briefly (hook, sign-off).
- {"type":"split","start":N,"end":N,"kicker":"...","title":"...","titleAt":[seconds,...one per title word...],"accent":"oneWordFromTitle", plus AT MOST ONE of: "points":[{"text":"...","at":N}] (numbered:true for a step list) | "stat":{"value":"...","label":"...","count":true} | "icons":{"connector":"none|plus|arrow","items":[{"icon":"slugOrGlyph","label":"...","at":N}]} (1-5 items, may pair with a stat or up to 2 points) | a "visual" (VISUALS below) (fills the whole panel alone) - the panel sits on the LEFT, the camera plate stays visible on the RIGHT throughout. titleAt must have one entry per word in title, each a spoken-word time inside the scene.

Plan scene breaks on topic changes in the words/script; tie every title/point/stat/icon/visual "at" to the moment the matching word is spoken. Use the script above for narrative structure if it is not empty; otherwise infer topics from the words' pacing.

${VISUALS_BLOCK}

STARTER PLAN (a scaffolded default - replace it, do not just resubmit it):
${starterPlan}`;
}

function planWithClaude(prompt) {
  const out = run('claude', ['-p', prompt, '--output-format', 'json', '--allowedTools', '', '--restricted']);
  let envelope;
  try { envelope = JSON.parse(out); } catch (_) { throw new Error('claude -p did not return JSON envelope: ' + out.slice(0, 500)); }
  if (envelope.is_error) throw new Error('claude -p returned an error: ' + (envelope.result || envelope.subtype || 'unknown'));
  let text = String(envelope.result || '').trim();
  text = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  try { return JSON.parse(text); } catch (_) { throw new Error('planner did not return valid JSON: ' + text.slice(0, 800)); }
}

const BRIEFS = { tutorial: tutorialBrief, short: shortBrief, 'talking-head-16x9': talkingHead16x9Brief };
const brief = BRIEFS[recipe];
let plan;
try {
  plan = planWithClaude(brief());
} catch (e) {
  fail(`planning failed: ${e.message}`);
}
fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));

function tryBuild() {
  try { run('node', [buildScript, project]); return { ok: true }; }
  catch (e) { return { ok: false, error: errText(e) }; }
}

let built = tryBuild();
if (!built.ok) {
  try {
    const retryPrompt = brief() + `\n\nYour previous scene-plan.json failed validation with this error:\n${built.error}\n\nHere is the plan you returned:\n${JSON.stringify(plan)}\n\nReturn the CORRECTED full scene-plan.json only - same JSON shape, fix only what the error says.`;
    plan = planWithClaude(retryPrompt);
    fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
    built = tryBuild();
  } catch (e) {
    fail(`planner retry failed: ${e.message}`);
  }
}
if (!built.ok) fail(`plan still invalid after one retry: ${built.error}`);

try {
  run('npx', ['--yes', 'hyperframes@0.8.41', 'lint'], { cwd: project });
} catch (e) {
  fail(`lint failed: ${errText(e)}`);
}

try {
  run('npx', ['--yes', 'hyperframes@0.8.41', 'render', '-o', 'renders/final.mp4', '--fps', '30'], { cwd: project, timeout: 20 * 60 * 1000 });
} catch (e) {
  fail(`render failed: ${errText(e)}`);
}

const finalPath = path.join(project, 'renders/final.mp4');
if (!fs.existsSync(finalPath)) fail('render reported success but renders/final.mp4 is missing');

finish({ ok: true, project, finalPath, recipe, duration, scenes: plan.scenes.length, overlays: (plan.overlays || []).length, plan }, 0);
