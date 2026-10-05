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
| **SALA-5** | **Tres beeps** de 1 kHz, uno por segundo. **El cuarto no suena: ese es el de entrar.** Cada uno se **programa para su instante exacto** con el reloj del audio en cuanto el vídeo se acerca a su marca —hasta 0,12 s antes—, y si el bucle llega tarde suena ya, hasta 0,06 s después; más tarde, no. Antes sonaban en el primer fotograma que caía cerca, hasta **60 ms antes de tiempo**: se vio midiéndolos. Con el vídeo a otra velocidad, lo que falta se pasa a tiempo real. «Probar beeps» los da **uno por segundo**, no cada 0,7 s. | ✅ |
| **SALA-6** | Los beeps solo suenan con el vídeo rodando, y una sola vez por segundo y por cue. Volver atrás y pasar otra vez los vuelve a dar, los tres. | ✅ |
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
| **EST-11** | **El libreto se coloca desde el código, en píxeles, nunca con el deslizar suave del navegador.** Con la pestaña tapada por Pro Tools —lo normal en la sala— ese deslizar no avanza, y el libreto se quedaba arriba mientras el parlamento marcado se iba página abajo: medido con el contador de mentira, el parlamento 7 a 1050 px y el visor en 0. Tapado se coloca **de golpe**; mirando, con el **deslizar corto y acotado** de la casa (el de las páginas), y con un **plazo**: si el deslizar no llega —va con `requestAnimationFrame`, que se para si se tapa la pestaña a mitad de camino (ENT-N4)— pasados 450 ms se pone donde tocaba. Un salto va de golpe también mirando. El parlamento queda con su centro en la **línea de lectura** (el 42 % del visor, la misma con la que se entienden la tablet y el escritorio); uno **largo** deja el principio a la vista, que centrado entero empezaba fuera de pantalla. | ✅ |
| **EST-12** | **El parlamento se marca tres décimas antes de su timecode.** La vista tiene que estar en la línea cuando empieza a sonar, no llegar a ella entonces: quien lee se adelanta. Y entre leer el contador, mandar la posición y que la tablet se coloque pasan unas décimas: la marca salía de 40 a 130 ms después del timecode, y la tablet tardaba casi medio segundo más en asentarse. Con el adelanto la tablet llega a tiempo y en el escritorio la marca se enciende un parpadeo antes de que hable. Lo que **suena** sigue siendo lo que suena: la corrección de QC se apunta al parlamento sin adelanto (QC-29). | ✅ |
| **EST-13** | Siguiendo al **vídeo de aquí**, el libreto late cada **66 ms** mientras suena, desde un trabajador, como la lectura de Pro Tools. Antes solo se miraba con `timeupdate`, que el navegador dispara cuatro veces por segundo: la marca llegaba hasta un cuarto de segundo tarde. El latido solo mira si ha cambiado el parlamento; lo que se pinta en la tira sigue con `timeupdate`. | ✅ |
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
| **PT-2** | El timecode se lee **de la pantalla**: se comparte la ventana de Pro Tools y se marca una vez el recuadro del contador grande. Sin instalar nada, sin cables. El MIDI se descartó al principio pensando en cables y aparatos; ahora es la otra puerta, sin cables (PT-24). | ✅ |
| **PT-3** | **El reloj no es la lectura.** Se engancha una vez y a partir de ahí cuenta solo con el reloj del navegador. Una lectura solo se acepta si **cuadra** con lo que el reloj ya predecía; la que no cuadra se tira. Esto es lo que hace viable leer una pantalla. | ✅ |
| **PT-4** | Si **varias** lecturas seguidas no cuadran pero coinciden **entre sí** sobre una misma recta, es que han saltado en Pro Tools, y ahí sí se vuelve a enganchar. Se busca el **grupo mayor** que caiga en una recta, no que encajen todas: con la mitad de las lecturas malas, exigir que encajen todas no engancha nunca. La recta puede ir **a cualquier ritmo creíble**: parado, a tiempo real, rebobinando o avanzando rápido, hasta cuatro veces la velocidad en los dos sentidos; más rápido es una cifra mal leída. Antes solo se creía parado o a tiempo real y el resto se tiraba: llegó de sala «sincroniza cuando se maneja lento, pero a cambios abruptos no», y mientras el técnico rebobinaba o arrastraba el cursor el libreto se quedaba quieto. Y si Pro Tools salta y se queda **parado**, **dos** lecturas iguales y seguidas bastan: parado la lectura es exacta. | ✅ |
| **PT-5** | El reparto de las ocho cifras se calcula **una vez**, al enseñárselas, y se reutiliza. Calcularlo en cada fotograma era el fallo gordo: una partición mala estropea las ocho cifras a la vez. | ✅ |
| **PT-6** | Las casillas se cuelgan de una **rejilla** anclada en los dos puntos, no del centro de la tinta de cada cifra. Un **1** solo pinta su palo derecho, así que su centro de tinta cae medio dígito a la derecha: colocando por la tinta, cualquier timecode con un 1 salía torcido. Los dos puntos se encuentran por su forma (PT-16) y el paso de cifra se mide (PT-17). | ✅ |
| **PT-7** | El recuadro y las cifras aprendidas **se recuerdan** entre sesiones. La ventana compartida no se puede recordar —el navegador no deja—, así que cada sesión hay que volver a compartirla, pero **nada más**. Por eso el botón Seguir abre el panel en vez de encenderse a secas. | ✅ |
| **PT-8** | Pro Tools **parado** deja el reloj quieto; no sigue corriendo solo. Se distingue por el **ritmo** de las lecturas aceptadas, no por creerse una sola. | ✅ |
| **PT-9** | Con Pro Tools llevando el reloj, el libreto se coloca **aunque no haya vídeo cargado**. El reloj del transporte y la onda son del vídeo y entonces no se pintan; el libreto sí. | ✅ |
| **PT-10** | **Las cifras se aprenden solas con Pro Tools rodando.** Se escribe **una vez** lo que pone el contador, con Pro Tools parado, y se le da al play. La casilla de las unidades de segundo pasa por las diez cifras en diez segundos, en orden, y contando sus cambios se sabe qué cifra hay **sin leerla**. Antes había que escribir el timecode varias veces moviendo el cursor hasta ver las diez: un 01:00:00:00 solo trae dos. Un cambio cuenta cuando **dos fotos seguidas** coinciden entre sí y no con la anterior —la de en medio de la transición trae las dos cifras mezcladas—, y solo si llega **un segundo** después del anterior, o dos o tres si uno no se vio. Arrastrando el cursor en vez de reproducir no se aprende **nada**: una cifra aprendida con el dibujo de otra estropea la lectura para siempre. Lo contado no se guarda hasta haber visto el ritmo, ni si se parece demasiado a otra cifra ya conocida. | ✅ |
| **PT-11** | Mientras aprende, el latido sale de un **trabajador en segundo plano**, no de un temporizador de la página. Para darle al play hay que ir a Pro Tools, que tapa Dubbipt, y con la ventana tapada el navegador frena los temporizadores **a uno por segundo** —se vio probándolo—. Si aun así queda un **hueco** entre dos fotos y en él cambió la cifra, se para y se dice: un cambio que no se sabe cuándo pasó no se cuenta. | ✅ |
| **PT-12** | El recuadro **se ajusta solo** a las cifras cuando se coge de más —la etiqueta, el marco del contador, un trozo de ventana—, que era el fallo de siempre al marcarlo sobre la pantalla entera. Se busca la franja de texto más alta y en ella once trozos con forma de timecode. Los dos puntos se reconocen por las **filas con tinta**, no por su ancho ni por su alto: un 1 es tan estrecho como unos dos puntos, y unos dos puntos de verdad llegan casi tan arriba como una cifra, pero tienen un hueco en medio. Medido con Consolas: las cifras, del 95 al 100 % de las filas; los dos puntos, el 51 %. Las casillas se sacan al aceptar el recuadro, no en cada lectura (PT-5). Ahora se busca primero por los **dos puntos** (PT-16), con las mismas casillas que leerán, y el recuadro queda de la primera cifra a la última con un **cuarto de cifra** de margen: más que lo que se deja bailar una cifra (PT-18) y menos que lo que suele haber hasta la etiqueta. Los trozos quedan de segundo intento. La lupa enseña **lo ajustado**, que es lo que se guarda, y dice si encuentra el contador, no cuántos trozos ve. | ✅ |
| **PT-13** | **Los días siguientes solo hay que compartir.** Con el recuadro y las diez cifras guardados, en cuanto se comparte se arranca y el panel se quita de en medio. Si falta el recuadro, compartir abre directamente la pantalla de marcarlo; si faltan cifras, el panel con el cursor ya en la casilla. Aceptar el recuadro con las cifras ya conocidas también arranca. | ✅ |
| **PT-14** | El panel enseña **lo que está leyendo ahora**, con el recorte del contador al lado: se sabe de un vistazo si está bien, sin arrancar y mirar si el libreto se mueve. Y los pasos llevan su marca de hecho. | 👁 |
| **PT-15** | El botón dice **«Seguir · leyendo…»** mientras lee la pantalla sin haberse enganchado todavía; antes salía «Seguir · vídeo», que era mentira dos veces. Y el **parlamento que suena se recuadra** también sin la tira de vídeo abierta: el estilo solo se ponía al abrirla. | ✅ |
| **PT-16** | **Los dos puntos se reconocen por su forma**, columna a columna, y no por ser un trozo de tinta suelto. Es lo que arregla lo que llegó de sala: «el seguimiento no funciona aún, no lo reconoce». El reparto necesitaba **once trozos exactos**, y con letra de verdad las cifras se parten o se pegan —un 1 con su banderita, dos cifras que se tocan en letra pequeña, la etiqueta en la misma línea—: medido con texto pintado con fuentes de verdad, reconocía **56 de 105** contadores. Una columna de dos puntos tiene **exactamente dos manchas**, nada en la parte de arriba de las cifras, hueco entre ellas y la de abajo pegada a la base; ninguna cifra tiene una columna así. Se buscan **tres a la misma distancia** y a distancia de timecode —entre uno y otro caben dos cifras—, prefiriendo los que van sueltos. Si con el umbral fijo no salen, se mira cada columna contra lo más claro de ella: pequeños y algo borrosos, los dos puntos no llegan a medio gris. Vale también el **punto y coma** del timecode con salto de cuadro. Sin dos puntos a la vista, por trozos, como antes. | ✅ |
| **PT-17** | **El paso de cifra se mide**, no se supone. Entre dos dos puntos van dos cifras y un separador, y cuánto de eso es separador depende de la letra: en una de **ancho fijo** el separador ocupa lo que una cifra; en una normal, la mitad. Partiendo a medias, en ancho fijo la primera cifra de cada pareja quedaba pegada a un lado de su casilla y la segunda al otro, y no se parecían: **0 de 21** contadores con Courier. Se mide con la tinta de las dos parejas de dentro, que no pueden llevar nada colado, y se queda entre lo del ancho fijo y lo de la letra normal. La casilla es un **5 % más estrecha** que el paso: más ancha se come un trozo de la cifra de al lado. | ✅ |
| **PT-18** | **Cada cifra se compara corrida**: hasta un **18 %** del ancho de su casilla a cada lado —un píxel como poco— y un píxel arriba y abajo, y cada plantilla se queda con su mejor parecido. La plantilla de un 0 se aprendió en su casilla, y el 0 que se lee puede caer en otra con la cifra un píxel más allá. Lo que se aprende de una lectura buena se mezcla con la casilla **corrida donde mejor casa**: mezclándola quieta, la plantilla se emborronaba. | ✅ |
| **PT-19** | **Una cifra mal aprendida tiene arreglo.** Al escribir a mano lo que pone el contador se sabe qué cifra hay en cada casilla: si con lo aprendido se leería **como otra, o por los pelos**, esa plantilla se tira y se queda con lo de ahora. Antes se mezclaba un 15 % y seguía mala para siempre. Y el panel tiene **«Empezar de cero»**, que pregunta y olvida el recuadro, las casillas y las cifras, pero no los fotogramas ni el ajuste fino, que son de la sala. Las casillas y las cifras **guardadas con el reparto de antes se olvidan** al cargar —con ellas se seguiría sin leer—; el recuadro y los ajustes, no. | ✅ |
| **PT-20** | **El seguimiento late desde un trabajador en segundo plano**, como el aprendizaje (PT-11), y no desde un temporizador de la página. Con Dubbipt tapado por Pro Tools —lo normal en la sala— el navegador frena los temporizadores de la página a **uno por segundo**, y para enganchar hacen falta tres lecturas en segundo y medio: **no enganchaba nunca**. Se vio en el navegador, con las diez cifras aprendidas y cada lectura bien leída. Si una vuelta tarda más que el latido, los latidos pegados se saltan en vez de hacer cola. | ✅ |
| **PT-21** | **Si no engancha, dice por qué**, una vez, a los **seis segundos** de arrancar —antes no, que al principio la ventana puede estar tapada—: que no llega imagen, que en el recuadro **no está el contador** —se ha movido la ventana o está tapada— o que el contador está pero **no entiende sus cifras**. Son tres cosas que se arreglan distinto, y antes no se decía ninguna. | ✅ |
| **PT-22** | La foto del recuadro se **reduce** a 480 píxeles de lado mayor antes de leerla. El Big Counter en una pantalla grande, a tamaño real, costaba **60 ms** cada lectura: el hilo de la página casi entero, quince veces por segundo. Reducido lee igual. | ✅ |
| **PT-24** | **El timecode también llega por MIDI (MTC), y es el camino bueno cuando se puede.** Pro Tools genera MIDI Time Code de serie —Setup › Peripherals › Synchronization › *MTC Generator Port*, y *Gen MTC* en el transporte— y Chrome lo recibe con Web MIDI: exacto al fotograma, con los saltos y a la velocidad que sea, sin leer píxeles ni enseñar cifras. En el mismo equipo no hace falta cable: en Mac el IAC viene de fábrica, en Windows loopMIDI (gratis). Los ocho cuartos de trama (F1) se juntan en un timecode —hacia delante sumando los dos fotogramas que tardan en llegar; hacia atrás también se juntan; una pieza perdida no se mezcla con las de la vuelta anterior—, el timecode entero por sysex al localizar deja el reloj parado ahí, y sin cuartos de trama en un cuarto de segundo Pro Tools está parado donde dijo el último. Engancha **el mismo reloj** que la lectura de pantalla: el botón, el libreto y las correcciones de QC no saben de dónde viene. Mientras llega MIDI la pantalla no se lee, no falta nada para seguir, y no se suma el retardo de leer. El puerto se recuerda **por nombre** y los días siguientes se conecta solo, sin pedir nada; sin puerto recordado no se pide ni el permiso. El tipo de fotogramas del MTC pasa al reloj. | ✅ |
| **PT-25** | **Una captura para revisar.** Cuando en la sala «no sincroniza», desde fuera no se ve nada: el panel tiene «📷 Guardar captura para revisar», una imagen con el recuadro aumentado y sus casillas, las diez cifras aprendidas y el diario de las últimas lecturas —qué se leyó, con qué confianza y qué se hizo con cada una: cuadra, salto, duda, mala—. Se manda y se arregla contra lo real. | ✅ |
| **PT-23** | **El reloj no tiembla ni va por detrás.** Rodando, cada lectura que cuadra **acerca** el reloj a ella un cuarto del camino, en vez de saltar a ella: una lectura es un fotograma entero —el contador enseña el mismo número durante 40 ms— y saltando el reloj iba a trompicones de hasta un fotograma (medido: 20 ms de desviación y saltos de 100 ms; ahora, 5 ms). Parado, o tras un salto, a la lectura tal cual. Y se suma lo que se **sabe** que va por detrás una lectura: medio fotograma del contador y media imagen de la captura, 37 ms a 25 fotogramas. Con el contador de mentira iba 43 ms por detrás; ahora, a menos de un fotograma. Lo que tarde además la captura de pantalla del equipo sigue siendo del ajuste fino. | ✅ |

