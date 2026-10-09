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
 *   · su HISTORIAL: en qué programas y episodios ha estado, con qué
 *     personajes y cuántas líneas, en cápsulas (PRO-29). De DublajeCast
 *     (administrador) y del casting guardado en Dubbipt de todos los programas.
 *     Solo los episodios ACTIVOS: los completados -o de programas completados-
 *     no salen (PRO-31).
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
 *   showId    el programa de Dubbipt que se está casteando
 *   registros los registros de casting de TODOS los programas de Dubbipt:
 *             [{ showId, programa, serieId, reg, completo, finNombres, finNums }]
 *             (serieId: su pareja en DublajeCast; completo: el programa está
 *             completado; finNombres/finNums: sus episodios completados)
 */
function dispFilas(o){
  const d = o.d || null, serie = o.serie || null, reg = (o.registro && o.registro.personajes) || {};
  const por = new Map();
  const fila = (nombre) => {
    const k = castNorm(nombre);
    if(!k) return null;
    let f = por.get(k);
    if(!f){ f = { nombre: String(nombre).replace(/\s+/g, ' ').trim(), clave: k, ficha: '', enPrograma: [], enCap: [], lineasCap: 0, programas: [], personajes: 0, lineas: 0, nivel: null, historial: [], _h: new Map() }; por.set(k, f); }
    return f;
  };
  /* El historial: programa → episodio → personaje, con sus líneas. Lo mismo
     dicho por DublajeCast y por Dubbipt se cuenta una vez (las líneas, las mayores). */
  const registros = Array.isArray(o.registros) ? o.registros.slice() : [];
  if(o.showId && o.registro && !registros.some(r => String(r.showId) === String(o.showId)))
    registros.push({ showId: o.showId, programa: o.programa || '', serieId: serie ? serie.id : null, reg: o.registro });
  const showDeSerie = {};
  for(const r of registros) if(r && r.serieId != null) showDeSerie[String(r.serieId)] = r;
  const esEste = (clave) => (o.showId && clave === 's:' + o.showId) || (serie && clave === 'dc:' + serie.id);
  const numDe = (nombreEp, programa) => {
    let n = NaN;
    try{ if(typeof csNumeroDe === 'function') n = csNumeroDe(nombreEp, programa); }catch(e){ n = NaN; }
    if(!isFinite(n)){ const m = String(nombreEp || '').match(/(\d+)\s*$/); n = m ? +m[1] : NaN; }
    return isFinite(n) ? n : null;
  };
  const anotar = (f, progClave, programa, n, titulo, personaje, lineas, fin) => {
    if(!f || !personaje) return;
    let pg = f._h.get(progClave);
    if(!pg){ pg = { clave: progClave, programa: programa, este: !!esEste(progClave), eps: new Map() }; f._h.set(progClave, pg); }
    const ek = n != null ? 'n' + n : 't' + castNorm(titulo);
    let ep = pg.eps.get(ek);
    if(!ep){ ep = { n: n, titulo: titulo || '', pers: new Map(), fin: false }; pg.eps.set(ek, ep); }
    if(fin) ep.fin = true;
    const pk = castNorm(personaje);
    const ya = ep.pers.get(pk);
    if(!ya) ep.pers.set(pk, { nombre: personaje, lineas: +lineas || 0 });
    else ya.lineas = Math.max(ya.lineas, +lineas || 0);
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
      {
        const pareja = showDeSerie[String(s.id)];
        const n = parseInt(e.episode_number, 10);
        const fin = e.status === 'completo' || s.status === 'completo' || !!(pareja && (pareja.completo || (isFinite(n) && pareja.finNums && pareja.finNums.indexOf(n) >= 0)));
        anotar(f, pareja ? 's:' + pareja.showId : 'dc:' + s.id, pareja && pareja.programa ? pareja.programa : s.name,
               isFinite(n) ? n : null, e.title || '', nomCh, lin[String(c.character_id) + '|' + String(c.episode_id)] || 0, fin);
      }
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
  for(const r of registros){
    const reg2 = (r && r.reg) || {}, progClave = 's:' + r.showId, conFoto = new Set();
    const finNom = new Set((r.finNombres || []).map(castNorm));
    const terminado = (nombreEp, n) => !!r.completo || finNom.has(castNorm(nombreEp)) || (n != null && Array.isArray(r.finNums) && r.finNums.indexOf(n) >= 0);
    const caps = reg2.capitulos || {};
    for(const nombreEp of Object.keys(caps)){
      conFoto.add(castNorm(nombreEp));
      const pers = (caps[nombreEp] && caps[nombreEp].personajes) || {};
      for(const pk of Object.keys(pers)){
        const x = pers[pk];
        if(!x || !x.talent) continue;
        const n = numDe(nombreEp, r.programa);
        anotar(fila(x.talent), progClave, r.programa, n, nombreEp, x.display || pk, x.lineas, terminado(nombreEp, n));
      }
    }
    /* Los capítulos de antes de las fotos: sin líneas, pero sí dónde estuvo. */
    const P = reg2.personajes || {};
    for(const pk of Object.keys(P)){
      const x = P[pk];
      if(!x || !x.talent) continue;
      for(const nombreEp of (Array.isArray(x.episodios) ? x.episodios : []))
        if(!conFoto.has(castNorm(nombreEp))){ const n = numDe(nombreEp, r.programa); anotar(fila(x.talent), progClave, r.programa, n, nombreEp, x.display || pk, 0, terminado(nombreEp, n)); }
    }
  }
  for(const e of (o.enCap || [])){
    const f = fila(e.talento);
    if(!f) continue;
    f.enCap = (e.personajes || []).map(p => p.display);
    f.lineasCap = e.ints || 0;
  }
  const out = Array.from(por.values());
  for(const f of out){
    f.nivel = d ? dispNivel(f.programas.length) : null;
    f.historial = Array.from(f._h.values()).map(pg => {
      const eps = Array.from(pg.eps.values()).filter(ep => !ep.fin).map(ep => {
        const pers = Array.from(ep.pers.values()).sort((a, b) => b.lineas - a.lineas || a.nombre.localeCompare(b.nombre, 'es'));
        return { n: ep.n, titulo: ep.titulo, personajes: pers, lineas: pers.reduce((t, x) => t + x.lineas, 0) };
      }).sort((a, b) => ((a.n == null) - (b.n == null)) || ((a.n || 0) - (b.n || 0)) || a.titulo.localeCompare(b.titulo, 'es'));
      return { clave: pg.clave, programa: pg.programa, este: pg.este, episodios: eps, lineas: eps.reduce((t, x) => t + x.lineas, 0) };
    }).filter(pg => pg.episodios.length).sort((a, b) => (b.este - a.este) || (b.lineas - a.lineas) || a.programa.localeCompare(b.programa, 'es'));
    delete f._h;
  }
  return out;
}

/** Las que se ven: por nombre o personaje, solo las del programa si se pide, y en su orden. */
function dispVisibles(filas, buscar, soloPrograma, orden){
  const q = castNorm(buscar);
  const l = filas.filter(f => (!soloPrograma || f.enPrograma.length)
    && (!q || f.clave.indexOf(q) >= 0 || f.enPrograma.some(x => castNorm(x.personaje).indexOf(q) >= 0)
        || (f.historial || []).some(pg => castNorm(pg.programa).indexOf(q) >= 0 || pg.episodios.some(e => e.personajes.some(x => castNorm(x.nombre).indexOf(q) >= 0)))));
  const nom = (a, b) => a.nombre.localeCompare(b.nombre, 'es');
  const carga = (a, b) => (a.programas.length - b.programas.length) || (a.lineas - b.lineas);
  if(orden === 'libres') l.sort((a, b) => carga(a, b) || nom(a, b));
  else if(orden === 'nombre') l.sort(nom);
  else l.sort((a, b) => ((b.enPrograma.length ? 1 : 0) - (a.enPrograma.length ? 1 : 0)) || carga(a, b) || nom(a, b));
  return l;
}

/**
 * El historial en cápsulas: una por programa (cuántos episodios y líneas) y,
 * al abrirla, una por episodio con sus personajes y líneas. El programa que
 * se castea va primero, abierto y en verde.
 */
function dispHtmlHistorial(f){
  const h = f.historial || [];
  if(!h.length) return '';
  const lin = (n) => n + ' línea' + (n === 1 ? '' : 's');
  return '<div class="disp-hist">' + h.map(pg => '<details class="disp-pg' + (pg.este ? ' disp-pg-este' : '') + '"' + (pg.este ? ' open' : '') + '>'
      + '<summary class="disp-cap-p"><span class="disp-cap-n">' + dispEsc(pg.programa) + '</span>'
      +   '<span class="disp-cap-c">' + pg.episodios.length + ' ep.</span>'
      +   (pg.lineas ? '<span class="disp-cap-c">' + lin(pg.lineas) + '</span>' : '') + '</summary>'
      + '<div class="disp-eps">' + pg.episodios.map(e => '<span class="disp-ep" title="' + dispEsc((e.titulo ? e.titulo + ' · ' : '') + e.personajes.map(x => x.nombre + (x.lineas ? ' (' + lin(x.lineas) + ')' : '')).join(', ')) + '">'
          + '<b>' + (e.n != null ? 'Ep. ' + e.n : dispEsc(e.titulo || 'Ep.')) + '</b>'
          + e.personajes.map(x => '<span class="disp-ep-p">' + dispEsc(x.nombre) + (x.lineas ? ' <i>' + x.lineas + '</i>' : '') + '</span>').join('')
          + '</span>').join('') + '</div>'
      + '</details>').join('') + '</div>';
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
    +   '<input type="text" id="dispBuscar" placeholder="Buscar talento, personaje o programa…" value="' + dispEsc(DISP.buscar) + '" autocomplete="off">'
    +   '<label class="disp-solo"><input type="checkbox" id="dispSolo"' + (DISP.soloPrograma ? ' checked' : '') + '> Solo los que han estado en este programa</label>'
    +   '<select id="dispOrden">' + op('programa', 'Los del programa primero') + op('libres', 'Los más libres primero') + op('nombre', 'Por nombre') + '</select>'
    + '</div>'
    + '<div class="meta-nota">Dónde ha estado cada talento: solo los episodios en producción; los completados no salen.</div>'
    + (conDc ? '' : '<div class="meta-nota">La ocupación en otros programas viene de DublajeCast y solo la ve el administrador. Aquí, lo que sabe Dubbipt: quién ha estado en este programa y lo de este capítulo.</div>')
    + (l.length ? '<div class="disp-lista">' + l.map(f => '<div class="disp-fila' + (f.enPrograma.length ? ' disp-del' : '') + '">'
        + '<div class="disp-nom"><b>' + dispEsc(f.nombre) + '</b>' + (f.ficha ? '<span class="disp-ficha">' + dispEsc(f.ficha) + '</span>' : '') + '</div>'
        + '<div class="disp-datos">'
        +   (f.nivel ? '<span class="disp-nivel disp-' + f.nivel.clave + '">' + dispEsc(f.nivel.texto) + '</span>' : '')
        +   (f.enPrograma.length ? '<span class="disp-prog">Ya en este programa: ' + dispEsc(f.enPrograma.map(x => x.personaje).join(', ')) + '</span>' : '<span class="disp-tenue">Nunca en este programa</span>')
        +   (f.enCap.length ? '<span class="disp-cap">En este capítulo: ' + dispEsc(f.enCap.join(', ')) + ' · ' + f.lineasCap + ' int.</span>' : '')
        +   (f.programas.length ? '<span class="disp-tenue">En curso: ' + dispEsc(f.programas.slice(0, 4).join(', ')) + (f.programas.length > 4 ? '…' : '') + ' · ' + f.personajes + ' pers. · ' + f.lineas + ' líneas</span>' : '')
        + '</div>' + dispHtmlHistorial(f) + '</div>').join('') + '</div>'
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
  + ".disp-hist{ display:flex; flex-direction:column; gap:6px; margin-top:4px; }"
  + ".disp-pg > summary{ list-style:none; cursor:pointer; } .disp-pg > summary::-webkit-details-marker{ display:none; }"
  + ".disp-cap-p{ display:inline-flex; align-items:center; gap:6px; background:#161a22; border:1px solid #2b3040; border-radius:999px; padding:3px 4px 3px 11px; font-size:12px; color:#e7ebf3; max-width:100%; }"
  + ".disp-cap-p:hover{ border-color:#4b5568; } .disp-cap-n{ font-weight:700; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }"
  + ".disp-cap-c{ background:#0b0d10; border-radius:999px; padding:1px 8px; font-size:11px; color:#aab3c2; font-variant-numeric:tabular-nums; }"
  + ".disp-pg-este .disp-cap-p{ background:rgba(34,197,94,.12); border-color:rgba(34,197,94,.45); color:#4ADE80; } .disp-pg-este .disp-cap-c{ color:#86EFAC; }"
  + ".disp-eps{ display:flex; flex-wrap:wrap; gap:5px; padding:6px 0 2px 10px; }"
  + ".disp-ep{ display:inline-flex; align-items:center; gap:5px; background:#0f1218; border:1px solid #262b36; border-radius:999px; padding:2px 9px 2px 3px; font-size:11.5px; color:#cbd5e1; }"
  + ".disp-ep > b{ background:#1f2430; color:#f3f4f6; border-radius:999px; padding:1px 7px; font-size:11px; font-weight:700; font-variant-numeric:tabular-nums; }"
  + ".disp-ep-p + .disp-ep-p::before{ content:'·'; margin-right:5px; color:#5b6474; } .disp-ep-p i{ font-style:normal; color:#8b93a1; font-variant-numeric:tabular-nums; }"
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

/* Los registros de los demás programas, para el historial: se piden como mucho una vez por minuto. */
const DISP_REGS = { de: {}, cada: 60000 };

/** Los registros de casting de todos los programas de Dubbipt, con su pareja de DublajeCast. */
async function dispRegistros(q, actual){
  const shows = (typeof sbShows === 'function') ? (sbShows() || []) : [];
  const ahora = Date.now();
  return Promise.all(shows.map(async (sh) => {
    let reg = null;
    if(q.showId && sh.id === q.showId){ reg = actual; DISP_REGS.de[sh.id] = { reg: reg, ts: ahora }; }
    else{
      const ya = DISP_REGS.de[sh.id];
      if(ya && ahora - ya.ts < DISP_REGS.cada) reg = ya.reg;
      else{
        try{ reg = await castRegCargar(sh.id); }catch(e){ reg = null; }
        DISP_REGS.de[sh.id] = { reg: reg, ts: ahora };
      }
    }
    let serie = null;
    try{ serie = (q.d && typeof dcastSerieDe === 'function') ? dcastSerieDe(sh, q.d) : null; }catch(e){ serie = null; }
    /* Lo completado no sale en el historial: el programa entero, o sus episodios. */
    let completo = false;
    try{ completo = (typeof csEstadoDe === 'function') ? csEstadoDe(sh, serie) === 'completo' : sh.estado === 'completo'; }catch(e){ completo = false; }
    const finNombres = [], finNums = [];
    for(const ep of ((typeof sbEps === 'function') ? (sbEps(sh.id) || []) : [])){
      let est = ep.estado;
      try{ if(typeof csEstadoEp === 'function') est = csEstadoEp({ ep: ep, dcEp: null }); }catch(e){ /* el de la fila */ }
      if(est !== 'completo') continue;
      finNombres.push(ep.name);
      let n = NaN;
      try{ if(typeof csNumeroDe === 'function') n = csNumeroDe(ep.name, sh.name); }catch(e){ n = NaN; }
      if(isFinite(n)) finNums.push(n);
    }
    return { showId: sh.id, programa: sh.name, serieId: serie ? serie.id : null, reg: reg || { personajes: {} }, completo: completo, finNombres: finNombres, finNums: finNums };
  }));
}

/** Junta los datos: lo de memoria y los registros de los programas (del servidor o de la caché). */
async function dispDatos(registroDe){
  const q = dispQueHay();
  let registro = { personajes: {} };
  try{ if(q.showId) registro = (registroDe && registroDe.showId === q.showId) ? registroDe.reg : await castRegCargar(q.showId); }catch(e){ fallo('castRegCargar · js/castdisponible.js:dispDatos', e); }
  let registros = [];
  try{ registros = await dispRegistros(q, registro); }catch(e){ fallo('dispRegistros · js/castdisponible.js:dispDatos', e); }
  DISP.filas = dispFilas({ base: (typeof TAL !== 'undefined' && TAL.nombres) || [], d: q.d, serie: q.serie, registro: registro, enCap: q.enCap,
                           showId: q.showId, programa: q.programa, registros: registros });
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
