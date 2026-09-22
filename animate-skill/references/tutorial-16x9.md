# 16:9 tutorials from a Local Loom take package

Ryan's pipeline: Local Loom (Longform + Screen) records the tab and the camera separately, cuts the retakes, and writes a **take package**. Animate turns that package into the finished, overlaid tutorial in Ryan's What We Built style. Words are already timed, so no transcription runs.

## Input: the take package

`<job>/take-package/` (path shown on the Local Loom recorder page). Everything is on the **finished (cut) timeline**, 30 fps.

| File | Use |
|---|---|
| `manifest.json` | `capture` must be `tutorial`, `format` `longform`; `media.screen` / `media.camera` sizes; `duration.finished` |
| `screen.mp4` | clean tab: no bubble, no captions. The overlays' base layer |
| `camera.mp4` | raw camera + the mixed audio (native lip-sync). The voice track |
| `words.remapped.json` | word timings for captions and for placing overlays |
| `script.txt` | the teleprompter script, if used (plan chapters and callouts from it) |
| `finished.mp4` | Local Loom's own export, for reference/comparison |

Camera clips from Local Loom before 0.14.1 are 640x480: fine for the corner bubble, soft for a full-screen "presenter" beat. 0.14.1+ records 720p when clean clips are kept.

## Steps

1. **Scaffold** (never overwrites a plan): `node ~/AgentVault/Skills/Personal/animate/scripts/scaffold-tutorial.mjs <take-package> <project-dir>`. Puts the fonts, GSAP, media (hard-linked), take files and a starter `scene-plan.json` in the project. Pin: HyperFrames 0.8.41.
2. **Plan.** Read `take/words.remapped.json` (and `script.txt`). Write `scene-plan.json`: scenes back to back, overlays tied to the spoken phrase or visible event that each explains. Let the footage hold undecorated where nothing needs explaining. Show Ryan the plan before building when the video is long.
3. **Build:** `node .../scripts/build-tutorial.mjs <project-dir>` (validates the plan with plain-language errors, writes `index.html` + `captions.json`).
4. **Lint, snapshot, render** from the project folder: `npx --yes hyperframes@0.8.41 lint`, `... snapshot --at <seconds>`, `... render -o renders/final.mp4 --fps 30`. Open snapshots at every scene boundary and each overlay.
5. **Verify:** ffprobe (1920x1080, 30 fps, duration = manifest `duration.finished`), full decode, audio present, captions on screen when words are spoken. Register anything new you made (see SKILL.md).

## Layouts (scene types)

