# Local Loom

Local Loom is a Mac beta Chrome extension for screen and webcam recording. It downloads the original recording directly from Chrome and can use an optional loopback-only helper to create private transcripts and reviewable MP4 edits.

The current beta release is [v0.7.0-beta.1](https://github.com/vibecoder10/local-loom/releases/tag/v0.7.0-beta.1) (all releases: [Releases](https://github.com/vibecoder10/local-loom/releases)). GitHub's "latest" shortcut only resolves for non-prerelease releases, so it 404s while every release here is marked beta - link to the specific tag or the releases list instead.

## Features

- Screen capture through Chrome's picker, with microphone and optional camera composition.
- Original MP4/WebM download; no recordings are uploaded by this project.
- A **Mark mistake** button and Command+Shift+X shortcut for reviewable cut proposals.
- Separate edited MP4 export. The automatic download remains the original recording.
- Local transcript TXT/SRT and spoken `CUT` proposals when the optional helper is configured.
- Optional **Animate**: turn a finished take into a rendered video with animated overlays, kinetic titles, and sound effects. See [`animate-skill/`](animate-skill/) and the install doc below.

## Install on a Mac

This is a Mac beta. A fresh-machine installation is still a validation gap. The extension records without the helper, but transcription and rendered edits need locally installed Python, FFmpeg, Whisper.cpp, and an English Whisper model.

1. Download and unzip the release asset into a permanent folder.
2. Open the folder in Codex or Claude Code with local file and terminal access.
3. Paste this prompt:

   > Read INSTALL-WITH-AI.md in this folder and help me install Local Loom on this Mac, including the Chrome extension, local transcription/editing dependencies, and login helper. Follow your normal approval rules. Preserve existing recordings and settings. Verify installation and walk me through one short recording and edited export. Do not upload recordings anywhere.

4. Follow [INSTALL-WITH-AI.md](INSTALL-WITH-AI.md). Load `extension/` through Chrome's **Load unpacked** flow and give the installer that installation's exact 32-letter extension ID.

The companion binds only to `127.0.0.1:8768` and accepts the exact configured Chrome extension origin. It intentionally refuses to start without the recipient extension ID; do not weaken that check.

## Recording and editing behavior

`Mark mistake` saves a timestamp. After Stop, Local Loom proposes the preceding sentence, or the preceding five seconds if speech timing is unavailable. Review and adjust every proposed range before rendering.

Spoken `CUT` is detected after Stop and can be missed. The **Mark mistake** button gives immediate confirmation. The original recording stays available and is never replaced by the edited MP4. Transcript timestamps refer to the original recording.

## Local checks

With Node.js and Python 3.9+ available:

```sh
npm test
npm run test:companion
npm run check
python3 tools/package-community.py
```

The repository deliberately contains no license grant. See [INSTALL-WITH-AI.md](INSTALL-WITH-AI.md) for the complete installer and dependency instructions.

## Local 0.7.0: edit by transcript and add captions

The local working build adds transcript selection and branded captions. The public GitHub beta remains 0.6.0 until a separate release is requested.

1. Record normally or open a saved MP4/WebM and let the local helper prepare the transcript.
2. Select words or a sentence, then propose a removal. Review its original-time range, preview it, adjust/uncheck it, or use Undo.
3. Enable captions, correct the caption words, and choose a readable style. Caption text corrections change the displayed words only, not the spoken audio. Save a named style to reuse it in this browser.
4. Render edits and review the edited preview before saving the MP4. Captions use the edited timeline after cuts. The original video and original transcript downloads remain intact.

Captions require Pillow in the helper's Python environment and an available local Arial or DejaVu font. Rendering uses local PNG overlays, so it also works with FFmpeg builds that lack subtitle filters. Caption presets stay in this extension's local browser storage; they are not synced to other computers. Recognition and word boundaries are estimates: inspect short word cuts for clipped speech. Sentence reordering and automatic zoom are not included.

## Local 0.8.0: true 9:16 cursor-follow

Choose **Edited export frame → 9:16 cursor-follow 1080×1920** before starting a new recording. Select Entire Screen, record normally, then Stop and choose **Render edits**. The export fills a true portrait frame and smoothly follows the cursor; captions are added after cropping. The original full-width recording remains available.

This first version supports a Mac with one active display. The local helper samples pointer coordinates only during recording; pause time is excluded. Imported and older recordings have no cursor path and use Original export. A camera overlay is already baked into the original and can move outside the portrait crop. If tracking fails, the original remains available; a complete path is required for cursor-follow export.

The updated helper and refreshed extension are both required. The recorder header shows **Local Loom 0.8.0**. Public GitHub beta files remain unchanged until a separate release is requested. Long recordings and real-world framing still need user review.

## Local 0.9.0: choose your format, then Render

The browser Export card offers aspect ratio, Add captions, caption styles and a Render button. The default **9:16 • Screen + camera** layout fills a1080×1920 MP4: the upper1080×960 follows your cursor and the lower1080×960 keeps your camera centered and mirrored.16:9 and1:1 are also available, alongside Original and screen-only9:16.

1. Choose9:16 Screen + camera and leave Camera enabled. Start a new Entire Screen recording on a single-display Mac.
2. Stop and save the original. Return to the Export card; let the local transcript prepare.
3. Check Add captions, choose your style, and review any cuts. Click Render.
4. Review the result and click Save edited MP4 as… to choose its location.

Split recordings retain a clean screen source with mixed audio and a separate camera source. Both pause and resume together; Render applies the same cuts to both and adds captions last. The camera-source download remains available. Existing recordings with a small camera bubble already baked into the screen cannot become a separate lower-half camera view; make a new split recording. Keep the recorder tab open until you save the sources and export. The current local job is not a persistent project library.

A failed camera capture or missing cursor path leaves the screen original available and blocks an incomplete split export. Default split capture does not open the floating camera orb, which could otherwise be captured again in the upper screen view. Actual device alignment, lengthy recordings and framing remain real-world review items. The public beta is unchanged.

## Local0.10.0: Record → Stop → one finished video

The main recorder now shows recording controls, ratio, Add captions, one finished-video player and Save video.9:16 defaults to cursor-follow screen on top and your camera below, with captions enabled. Stop immediately starts local processing; transcription and encoding still take time. There is no original Save As interruption and no initial Render button to click. Unreviewed suggested cuts are not applied automatically.

After completion, changing ratio or captions automatically rebuilds the result. Source files, transcript corrections, manual cuts, camera/audio settings and caption styles are under Advanced editing & original files. Source recordings are retained locally. If the helper fails, Retry and original-file downloads remain available; unsaved sources keep the unload warning. The current job still requires the recorder tab for editing continuity. Public beta unchanged; reload extension after saving any active work to load this UI.

## Local 0.12.0: cursor-following tab + camera

Open the webpage you want to record, click the Local Loom toolbar, select **9:16 · Tab + camera**, and Start. That webpage is the chosen tab. Move the cursor inside the page while you speak. Stop automatically creates one 1080×1920 video: cursor-following tab above, mirrored camera below, and selected captions. **Save finished video** downloads exactly the final preview. Advanced source downloads are labeled **Save original screen (unstitched)**.

The toolbar action grants temporary access to that selected tab using Chrome activeTab, scripting and tabCapture permissions. The isolated tracker collects viewport-relative pointer coordinates only; no page text is collected, nothing is uploaded, and the tracker is removed on Stop or cancellation. No broad website permission is installed. Start this mode from a normal webpage's toolbar, not from the recorder page or Chrome settings. Keep that page open without navigating while recording. Cursor events inside embedded cross-origin frames are unavailable; the crop holds its last position there. Tracking failure retains the original recordings and prevents a misleading finished export. Screen + camera remains available for full-display walkthroughs.

Old tab-only recordings lack separate camera footage and cursor paths and cannot be retroactively stitched. Save existing work before reloading the extension to load 0.12.0. The existing 0.11 local helper already supports the split renderer; no helper restart is required.

## Local 0.13.1: teleprompter with auto-cut retakes

1. Click the Local Loom toolbar icon and paste your script into **Teleprompter (optional)**; set words/min. It is saved and shared with the recorder page. Pasting a script switches the ratio to 16:9 so the recording is of a browser tab.
2. Click **Start recording**. The recorder tab comes forward with a **Ready to record** card. Click **Open prompter & start** (Chrome only opens a floating window from a click on a page; this is that one click). One always-on-top window opens: your camera bubble in its top-right corner so you can frame yourself, and the script scrolling behind it. Drag it to the top of your screen by your webcam. Then choose your browser tab in Chrome's chooser.
3. Because the prompter is open, the chooser lists browser tabs only, so the prompter can never be captured. Your camera is added to the video as a bubble.
4. After a 3-2-1 the script scrolls at your speed. Space pauses; Up/Down change speed; **M** or the **Mark mistake** button (also Command+Shift+X) marks a flub. The red **Stop** button in the prompter window finishes the recording (it is greyed out until recording starts). If the prompter window is already open, Start goes straight to recording with no extra click.
5. Mark mistake jumps the prompter back to the start of that sentence, counts 3-2-1, and resumes. Re-read the sentence.
6. On Stop, the bad take is cut automatically (no review step). The cut starts where the flubbed attempt began and ends where the retake begins, on word boundaries, found by matching the sentence's opening words in the transcript (the prompter's timing is only a fallback). The original recording and transcript are unchanged, and the cut appears in Advanced editing as `Auto: retake at mm:ss`, where you can adjust or untick it.

