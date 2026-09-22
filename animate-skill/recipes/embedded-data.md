# Embedded Data Asset Pattern

Hyperframes Critical Rule 6 forbids `fetch()`, `Math.random()`, `Date.now()`, etc.  -  anything non-deterministic. But many cool components (globes, maps, network graphs) need data files.

The fix: **embed the data at build time** so it's loaded as a regular script, not fetched at runtime.

## Why this matters

Hyperframes renders frame-by-frame by seeking the timeline. If `fetch()` hasn't resolved when the renderer captures frame 0, you get a blank frame. Even worse  -  different fetch timings between renders = non-deterministic output.

Embedding the data inline makes it part of the page load, which the renderer waits on.

## The recipe (one-liner)

Drop your raw data file into `assets/`, then wrap it as a JS file that sets a global. Use a project-prefixed name to avoid global collisions:

```bash
cd <project-folder>/assets
(echo "window.NE_LAND = "; cat ne_110m_land.json; echo ";") > ne_110m_land.js
```

Now you have `assets/ne_110m_land.js` that, when loaded, sets `window.NE_LAND` to the parsed JSON.

> **Note:** The Natural Earth land geometry is already wrapped and ships in this skill at `assets/ne_110m_land.js` (window.NE_LAND, 237 KB). Copy that file into your project's `assets/` folder rather than re-downloading.

## Including it

In your `index.html`:

```html
<script src="assets/land.js"></script>
<!-- ... your other scripts ... -->
```

Make sure `land.js` loads BEFORE the script that uses `window.LAND`.

## Using it

```js
if (window.NE_LAND && window.NE_LAND.features) {
  window.NE_LAND.features.forEach((f) => { /* ... */ });
}
```

## Pre-compute expensive deterministic loops

If your data needs preprocessing (e.g. generating halftone dots from polygons), do it ONCE at script load  -  not per frame:

```js
// Pre-compute at script load. Deterministic given the data.
const ALL_DOTS = [];
window.NE_LAND.features.forEach((f) => {
  generateDotsInPolygon(f, 16).forEach((d) => ALL_DOTS.push(d));
});

// Per-frame draw just iterates the pre-computed array.
function drawGlobe(time) {
  for (const dot of ALL_DOTS) { /* project + paint */ }
}
```

Why: the renderer redraws every frame the timeline seeks to. Recomputing dots inside `drawGlobe` would be 60× slower per second of render and would give the same answer every time.

## Rules of thumb

- **Anything under ~5 MB**: just embed via the `window.X` pattern above.
- **Larger data (5-50 MB)**: same pattern but consider whether the data can be downsampled first (most GeoJSONs ship at multiple resolutions  -  `110m`, `50m`, `10m`  -  pick the smallest that looks right).
- **Truly massive (50 MB+)**: split across multiple scoped scripts, or reconsider whether you need the data at all.
- **Naming**: `assets/<name>.js`  -  same name as the source file, just `.js` extension.
- **Globals**: prefix with the project (`window.GLOBE_LAND`, `window.NETWORK_NODES`) when sharing across multiple compositions.

## Worked example

An early globe build wrapped 237 KB of GeoJSON as `window.LAND` before the `window.NE_LAND` convention existed. New work should use `window.NE_LAND` and reuse the `assets/ne_110m_land.js` file from this skill.
