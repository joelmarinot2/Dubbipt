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

- **SYN-16**: `pruebas/nube.prueba.js`, con la nube y el reloj de mentira: las esperas de cada intento, que se avise una vez por racha y con qué aviso, que cada intento lleve lo tocado y solo eso, y que la racha se acabe al entrar. Doce mutaciones, todas en rojo; dos nacieron verdes y se cerraron.
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
