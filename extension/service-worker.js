const RECORDER_PATH = 'recorder.html';
const READY_TIMEOUT_MS = 3000;
const READY_RETRY_MS = 100;
let openPromise = null;

function recorderUrl() { return chrome.runtime.getURL(RECORDER_PATH); }
async function findRecorderContext(url) {
  const contexts = await chrome.runtime.getContexts({ contextTypes: ['TAB'], documentUrls: [url] });
  return contexts.find((context) => Number.isInteger(context.tabId));
}
export function openOrFocusRecorder() {
  if (!openPromise) openPromise = openOrFocusRecorderOnce().finally(() => { openPromise = null; });
  return openPromise;
}
async function openOrFocusRecorderOnce() {
  const url = recorderUrl();
  const existing = await findRecorderContext(url);
  if (existing) {
    if (Number.isInteger(existing.windowId)) await chrome.windows.update(existing.windowId, { focused: true });
    await chrome.tabs.update(existing.tabId, { active: true });
    return existing;
  }
  return chrome.tabs.create({ url, active: true });
}
function wait(milliseconds) { return new Promise((resolve) => setTimeout(resolve, milliseconds)); }
async function sendRecorderMessage(type, options) {
  const response = await chrome.runtime.sendMessage({ target: 'recorder', type, options });
  if (!response?.ok) throw new Error(response?.error || 'The recorder page is unavailable.');
  return response;
}
async function waitForRecorder() {
  const deadline = Date.now() + READY_TIMEOUT_MS;
  let lastError;
  while (Date.now() < deadline) {
    try { return await sendRecorderMessage('recorder:status'); }
    catch (error) { lastError = error; await wait(READY_RETRY_MS); }
  }
  throw new Error(lastError?.message || 'Recorder page did not become ready within 3 seconds.');
}
export async function handleLoomMessage(message, sender = {}) {
  if (message?.target === 'recorder' || sender.id !== chrome.runtime.id) return undefined;
  try {
    switch (message?.type) {
      case 'loom:open': { const tab = await openOrFocusRecorder(); return { ok: true, tabId: tab.tabId ?? tab.id }; }
      case 'loom:start':
        await openOrFocusRecorder();
        await waitForRecorder();
        return await sendRecorderMessage('recorder:start', message.options || {});
      case 'loom:orb':
        await openOrFocusRecorder();
        await waitForRecorder();
        return await sendRecorderMessage('recorder:orb');
      case 'loom:mark': return await sendRecorderMessage('recorder:mark');
      case 'loom:stop': return await sendRecorderMessage('recorder:stop');
      case 'loom:status': return await sendRecorderMessage('recorder:status');
      default: return undefined;
    }
  } catch (error) { return { ok: false, error: error?.message || 'Local Loom command failed.' }; }
}
chrome.action.onClicked.addListener(() => { openOrFocusRecorder().catch((error) => console.error('Unable to open Local Loom recorder', error)); });
chrome.commands?.onCommand?.addListener((command) => {
  if (command !== 'mark-mistake') return;
  sendRecorderMessage('recorder:mark').catch((error) => console.error('Unable to mark Local Loom mistake', error));
});
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.target === 'recorder' || sender?.id !== chrome.runtime.id || !String(message?.type || '').startsWith('loom:')) return undefined;
  handleLoomMessage(message, sender).then(sendResponse);
  return true;
});
