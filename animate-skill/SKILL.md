---
name: animate
description: Ryan's /animate. Add editable animated overlays to existing video (the default job), build HyperFrames (HTML to MP4) presenter reels in 9:16 or 16:9, turn a Local Loom take package into a 16:9 tutorial or a short, and make motion graphics, real 3D and infographics from a reusable element library, registering every new element back into it. Use when the user says "animate", "/animate", "hyperframes", "html to mp4", "render this", "motion graphics for [recording]", "overlays on this video", "take package", "tutorial overlays", "storyboard a video", "cut this footage", "make a reel", "landscape version", "vertical version", "create an element", "register this asset", or asks what reusable elements exist.
---

# Animate

Two sources, one skill. The workflow, motion rules, element library and evals come from the refined RoboNuggets Animate (ingested 2026-09-21, provenance below). The style, the overlay-first rule and the way feedback is absorbed are Ryan's own from the v1 skill. **Where they disagree, Ryan's rules win** (next section).

Principle: every scene is a pure function of scene-local time, so previews, scrubs and renders agree.

## Where things live

- **This skill:** `~/AgentVault/Skills/Personal/animate/` (linked from `~/.claude/skills/animate` and `~/.codex/skills/animate`).
- **The pack** (library, assets, example renders; keep it together, everything links by relative path): `~/AgentVault/Projects/animate/pack/`. Run pack scripts from there: `node library/register-asset.mjs entry.json`, `node library/build.mjs`. Open `library/index.html` to browse; hover a card to preview, Add copies an agent-ready selection.
- **Ryan's v1 project and approved sample:** `~/AgentVault/Projects/animate/` (`sample/`, `CHECKLIST.md`). v1 skill backup: `~/AgentVault/Projects/animate/backup/codex-skill-v1-2026-09-21/`.
- **Provenance:** `~/Downloads/robonuggets-animate.zip` (Animate, 118 library entries, tested by the author with HyperFrames 0.8.34), CC BY 4.0 for original text/templates; third-party terms in `pack/THIRD-PARTY-NOTICES.md`. Keep `pack/LICENSE`.

## Ryan's rules (these override anything in the RoboNuggets files)

1. **Overlay-first.** With existing footage, preserve the footage, its audio, aspect ratio and duration; the job is overlay design, not remaking the source. Keep the real video unpixelated and in its original colour; `contain` by default, `cover` only when the crop is approved. Keep a muted video clip and a separate audio clip with distinct IDs and identical start/trim so nothing double-plays. Plan safe regions around faces, screens and demo content before placing captions, callouts or arrows.
2. **Style: What We Built (wolf grey / black / orange).** Canvas `#D9DCDF`, lighter surfaces `#EEF0F2`, text `#161819`, accent `#E65D20` used selectively, supporting greys `#6D747A` / `#A7ADB2`. Inter 500/800 for type, Pixelify Sans 700 for occasional bitmap labels. Crafted, subject-specific pixel art with stepped edges; hard offset shadows (for example `20px 20px 0` in accent or ink); no soft drop shadows. Inspect `~/AgentVault/Skills/Personal/frontend-slides/references/approved-pixel-style.png` before the first visual; guidance in `approved-pixel-style.md` beside it. A client or user brand overrides it. **This replaces RoboNuggets' ROBO palette (paper `#f2efe8`, orange `#ff6b1a`), Outfit + Copernicus type and the getrubric dot-wave background.** Ryan said "keep the style" on 2026-09-21.
3. **RoboNuggets timing rules are proven defaults, not law.** The 0.4-second sharp transitions, 6-second scenes, two-word captions, 65% presenter coverage and hero-number counts apply to generated presenter reels unless Ryan says otherwise. For overlays on existing recordings (tutorials) tie each overlay to the spoken phrase or visible event it explains and let footage hold undecorated. If Ryan's feedback contradicts a RoboNuggets rule, his feedback replaces the rule in place.
4. **Words and transcripts.** A Local Loom take package already has word timings (`words.remapped.json`): use them, do not re-transcribe. For other recordings transcribe locally with Whisper.cpp by default ([local-transcription.md](references/local-transcription.md)); AssemblyAI ([assemblyai.md](references/assemblyai.md)) only when requested; never upload because local failed. Record `timing_source` (`editorial`, `audio_estimated_words`, `measured_words`, `take_package`). Never print, commit or save keys; report only whether one is present.
5. **Images.** No "one generated image per video" requirement (Claude Code has no native image generation). Draw art in code (SVG, CSS, canvas pixel art) in the house style. Paid image generation only with a cost quote and Ryan's yes. Never present a generated concept as a real screenshot. RoboNuggets' `/generate` skill (community-only) is not installed.
6. **HyperFrames is pinned to 0.8.41** (`npx --yes hyperframes@0.8.41 ...`), the version Ryan's v1 verified. The RoboNuggets docs say `@latest`; do not follow that unless upgrading on purpose. 0.8.41 ignores `--skip-skills` on `init`, so make minimal project files by hand (or scaffold with `scripts/scaffold-tutorial.mjs`).
7. **Refine by patterns.** When Ryan gives feedback, turn it into a reusable pattern with a reason and replace the relevant rule in place; keep this file short, no dated correction sections. Re-render the same brief when the change affects output and compare with the accepted reference. Successful render is not approval; register approved pieces separately ([components.md](references/components.md), [refinement.md](references/refinement.md)).
9. **Dynamic, never a static text card.** (Ryan, 2026-09-21: "too static... real icons if I talk about a company, images if needed, super engaging".) Every element enters on the spoken word that explains it (words slam in on their beat, tiles pop with overshoot, counters count, a playhead sweeps, a keycap bursts), something is always moving (progress bar, drifting grid, floating plate), and information is shown as a picture, not a sentence. **A named company or product gets its real logo tile** (`scripts/icon-cache.mjs`, Simple Icons: slug `googlechrome`, `apple`, `openai`...); anything with a visible metaphor gets a pixel glyph (`camera`, `tab`, `film`) or a visual (`keycap`, `timeline`); a real photo or screenshot goes in an `image` panel when it helps (local file; generated images only with a cost quote). Plan the beats from the transcript words before building.
8. **Restyle on use, not up front.** 69 of the pack's ~106 text files hard-code the ROBO colours. When you pick a library element or template, run `node scripts/restyle-colors.mjs <file>` (dry run by default; see [restyle.md](references/restyle.md)) and check both aspects before using it. The Ryan-styled 16:9 tutorial kit is already done ([tutorial-16x9.md](references/tutorial-16x9.md)).

