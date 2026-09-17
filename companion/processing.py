"""Local media processing primitives used by the loopback companion."""

from __future__ import annotations

import json
import math
import os
import re
import shutil
import subprocess
from pathlib import Path
from typing import Any, Callable, Optional, Union

FFMPEG = os.environ.get("LOCAL_LOOM_FFMPEG", "")
FFPROBE = os.environ.get("LOCAL_LOOM_FFPROBE", "")
WHISPER = os.environ.get("LOCAL_LOOM_WHISPER", "")
WHISPER_MODEL = os.environ.get("LOCAL_LOOM_WHISPER_MODEL", "")
PROCESS_TIMEOUT = 1800


def normalize_words(raw: Any) -> list[dict[str, Union[float, str]]]:
    """Return timestamped words in seconds from common whisper JSON shapes.

    Whisper builds vary between a top-level ``words`` list, segment ``tokens``,
    and ``transcription`` segments. The configured ``-ml 1 -sow`` invocation
    must yield one spoken word per timestamped entry; multiword phrases are
    rejected rather than inventing timings that could remove the wrong video.
    """
    entries = _word_entries(raw)
    words: list[dict[str, Union[float, str]]] = []
    for entry in entries:
        text = str(entry.get("text", entry.get("word", "")))
        start, end = _entry_times(entry)
        if start is None or end is None or end < start:
            continue
        tokens = list(re.finditer(r"\S+", _clean_token_text(text)))
        if not tokens:
            continue
        if len(tokens) != 1:
            raise ValueError("Whisper output did not contain word-level timestamps.")
        words.append({"text": tokens[0].group(), "start": round(start, 3), "end": round(end, 3)})
    return _merge_token_fragments(words)


def detect_cuts(words: list[dict[str, Any]], duration: float) -> list[dict[str, Union[float, str]]]:
    """Propose ranges from a sentence/take start through a spoken ``cut``."""
    if not _finite_nonnegative(duration):
        raise ValueError("duration must be a finite nonnegative number")
    normalized = _canonical_words(words, duration)
    proposals: list[dict[str, Union[float, str]]] = []
    for index, word in enumerate(normalized):
        if _normalized_command(str(word["text"])) != "cut":
            continue
        start_index = _take_start(normalized, index)
        start = max(0.0, float(normalized[start_index]["start"]) - 0.10)
        end = min(float(duration), float(word["end"]) + 0.15)
        if index + 1 < len(normalized):
            end = min(end, max(float(word["start"]), float(normalized[index + 1]["start"]) - 0.08))
        if end > start:
            proposals.append({"start": round(start, 3), "end": round(end, 3), "label": "spoken cut"})
    return _safe_auto_cuts(proposals, duration)


def detect_marker_cuts(words: list[dict[str, Any]], markers: Any, duration: float) -> list[dict[str, Union[float, str]]]:
    """Create conservative, reviewable cuts from recorder timestamp markers."""
    if not _finite_nonnegative(duration):
        raise ValueError("duration must be a finite nonnegative number")
    usable = _canonical_words(words, duration)
    proposals = []
    for marker in markers or []:
        time = float(marker.get("time", marker) if isinstance(marker, dict) else marker)
        time = min(duration, max(0.0, time))
        if time <= 0:
            continue
        previous = [index for index, word in enumerate(usable) if float(word["start"]) <= time]
        if previous and time - float(usable[previous[-1]]["start"]) <= 5:
            index = previous[-1]
            start_index = _take_start(usable, index + 1)
            start = max(0.0, float(usable[start_index]["start"]) - 0.10)
            label = "manual marker — sentence, review"
        else:
            start = max(0.0, time - 5.0)
            label = "manual marker — last5s, review"
        end = time
        if start < end:
            proposals.append({"start": round(start, 3), "end": round(end, 3), "label": label})
    return _safe_auto_cuts(proposals, duration)


def cut_metrics(cuts: list[dict[str, Any]], duration: float) -> dict[str, Union[int, float]]:
    canonical = normalize_cuts(cuts, duration)
    removed = sum(float(cut["end"]) - float(cut["start"]) for cut in canonical)
    return {"cutCount": len(canonical), "removedSeconds": round(removed, 3), "editedDuration": round(duration - removed, 3)}


