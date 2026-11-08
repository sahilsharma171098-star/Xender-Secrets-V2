# Xender Secrets — Business & Economy Shorts SOP
**Status:** ACTIVE / LOCKED STYLE v1.0
**Effective:** 2026-11-08
**Owner-approved visual reference:** `Xender_Business_Economy_McDonalds_Final.mp4` — *Why McDonald’s Makes Billions From Rent*.
**Scope:** Xender Secrets English-language faceless Business & Economy vertical Shorts, not other channels.

## The locked visual standard
- **Story:** one evidence-backed business/economy revelation (company strategy, business models, economic mechanics, money flows). US/UK English audience; insightful, cinematic, never sensationalized.
- **Duration:** 48 seconds by default, **six sequential 8-second scenes**. Hook by second 2; reveal how it works; show scale with a sourced metric; memorable closing payoff.
- **Video:** 9:16 vertical, H.264 MP4, AAC audio, 24 fps. Target **1080×1920** export; benchmark preview was **540×960** at 24 fps (not a desired maximum).
- **Art:** six consistent **cinematic AI-generated stills** (Nano Banana-style if available). A different source illustration for each scene; slow keyframed zoom/pan, subtle parallax/depth and soft cuts. Avoid static slideshow, jumpy transition effects, talking head and unrelated footage.
- **Typography/palette:** near-black/navy, warm gold/amber highlights, modest cyan/teal accents; oversized bold white uppercase 3–7-word scene headlines; small readable secondary line; top `XENDER SECRETS` + `BUSINESS / ECONOMY` label; discrete scene counts/progress. Keep all important text inside Shorts/Reels safe zones.
- **Audio:** clear natural-sounding neutral English narration, accurate captions, restrained cinematic music underneath. No clipped speech, distorted audio or abrupt endings. Prefer no-cost/local audio; don't spend on APIs without approval.
- **Truthfulness:** verify numbers/years/definitions in primary sources such as annual filings, official economic data; preserve URLs and metric periods. No invented revenue or misleading certainty; visuals are illustrations, not evidence.

## Six-scene blueprint
| # | Timing | Story objective | Example visual/headline |
|---|---|---|---|
| 1 | 0–8s | Unexpected hook | Cinematic brand/product: “NOT JUST BURGERS” |
| 2 | 8–16s | Underlying asset/system | Property/site map: “LOCATION IS POWER” |
| 3 | 16–24s | Who runs the operation | Operator/worker: “FRANCHISEES RUN STORES” |
| 4 | 24–32s | Money mechanism | Cash-flow motif: “RENT + ROYALTIES” |
| 5 | 32–40s | Verified scale | Global network + sourced percentage |
| 6 | 40–48s | Numeric or conceptual payoff | Symbolic key/contract + sourced amount |

Adapt each picture, metric and story to the new topic; do not reuse the McDonald’s business model for unrelated companies.

## Repeatable execution (OpenMontage-first)
1. **Topic and research:** Pick one documented, surprising business fact. Source each major factual claim; keep a citation sheet with URL, publication date, metric period and meaning.
2. **Script:** Write ~48 seconds of concise English narration, divided into six ~8s scenes. Hook in first two seconds; keep on-screen copy compact and synchronized.
3. **Storyboard:** Write six cinematic image prompts with cohesive lighting/lens, visual continuity, 9:16 framing and space for typography; typeset captions afterward, not inside image AI.
4. **Generate and QA images:** Prefer Nano Banana-style cinematic assets if available, but don't falsely claim a specific model was used. Check anatomy, logos, false imagery, composition, artifacting and rights.
5. **Animate via real OpenMontage:** Preferred project is https://github.com/9018/openmontage, **`pipeline_defs/animated-explainer.yaml`**; run its actual pipeline and Remotion-based image animation after capability/cost checks. Never claim OpenMontage ran unless logs and final rendered output prove it. If blocked, clearly mark output “fallback concept prototype.”
6. **Audio, captions and final render:** English narration + subtle music + synced readable captions. Output 1080×1920 H.264/AAC 24 fps where possible.
7. **Quality gate:** Inspect actual video opening/middle/end, full playback and ffprobe. Check 48s ±1s, six moving scenes, legibility, sound, no silent gaps/clipped last word, correct data/years, no watermark, no wrong brand. Save a QA report.
8. **Owner review ONLY:** Deliver final MP4, thumbnail, script, research citations, 6 scene images, editable source, and explicit renderer provenance. **Do not publish/schedule, connect paid APIs, or alter production systems** without owner approval.

## Deliverables per episode
```
business-economy/<episode-slug>/
  BRIEF.md
  SCRIPT.md
  SOURCES.md
  STORYBOARD.md
  assets/scene_01.jpg ... scene_06.jpg
  captions.srt
  renders/final.mp4
  renders/thumbnail.jpg
  QA_REPORT.md
```

## Critical provenance note
The approved McDonald's reference **was rendered with offline PIL/FFmpeg**, not by the upstream OpenMontage runtime. It's the locked **visual benchmark**, while **actual OpenMontage** is the requested preferred production engine for future episodes. Use a disclosed fallback when unavailable; do not relabel a standalone FFmpeg result as OpenMontage.

