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
 * renderLibrary, newShow, esc, fallo, _svgI.
 */

/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST ═══════════════════════════ */

const CS = { vista: 'programas', buscar: '', soloAlertas: false, programa: '' };

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
  traer:      '<path d="M7 7h11l-3-3"/><path d="M17 17H6l3 3"/>'
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

/** Los programas de DublajeCast que todavía no están en Dubbipt. */
function csSinPrograma(d, shows){
  if(!d) return [];
  return d.series.filter(s => !prodCasarPrograma(s.name, shows || [])).map(s => s.name).sort((a, b) => a.localeCompare(b, 'es'));
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

/** La sección entera, como HTML. */
function csHtml(vista, hoy){
  const { datos, vivo } = dcastDatos();
  const h = hoy || new Date();
  const sec = CS_SECCIONES.find(s => s.v === vista);
  if(sec && sec.dc) return csHtmlHerramienta(sec);
  switch(vista){
    case 'dashboard':  return csHtmlDashboard(datos, h, vivo);
    case 'talentos':   return csHtmlTalentos(datos, vivo);
    case 'ocupacion':  return csHtmlOcupacion(datos, vivo);
    case 'trailers':   return csHtmlTrailers(datos, h, vivo);
    case 'produccion': return csHtmlProduccion(datos, h, vivo);
  }
  return '';
}

/** La barra de secciones. */
function csNavHtml(activa){
  return CS_SECCIONES.map(s => '<button class="cs-nav-b' + (s.v === activa ? ' on' : '') + (s.dc ? ' cs-nav-dc' : '') + '" data-v="' + s.v + '" title="' + csEsc(s.t) + (s.dc ? ' · herramienta de DublajeCast' : '') + '">'
    + csIco(s.v, 15) + '<span>' + csEsc(s.t) + '</span></button>').join('');
}

/* ── Montarlo en la biblioteca ─────────────────────────────────────────── */

/**
 * Pone o quita la organización de DublajeCast en la biblioteca. `modo` es
 * 'shows' (Programas) o 'eps' (dentro de un programa); `cab` y `grid` son la
 * cabecera y la lista que acaba de pintar renderLibrary.
 */
function csPintar(modo, cab, grid){
  let nav = document.getElementById('csNav'), vista = document.getElementById('csVista');
  const sinProg = document.getElementById('csSinProg');
  if(sinProg && (modo !== 'shows' || CS.vista !== 'programas')) sinProg.remove();   // solo va en Programas
  if(!prodPuede() || !cab || !grid || !cab.parentNode){
    if(nav) nav.remove();
    if(vista) vista.remove();
    if(sinProg) sinProg.remove();
    if(grid) grid.style.display = '';
    return false;
  }
  if(!nav){ nav = document.createElement('nav'); nav.id = 'csNav'; nav.className = 'cs-nav'; nav.setAttribute('aria-label', 'Secciones de Casting'); }
  if(!vista){ vista = document.createElement('div'); vista.id = 'csVista'; vista.className = 'cs-vista'; }
  const activa = (modo === 'eps') ? 'programas' : CS.vista;
  cab.parentNode.insertBefore(nav, cab);
  nav.innerHTML = csNavHtml(activa);
  nav.querySelectorAll('.cs-nav-b').forEach(b => { b.onclick = () => csIr(b.dataset.v); });
  if(grid.parentNode && vista.parentNode !== grid.parentNode) grid.parentNode.insertBefore(vista, grid.nextSibling);
  if(activa === 'programas'){
    vista.style.display = 'none'; vista.innerHTML = '';
    grid.style.display = '';
    if(modo === 'shows') csPintarSinPrograma(grid);
  } else {
    cab.style.display = 'none'; grid.style.display = 'none';
    vista.style.display = '';
    vista.innerHTML = csHtml(activa);
    csCablear(vista);
  }
  return true;
}

/** Ir a una sección. Programas y las de datos se pintan aquí; desde dentro de un programa, se vuelve a la biblioteca. */
function csIr(v){
  if(!CS_SECCIONES.some(s => s.v === v)) return false;
  CS.vista = v;
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

/** Debajo de los programas de Dubbipt: los de DublajeCast que aún no están aquí, para crearlos. */
function csPintarSinPrograma(grid){
  const viejo = document.getElementById('csSinProg'); if(viejo) viejo.remove();
  const { datos } = dcastDatos();
  const faltan = csSinPrograma(datos, (typeof sbShows === 'function') ? sbShows() : []);
  if(!faltan.length || !grid.parentNode) return 0;
  const caja = document.createElement('div');
  caja.id = 'csSinProg'; caja.className = 'cs-sinprog';
  caja.innerHTML = '<span class="cs-sinprog-t">En DublajeCast y todavía no en Dubbipt</span>'
    + faltan.map(n => '<button class="cs-b" data-nombre="' + csEsc(n) + '">' + csIco('mas', 13) + '<span>' + csEsc(n) + '</span></button>').join('');
  caja.querySelectorAll('button[data-nombre]').forEach(b => {
    b.onclick = async () => { await newShow(); const i = document.getElementById('npName'); if(i){ i.value = b.dataset.nombre; try{ i.focus(); }catch(e){ /* sin foco se escribe igual */ } } };
  });
  grid.parentNode.insertBefore(caja, grid.nextSibling);
  return faltan.length;
}

/** Los controles de una sección. */
function csCablear(vista){
  vista.querySelectorAll('[data-cs]').forEach(el => {
    const que = el.getAttribute('data-cs');
    if(que === 'actualizar') el.onclick = () => csActualizar();
    else if(que === 'traer') el.onclick = () => { prodVista = 'datos'; prodPanel(); };
    else if(que === 'herramienta') el.onclick = () => dcastAbrir(el.getAttribute('data-v'));
    else if(que === 'buscar') el.oninput = () => { CS.buscar = el.value; const pos = el.selectionStart; csRepintar(); const n = document.querySelector('#csVista [data-cs="buscar"]'); if(n){ n.focus(); try{ n.setSelectionRange(pos, pos); }catch(e){ /* el cursor al final */ } } };
    else if(que === 'programa') el.onchange = () => { CS.programa = el.value; csRepintar(); };
    else if(que === 'soloAlertas') el.onchange = () => { CS.soloAlertas = !!el.checked; csRepintar(); };
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
