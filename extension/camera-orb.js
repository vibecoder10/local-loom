/** A Document Picture-in-Picture camera preview with explicit stream ownership. */
export class CameraOrb {
  constructor({ onStop, onMark, onError, onChange } = {}) {
    this.onStop = typeof onStop === 'function' ? onStop : () => {};
    this.onMark = typeof onMark === 'function' ? onMark : () => {};
    this.onError = typeof onError === 'function' ? onError : () => {};
    this.onChange = typeof onChange === 'function' ? onChange : () => {};
    this.pipWindow = null;
    this.video = null;
    this.status = null;
    this.stopButton = null;
    this.markButton = null;
    this.ownedStream = null;
    this.pendingStream = null;
    this.generation = 0;
    this.recording = false;
    this.markEnabled = true;
    this.mirror = true;
    this._changed = false;
  }

  get supported() {
    return typeof globalThis.documentPictureInPicture?.requestWindow === 'function';
  }

  async open(stream = null, { waitForStream = false } = {}) {
    const generation = this.generation;
    try {
      if (!this.supported) throw new Error('Floating camera preview is unavailable in this version of Chrome.');
      if (this.pipWindow && !this.pipWindow.closed) {
        this.pipWindow.focus?.();
        if (stream) this.setStream(stream);
        return this.pipWindow;
      }

      // This call must be first: Document PiP requires the caller's user gesture.
      const pipWindow = await globalThis.documentPictureInPicture.requestWindow({ width: 240, height: 290 });
      if (generation !== this.generation) { pipWindow.close(); return null; }
      this._buildWindow(pipWindow);
      if (this.pendingStream) this.setStream(this.pendingStream);
      if (stream) {
        this.setStream(stream);
      } else if (!waitForStream) {
        const ownStream = await globalThis.navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        if (this.pipWindow !== pipWindow || pipWindow.closed) {
          stopTracks(ownStream);
          return null;
        }
        this._setStream(ownStream, true);
      }
      return pipWindow;
    } catch (error) {
      const message = error?.message || 'Unable to show the floating camera preview.';
      this._reportError(message);
      this.close();
      throw error instanceof Error ? error : new Error(message);
    }
  }

  setStream(stream) {
    if (!stream) return null;
    this.pendingStream = stream;
    if (!this.video) return stream;
    this._setStream(stream, false);
    return stream;
  }

  setRecording(recording) {
    this.recording = Boolean(recording);
    if (this.status) this.status.textContent = this.recording ? 'Recording' : 'Camera preview';
    if (this.stopButton) this.stopButton.disabled = !this.recording;
    this._syncMarkButton();
  }

  setMarkEnabled(enabled) {
    this.markEnabled = Boolean(enabled);
    this._syncMarkButton();
  }

  showMarker({ time } = {}) {
    if (this.status && Number.isFinite(time)) this.status.textContent = `Mistake marked at ${formatTime(time)} — redo that sentence`;
  }

  setMirror(mirror) {
    this.mirror = Boolean(mirror);
    if (this.video) this.video.style.transform = this.mirror ? 'scaleX(-1)' : 'none';
  }

  close() {
    this.generation += 1;
    this.pendingStream = null;
    const pipWindow = this.pipWindow;
    this._cleanup();
    try { pipWindow?.close(); } catch (_) { /* Closing an already closed PiP window is harmless. */ }
  }

  _buildWindow(pipWindow) {
    this.pipWindow = pipWindow;
    this._changed = true;
    const document = pipWindow.document;
    document.documentElement.lang = 'en';
    const style = document.createElement('style');
    style.textContent = `
      * { box-sizing: border-box; }
      body { margin: 0; min-height: 100vh; display: grid; grid-template-rows: 1fr auto; gap: 12px; padding: 14px; background: #161819; color: #d9dcdf; font: 13px -apple-system, BlinkMacSystemFont, sans-serif; }
      .camera { width: min(100%, 212px); aspect-ratio: 1; justify-self: center; border: 2px solid #fff; border-radius: 50%; overflow: hidden; background: #000; box-shadow: 0 8px 28px #0009; }
      video { width: 100%; height: 100%; object-fit: cover; transform: scaleX(-1); }
      .controls { display: grid; gap: 8px; text-align: center; }
      button { border: 0; border-radius: 8px; padding: 9px 12px; background: #e65d20; color: #161819; font: inherit; font-weight: 700; cursor: pointer; }
      button:disabled { opacity: .48; cursor: default; }
      .mark { background: #2b3036; color: #ffd1bb; border: 1px solid #e65d20; }
    `;
    document.head.appendChild(style);
    const camera = document.createElement('div');
    camera.className = 'camera';
    const video = document.createElement('video');
    video.muted = true;
    video.autoplay = true;
    video.playsInline = true;
    camera.appendChild(video);
    const controls = document.createElement('div');
    controls.className = 'controls';
    const status = document.createElement('div');
    status.textContent = 'Camera preview';
    const stop = document.createElement('button');
    stop.type = 'button';
    stop.textContent = 'Stop & save';
    stop.disabled = true;
    stop.addEventListener('click', () => {
      Promise.resolve(this.onStop()).catch((error) => this._reportError(error?.message || 'Unable to stop recording.'));
    });
    const mark = document.createElement('button');
    mark.type = 'button';
    mark.className = 'mark';
    mark.textContent = 'Mark mistake';
    mark.disabled = true;
    mark.addEventListener('click', () => {
      Promise.resolve(this.onMark()).catch((error) => this._reportError(error?.message || 'Unable to mark a mistake.'));
    });
    controls.append(status, mark, stop);
    document.body.append(camera, controls);
    pipWindow.addEventListener('pagehide', () => {
      if (this.pipWindow === pipWindow) this._cleanup();
    }, { once: true });
    this.video = video;
    this.status = status;
    this.stopButton = stop;
    this.markButton = mark;
    this.setMirror(this.mirror);
    this.setRecording(this.recording);
    this.onChange(true);
  }

  _setStream(stream, owned) {
    if (!this.video) {
      if (owned) stopTracks(stream);
      throw new Error('Floating camera preview is not open.');
    }
    if (this.ownedStream && this.ownedStream !== stream) stopTracks(this.ownedStream);
    this.ownedStream = owned ? stream : null;
    this.video.srcObject = stream;
    Promise.resolve(this.video.play?.()).catch((error) => {
      this._reportError(error?.message || 'Camera preview could not start.');
    });
  }

  _cleanup() {
    if (!this.pipWindow && !this.ownedStream) return;
    if (this.video) this.video.srcObject = null;
    stopTracks(this.ownedStream);
    this.ownedStream = null;
    this.video = null;
    this.status = null;
    this.stopButton = null;
    this.markButton = null;
    this.pipWindow = null;
    if (this._changed) {
      this._changed = false;
      this.onChange(false);
    }
  }

  _reportError(message) {
    try { this.onError(message); } catch (_) { /* Error reporting must not leak an exception. */ }
  }

  _syncMarkButton() {
    if (this.markButton) this.markButton.disabled = !this.recording || !this.markEnabled;
  }
}

function formatTime(seconds) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
}

function stopTracks(stream) {
  for (const track of stream?.getTracks?.() || []) {
    try { track.stop(); } catch (_) { /* Track may already be stopped. */ }
  }
}
