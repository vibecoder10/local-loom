# Local Loom — install with Codex or Claude Code

**Mac beta.** This package contains Chrome extension source and a local helper. It does not bundle Python, FFmpeg, Whisper.cpp, or a Whisper model. Recording works without the helper; transcripts and rendered MP4 edits require it. Windows and Linux setup are not included.

Unzip this package into a permanent folder and open it in Codex or Claude Code with terminal and local-file access. Do not use a browser-only chat for installation.

Paste this prompt:

> Read INSTALL-WITH-AI.md in this folder and help me install Local Loom on this Mac, including the Chrome extension, local transcription/editing dependencies, and login helper. Follow your normal approval rules. Preserve existing recordings and settings. Verify installation and walk me through one short recording and edited export. Do not upload recordings anywhere.

## Instructions for the installing assistant

1. Confirm macOS, CPU architecture, Chrome, and available `python3`, `ffmpeg`, `ffprobe`, `whisper-cli`, and `cmake`. Python 3.9+ is required. Read `extension/manifest.json`, `companion/processing.py`, and `tools/install-companion.py` before making changes.
2. Check for a Local Loom helper on `127.0.0.1:8768` and `~/Library/LaunchAgents/com.local-loom.companion.plist`. Do not replace a different service, interrupt an active job, or delete recordings.
3. Reuse working tools. If dependencies are missing, use the official [Homebrew instructions](https://brew.sh/) and the current [Whisper.cpp build instructions](https://github.com/ggml-org/whisper.cpp). Build Whisper.cpp in a persistent folder and download an English model to a persistent folder. Record the versions used. Do not assume an architecture-specific path.
4. In Chrome, visit `chrome://extensions`, turn on **Developer mode**, select **Load unpacked**, and choose this package's `extension/` folder. Read the actual 32-letter extension ID shown by Chrome. Do not guess or reuse another installation's ID.
5. Run the installer from this package root, replacing every placeholder with the recipient's actual absolute paths:

```sh
LOCAL_LOOM_EXTENSION_ID="ACTUAL_CHROME_EXTENSION_ID" \
LOCAL_LOOM_FFMPEG="/absolute/path/to/ffmpeg" \
LOCAL_LOOM_FFPROBE="/absolute/path/to/ffprobe" \
LOCAL_LOOM_WHISPER="/absolute/path/to/whisper-cli" \
LOCAL_LOOM_WHISPER_MODEL="/absolute/path/to/english-model.bin" \
python3 tools/install-companion.py
```

The installer refuses absent IDs or non-absolute dependency paths. It installs a per-user launch agent and creates local application-support and log folders. It does not install a second helper alongside an incompatible existing service.

6. Verify `http://127.0.0.1:8768/health` reports `ok: true` and, after dependencies are configured, `transcriptionAvailable: true`. Then record a short harmless test, press **Mark mistake**, correct the sentence, Stop, review the proposed cut, render, save the edited MP4, and verify playback. Confirm the original is unchanged.

The helper remains loopback-only and accepts requests from the configured Chrome extension origin only. Do not expose it to the network, allow arbitrary origins, disable browser security, or upload recordings.
