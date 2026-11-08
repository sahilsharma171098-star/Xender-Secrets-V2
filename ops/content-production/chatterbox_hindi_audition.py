"""Free third-party Chatterbox Hindi demo voice audition, no reference voice cloning."""
from __future__ import annotations
import json, os, re, sys, time, urllib.parse
from pathlib import Path
import requests

URL="https://resembleai-chatterbox-multilingual-tts.hf.space"
OUT=Path("chatterbox-hindi-audition")
OUT.mkdir(parents=True,exist_ok=True)
TEXT=(
    "मैकडॉनल्ड्स की असली कमाई आखिर कहाँ से होती है? "
    "सिर्फ बर्गर बेचने से? नहीं। इस कहानी के पीछे फ्रैंचाइज़ी, किराया और सही लोकेशन का बड़ा खेल है। "
    "आज हम समझेंगे कि एक साधारण रेस्टोरेंट की जगह इतनी कीमती कैसे बन जाती है।"
)

sess=requests.Session()
sess.headers["User-Agent"]="XenderVoiceAudition/1.0 (noncommercial sample)"
res=sess.get(URL+"/config",timeout=40)
print("CONFIG status",res.status_code,"length",len(res.content),flush=True)
res.raise_for_status()
config=res.json()
components={c["id"]:c for c in config.get("components",[])}
deps=config.get("dependencies",[])
for dep in deps:
    if dep.get("api_name"):
        print("API:",dep.get("api_name"),"inputs",[(i,components.get(i,{}).get("type"),components.get(i,{}).get("props",{}).get("label")) for i in dep.get("inputs") or []],flush=True)
candidates=[d for d in deps if re.search(r"(generate|synth|infer|run|predict)",str(d.get("api_name") or ""),re.I)]
if not candidates: raise RuntimeError("No public generate endpoint")
d=candidates[0]
name=str(d["api_name"]).lstrip("/")
args=[]
for k,cid in enumerate(d.get("inputs") or []):
    comp=components.get(cid,{})
    props=comp.get("props",{})
    label=str(props.get("label") or "").lower()
    typ=str(comp.get("type") or "").lower()
    value=props.get("value")
    if re.search(r"(text|script|sentence|content|prompt)",label) and "audio" not in label:
        value=TEXT
    elif "language" in label:
        choices=props.get("choices") or []
        if choices:
            vals=[x[1] if isinstance(x,list) and len(x)>1 else x for x in choices]
            value=next((v for v in vals if str(v).lower() in ("hindi","hi","हिन्दी","हिंदी")),value)
        else:value="Hindi"
    elif "reference" in label or "audio" in label or "voice prompt" in label:
        value=None
    elif "exaggeration" in label or "emotion" in label:
        value=.74
    elif "cfg" in label or "pace" in label:
        value=.32
    elif "seed" in label:
        value=42
    elif "temperature" in label:
        value=.82
    elif "top_p" in label:
        value=.9
    if value is None and typ in ("slider","number"): value=props.get("minimum",0)
    args.append(value)
print("Call:",name,"ARGS:",[str(a)[:110] for a in args],flush=True)
(OUT/"endpoint.json").write_text(json.dumps({"name":name,"args":args,"inputs":d.get("inputs")},ensure_ascii=False,indent=2))
endpoint=URL+"/gradio_api/call/"+name
r=sess.post(endpoint,json={"data":args},timeout=60)
print("SUBMIT",r.status_code,r.text[:600],flush=True)
if r.status_code==404:
    endpoint=URL+"/call/"+name
    r=sess.post(endpoint,json={"data":args},timeout=60)
    print("ALT SUBMIT",r.status_code,r.text[:600],flush=True)
r.raise_for_status()
eid=r.json().get("event_id")
if not eid:raise RuntimeError("Missing Gradio event ID")
last=None
etype=""
with sess.get(endpoint+"/"+eid,stream=True,timeout=(30,360)) as stream:
    stream.raise_for_status()
    for line in stream.iter_lines(decode_unicode=True):
        if not line: continue
        if isinstance(line,bytes):line=line.decode("utf-8",errors="replace")
        if line.startswith("event: "):
            etype=line[7:];print("EVENT",etype,flush=True)
        elif line.startswith("data: "):
            if etype in ("error","queue_full"):raise RuntimeError(etype+" "+line[6:][:1200])
            if etype in ("complete","generating"):
                last=json.loads(line[6:])
                print("PAYLOAD",str(last)[:400],flush=True)
                if etype=="complete":break
if last is None:raise RuntimeError("No audio result")
(OUT/"result.json").write_text(json.dumps(last,ensure_ascii=False,indent=2)[:15000])
def audio_ref(obj):
    if isinstance(obj,dict):
        v=obj.get("url")
        if isinstance(v,str) and ("/file=" in v or re.search(r"\.(wav|mp3|flac|ogg|m4a)(\?|$)",v)):
            return v
        p=obj.get("path")
        if isinstance(p,str) and ("/tmp/" in p or "/file" in p):return p
        for v in obj.values():
            x=audio_ref(v)
            if x:return x
    elif isinstance(obj,list):
        for v in obj:
            x=audio_ref(v)
            if x:return x
    elif isinstance(obj,str) and re.search(r"\.(wav|mp3|flac|ogg|m4a)(\?|$)",obj):return obj
    return None
path=audio_ref(last)
if not path:raise RuntimeError("No audio file returned by public demo")
urls=[path] if path.startswith("https://") else []
if path.startswith("/tmp/"):
    urls=[URL+"/gradio_api/file="+urllib.parse.quote(path,safe="/")]
elif path.startswith("/"):urls.append(URL+path)
audio=None
for url in urls:
    rr=sess.get(url,timeout=90)
    print("FETCH audio",rr.status_code,"size",len(rr.content),"mimetype",rr.headers.get("content-type"),flush=True)
    if rr.ok and len(rr.content)>25000 and "html" not in rr.headers.get("content-type",""):
        audio=rr;break
if audio is None:raise RuntimeError("Audio download missing or invalid")
extension=".wav" if (audio.content[:4]==b"RIFF" or "wav" in str(audio.headers.get("content-type",""))) else ".mp3"
dest=OUT/("Xender_Chatterbox_Hindi_Expressive_Test"+extension)
dest.write_bytes(audio.content)
print("SUCCESS",str(dest),len(audio.content),flush=True)
(OUT/"metadata.json").write_text(json.dumps({"engine":"ResembleAI Chatterbox Hindi","sample_text":TEXT,"reference_audio":None,"human_listening_approval":"pending","noncloned_synthetic_voice":True},ensure_ascii=False,indent=2))
