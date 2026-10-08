/* La disponibilidad de los talentos, desde el casting · especificacion 09, PRO-20
 *
 * Pedido de sala: «que cuando esté en el casting pueda sacar una ventana
 * emergente para revisar la disponibilidad de los talentos y si han estado
 * en el programa que estoy casteando».
 *
 * Con el capítulo abierto en Casting, el botón «Disponibilidad» abre una
 * ventana con cada talento:
 *   · si ya ha estado en ESTE programa, y con qué personajes: lo dice el
 *     registro de casting del programa en Dubbipt y, para el administrador,
 *     DublajeCast;
 *   · lo que tiene en este capítulo;
 *   · lo ocupado que está: en cuántos programas EN CURSO más tiene papel, con
 *     cuántos personajes y líneas (la «Ocupación» de DublajeCast). Eso viene
 *     de DublajeCast, y solo lo ve el administrador (PRO-8).
 * Se busca por nombre, se puede quedar en los que han estado en el programa,
 * y se ordena: los del programa primero y, entre ellos, los menos ocupados.
 *
 * Se abre en una ventana del navegador aparte, para llevarla a otra pantalla,
 * y se pone al día sola (ver «Una ventana aparte»).
 *
 * De donde depende: castNorm, castOcupacion, castRegCargar, currentEp, TAL,
 * sbShows, csDatos, dcastSerieDe, prodFichaTexto, esc, fallo.
 */

/* ═══ DISPONIBILIDAD DE LOS TALENTOS ═════════════════════════════════════ */

const DISP = { buscar: '', soloPrograma: false, orden: 'programa', filas: [], nota: '' };

/** Cuán ocupado está, por los programas en curso donde tiene papel. */
function dispNivel(n){
  if(!n) return { clave: 'libre', texto: 'Libre' };
  if(n <= 2) return { clave: 'algo', texto: 'En ' + n + ' programa' + (n === 1 ? '' : 's') };
  return { clave: 'mucho', texto: 'En ' + n + ' programas' };
}

/**
 * Las filas de la ventana, una por talento. `o`:
 *   base      nombres de la base de talentos de Dubbipt
 *   d         lo de DublajeCast (o nulo: sin él no hay ocupación)
 *   serie     el programa de DublajeCast que se está casteando (o nulo)
 *   registro  el registro de casting del programa en Dubbipt
 *   enCap     lo que lleva cada talento en este capítulo (castOcupacion())
 */
function dispFilas(o){
  const d = o.d || null, serie = o.serie || null, reg = (o.registro && o.registro.personajes) || {};
  const por = new Map();
  const fila = (nombre) => {
    const k = castNorm(nombre);
    if(!k) return null;
    let f = por.get(k);
    if(!f){ f = { nombre: String(nombre).replace(/\s+/g, ' ').trim(), clave: k, ficha: '', enPrograma: [], enCap: [], lineasCap: 0, programas: [], personajes: 0, lineas: 0, nivel: null }; por.set(k, f); }
    return f;
  };
  for(const n of (o.base || [])) fila(n);
  if(d){
    const tal = {}, ser = {}, ep = {}, per = {}, lin = {};
    for(const t of d.talents) tal[String(t.id)] = t;
    for(const s of d.series) ser[String(s.id)] = s;
    for(const e of d.episodes) ep[String(e.id)] = e;
    for(const c of d.characters) per[String(c.id)] = c;
    for(const a of d.appearances) lin[String(a.character_id) + '|' + String(a.episode_id)] = +a.line_count || 0;
    for(const t of d.talents){ const f = fila(t.name); if(f && !f.ficha && typeof prodFichaTexto === 'function') f.ficha = prodFichaTexto(t); }
    const otros = new Map();                         // clave → { programas:Set, personajes:Set, lineas }
    for(const c of d.castings){
      const t = tal[String(c.talent_id)], e = ep[String(c.episode_id)];
      if(!t || !e) continue;
      const s = ser[String(e.series_id)];
      const f = fila(t.name);
      if(!f || !s) continue;
      const ch = per[String(c.character_id)];
      const nomCh = ch ? (ch.name || ch.canonical_name || '') : '';
      if(serie && String(s.id) === String(serie.id)){
        if(nomCh && !f.enPrograma.some(x => castNorm(x.personaje) === castNorm(nomCh))) f.enPrograma.push({ personaje: nomCh, de: 'DublajeCast' });
        continue;
      }
      const enCurso = (e.status || 'en_curso') === 'en_curso' && (s.status || 'en_curso') !== 'completo';
      if(!enCurso) continue;
      let x = otros.get(f.clave);
      if(!x){ x = { programas: new Set(), personajes: new Set(), lineas: 0 }; otros.set(f.clave, x); }
      x.programas.add(s.name);
      x.personajes.add(String(s.id) + '|' + String(c.character_id));
      x.lineas += lin[String(c.character_id) + '|' + String(c.episode_id)] || 0;
    }
    for(const [k, x] of otros){
      const f = por.get(k);
      f.programas = Array.from(x.programas).sort((a, b) => a.localeCompare(b, 'es'));
      f.personajes = x.personajes.size; f.lineas = x.lineas;
    }
  }
  for(const k of Object.keys(reg)){
    const r = reg[k];
    if(!r || !r.talent) continue;
    const f = fila(r.talent);
    const nomCh = r.display || k;
    if(f && !f.enPrograma.some(x => castNorm(x.personaje) === castNorm(nomCh))) f.enPrograma.push({ personaje: nomCh, de: 'Dubbipt', episodios: Array.isArray(r.episodios) ? r.episodios.length : 0 });
  }
  for(const e of (o.enCap || [])){
    const f = fila(e.talento);
    if(!f) continue;
    f.enCap = (e.personajes || []).map(p => p.display);
    f.lineasCap = e.ints || 0;
  }
  const out = Array.from(por.values());
  for(const f of out) f.nivel = d ? dispNivel(f.programas.length) : null;
  return out;
}

