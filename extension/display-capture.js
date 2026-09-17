let activeChoice = null;

/**
 * Opens Chrome's desktop chooser from the persistent recorder page and consumes
 * its one-use stream id immediately. It deliberately has no fallback picker.
 */
export async function chooseDisplayMedia({ audio = false } = {}, dependencies = {}) {
  if (activeChoice) throw new Error('A display source chooser is already open.');
  const chromeApi = dependencies.chrome || globalThis.chrome;
  const mediaDevices = dependencies.mediaDevices || globalThis.navigator?.mediaDevices;
  const desktopCapture = dependencies.desktopCapture || chromeApi?.desktopCapture;
  if (!desktopCapture?.chooseDesktopMedia || !mediaDevices?.getUserMedia) {
    throw new Error('Chrome desktop capture is unavailable. Reload Local Loom and try again.');
  }

  const choice = { cancelled: false, requestId: null, reject: null, cancel: null };
  activeChoice = choice;
  try {
    const selected = await new Promise((resolve, reject) => {
      choice.reject = reject;
      const callback = (streamId, options = {}) => {
        if (activeChoice !== choice || choice.cancelled) return;
        const runtimeError = chromeApi?.runtime?.lastError;
        if (runtimeError) {
          reject(new Error(runtimeError.message || 'Chrome could not open the source chooser.'));
          return;
        }
        if (!streamId) {
          reject(abortError('Display source selection was cancelled.'));
          return;
        }
        resolve({ streamId, canRequestAudioTrack: Boolean(options?.canRequestAudioTrack) });
      };
      try {
        // No targetTab: the recorder page is the persistent chooser owner.
        choice.requestId = desktopCapture.chooseDesktopMedia(
          audio ? ['screen', 'window', 'tab', 'audio'] : ['screen', 'window', 'tab'],
          callback,
        );
        choice.cancel = () => desktopCapture.cancelChooseDesktopMedia?.(choice.requestId);
        if (choice.cancelled && choice.requestId != null) desktopCapture.cancelChooseDesktopMedia?.(choice.requestId);
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Chrome could not open the source chooser.'));
      }
    });

    if (choice.cancelled) throw abortError('Display source selection was cancelled.');
    const sourceConstraints = {
      mandatory: {
        chromeMediaSource: 'desktop',
        chromeMediaSourceId: selected.streamId,
      },
    };
    let stream;
    try {
      stream = await mediaDevices.getUserMedia({
        video: sourceConstraints,
        audio: audio && selected.canRequestAudioTrack ? sourceConstraints : false,
      });
    } catch (error) {
      if (choice.cancelled) throw abortError('Display source selection was cancelled.');
      throw error;
    }
    if (choice.cancelled) {
      stopTracks(stream);
      throw abortError('Display source selection was cancelled.');
    }
    return stream;
  } finally {
    if (activeChoice === choice) activeChoice = null;
  }
}

export function cancelDisplayChoice() {
  const choice = activeChoice;
  if (!choice) return false;
  choice.cancelled = true;
  try { choice.cancel?.(); } catch (_) { /* Best effort. */ }
  choice.reject?.(abortError('Display source selection was cancelled.'));
  return true;
}

function abortError(message) {
  if (typeof DOMException === 'function') return new DOMException(message, 'AbortError');
  const error = new Error(message);
  error.name = 'AbortError';
  return error;
}

function stopTracks(stream) {
  for (const track of stream?.getTracks?.() || []) {
    try { track.stop(); } catch (_) { /* Track may already have ended. */ }
  }
}
