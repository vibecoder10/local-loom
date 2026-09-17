/**
 * Save a locally-created recording through Chrome's Save As dialog.
 * The caller retains ownership of the object URL and must not revoke it here.
 */
export async function saveRecording({ url, filename }) {
  if (!url || !filename) throw new Error('A recording and filename are required before opening Save As.');

  let id;
  try {
    id = await chrome.downloads.download({ url, filename, saveAs: true });
  } catch (error) {
    throw new Error(`Save As could not be opened. ${readableError(error)}`.trim());
  }

  return waitForDownload(id);
}

function waitForDownload(id) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result, error) => {
      if (settled) return;
      settled = true;
      chrome.downloads.onChanged.removeListener(onChanged);
      if (error) reject(error);
      else resolve(result);
    };
    const completeFromItem = (item) => {
      if (item?.state !== 'complete') {
        finish(null, new Error('Save As completed, but Chrome could not verify the saved file.'));
        return;
      }
      if (!item.filename || typeof item.filename !== 'string') {
        finish(null, new Error('Save As completed, but Chrome did not return the saved file path.'));
        return;
      }
      finish({ id, filename: item.filename });
    };
    const verifyCompletedDownload = () => {
      Promise.resolve(chrome.downloads.search({ id })).then((items) => {
        const item = items?.find((candidate) => candidate.id === id);
        if (!item) {
          finish(null, new Error('Save As completed, but Chrome could not find the saved download.'));
          return;
        }
        completeFromItem(item);
      }).catch((error) => {
        finish(null, new Error(`Save As completed, but its saved file could not be verified. ${readableError(error)}`.trim()));
      });
    };
    const onChanged = (delta) => {
      if (delta?.id !== id) return;
      const state = delta.state?.current;
      if (state === 'complete') verifyCompletedDownload();
      else if (state === 'interrupted') finish(null, interruptedError(delta.error?.current));
    };

    // Register before the readback: completion can occur immediately after
    // downloads.download resolves and before the initial search returns.
    chrome.downloads.onChanged.addListener(onChanged);
    Promise.resolve(chrome.downloads.search({ id })).then((items) => {
      if (settled) return;
      const item = items?.find((candidate) => candidate.id === id);
      if (item?.state === 'complete') completeFromItem(item);
      else if (item?.state === 'interrupted') finish(null, interruptedError(item.error));
    }).catch((error) => {
      finish(null, new Error(`Save As started, but its status could not be verified. ${readableError(error)}`.trim()));
    });
  });
}

function interruptedError(reason) {
  if (reason === 'USER_CANCELED') {
    return new Error('Save As was cancelled. Your recording is still available to save again.');
  }
  const detail = reason ? ` (${reason})` : '';
  return new Error(`The download was interrupted${detail}. Your recording is still available to save again.`);
}

function readableError(error) {
  return error?.message || String(error || 'Try Save As again.');
}
