import assert from 'node:assert/strict';
import test from 'node:test';

const moduleUrl = new URL('../extension/save-recording.js', import.meta.url);

function installDownloadsMock({ download, search }) {
  const listeners = new Set();
  const calls = { download: [], search: [], added: 0, removed: 0 };
  globalThis.chrome = {
    downloads: {
      download: async (options) => {
        calls.download.push(options);
        return download(options);
      },
      search: async (query) => {
        calls.search.push(query);
        return search(query);
      },
      onChanged: {
        addListener(listener) { calls.added += 1; listeners.add(listener); },
        removeListener(listener) { calls.removed += 1; listeners.delete(listener); },
      },
    },
  };
  return {
    calls,
    emit(delta) { for (const listener of [...listeners]) listener(delta); },
    get listenerCount() { return listeners.size; },
  };
}

async function loadSaveRecording() {
  return import(`${moduleUrl.href}?case=${Math.random()}`);
}

test('requests Save As and resolves with Chrome\'s actual renamed saved path', async () => {
  let searches = 0;
  const mock = installDownloadsMock({
    download: async () => 41,
    search: async () => (++searches === 1
      ? [{ id: 41, state: 'in_progress' }]
      : [{ id: 41, state: 'complete', filename: '/tmp/downloads/walkthrough (2).mp4' }]),
  });
  const { saveRecording } = await loadSaveRecording();
  const saved = saveRecording({ url: 'blob:recording', filename: 'walkthrough.mp4' });

  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(mock.calls.download, [{ url: 'blob:recording', filename: 'walkthrough.mp4', saveAs: true }]);
  assert.deepEqual(mock.calls.search, [{ id: 41 }]);
  assert.equal(mock.listenerCount, 1);
  mock.emit({ id: 41, state: { current: 'complete' } });
  assert.deepEqual(await saved, { id: 41, filename: '/tmp/downloads/walkthrough (2).mp4' });
  assert.equal(mock.listenerCount, 0);
  assert.equal(mock.calls.removed, 1);
});

test('treats a cancelled Save As dialog as recoverable and cleans up its listener', async () => {
  const mock = installDownloadsMock({ download: async () => 42, search: async () => [{ id: 42, state: 'in_progress' }] });
  const { saveRecording } = await loadSaveRecording();
  const saved = saveRecording({ url: 'blob:recording', filename: 'walkthrough.webm' });

  await new Promise((resolve) => setTimeout(resolve, 0));
  mock.emit({ id: 42, state: { current: 'interrupted' }, error: { current: 'USER_CANCELED' } });
  await assert.rejects(saved, /cancelled.*still available/i);
  assert.equal(mock.listenerCount, 0);
});

test('reports an interrupted download without revoking the recording URL', async () => {
  const mock = installDownloadsMock({ download: async () => 43, search: async () => [{ id: 43, state: 'in_progress' }] });
  const { saveRecording } = await loadSaveRecording();
  const saved = saveRecording({ url: 'blob:recording', filename: 'walkthrough.mp4' });

  await new Promise((resolve) => setTimeout(resolve, 0));
  mock.emit({ id: 43, state: { current: 'interrupted' }, error: { current: 'NETWORK_FAILED' } });
  await assert.rejects(saved, /interrupted.*NETWORK_FAILED.*still available/i);
  assert.equal(mock.listenerCount, 0);
});

test('reads back an already-completed fast download after registering its listener', async () => {
  const mock = installDownloadsMock({ download: async () => 44, search: async () => [{ id: 44, state: 'complete', filename: '/tmp/downloads/walkthrough.mp4' }] });
  const { saveRecording } = await loadSaveRecording();

  assert.deepEqual(
    await saveRecording({ url: 'blob:recording', filename: 'walkthrough.mp4' }),
    { id: 44, filename: '/tmp/downloads/walkthrough.mp4' },
  );
  assert.equal(mock.calls.added, 1);
  assert.equal(mock.calls.removed, 1);
  assert.equal(mock.listenerCount, 0);
});

test('fails explicitly when Chrome cannot read back the completed saved file', async () => {
  let searches = 0;
  const mock = installDownloadsMock({
    download: async () => 45,
    search: async () => (++searches === 1 ? [{ id: 45, state: 'in_progress' }] : []),
  });
  const { saveRecording } = await loadSaveRecording();
  const saved = saveRecording({ url: 'blob:recording', filename: 'walkthrough.mp4' });

  await new Promise((resolve) => setTimeout(resolve, 0));
  mock.emit({ id: 45, state: { current: 'complete' } });
  await assert.rejects(saved, /completed.*could not find/i);
  assert.equal(mock.listenerCount, 0);
});

test('reports a rejected Save As request without installing a listener', async () => {
  const mock = installDownloadsMock({ download: async () => { throw new Error('user gesture required'); }, search: async () => [] });
  const { saveRecording } = await loadSaveRecording();

  await assert.rejects(saveRecording({ url: 'blob:recording', filename: 'walkthrough.mp4' }), /Save As could not be opened.*user gesture required/i);
  assert.equal(mock.calls.added, 0);
  assert.equal(mock.listenerCount, 0);
});