def normalize_cuts(cuts: Any, duration: float) -> list[dict[str, Union[float, str]]]:
    """Validate sorted user cuts and merge overlaps without changing intent."""
    if not _finite_nonnegative(duration):
        raise ValueError("duration must be a finite nonnegative number")
    if not isinstance(cuts, list):
        raise ValueError("cuts must be a list")
    normalized: list[dict[str, Union[float, str]]] = []
    previous_start = -1.0
    for cut in cuts:
        if not isinstance(cut, dict):
            raise ValueError("each cut must be an object")
        start, end = cut.get("start"), cut.get("end")
        if not _finite_nonnegative(start) or not _finite_nonnegative(end):
            raise ValueError("cut times must be finite nonnegative numbers")
        start, end = float(start), float(end)
        if start < previous_start:
            raise ValueError("cuts must be sorted by start time")
        if end <= start:
            raise ValueError("each cut end must be after its start")
        if end > duration:
            raise ValueError("cut exceeds recording duration")
        previous_start = start
        label = str(cut.get("label", "spoken cut"))
        if normalized and start <= float(normalized[-1]["end"]):
            normalized[-1]["end"] = max(float(normalized[-1]["end"]), end)
        else:
            normalized.append({"start": start, "end": end, "label": label})
    if len(normalized) == 1 and float(normalized[0]["start"]) <= 0 and float(normalized[0]["end"]) >= duration:
        raise ValueError("cuts cannot remove the entire recording")
    return normalized


def kept_ranges(cuts: list[dict[str, Any]], duration: float) -> list[dict[str, float]]:
    """Return the retained intervals after validated cuts."""
    normalized = normalize_cuts(cuts, duration)
    cursor = 0.0
    kept: list[dict[str, float]] = []
    for cut in normalized:
        start = float(cut["start"])
        if start > cursor:
            kept.append({"start": cursor, "end": start})
        cursor = float(cut["end"])
    if cursor < duration:
        kept.append({"start": cursor, "end": float(duration)})
    return kept


def process_recording(job_dir: Union[Path, str], source_path: Union[Path, str], update: Callable[[str], None], markers: Any = None) -> dict[str, Any]:
    """Transcribe and render a non-destructive initial edit for one recording."""
    job_dir, source_path = Path(job_dir), Path(source_path)
    probe = probe_media(source_path)
    duration = probe["duration"]
    clamped_markers = []
    for marker in markers or []:
        value = float(marker["time"] if isinstance(marker, dict) else marker)
        value = min(duration, max(0.0, value))
        if value > 0:
            clamped_markers.append({"time": value})
    words: list[dict[str, Union[float, str]]] = []
    raw: Any = {}
    transcript_status = "ready"
    note = None
    if probe["has_audio"]:
        try:
            update("transcribing")
            wav_path = job_dir / "audio.wav"
            _run([_tool(FFMPEG), "-y", "-i", str(source_path), "-vn", "-ac", "1", "-ar", "16000", str(wav_path)])
            raw_path = job_dir / "whisper.json"
            _run_whisper(wav_path, raw_path)
            raw = json.loads(raw_path.read_text(encoding="utf-8"))
            (job_dir / "transcript.raw.json").write_text(json.dumps(raw, indent=2), encoding="utf-8")
            words = normalize_words(raw)
        except Exception as error:
            transcript_status = "unavailable"
            note = f"Transcript unavailable: {error}. Manual edits and markers are still available."
    else:
        transcript_status = "unavailable"
        note = "No audio track was found; transcript is unavailable. Manual edits and markers are still available."
    spoken = detect_cuts(words, duration) if words else []
    marker_cuts = detect_marker_cuts(words, clamped_markers, duration)
    cuts = _safe_auto_cuts(spoken + marker_cuts, duration)
    if any("adjusted to retain" in str(cut.get("label", "")) for cut in cuts):
        adjustment_note = "Automatic proposal was shortened to retain 0.10 seconds; review before exporting."
        note = f"{note} {adjustment_note}" if note else adjustment_note
    _write_transcripts(job_dir, words)
    update("rendering")
    edited_path = job_dir / "edited.mp4"
    render_edit(source_path, edited_path, cuts, duration)
    return {
        "duration": duration,
        "words": words,
        "text": _transcript_text(words),
        "cuts": cuts,
        "files": {"original": source_path.name, "edited": "edited.mp4", "transcript": "transcript.txt", "srt": "transcript.srt"},
        "transcriptStatus": transcript_status,
        "note": note,
        "markers": clamped_markers,
        **cut_metrics(cuts, duration),
    }


