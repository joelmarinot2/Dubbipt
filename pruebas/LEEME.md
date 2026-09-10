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

**Sintaxis.** Se saca el JavaScript de los dos `<script>` en línea de
`index.html` y de `sw.js` y se pasa por el comprobador de Node. Va primero
porque un paréntesis mal cerrado deja la aplicación **en blanco**, y eso no lo
detecta ninguna prueba de comportamiento: no llega a arrancar.

**Comportamiento.** Un archivo por asunto:

| Archivo | Qué protege |
|---|---|
| `gestos.prueba.js` | Que a un extra que en este capítulo solo reacciona no se le herede el actor del anterior. Y, sobre todo, que no se marque como «solo gestos» a alguien que sí habla. |
| `ocupacion.prueba.js` | Que «X», «ORIGINAL», «X ORIGINAL» y «TODOS» no cuenten como carga de ningún actor, y que un actor que se llame «MÁXIMO» u «ORIGINALES DE LA TORRE» no desaparezca por parecerse. |
| `planos.prueba.js` | Que los cambios de plano se encuentren y que los fundidos, las cámaras en mano y los parpadeos de compresión **no** se cuelen como cortes. Y que el cotejo con la voz respete el orden de las palabras. |

## Cómo están hechas

Leen el **`index.html` que se despliega**, no una copia. Sacan el contenido de
los `<script>`, recortan por comentarios el trozo de código que toca y lo
evalúan con las dependencias justas.

Es deliberado:

- Se prueba el código de verdad. Si alguien edita `index.html`, la prueba ve
  ese cambio; no hay una copia que se quede vieja sin que nadie se dé cuenta.
- No hace falta empaquetador ni módulos. Dubbipt es un solo archivo a
  propósito, y las pruebas se adaptan a eso, no al contrario.

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

Las dos últimas **no se detectaban** con las pruebas iniciales. Se añadieron
dos casos para cerrar el hueco: una persecución a cámara en mano (movimiento
fuerte, ningún corte) y un parpadeo en un plano quieto (veinte veces su
vecindario, pero una nadería en valor absoluto). Si mañana alguien toca esos
dos números, se enterará.

## Qué NO cubren

Conviene tenerlo claro, para no confiarse:

- **La interfaz.** Nada de lo que se pinta está probado aquí. Los streamers, la
  banda rítmica y la barra de progreso se verificaron midiendo píxeles con un
  navegador de verdad, a mano, y esas comprobaciones no están automatizadas.
- **La captura de fotogramas del vídeo.** `drawImage` sobre el `<video>` solo
  se puede comprobar con una película delante y una ventana que se esté
  pintando. Aquí se prueba la **decisión** de qué es un corte, no la lectura.
- **El Excel.** El parcheado quirúrgico del desglose -conservar fórmulas,
  formato y macros- se verificó abriendo el archivo en Excel de verdad y
  contando fórmulas antes y después. Es la prueba que más falta hace y la que
  más trabajo cuesta automatizar.
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
