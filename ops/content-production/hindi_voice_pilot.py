#!/usr/bin/env python3
"""Zero-paid-API Hindi neural voice audition. Preview only; no publishing."""
import asyncio
import json
import os
import subprocess
from pathlib import Path
import edge_tts

TEXT = """अगली बार जब आप मैकडॉनल्ड्स जाएँ, तो सिर्फ बर्गर और फ्राइज़ पर ध्यान मत दीजिएगा। उस रेस्टोरेंट के पीछे एक दूसरा बिज़नेस भी काम कर रहा होता है। कई जगह खाना बेचने वाला ऑपरेटर अलग होता है, लेकिन मैकडॉनल्ड्स कंपनी को किराया और रॉयल्टी मिलती है। सवाल है—एक बर्गर ब्रांड प्रॉपर्टी और कॉन्ट्रैक्ट से इतनी बड़ी कमाई कैसे करता है? आइए, ग्राहक के ऑर्डर से शुरू करके पूरा पैसों का रास्ता समझते हैं।"""

async def main():
    Path("hindi-voice-output").mkdir(exist_ok=True)
    voice = "hi-IN-MadhurNeural"
    player = edge_tts.Communicate(TEXT, voice=voice, rate="-2%", pitch="+0Hz")
    await player.save("hindi-voice-output/audition_hindi_madhur.mp3")
    out = subprocess.check_output(["ffprobe","-v","error","-show_entries","format=duration","-of","default=nw=1:nk=1","hindi-voice-output/audition_hindi_madhur.mp3"], text=True).strip()
    print("Voice audition generated:", out, "seconds; voice:", voice)
    Path("hindi-voice-output/metadata.json").write_text(json.dumps({"voice":voice,"duration_sec":float(out),"source":"Edge neural TTS (not TTSMaker)","language":"hi-IN","scope":"audition only, do not publish"},indent=2))
if __name__ == "__main__":
    asyncio.run(main())
