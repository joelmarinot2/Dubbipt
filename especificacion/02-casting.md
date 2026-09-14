# 02 · Casting

## Para qué

Repartir los personajes de un capítulo entre los actores, con la continuidad de
los capítulos anteriores del mismo programa, y sin que nadie tenga que
acordarse de nada.

Es la parte donde un error cuesta dinero: un actor convocado para grabar tres
jadeos, o una voz cambiada al personaje protagonista, se paga en horas de sala.

## Reglas

| | Regla | |
|---|---|---|
| **CAST-1** | Al abrir un capítulo se elige **modo**: Grabación o Casting. El modo se recuerda por capítulo. | 👁 |
| **CAST-2** | Todo lo del reparto —colores, botones de verificar, ocupación— solo se ve en **modo casting**. En grabación estorba y compite con el verde de «completado». | 👁 |
| **CAST-3** | Cada capítulo tiene **su propio desglose**. Lo que se asigne en el 101 se escribe en el Excel del 101 y no toca el del 102. | 👁 |
| **CAST-4** | El desplegable de talentos sale de la hoja `TALENTOS` del formato subido. | 👁 |
| **CAST-5** | Si el desglose subido ya trae actores, se ponen solos en las tarjetas. | 👁 |
| **CAST-6** | Existe un **registro por programa**: lo que se reparte queda apuntado y los capítulos siguientes del mismo programa heredan el actor de los personajes que ya salieron. | 👁 |
| **CAST-7** | Lo heredado se marca en **naranja** con un botón `✓ verificar`. No es tuyo hasta que lo das por bueno. | 👁 |
| **CAST-8** | Lo que **no coincide exacto** por nombre se **pregunta**, uno por uno. Un nombre mal heredado es peor que uno sin heredar. | ✅ |
| **CAST-9** | Se puede subir una **tabla de casting previa** en Excel: columna A personaje, B talento, C número de intervenciones. | 👁 |
| **CAST-10** | La cabecera de esa tabla se detecta por **coincidencia exacta** de la celda, no buscando la palabra dentro. Buscándola dentro, una tabla cuyo primer talento se llame `ACTOR A` perdía su primera fila. | ✅ |
| **CAST-11** | Una celda de intervenciones **vacía** significa *desconocido*, no cero. Como cero disparaba el aviso de «no cuadran las intervenciones» sin que hubiera nada raro. | ✅ |
| **CAST-12** | `↩ Deshacer` (y `Ctrl+Z`) devuelve el estado anterior de los personajes tocados: talento, `noRec`, heredado y el visto bueno de gestos. Un lote entero —heredar, o verificar todos— es **un solo paso**. | 👁 |
| **CAST-13** | `Ctrl+Z` solo actúa en modo casting y solo si el foco no está en un campo de texto. | 👁 |
| **CAST-14** | Los avisos del casting salen como **notificación flotante**, no en la cabecera del libreto: dentro de un programa esa cabecera está oculta y los mensajes no se veían. | 👁 |

### Solo gestos

| | Regla | |
|---|---|---|
| **CAST-15** | Antes de repartir, se lee el **libreto** y se buscan los personajes que en *este* capítulo no dicen ni una palabra: todas sus intervenciones son acotaciones —`(REACCIÓN)`, `(EFFORTS)`, `(GRITA)`, `ah`, `hmm`—. | ✅ |
| **CAST-16** | Para que un renglón cuente como gesto hace falta una prueba **a favor** (una palabra de gesto o una onomatopeya). No basta con que no haya nada en contra: «Sí.» y «No.» son diálogo, y sus palabras están en la lista de relleno. | ✅ |
| **CAST-17** | Un personaje es «solo gestos» si tiene al menos una intervención en el libreto y **todas** son gesto. | ✅ |
| **CAST-18** | Esos personajes salen en **violeta**, y el violeta **gana** al naranja de heredado y al rojo de choque: esta comprobación se decide antes que el reparto. | 👁 |
| **CAST-19** | Verificar uno significa «déjalo original»: se le pone **`ORIGINAL`** como talento, que es lo que significa —ese personaje no se dobla—, y sale así en el Excel. | 👁 |
| **CAST-20** | El visto bueno se guarda con el capítulo y viaja a la nube. | 👁 |

### Ocupación de talentos