| | |
|---|---|
| **PT-N1** | **Nunca mover el libreto con una lectura suelta.** Es la diferencia entre esto y lo que se descartó la vez pasada: leyendo a pelo, el libreto daba saltos absurdos una vez de cada dos. | ✅ |
| **PT-N2** | **Nunca dar por hecho de qué reloj cuelga el libreto.** Va escrito en el propio botón —«Seguir · PT» o «Seguir · vídeo»—, porque desde la mesa no hay otra manera de saberlo y son cosas muy distintas. | 👁 |
| **PT-26** | **La hora de Pro Tools y la del libreto pueden no ser la misma.** Llegó de sala: «recibiendo a 24 fps dice, pero no cambió el libreto». El timecode llegaba bien por MIDI —una sesión a 23,976 se envía como MTC de 24 y se lee como 24: no era el fotograma—; lo que no cuadraba era la **hora**. El seguimiento comparaba el timecode de Pro Tools con los del libreto tal cual, y una sesión que empieza en 01:00:00:00 con un libreto que cuenta desde 00:00:00:00 —la lista de diálogos de Netflix (LIB-25), o un libreto hecho con ella— cae siempre «después del último parlamento»: el libreto se queda clavado al final. Ahora, antes de buscar el parlamento, se le restan al timecode de Pro Tools las **horas enteras** que lo separan del libreto. Se sacan solas: si solo una diferencia de horas deja a Pro Tools dentro del libreto —con dos minutos de margen por delante y por detrás—, es esa. Si valen varias —un libreto de más de una hora—, se descarta la que dejaría fuera el timecode más bajo o el más alto que ya se le ha visto a Pro Tools, y entre las que queden se toma la de costumbre: una sesión empieza en 01:00:00:00, así que con un libreto desde cero es una hora y con uno que ya cuenta desde la una, ninguna. Con la **misma hora no se resta nada**: el caso de siempre no se toca. **Se dice lo que se ve**, una vez por capítulo: que va con una hora de diferencia y a qué equivale, que no coinciden ni con horas de diferencia, o que el libreto no trae timecodes. En el panel del timecode se puede **fijar a mano** —«cuentan igual» o tantas horas por delante o por detrás— y se recuerda por capítulo en ese equipo. El contador y el tiempo que se apunta en una corrección de QC **siguen siendo los de Pro Tools**; la hora del libreto solo se usa para saber qué parlamento suena. | ✅ |
| **PT-27** | **Un timecode mal escrito no para el seguimiento.** Llegó de sala, después de buscarlo en la hora (PT-26): «un diálogo tiene mal marcado el timecode: pasa de 00:16:45:00 a 01:16:50:00 y luego continúa normal, 00:16:55:00. Ahí es donde ocurre el problema». El seguimiento recorría el libreto hasta el primer timecode mayor que el de ahora, y ese 01:16:50 **paraba ahí la búsqueda**: desde ese parlamento hasta el final el libreto ya no seguía a nadie. Ahora se busca sobre los **tiempos limpios**. De todos los timecodes del libreto se toma la fila más larga que no retrocede —los fiables—, y los que se salen se recolocan: si quitándole o poniéndole **horas enteras** cabe entre el de antes y el de después, es una hora mal escrita y se usa corregido; si se sale por poco —dos que se pisan—, se mete entre sus vecinos lo más cerca de lo que pone y no se dice nada; si se sale por **medio minuto o más** y no es cosa de horas, no se sabe cuál es y se pone a medio camino. En el primer parlamento y en el último, que solo tienen un vecino, la hora corregida tiene que caer a menos de diez minutos de él: sin ese tope cualquier hora «cabría». **Los timecodes del libreto no se tocan.** Los limpios sirven para saber qué parlamento suena, qué trozo de audio le toca a cada uno en «Analizar cambios» —al de antes de la errata le tocaba una hora entera de audio— y de dónde a dónde va el libreto (PT-26). Y **se dice cuál es**, una vez al empezar a seguir: página, personaje, lo que pone, entre cuáles está y cómo se sigue, para que alguien lo corrija en el guion. | ✅ |

