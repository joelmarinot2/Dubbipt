/* Casting con la organización de DublajeCast y la interfaz de Dubbipt · especificacion 09, PRO-11
 *
 * Pedido de sala: «quiero que sea una interfaz compartida de Dubbipt: al
 * entrar elijo el perfil (QC, Grabación o Casting); si elijo Casting se abre
 * Programas con las herramientas que tiene DublajeCast; en cada programa veo el
 * casting de cada episodio, y dentro de cada episodio uso las herramientas de
 * Dubbipt». Y después: «que tenga la misma organización que DublajeCast, pero
 * con la interfaz de Dubbipt», «sin ningún emoji en los iconos».
 *
 * Con el perfil Casting (y el administrador, PRO-8), la biblioteca lleva
 * arriba las secciones de DublajeCast en su mismo orden: Dashboard, Programas,
 * Talentos, Ocupación, Tráilers, Producción, DUBCARDs, Pegado de casting y
 * Breakdowns. Las que enseñan datos se pintan aquí, con el aspecto de Dubbipt,
 * sobre los datos de DublajeCast (en vivo si su pantalla está abierta con
 * sesión; si no, lo traído a Producción). Programas es la lista de siempre de
 * Dubbipt, con el casting de cada capítulo (js/dublajecast.js). Las tres que
 * procesan archivos -DUBCARDs, Pegado de casting, Breakdowns- abren todavía la
 * herramienta de DublajeCast.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: prodPuede, prodCargar, prodIndices, prodAlertasEp,
 * prodPlazo, prodFormatoDubcard, prodFichaTexto, prodCasarPrograma, PROD,
 * PROD_ET, prodPanel, prodImportarDesdeDublajeCast, prodResumenTexto,
 * dcastDatos, dcastAbrir, dcSesion, castNorm, castAviso, sbShows, LDB, libView,
 * renderLibrary, newShow, newEpisodeModal, openEpisode, ponerModo, sbEps,
 * castRegCargar, dcastSerieDe, dcastEpDeDc, dcastFilasCasting, esc, fallo, _svgI,
 * dcxGuardar y las transformaciones de js/dcescribir.js (con dcxHistorial, dcxEntrada,
 * dcxRegistrar, dcxConflictosFusion, dcxFusionarEpisodios, dcxRelevosAceptados,
 * dcxAceptarRelevo), herramientasPanel, currentEp, DDL_MODO, dcPanel, DDL_UI, sb, uid,
 * libFetchAll, WORKSPACE.
 */

/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST ═══════════════════════════ */

const CS = { vista: 'programas', buscar: '', soloAlertas: false, programa: '',
             prog: null, ep: null, filtro: 'en_curso', buscarProg: '', orden: 'lineas', registros: {},
             tab: 'episodios', buscarCast: '', ordenCast: 'episodio', fusion: null, elegidos: {}, copias: [] };

/* Iconos de trazo, como los de Dubbipt (ICO). Ningún emoji. */
const CS_ICO = {
  dashboard:  '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  programas:  '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M17 2l-5 5-5-5"/>',
  talentos:   '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0112 0v1"/><path d="M16 4a4 4 0 010 8"/><path d="M22 21v-1a6 6 0 00-4-5.6"/>',
  ocupacion:  '<path d="M3 3v18h18"/><path d="M8 17v-5"/><path d="M13 17V8"/><path d="M18 17v-9"/>',
  trailers:   '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M10 9l5 3-5 3z"/>',
  produccion: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  dubcards:   '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7 10h10M7 14h6"/>',
  pegado:     '<rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 00-2-2H5a2 2 0 00-2 2v9a2 2 0 002 2h3"/>',
  breakdowns: '<path d="M14 3H6a2 2 0 00-2 2v14a2 2 0 002 2h12a2 2 0 002-2V9z"/><path d="M14 3v6h6M8 13h8M8 17h5"/>',
  externo:    '<path d="M14 3h7v7"/><path d="M10 14L21 3"/><path d="M21 14v5a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h5"/>',
  actualizar: '<path d="M21 12a9 9 0 11-2.64-6.36"/><path d="M21 3.5V8h-4.5"/>',
  aviso:      '<path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/>',
  estrella:   '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
  entrar:     '<path d="M5 12h14"/><path d="M13 6l6 6-6 6"/>',
  cerrar:     '<path d="M6 6l12 12M18 6L6 18"/>',
  derecha:    '<path d="M9 6l6 6-6 6"/>',
  abajo:      '<path d="M6 9l6 6 6-6"/>',
  mas:        '<path d="M12 5v14M5 12h14"/>',
  subir:      '<path d="M12 16V4"/><path d="M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  bajar:      '<path d="M12 4v12"/><path d="M7 11l5 5 5-5"/><path d="M4 20h16"/>',
  traer:      '<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>',
  buscar:     '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
  izquierda:  '<path d="M15 6l-6 6 6 6"/>'
};
/** Un icono de trazo, en el mismo dibujo que los de Dubbipt. */
function csIco(n, sz){
  const p = CS_ICO[n] || '';
  if(typeof _svgI === 'function') return _svgI(p, 2, sz || 15);
  const s = sz || 15;
  return '<svg viewBox="0 0 24 24" width="' + s + '" height="' + s + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + p + '</svg>';
}

/* Las secciones, en el orden de DublajeCast. `dc`: todavía es la herramienta de allí. */
const CS_SECCIONES = [
  { v: 'dashboard',  t: 'Dashboard' },
  { v: 'programas',  t: 'Programas' },
  { v: 'talentos',   t: 'Talentos' },
  { v: 'ocupacion',  t: 'Ocupación' },
  { v: 'trailers',   t: 'Tráilers' },
  { v: 'produccion', t: 'Producción' },
  { v: 'dubcards',   t: 'DUBCARDs',          dc: 'dubcards',   dice: 'Prepara las DUBCARD de cada capítulo desde el casting: el plan de copiado de Netflix, la matriz de recurrencia y sus alertas.' },
  { v: 'pegado',     t: 'Pegado de casting', dc: 'pegado',     dice: 'Rellena la columna del actor de un desglose con el reparto vigente de su programa.' },
  { v: 'breakdowns', t: 'Breakdowns',        dc: 'breakdowns', dice: 'Escribe los breakdowns de los personajes a partir del libreto y la guía del programa, con su IA.' }
];

