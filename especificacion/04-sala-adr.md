# 04 · Sala y cues de ADR

## Para qué

Lo que se proyecta encima del vídeo para que un actor entre a tiempo sin mirar
un reloj, y la ficha de trabajo de cada intervención: cuánto dura, qué take va,
qué dijo el director.

## Reglas · señalización

| | Regla | |
|---|---|---|
| **SALA-1** | El **streamer** es una raya del color del personaje que cruza la imagen y llega a su destino en el **fotograma exacto** de la entrada. | 👁 |
| **SALA-2** | Dos sentidos: de izquierda a derecha, o una barra desde cada borde hacia el centro. En el segundo, las dos se juntan en el punto de entrada. | 👁 |
| **SALA-3** | Las duraciones son las de sala: **1 · 2 · 2,67 · 3 · 3,3 · 5 s**. Las de 2,67 y 3,3 son los 4 y 5 metros de película a 24 fotogramas. | 👁 |
| **SALA-4** | Al llegar la raya, desaparece. No se queda pegada al borde. | 👁 |
| **SALA-5** | **Tres beeps** de 1 kHz, uno por segundo. **El cuarto no suena: ese es el de entrar.** | ⚠️ |
| **SALA-6** | Los beeps solo suenan con el vídeo rodando, y una sola vez por segundo y por cue. | 👁 |
| **SALA-7** | El **punch** es un destello en el fotograma de entrada, y dura menos de dos décimas. | 👁 |
| **SALA-8** | La **barra** de progreso va de la entrada a la salida del cue. | 👁 |
| **SALA-9** | La señalización sigue los timecodes del **cue**, no los del libreto. Si alguien corrige una entrada a mano o la pega a un corte de plano, el streamer llega al sitio nuevo. | 👁 |

## Reglas · banda rítmica

| | Regla | |
|---|---|---|
| **BAN-1** | El texto se desplaza **de derecha a izquierda** contra una línea de sincronía fija, y cada palabra la cruza en su instante. | 👁 |
| **BAN-2** | La línea se puede colocar (por defecto al **32 %** del ancho) y engrosar. | 👁 |
| **BAN-3** | El cuerpo de letra **se encoge** para que la frase quepa en el tiempo que tiene. Es lo que permite leerla montada sobre la boca. | 👁 |
| **BAN-4** | Un **carril por personaje**. Si dos hablan solapados —y en un diálogo se solapan constantemente— cada uno va por su altura. Un personaje conserva su carril mientras no se pise consigo mismo. | 👁 |
| **BAN-5** | Los tiempos de palabra salen del mismo reparto que el karaoke, incluido el afinado con IA cuando está puesto. | 👁 |
| **BAN-6** | Si el reparto de palabras devuelve un `NaN`, se **descarta el reparto entero** y se pinta la frase sin palabras sueltas. Un `NaN` vaciaba la banda completa sin decir nada. | 👁 |

## Reglas · modo estudio

| | Regla | |
|---|---|---|
| **EST-1** | El modo estudio parte la ventana del libreto en **dos columnas**: el panel de vídeo a la izquierda y el libreto a la derecha. Al apagarlo, el libreto vuelve a ocupar todo el ancho. | ✅ |
| **EST-2** | Se puede encender **sin haber abierto antes el libreto incrustado**: si el contenedor no existe, se crea, y se vuelve a pedir antes de usarlo. | ✅ |
| **EST-3** | Los paneles de las herramientas —sala, cues, formatos, planos— se abren desde botones que viven **dentro** del libreto, así que siempre con `body.ddlov` puesto. Tienen que **verse igual**. La lista de excepciones de esa regla va por **clase** (`.modo-cap`, `.ddl-encima`), no por identificador. | ✅ |
| **EST-4** | Los avisos y las preguntas de confirmación se ven **por encima de todo**, también del libreto y del trackpad. Una pregunta que no se ve es un botón que no hace nada. | ✅ |

## Reglas · cues

