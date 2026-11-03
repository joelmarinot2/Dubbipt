# Flujo de los estudios · video explicativo

Video explicativo (6,5 min, 1080p, narrado en español) basado en la guía
`Flujo_de_los_estudios.pdf` de studio.centauro.com.

| Archivo | Qué es |
|---|---|
| `Flujo_de_los_estudios.mp4` | El video (H.264 + AAC, 1920×1080, 30 fps). |
| `Flujo_de_los_estudios.srt` | Subtítulos con la narración, sincronizados. |
| `Flujo_de_los_estudios.pdf` | La guía original en la que se basa. |
| `Guion_narracion.md` | El guion, línea por línea, para grabarlo con voz propia. |
| `fuente/` | Todo lo necesario para regenerar el video si cambia la guía. |

## Contenido del video

1. Portada y objetivo (ser más eficientes como equipo).
2. **Importante:** la PDT ya no espera al fin de mes (antes vs. ahora).
3. **El día de grabación**, pasos 1 a 9, cada uno con su pantalla:
   revisar episodios/menciones/mensajes, Planilla Diaria, Llamar Talento,
   Abrir Libreto, marcar líneas, sumar personajes, marcar qué grabó y qué no,
   Finalizar la sesión, llamar al siguiente talento.
4. **Caso X:** el talento está grabando pero no está en el llamado (X1 a X5).
5. **Caso Z:** cambiar el talento de un personaje (recasteo).
6. **Siempre:** las tres reglas.
7. Resumen y cierre.

## Grabar la voz propia

1. Grabar siguiendo `Guion_narracion.md`: un clip por línea, con el código de la
   línea como nombre (`01-01.wav`, `01-02.wav`, …, `17-02.wav`). También sirve un
   clip por escena (`01.wav` … `17.wav`), aunque la sincronía dentro de la escena
   es aproximada. WAV, MP3, M4A, FLAC, OGG o AIFF; mono o estéreo.
2. Copiar los clips a `fuente/voz/`.
3. `python3 audio.py` y luego `node render.js` (pasos 2 y 4 de abajo). Las
   escenas sin clip se siguen generando con voz sintética, y el script avisa
   cuáles faltan.

## Cómo se genera (`fuente/`)

- `guion.json` — la narración, por escena y por frase ("beat"). Es lo único que
  hay que editar para cambiar lo que se dice.
- `video.html` — las 17 escenas (HTML/CSS, mismo estilo que el PDF: Inter +
  JetBrains Mono). Cada elemento con `data-r="N"` aparece cuando empieza la frase N.
- `audio.py` — arma la pista de voz y escribe `salida/narracion.wav`,
  `salida/timeline.json` y el `.srt`. Usa los clips grabados que encuentre en
  `fuente/voz/` y, para lo que falte, voz sintética con
  [Piper](https://github.com/OHF-Voice/piper1-gpl) (voz `es_MX-claude-high`).
- `render.js` — con Playwright dibuja cada fotograma de `video.html` según el
  timeline y lo codifica con ffmpeg junto con la narración.
- `preview.js` — una captura por escena en `salida/preview/` para revisar el diseño.

Requisitos: Python 3 con `piper-tts` y `numpy`, Node con `playwright` (Chromium),
`ffmpeg`, y las fuentes Inter y JetBrains Mono instaladas en el sistema.

```bash
cd guias/flujo-de-los-estudios/fuente
# 1. Voz: descargar el modelo (una vez) en fuente/modelos/vits-piper-es_MX-claude-high/
curl -L -o m.tar.bz2 https://github.com/k2-fsa/sherpa-onnx/releases/download/tts-models/vits-piper-es_MX-claude-high.tar.bz2
mkdir -p modelos && tar xjf m.tar.bz2 -C modelos && rm m.tar.bz2
# 2. Narración + timeline + subtítulos
python3 audio.py
# 3. (opcional) capturas por escena
node preview.js
# 4. Video final → salida/Flujo_de_los_estudios.mp4
node render.js
```

Los nombres y números de los ejemplos son inventados (igual que en el PDF).