function csEsc(s){ return (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }

/* ── Las cuentas (sin pantalla: se prueban solas) ──────────────────────── */

/** Lo del Dashboard: los números, las entregas que vienen y los tráilers que vencen. */
function csResumen(d, hoy){
  const out = { enCurso: 0, programas: 0, capitulos: 0, talentos: 0, asignaciones: 0, sinTalento: 0, trailersPendientes: 0, entregas: [], trailers: [] };
  if(!d) return out;
  const ix = prodIndices(d);
  out.programas = d.series.length;
  out.enCurso = d.series.filter(s => s.status === 'en_curso').length;
  out.capitulos = d.episodes.length;
  out.talentos = d.talents.length;
  const asignado = new Set(d.castings.map(c => String(c.episode_id) + ':' + String(c.character_id)));
  out.asignaciones = asignado.size;
  out.sinTalento = d.appearances.filter(a => !asignado.has(String(a.episode_id) + ':' + String(a.character_id))).length;
  for(const e of d.episodes){
    const s = ix.serie[String(e.series_id)];
    for(const a of prodAlertasEp(e, s, hoy)) out.entregas.push({ programa: s ? s.name : '', capitulo: e.episode_number, titulo: e.title || '', nivel: a.nivel, dias: a.dias, texto: a.texto });
  }
  out.entregas.sort((a, b) => a.dias - b.dias || String(a.programa).localeCompare(String(b.programa), 'es'));
  for(const t of d.trailers){
    const p = prodPlazo(t.deadline, t.status, hoy);
    if(p.nivel === 'hecho') continue;
    out.trailersPendientes++;
    const s = ix.serie[String(t.series_id)];
    out.trailers.push({ titulo: t.title || '', tipo: t.type === 'teaser' ? 'Teaser' : 'Tráiler', programa: s ? s.name : '', nivel: p.nivel, dias: p.dias, texto: p.texto });
  }
  out.trailers.sort((a, b) => ((a.dias == null) - (b.dias == null)) || ((a.dias || 0) - (b.dias || 0)));
  return out;
}

/**
 * La ocupación de cada talento: cuántos personajes, en cuántos capítulos,
 * cuántas líneas y en qué programas. Un casting repetido cuenta una vez.
 * `programa` (opcional) la limita a un programa de DublajeCast, por su id.
 */
function csOcupacion(d, programa){
  if(!d) return [];
  const ix = prodIndices(d);
  const lineas = {};
  for(const a of d.appearances) lineas[String(a.episode_id) + ':' + String(a.character_id)] = +a.line_count || 0;
  const por = {}, vistos = new Set();
  for(const c of d.castings){
    const clave = String(c.episode_id) + ':' + String(c.character_id) + ':' + String(c.talent_id);
    if(vistos.has(clave)) continue;
    vistos.add(clave);
    const t = ix.talent[String(c.talent_id)], e = ix.ep[String(c.episode_id)], ch = ix.char[String(c.character_id)];
    if(!t || !t.name || !e || !ch) continue;
    const s = ix.serie[String(e.series_id)];
    if(programa != null && programa !== '' && String(e.series_id) !== String(programa)) continue;
    const o = (por[String(t.id)] = por[String(t.id)] || { talento: t.name, personajes: new Set(), capitulos: new Set(), lineas: 0, programas: new Set() });
    o.personajes.add(String(e.series_id) + ':' + castNorm(ch.name));
    o.capitulos.add(String(e.id));
    o.lineas += lineas[String(c.episode_id) + ':' + String(c.character_id)] || 0;
    if(s) o.programas.add(s.name);
  }
  return Object.keys(por).map(k => {
    const o = por[k];
    return { talento: o.talento, personajes: o.personajes.size, capitulos: o.capitulos.size, lineas: o.lineas, programas: [...o.programas].sort((a, b) => a.localeCompare(b, 'es')) };
  }).sort((a, b) => b.lineas - a.lineas || b.personajes - a.personajes || a.talento.localeCompare(b.talento, 'es'));
}

/** Los talentos con su ficha y sus papeles, por programa. */
function csTalentos(d, buscar){
  if(!d) return [];
  const ix = prodIndices(d);
  const f = castNorm(buscar);
  const papeles = {};
  for(const c of d.castings){
    const e = ix.ep[String(c.episode_id)], s = e ? ix.serie[String(e.series_id)] : null, ch = ix.char[String(c.character_id)];
    if(!s || !ch) continue;
    const m = (papeles[String(c.talent_id)] = papeles[String(c.talent_id)] || {});
    (m[s.name] = m[s.name] || new Set()).add(ch.name);
  }
  return d.talents.filter(t => t.name && (!f || castNorm(t.name).indexOf(f) >= 0))
    .map(t => {
      const pp = papeles[String(t.id)] || {};
      return { id: t.id, nombre: t.name, ficha: prodFichaTexto(t), correo: t.email || '', genero: t.genero || '', edad: t.edad_aparente || '', tono: t.tono_de_voz || '', registro: t.registro || '',
               programas: Object.keys(pp).sort((a, b) => a.localeCompare(b, 'es')).map(n => ({ programa: n, personajes: [...pp[n]].sort((a, b) => a.localeCompare(b, 'es')) })) };
    })
    .sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
}

/** Las filas de Producción: un capítulo por fila, con sus fechas, su DUBCARD y sus alertas. */
function csProduccion(d, hoy, soloAlertas){
  if(!d) return [];
  const ix = prodIndices(d);
  return d.episodes.map(e => {
    const s = ix.serie[String(e.series_id)];
    const al = prodAlertasEp(e, s, hoy);
    return { programa: s ? s.name : '', cliente: (e.cliente || (s && s.cliente) || ''), capitulo: e.episode_number, titulo: e.title || '',
             fase: (PROD_ET.fase[e.fase] || e.fase || ''), estado: (PROD_ET.estado[e.status] || e.status || ''),
             miami: e.fecha_miami || '', dubcard: prodFormatoDubcard(e, s), fechaDubcard: e.fecha_dubcard || '',
             alertas: al, peor: al.length ? Math.min.apply(null, al.map(a => a.dias)) : null };
  }).filter(r => !soloAlertas || r.alertas.length)
    .sort((a, b) => ((a.peor == null) - (b.peor == null)) || ((a.peor || 0) - (b.peor || 0)) || String(a.programa).localeCompare(String(b.programa), 'es') || ((+a.capitulo || 0) - (+b.capitulo || 0)));
}

/* ── Programas, programa y episodio, como en DublajeCast ──────────────────
   Pedido de sala: «quiero la misma distribución que la app de DublajeCast en
   todas las secciones de Casting: en Programas ver todos los programas como
   DublajeCast; y si uno entra al programa y entra al episodio, un botón que
   diga “Realizar casting”, y ahí se abre la interfaz de hacer casting de toda
   la vida». */

/** El número que lleva un nombre («Episodio 12» → 12), o NaN. */
function csNumeroDe(nombre){ const m = String(nombre == null ? '' : nombre).match(/\d+/); return m ? parseInt(m[0], 10) : NaN; }

/** Un programa, junte lo que junte: el de Dubbipt, el de DublajeCast, o los dos. */
function csProg(show, serie, eps, d){
  const dcEps = (serie && d) ? d.episodes.filter(e => String(e.series_id) === String(serie.id)) : [];
  return { clave: show ? 's:' + show.id : 'dc:' + serie.id, nombre: show ? show.name : serie.name, show: show || null, serie: serie || null,
           estado: (serie && serie.status) || 'en_curso', cliente: (serie && serie.cliente) || '', director: (serie && serie.director) || '',
           tipo: (serie && serie.type) || '', eps: eps || [], dcEps: dcEps };
}

/**
 * Todos los programas, como los enseña DublajeCast: los de Dubbipt -con lo que
 * DublajeCast sepa de ellos- y los de DublajeCast que aún no están aquí.
 * `epsDe(id)` da los capítulos de Dubbipt de un programa.
 */
function csProgramas(shows, epsDe, d){
  const out = [], usadas = new Set();
  for(const sh of (shows || [])){
    const serie = d ? dcastSerieDe(sh, d) : null;
    if(serie) usadas.add(String(serie.id));
    out.push(csProg(sh, serie, epsDe ? epsDe(sh.id) : [], d));
  }
  if(d) for(const s of d.series) if(!usadas.has(String(s.id))) out.push(csProg(null, s, [], d));
  return out.sort((a, b) => String(a.nombre).localeCompare(String(b.nombre), 'es'));
}

/** Los programas que se ven: por estado (todos, en curso, completados) y por lo que se busque en nombre, cliente o director. */
function csFiltrarProgramas(lista, filtro, buscar){
  const q = castNorm(buscar);
  return lista.filter(p => (filtro === 'todos' || !filtro || p.estado === filtro)
    && (!q || [p.nombre, p.cliente, p.director].some(x => castNorm(x).indexOf(q) >= 0)));
}

/**
 * Los episodios de un programa: los de Dubbipt, cada uno con su pareja de
 * DublajeCast si la tiene, y los de DublajeCast que aún no están aquí. Por
 * número de episodio.
 */
function csEpisodios(p){
  const out = [], usados = new Set();
  for(const ep of p.eps){
    const dc = dcastEpDeDc(ep.name, p.dcEps);
    if(dc) usados.add(String(dc.id));
    const n = dc ? parseInt(dc.episode_number, 10) : csNumeroDe(ep.name);
    out.push({ clave: 'e:' + ep.id, ep: ep, dcEp: dc || null, numero: isFinite(n) ? n : null, titulo: ep.name, dcTitulo: dc ? (dc.title || '') : '' });
  }
  for(const dc of p.dcEps){
    if(usados.has(String(dc.id))) continue;
    const n = parseInt(dc.episode_number, 10);
    out.push({ clave: 'd:' + dc.id, ep: null, dcEp: dc, numero: isFinite(n) ? n : null, titulo: dc.title || ('Episodio ' + dc.episode_number), dcTitulo: dc.title || '' });
  }
  return out.sort((a, b) => ((a.numero == null) - (b.numero == null)) || ((a.numero || 0) - (b.numero || 0)) || String(a.titulo).localeCompare(String(b.titulo), 'es'));
}

/** El casting de un episodio: los personajes de DublajeCast y lo que el registro de Dubbipt dice de ese capítulo. */
function csCastingDe(e, d, registro){
  return dcastFilasCasting(d, e.dcEp, registro, e.ep ? e.ep.name : '');
}

/** El registro de casting de un programa de Dubbipt, guardado al pedirlo; si aún no está, se pide y se repinta al llegar. */
function csRegistroDe(show){
  if(!show) return null;
  const k = String(show.id);
  if(k in CS.registros) return CS.registros[k];
  CS.registros[k] = null;
  Promise.resolve().then(() => castRegCargar(show.id))
    .then(r => { CS.registros[k] = r || { personajes: {} }; csRepintar(); })
    .catch(() => { CS.registros[k] = { personajes: {} }; });
  return null;
}

/** El programa y el episodio que se están mirando. */
function csActual(){
  const { datos } = csDatos();
  const lista = csProgramas((typeof sbShows === 'function') ? sbShows() : [], (typeof sbEps === 'function') ? sbEps : null, datos);
  const p = lista.find(x => x.clave === CS.prog) || null;
  const eps = p ? csEpisodios(p) : [];
  const e = p ? (eps.find(x => x.clave === CS.ep) || null) : null;
  return { datos: datos, lista: lista, p: p, eps: eps, e: e };
}

/* ── Lo que se pinta ────────────────────────────────────────────────────── */

function csColor(nivel){
  return nivel === 'vencida' || nivel === 'vencido' ? 'mal' : (nivel === 'urgente' ? 'urge' : (nivel === 'pronto' || nivel === 'aviso' ? 'pronto' : (nivel === 'hecho' || nivel === 'ok' ? 'ok' : 'nada')));
}
function csChip(texto, nivel){ return '<span class="cs-chip cs-' + csColor(nivel) + '">' + csEsc(texto) + '</span>'; }

/** La cabecera de una sección: su nombre, de dónde salen los datos y actualizar. */
function csCabecera(titulo, sub, vivo){
  const cuando = PROD.cuando ? new Date(PROD.cuando).toLocaleDateString('es') : '';
  return '<div class="cs-cab"><div class="cs-cab-t"><h2>' + csEsc(titulo) + '</h2><div class="cs-cab-sub">' + sub + '</div></div>'
    + '<span class="cs-de">' + (vivo ? 'DublajeCast en vivo' : (PROD.datos ? 'Datos de DublajeCast' + (cuando ? ' del ' + csEsc(cuando) : '') : 'Sin datos de DublajeCast')) + '</span>'
    + '<button class="cs-b" data-cs="actualizar" title="Volver a traer los datos de DublajeCast">' + csIco('actualizar', 14) + '<span>Actualizar</span></button>'
    + '</div>';
}

function csVacio(){
  return '<div class="cs-vacio"><b>Todavía no hay datos de DublajeCast.</b>'
    + '<span>Tráelos una vez y aquí se verán sus programas, talentos, ocupación, tráilers y entregas.</span>'
    + '<button class="cs-b cs-pri" data-cs="traer">' + csIco('traer', 14) + '<span>Traer de DublajeCast</span></button></div>';
}

function csHtmlDashboard(d, hoy, vivo){
  const r = csResumen(d, hoy);
  const kpi = (n, t, extra) => '<div class="cs-kpi' + (extra || '') + '"><b>' + n + '</b><span>' + csEsc(t) + '</span></div>';
  return csCabecera('Dashboard', 'Lo que hay que mirar hoy', vivo)
    + (d ? '<div class="cs-kpis">'
        + kpi(r.enCurso, 'programas en curso') + kpi(r.capitulos, 'capítulos') + kpi(r.talentos, 'talentos')
        + kpi(r.asignaciones, 'asignaciones') + kpi(r.sinTalento, 'personajes sin talento', r.sinTalento ? ' cs-kpi-aviso' : '')
        + kpi(r.trailersPendientes, 'tráilers pendientes') + '</div>'
      + '<div class="cs-dos">'
      +   '<div class="cs-caja"><div class="cs-caja-t">' + csIco('produccion', 14) + 'Entregas que vienen</div>'
      +     (r.entregas.length ? r.entregas.slice(0, 12).map(e => '<div class="cs-linea">' + csChip(e.texto, e.nivel)
              + '<span class="cs-linea-t"><b>' + csEsc(e.programa) + '</b> · cap. ' + csEsc(e.capitulo) + (e.titulo ? ' · ' + csEsc(e.titulo) : '') + '</span></div>').join('')
            : '<div class="cs-nada">Ninguna entrega a Miami ni DUBCARD en los próximos tres días.</div>')
      +   '</div>'
      +   '<div class="cs-caja"><div class="cs-caja-t">' + csIco('trailers', 14) + 'Tráilers y teasers</div>'
      +     (r.trailers.length ? r.trailers.slice(0, 8).map(t => '<div class="cs-linea">' + csChip(t.texto, t.nivel)
              + '<span class="cs-linea-t"><b>' + csEsc(t.titulo || '(sin título)') + '</b> · ' + csEsc(t.tipo) + (t.programa ? ' · ' + csEsc(t.programa) : '') + '</span></div>').join('')
            : '<div class="cs-nada">Ningún tráiler pendiente.</div>')
      +   '</div>'
      + '</div>'
      + (() => {
          const rev = csPorRevisar(csActual().lista, d, (eid) => !!(LDB.dataEps && LDB.dataEps.has(eid)));
          return rev.length ? '<div class="cs-caja cs-caja-hist"><div class="cs-caja-t">' + csIco('aviso', 14) + 'Para revisar</div>'
            + rev.map(x => '<div class="cs-linea"><span class="cs-linea-t"><b>' + csEsc(x.p.nombre) + '</b>'
                + (x.repetidos ? ' · ' + x.repetidos + ' capítulo' + (x.repetidos === 1 ? '' : 's') + ' repetido' + (x.repetidos === 1 ? '' : 's') : '')
                + (x.inconsistencias ? ' · ' + x.inconsistencias + ' personaje' + (x.inconsistencias === 1 ? '' : 's') + ' con dos talentos' : '') + '</span>'
                + '<button class="cs-b" data-cs="abrirProg" data-v="' + csEsc(x.p.clave) + '">Revisar</button></div>').join('') + '</div>' : '';
        })()
      + csHtmlCopias(CS.copias)
      + '<div class="cs-caja cs-caja-hist"><div class="cs-caja-t">' + csIco('actualizar', 14) + 'Últimos cambios</div>' + csHtmlHistorial(dcxHistorial(), true, 12) + '</div>'
      : csVacio());
}

/** Lo que desapareció de DublajeCast y Dubbipt guardó: para devolverlo o bajarlo. */
function csHtmlCopias(copias){
  const l = (copias || []).filter(c => c && !c.devuelta && c.total);
  if(!l.length) return '';
  return '<div class="cs-caja cs-caja-hist"><div class="cs-caja-t">' + csIco('aviso', 14) + 'Lo que se borró en DublajeCast</div>'
    + '<div class="cs-nada">Dubbipt guardó una copia antes de que se perdiera. Devolverlo solo añade lo que falta: lo que hay ahora no se toca.</div>'
    + l.map(c => '<div class="cs-linea"><span class="cs-linea-t"><b>' + csEsc(csFechaHora(new Date(c.cuando).toISOString())) + '</b> · faltaban ' + csEsc(prodPerdidoTexto(c.por)) + '</span>'
      + '<button class="cs-b cs-pri" data-cs="devolver" data-v="' + csEsc(c.id) + '">Devolver a DublajeCast</button>'
      + '<button class="cs-b" data-cs="bajarCopia" data-v="' + csEsc(c.id) + '">Descargar</button></div>').join('')
    + '</div>';
}

function csHtmlTalentos(d, vivo){
  const lista = csTalentos(d, CS.buscar);
  return csCabecera('Talentos', (d ? d.talents.length : 0) + ' talentos con su ficha y sus papeles', vivo)
    + (d ? '<div class="cs-nuevo"><input type="text" id="csTalNuevo" placeholder="Nombre del talento nuevo"><button class="cs-b cs-pri" data-cs="talNuevo">' + csIco('mas', 14) + '<span>Añadir talento</span></button></div>'
      + '<label class="cs-buscar">' + '<input type="text" data-cs="buscar" placeholder="Buscar talento…" value="' + csEsc(CS.buscar) + '"></label>'
      + (lista.length ? '<div class="cs-lista">' + lista.map(t => '<div class="cs-tal">'
          + '<div class="cs-tal-cab"><b>' + csEsc(t.nombre) + '</b>' + (t.ficha ? '<span class="cs-ficha">' + csEsc(t.ficha) + '</span>' : '<span class="cs-ficha cs-tenue">sin ficha</span>')
          + (t.correo ? '<span class="cs-tenue">' + csEsc(t.correo) + '</span>' : '') + '</div>'
          + (t.programas.length ? '<div class="cs-papeles">' + t.programas.map(p => '<span><b>' + csEsc(p.programa) + '</b>: ' + csEsc(p.personajes.slice(0, 6).join(', ')) + (p.personajes.length > 6 ? '…' : '') + '</span>').join('') + '</div>' : '')
          + '<details class="cs-tal-ed"><summary>Editar ficha</summary><div class="cs-tal-campos">'
          +   '<label>Nombre <input type="text" data-cs="talCampo" data-id="' + csEsc(t.id) + '" data-campo="name" value="' + csEsc(t.nombre) + '"></label>'
          +   '<label>Género ' + csSelect('genero', t.genero, CS_OP_GENERO, { cs: 'talCampo', id: t.id }) + '</label>'
          +   '<label>Edad ' + csSelect('edad_aparente', t.edad, CS_OP_EDAD, { cs: 'talCampo', id: t.id }) + '</label>'
          +   '<label>Tono ' + csSelect('tono_de_voz', t.tono, CS_OP_TONO, { cs: 'talCampo', id: t.id }) + '</label>'
          +   '<label>Registro <input type="text" data-cs="talCampo" data-id="' + csEsc(t.id) + '" data-campo="registro" value="' + csEsc(t.registro) + '"></label>'
          +   '<label>Correo <input type="email" data-cs="talCampo" data-id="' + csEsc(t.id) + '" data-campo="email" value="' + csEsc(t.correo) + '"></label>'
          + '</div></details>'
          + '</div>').join('') + '</div>'
        : '<div class="cs-nada">Ningún talento' + (CS.buscar ? ' con «' + csEsc(CS.buscar) + '»' : '') + '.</div>')
      : csVacio());
}

function csHtmlOcupacion(d, vivo){
  const filas = csOcupacion(d, CS.programa);
  const max = filas.reduce((m, f) => Math.max(m, f.lineas), 0) || 1;
  return csCabecera('Ocupación', 'Cuánto trabaja cada talento: personajes, capítulos y líneas', vivo)
    + (d ? '<label class="cs-sel">Programa <select data-cs="programa"><option value="">Todos</option>'
        + d.series.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'es')).map(s => '<option value="' + csEsc(s.id) + '"' + (String(CS.programa) === String(s.id) ? ' selected' : '') + '>' + csEsc(s.name) + '</option>').join('')
        + '</select></label>'
      + (filas.length ? '<div class="cs-tabla cs-ocup"><div class="cs-fila cs-fila-cab"><span>Talento</span><span>Personajes</span><span>Capítulos</span><span>Líneas</span><span>Programas</span></div>'
          + filas.map(f => '<div class="cs-fila"><span><b>' + csEsc(f.talento) + '</b></span><span>' + f.personajes + '</span><span>' + f.capitulos + '</span>'
            + '<span class="cs-barra-c"><i class="cs-barra" style="width:' + Math.round(100 * f.lineas / max) + '%"></i><em>' + f.lineas + '</em></span>'
            + '<span class="cs-tenue">' + csEsc(f.programas.join(', ')) + '</span></div>').join('') + '</div>'
        : '<div class="cs-nada">Sin asignaciones' + (CS.programa ? ' en ese programa' : '') + '.</div>')
      : csVacio());
}

