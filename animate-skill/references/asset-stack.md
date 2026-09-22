# Asset stack - what exists, what it's for, how to reach it

Everything the RoboNuggets ingestion (2026-09-21) and Ryan's own work put into `~/AgentVault/Projects/animate/pack/` (194 MB), so nothing in there goes unused just because it isn't the thing you happened to build first. Read this when you're not sure whether something already exists before building it from scratch (universal rule 2), or when you want to know what a whole category of assets is *for*.

For registered, previewable elements, **`pack/library/index.html` is still the source of truth** - open it, hover a card, Add. This doc covers the same ground plus the raw folders under `pack/assets/` that aren't all individually browsable as cards, so you know what's there and when to reach for it.

## The registered library (121 entries, `pack/library/assets.json`)

Browse at `pack/library/index.html`. Categories and what each is for:

| Category | Count | Reach for it when... |
|---|---|---|
| Infographics | 28 | You need a diagram pattern (see "Patterns" below - most of these ARE the pattern set, catalogued individually) |
| Icons | 26 | A concept needs a pixel-art or line icon that isn't a named brand (brand names use Simple Icons via `scripts/icon-cache.mjs`, not this) |
| Motion | 18 | You want a named motion technique with runnable code - also see `pack/library/motion-studio.html`, 14 of these with copyable GSAP |
| 3D objects | 15 | A real 3D beat (rare in our overlay-first/tutorial work; more relevant to presenter reels) |
| Sound effects | 15 | See "Sound effects" section below - 4 are wired into every recipe already, the other ~11 are available but unreviewed for personal use |
| Backgrounds | 6 | An alternate background treatment to the default wolf-grey pixel grid |
| Graphics | 5 | Small decorative marks |
| Layouts | 4 | A whole-composition layout scaffold, not just one element |
| Hero text | 2 | A big-number or hero-headline treatment |
| Broll | 2 | Placeholder/example broll only - real broll is sourced per `references/production-manual.md`, not this library |

## Sound effects - wired in, and what's still available

**4 house cues are wired into every recipe already** (`templates/shared/panel-kit.js`'s `SFX` map + `playSfx()`, called from `buildPanel()` and each recipe's `template.html`). Gains match `references/reel-production.md`'s "Audio, folders and proof" section exactly - don't re-derive them:

| Role | File | Gain | Fires on |
|---|---|---|---|
| `title` | `switch_001.wav` | 1.0 | Every split scene's kicker+title landing (the dot pop) |
| `count` | `glass_001.wav` | 1.0 | A stat/number finishing its count-up |
| `lock` | `confirmation_001.wav` | 0.3 | A scene's resolution beat: `searchfilter`'s match found, `branch`'s path chosen, `merge`'s result landing |
| `cut` | `click_003.wav` | 0.8 | Every scene-to-scene transition |

The wav files live in `templates/tutorial-16x9/assets/` (the shared scaffold source every recipe's scaffold script copies into a new project - same folder that already carries fonts and `gsap.min.js`). To add a new cue point: call `playSfx(root, before, role, at, trackIndex)` from wherever you're already scheduling a GSAP tween for that moment, picking an unused `data-track-index` for that recipe (each `template.html` declares its taken tracks in a `SFX_TRACKS` const near the top - video/voice/screen own 0..N, sfx roles start right after).

**~11 more sound effects exist in the library, unreviewed for personal use** (`pack/assets/sound-effects/`: `back_001`, `click_001`, `drop_001`, `maximize_001`, `minimize_001`, `open_001`, `close_001`, `pluck_001`, `scroll_001`, `scratch_001` - see `manifest.json` for what each one is). All Kenney CC0 (`LICENSE-Kenney.txt`, no attribution required). If a new panel-kit visual or overlay needs its own distinct cue (e.g. `pluck_001` "small elastic accent for an icon entrance" would fit a tile popping in), it's free to use - just pick a gain by ear the way the 4 house cues already were, and register the choice back into this table and `reel-production.md` once approved.

## Patterns (`pack/assets/patterns/`, 35 files, mostly already in the Infographics library category)

Named diagram layouts, each as landscape + portrait HTML/SVG/JSON, all driven by one shared `pattern-engine.js`: **numbered**, **orbit**, **hub**, **burst**, **globe**, **collection**, **strip**, **icon-title**. Useful as a naming/concept reference even where we've since built our own equivalent in `panel-kit.js` (our `network` visual ~ their "hub"; our `flow` ~ their "strip"; nothing of ours currently covers "orbit," "burst," "globe," or "collection" - worth a look if a future scene needs one of those shapes). These are still ROBO-styled (Outfit font, orange/cream palette) - restyle on use (`scripts/restyle-colors.mjs`), same as any other pack template.

## Brand-inspired demos - reference only, not for reuse as-is

- `pack/assets/brand-components/` (10 folders: duospeak, forma, ember, thoughtgarden, orbitdesk, collaboration, huly-depth, parallax, productivity, workspace) - polished demo compositions built to *look like* other real products' marketing sites. Good for seeing a technique in action; don't ship one of these as our own client's asset without a real reason and a license re-check, since the underlying visual identity being imitated isn't RoboNuggets' to license.
- `pack/assets/app-components/app-chat-3d-v1/` - a 3D "app chat" scene using Claude Code / Codex / other AI-tool GLB models and logos. Same caveat: illustrative, not an endorsement, don't present as official.
- `pack/assets/ai-logos/` (20 SVGs, LobeHub, MIT-licensed artwork) - real AI-company brand marks. Fine to use as icons (we already do this via Simple Icons for the same purpose - prefer `scripts/icon-cache.mjs` for consistency); never imply partnership/endorsement.

## Everything else in `pack/assets/`

| Folder | What it is | When to reach for it |
|---|---|---|
| `components/` | **Ryan's own finished kit exports** (`tutorial-kit`, `talking-head-kit`, `brand-icons`) - already registered, already wired into our recipes. Not RoboNuggets content. | Reference only; the live code is in `templates/`, not here. |
| `eight-reel/` | The eight-reel-wall template's own bundled assets | Only with `references/eight-reel-wall.md` |
| `items/` | 190 files, 129 MB - raw media backing the library's catalog cards (GLBs, preview PNGs, a couple of "brand-engine" JS bundles, hand-drawn SVG mascots) | Don't browse this folder directly - go through `library/index.html`, which is what actually catalogs and previews these |
| `vendor/` | Shared `three.js`/`gsap.min.js` | Already wired wherever 3D or motion needs them |
| `fonts/` (`outfit.woff2`) | RoboNuggets' original type | Not used - Ryan's rule 2 replaces it with Inter + Pixelify Sans (already in every template's `assets/`) |
| `browser/placeholder.svg` | A generic browser-chrome placeholder graphic | Screen-recording mockups that need a fake browser frame |

## What's deliberately NOT here

RoboNuggets' `/generate` skill (community-only broll generation) is not installed - see Ryan's rule 5. The Copernicus font isn't included anywhere - replaced with Inter/Pixelify per rule 2. Personal music and source voice tracks from the original author were never part of this pack.
