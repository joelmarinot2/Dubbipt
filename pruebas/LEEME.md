# Pruebas de Dubbipt

```bash
node pruebas/correr.js
```

O doble clic en **`pruebas.cmd`** en la raíz. Tarda menos de un segundo y no
instala nada: solo hace falta Node.

Se corren solas en cada empujón a `main` y en cada pull request
(`.github/workflows/pruebas.yml`).

---

## Qué comprueban

**Sintaxis.** Se saca **todo** el JavaScript de la aplicación —los dos
`<script>` en línea de `index.html`, `config.js`, los módulos de `js/` y
`sw.js`— y se pasa por el comprobador de Node. Va primero porque un paréntesis
mal cerrado deja la aplicación **en blanco**, y eso no lo detecta ninguna
prueba de comportamiento: no llega a arrancar.

**Carcasa.** Que todo archivo local que cargue `index.html` esté en la lista
`SHELL` de `sw.js` (regla ENT-6). Si falta, la aplicación funciona hasta que
alguien la abre sin conexión, y entonces falla sin ninguna explicación.

**Comportamiento.** Un archivo por asunto:

| Archivo | Qué protege |
|---|---|
| `libreto.prueba.js` | **`buildScript`**, la función de la que depende todo lo demás: que los timecodes vayan a su casilla y no al diálogo, que la cascada herede, y que un libreto de doblaje no sea secuestrado como audiodescripción. |
| `casting.prueba.js` | **CAST-N1**: que nunca se pise un talento escrito por una persona. Y que lo dudoso se pregunte en vez de adivinarse. |
| `excel.prueba.js` | Que escribir en el desglose de la empresa **no borre una sola fórmula**. Es donde más caro sale un fallo. |
| `formatos.prueba.js` | Que un SRT, un STL o un CSV entren y salgan sin perder un fotograma. |
| `gestos.prueba.js` | Que a un extra que en este capítulo solo reacciona no se le herede el actor del anterior. Y, sobre todo, que no se marque como «solo gestos» a alguien que sí habla. |
| `ocupacion.prueba.js` | Que «X», «ORIGINAL», «X ORIGINAL» y «TODOS» no cuenten como carga de ningún actor, y que un actor que se llame «MÁXIMO» u «ORIGINALES DE LA TORRE» no desaparezca por parecerse. |
| `planos.prueba.js` | Que los cambios de plano se encuentren y que los fundidos, las cámaras en mano y los parpadeos de compresión **no** se cuelen como cortes. Y que el cotejo con la voz respete el orden de las palabras. |
| `callados.prueba.js` | El trinquete: que el número de `catch` que se comen el error **no suba nunca**. |

## Cómo están hechas

Leen el **código que se despliega**, no una copia: los dos `<script>` en línea
de `index.html` y los archivos locales que carga. Recortan por comentarios el
trozo que toca y lo evalúan con las dependencias justas.

Es deliberado:

- Se prueba el código de verdad. Si alguien lo edita, la prueba ve ese cambio;
  no hay una copia que se quede vieja sin que nadie se dé cuenta.
- No hace falta empaquetador. Dubbipt se despliega copiando archivos, y las
  pruebas se adaptan a eso, no al contrario. Que un módulo viva dentro de
  `index.html` o en `js/` es indiferente: se mira el conjunto.

`pruebas(t)` puede ser `async` y el lanzador la espera. Hace falta para probar
`castHeredar`, que lee el registro del programa; sin esperarla, sus
comprobaciones se ejecutaban **después** del resumen y no se contaban.

El precio: los recortes van por texto. Si alguien reescribe el comentario que
sirve de marca, la prueba **se queja con el nombre exacto de la marca que no
encuentra**. Eso es un aviso ruidoso, no un fallo silencioso, que es
precisamente lo que buscamos.

## Se han probado contra roturas de verdad

Un juego de pruebas que no puede ponerse rojo no vale nada. Estas se
comprobaron rompiendo el código a propósito, una cosa a la vez:

| Rotura | ¿Se enteró? |
|---|---|
| Una llave sin cerrar en `cortesDif` | Sí — sintaxis en rojo |
| Quitar `REACCION` de la lista de gestos | Sí — 1 comprobación |
| `castEsActor` devolviendo siempre `true` | Sí — 5 comprobaciones |
| Bajar el listón relativo de los cortes de 3 a 1,2 veces | Sí — 3 comprobaciones |
| Bajar el suelo absoluto de 0,06 a 0,004 | Sí — 1 comprobación |
| Quitar la guarda de CAST-N1 (`if(c.talent) continue`) | Sí — 3 comprobaciones |
| Volver a poner la expresión codiciosa del Excel | Sí — 3 comprobaciones |
| Quitar la guarda de LIB-N1 (no borrar un libreto de la nube) | Sí — 1 comprobación |
| Bajar el umbral de LIB-9 de 20 tomas a 6 | Sí — 2 comprobaciones |

Las **dos de los cortes** no se detectaban con las pruebas iniciales: el vídeo
de prueba era demasiado fácil y nada superaba el suelo salvo los cortes de
verdad. Se añadieron dos casos para cerrar el hueco —una persecución a cámara
en mano, con movimiento fuerte y ningún corte, y un parpadeo en un plano
quieto, veinte veces su vecindario pero una nadería en valor absoluto—. Si
mañana alguien toca esos dos números, se enterará.

Las de **CAST-N1** y **el Excel** son las que más tranquilidad dan, porque son
los dos fallos que de verdad han costado dinero en este proyecto: la voz de un
protagonista cambiada y una columna de fórmulas borrada en silencio.

Y las **dos de LIB** cubren la función de la que cuelga toda la aplicación. La
de LIB-N1 canta `dio [], esperaba undefined`: eso es un capítulo entero
borrado al abrirlo.

## Qué NO cubren

Conviene tenerlo claro, para no confiarse:

- **La interfaz.** Nada de lo que se pinta está probado aquí. Los streamers, la
  banda rítmica y la barra de progreso se verificaron midiendo píxeles con un
  navegador de verdad, a mano, y esas comprobaciones no están automatizadas.
- **La captura de fotogramas del vídeo.** `drawImage` sobre el `<video>` solo
  se puede comprobar con una película delante y una ventana que se esté
  pintando. Aquí se prueba la **decisión** de qué es un corte, no la lectura.
- **El empaquetado del Excel.** El XML ya está cubierto -y es donde estuvieron
  siempre los fallos-, pero `castRellenar`, que abre y cierra el ZIP, necesita
  la librería de compresión y no está probado. La comprobación de extremo a
  extremo sigue siendo abrir el archivo en Excel de verdad.
- **Supabase, la sincronía y el service worker.** Nada de red.

## Cómo añadir una prueba

1. Un archivo `algo.prueba.js` en esta carpeta.
2. Exporta `nombre` y `pruebas(t)`.
3. `t.eq`, `t.cerca`, `t.ok` y `t.seccion`. `correr.js` lo encuentra solo.

```js
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Lo que sea';
exports.pruebas = function(t){
  const M = montar([['function loQueSea(', '/** el siguiente comentario']],
                   ['loQueSea'], { /* lo que ese código espera encontrar */ });
  t.seccion('1 · el caso normal');
  t.eq('hace lo suyo', M.loQueSea(2), 4);
};
```

Y antes de darla por buena: **rómpela a propósito** y comprueba que se pone
roja. Si no, no está protegiendo nada.