function csHtmlTrailers(d, hoy, vivo){
  const r = csResumen(d, hoy);
  const ix = d ? prodIndices(d) : null;
  const todos = d ? d.trailers.map(t => Object.assign({ plazo: prodPlazo(t.deadline, t.status, hoy) }, t))
    .sort((a, b) => ((a.plazo.nivel === 'hecho') - (b.plazo.nivel === 'hecho')) || ((a.plazo.dias == null) - (b.plazo.dias == null)) || ((a.plazo.dias || 0) - (b.plazo.dias || 0))) : [];
  const hechos = todos.filter(t => t.plazo.nivel === 'hecho').length;
  return csCabecera('Tráilers', r.trailersPendientes + ' pendientes · ' + hechos + ' completados', vivo)
    + (d ? '<div class="cs-nuevo"><input type="text" id="csTrTitulo" placeholder="Título del tráiler o teaser">'
        + '<select id="csTrTipo"><option value="trailer">Tráiler</option><option value="teaser">Teaser</option></select>'
        + '<select id="csTrProg"><option value="">Programa…</option>' + d.series.slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'es')).map(s => '<option value="' + csEsc(s.id) + '">' + csEsc(s.name) + '</option>').join('') + '</select>'
        + '<input type="date" id="csTrFecha" title="Entrega">'
        + '<button class="cs-b cs-pri" data-cs="trNuevo">' + csIco('mas', 14) + '<span>Añadir</span></button></div>'
      + '<div class="cs-lista">'
        + todos.map(t => { const s = ix.serie[String(t.series_id)];
            return '<div class="cs-linea cs-linea-g' + (t.plazo.nivel === 'hecho' ? ' cs-hecho' : '') + '">' + csChip(t.plazo.texto, t.plazo.nivel)
              + '<span class="cs-linea-t"><b>' + csEsc(t.title || '(sin título)') + '</b> · ' + (t.type === 'teaser' ? 'Teaser' : 'Tráiler') + (s ? ' · ' + csEsc(s.name) : '') + '</span>'
              + csSelect('status', t.status || 'pendiente', [['pendiente', 'Pendiente'], ['en_curso', 'En curso'], ['completo', 'Completado']], { cs: 'trCampo', id: t.id })
              + '<input type="date" data-cs="trCampo" data-id="' + csEsc(t.id) + '" data-campo="deadline" value="' + csEsc(t.deadline || '') + '" title="Entrega">'
              + '<button class="cs-b cs-b-icono" data-cs="trBorrar" data-id="' + csEsc(t.id) + '" title="Borrar" aria-label="Borrar «' + csEsc(t.title || '') + '»">' + csIco('cerrar', 13) + '</button>'
              + '</div>'; }).join('')
        + (!d.trailers.length ? '<div class="cs-nada">Ningún tráiler ni teaser.</div>' : '')
        + '</div>'
      : csVacio());
}

function csHtmlProduccion(d, hoy, vivo){
  const filas = csProduccion(d, hoy, CS.soloAlertas);
  return csCabecera('Producción', 'Cada capítulo con su fase, sus entregas y su DUBCARD', vivo)
    + (d ? '<label class="cs-check"><input type="checkbox" data-cs="soloAlertas"' + (CS.soloAlertas ? ' checked' : '') + '> Solo los que tienen alertas</label>'
      + (filas.length ? '<div class="cs-tabla cs-prod"><div class="cs-fila cs-fila-cab"><span>Programa</span><span>Cap.</span><span>Fase</span><span>Miami</span><span>DUBCARD</span><span>Alertas</span></div>'
          + filas.map(f => '<div class="cs-fila"><span><b>' + csEsc(f.programa) + '</b>' + (f.cliente ? ' <i class="cs-tenue">' + csEsc(f.cliente) + '</i>' : '') + '</span>'
            + '<span>' + csEsc(f.capitulo != null ? f.capitulo : '—') + (f.titulo ? ' <i class="cs-tenue">' + csEsc(f.titulo) + '</i>' : '') + '</span>'
            + '<span>' + csEsc(f.fase || '—') + '</span><span>' + csEsc(f.miami || '—') + '</span>'
            + '<span>' + csEsc(f.dubcard) + (f.fechaDubcard ? ' · ' + csEsc(f.fechaDubcard) : '') + '</span>'
            + '<span>' + (f.alertas.length ? f.alertas.map(a => csChip(a.texto, a.nivel)).join(' ') : '<i class="cs-tenue">—</i>') + '</span></div>').join('') + '</div>'
        : '<div class="cs-nada">' + (CS.soloAlertas ? 'Ningún capítulo con alertas.' : 'Ningún capítulo.') + '</div>')
      : csVacio());
}

function csHtmlHerramienta(sec){
  return '<div class="cs-cab"><div class="cs-cab-t"><h2>' + csEsc(sec.t) + '</h2><div class="cs-cab-sub">Herramienta de DublajeCast</div></div></div>'
    + '<div class="cs-herr"><span class="cs-herr-ic">' + csIco(sec.v, 26) + '</span><div><p>' + csEsc(sec.dice) + '</p>'
    + '<p class="cs-tenue">Esta herramienta procesa archivos y todavía es la de DublajeCast: se abre con todas sus funciones, y al volver sigues aquí.</p>'
    + '<button class="cs-b cs-pri" data-cs="herramienta" data-v="' + csEsc(sec.dc) + '">' + csIco('externo', 14) + '<span>Abrir ' + csEsc(sec.t) + '</span></button></div></div>';
}

/* ── El casting y el reparto de un programa, importar y editar ─────────────
   Pedido de sala: «quiero que importes todos los programas de DublajeCast;
   también que se pueda ver el casting, el reparto y los episodios, y que se
   puedan hacer todas las funciones que se hacían en DublajeCast». */

/** Todas las filas del casting de un programa: cada personaje de cada episodio. */
function csFilasPrograma(eps, d, registro){
  const out = [];
  for(const e of eps) for(const f of csCastingDe(e, d, registro)) out.push(Object.assign({ e: e }, f));
  return out;
}

/** Las filas del casting, buscadas (personaje o talento) y ordenadas como en DublajeCast. */
function csOrdenarCasting(filas, orden, buscar){
  const q = castNorm(buscar);
  const l = q ? filas.filter(f => castNorm(f.personaje).indexOf(q) >= 0 || castNorm(f.talento).indexOf(q) >= 0) : filas.slice();
  const num = (f) => (f.e && f.e.numero != null) ? f.e.numero : 1e9;
  const nom = (a, b) => a.personaje.localeCompare(b.personaje, 'es');
  const cmp = {
    personaje: (a, b) => nom(a, b) || num(a) - num(b),
    principal: (a, b) => (b.principal - a.principal) || num(a) - num(b) || nom(a, b),
    lineas:    (a, b) => (b.lineas - a.lineas) || num(a) - num(b) || nom(a, b)
  }[orden] || ((a, b) => num(a) - num(b) || (b.lineas - a.lineas) || nom(a, b));
  return l.sort(cmp);
}

/** Episodios seguidos, dichos en corto: [1,2,3,5] → «1–3, 5». */
function csTramoTexto(eps){
  const n = (eps || []).map(x => parseInt(x, 10)).filter(x => isFinite(x)).sort((a, b) => a - b);
  const out = [];
  for(let i = 0; i < n.length;){
    let j = i;
    while(j + 1 < n.length && n[j + 1] === n[j] + 1) j++;
    out.push(i === j ? String(n[i]) : n[i] + '–' + n[j]);
    i = j + 1;
  }
  return out.join(', ');
}

/**
 * El reparto de un programa, como el de DublajeCast: cada personaje que sale,
 * con su talento por tramos de episodios (un relevo se ve: «ANA 1–3 → LUZ 4»),
 * en cuántos episodios sale y cuántas líneas tiene. Principales primero.
 */
function csReparto(p, d){
  if(!d || !p || !p.serie) return [];
  const ix = prodIndices(d);
  const eps = p.dcEps.slice().sort((a, b) => (parseInt(a.episode_number, 10) || 0) - (parseInt(b.episode_number, 10) || 0));
  const por = {};
  for(const e of eps){
    const tal = {};
    for(const c of (ix.castingsPorEp[String(e.id)] || [])) tal[String(c.character_id)] = ix.talent[String(c.talent_id)] || null;
    for(const a of (ix.aparicionesPorEp[String(e.id)] || [])){
      const ch = ix.char[String(a.character_id)];
      if(!ch || !ch.name) continue;
      const k = String(ch.id);
      const r = (por[k] = por[k] || { charId: ch.id, personaje: ch.name, principal: ch.tipo === 'principal', episodios: 0, lineas: 0, tramos: [] });
      r.episodios++; r.lineas += (+a.line_count || 0);
      const t = tal[k] || null, nombre = t ? t.name : '';
      const ult = r.tramos[r.tramos.length - 1];
      if(ult && ult.talento === nombre) ult.eps.push(e.episode_number);
      else r.tramos.push({ talento: nombre, talentoId: t ? t.id : null, eps: [e.episode_number] });
    }
  }
  return Object.keys(por).map(k => por[k])
    .sort((a, b) => (b.principal - a.principal) || (b.lineas - a.lineas) || a.personaje.localeCompare(b.personaje, 'es'));
}

/** El nombre con que se crea en Dubbipt un episodio de DublajeCast: «Episodio N», o su título si el número se repite. */
function csNombreEpisodio(dcEp, serie, dcEps){
  if(serie && serie.type === 'pelicula') return 'Película';
  const n = parseInt(dcEp.episode_number, 10);
  const repetido = (dcEps || []).filter(e => parseInt(e.episode_number, 10) === n).length > 1;
  if(isFinite(n) && !repetido) return 'Episodio ' + n;
  return dcEp.title || ('Episodio ' + (isFinite(n) ? n : ''));
}

/** Lo que falta en Dubbipt de DublajeCast: programas enteros, y episodios de los que ya están. */
function csPlanImportar(lista){
  const plan = { programas: [], episodios: [] };
  for(const p of lista){
    if(!p.serie) continue;
    if(!p.show){
      const eps = p.dcEps.slice().sort((a, b) => (parseInt(a.episode_number, 10) || 0) - (parseInt(b.episode_number, 10) || 0));
      plan.programas.push({ nombre: p.serie.name, eps: eps.map(e => csNombreEpisodio(e, p.serie, p.dcEps)) });
      continue;
    }
    for(const e of csEpisodios(p)) if(!e.ep && e.dcEp) plan.episodios.push({ showId: p.show.id, programa: p.nombre, nombre: csNombreEpisodio(e.dcEp, p.serie, p.dcEps) });
  }
  return plan;
}

/**
 * Importar de DublajeCast: crea en Dubbipt los programas y los episodios que
 * solo están allí, sin libreto -se sube al abrir cada uno-. Pregunta antes,
 * con la cuenta delante; lo que ya está no se toca.
 */
