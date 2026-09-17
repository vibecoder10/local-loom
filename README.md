# Local Loom

Local Loom is a Mac beta Chrome extension for screen and webcam recording. It downloads the original recording directly from Chrome and can use an optional loopback-only helper to create private transcripts and reviewable MP4 edits.

The current beta release is [v0.6.0-beta.1](https://github.com/vibecoder10/local-loom/releases/tag/v0.6.0-beta.1).

## Features

- Screen capture through Chrome's picker, with microphone and optional camera composition.
- Original MP4/WebM download; no recordings are sent to cloud services.
- A **Mark mistake** button and Command+Shift+X shortcut for reviewable cut proposals.
- Separate edited MP4 export. The automatic download remains the original recording.
- Local transcript TXT/SRT and spoken `CUT` proposals when the optional helper is configured.

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
