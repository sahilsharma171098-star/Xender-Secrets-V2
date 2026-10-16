import {chooseMime, timestamp, mixAudio, stopStreams} from './core.js';
import {platform} from './platform.js';

const $ = id => document.getElementById(id);
const MAX_BYTES = 250 * 1024 * 1024;
let session = null;
let videoURL = '';
let notesURL = '';

$('audioOption').hidden = !platform.displayAudio;
$('audio').checked = platform.displayAudio;
$('captureHint').textContent = platform.displayAudio
  ? 'Audio availability depends on your OS and what you share. Select a tab and enable Share audio when available. Keep this recorder tab open.'
  : 'Firefox records your screen or window with optional microphone audio. System and tab audio are not captured. Keep this recorder tab open; keep it visible when using the webcam bubble.';

function status(message) { $('status').textContent = message; }
function controls(active) {
  for (const id of ['start', 'mic', 'cam', 'audio']) $(id).disabled = active;
  for (const id of ['pause', 'stop', 'mark', 'note']) $(id).disabled = !active;
}
function elapsed(s) {
  return s.duration ?? Math.max(0, performance.now() - s.started - s.pausedMs -
    (s.pauseAt !== null ? performance.now() - s.pauseAt : 0));
}
async function release(s) {
  clearInterval(s.timer);
  cancelAnimationFrame(s.frame);
  stopStreams(s.streams);
  s.mix?.dispose();
  if (s.context) await s.context.close().catch(() => {});
  for (const video of s.inputs) { video.pause(); video.srcObject = null; }
  $('preview').srcObject = null;
}
async function makeVideo(stream, s) {
  const video = document.createElement('video');
  video.muted = true;
  video.playsInline = true;
  video.srcObject = stream;
  s.inputs.push(video);
  await video.play();
  if (!video.videoWidth || !video.videoHeight) throw Error('Video source has no usable frames.');
  return video;
}
async function composeCamera(screen, camera, s) {
  const webcam = await makeVideo(camera, s);
  const canvas = document.createElement('canvas');
  const scale = Math.min(1, 1920 / screen.videoWidth, 1080 / screen.videoHeight);
  canvas.width = Math.max(2, Math.round(screen.videoWidth * scale));
  canvas.height = Math.max(2, Math.round(screen.videoHeight * scale));
  const ctx = canvas.getContext('2d');
  const draw = () => {
    ctx.drawImage(screen, 0, 0, canvas.width, canvas.height);
    const r = Math.max(28, Math.round(canvas.width * .075));
    const x = canvas.width - r - 24;
    const y = canvas.height - r - 24;
    ctx.save();
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.clip();
    const size = Math.min(webcam.videoWidth, webcam.videoHeight);
    ctx.drawImage(webcam, (webcam.videoWidth - size) / 2,
      (webcam.videoHeight - size) / 2, size, size, x - r, y - r, 2 * r, 2 * r);
    ctx.restore();
    s.frame = requestAnimationFrame(draw);
  };
  draw();
  const composed = canvas.captureStream(30);
  s.streams.push(composed);
  return composed.getVideoTracks()[0];
}

