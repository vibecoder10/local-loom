#!/usr/bin/env python3
"""Upload, resume, or offline-normalize an AssemblyAI transcript without SDKs."""

import argparse
import json
import os
import sys
import time
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

API_ROOT = "https://api.assemblyai.com/v2"


def fail(message):
    raise RuntimeError(message)


def read_json(path):
    with open(path, encoding="utf-8") as handle:
        return json.load(handle)


def write_json(path, value):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as handle:
        json.dump(value, handle, indent=2)
        handle.write("\n")


def require_key():
    key = os.environ.get("ASSEMBLYAI_API_KEY")
    if not key:
        fail("AssemblyAI credential missing: set ASSEMBLYAI_API_KEY in the process environment before a live request.")
    return key


def request_json(url, method="GET", body=None, key=None, timeout=30):
    headers = {"accept": "application/json"}
    if key:
        headers["authorization"] = key
    if body is not None:
        headers["content-type"] = "application/json"
        body = json.dumps(body).encode("utf-8")
    request = Request(url, data=body, headers=headers, method=method)
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1000]
        fail("AssemblyAI HTTP %s for %s: %s" % (exc.code, url, detail))
    except URLError as exc:
        fail("AssemblyAI request failed for %s: %s" % (url, exc.reason))


def upload_local(path, key, timeout):
    data = Path(path).read_bytes()
    request = Request(API_ROOT + "/upload", data=data,
                      headers={"authorization": key, "content-type": "application/octet-stream"}, method="POST")
    try:
        with urlopen(request, timeout=timeout) as response:
            return json.load(response)["upload_url"]
    except HTTPError as exc:
        detail = exc.read().decode("utf-8", "replace")[:1000]
        fail("AssemblyAI upload HTTP %s: %s" % (exc.code, detail))
    except (URLError, KeyError) as exc:
        fail("AssemblyAI upload failed: %s" % exc)


def normalize(raw):
    status = raw.get("status")
    if status == "error":
        fail("AssemblyAI transcript error: %s" % raw.get("error", "unknown provider error"))
    if status != "completed":
        fail("AssemblyAI transcript is not completed (status: %s)." % status)
    raw_words = raw.get("words", [])
    if raw.get("text", "").strip() and not raw_words:
        fail("AssemblyAI completed transcript has text but no words; cannot claim measured captions.")
    if not isinstance(raw_words, list):
        fail("AssemblyAI transcript words must be an array.")
    words = []
    for item in raw_words:
        start_ms, end_ms = item.get("start"), item.get("end")
        if not isinstance(start_ms, (int, float)) or not isinstance(end_ms, (int, float)):
            fail("AssemblyAI word is missing numeric millisecond start/end values.")
        if start_ms < 0 or end_ms < 0 or end_ms < start_ms:
            fail("AssemblyAI word has invalid millisecond bounds (start=%s, end=%s)." % (start_ms, end_ms))
        words.append({"text": item.get("text", ""), "start": start_ms / 1000.0,
                      "end": end_ms / 1000.0, "start_ms": start_ms, "end_ms": end_ms,
                      "confidence": item.get("confidence")})
    return {"timing_source": "measured_words", "transcript_id": raw.get("id"),
            "text": raw.get("text", ""), "words": words, "raw": raw}


def poll_transcript(transcript_id, key, timeout, poll_seconds, max_wait_seconds):
    deadline = time.monotonic() + max_wait_seconds
    while True:
        if time.monotonic() >= deadline:
            fail("AssemblyAI polling timed out for transcript %s; rerun with --resume %s instead of submitting another transcript." % (transcript_id, transcript_id))
        raw = request_json(API_ROOT + "/transcript/" + transcript_id, key=key, timeout=timeout)
        if raw.get("status") in ("completed", "error"):
            return raw
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            fail("AssemblyAI polling timed out for transcript %s; rerun with --resume %s instead of submitting another transcript." % (transcript_id, transcript_id))
        time.sleep(min(poll_seconds, remaining))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", help="Local recording path or hosted audio URL for a live transcript")
    parser.add_argument("--resume", help="Existing transcript ID; avoids creating another paid transcript")
    parser.add_argument("--from-json", help="Completed provider response to normalize offline")
    parser.add_argument("--output", required=True, help="Normalized captions JSON path")
    parser.add_argument("--state", default="assemblyai-transcript-state.json", help="Transcript ID state path")
    parser.add_argument("--poll-seconds", type=float, default=3.0)
    parser.add_argument("--timeout", type=float, default=30.0)
    parser.add_argument("--max-wait-seconds", type=float, default=600.0,
                        help="Total polling limit; on expiry rerun with --resume")
    args = parser.parse_args()
    if args.from_json:
        if args.input or args.resume:
            parser.error("--from-json cannot be combined with --input or --resume")
        write_json(args.output, normalize(read_json(args.from_json)))
        return
    if bool(args.input) == bool(args.resume):
        parser.error("provide exactly one of --input or --resume, or use --from-json")
    if args.poll_seconds <= 0 or args.timeout <= 0 or args.max_wait_seconds <= 0:
        parser.error("--poll-seconds, --timeout, and --max-wait-seconds must be positive")
    key = require_key()
    if args.resume:
        transcript_id = args.resume
    else:
        source = args.input if args.input.startswith(("http://", "https://")) else upload_local(args.input, key, args.timeout)
        created = request_json(API_ROOT + "/transcript", method="POST", body={"audio_url": source}, key=key, timeout=args.timeout)
        transcript_id = created.get("id")
        if not transcript_id:
            fail("AssemblyAI transcript creation returned no id.")
        write_json(args.state, {"transcript_id": transcript_id, "created_response": created})
    write_json(args.output, normalize(poll_transcript(
        transcript_id, key, args.timeout, args.poll_seconds, args.max_wait_seconds)))


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, OSError, ValueError, json.JSONDecodeError) as exc:
        print("error: %s" % exc, file=sys.stderr)
        sys.exit(1)
