# 01 · Libreto

## Para qué

Convertir un guion —un PDF, un Word, o un desglose de Excel— en la lista de
intervenciones con la que se trabaja: quién habla, qué dice, en qué página y en
qué timecode. Todo lo demás de la aplicación se apoya en esta lista, así que un
error aquí se propaga a todo.

El modelo es siempre el mismo:

- `script[]` — una entrada por intervención: `{ idx, key, display, tcSec, tcEff, page, lines[] }`
- `chars[]` — una entrada por personaje: `{ key, display, talent, pages[], totalInts, color }`
- `charIdx` — los personajes por clave
- `scriptByKey` — los índices de `script` de cada personaje

## Reglas

| | Regla | |
|---|---|---|
| **LIB-1** | La clave de un personaje (`key`) sale de `norm(nombre)`: sin tildes, sin apóstrofos, sin puntos, en mayúsculas y con los espacios colapsados. Así «O'BRIEN» y «OBRIEN», o «DR. KIM» y «DR KIM», son el mismo personaje. **Todos** los caminos que crean personajes la usan: el desglose de Excel, el conteo por reglas del propio libreto, el escaneo del PDF y el lector de Word. | ✅ |
| **LIB-2** | El `display` conserva el nombre **tal como está escrito en el guion**. La clave es para casar; el display, para leer. | ✅ |
| **LIB-3** | `tcEff` es el timecode efectivo en **segundos de reloj**, con la hora del rollo incluida. Una línea sin timecode propio hereda el de la anterior (cascada). | ✅ |
| **LIB-4** | Un timecode en el mismo renglón que el nombre del personaje es **el timecode de esa intervención**, nunca su primera línea de diálogo. | ✅ |
| **LIB-5** | Un timecode al final de un renglón pertenece a la intervención que **empieza**, no a la que acaba. | ✅ |
| **LIB-6** | El número de página impreso en el PDF no es diálogo y se descarta. | ✅ |
| **LIB-7** | Un renglón que es solo un honorífico abreviado (`REV.`, `DR.`, `SR.`) no es un personaje completo: el nombre real viene en el siguiente. | 👁 |
| **LIB-8** | Los guiones de **audiodescripción** se detectan por su patrón de tabla (número de toma + timecode, numeración creciente), no por lo que hubiera cargado antes. | ✅ |
| **LIB-9** | Con un desglose de doblaje real presente, la audiodescripción exige un patrón masivo: **≥ 20 tomas** y **la mitad de las páginas**. Un libreto de doblaje no puede ser secuestrado por seis filas que parezcan tomas. | ✅ |
| **LIB-10** | Los encabezados y pies que se repiten en **≥ 60 %** de las páginas no son guion y se descartan. | 👁 |
| **LIB-11** | Dos personajes se pueden **fusionar** (`MARCUS (VO)` + `MARCUS`). Al fusionar, el primario absorbe las páginas, el progreso y el talento del otro si él no tenía. | 👁 |
| **LIB-12** | Las fusiones se aplican sobre una copia **cruda** (`_charsRaw`). Deshacer una fusión reconstruye desde ahí: nunca se pierde el reparto original. | 👁 |
| **LIB-13** | Al rehidratar un capítulo guardado, todo lo que venga de la nube se **sanea**: los números se fuerzan a número, los textos a texto, y el color se **recalcula siempre** en vez de confiar en el guardado. | 👁 |

| **LIB-14** | Con un personaje abierto, el libreto enseña **cuántas líneas tiene**: es la unidad con la que se paga y con la que se cita a un actor a una sesión, o sea el número que más se consulta. Estaba solo en la tarjeta. | ✅ |
| **LIB-15** | Se enseñan **líneas y parlamentos por separado**, cada uno con su nombre. Son cosas distintas —las líneas son la unidad del desglose; los parlamentos, las cajas que se leen en pantalla— y un personaje con cuarenta parlamentos cortos puede tener sesenta líneas. | ✅ |
| **LIB-16** | Si el personaje **no tiene ni un parlamento** en el libreto, se dice ahí mismo. Es el síntoma de **LIB-N4** —la clave que no casa— y callarlo fue lo que hizo que `PÚBLICO` pasara desapercibido. | ✅ |