| | Regla | |
|---|---|---|
| **ADR-1** | Cada intervención con timecode es un **cue**: entrada, salida, duración, personaje, talento, texto y página. | 👁 |
| **ADR-2** | De un cue se guarda **solo lo que no se puede deducir del libreto**: estado, take, notas y las correcciones de entrada y salida. Personaje, texto y timecode siguen viniendo del libreto, que es la única fuente. | 👁 |
| **ADR-3** | Los estados van en el orden del trabajo: `pendiente → ensayo → grabado → aprobado`, y `repetir` aparte. | 👁 |
| **ADR-4** | Cada vez que se marca **grabado**, el número de take sube uno. | 👁 |
| **ADR-5** | `repetir` no es un paso atrás: es una marca para volver, y por eso se ve en rojo. | 👁 |
| **ADR-6** | La entrada y la salida se capturan **donde esté el vídeo**, con su comprobación: no se admite una entrada posterior a la salida ni al contrario. | 👁 |
| **ADR-7** | `↺` devuelve el cue a los timecodes del libreto. Un cue corregido a mano se marca. | 👁 |
| **ADR-8** | El **bucle** repite el cue con su pre-roll, una y otra vez, hasta que se pare. | 👁 |
| **ADR-9** | El vigilante del bucle va con **temporizador**, no con `requestAnimationFrame`: rAF no se dispara si la pestaña no está pintando, y entonces el bucle se salía del cue sin volver. | 👁 |
| **ADR-10** | La **hoja de ADR** se agrupa por talento, con TC de entrada y salida, duración, take, estado, notas y los totales de tiempo de cada uno y del capítulo. | 👁 |
| **ADR-11** | Lo que llega de la nube se **sanea** antes de usarlo: el estado tiene que ser uno de los cinco, el take un número positivo, las notas texto acotado. | 👁 |

## Nunca

| | |
|---|---|
| **SALA-N1** | Nunca dibujar por encima de la imagen algo que capture el ratón. La capa de señalización no recibe clics. | 👁 |
| **ADR-N1** | Nunca guardar en el cue lo que ya está en el libreto. Duplicarlo garantiza que un día no coincidan. | 👁 |
| **EST-N2** | **Nunca ampliar una lista de excepciones por identificador.** Lo que nazca después queda fuera y nadie se entera: el elemento se crea entero y se le pone `display:none`. Así estuvieron los cuatro paneles de las herramientas de vídeo — se pulsaba el botón y no pasaba nada. Se exime por clase. | ✅ |
| **EST-N1** | **Nunca usar un nodo del DOM que se pidió antes de existir.** Una variable que se leyó en null se queda en null aunque el nodo se cree dos líneas más abajo. Pasó en `studioToggleStrip`: el primer clic del día en «modo estudio», sin el libreto abierto, se caía con «Cannot read properties of null (reading 'style')». Lo contó el informe de fallos desde producción — que es exactamente para lo que está. | ✅ |
| **ADR-N2** | Nunca dejar el vídeo alterado al terminar un análisis o un bucle: el volumen, la velocidad y la posición se devuelven como estaban. | 👁 |

## Cómo se demuestra

- Lo visual, **midiendo píxeles** en un navegador de verdad: a 1,5 s de la
  entrada la raya está en el 50 % del ancho; a 0,25 s, en el 91,7 %; en la
  entrada, no está. En modo bordes, dos rayas en el 25 % y el 75 %, que se
  juntan en el centro. La barra de progreso, en el 2,5 %, el 40 % y el 97,5 %.
  **Nada de esto está automatizado.**
- Los carriles: tres personajes solapados salen en 0, 1 y 2, y el primero
  recupera su carril al volver.
- Los cues, a mano: recorrer el ciclo de estados y ver subir el take.
- **EST-1**, **EST-2** y **EST-N1**, en `pruebas/estudio.prueba.js`, con un
  DOM de mentira: lo que se prueba no es el navegador, sino el **orden** en
  que la función pide las cosas. Quitar la relectura del contenedor pone seis
  comprobaciones en rojo.
- **EST-3**, **EST-4** y **EST-N2**, en `pruebas/paneles.prueba.js`. No monta
  un navegador: lee la regla de CSS que el código escribe y los overlays que el
  código crea, y aplica la semántica de la regla a cada uno. Nada está escrito
  dos veces, así que un panel nuevo entra solo en la prueba. Quitar `.modo-cap`
  de las excepciones pone cinco comprobaciones en rojo.

## Sin resolver

- **SALA-5**, los beeps, **no se han oído nunca en una prueba**. La lógica que
  decide cuándo suenan está escrita y revisada, pero nadie ha comprobado con un
  cronómetro que caen a −3, −2 y −1 s. Es lo primero que hay que verificar en
  sala.
- Nada de la señalización tiene prueba automática. Se podría: `salaPintar` y
  `salaBandaPintar` dibujan en un canvas, y en Node se puede usar un canvas de
  mentira que apunte las llamadas. Con eso se cerrarían **SALA-1** a **SALA-4**
  y **BAN-1** a **BAN-4**.
- La captura de fotogramas del vídeo real (`drawImage` sobre el `<video>`) no
  se ha podido comprobar: hace falta una ventana que se esté pintando.
