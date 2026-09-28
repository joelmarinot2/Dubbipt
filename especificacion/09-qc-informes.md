# 09 · QC e informes en PDF

## Para qué

Al revisar un capítulo salen correcciones: dónde, quién y qué hay que arreglar.
Eso se apunta mientras se revisa y se **entrega** al estudio o al cliente, así
que tiene que verse bien impreso y no perder ni una palabra por el camino.

Y al revés: los informes que **llegan** —los que escupe Pro Tools al exportar
las marcas de memoria, o un llamado de actores— vienen feos y se rehacen.

| Entra | Sale |
|---|---|
| El audio del programa (para cotejar) | Informe de QC en PDF A4 |
| Un informe de QC en PDF | El mismo informe, en A4 limpio |
| Un llamado de actores en PDF | El llamado agrupado por turnos |
| Un póster (opcional) | La variante en escala de grises |

Las reglas de QC en el libreto —la sección, las correcciones, el cotejo— están
en [`01-libreto.md`](01-libreto.md), de **QC-1** a **QC-7**.

## Reglas

| | Regla | |
|---|---|---|
| **PDF-1** | **No se cambia ni una palabra.** Mayúsculas, minúsculas, erratas y abreviaturas salen tal como vienen. Lo único que cambia es cómo se ve. Quien recibe el informe lo compara con el original, y una palabra «arreglada» por el camino es una corrección que nadie pidió. | ✅ |
| **PDF-2** | Se conservan **las columnas del original**, las que traiga. Una columna que la aplicación no reconoce sigue saliendo: cada estudio pone las suyas y tirarla perdería datos. | ✅ |
| **PDF-3** | Un comentario **partido en varios renglones** del PDF de origen se une en un párrafo. Las notas de **`GUION:`** van como párrafo aparte, aunque vengan pegadas: son una nota del guion, no la continuación del comentario. | ✅ |
| **PDF-4** | Los **datos de sesión** —Session name, Sample rate, Bit depth, Timecode format— se enseñan como tarjetas arriba, y **enteros**: se encoge la letra y, si hace falta, se parte en dos renglones. Cortar el valor en seco dejaba `100 DAYS OF DECEPTION 101` en `100 DAYS OF`, que es perder un dato del original callando. Si aun así sobra, se marca con puntos suspensivos: un corte que no se ve es un dato perdido del que nadie se entera. | ✅ |
| **PDF-5** | Los **números de página del PDF original** no se cuelan: ni como fila propia ni pegados al comentario de arriba. | ✅ |
| **PDF-6** | Se acepta como **cabecera de la tabla** un renglón con **dos** palabras conocidas, no con una. Con una sola, una celda que diga justo `Name` se lleva la tabla por delante y las columnas salen de donde no deben. La cabecera repetida en cada hoja tampoco se cuela como fila. | ✅ |
| **PDF-7** | De qué columna es cada trozo se decide por **el inicio de la columna**, no por el centro más cercano: el texto de una celda se alinea a la izquierda y crece hacia la derecha, así que por cercanía un comentario largo se iría a la columna siguiente. | ✅ |
| **PDF-8** | **Lo que la tipografía del PDF no sabe escribir no se lleva el renglón por delante.** Las tipografías de serie escriben WinAnsi, y lo que no está ahí no falla: se traga el texto entero, callando. Medido en un navegador: una corrección marcada con `✓` salía **completamente vacía** en el informe. Lo mismo con cualquier emoji que alguien escriba en un comentario. Se traduce lo que tiene traducción (`✓`→`OK`, `→`→`->`) y lo demás deja una marca visible, nunca un hueco. Por eso la marca de resuelta es la palabra `RESUELTA`, no un símbolo. | ✅ |
| **PDF-9** | **Ninguna fila se corta entre hojas.** Se mide el alto antes de dibujar; si no cabe entera, pasa a la siguiente. | ✅ |
| **PDF-10** | **Máximo dos hojas**: se encoge la letra, los márgenes y el alto de fila hasta que quepa. El último paso es **7,5 pt** y de ahí no se baja — más pequeño no se lee en sala, y el informe se lee en sala. Se mide con un documento de usar y tirar y solo se pinta el paso bueno, para que el PDF no lleve las hojas de los intentos. | ✅ |
| **PDF-11** | Con **póster**, todo el informe va en escala de grises y el póster se convierte a blanco y negro en una tarjeta de **52 × 78 mm** a la izquierda del encabezado, en la primera hoja. El gris se calcula por **luminancia**, no por la media de los canales: con la media el rojo y el azul salen igual de claros y el póster se queda plano. | ⚠️ |
| **PDF-12** | Un **llamado de actores** se agrupa por **Mañana / Tarde** —la frontera son las 14:00— y lleva columnas vacías de **Salida** y **Observaciones** para rellenar a mano. Si el original ya las trae, no se duplican. Quien no tiene hora va al final, no se pierde. | ✅ |
| **PDF-13** | El motor de PDF se **baja cuando hace falta** y no al arrancar: son unos 350 kB que la mayoría de las sesiones no toca, y esto se abre en salas con la red justa. | ✅ |
| **PDF-14** | El informe se entrega **solo con lo apuntado**. Sin correcciones no se descarga una hoja en blanco. | ✅ |
| **PDF-15** | El encabezado lleva el **programa en negrita** y el **episodio detrás en gris claro**, sobre el mismo renglón; a la derecha el **conteo en negrita** y debajo la **fecha** en gris. Si el episodio no cabe al lado, baja a su propio renglón antes que salirse. | ✅ |
| **PDF-16** | Cada corrección tiene un **tipo** —Falta, Cambiar, Pegar, Ajuste— que se pinta como **pastilla de color** en su columna, y arriba van las **pastillas con la cuenta de cada uno**. De un vistazo se sabe si hay que volver a llamar al actor —Falta— o si basta con pegar un take que ya existe. Los tipos sin ninguna corrección **no salen**: una pastilla en cero no dice nada y quita sitio. | ✅ |
| **PDF-17** | El informe dice **quién hace el QC** y **qué estudio hace los cambios**, con su etiqueta delante (`QC:` y `Cambios:`). Dos nombres sueltos no dicen a quién preguntar ni quién tiene que arreglarlo. Se recuerdan de un capítulo al siguiente: casi siempre revisa la misma persona. | ✅ |
| **PDF-18** | Cada fila lleva un **círculo vacío** a la derecha para marcar a mano cuando la corrección queda resuelta, y el pie lo explica. Un llamado de actores **no** lo lleva: no se resuelve corrección a corrección. | ✅ |
| **PDF-19** | La pastilla del tipo **nunca es más alta que la fila** ni manda sobre su alto, y se alinea con el **primer renglón** del comentario, no con el centro del párrafo. Medida a ojo se salía por abajo, se metía en la fila siguiente y el nombre del tipo salía **cortado por la mitad**. | ✅ |
| **PDF-20** | Al convertir un informe ajeno, si **no trae** columna de tipo se **deduce del comentario** y se añade; si **sí la trae**, se respeta la suya. Deducir no cambia el texto —el comentario sigue intacto— pero es una lectura nuestra, así que no se pone encima de la de otro. | ✅ |
| **PDF-21** | La hoja va en **gris muy claro** con las tarjetas en **blanco**: es lo que separa la tabla del papel y lo que hace que se lea como una ficha y no como un listado. La tarjeta de la tabla se rellena **fila a fila**, porque su borde se traza al final y por dentro se vería el gris. | ✅ |