| **LIB-17** | La cuenta y el talento van en **una sola banda**, y el nombre del personaje sale **una vez**. Eran dos filas apiladas con el nombre repetido; en la segunda caía justo detrás de la palabra «Talento», y «TALENTO MELODIE GODBY» se leía como si el actor se llamara igual que el personaje. | ✅ |
| **LIB-18** | La banda **publica su alto** (`--lbarsH`) y **todo lo que va fijo arranca debajo**: la flecha de ocultar la barra, el riel de páginas y la pestaña de Ocupación. Tiene una fila o dos según el ancho, así que un número fijo se queda corto o largo — la flecha acababa sobre el nombre, la banda se comía el «PÁG.» del riel, y la pestaña tapaba el botón de quitar el talento. | ✅ |
| **LIB-19** | La **acotación** que cuelga del nombre no veta la cabecera, se escriba como se escriba. Antes solo se retiraban los paréntesis vacíos, los de la lista conocida y los que fueran **todo mayúsculas**: escrito (ARCHIVO) el personaje aparecía y escrito (Archivo) desaparecía del libreto sin una sola pista. Llegó de sala con TESTIGO, que salía con cero parlamentos. Lo que separa una acotación de la narración no es el tamaño de la letra: es que sea **corta** —hasta cuatro palabras— y **sin puntuación de frase**. | ✅ |
| **LIB-20** | Cuando a un personaje le **faltan** parlamentos, el libreto lo dice y **nombra los renglones**: cuántas cabeceras suyas se reconocieron, cuántas no, y cuáles son las que no. Antes el aviso solo salía con el personaje a **cero**, así que una pérdida parcial era muda — lo único que se veía era que faltaba texto. Un renglón cuenta como cabecera perdida con la **misma regla que usa el lector del PDF**: el nombre en mayúsculas —o seguido de dos puntos— y detrás solo relleno, o los dos puntos y lo que se dice. Con «empieza por el nombre» a secas no vale, y se vio en sala: VALERIE tenía sus 32 cabeceras y el aviso saltaba igual, porque un personaje nombra a otro todo el rato y muchas veces al principio del renglón (`Valerie (váleri), (GESTO) / cuando te miro a los ojos…`). **Un aviso que salta cuando no pasa nada deja de significar algo.** Y al reves: si NO hay ni una cabecera candidata, se enseñan los renglones que se le **PARECEN** -por alguna palabra larga de su nombre- tal cual vienen del guion, con sus **letras una a una**. Llego de sala con PAL TOBIAS, un nombre noruego: veintiseis de veintisiete personajes bien y ese a cero, con la lista vacia y nada que mirar. Una letra con trazo -Å, Ø, Æ- que el lector del PDF escupa distinta hace que el nombre no case aunque a la vista sea el mismo. | ✅ |
| **LIB-21** | **Dos cabeceras pegadas: la segunda no es una cabecera, es el texto de la primera.** En estos guiones cada intervención es timecode, nombre y debajo lo que se dice, así que un nombre justo debajo de otro —sin una línea de diálogo en medio— no puede ser alguien que habla. Llegó de sala con los rótulos: GRÁFICA lee lo que sale escrito en pantalla, y lo escrito suele ser un nombre — `GRÁFICA / GORDA NAN / MAMÁ DE BIG JOHN`. GORDA NAN se llevaba el renglón, GRÁFICA se quedaba con la caja **vacía** y a GORDA NAN se le colgaba un parlamento que no dice. Solo cuenta si la de arriba se queda **sin nada detrás**: con su diálogo en el mismo renglón («JOE: hola»), la de abajo es de verdad. Y se encadena. | ✅ |
| **LIB-22** | La banda **se vuelve a medir cuando cambia de alto**, no solo al pintarse. Mide una fila o dos según el ancho, y eso cambia sin que nadie la repinte: al estrechar la ventana, al abrir el libreto en media pantalla o cuando acaba de cargar la tipografía. El valor se quedaba viejo y lo que cuelga de él se quedaba ARRIBA — llegó de sala la pestaña de Ocupación tapando el botón de guardar el talento. Medido: a 1000 px la banda ocupa 45 y la variable dice 45; estrechada a 430 pasa a 64 y la variable sigue diciendo 45, así que la pestaña arranca en el 113 y la banda no acaba hasta el 118. Se vigila por **dos vías** —observador de tamaño y aviso de ventana— porque el observador no se pudo comprobar en un navegador de verdad. | ✅ |
| **LIB-23** | La **barra de herramientas** también se vuelve a medir cuando cambia de alto. Se parte en más filas al estrecharse el hueco del libreto, y abrir el cajón de Ocupación le quita 320 px de golpe **sin que la ventana cambie de tamaño**, así que el oyente de resize que ya había no se enteraba: el cajón entero —y su pestaña— arrancaban encima de la barra. Medido: a 900 px la barra ocupa 50 y la variable dice 50; con el cajón abierto pasa a 91 y la variable sigue diciendo 50, así que la pestaña empieza en el 64 y la barra no acaba hasta el 91. Se vigila **el elemento**, que es lo único que se entera. | ✅ |
| **LIB-24** | Dubbipt lee tambien el guion de Word **en tabla**: tres columnas —timecode, personaje y lo que dice—, un renglon por subtitulo. Manda la **segunda columna**: con nombre empieza un parlamento nuevo y vacia es el mismo personaje. Los renglones sin timecode y sin personaje cuyo primer parrafo nombra a un personaje son **rotulos** y van a GRAFICA, no a quien hablaba. Una **linea son doce palabras**, contadas sobre el parlamento entero: fila a fila saldria el doble. Los nombres se pasan a MAYUSCULAS, como en los desgloses. El lector de Word que ya habia busca nombres en mayusculas al principio del renglon y con este guion no encontraba NI UN personaje. | ✅ |
| **QC-1** | El libreto tiene una sección **QC** en el cajón de herramientas, entre «Marcar» y «Grabación», con lo que hace falta al revisar: cargar el audio del programa, transcribirlo y compararlo con el libreto, apuntar correcciones y verlas. | ✅ |
| **QC-2** | Una **corrección la apunta una persona**. El cotejo automático señala SITIOS donde sospechar y eso vive aparte, en `_cotejo`; nunca se convierte solo en corrección. Un informe firmado con lo que creyó oír una máquina no vale, y el reconocedor que hay —`whisper-tiny`— se equivoca a menudo. | ✅ |
| **QC-3** | Una corrección es **tiempo, personaje y comentario**, y lo único obligatorio es el **comentario**: el tiempo y el personaje los rellena el programa con el parlamento seleccionado, pero qué hay que arreglar no lo puede inventar. Sin personaje sí se apunta —hay correcciones del ambiente o de la mezcla—. | ✅ |
| **QC-4** | **«Sin tiempo» no es «el minuto cero».** `+null` y `+''` valen 0 al convertir, así que una corrección de la mezcla se guardaba en 00:00:00 y salía la primera del informe, como lo más urgente. Las que no tienen tiempo se enseñan **al final**. El cero sí es un tiempo válido: hay correcciones en el primer segundo. | ✅ |
| **QC-5** | Un timecode escrito a mano que **no se entiende deja el que había**, no manda la corrección al minuto cero: un dedazo no puede mover un apunte. | ✅ |
| **QC-6** | Las correcciones **viajan con el capítulo**, en los **dos** caminos por los que se sube; si solo se toca uno, se pierden según cómo se haya guardado. Al volver, lo que llega de la nube se sanea: sin comentario no entra, y un tiempo imposible entra **sin tiempo**, no con uno inventado. | ✅ |
| **QC-8** | Una corrección lleva un **tipo**: Falta, Cambiar, Pegar o Ajuste. **Se sugiere y manda quien apunta**: «Falta el take. Pegar.» es Pegar y «Falta el take.» es Falta, y las dos frases empiezan igual, así que no se puede deducir a ciegas. Gana la **acción** que hay que hacer, no la palabra con la que empieza la frase. Un tipo que no se reconoce cae en **Ajuste**, que es el más inofensivo: no convoca a nadie. | ✅ |
| **QC-9** | El capítulo guarda **quién hace el QC** y **qué estudio hace los cambios**, y se recuerdan para el siguiente: casi siempre revisa la misma persona y lo arregla el mismo estudio. Si los dos están vacíos no se sube nada. | ✅ |
| **QC-10** | Al abrir el libreto se elige un **perfil de trabajo** —Grabación, QC o Casting— y sus herramientas salen en una **barra propia arriba del libreto, siempre a la vista**, con su botón para cambiar de perfil. Antes vivían en el cajón de la derecha, que hay que abrir y que lo trae todo. En QC el cajón **deja de ofrecer lo que escribe** en el libreto —editar, pausa, acento, limpiar, pincel, «grabada»—: quien revisa no marca el libreto. En **cada fase están SOLO las herramientas de cada quien**: escribir en el libreto —editar, pausa, acento, limpiar, pincel, ajustar, «grabada»— es de **Grabación**; cotejar, apuntar y entregar es de **QC**; y **leer y moverse** —vista, página, letra, tiempo, buscar, pronunciaciones, significado— **no tiene dueño**, porque las tres fases recorren el libreto. El título de un grupo se quita cuando se ha ido todo el grupo, **mirando lo que le queda debajo** y no por su nombre: ir por nombres se rompe en silencio al mover un título. | ✅ |
| **QC-11** | El perfil se elige **en la pantalla inicial, justo después del dispositivo** y antes de ver los programas, y vale para **toda la sesión**: cada capítulo se abre ya con las herramientas de ese trabajo, **sin preguntar**. Tuvo tres vidas antes —preguntar en cada capítulo, heredar el último sin preguntar, volver a preguntar— y lo que pedía sala era esto. Al entrar **hay que elegir**: pulsar fuera o Escape no vale, porque un toque de más dejaba a quien venía a revisar en Grabación sin haberlo pedido. El de la última vez queda **marcado**. Cambiarlo desde la barra del libreto cambia el de la sesión, y el siguiente capítulo lo hereda. Solo se pregunta al abrir un capítulo si no hay sesión que lo diga ni nada guardado. | ✅ |
| **QC-12** | La barra del perfil se ve **con cualquier dispositivo**, y se pega **justo debajo** de la barra de herramientas. Nació apagada y encendiéndose con la clase `haschips` —copiada del cajón de la tablet—, y esa clase solo se pone en modo tablet: en escritorio no se veía nunca. Y pegada arriba del todo quedaba **detrás** de la barra de herramientas, que es fija. Su alto se **mide** y entra en `--lbarsH`, que es lo que miran el riel de páginas y la pestaña de Ocupación para empezar donde acaba todo: si no, vuelve el solape de LIB-22. | ✅ |
| **QC-13** | Mientras se coteja **se ve por dónde va**, en la propia barra del perfil: el texto de cada fase, una barra que avanza con la cuenta de parlamentos, el porcentaje y un botón para **parar**. Llegó de sala: «no sé si está haciendo algo». El cotejo tarda minutos —baja el modelo de voz, descodifica el audio y luego recorre los parlamentos— y avisaba por el panel del Video Estudio, que desde QC no se ve. Mientras **no hay cuenta todavía** se enseña una tira que va y viene: una barra quieta al 0% parece colgada. Pulsar otra vez **para** el cotejo en vez de lanzar otro encima. | ✅ |
| **QC-14** | Esa fila del avance es **solo del perfil QC**, y **solo mientras el cotejo trabaja**. Sin la segunda condición se espejaba CUALQUIER aviso del Video Estudio: llegó de sala «Sin medio cargado — pulsa Cargar» colgado en la barra, y en los tres perfiles. Un aviso de otra pantalla puesto en una barra que es de otra cosa. | ✅ |
| **QC-15** | El reconocedor de voz lee el audio **del Blob, no por `fetch` de su URL**. La CSP de producción no lleva `blob:` en `connect-src`, así que `fetch(blob:)` se cae con «Failed to fetch» — comprobado en dubbipt.vercel.app. Por eso el cotejo **nunca arrancó en producción**, ni con el vídeo ni con la pista de diálogos. El vídeo y la pista se guardan como Blob además de como URL; solo se hace `fetch` de lo que es una URL de verdad, como el audio bajado de la nube. | ✅ |
| **QC-16** | Al cargar el audio desde QC, si nadie ha puesto el **«TC de inicio»** se **supone la hora en punto del primer timecode del guion** y **se dice**. Sin desfase, un parlamento en 01:05:40 se busca en el segundo 3940 de un MP3 de 45 minutos —fuera del audio— y no hay nada que cotejar. Solo cuando el desfase está a cero y el guion claramente no empieza en cero; **nunca se pisa** uno puesto a mano. Y si tras cotejar ningún parlamento cayó dentro del audio, se dice que casi seguro es el desfase, con la duración del audio y el primer tiempo del libreto delante. | ✅ |
| **QC-17** | El cotejo entrega un **informe de los diálogos que cambiaron**: los parlamentos donde lo oído no cuadra con lo escrito, por tiempo, con **las dos columnas** —escrito y oído—, el porcentaje y el veredicto, y en el pie **con qué audio y qué inicio** se cotejó. Los umbrales son los de la hoja de cues (0,45 y 0,72). Lo «oído» es una pista, no una prueba, y el informe lo dice. Desde la lista se puede **abrir** el formulario de corrección con lo oído de pista, pero **nada se apunta solo** (QC-2). Cuando el cotejo falla se enseña **la causa** que ya averigua `karIaPreparar`, no un genérico. | ✅ |
| **QC-18** | El perfil QC **no lleva vídeo**. Pedido de sala: «quita la opción de vídeo en QC y todas las herramientas de vídeo». Se van el botón **«Vídeo»** y el botón **«Seguir»** de la barra del libreto, y el **«Video Estudio»** de la pantalla del capítulo, que abre el mismo panel por otra puerta; con el panel se va todo lo que vive dentro —karaoke, sala, banda, cues, formatos, planos—. **Entrar en QC con el estudio abierto lo cierra**, y con él la ventana del karaoke y la lectura de Pro Tools: esconder el botón no basta, porque el panel se quedaría desplegado sin nada con qué cerrarlo y la pantalla seguiría compartida sin nada a la vista que lo apague. El estudio **no se abre** desde un perfil sin vídeo se llame desde donde se llame —la guarda está en la puerta por la que pasan todos—, pero **cerrarlo** se deja siempre. **Grabación y Casting lo siguen llevando.** El timecode de cada parlamento deja de prometer «saltar el vídeo aquí», y **ningún aviso de QC manda al Video Estudio**. Los botones se esconden **en línea y con `!important`**: la barra del libreto impone su `display` a todos sus botones con `!important`, y contra eso una clase no puede. | ✅ |
| **QC-19** | Dónde empieza el audio se corrige **desde QC**, en **«⏱ Inicio»**, que enseña en el propio botón el que vale. Es **el mismo dato** que el «TC inicio» del Video Estudio, no una copia. Una **errata no mueve nada**: el panel se queda abierto, dice qué no entendió y **conserva lo tecleado**. Cambiarlo **caduca lo cotejado** —cada parlamento se buscó en el trozo de audio que decía el inicio de antes— y se borra también en la nube, para que no resucite al reabrir el capítulo; guardar **el mismo** valor no borra nada. Los dos atajos —la hora en punto del libreto y el cero— **rellenan, no guardan**. Al cargar el audio se dice **siempre** el inicio que vale, se haya supuesto o viniera puesto: el que viene puesto es el que más engaña, porque el Video Estudio deja el tiempo del **primer parlamento** al cargar un vídeo, no la hora en punto. Y si ningún parlamento cayó dentro del audio, el panel **se abre solo** con el porqué delante. | ✅ |
| **QC-20** | La fila del avance **sobrevive a los repintados** de la barra del perfil. Colgaba de ella y repintarla se la llevaba: el «✅ 412 comparados» del final se escribía y se borraba en la línea siguiente, y cualquier refresco del libreto a medio cotejo apagaba el progreso. La barra y la tira que va y viene salen **solo mientras trabaja** —un aviso ya terminado con la tira moviéndose dice lo contrario de lo que es— y un aviso terminado **se puede quitar**. | ✅ |
| **QC-21** | Lo de QC-10 vale también para la **barra de arriba** del libreto y para los **botones flotantes**. En QC y en Casting no están el **lápiz**, el **pincel** —ni el de la barra ni el flotante— ni **«✓ Página grabada»**, y el **engranaje se queda solo con «Colores»**. Marcar es de quien graba **esté el botón donde esté**: el cajón ya lo cumplía y arriba seguía todo a la vista, las mismas herramientas por otra puerta. El **engranaje no se esconde**: los colores son cómo se ve el libreto, no una herramienta de marcar, y tienen que seguir al alcance en los tres perfiles; además su panel se coloca midiendo dónde está el botón. Lo que se va es lo de dentro que actúa sobre la caja —completar, editar, pausa, quitar pausa, acento, limpiar, ajustar, dividir, unir— y con ello la cabecera de «caja seleccionada», que sin herramientas de caja no dice nada; el botón pasa a decir «Colores del libreto». Cada entrada del engranaje **lleva nombre y dueño**, y la única sin dueño es Colores: una herramienta de caja nueva sin dueño saldría en las tres fases. El **lápiz tiene dos oficios** —en rol tablet abre el cajón de la derecha—, así que **donde hay cajón se queda** en los tres perfiles. **Entrar en un perfil que no marca suelta lo que hubiera encendido**: el pincel, la pausa o el acento armados, el modo de editar y las cajas abiertas. Esconder el botón no basta, porque se seguiría pintando sobre el libreto sin nada a la vista con que apagarlo. Lo que se estuviera escribiendo **se guarda**: cambiar de perfil no le cuesta a nadie lo tecleado. En Grabación no se toca nada. Se esconde **en línea y con `!important`**, como en QC-18 y por lo mismo. | ✅ |
| **QC-22** | «Cotejar» pasa a llamarse **«Analizar cambios»**, en la barra de QC, en el cajón y en el Video Estudio, y en todos los avisos que lo nombran. Pedido de sala. No queda **ninguna puerta con el nombre viejo**: dos nombres para lo mismo es preguntarse si son dos cosas. | ✅ |
| **QC-23** | El análisis es **mucho más rápido** porque ya no se transcribe parlamento a parlamento. El reconocedor trabaja por ventanas de 30 s y **rellena con silencio**: oír un «sí» de medio segundo le costaba lo mismo que treinta segundos de conversación, y un capítulo de 450 parlamentos pagaba 450 ventanas. Ahora se busca **dónde hay voz** por la energía del audio —con el listón **28 dB por debajo de lo que suena fuerte** y un suelo para que el silencio digital no cuente—, los trozos se juntan en **tramos de 29 s** saltándose los silencios, y los tramos se reparten entre **varios trabajadores en segundo plano**: uno por núcleo menos el de la página, cuatro como mucho, dos con 4 GB de memoria o menos. El **primero baja el modelo** y los demás arrancan después, de la copia ya guardada. Dos trozos a menos de 0,6 s son el mismo, y se juntan **antes** de tirar los de menos de 0,12 s: al revés, la consonante suelta del final de una frase se perdería. Un trozo más largo que un tramo se parte **por la mitad del silencio** más hondo de su último tercio, nunca por su primer instante, que es donde acaba de terminar la voz. Cada segundo del tramo **vuelve a su segundo del audio** por un mapa: sin él, cada palabra iría al parlamento equivocado. La barra avanza por **audio oído**, no por parlamentos —los tramos acaban desordenados— y dice **cuánto queda** en cuanto hay un 8 % hecho, no antes. Medido con un premix de prueba: **244 s antes, 50 s ahora**. | ✅ |
| **QC-24** | Cada palabra oída va **a su parlamento por su tiempo**, y como el timecode del libreto nunca es exacto, los bordes no se toman al pie de la letra. Lo que cae **bien dentro** —a más de 0,3 s de los bordes— es de ese parlamento **coincida o no**: ahí es donde están los cambios, y si se pudiera dejar fuera lo que sobra, las palabras añadidas no saldrían nunca. Lo que cae cerca de un borde, hasta **1,2 s por fuera**, es suyo **solo si le viene bien**: el final del parlamento de antes dicho un poco tarde, o el principio del siguiente. Los parlamentos que caen **fuera del audio** se cuentan aparte y se dicen: no se han comparado, y no es lo mismo que coincidir. Los que solo son acotaciones no se comparan. | ✅ |
| **QC-25** | Se compara **cómo suena**, no cómo se escribe. El reconocedor escribe de oído y en español muchas letras suenan igual: la **hache** no suena, **be y uve**, **elle, ye e i**, y **ce, zeta y ese** —en el doblaje latino— son el mismo sonido; **ge/gi y jota**, y **qu, ka y la ce de «casa»**, también. Por eso escribía «adormido» por «ha dormido» o «vais» por «bais», y salía como cambio. Además, las palabras que el reconocedor **parte o junta** —«está vais» por «estabais», «hoy es» por «oyes»— se juntan, solo si juntas son una palabra del otro lado y no son ya las dos palabras de allí. Los **números** se comparan en letras —el reconocedor escribe «42» y el libreto «cuarenta y dos»— y las **acotaciones** no cuentan, ni escritas ni oídas, aunque el reconocedor deje un paréntesis sin cerrar. Lo que **sí suena distinto se queda distinto**: «hija» e «hijo», «pero» y «perro» —la erre doble se conserva—, «diez» y «quince». Medido con el mismo premix: de 64 parlamentos dichos tal cual, **23 salían marcados antes y 9 ahora**, y los cambios de verdad encontrados siguen siendo **7 de 8**. | ✅ |
| **QC-26** | El análisis **no se inventa nada cuando algo falla**. Un tramo que falla se intenta **otra vez**; si vuelve a fallar se para y **se dice la causa**: dar por buenos los parlamentos de ese tramo sería mentir. Un trabajador que **se cae** o **deja de contestar** —cuatro minutos sin respuesta— devuelve su tramo a la cola y lo hacen los demás, y **nadie se va mientras otro tenga un tramo entre manos**: si ese otro se cae, alguien tiene que estar para cogerlo. Si **ninguno arranca** o se caen todos, se hace en la **propia página**, de uno en uno: más lento, pero sigue siendo por tramos. **Parar** cierra todos los trabajadores. Lo analizado antes **no se toca hasta tener lo nuevo entero**, y entonces se **sustituye de golpe**, sin mezclar: un resultado de otro día colgando de un parlamento que hoy no se ha comparado sería un cambio inventado. Parar **no es un fallo** y no se cuenta como tal, y pase lo que pase el análisis **deja de estar «trabajando»**: si no, el botón no volvería a arrancar. | ✅ |
| **QC-27** | Al acabar se **entrega el PDF solo** y se **abre el resultado**, también cuando **no hay ni un cambio**: ese PDF es la constancia de que el capítulo se analizó y cuadra, y sin panel parecía que no había pasado nada. Pedido de sala: «al finalizar me entregue también un PDF». La barra lo cuenta todo en una línea —cuántos se analizaron, **cuánto tardó**, cuántos no cuadran, cuántos dudosos y cuántos quedaron fuera del audio— y dice si el PDF se descargó o **por qué no**, con dónde volver a pedirlo. El informe también se pide a mano desde «≠ Cambios» siempre que haya análisis, con o sin cambios; **sin análisis no hay informe**. | ✅ |
| **QC-28** | El audio se **descodifica una sola vez, y ya a 16 kHz**, que es lo que pide el reconocedor. Antes se descodificaba al cargarlo —para la onda— y **otra vez** al analizar, las dos a la frecuencia del equipo, 48 kHz en estéreo: un capítulo de 45 minutos es más de un giga de memoria solo para tirarlo. Ahora de esa descodificación salen la onda y el audio del reconocedor. El premix **recuerda su nombre**, que es el que va en el pie del informe: antes salía el del vídeo, o nada. | ✅ |
| **QC-7** | El audio que se carga en QC queda en **`studio.dlgUrl`**, que es lo que el reconocedor prefiere al vídeo, y se **olvida el audio ya preparado**. Ese campo se leía en `karIaPreparar` y no lo escribía nadie: hasta ahora Whisper oía siempre el vídeo aunque cargaras otra pista, y sin olvidar el anterior se cotejaría el capítulo nuevo contra la voz del viejo. | ✅ |

