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

/* Lo de DublajeCast entero que se usa aquí, de verdad. */
const DC = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DUBLAJECAST ENTERO', '/* ═══ FIN DE DUBLAJECAST ENTERO']],
  ['dcastSerieDe', 'dcastEpDeDc', 'dcastFilasCasting', 'dcastNumerosDe'],
  { castNorm: undefined, prodCasarPrograma: PR.prodCasarPrograma, prodIndices: PR.prodIndices, window: { addEventListener: () => {} }, document: {}, location: { origin: '' } });

/* En Dubbipt: un programa con tres capítulos, uno con libreto; y su registro de casting. */
const SHOWS = [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }];
const EPS_DUB = { s1: [{ id: 'e1', show_id: 's1', name: 'Episodio 1' }, { id: 'e2', show_id: 's1', name: 'Episodio 2' }, { id: 'e9', show_id: 's1', name: 'Especial de Navidad' }] };
const REGISTRO = { personajes: { JANA: { display: 'JANA', talent: 'LUZ MAR', episodios: ['Episodio 1'] } } };

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
  get firstChild(){ return this.hijos[0] || null; }
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
    if(sel === '[data-cs]') out = [...this._html.matchAll(/<(input|button|select)\b[^>]*data-cs="([^"]+)"[^>]*>/g)].map(x => {
      const e = new El(x[1]);
      for(const m of x[0].matchAll(/(data-[\w-]+)="([^"]*)"/g)) e.atrs[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&amp;/g, '&');
      const val = x[0].match(/ value="([^"]*)"/); e.value = val ? val[1] : '';
      const cls = x[0].match(/ class="([^"]*)"/); e.className = cls ? cls[1] : '';
      e.classList = { contains: (c) => e.className.split(/\s+/).includes(c) };
      return e;
    });
    if(sel === 'button[data-nombre]') out = [...this._html.matchAll(/<button class="cs-b" data-nombre="([^"]+)"/g)].map(x => Object.assign(new El('button'), { dataset: { nombre: x[1] } }));
    (this._botones = this._botones || {})[sel] = out;
    return out;
  }
}

