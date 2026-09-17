import math
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from companion.processing import (
    cut_metrics,
    detect_cuts,
    detect_marker_cuts,
    kept_ranges,
    normalize_cuts,
    normalize_words,
)


class ProcessingSemanticsTests(unittest.TestCase):
    def test_marker_uses_previous_sentence_and_falls_back_without_nearby_words(self):
        words = [
            {"text": "Keep.", "start": 0.0, "end": 0.5},
            {"text": "Wrong", "start": 1.0, "end": 1.3},
            {"text": "sentence", "start": 1.3, "end": 1.8},
        ]
        self.assertEqual(
            detect_marker_cuts(words, [{"time": 2.0}], 10.0),
            [{"start": 0.9, "end": 2.0, "label": "manual marker — sentence, review"}],
        )
        self.assertEqual(
            detect_marker_cuts(words, [{"time": 8.0}], 10.0),
            [{"start": 3.0, "end": 8.0, "label": "manual marker — last5s, review"}],
        )

    def test_marker_clamps_and_never_auto_removes_the_entire_file(self):
        clamped = detect_marker_cuts([], [{"time": 99.0}], 1.0)
        self.assertEqual(clamped[0]["start"], 0.0)
        self.assertEqual(clamped[0]["end"], 0.9)
        self.assertIn("adjusted to retain", clamped[0]["label"])
        self.assertEqual(detect_marker_cuts([], [{"time": 0.0}], 1.0), [])

    def test_spoken_cut_and_overlapping_auto_ranges_retain_a_tenth_of_a_second(self):
        words = [{"text": "cut", "start": 0.0, "end": 1.0}]
        cuts = detect_cuts(words, 1.0)
        self.assertEqual(cuts[0]["start"], 0.0)
        self.assertEqual(cuts[0]["end"], 0.9)
        self.assertIn("adjusted to retain", cuts[0]["label"])
        from companion.processing import _safe_auto_cuts
        merged = _safe_auto_cuts([
            {"start": 0.0, "end": 0.6, "label": "spoken cut"},
            {"start": 0.5, "end": 1.0, "label": "manual marker"},
        ], 1.0)
        self.assertEqual(merged[0]["end"], 0.9)
        with self.assertRaises(ValueError):
            normalize_cuts([{"start": 0.0, "end": 1.0}], 1.0)

    def test_cut_metrics_are_recomputed_from_merged_ranges(self):
        self.assertEqual(cut_metrics([{"start": 1.0, "end": 3.0}, {"start": 4.0, "end": 5.5}], 8.0), {"cutCount": 2, "removedSeconds": 3.5, "editedDuration": 4.5})

    @patch("companion.processing.render_edit")
    @patch("companion.processing.probe_media", return_value={"duration": 10.0, "has_audio": False})
    def test_no_audio_still_renders_marker_edit_and_returns_manual_metadata(self, _probe, render):
        from companion.processing import process_recording
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "original.webm"; source.write_bytes(b"source")
            result = process_recording(root, source, lambda _status: None, [{"time": 8.0}])
        self.assertEqual(result["transcriptStatus"], "unavailable")
        self.assertEqual(result["cutCount"], 1)
        self.assertEqual(result["editedDuration"], 5.0)
        render.assert_called_once()

    @patch("companion.processing.render_edit")
    @patch("companion.processing._run_whisper", side_effect=RuntimeError("model missing"))
    @patch("companion.processing._run")
    @patch("companion.processing.probe_media", return_value={"duration": 10.0, "has_audio": True})
    def test_transcription_failure_keeps_manual_marker_editing_available(self, _probe, _run, _whisper, render):
        from companion.processing import process_recording
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            source = root / "original.webm"; source.write_bytes(b"source")
            result = process_recording(root, source, lambda _status: None, [{"time": 8.0}])
        self.assertEqual(result["transcriptStatus"], "unavailable")
        self.assertIn("model missing", result["note"])
        self.assertEqual(result["cutCount"], 1)
        render.assert_called_once()
    def test_normalize_words_trims_tokens_and_converts_milliseconds(self):
        raw = {
            "transcription": [
                {"text": " hello", "offsets": {"from": 0, "to": 500}},
                {"text": " CUT", "offsets": {"from": 500, "to": 800}},
            ]
        }

        self.assertEqual(
            normalize_words(raw),
            [
                {"text": "hello", "start": 0.0, "end": 0.5},
                {"text": "CUT", "start": 0.5, "end": 0.8},
            ],
        )

    def test_detect_cuts_matches_exact_word_and_removes_the_previous_sentence(self):
        words = [
            {"text": "Keep", "start": 0.0, "end": 0.2},
            {"text": "this.", "start": 0.2, "end": 0.4},
            {"text": "Wrong", "start": 0.6, "end": 0.8},
            {"text": "take", "start": 0.8, "end": 1.0},
            {"text": "CUT", "start": 1.0, "end": 1.1},
            {"text": "Replacement", "start": 1.35, "end": 1.6},
        ]

        self.assertEqual(
            detect_cuts(words, 2.0),
            [{"start": 0.5, "end": 1.25, "label": "spoken cut"}],
        )

    def test_detect_cuts_does_not_match_cutting_and_uses_a_long_gap_as_sentence_start(self):
        words = [
            {"text": "Keep", "start": 0.0, "end": 0.3},
            {"text": "cutting", "start": 0.3, "end": 0.7},
            {"text": "Wrong", "start": 2.2, "end": 2.5},
            {"text": "cut", "start": 2.5, "end": 2.7},
        ]

        self.assertEqual(
            detect_cuts(words, 3.0),
            [{"start": 2.1, "end": 2.85, "label": "spoken cut"}],
        )

    def test_detect_cuts_merges_overlapping_proposals(self):
        words = [
            {"text": "Wrong", "start": 0.2, "end": 0.4},
            {"text": "cut", "start": 0.4, "end": 0.5},
            {"text": "again", "start": 0.55, "end": 0.7},
            {"text": "cut", "start": 0.7, "end": 0.8},
        ]

        self.assertEqual(
            detect_cuts(words, 1.5),
            [{"start": 0.1, "end": 0.95, "label": "spoken cut"}],
        )

    def test_normalize_cuts_merges_overlap_and_kept_ranges_complement_it(self):
        cuts = normalize_cuts(
            [{"start": 1.0, "end": 2.0}, {"start": 1.5, "end": 3.0}, {"start": 5.0, "end": 6.0}],
            8.0,
        )
        self.assertEqual(
            cuts,
            [
                {"start": 1.0, "end": 3.0, "label": "spoken cut"},
                {"start": 5.0, "end": 6.0, "label": "spoken cut"},
            ],
        )
        self.assertEqual(
            kept_ranges(cuts, 8.0),
            [{"start": 0.0, "end": 1.0}, {"start": 3.0, "end": 5.0}, {"start": 6.0, "end": 8.0}],
        )

    def test_normalize_cuts_rejects_invalid_or_whole_video_ranges(self):
        invalid = [
            "not a list",
            [{"start": -0.1, "end": 1.0}],
            [{"start": 1.0, "end": 1.0}],
            [{"start": 3.0, "end": 2.0}],
            [{"start": 7.0, "end": 9.0}],
            [{"start": 0.0, "end": 8.0}],
            [{"start": 4.0, "end": 5.0}, {"start": 1.0, "end": 2.0}],
            [{"start": math.nan, "end": 1.0}],
            [{"start": 1.0, "end": math.inf}],
        ]
        for cuts in invalid:
            with self.subTest(cuts=cuts):
                with self.assertRaises(ValueError):
                    normalize_cuts(cuts, 8.0)


if __name__ == "__main__":
    unittest.main()
