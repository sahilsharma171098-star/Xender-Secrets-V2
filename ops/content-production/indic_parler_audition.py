"""Generate a strictly free, original Hindi documentary TTS audition using AI4Bharat's public demo.
No reference audio is submitted; no voice cloning or publishing.
"""
from pathlib import Path
import os, json, shutil, traceback
from gradio_client import Client

OUTPUT = Path("indic-parler-audition")
OUTPUT.mkdir(exist_ok=True)
TEXT = (
"ज़रा सोचिए, मैकडॉनल्ड्स जैसे बड़े ब्रांड की असली ताक़त कहाँ छिपी है? "
"क्या सिर्फ़ बर्गर बेचने में? या फिर उस जगह में, जहाँ ये बर्गर बिकता है? "
"दरअसल, इस कहानी में फ़्रैंचाइज़ी, किराया और रॉयल्टी की एक दिलचस्प भूमिका है। "
"जब आप एक बर्गर खरीदते हैं, तो आपका पैसा कई हिस्सों में बँटता है। "
"और यही समझना है कि इस कंपनी ने हज़ारों रेस्टोरेंट के साथ इतना बड़ा बिज़नेस कैसे खड़ा किया।"
)
DESCRIPTION = (
"Rohit speaks in Hindi with an expressive, warm, articulate Indian male voice. "
"He tells an engaging business documentary story in a natural conversational rhythm, "
"with curiosity, nuanced emphasis on important words and realistic pauses between questions. "
"His tone is calm but captivating, with slight emotional variation and a measured medium pace. "
"The recording has very clear studio-quality audio, with no background noise."
)
def audio_file(result):
    if isinstance(result, str): return result
    if isinstance(result, dict):
        for k in ("path","name","url","audio","file"):
            if k in result:
                p=audio_file(result[k])
                if p:return p
    if isinstance(result, (tuple,list)):
        for part in result:
            p=audio_file(part)
            if p:return p
    return None

def main():
    client=Client("ai4bharat/indic-parler-tts", verbose=True)
    api=client.view_api(return_format="dict")
    (OUTPUT/"api.json").write_text(json.dumps(api,default=str,indent=2)[:40000])
    print("API DETAIL:",str(api)[:12000],flush=True)
    named=api.get("named_endpoints",{}) if isinstance(api,dict) else {}
    choices=[x for x in named if "finetuned" in x.lower() or "generate" in x.lower()]
    if not choices:choices=list(named)
    if not choices:raise RuntimeError("No Gradio endpoints exposed")
    last=None
    for ep in choices[:4]:
        print("Attempting endpoint",ep,flush=True)
        try:
            info=named[ep]
            n=len(info.get("parameters",[])) if isinstance(info,dict) else 2
            args=[TEXT,DESCRIPTION]
            if n==3:args.append(5.0)
            result=client.predict(*args,api_name=ep)
            print("Result",str(result)[:500],flush=True)
            p=audio_file(result)
            if not p:raise RuntimeError("No playable audio returned")
            if p.startswith(("http://","https://")):
                import requests
                r=requests.get(p,timeout=60);r.raise_for_status()
                output=OUTPUT/"indic_parler_rohit_hindi.mp3"
                output.write_bytes(r.content)
            else:
                src=Path(p)
                if not src.is_file():raise RuntimeError("Audio file absent: "+p)
                output=OUTPUT/("indic_parler_rohit_hindi"+src.suffix)
                shutil.copyfile(src,output)
            if output.stat().st_size<15000:raise RuntimeError("Audio too small")
            (OUTPUT/"metadata.json").write_text(json.dumps({"engine":"AI4Bharat Indic Parler-TTS","voice":"Rohit","text":TEXT,"description":DESCRIPTION,"file":output.name,"status":"audition; requires user listening review; do not publish"},ensure_ascii=False,indent=2),encoding="utf-8")
            print("SUCCESS",output,output.stat().st_size,flush=True)
            return
        except Exception as e:
            print("Endpoint failed",ep,type(e).__name__,str(e)[:1200],flush=True)
            last=e
    raise last or RuntimeError("All endpoints failed")
if __name__=="__main__":
    try:main()
    except Exception:
        traceback.print_exc()
        raise
