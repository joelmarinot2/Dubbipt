/* Casting con la organización de DublajeCast y la interfaz de Dubbipt · especificacion 09, PRO-11
 *
 * Pedido de sala: «que tenga la misma organización que DublajeCast, pero con
 * la interfaz de Dubbipt», y «no quiero ningún emoji en los iconos».
 *
 * Lo que protege esta prueba:
 *  · que las secciones sean las de DublajeCast y en su orden;
 *  · que cada cuenta (dashboard, ocupación, talentos, producción) diga lo que
 *    dicen los datos, sin contar dos veces ni perder lo que no casa;
 *  · que Programas siga siendo la lista de Dubbipt y las demás la tapen sin
 *    romperla, y que todo desaparezca para quien no es administrador en Casting;
 *  · que no se cuele ni un emoji.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, RAIZ } = require('./ayuda');

exports.nombre = 'Casting con la organización de DublajeCast';

const HOY = new Date(2026, 9, 7);
const dia = (n) => { const d = new Date(HOY); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

const VOLCADO = {
  _version: 'dublajecast_v2',
  series: [{ id: 1, name: 'A Filipino Christmas', cliente: 'Netflix', status: 'en_curso' }, { id: 2, name: 'Akka', cliente: 'Discovery', status: 'en_curso' }, { id: 3, name: 'Dofus', status: 'completo' }],
  episodes: [{ id: 11, series_id: 1, episode_number: 1, title: 'Boracay', fase: 'pre_produccion', fecha_miami: dia(-1), fecha_dubcard: dia(2) },
             { id: 12, series_id: 1, episode_number: 2, title: 'Episodio 2', fase: 'produccion_activa', fecha_miami: dia(-5) },
             { id: 21, series_id: 2, episode_number: 1, title: 'Akka 1', fase: 'pre_produccion', fecha_dubcard: dia(1), requiere_dubcard: true },
             { id: 31, series_id: 3, episode_number: 1, title: 'Dofus 1', fase: 'completado', fecha_dubcard: dia(-20) }],
  characters: [{ id: 101, canonical_name: 'ALLY', tipo: 'principal' }, { id: 102, canonical_name: 'JANA' }, { id: 103, canonical_name: 'TITO BOY' }, { id: 104, canonical_name: 'MANJAYA' }],
  talents: [{ id: 1, name: 'ANA ROJAS', genero: 'femenino', edad_aparente: 'adulto', tono_de_voz: 'agudo', email: 'ana@x.co' }, { id: 2, name: 'BEATRIZ SOL' }, { id: 3, name: 'CARLOS RUIZ', registro: 'Barítono' }, { id: 4, name: 'DIANA PAZ' }],
  appearances: [{ character_id: 101, episode_id: 11, line_count: 186 }, { character_id: 102, episode_id: 11, line_count: 54 }, { character_id: 103, episode_id: 11, line_count: 12 },
                { character_id: 101, episode_id: 12, line_count: 90 }, { character_id: 104, episode_id: 21, line_count: 40 }],
  castings: [{ character_id: 101, talent_id: 1, episode_id: 11 }, { character_id: 102, talent_id: 2, episode_id: 11 }, { character_id: 101, talent_id: 1, episode_id: 12 },
             { character_id: 104, talent_id: 3, episode_id: 21 }, { character_id: 101, talent_id: 1, episode_id: 11 }],
  trailers: [{ id: 1, type: 'trailer', title: 'Tráiler oficial', series_id: 1, deadline: dia(1) }, { id: 2, type: 'teaser', title: 'Teaser 30s', series_id: 2, deadline: dia(-2), status: 'completo' },
             { id: 3, type: 'trailer', title: 'Tráiler 2', series_id: 2, deadline: '' }]
};

/* Producción de verdad, para normalizar e indexar y calcular alertas como en la app. */
const PR = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']],
  ['prodNormalizar', 'prodIndices', 'prodCasarPrograma', 'prodAlertasEp', 'prodPlazo', 'prodFormatoDubcard', 'prodFichaTexto', 'PROD_ET'], { castNorm: undefined, console: { warn: () => {} } });