## Nunca

| | |
|---|---|
| **LIB-N1** | Nunca reconstruir `script` desde `pageData` si `pageData` está vacío y ya hay un `script` cargado. Un capítulo hidratado desde la nube no tiene páginas de PDF; reconstruir ahí **borraría el libreto**. | ✅ |
| **LIB-N2** | Nunca pintar ni guardar en un capítulo las marcas del capítulo anterior. Al cambiar de capítulo de verdad, las marcas se tiran. | 👁 |
| **LIB-N3** | Nunca dejar que un renglón mixto (timecode + texto) entre entero como diálogo. El timecode va a su casilla; solo lo que sobra es diálogo. Si no, se lee el timecode en voz alta. | ✅ |
| **LIB-N4** | **Nunca crear un personaje con una clave sin normalizar.** Es el fallo más callado de todos: no hay error, la tarjeta existe y se puede abrir, y su libreto sale en blanco. Pasó con `PÚBLICO` en *The Wayans Bros* 101 — el desglose por reglas guardaba el nombre crudo del PDF y las marcas del libreto usaban `norm()`: sus 314 parlamentos no aparecieron por ninguna parte. Afecta a todo nombre con tilde o eñe. | ✅ |

## Cómo se demuestra

**Automáticamente**, en `pruebas/libreto.prueba.js`, sin PDF. `pageData` es una
estructura plana —renglones de texto y marcas de personaje— y se fabrica a
mano: lo que hace el lector de PDF es rellenarla, y lo que hace `buildScript`
es convertirla en la lista de intervenciones. Eso segundo es lo que se prueba,
y es donde han estado los errores.

