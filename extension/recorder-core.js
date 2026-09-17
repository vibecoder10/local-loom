/**
 * Browser-recording lifecycle with no UI or Chrome-extension dependencies.
 * The default getDisplayMedia adapter requires a user gesture. The extension
 * injects its desktopCapture adapter and prepares devices before source selection.
 */
import { CameraCompositor, normalizeLayout } from './camera-compositor.js';

export class RecorderController {
  constructor({ onState, onTime, onResult, onError, onWarning, onPreview, onMarker, compositorFactory, captureDisplay, cancelCapture, prepareDevicesFirst = false } = {}) {
    this.onState = typeof onState === 'function' ? onState : () => {};
    this.onTime = typeof onTime === 'function' ? onTime : () => {};
    this.onResult = typeof onResult === 'function' ? onResult : () => {};
    this.onError = typeof onError === 'function' ? onError : () => {};
    this.onWarning = typeof onWarning === 'function' ? onWarning : () => {};
    this.onPreview = typeof onPreview === 'function' ? onPreview : () => {};
    this.onMarker = typeof onMarker === 'function' ? onMarker : () => {};
    this.compositorFactory = typeof compositorFactory === 'function'
      ? compositorFactory
      : (options) => new CameraCompositor(options);

    this.captureDisplay = captureDisplay || ((options) => navigator.mediaDevices.getDisplayMedia(options));
    this.cancelCapture = cancelCapture || (() => {});
    this.prepareDevicesFirst = prepareDevicesFirst;
    this.state = 'idle';
    this.displayStream = null;
    this.microphoneStream = null;
    this.cameraStream = null;
    this.cameraCompositor = null;
    this.cameraLayout = normalizeLayout({});
    this.audioContext = null;
    this.audioDestination = null;
    this.mediaRecorder = null;
    this.chunks = [];
    this.markers = [];
    this.lastMarkerTime = null;
    this.mimeType = '';
    this.timerId = null;
    this.startedAt = 0;
    this.pausedAt = 0;
    this.pausedDuration = 0;
    this.stopPromise = null;
    this.finalized = false;
    this.cancelled = false;
    this.disposed = false;
    this._displayEndedHandler = null;
    this._cameraEndedHandler = null;
    this._session = null;
  }

