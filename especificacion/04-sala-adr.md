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
| **BAN-3** | Cada palabra se **estrecha** para caber en el hueco que va hasta la siguiente. El **cuerpo de letra no cambia** de una palabra a otra —eso se lee fatal—: lo que cambia es el ancho, como en una banda rítmica de verdad, donde las letras se aprietan con la velocidad del habla. Suelo de legibilidad: el 25 %. | ✅ |
| **BAN-7** | **Ninguna palabra se pisa con la de al lado, y ninguna deja de entrar en su instante.** Son las dos cosas a la vez, y era fácil cumplir solo una: dibujadas todas del mismo ancho desde su instante, una palabra larga dicha deprisa se comía a la siguiente («Peescaparon», «cuandpudieron», vistas en sala). | ✅ |
| **BAN-8** | Las palabras se reparten sobre la ventana del **cue**, no sobre la del libreto a secas —igual que **SALA-9**—. Si no, una entrada corregida a mano mueve la banda de color del personaje y deja su texto repartido sobre el sitio viejo. | 👁 |
| **BAN-4** | Un **carril por personaje**. Si dos hablan solapados —y en un diálogo se solapan constantemente— cada uno va por su altura. Un personaje conserva su carril mientras no se pise consigo mismo. | 👁 |
| **BAN-5** | Los tiempos de palabra salen del mismo reparto que el karaoke, incluido el afinado con IA cuando está puesto. | 👁 |
| **BAN-6** | Si el reparto de palabras devuelve un `NaN`, se **descarta el reparto entero** y se pinta la frase sin palabras sueltas. Un `NaN` vaciaba la banda completa sin decir nada. | 👁 |

## Reglas · modo estudio

| | Regla | |
|---|---|---|
| **EST-5** | El libreto **sigue al timecode** (ver PT-1: el reloj lo lleva Pro Tools, y el vídeo de aquí solo cuando no hay Pro Tools leyendo): el timecode manda y el parlamento que suena se marca y se coloca en pantalla. También con el vídeo **parado** y al **saltar**, aunque caiga en el mismo parlamento —arrastrar la barra buscando un momento y que el libreto no se mueva era la mitad del trabajo perdida. | ✅ |
| **EST-6** | Mientras una persona mueve el libreto con la mano, el vídeo **no se lo quita** durante un par de segundos. Sin eso es imposible adelantarse a leer. Pero un **salto** del vídeo sí manda: si salto a propósito, quiero ir ahí. | ✅ |
| **EST-8** | El seguimiento es un **estado propio**, con su botón en la barra del libreto, y se recuerda entre sesiones. Vivía en una casilla dentro de la tira de vídeo: al plegar la tira —que es justo lo que se hace para leer con el libreto entero— el libreto dejaba de seguir. | ✅ |
| **EST-9** | Encenderlo **coloca el libreto ya**, sin esperar al siguiente parlamento, que puede ser medio minuto mirando otra página. | ✅ |
| **EST-10** | El botón **no abre el vídeo**: es un interruptor aparte. Y encendido va **oscuro con la letra verde**, no verde: la barra del libreto es verde en modo grabación y un botón verde encima desaparece. | 👁 |
| **EST-7** | Si el parlamento que suena **no está en pantalla** —hay un solo personaje abierto— se dice por quién va el vídeo, con el botón para abrir el libreto entero. Antes no pasaba nada y parecía que el seguimiento estaba roto. Una vez por personaje. | ✅ |
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

## Reglas · timecode de Pro Tools

| | Regla | |
|---|---|---|
| **PT-1** | El botón **Seguir** cuelga del **contador de Pro Tools**, no del vídeo ni del audio que se suban a Dubbipt. Pro Tools es el reloj que manda en la sala; lo de aquí es material de consulta. El vídeo lleva el reloj **solo** si no hay Pro Tools leyendo, y entonces el botón lo dice: pone «Seguir · vídeo» en vez de «Seguir · PT». | ✅ |
| **PT-2** | El timecode se lee **de la pantalla**: se comparte la ventana de Pro Tools y se marca una vez el recuadro del contador grande. Sin instalar nada, sin cables y **sin MIDI** — se descartó a petición. | ✅ |
| **PT-3** | **El reloj no es la lectura.** Se engancha una vez y a partir de ahí cuenta solo con el reloj del navegador. Una lectura solo se acepta si **cuadra** con lo que el reloj ya predecía; la que no cuadra se tira. Esto es lo que hace viable leer una pantalla. | ✅ |
| **PT-4** | Si **varias** lecturas seguidas no cuadran pero coinciden **entre sí** sobre una misma recta —parado o a tiempo real—, es que han saltado en Pro Tools, y ahí sí se vuelve a enganchar. Se busca el **grupo mayor** que caiga en una recta, no que encajen todas: con la mitad de las lecturas malas, exigir que encajen todas no engancha nunca. | ✅ |
| **PT-5** | El reparto de las ocho cifras se calcula **una vez**, al enseñárselas, y se reutiliza. Calcularlo en cada fotograma era el fallo gordo: una partición mala estropea las ocho cifras a la vez. | ✅ |
| **PT-6** | Las casillas se cuelgan de una **rejilla** anclada en los dos puntos, no del centro de la tinta de cada cifra. Un **1** solo pinta su palo derecho, así que su centro de tinta cae medio dígito a la derecha: colocando por la tinta, cualquier timecode con un 1 salía torcido. | ✅ |
| **PT-7** | El recuadro y las cifras aprendidas **se recuerdan** entre sesiones. La ventana compartida no se puede recordar —el navegador no deja—, así que cada sesión hay que volver a compartirla, pero **nada más**. Por eso el botón Seguir abre el panel en vez de encenderse a secas. | ✅ |
| **PT-8** | Pro Tools **parado** deja el reloj quieto; no sigue corriendo solo. Se distingue por el **ritmo** de las lecturas aceptadas, no por creerse una sola. | ✅ |
| **PT-9** | Con Pro Tools llevando el reloj, el libreto se coloca **aunque no haya vídeo cargado**. El reloj del transporte y la onda son del vídeo y entonces no se pintan; el libreto sí. | ✅ |

