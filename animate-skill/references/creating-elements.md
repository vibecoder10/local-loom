# Creating a new element

An element is anything the library can preview on hover, add to an agent prompt, and a composition can drive from scene-local time. Make it once, register it, reuse it everywhere. These are rails, not a style guide: vary composition, rhythm, structure and metaphor freely inside them.

## Contents

- What counts as an element
- The contract
- Quality bar
- Build steps
- Register it
- Freedom and limits

## What counts as an element

| Kind | Ships as | Example in the library |
|---|---|---|
| Motion recipe | A GSAP timeline on a stage | From the left, Turn then drift |
| Pattern | JSON configuration plus the pattern engine | Hub-and-spoke system, Icon Title |
| Component | HTML/SVG with a `create` API | Workspace layers, four-layer parallax |
| 3D object | GLB plus engine bundle and source | Prism Core, Minimal iPhone |
| Hero text | A deterministic counter or title | Count-up hero number |
| Background | A `renderAt(t)` canvas function | Dot-matrix wave |
| Layout | A composition template | Eight-reel spotlight, browser window |
| Graphic, Broll, icon, sound | The file plus its provenance | Transparent illustration, CC0 click |

## The contract

Every element that moves exposes the same small API, so the library preview, the composition and the renderer drive it the same way:

```js
window.MyElement = {
  defaults: { /* every knob with its default value */ },
  create({ container, width, height, aspect, config }) {
    // build DOM or canvas once: no timers, no random values, no fetch
    return {
      renderAt(t) {},        // t = scene-local seconds; a pure function of t
      setConfig(partial) {}, // optional: editable knobs (depth, amplitude, colours)
      resize(w, h) {},       // recompose for the other aspect; never stretch
      dispose() {}           // stop everything, free WebGL and media
    };
  }
};
```

What the contract implies:

- `renderAt(t)` returns the same frame for the same `t`, forwards or backwards. Compute state from `t`; never accumulate it.
- Both aspects. 16:9 and 9:16 must each look composed. Reposition and re-crop; do not scale the whole thing.
- Editable. Knobs live in `defaults` or a JSON file beside the source, not buried in code.
- Still until asked. No autoplay on load. The library calls `renderAt` on hover; the renderer calls it per frame.
- Portable. Relative paths only; fonts and vendor scripts load from the element's own folder or the package `assets/`.

## Quality bar

- It explains the spoken idea. If a caption would do the same job, the element is decoration.
- One idea per element. A diagram with six relationships is three elements.
- Entrances follow the house motion: 0.4 seconds, sharp ease, moving blur, crisp hold. Real 3D: one Y turn over 0.5 seconds, no entry blur.
- It reads at phone size in portrait and at desk size in landscape.
- Authentic marks stay authentic. Symmetry and pixel styling apply to your own symbols, never to someone else's logo.
- A hold is never frozen: keep a restrained pan, drift or breathing motion from `t`, with a zero-motion option for stills.

## Build steps

1. Copy `templates/element-template.html` into the video's `assets/components/<name>/` (or the package `assets/components/<name>/`). Done when the harness opens and scrubs.
2. Fill `create`, `renderAt`, `resize` and `dispose`. Done when scrubbing backwards reproduces the same frames and both aspect buttons look composed.
3. Add a poster: a still PNG or SVG at the element's best moment, one per aspect if they differ. Done when the poster matches what hover would show.
4. Save provenance beside it: a short `README.md` (what it is, knobs, how to mount) and, for generated artwork, the prompt and the tool. Done when a stranger could reuse it from the folder alone.
5. Mount it in a composition through the template's `renderAt` hook and lint. Done when lint is clean and the render matches the preview.

## Register it

Write a small JSON entry and run the library's register script (the exact command is in element-library.md):

```json
{
  "key": "orbit-three-v1",
  "name": "Orbit of three tools",
  "category": "Infographics",
  "description": "Three tool icons orbit a centre idea, revealed in spoken order.",
  "image": "assets/components/orbit-three/poster.png",
  "html": "assets/components/orbit-three/index.html",
  "element": "OrbitThree",
  "elementPath": "assets/components/orbit-three/orbit-three.js",
  "config": { "spacing": 1.0, "holdMotion": 0.4 },
  "tags": ["infographic", "orbit", "editable", "16:9", "9:16"],
  "status": "Reusable",
  "shareable": true
}
```

`element` is the global name your script sets on `window`; `elementPath` is the script the library loads on hover; `config` is merged over `defaults`. Categories: Layouts, Motion, Infographics, Hero text, 3D objects, Graphics, Icons, Backgrounds, Broll, Sound effects, Music. Rebuild the page and check the new card previews in both aspects. Not registered means not done.

## Freedom and limits

Free: composition, rhythm, structure, metaphor, colour within the palette, how parts reveal, what the hold does. Compare several structures privately before committing; the first idea is rarely the clearest.

Fixed: the contract, the timing defaults, the two-word subtitle cap, authentic marks, provenance, registration.
