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
| **PRO-7** | El panel **🎬 Producción**, en la biblioteca: programas con sus capítulos, estado, fase, DUBCARD, fechas y alertas —la peor alerta de cada programa, arriba—; talentos con su ficha y en qué han salido; tráilers con su plazo; y de dónde vino todo, con los botones para traerlo, importar un JSON y exportarlo en el formato que DublajeCast también entiende. Por ahora se **mira**: cambiar las cosas desde aquí es la fase siguiente. | ✅ |

## Nunca

| | |
|---|---|
| **PRO-N1** | **Nunca entrar en la cuenta de DublajeCast en nombre de nadie** (SYN-N2). La sesión la abre la persona en el panel. | — |
| **PRO-N2** | **Nunca quitar nada de la base de talentos ni pisar un casting del registro** al traer: traer solo suma. | ✅ |
| **PRO-N3** | Nunca tirar una clave del JSON porque no se conozca: es de alguien. | ✅ |

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
- **PRO-7**: a mano, en el navegador. La subida a la tabla y al almacén está
  probada con dobles, no contra Supabase.

## Sin resolver

- Es la **primera fase**: se traen y se ven los datos. Editarlos aquí —fechas,
  fases, DUBCARDs, tráilers, la ficha de un talento— y escribirlos de vuelta en
  DublajeCast mientras convivan las dos, es lo siguiente. Los breakdowns y las
  apariciones se guardan pero todavía no se enseñan.
- La tabla `produccion` hay que crearla una vez con `sql/mejora-03-produccion.sql`.
  Hasta entonces cada usuario tiene su copia en el almacén.
- Un programa de DublajeCast que no exista como programa en Dubbipt no se crea
  solo: sus castings esperan a que exista uno con ese nombre.
