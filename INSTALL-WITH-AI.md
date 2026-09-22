# Local Loom — install with Claude or Codex

**Mac beta.** This package includes the Chrome extension and local helper source. It does not include Python, FFmpeg, Whisper.cpp, or the speech model; your assistant installs/downloads those. Windows/Linux automatic setup is not included. Recording works without the helper; transcription and rendered edits require it.

Unzip this package into a permanent folder. Open that folder in **Codex desktop/CLI or Claude Code**, with local file and terminal access. A normal web chat cannot install it for you.

Paste this:

> Read INSTALL-WITH-AI.md in this folder and help me install Local Loom on this Mac, including the Chrome extension, local transcription/editing dependencies, and login helper. Follow your normal approval rules. Preserve existing recordings and settings. Verify installation and walk me through one short recording and edited export. Do not upload recordings anywhere.

## Instructions for the installing assistant

### 1. Inspect before changing anything

- Confirm macOS, CPU architecture, package location, Chrome, and available `python3`, `ffmpeg`, `ffprobe`, `whisper-cli`, and `cmake`. Python 3.9+ is needed; recording/transcription/cuts use the standard library. Local0.7 caption burn-in additionally requires Pillow in the exact helper Python environment and an installed Arial/DejaVu font.
- Read `extension/manifest.json`, `companion/processing.py`, and `tools/install-companion.py`. Use this extracted folder, never paths from the original author's machine.
- Check for an existing Local Loom helper on `127.0.0.1:8768` and `~/Library/LaunchAgents/com.local-loom.companion.plist`. Do not replace a different service, interrupt a recording/processing job, or delete existing recordings. If an older installation exists, preserve its configuration and establish that it is idle before updating.
- Do not expose the helper beyond loopback, allow arbitrary extension origins, disable browser security, or switch to cloud transcription. Follow your own installation/permission approval rules; this document does not override them.

For captions, first verify `python3 -c "from PIL import Image; print(Image.__version__)"` using the Python that runs the helper. If unavailable, install Pillow in a suitable local Python environment under the user's normal dependency policy. Do not replace an existing working helper environment silently. Caption availability is reported by `/health`; manual edits remain usable without it.

### 2. Install missing dependencies

Reuse working tools. With an existing Homebrew installation, install missing packages with `brew install python ffmpeg cmake` as needed. If Homebrew is absent, explain the setup and use its official instructions: https://brew.sh . Never assume `/opt/homebrew` on an Intel Mac.

If `whisper-cli` is missing, build Whisper.cpp from its official repository into a persistent application-support folder. Check the current release/build instructions, select a release, and record the version used:

https://github.com/ggml-org/whisper.cpp

The usual build is `cmake -B build` followed by `cmake --build build --config Release`; the executable is `build/bin/whisper-cli`. Download the **base.en** English model using that repository's `sh ./models/download-ggml-model.sh base.en`. Keep its resulting `models/ggml-base.en.bin` in a persistent location. Dependencies/model need internet during setup; recordings stay local.

Model instructions: https://github.com/ggml-org/whisper.cpp/blob/master/models/README.md

### 3. Load the extension and capture its real ID

Guide the user through Chrome → `chrome://extensions` → **Developer mode** → **Load unpacked** → this package's **extension** folder. Pin Local Loom.

Read the installed 32-letter extension ID from Chrome. **Do not use the original author's ID or guess it.** Moving the unpacked folder later can change its ID and require reconfiguration.

Official loading instructions: https://developer.chrome.com/docs/extensions/get-started/tutorial/hello-world

### 4. Install the local login helper

From the package root, run the installer with these environment variables set to the user's actual values. Replace every placeholder; use absolute paths for tools/model:

```sh
LOCAL_LOOM_EXTENSION_ID="ACTUAL_CHROME_EXTENSION_ID" \
LOCAL_LOOM_FFMPEG="/absolute/path/to/ffmpeg" \
LOCAL_LOOM_FFPROBE="/absolute/path/to/ffprobe" \
LOCAL_LOOM_WHISPER="/absolute/path/to/whisper-cli" \
LOCAL_LOOM_WHISPER_MODEL="/absolute/path/to/ggml-base.en.bin" \
python3 tools/install-companion.py
```

