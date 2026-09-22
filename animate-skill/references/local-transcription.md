# Local recording transcription

Whisper.cpp + FFmpeg run entirely locally. The helper never downloads a model or uploads audio. HyperFrames still handles editable composition, preview and rendering.

```sh
python3 ~/AgentVault/Skills/Personal/animate/scripts/local_transcript.py \
  --input /absolute/path/recording.mp4 --output /absolute/path/video-project/words.json
```

Requires `whisper-cli` and `ffmpeg` on PATH. Default model: `~/.cache/animate/models/ggml-base.en.bin` (English, downloaded and smoke-tested). Override with `--model /path/model.bin` or `ANIMATE_WHISPER_MODEL`. For non-English speech select a multilingual model and `--language <code>` or `auto`; base.en is English-only. Upgrade model only when transcription quality warrants it, not silently on every run.

Outputs: normalized seconds-based `words.json`, full `words.raw.json`, and local subprocess `words.log`. Uses temporary 16kHz mono PCM audio; original recording remains untouched. Each process has a bounded timeout (default 1800 seconds, configurable). Missing audio/model/tool or failed inference stops clearly; no cloud fallback occurs.

`-ml 1 -sow -ojf` produces short word-split segments with millisecond offsets. The helper joins continuation fragments, rejects multiword segments rather than fabricating internal boundaries, and labels output `audio_estimated_words`. Group `.words` into readable caption phrases using actual starts/ends. Do not pass the wrapper blindly to HyperFrames transcript import.

Word timestamps are experimental ASR estimates. Review speech/caption alignment at the opening, after pauses/edits and near the end. Correct mistranscribed names without inventing precision; if timing is poor, try a suitable larger local model or an explicit alignment pass. Keep a clear unverified state until checked against real audio.

One-time model setup if missing: use the official model download guidance below. Do not use Homebrew's `for-tests-ggml-*` files as real speech models.

Sources: [official Whisper.cpp quickstart, model sizes and word-timestamp guidance](https://github.com/ggml-org/whisper.cpp), [official model downloader](https://github.com/ggml-org/whisper.cpp/blob/master/models/download-ggml-model.sh). Installed model came from https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en.bin . After setup, recording transcription requires no network connection.
