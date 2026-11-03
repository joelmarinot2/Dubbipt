"""Arma la pista de narración + timeline + subtítulos.

Fuente de la voz, por escena, en este orden:
  1. Clips grabados por línea en voz/ESCENA-LINEA.wav (01-01.wav, 01-02.wav, …).
  2. Un clip grabado por escena en voz/ESCENA.wav (01.wav, …): las líneas se
     reparten según el largo del texto (menos exacto que 1).
  3. Si no hay clip, voz sintética con Piper (requiere el modelo en modelos/).

Formatos aceptados para los clips: wav, mp3, m4a, aac, flac, ogg, aif/aiff.
El silencio al inicio y al final de cada clip se recorta automáticamente.
"""
import json, os, subprocess, sys, wave
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
MODELS = os.environ.get("PIPER_MODELOS", os.path.join(HERE, "modelos"))
VOZ = os.environ.get("VOZ_DIR", os.path.join(HERE, "voz"))
OUT = os.environ.get("VIDEO_SALIDA", os.path.join(HERE, "salida"))
os.makedirs(OUT, exist_ok=True)

GAP_SCENE_START = 0.65   # silencio antes de la primera línea de cada escena (deja aparecer el título)
GAP_BEAT = 0.55          # silencio entre líneas
GAP_SENTENCE = 0.22      # silencio extra entre oraciones (solo voz sintética)
GAP_SCENE_END = 1.10     # silencio al final de cada escena
LENGTH_SCALE = 1.06      # voz sintética: un poco más pausada que el default
TRIM_DB = -45.0          # umbral para recortar silencio en clips grabados
TRIM_MARGIN = 0.08       # segundos que se conservan antes/después de la voz
EXTS = ("wav", "mp3", "m4a", "aac", "flac", "ogg", "aif", "aiff")

guion = json.load(open(os.path.join(HERE, "guion.json"), encoding="utf-8"))


def find_clip(base):
    for ext in EXTS:
        p = os.path.join(VOZ, f"{base}.{ext}")
        if os.path.exists(p):
            return p
    return None


# ¿Hay clips grabados? Entonces la pista va a 44,1 kHz; si no, a la frecuencia de Piper.
has_clips = os.path.isdir(VOZ) and any(f.rsplit(".", 1)[-1].lower() in EXTS for f in os.listdir(VOZ))
SR = 44100 if has_clips else 22050

voice = None
def piper():
    global voice
    if voice is None:
        from piper import PiperVoice
        name = guion["voz"]
        mdir = os.path.join(MODELS, "vits-piper-" + name)
        voice = PiperVoice.load(os.path.join(mdir, name + ".onnx"), os.path.join(mdir, name + ".onnx.json"))
    return voice


def resample(a, sr_from, sr_to):
    if sr_from == sr_to:
        return a
    n = int(round(len(a) * sr_to / sr_from))
    return np.interp(np.linspace(0, len(a) - 1, n), np.arange(len(a)), a).astype(np.float32)


def synth(text):
    from piper.config import SynthesisConfig
    v = piper()
    cfg = SynthesisConfig(length_scale=LENGTH_SCALE)
    parts = []
    for chunk in v.synthesize(text, syn_config=cfg):
        parts.append(chunk.audio_int16_array.astype(np.float32) / 32768.0)
        parts.append(np.zeros(int(v.config.sample_rate * GAP_SENTENCE), np.float32))
    if parts:
        parts.pop()
    a = np.concatenate(parts) if parts else np.zeros(0, np.float32)
    return resample(a, v.config.sample_rate, SR)


def load_clip(path):
    """Decodifica cualquier formato a mono float32 a SR y recorta el silencio de los extremos."""
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", path, "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    a = np.frombuffer(raw, np.float32).copy()
    peak = np.abs(a).max() if len(a) else 0
    if peak > 0:
        a = a / peak * 0.9
        thr = 10 ** (TRIM_DB / 20)
        loud = np.flatnonzero(np.abs(a) > thr)
        if len(loud):
            m = int(SR * TRIM_MARGIN)
            a = a[max(0, loud[0] - m): min(len(a), loud[-1] + m)]
    return a