  async start({ microphone = false, sharedAudio = false, format = 'webm', camera = false, cameraLayout = {} } = {}) {
    if (this.disposed) throw new Error('Recorder has been disposed.');
    if (this.state !== 'idle' && this.state !== 'ready') {
      throw new Error(`Cannot start while recorder is ${this.state}.`);
    }
    let selectedMimeType;
    try {
      // Validate before requesting capture, so an unavailable format never
      // opens the picker and cannot produce a misleading file extension.
      selectedMimeType = chooseMimeType(format);
    } catch (error) {
      const message = readableError(error, 'The requested recording format is unsupported.');
      this.onError(message);
      throw error instanceof Error ? error : new Error(message);
    }

    this._resetSession();
    this.cameraLayout = normalizeLayout(cameraLayout);
    const session = { cancelled: false, phase: 'screen selection', cause: '' };
    this._session = session;
    this._setState('acquiring');

    const acquireDevices = async () => {
      if (camera) {
        session.phase = 'camera and microphone permission';
        this.cameraStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
          audio: Boolean(microphone),
        });
        if (!this._isCurrent(session) || session.cancelled || this.disposed || this.state !== 'acquiring') {
          throw new Error(session.cause || 'Recording setup was cancelled. Click Start recording to try again.');
        }
        const cameraVideoTrack = this.cameraStream.getVideoTracks()[0];
        if (!cameraVideoTrack) throw new Error('Camera access did not provide a video track. Disable camera and try again.');
        this.microphoneStream = microphone ? this.cameraStream : null;
        this._cameraEndedHandler = () => {
          if (!this._isCurrent(session)) return;
          this.onWarning('Camera ended; recording stopped.');
          if (this.state === 'recording' || this.state === 'paused' || this.state === 'acquiring') void this.stop();
        };
        cameraVideoTrack.addEventListener('ended', this._cameraEndedHandler, { once: true });
      } else if (microphone) {
        session.phase = 'microphone permission';
        this.microphoneStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (this.microphoneStream.getAudioTracks().length === 0) {
          this.onWarning('Microphone access did not provide an audio track.');
        }
      }
      if (!this._isCurrent(session) || session.cancelled || this.disposed) throw new Error(session.cause || 'Recording setup was cancelled.');
    };
    try {
      // Extension capture can prepare devices before its chooser; the default
      // getDisplayMedia path still requests the chooser directly from a click.
      if (this.prepareDevicesFirst) await acquireDevices();
      session.phase = 'screen selection';
      const displayPromise = this.captureDisplay({
        video: true,
        audio: Boolean(sharedAudio),
      });
      this.displayStream = await displayPromise;

      if (!this._isCurrent(session) || session.cancelled || this.disposed) {
        throw new Error(session.cause || 'Screen selection was cancelled. Click Start recording to choose a source.');
      }

      const videoTrack = this.displayStream.getVideoTracks()[0];
      if (!videoTrack) throw new Error('The selected source did not provide a video track.');
      this._displayEndedHandler = () => {
        if (!this._isCurrent(session)) return;
        session.cause ||= 'Screen sharing ended before setup finished. Select the source again and keep sharing enabled while camera permission opens.';
        this.cancelled = true;
        session.cancelled = true;
        if (this.state === 'recording' || this.state === 'paused' || this.state === 'acquiring') {
          void this.stop();
        }
      };
      videoTrack.addEventListener('ended', this._displayEndedHandler, { once: true });

      if (sharedAudio && this.displayStream.getAudioTracks().length === 0) {
        this.onWarning('The selected source did not provide shared audio.');
      }

      if (!this.prepareDevicesFirst) await acquireDevices();
      if (!this._isCurrent(session) || session.cancelled || this.disposed || this.state !== 'acquiring') {
        throw new Error(session.cause || 'The selected screen stopped sharing during setup. Select it again and keep sharing enabled.');
      }
      if (videoTrack.readyState === 'ended') {
        throw new Error(session.cause || 'The selected screen stopped sharing during setup. Select it again and keep sharing enabled.');
      }

      let recordingVideoTrack = videoTrack;
      if (camera) {
        session.phase = 'camera overlay setup';
        this.cameraCompositor = this.compositorFactory({
          onError: (message) => this._handleCompositorError(message, session),
        });
        const compositedStream = await this.cameraCompositor.start(this.displayStream, this.cameraStream, this.cameraLayout);
        if (!this._isCurrent(session) || session.cancelled || this.disposed || this.state !== 'acquiring') {
          throw new Error(session.cause || 'Recording setup was cancelled. Click Start recording to try again.');
        }
        recordingVideoTrack = compositedStream?.getVideoTracks?.()[0];
        if (!recordingVideoTrack) throw new Error('Camera compositor did not provide a video track. Disable camera and try again.');
      }
      session.phase = 'video recorder setup';
      const recordingStream = this._createRecordingStream(recordingVideoTrack);
      if (this.audioContext?.state === 'suspended' && this.audioContext.resume) {
        await this.audioContext.resume();
      }
      if (!this._isCurrent(session) || session.cancelled || this.disposed || videoTrack.readyState === 'ended') {
        throw new Error(session.cause || 'The selected screen stopped sharing during setup. Select it again and keep sharing enabled.');
      }
      this.mimeType = selectedMimeType;
      this.mediaRecorder = new MediaRecorder(recordingStream, { mimeType: this.mimeType });
      this.mimeType = this.mediaRecorder.mimeType || this.mimeType;
      this._wireRecorder(session);
      this.onPreview(recordingStream);

      this.startedAt = Date.now();
      this.mediaRecorder.start(1000);
      this._setState('recording');
      this._startTimer();
    } catch (error) {
      const message = session.cause || (error?.name === 'NotAllowedError'
        ? (session.phase.includes('camera') ? 'Camera access was denied. Disable camera and try again, or grant camera permission.' : `Permission was denied during ${session.phase}. Allow access in Chrome and macOS settings, then retry.`)
        : readableError(error, `Unable to start during ${session.phase}.`));
      if (this._isCurrent(session)) {
        this.finalized = true;
        this._stopRecorderSilently();
        this._cleanupResources();
        this._setState('idle');
        this._resolvePendingStop();
        this.onError(message);
      }
      throw new Error(message, { cause: error });
    }
  }

  stop() {
    if (this.stopPromise) return this.stopPromise;
    if (this.state === 'idle' || this.state === 'ready') return Promise.resolve();

    const wasAcquiring = this.state === 'acquiring';
    const session = this._session;
    if (session) {
      session.cancelled = true;
      this.cancelled = true;
    }
    this._setState('stopping');
    this._stopTimer();
    // Acquisition must settle before cleanup: getDisplayMedia/getUserMedia can
    // resolve after Stop, and their late tracks still need to be released.
    if (wasAcquiring || !this.mediaRecorder) {
      this.cancelCapture();
      this.stopPromise = new Promise((resolve) => { this._resolveStop = resolve; });
      return this.stopPromise;
    }
    const recorder = this.mediaRecorder;
    this.stopPromise = new Promise((resolve) => {
      this._resolveStop = resolve;
      if (!recorder || recorder.state === 'inactive') {
        this._finalize(session);
        return;
      }
      try {
        recorder.stop();
      } catch (error) {
        this.onError(readableError(error, 'Unable to stop recording.'));
        this._finalize(session);
      }
    });
    return this.stopPromise;
  }

  pause() {
    if (this.state !== 'recording' || !this.mediaRecorder) return;
    try {
      this.mediaRecorder.pause();
      this.pausedAt = Date.now();
      this._stopTimer();
      this._setState('paused');
    } catch (error) {
      this.onError(readableError(error, 'Unable to pause recording.'));
    }
  }

  resume() {
    if (this.state !== 'paused' || !this.mediaRecorder) return;
    try {
      this.mediaRecorder.resume();
      if (this.pausedAt) this.pausedDuration += Date.now() - this.pausedAt;
      this.pausedAt = 0;
      this._setState('recording');
      this._startTimer();
    } catch (error) {
      this.onError(readableError(error, 'Unable to resume recording.'));
    }
  }

  markMistake() {
    if (this.state !== 'recording') throw new Error('Mistakes can only be marked while recording.');
    const time = this._elapsedTime() / 1000;
    if (this.markers.length >= 500) throw new Error('This recording already has 500 mistake markers.');
    if (this.lastMarkerTime !== null && time - this.lastMarkerTime < 0.25) {
      return { time: this.lastMarkerTime, count: this.markers.length };
    }
    this.markers.push({ time });
    this.lastMarkerTime = time;
    const marker = { time, count: this.markers.length };
    this.onMarker(marker);
    return marker;
  }

  setCameraLayout(partial = {}) {
    this.cameraLayout = normalizeLayout({ ...this.cameraLayout, ...partial });
    if (this.cameraCompositor) {
      this.cameraLayout = this.cameraCompositor.updateLayout(this.cameraLayout);
    }
    return this.cameraLayout;
  }

  async dispose() {
    this.disposed = true;
    await this.stop();
    this._cleanupResources();
    this._setState('idle');
  }

  _createRecordingStream(videoTrack) {
    const stream = new MediaStream([videoTrack]);
    const capturedAudio = this.displayStream.getAudioTracks();
    const microphoneAudio = this.microphoneStream?.getAudioTracks() ?? [];
    if (capturedAudio.length === 0 && microphoneAudio.length === 0) return stream;

    const AudioContextClass = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!AudioContextClass) {
      this.onWarning('Audio mixing is unavailable in this browser; recording video without audio.');
      return stream;
    }
    this.audioContext = new AudioContextClass();
    this.audioDestination = this.audioContext.createMediaStreamDestination();
    if (capturedAudio.length) {
      this.audioContext.createMediaStreamSource(new MediaStream(capturedAudio)).connect(this.audioDestination);
    }
    if (microphoneAudio.length) {
      this.audioContext.createMediaStreamSource(new MediaStream(microphoneAudio)).connect(this.audioDestination);
    }
    for (const track of this.audioDestination.stream.getAudioTracks()) stream.addTrack(track);
    return stream;
  }

  _wireRecorder(session) {
    this.mediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) this.chunks.push(event.data);
    };
    this.mediaRecorder.onerror = (event) => {
      const error = event.error || event;
      this.onError(readableError(error, 'Recording failed.'));
      if (this._isCurrent(session) && this.state !== 'stopping') void this.stop();
    };
    this.mediaRecorder.onstop = () => this._finalize(session);
  }

  _finalize(session = this._session) {
    if (!this._isCurrent(session) || this.finalized) return;
    this.finalized = true;
    this._stopTimer();
    const durationMs = this._elapsedTime();
    const hasData = this.chunks.length > 0;
    const blob = hasData ? new Blob(this.chunks, { type: this.mimeType }) : null;
    this._cleanupResources();
    this._setState('ready');
    if (blob) {
      this.onResult({
        blob,
        mimeType: this.mimeType,
        filename: `local-loom-${timestampForFilename()}.${filenameExtension(this.mimeType)}`,
        durationMs,
        markers: this.markers.map(({ time }) => ({ time })),
      });
    } else {
      this.onWarning('Recording ended before any video data was captured.');
    }
    this._resolvePendingStop();
  }

  _resetSession() {
    this._stopTimer();
    this._cleanupResources();
    this.chunks = [];
    this.markers = [];
    this.lastMarkerTime = null;
    this.mimeType = '';
    this.startedAt = 0;
    this.pausedAt = 0;
    this.pausedDuration = 0;
    this.stopPromise = null;
    this._resolveStop = null;
    this.finalized = false;
    this.cancelled = false;
    this._session = null;
  }

  _cleanupResources() {
    this._stopTimer();
    const videoTrack = this.displayStream?.getVideoTracks?.()[0];
    if (videoTrack && this._displayEndedHandler) {
      videoTrack.removeEventListener?.('ended', this._displayEndedHandler);
    }
    this._displayEndedHandler = null;
    const cameraTrack = this.cameraStream?.getVideoTracks?.()[0];
    if (cameraTrack && this._cameraEndedHandler) {
      cameraTrack.removeEventListener?.('ended', this._cameraEndedHandler);
    }
    this._cameraEndedHandler = null;
    if (this.cameraCompositor) {
      const compositor = this.cameraCompositor;
      this.cameraCompositor = null;
      try { compositor.stop(); } catch (_) { /* Best-effort cleanup. */ }
    }
    stopTracks(this.displayStream);
    if (this.microphoneStream !== this.cameraStream) stopTracks(this.microphoneStream);
    stopTracks(this.cameraStream);
    this.displayStream = null;
    this.microphoneStream = null;
    this.cameraStream = null;
    stopTracks(this.audioDestination?.stream);
    this.audioDestination = null;
    if (this.audioContext) {
      const context = this.audioContext;
      this.audioContext = null;
      Promise.resolve(context.close?.()).catch(() => {});
    }
    this.mediaRecorder = null;
    this.onPreview(null);
  }

  _stopRecorderSilently() {
    try {
      if (this.mediaRecorder?.state !== 'inactive') this.mediaRecorder.stop();
    } catch (_) {
      // The failure path will release all media resources below.
    }
  }

  _elapsedTime() {
    if (!this.startedAt) return 0;
    const end = this.pausedAt || Date.now();
    return Math.max(0, end - this.startedAt - this.pausedDuration);
  }

  _startTimer() {
    this._stopTimer();
    this.onTime(this._elapsedTime());
    this.timerId = setInterval(() => this.onTime(this._elapsedTime()), 250);
  }

  _stopTimer() {
    if (this.timerId !== null) clearInterval(this.timerId);
    this.timerId = null;
  }

  _setState(state) {
    this.state = state;
    this.onState(state);
  }

  _isCurrent(session) {
    return this._session === session;
  }

  _resolvePendingStop() {
    const resolve = this._resolveStop;
    this._resolveStop = null;
    if (resolve) resolve();
  }

  _handleCompositorError(message, session) {
    if (!this._isCurrent(session)) return;
    session.cause = message || 'Camera compositor failed; recording stopped.';
    this.onError(session.cause);
    if (this.state === 'recording' || this.state === 'paused' || this.state === 'acquiring') void this.stop();
  }
}