/** Las que se ven: por nombre o personaje, solo las del programa si se pide, y en su orden. */
function dispVisibles(filas, buscar, soloPrograma, orden){
  const q = castNorm(buscar);
  const l = filas.filter(f => (!soloPrograma || f.enPrograma.length)
    && (!q || f.clave.indexOf(q) >= 0 || f.enPrograma.some(x => castNorm(x.personaje).indexOf(q) >= 0)));
  const nom = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  const carga = (a, b) => (a.programas.length - b.programas.length) || (a.lineas - b.lineas);
  if(orden === 'libres') l.sort((a, b) => carga(a, b) || nom(a, b));
  else if(orden === 'nombre') l.sort(nom);
  else l.sort((a, b) => ((b.enPrograma.length ? 1 : 0) - (a.enPrograma.length ? 1 : 0)) || carga(a, b) || nom(a, b));
  return l;
}

function dispEsc(s){ return (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

/**
 * El cuerpo de la ventana. `o.capitulo`: el capítulo abierto; `o.enVentana`:
 * va en una ventana aparte (con «Actualizar»); `o.nota`: algo que decir arriba.
 */
function dispHtml(filas, programa, conDc, o){
  o = o || {};
  const l = dispVisibles(filas, DISP.buscar, DISP.soloPrograma, DISP.orden);
  const nProg = filas.filter(f => f.enPrograma.length).length;
  const op = (v, t) => '<option value="' + v + '"' + (DISP.orden === v ? ' selected' : '') + '>' + t + '</option>';
  return '<div class="disp-cab"><div><div class="modo-tit">Disponibilidad de los talentos</div>'
    + '<div class="modo-sub">' + dispEsc(programa || 'Este programa') + (o.capitulo ? ' · ' + dispEsc(o.capitulo) : '') + ' · ' + nProg + ' talento' + (nProg === 1 ? ' ya ha' : 's ya han') + ' estado en él</div></div>'
    + '<div class="disp-cab-b">'
    +   (o.enVentana ? '<button class="disp-b" id="dispActualizar" title="Volver a mirar"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-2.64-6.36"/><path d="M21 3.5V8h-4.5"/></svg><span>Actualizar</span></button>' : '')
    +   '<button class="disp-x" id="dispCerrar" title="Cerrar" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
    + '</div></div>'
    + (o.nota ? '<div class="meta-nota disp-aviso">' + dispEsc(o.nota) + '</div>' : '')
    + '<div class="disp-filtros">'
    +   '<input type="text" id="dispBuscar" placeholder="Buscar talento o personaje…" value="' + dispEsc(DISP.buscar) + '" autocomplete="off">'
    +   '<label class="disp-solo"><input type="checkbox" id="dispSolo"' + (DISP.soloPrograma ? ' checked' : '') + '> Solo los que han estado en este programa</label>'
    +   '<select id="dispOrden">' + op('programa', 'Los del programa primero') + op('libres', 'Los más libres primero') + op('nombre', 'Por nombre') + '</select>'
    + '</div>'
    + (conDc ? '' : '<div class="meta-nota">La ocupación en otros programas viene de DublajeCast y solo la ve el administrador. Aquí, lo que sabe Dubbipt: quién ha estado en este programa y lo de este capítulo.</div>')
    + (l.length ? '<div class="disp-lista">' + l.map(f => '<div class="disp-fila' + (f.enPrograma.length ? ' disp-del' : '') + '">'
        + '<div class="disp-nom"><b>' + dispEsc(f.nombre) + '</b>' + (f.ficha ? '<span class="disp-ficha">' + dispEsc(f.ficha) + '</span>' : '') + '</div>'
        + '<div class="disp-datos">'
        +   (f.nivel ? '<span class="disp-nivel disp-' + f.nivel.clave + '">' + dispEsc(f.nivel.texto) + '</span>' : '')
        +   (f.enPrograma.length ? '<span class="disp-prog">Ya en este programa: ' + dispEsc(f.enPrograma.map(x => x.personaje).join(', ')) + '</span>' : '<span class="disp-tenue">Nunca en este programa</span>')
        +   (f.enCap.length ? '<span class="disp-cap">En este capítulo: ' + dispEsc(f.enCap.join(', ')) + ' · ' + f.lineasCap + ' int.</span>' : '')
        +   (f.programas.length ? '<span class="disp-tenue">En curso: ' + dispEsc(f.programas.slice(0, 4).join(', ')) + (f.programas.length > 4 ? '…' : '') + ' · ' + f.personajes + ' pers. · ' + f.lineas + ' líneas</span>' : '')
        + '</div></div>').join('') + '</div>'
      : '<div class="disp-nada">' + (filas.length ? 'Ningún talento coincide.' : 'Todavía no hay talentos: ni base en Dubbipt ni datos de DublajeCast.') + '</div>');
}

/* ── Una ventana aparte, para llevarla a otra pantalla ────────────────────
   Pedido de sala: «quiero que se abra la disponibilidad en una ventana que
   pueda colocar en otra pantalla». Se abre en una ventana del navegador
   propia (siempre la misma: pulsar otra vez la trae delante) y se pone al
   día sola: al cambiar de capítulo o al asignar un talento aquí, la ventana
   lo refleja en un par de segundos, sin pedir nada al servidor salvo el
   registro del programa cuando cambia el capítulo. Si el navegador bloquea
   las ventanas emergentes, se abre dentro de la página, como antes, y se
   dice cómo permitirlas. */

const DISP_VENTANA = { w: null, firma: '', tmr: null, nombre: 'dubbiptDisponibilidad', cada: 2000 };

/* Lo que necesita la ventana aparte para verse como Dubbipt: no tiene sus estilos. */
const DISP_CSS = "body{ margin:0; background:#0b0d10; color:#e7ebf3; font:14px/1.45 Inter, system-ui, -apple-system, 'Segoe UI', sans-serif; }"
  + ".disp-ventana{ padding:18px; display:flex; flex-direction:column; gap:10px; height:100vh; box-sizing:border-box; }"
  + ".modo-tit{ font-size:18px; font-weight:700; color:#f3f4f6; } .modo-sub{ font-size:13px; color:#8b93a1; margin-top:3px; }"
  + ".meta-nota{ font-size:12.5px; color:#8892a6; line-height:1.55; } .disp-aviso{ color:#FDE68A; }"
  + ".disp-cab{ display:flex; justify-content:space-between; align-items:flex-start; gap:12px; } .disp-cab-b{ display:flex; gap:8px; align-items:center; }"
  + ".disp-x, .disp-b{ background:none; border:1px solid #2b3040; border-radius:8px; color:#cbd5e1; padding:5px 8px; cursor:pointer; display:inline-flex; align-items:center; gap:6px; font:inherit; font-size:12.5px; }"
  + ".disp-x:hover, .disp-b:hover{ border-color:#22C55E; color:#fff; }"
  + ".disp-filtros{ display:flex; flex-wrap:wrap; gap:8px; align-items:center; }"
  + ".disp-filtros input[type=text]{ flex:1; min-width:180px; background:#11131a; color:#e7ebf3; border:1px solid #2b3040; border-radius:9px; padding:8px 10px; font:inherit; font-size:13px; }"
  + ".disp-filtros select{ background:#11131a; color:#e7ebf3; border:1px solid #2b3040; border-radius:9px; padding:7px 9px; font:inherit; font-size:12.5px; }"
  + ".disp-solo{ display:flex; gap:6px; align-items:center; font-size:12.5px; color:#cbd5e1; cursor:pointer; }"
  + ".disp-lista{ overflow:auto; display:flex; flex-direction:column; gap:6px; flex:1; padding-right:2px; }"
  + ".disp-fila{ background:#101215; border:1px solid #23262b; border-left:3px solid #2b3040; border-radius:10px; padding:9px 12px; display:flex; flex-direction:column; gap:4px; }"
  + ".disp-fila.disp-del{ border-left-color:#22C55E; } .disp-nom{ display:flex; gap:8px; align-items:baseline; flex-wrap:wrap; } .disp-ficha{ font-size:11.5px; color:#8b93a1; }"
  + ".disp-datos{ display:flex; flex-wrap:wrap; gap:6px 12px; align-items:center; font-size:12px; }"
  + ".disp-nivel{ font-size:11px; font-weight:700; border-radius:999px; padding:2px 9px; }"
  + ".disp-libre{ background:rgba(34,197,94,.12); color:#4ADE80; } .disp-algo{ background:rgba(251,191,36,.12); color:#FBBF24; } .disp-mucho{ background:rgba(248,113,113,.12); color:#F87171; }"
  + ".disp-prog{ color:#4ADE80; font-weight:600; } .disp-cap{ color:#e5e7eb; } .disp-tenue{ color:#8b93a1; } .disp-nada{ color:#8b93a1; font-size:13px; padding:12px 0; }";

/** El programa y el capítulo abiertos, y lo que lleva cada talento en él. Sin servidor: todo de memoria. */
function dispQueHay(){
  const showId = (typeof currentEp !== 'undefined' && currentEp) ? currentEp.showId : null;
  const show = (typeof sbShows === 'function' && showId) ? (sbShows().find(s => s.id === showId) || null) : null;
  const d = (typeof csDatos === 'function') ? csDatos().datos : null;
  const serie = (d && show && typeof dcastSerieDe === 'function') ? dcastSerieDe(show, d) : null;
  let enCap = [];
  try{ enCap = (typeof castOcupacion === 'function') ? castOcupacion() : []; }catch(e){ enCap = []; }
  return { showId: showId, show: show, d: d, serie: serie, enCap: enCap,
           capitulo: (typeof currentEp !== 'undefined' && currentEp) ? (currentEp.name || '') : '',
           programa: show ? show.name : (serie ? serie.name : '') };
}

/** La huella de lo que se ve: si cambia (otro capítulo, otro talento asignado), se repinta. */
function dispFirma(q){
  return String(q.showId) + '|' + q.capitulo + '|' + (q.enCap || []).map(e => castNorm(e.talento) + ':' + (e.personajes || []).map(p => p.display).join(',')).sort().join(';');
}

/** Junta los datos: lo de memoria y el registro del programa (este, sí, del servidor o de la caché). */
async function dispDatos(registroDe){
  const q = dispQueHay();
  let registro = { personajes: {} };
  try{ if(q.showId) registro = (registroDe && registroDe.showId === q.showId) ? registroDe.reg : await castRegCargar(q.showId); }catch(e){ fallo('castRegCargar · js/castdisponible.js:dispDatos', e); }
  DISP.filas = dispFilas({ base: (typeof TAL !== 'undefined' && TAL.nombres) || [], d: q.d, serie: q.serie, registro: registro, enCap: q.enCap });
  return { q: q, registro: registro };
}

/** Pinta en `raiz` (de esta página o de la ventana aparte) y engancha sus controles. */
function dispPintarEn(raiz, datos, o){
  const doc = raiz.ownerDocument || document;
  const activo = doc.activeElement && doc.activeElement.id === 'dispBuscar';
  const pos = activo ? doc.activeElement.selectionStart : null;
  raiz.innerHTML = dispHtml(DISP.filas, datos.q.programa, !!datos.q.d, o);
  const repintar = () => dispPintarEn(raiz, datos, o);
  const b = raiz.querySelector('#dispBuscar');
  if(b){
    b.oninput = () => { DISP.buscar = b.value; repintar(); };
    if(activo){ try{ b.focus(); b.setSelectionRange(pos, pos); }catch(e){ /* sin cursor */ } }
  }
  const s = raiz.querySelector('#dispSolo'); if(s) s.onchange = () => { DISP.soloPrograma = s.checked; repintar(); };
  const or = raiz.querySelector('#dispOrden'); if(or) or.onchange = () => { DISP.orden = or.value; repintar(); };
  const x = raiz.querySelector('#dispCerrar'); if(x) x.onclick = () => { if(o && o.cerrar) o.cerrar(); };
  const a = raiz.querySelector('#dispActualizar'); if(a) a.onclick = () => { if(o && o.actualizar) o.actualizar(); };
}

/** Abre la disponibilidad: en una ventana aparte si el navegador deja; si no, dentro de la página. */
async function dispAbrir(){
  let w = null;
  try{ w = window.open('', DISP_VENTANA.nombre, 'width=880,height=920,resizable=yes,scrollbars=yes'); }catch(e){ w = null; }
  if(w && !w.closed) return dispEnVentana(w);
  return dispEnPagina('Tu navegador no dejó abrir una ventana aparte. Para poder llevarla a otra pantalla, permite las ventanas emergentes de Dubbipt (el icono de la barra de direcciones) y vuelve a pulsar «Disponibilidad».');
}

/** En la ventana aparte: la prepara si es nueva, la trae delante, pinta y la vigila. */
async function dispEnVentana(w){
  DISP_VENTANA.w = w;
  const doc = w.document;
  if(!doc.getElementById('dispRaiz')){
    doc.open();
    doc.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<title>Disponibilidad · Dubbipt</title><style>' + DISP_CSS + '</style></head>'
      + '<body><div id="dispRaiz" class="disp-ventana"><div class="modo-sub">Mirando quién está libre…</div></div></body></html>');
    doc.close();
  }
  try{ w.focus(); }catch(e){ /* el navegador decide */ }
  await dispRefrescarVentana();
  dispVigilar();
  return w;
}

/** Vuelve a mirar y repinta la ventana aparte. `registroDe`: el registro ya cargado, si no cambió el programa. */
async function dispRefrescarVentana(registroDe){
  const w = DISP_VENTANA.w;
  if(!w || w.closed) return false;
  const datos = await dispDatos(registroDe);
  DISP_VENTANA.datos = datos;
  DISP_VENTANA.firma = dispFirma(datos.q);
  const raiz = w.document.getElementById('dispRaiz');
  if(!raiz) return false;
  try{ w.document.title = 'Disponibilidad · ' + (datos.q.programa || 'Dubbipt'); }catch(e){ /* sin título */ }
  dispPintarEn(raiz, datos, { capitulo: datos.q.capitulo, enVentana: true, cerrar: () => w.close(), actualizar: () => dispRefrescarVentana() });
  return true;
}

/** Mientras la ventana esté abierta, cada 2 s mira si cambió lo de aquí (de memoria, sin servidor). */
function dispVigilar(){
  if(DISP_VENTANA.tmr) return;
  DISP_VENTANA.tmr = setInterval(() => {
    const w = DISP_VENTANA.w;
    if(!w || w.closed){ clearInterval(DISP_VENTANA.tmr); DISP_VENTANA.tmr = null; DISP_VENTANA.w = null; return; }
    const q = dispQueHay();
    if(dispFirma(q) === DISP_VENTANA.firma) return;
    const antes = DISP_VENTANA.datos;
    const mismo = antes && antes.q.showId === q.showId ? { showId: q.showId, reg: antes.registro } : null;
    dispRefrescarVentana(mismo).catch(e => fallo('dispRefrescarVentana · js/castdisponible.js', e));
  }, DISP_VENTANA.cada);
}

/** Dentro de la página, como antes: cuando no se puede abrir la ventana aparte. */
async function dispEnPagina(nota){
  const viejo = document.getElementById('dispOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'dispOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja disp-caja"><div class="modo-sub">Mirando quién está libre…</div></div>';
  document.body.appendChild(ov);
  const datos = await dispDatos();
  dispPintarEn(ov.querySelector('.modo-caja'), datos, { capitulo: datos.q.capitulo, nota: nota, cerrar: () => ov.remove() });
  ov.addEventListener('click', (e) => { if(e.target === ov) ov.remove(); });
  return ov;
}

/* ═══ FIN DE DISPONIBILIDAD DE LOS TALENTOS ═══ */
