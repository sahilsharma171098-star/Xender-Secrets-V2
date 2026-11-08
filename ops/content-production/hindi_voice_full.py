"""Free Hindi TTS batch for 24 scenes; no paid API or publishing."""
from __future__ import annotations
import json,re,time
from pathlib import Path
from itertools import combinations
from gtts import gTTS
from mutagen.mp3 import MP3

ROOT=Path(__file__).resolve().parents[2]
SRC=ROOT/"ops/content-production/mcdonalds_12min_hindi_script.md"
OUT=Path("hindi-full-output")
OUT.mkdir(exist_ok=True)
OVERRIDES={
8:"साल दो हज़ार पच्चीस के अंत में दुनिया भर में मैकडॉनल्ड्स के पैंतालीस हज़ार तीन सौ छप्पन रेस्टोरेंट थे। उनमें तैंतालीस हज़ार तीन सौ सत्रह फ्रैंचाइज़ी थे, यानी लगभग पचानवे प्रतिशत। इसका मतलब हर किचन कंपनी खुद नहीं चलाती। अलग-अलग ऑपरेटर दुकानें चलाते हैं, और ब्रांड के तय नियम पूरे नेटवर्क को जोड़ते हैं।",
13:"साल दो हज़ार पच्चीस में फ्रैंचाइज़ी रेंट से करीब दस दशमलव चार चार अरब डॉलर और रॉयल्टी से करीब छह दशमलव शून्य एक आठ अरब डॉलर आए। कुल फ्रैंचाइज़ी आय लगभग सोलह दशमलव पाँच चार आठ अरब डॉलर रही। ये राजस्व है, मुनाफा नहीं। पूरी किराये की रकम शुद्ध लाभ नहीं होती।",
}

def read_script(raw):
    blocks=re.split(r"(?=^## Scene \d{2} —)",raw,flags=re.M)
    output=[]
    for part in blocks:
        if not part.startswith("## Scene "):continue
        lines=[x.strip() for x in part.splitlines()]
        spoken=[]
        for i,line in enumerate(lines):
            if line.startswith("**Visual:**"):
                for nxt in lines[i+1:]:
                    if not nxt or nxt.startswith("#"):break
                    spoken.append(nxt)
                break
        if not spoken:raise ValueError("Missing scene narration "+lines[0])
        output.append(" ".join(spoken))
    if len(output)!=24:raise ValueError("Expected 24 scenes; got "+str(len(output)))
    return output

def shorten(text,word_cap):
    sent=[x.strip() for x in re.findall(r"[^।!?]+[।!?]?",text) if x.strip()]
    if len(text.split())<=word_cap:return text
    middle=list(range(1,len(sent)-1))
    choices=[]
    for n in range(len(middle)+1):
        for picks in combinations(middle,n):
            indices=[0,*picks,len(sent)-1]
            words=sum(len(sent[j].split()) for j in indices)
            if words<=word_cap:
                info=sum(bool(re.search(r"साल|किराय|फ्रैंचाइज़ी|राजस्व|रॉयल्टी|बिक्री|कंपनी|अरब|हज़ार",sent[j])) for j in indices)
                choices.append((words,info,indices))
    if choices:
        chosen=max(choices,key=lambda v:(v[0],v[1]))[2]
        return " ".join(sent[j] for j in chosen)
    result=[sent[0]]; remaining=word_cap-len(sent[0].split())
    for item in sent[1:]:
        w=len(item.split())
        if w<=remaining:result.append(item);remaining-=w
    return " ".join(result)

def synth(i,text):
    wordcap=64
    history=[]
    while wordcap>=28:
        spoken=shorten(text,wordcap)
        path=OUT/f"scene_{i:02d}.mp3"
        for attempt in range(4):
            try:
                gTTS(text=spoken,lang="hi",tld="co.in",slow=False).save(str(path))
                break
            except Exception:
                if attempt==3:raise
                time.sleep(2+3*attempt)
        duration=float(MP3(str(path)).info.length)
        history.append({"words":len(spoken.split()),"duration":round(duration,2)})
        print(f"Scene {i}/24: {len(spoken.split())} words, {duration:.2f}s",flush=True)
        if 5.0<duration<=28.9:
            return {"scene":i,"original":text,"spoken":spoken,"filename":path.name,"seconds":round(duration,3),"history":history,"approved":False}
        wordcap-=5
    raise RuntimeError("Scene %d narration cannot fit without clipping: %s"%(i,history))

def main():
    paragraphs=read_script(SRC.read_text(encoding="utf-8"))
    manifest=[]
    for i,p in enumerate(paragraphs,1):
        manifest.append(synth(i,OVERRIDES.get(i,p)))
        (OUT/"manifest.json").write_text(json.dumps({"provider":"gTTS / Google Hindi (not TTSMaker)","language":"hi","duration_target_seconds":720,"publish_allowed":False,"voice_quality":"unreviewed","segments":manifest},ensure_ascii=False,indent=2),encoding="utf-8")
    (OUT/"README.txt").write_text("24 Hindi narration clips with per-scene shortened scripts and durations. Quality review needed; do not auto publish. No money spent.\n",encoding="utf-8")
    print("SUCCESS: generated all 24 Hindi clips",flush=True)

if __name__=="__main__": main()
