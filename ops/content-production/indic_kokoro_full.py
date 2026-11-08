"""Make 24 Hindi documentary narration scenes using open-source Kokoro, with no voice cloning or publishing."""
from __future__ import annotations
import json, os, re, sys
from pathlib import Path
import numpy as np
import soundfile as sf
from kokoro_onnx import Kokoro
from misaki.espeak import EspeakG2P

ROOT = Path(__file__).resolve().parents[2]
SCRIPT = ROOT / "ops/content-production/mcdonalds_12min_hindi_script.md"
OUT = Path("hindi-kokoro-full")
OUT.mkdir(exist_ok=True)
START = int(os.environ.get("SCENE_START","1"))
END = int(os.environ.get("SCENE_END","24"))
VOICE = os.environ.get("HINDI_VOICE","hm_omega")
SAMPLE_RATE = 24000

def read_all():
    chunks = re.split(r'(?=^## Scene \d{2} —)', SCRIPT.read_text(encoding='utf-8'), flags=re.M)
    result = []
    for chunk in chunks:
        if not chunk.startswith("## Scene "):continue
        m = re.search(r'^## Scene (\d+) —', chunk, re.M)
        t = chunk.split('**Visual:**',1)[1].split('\n',1)[1].split('\n\n',1)[0].strip()
        if not m or not t:raise RuntimeError("Scene malformed")
        result.append((int(m.group(1)),t))
    if len(result)!=24:raise RuntimeError(f"Expected 24, found {len(result)}")
    return result

def sentences(text):
    chunks = re.findall(r"[^।?!]+[।?!]?", text)
    return [x.strip() for x in chunks if x.strip()]

def trim_words(text,word_cap):
    ss = sentences(text)
    if len(text.split())<=word_cap:return text
    first=ss[0]
    chosen=[first]
    left=word_cap-len(first.split())
    for item in ss[1:]:
        words=len(item.split())
        if words <= left:
            chosen.append(item);left-=words
    if not chosen:raise RuntimeError("No sentences found")
    return " ".join(chosen)

def segments_for(text):
    # Preserve real phrase endings; never speed up or clip synthesized audio.
    parts=[]
    for s in sentences(text):
        if len(s)<=185:
            parts.append(s)
        else:
            halves=re.split(r'(?<=,) ',s)
            if len(halves)>1:
                parts.extend(halves)
            else:
                words=s.split()
                parts.extend(' '.join(words[i:i+15]) for i in range(0,len(words),15))
    return [p for p in parts if p.strip()]

def voice_audio(tts,g2p,text):
    phrase_durations=[]
    voice_samples=[]
    elapsed=0.0
    for phrase in segments_for(text):
        phonemes,_=g2p(phrase)
        if not phonemes:continue
        audio,sr=tts.create(phonemes,voice=VOICE,speed=0.98,is_phonemes=True)
        if sr!=SAMPLE_RATE:raise RuntimeError(f"sample rate={sr}")
        audio=np.asarray(audio,dtype=np.float32)
        begin=elapsed
        voice_samples.append(audio)
        elapsed += len(audio)/sr
        phrase_durations.append({"start_sec":round(begin,3),"end_sec":round(elapsed,3),"text":phrase})
        # Allow thought breaks after a completed phrase.
        pause=0.35 if any(x in phrase for x in "?!") else 0.23
        voice_samples.append(np.zeros(int(pause*sr),np.float32))
        elapsed += pause
    if not voice_samples:raise RuntimeError("Empty voice audio")
    return np.concatenate(voice_samples),phrase_durations

def main():
    all_scenes=read_all()
    tts=Kokoro("model/kokoro-v1.0.fp16.onnx","model/voices-v1.0.bin")
    g2p=EspeakG2P(language="hi")
    info=[]
    for num,original in all_scenes:
        if not (START<=num<=END):continue
        records=[]
        for cap in [65,59,53,47,41,35,29]:
            text=trim_words(original,cap)
            a,phrases=voice_audio(tts,g2p,text)
            sec=len(a)/SAMPLE_RATE
            print(f"Scene {num}: {len(text.split())} words, {sec:.2f}s, cap={cap}",flush=True)
            records.append((sec,text,a,phrases))
            if sec<=29.65:break
        eligible=[x for x in records if x[0]<=29.65]
        if not eligible:raise RuntimeError(f"Cannot time-fit scene {num} without clipping")
        best=max(eligible,key=lambda v:v[0])
        dur,text,a,phrases=best
        if dur<10:raise RuntimeError(f"Excessively short scene {num}")
        final=np.pad(a,(0,max(0,30*SAMPLE_RATE-len(a))))[:30*SAMPLE_RATE]
        name=f"scene_{num:02d}.wav"
        sf.write(OUT/name,final,SAMPLE_RATE,subtype="PCM_16")
        info.append({"scene":num,"voice":VOICE,"raw_seconds":round(dur,2),"seconds":30,
                     "original":original,"spoken":text,"file":name,"phrases":phrases})
        (OUT/f"manifest_{START:02d}_{END:02d}.json").write_text(json.dumps(info,ensure_ascii=False,indent=2),encoding="utf8")
    print("BATCH_COMPLETE",len(info),flush=True)

if __name__=="__main__":main()
