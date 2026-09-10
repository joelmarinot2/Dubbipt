# 05 · Traer y llevar formatos

## Para qué

El libreto vive en Dubbipt, pero tiene que poder venir de otro sitio y volver a
salir: subtítulos, hojas de cues de otros programas, marcadores para la sesión
de Pro Tools.

| Entra | Sale |
|---|---|
| SRT · WebVTT | SRT |
| STL (EBU, binario) | CSV con todo el ADR |
| CSV · TSV | TTML (DFXP del W3C) |
| PDF · Word (por el lector de guiones) | Marcadores de Pro Tools |

## Reglas

| | Regla | |
|---|---|---|
| **FMT-1** | El timecode de esos archivos se cuenta **desde el principio del vídeo**. Al traer se le **suma** el TC de inicio; al llevar se le **resta**. Es la misma cuenta que hace el Video Estudio. | 👁 |
| **FMT-2** | Se leen timecodes en cuatro formas: `00:00:12,340` · `00:00:12.340` · `00:00:12:08` (con fotogramas) · `12,5` (segundos sueltos). | 👁 |
| **FMT-3** | Si el texto trae el personaje delante —`NILA: hola`, `- NILA: hola`— se separa solo y se crea el personaje. | 👁 |
| **FMT-4** | El CSV se lee con **comillas de verdad**, incluidas las comillas dobladas dentro de un campo, y el separador se detecta entre `,`, `;` y tabulador. | 👁 |
| **FMT-5** | Las columnas se reconocen por el nombre de la cabecera. Si no hay cabecera reconocible, se toman **por orden** y se dice. | 👁 |
| **FMT-6** | Del STL se leen los bloques TTI de 128 bytes, los timecodes de entrada y salida a los fps que declare el GSI (25 o 30), los saltos de línea `0x8A` y el relleno `0x8F`. Los códigos de color se ignoran. | 👁 |
| **FMT-7** | Si el juego de caracteres que declara el STL **no es latino**, se avisa. Es mejor decirlo que colar basura en silencio. | 👁 |
| **FMT-8** | La salida de cada subtítulo importado se guarda como **corrección del cue**, que es donde vive la salida. | 👁 |
| **FMT-9** | Importar **sustituye el libreto entero**, y se dice antes de tocar nada, con el número de líneas leídas y cuántas traen personaje. | 👁 |
| **FMT-10** | Los marcadores salen en el mismo formato en que **Pro Tools escribe los suyos**: cabecera de sesión, formato de timecode y las columnas `#`, `LOCATION`, `TIME REFERENCE`, `UNITS`, `NAME`, `COMMENTS`. | ⚠️ |
| **FMT-11** | El TTML lleva un `ttm:agent` por personaje, para que el destino sepa quién habla. | 👁 |
| **FMT-12** | El CSV de salida lleva marca de orden de bytes (BOM), para que Excel lo abra con las tildes bien. | 👁 |

## Nunca

| | |
|---|---|
| **FMT-N1** | **Nunca inventar un formato propietario que no se pueda comprobar.** El TTAL de Netflix no está por eso: es un esquema suyo y escribir algo con ese nombre sin poder validarlo sería peor que no tenerlo. Con un archivo de ejemplo se añade. | — |
| **FMT-N2** | Nunca sustituir el libreto sin preguntar. | 👁 |
| **FMT-N3** | Nunca dar por válido un archivo por su extensión. Si no hay ninguna línea con tiempo, se dice y no se toca nada. | 👁 |

## Cómo se demuestra

**A mano**, con casos construidos en la propia página:

- SRT de tres subtítulos, uno partido en dos renglones y otro sin personaje.
  Ida y vuelta exacta: `2 → 5,5` · `6 → 9,12` · `10 → 12,4` idénticos al salir
  y volver a entrar.
- CSV con comillas escapadas y timecodes en las cuatro formas.
- STL **fabricado byte a byte** en la propia prueba: 25 fps, juego latino,
  tildes vivas, renglones unidos y tiempos correctos al fotograma.
- TTML: comprobado que es XML válido y que tiene un agente por personaje.

## Sin resolver

- Nada de esto está en `pruebas/`, y **es lo más fácil de automatizar de todo
  el proyecto**: son funciones puras de texto a texto, sin navegador ni vídeo.
  `ioLeerSRT`, `ioLeerCSV`, `ioLeerSTL`, `ioLeerTC`, `ioTC`, `ioTCf` y la ida y
  vuelta completa caben en un archivo de pruebas de una hora. Debería ser lo
  siguiente que se añada.
- **FMT-10**: el formato de marcadores está escrito imitando lo que exporta Pro
  Tools, pero **no se ha comprobado importándolo en Pro Tools**. Hasta que
  alguien lo pruebe en la sala, es una intención.
