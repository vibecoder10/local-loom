## Contents

- Camera / pan
- Composition basics
- Card layout (bento-pan style)
- Colors
- Typography
- Card chrome
- Animation noise
- Per-kind specifics
- Composition extras (additive)
- Render

# Hyperframes Knobs Reference

Every parameter you can tweak on a Hyperframes composition, grouped by category.
Use this as a checklist when iterating: "what feels off?" → find it here → tune it.

When the user asks "what can we tweak?", produce a structured subset of this list
trimmed to what's actually present in the current composition.

---

## Camera / pan

| Knob | Where | Default | Notes |
|---|---|---|---|
| Direction | GSAP fromTo on `#mover` or stage | diagonal TL→BR | horizontal-only · vertical-only · reverse · zigzag · ease-to-stop |
| Speed | `duration` on the pan tween | full pan in 8s | slower = more cards visible per moment |
| Easing | `ease` on the pan tween | `'none'` (linear) | `power2.inOut` for momentum · `steps(N)` for stutter |
| Pan range | `x:-maxX, y:-maxY` end values | `(SUPER - VIEWPORT)` | can stop at midpoint, hold, then continue |
| Hold beats | extra `tl.to({duration: t})` with no change | none | adds dwell at a specific spot |

## Composition basics

| Knob | Where | Default | Notes |
|---|---|---|---|
| Duration | `data-duration` on root | 8s | any length; can loop |
| FPS | `--fps` flag on render | 30 | 24 for matching cut talking head; 60 only when the motion truly needs it |
| Stage size | `data-width` / `data-height` | 1920×1080 | avoid changing  -  Hyperframes assumes 16:9 1080p in many places |
| Super-grid size | hard-coded in script | 3500×2500 (bento) | bigger = more cards possible; bumps memory |

## Card layout (bento-pan style)

| Knob | Where | Notes |
|---|---|---|
| Card count | `CARDS` array length | 47 default in bento-pan |
| Position | `x, y` per card | absolute within super-grid |
| Size | `w, h` per card | mix sizes for visual rhythm |
| Kind | `kind` string | chart · counter · code · stat · bars · gradient · logo (extend the registry to add new kinds) |
| Hue | `hue` HSL angle | RoboLabs palette: 17 (orange) · 36 (amber) · 168 (teal) · 188 (cyan) · 258 (violet) · 324 (pink) |
| Label | `label` string | what gets shown on the card chrome |

### Per-card data (counter / stat)

| Knob | Where | Default | Notes |
|---|---|---|---|
| `valueBase` | per card | counter: 1200 · stat: 95 | center value the noise oscillates around |
| `valueRange` | per card | counter: 800 · stat: 5 | fluctuation magnitude |
| `prefix` | per card | none | `$`, `+`, `~` etc. |
| `suffix` | per card | none | `k`, `m`, `°` etc. (`%` is hard-coded for stat) |
| `decimals` | per card | stat: 2 | display precision for stats |

## Colors

| Knob | Where | Default | Notes |
|---|---|---|---|
| Global accent | `ACCENT` const + `--accent` | `#ff6b1a` (RoboLabs orange) | also used in chart/bar stroke + logo gradient |
| Card background | `.card` CSS gradient | `#131313 → #0a0a0a` | lighten/darken to shift contrast |
| Border color | `.card` border CSS | `rgba(255,255,255,0.07)` | thicker = more chrome |
| Stage background | body / stage CSS | `#050505` | pure `#000` = darker · `#0a0a0a` = lifted |
| Vignette | radial gradient overlay | black 30%→85%→100% | tint or soften by altering color stops |
| Text color | `--text`, `--text-paper`, `--text-dim` | white tonemap | DESIGN.md tokens |

## Typography

| Knob | Where | Default | Notes |
|---|---|---|---|
| Font family | `font-family` on each text class | system fallback | swap to Outfit / JetBrains Mono / Instrument Serif (the RoboLabs stack) for brand match |
| Counter size | `.counter-num` font-size | 56px | scales linearly with card width |
| Stat size | `.stat-num` font-size | 48px | |
| Label size | `.label` font-size | 12px | uppercase, tracking 0.04em |
| Code line height | `.code-line` height | 8px | larger feels chunkier |
| Letter spacing | `letter-spacing` per element | -0.04em (display) · 0.04em (kicker) | |

## Card chrome

| Knob | Where | Default | Notes |
|---|---|---|---|
| Border radius | `.card border-radius` | 18px | 12 = sharper · 24 = softer |
| Padding | `.card padding` | 18px · 0 for logo/gradient | |
| Box shadow | `.card box-shadow` | none | add `0 16px 48px -12px rgba(0,0,0,0.5)` for floor shadow |
| Backdrop blur | `backdrop-filter` | none | `blur(24px)` on a translucent variant for glass-card style (see recipes.md) |

## Animation noise

