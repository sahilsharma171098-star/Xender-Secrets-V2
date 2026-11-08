#!/usr/bin/env python3
"""Free Hindi voice trial only. Does not publish, edit production, or spend API credits."""
import json
import subprocess
import sys
from pathlib import Path

TEXT = """अगली बार जब आप मैकडॉनल्ड्स जाएँ, तो सिर्फ बर्गर और फ्राइज़ पर ध्यान मत दीजिएगा। उस रेस्टोरेंट के पीछे एक दूसरा बिज़नेस भी काम कर रहा होता है। कई जगह खाना बेचने वाला ऑपरेटर अलग होता है, लेकिन मैकडॉनल्ड्स कंपनी को किराया और रॉयल्टी मिलती है। सवाल है—एक बर्गर ब्रांड प्रॉपर्टी और कॉन्ट्रैक्ट से इतनी बड़ी कमाई कैसे करता है? आइए, ग्राहक के ऑर्डर से शुरू करके पूरा पैसों का रास्ता समझते हैं।"""

def main():
    subprocess.run([sys.executable,"-m","pip","install","--quiet","gTTS==2.5.4", "mutagen==1.47.0"],check=True)
    from gtts import gTTS
    output=Path("hindi-voice-output")
    output.mkdir(exist_ok=True)
    filename=output/"audition_hindi_google.mp3"
    gTTS(text=TEXT,lang="hi",slow=False,tld="co.in").save(str(filename))
    from mutagen.mp3 import MP3
    dur=float(MP3(str(filename)).info.length)
    (output/"metadata.json").write_text(json.dumps({"voice":"Google Hindi TTS","duration_sec":dur,"source":"gTTS (not TTSMaker)","language":"hi","scope":"audition only, do not publish","quality":"must be listened to; synthesized audio is not automatically approved"},indent=2))
    print(f"SUCCESS: Free Hindi audition {filename} duration={dur:.2f}s")
if __name__=="__main__":
    main()
