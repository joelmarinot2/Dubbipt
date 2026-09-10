# 07 · Entorno

## Para qué

Las condiciones en las que la aplicación corre de verdad. No son detalles de
despliegue: son restricciones que **cambian lo que el código puede hacer**, y
saltárselas al probar significa probar otra aplicación.

## Reglas

| | Regla | |
|---|---|---|
| **ENT-1** | La aplicación se despliega **copiando archivos**: no hay empaquetador, ni compilación, ni dependencias que instalar. `index.html` con sus dos `<script>` en línea, más los módulos de `js/`. Es una decisión, no un accidente. | — |
| **ENT-2** | La política de seguridad de contenido (CSP) sale de `vercel.json` y **es el entorno de prueba de verdad**. Probar sin ella es probar otra aplicación. | 👁 |
| **ENT-3** | `connect-src` tiene que listar **todos** los hosts a los que se llama: los dos Supabase, los CDN, y `huggingface.co` con sus subdominios para el modelo de voz. Lo que no esté listado se bloquea. | 👁 |
| **ENT-4** | `script-src` incluye `'wasm-unsafe-eval'`. Sin eso, el reconocimiento de voz no arranca: WebAssembly queda bloqueado. | 👁 |
| **ENT-5** | El servidor local (`local/servidor.js`) manda **las mismas cabeceras que Vercel**, leyéndolas de `vercel.json`. Una sola fuente de verdad. | 👁 |
| **ENT-6** | El service worker cachea la carcasa (`SHELL`). **Cada archivo local que cargue `index.html` tiene que estar en esa lista**, o no habrá funcionado sin conexión. | ✅ |
| **ENT-7** | El service worker solo atiende peticiones del **mismo origen** y de la lista `SHELL`, ignora las peticiones por rango y **nunca resuelve a `undefined`**. Interceptando de más se quedaba con la descarga del modelo de voz y daba «Failed to fetch». | 👁 |
| **ENT-8** | Cada cambio que se despliega sube `APP_VER_NUM` en `index.html` **y** `VERSION` en `sw.js`. Sin subir la del service worker, el navegador sigue sirviendo la versión antigua desde la caché y el cambio no llega. | 👁 |
| **ENT-9** | La versión se enseña en pantalla, y **todo informe dice en qué versión estamos**. | — |
| **ENT-10** | Las pruebas se pasan **antes** de desplegar: `pruebas.cmd` o `node pruebas/correr.js`. | ✅ |
| **ENT-11** | Los módulos de `js/` son **scripts clásicos**, no módulos ES: comparten el mismo ámbito global que el código en línea, igual que cuando estaban dentro. Se cargan **al final**, después de los bloques en línea, y en un orden fijo. | ✅ |
| **ENT-12** | Que un trozo de código viva dentro de `index.html` o en su propio archivo es **organización, no comportamiento**. Las pruebas miran el conjunto (`fuentes()` en `pruebas/ayuda.js`), así que mover código de sitio no obliga a tocar ninguna prueba. | ✅ |

## Nunca

| | |
|---|---|
| **ENT-N1** | **Nunca diagnosticar un bloqueo como problema de red del cliente sin comprobar antes la propia CSP.** Ya pasó: la función de IA estaba bloqueada por nuestra propia política y el aviso mandó al usuario a hablar con su departamento de sistemas. | — |
| **ENT-N2** | Nunca dar por bueno un cambio probándolo con `file://` ni con un servidor sin cabeceras. Ahí el service worker no se registra y los orígenes se comportan de otra manera. | — |
| **ENT-N3** | Nunca añadir un archivo al proyecto sin meterlo en `SHELL`. | ✅ |
| **ENT-N4** | Nunca confiar en `requestAnimationFrame` para nada que deba ocurrir aunque la pestaña no esté pintando. No se dispara. Ya rompió el cajón de ocupación y el bucle de ensayo. | 👁 |
| **ENT-N5** | Nunca usar `window.open` para imprimir: las ventanas emergentes se bloquean y el botón se queda sin hacer nada. Se imprime desde un iframe oculto. | 👁 |

## Cómo se demuestra

- **ENT-6** y **ENT-10** los comprueba `pruebas/correr.js`, que además verifica
  la sintaxis de **todo** el JavaScript de la aplicación: los dos bloques en
  línea, `config.js`, los cuatro módulos de `js/` y `sw.js`.
- El resto, arrancando `abrir-dubbipt.cmd` —que sirve con las cabeceras de
  Vercel— y comprobando en la consola del navegador que no hay bloqueos de CSP.

## Sin resolver

- **ENT-6 ya está cerrada**: `pruebas/correr.js` comprueba que todo archivo
  local que carga `index.html` esté en `SHELL`, y que exista. Se estrenó
  cazando los cuatro módulos de la fase 2.
- **ENT-8 sigue abierta.** Una versión de service worker sin subir hace que el
  despliegue «no haga nada», sin ningún error. Se puede automatizar: avisar si
  `index.html` cambió respecto al último commit sin que cambiara `VERSION` en
  `sw.js`. Media hora, y cierra una clase entera de error.
- Los `try/catch` que se comían el error sin decir nada eran 583. La fase 3 los
  bajó a 486 y puso 97 avisos; ver [`08-fallos.md`](08-fallos.md), que además
  trae el trinquete que impide que el número vuelva a subir.