function chooseMimeType(format) {
  const candidates = MIME_CANDIDATES[format];
  if (!candidates) {
    throw new Error(`Unsupported recording format "${format}". Choose WebM or MP4.`);
  }
  if (typeof MediaRecorder === 'undefined' || typeof MediaRecorder.isTypeSupported !== 'function') {
    throw new Error(`${formatLabel(format)} recording is not supported by this browser.`);
  }
  const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
  if (!mimeType) throw new Error(`${formatLabel(format)} recording is not supported by this browser.`);
  return mimeType;
}

const MIME_CANDIDATES = {
  webm: [
    'video/webm;codecs=vp8,opus',
    'video/webm;codecs=vp9,opus',
    'video/webm',
  ],
  mp4: [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
  ],
};

function filenameExtension(mimeType) {
  return mimeType.toLowerCase().startsWith('video/mp4') ? 'mp4' : 'webm';
}

function formatLabel(format) {
  return format === 'mp4' ? 'MP4' : 'WebM';
}

function stopTracks(stream) {
  for (const track of stream?.getTracks?.() ?? []) {
    try { track.stop(); } catch (_) { /* Track may already have ended. */ }
  }
}

function readableError(error, fallback) {
  if (error?.name === 'NotAllowedError') return 'Screen or microphone permission was denied.';
  if (error?.name === 'NotFoundError') return 'No compatible capture source or microphone was found.';
  return error?.message || fallback;
}

function timestampForFilename() {
  return new Date().toISOString().replace(/[:.]/g, '-');
}
