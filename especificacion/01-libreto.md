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
