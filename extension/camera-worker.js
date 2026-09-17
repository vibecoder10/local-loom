let layout = { x: 0.03, y: 0.97, size: 0.24, shape: 'circle', mirror: true };
let stopped = false;
let readySent = false;
let latestCameraFrame = null;
let canvas = null;
let context = null;
let outputWidth = 0;
let outputHeight = 0;
let screenReader = null;
let cameraReader = null;
let writer = null;
let firstCameraResolve;
let firstCameraReject;
let firstCamera = new Promise((resolve, reject) => {
  firstCameraResolve = resolve;
  firstCameraReject = reject;
});

self.onmessage = (event) => {
  const message = event.data;
  if (!message || typeof message !== 'object') return;
  if (message.type === 'layout') {
    layout = normalizeLayout(message.layout);
    return;
  }
  if (message.type === 'start') {
    void start(message);
  }
};

async function start({ screenReadable, cameraReadable, outputWritable, layout: initialLayout }) {
  try {
    layout = normalizeLayout(initialLayout);
    screenReader = screenReadable.getReader();
    cameraReader = cameraReadable.getReader();
    writer = outputWritable.getWriter();
    void drainCamera();
    await firstCamera;
    await drainScreen();
    if (!stopped) fail('Screen video ended before recording stopped.');
  } catch (error) {
    if (!stopped) fail(error?.message || 'Camera compositor failed.');
  } finally {
    closeFrame(latestCameraFrame);
    latestCameraFrame = null;
    try { await writer?.close(); } catch (_) { /* Writer can already be closed. */ }
    try { screenReader?.releaseLock(); } catch (_) { /* Reader is already released. */ }
    try { cameraReader?.releaseLock(); } catch (_) { /* Reader is already released. */ }
  }
}

async function drainCamera() {
  try {
    while (!stopped) {
      const { value, done } = await cameraReader.read();
      if (done) throw new Error('Camera video ended before recording stopped.');
      closeFrame(latestCameraFrame);
      latestCameraFrame = value;
      firstCameraResolve?.();
      firstCameraResolve = null;
      firstCameraReject = null;
    }
  } catch (error) {
    if (firstCameraReject) firstCameraReject(error);
    if (!stopped) fail(error?.message || 'Camera video ended before recording stopped.');
  }
}

async function drainScreen() {
  while (!stopped) {
    const { value: screenFrame, done } = await screenReader.read();
    if (done) return;
    try {
      if (!latestCameraFrame) throw new Error('Camera video ended before recording stopped.');
      drawFrame(screenFrame, latestCameraFrame);
      const options = { timestamp: Number.isFinite(screenFrame.timestamp) ? screenFrame.timestamp : 0 };
      if (Number.isFinite(screenFrame.duration)) options.duration = screenFrame.duration;
      const outputFrame = new VideoFrame(canvas, options);
      try {
        await writer.write(outputFrame);
      } finally {
        outputFrame.close();
      }
      if (!readySent) {
        readySent = true;
        postMessage({ type: 'ready' });
      }
    } finally {
      screenFrame.close();
    }
  }
}