## Agent handoff: copy this instruction
“Follow `docs/video-production/XENDER_BUSINESS_ECONOMY_VIDEO_SOP.md` for every Xender Business/Economy Short. Research and fact-check a new topic, script exactly six ~8-second scenes, generate six cohesive cinematic AI stills, animate with the actual OpenMontage `animated-explainer` pipeline where runnable, add natural English narration/music/captions, validate a 48-second vertical MP4, then return final MP4, thumbnail, sources, editables and QA evidence. Do not publish or incur paid charges. Never mark fallback as OpenMontage-rendered.”

**Change control:** Treat v1.0's aesthetic, pacing and approval gate as fixed until the owner requests a new version. Do not silently replace this SOP.


## Voiceover hard gate — added after 12-minute documentary review, 2026-11-08
**OWNER FEEDBACK: Existing long-form video voice sounds obviously artificial, unacceptable.** Never treat technically audible eSpeak narration as a publishable voiceover.

- Do **not** use `espeak`, `espeak-ng`, `pyttsx3`, or pitch/tempo-edited robotic synthesizers for a final Xender documentary voice.
- Require **natural, expressive, broadcast-quality neutral US/UK English neural TTS or properly recorded human speech**. Narration must include humanlike emphasis, breath pauses, varied prosody, clean pronunciation of brand names, dates and statistics, and stable loudness.
- Before a full 12-minute synthesis, render **30–45 seconds of voice audition**, listen through, and verify it sounds organic. For premium paid TTS, seek explicit credit/cost authorization first; do not silently spend.
- Time the narration to scenes by revising narration and allowing natural breaks; **never force speech into a 30-second box with >1.03× speed manipulation**.
- Verify no clipped words, stuttering, excessive robotic intonation, synthetic artifacts or odd pronunciation at start, minute 6 and ending. Listening QC is required; waveform / duration checks alone are not sufficient.
- For long-form Business & Economy documentaries: default 12:00 runtime, 16:9, 24fps, chaptered; the locked 48-second Short style remains separate. Do not misrepresent a text-to-speech render as a human recording or an OpenMontage runtime render.
- Existing 2026-11-08 *McDonald's 12-minute documentary* uses `espeak` and is **voice-QA FAILED / DO NOT PUBLISH** until full narration is replaced and audition/QA pass.


## Hindi language override — McDonald's 12-minute documentary (owner request, 2026-11-08)
- The **12-minute McDonald's long-form documentary must be narrated in natural conversational Hindi**, NOT English. Neutral Indian Hindi accent; naturally spoken technical terms such as franchise, rent, royalty, real estate are acceptable.
- Hindi subtitles/captions must match the Hindi narration; the current English narration and captions are not final.
- Keep approved cinematic visuals, story research and overall 12-minute structure. Do not alter English-language Shorts SOP globally; this owner instruction specifically resolves the language for the long-form McDonald's film.
- A 24-scene Hindi script was prepared in the current conversation as `Xender_McDonalds_12min_Hindi_Narration_Script.md`. Its proposed 30-second segment timing is preliminary, not audio-verified.
- **Current delivery status: Hindi script prepared; natural Hindi voice NOT generated; Hindi-dubbed MP4 NOT rendered.** Never mark the project Hindi-voice complete before a real audio recording and 12-minute synced MP4 pass QA.
- Recommended audition: male Hindi documentary voice; first render 30–45 seconds and verify natural accent, timing, brand names and numbers. Inworld Manoj (hi) was found as an available option; a paid 30-second audition estimated 2 Higgsfield credits and must not be purchased without owner approval.


## Hindi McDonald's long-form production update — 2026-11-08 (supersedes earlier pending status)
- **Technically rendered:** `Xender_McDonalds_12min_Hindi_Documentary_FINAL.mp4` in the 2026-11-08 ChatGPT conversation artifact; 720.000s, 1280×720, H.264/AAC, 24 cinematic scenes, 98 selectable Hindi subtitle cues.
- Original English eSpeak narration removed. 24 new Hindi speech segments generated without paid credits. All individual clips fit their 30s scenes with no forced tempo increase or clipping.
- **Provenance:** Google Translate TTS via `gTTS`, **NOT TTSMaker**, NOT OpenMontage, NOT a human recording. TTSMaker automation was blocked by unavailable browser access/CAPTCHA. The generated video is a review-only fallback, not the owner's requested TTSMaker-produced audio.
- GitHub free voice automation is isolated on `automation/hindi-dub-free-20261108`, workflow `.github/workflows/xender-hindi-dub-free.yml`; main website/AutoTube untouched.
- **Quality gate remains open:** Human listening assessment of voice naturalness, Hindi pronunciation, and subtitle timing is required; commercial licensing for this fallback voice was not independently established. **DO NOT PUBLISH** or mark final production-approved until these gates pass. The earlier 'Hindi MP4 NOT rendered' statement above is historical and superseded by this section.