## Nunca

| | |
|---|---|
| **SALA-N1** | Nunca dibujar por encima de la imagen algo que capture el ratón. La capa de señalización no recibe clics. | 👁 |
| **ADR-N1** | Nunca guardar en el cue lo que ya está en el libreto. Duplicarlo garantiza que un día no coincidan. | 👁 |
| **EST-N2** | **Nunca ampliar una lista de excepciones por identificador.** Lo que nazca después queda fuera y nadie se entera: el elemento se crea entero y se le pone `display:none`. Así estuvieron los cuatro paneles de las herramientas de vídeo — se pulsaba el botón y no pasaba nada. Se exime por clase. | ✅ |
| **EST-N3** | **Nunca colgar de body una pantalla sin eximirla de la regla de ddlov.** Volvio a pasar con la pantalla de marcar el recuadro del contador: nacio sin clase y desde sala se reporto que «se coloca abajo del libreto y no deja elegir». La prueba no lo vio porque miraba una lista escrita a mano de cuatro paneles. Ahora se buscan **todas** las pantallas del codigo y ninguna nueva puede nacer escondida. | ✅ |
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
- **EST-11** a **EST-13**, en las secciones 6b a 6f de `pruebas/seguir.prueba.js`,
  con un libreto de mentira que tiene geometría —cada parlamento a 400 px y de
  120 de alto, el visor de 1000— y un deslizar de mentira que apunta a qué
  píxel se coloca el visor y cómo: se comprueba el píxel exacto (40 para el
  segundo parlamento), que tapado va de golpe, que un parlamento de dos
  pantallas deja su principio en el tercio de arriba, que el plazo pone el
  visor si el deslizar se quedó a medias y no si entre medias se pidió otro
  sitio, que la posición se manda al momento marcada como del seguimiento, el
  adelanto de tres décimas, y el latido del vídeo dado a mano. En la sección
  19, la tablet: lo marcado como del seguimiento va con el deslizar corto —o de
  golpe tapada—, sin el motor de los gestos y sin reenviarse, y mi mano manda.