| | |
|---|---|
| **PT-N1** | **Nunca mover el libreto con una lectura suelta.** Es la diferencia entre esto y lo que se descartó la vez pasada: leyendo a pelo, el libreto daba saltos absurdos una vez de cada dos. | ✅ |
| **PT-N2** | **Nunca dar por hecho de qué reloj cuelga el libreto.** Va escrito en el propio botón —«Seguir · PT» o «Seguir · vídeo»—, porque desde la mesa no hay otra manera de saberlo y son cosas muy distintas. | 👁 |

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
- **EST-5** a **EST-9**: `pruebas/seguir.prueba.js`. Quitar la guarda de la mano
  pone dos comprobaciones en rojo; volver a atar el seguimiento a que la tira de
  vídeo esté desplegada, una — y esa prueba se escribió justo después de romperlo a
  propósito y ver que ninguna se quejaba.
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
- **PT-1** a **PT-9**, en `pruebas/tcpantalla.prueba.js`. Las cifras se dibujan
  en la propia prueba como un contador de siete segmentos, así que el
  reconocimiento se prueba entero sin navegador. La sección 8 es la que
  justifica el diseño: simula una sesión con **la mitad de las lecturas
  inventadas** y exige que el reloj no se separe ni un fotograma del timecode
  de verdad. Seis mutaciones comprobadas: aceptar cualquier lectura pone seis
  comprobaciones en rojo; bastar una sola para creerse un salto, dos; colocar
  las casillas por el centro de la tinta, dos; trocear por la media de la
  columna, once; no distinguir parado de rodando, tres; y dar prioridad al
  vídeo sobre Pro Tools, una.
- El reconocimiento, además, **medido en un navegador de verdad** contra texto
  pintado con una fuente real y capturado como vídeo: 200 de 200 timecodes al
  azar. Y con degradaciones: ruido de compresión ±26, 100 %; contraste bajo,
  100 %; contador de 32 px, 100 %; cifras oscuras sobre fondo blanco, 100 %;
  fuente de ancho variable, 93 % —el contador de Pro Tools es de paso fijo—.
- Lo que **no** está probado contra la realidad: no se ha leído nunca un Pro
  Tools de verdad, ni una ventana compartida de verdad. El ruido simulado es
  por píxel; la compresión de compartir pantalla trabaja por bloques.

## Sin resolver

- **BAN-3** y **BAN-7**, en `pruebas/banda.prueba.js`, con un canvas de mentira
  que apunta cada trazo con su posición y su ancho ya escalado. La geometría es
  exacta porque el ancho de un carácter se fija en la prueba. Se comprueba el
  caso que llegó de sala: ninguna palabra se pisa **y** cada una sigue cruzando
  la línea en su instante. Quitar el estrechado pone dos comprobaciones en rojo.
- **SALA-5**, los beeps, **no se han oído nunca en una prueba**. La lógica que
  decide cuándo suenan está escrita y revisada, pero nadie ha comprobado con un
  cronómetro que caen a −3, −2 y −1 s. Es lo primero que hay que verificar en
  sala.
- El canvas de mentira ya existe (`pruebas/banda.prueba.js`) y cerró **BAN-3** y
  **BAN-7**. Con él se pueden cerrar también **SALA-1** a **SALA-4** y **BAN-1**,
  **BAN-2** y **BAN-4**, que siguen abiertas: es medir posiciones, y la máquina
  para medirlas ya está escrita.
- La captura de fotogramas del vídeo real (`drawImage` sobre el `<video>`) no
  se ha podido comprobar: hace falta una ventana que se esté pintando.
