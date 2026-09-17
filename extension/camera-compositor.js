const DEFAULT_LAYOUT = Object.freeze({ x: 0.03, y: 0.97, size: 0.24, shape: 'circle', mirror: true });

export function normalizeLayout(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return {
    x: clampNumber(source.x, DEFAULT_LAYOUT.x, 0, 1),
    y: clampNumber(source.y, DEFAULT_LAYOUT.y, 0, 1),
    size: clampNumber(source.size, DEFAULT_LAYOUT.size, 0.12, 0.45),
    shape: source.shape === 'square' ? 'square' : 'circle',
    mirror: typeof source.mirror === 'boolean' ? source.mirror : DEFAULT_LAYOUT.mirror,
  };
}

export function overlayRect(layout, width, height) {
  const normalized = normalizeLayout(layout);
  const safeWidth = Math.max(0, Number(width) || 0);
  const safeHeight = Math.max(0, Number(height) || 0);
  const diameter = Math.min(safeWidth, safeHeight) * normalized.size;
  return {
    x: normalized.x * Math.max(0, safeWidth - diameter),
    y: normalized.y * Math.max(0, safeHeight - diameter),
    width: diameter,
    height: diameter,
    diameter,
  };
}

export class CameraCompositor {
  constructor({ onError } = {}) {
    this.onError = typeof onError === 'function' ? onError : () => {};
    this.layout = normalizeLayout();
    this.worker = null;
    this.generator = null;
    this.stream = null;
    this.timeoutId = null;
    this.startResolve = null;
    this.startReject = null;
    this.started = false;
  }

  static isSupported() {
    return typeof globalThis.MediaStreamTrackProcessor === 'function'
      && typeof globalThis.MediaStreamTrackGenerator === 'function'
      && typeof globalThis.OffscreenCanvas === 'function'
      && typeof globalThis.Worker === 'function';
  }

  async start(displayStream, cameraStream, layout = {}) {
    if (this.worker || this.generator) throw new Error('Camera compositor is already running.');
    if (!CameraCompositor.isSupported()) {
      throw new Error('Camera overlay is unavailable in this Chrome version. Turn Camera off and record the screen only.');
    }
    const screenTrack = displayStream?.getVideoTracks?.()[0];
    const cameraTrack = cameraStream?.getVideoTracks?.()[0];
    if (!screenTrack || !cameraTrack) throw new Error('Camera overlay needs both a screen and camera video track.');

    this.layout = normalizeLayout({ ...this.layout, ...layout });
    try {
      const screenProcessor = new MediaStreamTrackProcessor({ track: screenTrack, maxBufferSize: 1 });
      const cameraProcessor = new MediaStreamTrackProcessor({ track: cameraTrack, maxBufferSize: 1 });
      this.generator = new MediaStreamTrackGenerator({ kind: 'video' });
      this.stream = new MediaStream([this.generator]);
      this.worker = new Worker(new URL('./camera-worker.js', import.meta.url), { type: 'module' });
      this.worker.onmessage = (event) => this._onWorkerMessage(event.data);
      this.worker.onerror = (event) => this._fail(event.message || 'Camera compositor worker failed.');
      this.worker.onmessageerror = () => this._fail('Camera compositor worker could not receive video frames.');

      const ready = new Promise((resolve, reject) => {
        this.startResolve = resolve;
        this.startReject = reject;
      });
      this.timeoutId = setTimeout(() => {
        this._fail('Camera overlay did not receive a composited frame within 10 seconds. Turn Camera off and try again.');
      }, 10_000);
      this.worker.postMessage({
        type: 'start',
        screenReadable: screenProcessor.readable,
        cameraReadable: cameraProcessor.readable,
        outputWritable: this.generator.writable,
        layout: this.layout,
      }, [screenProcessor.readable, cameraProcessor.readable, this.generator.writable]);
      await ready;
      this.started = true;
      return this.stream;
    } catch (error) {
      this._dispose();
      throw error;
    }
  }

  updateLayout(partial = {}) {
    this.layout = normalizeLayout({ ...this.layout, ...partial });
    this.worker?.postMessage({ type: 'layout', layout: this.layout });
    return this.layout;
  }

  stop() {
    if (this.startReject) this.startReject(new Error('Camera compositor stopped before its first frame.'));
    this._dispose();
  }

  _onWorkerMessage(message) {
    if (!message || typeof message !== 'object') return;
    if (message.type === 'ready') {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
      const resolve = this.startResolve;
      this.startResolve = null;
      this.startReject = null;
      resolve?.(this.stream);
    } else if (message.type === 'error') {
      this._fail(message.message || 'Camera compositor could not process video frames.');
    }
  }

  _fail(message) {
    if (!this.worker && !this.generator) return;
    const reject = this.startReject;
    this.onError(message);
    this._dispose();
    reject?.(new Error(message));
  }

  _dispose() {
    clearTimeout(this.timeoutId);
    this.timeoutId = null;
    this.startResolve = null;
    this.startReject = null;
    if (this.worker) {
      this.worker.onmessage = null;
      this.worker.onerror = null;
      this.worker.onmessageerror = null;
      this.worker.terminate();
      this.worker = null;
    }
    if (this.generator) {
      try { this.generator.stop(); } catch (_) { /* Track may already be stopped. */ }
      this.generator = null;
    }
    this.stream = null;
    this.started = false;
  }
}

function clampNumber(value, fallback, minimum, maximum) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(maximum, Math.max(minimum, number));
}
