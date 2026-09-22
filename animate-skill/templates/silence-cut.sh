#!/usr/bin/env bash
#
# Silence-cut a video using ffmpeg silencedetect + filter_complex concat.
# Re-encodes the result with tight 1s GOP keyframes for Hyperframes seek.
#
# USAGE:
#   1. Set IN, OUT below
#   2. Run: ffmpeg -i "$IN" -af "silencedetect=noise=-32dB:d=0.25" -f null - 2>&1 | grep silence
#   3. Build keep ranges in your head:
#      - For each silence (s_start, s_end), keep 0.1s pad → cut starts at s_start + 0.1
#      - keep[i] = (cut_end[i-1] OR 0, s_start[i] + 0.1)
#   4. Fill in the trim/atrim filter_complex below
#   5. Run this script
#
# Tunable knobs:
#   - silencedetect threshold (-32dB is a good default, -30dB more aggressive)
#   - duration filter (0.25s = remove silences ≥ 0.25s; lower = stricter)
#   - keep-pad (0.1s = leave 0.1s of silence at each cut for natural pacing)
#   - target fps (-r 24 or -r 30  -  match your composition)
#   - CRF (-crf 18 = high quality, 23 = good, 28 = ok)

set -euo pipefail

IN="[INPUT_PATH]"
OUT="[OUTPUT_PATH]"
TMP="${OUT%.mp4}_tmp.mp4"

# CUSTOMIZE: list keep ranges as (start end) pairs from silencedetect output.
# Example: keep ranges (0.0, 14.36), (14.65, 17.64), (17.82, 21.32) →
#   trim=0:14.36 ;  trim=14.65:17.64 ;  trim=17.82:21.32

ffmpeg -hide_banner -y -i "$IN" -filter_complex "\
[0:v]trim=0:14.36,setpts=PTS-STARTPTS[v0];\
[0:a]atrim=0:14.36,asetpts=PTS-STARTPTS[a0];\
[0:v]trim=14.65:17.64,setpts=PTS-STARTPTS[v1];\
[0:a]atrim=14.65:17.64,asetpts=PTS-STARTPTS[a1];\
[0:v]trim=17.82:21.32,setpts=PTS-STARTPTS[v2];\
[0:a]atrim=17.82:21.32,asetpts=PTS-STARTPTS[a2];\
[v0][a0][v1][a1][v2][a2]concat=n=3:v=1:a=1[v][a]" \
  -map "[v]" -map "[a]" \
  -c:v libx264 -preset fast -crf 18 -r 24 -g 24 -keyint_min 24 \
  -force_key_frames "expr:gte(t,n_forced*1)" \
  -c:a aac -b:a 192k -movflags +faststart "$TMP"

mv "$TMP" "$OUT"
echo "Done. Output:"
ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1 "$OUT"