Cada caso se monta por separado con sus páginas, así que ninguno arrastra
estado del anterior.

Se probó rompiendo el código a propósito, y las dos mutaciones son las que
importan:

| Rotura | Qué canta |
|---|---|
| Quitar la guarda de **LIB-N1** | `dio [], esperaba undefined`: el libreto bajado de la nube, borrado |
| Bajar el umbral de **LIB-9** de 20 tomas a 6 | un libreto de doblaje secuestrado como audiodescripción |
| Devolver la clave sin normalizar (**LIB-1**, **LIB-N4**) | `dio ["PÚBLICO","ANDRÉS","NIÑO"], esperaba []` |

Y **a mano**, la comprobación de extremo a extremo que sigue mandando antes de
una entrega: cargar un guion real, contar las intervenciones por personaje y
compararlas con el desglose de la empresa, y comprobar que el primer timecode
de cada personaje coincide.

**QC-1 a QC-21**: `pruebas/qc.prueba.js`, y la puerta del estudio de QC-18
en `pruebas/estudio.prueba.js`. La frontera de QC-2 se comprueba
leyendo el cuerpo de `cotejarTodo` y exigiendo que no nombre las correcciones:
es una regla sobre quién escribe dónde, y solo el código lo puede decir.
Quince mutaciones comprobadas en rojo. Dos de las comprobaciones nacieron
rojas y encontraron el fallo de QC-4 antes de que llegara a sala.