- `screen`: the clean tab full-width in a framed box (3px ink border, hard 16px shadow), camera as a bubble in the free band under it (size adapts to the tab's aspect). Captions in a plate to its right.
- `presenter`: camera full-screen (hooks, emphasis, sign-off). Grows from the bubble in 0.4 s; never crossfaded. Captions have no plate (ink-stroked text).
- `split`: panel left, camera plate right (800x800). For concept beats that have no screen. The panel is the same shared kit as the 9:16 short (`templates/shared/panel-kit.*`): `kicker`, `title` (words slam in; `titleAt` = one second per word; `accent`), `points[{text,at}]` (`numbered`), `stat{value,label,size,count,at}`, `icons{connector,tint,items[{icon,label,at}]}`, `image{src,caption,at}`, `visual: keycap | timeline` (+ `visualAt`). Field rules are identical to the 9:16 section below and validated by the same code (`scripts/panel-plan.mjs`).

## Overlays (fractions are of the screen clip: 0..1)

- `chapter` `{at, duration, text, label}`: ink plate with an orange bitmap number, slides in top-left.
- `callout` `{at, duration, text, x, y, side, w, h}`: label + stepped elbow arrow to a hard-edged ring on the point `(x,y)`; `side` is `up-left` (default), `up-right`, `down-left`, `down-right`.
- `zoom` `{at, duration, region:[x,y,w,h]}`: punch-in on a region of the screen (up to 3x); callouts inside a zoom are positioned for it (ring size scales with the zoom).
- `logo` `{at, duration, icon, label, x, y, size}`: a real brand mark (Simple Icons slug like `googlechrome`), pixel glyph (`camera | tab | film`) or `text:Aa` tile that pops in on the word, bobs and leaves. `x,y` are fractions of the whole video frame (default 0.9, 0.2); a paper label plate keeps it readable over dark screens. Use it whenever the speaker names a company or product.
- `stat` `{at, duration, value, label, count, x, y}`: a hard plate with a big number (`count: true` counts a whole number up).
- `chapter` and `callout` also take `icon` (tile beside the text); chapter words slam in, callout pops with overshoot, its ring pulses and its arrow draws in pixel steps.
- Always moving: progress bar (top edge), drifting pixel grid, floating camera, caption word lift.
- Captions: automatic from `words.remapped.json`, up to 6 words per line, spoken word highlighted in orange. Turn off with `"captions": {"enabled": false}`.

## 9:16 talking head (camera-only take: `capture: camera`, `format: shorts`)

Same idea, portrait, no screen. Scaffold with `scripts/scaffold-short.mjs <take-package> <project>` (refuses any other capture kind), write `scene-plan.json`, build with `scripts/build-short.mjs <project>`, then lint, snapshot and render exactly as above (1080x1920).

- `presenter`: camera full-screen with ink-stroked captions (hook, sign-off). A 640x480 camera upscales 4x here, so keep these to a few seconds; check them in the snapshots.
- `split`: panel on top (952x810), camera plate below (952 wide, source aspect, hard orange shadow), captions on a plate under it. Panel = `kicker`, `title` (each word slams in; `titleAt` = one second per word so it lands on the spoken word; `accent` = the word to colour), plus any of `points[{text,at}]` (`numbered: true` for steps), `stat{value,label,size,count,at}` (`count: true` counts a whole number up), `icons{connector: none|plus|arrow, tint: brand|ink, items[{icon,label,at}]}` (1 to 5 tiles; `icon` = Simple Icons slug fetched and cached by `scripts/icon-cache.mjs`, a glyph `camera | tab | film`, or `text:Aa`), `image{src,caption,at}` (local file, wipes in with a slow push), `visual: "keycap"` (`key`, `keyLabel`, `visualAt`: rises, presses, bursts into pixels) or `"timeline"` (`visualAt`: playhead sweeps, the mistake block vanishes, the gap closes). Icons share a panel with at most a stat or two points; the timeline visual takes the whole panel.
- Plan from the script before the shoot when there is one; tie each `at` to the spoken word in `take/words.remapped.json`. Scenes run back to back; the last ends at `duration.finished`.
- Transitions: panels push left/in from the right, the camera resizes between plate and full (0.4 s, blur, never crossfaded). Captions are groups of up to 5 words; the spoken word is orange.
- Always moving: progress bar (top), drifting pixel grid, the camera plate floats a few pixels, the spoken caption word pops. Company named in the transcript = logo tile on that word (rule 9 in SKILL.md).
- Proof: `short-proof/talking-head-1/` (static v1) and `talking-head-2/` (dynamic v2, the current look) under `~/AgentVault/Projects/animate/`; 49 s real take, 1080x1920, 30 fps, 47 s render.

## 16:9 talking head (camera-only take, Screen share OFF, Format Longform: `capture: camera`, `format: longform`)

Same idea as the 9:16 short, landscape. Scaffold with `scripts/scaffold-talking-head-16x9.mjs <take-package> <project>` (refuses any other capture kind), write `scene-plan.json`, build with `scripts/build-talking-head-16x9.mjs <project>`, then lint, snapshot and render exactly as above (1920x1080).

- `presenter`: camera full-screen, ink-stroked captions. Hook/sign-off only.
- `split`: panel on the LEFT (1090x760), camera plate on the RIGHT (662x760, cover-cropped from the source), captions on a plate underneath both. Same panel fields as the 9:16 recipe (`kicker`, `title`/`titleAt`/`accent`, plus at most one of `points`/`stat`/`icons`/`visual`).
- Proof: `~/AgentVault/Projects/animate/short-proof/talking-head-16x9-1/` (auto-planned from a real 80s Local Loom take, 14 scenes, real Anthropic/markdown logo tiles). One bug found and fixed on first render: the off-screen panel slide distance (`OFF_R` in the template) has to clear `1920 - panel.x`, not just be "big" - too small left a sliver of the next panel visible during full-screen presenter scenes.

## Not done yet (be honest about it)

Screen + shorts recipe (`capture: shorts-screen`: screen-top/head-bottom, graphics-top, cursor-driven zoom from `cursor.json`), sound effects, 3D, more panel visuals (only keycap and timeline exist). RoboNuggets library elements are still ROBO-styled: restyle on use ([restyle.md](restyle.md)).