def sil(sec):
    return np.zeros(int(SR * sec), np.float32)


track, cursor, n = [], 0.0, 0
timeline = {"sampleRate": SR, "scenes": []}
srt = []

def ts(s):
    h = int(s // 3600); m = int(s % 3600 // 60); sec = s % 60
    return f"{h:02d}:{m:02d}:{int(sec):02d},{int(round((sec - int(sec)) * 1000)):03d}"

for si, sc in enumerate(guion["escenas"], start=1):
    beats = sc["beats"]
    scene = {"id": sc["id"], "start": round(cursor * 1000), "beats": []}
    track.append(sil(GAP_SCENE_START)); cursor += GAP_SCENE_START

    per_line = [find_clip(f"{si:02d}-{bi:02d}") for bi in range(1, len(beats) + 1)]
    per_scene = find_clip(f"{si:02d}")
    if all(per_line):
        fuente = "clips por línea"
        for i, (text, path) in enumerate(zip(beats, per_line)):
            if i > 0:
                track.append(sil(GAP_BEAT)); cursor += GAP_BEAT
            a = load_clip(path); start = cursor
            track.append(a); cursor += len(a) / SR
            scene["beats"].append({"start": round(start * 1000), "end": round(cursor * 1000), "text": text})
    elif per_scene:
        fuente = "clip por escena (líneas repartidas por largo del texto)"
        a = load_clip(per_scene); dur = len(a) / SR
        lens = np.array([len(t) for t in beats], float); frac = np.cumsum(lens) / lens.sum()
        start0 = cursor
        track.append(a); cursor += dur
        prev = 0.0
        for text, f in zip(beats, frac):
            scene["beats"].append({"start": round((start0 + prev * dur) * 1000), "end": round((start0 + f * dur) * 1000), "text": text})
            prev = f
    else:
        fuente = "voz sintética (Piper)"
        if any(per_line):
            print(f"  aviso: la escena {si:02d} tiene solo algunos clips por línea; faltan "
                  + ", ".join(f"{si:02d}-{bi:02d}" for bi, p in enumerate(per_line, 1) if not p), file=sys.stderr)
        for i, text in enumerate(beats):
            if i > 0:
                track.append(sil(GAP_BEAT)); cursor += GAP_BEAT
            a = synth(text); start = cursor
            track.append(a); cursor += len(a) / SR
            scene["beats"].append({"start": round(start * 1000), "end": round(cursor * 1000), "text": text})

    for b in scene["beats"]:
        n += 1
        srt.append(f"{n}\n{ts(b['start'] / 1000)} --> {ts(b['end'] / 1000)}\n{b['text']}\n")
    track.append(sil(GAP_SCENE_END)); cursor += GAP_SCENE_END
    scene["end"] = round(cursor * 1000)
    timeline["scenes"].append(scene)
    print(f"{si:02d} {sc['id']:11s} {scene['start']/1000:7.2f} -> {scene['end']/1000:7.2f}  ({len(beats)} líneas, {fuente})")

timeline["total"] = round(cursor * 1000)
audio = np.concatenate(track)
peak = np.abs(audio).max()
if peak > 0:
    audio = audio / peak * 0.89
pcm = (audio * 32767).astype(np.int16)
with wave.open(os.path.join(OUT, "narracion.wav"), "wb") as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
json.dump(timeline, open(os.path.join(OUT, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# En los subtítulos, deshacer las grafías fonéticas usadas para la voz sintética
SRT_REP = {"studio punto centauro punto com": "studio.centauro.com", "X uno:": "X1:", "X dos:": "X2:",
           "X tres:": "X3:", "X cuatro:": "X4:", "X cinco:": "X5:", "Z uno:": "Z1:"}
srt_text = "\n".join(srt)
for a, b in SRT_REP.items():
    srt_text = srt_text.replace(a, b)
open(os.path.join(OUT, "Flujo_de_los_estudios.srt"), "w", encoding="utf-8").write(srt_text)
print(f"TOTAL {cursor/60:.1f} min  ({cursor:.1f}s)  ->  {OUT}")
