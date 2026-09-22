## Contents

- When to invoke
- Workflow - four phases
- Critical Framework Rules (lint gotchas)
- Source footage preparation
- Studio editing limits (per official docs)
- Lint gotchas v2 (catalog + port traps)
- Porting from React (Remotion / shadcn / Aceternity)
- WebGL / non-deterministic engines (caveat)
- Quiet Windows launches
- Project folders
- Generated subject artwork
- Music
- Catalog block reskin workflow
- Mounting scenes in a host reel (composition mount pattern)
- Design defaults
- Motion Patterns Library
- Track Plan (typical)
- CLI Cheatsheet
- Porting external components (React / D3 / Three.js → Hyperframes)
- Source video prep (talking head / screen recording)
- Common Pitfalls (and fixes)
- Quick start
- References
- Files in this skill (kit)



# Hyperframes Helper

The workflow for Hyperframes videos: plan the scenes, prepare the artwork, animate, preview in Studio, then render to MP4. The supplied design system controls the look; use the house style when none is supplied. Read [reel visual direction and delivery](../references/reel-production.md) for the current portrait defaults before using a legacy template. It owns the two fonts, centred copy, three layouts, neutral presenter plate, browser mockups, smooth resource scrolling and 3D entrance. New element transitions default to 0.4 seconds with sharp acceleration/deceleration and strong moving blur; keep settled frames crisp. For mascots and illustrated subjects, follow [Generated subject artwork](#generated-subject-artwork) before composition code.

## When to invoke

Trigger this skill when:
- The user says "hyperframes", "html to mp4", "render with hyperframes", "motion graphics for this recording", "storyboard this video"
- Wrapping a screen recording or talking-head clip in motion graphics
- Building any short-form video (intro, hook, ad, lesson trailer, capability demo) where the brand and motion need to feel like the slides decks
- For an eight-reel wall, two-row reel grid or spotlight showcase, copy the approved [template](../templates/eight-reel-wall.html) and follow [reuse instructions](../references/eight-reel-wall.md).

NOT for:
- Static slides → use a slides/deck tool
- Long-form video editing (15+ min lessons) → use a long-form editing workflow (autocutter → Premiere)
- Live-action editing where you don't need motion-graphic chrome

## Workflow - four phases

> **The single most important rule:** storyboard before composition. Iterating in Studio with a real composition costs ~15 min per cycle (edit → lint → preview → describe motion → repeat). Iterating on a storyboard HTML costs ~1 min. Lock the plan first, build once.

### Phase 1 · Storyboard (cheap iteration)

1. Copy `templates/storyboard-template.html` into the project folder as `storyboard.html`.
2. Write one clear message per beat before designing its frame. Use [motion copy and reading time](../references/motion-copy.md) to separate headlines from narration and captions. Fill the scene cards with layout, motion, readable hold time, artwork and music intent. For a style comparison, save each actual supplied design file with its source, then create distinct frames around the same subject.
3. Send the storyboard path and requested screenshots to the user. Open a browser tab only when explicitly requested.
4. Iterate the storyboard until layout and motion intent are locked.
5. Follow the requested review depth. A request for finished preview screenshots authorizes building those frames immediately. Show them at the target aspect ratio; keep video export paused when the user asks for feedback first. Move to full production after the requested review.

**The storyboard template ships with:**
- Header with title + meta pills + horizontal proportional timeline bar
- Sticky TOC chips for nav
- Scene cards (two-pane: scaled layout preview + notes panel)
- Pre-styled placeholder elements: video frame (with "YOU" placeholder), text panels, sample cards, watermark, lesson tag, motion arrows (SVG), color-coded labels
- Slides typography + color tokens
- Hex mesh canvas background

**A scene card always has:**
- Scene number + title (italic Instrument Serif)
- Scene timing (start → end · duration)
- Scaled layout preview at 880×495 (50% of 1920×1080)
- Notes section: "What's on screen", "Motion", timing rows
- Transition-out arrow at bottom

**Mark up methods the user can use:**
- Open file in editor, add `<!-- COMMENT: ... -->` tags
- Screenshot the page and draw arrows
- Just describe in chat "scene 3 should X"

### Phase 2 · Compose

1. Scaffold in a dedicated video folder and apply [Project folders](#project-folders). Use the included folder helper, or `npx hyperframes@latest init [project-name]` and this skill's folder helper.
2. Build `index.html` around the current reel direction. The older `templates/composition-template.html` is a structural example only; its branding, type and background are not current defaults.
3. Prepare [Generated subject artwork](#generated-subject-artwork) and [Music](#music), then build scenes around the actual files. Start music early when its beats drive the edit. Use the `clip + inner div` pattern (see Critical Rules).
4. Use tracks to keep Studio readable. A track index is a display lane, not an overlap constraint. Time media once and let HyperFrames own playback.
5. Update `meta.json` with the project's id + name.

### Phase 3 · Lint + Preview

Do not automatically open HTML or HyperFrames Studio tabs. Use hidden/headless validation and return links or screenshots. On Windows, use [Quiet Windows launches](#quiet-windows-launches). Launch a visible Studio tab only when explicitly requested.

```bash
cd [project] && npx hyperframes@latest lint        # MUST be clean
cd [project] && npx hyperframes@latest preview --background  # prepare Studio without opening a browser tab
```

Studio auto-picks the next free port if 3002 is taken (e.g. by another project). Use `--list` to see all running servers, `--kill-all` to clean up.

In Studio: scrub timeline, click elements to inspect, drag clips. Hot-reload on file changes.

### Phase 4 · Render

```bash
cd [project] && npx hyperframes@latest render -o output.mp4 --fps [24|30]
```

- Match the source video's fps (24 for re-encoded source, 30 for pure motion).
- Render is deterministic - same composition + same fps = same MP4 every time.
- 0.4.39+ defaults to browser GPU mode (much faster than the old SwiftShader CPU fallback).
- Render speed: ~1.5× realtime on a 16-core box for pure-motion content.

After render: verify the MP4 and return its absolute path and gallery link. Do not automatically open the gallery, Studio or a media player.

## Critical Framework Rules (lint gotchas)

These are non-negotiable - every one corresponds to a lint error you WILL hit if you skip:

1. **Use the current HyperFrames core contract.** The root has an explicit size and composition ID. Timed media needs stable IDs and intentional start/duration metadata; not every element needs the legacy clip class.

2. **Let the framework own media playback and clip visibility.** Do not set media currentTime or call play inside composition code. Do not tween display or raw visibility on clip elements. Use an untimed visual wrapper when media has its own timing; never time both a video and its plain ancestor.

3. **Tracks are Studio display lanes.** Clips may overlap on one track. Use CSS z-index for visual stacking and explicit time windows for duration.

4. **Keep timeline registration visible to validation.** Register exactly one paused timeline whose key matches the composition ID. When a helper file holds render logic, keep the registration in composition HTML so the static scanner can find it.

5. **GSAP timeline must be paused + registered.**
   ```js
   window.__timelines = window.__timelines || {};
   const tl = gsap.timeline({ paused: true });
   // ... tl.from(...) ...
   window.__timelines["main"] = tl;  // composition-id from data-composition-id
   ```

6. **Deterministic logic only.** No `Math.random()`, no `Date.now()`, no `fetch()`. Render is frame-by-frame seek; non-determinism = different output every render.

7. **Video uses `muted` + separate `<audio>` element.** Playing audio through the `<video>` tag breaks frame seek.
   ```html
   <video class="clip" data-start="3" data-duration="28.75" data-track-index="3" muted playsinline preload="auto" src="assets/source.mp4"></video>
   <audio class="clip" data-start="3" data-duration="28.75" data-track-index="5" preload="auto" src="assets/source.mp4"></audio>
   ```

   Give timing to the video or its wrapper, never both. A video with `data-start` inside a timed scene wrapper produces mismatched source frames. For scene layouts containing independently timed media, keep the visual wrapper untimed and drive its display from the registered seek timeline.

8. **Source video needs tight keyframes (1s GOP).** Re-encode source MP4 with:
   ```
   ffmpeg -i in.mp4 -c:v libx264 -preset fast -crf 18 \
     -r [fps] -g [fps] -keyint_min [fps] \
     -force_key_frames "expr:gte(t,n_forced*1)" \
     -c:a aac -b:a 192k -movflags +faststart out.mp4
   ```
   Without this you'll see `sparse keyframes` warnings and seek-freeze artifacts.

9. **Canvas-based animations (hex mesh, particles, etc.) must redraw on timeline tick.** Don't use `requestAnimationFrame`. Use:
   ```js
   tl.eventCallback('onUpdate', () => drawHex(tl.time()));
   ```
   This makes the canvas state a pure function of time, which is what the renderer's frame-seek needs.

10. **`hard kill` not strictly required for clip elements.** Framework hard-cuts at clip end. Don't add `tl.set(..., {visibility: hidden})` on clip elements (rule 2 forbids it). For inner-div fade-outs, hard kill is fine.

11. **`repeat: -1` (infinite) is FORBIDDEN.** Lint error: `gsap_infinite_repeat`. The deterministic capture engine seeks to exact frame times - infinite repeats break that. Use a finite count derived from the hold duration:
    ```js
    const HOLD = 6.0;        // how long the element is on screen
    const CYCLE = 1.6;       // duration of one loop iteration
    const repeats = Math.max(0, Math.floor(HOLD / CYCLE) - 1);
    tl.to('.element', { ..., repeat: repeats, yoyo: true });
    ```
    Same applies to CSS `@keyframes ... infinite` - it doesn't sync to render seek.

12. **Multiple `<audio>` elements with the same `src` cause echo.** The framework gates clip *visibility* but several preloaded audio elements still play simultaneously in Studio preview. Use ONE `<audio>` clip pointing to a pre-cut clean audio file. If video is split into N segments via `data-media-start`, audio stays single - pre-cut audio.mp4 to match the final timing.

13. **Pseudo-elements (`::before` / `::after`) cannot be GSAP'd.** GSAP can only target real DOM nodes. If you need a pulsing ring or bobbing accent, replace `.core::after` with an actual `<div class="core-pulse">` child and tween that.

14. **Studio's auto-assigned inline `style="z-index: N"` may be inverted.** Studio sometimes writes inline z-index that's the OPPOSITE of track-index intent (track 0 → z-index 22 instead of 0). If you see hex bg or vignette appearing on top of video, bulk-strip inline z-indexes:
    ```python
    import re
    s = open('index.html').read()
    out = re.sub(r' style="z-index: \d+"', '', s)
    open('index.html', 'w').write(out)
    ```
    Then rely on DOM order + a few targeted CSS rules for stacking.

15. **Stacking context gotcha for the contracted-video frame.** If `#videoFrame { z-index: 2 }`, sibling float-text with no z-index gets buried below it (positioned-with-z stacks above positioned-without-z, even when later in DOM). Either give the floats explicit `z-index` ≥ 2, OR remove videoFrame's z-index and place the shader element BEFORE videoFrame in DOM so DOM order naturally puts shader behind it.

16. **Sub-comp backgrounds must be on `[data-composition-id]`, not `body`.** When a composition is loaded via `data-composition-src`, its `body { background }` does NOT render - the body element is detached from the visible viewport in the parent compile. The bg must be set on the `[data-composition-id="X"]` selector itself, AND the composition must declare its size there too. **Silent failure mode** - lint passes, validate passes, only `npx hyperframes snapshot` reveals it.
    ```css
    /* WRONG  -  sub-comp renders with no bg / undefined size */
    html, body { background: #F5F5F5; }
    body { width: 1920px; height: 1080px; }

    /* RIGHT  -  explicit on the composition root */
    html, body { background: transparent; overflow: hidden; }
    [data-composition-id="my-comp"] {
      width: 1920px; height: 1080px;
      background: #F5F5F5;
      overflow: hidden;
      position: relative;
    }
    ```

17. **Root timeline must be a real (paused, empty) GSAP timeline - never `null`.** Validate fails with `Cannot read properties of null (reading 'seek')` if `window.__timelines["root"] = null`. Lint passes silently; only `npx hyperframes validate` catches it.
    ```html
    <!-- In root index.html, before </body> -->
    <script src="https://cdn.jsdelivr.net/npm/gsap@3.14.2/dist/gsap.min.js"></script>
    <script>
      window.__timelines = window.__timelines || {};
      var tl = gsap.timeline({ paused: true });   /* empty is fine  -  but must be a timeline */
      window.__timelines["root"] = tl;
    </script>
    ```

18. **D3 globe halftone dots: precompute land points ONCE at load, never call `d3.geoContains` per-frame.** Per-frame `d3.geoContains` over a lat/lng grid (39K calls × 4920 frames = 192M calls) hangs the renderer indefinitely - silent stall, no error.
    ```js
    /* WRONG  -  kills the renderer */
    function drawGlobe() {
      for (var lat = -90; lat <= 90; lat += step) {
        for (var lng = -180; lng <= 180; lng += step) {
          if (d3.geoContains(landData, [lng, lat])) { /* draw dot */ }
        }
      }
    }

    /* RIGHT  -  precompute, then just project per frame */
    var landPoints = [];
    function precomputeLandPoints() {
      for (var lat = -88; lat <= 88; lat += step) {
        for (var lng = -180; lng <= 180; lng += step) {
          if (d3.geoContains(landData, [lng, lat])) landPoints.push([lng, lat]);
        }
      }
    }
    function drawGlobe() {
      for (var i = 0; i < landPoints.length; i++) {
        var p = projection(landPoints[i]);
        if (!p || isNaN(p[0])) continue;
        /* draw dot at p */
      }
    }
    fetch('../assets/ne_110m_land.json').then(r => r.json()).then(data => {
      landData = data; precomputeLandPoints(); drawGlobe();
    });
    ```
    Same principle applies to any expensive geometric/topological test - do it once, cache the result.

19. **Hyperframes ships agent skills, not plugins for one vendor's marketplace.** When describing Hyperframes on camera or in copy: it ships 12 SKILLS via `npx skills add heygen-com/hyperframes` - these become slash commands like `/hyperframes`, `/gsap`. That is a different system from an agent vendor's plugin marketplace (those use their own plugin manifest and namespaced commands like `/plugin-name:skill-name`). **Safe phrasings:** *"ships skills for your agent"*, *"an agent skill bundle"*. **Never say:** *"official plugin"*, *"in any company's marketplace"*.

20. **Validate before render. Snapshot before render.** Three-stage gate, in order:
    ```bash
    npx hyperframes lint        # static checks (cheap, ~1s)
    npx hyperframes validate    # runtime in headless Chrome (~10s)
    npx hyperframes snapshot . --at <beat-midpoints>  # visual check at key moments
    npx hyperframes render --output renders/<name>.mp4  # only after all 3 pass
    ```
    Each stage catches different failures: `lint` = HTML structure, `validate` = JS runtime errors, `snapshot` = visual bugs (missing bgs, hidden elements, wrong colors). Skipping snapshot regularly costs entire 5-15 min renders.

Hyperframes Studio explicitly **cannot split a clip mid-source** (per docs at
https://hyperframes.heygen.com/guides/timeline-editing). The workaround:
keep the uncut source on disk, then define multiple `<video>` clips on the
timeline, each with a different `data-media-start`. Drag the LEFT handle of
any clip in Studio to fine-tune that segment's cut boundary live - no ffmpeg
re-run, no source re-cut.

```html
<div id="videoFrame">
  <video class="stage-video clip" data-start="0.00" data-duration="2.56"
         data-media-start="2.24" data-track-index="2" muted playsinline preload="auto"
         src="assets/source-uncut.mp4"></video>
  <video class="stage-video clip" data-start="2.56" data-duration="3.74"
         data-media-start="9.12" data-track-index="3" muted playsinline preload="auto"
         src="assets/source-uncut.mp4"></video>
  <!-- Alternate tracks 2/3 so adjacent clips don't collide on a shared track. -->
</div>
```

Trade-off: audio CANNOT be split this way (rule 12 - echo). Pre-cut a single
clean audio file and use ONE `<audio>` clip. When you drag video boundaries in
Studio, you'll need to re-cut the audio to keep sync.

For one-shot composition with no Studio drag-editing needed, use a single
ffmpeg-cut source.mp4 + single `<audio>` source.mp4 - simpler.

## Source footage preparation

Prepare presenter footage before animation so the source, transcript and edit
share one clock. For a recording with spoken "video one", "video two" slates:

1. Extract mono 16 kHz audio from the untouched recording. Use
   `scripts/transcribe-assemblyai.py <audio> <output-prefix>` with a key from
   `ASSEMBLYAI_API_KEY` or its hidden prompt. Never save the key in the project.
   Keep AssemblyAI's full text and word timings on the original source clock.
   If the service is unavailable, say so before using local transcription.
2. Split at spoken slates; remove slates, repeats, false starts and dead air.
   Add 0.1 seconds to the prior pause edit: usually 0.2-0.3 seconds between clear spoken beats, near 0.25-0.27 where safe, never a rigid gate.
   Keep at least 0.1 seconds before the first and after the last audible word at every trim boundary; extend prior outer reel boundaries by 0.1 seconds where source and slates permit.
   ASR word timings are approximate. Inspect transcript, waveform and every join; keep more source or skip a trim if a sound or breath is uncertain. Never speed speech to fit.
   Save exact source keep ranges, safety handles and removal reasons; remap video, words, scenes and SFX to the edit clock. Speech completeness outranks the pause target.
3. On a 2560x1440 source, portrait full-screen is 675x1200 at (884,240), scaled to 1080x1920.
   Landscape full-screen is 2064x1161 at (192,204), or x=7.5%, y=14.1667%, width=80.625%, height=80.625%; scale uniformly to 1920x1080 without a visible frame.
   Both split layouts use the 820x820 source crop at (804,394). Follow reel production for destination plates and opening motion.
   Preserve the full edited source for a single playing layer whose crop, position and rounded mask animate together; do not cut between baked camera crops.
   Inspect start, middle, end and transition frames for face/mic safety, correct aspect and continuous motion. Round crop dimensions only if the codec requires it.
4. Keep presenter footage at true 30 fps through final export. Sample only
   animation layers at 15 fps, without quantizing media/audio/subtitle clocks.
   Export at 30 fps; verify different adjacent moving presenter frames and
   paired held animation frames. Decode fully and inspect every audio join.
   Verify the first two reels before a batch; animation-only exports use 15 fps.

## Studio editing limits (per official docs)

Studio supports only:
- ✅ Drag clip horizontally → updates `data-start`
- ✅ Drag clip between rows → updates `data-track-index`
- ✅ Drag right handle → updates `data-duration` (end-trim)
- ✅ Drag LEFT handle on **media** clips → updates `data-start` + `data-media-start` (front-trim into source)
- ✅ Reorder rows vertically → updates inline `z-index`
- ❌ Splitting / cutting clips mid-source
- ❌ Front-trim on non-media (motion) clips
- ❌ Keyboard shortcuts
- ❌ Multi-select
- ❌ Undo / redo

Source: https://hyperframes.heygen.com/guides/timeline-editing

## Lint gotchas v2 (catalog + port traps)

Hit during May 2026 catalog/port work - fail lint or render badly. Less critical than Rules 1-15 but each has bitten me.

16. **`non_deterministic_code`** - `Math.random()` in init logic (e.g. particle scatter, randomized starts) breaks frame-determinism. Use a seeded PRNG:
    ```js
    function mulberry32(seed) {
      return function () {
        let t = (seed += 0x6D2B79F5);
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
      };
    }
    const rand = mulberry32(42);  // any int seed; same seed = same render
    ```

17. **`gsap_css_transform_conflict`** - When CSS sets `transform: translate(-50%, -50%) scale(0.85)` for centering AND a GSAP tween animates `scale`, GSAP overwrites the entire transform → centering breaks.
    Fix: drop the CSS `translate(-50%, -50%)` and centre via GSAP `xPercent`/`yPercent` in a `fromTo`:
    ```js
    tl.fromTo('#hero',
      { opacity: 0, xPercent: -50, yPercent: -50, scale: 0.85 },
      { opacity: 1, xPercent: -50, yPercent: -50, scale: 1, duration: 1.8 },
      t);
    ```

18. **`overlapping_gsap_tweens`** - Two `tl.to()` tweens on the same selector animating overlapping properties (e.g. both touch `transformOrigin` for separate `rotation` and `scale` tweens). Add `overwrite: 'auto'` to the later one.

19. **`composition_self_attribute_selector`** (warning) - Inside a sub-composition, `[data-composition-id="foo"] .child` selectors leak across instances when the block is embedded twice. Prefer `#foo .child`. Soft warning - fine for one-off scenes; fix if the block ships to the registry.

20. **`studio_missing_editable_id`** - Any timeline-visible element you'd want Studio to edit needs a stable `id`. Watermarks, brand bugs, persistent chrome elements often miss this - add `id="brand-bug"`.

21. **Gradient text via `background-clip: text` works** in Hyperframes Puppeteer. Use `-webkit-text-fill-color: transparent` AND `color: transparent` for cross-browser safety.

22. **Contrast warnings on intentional brand palettes are acceptable** (e.g. green-on-green Wise card, dark-on-dark logo). Warnings, not errors. If the design calls for it, ship.

## Porting from React (Remotion / shadcn / Aceternity)

Components written in React/Remotion can be ported to Hyperframes - they share the deterministic-time premise. Three patterns from the May 2026 work:

### Remotion → Hyperframes

`useCurrentFrame()` is the equivalent of `tl.time()`. Anything driven by frame can be driven by a GSAP timeline tween with `ease: 'none'` over the scene duration.

```js
// Remotion source:
//   const offset = -((frame * pixelsPerFrame) % approxItemWidth);
// Hyperframes equivalent:
const totalTravel = pixelsPerSecond * sceneDuration;
tl.to('#row', {
  x: -totalTravel,
  duration: sceneDuration,
  ease: 'none',
  modifiers: {
    x: (xv) => {
      const n = parseFloat(xv);
      const wrapped = ((n % oneSetWidth) + oneSetWidth) % oneSetWidth;
      return -wrapped + 'px';
    },
  },
  onUpdate: () => {
    // per-item state that depends on the current row offset
    // (e.g. blur per item by distance from screen center)
  },
}, 0);
```

`onUpdate` fires on every frame seek deterministically - use it for state that depends on a running variable (per-item blur, distance-based opacity, position-conditional styling).

Worked example: `examples/perspective-marquee.html` - the Remotion `PerspectiveMarquee` with per-item blur, ported.

### shadcn `<Card>` → plain HTML

shadcn cards are `cn()`-wrapped Tailwind classes. Drop the React component, replicate the visual class chain as static CSS:

```css
.card-shadcn {
  border-radius: 0.5rem;          /* rounded-lg */
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(0, 0, 0, 0.96); /* bg-black/[0.96] */
  color: #fafafa;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
  overflow: hidden;
}
```

Tailwind utilities → equivalent CSS is mostly mechanical. `bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400` → see Rule 16 / 21.

### Aceternity Spotlight (CSS `animate-spotlight`) → GSAP

Aceternity's `animate-spotlight` is a CSS keyframe animation. CSS animations are NOT seeked deterministically by Hyperframes - convert to GSAP:

```js
// Aceternity keyframes:
//   0%   { opacity: 0; transform: translate(-72%, -62%) scale(0.5); }
//   100% { opacity: 1; transform: translate(-50%, -40%) scale(1);   }
gsap.set('#spotlight', {
  xPercent: -72, yPercent: -62, scale: 0.5, opacity: 0,
  transformOrigin: '50% 50%',
});
tl.to('#spotlight',
  { xPercent: -50, yPercent: -40, scale: 1, opacity: 1,
    duration: 2.0, ease: 'power2.out' },
  0.75);  // 0.75s delay matched to original `animate-spotlight 2s ease 0.75s`
```

Worked example: `examples/interactive-3d.html` - Aceternity Spotlight + shadcn Card + Spline web component port.

## WebGL / non-deterministic engines (caveat)

Engines that run their own animation loop on wall-clock (Spline, Three.js orbit controllers, Rive that auto-plays) are **incompatible** with Hyperframes' deterministic frame-seek out of the box.

**Why it fails:**
- Hyperframes seeks `tl.time(t)` then captures the frame. The 3D engine's animation state is whatever wall-clock moment Chrome happens to be at - unrelated to `t`.
- With 6 parallel render workers, each Chrome instance starts the engine at a different real time → consecutive frames sampled at random points in the engine's loop → strobing render.

**The Spline case (`<spline-viewer>`):** scene loads, but multi-worker render produces glitchy non-continuous output. Tested both as nested composition (`data-composition-src`) and standalone - fails either way.

**Workarounds (in order of effort):**
1. **Static scene only** - disable all animation in the source `.splinecode`, single-worker render, accept it as a "3D still". Works for hero/poster shots.
2. **Pre-render to MP4** - export the engine's animation to MP4 via the engine's own export tool (Spline → File → Export → MP4). Embed as `<video class="clip" data-start="..." data-duration="..." data-track-index="..." muted>` - Hyperframes seeks `currentTime` deterministically.
3. **Replace with CSS/SVG mock** - for stylized "3D vibe" scenes, a CSS `perspective` + `transform-style: preserve-3d` + GSAP rotation mock is fully deterministic and often visually sufficient. Worked example: `examples/interactive-3d.html` ships with a CSS-perspective Wise card mock as fallback layer behind the Spline element.

**Rule:** never silently embed a WebGL engine and hope. If you do, render a 5s test slice first to verify smoothness before extending.

## Quiet Windows launches

Run HyperFrames checks, snapshots, and renders through `node scripts/run-hyperframes.mjs <command> <flags>` from the video folder. The wrapper keeps the project's pinned version, preloads `windows-hide.cjs` into child Node processes, and uses installed Chrome in headless mode through `HYPERFRAMES_BROWSER_PATH`. Headless-shell console windows can appear even when the parent command is hidden, so suppressing only the outer command is insufficient. The preload also sets `windowsHide: true` on child-process launches. Record the browser version in verification because switching browser builds can change pixels.

For a directly resolved CLI, use `node --require scripts/windows-hide.cjs <hyperframes-cli> ...` and inherit that preload through `NODE_OPTIONS` for child Node processes. Background PowerShell services use `Start-Process -WindowStyle Hidden`. User-facing Studio still opens in Chrome when requested. Never close or hide unrelated terminals or the user's normal Chrome windows. If a stray console appears, identify it by its headless-browser title/process before hiding it, fix the launch path, and verify a browser command completes without new visible consoles.

## Project folders

Each video is a self-contained reuse package. Run `node scripts/prepare-video-folders.mjs <video-folder>` when the scaffold does not already create these folders:

```text
video-slug/
  index.html, hyperframes.json, meta.json, package.json
  BRIEF.md, DESIGN.md, ASSETS.json, REUSE.md
  compositions/          reusable HyperFrames components
  scripts/               build and verification helpers
  assets/
    images/generated/    generated subjects with alpha when needed
    images/references/   supplied and sourced images
    models/              editable 3D files such as GLB
    textures/            local maps and lighting assets
    fonts/               font files and their licenses
    vendor/              local runtime libraries and licenses
    footage/             original video inputs
  music/originals/       downloaded source tracks and generation records
  music/edits/           trims and mixes used in this video
  audio/voiceover/       spoken narration
  audio/sfx/             sound effects
  renders/previews/      review MP4s
  renders/final/         delivery MP4s and transparent exports
  renders/frames/        visual checks and posters
  references/           briefs, prompts, source notes
```

Use relative paths inside the video and descriptive filenames. Preserve source tracks and assets; write edits as separate files. Your image-generation skill still saves and logs its originals in its own library, then copies the chosen files and their records into this video. Record each asset's path, source/provider, prompt where relevant, usage notes, and original-to-edit relationship in `ASSETS.json`. Put component controls, dependencies, and copy/reuse instructions in `REUSE.md`. A component package must include its assets and music, not references to another video's private folders. When organizing an existing project, update all affected media references and verify them; keep already-shared output URLs working.

For a series, put the numbered video folders beside a separate `common/` folder. Store reusable masters there under `fonts/`, `vendor/`, `models/`, `overlays/`, `music/` and `textures/`. `COMMON-ASSETS.json` records hashes, provenance and which videos use each asset. Each video retains local render copies and a `COMMON-REFERENCES.json` reuse map, so a single project can be moved or zipped without breaking and a shared-master edit does not silently change finished videos. Keep voice, exact music edits, resource recordings and subtitles inside their own video folder.

## Generated subject artwork

Generate the artwork; use code to compose and animate it. Mascots, characters, illustrated objects, and decorative hero subjects should be image assets, not hand-built CSS shapes, SVG paths, canvas drawings, or emoji substitutes. A flat illustration style does not change this default. Text, buttons, charts, diagrams, and simple geometric accents stay editable in code. Reuse suitable user-supplied artwork and exact brand assets. An explicit request for real 3D objects uses actual geometry and the HyperFrames Three.js seek adapter; keep editable model/source files under `assets/models/`, not a flat image made to appear freely rotatable. Follow explicit vector or procedural-art requests too.

1. Read your image-generation skill before generating. It owns costs and logging; for video artwork the preferred provider is your agent's native image-generation tool. Include at least one such image in each video. Use the design reference to specify the subject's palette, proportions, expression, pose, and finish. Request the isolated subject with a transparent background, no text or background scenery, and enough padding for its motion.
2. Save and log the generated original through that skill, then copy a PNG with real alpha transparency into the project's `assets/` folder. Check both the alpha channel and the visible edges over light and dark backgrounds at its largest on-screen size. An opaque white or checkerboard image is not transparent. If the result lacks alpha, use the supported background-removal workflow and inspect it again; do not hide the box with a blend mode or key away colors used by the subject.
3. Put the local image inside the animatable inner wrapper. Use deterministic GSAP position, scale, rotation, and opacity for entrances, bounces, and floating motion. If the character must blink or wave, derive consistent pose images or separate transparent parts from the same artwork; do not redraw it in code or stretch one still to fake articulation.
4. Keep the image, reference, and generation prompt with the project. Inspect its composition in HyperFrames Studio before rendering and inspect the exported hero frames for cropping, halos, or a visible background box.

Example: a Duolingo-style owl starts as a generated transparent PNG matching the supplied style. HyperFrames then animates that image beside editable lesson text and progress UI.

## Music

Generate the video's soundtrack with **Suno via Kie AI through your generation skill** by default. Reuse a supplied track when the user gives one; respect an explicit no-music or different-provider request.

1. Read your generation skill and its Suno provider notes. They own credentials, current models, prices, spending approval, request tracking, downloads, and generation logging. Reuse the configured Kie connection; never copy keys into the video project.
2. Brief an instrumental track to match the design system, scene rhythm, and desired ending. Allow space for speech and sound effects. Generate and download actual Suno audio; save its prompt, model, provider task ID, and source path with the project. Do not replace it with a coded oscillator loop or label a temporary score as Suno. Report a provider failure before choosing another route.
3. Keep the logged original, copy the chosen track into `music/originals/`, and save the exact-duration edit in `music/edits/` with a deliberate opening and ending. Check the returned file's real length. Duck it beneath narration, keep speech and effects on separate sources, and avoid clipping or duplicate playback.
4. Preview the mix in Studio before rendering, then listen to the exported video and check the joins, ending, balance, and sync. The finished MP4 must contain the actual Suno track before reporting this step complete.

## Catalog block reskin workflow

Most registry blocks are designed for a specific brand/use case (fitness app, VPN ad, NK map). Reskinning for your project is a 3-step pattern:

1. **Install** - `npx hyperframes add <block-name>` drops `compositions/<block-name>.html` (and any assets) into the project.
2. **Read + map** - open the file, identify:
   - Color tokens (search for the block's accent hex codes - usually 1-3 of them)
   - Brand strings (logo text, headlines, sample names)
   - Asset references (`<img src="assets/...">`, `<video src="...">`)
   - Animation timing (`tl.to(... duration: N ...)` durations - keep these)
3. **Swap** - replace tokens 1:1 with your project's palette + copy. Don't restructure the GSAP timeline; just substitute content and colors.
4. **Mount** - add a `<div data-composition-src="compositions/<block>.html" data-start="..." data-duration="<original>" data-track-index="1">` to the host `index.html`.

**Worked example:** `examples/app-showcase-wise-reskin.html` - `app-showcase` (originally fitness dashboard with lime-green accent) reskinned for Wise (multi-currency Send / Balance / Spending phones with Wise green palette). Same animation timeline, fully re-skinned content.

**Tip:** start with the block's listed `accent` hex (e.g. `#e4fa72` lime in app-showcase) and ripgrep through the file - it usually shows up 15-30 times. Replace globally as the first pass, then walk the markup to swap copy and structure.

## Mounting scenes in a host reel (composition mount pattern)

The way to extend a Hyperframes reel: keep `index.html` as the host with the master timeline, and mount each scene as a sub-composition. Each scene is a self-contained HTML file in `compositions/` with its own `<style>` + GSAP timeline registered to `window.__timelines["<id>"]`.

```html
<!-- index.html (host) -->
<div id="root" data-composition-id="main" data-duration="80.5" data-width="1920" data-height="1080">
  <div class="clip" data-composition-id="host-marquee"
       data-composition-src="compositions/perspective-marquee.html"
       data-start="62.5" data-duration="12"
       data-track-index="1" data-width="1920" data-height="1080"></div>
  <!-- ...other scene mounts... -->
  <div id="brand-bug" class="brand-bug clip"
       data-start="0" data-duration="80.5" data-track-index="9">...</div>
</div>
```

Inside each composition file:
```html
<div data-composition-id="perspective-marquee"
     data-start="0" data-duration="12"
     data-width="1920" data-height="1080">
  <!-- composition content -->
</div>
<script>
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  // ...tweens...
  window.__timelines["perspective-marquee"] = tl;
</script>
```

**Track-index hygiene:** put scene mounts on track 1, persistent chrome (brand bug, watermark) on tracks 8-9. Scenes don't overlap on track 1 (rule 3). Persistent chrome runs the full duration.

**Render-time norms** (1920×1080, 6 workers, ~M1-class machine):
| Reel | Frames | Render time | File size |
|------|-------:|------------:|----------:|
| 30s motion-heavy | 900 | ~37s | ~5 MB |
| 35.5s + catalog block | 1065 | ~50s | ~6 MB |
| 68.5s mostly-catalog | 2055 | ~78s | ~3 MB |
| 80.5s + Remotion port | 2415 | ~80s | ~3.4 MB |
| 88.5s + Spline scene | 2655 | ~100s | ~4 MB |

Catalog blocks (mostly-static UI) compress smaller than custom motion scenes (particles, gradients). Spline web component adds significant load time per worker.

**Cost positioning:** Hyperframes is $0/render (local CPU/GPU + FFmpeg). Comparable cloud rendering for a 30s 1080p motion piece: Kling 3.0 Pro ~$1.40, Runway Gen-3 ~$2.50, Veo 2 ~$1.50-3. For brand reels, lesson opens, and product demos where you control the design, Hyperframes is the right default.

**For pure site-to-video** (give a URL, get a brand video), use the `/website-to-hyperframes` skill (installed via `npx skills add heygen-com/hyperframes`) - it captures the site, extracts brand, then drives the Hyperframes pipeline.

## Design defaults

Use [reel visual direction](../references/reel-production.md) as the source of truth. The default is warm paper with the getrubric.app wave at 30% opacity, ink text, restrained orange emphasis, Outfit subtitles and Copernicus Bold titles. Editorial text is centred and limited to subtitles plus occasional titles without adjacent decorative icons. There are no default watermarks, eyebrow labels or extra accent colours.

Use a neutral presenter placeholder in a rounded glowing plate until real footage is supplied. Do not substitute a saved photograph. Preserve real mobile resource captures in rounded browser mockups; use smooth screenshot movement when live recordings jitter. Explicit style references override the palette and visual treatment, not the need for readable copy, genuine sources and verifiable output.

## Motion Patterns Library

Named moves you can reference by shorthand. Each one has a code snippet + when to use.

### `slide-up-fade` (default entry)

Element enters from below with fade.
```js
tl.from('#el', { opacity: 0, y: 30, duration: 0.6, ease: 'power3.out' }, t);
```
Use for: occasional titles and supporting visual objects. Keep subtitle phrases stable; colour the spoken word instead of moving or underlining each word.

### `pop-in-scale` (energetic entry)

Element pops in with bounce.
```js
tl.from('#el', { opacity: 0, scale: 0.5, duration: 0.7, ease: 'back.out(1.7)' }, t);
```
Use for: icons, brand marks, badges, chips.

### `slide-from-left` (panel entry)

Side panels and labels.
```js
tl.from('#el', { opacity: 0, x: -40, duration: 0.45, ease: 'power2.out' }, t);
```

### `polaroid-drop` (overlay card entry)

Cards drift in from off-edge with rotation.
```js
tl.fromTo('#card',
  { x: -360, y: -40, opacity: 0, scale: 0.85, rotate: 0 },
  { x: 0, y: 0, opacity: 0.82, scale: 1, rotate: -4, duration: 0.9, ease: 'power3.out' },
  t);
tl.to('#card', { y: '+=8', duration: 2.6, ease: 'sine.inOut', yoyo: true, repeat: 1 }, t + 1.4);
```
Use for: sample cards, photo overlays, callout chips. Always 80% opacity (`0.82` exactly looks best).

### `box-contract` (full → 9:16 transition)

Video animates from full-screen to centered vertical box.
```js
tl.to('#stageVideo', {
  width: 608, height: 1080, top: 0, left: 656,
  borderRadius: 22,
  duration: 0.6, ease: 'power3.inOut',
}, t);
tl.set('#stageVideo', {
  boxShadow: '0 30px 80px -20px rgba(0,0,0,0.7)',
  borderColor: '#2e3244',
}, t + 0.6);
```
9:16 at 1080 height = 608 wide. Centered = `left: (1920-608)/2 = 656`.

### `corner-cam` (9:16 → bottom-right)

Box slides to corner for "talking head + central content" layout.
```js
tl.to('#stageVideo', {
  width: 360, height: 640, top: 400, left: 1500,
  borderRadius: 18,
  duration: 0.5, ease: 'power2.inOut',
}, t);
```

### `full-bleed` (oversized container)

Video extends slightly past screen edges for "framed too tight" feel.
```css
#stageVideo {
  position: absolute;
  top: -34px; left: -60px;
  width: calc(1920px + 120px);
  height: calc(1080px + 68px);
  object-fit: cover;
}
```
Bleed ratio: 1/16 of screen height ≈ 67px. Use during hooks for energy.

### `3d-device-chassis-lip` (real depth on a flat phone/laptop)

The trick that finally made a CSS phone read as a real 3D object instead of a tilted card.

**Three things in combination:**
1. CSS `perspective` on the parent + `transform-style: preserve-3d` on the rotating wrapper
2. **Back face is LARGER than the front** (not the same size) via negative `inset` - chassis lip pokes out around the screen at every rotation angle
3. Back face is BRIGHTER than the bg (titanium gradient, not near-black) - otherwise the offset between front and back is invisible against a dark canvas

```css
.phone-stage {
  position: absolute; left: 50%; top: 50%;
  width: 380px; height: 800px;
  perspective: 1800px;
  perspective-origin: 50% 45%;
}
.phone-3d {
  width: 100%; height: 100%;
  position: relative;
  transform-style: preserve-3d;
}
.phone-back {
  position: absolute;
  inset: -18px;                    /* LARGER than front  -  chassis lip */
  border-radius: 70px;
  background: linear-gradient(135deg,
    #6f6f78 0%, #3a3a40 30%, #1f1f24 55%, #4a4a52 80%, #6f6f78 100%);  /* titanium */
  box-shadow:
    inset 0 0 0 2px #7a7a82,        /* bright rim highlight */
    inset 0 -50px 90px rgba(0,0,0,0.4),
    0 0 100px rgba(0,0,0,0.7);
  transform: translateZ(-50px);     /* push behind the front */
}
.phone {  /* front face with screen */
  width: 100%; height: 100%;
  background: #0a0a0a;
  border-radius: 54px;
  position: relative;
}
```

```js
// .phone-3d gets the rotation. .phone-stage stays clean (perspective parent).
tl.set(".phone-3d", {
  rotateY: -42, rotateX: 12,
  transformOrigin: "50% 50%"
}, 0);
// Camera-dolly across the timeline  -  multi-segment ease for cinematic feel
tl.to(".phone-3d", { rotateY: -32, rotateX: 8, duration: 1.4, ease: "power2.out" }, 0.2);
tl.to(".phone-3d", { rotateY: -18, duration: 4.0, ease: "sine.inOut" }, 1.6);
tl.to(".phone-3d", { rotateY: -36, rotateX: 5, duration: 3.0, ease: "sine.inOut" }, 5.6);
```

**What fails (don't waste time on these):**
- 28-thin-slice extrusion (`translateZ(-1.14px)` × 28 layers): each slice is too thin to register, merges into faint gradient at edge, looks flat.
- Single back face SAME SIZE as front: front fully covers back. Even at -36° rotation only a sliver peeks.
- Single back face dark colour (near `#0a0a0a`): blends with the page bg, no offset visible.
- Animating the perspective parent directly: rotation happens AROUND the perspective point, not WITH it - produces flat/wrong projection. Always rotate the inner `transform-style: preserve-3d` wrapper.

### `node-pulse` (highlight glow)

Element with continuous outward ring pulse.
```css
.node::before {
  content: ''; position: absolute; inset: -10px;
  border: 2px solid var(--c);
  border-radius: 50%;
  animation: ringPulse 3s ease-in-out infinite;
}
@keyframes ringPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.15); opacity: 0; }
}
```

### Standard scene transition

Hard cut between scene clips by default (framework-managed). For crossfade between consecutive scenes, alternate tracks:
```html
<div class="clip" data-start="0" data-duration="3.5" data-track-index="2">scene 1</div>
<div class="clip" data-start="3"   data-duration="4.0" data-track-index="3">scene 2</div>  <!-- 0.5s overlap on different tracks -->
```

## Track Plan (typical)

For a video with a source clip plus chrome:

| Track | Layer |
|---|---|
| 0 | Hex mesh canvas (full duration) |
| 1 | Vignette overlay (full duration) |
| 2 | Video halo (during box phase) |
| 3 | Video element |
| 4 | Video shade overlay (during box phase) |
| 5 | Audio element |
| 6 | Left text panels (sequential) |
| 7 | Intro card |
| 8 | Outro card |
| 9 | Watermark (full duration) |
| 10 | Lesson tag |
| 11-15 | Sample cards (one per track if visually overlapping) |

## CLI Cheatsheet

```bash
# Install latest
npx hyperframes@latest --help

# Project lifecycle
npx hyperframes@latest init my-video           # scaffold
cd my-video
npx hyperframes@latest lint                    # validate
npx hyperframes@latest preview                 # Studio (auto-port)
npx hyperframes@latest preview --port 3010     # specific port
npx hyperframes@latest preview --list          # show running servers
npx hyperframes@latest preview --kill-all      # clean up
npx hyperframes@latest inspect                 # visual layout debug
npx hyperframes@latest snapshot                # PNG keyframes
npx hyperframes@latest render -o out.mp4 --fps 24
npx hyperframes@latest publish                 # public URL

# Registry
npx hyperframes@latest catalog                 # browse blocks/components
npx hyperframes@latest add data-chart          # install a block

# Skills (agent integration)
npx skills add heygen-com/hyperframes          # adds /hyperframes /gsap /website-to-hyperframes commands

# Docs
npx hyperframes@latest docs <topic>            # in-terminal reference
```

## Porting external components (React / D3 / Three.js → Hyperframes)

Hyperframes can host any JS-driven canvas hero element - D3 globes, network graphs, particle fields, voronoi diagrams. But components built for the web (especially v0 / 21st.dev / shadcn-style React components) need a four-step adapter pattern before they'll render frame-deterministic video.

**The four-step adapter:**

1. **Strip the React wrapper.** Drop `useState`, `useEffect`, `useRef`. The Hyperframes composition is a static HTML page - you don't need React's lifecycle. Convert hooks to plain DOM lookups (`document.getElementById`) and inline the body of the effect callback into a `<script>` block.

2. **Replace `fetch()` with embedded data.** Critical Rule 6 forbids fetch at render time. Download the data once, wrap as `window.X = {...}`, include via `<script src="assets/x.js">`. Full recipe at `recipes/embedded-data.md`.

3. **Replace per-frame timers with timeline tick.** Anything using `requestAnimationFrame`, `setInterval`, or `d3.timer` won't survive frame-seeking. Move the draw call into `tl.eventCallback('onUpdate', ...)` - it'll fire every time the renderer advances the timeline, deterministically.
   ```js
   tl.eventCallback('onUpdate', () => {
     const t = tl.time();
     drawHex(t);
     drawGlobe(t);  // your component's draw call
   });
   ```
   Express any time-varying values (rotation angle, animation phase, particle position) as a function of `t`, not as accumulating state.

4. **Strip mouse/scroll/keyboard handlers.** They're dead weight - the renderer can't drag or scroll. Delete `handleMouseDown`, `handleWheel`, etc. Keep only what affects the visual at a given timestamp.

**Bonus: pre-compute deterministic-but-expensive loops at script load.** If the original component does work-at-init (sampling a grid, building a quadtree, parsing geometry), do it once outside the draw loop. The renderer's per-frame work should be O(N) projection + paint, not O(N²) generation.

**Reference port:** the globe sting composition ports the 21st.dev "wireframe-dotted-globe" React component using all four steps. Companion template at `templates/globe-d3-canvas.html`.

## Source video prep (talking head / screen recording)

Use the Source footage preparation section above for speech-safe cuts and
0.1-second boundary handles. Existing EDLs and ASR timings are starting points;
inspect waveforms and retain more source when uncertain. Keep tight one-second
GOP keyframes at 30 fps for presenter footage, per Critical Rule 8. Store the
approved clean cut in `assets/source.mp4`; reference it from `<video>` and the
single `<audio>` track, then use separate animation and media clocks.

## Common Pitfalls (and fixes)

- **Video looks too warm.** Reduce decorative overlays and preserve the real resource colours. Keep the generated wallpaper subtle; do not add unrelated accent hues.
- **Studio shows the wrong project.** Multiple projects can run simultaneously on different ports. Run `npx hyperframes preview --list` to see what's where.
- **Lint passes but render is choppy.** Source video keyframes are sparse. Re-encode per Critical Rule 8.
- **Cards visible during transition look weird.** Don't have card clips end at exactly the transition time - they fade out *during* the transition (e.g. card exit 5.0-5.4s, video transition 5.0-5.6s, then card clip ends at 5.4s).
- **GSAP `boxShadow` animation is glitchy.** Use `tl.set(...)` to snap shadow + border on at the END of a position transform, rather than tweening them through.
- **First render takes 5+ minutes.** Chrome download (~101 MB), one-time. Cached for subsequent renders.
- **"composition_file_too_large" / "track_too_dense" warnings.** Soft warnings only. Split into sub-compositions when comfortable, but don't block on them for v1.
- **Studio server dies after a while when started in background.** `npx hyperframes preview` is a long-running server - when launched as a background process, it can exit before you're done scrubbing. Either re-run the preview command, or specify `--port` and keep a foreground terminal pinned for the session.
- **Opening rendered media.** Return the existing project gallery link and absolute file path. Open only on explicit request. Do not open additional media-player windows automatically.

## Quick start

```
animate

Brief: 30-second video wrapping the hook recording at [path].
Show me as full-bleed first 5s with sample cards floating in,
then 9:16 centered with text panels by beat,
then corner-cam with sample grid front-and-center.
```

You respond with:
1. Storyboard HTML at the project folder
2. Once locked, composition + Studio preview URL
3. Once approved, render

## References

- **Latest CLI:** `npx hyperframes@latest --help`
- **Official docs:** https://hyperframes.heygen.com/introduction
- **Studio editing capabilities:** https://hyperframes.heygen.com/guides/timeline-editing
- **GitHub:** https://github.com/heygen-com/hyperframes
- **Registry catalog:** `npx hyperframes catalog`
- **Slides design system:** your slides/deck skill - typography, colors, brand, layouts
- **Design tokens:** your workspace design reference - locked color/font tokens

## Files in this skill (kit)

```
animate/
├── SKILL.md                                  ← this file
├── templates/
│   ├── composition-template.html             ← scaffold: tokens, hex mesh, GSAP, watermark
│   ├── storyboard-template.html              ← per-scene storyboard (talking-head wrap workflow)
│   ├── multi-direction-storyboard-template.html  ← 3-direction concept-explore storyboard
│   │                                              (A/B/C parallel concepts × 4 keyframes each)
│   ├── globe-d3-canvas.html                  ← D3 + canvas hero pattern (rotating globe), with
│   │                                            pre-computed dots + time-driven rotation
│   ├── remotion-port-template.html           ← Remotion useCurrentFrame → GSAP onUpdate port
│   ├── shader-three-template.html            ← three.js shader scene with timeline-tick draw
│   ├── recipes.md                            ← copy-paste pattern library (now incl. recipe 11:
│   │                                            Python module-generator pattern for N-similar-slides)
│   ├── silence-cut.sh                        ← Pass 1: ffmpeg silence trim, 1s GOP
│   ├── transcribe-whisper.py                 ← Pass 2: faster-whisper word-level transcript
│   └── cut-retakes.py                        ← Pass 3: last-take-rule retake removal
├── blocks/                                   ← drop-in production blocks (this session, May 2026)
│   ├── README.md                             ← what each block is + how to customise
│   ├── worldmap.html                         ← 10s · D3 dotted globe + curved hub-spoke routes +
│   │                                            travelling dots + pulsing markers + stat strip
│   ├── cinematic-hero.html                   ← 10s · shader → card pull-up → iPhone mockup with
│   │                                            counter ring + glass badges → CTA pull-back.
│   │                                            Translation of a scroll-driven shadcn React hero
│   │                                            into a deterministic linear timeline.
│   ├── logo-outro.html                       ← 6s · asterisk reveal + emphasis headline + URL pill
│   │                                            + brand watermark (closing card)
│   └── course-tour/                          ← 164s · full multi-beat course promo project
│       ├── index.html                        ← root (10 clips + audio mux on track 9)
│       ├── hyperframes.json                  ← framework config
│       ├── gen_modules.py                    ← parameterised generator (6 module slides from
│       │                                       data dict, see recipe 11 in recipes.md)
│       └── compositions/
│           ├── intro.html                    ← WebGL shader → D3 globe + tagline (15s)
│           ├── title.html                    ← course title + 6 module pills (7s)
│           ├── m1.html - m6.html             ← 6 module slides (23s each, distinct accent)
│           └── closing.html                  ← community CTA (4s)
├── recipes/
│   └── embedded-data.md                      ← embed JSON as window.X (no fetch at render time)
├── examples/
│   ├── perspective-marquee.html              ← Remotion useCurrentFrame port → GSAP
│   │                                            (per-item blur via onUpdate, modifiers.x wrap)
│   ├── interactive-3d.html                   ← Aceternity Spotlight + shadcn Card +
│   │                                            <spline-viewer> port (with CSS-mock fallback layer)
│   └── app-showcase-wise-reskin.html         ← catalog block reskin example
│                                                (fitness app → Wise multi-currency)
└── assets/
    ├── ne_110m_land.js                       ← Natural Earth land as JS module (window.NE_LAND)
    ├── ne_110m_land.json                     ← Natural Earth land as raw JSON (fetch-friendly,
    │                                            used by course-tour/intro globe)
    └── world-map-dotted.svg                  ← static dotted-map SVG (198×100 viewBox), generated
                                                via `npm i dotted-map` → 5-line node script.
                                                Drop in as full-bleed bg for any globe composition;
                                                used by blocks/worldmap.html.
```

`recipes.md` is the most-reached-for file once you've got the basics. Drop into any composition.
`blocks/` is the most time-saving folder - start there if your video matches one of the four
shapes (globe, cinematic-hero, logo-outro, course-tour).
- `templates/silence-cut.sh` - ffmpeg silence-removal script template