The recorder page has the same script box plus **Rehearse**, which scrolls the prompter without recording.

Global hotkeys (work when Chrome is not focused) are set once at chrome://extensions/shortcuts: Pause/resume Command+Shift+Space, Faster Command+Shift+Period, Slower Command+Shift+Comma, Mark mistake Command+Shift+X. Set each to "Global".

Limits: the prompter position guesses which sentence you flubbed; the cut then checks neighbouring sentences against the transcript. It relies on you restarting the same sentence from its beginning. If Whisper mishears the opening words the cut falls back to the prompter's timing, so glance at the cut list. Entire Screen and 9:16 split recordings would capture the prompter, so the recorder warns. Extension reload is needed after updating (the manifest gained three shortcuts).

Developer check: `tools/harness/` serves the real extension over http://localhost with a chrome.* stub and scripted speech so the recorder can be driven in the Claude browser pane (`.claude/launch.json` entry `loom-harness`). Fixtures: `tools/harness/make-fixtures.sh`.

## Animate: turn a take into a finished, overlaid video (optional)

`animate-skill/` is a self-contained pipeline that turns a finished take package into a rendered MP4 with animated titles, content-specific diagram visuals (flow diagrams, before/after, comparisons, and more), and sound effects, built on [HyperFrames](https://hyperframes.app) (HTML-to-MP4). It needs Node.js 20+ and the [Claude Code CLI](https://claude.com/claude-code) logged into your own subscription - see "Install Animate (optional)" in [INSTALL-WITH-AI.md](INSTALL-WITH-AI.md) for setup. Once configured, an **Animate** button appears on any finished take in the recorder; the companion server has no dependency on it if you skip this step. Read [`animate-skill/SKILL.md`](animate-skill/SKILL.md) to see how the pipeline itself works.

