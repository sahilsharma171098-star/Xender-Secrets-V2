from pathlib import Path
import soundfile as sf
from kokoro_onnx import Kokoro
from misaki.espeak import EspeakG2P

out = Path("hindi-kokoro-auditions")
out.mkdir(exist_ok=True)
text = "अगली बार जब आप मैकडॉनल्ड्स जाएँ, तो सिर्फ बर्गर मत देखिए। एक बड़ी कहानी उस रेस्टोरेंट की जगह, किराये और फ्रैंचाइज़ी मॉडल में छिपी है। आखिर बर्गर बेचने वाली कंपनी, रियल एस्टेट से इतना पैसा कैसे कमाती है? आज हम आसान भाषा में समझेंगे।"
g2p = EspeakG2P(language="hi")
phonemes, _ = g2p(text)
print("Phonemes", len(phonemes), flush=True)
tts = Kokoro("model/kokoro-v1.0.fp16.onnx", "model/voices-v1.0.bin")
for voice in ("hm_omega", "hm_psi"):
    samples, sr = tts.create(phonemes, voice=voice, speed=0.94, is_phonemes=True)
    sf.write(out / (voice + ".wav"), samples, sr)
    print(voice, len(samples) / sr, flush=True)
print("AUDIO_GENERATED", flush=True)
