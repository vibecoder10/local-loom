import { CameraCompositor } from './camera-compositor.js';
const result = document.querySelector('#result');
document.querySelector('#run').addEventListener('click', async () => {
  const sources = [], timers = [];
  const compositor = new CameraCompositor({onError: message => { result.textContent = `FAIL: ${message}`; }});
  try {
    result.textContent = 'Testing…';
    const create = (color) => {
      const canvas = document.createElement('canvas');canvas.width = 640;canvas.height = 360;
      const context = canvas.getContext('2d');let tick = 0;
      const draw = () => { context.fillStyle = color;context.fillRect(0,0,640,360);context.fillStyle = '#fff';context.fillRect((tick++ * 7) % 560,100,80,80); };
      draw();timers.push(setInterval(draw,33));const stream = canvas.captureStream(30);sources.push(stream);return stream;
    };
    const stream = await compositor.start(create('#162638'), create('#e65d20'));
    const video = document.querySelector('#test-preview');video.srcObject = stream;await video.play();
    await new Promise(resolve => setTimeout(resolve,2000));
    result.textContent = `PASS: ${video.videoWidth} × ${video.videoHeight} camera frames rendered. ${navigator.userAgent}`;
  } catch(error) { result.textContent = `FAIL: ${error.message}`; }
  finally { timers.forEach(clearInterval);compositor.stop();sources.forEach(s=>s.getTracks().forEach(t=>t.stop())); }
});