**QC-18 a QC-20** se mutaron aparte: cincuenta y dos roturas, una cada vez, y
las cincuenta y dos en rojo. Las que importan: que QC vuelva a llevar vídeo,
que la puerta del estudio impida también **cerrar**, que los botones se
escondan sin prioridad, que cambiar el inicio no caduque lo cotejado y que
guardar el mismo inicio sí lo borre. Y se comprobó **en el navegador**, con un
audio de verdad: el cotejo entero corre en QC sin abrir el Video Estudio.

**QC-21** se mutó aparte: ciento cinco roturas, una cada vez, y las ciento
cinco en rojo. Una **nació verde**: quitar la guarda de «sin libreto abierto»
no reventaba —los pasos van cada uno en su `try`—, pero daba cuatro fallos
que no lo son en cada cambio de perfil; se añadió la comprobación que la caza.
Las que importan: que un botón de marcar se quede sin dueño, que se esconda
sin prioridad, que el lápiz se esconda donde hay cajón, que Colores pase a
tener dueño, que entre en el engranaje una herramienta de caja sin dueño, y
que cambiar de perfil deje el pincel encendido o tire lo que se estaba
escribiendo. Y se comprobó **en el navegador**, en los tres perfiles, en
escritorio, en rol tablet y en la tablet del actor.

