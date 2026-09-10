# 03 · Desglose de Excel

## Para qué

Devolver **el mismo archivo de la empresa** con los actores puestos. No un
archivo parecido: el mismo, con sus fórmulas, su formato, sus macros y sus diez
hojas intactas.

Esta es la parte más delicada de toda la aplicación. El desglose de un capítulo
real trae **41.000 fórmulas** repartidas en diez hojas que se alimentan entre
ellas. Un error aquí no da un mensaje: entrega un archivo que parece bueno y que
en la hoja de presupuesto sale a cero.

## Cómo, en una frase

Se abre el `.xlsm` como el ZIP que es, se edita **solo el XML de la hoja de
casting** y todo lo demás se vuelve a empaquetar **byte a byte**.

## Reglas

| | Regla | |
|---|---|---|
| **XLS-1** | El casting va a la hoja `CASTING`, personaje en la columna **A**, actor en la columna **D**. | 👁 |
| **XLS-2** | Se edita únicamente el XML de esa hoja. El resto del ZIP se copia sin tocar. | 👁 |
| **XLS-3** | Al escribir una celda se **conserva su estilo** (`s="…"`). Sin eso, el actor sale con otra fuente y otro borde. | 👁 |
| **XLS-4** | Los textos se escriben como `inlineStr`. Así no hay que tocar la tabla de cadenas compartidas, que es global al libro. | 👁 |
| **XLS-5** | Los **números se escriben como números** (`<v>`), no como texto. Como texto, las fórmulas que los usan dejan de sumar. | 👁 |
| **XLS-6** | Si la celda no existe todavía, se inserta en su fila **en orden de columna**. Excel exige ese orden. | 👁 |
| **XLS-7** | Se pone `fullCalcOnLoad="1"` en `xl/workbook.xml`. El archivo viene marcado como «ya calculado», y sin eso Excel se fía de los valores guardados: el actor entraba en la hoja de casting y no aparecía en `PLANILLA`, `CASTING 1` ni `PRESUPUESTO`. | 👁 |
| **XLS-8** | La cabecera del programa se escribe en celdas fijas: `B7` fecha · `B8` género · `B10` tiempo · `D7` director · `D8` técnico · `D10` estudio. Se guarda **una vez por programa**. | 👁 |
| **XLS-9** | La expresión que busca una celda usa `[^>]*?` —**perezoso**—, no `[^>]*`. Con la versión codiciosa, la búsqueda se comía hasta el siguiente `>` de otra celda y **borraba las fórmulas de la columna E** sin decir nada. | 👁 |
| **XLS-10** | Si un personaje del libreto no está en el Excel, se avisa **por su nombre**. No se inventa una fila. | 👁 |

## Nunca

| | |
|---|---|
| **XLS-N1** | **Nunca reescribir el libro con una biblioteca de hojas de cálculo.** Un viaje de ida y vuelta por SheetJS destruye el formato, las macros y parte de las fórmulas. Solo parcheo quirúrgico del ZIP. | 👁 |
| **XLS-N2** | Nunca tocar `B9` de la hoja `CASTING`: es la fórmula que trae el título del capítulo. Escribir encima la borraría y el título dejaría de actualizarse solo. | 👁 |
| **XLS-N3** | Nunca dar por bueno un cambio en el XML sin **contar las fórmulas antes y después**. Es la única comprobación que detectó XLS-9, porque no se lanzaba ningún error. | 👁 |
| **XLS-N4** | Nunca escribir el casting de un capítulo en el desglose de otro. | 👁 |

## Cómo se demuestra

Hoy, **a mano**, y es la comprobación más valiosa que existe en el proyecto:

1. Partir del desglose real (`DES_… 101_INCOMPLETO.xlsm`: 10 hojas, 41.035
   fórmulas, macros, 1,2 MB).
2. Exportar con casting desde la aplicación.
3. Abrir el resultado en **Excel de verdad** y comprobar: las 10 hojas siguen
   ahí, las macros siguen ahí, `B9` sigue siendo una fórmula, la cabecera está
   en sus seis celdas, el actor aparece en `CASTING` **y** en `PLANILLA`,
   `CASTING 1` y `PRESUPUESTO`.
4. **Contar las fórmulas** del archivo de salida y comparar con las 41.035 de
   entrada. Si falta una sola, algo se ha borrado.

## Sin resolver

Esto es la laguna más grande del proyecto: **cero pruebas automáticas sobre el
Excel**, y es donde más caro sale un fallo.

Lo que haría falta, y es factible: un `.xlsm` mínimo en `pruebas/casos/` —dos
hojas, una fórmula que dependa de la otra, un estilo, una celda numérica—,
pasarlo por `castRellenar` con `fflate` en Node y comprobar en el ZIP de salida
que el número de fórmulas no ha cambiado, que los estilos siguen, que el número
sigue siendo numérico y que `fullCalcOnLoad` está puesto. No hace falta Excel
para eso: basta con leer el XML. Es media jornada y cerraría **XLS-2** a
**XLS-9** de golpe.