- **PT-24**, en `pruebas/mtc.prueba.js`, con un Web MIDI de mentira: los ocho cuartos
  de trama y sus tipos, hacia atrás, con una pieza perdida y entrando a mitad de
  vuelta; el timecode entero y lo que no lo es; que engancha el reloj de la
  lectura de pantalla y le pasa el ritmo —a tiempo real y al doble— y el tipo
  de fotogramas; que sin cuartos de trama se para donde estaba y no donde estaría;
  que se recuerda el puerto por nombre y se conecta solo, y sin puerto recordado
  no se pide el permiso; y que la pantalla se calla mientras llega MIDI. Treinta
  y dos mutaciones con las de PT-4 y PT-25, todas en rojo: seis nacieron verdes y
  se cerraron. Y en el navegador, con un puerto de mentira y un Pro Tools de
  mentira que genera MTC: el libreto sigue a 30 ms del contador, un localizar
  con Pro Tools parado salta al parlamento 71 al momento, y al parar se queda.
  Lo que **no** se ha probado es un Pro Tools de verdad generando MTC.
- **PT-4** (los ritmos) y **PT-25**, en la sección 7b de `pruebas/tcpantalla.prueba.js`:
  rebobinando el reloj va hacia atrás, al triple corre al triple, un salto parado
  se recoge con dos lecturas iguales y uno rodando con tres, a diez veces no se
  mueve, y el diario apunta cada lectura con lo que se hizo, con tope.