**QC-22 a QC-28**: `pruebas/analisis.prueba.js` y `pruebas/qc.prueba.js`. El
reconocedor no corre en las pruebas —hace falta un navegador y un modelo de
40 MB—: se sustituye por **trabajadores de mentira** que contestan lo que se les
dice, y eso es lo que permite probar los caminos raros: uno que se cae, uno que
deja de contestar, un tramo que falla dos veces, ninguno que arranque. El
trabajador de verdad se carga desde su archivo y se le habla por mensajes.
Tres fallos los cazó una prueba antes de llegar a sala: el corte de un tramo
largo pegado al final de la voz, una palabra sin tiempo que caía en el segundo
cero —otra vez `+null`, como en QC-4— y un tramo que se quedaba sin oír cuando
se caía el único trabajador que lo tenía y los demás ya se habían ido.

Y **en el navegador**, con un **premix de prueba** hecho con la voz española de
Windows: 72 parlamentos, 8 de ellos dichos distinto a propósito —una palabra
cambiada, media frase, palabras de más, uno que no se dice, otra frase—, con
el mismo servidor y la misma CSP que producción:

| | Antes | Ahora |
|---|---|---|
| Tiempo del análisis | 244 s | 50 s |
| Dichos tal cual y marcados como cambio | 23 de 64 | 9 de 64 |
| Cambios de verdad encontrados | 7 de 8 | 7 de 8 |

