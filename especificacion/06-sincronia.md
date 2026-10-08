# 06 · Nube y sincronía

## Para qué

Que todo el estudio vea lo mismo, que la tablet y el escritorio vayan a una, y
que dos personas trabajando a la vez no se borren el trabajo.

## Reglas

| | Regla | |
|---|---|---|
| **SYN-1** | Todo lo de un capítulo —libreto, personajes, cues, cortes de plano, cotejo— se guarda junto y viaja junto. Lo que ve uno lo ve el resto del estudio. | 👁 |
| **SYN-2** | Los espacios de trabajo son **privados de cada cuenta**. Para que la tablet y el escritorio compartan programas, ambos tienen que entrar con la **misma cuenta**. | 👁 |
| **SYN-3** | Antes de guardar en un capítulo se comprueba que es **el capítulo abierto**. Jamás datos cruzados entre capítulos. | 👁 |
| **SYN-4** | Se guarda también en el equipo (IndexedDB). Si la red del estudio falla, se puede seguir trabajando con lo último que se bajó. | 👁 |
| **SYN-5** | Los trazos y los gestos del pincel se **funden por identificador de dispositivo**: cada pantalla aporta los suyos y nadie pierde lo que dibujó el otro. | 👁 |
| **SYN-6** | Al cambiar de capítulo, el modo estudio arranca apagado: no se arrastra el vídeo del anterior. | 👁 |
| **SYN-7** | Todo lo que llega de la nube se trata como **datos de fuera**: se sanea antes de concatenarlo en HTML o de compararlo. Lo pudo escribir otro cliente, o una versión más nueva de la aplicación. | 👁 |
| **SYN-13** | La posición del libreto viaja por **índice de intervención**, no por píxeles ni por página: el índice es el mismo en la tablet y en el escritorio aunque tengan otro tamaño de letra o otro ancho de caja. | 👁 |
| **SYN-14** | Con la posición viaja una **huella del libreto** —cuántas intervenciones, de quién, con qué timecode y en qué página—. Sin ella, dos aparatos con libretos distintos se sincronizan a ciegas: el índice 300 es una intervención en cada uno y lo único que se ve es que **las páginas no coinciden**. | ✅ |
| **SYN-15** | Si las huellas no casan **se dice, con el botón de ponerse al día**, y una sola vez por pareja de huellas: los mensajes de posición llegan a veinte por segundo. | ✅ |
| **SYN-16** | Un guardado en la nube que **falla se reintenta** sin perder nada —lo tocado sigue pendiente y viaja en el intento siguiente—, pero **cada vez más despacio**: a los 5 s, y el doble con cada fallo seguido, hasta 2 minutos. Y se dice **una vez por racha**, no en cada intento; si el fallo es de **sesión o de permiso** se dice que hay que volver a entrar, porque reintentar no lo arregla. Antes se reintentaba cada 5 s para siempre con un aviso rojo en cada intento: se vio validando la app, 190 intentos seguidos. Vale para el progreso de las páginas y para las marcas del libreto. | ✅ |
| **SYN-17** | **La posición del seguimiento viaja al momento, y marcada.** Cuando el libreto del escritorio se coloca en un parlamento nuevo siguiendo a Pro Tools o al vídeo, la posición se manda desde ahí mismo, no desde el evento de scroll: con la pestaña tapada ese evento **no se dispara**, y la tablet se quedaba sin saber que el libreto se había movido. Se manda la posición de **destino** —el visor puede estar todavía deslizando hacia ella— y marcada como del seguimiento (`seg`): la tablet la aplica con su **deslizar corto** —o de golpe si está tapada—, no con el suavizado de los gestos, que se acerca poco a poco y tardaba casi medio segundo en asentarse. Mientras se coloca no se reenvía, y si la tablet se acaba de tocar con la mano, manda la mano. | ✅ |
| **SYN-18** | **No cargar el servidor de más.** El 8 de octubre de 2026 el servidor del proyecto (instancia NANO del plan gratuito) se quedó sin memoria, quedó «Unhealthy» y nadie podía entrar; cada pantalla abierta reintentaba conectarse cada 2-4 s, sin parar. Desde entonces: la biblioteca se repasa cada 2 min (antes 45 s) y **no con la pestaña escondida** —al volver a ella se repasa—; al pintar, el repaso de fondo como mucho cada 30 s (antes 5 s); los avisos de otros equipos se **juntan** en una sola recarga y cada pantalla espera un momento distinto (1,5 a 4 s) en vez de ir todas a la vez, y con la pestaña escondida se dejan para cuando se vea; el capítulo abierto se comprueba con sus 7 columnas, no con la fila entera; la biblioteca en vivo y la presencia se reintentan cada vez más despacio (2 s / 4 s, el doble cada fallo, hasta 2 min). | ✅ |
| **SYN-19** | **Vigilar el servidor** (`js/salud.js`). Dos respuestas seguidas que son del servidor —5xx, tiempo agotado, gateway; no un permiso ni la red de este equipo— y Dubbipt lo da por caído: **deja de insistir** con lo de fondo, enseña abajo un aviso —«El servidor de Dubbipt no responde ahora mismo. Lo que hagas se queda en este equipo y se sube cuando vuelva»— con «Probar ahora», y lo vuelve a probar solo con una consulta mínima (inicio de sesión y una fila), a los 15 s y cada vez el doble hasta 5 min. Al volver, quita el aviso, lo dice y se pone al día una vez. Al entrar, si es el servidor el que no responde, se dice así: «no es tu contraseña». | ✅ |
| **SYN-20** | **Al entrar, esperar a que esté todo cargado.** Con la sesión guardada, la sesión llegaba antes de que el navegador terminara de cargar los archivos de `js/`, y al volver a donde se estaba fallaban `prodPintarBoton`, `talCargar`, `csPintar`… (informe de sala del 8 de octubre). Volver a donde se estaba y pintar la biblioteca esperan a que esté todo cargado; pintar, una sola vez aunque se pida varias. | ✅ |

