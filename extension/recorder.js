import { CameraOrb } from './camera-orb.js';
import { chooseDisplayMedia, cancelDisplayChoice } from './display-capture.js';
import { saveRecording } from './save-recording.js';
import { RecorderController } from './recorder-core.js';
import { createJob, getArtifact, getJob, health, renderJob } from './companion-client.js';
import { normalizeLayout, overlayRect } from './camera-compositor.js';
import { buildCutPlan } from './edit-model.js';

const $ = (id) => document.getElementById(id);
const elements = {
  start: $('start'), stop: $('stop'), pause: $('pause'), microphone: $('microphone'), sharedAudio: $('shared-audio'),
  format: $('format'), formatHelp: $('format-help'), status: $('status'), timer: $('timer'), preview: $('preview'),
  previewEmpty: $('preview-empty'), download: $('download'), downloadLabel: $('download-label'), warning: $('warning'), error: $('error'),
  camera: $('camera'), cameraOptions: $('camera-options'), cameraShape: $('camera-shape'), cameraSize: $('camera-size'), cameraSizeValue: $('camera-size-value'), cameraMirror: $('camera-mirror'),
  cornerButtons: [...document.querySelectorAll('.corner-button')], livePreviewCard: $('live-preview-card'), livePreview: $('live-preview'), livePreviewStage: $('live-preview-stage'), cameraHandle: $('camera-handle'),
  autoProcess: $('auto-process'), companionStatus: $('companion-status'), retryCompanion: $('retry-companion'), processingStatus: $('processing-status'),
  transcriptWrap: $('transcript-wrap'), transcript: $('transcript'), downloadTranscript: $('download-transcript'), downloadSrt: $('download-srt'),
  cutsWrap: $('cuts-wrap'), cutList: $('cut-list'), applyCuts: $('apply-cuts'), editedWrap: $('edited-wrap'), editedPreview: $('edited-preview'), downloadEdited: $('download-edited'),
  mark: $('mark-mistake'), barMark: $('bar-mark'), markerStatus: $('marker-status'), trimStart: $('trim-start'), trimEnd: $('trim-end'), manualStart: $('manual-start'), manualEnd: $('manual-end'), setStart: $('set-start'), setEnd: $('set-end'), addRemoval: $('add-removal'), undoEdit: $('undo-edit'), editSummary: $('edit-summary'),
  importVideoFile: $('import-video-file'),
};
const statusPill = elements.status.closest('.status-pill');
let state = 'idle';
let previewUrl, editedPreviewUrl, transcriptUrl, srtUrl, latestRecording, jobId;
let unsaved = false;
let pollingGeneration = 0;
let expectingEditedResult = false;
let cameraLayout = normalizeLayout();
let draggingCamera = false;
let saving = false;
let renderingEdits = false;
let markerList = [];
let editHistory = [];
let committedEdits = null;
let editingJobLoaded = false;
let editingDuration = 0;