async function csImportarTodo(){
  if(!WORKSPACE || !WORKSPACE.id){ castAviso('Elige primero un espacio de trabajo'); return 'sin-espacio'; }
  const plan = csPlanImportar(csActual().lista);
  const nEps = plan.programas.reduce((s, x) => s + x.eps.length, 0) + plan.episodios.length;
  if(!plan.programas.length && !plan.episodios.length){ castAviso('Ya está todo: cada programa y cada episodio de DublajeCast está en Dubbipt'); return 'nada'; }
  const ok = await DDL_UI.confirmModal({
    title: 'Importar de DublajeCast',
    body: 'Se crean en Dubbipt ' + plan.programas.length + ' programa' + (plan.programas.length === 1 ? '' : 's') + ' y ' + nEps + ' episodio' + (nEps === 1 ? '' : 's')
        + ', sin libreto: el libreto se sube al abrir cada uno. Lo que ya está en Dubbipt no se toca.',
    items: plan.programas.slice(0, 8).map(x => ({ label: x.nombre, meta: x.eps.length + ' episodio' + (x.eps.length === 1 ? '' : 's') }))
      .concat(plan.episodios.length ? [{ label: 'En programas que ya están', meta: plan.episodios.length + ' episodio' + (plan.episodios.length === 1 ? '' : 's') }] : []),
    confirmLabel: 'Importar', cancelLabel: 'Cancelar'
  });
  if(!ok) return 'cancelado';
  const ahora = () => new Date().toISOString();
  let progs = 0, eps = 0;
  try{
    for(const x of plan.programas){
      const r = await sb.from('shows').insert({ name: x.nombre, workspace_id: WORKSPACE.id }).select().single();
      if(r.error) throw new Error('«' + x.nombre + '»: ' + r.error.message);
      progs++;
      if(x.eps.length){
        const filas = x.eps.map(n => ({ id: uid(), show_id: r.data.id, name: n, updated_at: ahora() }));
        const r2 = await sb.from('episodes').upsert(filas);
        if(r2.error) throw new Error('los episodios de «' + x.nombre + '»: ' + r2.error.message);
        eps += filas.length;
      }
    }
    if(plan.episodios.length){
      const filas = plan.episodios.map(x => ({ id: uid(), show_id: x.showId, name: x.nombre, updated_at: ahora() }));
      const r3 = await sb.from('episodes').upsert(filas);
      if(r3.error) throw new Error('los episodios: ' + r3.error.message);
      eps += filas.length;
    }
  }catch(e){
    castAviso('La importación se quedó a medias (' + progs + ' programas, ' + eps + ' episodios): ' + (e && e.message ? e.message : e));
    try{ await libFetchAll(); }catch(x){ /* se verá al recargar */ }
    csRepintar();
    return 'error';
  }
  try{ await libFetchAll(); }catch(x){ /* se verá al recargar */ }
  csRepintar();
  castAviso('Importado de DublajeCast: ' + progs + ' programa' + (progs === 1 ? '' : 's') + ' y ' + eps + ' episodio' + (eps === 1 ? '' : 's'));
  return 'hecho';
}

/** Guardar un cambio en DublajeCast, decir cómo fue y repintar. Sin sesión, se abre la entrada. */
function csEditar(cambio, hecho, ctx){
  return (async () => {
    try{
      const r = await dcxGuardar(cambio, hecho ? dcxEntrada(hecho, ctx) : null);
      if(r.cambiado && hecho) castAviso(hecho);
      csRepintar();
      return r.cambiado ? 'guardado' : 'igual';
    }catch(e){
      if(e && e.sinSesion){
        castAviso('Para guardar en DublajeCast, entra con tu cuenta de DublajeCast');
        try{ dcPanel(); }catch(x){ /* sin el panel, el aviso ya lo dice */ }
        return 'sesion';
      }
      castAviso('No se pudo guardar en DublajeCast: ' + (e && e.message ? e.message : e));
      csRepintar();
      return 'error';
    }
  })();
}

/* ── Nombres, el cambiador de talento y quién cambió qué ────────────────────
   Pedido de sala: «que se pueda editar cada nombre y cada episodio de los
   programas, que en cada episodio o cada programa haya un cambiador de
   talento, que quede registrado quién cambió». */

/** Dónde ocurre un cambio, para apuntarlo: el programa y el episodio, con sus ids de los dos lados. */
function csContexto(p, e){
  return {
    programa: p ? p.nombre : '', serieId: (p && p.serie) ? p.serie.id : null, showId: (p && p.show) ? p.show.id : null,
    episodio: e ? ((e.numero != null ? 'Ep. ' + e.numero + ' · ' : '') + e.titulo) : '',
    dcEpId: (e && e.dcEp) ? e.dcEp.id : null, epId: (e && e.ep) ? e.ep.id : null
  };
}

/** Los apuntes de un programa, o de un episodio, por sus ids (aunque luego cambie el nombre). */
function csHistorialDe(p, e){
  const mismo = (a, b) => a != null && b != null && String(a) === String(b);
  return dcxHistorial().filter(x => e
    ? ((e.dcEp && mismo(x.dcEpId, e.dcEp.id)) || (e.ep && mismo(x.epId, e.ep.id)))
    : ((p.serie && mismo(x.serieId, p.serie.id)) || (p.show && mismo(x.showId, p.show.id))));
}

/** «8/10/2026 14:05». */
function csFechaHora(iso){
  const d = new Date(iso);
  if(isNaN(d.getTime())) return '';
  return d.toLocaleDateString('es') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
}

/** La lista de cambios: cuándo, quién y qué; con `donde`, también en qué programa y episodio. */
function csHtmlHistorial(lista, donde, cuantos){
  if(!lista.length) return '<div class="cs-nada">Todavía no hay cambios apuntados.</div>';
  return '<div class="cs-hist">' + lista.slice(0, cuantos || 50).map(x => '<div class="cs-hist-f">'
      + '<span class="cs-tenue">' + csEsc(csFechaHora(x.cuando)) + '</span><b>' + csEsc(x.quien) + '</b>'
      + '<span>' + csEsc(x.que) + (donde && (x.programa || x.episodio) ? ' <i class="cs-tenue">· ' + csEsc([x.programa, x.episodio].filter(Boolean).join(' · ')) + '</i>' : '') + '</span>'
      + '</div>').join('') + '</div>';
}

/** Los talentos que hay en unos episodios de DublajeCast, con cuántas asignaciones tiene cada uno. */
function csTalentosEn(d, dcEpIds){
  if(!d) return [];
  const eps = new Set((dcEpIds || []).map(String));
  const ix = prodIndices(d);
  const n = {};
  for(const c of d.castings) if(eps.has(String(c.episode_id))) n[String(c.talent_id)] = (n[String(c.talent_id)] || 0) + 1;
  return Object.keys(n).map(id => ({ id: (ix.talent[id] || {}).id, name: (ix.talent[id] || {}).name, n: n[id] }))
    .filter(t => t.name).sort((a, b) => a.name.localeCompare(b.name, 'es'));
}

/** El cambiador de talento: de uno de los que hay, a otro (de la base o nuevo). */
function csCambiadorHtml(talentos, ambito){
  if(!talentos.length) return '';
  return '<div class="cs-cambiador"><span class="cs-cambiador-t">' + csIco('traer', 14) + 'Cambiar talento ' + (ambito === 'programa' ? 'en todo el programa' : 'en este episodio') + '</span>'
    + '<select id="csCambiaDe">' + talentos.map(t => '<option value="' + csEsc(t.id) + '">' + csEsc(t.name) + ' (' + t.n + ')</option>').join('') + '</select>'
    + '<span class="cs-tenue">por</span><input id="csCambiaA" class="cs-tal-in" list="csListaTalentos" placeholder="Nuevo talento…">'
    + '<button class="cs-b cs-pri" data-cs="cambiar" data-ambito="' + ambito + '">Cambiar</button></div>';
}

/**
 * Renombrar un programa. Si está en los dos lados, en los dos -se casan por
 * el nombre-: primero en DublajeCast, luego en Dubbipt. Se apunta.
 */
async function csRenombrarPrograma(p, nombre){
  nombre = String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').trim();
  if(!p || !nombre || nombre === p.nombre) return 'igual';
  const ctx = csContexto(p, null), que = 'Programa renombrado: «' + p.nombre + '» → «' + nombre + '»';
  if(p.serie){
    const r = await csEditar(pl => dcxSerie(pl, p.serie.id, { name: nombre }), que, ctx);
    if(r !== 'guardado' && r !== 'igual') return r;
  }
  if(p.show){
    const { error } = await sb.from('shows').update({ name: nombre }).eq('id', p.show.id);
    if(error){ castAviso('No se pudo renombrar en Dubbipt: ' + error.message); return 'error'; }
    if(!p.serie){ dcxRegistrar(dcxEntrada(que, ctx)); castAviso(que); }
    try{ await libFetchAll(); }catch(e){ /* se verá al recargar */ }
    csRepintar();
  }
  return 'guardado';
}

/** Renombrar un episodio en Dubbipt. Se apunta. */
async function csRenombrarEpisodio(p, e, nombre){
  nombre = String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').trim();
  if(!e || !e.ep || !nombre || nombre === e.ep.name) return 'igual';
  const { error } = await sb.from('episodes').update({ name: nombre }).eq('id', e.ep.id);
  if(error){ castAviso('No se pudo renombrar el episodio: ' + error.message); return 'error'; }
  const que = 'Episodio renombrado en Dubbipt: «' + e.ep.name + '» → «' + nombre + '»';
  dcxRegistrar(dcxEntrada(que, csContexto(p, e)));
  castAviso(que);
  try{ await libFetchAll(); }catch(x){ /* se verá al recargar */ }
  csRepintar();
  return 'guardado';
}

/* ── Capítulos repetidos y personajes con dos talentos: lo que se pregunta ──
   Pedido de sala: «también quiero que fusiones los capítulos repetidos y que
   me preguntes si hay alguna inconsistencia de que un personaje tenga dos
   talentos diferentes». */

/** Lo que tiene un capítulo de DublajeCast: personajes y talentos. Para saber cuál se queda al fusionar. */
function csPesoEpisodio(d, epId){
  return d.appearances.filter(a => String(a.episode_id) === String(epId)).length + d.castings.filter(c => String(c.episode_id) === String(epId)).length;
}

/** Los capítulos repetidos de un programa en DublajeCast: mismo número. Se queda el que más tiene. */
function csRepetidosDc(p, d){
  if(!d || !p || !p.serie || p.serie.type === 'pelicula') return [];
  const por = {};
  for(const e of p.dcEps){
    const n = parseInt(e.episode_number, 10);
    if(!isFinite(n)) continue;
    (por[n] = por[n] || []).push(e);
  }
  return Object.keys(por).filter(n => por[n].length > 1).map(n => {
    const eps = por[n].slice().sort((a, b) => (csPesoEpisodio(d, b.id) - csPesoEpisodio(d, a.id)) || (String(a.id) < String(b.id) ? -1 : 1));
    return { numero: Number(n), keep: eps[0], dups: eps.slice(1) };
  }).sort((a, b) => a.numero - b.numero);
}

/** Los repetidos en Dubbipt: capítulos del mismo programa con el mismo número en el nombre. */
function csRepetidosDub(p, hay){
  if(!p || !p.show) return [];
  const por = {};
  for(const ep of p.eps){
    const n = csNumeroDe(ep.name);
    if(!isFinite(n)) continue;
    (por[n] = por[n] || []).push(ep);
  }
  return Object.keys(por).filter(n => por[n].length > 1).map(n => {
    const eps = por[n], con = eps.filter(ep => hay(ep.id));
    /* Se pueden quitar los vacíos si a lo sumo uno tiene libreto: se queda ese, o el primero. */
    const queda = con.length ? con[0] : eps[0];
    return { numero: Number(n), eps: eps, conLibreto: con.length, queda: queda, vacios: con.length <= 1 ? eps.filter(ep => ep !== queda) : [] };
  }).sort((a, b) => a.numero - b.numero);
}

/** La clave de un relevo aceptado: el programa, el personaje y los talentos que tiene. */
function csClaveRelevo(serieId, r){
  return String(serieId) + ':' + String(r.charId) + ':' + r.tramos.filter(t => t.talentoId != null).map(t => String(t.talentoId)).filter((x, i, l) => l.indexOf(x) === i).sort().join(',');
}

/** Los personajes de un programa con más de un talento, que nadie ha dicho todavía que sea a propósito. */
function csInconsistencias(p, d){
  if(!p || !p.serie) return [];
  const aceptados = dcxRelevosAceptados();
  return csReparto(p, d).map(r => {
    const tal = {};
    for(const t of r.tramos) if(t.talento){ const k = String(t.talentoId); (tal[k] = tal[k] || { id: t.talentoId, nombre: t.talento, eps: [] }).eps = tal[k].eps.concat(t.eps); }
    return Object.assign({}, r, { talentos: Object.keys(tal).map(k => tal[k]), clave: csClaveRelevo(p.serie.id, r) });
  }).filter(r => r.talentos.length > 1 && aceptados.indexOf(r.clave) < 0);
}