- **PT-23**, en la sección 9b de `pruebas/tcpantalla.prueba.js`: un Pro Tools
  rodando de verdad, leído cada 66 ms con el fotograma truncado y la imagen de
  la captura con hasta 33 ms de edad; el reloj tiene que ir a menos de 10 ms
  del contador, con menos de 8 de desviación y sin saltos de un fotograma.
- Y **medido en el navegador** con el libreto abierto y el contador de mentira:
  antes, la marca 40–130 ms después del timecode y el visor quieto en 0 con la
  pestaña tapada; ahora, la marca unos 250 ms antes, el visor en su píxel
  también tapado, y el reloj a 26 ms del contador rodando.
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
- **PT-1** a **PT-22**, en `pruebas/tcpantalla.prueba.js`. Las cifras se dibujan
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
- **PT-16** a **PT-22**, en las secciones 17 a 24 de la misma prueba, con el
  contador de siete segmentos cambiado para que tenga lo que rompía el reparto:
  dos puntos anchos como en letra de ancho fijo, las cifras de cada pareja
  pegadas, la etiqueta en la misma línea, cifras corridas y dos puntos tenues.
  Por trozos, con las cifras pegadas o la etiqueta al lado, no salía reparto;
  ahora las ocho casillas caen centradas en sus cifras y se lee lo que pone.
  El latido se prueba con uno de mentira que se da a mano. Cuarenta y tres
  mutaciones, todas en rojo: diez nacieron verdes y se cerraron.
