import test from 'node:test';
import assert from 'node:assert/strict';

// Deterministic media/DOM doubles exercise real recorder.js event handlers.
// They validate orchestration; they do not simulate browser permissions or encoders.
async function harness(t, {denyDisplay=false, denyMic=false, camera=false, failCanvas=false, chrome=false}={}) {
  const saved = new Map();
  function set(name, value) { saved.set(name,Object.getOwnPropertyDescriptor(globalThis,name));Object.defineProperty(globalThis,name,{value,writable:true,configurable:true}); }
  t.after(()=>{for(const [name,desc] of saved){if(desc)Object.defineProperty(globalThis,name,desc);else delete globalThis[name];}});
  const elements = new Map();
  function element() {return {disabled:false,hidden:false,checked:false,textContent:'',value:'',children:[],replaceChildren(){this.children=[];},append(child){this.children.push(child);}};}
  const ids=['audioOption','audio','captureHint','status','start','mic','cam','pause','stop','mark','note','result','markers','timer','preview','empty','playback','download','downloadNotes'];
  for(const id of ids)elements.set(id,element());
  const $=id=>elements.get(id);$('mic').checked=true;$('cam').checked=camera;
  let now=100,recorder;const calls=[],tracks=[];const urls=new Map();let nextUrl=0;
  function track(kind) {const events={};const tr={kind,readyState:'live',stops:0,stop(){this.stops++;this.readyState='ended';},addEventListener(name,fn){events[name]=fn;},end(){this.readyState='ended';events.ended?.();}};tracks.push(tr);return tr;}
  class Stream {constructor(items){this.items=items;}getTracks(){return this.items;}getAudioTracks(){return this.items.filter(x=>x.kind==='audio');}getVideoTracks(){return this.items.filter(x=>x.kind==='video');}}
  const display=new Stream([track('video'), ...(chrome ? [track('audio')] : [])]);
  let audioClosed=false;
  set('AudioContext',class {createMediaStreamDestination(){return {stream:new Stream([track('audio')])};}createMediaStreamSource(){return {connect(){},disconnect(){}};}async resume(){}async close(){audioClosed=true;}});
  set('performance',{now:()=>now});set('window',{confirm:()=>true,addEventListener(){}});
  set('navigator',{mediaDevices:{async getDisplayMedia(options){calls.push(options);if(denyDisplay)throw Error('Picker cancelled');return display;},async getUserMedia(options){if(options.audio){if(denyMic)throw Error('Mic denied');return new Stream([track('audio')]);}return new Stream([track('video')]);}}});
  set('document',{getElementById:$,createElement(tag){if(tag==='video')return {...element(),videoWidth:1280,videoHeight:720,async play(){},pause(){}};if(tag==='canvas')return {getContext(){if(failCanvas)throw Error('Canvas unavailable');return {drawImage(){},save(){},restore(){},beginPath(){},arc(){},clip(){}};},captureStream(){return new Stream([track('video')]);}};return element();}});
  set('MediaStream',Stream);
  set('MediaRecorder',class {static isTypeSupported(type){return type.includes('vp8');}constructor(stream,options){this.stream=stream;this.mimeType=options.mimeType;this.state='inactive';this.stopCount=0;recorder=this;}start(){this.state='recording';}pause(){this.state='paused';}resume(){this.state='recording';}stop(){this.stopCount++;this.state='inactive';this.ondataavailable({data:new Blob(['video'],{type:this.mimeType})});this.onstop();}});
  set('URL',{createObjectURL(blob){const key=`blob:${++nextUrl}`;urls.set(key,blob);return key;},revokeObjectURL(key){urls.delete(key);}});
  set('requestAnimationFrame',()=>1);set('cancelAnimationFrame',()=>{});set('setInterval',()=>1);set('clearInterval',()=>{});
  await import(`../${chrome?'dist/chrome':'src'}/recorder.js?test=${Math.random()}`);
  return {$,calls,tracks,display,urls,get audioClosed(){return audioClosed;},get recorder(){return recorder;},advance(ms){now+=ms;},async flush(){await new Promise(setImmediate);}};
}
test('Firefox requests video only and records the microphone as its audio track',async t=>{const h=await harness(t);await h.$('start').onclick();assert.equal(h.$('audioOption').hidden,true);assert.equal(h.calls[0].audio,false);assert.equal('systemAudio' in h.calls[0],false);assert.equal(h.recorder.stream.getAudioTracks().length,1);h.$('stop').onclick();await h.flush();assert.equal(h.$('result').hidden,false);assert.match(h.$('download').download,/\.webm$/);assert.ok(h.tracks.every(tr=>tr.readyState==='ended'));});
test('mic permission failure stops screen sharing and restores retry UI',async t=>{const h=await harness(t,{denyMic:true});await h.$('start').onclick();assert.equal(h.display.getVideoTracks()[0].readyState,'ended');assert.equal(h.$('start').disabled,false);assert.match(h.$('status').textContent,/Mic denied/);});
test('cancelled picker leaves no active session and permits a retry',async t=>{const h=await harness(t,{denyDisplay:true});await h.$('start').onclick();assert.equal(h.$('start').disabled,false);assert.equal(h.$('stop').disabled,true);assert.match(h.$('status').textContent,/Picker cancelled/);});
test('native stop sharing and repeated stop produce one completed download',async t=>{const h=await harness(t);await h.$('start').onclick();h.display.getVideoTracks()[0].end();h.$('stop').onclick();await h.flush();assert.equal(h.recorder.stopCount,1);assert.equal(h.$('result').hidden,false);assert.ok(h.tracks.every(tr=>tr.readyState==='ended'));});
test('pause duration is excluded from timestamp notes and stop duration',async t=>{const h=await harness(t);await h.$('start').onclick();h.advance(2000);h.$('pause').onclick();h.advance(9000);h.$('pause').onclick();h.advance(1000);h.$('note').value='<img src=x onerror=alert(1)> ✓';h.$('mark').onclick();assert.match(h.$('markers').children[0].textContent,/00:03 — <img/);h.$('stop').onclick();await h.flush();const notes=await h.urls.get(h.$('downloadNotes').href).text();assert.match(notes,/Duration: 00:03/);assert.match(notes,/\[00:03\].*✓/);});
test('webcam startup failure releases screen, microphone and camera',async t=>{const h=await harness(t,{camera:true,failCanvas:true});await h.$('start').onclick();assert.equal(h.tracks.length,3);assert.ok(h.tracks.every(tr=>tr.readyState==='ended'));assert.match(h.$('status').textContent,/Canvas unavailable/);});
test('screen-only recording contains no fabricated audio track',async t=>{const h=await harness(t);h.$('mic').checked=false;await h.$('start').onclick();assert.equal(h.recorder.stream.getAudioTracks().length,0);h.$('stop').onclick();await h.flush();});

test('Chrome requests available display audio, mixes with mic and closes mixer',async t=>{const h=await harness(t,{chrome:true});await h.$('start').onclick();assert.equal(h.$('audioOption').hidden,false);assert.equal(h.calls[0].audio,true);assert.equal(h.calls[0].systemAudio,'include');assert.equal(h.recorder.stream.getAudioTracks().length,1);h.$('stop').onclick();await h.flush();assert.equal(h.audioClosed,true);assert.ok(h.tracks.every(tr=>tr.readyState==='ended'));});
