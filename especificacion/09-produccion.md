# 09 · Producción: lo que viene de DublajeCast

## Para qué

Pedido de sala: «quiero migrar la plataforma de DublajeCast a Dubbipt». Datos y
funciones, por fases. DublajeCast (dubcast.netlify.app) lleva lo que Dubbipt
no llevaba: talentos con ficha, programas y capítulos con sus entregas y
DUBCARDs, tráilers con plazo, breakdowns. Esta sección es la primera fase:
traer los datos enteros, tenerlos aquí a la vista, y verterlos en lo que
Dubbipt ya sabe hacer con ellos.

## Reglas

| | Regla | |
|---|---|---|
| **PRO-1** | **Se trae todo, y lo que no se entiende se copia tal cual.** DublajeCast guarda un solo JSON por usuario: series, episodios, personajes, apariciones, talentos, castings, estudios, equipo, tráilers, producción, breakdowns. Se trae entero —desde su nube, con la sesión que la propia persona abre en el panel «⇄ DublajeCast», o desde el archivo que exporta (`dublajecast_backup_….json`)—. Todas las listas quedan presentes aunque falten; las claves desconocidas se conservan. Un JSON que no trae series, capítulos, talentos ni castings no es un volcado y se rechaza diciéndolo. | ✅ |
| **PRO-2** | **Los personajes allí se llaman `canonical_name`.** El puente de siempre los buscaba por `name` y por eso no encontraba ninguno. Al traerlos quedan con las dos cosas. | ✅ |
| **PRO-3** | **Se guarda por espacio de trabajo**, en la tabla `produccion` (`sql/mejora-03-produccion.sql`: una fila por espacio, con revisión; la ve el dueño o un administrador). Si la tabla no existe todavía, se guarda en la carpeta de este usuario en el almacén (`_diag/<usuario>/produccion.json`) y se dice cómo compartirlo. Siempre hay copia en el equipo. Al cargar, manda la nube; sin nube, lo del equipo. | ✅ |
| **PRO-4** | **Los talentos se suman a la base**, nunca se quitan. La ficha —género, edad aparente, tono de voz, registro, correo— se lee de lo traído: «Femenino · Adulto · Agudo». | ✅ |
| **PRO-5** | **Los castings van al registro de cada programa que se llame igual aquí** —exacto o muy parecido—, para que al abrir un capítulo se hereden (CAST-6). Lo que el registro ya decía distinto **se respeta** y se cuenta: lo de Dubbipt manda. Los programas sin pareja aquí se nombran. | ✅ |
| **PRO-6** | **Las alertas se calculan como allí**: la entrega a Miami avisa desde tres días antes y vencida, salvo que la producción ya esté en marcha; la DUBCARD igual, salvo que no haga falta o el capítulo esté finalizado. El formato de DUBCARD es el del capítulo o, si no, el del cliente: Netflix es BACKLOT y los demás Excel; «No necesita DUBCARD» si no la requiere. Los tráilers llevan su plazo: vencido, hoy, mañana, en dos, cinco o más días, o completado. Las fechas se leen como fecha local. | ✅ |
| **PRO-7** | El panel **🎬 Producción**, desde la cabecera de **Programas** (junto a «🧰 Herramientas») y desde la caja de herramientas: programas con sus capítulos, estado, fase, DUBCARD, fechas y alertas —la peor alerta de cada programa, arriba—; talentos con su ficha y en qué han salido; tráilers con su plazo; y de dónde vino todo, con los botones para traerlo, importar un JSON y exportarlo en el formato que DublajeCast también entiende. Por ahora se **mira**: cambiar las cosas desde aquí es la fase siguiente. | ✅ |
| **PRO-8** | **Solo el administrador, en el perfil Casting.** Pedido de sala: «que solamente el perfil de Casting tenga acceso a esos datos y que solo el administrador pueda verlos». Las dos cosas a la vez: el perfil de trabajo es Casting **y** la cuenta es de administrador. Un rol «Casting» no basta. A los demás no se les enseña el botón 🎬 Producción, ni «Traer TODO a Producción» en el puente con DublajeCast, ni la entrada en la caja de herramientas, ni la ficha de DublajeCast en la base de talentos; si llegan al panel, no se abre y se dice por qué, y no se puede traer nada. El botón se repinta al cambiar de perfil y al saberse el rol. Quien cierra de verdad es la base de datos: la tabla `produccion` solo la ve y la escribe un administrador (`public.is_admin()`). | ✅ |
| **PRO-9** | **DublajeCast entero, dentro de Dubbipt.** Pedido de sala: «quiero traer prácticamente toda la plataforma: que cuando le dé al botón de DublajeCast me abra todas las funciones del programa». El botón **🎬 DublajeCast** de Programas (y la caja de herramientas, y el puente del casting) abre la app de DublajeCast a pantalla completa, con todas sus funciones: dashboard, programas, casting, reparto, talentos, ocupación, tráilers, DUBCARDs, breakdowns, pegado de casting, producción. No se rehace: se **copia** tal cual en `dublajecast/` con `local/traer-dublajecast.js`, que le hace cuatro retoques y ninguno más —sin service worker propio, sin borrar las cachés del sitio al actualizarse, sin manifiesto, y la barra de Dubbipt— y se para si alguno no encuentra su sitio. Su atajo a la IA va en `api/llm.js` (la clave la manda el navegador; no hay nada que configurar). Sus datos siguen en su nube, con la sesión que abre la persona. «✕ Volver a Dubbipt» lo esconde sin cerrarlo: al volver sigue donde estaba. | ✅ |
| **PRO-10** | **Dentro de cada programa de DublajeCast, las herramientas de Dubbipt** (`dublajecast/puente.js`). Dice si el programa está en Dubbipt; si está: abrirlo, o abrir uno de sus capítulos, en el perfil que se elija (Casting, QC, Grabación); si no: crearlo con el nombre ya escrito. Y siempre: la base de talentos, la caja de herramientas y el resumen de Producción. El capítulo se busca por título igual o, si no, por número cuando solo uno lo lleva en el nombre; ante la duda se abre el programa y se dice. Dubbipt solo atiende mensajes de **su** marco, del mismo sitio y con la firma de DublajeCast, y solo al administrador en Casting (PRO-8). | ✅ |