- Y **medido en el navegador**, con texto pintado con fuentes de verdad —Arial,
  Segoe UI, Tahoma, Verdana, Calibri, Consolas, Courier New, Lucida Console y
  Trebuchet—, de 12 a 44 píxeles, solo, con la etiqueta «Main» al lado y con
  marco y subcontador: el reparto nuevo, **189 de 189** contadores leídos (el
  de antes, 56 de 105 con las cinco primeras y 0 de 21 con Courier). En
  negrita, 167 de 168; algo borroso, 183 de 189; con punto y coma, 83 de 84.
  Con el código de la aplicación entero, de enseñar a leer, 183 de 189: los seis
  que faltan son Courier a 12 y 14 píxeles, que lee bien pero por los pelos y
  descarta. Y con una ventana de Pro Tools de mentira compartida como vídeo:
  rodando, el libreto va a **50 ms** del contador; un salto se recoge en
  **0,2 s**; parado se queda quieto; con la pestaña escondida sigue leyendo a
  quince por segundo; y los días siguientes, compartir basta para arrancar.
- Lo que **no** está probado contra la realidad: no se ha leído nunca un Pro
  Tools de verdad, ni una ventana compartida de verdad. El ruido simulado es
  por píxel; la compresión de compartir pantalla trabaja por bloques. La letra
  del contador de Pro Tools no se ha medido: por eso se probó con nueve.