/** El panel «Para revisar» de un programa: los repetidos y los personajes con dos talentos, preguntando qué hacer con cada uno. */
function csHtmlRevisar(p, d, hay){
  const repDc = csRepetidosDc(p, d), repDub = csRepetidosDub(p, hay), inc = csInconsistencias(p, d);
  if(!repDc.length && !repDub.length && !inc.length) return '';
  const ix = d ? prodIndices(d) : null;
  const tit = (e) => 'Ep. ' + e.episode_number + (e.title ? ' · ' + e.title : '');
  let h = '<div class="cs-revisar"><div class="cs-caja-t">' + csIco('aviso', 14) + 'Para revisar</div>';
  for(const g of repDc){
    if(CS.fusion === g.numero){
      const conflictos = dcxConflictosFusion(d, g.keep.id, g.dups.map(e => e.id));
      h += '<div class="cs-rev cs-rev-abierto"><div><b>Fusionar el Ep. ' + g.numero + '</b></div>'
        + '<div class="cs-tenue">Se queda <b>' + csEsc(tit(g.keep)) + '</b> (' + csPesoEpisodio(d, g.keep.id) + ' registros). Pasan a él los personajes, las líneas y los talentos de '
        + g.dups.map(e => '<b>' + csEsc(tit(e)) + '</b>').join(', ') + ', que van a la papelera de DublajeCast.</div>'
        + (conflictos.length ? '<div class="cs-rev-preg">Estos personajes tienen talentos distintos en los repetidos. ¿Cuál vale?</div>'
            + conflictos.map(cf => {
                const per = (ix.char[String(cf.charId)] || {}).name || 'Personaje';
                const elegido = CS.elegidos[String(cf.charId)] != null ? String(CS.elegidos[String(cf.charId)]) : String(cf.opciones[0]);
                return '<div class="cs-rev-op"><b>' + csEsc(per) + '</b>' + cf.opciones.map(tid => '<label><input type="radio" name="csEl' + csEsc(cf.charId) + '" data-cs="elegir" data-ch="' + csEsc(cf.charId) + '" value="' + csEsc(tid) + '"' + (String(tid) === elegido ? ' checked' : '') + '> '
                  + csEsc((ix.talent[String(tid)] || {}).name || '?') + '</label>').join('') + '</div>';
              }).join('')
          : '')
        + '<div class="cs-rev-btns"><button class="cs-b cs-pri" data-cs="fusionarYa" data-v="' + g.numero + '">Fusionar</button><button class="cs-b" data-cs="fusionCancelar">Cancelar</button></div></div>';
    } else {
      h += '<div class="cs-rev"><span>El <b>Ep. ' + g.numero + '</b> está ' + (g.dups.length + 1) + ' veces en DublajeCast: ' + [g.keep].concat(g.dups).map(e => csEsc(tit(e))).join(' · ') + '</span>'
        + '<button class="cs-b" data-cs="fusionar" data-v="' + g.numero + '">Fusionar</button></div>';
    }
  }
  for(const g of repDub){
    h += '<div class="cs-rev"><span>El <b>Ep. ' + g.numero + '</b> está ' + g.eps.length + ' veces en Dubbipt: ' + g.eps.map(ep => csEsc(ep.name) + (hay(ep.id) ? ' (con libreto)' : ' (vacío)')).join(' · ') + '</span>'
      + (g.vacios.length ? '<button class="cs-b" data-cs="quitarVacios" data-v="' + g.numero + '">Quitar ' + (g.vacios.length === 1 ? 'el vacío' : 'los vacíos') + '</button>'
                         : '<span class="cs-tenue">Tienen libreto los dos: revísalos a mano.</span>') + '</div>';
  }
  for(const r of inc){
    h += '<div class="cs-rev"><span><b>' + csEsc(r.personaje) + '</b> tiene ' + r.talentos.length + ' talentos: '
      + r.talentos.map(t => '<b class="cs-talento">' + csEsc(t.nombre) + '</b> <i class="cs-tenue">Ep. ' + csTramoTexto(t.eps) + '</i>').join(' · ') + '. ¿Cuál vale?</span>'
      + '<span class="cs-rev-btns">' + r.talentos.map(t => '<button class="cs-b" data-cs="usarTalento" data-ch="' + csEsc(r.charId) + '" data-per="' + csEsc(r.personaje) + '" data-tal="' + csEsc(t.nombre) + '">' + csEsc(t.nombre) + ' en todos</button>').join('')
      + '<button class="cs-b" data-cs="aceptarRelevo" data-ch="' + csEsc(r.charId) + '" data-per="' + csEsc(r.personaje) + '" data-clave="' + csEsc(r.clave) + '" title="Es un cambio de voz a propósito: no se vuelve a preguntar">Es un relevo, dejarlo así</button></span></div>';
  }
  return h + '</div>';
}

/** Para el Dashboard: los programas que tienen algo que revisar. */
function csPorRevisar(lista, d, hay){
  return lista.map(p => ({ p: p, repetidos: csRepetidosDc(p, d).length + csRepetidosDub(p, hay).length, inconsistencias: csInconsistencias(p, d).length }))
    .filter(x => x.repetidos || x.inconsistencias);
}

/** Quitar en Dubbipt los capítulos repetidos vacíos (sin libreto), preguntando antes. */
async function csQuitarVacios(p, numero, hay){
  const g = csRepetidosDub(p, hay).find(x => x.numero === numero);
  if(!g || !g.vacios.length) return 'nada';
  const ok = await DDL_UI.confirmModal({ title: 'Quitar capítulos vacíos', body: 'Se quedan «' + g.queda.name + '» y se quitan de Dubbipt ' + g.vacios.map(ep => '«' + ep.name + '»').join(', ') + ', que no tienen libreto.', confirmLabel: 'Quitar', cancelLabel: 'Cancelar', danger: true });
  if(!ok) return 'cancelado';
  for(const ep of g.vacios){
    const { error } = await sb.from('episodes').delete().eq('id', ep.id);
    if(error){ castAviso('No se pudo quitar «' + ep.name + '»: ' + error.message); return 'error'; }
  }
  const que = 'Quitados los repetidos vacíos del Ep. ' + numero + ': ' + g.vacios.map(ep => ep.name).join(', ');
  dcxRegistrar(dcxEntrada(que, csContexto(p, null)));
  castAviso(que);
  try{ await libFetchAll(); }catch(e){ /* se verá al recargar */ }
  csRepintar();
  return 'hecho';
}

/** Los controles del panel «Para revisar». */
function csCablearMas(el, que, v, at, id, a){
  if(que === 'fusionar') el.onclick = () => { CS.fusion = Number(v); CS.elegidos = {}; csRepintar(); };
  else if(que === 'fusionCancelar') el.onclick = () => { CS.fusion = null; CS.elegidos = {}; csRepintar(); };
  else if(que === 'elegir') el.onchange = () => { CS.elegidos[String(at('ch'))] = id(el.value); };
  else if(que === 'fusionarYa') el.onclick = () => {
    const x = a(), numero = Number(v);
    const g = csRepetidosDc(x.p, x.datos).find(r => r.numero === numero);
    if(!g) return;
    const keep = g.keep.id, dups = g.dups.map(e => e.id), elegidos = Object.assign({}, CS.elegidos);
    CS.fusion = null; CS.elegidos = {};
    csEditar(pl => dcxFusionarEpisodios(pl, keep, dups, elegidos), 'Fusionado el Ep. ' + numero + ': ' + (g.dups.length + 1) + ' capítulos repetidos en uno', csContexto(x.p, null));
  };
  else if(que === 'quitarVacios') el.onclick = () => {
    const x = a();
    csQuitarVacios(x.p, Number(v), (eid) => !!(LDB.dataEps && LDB.dataEps.has(eid))).catch(err => fallo('csQuitarVacios · js/castingvistas.js', err, 'no se han podido quitar'));
  };
  else if(que === 'usarTalento') el.onclick = () => {
    const x = a(), ch = id(at('ch')), nombre = at('tal');
    if(!x.p || !x.p.serie) return;
    csEditar(pl => dcxReasignar(pl, x.p.serie.id, ch, null, nombre), (at('per') || 'Personaje') + ': ' + nombre + ' en todos sus episodios (tenía dos talentos)', csContexto(x.p, null));
  };
  else if(que === 'devolver') el.onclick = () => { csDevolverCopia(v).catch(err => fallo('csDevolverCopia · js/castingvistas.js', err, 'no se ha podido devolver')); };
  else if(que === 'bajarCopia') el.onclick = () => { csBajarCopia(v); };
  else if(que === 'aceptarRelevo') el.onclick = () => {
    const x = a();
    if(!dcxAceptarRelevo(at('clave'))) return;
    const que2 = (at('per') || 'Personaje') + ': relevo aceptado, se deja con sus dos talentos';
    dcxRegistrar(dcxEntrada(que2, csContexto(x.p, null)));
    castAviso(que2);
    csRepintar();
  };
}

/* ── Que no se borre nada ───────────────────────────────────────────────
   Pedido de sala: «trae todos los datos de DublajeCast y que no se borren».
   Al entrar en Casting se carga lo guardado en Dubbipt y, si hay sesión de
   DublajeCast, se trae lo último sin preguntar. Lo que desaparezca allí
   queda en una copia, y desde el Dashboard se devuelve. */

const CS_TRAER_CADA = 120000;                 // como mucho, una vez cada dos minutos
const CS_TRAER = { yendo: false, ultima: 0 };

/** Carga lo guardado y trae lo último de DublajeCast, en segundo plano. Repinta si cambió algo. */
function csAsegurarDatos(){
  if(!prodPuede() || CS_TRAER.yendo) return false;
  const falta = !PROD.cargado || PROD.ws !== prodWs();
  if(!falta && Date.now() - CS_TRAER.ultima < CS_TRAER_CADA) return false;
  CS_TRAER.yendo = true; CS_TRAER.ultima = Date.now();
  return (async () => {
    let cambio = false;
    try{ if(falta){ await prodCargar(); cambio = !!PROD.datos; } }catch(e){ fallo('prodCargar · js/castingvistas.js:csAsegurarDatos', e); }
    const antes = (CS.copias || []).length;
    try{ if(await prodSincronizar()) cambio = true; }catch(e){ /* sin DublajeCast ahora: queda lo guardado */ }
    try{ CS.copias = await prodCopias(); }catch(e){ CS.copias = []; }
    const nueva = CS.copias.length > antes && CS.copias[0] && !CS.copias[0].devuelta && (Date.now() - CS.copias[0].cuando < CS_TRAER_CADA);
    if(nueva) castAviso('En DublajeCast faltan ' + prodPerdidoTexto(CS.copias[0].por) + ' que antes estaban. Dubbipt guardó una copia: se puede devolver desde el Dashboard de Casting');
    CS_TRAER.yendo = false;
    if(cambio || nueva || CS.copias.length !== antes) csRepintar();
    return cambio;
  })();
}

/** Devuelve a DublajeCast lo que tenía una copia y ya no está. Pregunta antes. */
async function csDevolverCopia(id){
  const c = (CS.copias || []).find(x => String(x.id) === String(id));
  if(!c) return 'no hay';
  const texto = prodPerdidoTexto(c.por);
  const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal)
    ? await DDL_UI.confirmModal({ title: 'Devolver a DublajeCast', body: 'Vuelve a DublajeCast lo que tenía la copia del ' + csFechaHora(new Date(c.cuando).toISOString()) + ' y ya no está (' + texto + '). Lo que hay ahora no se toca.', confirmLabel: 'Devolver', cancelLabel: 'Cancelar' })
    : true;
  if(!ok) return 'cancelado';
  let n = 0;
  const r = await csEditar(pl => { n = prodRecuperar(pl, c.datos); return n > 0; }, 'Devuelto a DublajeCast lo que se había borrado (' + texto + ')', {});
  if(r === 'guardado' || r === 'igual'){
    await prodCopiaDevuelta(c.id, n);
    try{ CS.copias = await prodCopias(); }catch(e){ /* se verá al recargar */ }
    if(r === 'igual') castAviso('Ya estaba todo en DublajeCast: no faltaba nada');
    csRepintar();
  }
  return r;
}

/** Baja una copia en el formato de DublajeCast, que la sabe importar. */
function csBajarCopia(id){
  const c = (CS.copias || []).find(x => String(x.id) === String(id));
  if(!c) return false;
  const json = JSON.stringify(Object.assign({ _version: 'dublajecast_v2', _exportedAt: new Date(c.cuando).toISOString(), _de: 'Dubbipt' }, c.datos), null, 2);
  ioDescargar('dublajecast_copia_' + new Date(c.cuando).toISOString().slice(0, 10) + '.json', json, 'application/json');
  return true;
}

/* ── Lo que se edita: celdas y controles ────────────────────────────────── */

/** La lista de talentos para elegir al escribir. */
function csListaTalentos(d){
  if(!d) return '';
  return '<datalist id="csListaTalentos">' + d.talents.filter(t => t.name).map(t => '<option value="' + csEsc(t.name) + '">').join('') + '</datalist>';
}

/**
 * La celda del talento: editable cuando el personaje y el episodio están en
 * DublajeCast (se guarda allí); si no, el texto. Si Dubbipt dice otro, se ve.
 */
function csTalentoCelda(f, dcEp){
  const nota = (f.choca ? ' <small class="cs-aviso" title="En el registro de Dubbipt pone otro talento: al realizar el casting manda el de Dubbipt">' + csIco('aviso', 12) + 'en Dubbipt: ' + csEsc(f.dubbipt) + '</small>'
             : (!f.dc && f.dubbipt ? ' <small class="cs-tenue">de Dubbipt</small>' : ''));
  if(dcEp && f.charId != null)
    return '<input class="cs-tal-in" list="csListaTalentos" data-cs="talento" data-ep="' + csEsc(dcEp.id) + '" data-ch="' + csEsc(f.charId) + '" data-per="' + csEsc(f.personaje) + '" data-antes="' + csEsc(f.dc || '') + '" value="' + csEsc(f.dc || '') + '" placeholder="Asignar…">' + nota;
  return '<span class="cs-talento">' + (f.talento ? csEsc(f.talento) : 'sin asignar') + '</span>' + nota;
}

