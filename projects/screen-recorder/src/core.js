export function chooseMime(supported) {
  return ['video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm'].find(supported) || '';
}
export function timestamp(ms) {
  const seconds = Math.floor(ms / 1000);
  return `${String(Math.floor(seconds/60)).padStart(2,'0')}:${String(seconds%60).padStart(2,'0')}`;
}
export function mixAudio(context, streams) {
  const destination = context.createMediaStreamDestination();
  const sources = streams.filter(s=>s?.getAudioTracks().length).map(stream=> {
    const source = context.createMediaStreamSource(stream);
    source.connect(destination); return source;
  });
  return {tracks: sources.length ? destination.stream.getAudioTracks() : [], dispose:()=>sources.forEach(s=>s.disconnect())};
}
export function stopStreams(streams) {
  for (const stream of streams) for (const track of stream?.getTracks() || []) track.stop();
}
