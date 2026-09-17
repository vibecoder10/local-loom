import assert from "node:assert/strict";
import test from "node:test";

const coreModuleUrl = new URL("../extension/recorder-core.js", import.meta.url);

function track(kind = "video") {
  const listeners = new Map();
  return {
    kind,
    stopped: false,
    addEventListener(name, callback) { listeners.set(name, callback); },
    stop() { this.stopped = true; },
    emit(name) { listeners.get(name)?.(); }
  };
}

function stream(...tracks) {
  return {
    getTracks: () => tracks,
    getVideoTracks: () => tracks.filter((item) => item.kind === "video"),
    getAudioTracks: () => tracks.filter((item) => item.kind === "audio")
  };
}

function installMediaMocks({ display, microphone, camera, displayError, microphoneError, cameraError, supportedTypes } = {}) {
  const recorders = [];
  const contexts = [];
  let displayCalls = 0;
  const userMediaCalls = [];
  class FakeRecorder {
    static isTypeSupported(type) { return supportedTypes?.includes(type) ?? true; }
    constructor(source, options = {}) { this.source = source; this.mimeType = options.mimeType ?? "video/webm"; this.state = "inactive"; recorders.push(this); }
    start() { this.state = "recording"; }
    stop() { if (this.state === "inactive") return; this.state = "inactive"; this.ondataavailable?.({ data: new Blob(["clip"], { type: this.mimeType }) }); this.onstop?.(); }
    pause() { this.state = "paused"; }
    resume() { this.state = "recording"; }
  }
  class FakeAudioContext {
    constructor() { this.closed = false; this.state = "suspended"; this.resumeCalled = 0; contexts.push(this); }
    createMediaStreamDestination() { return { stream: stream(track("audio")) }; }
    createMediaStreamSource() { return { connect() {} }; }
    resume() { this.resumeCalled += 1; this.state = "running"; return Promise.resolve(); }
    close() { this.closed = true; return Promise.resolve(); }
  }
  globalThis.MediaRecorder = FakeRecorder;
  globalThis.AudioContext = FakeAudioContext;
  globalThis.MediaStream = class {
    constructor(items) { this.items = [...items]; }
    getTracks() { return this.items; }
    getAudioTracks() { return this.items.filter((item) => item.kind === "audio"); }
    addTrack(item) { this.items.push(item); }
  };
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: {
    getDisplayMedia: async () => { displayCalls += 1; if (displayError) throw displayError; return display; },
    getUserMedia: async (constraints) => {
      userMediaCalls.push(constraints);
      if (constraints.video) { if (cameraError) throw cameraError; return camera; }
      if (microphoneError) throw microphoneError;
      return microphone;
    }
  } } });
  return { recorders, contexts, userMediaCalls, get displayCalls() { return displayCalls; } };
}

async function controller(options = {}) {
  const { RecorderController } = await import(`${coreModuleUrl.href}?case=${Math.random()}`);
  const events = { states: [], result: [], errors: [], warnings: [] };
  return {
    events,
    instance: new RecorderController({
      onState: (value) => events.states.push(value),
      onTime() {},
      onResult: (value) => events.result.push(value),
      onError: (value) => events.errors.push(value),
      onWarning: (value) => events.warnings.push(value),
      ...options
    })
  };
}

test("capture cancellation returns to idle without allocating microphone", async () => {
  const mic = track("audio");
  installMediaMocks({ displayError: new DOMException("cancelled", "NotAllowedError"), microphone: stream(mic) });
  const { instance, events } = await controller();

  await assert.rejects(instance.start({ microphone: true, sharedAudio: false }));
  assert.deepEqual(events.states, ["acquiring", "idle"]);
  assert.equal(mic.stopped, false);
});

test("microphone denial releases display capture and returns to idle", async () => {
  const video = track();
  installMediaMocks({ display: stream(video), microphoneError: new DOMException("denied", "NotAllowedError") });
  const { instance, events } = await controller();

  await assert.rejects(instance.start({ microphone: true, sharedAudio: false }));
  assert.equal(video.stopped, true);
  assert.ok(events.errors.length > 0);
});

test("ended display video stops once and releases all capture tracks", async () => {
  const video = track();
  const audio = track("audio");
  const { recorders, contexts } = installMediaMocks({ display: stream(video, audio) });
  const { instance, events } = await controller();

  await instance.start({ microphone: false, sharedAudio: true });
  video.emit("ended");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(recorders[0].state, "inactive");
  assert.equal(video.stopped, true);
  assert.equal(audio.stopped, true);
  assert.equal(contexts[0].closed, true);
  assert.equal(events.result.length, 1);
});

test("double stop is safe and yields one result", async () => {
  const video = track();
  installMediaMocks({ display: stream(video) });
  const { instance, events } = await controller();

  await instance.start({ microphone: false, sharedAudio: false });
  await Promise.all([instance.stop(), instance.stop()]);
  assert.equal(events.result.length, 1);
  assert.equal(video.stopped, true);
});

