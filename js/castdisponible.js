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

/** El cuerpo de la ventana. */
function dispHtml(filas, programa, conDc){
  const l = dispVisibles(filas, DISP.buscar, DISP.soloPrograma, DISP.orden);
  const nProg = filas.filter(f => f.enPrograma.length).length;
  const op = (v, t) => '<option value="' + v + '"' + (DISP.orden === v ? ' selected' : '') + '>' + t + '</option>';
  return '<div class="disp-cab"><div><div class="modo-tit">Disponibilidad de los talentos</div>'
    + '<div class="modo-sub">' + dispEsc(programa || 'Este programa') + ' · ' + nProg + ' talento' + (nProg === 1 ? ' ya ha' : 's ya han') + ' estado en él</div></div>'
    + '<button class="disp-x" id="dispCerrar" title="Cerrar" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button></div>'
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

/** Abre la ventana con el capítulo que está abierto. */
async function dispAbrir(){
  const viejo = document.getElementById('dispOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'dispOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja disp-caja"><div class="modo-sub">Mirando quién está libre…</div></div>';
  document.body.appendChild(ov);
  const showId = (typeof currentEp !== 'undefined' && currentEp) ? currentEp.showId : null;
  const show = (typeof sbShows === 'function' && showId) ? (sbShows().find(s => s.id === showId) || null) : null;
  let registro = { personajes: {} };
  try{ if(showId) registro = await castRegCargar(showId); }catch(e){ fallo('castRegCargar · js/castdisponible.js:dispAbrir', e); }
  const d = (typeof csDatos === 'function') ? csDatos().datos : null;
  const serie = (d && show && typeof dcastSerieDe === 'function') ? dcastSerieDe(show, d) : null;
  let enCap = [];
  try{ enCap = (typeof castOcupacion === 'function') ? castOcupacion() : []; }catch(e){ enCap = []; }
  DISP.filas = dispFilas({ base: (typeof TAL !== 'undefined' && TAL.nombres) || [], d: d, serie: serie, registro: registro, enCap: enCap });
  const programa = show ? show.name : (serie ? serie.name : '');
  const pintar = () => {
    const caja = ov.querySelector('.modo-caja');
    caja.innerHTML = dispHtml(DISP.filas, programa, !!d);
    const b = caja.querySelector('#dispBuscar');
    if(b){ b.oninput = () => { DISP.buscar = b.value; const pos = b.selectionStart; pintar(); const nb = ov.querySelector('#dispBuscar'); if(nb){ nb.focus(); try{ nb.setSelectionRange(pos, pos); }catch(e){ /* sin cursor */ } } }; }
    const s = caja.querySelector('#dispSolo'); if(s) s.onchange = () => { DISP.soloPrograma = s.checked; pintar(); };
    const o = caja.querySelector('#dispOrden'); if(o) o.onchange = () => { DISP.orden = o.value; pintar(); };
    const x = caja.querySelector('#dispCerrar'); if(x) x.onclick = () => ov.remove();
  };
  pintar();
  ov.addEventListener('click', (e) => { if(e.target === ov) ov.remove(); });
  return ov;
}

/* ═══ FIN DE DISPONIBILIDAD DE LOS TALENTOS ═══ */