| Knob | Where | Default | Notes |
|---|---|---|---|
| Speed | `t * 6.28` multiplier | 6.28 (≈2π) | one cycle per second of timeline |
| Phase per card | `noise(i, t)`  -  uses `i` as offset | independent per card | replace `i` with constant to sync them |
| Function | `Math.sin` | sin | mix sin+cos for irregular feel; perlin for organic |
| Amplitude | `* 0.5 + 0.5` mapping | 0-1 range | scale before mapping for stronger swings |

## Per-kind specifics

### Chart card

| Knob | Where | Default | Notes |
|---|---|---|---|
| Point count | `for (let i = 0; i < 12; i++)` | 12 | more = denser line |
| Stroke width | `stroke-width="1.4"` | 1.4 | bump for chunkier chart |
| Fill opacity | `accent + '22'` hex | 13% | darker fill = more contrast |
| Wave amplitude | `Math.sin(...) * 18 + Math.cos(...) * 8` | 18+8 px in 60-unit viewBox | bigger amplitude = wilder chart |

### Bars card

| Knob | Where | Default | Notes |
|---|---|---|---|
| Bar count | `for (let i = 0; i < 10; i++)` | 10 | |
| Gap | `gap: 6px` | 6px | tighter or wider |
| Height range | `25 + (...) * 70` | 25-95% | bottom 25% always visible |
| Gradient direction | `linear-gradient(180deg, ...)` | top-down | reverse for bottom-bright |
| Bar radius | `border-radius: 4px` | 4px | flat (0) or pill (h/2) |

### Counter card

| Knob | Where | Default | Notes |
|---|---|---|---|
| Number font size | `.counter-num font-size` | 56px | |
| % indicator | `counter-pct` div | shown | hide for cleaner number |
| Locale | `v.toLocaleString()` | en-US (commas) | swap to `'de-DE'` for periods, etc. |

### Stat card (% based)

| Knob | Where | Default | Notes |
|---|---|---|---|
| Number font size | `.stat-num font-size` | 48px | |
| `%` symbol size | `.stat-pct font-size` | 20px | |
| Color | `.stat-num color` | white | accent for emphasis |

### Code card

| Knob | Where | Default | Notes |
|---|---|---|---|
| Line count | `lines` array length | 7 | shorter = more breathing |
| Line widths | `lines[i].w` | varies 20-80% | tweak the rhythm |
| Indent levels | `lines[i].indent * 14` | 0/1/2 | deeper = more nesting feel |
| Line colors | `lines[i].c` | 5 token colors | match a real syntax theme |

### Logo card

| Knob | Where | Default | Notes |
|---|---|---|---|
| Tile size | `.logo-tile width/height` | 80×80 | scale for impact |
| Tile radius | `border-radius` | 20px | square vs pill |
| Gradient angle | `linear-gradient(135deg, ...)` | 135° | rotate for variety |
| Glow strength | `box-shadow` opacity | `accent + '44'` (27%) | brighter glow for hero cards |

### Gradient card

| Knob | Where | Default | Notes |
|---|---|---|---|
| Type | `radial-gradient(...)` | radial | swap to `linear-gradient` for stripes |
| Center | `circle at 30% 30%` | top-left bias | move to `50% 50%` for centered |
| Hue shift | `(hue + 60) % 360` | +60° | larger shift = more contrast |

## Composition extras (additive)

These don't exist by default  -  add when the brief calls for them.

| Extra | Pattern | Notes |
|---|---|---|
| Fixed overlay (logo, watermark, lesson tag) | absolute-positioned div on a high track, full duration | stays put while cards/scene pans |
| Intro/outro frames | separate clips on a higher track | fade-in title, hold, fade out before main scene |
| Zoom moments | GSAP scale tween on the super-container | pause + zoom into a specific card mid-pan |
| Spotlight | dim other cards via `filter: brightness(0.5)` while one card is active | simulates a focus pull |
| Hex mesh background | drop slides hex pattern behind cards | requires stage transparent |
| Caption track | absolute-positioned text bar with timed clips | for talking-head wraps |
| Sample translucent overlays | `position: absolute; opacity: 0.82; backdrop-filter: blur(14px)` | the "see-through card" effect |
| Corner cam | small video bottom-right + center stage | for screencast-style explanations |
| Box contract | full-screen → 9:16 centered transition | hook → narrative shift |
| Full-bleed | video extends past 1920×1080 by ~1/16 | "framed too tight" intensity |

## Render

| Knob | Where | Default | Notes |
|---|---|---|---|
| Output format | `--format` | mp4 | `webm` for true alpha (transparent overlays) |
| FPS | `--fps` | 30 | 24 for source-matched · 60 only if motion needs it |
| GPU mode | auto | browser GPU (0.4.39+) | falls back to CPU SwiftShader on unsupported hardware |
| Workers | auto | min(cores, 16) | Hyperframes auto-detects |
| HDR | `--hdr` / auto-detect | SDR | only when source is HDR |
| Strict lint | `--strict` | off | blocks render on lint warnings (off by default) |
