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
| **LIB-20** | Cuando a un personaje le **faltan** parlamentos, el libreto lo dice y **nombra los renglones**: cuántas cabeceras suyas se reconocieron, cuántas no, y cuáles son las que no. Antes el aviso solo salía con el personaje a **cero**, así que una pérdida parcial era muda — lo único que se veía era que faltaba texto. Solo cuentan los renglones que **empiezan** por el nombre (tras un timecode, si lo hay): el nombre dentro del diálogo no es una cabecera perdida. | ✅ |
| **LIB-21** | **Dos cabeceras pegadas: la segunda no es una cabecera, es el texto de la primera.** En estos guiones cada intervención es timecode, nombre y debajo lo que se dice, así que un nombre justo debajo de otro —sin una línea de diálogo en medio— no puede ser alguien que habla. Llegó de sala con los rótulos: GRÁFICA lee lo que sale escrito en pantalla, y lo escrito suele ser un nombre — `GRÁFICA / GORDA NAN / MAMÁ DE BIG JOHN`. GORDA NAN se llevaba el renglón, GRÁFICA se quedaba con la caja **vacía** y a GORDA NAN se le colgaba un parlamento que no dice. Solo cuenta si la de arriba se queda **sin nada detrás**: con su diálogo en el mismo renglón («JOE: hola»), la de abajo es de verdad. Y se encadena. | ✅ |
| **LIB-22** | La banda **se vuelve a medir cuando cambia de alto**, no solo al pintarse. Mide una fila o dos según el ancho, y eso cambia sin que nadie la repinte: al estrechar la ventana, al abrir el libreto en media pantalla o cuando acaba de cargar la tipografía. El valor se quedaba viejo y lo que cuelga de él se quedaba ARRIBA — llegó de sala la pestaña de Ocupación tapando el botón de guardar el talento. Medido: a 1000 px la banda ocupa 45 y la variable dice 45; estrechada a 430 pasa a 64 y la variable sigue diciendo 45, así que la pestaña arranca en el 113 y la banda no acaba hasta el 118. Se vigila por **dos vías** —observador de tamaño y aviso de ventana— porque el observador no se pudo comprobar en un navegador de verdad. | ✅ |
| **LIB-23** | La **barra de herramientas** también se vuelve a medir cuando cambia de alto. Se parte en más filas al estrecharse el hueco del libreto, y abrir el cajón de Ocupación le quita 320 px de golpe **sin que la ventana cambie de tamaño**, así que el oyente de resize que ya había no se enteraba: el cajón entero —y su pestaña— arrancaban encima de la barra. Medido: a 900 px la barra ocupa 50 y la variable dice 50; con el cajón abierto pasa a 91 y la variable sigue diciendo 50, así que la pestaña empieza en el 64 y la barra no acaba hasta el 91. Se vigila **el elemento**, que es lo único que se entera. | ✅ |

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

## Sin resolver

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
