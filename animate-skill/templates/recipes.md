## Contents

- 1 · Liquid glass card (frosted iOS-style)
- 2 · Single-color rotating "pulse border"
- 3 · White-glow text (over video)
- 4 · Curved underline beneath an em highlight
- 5 · Chroma key (green-screen) via SVG filter
- 6 · Multi-clip cut-editing pattern
- 7 · Pulsing-glow ring around a logo
- 8 · Corner notes (status / counter / brand pill)
- 9 · D3 wireframe globe with halftone dots
- 10 · Pixel-art agent icons (RoboLabs sidebar style)
- 11 · Python module-generator pattern (N similar slides)

# Hyperframes Recipes  -  copy-paste patterns from the kit

Drop-in snippets you'll reach for often. Each one is battle-tested in a real composition.

---

## 1 · Liquid glass card (frosted iOS-style)

```css
.glass {
  position: absolute;
  background:
    linear-gradient(135deg, rgba(255,255,255,0.14) 0%, rgba(255,255,255,0.04) 50%, rgba(255,255,255,0.08) 100%),
    rgba(20,22,30,0.28);            /* lighter  -  keeps video visible */
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 22px;
  backdrop-filter: blur(24px) saturate(160%);
  -webkit-backdrop-filter: blur(24px) saturate(160%);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.22),
              inset 0 -1px 0 rgba(0,0,0,0.2),
              0 16px 48px -12px rgba(0,0,0,0.5);
  overflow: hidden;
}
.glass::before {
  /* top sheen highlight */
  content: ''; position: absolute; top: 0; left: 0; right: 0; height: 50%;
  background: linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 100%);
  pointer-events: none;
}
.glass::after {
  /* diagonal refraction line */
  content: ''; position: absolute; top: -1px; left: -1px; right: -1px; bottom: -1px;
  background: linear-gradient(135deg, rgba(255,255,255,0.22) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.1) 100%);
  border-radius: inherit;
  pointer-events: none;
  mix-blend-mode: overlay;
}
```

**Darker variant (matches subtitle bar):** swap the second background layer to `rgba(10,10,12,0.72)`.

---

## 2 · Single-color rotating "pulse border"

Conic-gradient mask trick  -  only renders on the border edge, rotates continuously.

```css
@property --bg-angle { syntax: '<angle>'; inherits: false; initial-value: 0deg; }
.pulse-border { position: relative; }
.pulse-border::after {
  content: '';
  position: absolute; inset: -2px;
  border-radius: inherit;
  padding: 2px;
  background: conic-gradient(from var(--bg-angle, 0deg), var(--bc), transparent 50%, var(--bc));
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
  animation: spinAngle 4s linear infinite;
  filter: drop-shadow(0 0 8px var(--bc));
}
@keyframes spinAngle { to { --bg-angle: 360deg; } }
.pulse-border.orange { --bc: #ff6b1a; }
.pulse-border.violet { --bc: #8b5cf6; }
.pulse-border.cyan   { --bc: #22d3ee; }
```

⚠️ Uses CSS `@keyframes` with `infinite`. CSS animations DO NOT seek with the
deterministic renderer  -  for production renders, swap to GSAP `repeat: N` (finite).

---

## 3 · White-glow text (over video)

When text sits over a video frame, a dark drop-shadow looks heavy. White multi-layer
glow keeps it readable without darkening the surrounding pixels.

```css
.float-title {
  color: #ffffff;
  text-shadow:
    0 0 24px rgba(255,255,255,0.85),
    0 0 50px rgba(255,255,255,0.55),
    0 0 100px rgba(255,255,255,0.3);
}
```

Pair with an italic accent-color em + colored curved underline:
```css
.float-title em {
  font-style: italic;
  color: var(--accent-c);  /* per-beat: orange / violet / dark blue */
  text-shadow: same as above;
}
```

---

## 4 · Curved underline beneath an em highlight

Animated SVG curve that draws on after the text lands.

```html
<span class="hl-wrap">
  <em>HeyGen</em>
  <svg class="hl-curve" viewBox="0 0 240 18" preserveAspectRatio="none">
    <path d="M6,12 Q120,2 234,12" />
  </svg>
</span>
```

```css
.hl-wrap { position: relative; display: inline-block; }
.hl-curve {
  position: absolute; left: 0; bottom: -18px;
  width: 100%; height: 18px;
  pointer-events: none; overflow: visible;
}
.hl-curve path {
  fill: none;
  stroke: var(--accent-c);
  stroke-width: 5;
  stroke-linecap: round;
  stroke-dasharray: 240;
  stroke-dashoffset: 240;     /* starts hidden */
  filter: drop-shadow(0 0 8px rgba(255,255,255,0.55))
          drop-shadow(0 0 16px var(--accent-c));
}
```