| | Regla | |
|---|---|---|
| **CAST-21** | La ocupación cuenta, por actor, cuántos personajes lleva, cuántas líneas suma y en qué páginas. | ✅ |
| **CAST-22** | Las casillas que **no son un actor** —`X`, `ORIGINAL`, `X ORIGINAL`, `TODOS`, `N/A`, `VOZ ORIGINAL`, `SIN DOBLAJE`— no cuentan como carga de nadie. Contadas, salían las primeras con cien líneas y tapaban a los actores de verdad. | ✅ |
| **CAST-23** | Un nombre que solo se **parece** a una de esas palabras sigue siendo un actor: `MÁXIMO`, `ORIGINALES DE LA TORRE`, `TODOS SANTOS`. | ✅ |
| **CAST-24** | Un **choque** es el mismo actor haciendo dos personajes que hablan a menos de **4 líneas** de distancia. Se mide en líneas del libreto, no en páginas: dos personajes pueden compartir página y estar a treinta líneas, o estar en páginas distintas y hablar seguidos. | 👁 |
| **CAST-25** | Un choque avisa y pinta las dos tarjetas en **rojo**. Un aviso por pareja, no por línea. | 👁 |

| **CAST-26** | Al escribir el desglose, el nombre del personaje se casa con la fila del Excel usando **la misma clave** que la herencia (`castNorm`): sin tildes, sin apostrofos, sin puntos. | ✅ |
| **CAST-27** | Cada celda de la columna del actor que se quede **en blanco** se dice, y se dice **por qué**: o el personaje es de solo gestos sin verificar, o no tiene talento asignado. Las dos cosas se ven igual en el Excel y no se arreglan igual. | ✅ |

## Reglas · personajes completados

| | Regla | |
|---|---|---|
| **FIN-1** | Un personaje está **completado** cuando su reparto no espera nada de nadie: tiene talento, ese talento **no está pendiente de verificar**, y si solo hace gestos, también se ha mirado. | ✅ |
| **FIN-2** | Al **verificar**, su tarjeta se apaga y pasa a la pestaña **Personajes completados**. Repartir sesenta personajes es ir tachando: con todos siempre a la vista, buscar al siguiente obliga a barrer los cuarenta ya hechos. | ✅ |
| **FIN-3** | Tres pestañas con sus números: **Por repartir**, **Personajes completados** y **Todos**. Los dos primeros suman el tercero — nadie se queda fuera de las tres. | ✅ |
| **FIN-4** | Las marcas de producción (`ORIGINAL`, `TODOS`, `X`) **cierran** el personaje: son una decisión tomada, no un hueco por rellenar. | ✅ |
| **FIN-5** | La tarjeta no desaparece de golpe: se apaga y se encoge. Ver **adónde** fue lo que acabas de tocar es la diferencia entre «ya está» y «¿se ha borrado?». | 👁 |

## Reglas · base de talentos

| | Regla | |
|---|---|---|
| **BAS-1** | La empresa tiene una **base de actores**. Se importa de un Excel de una columna: se toma la que tenga `Nombre` de cabecera, y si no la hay, la primera. | ✅ |
| **BAS-2** | **Solo se puede repartir a quien esté en la base.** Un nombre que no está casi siempre es una errata, y una errata parte a un actor en dos por toda la ocupación, los choques y el registro del programa —sin que nada lo avise. | ✅ |
| **BAS-3** | Se guarda el nombre **como está escrito en la base**, no como se teclee. Así `marcela borda` y `MARCELA BORDA` son el mismo actor, y `ANDRES MARINO` encuentra a `ANDRES MARIÑO`. | ✅ |
| **BAS-4** | Al rechazar un nombre se **ofrecen los parecidos** de la base. El listón es alto: una sugerencia que no es la buena estorba más que no sugerir nada. | ✅ |
| **BAS-5** | `ORIGINAL`, `TODOS` y `X` se admiten **siempre**. No son actores: son marcas de producción. ORIGINAL es que no se dobla; TODOS, que lo graban todos; X, que ese parlamento no se hace. Por eso no entran en la base y no cuentan como carga de nadie (**CAST-22**). | ✅ |
| **BAS-6** | `PRINCIPAL PHOTOGRAPHY`, `MAIN TITLE` y `BURNEDIN SUBS` no son personajes: son renglones de producción que **nunca se doblan**. Se marcan solos con `X` al entrar en casting. | ✅ |
| **BAS-7** | La base se guarda **en el equipo** (vale para todos los programas) y **en la nube dentro del programa** (viaja con el trabajo). | 👁 |
| **BAS-8** | Se puede repartir **desde el libreto abierto**, sin volver a las tarjetas: leyendo los parlamentos de un personaje es cuando se decide quién lo hace. Es el mismo camino que la tarjeta —deshacer, copia cruda, choques, registro y nube—, no una copia. | ✅ |

## Nunca