function formatTime(milliseconds) {
  const seconds = Math.max(0, Math.floor(milliseconds / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
}
function formatSeconds(value) { return Number.isFinite(Number(value)) ? Number(value).toFixed(2) : '0.00'; }
function message(element, text) { element.textContent = text || ''; element.hidden = !text; }
function revoke(url) { if (url) URL.revokeObjectURL(url); }
function setConnection(text, status = 'checking') { elements.companionStatus.textContent = text; elements.companionStatus.dataset.state = status; }
function setProcessing(text) { elements.processingStatus.textContent = text; }
function showMarker(marker) {
  markerList = [...markerList, marker];
  elements.markerStatus.hidden = false;
  elements.markerStatus.textContent = `Mistake marked at ${formatTime(marker.time * 1000)} — redo that sentence.`;
  orb.showMarker?.(marker);
}
function invalidateEdited() {
  revoke(editedPreviewUrl); editedPreviewUrl = undefined;
  elements.editedPreview.removeAttribute('src'); elements.editedPreview.hidden = true;
  elements.downloadEdited.removeAttribute('href'); elements.downloadEdited.hidden = true;
}
function rowsToCuts() {
  return [...elements.cutList.querySelectorAll('.cut-row')].map((row) => {
    const [enabled, start, end] = row.querySelectorAll('input'); return { enabled: enabled.checked, start: Number(start.value), end: Number(end.value), label: row.querySelector('.cut-label').textContent };
  });
}
function refreshEditSummary() {
  const duration = editingDuration || Number(elements.preview.duration) || latestRecording?.durationMs / 1000 || 0;
  if (!elements.cutList.children.length && !elements.transcript.textContent) elements.editSummary.textContent = 'No changes yet. Add a manual removal or adjust the keep interval.';
  try { const plan = buildCutPlan(rowsToCuts(), { start: elements.trimStart.value, end: elements.trimEnd.value || duration }, duration); elements.editSummary.textContent = `${plan.cuts.length} cuts · ${formatSeconds(plan.removedSeconds)} seconds removed · ${formatSeconds(plan.remainingSeconds)} seconds remaining`; }
  catch (_) { elements.editSummary.textContent = 'Enter valid edit times.'; }
}
function snapshotEdits() { return { cuts: rowsToCuts(), trimStart: elements.trimStart.value, trimEnd: elements.trimEnd.value }; }
function changedEdits() {
  const next = snapshotEdits();
  if (committedEdits && JSON.stringify(next) !== JSON.stringify(committedEdits)) editHistory.push(committedEdits);
  committedEdits = next; invalidateEdited(); refreshEditSummary();
}
function setEditLock(locked) {
  renderingEdits = locked;
  [elements.importVideoFile, elements.undoEdit, elements.trimStart, elements.trimEnd, elements.manualStart, elements.manualEnd, elements.setStart, elements.setEnd, elements.addRemoval, elements.applyCuts, elements.retryCompanion, elements.start].forEach((control) => { control.disabled = locked; });
  elements.cutList.querySelectorAll('input,button').forEach((control) => { control.disabled = locked; });
  elements.applyCuts.disabled = locked || !jobId;
  elements.retryCompanion.disabled = locked || !latestRecording;
  elements.start.disabled = locked || !['idle', 'ready'].includes(state);
}

function supportsMp4() {
  return typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function'
    && ['video/mp4;codecs=avc1.42E01E,mp4a.40.2', 'video/mp4'].some((mime) => MediaRecorder.isTypeSupported(mime));
}
function configureFormat() {
  const mp4Option = elements.format.querySelector('option[value="mp4"]');
  if (supportsMp4()) { elements.format.value = 'mp4'; elements.formatHelp.textContent = 'MP4 is available and selected for this browser.'; return; }
  mp4Option.disabled = true; elements.format.value = 'webm'; elements.formatHelp.textContent = 'MP4 recording is unavailable in this browser. WebM is selected.';
}
function clamp(value) { return Math.min(1, Math.max(0, value)); }
function updateCameraControls() {
  const enabled = elements.camera.checked;
  elements.cameraOptions.hidden = !enabled;
  [elements.cameraShape, elements.cameraSize, elements.cameraMirror, ...elements.cornerButtons].forEach((control) => { control.disabled = !enabled; });
  if (!enabled) elements.cameraHandle.hidden = true;
  else positionCameraHandle();
}
function positionCameraHandle() {
  if (!elements.camera.checked || !elements.livePreview.videoWidth || !elements.livePreview.videoHeight) return;
  const rect = overlayRect(cameraLayout, elements.livePreview.videoWidth, elements.livePreview.videoHeight);
  if (!rect.width || !rect.height) return;
  elements.cameraHandle.style.left = `${((rect.x + rect.width / 2) / elements.livePreview.videoWidth) * 100}%`;
  elements.cameraHandle.style.top = `${((rect.y + rect.height / 2) / elements.livePreview.videoHeight) * 100}%`;
  elements.cameraHandle.style.width = `${(rect.width / elements.livePreview.videoWidth) * 100}%`;
  elements.cameraHandle.style.aspectRatio = '1';
  elements.cameraHandle.dataset.shape = cameraLayout.shape;
  elements.cameraHandle.hidden = elements.livePreviewCard.hidden;
}
function updateCameraLayout(partial) {
  cameraLayout = normalizeLayout({ ...cameraLayout, ...partial });
  cameraLayout = recorder.setCameraLayout(cameraLayout);
  elements.cameraShape.value = cameraLayout.shape;
  elements.cameraSize.value = String(cameraLayout.size);
  elements.cameraSizeValue.value = `${Math.round(cameraLayout.size * 100)}%`;
  elements.cameraMirror.checked = cameraLayout.mirror;
  orb.setMirror(cameraLayout.mirror);
  positionCameraHandle();
}
function setLivePreview(stream) {
  if (stream && recorder.cameraStream) orb.setStream(recorder.cameraStream);
  if (!stream) {
    elements.livePreview.pause();
    elements.livePreview.srcObject = null;
    elements.livePreviewCard.hidden = true;
    elements.cameraHandle.hidden = true;
    return;
  }
  elements.livePreview.srcObject = stream;
  elements.livePreviewCard.hidden = false;
  void elements.livePreview.play().catch(() => {});
  positionCameraHandle();
}
function moveCameraFromPointer(event) {
  const bounds = elements.livePreviewStage.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;
  const diameter = Math.min(bounds.width, bounds.height) * cameraLayout.size;
  updateCameraLayout({
    x: clamp((event.clientX - bounds.left - diameter / 2) / Math.max(1, bounds.width - diameter)),
    y: clamp((event.clientY - bounds.top - diameter / 2) / Math.max(1, bounds.height - diameter)),
  });
}
function setState(nextState) {
  const previousState = state;
  state = nextState; statusPill.dataset.state = nextState;
  orb.setRecording(['recording', 'paused'].includes(nextState));
  orb.setMarkEnabled?.(nextState === 'recording');
  if (['idle', 'ready'].includes(nextState) && ['acquiring', 'recording', 'paused', 'stopping'].includes(previousState)) orb.close();
  const labels = { idle: 'Ready to record', acquiring: 'Preparing devices and source…', recording: 'Recording', paused: 'Paused', stopping: 'Finishing recording…', ready: 'Recording ready' };
  elements.status.textContent = labels[nextState] || 'Ready to record';
  const busy = ['acquiring', 'recording', 'paused', 'stopping'].includes(nextState);
  elements.start.disabled = busy; elements.stop.disabled = !['recording', 'paused'].includes(nextState); elements.pause.disabled = !['recording', 'paused'].includes(nextState);
  elements.pause.textContent = nextState === 'paused' ? 'Resume' : 'Pause';
  $('recording-bar').hidden = !['recording', 'paused', 'acquiring'].includes(nextState);
  $('bar-status').textContent = labels[nextState];
  chrome.action.setBadgeText({ text: ['recording', 'paused'].includes(nextState) ? (nextState === 'paused' ? 'Ⅱ' : 'REC') : '' });
  chrome.action.setBadgeBackgroundColor({ color: '#E65D20' });
  [elements.microphone, elements.sharedAudio, elements.format, elements.camera].forEach((control) => { control.disabled = busy; });
  elements.mark.disabled = nextState !== 'recording';
  elements.barMark.disabled = nextState !== 'recording';
}
function clearEditingResult() {
  pollingGeneration += 1; jobId = undefined; expectingEditedResult = false;
  editHistory = []; committedEdits = null; editingJobLoaded = false; editingDuration = 0; elements.trimStart.value = '0'; elements.trimEnd.value = ''; elements.editSummary.textContent = '';
  revoke(editedPreviewUrl); revoke(transcriptUrl); revoke(srtUrl); editedPreviewUrl = transcriptUrl = srtUrl = undefined;
  elements.editedPreview.removeAttribute('src'); elements.editedPreview.hidden = true; elements.downloadEdited.removeAttribute('href'); elements.downloadEdited.hidden = true; elements.editedWrap.hidden = true;
  elements.transcript.textContent = ''; elements.transcriptWrap.hidden = true; elements.downloadTranscript.removeAttribute('href'); elements.downloadTranscript.hidden = true; elements.downloadSrt.removeAttribute('href'); elements.downloadSrt.hidden = true;
  elements.cutList.replaceChildren(); elements.cutsWrap.hidden = true; elements.applyCuts.disabled = true;
}
function replacePreview(result) {
  revoke(previewUrl); previewUrl = URL.createObjectURL(result.blob); elements.preview.src = previewUrl; elements.preview.hidden = false; elements.previewEmpty.hidden = true;
  elements.download.href = previewUrl; elements.download.download = result.filename || 'local-loom-recording.webm';
  elements.downloadLabel.textContent = 'Save video as…'; elements.download.hidden = false; unsaved = true;
}
function setArtifact(anchor, blob, filename, currentUrl) {
  revoke(currentUrl); const url = URL.createObjectURL(blob); anchor.href = url; anchor.download = filename; anchor.hidden = false; return url;
}
function cutRow(cut, index) {
  const row = document.createElement('div'); row.className = 'cut-row';
  const enabled = document.createElement('input'); enabled.type = 'checkbox'; enabled.checked = cut.enabled !== false; enabled.setAttribute('aria-label', `Include suggested cut ${index + 1}`);
  const label = document.createElement('span'); label.className = 'cut-label'; label.textContent = cut.label || `Remove ${formatSeconds(cut.start)}s to ${formatSeconds(cut.end)}s`;
  const start = document.createElement('input'); start.type = 'number'; start.min = '0'; start.step = '0.01'; start.value = formatSeconds(cut.start); start.setAttribute('aria-label', `Cut ${index + 1} start seconds`);
  const end = document.createElement('input'); end.type = 'number'; end.min = '0'; end.step = '0.01'; end.value = formatSeconds(cut.end); end.setAttribute('aria-label', `Cut ${index + 1} end seconds`);
  const preview = document.createElement('button'); preview.type = 'button'; preview.className = 'preview-range'; preview.textContent = 'Preview'; preview.setAttribute('aria-label', `Preview cut ${index + 1}`);
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'delete-cut'; remove.textContent = 'Delete';
  row.append(enabled, label, start, end, preview, remove); return row;
}
function showJob(job) {
  elements.transcript.textContent = job.text || (job.transcriptStatus === 'unavailable' ? 'Transcript unavailable. Manual editing is still available.' : 'No speech was detected. Manual editing is still available.'); elements.transcriptWrap.hidden = false;
  editingDuration = job.duration;
  if (!editingJobLoaded) {
    elements.cutList.replaceChildren(...(job.cuts || []).map(cutRow));
    elements.trimStart.value = '0'; elements.trimEnd.value = String(job.duration);
    editingJobLoaded = true; committedEdits = snapshotEdits();
  }
  elements.cutsWrap.hidden = false; refreshEditSummary();
}
async function loadOriginalArtifacts(id, generation) {
  const [txt, srt] = await Promise.all([getArtifact(id, 'transcript.txt'), getArtifact(id, 'transcript.srt')]);
  if (generation !== pollingGeneration || id !== jobId) return;
  transcriptUrl = setArtifact(elements.downloadTranscript, txt, 'local-loom-original-transcript.txt', transcriptUrl);
  srtUrl = setArtifact(elements.downloadSrt, srt, 'local-loom-original-transcript.srt', srtUrl);
}
async function loadEditedArtifact(id, generation) {
  const edited = await getArtifact(id, 'edited.mp4'); if (generation !== pollingGeneration || id !== jobId) return;
  revoke(editedPreviewUrl); editedPreviewUrl = URL.createObjectURL(edited); elements.editedPreview.src = editedPreviewUrl; elements.editedPreview.hidden = false;
  elements.downloadEdited.href = editedPreviewUrl; elements.downloadEdited.download = 'local-loom-edited.mp4'; elements.downloadEdited.hidden = false; elements.editedWrap.hidden = false;
}
function schedulePoll(id, generation) { window.setTimeout(() => { void pollJob(id, generation); }, 1000); }
async function pollJob(id, generation) {
  if (generation !== pollingGeneration || id !== jobId) return;
  try {
    const job = await getJob(id); if (generation !== pollingGeneration || id !== jobId) return;
    if (['queued', 'transcribing', 'rendering'].includes(job.status)) {
      setProcessing(job.status === 'rendering' ? 'Rendering your edited MP4 locally…' : 'Preparing the local transcript…'); schedulePoll(id, generation); return;
    }
    if (job.status === 'error') throw new Error(job.error || 'The local helper could not process this recording.');
    if (job.status !== 'ready') throw new Error('The local helper returned an unknown job state.');
    showJob(job);
    if (!elements.downloadTranscript.getAttribute('href')) await loadOriginalArtifacts(id, generation);
    if (generation !== pollingGeneration || id !== jobId) return;
    if (expectingEditedResult) { await loadEditedArtifact(id, generation); if (generation !== pollingGeneration || id !== jobId) return; expectingEditedResult = false; setEditLock(false); setProcessing(`${job.note || ''} ${job.cutCount ? 'Edited MP4 is ready. Review the removals before saving.' : 'No removals applied; the edited preview is uncut. Add a manual removal or adjust the keep interval.'}`.trim()); }
    else setProcessing((job.cuts || []).length ? 'Transcript is ready. Review the suggested removals before applying them.' : 'Transcript is ready. No spoken CUT marker was found.');
  } catch (error) {
    if (generation !== pollingGeneration || id !== jobId) return;
    setConnection('Local helper needs attention', 'error'); setProcessing(error?.message || 'The local helper could not process this recording.');
    elements.retryCompanion.disabled = !latestRecording; setEditLock(false); elements.applyCuts.disabled = true;
  }
}
async function processLatestRecording() {
  if (!latestRecording) return;
  setEditLock(true);
  const generation = ++pollingGeneration; jobId = undefined; expectingEditedResult = false; elements.retryCompanion.disabled = true; setProcessing('Connecting to the local helper…');
  try {
    const status = await health(); if (!status.ok) throw new Error('The local helper did not report ready.'); if (generation !== pollingGeneration) return;
    setConnection(status.transcriptionAvailable ? 'Local helper connected' : 'Connected — transcription unavailable', status.transcriptionAvailable ? 'ready' : 'error');
    const job = await createJob(latestRecording.blob, latestRecording.mimeType, latestRecording.markers || []); if (generation !== pollingGeneration) return;
    jobId = job.id; expectingEditedResult = true; setProcessing('Recording saved locally. Preparing transcript…'); await pollJob(jobId, generation);
  } catch (error) {
    if (generation !== pollingGeneration) return;
    setEditLock(false); setConnection('Local helper offline', 'offline'); setProcessing(error?.message || 'Local helper is unavailable. Your original recording is still ready to download.'); elements.retryCompanion.disabled = false;
  }
}

const orb = new CameraOrb({
  onStop: () => { void stopRecording(); },
  onMark: () => { try { markMistake(); } catch (error) { message(elements.error, error.message); } },
  onError: (text) => { $('orb-help').textContent = /user activation/i.test(text) ? 'Chrome needs one click here: Show camera orb.' : `${text} Click Show camera orb to retry.`; },
  onChange: (open) => { $('show-orb').textContent = open ? 'Bring camera orb forward' : 'Show camera orb'; if (open) $('orb-help').textContent = 'Your camera is floating above other windows. Drag its title bar to a corner. Closing the orb keeps recording.'; },
});
function showCameraOrb() { return orb.open(recorder.cameraStream); }
$('show-orb').addEventListener('click', () => { void showCameraOrb().catch(() => {}); });
const recorder = new RecorderController({
  captureDisplay: chooseDisplayMedia, cancelCapture: cancelDisplayChoice, prepareDevicesFirst: true,
  onState: setState, onTime: (milliseconds) => { elements.timer.textContent = formatTime(milliseconds); },
  onPreview: setLivePreview, onMarker: showMarker,
  onResult: (result) => {
    clearEditingResult(); markerList = result.markers || []; latestRecording = result; replacePreview(result); setState('ready');
    setProcessing(elements.autoProcess.checked ? 'Recording saved locally. Preparing transcript…' : 'Automatic transcript preparation is off. Choose Retry local helper when ready.');
    elements.retryCompanion.disabled = !latestRecording; if (elements.autoProcess.checked) void processLatestRecording();
    void saveOriginal();
  }, onError: (text) => message(elements.error, text), onWarning: (text) => message(elements.warning, text),
});
async function saveOriginal() {
  if (!latestRecording || saving) return;
  saving = true; const recording = latestRecording;
  $('save-status').textContent = 'Choose a folder in Save As…';
  try {
    const saved = await saveRecording({ url: previewUrl, filename: recording.filename });
    if (latestRecording === recording) { unsaved = false; $('save-status').textContent = `Saved: ${saved.filename}`; }
  } catch (error) { $('save-status').textContent = `${error.message} Your recording is still here. Click Save video as… to try again.`; }
  finally { saving = false; }
}
async function startRecording(options) {
  if (saving || renderingEdits) throw new Error('Finish the current save or edit render before starting another recording.');
  if (!['idle', 'ready'].includes(state)) throw new Error('A recording is already starting or running.');
  message(elements.error, ''); message(elements.warning, '');
  if (unsaved && !window.confirm('Start a new recording? Your current recording will remain available only until you replace it.')) throw new Error('New recording cancelled; your previous video is still available.');
  if (options) {
    elements.microphone.checked = options.microphone !== false;
    elements.sharedAudio.checked = options.sharedAudio !== false;
    elements.camera.checked = options.camera !== false;
    updateCameraControls();
  }
  if (elements.camera.checked) void orb.open(recorder.cameraStream, {waitForStream:true}).catch(() => {});
  else orb.close();
  try {
    await recorder.start({ microphone: elements.microphone.checked, sharedAudio: elements.sharedAudio.checked, format: elements.format.value, camera: elements.camera.checked, cameraLayout });
  } catch (error) { message(elements.error, error?.message || 'Recording could not start.'); throw error; }
}
function stopRecording() { cancelDisplayChoice(); return recorder.stop(); }
elements.start.addEventListener('click', () => { void startRecording().catch(() => {}); });
elements.stop.addEventListener('click', stopRecording);
$('bar-stop').addEventListener('click', stopRecording);
elements.pause.addEventListener('click', () => { if (state === 'recording') recorder.pause(); else if (state === 'paused') recorder.resume(); });
elements.download.addEventListener('click', (event) => { event.preventDefault(); void saveOriginal(); });
elements.downloadEdited.addEventListener('click', (event) => {
  event.preventDefault();
  if (!editedPreviewUrl || saving || renderingEdits) return;
  saving = true;
  void saveRecording({ url: editedPreviewUrl, filename: 'local-loom-edited.mp4' }).then(() => setProcessing('Edited video saved.')).catch((error) => setProcessing(`${error.message} Edited video remains available.`)).finally(() => { saving = false; });
});
elements.importVideoFile.addEventListener('change', () => {
  const file = elements.importVideoFile.files?.[0];
  if (!file || saving || renderingEdits || ['recording', 'paused', 'acquiring', 'stopping'].includes(state)) return;
  if (unsaved && !window.confirm('Open this saved video? Your current unsaved recording will be replaced.')) return;
  clearEditingResult(); latestRecording = { blob: file, mimeType: file.type, filename: file.name, markers: [] }; markerList = [];
  replacePreview(latestRecording); unsaved = false; $('save-status').textContent = 'Opened saved original; the source file is unchanged.'; setState('ready'); setProcessing('Imported video is ready for local transcript and manual edits.');
  if (elements.autoProcess.checked) void processLatestRecording();
});
function markMistake() { return recorder.markMistake(); }
elements.mark.addEventListener('click', () => { try { markMistake(); } catch (error) { message(elements.error, error.message); } });
elements.barMark.addEventListener('click', () => { try { markMistake(); } catch (error) { message(elements.error, error.message); } });
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.id !== chrome.runtime.id || request.target !== 'recorder') return;
  if (request.type === 'recorder:orb') { void showCameraOrb().then(() => sendResponse({ok:true,state})).catch(error => sendResponse({ok:false,error:'Click Show camera orb in the recorder tab to open your floating preview.'})); return true; }
  if (request.type === 'recorder:status') { sendResponse({ ok: true, state, error: elements.error.textContent, options: {camera: elements.camera.checked, microphone: elements.microphone.checked, sharedAudio: elements.sharedAudio.checked} }); return; }
  if (request.type === 'recorder:start') {
    if (!['idle', 'ready'].includes(state) || saving || renderingEdits) { sendResponse({ ok: false, error: 'A recording or save is already in progress.' }); return; }
    void startRecording(request.options).catch(() => {});
    sendResponse({ ok: true, state }); return;
  }
  if (request.type === 'recorder:mark') { try { sendResponse({ ok: true, marker: markMistake(), state }); } catch (error) { sendResponse({ ok: false, error: error.message }); } return; }
  if (request.type === 'recorder:stop') { void stopRecording().then(() => sendResponse({ ok: true, state })).catch(error => sendResponse({ ok: false, error: error.message })); return true; }
});
elements.camera.addEventListener('change', updateCameraControls);
elements.cameraShape.addEventListener('change', () => updateCameraLayout({ shape: elements.cameraShape.value }));
elements.cameraSize.addEventListener('input', () => updateCameraLayout({ size: Number(elements.cameraSize.value) }));
elements.cameraMirror.addEventListener('change', () => updateCameraLayout({ mirror: elements.cameraMirror.checked }));
elements.cornerButtons.forEach((button) => button.addEventListener('click', () => {
  const corners = {
    'top-left': { x: 0.03, y: 0.03 }, 'top-right': { x: 0.97, y: 0.03 },
    'bottom-left': { x: 0.03, y: 0.97 }, 'bottom-right': { x: 0.97, y: 0.97 },
  };
  updateCameraLayout(corners[button.dataset.corner]);
}));
elements.livePreview.addEventListener('loadedmetadata', positionCameraHandle);
elements.livePreview.addEventListener('resize', positionCameraHandle);
elements.cameraHandle.addEventListener('pointerdown', (event) => {
  if (!elements.camera.checked) return;
  draggingCamera = true;
  elements.cameraHandle.setPointerCapture(event.pointerId);
  moveCameraFromPointer(event);
});
elements.cameraHandle.addEventListener('pointermove', (event) => { if (draggingCamera) moveCameraFromPointer(event); });
elements.cameraHandle.addEventListener('pointerup', (event) => {
  draggingCamera = false;
  if (elements.cameraHandle.hasPointerCapture(event.pointerId)) elements.cameraHandle.releasePointerCapture(event.pointerId);
});
elements.cameraHandle.addEventListener('keydown', (event) => {
  const amount = event.shiftKey ? 0.05 : 0.01;
  const moves = { ArrowLeft: { x: -amount }, ArrowRight: { x: amount }, ArrowUp: { y: -amount }, ArrowDown: { y: amount } };
  if (!moves[event.key]) return;
  event.preventDefault();
  updateCameraLayout({ x: cameraLayout.x + (moves[event.key].x || 0), y: cameraLayout.y + (moves[event.key].y || 0) });
});
elements.retryCompanion.addEventListener('click', () => { if (!renderingEdits) { clearEditingResult(); void processLatestRecording(); } });
elements.setStart.addEventListener('click', () => { elements.manualStart.value = formatSeconds(elements.preview.currentTime); });
elements.setEnd.addEventListener('click', () => { elements.manualEnd.value = formatSeconds(elements.preview.currentTime); });
elements.addRemoval.addEventListener('click', () => {
  const start = Number(elements.manualStart.value), end = Number(elements.manualEnd.value);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) { setProcessing('Set a valid start and end before adding a removal.'); return; }
  elements.cutList.append(cutRow({ start, end, label: 'Manual removal' }, elements.cutList.children.length)); elements.cutsWrap.hidden = false; elements.applyCuts.disabled = false; changedEdits();
});
elements.undoEdit.addEventListener('click', () => { const snapshot = editHistory.pop(); if (snapshot) { elements.cutList.replaceChildren(...snapshot.cuts.map(cutRow)); elements.trimStart.value = snapshot.trimStart; elements.trimEnd.value = snapshot.trimEnd; committedEdits = snapshotEdits(); invalidateEdited(); refreshEditSummary(); } });
elements.cutList.addEventListener('change', changedEdits);
elements.cutList.addEventListener('click', (event) => {
  if (!event.target.matches('.delete-cut')) return;
  event.target.closest('.cut-row').remove(); changedEdits();
});
elements.cutList.addEventListener('click', (event) => {
  if (!event.target.matches('.preview-range')) return;
  const [, start, end] = event.target.closest('.cut-row').querySelectorAll('input');
  const stopAt = Number(end.value); elements.preview.currentTime = Number(start.value); void elements.preview.play();
  const stop = () => { if (elements.preview.currentTime >= stopAt) { elements.preview.pause(); elements.preview.removeEventListener('timeupdate', stop); } }; elements.preview.addEventListener('timeupdate', stop);
});
for (const trim of [elements.trimStart, elements.trimEnd]) {
  trim.addEventListener('change', changedEdits);
}
elements.preview.addEventListener('loadedmetadata', () => { if (!elements.trimEnd.value) elements.trimEnd.value = formatSeconds(elements.preview.duration); refreshEditSummary(); });
elements.applyCuts.addEventListener('click', async () => {
  if (!jobId || renderingEdits || saving) return;
  const duration = editingDuration || Number(elements.preview.duration) || latestRecording?.durationMs / 1000 || 0;
  let plan;
  try { plan = buildCutPlan(rowsToCuts(), { start: elements.trimStart.value, end: elements.trimEnd.value || duration }, duration); } catch (error) { setProcessing(error.message); return; }
  const cuts = [...plan.cuts]; if (plan.trim.start > 0) cuts.unshift({ start: 0, end: plan.trim.start }); if (plan.trim.end < duration) cuts.push({ start: plan.trim.end, end: duration });
  cuts.sort((a, b) => a.start - b.start);
  if (cuts.some(cut => !Number.isFinite(cut.start) || !Number.isFinite(cut.end) || cut.start < 0 || cut.end <= cut.start)) { setProcessing('Enter a valid start and end time for each selected cut.'); return; }
  const generation = pollingGeneration; expectingEditedResult = true; invalidateEdited(); setEditLock(true);
  try { await renderJob(jobId, cuts); if (generation !== pollingGeneration) return; setProcessing('Queued local MP4 edit…'); await pollJob(jobId, generation); }
  catch (error) { if (generation !== pollingGeneration) return; expectingEditedResult = false; setEditLock(false); setProcessing(error?.message || 'Could not apply cuts. Adjust the times and try again.'); }
});
window.addEventListener('beforeunload', (event) => {
  if (['acquiring', 'recording', 'paused', 'stopping'].includes(state) || unsaved) { event.preventDefault(); event.returnValue = ''; }
});
window.addEventListener('pagehide', () => { pollingGeneration += 1; revoke(previewUrl); revoke(editedPreviewUrl); revoke(transcriptUrl); revoke(srtUrl); orb.close(); recorder.dispose(); }, { once: true });
configureFormat(); updateCameraLayout(cameraLayout); updateCameraControls(); setState('idle');
if (chrome.commands?.getAll) void chrome.commands.getAll().then((commands) => { const command = commands.find((item) => item.name === 'mark-mistake'); $('shortcut-status').textContent = command?.shortcut ? `Mark mistake shortcut: ${command.shortcut}` : 'Mark mistake shortcut is unassigned in Chrome.'; }).catch(() => { $('shortcut-status').textContent = 'Mark mistake shortcut unavailable.'; });
void health().then((status) => setConnection(status.transcriptionAvailable ? 'Local helper connected' : 'Connected — transcription unavailable', status.transcriptionAvailable ? 'ready' : 'error')).catch(() => setConnection('Local helper offline', 'offline'));
