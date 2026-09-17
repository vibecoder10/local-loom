"""Loopback-only HTTP API for Local Loom transcription and editable cuts."""

from __future__ import annotations

import json
import math
import os
import re
import shutil
import threading
import uuid
from concurrent.futures import ThreadPoolExecutor
from http import HTTPStatus
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

from companion.processing import cut_metrics, normalize_cuts, process_recording

HOST = "127.0.0.1"
PORT = 8768
MAX_REQUEST_BYTES = 512 * 1024 * 1024
MAX_PENDING_JOBS = 3
MAX_MARKERS = 500
MAX_MARKERS_HEADER_BYTES = 32 * 1024
EXTENSION_ID = os.environ.get("LOCAL_LOOM_EXTENSION_ID")
if not EXTENSION_ID or not re.fullmatch(r"[a-p]{32}", EXTENSION_ID):
    raise RuntimeError(
        "Set LOCAL_LOOM_EXTENSION_ID to the recipient Chrome extension ID shown in chrome://extensions (32 letters a-p)."
    )
ALLOWED_ORIGIN = "chrome-extension://" + EXTENSION_ID
ALLOWED_HOSTS = {"127.0.0.1:8768", "localhost:8768"}
DATA_ROOT = Path(os.environ.get("LOCAL_LOOM_DATA_DIR", Path(__file__).resolve().parent / "data"))
ARTIFACTS = {"original.mp4", "original.webm", "edited.mp4", "transcript.txt", "transcript.srt"}


class JobManager:
    def __init__(self, data_root: Path = DATA_ROOT) -> None:
        self.data_root = data_root
        self.data_root.mkdir(parents=True, exist_ok=True)
        os.chmod(self.data_root, 0o700)
        self.jobs: Dict[str, Dict[str, Any]] = {}
        self.lock = threading.Lock()
        self.executor = ThreadPoolExecutor(max_workers=1, thread_name_prefix="local-loom")
        self.pending = 0

    def create(self, payload: bytes, content_type: str, markers: Any = None) -> Dict[str, str]:
        markers = validate_markers(markers)
        suffix = ".mp4" if content_type == "video/mp4" else ".webm"
        job_id = uuid.uuid4().hex
        job_dir = self.data_root / job_id
        with self.lock:
            if self.pending >= MAX_PENDING_JOBS:
                raise RuntimeError("processing queue is full")
            # Reserve before accepting bytes, so a full single-worker queue
            # cannot leave an upload permanently marked queued.
            self.pending += 1
        try:
            job_dir.mkdir(mode=0o700)
            source = job_dir / ("original" + suffix)
            source.write_bytes(payload)
            os.chmod(source, 0o600)
            (job_dir / "markers.json").write_text(json.dumps(markers), encoding="utf-8")
            os.chmod(job_dir / "markers.json", 0o600)
            with self.lock:
                self.jobs[job_id] = {"id": job_id, "dir": job_dir, "source": source, "markers": markers, "status": "queued", "metadata": None, "error": None}
            self.executor.submit(self._run, job_id, "process", None)
        except Exception:
            with self.lock:
                self.jobs.pop(job_id, None)
                self.pending -= 1
            if job_dir.exists():
                shutil.rmtree(job_dir)
            raise
        return {"id": job_id, "status": "queued"}

    def get(self, job_id: str) -> Optional[Dict[str, Any]]:
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            result = {"id": job_id, "status": job["status"]}
            if job["status"] == "error":
                result["error"] = job["error"]
            if job["status"] == "ready" and job["metadata"]:
                result.update(job["metadata"])
            return result

    def artifact(self, job_id: str, name: str) -> Optional[Path]:
        if name not in ARTIFACTS:
            return None
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return None
            path = job["dir"] / name
        return path if path.is_file() else None

    def rerender(self, job_id: str, cuts: Any) -> Tuple[bool, str]:
        with self.lock:
            job = self.jobs.get(job_id)
            if not job:
                return False, "job not found"
            if job["status"] in {"queued", "transcribing", "rendering"}:
                return False, "job is busy"
            if not job["metadata"]:
                return False, "job has no editable result"
            try:
                canonical = normalize_cuts(cuts, float(job["metadata"]["duration"]))
            except ValueError as error:
                return False, str(error)
            job["status"] = "queued"
            job["error"] = None
        if not self._submit(job_id, "render", canonical):
            with self.lock:
                job["status"] = "ready"
            return False, "processing queue is full"
        return True, "queued"

    def _submit(self, job_id: str, kind: str, cuts: Any = None) -> bool:
        with self.lock:
            if self.pending >= MAX_PENDING_JOBS:
                return False
            self.pending += 1
        self.executor.submit(self._run, job_id, kind, cuts)
        return True

    def _run(self, job_id: str, kind: str, cuts: Any) -> None:
        try:
            with self.lock:
                job = self.jobs[job_id]
            if kind == "process":
                def update(status: str) -> None:
                    with self.lock:
                        job["status"] = status

                metadata = process_recording(job["dir"], job["source"], update, job.get("markers"))
                with self.lock:
                    job["metadata"] = metadata
                    job["status"] = "ready"
            else:
                from companion.processing import render_edit

                with self.lock:
                    job["status"] = "rendering"
                    metadata = job["metadata"]
                render_edit(job["source"], job["dir"] / "edited.mp4", cuts, float(metadata["duration"]))
                with self.lock:
                    metadata["cuts"] = cuts
                    metadata.update(cut_metrics(cuts, float(metadata["duration"])))
                    job["status"] = "ready"
        except Exception as error:  # Job errors are returned to the local UI.
            with self.lock:
                job = self.jobs.get(job_id)
                if job:
                    job["status"] = "error"
                    job["error"] = str(error) or "Local processing failed."
        finally:
            with self.lock:
                self.pending -= 1