/* Lo justo del navegador. */
class El {
  constructor(tag){ this.tag = tag; this.id = ''; this.className = ''; this.style = {}; this._html = ''; this.hijos = []; this.parentNode = null; this.dataset = {}; this.atrs = {}; this.onclick = null; }
  setAttribute(k, v){ this.atrs[k] = v; } getAttribute(k){ return this.atrs[k]; }
  set innerHTML(h){ this._html = h; this.hijos = []; this._botones = null; }
  get innerHTML(){ return this._html; }
  get innerText(){ return this._html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
  appendChild(n){ if(n.parentNode) n.remove(); n.parentNode = this; this.hijos.push(n); return n; }
  insertBefore(n, ref){ if(n.parentNode) n.remove(); n.parentNode = this; const i = ref ? this.hijos.indexOf(ref) : -1; if(i < 0) this.hijos.push(n); else this.hijos.splice(i, 0, n); return n; }
  remove(){ if(this.parentNode){ const h = this.parentNode.hijos; h.splice(h.indexOf(this), 1); this.parentNode = null; } }
  get nextSibling(){ if(!this.parentNode) return null; const h = this.parentNode.hijos; return h[h.indexOf(this) + 1] || null; }
  querySelector(sel){
    const m = sel.match(/^#([\w-]+)$/);
    for(const h of this.hijos){ if(m && h.id === m[1]) return h; const r = h.querySelector(sel); if(r) return r; }
    return null;
  }
  /* Los botones del HTML escrito, como objetos a los que se les puede poner onclick. */
  querySelectorAll(sel){
    if(this._botones && this._botones[sel]) return this._botones[sel];
    let out = [];
    if(sel === '.cs-nav-b') out = [...this._html.matchAll(/<button class="cs-nav-b[^"]*" data-v="([^"]+)"/g)].map(x => Object.assign(new El('button'), { dataset: { v: x[1] } }));
    if(sel === '[data-cs]') out = [...this._html.matchAll(/<(input|button|select)\b[^>]*data-cs="([^"]+)"[^>]*>/g)].map(x => { const e = new El(x[1]); e.atrs['data-cs'] = x[2]; const v = x[0].match(/data-v="([^"]+)"/); if(v) e.atrs['data-v'] = v[1]; return e; });
    if(sel === 'button[data-nombre]') out = [...this._html.matchAll(/<button class="cs-b" data-nombre="([^"]+)"/g)].map(x => Object.assign(new El('button'), { dataset: { nombre: x[1] } }));
    (this._botones = this._botones || {})[sel] = out;
    return out;
  }
}

function armar(o){
  o = o || {};
  const diario = [], avisos = [];
  const body = new El('body');
  body.classList = { remove: (c) => diario.push('quita ' + c), contains: () => !!o.epAbierto };
  const doc = { body, createElement: (t) => new El(t), getElementById: (id) => body.querySelector('#' + id), querySelector: () => null };
  const PROD = { datos: ('datos' in o) ? o.datos : PR.prodNormalizar(VOLCADO), cuando: new Date(2026, 9, 6).getTime() };
  const LDB = { showId: 's1', browse: false };
  let vivo = !!o.vivo;
  const M = montar([['/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST', '/* ═══ FIN DE CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST']],
    ['CS', 'CS_SECCIONES', 'CS_ICO', 'csIco', 'csResumen', 'csOcupacion', 'csTalentos', 'csProduccion', 'csSinPrograma', 'csHtml', 'csNavHtml', 'csPintar', 'csIr', 'csRepintar', 'csCablear', 'csActualizar', 'csPintarSinPrograma'],
    { castNorm: PR.prodCasarPrograma && ((t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()),
      document: doc, prodPuede: () => (o.puede !== undefined ? o.puede : true), PROD: PROD, PROD_ET: PR.PROD_ET,
      prodIndices: PR.prodIndices, prodAlertasEp: PR.prodAlertasEp, prodPlazo: PR.prodPlazo, prodFormatoDubcard: PR.prodFormatoDubcard, prodFichaTexto: PR.prodFichaTexto, prodCasarPrograma: PR.prodCasarPrograma,
      prodPanel: () => diario.push('prodPanel'), prodVista: 'programas',
      prodImportarDesdeDublajeCast: async () => { diario.push('importa'); return { r: 1 }; }, prodResumenTexto: () => 'Traído de DublajeCast: …',
      dcSesion: async () => (o.sesion ? { id: 'u' } : null),
      dcastDatos: () => ({ datos: PROD.datos, vivo: vivo }), dcastAbrir: (v) => { diario.push('dcastAbrir ' + v); return true; },
      castAviso: (t) => avisos.push(t), sbShows: () => [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }], LDB: LDB, libView: 'eps',
      renderLibrary: () => diario.push('renderLibrary'), newShow: async () => { body.appendChild(Object.assign(new El('input'), { id: 'npName', value: '', focus: () => {} })); diario.push('newShow'); },
      esc: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), fallo: (d) => diario.push('fallo ' + d), _svgI: undefined });
  return { M, diario, avisos, doc, body, PROD, LDB };
}

/** Una biblioteca como la de Dubbipt: cabecera y lista dentro de su caja. */
function biblioteca(doc){
  const lib = new El('div'); lib.id = 'lib';
  const cab = new El('div'); cab.id = 'dashHead';
  const grid = new El('div'); grid.id = 'libGrid';
  lib.appendChild(cab); lib.appendChild(grid); doc.body.appendChild(lib);
  return { lib, cab, grid };
}

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{2B05}\u{2B55}\u{23E9}-\u{23FA}\u{FE0F}]/u;