function csSelect(campo, valor, opciones, extra){
  return '<select data-cs="' + (extra && extra.cs || 'epCampo') + '" data-campo="' + campo + '"' + (extra && extra.id != null ? ' data-id="' + csEsc(extra.id) + '"' : '') + '>'
    + opciones.map(o => '<option value="' + csEsc(o[0]) + '"' + (String(valor == null ? '' : valor) === String(o[0]) ? ' selected' : '') + '>' + csEsc(o[1]) + '</option>').join('') + '</select>';
}
const CS_OP_ESTADO = [['pendiente', 'Pendiente de revisión'], ['en_curso', 'En curso'], ['completo', 'Completado']];
const CS_OP_FASE = [['', '—'], ['pre_produccion', 'Preproducción'], ['produccion_activa', 'En producción'], ['completado', 'Finalizado']];
const CS_OP_FORMATO = [['', 'Según el cliente'], ['BACKLOT', 'BACKLOT'], ['Excel', 'Excel'], ['No necesita DUBCARD', 'No necesita DUBCARD']];
const CS_OP_GENERO = [['', '—'], ['masculino', 'Masculino'], ['femenino', 'Femenino'], ['no_binario', 'No binario']];
const CS_OP_EDAD = [['', '—'], ['niño', 'Niño'], ['adolescente', 'Adolescente'], ['adulto', 'Adulto'], ['mayor', 'Mayor']];
const CS_OP_TONO = [['', '—'], ['grave', 'Grave'], ['medio', 'Medio'], ['agudo', 'Agudo']];

/* ── Programas, programa y episodio: lo que se pinta ─────────────────────── */

const CS_ESTADO = { en_curso: 'En curso', completo: 'Completado', pendiente: 'Pendiente' };

function csHtmlProgramas(lista, vivo){
  const vistos = csFiltrarProgramas(lista, CS.filtro, CS.buscarProg);
  const cuenta = (f) => lista.filter(p => f === 'todos' || p.estado === f).length;
  const pest = (k, t) => '<button class="cs-pest' + (CS.filtro === k ? ' on' : '') + '" data-cs="filtro" data-v="' + k + '">' + t + ' <b>' + cuenta(k) + '</b></button>';
  const plan = csPlanImportar(lista);
  const nProg = plan.programas.length, nEps = plan.programas.reduce((s, x) => s + x.eps.length, 0) + plan.episodios.length;
  return '<div class="cs-cab"><div class="cs-cab-t"><h2>Programas</h2><div class="cs-cab-sub">' + vistos.length + ' de ' + lista.length + '</div></div>'
    + '<span class="cs-de">' + (vivo ? 'DublajeCast en vivo' : (PROD.datos ? 'Con los datos de DublajeCast' : 'Sin datos de DublajeCast')) + '</span>'
    + '<div class="cs-cab-btns">'
    +   (nProg || nEps ? '<button class="cs-b" data-cs="importarTodo" title="Crea en Dubbipt los programas y episodios que solo están en DublajeCast">' + csIco('bajar', 14)
          + '<span>Importar de DublajeCast</span><b class="cs-cuenta">' + (nProg ? nProg + ' prog. · ' : '') + nEps + ' ep.</b></button>' : '')
    +   '<button class="cs-b" data-cs="herramientas" title="Herramientas que no dependen de ningún capítulo">' + csIco('dubcards', 14) + '<span>Herramientas</span></button>'
    +   '<button class="cs-b cs-pri" data-cs="nuevoPrograma">' + csIco('mas', 14) + '<span>Nuevo</span></button>'
    + '</div></div>'
    + '<div class="cs-filtros"><label class="cs-buscar cs-buscar-prog">' + csIco('buscar', 14)
    +   '<input type="text" data-cs="buscarProg" placeholder="Buscar programa, cliente o director…" value="' + csEsc(CS.buscarProg) + '"></label>'
    +   '<div class="cs-pests">' + pest('todos', 'Todos') + pest('en_curso', 'En curso') + pest('completo', 'Completados') + '</div></div>'
    + (vistos.length ? '<div class="cs-progs">' + vistos.map(p => {
        const n = csEpisodios(p).length;
        return '<div class="cs-prog' + (p.estado === 'completo' ? ' cs-prog-hecho' : '') + '">'
          + '<div class="cs-prog-t"><b>' + csEsc(p.nombre) + '</b>' + (p.tipo ? '<span class="cs-tenue">' + csEsc(p.tipo) + '</span>' : '') + '</div>'
          + '<div class="cs-prog-chips">' + csChip(CS_ESTADO[p.estado] || p.estado, p.estado === 'completo' ? 'hecho' : 'ok')
          +   (p.cliente ? '<span class="cs-etq">' + csEsc(p.cliente) + '</span>' : '')
          +   (!p.show ? '<span class="cs-etq cs-etq-dc">Solo en DublajeCast</span>' : (!p.serie ? '<span class="cs-etq">Solo en Dubbipt</span>' : '')) + '</div>'
          + (p.director ? '<div class="cs-tenue">Dir: ' + csEsc(p.director) + '</div>' : '')
          + '<div class="cs-prog-n">' + n + ' episodio' + (n === 1 ? '' : 's') + '</div>'
          + '<button class="cs-b cs-pri cs-prog-abrir" data-cs="abrirProg" data-v="' + csEsc(p.clave) + '">Abrir</button>'
          + '</div>';
      }).join('') + '</div>'
      : '<div class="cs-nada">' + (CS.buscarProg ? 'Ningún programa coincide con «' + csEsc(CS.buscarProg) + '».' : 'No hay programas.') + '</div>');
}

function csHtmlPrograma(p, eps, d, registro, hayLibreto){
  const filasCast = csFilasPrograma(eps, d, registro);
  const reparto = csReparto(p, d);
  const historial = csHistorialDe(p, null);
  const pest = (k, t, n) => '<button class="cs-pest' + (CS.tab === k ? ' on' : '') + '" data-cs="tab" data-v="' + k + '">' + t + ' <b>' + n + '</b></button>';
  let cuerpo;
  if(CS.tab === 'casting') cuerpo = csHtmlCastingPrograma(filasCast);
  else if(CS.tab === 'reparto') cuerpo = csHtmlReparto(p, reparto);
  else if(CS.tab === 'historial') cuerpo = csHtmlHistorial(historial, true, 200);
  else cuerpo = eps.length ? '<div class="cs-eps">' + eps.map(e => {
      const c = csCastingDe(e, d, registro);
      const con = c.filter(f => f.talento).length, choques = c.filter(f => f.choca).length;
      const fase = e.dcEp && e.dcEp.fase ? (PROD_ET.fase[e.dcEp.fase] || e.dcEp.fase) : '';
      return '<div class="cs-ep">'
        + '<div class="cs-ep-izq"><div class="cs-ep-t"><b>' + (e.numero != null ? 'Ep. ' + e.numero : 'Ep.') + '</b><span>' + csEsc(e.titulo) + '</span>'
        +   (e.dcTitulo && castNorm(e.dcTitulo) !== castNorm(e.titulo) ? '<span class="cs-tenue">' + csEsc(e.dcTitulo) + '</span>' : '') + '</div>'
        + '<div class="cs-ep-datos">'
        +   (e.ep ? csChip(hayLibreto(e.ep.id) ? 'Con libreto' : 'Sin libreto', hayLibreto(e.ep.id) ? 'ok' : 'nada') : '<span class="cs-etq cs-etq-dc">Solo en DublajeCast</span>')
        +   (fase ? '<span class="cs-etq">' + csEsc(fase) + '</span>' : '')
        +   '<span><b>' + c.length + '</b> pers.</span><span><b class="cs-verde">' + con + '</b> con talento</span>'
        +   (c.length - con ? '<span><b class="cs-rojo">' + (c.length - con) + '</b> sin asignar</span>' : '')
        +   (choques ? '<span class="cs-aviso">' + csIco('aviso', 12) + choques + ' distinto' + (choques === 1 ? '' : 's') + ' en DublajeCast</span>' : '')
        + '</div></div>'
        /* «Casting» abre el casting de Dubbipt directamente; la ficha, aparte. Uno que solo está
           en DublajeCast no se puede castear todavía: su ficha dice cómo crearlo. */
        + '<div class="cs-ep-bots"><button class="cs-b" data-cs="abrirEp" data-v="' + csEsc(e.clave) + '">Ficha</button>'
        +   (e.ep ? '<button class="cs-b cs-pri" data-cs="castear" data-v="' + csEsc(e.clave) + '" title="Abre el capítulo con el perfil Casting: la interfaz de castear de Dubbipt">' + csIco('entrar', 14) + '<span>Casting</span></button>' : '')
        + '</div>'
        + '</div>';
    }).join('') + '</div>'
    : '<div class="cs-nada">Sin episodios todavía.' + (p.show ? ' Crea el primero con «Nuevo episodio».' : '') + '</div>';
  return '<button class="cs-volver" data-cs="volver" data-v="programas">' + csIco('izquierda', 14) + '<span>Programas</span></button>'
    + '<div class="cs-cab"><div class="cs-cab-t"><h2>' + csEsc(p.nombre) + '</h2><div class="cs-cab-sub">Episodios (' + eps.length + ')'
    +   (p.cliente ? ' · ' + csEsc(p.cliente) : '') + (p.director ? ' · Dir: ' + csEsc(p.director) : '') + '</div></div>'
    + '<div class="cs-cab-btns">'
    +   (p.show ? '<button class="cs-b cs-pri" data-cs="nuevoEp">' + csIco('mas', 14) + '<span>Nuevo episodio</span></button>'
                : '<button class="cs-b cs-pri" data-cs="crearProg">' + csIco('mas', 14) + '<span>Crear en Dubbipt</span></button>')
    +   (p.serie ? '<button class="cs-b" data-cs="dcSerie">' + csIco('externo', 14) + '<span>En DublajeCast</span></button>' : '')
    + '</div></div>'
    + '<div class="cs-prog-datos">'
    +   '<label>Nombre <input type="text" data-cs="progNombre" value="' + csEsc(p.nombre) + '" title="' + (p.show && p.serie ? 'Cambia en Dubbipt y en DublajeCast a la vez' : '') + '"></label>'
    +   (p.serie
          ? '<button class="cs-b" data-cs="estadoProg" title="Cambiar el estado del programa en DublajeCast">' + csChip(CS_ESTADO[p.estado] || p.estado, p.estado === 'completo' ? 'hecho' : 'ok')
            + '<span>' + (p.estado === 'completo' ? 'Volver a En curso' : 'Marcar Completado') + '</span></button>'
            + '<label>Cliente <input type="text" data-cs="progCampo" data-campo="cliente" value="' + csEsc(p.cliente) + '" placeholder="—"></label>'
            + '<label>Director <input type="text" data-cs="progCampo" data-campo="director" value="' + csEsc(p.director) + '" placeholder="—"></label>'
          : '')
    + '</div>'
    + csHtmlRevisar(p, d, hayLibreto)
    + (p.serie ? csCambiadorHtml(csTalentosEn(d, p.dcEps.map(e => e.id)), 'programa') : '')
    + '<div class="cs-pests cs-tabs">' + pest('episodios', 'Episodios', eps.length) + pest('casting', 'Casting', filasCast.length) + pest('reparto', 'Reparto', reparto.length) + (prodPuede() ? pest('historial', 'Cambios', historial.length) : '') + '</div>'
    + cuerpo
    + csListaTalentos(d);
}