```js
// GSAP  -  draws line on
tl.to('#float-beat-2 .hl-curve path',
  { strokeDashoffset: 0, duration: 0.8, ease: 'power2.out' },
  3.4
);
```

Curve variations:
- **Subtle smile (default):** `M6,12 Q120,2 234,12`
- **Wave:** `M6,12 Q60,4 120,10 T234,8`
- **Frown:** `M6,8 Q120,18 234,8`
- **Straight-ish:** `M6,10 Q120,8 234,10`

---

## 5 · Chroma key (green-screen) via SVG filter

For green-screen videos (e.g. Kling-rendered icons on `#00FF00`). Soft alpha + 12%
despill  -  anti-aliased edges, no jaggies.

```html
<svg width="0" height="0" style="position:absolute;pointer-events:none;">
  <filter id="green-key">
    <feColorMatrix type="matrix" values="
      1 0    0 0 0
      0 0.88 0 0 0
      0 0    1 0 0
      1 -1.6 1 0 0.6"/>
  </filter>
</svg>
```

```css
#keyedVideo { filter: url(#green-key) drop-shadow(0 16px 40px rgba(0,0,0,0.5)); }
```

**Don't use `feComponentTransfer` with `type="discrete"`**  -  gives binary alpha and
jagged stair-step edges. The matrix above gives a soft alpha:
- `G' = 0.88·G` → 12% green despill on icon edges
- `A' = R - 1.6·G + B + 0.6` → soft alpha, anti-aliased

---

## 6 · Multi-clip cut-editing pattern

Keep the uncut source on disk. Define multiple `<video>` clips on the timeline,
each pulling a different range via `data-media-start`. In Studio, drag the LEFT
handle of any clip to fine-tune that segment's cut boundary.

```html
<div id="videoFrame">
  <video class="stage-video clip" data-start="0.00" data-duration="2.56" data-media-start="2.24" data-track-index="2" muted playsinline preload="auto" src="assets/source-uncut.mp4"></video>
  <video class="stage-video clip" data-start="2.56" data-duration="3.74" data-media-start="9.12" data-track-index="3" muted playsinline preload="auto" src="assets/source-uncut.mp4"></video>
  <video class="stage-video clip" data-start="6.30" data-duration="2.88" data-media-start="12.86" data-track-index="2" muted playsinline preload="auto" src="assets/source-uncut.mp4"></video>
  <!-- alternate tracks 2/3 so adjacent clips don't collide on shared track -->
</div>
```

**Audio gotcha:** do NOT split audio the same way  -  multiple `<audio>` elements
loading the same `src` cause echo in Studio preview (the framework gates clip
*visibility* but several preloaded audio elements still play simultaneously).
Instead, use ONE `<audio>` clip pointing to a pre-cut clean audio file:

```html
<audio id="stageAudio" class="clip" data-start="0" data-duration="30.486"
       data-track-index="14" preload="auto" src="assets/audio.mp4"></audio>
```

Pre-cut the audio with `cut-retakes.py` so it matches the video timing. When you
drag video boundaries in Studio, you'll need to re-cut audio to keep sync.

---

## 7 · Pulsing-glow ring around a logo

Continuous outward ring pulse  -  three rings staggered, looped. Use GSAP with
finite repeat (NOT `repeat: -1`  -  fails the deterministic-render lint).

```html
<div class="logo-rings">
  <div class="ring" data-i="0"></div>
  <div class="ring" data-i="1"></div>
  <div class="ring" data-i="2"></div>
  <img src="assets/logo.png" />
</div>
```

```css
.logo-rings { position: relative; width: 200px; height: 200px; }
.ring {
  position: absolute; inset: 0;
  border: 2.5px solid var(--ring-color, #D97757);
  border-radius: 50%;
  opacity: 0; transform: scale(0.6);
}
```

```js
const HOLD = 6.0;             // how long the logo is on screen
const CYCLE = 1.6;            // one ring's expand cycle
const STAGGER = 0.5;
const repeats = Math.max(0, Math.floor((HOLD - CYCLE) / CYCLE));
[0, 1, 2].forEach(i => {
  tl.fromTo(`.ring[data-i="${i}"]`,
    { scale: 0.6, opacity: 0.7 },
    { scale: 1.6, opacity: 0, duration: CYCLE, ease: 'power2.out', repeat: repeats },
    cardEnter + STAGGER * i
  );
});
```

---

## 8 · Corner notes (status / counter / brand pill)

Glass pill chrome at canvas corners. Used as a recurring brand voice across compositions.