## Nunca

| | |
|---|---|
| **PDF-N1** | Nunca corregir una errata del original, ni cambiar mayúsculas por minúsculas, ni «normalizar» un nombre. Ver **PDF-1**. |
| **PDF-N2** | Nunca dibujar una tabla vacía cuando no se ha encontrado la del origen: haría creer que el informe salió bien. Si no hay cabecera, se dice que no se encuentra. |
| **PDF-N3** | Nunca dejar que un carácter que la tipografía no dibuja se coma el texto. Ver **PDF-8**. |

## Cómo se demuestra

**Automáticamente**, en `pruebas/qcpdf.prueba.js`: leer y decidir, que es donde
están los errores. Los datos son trozos de texto con su X y su Y, que es lo
mismo que entrega pdf.js, y salen de la forma que tiene una exportación de
marcas de memoria de Pro Tools. 23 mutaciones comprobadas, 22 en rojo.

**En un navegador de verdad**, porque el dibujo necesita uno y ahí aparecieron
dos fallos que ninguna prueba de las de arriba iba a ver:

- se fabricó un PDF con forma de exportación de Pro Tools, se pasó por el
  lector y se comprobó lo que salía: 4 tarjetas de sesión, 4 columnas, 4 filas
  —la continuación unida—, el número de hoja ignorado y las erratas intactas;
- se leyó el **texto del PDF producido** con pdf.js, que es lo que descubrió
  **PDF-8**: la corrección marcada con `✓` había desaparecido entera;
- y se miró la hoja, que es lo que descubrió el corte de **PDF-4**.

La hoja del formato —**PDF-15 a PDF-21**— llegó de sala como imagen y se
reprodujo hasta que el PDF producido daba los mismos números: `12 correcciones`
y `3 Falta · 4 Cambiar · 2 Pegar · 3 Ajuste`. **PDF-19** no salió de ninguna
prueba: salió de mirar la hoja y ver el nombre del tipo cortado.

De las 19 mutaciones de esta tanda, 19 quedaron en rojo. Una vigésima delató
**código muerto**: `qcpdfTipoDe` comparaba también con la etiqueta del tipo, y
como el texto se pasa a minúsculas antes y la etiqueta en minúsculas ES la
clave, esa rama nunca podía entrar. Ninguna mutación la ponía en rojo porque no
hacía nada; se quitó.

## Sin resolver

- **PDF-11** está a medias. La variante en escala de grises y la tarjeta del
  póster están escritas y la luminancia también, pero **no se han visto nunca**:
  hace falta un póster de verdad y un canvas de navegador. La mutación que
  cambia la luminancia por la media de los canales **no pone nada en rojo**, y
  eso está sin cubrir a propósito, no por descuido.
- El motor de dibujo —jsPDF— no se prueba solo: se comprueba el resultado, no
  sus llamadas. Si cambia de versión, lo que avisa es el navegador, no la
  batería.
- El guardarraíl que impide que la pastilla del tipo haga crecer la fila
  (**PDF-19**, la parte del alto) **no lo pone en rojo ninguna mutación**: con
  las cuatro etiquetas que hay —todas cortas— quitarlo no cambia nada. Se deja
  como guardia, no como algo comprobado.
- Un informe de Pro Tools **real** todavía no ha pasado por el convertidor. Los
  que se han usado los fabricamos nosotros con la forma que tienen, que no es
  lo mismo: las X de una exportación de verdad las pone Pro Tools.
