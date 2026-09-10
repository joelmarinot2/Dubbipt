# Especificación de Dubbipt

Lo que la aplicación **debe** hacer, lo que **nunca** debe hacer, y cómo se
demuestra cada cosa.

No es documentación de cómo está hecho el código: eso ya está en los
comentarios de `index.html`. Esto es el **contrato**. Si el código y este
documento no coinciden, uno de los dos está mal y hay que decidir cuál — pero
nunca dejarlo así.

## Por qué existe

Estas reglas se han pagado caras. Cada una viene de un problema real: una
columna de fórmulas borrada sin avisar, un actor convocado para grabar tres
jadeos, una voz cambiada al personaje equivocado, una banda rítmica con tiempos
`NaN`. Hasta ahora vivían en la cabeza de quien las descubrió y en los mensajes
de los commits. Escritas, se pueden citar, comprobar y heredar.

Y tienen un segundo uso: son lo que hay que darle a un agente antes de pedirle
que toque algo. Sin esto, un agente sobre 18.700 líneas de ámbito global
compartido rompe cosas más rápido de lo que las arregla.

## Los archivos

| | Qué cubre |
|---|---|
| [`01-libreto.md`](01-libreto.md) | Leer el guion, los timecodes, los personajes, las páginas |
| [`02-casting.md`](02-casting.md) | Reparto, continuidad, solo gestos, ocupación, deshacer |
| [`03-desglose-excel.md`](03-desglose-excel.md) | Escribir en el Excel de la empresa sin romperlo |
| [`04-sala-adr.md`](04-sala-adr.md) | Cues, estados, takes, streamers, beeps, banda rítmica |
| [`05-formatos.md`](05-formatos.md) | Traer y llevar SRT, STL, CSV, TTML, marcadores |
| [`06-sincronia.md`](06-sincronia.md) | Nube, tiempo real, tablet y escritorio, concurrencia |
| [`07-entorno.md`](07-entorno.md) | CSP, service worker, versiones, despliegue |

## Cómo se leen las reglas

Cada regla tiene un identificador estable — `LIB-4`, `CAST-11`, `XLS-2` — que
se puede citar en un commit, en una prueba o en una conversación. **Los
identificadores no se reciclan**: si una regla desaparece, su número se queda
libre y no se vuelve a usar.

Y cada una lleva una marca de cómo está comprobada:

| Marca | Significa |
|---|---|
| ✅ | Hay una prueba automática en [`pruebas/`](../pruebas/LEEME.md). Se rompe sola si alguien la incumple. |
| 👁 | Comprobada a mano, y se dice cómo. Nadie se enterará si mañana deja de cumplirse. |
| ⚠️ | **Sin comprobar.** Es una intención, no un hecho. |

Esa tercera columna es el mapa de lo que falta. Las ✅ son 140 comprobaciones
hoy; las 👁 y las ⚠️ son la lista de trabajo.

## Reglas sobre las reglas

1. Una regla se escribe en términos de **oficio**, no de código. «Nunca se
   pisa un talento que haya escrito una persona» — no «`castHeredar` comprueba
   `c.talent` antes de asignar».
2. Una regla tiene que ser **falsable**. Si no se puede describir cómo se vería
   incumplida, no es una regla: es un deseo.
3. Las prohibiciones (**Nunca**) pesan más que las capacidades. Una función que
   falta se nota; una fórmula borrada en silencio, no.
4. Cuando una regla cambie porque el negocio ha cambiado, se **edita aquí
   primero** y después en el código.
