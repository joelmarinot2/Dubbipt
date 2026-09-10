# 08 · Fallos que no se oyen

## Para qué

Que una función rota y una función que funciona **no se vean igual**.

El proyecto arrastraba **583 bloques `try/catch` con el manejador vacío**. El
capítulo no se guardaba en la nube, la tarjeta no se repintaba, el desglose se
descargaba a medias, y no había ninguna señal: ni en pantalla, ni en la
consola. Se descubría cuando lo notaba un cliente, días después, sin forma de
saber qué había pasado.

## La idea, en dos frases

Lo que **no debería fallar nunca en silencio** se apunta y se cuenta. Lo que
falla de forma normal —escribir en el almacenamiento local en una ventana
privada, vaciar una memoria que ya estaba vacía— se sigue callando, a
propósito.

## Reglas

| | Regla | |
|---|---|---|
| **FAL-1** | `fallo(donde, e, nota)` apunta un fallo, lo cuenta y lo saca por consola. `donde` nombra **la llamada que falló y su sitio exacto** (`epDataUpsert · index.html:4777`). | 👁 |
| **FAL-2** | La etiqueta sale del **propio código vigilado**, no de la función que lo envuelve. Buscando la envolvente hacia atrás no se distingue «la función que me contiene» de «la última que se declaró antes de mí»: a un `sb.auth.signOut()` le tocaba la etiqueta `authErrMsg`, que es un formateador de mensajes. Una etiqueta equivocada manda a quien lee el informe al sitio equivocado. | 👁 |
| **FAL-3** | El mismo fallo repetido **no se duplica**: se cuenta cuántas veces. Un fallo dentro de un bucle no puede llenar la lista. | 👁 |
| **FAL-4** | La lista tiene tope (200). Al desbordarse se tira el más viejo, y también su clave, para que no crezca el índice. | 👁 |
| **FAL-5** | El aviso es **pequeño y en una esquina**. Ni ventana modal, ni bloqueo: quien está grabando no puede pararse porque una petición haya fallado. | 👁 |
| **FAL-6** | El aviso solo existe si hay algo que avisar. Con la lista vacía, desaparece. | 👁 |
| **FAL-7** | Al pulsarlo se ve qué pasó y se puede **copiar el informe de una pieza**: versión, fecha, navegador, capítulo abierto y cada fallo con su mensaje, su nota y su pila. Es lo que se manda para que alguien lo mire. | 👁 |
| **FAL-8** | Cualquier error **que nadie haya capturado** —y cualquier promesa sin atender— acaba también en la lista. Es lo que más cubre y lo que menos cuesta. | 👁 |
| **FAL-9** | La nota «puede que esto no se haya guardado en la nube» se pone **solo cuando de verdad se escribe** algo. Un `getSession()` o un `signOut()` son lecturas: esa nota ahí engañaría. | 👁 |
| **FAL-10** | Un manejador con un **comentario dentro** es una decisión tomada y documentada. No se toca y no cuenta como deuda. | ✅ |

## Nunca

| | |
|---|---|
| **FAL-N1** | **El avisador no puede tirar la aplicación.** Todo lo suyo va envuelto en su propio manejador, y ese sí se calla, con su nota al lado. Si el que avisa de los fallos provoca un fallo, no hemos arreglado nada: lo hemos empeorado. | 👁 |
| **FAL-N2** | Nunca convertir a ciegas todos los manejadores vacíos. La mayoría son normales, y avisar de ellos sería ruido que tapa lo que sí importa. | ✅ |
| **FAL-N3** | Nunca poner una nota que pueda ser falsa. Una nota equivocada es peor que ninguna. | 👁 |
| **FAL-N4** | **Nunca dejar que una expresión regular reescriba texto que está dentro de un comentario o una cadena.** Pasó: el conversor tocó un `catch` que era prosa dentro de un `/* … */` y le metió otro comentario dentro; el primer cierre cerró el comentario exterior y toda la prosa siguiente pasó a ser código. La aplicación se quedó en blanco. | 👁 |

## El trinquete

`pruebas/callados.prueba.js` cuenta los manejadores vacíos y **falla si el
número sube**. La deuda solo puede bajar.

| | |
|---|---|
| Antes de la fase 3 | **583** callados · 0 avisan |
| Al cerrarla | **486** callados · **97** avisan |

Arreglar los 486 restantes de golpe sería más peligroso que dejarlos: hay que
mirar uno por uno si ese fallo importa o es normal. Lo que sí se garantiza es
que no aparezcan nuevos sin que alguien lo decida a conciencia: o se avisa con
`fallo(...)`, o se explica dentro del manejador por qué ese fallo no interesa.

Los 97 convertidos son los de **nube** (41) y **pintado** (56). Los que quedan
son, en su mayoría, almacenamiento local (78) y limpiar memoria (8), donde
fallar es normal, más 354 sin clasificar que hay que revisar a mano.

## Cómo se demuestra

- **FAL-10** y **FAL-N2** las comprueba el trinquete en cada empujón.
- El resto, en el navegador con la CSP de producción: un fallo a mano aparece
  con su aviso; repetido tres veces sale «1 fallo · 3 veces»; una promesa sin
  atender y un error lanzado desde un temporizador acaban los dos en la lista;
  un sitio convertido de nube apunta su nota; el panel abre con sus filas; el
  informe sale con versión, navegador, mensaje, nota y pila; y al vaciar la
  lista el aviso desaparece.

## Sin resolver

- Nada de esto está en `pruebas/` salvo el trinquete. Se podría: `fallo` es una
  función casi pura sobre `DDL_FALLOS`, y el agrupado, el tope y el informe se
  comprueban sin navegador. Es media hora y cerraría **FAL-1** a **FAL-4** y
  **FAL-7**.
- Los **354 manejadores sin clasificar** son la deuda que queda. No hay ninguna
  urgencia, pero cada vez que se toque una función conviene mirar los suyos.
- El aviso no distingue gravedad. Un fallo al guardar en la nube y uno al
  repintar una lista se ven igual. Si el ruido molesta, ahí está el siguiente
  ajuste.