test("dispose cleans recorder resources during an active capture", async () => {
  const video = track();
  const capturedAudio = track("audio");
  const { contexts } = installMediaMocks({ display: stream(video, capturedAudio) });
  const { instance } = await controller();

  await instance.start({ microphone: false, sharedAudio: true });
  await instance.dispose();
  assert.equal(video.stopped, true);
  assert.equal(contexts[0].closed, true);
});

test("stop during picker acquisition releases a late display stream", async () => {
  let provideDisplay;
  const lateDisplay = new Promise((resolve) => { provideDisplay = resolve; });
  const video = track();
  installMediaMocks({ display: lateDisplay });
  const { instance } = await controller();

  const starting = instance.start({ microphone: false, sharedAudio: false });
  const stopping = instance.stop();
  provideDisplay(stream(video));
  await assert.rejects(starting, /cancelled/i);
  await stopping;
  assert.equal(video.stopped, true);
  assert.equal(instance.state, "idle");
});

test("a suspended audio context resumes before recording begins", async () => {
  const video = track();
  const capturedAudio = track("audio");
  const { contexts, recorders } = installMediaMocks({ display: stream(video, capturedAudio) });
  const { instance } = await controller();

  await instance.start({ microphone: false, sharedAudio: true });
  assert.equal(contexts[0].resumeCalled, 1);
  assert.equal(recorders[0].state, "recording");
  await instance.stop();
});

test("requested MP4 uses the supported MP4 MIME type and filename suffix", async () => {
  const video = track();
  const { recorders } = installMediaMocks({
    display: stream(video),
    supportedTypes: ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/webm"],
  });
  const { instance, events } = await controller();

  await instance.start({ microphone: false, sharedAudio: false, format: "mp4" });
  assert.equal(recorders[0].mimeType, "video/mp4;codecs=avc1.42E01E,mp4a.40.2");
  await instance.stop();
  assert.equal(events.result[0].mimeType, "video/mp4;codecs=avc1.42E01E,mp4a.40.2");
  assert.match(events.result[0].filename, /\.mp4$/);
});

test("unsupported requested MP4 fails before opening the capture picker", async () => {
  const media = installMediaMocks({
    display: stream(track()),
    supportedTypes: ["video/webm;codecs=vp8,opus", "video/webm"],
  });
  const { instance, events } = await controller();

  await assert.rejects(
    instance.start({ microphone: false, sharedAudio: false, format: "mp4" }),
    /mp4.*support|support.*mp4/i,
  );
  assert.equal(media.displayCalls, 0);
  assert.ok(events.errors.length > 0);
});

test("camera uses one combined video and microphone request, compositor output, and preview lifecycle", async () => {
  const displayVideo = track();
  const cameraVideo = track();
  const cameraMic = track("audio");
  const composedVideo = track();
  const media = installMediaMocks({ display: stream(displayVideo), camera: stream(cameraVideo, cameraMic) });
  const compositor = {
    started: null,
    stopped: 0,
    start(displayStream, cameraStream, layout) {
      this.started = { displayStream, cameraStream, layout };
      return Promise.resolve(stream(composedVideo));
    },
    updateLayout(layout) { return layout; },
    stop() { this.stopped += 1; },
  };
  const previews = [];
  const { instance } = await controller({ onPreview: (value) => previews.push(value), compositorFactory: () => compositor });

  await instance.start({ microphone: true, sharedAudio: false, camera: true, cameraLayout: { shape: "square" } });
  assert.deepEqual(media.userMediaCalls, [{
    video: { width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } },
    audio: true,
  }]);
  assert.equal(compositor.started.displayStream.getVideoTracks()[0], displayVideo);
  assert.equal(compositor.started.cameraStream.getVideoTracks()[0], cameraVideo);
  assert.equal(media.recorders[0].source.getTracks()[0], composedVideo);
  assert.ok(previews.some(Boolean));
  await instance.stop();
  assert.equal(compositor.stopped, 1);
  assert.equal(cameraVideo.stopped, true);
  assert.equal(cameraMic.stopped, true);
  assert.equal(previews.at(-1), null);
});

test("camera denial aborts and releases display capture with disable-camera guidance", async () => {
  const displayVideo = track();
  installMediaMocks({
    display: stream(displayVideo),
    cameraError: new DOMException("denied", "NotAllowedError"),
  });
  const { instance, events } = await controller();

  await assert.rejects(instance.start({ camera: true }), /denied/i);
  assert.equal(displayVideo.stopped, true);
  assert.match(events.errors.at(-1), /camera.*disable|disable.*camera/i);
});

test("camera-off preserves the existing path without creating a compositor", async () => {
  const displayVideo = track();
  installMediaMocks({ display: stream(displayVideo) });
  let compositorCreated = 0;
  const { instance } = await controller({ compositorFactory: () => { compositorCreated += 1; throw new Error("unexpected"); } });

  await instance.start({ camera: false, microphone: false, sharedAudio: false });
  assert.equal(compositorCreated, 0);
  await instance.stop();
  assert.equal(displayVideo.stopped, true);
});