## Reglas · el puente con DublajeCast

| | Regla | |
|---|---|---|
| **SYN-8** | La sesión de DublajeCast se guarda **aparte** de la de Dubbipt (su propia clave de almacenamiento), para no cerrar la sesión de aquí. | 👁 |
| **SYN-9** | Se sincroniza **el capítulo abierto**, y el capítulo se localiza por su **número dentro de la serie**. Buscarlo por nombre no funcionaba: allí los capítulos tienen número y título, no un nombre igual al de aquí. | 👁 |
| **SYN-10** | Escribir en su base de datos va con **concurrencia optimista**: se lee un número de revisión y la escritura solo entra si la revisión sigue siendo esa. Si otro escribió en medio, la escritura falla en vez de pisarle. | 👁 |
| **SYN-11** | Antes de llevar nada se enseña **qué va a cambiar**. | 👁 |
| **SYN-12** | Hay un diagnóstico —«¿Qué hay en DublajeCast?»— que dice qué programa y qué capítulo ve cada lado y si coinciden. Sin eso, un fallo de emparejamiento no se puede distinguir de un fallo de conexión. | 👁 |

## Nunca

| | |
|---|---|
| **SYN-N1** | **Nunca escribir en la base de datos de otra aplicación sin condición de revisión.** Una escritura ciega puede borrar el trabajo de una tarde de otra persona. | 👁 |
| **SYN-N2** | Nunca entrar en la cuenta de otro servicio en nombre del usuario ni guardar sus credenciales. La contraseña se teclea en su formulario y la sesión la gestiona su propio cliente. | — |
| **SYN-N3** | Nunca confiar en el color, el número o el texto que venga guardado: el color se recalcula siempre. | 👁 |
| **SYN-N5** | **Nunca dar por hecho que el otro aparato tiene el mismo libreto solo porque es el mismo capítulo.** Basta con que uno venga de una copia guardada vieja —o que lo abriera con una versión anterior— para que los índices signifiquen cosas distintas. | ✅ |
| **SYN-N4** | Nunca guardar un capítulo vacío encima de uno que tiene contenido. Si no hay libreto en memoria, no se guarda. | 👁 |

## Cómo se demuestra

- **SYN-18**, **SYN-19** y **SYN-20**: `pruebas/salud.prueba.js` (qué fallo es del servidor, darlo por caído y dejar de insistir, las pruebas con su espera, volver y ponerse al día, el aviso sin emojis, cada repaso y reintento con su espera, los avisos de otros equipos juntos, el mensaje al entrar, y esperar a que esté todo cargado).

- **SYN-16**: `pruebas/nube.prueba.js`, con la nube y el reloj de mentira: las esperas de cada intento, que se avise una vez por racha y con qué aviso, que cada intento lleve lo tocado y solo eso, y que la racha se acabe al entrar. Doce mutaciones, todas en rojo; dos nacieron verdes y se cerraron.
- **SYN-17**: la sección 6d de `pruebas/seguir.prueba.js` (el escritorio manda la posición de destino, marcada, también tapado, y nada sin sincronía) y la 19 (la tablet la aplica con el deslizar corto, de golpe tapada, sin reenviar, y la mano manda). Los mismos números que en EST-11.
- **SYN-14**, **SYN-15** y **SYN-N5**: `pruebas/seguir.prueba.js`. Se comprueba que
  la huella cambia ante **cualquier** diferencia que descoloque los índices —una
  intervención de más o de menos, otro personaje, otro timecode, otra página, el
  mismo libreto en otro orden—. Dejar la página fuera de la huella pone una
  comprobación en rojo.

**A mano**, y con una limitación importante que conviene tener escrita: el
puente con DublajeCast **nunca se ha probado contra sus datos reales**. No he
entrado en esa cuenta y no debo hacerlo. Lo que está comprobado es la lógica de
emparejamiento por número de capítulo y la condición de revisión, leyendo el
código; el resto lo tiene que probar alguien con acceso.

Para la sincronía tablet ↔ escritorio: abrir el mismo capítulo en dos
dispositivos con la misma cuenta, pintar en uno y comprobar que aparece en el
otro sin borrar lo que ya había.

## Sin resolver

- Cero pruebas automáticas. Es lo más difícil de automatizar de todo el
  proyecto, porque hace falta la red y dos clientes.
- Lo que **sí** se podría probar sin red: las funciones de saneado (**SYN-7**).
  Son puras: entra un objeto cualquiera, sale un objeto seguro. Merece un
  archivo de pruebas con datos deliberadamente hostiles.
- No hay resolución de conflictos para el capítulo en sí: si dos personas
  reparten el mismo capítulo a la vez, gana el último que guarda. El registro
  por programa y las marcas del pincel sí se funden; el reparto, no.
