"""Upload prepared audio to AssemblyAI and save its word-timed transcript.

Usage: python transcribe-assemblyai.py input.wav output-prefix
The key is read from ASSEMBLYAI_API_KEY or entered at a hidden prompt.
"""

from __future__ import annotations

import argparse
import getpass
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen


API = "https://api.assemblyai.com"


def request(method: str, route: str, key: str, data: bytes | None = None,
            content_type: str | None = None) -> dict:
    headers = {"Authorization": key}
    if content_type:
        headers["Content-Type"] = content_type
    call = Request(API + route, data=data, headers=headers, method=method)
    try:
        with urlopen(call, timeout=180) as response:
            return json.load(response)
    except HTTPError as error:
        detail = error.read(500).decode("utf-8", errors="replace")
        raise RuntimeError(f"AssemblyAI HTTP {error.code}: {detail}") from error


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("audio", type=Path, help="Local audio or video file")
    parser.add_argument("prefix", type=Path, help="Output path without extension")
    args = parser.parse_args()
    if not args.audio.is_file():
        parser.error(f"Input does not exist: {args.audio}")
    key = os.getenv("ASSEMBLYAI_API_KEY") or getpass.getpass("AssemblyAI API key: ").strip()
    if not key:
        parser.error("AssemblyAI API key is missing")

    print("Uploading audio...", flush=True)
    upload = request("POST", "/v2/upload", key, args.audio.read_bytes(), "application/octet-stream")
    config = {
        "audio_url": upload["upload_url"],
        "speech_models": ["universal-3-pro", "universal-2"],
        "language_code": "en",
    }
    job = request("POST", "/v2/transcript", key, json.dumps(config).encode(), "application/json")
    print(f"Transcription job: {job['id']}", flush=True)
    while True:
        result = request("GET", f"/v2/transcript/{job['id']}", key)
        if result.get("status") == "completed":
            break
        if result.get("status") == "error":
            raise RuntimeError(result.get("error") or "AssemblyAI transcription failed")
        time.sleep(4)

    args.prefix.parent.mkdir(parents=True, exist_ok=True)
    args.prefix.with_suffix(".json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    args.prefix.with_suffix(".txt").write_text(result.get("text", "") + "\n", encoding="utf-8")
    args.prefix.with_name(args.prefix.name + "-words.json").write_text(
        json.dumps(result.get("words", []), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"Saved {len(result.get('words', []))} timed words to {args.prefix.parent}", flush=True)


if __name__ == "__main__":
    main()