```css
.deco-pill {
  position: absolute;
  display: flex; align-items: center; gap: 10px;
  padding: 10px 18px;
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 100px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 14px; font-weight: 700; letter-spacing: 0.18em;
  color: #ffffff; text-transform: uppercase;
  backdrop-filter: blur(14px);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.1);
}
.deco-pill .dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 8px currentColor; }
.deco-pill .hex { width: 16px; height: 16px; clip-path: polygon(50% 5%, 93% 28%, 93% 72%, 50% 95%, 7% 72%, 7% 28%); }
.deco-pill.tl { top: 60px; left: 60px; }
.deco-pill.tr { top: 60px; right: 60px; }
.deco-pill.bl { bottom: 60px; left: 60px; }
```

```html
<!-- Required: ROBOLABS pill bottom-left (every composition) -->
<div class="deco-pill bl clip" data-start="0.3" data-duration="29.6" data-track-index="7">
  <span class="hex" style="background:#ff6b1a;"></span>
  <span><b>ROBO</b><span style="font-weight:300;color:rgba(255,255,255,0.6)">LABS</span></span>
</div>
```

---

## 9 · D3 wireframe globe with halftone dots

```html
<script src="https://cdn.jsdelivr.net/npm/d3@7/dist/d3.min.js"></script>
<script src="assets/ne_110m_land.js"></script>  <!-- window.NE_LAND -->
<canvas id="globeCanvas"></canvas>
```

Inline `ne_110m_land.js` is the GeoJSON wrapped as `window.NE_LAND = {...};`.
Download from `https://raw.githubusercontent.com/martynafford/natural-earth-geojson/refs/heads/master/110m/physical/ne_110m_land.json` and wrap with `window.NE_LAND = ` prefix.

```js
const projection = d3.geoOrthographic().scale(360).translate([400, 400]).clipAngle(90);
const path = d3.geoPath(projection, ctx);
const graticule = d3.geoGraticule().step([15, 15]);

// Pre-compute land sample dots once (point-in-polygon on grid)
const LAND_DOTS = [];
for (let lat = -90; lat <= 90; lat += 1.6) {
  for (let lon = -180; lon <= 180; lon += 1.6) {
    if (d3.geoContains(window.NE_LAND, [lon, lat])) LAND_DOTS.push([lon, lat]);
  }
}

function drawGlobe(time) {
  const t = time * 30.0;       // 30 deg/sec
  projection.rotate([t, -10, 0]);
  ctx.clearRect(0, 0, W, H);   // transparent  -  black-keyed!
  // outline + graticule + land outlines
  ctx.beginPath(); path({ type: 'Sphere' }); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.2; ctx.stroke();
  ctx.beginPath(); path(graticule()); ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 0.6; ctx.stroke();
  ctx.beginPath(); path(window.NE_LAND); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.0; ctx.stroke();
  // halftone dots  -  only visible (front) hemisphere
  const center = [-projection.rotate()[0], -projection.rotate()[1]];
  ctx.fillStyle = 'rgba(180,180,180,0.7)';
  for (const dot of LAND_DOTS) {
    if (d3.geoDistance(dot, center) < Math.PI / 2) {
      const pt = projection(dot);
      if (pt && !isNaN(pt[0])) ctx.fillRect(pt[0] - 0.6, pt[1] - 0.6, 1.2, 1.2);
    }
  }
}

tl.eventCallback('onUpdate', () => drawGlobe(tl.time()));
```

Use `clearRect` (not `fillRect` with black) so the canvas is transparent  -  the
globe "floats" on whatever is behind it. Black-keyed.

---

## 10 · Pixel-art agent icons (RoboLabs sidebar style)