function armar(o){
  o = o || {};
  const diario = [], avisos = [];
  const body = new El('body');
  const clases = new Set();
  body.classList = { remove: (c) => { diario.push('quita ' + c); clases.delete(c); }, contains: (c) => c === 'ep-open' ? !!o.epAbierto : clases.has(c),
                     toggle: (c, si) => { if(si) clases.add(c); else clases.delete(c); } };
  const doc = { body, createElement: (t) => new El(t), getElementById: (id) => body.querySelector('#' + id), querySelector: () => null };
  const PROD = { datos: ('datos' in o) ? o.datos : PR.prodNormalizar(VOLCADO), cuando: new Date(2026, 9, 6).getTime(), cargado: true, ws: 'w' };
  const LDB = { showId: ('showId' in o) ? o.showId : null, browse: false, dataEps: new Set(['e1']) };
  let vivo = !!o.vivo;
  const M = montar([['/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST', '/* ═══ FIN DE CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST']],
    ['CS', 'CS_SECCIONES', 'CS_ICO', 'csIco', 'csResumen', 'csOcupacion', 'csTalentos', 'csProduccion', 'csHtml', 'csNavHtml', 'csPintar', 'csIr', 'csRepintar', 'csCablear', 'csActualizar',
     'csNumeroDe', 'csProgramas', 'csFiltrarProgramas', 'csEpisodios', 'csCastingDe', 'csActual', 'csRegistroDe', 'csRealizarCasting', 'csTablaCasting', 'csBorrarPrograma', 'csBorrarEpisodio'],
    { castNorm: PR.prodCasarPrograma && ((t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim()),
      document: doc, prodPuede: () => (o.puede !== undefined ? o.puede : true), PROD: PROD, PROD_ET: PR.PROD_ET,
      prodIndices: PR.prodIndices, prodAlertasEp: PR.prodAlertasEp, prodPlazo: PR.prodPlazo, prodFormatoDubcard: PR.prodFormatoDubcard, prodFichaTexto: PR.prodFichaTexto, prodCasarPrograma: PR.prodCasarPrograma,
      prodPanel: () => diario.push('prodPanel'), prodVista: 'programas',
      prodImportarDesdeDublajeCast: async () => { diario.push('importa'); return { r: 1 }; }, prodResumenTexto: () => 'Traído de DublajeCast: …',
      dcSesion: async () => (o.sesion ? { id: 'u' } : null),
      dcastDatos: () => ({ datos: PROD.datos, vivo: vivo }), dcastAbrir: (v) => { diario.push('dcastAbrir ' + v); return true; },
      castAviso: (t) => avisos.push(t), sbShows: () => (o.shows || SHOWS), sbEps: (id) => EPS_DUB[id] || [], LDB: LDB, libView: 'eps',
      dcastSerieDe: DC.dcastSerieDe, dcastEpDeDc: DC.dcastEpDeDc, dcastFilasCasting: DC.dcastFilasCasting, dcastNumerosDe: DC.dcastNumerosDe,
      castRegCargar: async (id) => { diario.push('registro ' + id); return o.registro !== undefined ? o.registro : REGISTRO; },
      ponerModo: (ep, m) => diario.push('ponerModo ' + ep + ' ' + m), openEpisode: async (id) => diario.push('openEpisode ' + id),
      libBorrarPrograma: async (sh) => { diario.push('borraProg ' + sh.id); return o.borrar !== false; },
      libBorrarCapitulo: async (ep) => { diario.push('borraEp ' + ep.id); return o.borrar !== false; },
      newEpisodeModal: () => { body.appendChild(Object.assign(new El('input'), { id: 'neName', value: '' })); diario.push('newEpisodeModal ' + LDB.showId); },
      renderLibrary: () => diario.push('renderLibrary'), newShow: async () => { body.appendChild(Object.assign(new El('input'), { id: 'npName', value: '', focus: () => {} })); diario.push('newShow'); },
      esc: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), fallo: (d) => diario.push('fallo ' + d), _svgI: undefined, prodCargar: async () => { diario.push('carga'); }, prodWs: () => 'w', prodSincronizar: async () => { diario.push('asegura'); return false; }, prodCopias: async () => [],
      currentEp: o.epAbierto ? { id: 'e1' } : null,
      DDL_MODO: ('modo' in o) ? o.modo : 'casting', herramientasPanel: () => diario.push('herramientasPanel'),
      dcxHistorial: () => (PROD.datos && PROD.datos.historialDubbipt) || [], dcxEntrada: (que, ctx) => Object.assign({ cuando: '2026-10-08T10:00:00Z', quien: 'Pamela', que: que }, ctx || {}),
      dcxRegistrar: (e) => diario.push('apunta ' + e.que), dcxRelevosAceptados: () => [] });
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

  t.seccion('6 · Programas, programa y episodio, como en DublajeCast');
  const progs = M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], d);
  t.eq('todos los programas: los de Dubbipt con lo que sabe DublajeCast, y los que solo están allí', progs.map(p => p.clave + ' ' + p.nombre + ' ' + p.estado).join(' | '), 's:s1 A FILIPINO CHRISTMAS en_curso | dc:2 Akka en_curso | dc:3 Dofus completo');
  t.eq('con su cliente, de DublajeCast', progs.map(p => p.cliente || '—').join(' '), 'Netflix Discovery —');
  t.eq('uno de Dubbipt que DublajeCast no tiene, en curso y sin serie', JSON.stringify(M.csProgramas([{ id: 'x', name: 'Nuevo' }], () => [], d).find(p => p.clave === 's:x'), ['estado', 'serie']), '{"estado":"en_curso","serie":null}');
  t.eq('todos por nombre, vengan de donde vengan', M.csProgramas([{ id: 'z', name: 'Zeta' }], () => [], d).map(p => p.nombre).join(','), 'A Filipino Christmas,Akka,Dofus,Zeta');
  t.eq('sin datos de DublajeCast, solo los de Dubbipt', M.csProgramas(SHOWS, () => [], null).map(p => p.clave).join(','), 's:s1');
  t.eq('filtrar por estado, como en DublajeCast', ['todos', 'en_curso', 'completo'].map(f => M.csFiltrarProgramas(progs, f, '').length).join(' '), '3 2 1');
  t.eq('y buscar por nombre o cliente, sin mayúsculas', M.csFiltrarProgramas(progs, 'todos', 'netflix').map(p => p.nombre).join(',') + ' · ' + M.csFiltrarProgramas(progs, 'en_curso', 'dofus').length, 'A FILIPINO CHRISTMAS · 1');
  t.eq('buscando se mira en todos, también los completados, aunque se esté en «En curso»', M.csFiltrarProgramas(progs, 'en_curso', 'dofus').map(p => p.estado).join(','), 'completo');
  t.eq('palabra a palabra, también en los capítulos: «filipino 102» encuentra el programa que tiene el 102', M.csFiltrarProgramas([{ nombre: 'A FILIPINO CHRISTMAS', eps: [{ name: 'Episodio 102' }], dcEps: [] }, { nombre: 'Otro', eps: [{ name: 'Episodio 102' }], dcEps: [] }], 'en_curso', 'filipino 102').map(p => p.nombre).join(','), 'A FILIPINO CHRISTMAS');
  t.eq('y en los de DublajeCast, por título o número', M.csFiltrarProgramas([{ nombre: 'Akka', eps: [], dcEps: [{ title: 'The Last New Year', episode_number: 7 }] }], 'todos', 'akka 7').length + ' ' + M.csFiltrarProgramas([{ nombre: 'Akka', eps: [], dcEps: [{ title: 'The Last New Year', episode_number: 7 }] }], 'todos', 'last year').length, '1 1');
  t.eq('si falta una palabra, no', M.csFiltrarProgramas([{ nombre: 'A FILIPINO CHRISTMAS', eps: [{ name: 'Episodio 101' }], dcEps: [] }], 'todos', 'filipino 102').length, 0);
  const p1 = progs[0], eps1 = M.csEpisodios(p1);
  t.eq('los episodios: los de Dubbipt con su pareja de DublajeCast, por número; sin número, al final', eps1.map(e => e.clave + ' ' + e.numero + ' ' + (e.dcEp ? e.dcEp.id : '—')).join(' | '), 'e:e1 1 11 | e:e2 2 12 | e:e9 null —');
  t.eq('con el título de DublajeCast cuando es otro', eps1[0].dcTitulo, 'Boracay');
  const epsAkka = M.csEpisodios(progs[1]);
  t.eq('los de un programa que solo está en DublajeCast', epsAkka.map(e => e.clave + ' ' + e.titulo).join(' | '), 'd:21 Akka 1');
  const mezcla = M.csEpisodios(M.csProgramas(SHOWS, () => [{ id: 'e1', name: 'Episodio 1' }], PR.prodNormalizar({ series: [{ id: 1, name: 'A Filipino Christmas' }], episodes: [{ id: 11, series_id: 1, episode_number: 1 }, { id: 13, series_id: 1, episode_number: 3, title: 'Año nuevo' }] }))[0]);
  t.eq('y los que DublajeCast tiene y Dubbipt todavía no, en su sitio', mezcla.map(e => e.clave + ' ' + e.numero).join(' | '), 'e:e1 1 | d:13 3');
  const porTitulo = M.csEpisodios(M.csProgramas(SHOWS, () => [{ id: 'f', name: 'Año nuevo' }], PR.prodNormalizar({ series: [{ id: 1, name: 'A Filipino Christmas' }], episodes: [{ id: 13, series_id: 1, episode_number: 3, title: 'Año nuevo' }] }))[0]);
  t.eq('un episodio que casa por título lleva el número de DublajeCast', porTitulo.map(e => e.clave + ' ' + e.numero).join(' | '), 'e:f 3');
  t.eq('el número de un nombre', [M.csNumeroDe('Episodio 12'), M.csNumeroDe('E02 Piloto'), M.csNumeroDe('Especial')].join(' '), '12 2 NaN');
  t.eq('un episodio que solo está en DublajeCast no recoge nada del registro, ni lo apuntado sin capítulo', DC.dcastFilasCasting(d, d.episodes.find(e => e.id === 21), { personajes: { X: { display: 'X', talent: 'Y', episodios: [''] } } }, '').map(f => f.personaje).join(','), 'MANJAYA');
  {
    /* «Los episodios que no estén creados en DublajeCast, crea el casting y el reparto.» */
    const reg = { personajes: { ALLY: { display: 'Ally', talent: 'VIEJA', episodios: ['Episodio 7'] } },
                  capitulos: { 'Episodio 7': { personajes: { ALLY: { display: 'Ally', talent: 'BETO LUNA', lineas: 40 }, TITO: { display: 'Tito', talent: '', lineas: 6 } } } } };
    const fl = DC.dcastFilasCasting(null, null, reg, 'episodio 7');
    t.eq('uno solo de Dubbipt: todos sus personajes, con líneas y su talento (o sin él), de su foto', fl.map(f => f.personaje + ':' + (f.talento || '-') + ':' + f.lineas).join(' '), 'Ally:BETO LUNA:40 Tito:-:6');
  }
  t.eq('el casting de un episodio: DublajeCast y el registro de Dubbipt', M.csCastingDe(eps1[0], d, REGISTRO).map(f => f.personaje + '=' + f.talento + (f.choca ? '!' : '')).join(' '), 'ALLY=ANA ROJAS JANA=LUZ MAR! TITO BOY=');

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

  {
    const T = armar();
    const filas = [{ personaje: 'ZOE', lineas: 100, talento: 'A' }, { personaje: 'ANA', lineas: 5, talento: '' }];
    const orden = () => { const h = T.M.csTablaCasting(filas); return h.indexOf('>ZOE<') < h.indexOf('>ANA<') ? 'ZOE,ANA' : 'ANA,ZOE'; };
    T.M.CS.orden = 'lineas'; const l = orden(); T.M.CS.orden = 'personaje';
    t.eq('la tabla del casting, por líneas o por personaje', l + ' · ' + orden(), 'ZOE,ANA · ANA,ZOE');
  }

  t.seccion('8 · la distribución de DublajeCast, montada en la biblioteca');
  const vista = (A) => A.doc.getElementById('csVista').innerHTML;
  const control = (A, que, v) => A.doc.getElementById('csVista').querySelectorAll('[data-cs]').find(c => c.getAttribute('data-cs') === que && (v === undefined || c.getAttribute('data-v') === v));
  const espera = () => new Promise(r => setTimeout(r, 0));
  {
    const A = armar();
    const b = biblioteca(A.doc);
    t.eq('con el perfil Casting: la barra a la izquierda, primera; la sección al lado; lo de siempre, tapado', A.M.csPintar('shows', b.cab, b.grid) + ' ' + b.lib.hijos.map(h => h.id).join(',') + ' ' + A.body.classList.contains('cs-on'), 'true csNav,csVista,dashHead,libGrid true');
    t.eq('y al pintar, se asegura de tener lo de DublajeCast', A.diario.filter(x => x === 'asegura').length, 1);
    t.ok('la barra con su título y Programas activa', /<div class="cs-nav-t">Casting<\/div>/.test(A.doc.getElementById('csNav').innerHTML) && /class="cs-nav-b on" data-v="programas"/.test(A.doc.getElementById('csNav').innerHTML));
    t.ok('Programas: las tarjetas, en curso primero como en DublajeCast', /<h2>Programas<\/h2>/.test(vista(A)) && /2 de 3/.test(vista(A)) && /data-v="s:s1"/.test(vista(A)) && /data-v="dc:2"/.test(vista(A)) && !/data-v="dc:3"/.test(vista(A)));
    t.ok('con sus pestañas y cuántos hay en cada una', /data-cs="filtro" data-v="todos">Todos <b>3<\/b>/.test(vista(A)) && /data-v="en_curso">En curso <b>2<\/b>/.test(vista(A)) && /data-v="completo">Completados <b>1<\/b>/.test(vista(A)));
    t.ok('el que solo está en DublajeCast, dicho', /Akka[\s\S]*?Solo en DublajeCast/.test(vista(A)));
    control(A, 'filtro', 'completo').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.ok('la pestaña Completados enseña los completados', /data-v="dc:3"/.test(vista(A)) && !/data-v="s:s1"/.test(vista(A)));
    control(A, 'filtro', 'en_curso').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'abrirProg', 's:s1').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.eq('Abrir: el programa, con sus episodios', A.M.CS.vista + ' ' + /<h2>A FILIPINO CHRISTMAS<\/h2>/.test(vista(A)) + ' ' + /Episodios \(3\)/.test(vista(A)), 'programa true true');
    t.ok('cada episodio con su estado en Dubbipt y su casting', /<b>Ep\. 1<\/b><span>Episodio 1<\/span>[\s\S]*?Con libreto[\s\S]*?<b>3<\/b> pers\.[\s\S]*?data-cs="abrirEp" data-v="e:e1"/.test(vista(A)) && /Episodio 2<\/span>[\s\S]*?Sin libreto/.test(vista(A)));
    t.ok('la barra sigue con Programas activa', /class="cs-nav-b on" data-v="programas"/.test(A.doc.getElementById('csNav').innerHTML));
    const antes = A.diario.filter(x => x === 'renderLibrary').length;
    await espera(); await espera();
    t.eq('al llegar el registro de Dubbipt, se repinta solo', A.diario.filter(x => x === 'renderLibrary').length, antes + 1);
    A.M.csPintar('shows', b.cab, b.grid);
    t.ok('al llegar el registro de Dubbipt, se avisa del talento distinto', A.diario.includes('registro s1') && /1 distinto en DublajeCast/.test(vista(A)));
    control(A, 'nuevoEp').onclick();
    t.ok('Nuevo episodio, en este programa', A.diario.includes('newEpisodeModal s1'));
    control(A, 'dcSerie').onclick();
    t.ok('y el programa en DublajeCast', A.diario.includes('dcastAbrir series'));
    control(A, 'abrirEp', 'e:e1').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.eq('Casting: el episodio', A.M.CS.vista + ' ' + /<h2>Ep\. 1 · Episodio 1<\/h2>/.test(vista(A)), 'episodio true');
    t.ok('el principal, marcado con su estrella', /<i class="cs-prin" title="Principal">[\s\S]*?<\/i>ALLY<\/b>/.test(vista(A)) && !/<\/i>JANA<\/b>/.test(vista(A)));
    t.ok('con el botón «Realizar casting»', /<button class="cs-cta" data-cs="realizar">[\s\S]*?<span>Realizar casting<\/span><\/button>/.test(vista(A)));
    t.ok('su ficha de DublajeCast y su tabla de casting', /<span>Fase<\/span><select data-cs="epCampo" data-campo="fase">[\s\S]*?<option value="pre_produccion" selected>Preproducción<\/option>/.test(vista(A)) && /<span>Alertas<\/span>/.test(vista(A)) && /2 de 3 personajes con talento/.test(vista(A)) && /<div class="cs-fila cs-falta"><span><b>TITO BOY<\/b><\/span><span class="cs-tenue">12<\/span><span><input class="cs-tal-in" list="csListaTalentos" data-cs="talento" data-ep="11" data-ch="103" data-per="TITO BOY" data-antes="" value="" placeholder="Asignar…">/.test(vista(A)));
    control(A, 'orden', 'personaje').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.ok('la tabla, por personaje si se pide', vista(A).indexOf('>ALLY<') < vista(A).indexOf('>JANA<') && vista(A).indexOf('>JANA<') < vista(A).indexOf('>TITO BOY<') && /class="cs-pest on" data-cs="orden" data-v="personaje"/.test(vista(A)));
    A.LDB.showId = 'otro';
    await control(A, 'realizar').onclick(); await espera();
    t.ok('Realizar casting: el capítulo de Dubbipt, abierto con el perfil Casting', A.diario.includes('ponerModo e1 casting') && A.diario.includes('openEpisode e1') && A.LDB.showId === 's1');
    t.eq('y el registro se volverá a leer al volver', 's1' in A.M.CS.registros, false);
    control(A, 'volver', 'programa').onclick();
    t.eq('Volver: al programa', A.M.CS.vista + ' ' + A.M.CS.ep, 'programa null');
    A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'volver', 'programas').onclick();
    t.eq('y a Programas', A.M.CS.vista + ' ' + A.M.CS.prog, 'programas null');
    A.M.CS.vista = 'ocupacion'; A.M.csPintar('shows', b.cab, b.grid);
    t.ok('las demás secciones, en el mismo sitio', /<h2>Ocupación<\/h2>/.test(vista(A)) && /class="cs-nav-b on" data-v="ocupacion"/.test(A.doc.getElementById('csNav').innerHTML));
    t.eq('repintar no duplica nada', b.lib.hijos.filter(h => h.id === 'csNav').length + ' ' + b.lib.hijos.filter(h => h.id === 'csVista').length, '1 1');
    control(A, 'programa').value = '2'; control(A, 'programa').onchange();
    t.eq('el selector de programa de Ocupación filtra y repinta', A.M.CS.programa + ' ' + A.diario.includes('renderLibrary'), '2 true');
    A.M.CS.vista = 'pegado'; A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'herramienta').onclick();
    t.ok('las herramientas de DublajeCast se abren en su pantalla', A.diario.includes('dcastAbrir pegado'));
    A.M.CS.prog = 's:s1'; A.M.CS.ep = 'e:e1'; A.M.csPintar('shows', b.cab, b.grid);
    A.doc.getElementById('csNav').querySelectorAll('.cs-nav-b').find(x => x.dataset.v === 'talentos').onclick();
    t.eq('pulsar una sección de la barra va a ella, desde donde sea', [A.M.CS.vista, String(A.M.CS.prog), String(A.LDB.showId), A.LDB.browse].join(' '), 'talentos null null true');
    t.eq('y el episodio también', String(A.M.CS.ep), 'null');
  }
  {
    const A = armar();
    const b = biblioteca(A.doc);
    A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'filtro', 'todos').onclick();
    control(A, 'abrirProg', 'dc:2').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.ok('un programa que solo está en DublajeCast se ofrece crear en Dubbipt', /data-cs="crearProg"/.test(vista(A)) && !/data-cs="nuevoEp"/.test(vista(A)) && /Solo en DublajeCast/.test(vista(A)));
    control(A, 'abrirEp', 'd:21').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.ok('y su episodio no tiene «Realizar casting»: hay que crear el programa', !/data-cs="realizar"/.test(vista(A)) && /Crear el programa en Dubbipt/.test(vista(A)) && /MANJAYA/.test(vista(A)));
    await control(A, 'crearProg').onclick(); await espera();
    t.eq('crearlo abre «Nuevo programa» con su nombre', A.doc.getElementById('npName').value, 'Akka');
  }
  {
    const A = armar({ showId: 's1' });
    const b = biblioteca(A.doc);
    const cabEp = new El('div'); cabEp.id = 'epsHead'; b.lib.insertBefore(cabEp, b.grid);
    A.M.csPintar('eps', cabEp, b.grid);
    t.eq('si se entra en un programa por otro camino, se enseña ese programa', A.M.CS.vista + ' ' + A.M.CS.prog, 'programa s:s1');
    A.M.CS.vista = 'episodio'; A.M.CS.ep = 'e:e1';
    A.M.csPintar('eps', cabEp, b.grid);
    t.eq('y al volver del capítulo, se vuelve al episodio', A.M.CS.vista + ' ' + A.M.CS.ep, 'episodio e:e1');
  }
  {
    const N = armar({ puede: false });
    const b = biblioteca(N.doc);
    const nav = new El('nav'); nav.id = 'csNav'; b.lib.insertBefore(nav, b.cab);
    const vi = new El('div'); vi.id = 'csVista'; b.lib.appendChild(vi);
    N.M.CS.vista = 'dashboard';
    t.eq('quien no es administrador, en Casting: la misma organización, sin la interfaz antigua', N.M.csPintar('shows', b.cab, b.grid) + ' ' + N.body.classList.contains('cs-on') + ' ' + N.M.CS.vista, 'true true programas');
    t.ok('pero solo con Programas: nada de lo que viene de DublajeCast', (N.doc.getElementById('csNav').innerHTML.match(/class="cs-nav-b/g) || []).length === 1 && /data-v="programas"/.test(N.doc.getElementById('csNav').innerHTML)
      && /data-v="s:s1"/.test(N.doc.getElementById('csVista').innerHTML) && !/Akka|dc:2|importarTodo/.test(N.doc.getElementById('csVista').innerHTML));
    t.eq('y no puede ir a las demás secciones', N.M.csIr('talentos'), false);
    N.M.CS.vista = 'programa'; N.M.CS.prog = 's:s1'; N.M.csPintar('shows', b.cab, b.grid);
    t.ok('ni ve los cambios hechos en DublajeCast', !/data-v="historial"|Cambios de este/.test(N.doc.getElementById('csVista').innerHTML) && /<h2>A FILIPINO CHRISTMAS<\/h2>/.test(N.doc.getElementById('csVista').innerHTML));
    N.M.CS.vista = 'programas'; N.M.CS.prog = null; N.M.csPintar('shows', b.cab, b.grid);
    N.doc.getElementById('csVista').querySelectorAll('[data-cs]').find(c => c.getAttribute('data-cs') === 'herramientas').onclick();
    t.ok('con las Herramientas a mano, como antes', N.diario.includes('herramientasPanel'));
  }
  {
    const Q = armar({ modo: 'qc' });
    const b = biblioteca(Q.doc);
    const nav = new El('nav'); nav.id = 'csNav'; b.lib.insertBefore(nav, b.cab);
    const vi = new El('div'); vi.id = 'csVista'; b.lib.appendChild(vi);
    t.eq('en otro perfil: nada de esto, y la biblioteca de siempre', Q.M.csPintar('shows', b.cab, b.grid) + ' ' + Q.doc.getElementById('csNav') + ' ' + Q.doc.getElementById('csVista') + ' ' + Q.body.classList.contains('cs-on'), 'false null null false');
  }
  {
    const A = armar();
    t.eq('una sección que no existe no se abre', A.M.csIr('borrar') + ' ' + A.diario.includes('renderLibrary'), 'false false');
    t.eq('Realizar casting sin capítulo de Dubbipt no hace nada', await A.M.csRealizarCasting({ show: null }, { ep: null }), false);
    const E = armar({ epAbierto: true });
    E.M.csRepintar();
    t.eq('con un capítulo abierto, repintar no lo saca de él', E.diario.includes('renderLibrary'), false);
  }

  {
    /* «Casting» en cada episodio: directo a castear. */
    const A = armar();
    const b = biblioteca(A.doc);
    A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'abrirProg', 's:s1').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.ok('cada episodio de Dubbipt, con «Casting» que va directo y «Ficha» aparte', /data-cs="abrirEp" data-v="e:e1">Ficha<\/button><button class="cs-b cs-pri" data-cs="castear" data-v="e:e1"[^>]*>[\s\S]*?<span>Casting<\/span>/.test(vista(A)));
    t.eq('«Casting» no pasa por la ficha: abre el capítulo con el perfil Casting', (control(A, 'castear', 'e:e1').onclick(), await espera(), A.diario.filter(x => /^ponerModo|^openEpisode/.test(x)).join(',') + ' ' + A.LDB.showId + ' ' + A.M.CS.vista), 'ponerModo e1 casting,openEpisode e1 s1 programa');
    A.M.CS.prog = 'dc:2'; A.M.csPintar('shows', b.cab, b.grid);
    t.ok('uno que solo está en DublajeCast no se puede castear todavía: solo su ficha', /data-cs="abrirEp" data-v="d:/.test(vista(A)) && !/data-cs="castear"/.test(vista(A)));
  }

  {
    /* Eliminar programas y episodios desde Casting: lo de Dubbipt, nada de DublajeCast. */
    const A = armar();
    const b = biblioteca(A.doc);
    A.M.csPintar('shows', b.cab, b.grid);
    t.ok('cada programa de Dubbipt tiene su botón de eliminar en la tarjeta', !!control(A, 'borrarProg', 's:s1'));
    t.ok('uno que solo está en DublajeCast, no', !/data-cs="borrarProg" data-v="dc:/.test(vista(A)));
    control(A, 'abrirProg', 's:s1').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    t.ok('dentro del programa, también', !!control(A, 'borrarProg', 's:s1'));
    t.ok('y cada episodio de Dubbipt tiene el suyo', !!control(A, 'borrarEp', 'e:e1'));
    control(A, 'borrarEp', 'e:e1').onclick(); await espera();
    t.eq('eliminar un episodio lo borra y se queda en el programa', A.diario.filter(x => /^borra/.test(x)).join(',') + ' ' + A.M.CS.vista, 'borraEp e1 programa');
    control(A, 'abrirEp', 'e:e1').onclick(); A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'borrarEp', 'e:e1').onclick(); await espera();
    t.eq('desde la ficha del episodio, vuelve al programa', A.M.CS.vista + ' ' + A.M.CS.ep, 'programa null');
    A.M.csPintar('shows', b.cab, b.grid);
    control(A, 'borrarProg', 's:s1').onclick(); await espera();
    t.eq('eliminar el programa vuelve a la lista de programas', A.diario.filter(x => /^borraProg/.test(x)).join(',') + ' ' + A.M.CS.vista + ' ' + A.M.CS.prog, 'borraProg s1 programas null');
    const N = armar({ borrar: false });
    const bn = biblioteca(N.doc);
    N.M.csPintar('shows', bn.cab, bn.grid);
    control(N, 'abrirProg', 's:s1').onclick(); N.M.csPintar('shows', bn.cab, bn.grid);
    control(N, 'borrarProg', 's:s1').onclick(); await espera();
    t.eq('si se cancela, no se mueve de donde estaba', N.M.CS.vista + ' ' + N.M.CS.prog, 'programa s:s1');
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
  t.ok('la barra de Casting, a la izquierda y la sección al lado; en el móvil, arriba', /body\.cs-on #lib\{ display:grid; grid-template-columns:212px minmax\(0,1fr\);/.test(HTML) && /body\.cs-on #lib > \*:not\(#csNav\):not\(#csVista\)\{ display:none !important; \}/.test(HTML) && /@media \(max-width:860px\)\{\n  body\.cs-on #lib\{ display:block;/.test(HTML.replace(/\r\n/g, '\n')));
  t.ok('y también con un capítulo abierto: Dubbipt sigue enseñando la biblioteca, y ahí no puede asomar la interfaz antigua', !/cs-on:not\(\.ep-open\)/.test(HTML));
  t.ok('con el capítulo abierto para castear, tampoco el panel de Casting: solo la interfaz de castear', /\nbody\.cs-on\.ep-open #lib\{ display:none !important; \}/.test(HTML));
  t.ok('el diálogo de confirmar, con el aviso de trazo y no con un «⚠»', /<span class="cf-ic"><svg /.test(HTML) && !/<span class="cf-ic">⚠/.test(HTML));
  t.ok('la campana y la configuración, con iconos de trazo', /aria-label="Notificaciones"><svg /.test(HTML) && /aria-label="Configuración y cuenta"><svg /.test(HTML));
  t.ok('y Programas: buscar, Herramientas y Optimizar, también', /<span class="fi">'\+_svgI\(/.test(HTML) && /ningún capítulo">'\+_svgI\(/.test(HTML) && /abran al instante">'\+_svgI\(/.test(HTML));
};
