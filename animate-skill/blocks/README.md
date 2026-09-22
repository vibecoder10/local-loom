## Contents

- `worldmap.html`  -  Animated dotted globe with curved routes
- `cinematic-hero.html`  -  Hero text → card pull-up → mockup → CTA
- `logo-outro.html`  -  Asterisk + glow + community CTA
- `course-tour/`  -  Full multi-beat course/curriculum video
- Generic gotchas (apply to all blocks)

# Hyperframes blocks  -  drop-in templates

Four reusable Hyperframes compositions, battle-tested in production renders.
Copy any of these into your project's `compositions/` folder and rename. Search
for the `data-composition-id="<old-id>"` selector and replace with your new id.

---

## `worldmap.html`  -  Animated dotted globe with curved routes

10s · 1920×1080 · single composition

**What it is:** Dotted Natural Earth world map background, hub-and-spoke
animated routes from a central city to 6 destinations, traveling green dots
along each path, pulsing markers, headline + bottom stat strip.

**Stack:** plain SVG (paths) + GSAP MotionPathPlugin + a static dotted-map SVG
asset.

**Customise:**
- Replace city lat/lngs in the route definitions (search `M 625.97 192.92`).
- Swap the hub city + 6 destinations to fit your story.
- Recolour: change `#9ee87a` / `#518C16` / `#ff6b1a` to your accent.
- Headline copy: "Building **globally**." → your line.
- Stat strip values: "15+ · 30-50% · 5yr".

**Required assets:** `assets/world-map-dotted.svg` (also in this kit's
`assets/` folder).

---

## `cinematic-hero.html`  -  Hero text → card pull-up → mockup → CTA

10s · 1920×1080 · single composition

**What it is:** Translation of a scroll-driven shadcn React landing hero into
a deterministic linear timeline. Five phases: hero text reveal → card slides
up + hero blurs back → iPhone mockup with progress ring + counter ticks +
floating glass badges → side text + brand wordmark → card pulls back, tactile
CTA buttons appear.

**Stack:** GSAP-only. No external libraries beyond GSAP.

**Customise:**
- Hero copy: "Build the website, not just the brief." → your tagline.
- Brand wordmark: "PUVIN" (top-right) → your name.
- Card copy: "Conversion-focused websites." → your value prop.
- Counter target: 50% → your metric (search `counterObj.v`).
- Two CTA buttons: WhatsApp + URL → your CTAs (icons in `<svg>` blocks).

**Required assets:** none  -  fully self-contained.

---

## `logo-outro.html`  -  Asterisk + glow + community CTA

6s · 1920×1080 · single composition

**What it is:** RoboLabs-style closing card. Animated asterisk reveal (4
strokes draw in), big "Join the *community*." headline with green/orange em
emphasis, URL pill bottom, brand watermark.

**Stack:** GSAP only.

**Customise:**
- Headline copy + accent word.
- URL pill text.
- Brand watermark (currently ROBO LABS).
- Accent colour: `#ff6b1a` orange or `#518C16` green.

**Required assets:** none.

---

## `course-tour/`  -  Full multi-beat course/curriculum video

164s · 1920×1080 · 9 sub-compositions stitched in `index.html`, audio on track 9

**What it is:** End-to-end course-promo template. Was originally built for the
RoboNuggets Agentic AI Foundations curriculum tour (6 modules + intro globe +
title + closing). Demonstrates the **multi-beat module pattern**  -  same shape
slide repeated N times with different content and accent colour, parameterised
by a Python generator.

**Structure:**
```
course-tour/
├── index.html                  # root (164s timeline + audio mux)
├── hyperframes.json            # framework config
├── gen_modules.py              # parameterised generator for the 6 module slides
└── compositions/
    ├── intro.html              # WebGL shader → D3 globe + tagline (15s)
    ├── title.html              # course title slide + 6 module pills (7s)
    ├── m1.html - m6.html       # 6 module slides, each 23s, distinct accent
    └── closing.html             # community CTA (4s)
```

**Customise (recommended path):**

1. Open `gen_modules.py`, edit the `modules = [...]` list:
   - Change `id`, `num`, `section`, `color`, `agent`, `letter`, `title`,
     `purpose`, and `topics` (list of `(num, title, desc)` tuples).
2. Run `python gen_modules.py`  -  regenerates the 6 module HTML files.
3. Edit `intro.html` for your headline tagline (search "The most *complete*").
4. Edit `title.html` for the course title (search "Zero to *mastery*").
5. Edit `closing.html` for the closing CTA.
6. Drop your audio file at `assets/audio.mp3` (matching duration to total
   composition length, default 164s).
7. Adjust `index.html` durations if your audio is a different length.

**Required assets (drop into your project's `assets/`):**
- `audio.mp3`  -  your soundtrack (164s default)
- `ne_110m_land.json`  -  globe geometry (in this kit's `assets/`)

**Render time:** ~25 min on a 16-core machine. The intro globe is the slowest
section (D3 redraws on every frame). Halftone-dot land points are precomputed
once at load  -  DO NOT change to per-frame `d3.geoContains`, it stalls
indefinitely (see SKILL.md Critical Rule 18).

---

## Generic gotchas (apply to all blocks)

- All blocks use the **sub-comp background pattern**  -  bg is set on the
  `[data-composition-id="..."]` selector, NOT `body`. See SKILL.md
  Critical Rule 16.
- All entrances use `tl.fromTo()`, never `tl.from()` (SKILL.md Critical Rule
  on `immediateRender`).
- All ambient pulses are attached to the seekable `tl`, not bare `gsap.to()`.
- Hard-kill exits with `tl.set(stage, { opacity: 0, visibility: "hidden" })`
  at the scene boundary.

When in doubt: read SKILL.md's **Critical Framework Rules** section before
editing any block.
