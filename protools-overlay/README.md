# Overlay de letra sincronizada para Pro Tools

Ventana transparente que flota **encima** del vídeo de Pro Tools y va encendiendo
el texto palabra por palabra, al estilo karaoke, siguiendo el audio.

No es un plug‑in de Pro Tools: es una ventana aparte, siempre encima y que deja
pasar el ratón, así que Pro Tools se sigue manejando con normalidad por debajo.
Esto es a propósito — ver el apartado *Por qué no es un plug‑in*.

---

## Instalación

```bash
cd protools-overlay
npm install
npm start
```

Requiere Node 18 o superior. La primera instalación descarga Electron (unos 100 MB).

---

## Cómo se usa

La ventana de control tiene cuatro pasos, en el mismo orden en que se trabaja.

**1 · Texto.** Se pega el texto de la escena. Cada salto de línea es un corte de
línea en pantalla; las líneas muy largas se parten solas.

**2 · Audio.** *Cargar audio…* y se elige el archivo de la escena (wav, aif, mp3,
m4a, flac, ogg). Luego *Alinear*. El análisis va en un worker aparte, así que la
ventana no se queda colgada.

**3 · Sincronía.** Se elige la entrada MIDI por la que Pro Tools manda el
timecode (MTC). En Pro Tools: `Setup > Peripherals > Synchronization`, y en
`Setup > MIDI > MIDI Beat Clock / MTC` activar la salida hacia un puerto virtual
(en Windows hace falta un puerto tipo loopMIDI; macOS trae el IAC Driver).
El punto verde se enciende cuando llega timecode y el transporte está rodando.

Si no hay Pro Tools delante, *Reproducir aquí* usa el audio cargado como reloj:
sirve para calibrar y para ensayar.

**4 · Pantalla.** Monitor, tamaño de letra, altura y colores. *Mostrar overlay*
lo saca. **Ctrl+Alt+O** lo esconde o lo saca desde cualquier sitio, aunque el
foco esté en Pro Tools — es el interruptor de emergencia.

*Colocar* desactiva temporalmente el paso del ratón para poder ajustar; hay que
volver a pulsarlo al terminar, o el overlay seguirá capturando los clics.

### Calibración

El deslizador de **Calibración** mueve todo el texto en milisegundos: negativo lo
adelanta, positivo lo retrasa. Sirve para compensar la latencia de la tarjeta y
el retardo del propio MTC. Se ajusta a oído: reproducir, mirar qué palabra está
encendida y mover hasta que coincida. El valor se aplica al instante, sin
volver a analizar.

---

## Precisión: lo que hace y lo que no

El alineador incluido **no reconoce el habla**: mide la energía del audio,
localiza las pausas y reparte el texto entre los tramos de voz, apoyándose en
los picos de energía (los núcleos silábicos) para seguir el ritmo real dentro de
cada frase.

Medido con audio sintético (`npm test`, `test/precision.test.js`):

| caso | error medio | p90 | peor |
|---|---|---|---|
| una palabra por tramo, con pausas | 20 ms | 20 ms | 20 ms |
| frase seguida, ritmo irregular | 21 ms | 26 ms | 28 ms |
| lo mismo con ruido de sala y sangría de música | 20 ms | 26 ms | 27 ms |

Los 20 ms de suelo son el paso del análisis (una medida cada 10 ms), no un
error de estimación.

**Estas cifras son de audio sintetizado, no de voz real.** El material de prueba
tiene una cresta limpia por sílaba, que es justo lo que el detector busca. La voz
de verdad trae fricativas, sílabas sin núcleo claro y solapes, y el contador de
sílabas del texto es una aproximación por grupos vocálicos. Con voz real hay que
esperar bastante más error dentro de una frase larga sin pausas — no lo he
podido medir aquí porque no tengo material grabado.

Lo que sí se sostiene en los dos casos: **el error no se acumula**. Cada pausa
vuelve a anclar el texto al audio, así que un desvío en una frase no arrastra el
resto de la escena.

### Para precisión de verdad por palabra