test("compositor startup failure releases display and camera streams", async () => {
  const displayVideo = track();
  const cameraVideo = track();
  installMediaMocks({ display: stream(displayVideo), camera: stream(cameraVideo) });
  const { instance, events } = await controller({
    compositorFactory: () => ({ start: async () => { throw new Error("compositor startup failed"); }, stop() {} }),
  });

  await assert.rejects(instance.start({ camera: true }), /compositor startup failed/);
  assert.equal(displayVideo.stopped, true);
  assert.equal(cameraVideo.stopped, true);
  assert.match(events.errors.at(-1), /compositor startup failed/);
});

test("ended camera stops the recording and releases compositor and input tracks", async () => {
  const displayVideo = track();
  const cameraVideo = track();
  const composedVideo = track();
  const media = installMediaMocks({ display: stream(displayVideo), camera: stream(cameraVideo) });
  const compositor = { start: async () => stream(composedVideo), updateLayout: (layout) => layout, stopped: 0, stop() { this.stopped += 1; } };
  const { instance, events } = await controller({ compositorFactory: () => compositor });

  await instance.start({ camera: true });
  cameraVideo.emit("ended");
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(media.recorders[0].state, "inactive");
  assert.equal(displayVideo.stopped, true);
  assert.equal(cameraVideo.stopped, true);
  assert.equal(compositor.stopped, 1);
  assert.match(events.warnings.at(-1), /camera ended/i);
});

test("late camera acquisition after cancellation is released without starting a compositor", async () => {
  let provideCamera;
  const lateCamera = new Promise((resolve) => { provideCamera = resolve; });
  const displayVideo = track();
  const cameraVideo = track();
  installMediaMocks({ display: stream(displayVideo), camera: lateCamera });
  let compositorCreated = 0;
  const { instance } = await controller({ compositorFactory: () => { compositorCreated += 1; return {}; } });

  const starting = instance.start({ camera: true });
  await new Promise((resolve) => setTimeout(resolve, 0));
  const stopping = instance.stop();
  provideCamera(stream(cameraVideo));
  await assert.rejects(starting, /cancelled/i);
  await stopping;
  assert.equal(displayVideo.stopped, true);
  assert.equal(cameraVideo.stopped, true);
  assert.equal(compositorCreated, 0);
});

test("setCameraLayout updates the active compositor and returns the normalized layout", async () => {
  const displayVideo = track();
  const cameraVideo = track();
  const composedVideo = track();
  installMediaMocks({ display: stream(displayVideo), camera: stream(cameraVideo) });
  const updates = [];
  const compositor = { start: async () => stream(composedVideo), updateLayout: (layout) => { updates.push(layout); return layout; }, stop() {} };
  const { instance } = await controller({ compositorFactory: () => compositor });

  await instance.start({ camera: true });
  const layout = instance.setCameraLayout({ x: 2, size: 0 });
  assert.equal(layout.x, 1);
  assert.equal(layout.size, 0.12);
  assert.deepEqual(updates, [layout]);
  await instance.stop();
});

test('extension prepares camera before picker and cleans it if picker is cancelled', async () => {
  const cam = track('video');
  const mocks = installMediaMocks({ camera: stream(cam) });
  const { instance } = await controller({ prepareDevicesFirst: true, captureDisplay: async () => {
    assert.equal(mocks.userMediaCalls.length, 1);
    throw new DOMException('Source selection cancelled', 'AbortError');
  } });
  await assert.rejects(instance.start({ camera: true }), /Source selection cancelled/);
  assert.equal(cam.stopped, true);
});

test('extension camera permission denial occurs before source picker', async () => {
  const mocks = installMediaMocks({ cameraError: new DOMException('denied', 'NotAllowedError') });
  const { instance } = await controller({ prepareDevicesFirst: true });
  await assert.rejects(instance.start({ camera: true }), /Camera access was denied/);
  assert.equal(mocks.displayCalls, 0);
});

test('mistake markers use active time, reject paused or idle states, debounce, and reset', async () => {
  const originalNow = Date.now;
  let now = 1_000;
  Date.now = () => now;
  try {
    const video = track();
    installMediaMocks({ display: stream(video) });
    const markerEvents = [];
    const { instance, events } = await controller({ onMarker: (marker) => markerEvents.push(marker) });
    assert.throws(() => instance.markMistake(), /only be marked while recording/i);
    await instance.start({ camera: false, microphone: false, sharedAudio: false });
    now = 3_000;
    assert.deepEqual(instance.markMistake(), { time: 2, count: 1 });
    instance.pause();
    now = 5_000;
    assert.throws(() => instance.markMistake(), /only be marked while recording/i);
    instance.resume();
    now = 6_000;
    assert.deepEqual(instance.markMistake(), { time: 3, count: 2 });
    now = 6_100;
    assert.deepEqual(instance.markMistake(), { time: 3, count: 2 });
    assert.deepEqual(markerEvents, [{ time: 2, count: 1 }, { time: 3, count: 2 }]);
    await instance.stop();
    assert.deepEqual(events.result[0].markers, [{ time: 2 }, { time: 3 }]);
    now = 7_000;
    await instance.start({ camera: false, microphone: false, sharedAudio: false });
    assert.equal(instance.markers.length, 0);
    await instance.stop();
  } finally {
    Date.now = originalNow;
  }
});
