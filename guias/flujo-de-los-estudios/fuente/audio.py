"""Sintetiza la narración por escena/beat con Piper y arma la pista completa + timeline + SRT."""
import json, os, sys, wave
import numpy as np
from piper import PiperVoice
from piper.config import SynthesisConfig

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get("PIPER_MODELOS", os.path.join(HERE, "modelos"))
OUT = os.environ.get("VIDEO_SALIDA", os.path.join(HERE, "salida"))
os.makedirs(OUT, exist_ok=True)

GAP_SCENE_START = 0.65   # silencio antes del primer beat de cada escena (deja aparecer el título)
GAP_BEAT = 0.55          # silencio entre beats
GAP_SENTENCE = 0.22      # silencio extra entre oraciones dentro de un beat
GAP_SCENE_END = 1.10     # silencio al final de cada escena
LENGTH_SCALE = 1.06      # un poco más pausado que el default

guion = json.load(open(os.path.join(HERE, "guion.json"), encoding="utf-8"))
name = guion["voz"]
mdir = os.path.join(MODELS, "vits-piper-" + name)
voice = PiperVoice.load(os.path.join(mdir, name + ".onnx"), os.path.join(mdir, name + ".onnx.json"))
SR = voice.config.sample_rate
cfg = SynthesisConfig(length_scale=LENGTH_SCALE)

def synth(text):
    parts = []
    for chunk in voice.synthesize(text, syn_config=cfg):
        a = chunk.audio_int16_array.astype(np.float32) / 32768.0
        parts.append(a)
        parts.append(np.zeros(int(SR * GAP_SENTENCE), np.float32))
    if parts:
        parts.pop()  # sin silencio final de oración
    return np.concatenate(parts) if parts else np.zeros(0, np.float32)

def sil(sec):
    return np.zeros(int(SR * sec), np.float32)

track = []
cursor = 0.0
timeline = {"sampleRate": SR, "scenes": []}
srt = []
n = 0
for sc in guion["escenas"]:
    scene = {"id": sc["id"], "start": round(cursor * 1000), "beats": []}
    track.append(sil(GAP_SCENE_START)); cursor += GAP_SCENE_START
    for i, text in enumerate(sc["beats"]):
        if i > 0:
            track.append(sil(GAP_BEAT)); cursor += GAP_BEAT
        a = synth(text)
        start = cursor
        track.append(a); cursor += len(a) / SR
        scene["beats"].append({"start": round(start * 1000), "end": round(cursor * 1000), "text": text})
        n += 1
        def ts(s):
            h = int(s // 3600); m = int(s % 3600 // 60); sec = s % 60
            return f"{h:02d}:{m:02d}:{int(sec):02d},{int(round((sec - int(sec)) * 1000)):03d}"
        srt.append(f"{n}\n{ts(start)} --> {ts(cursor)}\n{text}\n")
    track.append(sil(GAP_SCENE_END)); cursor += GAP_SCENE_END
    scene["end"] = round(cursor * 1000)
    timeline["scenes"].append(scene)
    print(f"{sc['id']:12s} {scene['start']/1000:7.2f} -> {scene['end']/1000:7.2f}  ({(scene['end']-scene['start'])/1000:.1f}s, {len(sc['beats'])} beats)")

timeline["total"] = round(cursor * 1000)
audio = np.concatenate(track)
peak = np.abs(audio).max()
if peak > 0:
    audio = audio / peak * 0.89
pcm = (audio * 32767).astype(np.int16)
with wave.open(os.path.join(OUT, "narracion.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
json.dump(timeline, open(os.path.join(OUT, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
# En los subtítulos, deshacer las grafías fonéticas usadas para la voz
SRT_REP = {"studio punto centauro punto com": "studio.centauro.com", "X uno:": "X1:", "X dos:": "X2:",
           "X tres:": "X3:", "X cuatro:": "X4:", "X cinco:": "X5:", "Z uno:": "Z1:"}
srt_text = "\n".join(srt)
for a, b in SRT_REP.items():
    srt_text = srt_text.replace(a, b)
open(os.path.join(OUT, "Flujo_de_los_estudios.srt"), "w", encoding="utf-8").write(srt_text)
print(f"TOTAL {cursor/60:.1f} min  ({cursor:.1f}s)")
