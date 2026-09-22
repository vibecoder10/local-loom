#!/usr/bin/env python3
"""Offline video/audio -> whisper.cpp word timings; no network or API calls."""
import argparse
import json
import math
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile

DEFAULT_MODEL = Path.home() / '.cache/animate/models/ggml-base.en.bin'


def normalize(raw):
    words = []
    for segment in raw.get('transcription', []):
        original = segment.get('text', '')
        text = original.strip()
        if not text:
            continue
        if len(text.split()) != 1:
            raise ValueError('Expected word-split output. Run whisper-cli with -ml 1 -sow; do not invent timings within a phrase.')
        bounds = segment['offsets']
        start, end = bounds['from'] / 1000, bounds['to'] / 1000
        if not all(math.isfinite(v) for v in (start, end)) or start < 0 or end <= start:
            raise ValueError('Invalid word timing; inspect raw transcript before captioning.')
        if words and start < words[-1]['end']:
            raise ValueError('Overlapping word timings; inspect raw transcript before captioning.')
        if words and not original[0].isspace():
            words[-1]['text'] += text
            words[-1]['end'] = end
        else:
            words.append({'text': text, 'start': start, 'end': end})
    return {'provider': 'whisper.cpp', 'timing_source': 'audio_estimated_words',
            'timing_note': 'Experimental ASR word boundaries, not hand-aligned ground truth. Review against audio.',
            'language': raw.get('result', {}).get('language'),
            'text': ' '.join(w['text'] for w in words), 'words': words}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    inputs = parser.add_mutually_exclusive_group(required=True)
    inputs.add_argument('--input', type=Path, help='Local video or audio file; never uploaded')
    inputs.add_argument('--from-json', type=Path, help='Existing whisper.cpp word-split JSON')
    parser.add_argument('--output', required=True, type=Path)
    parser.add_argument('--model', type=Path, default=Path(os.environ.get('ANIMATE_WHISPER_MODEL', str(DEFAULT_MODEL))))
    parser.add_argument('--language', default='en')
    parser.add_argument('--timeout', type=float, default=1800, help='Maximum seconds for each local subprocess')
    args = parser.parse_args()
    if not math.isfinite(args.timeout) or args.timeout <= 0:
        parser.error('--timeout must be finite and positive')
    out = args.output.expanduser().resolve()
    if args.input and args.input.resolve() == out:
        parser.error('Output must not replace input')
    if args.from_json:
        raw = json.loads(args.from_json.read_text())
    else:
        if not args.input.is_file():
            parser.error('Input recording does not exist')
        if not args.model.expanduser().is_file():
            parser.error('Whisper model missing: set --model or ANIMATE_WHISPER_MODEL; see references/local-transcription.md')
        for executable in ('ffmpeg', 'whisper-cli'):
            if not shutil.which(executable):
                parser.error(executable + ' is not installed/on PATH')
        out.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(prefix='animate-transcribe-') as temp:
            wav = str(Path(temp) / 'audio.wav')
            prefix = str(Path(temp) / 'whisper')
            log_path = out.with_suffix('.log')
            with log_path.open('w') as log:
                subprocess.run(['ffmpeg', '-nostdin', '-v', 'error', '-i', str(args.input.resolve()),
                                '-map', '0:a:0', '-vn', '-ar', '16000', '-ac', '1', '-c:a', 'pcm_s16le', wav],
                               check=True, stdout=log, stderr=log, timeout=args.timeout)
                subprocess.run(['whisper-cli', '-m', str(args.model.expanduser().resolve()), '-f', wav,
                                '-l', args.language, '-ml', '1', '-sow', '-ojf', '-of', prefix],
                               check=True, stdout=log, stderr=log, timeout=args.timeout)
            raw = json.loads(Path(prefix + '.json').read_text())
    result = normalize(raw)
    result['model'] = raw.get('params', {}).get('model')
    out.parent.mkdir(parents=True, exist_ok=True)
    raw_path = out.with_suffix('.raw.json')
    raw_path.write_text(json.dumps(raw, indent=2) + '\n')
    result['raw_path'] = str(raw_path)
    out.write_text(json.dumps(result, indent=2) + '\n')
    print(f'{len(result["words"])} words -> {out}')


if __name__ == '__main__':
    try:
        main()
    except (OSError, ValueError, KeyError, subprocess.SubprocessError) as exc:
        print(f'Local transcription failed: {exc}', file=sys.stderr)
        sys.exit(1)
