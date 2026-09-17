import assert from 'node:assert/strict';
import test from 'node:test';

async function loadWorker({ contexts = [], createResult = { id: 9 }, contextError, recorderResponses = [], waitForContexts } = {}) {
  const calls = { getContexts: [], update: [], windowUpdate: [], create: [], actionListener: null, commandListener: null, messageListener: null, recorderMessages: [] };
  const responses = [...recorderResponses];
  globalThis.chrome = {
    runtime: {
      id: 'local', getURL: (path) => `chrome-extension://local/${path}`,
      getContexts: async (query) => { calls.getContexts.push(query); if (waitForContexts) await waitForContexts; if (contextError) throw contextError; return contexts; },
      sendMessage: async (message) => {
        calls.recorderMessages.push(message);
        const response = responses.length ? responses.shift() : { ok: true, state: 'idle' };
        if (response instanceof Error) throw response;
        return response;
      },
      onMessage: { addListener: (listener) => { calls.messageListener = listener; } },
    },
    tabs: { update: async (...args) => calls.update.push(args), create: async (options) => { calls.create.push(options); return createResult; } },
    windows: { update: async (...args) => calls.windowUpdate.push(args) },
    action: { onClicked: { addListener: (listener) => { calls.actionListener = listener; } } },
    commands: { onCommand: { addListener: (listener) => { calls.commandListener = listener; } } },
  };
  const worker = await import(`../extension/service-worker.js?case=${Math.random()}`);
  return { worker, calls };
}

test('action creates the recorder tab when none exists', async () => {
  const { worker, calls } = await loadWorker();
  assert.deepEqual(await worker.openOrFocusRecorder(), { id: 9 });
  assert.deepEqual(calls.getContexts, [{ contextTypes: ['TAB'], documentUrls: ['chrome-extension://local/recorder.html'] }]);
  assert.deepEqual(calls.create, [{ url: 'chrome-extension://local/recorder.html', active: true }]);
});
test('action focuses and activates the singleton recorder tab', async () => {
  const recorder = { tabId: 4, windowId: 12 };
  const { worker, calls } = await loadWorker({ contexts: [recorder] });
  assert.equal(await worker.openOrFocusRecorder(), recorder);
  assert.deepEqual(calls.windowUpdate, [[12, { focused: true }]]);
  assert.deepEqual(calls.update, [[4, { active: true }]]);
  assert.equal(calls.create.length, 0);
});
test('toolbar listener absorbs launcher failures', async () => {
  const { calls } = await loadWorker({ contextError: new Error('contexts unavailable') });
  const originalError = console.error; console.error = () => {};
  try { calls.actionListener(); await new Promise((resolve) => setTimeout(resolve, 0)); } finally { console.error = originalError; }
});
test('rapid action clicks share one launch operation', async () => {
  let release;
  const waitForContexts = new Promise((resolve) => { release = resolve; });
  const { worker, calls } = await loadWorker({ waitForContexts });
  const first = worker.openOrFocusRecorder();
  const second = worker.openOrFocusRecorder();
  assert.equal(first, second);
  release();
  await first;
  assert.equal(calls.getContexts.length, 1);
  assert.equal(calls.create.length, 1);
});
test('start waits for persistent recorder status then sends start once', async () => {
  const { worker, calls } = await loadWorker({ recorderResponses: [{ ok: true, state: 'idle' }, { ok: true, state: 'acquiring' }] });
  const result = await worker.handleLoomMessage({ type: 'loom:start', options: { camera: true, microphone: true, sharedAudio: false } }, { id: 'local' });
  assert.deepEqual(result, { ok: true, state: 'acquiring' });
  assert.deepEqual(calls.recorderMessages, [
    { target: 'recorder', type: 'recorder:status', options: undefined },
    { target: 'recorder', type: 'recorder:start', options: { camera: true, microphone: true, sharedAudio: false } },
  ]);
  assert.equal(calls.create.length, 1);
});
test('status and stop are sent only to the persistent recorder page', async () => {
  const { worker, calls } = await loadWorker({ recorderResponses: [{ ok: true, state: 'recording' }, { ok: true, state: 'stopping' }] });
  assert.equal((await worker.handleLoomMessage({ type: 'loom:status' }, { id: 'local' })).state, 'recording');
  assert.equal((await worker.handleLoomMessage({ type: 'loom:stop' }, { id: 'local' })).state, 'stopping');
  assert.deepEqual(calls.recorderMessages.map(({ type }) => type), ['recorder:status', 'recorder:stop']);
});
test('popup mark and Chrome shortcut forward a marker without focusing the recorder', async () => {
  const { worker, calls } = await loadWorker({ recorderResponses: [{ ok: true, marker: { time: 12.5, count: 1 } }, { ok: true, marker: { time: 13, count: 2 } }] });
  assert.deepEqual(await worker.handleLoomMessage({ type: 'loom:mark' }, { id: 'local' }), { ok: true, marker: { time: 12.5, count: 1 } });
  calls.commandListener('mark-mistake');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(calls.recorderMessages.map(({ type }) => type), ['recorder:mark', 'recorder:mark']);
  assert.equal(calls.update.length, 0);
});
test('foreign and recorder-addressed messages are ignored', async () => {
  const { worker, calls } = await loadWorker();
  assert.equal(await worker.handleLoomMessage({ type: 'loom:start' }, { id: 'foreign' }), undefined);
  assert.equal(await worker.handleLoomMessage({ target: 'recorder', type: 'recorder:status' }, { id: 'local' }), undefined);
  assert.equal(calls.recorderMessages.length, 0);
});
test('recorder errors return an actionable response', async () => {
  const { worker } = await loadWorker({ recorderResponses: [{ ok: false, error: 'Recorder is not ready.' }] });
  const result = await worker.handleLoomMessage({ type: 'loom:stop' }, { id: 'local' });
  assert.deepEqual(result, { ok: false, error: 'Recorder is not ready.' });
});
test('runtime listener rejects a foreign sender without responding', async () => {
  const { calls } = await loadWorker();
  let response;
  assert.equal(calls.messageListener({ type: 'loom:status' }, { id: 'foreign' }, (value) => { response = value; }), undefined);
  assert.equal(response, undefined);
});
