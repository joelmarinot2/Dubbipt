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
 * castRegCargar, dcastSerieDe, dcastEpDeDc, dcastFilasCasting, esc, fallo, _svgI.
 */

/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST ═══════════════════════════ */

const CS = { vista: 'programas', buscar: '', soloAlertas: false, programa: '',
             prog: null, ep: null, filtro: 'en_curso', buscarProg: '', orden: 'lineas', registros: {} };

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
      return { nombre: t.name, ficha: prodFichaTexto(t), correo: t.email || '',
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
  const { datos } = dcastDatos();
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
      : csVacio());
}

function csHtmlTalentos(d, vivo){
  const lista = csTalentos(d, CS.buscar);
  return csCabecera('Talentos', (d ? d.talents.length : 0) + ' talentos con su ficha y sus papeles', vivo)
    + (d ? '<label class="cs-buscar">' + '<input type="text" data-cs="buscar" placeholder="Buscar talento…" value="' + csEsc(CS.buscar) + '"></label>'
      + (lista.length ? '<div class="cs-lista">' + lista.map(t => '<div class="cs-tal">'
          + '<div class="cs-tal-cab"><b>' + csEsc(t.nombre) + '</b>' + (t.ficha ? '<span class="cs-ficha">' + csEsc(t.ficha) + '</span>' : '<span class="cs-ficha cs-tenue">sin ficha</span>')
          + (t.correo ? '<span class="cs-tenue">' + csEsc(t.correo) + '</span>' : '') + '</div>'
          + (t.programas.length ? '<div class="cs-papeles">' + t.programas.map(p => '<span><b>' + csEsc(p.programa) + '</b>: ' + csEsc(p.personajes.slice(0, 6).join(', ')) + (p.personajes.length > 6 ? '…' : '') + '</span>').join('') + '</div>' : '')
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
  const hechos = d ? d.trailers.filter(t => t.status === 'completo') : [];
  return csCabecera('Tráilers', r.trailersPendientes + ' pendientes · ' + hechos.length + ' completados', vivo)
    + (d ? '<div class="cs-lista">'
        + r.trailers.map(t => '<div class="cs-linea cs-linea-g">' + csChip(t.texto, t.nivel) + '<span class="cs-linea-t"><b>' + csEsc(t.titulo || '(sin título)') + '</b> · ' + csEsc(t.tipo) + (t.programa ? ' · ' + csEsc(t.programa) : '') + '</span></div>').join('')
        + hechos.map(t => { const s = ix.serie[String(t.series_id)]; return '<div class="cs-linea cs-linea-g cs-hecho">' + csChip('Completado', 'hecho') + '<span class="cs-linea-t"><b>' + csEsc(t.title || '(sin título)') + '</b> · ' + (t.type === 'teaser' ? 'Teaser' : 'Tráiler') + (s ? ' · ' + csEsc(s.name) : '') + '</span></div>'; }).join('')
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

/* ── Programas, programa y episodio: lo que se pinta ─────────────────────── */

const CS_ESTADO = { en_curso: 'En curso', completo: 'Completado', pendiente: 'Pendiente' };

function csHtmlProgramas(lista, vivo){
  const vistos = csFiltrarProgramas(lista, CS.filtro, CS.buscarProg);
  const cuenta = (f) => lista.filter(p => f === 'todos' || p.estado === f).length;
  const pest = (k, t) => '<button class="cs-pest' + (CS.filtro === k ? ' on' : '') + '" data-cs="filtro" data-v="' + k + '">' + t + ' <b>' + cuenta(k) + '</b></button>';
  return '<div class="cs-cab"><div class="cs-cab-t"><h2>Programas</h2><div class="cs-cab-sub">' + vistos.length + ' de ' + lista.length + '</div></div>'
    + '<span class="cs-de">' + (vivo ? 'DublajeCast en vivo' : (PROD.datos ? 'Con los datos de DublajeCast' : 'Sin datos de DublajeCast')) + '</span>'
    + '<button class="cs-b cs-pri" data-cs="nuevoPrograma">' + csIco('mas', 14) + '<span>Nuevo</span></button></div>'
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
  const filas = eps.map(e => {
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
      + '<button class="cs-b cs-pri" data-cs="abrirEp" data-v="' + csEsc(e.clave) + '">Casting</button>'
      + '</div>';
  }).join('');
  return '<button class="cs-volver" data-cs="volver" data-v="programas">' + csIco('izquierda', 14) + '<span>Programas</span></button>'
    + '<div class="cs-cab"><div class="cs-cab-t"><h2>' + csEsc(p.nombre) + '</h2><div class="cs-cab-sub">Episodios (' + eps.length + ')'
    +   (p.cliente ? ' · ' + csEsc(p.cliente) : '') + (p.director ? ' · Dir: ' + csEsc(p.director) : '') + '</div></div>'
    + '<div class="cs-cab-btns">'
    +   (p.show ? '<button class="cs-b cs-pri" data-cs="nuevoEp">' + csIco('mas', 14) + '<span>Nuevo episodio</span></button>'
                : '<button class="cs-b cs-pri" data-cs="crearProg">' + csIco('mas', 14) + '<span>Crear en Dubbipt</span></button>')
    +   (p.serie ? '<button class="cs-b" data-cs="dcSerie">' + csIco('externo', 14) + '<span>En DublajeCast</span></button>' : '')
    + '</div></div>'
    + (eps.length ? '<div class="cs-eps">' + filas + '</div>' : '<div class="cs-nada">Sin episodios todavía.' + (p.show ? ' Crea el primero con «Nuevo episodio».' : '') + '</div>');
}

/** La tabla del casting de un episodio. */
function csTablaCasting(filas){
  if(!filas.length) return '<div class="cs-nada">Este episodio todavía no tiene personajes: se sacan del libreto al realizar el casting.</div>';
  const orden = filas.slice().sort(CS.orden === 'personaje' ? (a, b) => a.personaje.localeCompare(b.personaje, 'es') : (a, b) => (b.lineas - a.lineas) || a.personaje.localeCompare(b.personaje, 'es'));
  const con = filas.filter(f => f.talento).length;
  return '<div class="cs-cast-cab"><span>' + con + ' de ' + filas.length + ' personajes con talento</span>'
    + '<div class="cs-pests">' + [['lineas', 'Por líneas'], ['personaje', 'Por personaje']].map(o => '<button class="cs-pest' + (CS.orden === o[0] ? ' on' : '') + '" data-cs="orden" data-v="' + o[0] + '">' + o[1] + '</button>').join('') + '</div></div>'
    + '<div class="cs-tabla cs-cast"><div class="cs-fila cs-fila-cab"><span>Personaje</span><span>Líneas</span><span>Talento</span></div>'
    + orden.map(f => '<div class="cs-fila' + (f.talento ? '' : ' cs-falta') + '">'
        + '<span><b>' + (f.principal ? '<i class="cs-prin" title="Principal">' + csIco('estrella', 12) + '</i>' : '') + csEsc(f.personaje) + '</b></span>'
        + '<span class="cs-tenue">' + (f.lineas || '') + '</span>'
        + '<span class="cs-talento">' + (f.talento ? csEsc(f.talento) : 'sin asignar')
        + (f.choca ? ' <small class="cs-aviso" title="En DublajeCast pone otro talento: manda el de Dubbipt">' + csIco('aviso', 12) + 'en DublajeCast: ' + csEsc(f.dc) + '</small>' : '') + '</span>'
        + '</div>').join('') + '</div>';
}

function csHtmlEpisodio(p, e, d, registro, hoy){
  const dc = e.dcEp;
  const filas = csCastingDe(e, d, registro);
  const datos = [];
  if(dc && dc.fase) datos.push(['Fase', PROD_ET.fase[dc.fase] || dc.fase]);
  if(dc && dc.status) datos.push(['Estado', PROD_ET.estado[dc.status] || dc.status]);
  if(dc && dc.fecha_miami) datos.push(['Miami', dc.fecha_miami]);
  if(dc) datos.push(['DUBCARD', prodFormatoDubcard(dc, p.serie) + (dc.fecha_dubcard ? ' · ' + dc.fecha_dubcard : '')]);
  const alertas = dc ? prodAlertasEp(dc, p.serie, hoy) : [];
  return '<button class="cs-volver" data-cs="volver" data-v="programa">' + csIco('izquierda', 14) + '<span>' + csEsc(p.nombre) + '</span></button>'
    + '<div class="cs-cab"><div class="cs-cab-t"><h2>' + (e.numero != null ? 'Ep. ' + e.numero + ' · ' : '') + csEsc(e.titulo) + '</h2>'
    +   '<div class="cs-cab-sub">' + csEsc(p.nombre) + (e.dcTitulo && castNorm(e.dcTitulo) !== castNorm(e.titulo) ? ' · en DublajeCast: ' + csEsc(e.dcTitulo) : '') + '</div></div>'
    +   (dc && p.serie ? '<button class="cs-b" data-cs="dcEp">' + csIco('externo', 14) + '<span>En DublajeCast</span></button>' : '') + '</div>'
    + (datos.length || alertas.length ? '<div class="cs-ep-ficha">' + datos.map(x => '<div><span>' + csEsc(x[0]) + '</span><b>' + csEsc(x[1]) + '</b></div>').join('')
        + (alertas.length ? '<div><span>Alertas</span><b>' + alertas.map(a => csChip(a.texto, a.nivel)).join(' ') + '</b></div>' : '') + '</div>' : '')
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
    + csTablaCasting(filas);
}

/** La sección entera, como HTML. */
function csHtml(vista, hoy){
  const h = hoy || new Date();
  const sec = CS_SECCIONES.find(s => s.v === vista);
  if(sec && sec.dc) return csHtmlHerramienta(sec);
  if(vista === 'programas' || vista === 'programa' || vista === 'episodio'){
    const a = csActual();
    const { vivo } = dcastDatos();
    const hay = (id) => !!(LDB.dataEps && LDB.dataEps.has(id));
    if(vista === 'episodio' && a.p && a.e) return csHtmlEpisodio(a.p, a.e, a.datos, csRegistroDe(a.p.show), h);
    if(vista !== 'programas' && a.p) return csHtmlPrograma(a.p, a.eps, a.datos, csRegistroDe(a.p.show), hay);
    return csHtmlProgramas(a.lista, vivo);
  }
  const { datos, vivo } = dcastDatos();
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
    + CS_SECCIONES.map(s => '<button class="cs-nav-b' + (s.v === activa ? ' on' : '') + (s.dc ? ' cs-nav-dc' : '') + '" data-v="' + s.v + '" title="' + csEsc(s.t) + (s.dc ? ' · herramienta de DublajeCast' : '') + '">'
      + csIco(s.v, 16) + '<span>' + csEsc(s.t) + '</span></button>').join('');
}

/* ── Montarlo en la biblioteca ─────────────────────────────────────────── */

/**
 * Pone o quita la organización de DublajeCast en la biblioteca. Con el perfil
 * Casting (y el administrador), la biblioteca es la barra de secciones a la
 * izquierda y la sección a la derecha; lo de siempre de Dubbipt -mosaico de
 * programas, tabla de capítulos- queda tapado por CSS (`body.cs-on`).
 * `modo` es 'shows' o 'eps', lo que acaba de pintar renderLibrary: si entró
 * en un programa por otro camino, se enseña ese programa.
 */
function csPintar(modo, cab, grid){
  let nav = document.getElementById('csNav'), vista = document.getElementById('csVista');
  const lib = grid && grid.parentNode;
  const puede = !!(prodPuede() && cab && grid && lib);
  document.body.classList.toggle('cs-on', puede);
  if(!puede){
    if(nav) nav.remove();
    if(vista) vista.remove();
    return false;
  }
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
  return true;
}

/** Ir a una sección de la barra. Programas vuelve a la lista de todos. */
function csIr(v){
  if(!CS_SECCIONES.some(s => s.v === v)) return false;
  CS.vista = v; CS.prog = null; CS.ep = null;
  try{ document.body.classList.remove('ep-open'); }catch(e){ /* sin clase que quitar */ }
  LDB.browse = true; LDB.showId = null; libView = 'shows';
  try{ renderLibrary(true); }catch(e){ fallo('renderLibrary · js/castingvistas.js:csIr', e); }
  return true;
}

/** Vuelve a pintar lo que se ve (al cambiar de perfil, al actualizar los datos). */
function csRepintar(){
  try{ if(document.body.classList.contains('ep-open')) return; renderLibrary(true); }
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
  vista.querySelectorAll('[data-cs]').forEach(el => {
    const que = el.getAttribute('data-cs'), v = el.getAttribute('data-v');
    const escribir = (campo) => { CS[campo] = el.value; const pos = el.selectionStart; csRepintar(); const n = document.querySelector('#csVista [data-cs="' + que + '"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(err){ /* el cursor al final */ } } };
    if(que === 'actualizar') el.onclick = () => csActualizar();
    else if(que === 'traer') el.onclick = () => { prodVista = 'datos'; prodPanel(); };
    else if(que === 'herramienta') el.onclick = () => dcastAbrir(v);
    else if(que === 'buscar') el.oninput = () => escribir('buscar');
    else if(que === 'buscarProg') el.oninput = () => escribir('buscarProg');
    else if(que === 'programa') el.onchange = () => { CS.programa = el.value; csRepintar(); };
    else if(que === 'soloAlertas') el.onchange = () => { CS.soloAlertas = !!el.checked; csRepintar(); };
    else if(que === 'filtro') el.onclick = () => { CS.filtro = v; csRepintar(); };
    else if(que === 'orden') el.onclick = () => { CS.orden = v; csRepintar(); };
    else if(que === 'abrirProg') el.onclick = () => { CS.vista = 'programa'; CS.prog = v; CS.ep = null; CS.registros = {}; csRepintar(); };
    else if(que === 'abrirEp') el.onclick = () => { CS.vista = 'episodio'; CS.ep = v; csRepintar(); };
    else if(que === 'volver') el.onclick = () => { if(v === 'programas'){ CS.vista = 'programas'; CS.prog = null; CS.ep = null; } else { CS.vista = 'programa'; CS.ep = null; } csRepintar(); };
    else if(que === 'nuevoPrograma') el.onclick = () => csNuevoPrograma('');
    else if(que === 'crearProg') el.onclick = () => { const x = a(); csNuevoPrograma(x.p ? x.p.nombre : ''); };
    else if(que === 'nuevoEp') el.onclick = () => {
      const x = a(); if(!x.p || !x.p.show) return;
      LDB.showId = x.p.show.id; newEpisodeModal();
      const i = document.getElementById('neName');
      if(i && x.e) i.value = x.e.dcTitulo || x.e.titulo || '';
    };
    else if(que === 'dcSerie') el.onclick = () => { const x = a(); if(x.p && x.p.serie) dcastAbrir('series', x.p.serie.id); };
    else if(que === 'dcEp') el.onclick = () => { const x = a(); if(x.p && x.p.serie && x.e && x.e.dcEp) dcastAbrir('casting', x.p.serie.id, x.e.dcEp.id); };
    else if(que === 'realizar') el.onclick = () => { const x = a(); csRealizarCasting(x.p, x.e).catch(err => fallo('csRealizarCasting · js/castingvistas.js', err, 'el capítulo no se ha podido abrir')); };
  });
}

/** Actualizar: si DublajeCast está abierto con sesión, ya es en vivo; si no, se trae con la sesión del puente. */
async function csActualizar(){
  if(dcastDatos().vivo){ csRepintar(); castAviso('Al día: son los datos de DublajeCast en vivo'); return 'vivo'; }
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
