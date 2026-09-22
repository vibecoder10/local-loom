## Contents

- Lesson Spotlight  -  talking head + motion graphics
- M1 Spotlight  -  pure motion graphics, slides design
- Bento Pan  -  Remotion → Hyperframes port
- Shader Test  -  Three.js shader port
- Storyboard  -  lesson motion plan
- In-kit examples (live in this folder)
- How to use these

# Worked Examples  -  Hyperframes Helper Kit

Reference compositions for the patterns this kit teaches. The first five describe
project builds that are not bundled; their patterns live in the templates named
below. The in-kit examples at the end ship as files in this folder.

---

## Lesson Spotlight  -  talking head + motion graphics

**Template:** `templates/composition-template.html` (chrome, panels, overlay cards)

The reference for **wrapping a recording in slides chrome**.

Shows:
- Source video silence-cut (7.5s of dead air removed via ffmpeg silencedetect → filter_complex concat)
- Re-encode with 1s GOP keyframes for clean Hyperframes seek
- 9:16 centered crop (`object-position: center center` on a 608×1080 video element)
- Per-beat left text panels with stagger entries
- Translucent overlay cards (82% opacity, backdrop-blur, sliding from off-edge)
- Brand watermark + lesson tag chrome
- Outro card with italic Instrument Serif quote

What it teaches: how to take a recorded clip and dress it in motion graphics
without losing the talking-head focus.

---

## M1 Spotlight  -  pure motion graphics, slides design

**Template:** `blocks/course-tour/` (module reveals, hex mesh, agent icon)

The reference for **pure motion-graphic videos with no source footage**.

Shows:
- 6 scene clips on a single track (title → M1 reveal → 3 cards → outro)
- Hex mesh canvas background (deterministic, redraws on `tl.eventCallback("onUpdate")` keyed off `tl.time()`)
- Pixel-art Robo agent icon
- Spine + node + ring-pulse pattern (slides module reveal)
- Card pattern with violet left-bar accent
- Outer clip-shell + inner animatable div pattern (the lint-clean way)

What it teaches: 1080p motion graphic deck rendered to MP4 in 42s.

---

## Bento Pan  -  Remotion → Hyperframes port

**Template:** `templates/remotion-port-template.html`

The reference for **porting a Remotion React component**.

Source: `infinite-bento-pan.tsx` (47-card diagonal pan across a 3500×2500 grid).

Shows:
- `useCurrentFrame()` → `tl.time()` conversion
- `useVideoConfig()` → constants
- `interpolate(...)` → GSAP `fromTo`
- Per-card React → DOM-built-once + `onUpdate` mutation pattern
- Card schema extension (`valueBase`, `valueRange`, `prefix`, `decimals`) for data customization
- Locked hue palette (no random rainbow  -  17/36/168/188/258/324)

What it teaches: any Remotion component is a deterministic-time-driven scene;
Hyperframes is the same idea with a different runtime.

---

## Shader Test  -  Three.js shader port

**Template:** `templates/shader-three-template.html`

The reference for **porting a Three.js fragment-shader component**.

Source: `shader-animation.tsx` (radial RGB-channel light bands, GLSL fragment shader).

Shows:
- Three.js loaded via CDN (no npm)
- Vertex + fragment shader code preserved verbatim
- `requestAnimationFrame` loop **deleted**  -  replaced by `tl.eventCallback('onUpdate')`
- `uniforms.time.value` driven as a pure function of `tl.time() * SHADER_SPEED`
- `preserveDrawingBuffer: true` for reliable canvas capture
- Slides title overlay layered on top of the shader

What it teaches: any Shadertoy/Three.js shader becomes a Hyperframes background
with one CDN script tag and one onUpdate callback.

---

## Storyboard  -  lesson motion plan

**Template:** `templates/storyboard-template.html`

The reference for **the storyboard-first workflow**.

A 5-scene plan for the lesson video showing layout previews (scaled 1920×1080
with positioned boxes), motion notes, and timing per scene. Used to iterate on
intent before touching the real composition. Saved many cycles when restructuring
the lesson video into the full-bleed → 9:16 → corner-cam structure.

Use as a model when you need to plan a multi-scene video.

---

## In-kit examples (live in this folder)

These are paste-ready single-file references. Open in browser to preview.

### `app-showcase-wise-reskin.html`

A Hyperframes registry block (`app-showcase`  -  three floating phone screens)
re-skinned with Wise brand assets. Shows the **catalog block reskin workflow**:
take a registry block, swap colors / typography / copy / icons to match a brand.

### `interactive-3d.html`

Ported from a React/shadcn 3D-card component. Shows how to take a hover-driven
React interaction and replay it as a deterministic timeline-driven motion (since
Hyperframes has no mouse pointer, the "hover" becomes a pre-scripted tilt sweep).

### `perspective-marquee.html`

Ported from a Remotion `PerspectiveMarquee` component. Shows the
`useCurrentFrame() → translateX` conversion + per-item blur driven by GSAP
`onUpdate`. Companion piece to `templates/remotion-port-template.html`.

---

## How to use these

1. Read the header comments in each template for the build context (decisions
   made, problems hit, fixes applied).
2. Open the `index.html` (project examples) or paste-ready HTML (kit examples)
   and look for the pattern you need.
3. Copy the relevant block into your new composition.
4. Re-lint after every paste  -  the kit's templates already follow the rules,
   but copy-paste sometimes loses a `class="clip"` or `data-track-index`.
