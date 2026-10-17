# Revisor ASREC

`revisor-asrec.html` (en la raíz) es un programa de un solo archivo: se abre con
doble clic, **sin internet**, se suelta el Excel del guion de doblaje y revisa
las casillas **DIALOGUE** de la hoja **Dialogue List**.

Lleva dentro el diccionario de español de LibreOffice (unas 660 000 formas) y
el lector de Excel; no carga nada de fuera y el archivo no sale del ordenador.

## Qué revisa

| Grupo | Ejemplos |
|---|---|
| Formato ASREC | casilla vacía, reacciones sin paréntesis, MAYÚSCULAS sostenidas, números y abreviaturas, continuaciones con «…» |
| Puntuación | «...» en vez de «…», espacios, ¿? ¡!, punto y coma, «?!» juntos, «Pero, ¿…?», comillas, caracteres invisibles |
| Ortografía | diccionario, RAE 2010 (solo, este, guion), qué/cómo/dónde, tú/mí/él/sé/sí, «vosotros» en latino |
| Gramática | «todo tus», «a el», «haber si», «he echo», «habían muchas», dequeísmo, «así que,» |
| Coherencia | guías de pronunciación distintas para el mismo nombre, nombres escritos de dos formas, «Diosa»/«diosa» |
| Etiquetas | MAIN TITLE IN DIALOGUE, SENSITIVE LANGUAGE, CONTEXT sin anotación |
| Personajes y timecodes | KATHWA/KATHAWA, espacios en SOURCE, varios personajes en un evento, WALLA y NONE, timecodes |

La **«/»** para marcar pausas sale como error: es una regla del estudio
(fuente «estudio»). La guía ASR de Netflix sí la permite, así que se puede
apagar en «Reglas y diccionario» si un cliente la acepta.

Cada regla dice de dónde sale: **Netflix ASR** (As Recorded Dubbing Script Scope
of Work), **Netflix ES** (Spanish (Latin America & Spain) Timed Text Style
Guide), **RAE**, o **guion** (el guion comparado consigo mismo). En la pestaña
«Reglas y diccionario» se apagan una a una y se añaden palabras propias.

El informe se descarga en `.xlsx` con tres hojas: hallazgos (empieza por el
**timecode inicial** de cada fila), nombres y guías (con el timecode de la
primera vez que sale cada nombre), y resumen.

**La puntuación de cada fila se mira con la de antes y la de después** del mismo
personaje (hasta ocho filas y diez segundos de hueco): si la frase sigue, si la
interrumpe otro personaje («…» al cortar y al retomar), si la anterior ya la
cerró (sobra el «…», va mayúscula) o si la continuación empieza en mayúscula.
Cada aviso enseña las filas vecinas que lo explican.

**Probar un diálogo**: en la pantalla de inicio, y en su pestaña cuando hay un
Excel abierto. Se escribe o se pega un diálogo, cada línea es un evento, y dice
al momento si está bien o qué tiene mal, con botones para aplicar la
corrección. Para una conversación, cada línea empieza con el personaje
(`AMAR: Te iba a decir que…`). También lee **capturas**: con el botón «Leer una
captura», pegándola con Ctrl+V o arrastrándola. De la captura solo saca **el
personaje y su línea de diálogo**, y deja fuera timecodes, transcripción,
etiquetas y anotaciones. Reconoce:
- las **tarjetas de la herramienta de guiones de Netflix** (timecodes, «FUKUDA ▾
  On», la línea en letra grande y, tras la raya, «# Foreign Dialog» y las
  anotaciones);
- el **Excel** o cualquier tabla con cabecera (SOURCE / PERSONAJE y DIALOGUE /
  DIÁLOGO), aunque una casilla tenga dos líneas;
- **tablas sin cabecera**: el personaje es la columna en mayúsculas y el diálogo,
  la que más palabras en español tiene (no la transcripción en inglés);
- tarjetas con el nombre encima del diálogo, y texto suelto línea a línea. El lector (Tesseract.js
con el español) va dentro del archivo: ver `ocr/LEEME.md`. Con un Excel abierto, lo compara además con los nombres, las guías
de pronunciación y el título de ese guion.

## Cómo se construye

No se edita `revisor-asrec.html` a mano. Se editan estos y se reconstruye:

- `motor.js`: las reglas, la lectura del Excel y el informe.
- `plantilla.html`: la pantalla.
- `diccionario/`: el diccionario de LibreOffice (es y es-MX), con su licencia.
- `ocr/`: el lector de capturas (Tesseract.js y el español), con sus licencias.

```bash
node revisor-asrec/construir.js
node pruebas/correr.js
```

La prueba `pruebas/revisorasrec.prueba.js` comprueba que el HTML construido
lleva el `motor.js` de ahora: si se olvida reconstruir, sale en rojo.

## Licencia del diccionario

El diccionario es de LibreOffice (rla-es, Santiago Bosio y colaboradores), con
triple licencia GPL 3 / LGPL 3 / MPL 1.1. Ver `diccionario/LICENCIA.txt`.