async function start() {
  if (session) return;
  if (videoURL && !window.confirm('Start a new recording? Download the current video first; the preview will be replaced.')) return;
  const s = {streams: [], inputs: [], chunks: [], markers: [], bytes: 0,
    pausedMs: 0, pauseAt: null, stopping: false};
  session = s;
  controls(true);
  for (const id of ['pause', 'stop', 'mark', 'note']) $(id).disabled = true;
  $('result').hidden = true;
  $('markers').replaceChildren();
  $('pause').textContent = 'Pause';
  $('timer').textContent = '00:00';
  status(`Choose what to share in ${platform.name}’s picker…`);
  try {
    // Call directly from this user gesture. Never await other work first.
    const display = await navigator.mediaDevices.getDisplayMedia({
      video: {frameRate: 30},
      audio: platform.displayAudio && $('audio').checked,
      ...(platform.displayAudio ? {systemAudio: 'include'} : {})
    });
    s.streams.push(display);
    if (!display.getVideoTracks().length) throw Error('No screen video was provided.');
    let microphone, camera;
    if ($('mic').checked) {
      microphone = await navigator.mediaDevices.getUserMedia({
        audio: {echoCancellation: true, noiseSuppression: true}, video: false
      });
      s.streams.push(microphone);
    }
    if ($('cam').checked) {
      camera = await navigator.mediaDevices.getUserMedia({
        video: {width: 640, height: 480}, audio: false
      });
      s.streams.push(camera);
    }
    if (display.getVideoTracks()[0].readyState === 'ended') {
      throw Error('Screen sharing ended before recording started.');
    }
    const screen = await makeVideo(display, s);
    const videoTrack = camera ? await composeCamera(screen, camera, s)
      : display.getVideoTracks()[0];
    const audioSources = [display, microphone].filter(stream => stream?.getAudioTracks().length);
    let audioTracks = [];
    if (audioSources.length === 1) audioTracks = audioSources[0].getAudioTracks();
    if (audioSources.length > 1) {
      s.context = new AudioContext();
      await s.context.resume();
      s.mix = mixAudio(s.context, audioSources);
      audioTracks = s.mix.tracks;
    }
    const output = new MediaStream([videoTrack, ...audioTracks]);
    s.streams.push(output);
    const mimeType = chooseMime(type => MediaRecorder.isTypeSupported(type));
    s.recorder = new MediaRecorder(output, mimeType ? {mimeType} : {});
    s.recorder.ondataavailable = event => {
      if (!event.data.size) return;
      s.chunks.push(event.data);
      s.bytes += event.data.size;
      if (s.bytes >= MAX_BYTES && !s.stopping) { s.limit = true; stop(); }
    };
    s.recorder.onerror = event => {
      s.error = event.error?.message || 'Recording failed.';
      stop();
    };
    s.recorder.onstop = () => finish(s);
    display.getVideoTracks()[0].addEventListener('ended', () => {
      if (session === s) stop();
    }, {once: true});
    $('preview').srcObject = output;
    $('empty').hidden = true;
    s.recorder.start(1000);
    s.started = performance.now();
    controls(true);
    s.timer = setInterval(() => { $('timer').textContent = timestamp(elapsed(s)); }, 250);
    const screenAudio = display.getAudioTracks().length ? 'Screen/tab audio included.'
      : platform.displayAudio && $('audio').checked ? 'No screen/tab audio was provided.' : '';
    status(`Recording. ${screenAudio} ${microphone ? 'Microphone included.' : 'Microphone off.'}`);
  } catch (error) {
    await release(s);
    session = null;
    controls(false);
    $('result').hidden = !videoURL;
    $('empty').hidden = false;
    status(`Could not start: ${error.message}. Check permissions and try again.`);
  }
}
function stop() {
  const s = session;
  if (!s || s.stopping) return;
  s.duration = elapsed(s);
  s.stopping = true;
  for (const id of ['stop', 'pause', 'mark', 'note']) $(id).disabled = true;
  status('Preparing your download…');
  if (s.recorder && s.recorder.state !== 'inactive') s.recorder.stop();
  else if (s.started !== undefined) finish(s);
}
async function finish(s) {
  if (s.finished) return;
  s.finished = true;
  const duration = elapsed(s);
  await release(s);
  // Preserve the last successful download if a new recording produced no data.
  if (s.chunks.length) {
    URL.revokeObjectURL(videoURL);
    URL.revokeObjectURL(notesURL);
    const blob = new Blob(s.chunks, {type: s.recorder.mimeType || s.chunks[0].type || 'video/webm'});
    videoURL = URL.createObjectURL(blob);
    const extension = blob.type.includes('mp4') ? 'mp4' : 'webm';
    const name = `xender-recording-${new Date().toISOString().replace(/[:.]/g, '-')}`;
    $('playback').src = videoURL;
    $('download').href = videoURL;
    $('download').download = `${name}.${extension}`;
    const notes = `Xender recording\nDuration: ${timestamp(duration)}\n\n${
      s.markers.map(m => `[${timestamp(m.time)}] ${m.text}`).join('\n') || 'No timestamp notes.'}\n`;
    notesURL = URL.createObjectURL(new Blob([notes], {type: 'text/plain'}));
    $('downloadNotes').href = notesURL;
    $('downloadNotes').download = `${name}-notes.txt`;
    status(s.error ? `Recording ended with an error: ${s.error}. Download the available video; it may be incomplete.`
      : s.limit ? 'Stopped at the 250 MiB memory limit. Download before starting again.'
      : 'Recording ready. Download your video and notes.');
  } else status('No video data was captured.');
  $('result').hidden = !videoURL;
  session = null;
  controls(false);
  $('timer').textContent = timestamp(duration);
  $('empty').hidden = false;
}
$('start').onclick = start;
$('stop').onclick = stop;
$('pause').onclick = () => {
  const s = session;
  if (!s || s.stopping) return;
  if (s.recorder.state === 'recording') {
    s.recorder.pause();
    s.pauseAt = performance.now();
    $('pause').textContent = 'Resume';
    status('Paused. Microphone and camera remain active until you stop.');
  } else if (s.recorder.state === 'paused') {
    s.recorder.resume();
    s.pausedMs += performance.now() - s.pauseAt;
    s.pauseAt = null;
    $('pause').textContent = 'Pause';
    status('Recording resumed.');
  }
};
function addNote() {
  const s = session;
  const text = $('note').value.trim();
  if (!s || !text || s.stopping) return;
  const time = elapsed(s);
  s.markers.push({time, text});
  const li = document.createElement('li');
  li.textContent = `${timestamp(time)} — ${text}`;
  $('markers').append(li);
  $('note').value = '';
}
$('mark').onclick = addNote;
$('note').onkeydown = event => { if (event.key === 'Enter') addNote(); };
window.addEventListener('beforeunload', event => {
  if (session || videoURL) { event.preventDefault(); event.returnValue = ''; }
});