Se puede cargar un JSON de marcas de un alineador real —
[whisper.cpp](https://github.com/ggerganov/whisper.cpp), WhisperX o MFA — con
*Cargar marcas JSON…*. Acepta `[{word, start, end}]` o `[{wi, t0, t1}]`. Si hay
marcas, se usan en lugar del análisis de energía. Es el único camino honesto
para ±50 ms por palabra en voz real: la energía no distingue dónde acaba una
palabra y empieza la siguiente cuando no hay pausa entre ellas.

### Cuando el audio no da

Si la pista no tiene pausas distinguibles, o la voz viene enterrada bajo la
música, el análisis **no inventa marcas**: falla con *«Audio no inteligible»* y
dice por qué. En ese caso: usar la pista de voz sola, o cargar marcas externas.

---

## Rendimiento

- 3 minutos de audio se alinean en **0,03 s** (`test/align.test.js`).
- El análisis va en un worker: la interfaz no se bloquea.
- El overlay no recibe un tiempo por fotograma. El control le manda un **ancla**
  (tiempo + instante en que se tomó) y el overlay extrapola en cada repintado,
  así que la latencia del puente entre ventanas no se ve. Por fotograma solo se
  tocan las clases que cambian y el recorte de la palabra en curso; no se
  reconstruye nada.
- `backgroundThrottling` está desactivado en el overlay. Sin eso, Chromium baja
  el repintado a 1 Hz en cuanto la ventana pierde el foco — que es *siempre*,
  porque el foco lo tiene Pro Tools.

---

## Por qué no es un plug‑in

Un plug‑in AAX tendría el timecode exacto de la sesión sin MIDI de por medio,
pero exige el SDK de Avid, firma de código y pasar por su programa de
desarrollo. Además, dibujar texto grande desde un plug‑in dentro del hilo de
audio es justo la clase de cosa que provoca errores de buffer (AAE ‑9173). Una
ventana aparte no toca el hilo de audio de Pro Tools en absoluto.

---

## Qué está verificado y qué no

Verificado en esta máquina (Windows 11, Electron 32.3.3) — `npm run e2e` y
`npm run captura`:

- Ventana siempre encima, sin marco, no enfocable, a pantalla completa (1920×1080).
- Fondo real transparente (`rgba(0, 0, 0, 0)`), comprobado además con una
  captura del escritorio: el texto se ve sobre Excel sin ningún rectángulo.
- Click‑through: `setIgnoreMouseEvents` acepta activarse y desactivarse.
- El worker arranca desde `file://` y alinea; peor error 20 ms en la prueba.
- El puente control → overlay pinta el guion y el barrido cae donde debe.
- Ventana de tres líneas: de un guion de 67 palabras solo asoman tres líneas,
  con la línea en curso centrada.
- 37 pruebas unitarias en verde (`npm test`).

**No verificado**, porque hace falta Pro Tools y una sesión real:

- Sincronía por MTC de punta a punta. El decodificador tiene pruebas unitarias
  (cuartos de trama, trama completa, drop‑frame, compensación del retardo de dos
  tramas), pero nunca ha recibido MIDI de Pro Tools de verdad.
- Que el overlay quede encima del vídeo de Pro Tools **a pantalla completa**.
  Está pedido con el nivel más alto (`screen-saver`) y marcado para verse sobre
  ventanas en pantalla completa, pero eso hay que verlo en el estudio.
- El impacto en CPU con una sesión pesada cargada.
- Precisión sobre voz grabada real (ver el apartado de precisión).
- macOS: no se ha probado. El nivel de ventana y el click‑through se comportan
  distinto ahí.

---

## Estructura

```
main.js              proceso principal: las dos ventanas y el puente
preload.js           única superficie expuesta al renderizador
ui/control.*         panel de control
ui/overlay.*         la banda de texto transparente
src/mtc.js           decodificador de MIDI Timecode
src/text.js          troceado de texto, sílabas, líneas
src/timeline.js      Timeline.at(t): estado del karaoke, función pura del tiempo
src/align/energy.js  envolvente, tramos de voz, núcleos silábicos
src/align/align.js   los dos motores de alineación
src/align/worker.js  el análisis, fuera del hilo de interfaz
test/                37 pruebas
tools/e2e.js         arranca la app de verdad y la comprueba por dentro
tools/captura.js     captura el escritorio con el overlay encima
```

`Timeline.at(t)` es una función pura del tiempo: no guarda estado de reproducción,
así que saltar, rebobinar o repetir un bucle en Pro Tools no necesita reiniciar
nada. Es lo que permite que el overlay se limite a preguntar «¿qué toca ahora?»
en cada fotograma.