- **EST-N3**, en la seccion 6 de `pruebas/paneles.prueba.js`: no hay lista de
  pantallas que mirar. Se busca cada `document.body.appendChild` del codigo que
  se despliega, se averigua su etiqueta, su identificador y sus clases, y se le
  aplica la regla. Lo que ya estaba escondido esta apuntado por su nombre para
  que la prueba pueda decir lo unico que importa: que no aparezca ninguno nuevo.
  Quitarle la clase a la pantalla del recuadro pone dos comprobaciones en rojo.
  Buscandolas asi se encontraron ademas dos que llevaban tiempo rotas: el aviso
  de fallo y el karaoke, los dos invisibles justo con el libreto abierto, que es
  cuando hacen falta.
- **PT-26**, en `pruebas/horapt.prueba.js`, con los números de «A Filipino
  Christmas» —el libreto va de 00:00:10 a 01:09:42—: de dónde a dónde va un
  libreto; la misma hora, que no resta nada; una hora por delante y por
  detrás, y una sesión en 10:00:00:00; los dos minutos de margen y un segundo
  más; el libreto de más de una hora, con la de costumbre y con lo ya visto
  corrigiéndola; fijada a mano; lo que se dice y que se dice una sola vez; el
  cambio de capítulo; y el desplegable del panel. Treinta y siete mutaciones: dos nacieron verdes —el orden entre los timecodes propios y los efectivos, y la costumbre con un libreto que no cuenta desde cero, que era una rama sin efecto y se quitó— y se cerraron. Y en el
  navegador, con un timecode metido por el mismo camino que el MIDI: Pro
  Tools en 01:06:55 y un libreto desde cero iba al último parlamento, y ahora
  marca el de 00:06:50 y avisa de la hora de diferencia.
