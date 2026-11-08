"""Direct free Hugging Face Gradio call to AI4Bharat Hindi model.
This bypasses a broken server API metadata endpoint, not access rules.
No payment, login bypass, cloning, or publishing.
"""
import requests,json,urllib.parse,re,os,time
from pathlib import Path
BASE="https://ai4bharat-indic-parler-tts.hf.space"
out=Path("indic-parler-audition")
out.mkdir(exist_ok=True)
TEXT=("ज़रा सोचिए, मैकडॉनल्ड्स जैसे बड़े ब्रांड की असली ताक़त कहाँ छिपी है? "
"क्या सिर्फ़ बर्गर बेचने में? या फिर उस जगह में, जहाँ ये बर्गर बिकता है? "
"दरअसल, इस कहानी में फ़्रैंचाइज़ी, किराया और रॉयल्टी की एक दिलचस्प भूमिका है। "
"जब आप एक बर्गर खरीदते हैं, तो आपका पैसा कई हिस्सों में बँटता है। "
"और यही समझना है कि इस कंपनी ने हज़ारों रेस्टोरेंट के साथ इतना बड़ा बिज़नेस कैसे खड़ा किया।")
DESCRIPTION=("Rohit speaks in Hindi with an expressive warm articulate Indian male voice. "
"He tells a captivating business documentary in natural conversational rhythm "
"with curiosity, nuanced emphasis, varied pitch and realistic pauses. "
"The recording is very clear studio-quality audio, with no background noise.")
session=requests.Session()
resp=session.get(BASE+"/config",timeout=40)
print("CONFIG",resp.status_code, resp.text[:150],flush=True)
resp.raise_for_status()
cfg=resp.json()
deps=cfg.get("dependencies",[])
print("DEPENDENCIES",[(d.get('api_name'),len(d.get("inputs") or []),d.get('queue')) for d in deps],flush=True)
apis=[d for d in deps if "generate_finetuned" in str(d.get("api_name",""))]
if not apis:apis=[d for d in deps if "generate" in str(d.get("api_name",""))]
if not apis:raise RuntimeError("No free public generation endpoint")
d=apis[0]
name=d["api_name"]
if name.startswith("/"):name=name[1:]
param_count=len(d.get("inputs") or [])
args=[TEXT,DESCRIPTION]
if param_count==3:args.append(5.0)
print("CALL",name,"PARAMS",param_count,flush=True)
data={"data":args}
url=BASE+"/gradio_api/call/"+name
r=session.post(url,json=data,timeout=60)
print("SUBMIT",r.status_code,r.text[:1000],flush=True)
if r.status_code==404:
    url=BASE+"/call/"+name
    r=session.post(url,json=data,timeout=60)
    print("ALT SUBMIT",r.status_code,r.text[:1000],flush=True)
r.raise_for_status()
j=r.json()
event_id=j.get("event_id")
if not event_id:raise RuntimeError("No event_id")
qurl=url+"/"+event_id
print("WAITING",qurl,flush=True)
last=None
with session.get(qurl,stream=True,timeout=(30,400)) as res:
    res.raise_for_status()
    typ=""
    for line in res.iter_lines(decode_unicode=True):
        if line is None:continue
        if isinstance(line,bytes):line=line.decode("utf8",errors="replace")
        if line.startswith("event: "):
            typ=line[7:]
            print("EVENT",typ,flush=True)
        if line.startswith("data: "):
            body=line[6:]
            if typ in ("error","queue_full"):
                raise RuntimeError(typ+" "+body[:1200])
            if typ in ("complete","generating"):
                last=json.loads(body)
                print("DATA",str(last)[:800],flush=True)
                if typ=="complete":break
if last is None:raise RuntimeError("No response")
(out/"result.json").write_text(json.dumps(last,ensure_ascii=False,indent=2)[:20000])
def find_file(j):
    if isinstance(j,str):
        if ".mp3" in j or ".wav" in j:return j
    if isinstance(j,dict):
        for k in ["url","path","audio","file","name"]:
            if k in j:
                v=find_file(j[k])
                if v:return v
        for v in j.values():
            v=find_file(v)
            if v:return v
    if isinstance(j,list):
        for v in j:
            v=find_file(v)
            if v:return v
    return None
p=find_file(last)
if not p:raise RuntimeError("No audio file in result")
if p.startswith("https://"):
    dl=p
elif p.startswith("/"):
    dl=BASE+p
else:
    dl=BASE+"/gradio_api/file="+urllib.parse.quote(p,safe="/")
audio=session.get(dl,timeout=90)
print("DOWNLOAD",audio.status_code,len(audio.content),audio.headers.get("Content-Type"),flush=True)
audio.raise_for_status()
if len(audio.content)<20000:raise RuntimeError("Returned audio too small")
suffix=".wav" if ".wav" in p else ".mp3"
f=out/("Xender_Indic_Parler_Hindi_Male_Audition"+suffix)
f.write_bytes(audio.content)
(out/"metadata.json").write_text(json.dumps({"model":"AI4Bharat Indic Parler-TTS","speaker":"Rohit","script":TEXT,"description":DESCRIPTION,"url_source":BASE,"usage":"audition only"},ensure_ascii=False,indent=2))
print("SUCCESS",f,flush=True)
