# Optional AssemblyAI cloud captions

Use this route only when the user supplied a recording and existing authorization covers the upload/transcription charge. Ask only when that authority is absent. Local Whisper.cpp is the default. Use AssemblyAI only when the user requests this cloud route or authorizes it after a local-quality issue. Script captions remain editorial estimates unless a recording provides measured words.

Set `ASSEMBLYAI_API_KEY` in the process environment without printing or storing it. The helper reads it only for live calls:

```bash
python3 scripts/assemblyai_transcript.py --input recording.wav --output captions-measured.json
python3 scripts/assemblyai_transcript.py --resume <transcript-id> --state transcript-state.json --output captions-measured.json
```

`--input` accepts a local audio file or an already-hosted HTTPS URL. For a local file, the helper POSTs its raw bytes to `https://api.assemblyai.com/v2/upload` with the API key in the `authorization` header (no `Bearer` prefix). It POSTs the returned `upload_url` as `audio_url` to `/v2/transcript`, writes the returned transcript ID to the state file before polling, then GETs `/v2/transcript/<id>` until `completed` or `error`. Polling has a 600-second default wall-clock limit and every HTTP request has a timeout. On expiry, resume the persisted ID; do not submit another transcript.

The normalized output preserves the provider response under `raw` and emits each word with seconds-based `start` and `end`, alongside original millisecond fields. It is a wrapper with a `.words` array: group those words into editable display captions before placing clips in HyperFrames. Retry an interrupted run with `--resume` rather than starting a second transcript. For offline work, normalize a completed response without credentials:

```bash
python3 scripts/assemblyai_transcript.py --from-json completed-response.json --output captions-measured.json
```

Do not use a response with status `error` as captions; the helper exits with the provider error text. Edit operations that change recording time must shift or trim all measured words consistently.

Setup: create an AssemblyAI account and API key using the [official quickstart](https://www.assemblyai.com/docs/pre-recorded-audio/getting-started/transcribe-an-audio-file), then expose `ASSEMBLYAI_API_KEY` to the process running the helper. Keep credentials out of chat, project files, and source control. [Word timestamps](https://support.assemblyai.com/articles/6819078983-does-your-api-return-timestamps-for-individual-words) are milliseconds; the helper converts them to seconds.