## Nunca

| | |
|---|---|
| **PRO-N1** | **Nunca entrar en la cuenta de DublajeCast en nombre de nadie** (SYN-N2). La sesión la abre la persona en el panel. | — |
| **PRO-N2** | **Nunca quitar nada de la base de talentos ni pisar un casting del registro** al traer: traer solo suma. | ✅ |
| **PRO-N3** | Nunca tirar una clave del JSON porque no se conozca: es de alguien. | ✅ |
| **PRO-N4** | Nunca enseñar Producción a quien no sea administrador, aunque sea dueño del espacio de trabajo o tenga el rol Casting. | ✅ |
| **PRO-N5** | Nunca aflojar la seguridad de Dubbipt para hacer sitio a DublajeCast: lo que DublajeCast necesita —compilar en el navegador, cargar de unpkg y SheetJS— vale **solo** en su carpeta, y solo se deja meter dentro de Dubbipt. | ✅ |

## Cómo se demuestra

- **PRO-1** a **PRO-6**: `pruebas/produccion.prueba.js`, con un volcado pequeño
  como los de verdad —dos series, tres capítulos, tres talentos con ficha, tres
  castings, dos tráilers—: la normalización con `canonical_name` y las claves
  desconocidas; qué es un volcado y qué no; los índices; las fechas, alertas y
  plazos con un «hoy» fijo; el formato de DUBCARD por cliente; la ficha; casar
  programas por nombre exacto o parecido; verter talentos y castings
  respetando lo que había; guardar en la tabla, sin tabla en el almacén, y sin
  espacio solo en el equipo; cargar de cada sitio; y el texto del resumen.
  Las 47 mutaciones de `js/produccion.js` (claves que se cuelan, fechas en UTC,
  alertas con la producción en marcha, el conflicto que se pisa, la revisión que
  no sube, el almacén que no se intenta, el resumen que calla…) caen todas.
  Y en el navegador, con ese mismo volcado: el panel con los
  programas y la alerta de Miami vencida, los capítulos desplegados, los
  talentos con su ficha y los tráilers con su plazo.
- **PRO-8**: la misma prueba, sección 8: el miembro en Casting y el administrador en QC no ven el botón, no abren el panel, no cargan ni traen nada; el administrador en Casting sí. Y que la política SQL sea solo `is_admin()`.
- **PRO-9** y **PRO-10**: `pruebas/dublajecast.prueba.js`: casar capítulos por título y por número, y no casar ante la duda; aceptar solo mensajes de nuestro marco; cada cosa que pide la barra; el permiso; los retoques de la copia, que se paran si DublajeCast cambia por dentro; las cabeceras de `vercel.json` y el service worker; el puente por dentro. Sus 36 mutaciones caen todas. En el navegador: DublajeCast arranca dentro (su pantalla de acceso; no se entró en la cuenta), la barra reconoce el programa que existe y ofrece crear el que no, «Abrir el programa» lleva a sus capítulos, «Crear» deja el nombre escrito, y un miembro no consigue nada.
- **PRO-7**: a mano, en el navegador. La subida a la tabla y al almacén está
  probada con dobles, no contra Supabase.

## Sin resolver

- Es la **primera fase**: se traen y se ven los datos. Editarlos aquí —fechas,
  fases, DUBCARDs, tráilers, la ficha de un talento— y escribirlos de vuelta en
  DublajeCast mientras convivan las dos, es lo siguiente. Los breakdowns y las
  apariciones se guardan pero todavía no se enseñan.
- La tabla `produccion` hay que crearla una vez con `sql/mejora-03-produccion.sql` (si se creó con la versión anterior, correrlo otra vez para que quede solo para el administrador).
  Hasta entonces cada usuario tiene su copia en el almacén.
- Un programa de DublajeCast que no exista como programa en Dubbipt no se crea
  solo: sus castings esperan a que exista uno con ese nombre. La barra de
  DublajeCast ofrece crearlo con un botón.
- DublajeCast dentro de Dubbipt es una **copia**: cuando DublajeCast saque versión hay que correr `node local/traer-dublajecast.js` y desplegar. Mientras tanto se usa la versión copiada.
- La sesión de DublajeCast es la suya: dentro de Dubbipt hay que entrar una vez con la cuenta de DublajeCast (no se comparte con la de Dubbipt).
- Las herramientas de Dubbipt están en la vista de cada programa de DublajeCast; en sus otras pantallas (casting general, talentos, tráilers) todavía no.