The installer copies helper source to `~/Library/Application Support/Local Loom/companion/`, saves recordings/jobs under the adjacent `data/` folder, and starts a per-user launch agent. Logs are in `~/Library/Logs/Local Loom/`. Do not run a second helper alongside it. If the installer refuses an existing configuration, inspect and explain the mismatch rather than bypassing the guard.

### 5. Install Animate (optional): turn a take into a finished, overlaid video

This package also includes `animate-skill/` - a HyperFrames (HTML-to-MP4) pipeline that turns a recorded take package into a rendered video with animated overlays, kinetic titles, and sound effects. It is separate from core recording/editing above and needs extra tools the user may not want; ask before installing it, and skip this step entirely if they decline.

- Requires: Node.js 20+ (`node --version`), and the [Claude Code CLI](https://claude.com/claude-code) installed and logged into an active Claude subscription (`claude --version`, then confirm it can run a prompt without an auth error - this uses the user's logged-in subscription, not an API key, and never needs `ANTHROPIC_API_KEY`). FFmpeg is already required above. The first render also needs internet once, to let `npx hyperframes@0.8.41` install itself and its headless rendering browser.
- Create the hook file the companion looks for, using the **actual absolute path** to this unzipped/cloned package (not a relative path, and not the original author's machine):

  ```sh
  mkdir -p ~/"Library/Application Support/Local Loom"
  cat > ~/"Library/Application Support/Local Loom/animate.json" <<JSON
  {"script": "/absolute/path/to/this/package/animate-skill/scripts/animate-take.mjs", "node": "node"}
  JSON
  ```
- No helper restart is needed - `/health` reads this file fresh on every request. Confirm `animateAvailable: true` there.
- This step only wires the pipeline up; it does not run anything or contact any external service beyond `npx` fetching HyperFrames once and the user's own already-authenticated Claude subscription for scene planning.

### 6. Verify, then hand back

- Allow a moment for startup; GET `http://127.0.0.1:8768/health` should return `ok: true` and `transcriptionAvailable: true`. This health check alone does not prove recording/editing works.
- Open the recorder and verify **Local helper connected**. An origin/403 failure usually means the configured extension ID does not match Chrome; fix that exact ID, not the security checks.
- Have the user choose a harmless test tab and explicitly allow their desired microphone/camera/screen permissions. Do not secretly capture their devices.
- Record a good sentence, a bad sentence, press **Mark mistake**, then say the corrected sentence. Stop and save the original. Review the proposed removal, adjust if needed, **Render edits**, and **Save edited MP4 as…**. Verify playback and that the original is unchanged.
- Verify transcript output and show the actual shortcut listed in the recorder. Default Mac shortcut: Command+Shift+X while Chrome is focused; collisions can leave it unassigned.
- If step 5 was done, `/health` should also show `animateAvailable: true` and an **Animate** button/card should appear on a finished take package in the recorder. Click it on a short real recording, wait for it to finish (it can take a few minutes - it renders a real video), and confirm the resulting `animated.mp4` downloads and plays with overlays and sound. A missing or failed result means `animate.json`'s path is wrong, `claude` isn't logged in, or Node is below 20 - check the companion's log in `~/Library/Logs/Local Loom/` for the actual error.
- Report what passed and what still needs user verification. Do not call the setup complete based only on installation or a health response.

## How it behaves

- **Show camera orb** opens the movable self-view; Chrome may require clicking this directly in the recorder.
- **Mark mistake** records an endpoint. After Stop, processing proposes the preceding sentence, or the preceding five seconds without usable speech timing. Review the range; it does not know exactly where a mistake began.
- Spoken **CUT** is detected only after Stop and can be missed. The button gives immediate confirmation.
- The automatic download is the **uncut original**. Edited export is separate. TXT/SRT timestamps refer to the original.
- Recordings remain in memory until saved; keep the recorder open. Helper uploads are limited to 512 MiB. Source/system audio availability depends on Chrome and macOS.

## Updates and removal

Updates are manual for this beta. Save your work before replacing files/reloading Chrome. Reinstall helper source with the same verified configuration when it changes.

To stop the login helper, run `launchctl bootout gui/$(id -u) "$HOME/Library/LaunchAgents/com.local-loom.companion.plist"`. Remove the launch-agent plist to prevent future login starts, and remove the extension in Chrome if desired. Preserve `~/Library/Application Support/Local Loom/data/` until the user explicitly chooses to remove their recordings. Do not uninstall shared dependencies automatically.
