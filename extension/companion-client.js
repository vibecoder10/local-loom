const BASE_URL = 'http://127.0.0.1:8768';

async function request(path, options = {}) {
  let response;
  try {
    response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: { ...options.headers, 'X-Local-Loom-Client': chrome.runtime.id },
      signal: options.signal || AbortSignal.timeout(120000),
    });
  } catch (_) {
    throw new Error('Local helper is unavailable. Start it, then choose Retry.');
  }
  if (!response.ok) {
    let detail = '';
    try { detail = (await response.json()).error || ''; } catch (_) { /* Response was not JSON. */ }
    throw new Error(detail || `Local helper request failed (${response.status}).`);
  }
  return response;
}

export async function health() {
  const response = await request('/health');
  return response.json();
}

export async function createJob(blob, mimeType, markers = []) {
  const response = await request('/jobs', {
    method: 'POST',
    headers: { 'Content-Type': mimeType || 'video/webm', 'X-Local-Loom-Markers': JSON.stringify(markers) },
    body: blob,
  });
  return response.json();
}

export async function getJob(id) {
  const response = await request(`/jobs/${encodeURIComponent(id)}`);
  return response.json();
}

export async function renderJob(id, cuts) {
  const response = await request(`/jobs/${encodeURIComponent(id)}/render`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cuts }),
  });
  return response.json();
}

export async function getArtifact(id, name) {
  const response = await request(`/jobs/${encodeURIComponent(id)}/files/${encodeURIComponent(name)}`);
  return response.blob();
}