def render_edit(source_path: Union[Path, str], output_path: Union[Path, str], cuts: list[dict[str, Any]], duration: float) -> None:
    """Render retained ranges as H.264/AAC MP4, retaining an audio-less branch."""
    source_path, output_path = Path(source_path), Path(output_path)
    ranges = kept_ranges(cuts, duration)
    if not ranges:
        raise ValueError("cuts cannot remove the entire recording")
    has_audio = probe_media(source_path)["has_audio"]
    filters: list[str] = []
    concat_inputs: list[str] = []
    for index, interval in enumerate(ranges):
        start, end = interval["start"], interval["end"]
        filters.append(
            f"[0:v]trim=start={start}:end={end},setpts=PTS-STARTPTS,scale=trunc(iw/2)*2:trunc(ih/2)*2[v{index}]"
        )
        concat_inputs.append(f"[v{index}]")
        if has_audio:
            filters.append(f"[0:a]atrim=start={start}:end={end},asetpts=PTS-STARTPTS[a{index}]")
            concat_inputs.append(f"[a{index}]")
    if has_audio:
        filters.append("".join(concat_inputs) + f"concat=n={len(ranges)}:v=1:a=1[vout][aout]")
    else:
        filters.append("".join(concat_inputs) + f"concat=n={len(ranges)}:v=1:a=0[vout]")
    temporary = output_path.with_suffix(".tmp.mp4")
    command = [_tool(FFMPEG), "-y", "-i", str(source_path), "-filter_complex", ";".join(filters), "-map", "[vout]"]
    if has_audio:
        command.extend(["-map", "[aout]", "-c:a", "aac"])
    command.extend(["-c:v", "libx264", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-fps_mode", "vfr", "-movflags", "+faststart", str(temporary)])
    _run(command)
    os.replace(temporary, output_path)


def probe_media(source_path: Union[Path, str]) -> dict[str, Any]:
    source_path = Path(source_path)
    command = [_tool(FFPROBE), "-v", "error", "-show_entries", "format=duration:stream=codec_type", "-of", "json", str(source_path)]
    completed = _run(command)
    data = json.loads(completed.stdout)
    try:
        duration = float(data["format"]["duration"])
    except (KeyError, TypeError, ValueError):
        duration = _packet_duration(source_path)
    if not _finite_nonnegative(duration) or duration <= 0:
        raise RuntimeError("Could not determine recording duration.")
    streams = data.get("streams", [])
    if not any(item.get("codec_type") == "video" for item in streams):
        raise RuntimeError("Recording does not contain a video stream.")
    return {"duration": duration, "has_audio": any(item.get("codec_type") == "audio" for item in streams)}


def _packet_duration(source_path: Path) -> float:
    """Recover a duration when MediaRecorder WebM omits format.duration."""
    command = [
        _tool(FFPROBE), "-v", "error", "-select_streams", "v:0",
        "-show_entries", "packet=pts_time,duration_time", "-of", "json", str(source_path),
    ]
    data = json.loads(_run(command).stdout)
    end_times = []
    for packet in data.get("packets", []):
        try:
            pts = float(packet.get("pts_time"))
            packet_duration = float(packet.get("duration_time", 0))
        except (TypeError, ValueError):
            continue
        if math.isfinite(pts) and math.isfinite(packet_duration):
            end_times.append(pts + max(0.0, packet_duration))
    return max(end_times) if end_times else 0.0


def _run_whisper(wav_path: Path, raw_path: Path) -> None:
    binary, model = _tool(WHISPER), Path(WHISPER_MODEL)
    if not Path(binary).is_file() or not os.access(binary, os.X_OK):
        raise RuntimeError("Local transcription is unavailable: whisper-cli was not found.")
    if not model.is_file():
        raise RuntimeError("Local transcription is unavailable: the Whisper model was not found.")
    prefix = raw_path.with_suffix("")
    _run([binary, "-m", str(model), "-f", str(wav_path), "-l", "en", "-ml", "1", "-sow", "-ojf", "-of", str(prefix)])
    produced = prefix.with_suffix(".json")
    if produced != raw_path and produced.exists():
        os.replace(produced, raw_path)
    if not raw_path.exists():
        raise RuntimeError("Local transcription did not produce word timestamps.")


def _word_entries(raw: Any) -> list[dict[str, Any]]:
    if isinstance(raw, list):
        return [item for item in raw if isinstance(item, dict)]
    if not isinstance(raw, dict):
        return []
    for key in ("words", "tokens"):
        if isinstance(raw.get(key), list):
            return [item for item in raw[key] if isinstance(item, dict)]
    for key in ("transcription", "segments", "result"):
        segments = raw.get(key)
        if isinstance(segments, list):
            # `-sow -ojf` whisper.cpp records word-level offsets in these
            # transcription entries. Prefer them over token details: tokens
            # include control markers and punctuation fragments.
            return [item for item in segments if isinstance(item, dict)]
    return []


def _entry_times(entry: dict[str, Any]) -> tuple[Optional[float], Optional[float]]:
    offsets = entry.get("offsets") if isinstance(entry.get("offsets"), dict) else {}
    start = entry.get("start", entry.get("from", offsets.get("from")))
    end = entry.get("end", entry.get("to", offsets.get("to")))
    try:
        start, end = float(start), float(end)
    except (TypeError, ValueError):
        return None, None
    # whisper.cpp offsets use milliseconds, unlike typical word JSON seconds.
    if "offsets" in entry or max(abs(start), abs(end)) > 10000:
        start, end = start / 1000, end / 1000
    return start, end


def _clean_token_text(text: str) -> str:
    text = text.replace("▁", " ").replace("Ġ", " ")
    return "" if re.fullmatch(r"\s*\[_[^\]]+\]\s*", text) else text.strip()


def _merge_token_fragments(words: list[dict[str, Union[float, str]]]) -> list[dict[str, Union[float, str]]]:
    # Word offset entries with a leading space are already separate words. Only
    # attach standalone punctuation so terminal punctuation remains available to
    # the sentence-boundary detector.
    merged: list[dict[str, Union[float, str]]] = []
    for word in words:
        if merged and re.fullmatch(r"[.!?,;:]+", str(word["text"])):
            merged[-1]["text"] = str(merged[-1]["text"]) + str(word["text"])
            merged[-1]["end"] = word["end"]
        else:
            merged.append(word)
    return merged


def _canonical_words(words: list[dict[str, Any]], duration: float) -> list[dict[str, Union[float, str]]]:
    normalized: list[dict[str, Union[float, str]]] = []
    for word in words:
        if not isinstance(word, dict):
            continue
        try:
            start, end = float(word["start"]), float(word["end"])
        except (KeyError, TypeError, ValueError):
            continue
        text = str(word.get("text", "")).strip()
        if text and _finite_nonnegative(start) and _finite_nonnegative(end) and start <= end <= duration:
            normalized.append({"text": text, "start": start, "end": end})
    return normalized


def _take_start(words: list[dict[str, Union[float, str]]], command_index: int) -> int:
    for index in range(command_index - 1, -1, -1):
        text = str(words[index]["text"])
        if re.search(r"[.!?][\]\"')]*$", text):
            # "Friday. Cut." removes the sentence ending in Friday as well as
            # the command. That terminal punctuation belongs to the sentence
            # being removed, so find the boundary before it.
            if index == command_index - 1:
                continue
            return index + 1
        if index > 0 and float(words[index]["start"]) - float(words[index - 1]["end"]) > 1.2:
            return index
    return 0


def _normalized_command(text: str) -> str:
    return re.sub(r"[^a-z0-9]", "", text.casefold())


def _finite_nonnegative(value: Any) -> bool:
    return isinstance(value, (int, float)) and not isinstance(value, bool) and math.isfinite(value) and value >= 0


def _safe_auto_cuts(proposals: list[dict[str, Any]], duration: float) -> list[dict[str, Union[float, str]]]:
    intervals = []
    for proposal in sorted(proposals, key=lambda item: float(item["start"])):
        start, end = max(0.0, float(proposal["start"])), min(duration, float(proposal["end"]))
        if end > start:
            label = str(proposal.get("label", "spoken cut"))
            if intervals and start <= intervals[-1]["end"]:
                intervals[-1]["end"] = max(intervals[-1]["end"], end)
            else:
                intervals.append({"start": start, "end": end, "label": label})
    if len(intervals) == 1 and intervals[0]["start"] <= 0 and intervals[0]["end"] >= duration:
        intervals[0]["end"] = max(0.0, duration - 0.10)
        intervals[0]["label"] = f"{intervals[0]['label']} — adjusted to retain 0.10s, review"
    return normalize_cuts(intervals, duration) if intervals else []


def _write_transcripts(job_dir: Path, words: list[dict[str, Union[float, str]]]) -> None:
    (job_dir / "transcript.txt").write_text(_transcript_text(words), encoding="utf-8")
    rows: list[str] = []
    for index, word in enumerate(words, 1):
        rows.extend([str(index), f"{_srt_time(float(word['start']))} --> {_srt_time(float(word['end']))}", str(word["text"]), ""])
    (job_dir / "transcript.srt").write_text("\n".join(rows), encoding="utf-8")


def _transcript_text(words: list[dict[str, Union[float, str]]]) -> str:
    return " ".join(str(word["text"]) for word in words).strip()


def _srt_time(seconds: float) -> str:
    milliseconds = round(seconds * 1000)
    hours, milliseconds = divmod(milliseconds, 3_600_000)
    minutes, milliseconds = divmod(milliseconds, 60_000)
    seconds, milliseconds = divmod(milliseconds, 1_000)
    return f"{hours:02}:{minutes:02}:{seconds:02},{milliseconds:03}"


def _tool(path: str) -> str:
    return path if os.path.exists(path) else shutil.which(path) or path


def _run(command: list[str]) -> subprocess.CompletedProcess[str]:
    try:
        return subprocess.run(command, check=True, capture_output=True, text=True, timeout=PROCESS_TIMEOUT)
    except subprocess.TimeoutExpired as error:
        raise RuntimeError("Local media processing timed out.") from error
    except subprocess.CalledProcessError as error:
        detail = (error.stderr or error.stdout or "").strip().splitlines()
        raise RuntimeError(f"Local media processing failed: {detail[-1] if detail else 'unknown error'}") from error