## What are you doing? Read the one file

| Doing... | Read | Covers |
|---|---|---|
| A 16:9 tutorial (Screen take), a 9:16 talking-head short, or a 16:9 talking head (camera-only takes) from a Local Loom take package | [tutorial-16x9.md](references/tutorial-16x9.md) | take package input, layouts, overlay kit, scaffold + build + render for all three |
| Overlays on any existing recording | this file, rule 1, then [production-manual.md](references/production-manual.md) | source preservation, safe regions, footage prep |
| A presenter reel, portrait or landscape | [reel-production.md](references/reel-production.md) | type, layouts, resources, 3D, hooks, beats, audio, proof (style section already converted to Ryan's) |
| Any other composition, storyboard or render | [production-manual.md](references/production-manual.md) | four phases, lint rules, footage prep, motion patterns, CLI |
| Words on screen | [motion-copy.md](references/motion-copy.md) | hook, subtitle and CTA copy rules |
| The eight-reel wall | [eight-reel-wall.md](references/eight-reel-wall.md) | reuse of the approved template |
| Finding or registering an element | [element-library.md](references/element-library.md) | categories, previews, register and rebuild |
| Creating a new element | [creating-elements.md](references/creating-elements.md) | the element contract, quality bar, registration |
| Restyling a RoboNuggets element or template | [restyle.md](references/restyle.md) | ROBO to Ryan colour/type map and the helper script |
| Checking your work | [evals.md](references/evals.md) | acceptance prompts with observable checks |
| Something in a render feels off (timing, weight, spacing) and you're not sure which knob to turn | [knobs.md](reference/knobs.md) | parameter-by-parameter tuning checklist |
| Need a motion pattern with runnable code, not just a description | `pack/library/motion-studio.html` (open in a browser; 14 motion recipes with copyable GSAP) | recipe gallery |
| Wondering what's in the pack (sound effects, patterns, 3D, brand demos, fonts) or whether something already exists before building it | [asset-stack.md](references/asset-stack.md) | full category-by-category map of `pack/assets/`, what's wired in already, what's reference-only |

Read only the file for the job in hand.

## Universal rules (never skipped)

1. **Every new asset, element or component goes into the elements library before the job is called done.** Register with `node library/register-asset.mjs entry.json` from the pack root, which rebuilds `library/index.html`. Generated images, clips, SVGs, 3D objects, backgrounds, sounds and reusable compositions all count. Unregistered means unfinished.
2. **Look in the library before building** (a preview takes seconds, a rebuild takes an hour).
3. **Scene-local time drives everything.** `renderAt(t)` and GSAP timelines only: no timers, random values, clock or accumulated state, because the renderer seeks.
4. **Links, never tabs.** The user decides when a browser opens; validate headless and return paths, URLs or screenshots (in this desktop app, the in-app Browser pane is the exception: Ryan wants to watch).
5. **One folder per video, one common folder for shared masters.** Scaffold with `scripts/prepare-video-folders.mjs` or `scripts/scaffold-tutorial.mjs`.
6. Generation routing: see Ryan's rule 5.

## Workflow

1. **Brief.** Confirm count, format (9:16, 16:9 or both), review depth (screenshots first or straight to files) and delivery.
2. **Prepare footage.** A Local Loom take package is already cut and timed: skip this step. Otherwise transcribe, cut for speech-safe boundaries and re-encode with 1-second keyframes (production manual). Done when the source plays clean at true 30 fps.
3. **Plan the batch.** Opening, layout sequence, infographic structure and motion pattern for every video before building; vary across a batch.
4. **Pick elements** from the library; build only what is missing, using the element contract.
5. **Compose** one composition per video. Lint passes with 0 errors.
6. **Preview** with headless screenshots at representative times; a Studio tab on request.
7. **Render and verify.** Dimensions, frame rate, duration, full decode, audio peaks, caption rules on every frame; open it in a player and confirm time advances. Record renderer time. Technical checks are not creative approval.
8. **Register and hand back.** Register new elements, save provenance, return paths plus a short note listing tools, assets, timing source, library location and preview/render commands.

## Landscape vs vertical

One workflow, recompose never stretch. RoboNuggets' table for presenter reels:

| | Vertical 9:16 (1080x1920) | Landscape 16:9 (1920x1080) |
|---|---|---|
| Opening | Split layout with a short kinetic hook, a real resource, an infographic transformation or a native illustration | Full-screen real footage with no hook text; the playing layer then slides into the right plate |
| Split layout | Animation above, square presenter plate below | Animation left, presenter right |
| Presenter plate | 952x952 at (64,868), radius 64 | 820x820 at (1040,98), radius 54 |
| Full-screen footage | Native portrait or a centred 9:16 crop, no frame | 16:9 crop scaled uniformly, no frame; save the rectangle in `PRESENTER.json` |
| Subtitles and titles | 68-76 px / 96-116 px, centred | Same sizes, clear of the presenter plate; shorten copy before shrinking |
| Infographics | Above the presenter | Left of the presenter |
| Generated Broll | Native 9:16, never stretched | Native 16:9 |

**Tutorials are different:** a wide tab (for example 1920x836) squeezed into the left half of a split would be a sliver. Tutorial layouts keep the screen full-frame and bring the presenter in as a bubble, a full-screen beat or a right-hand plate ([tutorial-16x9.md](references/tutorial-16x9.md)).

## Motion defaults (RoboNuggets, kept as defaults for generated reels)

- New elements move in **0.4 s** with expo.inOut and moving blur that returns to zero at both settled endpoints.
- **Real 3D** turns once around Y over 0.5 s, fades in over 0.1 s, drifts at most 30 degrees, lasts at most 3 s.
- Big headline text and hero numbers sit directly on the scene with no backing shape; other authored text backgrounds use 80% fill with fully opaque text. In full-screen presenter scenes the footage stays unobscured.
- Hero numbers below 100 show immediately; 100 and above count over 0.5 s to a script-supported value. Approximations stay approximate.
- Presenter footage stays true 30 fps; animation samples at 15 fps with `Math.floor(mediaTime * 15) / 15`.
- Source cuts leave 0.2-0.3 s between spoken beats and at least 0.1 s around audible speech.
- Never hard-switch or crossfade presenter crops. Music sits at constant gain with no ducking.
- **Background: Ryan's, not the dot wave.** Wolf-grey canvas with a faint 12 px pixel grid (`#A7ADB2` at about 25%). Ryan asked for more motion (rule 9), so the 9:16 recipe drifts the grid slowly and runs a progress bar; no dot wave, no busy full-frame animation behind text.

## Resources

- `references/tutorial-16x9.md` - Local Loom take package to a 16:9 tutorial or a 9:16 talking-head short: layouts, overlay kit, scaffold and build scripts.
- `references/reel-production.md`, `production-manual.md`, `motion-copy.md`, `eight-reel-wall.md`, `element-library.md`, `creating-elements.md`, `evals.md` - RoboNuggets references (style sections converted where noted).
- `references/components.md`, `refinement.md`, `local-transcription.md`, `assemblyai.md` - Ryan's v1 references.
- `references/restyle.md` - ROBO to Ryan mapping.
- `references/asset-stack.md` - what's in `pack/assets/` category by category (sound effects wired in, patterns, 3D, brand demos, fonts, vendor libs), what's reference-only, what's deliberately excluded.
- `templates/` - composition template, storyboards, eight-reel wall, element template, port templates, `tutorial-16x9/` and `talking-head-9x16/` (Ryan-styled; both build their split panels from `shared/panel-kit.*`), `recipes.md`. Older templates are still ROBO-styled: restyle on use.
- `blocks/` - drop-in compositions (cinematic hero, logo outro, world map, course tour). ROBO-styled: restyle on use.
- `scripts/` - `scaffold-tutorial.mjs`, `build-tutorial.mjs`, `scaffold-short.mjs`, `build-short.mjs`, `scaffold-talking-head-16x9.mjs`, `build-talking-head-16x9.mjs`, `animate-take.mjs` (the Local Loom "Animate" button's deterministic orchestrator: scaffold -> one `claude -p` planning call -> build/validate (one retry) -> lint -> render, auto-picking the recipe from the take package's manifest), `panel-plan.mjs`, `icon-cache.mjs`, `restyle-colors.mjs`, `run-hyperframes.mjs`, `prepare-video-folders.mjs`, `local_transcript.py`, `assemblyai_transcript.py`, `transcribe-assemblyai.py`.

## Refining this skill

Absorb approved outcomes into the file that owns them instead of adding competing rules. Check changes against `references/evals.md`. Keep linked paths resolving (`scripts/check-links.mjs`).