/** El casting de todo un programa: cada personaje de cada episodio, con su talento, buscable y ordenable. */
function csHtmlCastingPrograma(filas){
  if(!filas.length) return '<div class="cs-nada">Este programa todavía no tiene personajes: se sacan del libreto al realizar el casting, o del desglose en DublajeCast.</div>';
  const vistas = csOrdenarCasting(filas, CS.ordenCast, CS.buscarCast);
  const con = filas.filter(f => f.talento).length;
  return '<div class="cs-filtros"><label class="cs-buscar cs-buscar-prog">' + csIco('buscar', 14)
    +   '<input type="text" data-cs="buscarCast" placeholder="Buscar personaje o talento…" value="' + csEsc(CS.buscarCast) + '"></label>'
    +   '<div class="cs-pests">' + [['episodio', 'Por episodio'], ['personaje', 'Por personaje'], ['principal', 'Principales'], ['lineas', 'Por líneas']]
          .map(o => '<button class="cs-pest' + (CS.ordenCast === o[0] ? ' on' : '') + '" data-cs="ordenCast" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div>'
    +   '<span class="cs-tenue">' + (CS.buscarCast ? vistas.length + ' de ' : '') + filas.length + ' registros · ' + con + ' con talento</span></div>'
    + '<div class="cs-tabla cs-cast cs-cast-prog"><div class="cs-fila cs-fila-cab"><span>Ep.</span><span>Personaje</span><span>Líneas</span><span>Talento</span></div>'
    + vistas.map(f => '<div class="cs-fila' + (f.talento ? '' : ' cs-falta') + '">'
        + '<span class="cs-tenue">' + (f.e.numero != null ? f.e.numero : '—') + '</span>'
        + '<span><b>' + (f.principal ? '<i class="cs-prin" title="Principal">' + csIco('estrella', 12) + '</i>' : '') + csEsc(f.personaje) + '</b></span>'
        + '<span class="cs-tenue">' + (f.lineas || '') + '</span>'
        + '<span>' + csTalentoCelda(f, f.e.dcEp) + '</span></div>').join('')
    + '</div>';
}

/** El reparto de un programa: cada personaje con su talento -por tramos si cambió-, y cambiarlo en todos sus episodios. */
function csHtmlReparto(p, reparto){
  if(!p.serie) return '<div class="cs-nada">Este programa no está en DublajeCast: su reparto se arma al realizar el casting de cada episodio.</div>';
  if(!reparto.length) return '<div class="cs-nada">Todavía no hay personajes: salen al subir el desglose de cada episodio.</div>';
  return '<div class="cs-tabla cs-reparto"><div class="cs-fila cs-fila-cab"><span>Personaje</span><span>Talento</span><span>Ep.</span><span>Líneas</span><span>Cambiar en todos</span></div>'
    + reparto.map(r => {
        const relevo = r.tramos.filter(t => t.talento).length > 1;
        return '<div class="cs-fila' + (r.tramos.some(t => !t.talento) ? ' cs-falta' : '') + '">'
          + '<span><button class="cs-prin-b' + (r.principal ? ' on' : '') + '" data-cs="principal" data-ch="' + csEsc(r.charId) + '" data-per="' + csEsc(r.personaje) + '" title="' + (r.principal ? 'Quitar de principales' : 'Marcar como principal') + '">' + csIco('estrella', 13) + '</button><b>' + csEsc(r.personaje) + '</b></span>'
          + '<span class="cs-tramos">' + r.tramos.map(t => '<span class="' + (t.talento ? 'cs-talento' : 'cs-rojo') + '">' + (t.talento ? csEsc(t.talento) : 'sin asignar') + ' <i class="cs-tenue">' + csTramoTexto(t.eps) + '</i></span>').join(' → ')
          +   (relevo ? ' <small class="cs-aviso">' + csIco('aviso', 12) + 'relevo</small>' : '') + '</span>'
          + '<span>' + r.episodios + '</span><span class="cs-tenue">' + r.lineas + '</span>'
          + '<span><input class="cs-tal-in" list="csListaTalentos" data-cs="reasignar" data-ch="' + csEsc(r.charId) + '" data-per="' + csEsc(r.personaje) + '" placeholder="Nuevo talento…"></span>'
          + '</div>';
      }).join('') + '</div>';
}

/** La tabla del casting de un episodio. */
function csTablaCasting(filas, dcEp){
  if(!filas.length) return '<div class="cs-nada">Este episodio todavía no tiene personajes: se sacan del libreto al realizar el casting.</div>';
  const orden = filas.slice().sort(CS.orden === 'personaje' ? (a, b) => a.personaje.localeCompare(b.personaje, 'es') : (a, b) => (b.lineas - a.lineas) || a.personaje.localeCompare(b.personaje, 'es'));
  const con = filas.filter(f => f.talento).length;
  return '<div class="cs-cast-cab"><span>' + con + ' de ' + filas.length + ' personajes con talento</span>'
    + '<div class="cs-pests">' + [['lineas', 'Por líneas'], ['personaje', 'Por personaje']].map(o => '<button class="cs-pest' + (CS.orden === o[0] ? ' on' : '') + '" data-cs="orden" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>'
    + '<div class="cs-tabla cs-cast"><div class="cs-fila cs-fila-cab"><span>Personaje</span><span>Líneas</span><span>Talento</span></div>'
    + orden.map(f => '<div class="cs-fila' + (f.talento ? '' : ' cs-falta') + '">'
        + '<span><b>' + (f.principal ? '<i class="cs-prin" title="Principal">' + csIco('estrella', 12) + '</i>' : '') + csEsc(f.personaje) + '</b></span>'
        + '<span class="cs-tenue">' + (f.lineas || '') + '</span>'
        + '<span>' + csTalentoCelda(f, dcEp) + '</span>'
        + '</div>').join('') + '</div>';
}

function csHtmlEpisodio(p, e, d, registro, hoy){
  const dc = e.dcEp;
  const filas = csCastingDe(e, d, registro);
  const alertas = dc ? prodAlertasEp(dc, p.serie, hoy) : [];
  const ficha = '<div class="cs-ep-ficha">'
      + (e.ep ? '<div><span>Nombre en Dubbipt</span><input type="text" data-cs="epNombre" value="' + csEsc(e.ep.name) + '" title="El número del nombre es lo que lo junta con su episodio de DublajeCast"></div>' : '')
      + (dc ? '<div><span>Título en DublajeCast</span><input type="text" data-cs="epCampo" data-campo="title" value="' + csEsc(dc.title || '') + '"></div>'
          + '<div><span>Estado</span>' + csSelect('status', dc.status || 'en_curso', CS_OP_ESTADO) + '</div>'
          + '<div><span>Fase</span>' + csSelect('fase', dc.fase || '', CS_OP_FASE) + '</div>'
          + '<div><span>Miami</span><input type="date" data-cs="epCampo" data-campo="fecha_miami" value="' + csEsc(dc.fecha_miami || '') + '"></div>'
          + '<div><span>DUBCARD</span><input type="date" data-cs="epCampo" data-campo="fecha_dubcard" value="' + csEsc(dc.fecha_dubcard || '') + '"></div>'
          + '<div><span>Formato DUBCARD</span>' + csSelect('formato_dubcard', dc.formato_dubcard || '', CS_OP_FORMATO) + '<i class="cs-tenue">' + csEsc(prodFormatoDubcard(dc, p.serie)) + '</i></div>'
          + (alertas.length ? '<div><span>Alertas</span><b>' + alertas.map(a => csChip(a.texto, a.nivel)).join(' ') + '</b></div>' : '')
        : '')
      + '</div>';
  return '<button class="cs-volver" data-cs="volver" data-v="programa">' + csIco('izquierda', 14) + '<span>' + csEsc(p.nombre) + '</span></button>'
    + '<div class="cs-cab"><div class="cs-cab-t"><h2>' + (e.numero != null ? 'Ep. ' + e.numero + ' · ' : '') + csEsc(e.titulo) + '</h2>'
    +   '<div class="cs-cab-sub">' + csEsc(p.nombre) + (e.dcTitulo && castNorm(e.dcTitulo) !== castNorm(e.titulo) ? ' · en DublajeCast: ' + csEsc(e.dcTitulo) : '') + '</div></div>'
    +   (dc && p.serie ? '<button class="cs-b" data-cs="dcEp">' + csIco('externo', 14) + '<span>En DublajeCast</span></button>' : '') + '</div>'
    + ficha
    + '<div class="cs-realizar">'
    +   (e.ep
          ? '<button class="cs-cta" data-cs="realizar">' + csIco('entrar', 18) + '<span>Realizar casting</span></button>'
            + '<span class="cs-tenue">Abre el capítulo en Dubbipt con el perfil Casting: el desglose, los personajes y la asignación de talentos de siempre.</span>'
          : (p.show
              ? '<button class="cs-cta" data-cs="nuevoEp">' + csIco('mas', 18) + '<span>Crear el capítulo en Dubbipt</span></button>'
                + '<span class="cs-tenue">Este capítulo está en DublajeCast pero todavía no en Dubbipt. Créalo con su libreto y podrás realizar el casting.</span>'
              : '<button class="cs-cta" data-cs="crearProg">' + csIco('mas', 18) + '<span>Crear el programa en Dubbipt</span></button>'
                + '<span class="cs-tenue">Este programa está en DublajeCast pero todavía no en Dubbipt. Créalo y añade el capítulo para realizar el casting.</span>'))
    + '</div>'
    + (dc ? csCambiadorHtml(csTalentosEn(d, [dc.id]), 'episodio') : '')
    + csTablaCasting(filas, dc)
    + (prodPuede() ? '<div class="cs-caja cs-caja-hist"><div class="cs-caja-t">' + csIco('actualizar', 14) + 'Cambios de este episodio</div>' + csHtmlHistorial(csHistorialDe(p, e), false, 30) + '</div>' : '')
    + csListaTalentos(d);
}

/**
 * ¿Se enseña la organización de DublajeCast? Con el perfil Casting, siempre:
 * pedido de sala, «cuando se abra el programa en Casting, elimina la interfaz
 * antigua de los programas». Lo que viene de DublajeCast -sus datos, sus
 * secciones, editar e importar- sigue siendo solo del administrador (PRO-8).
 */
function csActivo(){ return typeof DDL_MODO !== 'undefined' && DDL_MODO === 'casting'; }

/** Los datos de DublajeCast, solo para quien puede verlos. */
function csDatos(){ return prodPuede() ? dcastDatos() : { datos: null, vivo: false }; }

/** Las secciones que se ven: todas para el administrador; Programas para los demás. */
function csSecciones(){ return prodPuede() ? CS_SECCIONES : CS_SECCIONES.filter(s => s.v === 'programas'); }

/** La sección entera, como HTML. */
function csHtml(vista, hoy){
  const h = hoy || new Date();
  const sec = CS_SECCIONES.find(s => s.v === vista);
  if(sec && sec.dc) return csHtmlHerramienta(sec);
  if(vista === 'programas' || vista === 'programa' || vista === 'episodio'){
    const a = csActual();
    const { vivo } = csDatos();
    const hay = (id) => !!(LDB.dataEps && LDB.dataEps.has(id));
    if(vista === 'episodio' && a.p && a.e) return csHtmlEpisodio(a.p, a.e, a.datos, csRegistroDe(a.p.show), h);
    if(vista !== 'programas' && a.p) return csHtmlPrograma(a.p, a.eps, a.datos, csRegistroDe(a.p.show), hay);
    return csHtmlProgramas(a.lista, vivo);
  }
  const { datos, vivo } = csDatos();
  switch(vista){
    case 'dashboard':  return csHtmlDashboard(datos, h, vivo);
    case 'talentos':   return csHtmlTalentos(datos, vivo);
    case 'ocupacion':  return csHtmlOcupacion(datos, vivo);
    case 'trailers':   return csHtmlTrailers(datos, h, vivo);
    case 'produccion': return csHtmlProduccion(datos, h, vivo);
  }
  return '';
}

/** La barra de secciones, a la izquierda como en DublajeCast. */
function csNavHtml(activa){
  return '<div class="cs-nav-t">Casting</div>'
    + csSecciones().map(s => '<button class="cs-nav-b' + (s.v === activa ? ' on' : '') + (s.dc ? ' cs-nav-dc' : '') + '" data-v="' + s.v + '" title="' + csEsc(s.t) + (s.dc ? ' · herramienta de DublajeCast' : '') + '">'
      + csIco(s.v, 16) + '<span>' + csEsc(s.t) + '</span></button>').join('');
}

/* ── Montarlo en la biblioteca ─────────────────────────────────────────── */

/**
 * Pone o quita la organización de DublajeCast en la biblioteca. Con el perfil
 * Casting, la biblioteca es la barra de secciones a la
 * izquierda y la sección a la derecha; lo de siempre de Dubbipt -mosaico de
 * programas, tabla de capítulos- queda tapado por CSS (`body.cs-on`).
 * `modo` es 'shows' o 'eps', lo que acaba de pintar renderLibrary: si entró
 * en un programa por otro camino, se enseña ese programa.
 */
function csPintar(modo, cab, grid){
  let nav = document.getElementById('csNav'), vista = document.getElementById('csVista');
  const lib = grid && grid.parentNode;
  const puede = !!(csActivo() && cab && grid && lib);
  document.body.classList.toggle('cs-on', puede);
  if(!puede){
    if(nav) nav.remove();
    if(vista) vista.remove();
    return false;
  }
  if(!csSecciones().some(sc => sc.v === CS.vista) && CS.vista !== 'programa' && CS.vista !== 'episodio'){ CS.vista = 'programas'; CS.prog = null; CS.ep = null; }
  if(modo === 'eps' && LDB.showId != null && CS.prog !== 's:' + LDB.showId){
    CS.vista = 'programa'; CS.prog = 's:' + LDB.showId; CS.ep = null;
  }
  if(!nav){ nav = document.createElement('nav'); nav.id = 'csNav'; nav.className = 'cs-nav'; nav.setAttribute('aria-label', 'Secciones de Casting'); }
  if(!vista){ vista = document.createElement('div'); vista.id = 'csVista'; vista.className = 'cs-vista'; }
  if(lib.firstChild !== nav) lib.insertBefore(nav, lib.firstChild);
  if(nav.nextSibling !== vista) lib.insertBefore(vista, nav.nextSibling);
  const activa = (CS.vista === 'programa' || CS.vista === 'episodio') ? 'programas' : CS.vista;
  nav.innerHTML = csNavHtml(activa);
  nav.querySelectorAll('.cs-nav-b').forEach(b => { b.onclick = () => csIr(b.dataset.v); });
  vista.innerHTML = csHtml(CS.vista);
  csCablear(vista);
  csAsegurarDatos();
  return true;
}

/** Ir a una sección de la barra. Programas vuelve a la lista de todos. */
function csIr(v){
  if(!csSecciones().some(s => s.v === v)) return false;
  CS.vista = v; CS.prog = null; CS.ep = null;
  try{ document.body.classList.remove('ep-open'); }catch(e){ /* sin clase que quitar */ }
  LDB.browse = true; LDB.showId = null; libView = 'shows';
  try{ renderLibrary(true); }catch(e){ fallo('renderLibrary · js/castingvistas.js:csIr', e); }
  return true;
}

/** Vuelve a pintar lo que se ve (al cambiar de perfil, al actualizar los datos). */
function csRepintar(){
  /* Dentro de un capítulo, no: se repinta al volver a la biblioteca. */
  try{ if(typeof currentEp !== 'undefined' && currentEp && !LDB.browse) return; renderLibrary(true); }
  catch(e){ fallo('renderLibrary · js/castingvistas.js:csRepintar', e); }
}

/** Abrir el «Nuevo programa» de Dubbipt con el nombre ya escrito. */
async function csNuevoPrograma(nombre){
  await newShow();
  const i = document.getElementById('npName');
  if(i && nombre){ i.value = nombre; try{ i.focus(); }catch(e){ /* sin foco se escribe igual */ } }
}

/**
 * «Realizar casting»: el capítulo de Dubbipt, abierto con el perfil Casting,
 * con su interfaz de toda la vida. El registro del programa se olvida para
 * leerlo de nuevo al volver, que habrá cambiado.
 */
async function csRealizarCasting(p, e){
  if(!p || !p.show || !e || !e.ep) return false;
  delete CS.registros[String(p.show.id)];
  LDB.showId = p.show.id;
  try{ ponerModo(e.ep.id, 'casting'); }catch(err){ fallo('ponerModo · js/castingvistas.js:csRealizarCasting', err); }
  await openEpisode(e.ep.id);
  return true;
}

/** Los controles de una sección. */
function csCablear(vista){
  const a = () => csActual();
  const ctxDe = (x) => csContexto(x && x.p, x && x.e);
  vista.querySelectorAll('[data-cs]').forEach(el => {
    const que = el.getAttribute('data-cs'), v = el.getAttribute('data-v');
    const at = (k) => el.getAttribute('data-' + k);
    const escribir = (campo) => { CS[campo] = el.value; const pos = el.selectionStart; csRepintar(); const n = document.querySelector('#csVista [data-cs="' + que + '"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(err){ /* el cursor al final */ } } };
    const id = (x) => (x != null && /^\d+$/.test(String(x))) ? Number(x) : x;      // los ids de DublajeCast son números
    if(que === 'actualizar') el.onclick = () => csActualizar();
    else if(que === 'traer') el.onclick = () => { prodVista = 'datos'; prodPanel(); };
    else if(que === 'herramienta') el.onclick = () => dcastAbrir(v);
    else if(que === 'buscar') el.oninput = () => escribir('buscar');
    else if(que === 'buscarProg') el.oninput = () => escribir('buscarProg');
    else if(que === 'buscarCast') el.oninput = () => escribir('buscarCast');
    else if(que === 'programa') el.onchange = () => { CS.programa = el.value; csRepintar(); };
    else if(que === 'soloAlertas') el.onchange = () => { CS.soloAlertas = !!el.checked; csRepintar(); };
    else if(que === 'filtro') el.onclick = () => { CS.filtro = v; csRepintar(); };
    else if(que === 'orden') el.onclick = () => { CS.orden = v; csRepintar(); };
    else if(que === 'ordenCast') el.onclick = () => { CS.ordenCast = v; csRepintar(); };
    else if(que === 'tab') el.onclick = () => { CS.tab = v; csRepintar(); };
    else if(que === 'abrirProg') el.onclick = () => { CS.vista = 'programa'; CS.prog = v; CS.ep = null; CS.tab = 'episodios'; CS.registros = {}; csRepintar(); };
    else if(que === 'abrirEp') el.onclick = () => { CS.vista = 'episodio'; CS.ep = v; csRepintar(); };
    else if(que === 'volver') el.onclick = () => { if(v === 'programas'){ CS.vista = 'programas'; CS.prog = null; CS.ep = null; } else { CS.vista = 'programa'; CS.ep = null; } csRepintar(); };
    else if(que === 'nuevoPrograma') el.onclick = () => csNuevoPrograma('');
    else if(que === 'herramientas') el.onclick = () => herramientasPanel();
    else if(que === 'importarTodo') el.onclick = () => csImportarTodo().catch(err => fallo('csImportarTodo · js/castingvistas.js', err, 'la importación no se ha podido hacer'));
    else if(que === 'crearProg') el.onclick = () => { const x = a(); csNuevoPrograma(x.p ? x.p.nombre : ''); };
    else if(que === 'nuevoEp') el.onclick = () => {
      const x = a(); if(!x.p || !x.p.show) return;
      LDB.showId = x.p.show.id; newEpisodeModal();
      const i = document.getElementById('neName');
      if(i && x.e) i.value = x.e.dcTitulo || x.e.titulo || '';
    };
    else if(que === 'dcSerie') el.onclick = () => { const x = a(); if(x.p && x.p.serie) dcastAbrir('series', x.p.serie.id); };
    else if(que === 'dcEp') el.onclick = () => { const x = a(); if(x.p && x.p.serie && x.e && x.e.dcEp) dcastAbrir('casting', x.p.serie.id, x.e.dcEp.id); };
    else if(que === 'castear') el.onclick = () => {
      CS.ep = v;
      const x = a();
      csRealizarCasting(x.p, x.e).catch(err => fallo('csRealizarCasting · js/castingvistas.js', err, 'el capítulo no se ha podido abrir'));
    };
    else if(que === 'realizar') el.onclick = () => { const x = a(); csRealizarCasting(x.p, x.e).catch(err => fallo('csRealizarCasting · js/castingvistas.js', err, 'el capítulo no se ha podido abrir')); };
    /* ── Nombres ── */
    else if(que === 'progNombre') el.onchange = () => { const x = a(); csRenombrarPrograma(x.p, el.value).catch(err => fallo('csRenombrarPrograma · js/castingvistas.js', err, 'el programa no se ha podido renombrar')); };
    else if(que === 'epNombre') el.onchange = () => { const x = a(); csRenombrarEpisodio(x.p, x.e, el.value).catch(err => fallo('csRenombrarEpisodio · js/castingvistas.js', err, 'el episodio no se ha podido renombrar')); };
    /* ── Lo que se guarda en DublajeCast, apuntando quién y qué ── */
    else if(que === 'talento') el.onchange = () => {
      const nombre = el.value.trim(), ep = id(at('ep')), ch = id(at('ch')), x = a();
      const antes = at('antes') || 'sin asignar', per = at('per') || 'Personaje';
      const ctx = csContexto(x.p, x.e || (x.eps || []).find(e => e.dcEp && String(e.dcEp.id) === String(ep)) || null);
      csEditar(pl => dcxAsignar(pl, ep, ch, nombre), per + ': ' + (nombre ? dcxNombreTalento(nombre) : 'sin talento') + ' (antes: ' + antes + ')', ctx);
    };
    else if(que === 'reasignar') el.onchange = () => {
      const nombre = el.value.trim(), x = a(), ch = id(at('ch'));
      if(!nombre || !x.p || !x.p.serie) return;
      csEditar(pl => dcxReasignar(pl, x.p.serie.id, ch, null, nombre), (at('per') || 'Personaje') + ': ' + dcxNombreTalento(nombre) + ' en todos sus episodios', ctxDe(x));
    };
    else if(que === 'cambiar') el.onclick = () => {
      const x = a(), ambito = at('ambito');
      const de = document.getElementById('csCambiaDe'), aI = document.getElementById('csCambiaA');
      const deId = de ? id(de.value) : null, nombre = aI ? aI.value.trim() : '';
      if(!nombre){ castAviso('Escribe el talento nuevo'); return; }
      if(!x.p || !x.p.serie) return;
      const epIds = ambito === 'episodio' ? (x.e && x.e.dcEp ? [x.e.dcEp.id] : []) : x.p.dcEps.map(e => e.id);
      if(!epIds.length) return;
      const ix = prodIndices(x.datos), deNombre = (ix.talent[String(deId)] || {}).name || 'el talento';
      csEditar(pl => dcxCambiarTalento(pl, epIds, deId, nombre), 'Talento cambiado ' + (ambito === 'episodio' ? 'en el episodio' : 'en todo el programa') + ': ' + deNombre + ' → ' + dcxNombreTalento(nombre), ctxDe(x));
    };
    else if(que === 'principal') el.onclick = () => {
      const ch = id(at('ch')), poner = !el.classList.contains('on'), x = a();
      csEditar(pl => dcxPersonaje(pl, ch, { tipo: poner ? 'principal' : 'secundario' }), (at('per') || 'Personaje') + (poner ? ': marcado como principal' : ': ya no es principal'), ctxDe(x));
    };
    else if(que === 'epCampo') el.onchange = () => {
      const x = a(); if(!x.e || !x.e.dcEp) return;
      const campo = at('campo'), valor = el.value, epId = x.e.dcEp.id;
      const et = { title: 'Título en DublajeCast', status: 'Estado', fase: 'Fase', fecha_miami: 'Fecha de Miami', fecha_dubcard: 'Fecha de DUBCARD', formato_dubcard: 'Formato de DUBCARD' }[campo] || campo;
      csEditar(pl => dcxEpisodio(pl, epId, { [campo]: campo === 'title' ? valor.replace(/\s+/g, ' ').trim() : valor }), et + ': ' + (valor || '—'), ctxDe(x));
    };
    else if(que === 'progCampo') el.onchange = () => {
      const x = a(); if(!x.p || !x.p.serie) return;
      const campo = at('campo'), valor = el.value.trim(), sid = x.p.serie.id;
      csEditar(pl => dcxSerie(pl, sid, { [campo]: valor }), (campo === 'cliente' ? 'Cliente' : 'Director') + ': ' + (valor || '—'), ctxDe(x));
    };
    else if(que === 'estadoProg') el.onclick = () => {
      const x = a(); if(!x.p || !x.p.serie) return;
      const nuevo = x.p.estado === 'completo' ? 'en_curso' : 'completo', sid = x.p.serie.id;
      csEditar(pl => dcxSerie(pl, sid, { status: nuevo }), nuevo === 'completo' ? 'Programa completado' : 'Programa en curso', ctxDe(x));
    };
    else if(que === 'talNuevo') el.onclick = () => {
      const i = document.getElementById('csTalNuevo'), nombre = i ? i.value.trim() : '';
      if(!nombre){ castAviso('Escribe el nombre del talento'); return; }
      csEditar(pl => dcxTalentoNuevo(pl, { name: nombre }), 'Talento añadido: ' + dcxNombreTalento(nombre));
    };
    else if(que === 'talCampo') el.onchange = () => {
      const tid = id(at('id')), campo = at('campo'), valor = el.value.trim();
      csEditar(pl => dcxTalento(pl, tid, { [campo]: valor }), 'Ficha de talento: ' + campo + ' = ' + (valor || '—'));
    };
    else if(que === 'trNuevo') el.onclick = () => {
      const val = (k) => { const i = document.getElementById(k); return i ? i.value.trim() : ''; };
      const titulo = val('csTrTitulo');
      if(!titulo){ castAviso('Escribe el título del tráiler'); return; }
      const datos = { title: titulo, type: val('csTrTipo'), series_id: val('csTrProg') ? id(val('csTrProg')) : null, deadline: val('csTrFecha') };
      csEditar(pl => dcxTrailerNuevo(pl, datos), 'Tráiler añadido: ' + titulo);
    };
    else if(que === 'trCampo') el.onchange = () => {
      const tid = id(at('id')), campo = at('campo'), valor = el.value;
      csEditar(pl => dcxTrailer(pl, tid, { [campo]: valor }), 'Tráiler: ' + (campo === 'status' ? 'estado' : 'entrega') + ' = ' + (valor || '—'));
    };
    else if(que === 'trBorrar') el.onclick = async () => {
      const tid = id(at('id'));
      const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal)
        ? await DDL_UI.confirmModal({ title: 'Borrar tráiler', body: 'Se borra de DublajeCast. No se puede deshacer desde aquí.', confirmLabel: 'Borrar', cancelLabel: 'Cancelar', danger: true })
        : true;
      if(ok) csEditar(pl => dcxTrailerBorrar(pl, tid), 'Tráiler borrado');
    };
    else if(typeof csCablearMas === 'function') csCablearMas(el, que, v, at, id, a);
  });
}

/** Actualizar: si DublajeCast está abierto con sesión, ya es en vivo; si no, se trae con la sesión del puente. */
async function csActualizar(){
  if(csDatos().vivo){ csRepintar(); castAviso('Al día: son los datos de DublajeCast en vivo'); return 'vivo'; }
  let u = null;
  try{ u = (typeof dcSesion === 'function') ? await dcSesion() : null; }catch(e){ u = null; }
  if(!u){ castAviso('Para actualizar, entra en tu cuenta de DublajeCast: se abre aquí mismo'); dcastAbrir('dashboard'); return 'sesion'; }
  try{
    const r = await prodImportarDesdeDublajeCast();
    castAviso(prodResumenTexto(r));
    csRepintar();
    return 'traido';
  }catch(e){ castAviso('No se pudo traer de DublajeCast: ' + (e && e.message ? e.message : e)); return 'error'; }
}

/* ═══ FIN DE CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST ═══ */