function drawFrame(screenFrame, cameraFrame) {
  ensureCanvas(screenFrame.displayWidth || screenFrame.codedWidth, screenFrame.displayHeight || screenFrame.codedHeight);
  context.fillStyle = '#000';
  context.fillRect(0, 0, outputWidth, outputHeight);
  drawFit(screenFrame, 0, 0, outputWidth, outputHeight);
  const rect = overlayRect(layout, outputWidth, outputHeight);
  context.save();
  if (layout.shape === 'circle') {
    context.beginPath();
    context.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, rect.width / 2, 0, Math.PI * 2);
    context.clip();
  } else {
    roundedRect(context, rect.x, rect.y, rect.width, rect.height, Math.max(4, rect.width * 0.12));
    context.clip();
  }
  if (layout.mirror) {
    context.translate(rect.x + rect.width, rect.y);
    context.scale(-1, 1);
    drawCover(cameraFrame, 0, 0, rect.width, rect.height);
  } else {
    drawCover(cameraFrame, rect.x, rect.y, rect.width, rect.height);
  }
  context.restore();
  context.save();
  context.strokeStyle = '#fff';
  context.lineWidth = Math.max(2, rect.width * 0.012);
  if (layout.shape === 'circle') {
    context.beginPath();
    context.arc(rect.x + rect.width / 2, rect.y + rect.height / 2, Math.max(0, rect.width / 2 - context.lineWidth / 2), 0, Math.PI * 2);
    context.stroke();
  } else {
    roundedRect(context, rect.x + context.lineWidth / 2, rect.y + context.lineWidth / 2, rect.width - context.lineWidth, rect.height - context.lineWidth, Math.max(4, rect.width * 0.12));
    context.stroke();
  }
  context.restore();
}

function ensureCanvas(sourceWidth, sourceHeight) {
  if (canvas) return;
  const scale = Math.min(1, 1920 / Math.max(sourceWidth, sourceHeight));
  outputWidth = even(Math.max(2, Math.round(sourceWidth * scale)));
  outputHeight = even(Math.max(2, Math.round(sourceHeight * scale)));
  canvas = new OffscreenCanvas(outputWidth, outputHeight);
  context = canvas.getContext('2d', { alpha: false, desynchronized: true });
  if (!context) throw new Error('OffscreenCanvas 2D rendering is unavailable.');
}

function drawFit(frame, x, y, width, height) {
  const sourceWidth = frame.displayWidth || frame.codedWidth;
  const sourceHeight = frame.displayHeight || frame.codedHeight;
  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const drawWidth = sourceWidth * scale;
  const drawHeight = sourceHeight * scale;
  context.drawImage(frame, x + (width - drawWidth) / 2, y + (height - drawHeight) / 2, drawWidth, drawHeight);
}

function drawCover(frame, x, y, width, height) {
  const sourceWidth = frame.displayWidth || frame.codedWidth;
  const sourceHeight = frame.displayHeight || frame.codedHeight;
  const sourceSize = Math.min(sourceWidth, sourceHeight);
  const sourceX = (sourceWidth - sourceSize) / 2;
  const sourceY = (sourceHeight - sourceSize) / 2;
  context.drawImage(frame, sourceX, sourceY, sourceSize, sourceSize, x, y, width, height);
}

function overlayRect(currentLayout, width, height) {
  const diameter = Math.min(width, height) * currentLayout.size;
  return {
    x: currentLayout.x * Math.max(0, width - diameter),
    y: currentLayout.y * Math.max(0, height - diameter),
    width: diameter,
    height: diameter,
  };
}

function normalizeLayout(input = {}) {
  return {
    x: clamp(input.x, 0.03, 0, 1),
    y: clamp(input.y, 0.97, 0, 1),
    size: clamp(input.size, 0.24, 0.12, 0.45),
    shape: input.shape === 'square' ? 'square' : 'circle',
    mirror: typeof input.mirror === 'boolean' ? input.mirror : true,
  };
}

function clamp(value, fallback, minimum, maximum) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(maximum, Math.max(minimum, number)) : fallback;
}

function even(value) {
  const rounded = Math.round(value);
  return rounded % 2 === 0 ? rounded : Math.max(2, rounded - 1);
}

function roundedRect(target, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  target.beginPath();
  target.roundRect(x, y, width, height, safeRadius);
}

function closeFrame(frame) {
  try { frame?.close(); } catch (_) { /* Frame may already be closed. */ }
}

function fail(message) {
  if (stopped) return;
  stopped = true;
  postMessage({ type: 'error', message });
  Promise.resolve(screenReader?.cancel()).catch(() => {});
  Promise.resolve(cameraReader?.cancel()).catch(() => {});
  Promise.resolve(writer?.abort(message)).catch(() => {});
}