exports.pruebas = async function(t){
  const { M } = armar();
  const d = PR.prodNormalizar(VOLCADO);

  t.seccion('1 · las secciones de DublajeCast, en su orden');
  t.eq('las nueve, como en su barra', M.CS_SECCIONES.map(s => s.t).join(' · '), 'Dashboard · Programas · Talentos · Ocupación · Tráilers · Producción · DUBCARDs · Pegado de casting · Breakdowns');
  t.eq('las tres que procesan archivos, todavía la herramienta de allí', M.CS_SECCIONES.filter(s => s.dc).map(s => s.v + '>' + s.dc).join(' '), 'dubcards>dubcards pegado>pegado breakdowns>breakdowns');
  const nav = M.csNavHtml('talentos');
  t.ok('la activa, marcada; las de DublajeCast, distinguidas', /class="cs-nav-b on" data-v="talentos"/.test(nav) && /class="cs-nav-b cs-nav-dc" data-v="pegado"/.test(nav) && (nav.match(/ on"/g) || []).length === 1);
  t.ok('cada una con su icono de trazo', (nav.match(/<svg [^>]*stroke="currentColor"/g) || []).length === 9);
  t.ok('todos los iconos dibujados', M.CS_SECCIONES.every(s => M.CS_ICO[s.v]) && ['externo', 'actualizar', 'aviso', 'estrella', 'entrar', 'cerrar', 'derecha', 'abajo', 'mas', 'subir', 'bajar', 'traer'].every(k => M.CS_ICO[k]));
  t.eq('un icono que no existe, vacío pero sin romper', /<svg[^>]*><\/svg>/.test(M.csIco('nada')), true);

  t.seccion('2 · el Dashboard');
  const r = M.csResumen(d, HOY);
  t.eq('los números', [r.enCurso, r.programas, r.capitulos, r.talentos, r.asignaciones, r.sinTalento, r.trailersPendientes].join(' '), '2 3 4 4 4 1 2', 'el casting repetido cuenta una vez; TITO BOY sale y no tiene talento');
  t.eq('las entregas que vienen, la peor primero', r.entregas.map(e => e.texto + ' · ' + e.programa + ' ' + e.capitulo).join(' | '), 'Miami vencida hace 1 d · A Filipino Christmas 1 | DUBCARD en 1 d · Akka 1 | DUBCARD en 2 d · A Filipino Christmas 1',
       'el capítulo en producción no avisa de Miami, y el finalizado no avisa de nada');
  t.eq('los tráilers pendientes, el más urgente primero y los sin fecha al final', r.trailers.map(x => x.titulo + ':' + x.texto).join(' | '), 'Tráiler oficial:Mañana | Tráiler 2:Sin fecha');
  t.eq('sin datos, todo a cero', JSON.stringify(M.csResumen(null, HOY)), JSON.stringify({ enCurso: 0, programas: 0, capitulos: 0, talentos: 0, asignaciones: 0, sinTalento: 0, trailersPendientes: 0, entregas: [], trailers: [] }));

  t.seccion('3 · la Ocupación');
  const oc = M.csOcupacion(d);
  t.eq('por líneas: personajes, capítulos y líneas de cada talento', oc.map(o => o.talento + ' ' + o.personajes + '/' + o.capitulos + '/' + o.lineas).join(' | '), 'ANA ROJAS 1/2/276 | BEATRIZ SOL 1/1/54 | CARLOS RUIZ 1/1/40',
       'ALLY en dos capítulos es un personaje; el casting repetido no suma dos veces sus 186 líneas');
  t.eq('con sus programas', oc[0].programas.join(','), 'A Filipino Christmas');
  t.eq('quien no tiene asignaciones no sale', oc.some(o => o.talento === 'DIANA PAZ'), false);
  t.eq('primero quien más líneas tiene, aunque el nombre vaya después', M.csOcupacion(PR.prodNormalizar({ series: [{ id: 1, name: 'A' }], episodes: [{ id: 1, series_id: 1 }], characters: [{ id: 1, canonical_name: 'P1' }, { id: 2, canonical_name: 'P2' }],
       talents: [{ id: 1, name: 'ZOE' }, { id: 2, name: 'ANA' }], appearances: [{ character_id: 1, episode_id: 1, line_count: 100 }, { character_id: 2, episode_id: 1, line_count: 10 }],
       castings: [{ character_id: 1, talent_id: 1, episode_id: 1 }, { character_id: 2, talent_id: 2, episode_id: 1 }] })).map(o => o.talento).join(','), 'ZOE,ANA');
  t.eq('limitada a un programa', M.csOcupacion(d, 2).map(o => o.talento).join(',') + ' · ' + M.csOcupacion(d, '1').map(o => o.talento).join(','), 'CARLOS RUIZ · ANA ROJAS,BEATRIZ SOL');
  t.eq('un mismo nombre de personaje en dos programas son dos personajes', M.csOcupacion(PR.prodNormalizar({ series: [{ id: 1, name: 'A' }, { id: 2, name: 'B' }], episodes: [{ id: 1, series_id: 1 }, { id: 2, series_id: 2 }], characters: [{ id: 9, canonical_name: 'MAMÁ' }], talents: [{ id: 1, name: 'X' }], castings: [{ character_id: 9, talent_id: 1, episode_id: 1 }, { character_id: 9, talent_id: 1, episode_id: 2 }] }))[0].personajes, 2);
  t.eq('sin datos, vacía', M.csOcupacion(null).length, 0);

  t.seccion('4 · los Talentos');
  const ta = M.csTalentos(d, '');
  t.eq('todos, por nombre, con su ficha', ta.map(x => x.nombre + (x.ficha ? ' (' + x.ficha + ')' : '')).join(' | '), 'ANA ROJAS (Femenino · Adulto · Agudo) | BEATRIZ SOL | CARLOS RUIZ (Barítono) | DIANA PAZ');
  t.eq('con sus papeles por programa, sin repetir', JSON.stringify(ta[0].programas), '[{"programa":"A Filipino Christmas","personajes":["ALLY"]}]');
  t.eq('buscando, sin mayúsculas ni acentos', M.csTalentos(d, 'ruiz').map(x => x.nombre).join(',') + ' · ' + M.csTalentos(d, 'zzz').length, 'CARLOS RUIZ · 0');

  t.seccion('5 · Producción');
  const pr = M.csProduccion(d, HOY, false);
  t.eq('un capítulo por fila, los de alertas primero', pr.map(f => f.programa + ' ' + f.capitulo).join(' | '), 'A Filipino Christmas 1 | Akka 1 | A Filipino Christmas 2 | Dofus 1');
  t.eq('con su fase, su cliente y su DUBCARD', [pr[0].fase, pr[0].cliente, pr[0].dubcard + ' ' + pr[0].fechaDubcard, pr[1].dubcard].join(' · '), 'Preproducción · Netflix · BACKLOT ' + dia(2) + ' · Excel');
  t.eq('solo los que tienen alertas', M.csProduccion(d, HOY, true).map(f => f.programa + ' ' + f.capitulo + ' ' + f.alertas.length).join(' | '), 'A Filipino Christmas 1 2 | Akka 1 1');

  t.seccion('6 · Programas: los de DublajeCast que aún no están en Dubbipt');
  t.eq('se nombran para crearlos', M.csSinPrograma(d, [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }]).join(', '), 'Akka, Dofus');
  t.eq('sin datos, ninguno', M.csSinPrograma(null, []).length, 0);

  t.seccion('7 · lo que se pinta: con los datos, sin ellos, y sin emojis');
  const vistas = ['dashboard', 'talentos', 'ocupacion', 'trailers', 'produccion', 'dubcards', 'pegado', 'breakdowns'];
  const html = {}; vistas.forEach(v => { html[v] = M.csHtml(v, HOY); });
  t.ok('cada sección con su título y de dónde salen los datos', ['Dashboard', 'Talentos', 'Ocupación', 'Tráilers', 'Producción'].every((n, i) => html[vistas[i]].indexOf('<h2>' + n + '</h2>') >= 0 && /Datos de DublajeCast del 6\/10\/2026/.test(html[vistas[i]])));
  t.ok('el Dashboard, con sus números y sus listas', /<b>2<\/b><span>programas en curso<\/span>/.test(html.dashboard) && /cs-kpi cs-kpi-aviso"><b>1<\/b><span>personajes sin talento/.test(html.dashboard) && /Miami vencida hace 1 d/.test(html.dashboard) && /Tráiler oficial/.test(html.dashboard));
  t.ok('la Ocupación, con el selector de programa y la barra de cada uno', /<select data-cs="programa">/.test(html.ocupacion) && /style="width:100%"><\/i><em>276<\/em>/.test(html.ocupacion) && /style="width:14%"><\/i><em>40<\/em>/.test(html.ocupacion));
  t.ok('Producción, con su filtro', /<input type="checkbox" data-cs="soloAlertas">/.test(html.produccion));
  t.ok('las herramientas de DublajeCast, con su explicación y su botón', /Prepara las DUBCARD/.test(html.dubcards) && /data-cs="herramienta" data-v="dubcards"/.test(html.dubcards) && /data-v="pegado"/.test(html.pegado) && /data-v="breakdowns"/.test(html.breakdowns));
  t.ok('ni un emoji en ninguna', vistas.every(v => !EMOJI.test(html[v])) && !EMOJI.test(M.csNavHtml('dashboard')), vistas.filter(v => EMOJI.test(html[v])).join(','));
  {
    const V = armar({ vivo: true });
    t.ok('en vivo, lo dice', /DublajeCast en vivo/.test(V.M.csHtml('dashboard', HOY)));
    const N = armar({ datos: null });
    t.ok('sin datos: qué falta y cómo traerlo', ['dashboard', 'talentos', 'ocupacion', 'trailers', 'produccion'].every(v => /Todavía no hay datos de DublajeCast\./.test(N.M.csHtml(v, HOY)) && /data-cs="traer"/.test(N.M.csHtml(v, HOY))));
    t.eq('una sección que no existe, nada', N.M.csHtml('nada', HOY), '');
  }
  {
    const B = armar(); B.M.CS.buscar = 'zz';
    t.ok('buscar sin resultados lo dice', /Ningún talento con «zz»/.test(B.M.csHtml('talentos', HOY)));
    B.M.CS.soloAlertas = true; B.PROD.datos = PR.prodNormalizar({ series: [{ id: 1, name: 'X' }], episodes: [{ id: 1, series_id: 1, fase: 'completado' }] });
    t.ok('ni un capítulo con alertas, lo dice', /Ningún capítulo con alertas\./.test(B.M.csHtml('produccion', HOY)));
  }

  t.seccion('8 · montarlo en la biblioteca');
  {
    const A = armar();
    const b = biblioteca(A.doc);
    t.eq('en Programas: la barra encima, la lista de Dubbipt a la vista', A.M.csPintar('shows', b.cab, b.grid) + ' ' + (b.lib.hijos[0].id) + ' ' + (b.grid.style.display || 'visible') + ' ' + A.doc.getElementById('csVista').style.display, 'true csNav visible none');
    t.ok('la barra, con Programas activa', /class="cs-nav-b on" data-v="programas"/.test(A.doc.getElementById('csNav').innerHTML));
    t.eq('y debajo, los programas que faltan', !!A.doc.getElementById('csSinProg') && A.doc.getElementById('csSinProg').innerText, 'En DublajeCast y todavía no en Dubbipt Akka Dofus');
    const crear = A.doc.getElementById('csSinProg').querySelectorAll('button[data-nombre]')[0];
    await crear.onclick();
    t.eq('pulsar uno abre «Nuevo programa» con su nombre', A.doc.getElementById('npName').value, 'Akka');
    A.M.CS.vista = 'ocupacion';
    A.M.csPintar('shows', b.cab, b.grid);
    t.eq('en otra sección: la lista y su cabecera, tapadas; la sección, a la vista', [b.cab.style.display, b.grid.style.display, A.doc.getElementById('csVista').style.display].join(' '), 'none none ');
    t.ok('con lo suyo dentro', /<h2>Ocupación<\/h2>/.test(A.doc.getElementById('csVista').innerHTML));
    t.eq('y sin los programas que faltan, que solo van en Programas', A.doc.getElementById('csSinProg'), null);
    t.eq('repintar no duplica nada', b.lib.hijos.filter(h => h.id === 'csNav').length + ' ' + b.lib.hijos.filter(h => h.id === 'csVista').length, '1 1');
    const vi = A.doc.getElementById('csVista');
    const ctl = vi.querySelectorAll('[data-cs]');
    ctl.find(c => c.getAttribute('data-cs') === 'programa').value = '2';
    ctl.find(c => c.getAttribute('data-cs') === 'programa').onchange();
    t.eq('el selector de programa filtra y repinta', A.M.CS.programa + ' ' + A.diario.includes('renderLibrary'), '2 true');
    A.M.CS.vista = 'pegado'; A.M.csPintar('shows', b.cab, b.grid);
    A.doc.getElementById('csVista').querySelectorAll('[data-cs]').find(c => c.getAttribute('data-cs') === 'herramienta').onclick();
    t.ok('la herramienta de DublajeCast se abre en su pantalla', A.diario.includes('dcastAbrir pegado'));
    A.M.CS.vista = 'dashboard';
    const cabEp = new El('div'); cabEp.id = 'epsHead'; b.lib.insertBefore(cabEp, b.grid);
    A.M.csPintar('eps', cabEp, b.grid);
    t.eq('dentro de un programa: la barra con Programas activa y la lista a la vista', /class="cs-nav-b on" data-v="programas"/.test(A.doc.getElementById('csNav').innerHTML) + ' ' + (b.grid.style.display || 'visible') + ' ' + b.lib.hijos.indexOf(A.doc.getElementById('csNav')) + '<' + b.lib.hijos.indexOf(cabEp), 'true visible 1<2');
    A.doc.getElementById('csNav').querySelectorAll('.cs-nav-b').find(x => x.dataset.v === 'talentos').onclick();
    t.eq('y pulsar otra sección vuelve a la biblioteca en esa sección', [A.M.CS.vista, String(A.LDB.showId), A.LDB.browse].join(' '), 'talentos null true');
  }
  {
    const N = armar({ puede: false });
    const b = biblioteca(N.doc);
    const nav = new El('nav'); nav.id = 'csNav'; b.lib.insertBefore(nav, b.cab);
    const vi = new El('div'); vi.id = 'csVista'; b.lib.appendChild(vi);
    b.grid.style.display = 'none';
    t.eq('quien no es administrador en Casting: nada de esto, y la lista vuelve', N.M.csPintar('shows', b.cab, b.grid) + ' ' + N.doc.getElementById('csNav') + ' ' + N.doc.getElementById('csVista') + ' ' + (b.grid.style.display || 'visible'), 'false null null visible');
  }
  {
    const A = armar();
    t.eq('una sección que no existe no se abre', A.M.csIr('borrar') + ' ' + A.diario.includes('renderLibrary'), 'false false');
    const E = armar({ epAbierto: true });
    E.M.csRepintar();
    t.eq('con un capítulo abierto, repintar no lo saca de él', E.diario.includes('renderLibrary'), false);
  }

  t.seccion('9 · Actualizar');
  {
    const V = armar({ vivo: true });
    t.eq('en vivo ya está al día', await V.M.csActualizar() + ' ' + V.diario.includes('importa'), 'vivo false');
    const S = armar({ sesion: false });
    t.eq('sin sesión del puente: se abre DublajeCast para entrar', await S.M.csActualizar() + ' ' + S.diario.includes('dcastAbrir dashboard') + ' ' + /entra en tu cuenta de DublajeCast/.test(S.avisos[0]), 'sesion true true');
    const C = armar({ sesion: true });
    t.eq('con sesión: se trae, se dice y se repinta', await C.M.csActualizar() + ' ' + C.diario.includes('importa') + ' ' + C.diario.includes('renderLibrary') + ' ' + C.avisos[0], 'traido true true Traído de DublajeCast: …');
  }

  t.seccion('10 · sin emojis en lo que se ve de Casting');
  const comentario = (l) => /^\s*(\*|\/\*|\/\/)/.test(l);
  for(const f of ['js/castingvistas.js', 'js/dublajecast.js', 'js/produccion.js', 'dublajecast/puente.js']){
    const malas = fs.readFileSync(path.join(RAIZ, f), 'utf8').split(/\r?\n/).map((l, i) => [i + 1, l]).filter(([, l]) => !comentario(l) && EMOJI.test(l));
    t.eq(f + ': ninguno', malas.map(([n]) => n).join(','), '');
  }
  const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  t.ok('la campana y la configuración, con iconos de trazo', /aria-label="Notificaciones"><svg /.test(HTML) && /aria-label="Configuración y cuenta"><svg /.test(HTML));
  t.ok('y Programas: buscar, Herramientas y Optimizar, también', /<span class="fi">'\+_svgI\(/.test(HTML) && /ningún capítulo">'\+_svgI\(/.test(HTML) && /abran al instante">'\+_svgI\(/.test(HTML));
};
