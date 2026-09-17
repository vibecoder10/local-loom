import math
import os
import tempfile
import unittest
from pathlib import Path

os.environ.setdefault("LOCAL_LOOM_EXTENSION_ID", "a" * 32)

from companion.server import LocalLoomHandler, JobManager, validate_markers


class MarkerServerTests(unittest.TestCase):
    def test_markers_require_exact_finite_numeric_times_and_limit_count(self):
        self.assertEqual(validate_markers([{"time": 1}, {"time": 2.5}]), [{"time": 1.0}, {"time": 2.5}])
        invalid = [[{"time": True}], [{"time": "1"}], [{"time": math.nan}], [{"time": -1}], [{"time": 1, "x": 2}], [{}], ["bad"], [{"time": 1}] * 501]
        for value in invalid:
            with self.subTest(value=value):
                with self.assertRaises(ValueError):
                    validate_markers(value)

    def test_create_persists_validated_markers_before_processing(self):
        with tempfile.TemporaryDirectory() as directory:
            manager = JobManager(Path(directory))
            manager.executor.shutdown(wait=False, cancel_futures=True)
            manager.executor = _NoopExecutor()
            result = manager.create(b"recording", "video/webm", [{"time": 3.0}])
            job = manager.jobs[result["id"]]
            self.assertEqual(job["markers"], [{"time": 3.0}])
            self.assertEqual((job["dir"] / "markers.json").read_text(), '[{"time": 3.0}]')

    def test_marker_header_rejects_invalid_json_and_oversized_values(self):
        handler = object.__new__(LocalLoomHandler)
        handler.headers = {"X-Local-Loom-Markers": "not-json"}
        with self.assertRaises(ValueError):
            handler._markers_header()
        handler.headers = {"X-Local-Loom-Markers": "x" * (32 * 1024 + 1)}
        with self.assertRaises(ValueError):
            handler._markers_header()


class _NoopExecutor:
    def submit(self, *args, **kwargs):
        return None


if __name__ == "__main__":
    unittest.main()