class LocalLoomHandler(BaseHTTPRequestHandler):
    manager: JobManager
    protocol_version = "HTTP/1.1"

    def do_OPTIONS(self) -> None:  # noqa: N802
        if not self._authorized(require_origin=True):
            return
        self.send_response(HTTPStatus.NO_CONTENT)
        self._cors_headers()
        self.end_headers()

    def do_GET(self) -> None:  # noqa: N802
        if self.path == "/health":
            if not self._authorized(require_origin=False):
                return
            from companion.processing import WHISPER, WHISPER_MODEL

            available = Path(WHISPER).is_file() and Path(WHISPER_MODEL).is_file()
            self._json(HTTPStatus.OK, {"ok": True, "transcriptionAvailable": available}, cors=bool(self.headers.get("Origin")))
            return
        if not self._authorized(require_origin=True):
            return
        match = re.fullmatch(r"/jobs/([a-f0-9]{32})", self.path)
        if match:
            job = self.manager.get(match.group(1))
            if not job:
                self._error(HTTPStatus.NOT_FOUND, "job not found")
            else:
                self._json(HTTPStatus.OK, job, cors=True)
            return
        match = re.fullmatch(r"/jobs/([a-f0-9]{32})/files/(original\.(?:mp4|webm)|edited\.mp4|transcript\.(?:txt|srt))", self.path)
        if match:
            self._serve_file(self.manager.artifact(match.group(1), match.group(2)))
            return
        self._error(HTTPStatus.NOT_FOUND, "not found")

    def do_POST(self) -> None:  # noqa: N802
        if not self._authorized(require_origin=True):
            return
        if self.path == "/jobs":
            content_type = self.headers.get("Content-Type", "").split(";", 1)[0].strip().lower()
            if content_type not in {"video/mp4", "video/webm"}:
                self._error(HTTPStatus.UNSUPPORTED_MEDIA_TYPE, "recording must be video/mp4 or video/webm")
                return
            payload = self._read_body(MAX_REQUEST_BYTES)
            if payload is None:
                return
            try:
                markers = self._markers_header()
                result = self.manager.create(payload, content_type, markers)
            except ValueError as error:
                self._error(HTTPStatus.BAD_REQUEST, str(error))
                return
            except RuntimeError as error:
                self._error(HTTPStatus.TOO_MANY_REQUESTS, str(error))
                return
            self._json(HTTPStatus.ACCEPTED, result, cors=True)
            return
        match = re.fullmatch(r"/jobs/([a-f0-9]{32})/render", self.path)
        if match:
            payload = self._read_body(1_048_576)
            if payload is None:
                return
            try:
                body = json.loads(payload.decode("utf-8"))
            except (UnicodeDecodeError, json.JSONDecodeError):
                self._error(HTTPStatus.BAD_REQUEST, "render body must be JSON")
                return
            if not isinstance(body, dict):
                self._error(HTTPStatus.BAD_REQUEST, "render body must be an object")
                return
            ok, message = self.manager.rerender(match.group(1), body.get("cuts"))
            if not ok:
                status = HTTPStatus.CONFLICT if message == "job is busy" else HTTPStatus.BAD_REQUEST
                if message == "job not found":
                    status = HTTPStatus.NOT_FOUND
                self._error(status, message)
                return
            self._json(HTTPStatus.ACCEPTED, {"id": match.group(1), "status": message}, cors=True)
            return
        self._error(HTTPStatus.NOT_FOUND, "not found")

    def _authorized(self, require_origin: bool) -> bool:
        if self.headers.get("Host") not in ALLOWED_HOSTS:
            self._error(HTTPStatus.FORBIDDEN, "host is not allowed", cors=False)
            return False
        origin = self.headers.get("Origin")
        if require_origin and origin != ALLOWED_ORIGIN and not (origin is None and self.headers.get("X-Local-Loom-Client") == EXTENSION_ID):
            self._error(HTTPStatus.FORBIDDEN, "origin is not allowed", cors=False)
            return False
        if origin and origin != ALLOWED_ORIGIN:
            self._error(HTTPStatus.FORBIDDEN, "origin is not allowed", cors=False)
            return False
        return True

    def _read_body(self, maximum: int) -> Optional[bytes]:
        try:
            length = int(self.headers.get("Content-Length", ""))
        except ValueError:
            self._error(HTTPStatus.LENGTH_REQUIRED, "Content-Length is required")
            return None
        if length < 0 or length > maximum:
            self._error(HTTPStatus.REQUEST_ENTITY_TOO_LARGE, f"request exceeds {maximum} byte limit")
            return None
        return self.rfile.read(length)

    def _markers_header(self) -> list[dict[str, float]]:
        raw = self.headers.get("X-Local-Loom-Markers")
        if raw is None:
            return []
        if len(raw.encode("utf-8")) > MAX_MARKERS_HEADER_BYTES:
            raise ValueError("markers header exceeds 32768 byte limit")
        try:
            return validate_markers(json.loads(raw))
        except (UnicodeDecodeError, json.JSONDecodeError):
            raise ValueError("markers header must be a JSON array")

    def _serve_file(self, path: Optional[Path]) -> None:
        if not path:
            self._error(HTTPStatus.NOT_FOUND, "artifact not found")
            return
        content_types = {".mp4": "video/mp4", ".webm": "video/webm", ".txt": "text/plain; charset=utf-8", ".srt": "text/plain; charset=utf-8"}
        self.send_response(HTTPStatus.OK)
        self._cors_headers()
        self.send_header("Content-Type", content_types.get(path.suffix, "application/octet-stream"))
        self.send_header("Content-Length", str(path.stat().st_size))
        self.end_headers()
        with path.open("rb") as artifact:
            shutil_copyfileobj(artifact, self.wfile)

    def _json(self, status: HTTPStatus, data: Dict[str, Any], cors: bool = True) -> None:
        encoded = json.dumps(data, separators=(",", ":")).encode("utf-8")
        self.send_response(status)
        if cors:
            self._cors_headers()
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.end_headers()
        self.wfile.write(encoded)

    def _error(self, status: HTTPStatus, message: str, cors: bool = True) -> None:
        self._json(status, {"error": message}, cors=cors and self.headers.get("Origin") == ALLOWED_ORIGIN)

    def _cors_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", ALLOWED_ORIGIN)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Local-Loom-Client, X-Local-Loom-Markers")
        self.send_header("Vary", "Origin")
        self.send_header("Cache-Control", "no-store")

    def log_message(self, format: str, *args: Any) -> None:
        return


def shutil_copyfileobj(source: Any, destination: Any, length: int = 1024 * 1024) -> None:
    while True:
        block = source.read(length)
        if not block:
            return
        destination.write(block)


def validate_markers(markers: Any) -> list[dict[str, float]]:
    if markers is None:
        return []
    if not isinstance(markers, list) or len(markers) > MAX_MARKERS:
        raise ValueError("markers must be an array with at most 500 entries")
    normalized = []
    for marker in markers:
        if not isinstance(marker, dict) or set(marker) != {"time"}:
            raise ValueError("each marker must contain only a numeric time")
        time = marker["time"]
        if isinstance(time, bool) or not isinstance(time, (int, float)) or not math.isfinite(time) or time < 0:
            raise ValueError("marker times must be finite nonnegative numbers")
        normalized.append({"time": float(time)})
    return normalized


def make_server(data_root: Optional[Path] = None) -> ThreadingHTTPServer:
    manager = JobManager(data_root or DATA_ROOT)
    handler = type("ConfiguredLocalLoomHandler", (LocalLoomHandler,), {"manager": manager})
    return ThreadingHTTPServer((HOST, PORT), handler)


def main() -> None:
    server = make_server()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    main()
