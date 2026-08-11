# Refactor Dubbipt — resumen de cambios

Archivos entregados: `index.html`, `desglose-auto.js` (reescrito), `auth.js` y `config.js` (sin cambios, incluidos por completitud).

No es un archivo nuevo desde cero: son ediciones puntuales sobre tu `index.html` original (8 447 → 8 681 líneas) y una reescritura completa de `desglose-auto.js`. Todo el código JS embebido pasa `node --check` sin errores.

---

## 1) Layout y arquitectura visual

- **Tokens de color** (`:root`, línea ~15): paleta retinteada de morado/verde arcade a negro-casi-puro + verde, acorde al prototipo. Fuente `Inter` + `JetBrains Mono` para timecodes (se añadió el import de Google Fonts).
- **Capa "TEMA DUBBIPT"** (~línea 518): se neutralizó la fuente pixel "Silkscreen" y los botones tipo pastilla con relieve 3D → botones planos, radio 9px.
- **Barra de acciones** (`.actrow`, buscar `id="btnEpsBack"`): reestructurada en 3 clústeres con separadores —
  - Navegar: `‹ Episodios`, `📚 Programas`
  - Editar: `Editar Episodio`, `Fusionar Personajes`, `A–Z`
  - Producir: `Libreto Completo`, `Video Estudio`, `Por intervenciones`, **`Asignar casting`** (botón sólido, acción primaria)
  - Se corrigió el bug de escape Unicode `A\u2013Z` → `A–Z` real (hallazgo #4 de la auditoría).
- **Filtros rápidos**: nueva fila `#filtrow` con chips *Todos / Sin asignar / Asignado* sobre la grilla de personajes, cableada a `renderCards()` vía `window._cardFilter`.
- CSS de `.actrow .act-g` / `.act-nav` / `.act-g.on`, tarjetas de personaje (`.card .top h3/.n`) y la cabecera del libreto (`.lh h2`, `.pgsep`, `.blk .who`, `.ltools button`) migradas de `'Open Serif'` a `'Inter'`/`'JetBrains Mono'`.

**Deferido a propósito:** pantalla de login (`#gate`), selector de dispositivo (`#rolePick`), tutorial (`#tutOv`) y mosaicos del dashboard (`.dtile`) conservan el skin anterior (fuente e imagen de fondo embebidas en base64). Retocar esas pantallas es un esfuerzo aparte — no forma parte de la barra de acciones ni de la grilla de personajes que pedía la fase 1, y tocar las fuentes/imágenes embebidas sin verlas renderizadas es arriesgado.

## 2) Estados de carga (progreso + skeleton)

- Nuevo módulo `DDL_UI` (justo antes de `PDFJS_VERSION`, en el primer `<script>`): `toast()`, `confirmModal()`, `skeletonCards()`, `progress()`/`progressReset()`, `friendlyError()`.
- `#loading` ahora incluye una barra de progreso (`#loadProg`/`#loadProgBar`/`#loadPct`).
- `scanPdf()`: el bucle de prelectura por lotes y el bucle de detección de cabeceras ahora llaman a `DDL_UI.progress(actual, total, 'Leyendo/Analizando página')` — antes el segundo bucle no emitía ningún avance (hallazgo #1 de la auditoría).
- `loadXlsBuf` / `loadPdfBuf` / `loadDocx`: muestran `DDL_UI.skeletonCards(6)` en `#cards` mientras procesan, en vez de pantalla en blanco.
- `desglose-auto.js`: `extractPdf`/`extractDocx` aceptan `onProgress`; nueva función `DDLDesglose.runWithUI(file, {mount, onSave})` pinta de inmediato skeleton + barra, sustituye por la tabla editable en cuanto hay resultado, y si hay `llmEndpoint` configurado el refinado por IA corre **después**, en 2º plano, sin bloquear la edición manual (indicador "✨ Afinando nombres con IA…").

## 3) Prevención de errores y notificaciones

- **Toasts globales**: reemplazan el texto estático `✓ Guardado`. `showDesgloseReview()` ahora muestra `DDL_UI.toast('Desglose actualizado')` al guardar.
- **Confirmación + deshacer al eliminar personajes**:
  - `showDesgloseReview()` → botón `.drv-del`: si el personaje tiene ≥15 intervenciones o ya tiene talento asignado, pide confirmación con modal estilado; si no, borra al instante y ofrece **Deshacer** por 5s.
  - `removeChar()`: mismo criterio de confirmación (antes usaba `confirm()` nativo siempre).
  - `desglose-auto.js` → tabla de revisión: mismo patrón, self-contained (no depende de `DDL_UI` del host).
- **Confirmación antes de fusionar**:
  - `openMergeDialog()`: el `confirm()` nativo se reemplazó por el modal estilado, mostrando ambos personajes y su conteo de intervenciones.
  - `desglose-auto.js` → `renderReview()`: nueva función `previewMerges()` detecta, **antes** de guardar, si algún renombrado provocaría una fusión; si hay coincidencias, muestra el modal "N personajes se combinarán…" con botón **Cancelar por fila** (revierte solo ese renombre) y **Fusionar y guardar** / **Cancelar todo** — tal como lo pedía la auditoría (hallazgo #3) y como está maquetado en tu prototipo.
- **Mensajes de error amigables** (`DDL_UI.friendlyError()` / `DDLDesglose.friendlyError()`): mapean errores técnicos de Supabase/red/PDF a español con una acción clara, dejando el detalle técnico solo en `console.error`. Aplicado en: `loadXlsBuf`, `loadPdfBuf`, `loadDocx`, `assignCastingFromExcel`, `newEpisodeModal`, `showDesgloseReview` (guardado), y `desglose-auto.js`'s `save()`/`renderReview()`.

## 4) Accesibilidad y atajos de teclado

- **aria-label** añadido a todos los botones de icono sin etiqueta de la barra del libreto (`lBack`, `lScope`, `lTheme`, `lFontDn/Up`, `lClean`, `lVid`, `lTablet`, `lTpad`, `lFind`, `lPron`, `lColor`) y al botón de borrar (`aria-label="Quitar a {nombre}"`) en `showDesgloseReview` y en `desglose-auto.js`.
- **role="status" aria-live="polite"** en los indicadores de conexión/sincronía (`#lConn`, `#lConn2`, `#lLive`, `#devStat`) para que un cambio de estado se anuncie sin que el usuario tenga que mirar la pantalla.
- **Atajos de teclado en la vista de libreto** (dentro de `buildLibretoDoc`, después del cableado de `.lbar button`): `↑`/`↓` saltan entre las páginas resaltadas del riel (`#lChips .pgchip`), `1`–`4` cambian el ancho de columna (Angosto/Medio/Ancho/Completo). Se ignoran mientras el foco está en un `<input>`/`<textarea>`/`<select>` para no interferir con la escritura. El modo tablet se mantiene solo táctil, tal como recomendaba la auditoría.

---

## Cómo probarlo

1. Sube `index.html`, `desglose-auto.js`, `auth.js` y `config.js` juntos (mismas rutas relativas que ya usas).
2. Abre un capítulo con desglose para ver la barra de 3 clústeres y los chips de filtro.
3. Sube un guion largo (PDF de 40+ páginas) para ver la barra de progreso real durante el análisis.
4. En "Editar Episodio", intenta borrar un personaje con muchas intervenciones (debería pedir confirmación) y uno con pocas (debería borrarse al instante con un toast "Deshacer").
5. En el libreto, prueba las flechas ↑/↓ y las teclas 1–4.

## Pendiente (no incluido en esta pasada)

- Reskin completo de login / selector de dispositivo / tutorial / dashboard (piezas visuales con fuente e imagen embebidas en base64).
- Compresión del riel de páginas en "minimapa" para personajes con muchas intervenciones dispersas (sugerencia menor de la auditoría, sección 03).
- Orden alfabético como vista secundaria en la grilla del dashboard (ya existe `A–Z` en el episodio, no en el dashboard general).

---

# Rediseño visual completo (PDF de auditoría UX/UI)

Migración de toda la interfaz al diseño del PDF: paleta negra-casi-pura + verde, tipografía Inter + JetBrains Mono, y el logo real de Dubbipt. Cada módulo se verificó con render real (no mockup). Todo el JS pasa `node --check`.

## Módulos entregados
- **0 · Barra de navegación superior** — logo Dubbipt + pestaña Programas (subrayado verde), ubicación actual (programa/episodio), estado de sincronía con punto verde, campana, engranaje, avatar con iniciales, y menú de configuración (Perfil / Espacio / Ayuda / Cerrar sesión). `refreshTopbar()` mantiene todo en sync.
- **1 · Barra de acciones agrupada** — 3 clústeres (Navegar / Editar / Producir) + "Asignar casting" primario.
- **2 · Estados de carga** — barra de progreso "Analizando página X/Y" + skeleton loaders.
- **3B · Panel del libreto** — barra verde con selector de personaje, área de lectura casi negra, bloques de diálogo con timecodes monospace, bloque resaltado en ámbar, riel de páginas.
- **4 · Crear programa** — modal con portada, nombre, N.º episodios, idioma original/doblaje.
- **4B · Crear espacio de trabajo** — modal con nombre + toggle de tipo (Estudio de doblaje / Uso personal).
- **5 · Login y registro** — glow verde, tabs Iniciar sesión/Crear cuenta, "¿Olvidaste tu contraseña?" (reset por correo), y **Continuar con Google** (OAuth de Supabase; requiere activar el provider en el panel).
- **6 · Dashboard de programas** — panel con buscador + "Nuevo programa", tiles con portada de color por programa, meta, barra de progreso y "X/Y completados".
- **8 · Perfil de la cuenta** — pantalla funcional conectada a `profiles` + auth: nombre, rol, correo, cambiar contraseña (reset por correo), guardar cambios.
- **10 · Tarjetas de personaje** — borde de color, checkbox de terminado, chips de rol/escenas, estado de talento, botón Asignar/Editar, tinte verde al completar.
- **10B · Página de episodios** — tabla # / Título / Personajes / Estado con badges (Completado/En desglose/Sin guion) y acciones Abrir/Continuar/Subir guion.
- **11 · Confirmación de desglose** — tabla "Desglose · Revisado" con Personaje / Asignar talento / Intervenciones / 🗑, footer Subir casting + Guardar desglose.
- **12 · Toasts y confirmación de fusión** — sistema de toasts con Deshacer + modal de fusión (Fase 3).
- **13 · Empty / error states** — estado vacío con icono, título, descripción y CTA "Subir guion (PDF/DOCX)".

## Fondo general
Degradado verde suave sobre negro-casi-puro (`#0b0c0e`) fijo, replicando la atmósfera del PDF en toda la app.

## Nota de configuración (Supabase)
- **Google OAuth**: activar el provider en Authentication → Providers → Google y añadir la URL de redirect.
- **Metadata extra** (idiomas de programa, tipo de espacio, rol de perfil): se guardan si las columnas existen; si no, el código reintenta sin ellas sin romperse.
