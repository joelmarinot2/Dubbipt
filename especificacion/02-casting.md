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
| **CAST-8** | Lo que **no coincide exacto** por nombre se **pregunta**, uno por uno. Un nombre mal heredado es peor que uno sin heredar. | 👁 |
| **CAST-9** | Se puede subir una **tabla de casting previa** en Excel: columna A personaje, B talento, C número de intervenciones. | 👁 |
| **CAST-10** | La cabecera de esa tabla se detecta por **coincidencia exacta** de la celda, no buscando la palabra dentro. Buscándola dentro, una tabla cuyo primer talento se llame `ACTOR A` perdía su primera fila. | 👁 |
| **CAST-11** | Una celda de intervenciones **vacía** significa *desconocido*, no cero. Como cero disparaba el aviso de «no cuadran las intervenciones» sin que hubiera nada raro. | 👁 |
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

## Nunca

| | |
|---|---|
| **CAST-N1** | **Nunca se pisa un talento que haya escrito una persona.** Ni la herencia, ni la tabla previa, ni el puente con DublajeCast. Solo se rellenan casillas vacías. | 👁 |
| **CAST-N2** | Nunca se reparte talento solo a un personaje de «solo gestos» sin verificar — ni por herencia del programa ni por tabla previa. Los extras (`MALE SOLDIER`, `FEMALE OWNER`) repiten nombre sin ser la misma persona. Se dice a quién se saltó y por qué. | 👁 |
| **CAST-N3** | Nunca se adivina una coincidencia dudosa. Se pregunta. | 👁 |
| **CAST-N4** | Nunca se borra un personaje con ≥ 15 intervenciones o con talento asignado sin confirmación explícita. | 👁 |

## Cómo se demuestra

- **CAST-15 a CAST-17** y **CAST-21 a CAST-23**: `pruebas/gestos.prueba.js` y
  `pruebas/ocupacion.prueba.js`. Comprobadas rompiendo el código a propósito
  (ver `pruebas/LEEME.md`).
- El resto, a mano: abrir el 101 de un programa, repartir, abrir el 102 y
  comprobar que hereda en naranja; subir una tabla previa con un talento
  llamado `ACTOR A` y comprobar que no se pierde su fila.

## Sin resolver

- **CAST-N1** es la regla más importante del archivo y **no tiene ninguna
  prueba**. Hoy depende de una sola línea (`if(c.talent) continue`) repetida en
  tres sitios: herencia, tabla previa y puente. Tres sitios es tres
  oportunidades de que uno se quede atrás.
- **CAST-24**: el margen de 4 líneas es un número elegido a ojo. No hay medida
  de si en sala es el bueno.
- El puente con DublajeCast nunca se ha probado contra sus datos reales; no he
  entrado en su cuenta y no debo.
