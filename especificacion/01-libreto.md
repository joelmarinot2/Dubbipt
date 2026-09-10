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
| **LIB-1** | La clave de un personaje (`key`) sale de `norm(nombre)`: sin tildes, sin apóstrofos, sin puntos, en mayúsculas y con los espacios colapsados. Así «O'BRIEN» y «OBRIEN», o «DR. KIM» y «DR KIM», son el mismo personaje. | 👁 |
| **LIB-2** | El `display` conserva el nombre **tal como está escrito en el guion**. La clave es para casar; el display, para leer. | 👁 |
| **LIB-3** | `tcEff` es el timecode efectivo en **segundos de reloj**, con la hora del rollo incluida. Una línea sin timecode propio hereda el de la anterior (cascada). | 👁 |
| **LIB-4** | Un timecode en el mismo renglón que el nombre del personaje es **el timecode de esa intervención**, nunca su primera línea de diálogo. | 👁 |
| **LIB-5** | Un timecode al final de un renglón pertenece a la intervención que **empieza**, no a la que acaba. | 👁 |
| **LIB-6** | El número de página impreso en el PDF no es diálogo y se descarta. | 👁 |
| **LIB-7** | Un renglón que es solo un honorífico abreviado (`REV.`, `DR.`, `SR.`) no es un personaje completo: el nombre real viene en el siguiente. | 👁 |
| **LIB-8** | Los guiones de **audiodescripción** se detectan por su patrón de tabla (número de toma + timecode, numeración creciente), no por lo que hubiera cargado antes. | 👁 |
| **LIB-9** | Con un desglose de doblaje real presente, la audiodescripción exige un patrón masivo: **≥ 20 tomas** y **la mitad de las páginas**. Un libreto de doblaje no puede ser secuestrado por seis filas que parezcan tomas. | 👁 |
| **LIB-10** | Los encabezados y pies que se repiten en **≥ 60 %** de las páginas no son guion y se descartan. | 👁 |
| **LIB-11** | Dos personajes se pueden **fusionar** (`MARCUS (VO)` + `MARCUS`). Al fusionar, el primario absorbe las páginas, el progreso y el talento del otro si él no tenía. | 👁 |
| **LIB-12** | Las fusiones se aplican sobre una copia **cruda** (`_charsRaw`). Deshacer una fusión reconstruye desde ahí: nunca se pierde el reparto original. | 👁 |
| **LIB-13** | Al rehidratar un capítulo guardado, todo lo que venga de la nube se **sanea**: los números se fuerzan a número, los textos a texto, y el color se **recalcula siempre** en vez de confiar en el guardado. | 👁 |

## Nunca

| | |
|---|---|
| **LIB-N1** | Nunca reconstruir `script` desde `pageData` si `pageData` está vacío y ya hay un `script` cargado. Un capítulo hidratado desde la nube no tiene páginas de PDF; reconstruir ahí **borraría el libreto**. | 👁 |
| **LIB-N2** | Nunca pintar ni guardar en un capítulo las marcas del capítulo anterior. Al cambiar de capítulo de verdad, las marcas se tiran. | 👁 |
| **LIB-N3** | Nunca dejar que un renglón mixto (timecode + texto) entre entero como diálogo. El timecode va a su casilla; solo lo que sobra es diálogo. Si no, se lee el timecode en voz alta. | 👁 |

## Cómo se demuestra

Hoy, **a mano**: se carga un guion real, se cuentan las intervenciones por
personaje y se comparan con el desglose de la empresa, y se comprueba que el
primer timecode de cada personaje coincide.

Lo que haría falta para automatizarlo: un par de guiones de ejemplo pequeños
—uno de doblaje, uno de audiodescripción— guardados en `pruebas/casos/` con su
resultado esperado. Es la mayor laguna del juego de pruebas ahora mismo, porque
`buildScript` es la función de la que depende todo lo demás.

## Sin resolver

- **LIB-8** y **LIB-9** son heurísticas con números elegidos a ojo (20 tomas,
  85 % de numeración creciente, la mitad de las páginas). Funcionan con los
  guiones vistos hasta ahora. No hay ninguna prueba que impida que el siguiente
  ajuste rompa un caso antiguo.
- Un personaje que aparece en el desglose pero no en el libreto se marca «sin
  libreto», pero no hay nada que impida guardar y exportar en ese estado.
