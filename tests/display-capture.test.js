import assert from 'node:assert/strict';
import test from 'node:test';

const moduleUrl = new URL('../extension/display-capture.js', import.meta.url);

async function loadAdapter() {
  return import(`${moduleUrl.href}?case=${Math.random()}`);
}

function installChrome({ chooser } = {}) {
  const calls = { sources: null, cancelled: [] };
  globalThis.chrome = {
    runtime: {},
    desktopCapture: {
      chooseDesktopMedia(sources, callback) {
        calls.sources = sources;
        chooser(callback);
        return 41;
      },
      cancelChooseDesktopMedia(id) { calls.cancelled.push(id); },
    },
  };
  return calls;
}

test('consumes a selected desktop stream id immediately without audio when unavailable', async () => {
  const calls = installChrome({ chooser: (callback) => callback('stream-1', { canRequestAudioTrack: false }) });
  const seen = [];
  const stream = { getTracks: () => [] };
  const { chooseDisplayMedia } = await loadAdapter();

  const result = await chooseDisplayMedia({ audio: true }, {
    mediaDevices: { getUserMedia: async (constraints) => { seen.push(constraints); return stream; } },
  });

  assert.equal(result, stream);
  assert.deepEqual(calls.sources, ['screen', 'window', 'tab', 'audio']);
  assert.equal(seen[0].video.mandatory.chromeMediaSourceId, 'stream-1');
  assert.equal(seen[0].audio, false);
});

test('requests desktop audio only when the chooser permits it', async () => {
  installChrome({ chooser: (callback) => callback('stream-2', { canRequestAudioTrack: true }) });
  const { chooseDisplayMedia } = await loadAdapter();
  let constraints;

  await chooseDisplayMedia({ audio: true }, {
    mediaDevices: { getUserMedia: async (value) => { constraints = value; return { getTracks: () => [] }; } },
  });

  assert.equal(constraints.audio.mandatory.chromeMediaSource, 'desktop');
  assert.equal(constraints.audio.mandatory.chromeMediaSourceId, 'stream-2');
});

test('selection cancellation rejects with AbortError and does not request media', async () => {
  installChrome({ chooser: (callback) => callback('', {}) });
  const { chooseDisplayMedia } = await loadAdapter();
  let requested = false;

  await assert.rejects(
    chooseDisplayMedia({}, { mediaDevices: { getUserMedia: async () => { requested = true; } } }),
    (error) => error.name === 'AbortError',
  );
  assert.equal(requested, false);
});

test('explicit cancellation dismisses the active chooser and rejects before late selection', async () => {
  let callback;
  const calls = installChrome({ chooser: (value) => { callback = value; } });
  const { chooseDisplayMedia, cancelDisplayChoice } = await loadAdapter();
  let requested = false;
  const pending = chooseDisplayMedia({}, { mediaDevices: { getUserMedia: async () => { requested = true; return { getTracks: () => [] }; } } });

  assert.equal(cancelDisplayChoice(), true);
  callback('late-stream', { canRequestAudioTrack: true });
  await assert.rejects(pending, (error) => error.name === 'AbortError');
  assert.equal(requested, false);
  assert.deepEqual(calls.cancelled, [41]);
});

test('cancellation disposes a stream that resolves after chooser selection', async () => {
  installChrome({ chooser: (callback) => callback('stream-3', {}) });
  const { chooseDisplayMedia, cancelDisplayChoice } = await loadAdapter();
  let provideStream;
  const lateTrack = { stopped: false, stop() { this.stopped = true; } };
  const lateStream = { getTracks: () => [lateTrack] };
  const pending = chooseDisplayMedia({}, {
    mediaDevices: { getUserMedia: () => new Promise((resolve) => { provideStream = resolve; }) },
  });
  await Promise.resolve();
  assert.equal(cancelDisplayChoice(), true);
  provideStream(lateStream);
  await assert.rejects(pending, (error) => error.name === 'AbortError');
  assert.equal(lateTrack.stopped, true);
});

test('Chrome runtime errors are surfaced without requesting media', async () => {
  const calls = installChrome({ chooser: (callback) => {
    globalThis.chrome.runtime.lastError = { message: 'chooser failed' };
    callback(undefined, {});
    delete globalThis.chrome.runtime.lastError;
  } });
  const { chooseDisplayMedia } = await loadAdapter();
  await assert.rejects(
    chooseDisplayMedia({}, { mediaDevices: { getUserMedia: async () => { throw new Error('should not run'); } } }),
    /chooser failed/,
  );
  assert.deepEqual(calls.sources, ['screen', 'window', 'tab']);
});