Y con uno **seis veces más largo** —432 parlamentos, 27,8 minutos, 18 de voz—,
del tamaño de un capítulo: **3 min 23 s**, 61 de 384 iguales marcados y 42 de
48 cambios encontrados. El PDF, con 103 filas, salió en cuatro hojas. Al ritmo
del método de antes habrían sido unos 24 minutos; eso no se midió, se calcula.

Mirando el panel de resultados salió además que la clase de las pastillas del
tipo la llevaba también el texto de cada fila: cada texto salía como una
pastilla y el «(nada)» de un oído vacío se partía letra a letra.

## Sin resolver

- **Un cambio de una sola palabra en una frase larga puede no salir.** «En
  unos diez días» dicho «en unos quince días» se parece un 88 %, por encima
  del 72 % desde el que se avisa. Bajar el listón llenaría el informe de
  avisos falsos con este reconocedor —el más pequeño—; la salida sería uno
  mayor, que tarda el doble o más.
- Los números de QC-23 y QC-25 salen de una **voz sintética**, y rápida, en un
  i3 de dos núcleos que además estaba ocupado. Con un premix de verdad no se
  han medido todavía ni el tiempo ni los avisos falsos.
- **QC-25 supone doblaje latino**: la zeta y la ese suenan igual. En doblaje
  para España «casa» y «caza» son dos palabras distintas y ese cambio no
  saldría.