```js
const AGENTS = [
  { id: 'robo', name: 'Robo', color: '#ffffff', pixels: [[0,0,1,0],[1,1,1,1],[1,1,1,1],[1,0,1,1],[1,1,1,1],[1,1,1,1],[1,0,0,1],[0,0,0,0]] },
  { id: 'devo', name: 'Devo', color: '#58abf5', pixels: [[0,0,1,0],[0,1,1,1],[1,1,1,1],[0,1,0,1],[0,1,1,1],[1,1,1,0],[0,0,1,0],[0,0,0,0]] },
  { id: 'eddo', name: 'Eddo', color: '#f5a623', pixels: [[0,0,1,0],[0,0,1,1],[0,1,1,1],[0,1,0,1],[0,1,1,1],[1,1,1,1],[1,0,1,0],[0,0,0,0]] },
  { id: 'bizo', name: 'Bizo', color: '#b47aff', pixels: [[1,0,0,0],[1,1,0,0],[0,1,1,1],[0,1,1,1],[1,1,0,1],[0,1,1,1],[0,1,0,1],[0,0,0,0]] },
  { id: 'como', name: 'Como', color: '#50e3c2', pixels: [[0,0,1,0],[0,0,1,1],[0,1,1,1],[1,1,0,1],[1,1,1,1],[1,1,1,1],[1,0,0,1],[0,0,0,0]] },
  { id: 'asto', name: 'Asto', color: '#ff6b6b', pixels: [[0,0,1,1],[0,1,1,1],[1,1,1,1],[1,1,0,1],[1,1,1,1],[0,1,1,1],[0,0,1,1],[0,0,0,0]] },
];
function agentSvg(a) {
  const cols = 8;
  let rects = '';
  for (let y = 0; y < a.pixels.length; y++) {
    for (let x = 0; x < a.pixels[y].length; x++) {
      if (a.pixels[y][x]) {
        rects += `<rect x="${x}" y="${y}" width="1" height="1" fill="${a.color}"/>`;
        rects += `<rect x="${cols - 1 - x}" y="${y}" width="1" height="1" fill="${a.color}"/>`;
      }
    }
  }
  return `<svg viewBox="0 0 8 8">${rects}</svg>`;
}
// In HTML: <div class="ai-icon" style="image-rendering:pixelated;"></div>
// el.innerHTML = agentSvg(AGENTS[0]);
```

Source: the ROBO agent icon set (SIDEBAR_ICON_DATA). The 8-column mirror is
intentional  -  input is 4 cols, the renderer reflects across the y-axis.


---

## 11 · Python module-generator pattern (N similar slides)

When a video has N slides with the same structure (course modules, chapter
intros, beat sections, comparison panels), don't hand-write each composition.
Parameterise once, emit N files.

```python
# gen_modules.py  -  run with `python gen_modules.py`
import os
PROJ = "path/to/YOUR-PROJECT/compositions"

modules = [
    {
        "id": "m1", "num": "M1", "section": "ANATOMY",
        "color": "#8b5cf6", "agent": "ROBO", "letter": "R",
        "title": "The <em>Anatomy</em> of an AI Agent",
        "purpose": "Tools change weekly. The mental model doesn't.",
        "topics": [
            ("1.1", "The Mental Model", "Tools change. The pattern doesn't."),
            ("1.2", "Chatbots vs Agents", "The line is the loop."),
            # ... N topics
        ]
    },
    # ... N modules
]

template = '''<!doctype html>
<html><head>...</head>
<body>
<div data-composition-id="{ID}" data-width="1920" data-height="1080"
     data-start="0" data-duration="23" id="root">
  <div class="kicker">{NUM} {SECTION}</div>
  <div class="heading">{TITLE}</div>
  <div class="agent-badge" style="--c:{COLOR}">{LETTER}</div>
  <div class="topics">
{TOPIC_CARDS}
  </div>
</div>
<script>/* GSAP timeline scoped to "{ID}" */</script>
</body></html>
'''

def topic_card(num, title, desc):
    return ('          <div class="topic">'
            '<span class="t-num">' + num + '</span>'
            '<span class="t-title">' + title + '</span>'
            '<div class="t-desc">' + desc + '</div></div>')

for m in modules:
    cards = "\n".join(topic_card(*t) for t in m["topics"])
    html = template.format(
        ID=m["id"], NUM=m["num"], SECTION=m["section"],
        COLOR=m["color"], AGENT=m["agent"], LETTER=m["letter"],
        TITLE=m["title"], PURPOSE=m["purpose"],
        TOPIC_CARDS=cards,
    )
    with open(os.path.join(PROJ, m["id"] + ".html"), "w", encoding="utf-8") as f:
        f.write(html)
    print("Wrote", m["id"] + ".html")
```

**Why use this over copy-paste:**
- 6 modules × 250 lines each = 1,500 lines of near-identical HTML to keep in sync.
  One template + 6 data dicts = ~50 lines you actually maintain.
- Iterating on the design (e.g. "make all kickers larger") = edit template once,
  re-run script. Versus 6 manual edits + drift.
- Adds a 7th module? Append a dict, re-run.

**Gotchas to encode in the template:**
- All Critical Rules from SKILL.md still apply per file (sub-comp bg, fromTo not
  from, hard-kills, finite repeats).
- `{...}` in `.format()` collides with CSS/JS braces  -  escape all literal braces
  as `{{` and `}}` in the template, or use a different templating syntax
  (`%(NAME)s` works without escape).
- One render error in module 3 means the WHOLE pipeline halts at module 3 in
  validate. Lint each generated file individually with
  `npx hyperframes lint compositions/m3.html` to isolate.

**Battle-tested in:** `blocks/course-tour/gen_modules.py` in this skill
(6 module beats × ~150 lines each = generated in <1s, hand-tweaked once after).

