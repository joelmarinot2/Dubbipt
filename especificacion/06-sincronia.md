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
| **SYN-N4** | Nunca guardar un capítulo vacío encima de uno que tiene contenido. Si no hay libreto en memoria, no se guarda. | 👁 |

## Cómo se demuestra

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