- La **tarjeta gráfica** se probó y aquí fue más lenta que el procesador —41 s
  y 60 s por tramo frente a 7 s—, así que no se usa. En otro equipo podría ser
  al revés, pero no se ha medido.
- El PDF de QC-27 se **descarga sin que nadie pulse nada**, al acabar. Chrome
  deja la primera descarga así, pero si en la misma sesión ya se descargó otra
  cosa puede pedir permiso para «descargar varios archivos». No se ha probado
  en el Chrome de sala; si pasa, el PDF sigue en «≠ Cambios».
- El botón del Video Estudio usa el mismo análisis, pero **no entrega PDF**: el
  pedido era de QC, y ahí los resultados van a la hoja de cues.

- **LIB-1**, **LIB-2** y **LIB-N4** ya están cerradas, en
  `pruebas/acentos.prueba.js`: se comprueba que ninguna clave conserve un
  carácter que `norm()` doblaría, y que el `display` sí conserve sus tildes.
  Se cerraron a posteriori, después de que el fallo saliera con un capítulo
  real.
- **LIB-14** a **LIB-18** los prueba `pruebas/libreto.prueba.js`, con un documento
  de mentira: los singulares incluidos, que «1 líneas» canta mucho. Quitar la
  cuenta del desglose pone tres comprobaciones en rojo.
- **LIB-7**, **LIB-10** a **LIB-13** y **LIB-N2** siguen
  sin prueba automática. Las de fusión (**LIB-11**, **LIB-12**) son las más
  fáciles de añadir: `applyCharMerges` es casi pura sobre `_charsRaw`.
- **LIB-8** y **LIB-9** son heurísticas con números elegidos a ojo (20 tomas,
  85 % de numeración creciente, la mitad de las páginas). Ahora hay pruebas que
  fijan **el comportamiento en esos umbrales**, así que un cambio de número se
  nota; lo que sigue sin saberse es si los números son los mejores para los
  guiones que aún no hemos visto.
- La **detección automática de cabeceras sin desglose** —el bloque grande que
  decide qué renglón es un personaje— no está cubierta. Es la parte con más
  reglas sueltas del proyecto y la que más se beneficiaría de casos de verdad
  guardados en `pruebas/casos/`.
- Un personaje que aparece en el desglose pero no en el libreto se marca «sin
  libreto», pero no hay nada que impida guardar y exportar en ese estado.
- El **lápiz** de la barra del libreto hoy **no enseña nada**, y se vio al
  comprobar **QC-21** en el navegador. En escritorio enciende las herramientas
  de cada caja, que están escondidas desde que se mudaron al engranaje: el
  botón se pone verde y no sale ninguna. En las tablets abre y cierra el cajón
  de la derecha, que está retirado desde v10.27.0. QC-21 lo conserva donde hay
  cajón porque es su puerta; falta decidir si el cajón vuelve a las tablets o
  si el lápiz se retira.
- La **tablet del actor** enseña el lápiz y el engranaje aunque la hoja de
  estilos diga que no: la regla que viste los botones de la barra pesa más que
  la que los esconde, y las dos llevan `!important`. El engranaje ahí no abre
  nada, porque su menú sí se esconde. Es el mismo motivo por el que QC-18 y
  QC-21 esconden en línea.
