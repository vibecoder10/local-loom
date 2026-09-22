"""
Retake-cut helper. Last-take rule: when a phrase is repeated, keep the LAST take.

Usage:
1. Run cut_silences.py first to remove dead air -> intro_cut.mp4 (silence-removed)
2. Run faster-whisper transcription with word_timestamps=True on intro_cut.mp4
3. Identify retake clusters from word-level timestamps (false starts, double "because"s,
   incomplete sentences followed by full ones, "let me start over" markers)
4. Fill in KEEPS below as (start, end) ranges in the silence-cut timeline
5. Run this script -> intro_final.mp4

Each clip in KEEPS becomes a numbered segment in the final video. Drag boundaries by
edit-running this script with adjusted ranges.

Tips:
- Pad: 0.04s on each side of cuts smooths audio joins. Don't go below 0.02s.
- "Last take wins": if a sentence is recorded 3 times, KEEP only the 3rd attempt.
- Watch for tail bleed: if a previous failed word ends 0.04s before a kept word's
  start, your pad will catch the failed tail. Push start later by 0.06-0.10s.
- Source duration > requested end: ffmpeg silently truncates. Check output duration
  matches sum of (end-start) totals.
"""
import subprocess
import sys
from pathlib import Path

# CUSTOMIZE
IN = Path(r"C:/path/to/input_silence_cut.mp4")
OUT = Path(r"C:/path/to/output_final.mp4")

# Keep ranges (start, end) in seconds. Last-take rule applies  -  only include the
# RANGE of the last good take for each spoken section.
KEEPS = [
    # (start, end),  # Clip 1: "first sentence"
    # (start, end),  # Clip 2: "second sentence"
]

PAD_NOTE = "Pad already baked into your timestamps. Don't add more here."

def main():
    if not KEEPS:
        sys.exit("ERROR: KEEPS is empty. Fill in keep ranges first.")

    parts = []
    for i, (s, e) in enumerate(KEEPS):
        s = max(0, s)
        parts.append(f"[0:v]trim={s}:{e},setpts=PTS-STARTPTS[v{i}]")
        parts.append(f"[0:a]atrim={s}:{e},asetpts=PTS-STARTPTS[a{i}]")

    concat_inputs = "".join(f"[v{i}][a{i}]" for i in range(len(KEEPS)))
    concat = f"{concat_inputs}concat=n={len(KEEPS)}:v=1:a=1[v][a]"
    filter_complex = ";".join(parts) + ";" + concat

    cmd = [
        "ffmpeg", "-hide_banner", "-y", "-i", str(IN),
        "-filter_complex", filter_complex,
        "-map", "[v]", "-map", "[a]",
        "-c:v", "libx264", "-preset", "fast", "-crf", "18",
        "-r", "30", "-g", "30", "-keyint_min", "30",
        "-force_key_frames", "expr:gte(t,n_forced*1)",
        "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart",
        str(OUT),
    ]

    total = sum(e - s for s, e in KEEPS)
    print(f"Cutting {len(KEEPS)} clips. Estimated final duration: {total:.2f}s", flush=True)
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        print("FFMPEG STDERR:", result.stderr[-2000:], file=sys.stderr)
        sys.exit(result.returncode)

    probe = subprocess.run(
        ["ffprobe", "-v", "error", "-show_entries", "format=duration",
         "-of", "default=noprint_wrappers=1:nokey=1", str(OUT)],
        capture_output=True, text=True,
    )
    print(f"OUT duration: {probe.stdout.strip()}s -> {OUT}", flush=True)

if __name__ == "__main__":
    main()