- **PT-27**, en `pruebas/tiemposlimpios.prueba.js`, con el caso de sala tal cual
  —00:16:45, 01:16:50, 00:16:55—: los tiempos en orden con el mal escrito en su
  sitio; qué parlamento suena antes, en él y después, hasta el final; una hora
  de menos, dos de más, diez minutos de más, el primero y el último del
  libreto, dos seguidos y el que hereda del mal escrito; lo que NO es una
  errata —dos que se pisan por dos segundos, y el listón de medio minuto—;
  libretos sin timecodes y de antes; que se calcula una vez y otra cuando
  cambia; el aviso, una sola vez; y el trozo de audio de cada parlamento. Las
  mutaciones se corren después de desplegar. Y en el navegador, con un libreto
  de 260 parlamentos y esa errata en el 201: antes el seguimiento se quedaba
  en 00:16:45 y ahora llega a donde va Pro Tools, con el aviso nombrando la
  página, el personaje y el timecode.

## Sin resolver

- **PT-26**: **no era lo que pasaba en sala** —era PT-27—. La hora de
  diferencia se queda porque el caso existe —la lista de Netflix cuenta desde
  cero—, pero no se ha visto con una sesión de verdad. Solo se contemplan
  horas enteras, y la hora fijada a mano se guarda en el equipo, no viaja con
  el capítulo.
- **PT-27**: una errata en el **último** parlamento que lo adelanta —una hora
  de más al final— no retrocede, así que no se distingue de un timecode
  bueno. Y el parlamento con la errata no se marca en el propio libreto: solo
  lo dice el aviso. No se ha visto todavía con el libreto de sala.
- **BAN-3** y **BAN-7**, en `pruebas/banda.prueba.js`, con un canvas de mentira
  que apunta cada trazo con su posición y su ancho ya escalado. La geometría es
  exacta porque el ancho de un carácter se fija en la prueba. Se comprueba el
  caso que llegó de sala: ninguna palabra se pisa **y** cada una sigue cruzando
  la línea en su instante. Quitar el estrechado pone dos comprobaciones en rojo.
- **SALA-5** y **SALA-6**, en `pruebas/beeps.prueba.js`: se corre el `salaBeeps` de
  verdad con el vídeo avanzando fotograma a fotograma —a 60, 30, 25, 24 y 10 imágenes
  por segundo, con cualquier desfase, y al doble de velocidad— y se apunta el
  instante al que queda programado cada pitido. La prueba encontró que sonaban
  **50 ms antes de tiempo** a 60 imágenes por segundo, y hasta 60 ms con otras;
  ahora caen en su marca. Doce mutaciones, todas en rojo; una nació verde y se
  cerró. Lo que la prueba **no** mide es lo que tarda el altavoz de sala en dar
  lo programado —la latencia de salida del equipo, decenas de milisegundos en
  Windows—: eso sigue siendo para comprobar en sala, con el cronómetro.
- El canvas de mentira ya existe (`pruebas/banda.prueba.js`) y cerró **BAN-3** y
  **BAN-7**. Con él se pueden cerrar también **SALA-1** a **SALA-4** y **BAN-1**,
  **BAN-2** y **BAN-4**, que siguen abiertas: es medir posiciones, y la máquina
  para medirlas ya está escrita.
- La captura de fotogramas del vídeo real (`drawImage` sobre el `<video>`) no
  se ha podido comprobar: hace falta una ventana que se esté pintando.
