const $ = (id) => document.getElementById(id);
const elements = { status: $('popup-status'), error: $('popup-error'), start: $('popup-start'), stop: $('popup-stop'), mark: $('popup-mark'), open: $('popup-open'), camera: $('popup-camera'), microphone: $('popup-microphone'), sharedAudio: $('popup-shared-audio') };
let pollId;
let markerAcknowledgement = '';
let markerAcknowledgementExpiresAt = 0;
async function send(type, options) {
  const response = await chrome.runtime.sendMessage({ type, options });
  if (!response?.ok) throw new Error(response?.error || 'Recorder is unavailable.');
  return response;
}
function setError(text = '') { elements.error.textContent = text; elements.error.hidden = !text; }
function updateStatus(response) {
  const state = response?.state || 'idle'; const active = ['recording', 'paused', 'acquiring'].includes(state);
  const labels = { idle: 'Ready to record', ready: 'Recording ready', acquiring: 'Choosing a source…', recording: 'Recording in progress', paused: 'Recording paused', stopping: 'Finishing recording…' };
  const keepMarkerAcknowledgement = state === 'recording' && Date.now() < markerAcknowledgementExpiresAt;
  if (!keepMarkerAcknowledgement) { markerAcknowledgement = ''; markerAcknowledgementExpiresAt = 0; }
  elements.status.textContent = keepMarkerAcknowledgement ? markerAcknowledgement : (labels[state] || 'Recorder ready'); elements.start.disabled = active || state === 'stopping'; elements.stop.disabled = !active; elements.mark.disabled = state !== 'recording';
  [elements.camera, elements.microphone, elements.sharedAudio].forEach(control => { control.disabled = active || state === 'stopping'; });
  if (active && response.options) { elements.camera.checked = response.options.camera; elements.microphone.checked = response.options.microphone; elements.sharedAudio.checked = response.options.sharedAudio; }
  if (response?.error) setError(response.error);
}
async function refreshStatus(preserveError = false) {
  try {
    const response = await send('loom:status');
    updateStatus(response);
    if (!preserveError && !response.error) setError();
  } catch (_) {
    updateStatus({ state: 'idle' });
    if (!preserveError) setError();
  }
}
elements.start.addEventListener('click', async () => {
  setError(); elements.start.disabled = true; elements.status.textContent = 'Starting source chooser…';
  try { await send('loom:start', { camera: elements.camera.checked, microphone: elements.microphone.checked, sharedAudio: elements.sharedAudio.checked }); window.close(); }
  catch (error) { setError(error.message); await refreshStatus(true); }
});
elements.stop.addEventListener('click', async () => { setError(); elements.stop.disabled = true; elements.status.textContent = 'Stopping recording…'; try { await send('loom:stop'); window.close(); } catch (error) { setError(error.message); await refreshStatus(true); } });
elements.mark.addEventListener('click', async () => { setError(); elements.mark.disabled = true; try { const response = await send('loom:mark'); const seconds = Math.max(0, Math.floor(response.marker?.time || 0)); markerAcknowledgement = `Mistake marked at ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')} — redo that sentence`; markerAcknowledgementExpiresAt = Date.now() + 4000; elements.status.textContent = markerAcknowledgement; } catch (error) { setError(error.message); } await refreshStatus(true); });
elements.open.addEventListener('click', async () => { try { await send('loom:open'); window.close(); } catch (error) { setError(error.message); } });
window.addEventListener('DOMContentLoaded', () => { void refreshStatus(); pollId = window.setInterval(refreshStatus, 750); });
window.addEventListener('unload', () => { if (pollId) window.clearInterval(pollId); });

$('popup-orb').addEventListener('click', async () => { try { await send('loom:orb'); window.close(); } catch (error) { setError(error.message); } });