| | |
|---|---|
| **CAST-N1** | **Nunca se pisa un talento que haya escrito una persona.** Ni la herencia, ni la tabla previa, ni el puente con DublajeCast. Solo se rellenan casillas vacías. | ✅ |
| **CAST-N2** | Nunca se reparte talento solo a un personaje de «solo gestos» sin verificar — ni por herencia del programa ni por tabla previa. Los extras (`MALE SOLDIER`, `FEMALE OWNER`) repiten nombre sin ser la misma persona. Se dice a quién se saltó y por qué. | ✅ |
| **CAST-N3** | Nunca se adivina una coincidencia dudosa. Se pregunta. | ✅ |
| **CAST-N5** | **Nunca tener dos normalizadores de nombre para el mismo trabajo.** `castClave` era más floja que `castNorm` —solo mayúsculas y espacios— y al escribir el Excel no encontraba la fila de `AMAR’S MALE GANG MEMBER 1` ni la de un nombre con tilde. El talento estaba puesto en la tarjeta y la celda salía vacía, sin un aviso. Es la misma trampa que dejó a `PÚBLICO` sin parlamentos. | ✅ |
| **FIN-N1** | **Nunca esconder un personaje heredado sin verificar.** El naranja significa «míralo tú»: quitarlo de la vista es darlo por bueno en su nombre, y nadie se entera hasta que el actor no aparece en la sesión. | ✅ |
| **FIN-N2** | Nunca filtrar en **grabación**. Allí «completado» significa otra cosa —todas sus páginas grabadas—, las pestañas ni se enseñan, y un filtro que siguiera puesto de la última vez dejaría la vista vacía sin manera de arreglarlo. | ✅ |
| **BAS-N1** | **Nunca restringir si no hay base cargada.** Bloquear a quien todavía no ha importado el Excel es peor que el problema que se quiere evitar: el campo sigue siendo libre hasta que haya base. | ✅ |
| **BAS-N2** | Nunca meter `ORIGINAL`, `TODOS` o `X` **dentro** de la base aunque vengan en el Excel: ahí contarían como un actor con carga en la ocupación. | ✅ |
| **BAS-N3** | Nunca robarle el foco a quien acaba de pinchar en otro sitio porque el nombre no valga. Al salir del campo se avisa y se deja como estaba; con Enter o con «Guardar» sí se queda para corregir. | 👁 |
| **CAST-N4** | Nunca se borra un personaje con ≥ 15 intervenciones o con talento asignado sin confirmación explícita. | 👁 |

## Cómo se demuestra

- **CAST-N1**, **CAST-N2**, **CAST-N3** y **CAST-8**:
  `pruebas/casting.prueba.js`, sobre `castHeredar` de verdad. Se comprobó
  rompiéndola: al quitar la guarda `if(c.talent) continue`, la prueba canta que
  «QUIEN YO DIGA» ha sido sustituido por el talento del registro. Eso es la voz
  de un protagonista cambiada, cazada en menos de un segundo.
- **CAST-10** y **CAST-11**: la lectura de la tabla previa, incluido el caso
  que ya falló —un talento llamado `ACTOR A` que hacía perder la primera fila—.
- **CAST-26** y **CAST-N5**: en `pruebas/casting.prueba.js`, con los pares de
  nombres que fallaban de verdad —la comilla curva contra la recta, la tilde, la
  eñe, el punto de la abreviatura— y comprobando además que dos personajes
  distintos (`MAID 1` y `MAID 2`) siguen siendo distintos. Devolver la clave
  floja pone cinco comprobaciones en rojo.
- **FIN-1 a FIN-4** y **FIN-N1**, **FIN-N2**: `pruebas/completados.prueba.js`.
  Equivocarse por exceso es lo caro, así que lo que se prueba es cuándo se da un
  personaje por cerrado. Dejar que un heredado sin verificar cuente como cerrado
  pone cuatro comprobaciones en rojo.
- **BAS-1 a BAS-6** y **BAS-N1**, **BAS-N2**: `pruebas/base-talentos.prueba.js`, con
  los nombres de la base real que más guerra dan. La lectura del Excel se prueba
  con el XML de verdad —incluido un nombre partido en dos `<t>`, que es como Excel
  guarda una celda con formato dentro—. Quitar la restricción pone tres
  comprobaciones en rojo.
- **BAS-8** y el resto, a mano en el navegador: importar los 291 nombres del Excel
  de la empresa, repartir desde el libreto y ver que un nombre que no está se para.
- **CAST-15 a CAST-17** y **CAST-21 a CAST-23**: `pruebas/gestos.prueba.js` y
  `pruebas/ocupacion.prueba.js`.
- El resto, a mano: abrir el 101 de un programa, repartir, abrir el 102 y
  comprobar que hereda en naranja.

## Sin resolver

- **CAST-N1** está probada en la **herencia**, que es la que se ejecuta sola al
  abrir un capítulo y por tanto la que puede hacer daño sin que nadie la haya
  pedido. Los otros dos sitios donde vive la misma regla —la tabla previa y el
  puente con DublajeCast— siguen sin prueba. Es la primera cosa que añadir.
- **CAST-24**: el margen de 4 líneas es un número elegido a ojo. No hay medida
  de si en sala es el bueno.
- El puente con DublajeCast nunca se ha probado contra sus datos reales; no he
  entrado en su cuenta y no debo.
