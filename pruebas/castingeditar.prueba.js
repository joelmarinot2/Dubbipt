/* Casting: importar de DublajeCast, el casting y el reparto, y editar · especificacion 09, PRO-13
 *
 * Pedido de sala: «quiero que importes todos los programas de DublajeCast;
 * también que se pueda ver el casting, el reparto y los episodios, y que se
 * puedan hacer todas las funciones que se hacían en DublajeCast».
 *
 * Lo que protege esta prueba:
 *  · importar crea lo que falta, pregunta antes y no toca lo que ya hay;
 *  · el casting y el reparto de un programa dicen lo que dicen los datos, con
 *    los relevos a la vista;
 *  · cada control de editar hace SU cambio, sobre el episodio, el personaje o
 *    el talento que le toca, y lo guarda en DublajeCast.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Casting: importar, casting, reparto y editar';

const VOLCADO = () => ({
  _version: 'dublajecast_v2',
  series: [{ id: 1, name: 'A Filipino Christmas', cliente: 'Netflix', status: 'en_curso' }, { id: 2, name: 'Akka', status: 'en_curso' }, { id: 3, name: 'La peli', status: 'en_curso', type: 'pelicula' }],
  episodes: [{ id: 11, series_id: 1, episode_number: 1, title: 'Boracay', fase: 'pre_produccion' }, { id: 12, series_id: 1, episode_number: 2, title: 'Episodio 2' }, { id: 13, series_id: 1, episode_number: 3, title: 'Año nuevo' },
             { id: 21, series_id: 2, episode_number: 1, title: 'Akka 1' }, { id: 22, series_id: 2, episode_number: 1, title: 'Akka 1 (bis)' }, { id: 31, series_id: 3, episode_number: 1, title: 'La peli' }],
  characters: [{ id: 101, canonical_name: 'ALLY', tipo: 'principal' }, { id: 102, canonical_name: 'JANA' }, { id: 103, canonical_name: 'TITO BOY' }],
  talents: [{ id: 1, name: 'ANA ROJAS' }, { id: 2, name: 'BEATRIZ SOL' }],
  appearances: [{ character_id: 101, episode_id: 11, line_count: 186 }, { character_id: 102, episode_id: 11, line_count: 54 }, { character_id: 103, episode_id: 11, line_count: 12 },
                { character_id: 101, episode_id: 12, line_count: 90 }, { character_id: 101, episode_id: 13, line_count: 30 }],
  castings: [{ id: 501, character_id: 101, talent_id: 1, episode_id: 11 }, { id: 502, character_id: 102, talent_id: 2, episode_id: 11 },
             { id: 503, character_id: 101, talent_id: 1, episode_id: 12 }, { id: 504, character_id: 101, talent_id: 2, episode_id: 13 }],
  trailers: [{ id: 7, title: 'Tráiler oficial', type: 'trailer', status: 'pendiente', series_id: 1, deadline: '2026-10-08' }]
});
const SHOWS = [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }];
const EPS_DUB = { s1: [{ id: 'e1', show_id: 's1', name: 'Episodio 1' }, { id: 'e2', show_id: 's1', name: 'Episodio 2' }] };

const PR = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']],
  ['prodNormalizar', 'prodIndices', 'prodCasarPrograma', 'prodAlertasEp', 'prodPlazo', 'prodFormatoDubcard', 'prodFichaTexto', 'PROD_ET', 'prodPerdidoTexto', 'prodRecuperar'], { castNorm: undefined, console: { warn: () => {} } });
const DC = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DUBLAJECAST ENTERO', '/* ═══ FIN DE DUBLAJECAST ENTERO']],
  ['dcastSerieDe', 'dcastEpDeDc', 'dcastFilasCasting', 'dcastNumerosDe'],
  { castNorm: undefined, prodCasarPrograma: PR.prodCasarPrograma, prodIndices: PR.prodIndices, window: { addEventListener: () => {} }, document: {}, location: { origin: '' } });
const SIM = montar([['function castSimil(a, b){', '/* ── El registro, guardado por programa']], ['castSimil'], {});
const DX = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']],
  ['dcxNombreTalento', 'dcxAsignar', 'dcxReasignar', 'dcxEpisodio', 'dcxSerie', 'dcxPersonaje', 'dcxTalento', 'dcxTalentoNuevo', 'dcxTrailerNuevo', 'dcxTrailer', 'dcxTrailerBorrar', 'dcxCambiarTalento', 'dcxConflictosFusion', 'dcxFusionarEpisodios', 'dcxFusionarSeries', 'dcxBorrarSerie', 'dcxBorrarEpisodios'],
  { castNorm: undefined, dcSesion: null, dcLeer: null, dcEscribir: null, prodNormalizar: null, prodGuardar: null, PROD: {} });

/* Lo justo del navegador: controles con sus atributos, sacados del HTML escrito. */
class El {
  constructor(tag){ this.tag = tag; this.id = ''; this.className = ''; this.style = {}; this._html = ''; this.hijos = []; this.parentNode = null; this.dataset = {}; this.atrs = {}; this.value = ''; }
  setAttribute(k, v){ this.atrs[k] = v; } getAttribute(k){ return this.atrs[k] == null ? null : this.atrs[k]; }
  get classList(){ const el = this; return { contains: (c) => el.className.split(/\s+/).includes(c) }; }
  set innerHTML(h){ this._html = h; this._todos = null; }
  get innerHTML(){ return this._html; }
  querySelectorAll(sel){
    if(sel !== '[data-cs]') return [];
    if(!this._todos) this._todos = [...this._html.matchAll(/<(input|button|select)\b[^>]*data-cs="([^"]+)"[^>]*>/g)].map(x => {
      const e = new El(x[1]);
      for(const m of x[0].matchAll(/(data-[\w-]+)="([^"]*)"/g)) e.atrs[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
      const v = x[0].match(/ value="([^"]*)"/); e.value = v ? v[1] : '';
      const c = x[0].match(/ class="([^"]*)"/); e.className = c ? c[1] : '';
      return e;
    });
    return this._todos;
  }
}

function armar(o){
  o = o || {};
  const diario = [], avisos = [];
  let P = JSON.parse(JSON.stringify(o.payload || VOLCADO()));
  const PROD = { datos: PR.prodNormalizar(P), cuando: 1 };
  const campos = {};
  const LDB = { showId: null, browse: false, dataEps: new Set(['e1']) };
  const sbInsertados = [];
  const sb = { from: (tabla) => ({
    insert: (fila) => ({ select: () => ({ single: async () => {
      if(o.fallaInsert) return { data: null, error: { message: 'sin permiso' } };
      sbInsertados.push([tabla, fila]); return { data: Object.assign({ id: 'nuevo-' + sbInsertados.length }, fila), error: null };
    } }) }),
    upsert: async (filas) => { sbInsertados.push([tabla + '*', filas]); return { error: null }; },
    delete: () => ({ eq: async (k, v) => { borrados.push(tabla + ':' + v); return { error: null }; } }),
    update: (cambios) => {
      const hecho = async (v) => { sbInsertados.push([tabla + '~', cambios, v]);
        if(o.sinColumna && 'estado' in cambios) return { error: { code: '42703', message: 'column ' + tabla + '.estado does not exist' } };
        return { error: o.fallaUpdate ? { message: 'sin permiso' } : null }; };
      return { eq: async (k, v) => hecho(v), in: async (k, v) => hecho(v) };
    }
  }), storage: { from: () => ({
    list: async (ruta) => ({ data: (archivos[ruta] || []).map(n => ({ name: n })), error: null }),
    move: async (de, a) => { if(o.fallaMover && a.indexOf(o.fallaMover) >= 0) return { error: { message: 'sin permiso para mover' } }; movidos.push(de + ' > ' + a); return { error: null }; }
  }) } };
  const archivos = o.archivos || {}, movidos = [], regGuardados = {};
  const H = [], RELEVOS = [];
  const borrados = [];
  const COPIAS = o.copias || [], bajados = [];
  const guardado = o.almacen || {};
  const almacen = { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; } };
  const M = montar([['/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST', '/* ═══ FIN DE CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST']],
    ['CS', 'csProgramas', 'csEpisodios', 'csActual', 'csFilasPrograma', 'csOrdenarCasting', 'csTramoTexto', 'csReparto', 'csNombreEpisodio', 'csPlanImportar', 'csImportarTodo', 'csEditar',
     'csHtml', 'csHtmlPrograma', 'csCablear', 'csTalentoCelda', 'csRenombrarPrograma', 'csRenombrarEpisodio', 'csContexto', 'csHistorialDe', 'csTalentosEn', 'csCambiadorHtml', 'csRepetidosDc', 'csRepetidosDub', 'csInconsistencias', 'csQuitarVacios', 'CS', 'csAsegurarDatos', 'csDevolverCopia', 'csBajarCopia', 'CS_TRAER',
     'csParecidos', 'csQuedaDe', 'csPlanFusion', 'csFusionarProgramas', 'csMoverEpisodiosDub', 'csJuntarRegistro', 'csRepartoDe', 'csTalentoDub', 'csAlDia', 'CS_BIB', 'csEstadoDe', 'csCambiarEstado', 'csBorrarPrograma', 'csBorrarEpisodio', 'csBorrarDeBiblioteca', 'csEstadoEp', 'csCambiarEstadoEp', 'csLeerActivos', 'csAplicarActivos', 'csNumeroDeLinea', 'csProgramaDeLinea', 'csParecidoPersonaje', 'csIndicePapeles', 'csBuscarPersonajes', 'CS_REGS'],
    { castNorm: (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim(),
      document: { getElementById: (id) => campos[id] || null, querySelector: () => null, body: { classList: { contains: () => false, toggle: () => {}, remove: () => {} } } },
      prodPuede: () => true, PROD: PROD, PROD_ET: PR.PROD_ET, prodIndices: PR.prodIndices, prodAlertasEp: PR.prodAlertasEp, prodPlazo: PR.prodPlazo, prodFormatoDubcard: PR.prodFormatoDubcard,
      prodFichaTexto: PR.prodFichaTexto, prodCasarPrograma: PR.prodCasarPrograma, prodPanel: () => {}, prodVista: '',
      dcastDatos: () => ({ datos: PROD.datos, vivo: false }), dcastAbrir: (v) => diario.push('dcastAbrir ' + v),
      dcastSerieDe: DC.dcastSerieDe, dcastEpDeDc: DC.dcastEpDeDc, dcastFilasCasting: DC.dcastFilasCasting, dcastNumerosDe: DC.dcastNumerosDe,
      sbShows: () => o.shows || SHOWS, sbEps: (id) => (o.eps || EPS_DUB)[id] || [], LDB: LDB, libView: 'shows',
      castRegCargar: async (id) => JSON.parse(JSON.stringify((o.registros || {})[id] || { personajes: {} })), castRegGuardar: async (id, r) => { regGuardados[id] = r; return true; }, castAviso: (t) => avisos.push(t), renderLibrary: () => diario.push('renderLibrary'),
      ponerModo: () => {}, openEpisode: async () => {}, newShow: async () => {}, newEpisodeModal: () => {},
      esc: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), fallo: (d) => diario.push('fallo ' + d), _svgI: undefined,
      dcxGuardar: async (cambio, entrada) => {
        if(o.sinSesion){ const e = new Error('sin sesión'); e.sinSesion = true; throw e; }
        if(o.fallaGuardar) throw new Error('sin red');
        const copia = JSON.parse(JSON.stringify(P)); const hubo = cambio(copia);
        if(hubo){ P = copia; PROD.datos = PR.prodNormalizar(P); if(entrada) H.unshift(entrada); }
        diario.push('guarda ' + !!hubo); return { cambiado: !!hubo };
      },
      dcxNombreTalento: DX.dcxNombreTalento, dcxAsignar: DX.dcxAsignar, dcxReasignar: DX.dcxReasignar, dcxEpisodio: DX.dcxEpisodio, dcxSerie: DX.dcxSerie, dcxPersonaje: DX.dcxPersonaje,
      dcxTalento: DX.dcxTalento, dcxTalentoNuevo: DX.dcxTalentoNuevo, dcxTrailerNuevo: DX.dcxTrailerNuevo, dcxTrailer: DX.dcxTrailer, dcxTrailerBorrar: DX.dcxTrailerBorrar, dcxCambiarTalento: DX.dcxCambiarTalento, dcxConflictosFusion: DX.dcxConflictosFusion, dcxFusionarEpisodios: DX.dcxFusionarEpisodios, dcxFusionarSeries: DX.dcxFusionarSeries, dcxBorrarSerie: DX.dcxBorrarSerie, dcxBorrarEpisodios: DX.dcxBorrarEpisodios,
      castRegRenombrarEp: async (id, de, a) => { diario.push('registro ' + id + ' ' + de + ' → ' + a); return true; },
      libBorrarPrograma: async (sh, ya) => { diario.push('borraProg ' + sh.id + ' ' + !!ya); return o.fallaBorrar !== true; },
      libBorrarCapitulo: async (ep, ya) => { diario.push('borraEp ' + ep.id + ' ' + !!ya); return o.fallaBorrar !== true; },
      dcxRelevosAceptados: () => RELEVOS, dcxAceptarRelevo: (k) => { if(RELEVOS.includes(k)) return false; RELEVOS.push(k); return true; },
      dcxHistorial: () => H, dcxEntrada: (que, ctx) => Object.assign({ cuando: '2026-10-08T10:05:00Z', quien: 'Pamela', que: que }, ctx || {}), dcxRegistrar: (e) => { H.unshift(e); return true; },
      DDL_MODO: 'casting', currentEp: null, herramientasPanel: () => {},
      dcPanel: () => diario.push('dcPanel'),
      DDL_UI: { confirmModal: async (cfg) => { diario.push('pregunta ' + cfg.title + ' · ' + cfg.body); return o.confirmar !== false; } },
      sb: sb, uid: () => 'u' + (sbInsertados.length + 1) + '-' + Math.random().toString(36).slice(2, 6), libFetchAll: async () => diario.push('libFetchAll'),
      WORKSPACE: ('ws' in o) ? o.ws : { id: 'wsP' }, castSimil: SIM.castSimil, localStorage: almacen,
      prodWs: () => 'wsP', prodPerdidoTexto: PR.prodPerdidoTexto, prodRecuperar: PR.prodRecuperar,
      prodCargar: async () => { diario.push('prodCargar'); PROD.cargado = true; PROD.ws = 'wsP'; },
      prodSincronizar: async () => { diario.push('prodSincronizar'); if(o.alSincronizar) o.alSincronizar(COPIAS); return !!o.trae; },
      prodCopias: async () => COPIAS.slice(), prodCopiaDevuelta: async (id, n) => { const c = COPIAS.find(x => String(x.id) === String(id)); if(c){ c.devuelta = 1; c.devueltos = n; } return !!c; },
      ioDescargar: (nombre, texto, tipo) => bajados.push([nombre, texto, tipo]) });
  return { M, diario, avisos, PROD, LDB, campos, sbInsertados, H, RELEVOS, borrados, nube: () => P, COPIAS, bajados, movidos, regGuardados, guardado };
}

/** Los controles de una vista, ya enganchados. */
function controles(A, vista){
  const v = new El('div'); v.innerHTML = A.M.csHtml(vista, new Date(2026, 9, 7));
  A.M.csCablear(v);
  return { html: v.innerHTML, de: (que, filtro) => v.querySelectorAll('[data-cs]').find(c => c.getAttribute('data-cs') === que && (!filtro || Object.keys(filtro).every(k => c.getAttribute('data-' + k) === String(filtro[k])))) };
}
const espera = () => new Promise(r => setTimeout(r, 0));

exports.pruebas = async function(t){
  const { M } = armar();
  const d = PR.prodNormalizar(VOLCADO());

  t.seccion('1 · el reparto de un programa, como en DublajeCast');
  t.eq('episodios seguidos, en corto', M.csTramoTexto([3, 1, 2, 5, 7, 8]) + ' | ' + M.csTramoTexto([]) + ' | ' + M.csTramoTexto(['4']), '1–3, 5, 7–8 |  | 4');
  const p1 = M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], d).find(p => p.clave === 's:s1');
  const rep = M.csReparto(p1, d);
  t.eq('cada personaje: principales primero, luego por líneas', rep.map(r => r.personaje + ' ' + r.episodios + 'ep ' + r.lineas + 'l').join(' | '), 'ALLY 3ep 306l | JANA 1ep 54l | TITO BOY 1ep 12l');
  t.eq('con su talento por tramos: el relevo se ve', rep[0].tramos.map(x => x.talento + ' ' + M.csTramoTexto(x.eps)).join(' → '), 'ANA ROJAS 1–2 → BEATRIZ SOL 3');
  t.eq('y el que no tiene, vacío', JSON.stringify(rep[2].tramos), '[{"talento":"","talentoId":null,"eps":[1],"lineas":12}]');
  const desordenado = PR.prodNormalizar(Object.assign(VOLCADO(), { episodes: VOLCADO().episodes.slice().reverse() }));
  const pDes = M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], desordenado).find(p => p.clave === 's:s1');
  t.eq('los tramos siguen el orden de los episodios, vengan como vengan', M.csReparto(pDes, desordenado)[0].tramos.map(x => x.talento + ' ' + M.csTramoTexto(x.eps)).join(' → '), 'ANA ROJAS 1–2 → BEATRIZ SOL 3');
  t.eq('un programa que no está en DublajeCast no tiene reparto', M.csReparto({ serie: null }, d).length + ' ' + M.csReparto(p1, null).length, '0 0');

  t.seccion('2 · el casting de todo un programa');
  const eps1 = M.csEpisodios(p1);
  const filas = M.csFilasPrograma(eps1, d, null);
  t.eq('cada personaje de cada episodio', filas.map(f => f.e.numero + ':' + f.personaje).join(' '), '1:ALLY 1:JANA 1:TITO BOY 2:ALLY 3:ALLY');
  const orden = (o, q) => M.csOrdenarCasting(filas, o, q).map(f => f.e.numero + ':' + f.personaje).join(' ');
  t.eq('por episodio, por personaje, principales, por líneas', [orden('episodio'), orden('personaje'), orden('principal'), orden('lineas')].join(' | '),
       '1:ALLY 1:JANA 1:TITO BOY 2:ALLY 3:ALLY | 1:ALLY 2:ALLY 3:ALLY 1:JANA 1:TITO BOY | 1:ALLY 2:ALLY 3:ALLY 1:JANA 1:TITO BOY | 1:ALLY 2:ALLY 1:JANA 3:ALLY 1:TITO BOY');
  t.eq('buscar por personaje o por talento', orden('episodio', 'tito') + ' | ' + orden('episodio', 'beatriz'), '1:TITO BOY | 1:JANA 3:ALLY');

  t.seccion('3 · importar de DublajeCast lo que falta');
  t.eq('el nombre de un episodio nuevo', [M.csNombreEpisodio({ episode_number: 3 }, {}, [{ episode_number: 3 }]), M.csNombreEpisodio({ episode_number: 1 }, { type: 'pelicula' }, []),
       M.csNombreEpisodio({ episode_number: 1, title: 'Akka 1 (bis)' }, {}, [{ episode_number: 1 }, { episode_number: 1 }])].join(' | '), 'Episodio 3 | Película | Akka 1 (bis)');
  const plan = M.csPlanImportar(M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], d));
  t.eq('los programas que solo están allí, con sus episodios', JSON.stringify(plan.programas), '[{"nombre":"Akka","eps":["Akka 1","Akka 1 (bis)"]},{"nombre":"La peli","eps":["Película"]}]');
  t.eq('y los episodios que faltan en los que ya están', JSON.stringify(plan.episodios), '[{"showId":"s1","programa":"A FILIPINO CHRISTMAS","nombre":"Episodio 3"}]');
  {
    const A = armar();
    t.eq('importar: pregunta con la cuenta y crea', await A.M.csImportarTodo(), 'hecho');
    t.ok('la pregunta dice cuántos y que no se toca lo que hay', A.diario.some(x => /^pregunta Importar de DublajeCast · Se crean en Dubbipt 2 programas y 4 episodios, sin libreto[\s\S]*no se toca/.test(x)));
    t.eq('los programas, en el espacio de trabajo', A.sbInsertados.filter(x => x[0] === 'shows').map(x => x[1].name + '@' + x[1].workspace_id).join(' '), 'Akka@wsP La peli@wsP');
    t.eq('sus episodios, en su programa', A.sbInsertados.filter(x => x[0] === 'episodes*').map(x => x[1].map(f => f.show_id + ':' + f.name).join(',')).join(' | '), 'nuevo-1:Akka 1,nuevo-1:Akka 1 (bis) | nuevo-3:Película | s1:Episodio 3');
    t.ok('cada episodio con su id y su fecha', A.sbInsertados.filter(x => x[0] === 'episodes*').every(x => x[1].every(f => f.id && f.updated_at)));
    t.ok('y se recarga la biblioteca y se dice', A.diario.includes('libFetchAll') && A.avisos.includes('Importado de DublajeCast: 2 programas y 4 episodios'));
  }
  {
    const A = armar({ confirmar: false });
    t.eq('si se dice que no, nada', await A.M.csImportarTodo() + ' ' + A.sbInsertados.length, 'cancelado 0');
    const B = armar({ ws: null });
    t.eq('sin espacio de trabajo, nada', await B.M.csImportarTodo() + ' ' + B.sbInsertados.length, 'sin-espacio 0');
    const C = armar({ fallaInsert: true });
    t.ok('si falla, se dice cuánto se hizo', await C.M.csImportarTodo() === 'error' && /La importación se quedó a medias \(0 programas, 0 episodios\): «Akka»: sin permiso/.test(C.avisos[0]));
    const D = armar({ payload: Object.assign(VOLCADO(), { series: [VOLCADO().series[0]], episodes: VOLCADO().episodes.filter(e => e.id === 11 || e.id === 12) }) });
    t.eq('si ya está todo, se dice y no se pregunta', await D.M.csImportarTodo() + ' ' + D.diario.some(x => /^pregunta/.test(x)), 'nada false');
  }
  {
    const A = armar();
    t.ok('en Programas, el botón con lo que falta', /data-cs="importarTodo"[\s\S]*?<b class="cs-cuenta">2 prog\. · 4 ep\.<\/b>/.test(controles(A, 'programas').html));
  }

  t.seccion('4 · las pestañas de un programa');
  {
    const A = armar();
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1';
    let c = controles(A, 'programa');
    t.ok('Episodios, Casting y Reparto, con cuántos hay', /data-cs="tab" data-v="episodios">Episodios <b>3<\/b>/.test(c.html) && /data-v="casting">Casting <b>5<\/b>/.test(c.html) && /data-v="reparto">Reparto <b>3<\/b>/.test(c.html));
    t.ok('el estado, el cliente y el director del programa, para cambiarlos', !!c.de('estadoProg') && c.de('progCampo', { campo: 'cliente' }).value === 'Netflix' && c.de('progCampo', { campo: 'director' }).value === '');
    c.de('tab', { v: 'casting' }).onclick();
    c = controles(A, 'programa');
    t.ok('Casting: la tabla de todo el programa, con su buscador y sus órdenes', /Por episodio[\s\S]*Por personaje[\s\S]*Principales[\s\S]*Por líneas/.test(c.html) && /5 registros · 4 con talento/.test(c.html) && !!c.de('talento', { ep: 13, ch: 101 }));
    t.eq('cada talento, para cambiarlo, con la lista de la base', c.de('talento', { ep: 13, ch: 101 }).value + ' ' + /<datalist id="csListaTalentos"><option value="ANA ROJAS"><option value="BEATRIZ SOL"><\/datalist>/.test(c.html), 'BEATRIZ SOL true');
    A.M.CS.tab = 'reparto';
    c = controles(A, 'programa');
    t.ok('Reparto en cajas, por talento: su carga, sus personajes con líneas y episodios', /<b>ANA ROJAS<\/b><div class="cs-tenue">1 pers\. · 2 apar\. · <b>276<\/b> lín\.<\/div><\/div><span class="cs-carga cs-carga-bajo">Bajo<\/span>[\s\S]*?<b>ALLY<\/b><\/div><span class="cs-rep-lin">276 lín\.<\/span><span class="cs-rep-eps"><span class="cs-rep-ep">Ep\.1<\/span><span class="cs-rep-ep">Ep\.2<\/span><\/span>/.test(c.html)
         && /<b>BEATRIZ SOL<\/b><div class="cs-tenue">2 pers\. · 2 apar\. · <b>84<\/b> lín\.<\/div><\/div><span class="cs-carga cs-carga-medio">Medio<\/span>/.test(c.html) && c.de('principal', { ch: 101 }).classList.contains('on'));
    t.ok('los principales aparte, y quien aún no tiene talento, también', /<div class="cs-rep-sec">Principales \(2\)<\/div>/.test(c.html) && /<div class="cs-rep-sec">Sin talento \(1\)<\/div>[\s\S]*?<b>TITO BOY<\/b><\/div><span class="cs-rep-lin">12 lín\.<\/span>/.test(c.html));
    t.ok('«Reasignar» abre dónde escribir el talento nuevo, con su «Guardar»', !c.de('repNuevo') && (c.de('repAbrir', { v: 'ch:101' }).onclick(), !!controles(A, 'programa').de('repNuevo') && !!controles(A, 'programa').de('repGuardar', { v: 'ch:101' })));
    controles(A, 'programa').de('repCerrar').onclick();
    t.eq('y Cancelar lo cierra', A.M.CS.repAbierto, null);
    c.de('repVista', { v: 'personaje' }).onclick();
    c = controles(A, 'programa');
    t.ok('por personaje: su talento por tramos, con el relevo avisado', /ALLY<\/b><div class="cs-tenue">3 apar\. · <b>306<\/b> lín\.<\/div><\/div><small class="cs-aviso">[\s\S]*?relevo<\/small>[\s\S]*?<span class="cs-talento">ANA ROJAS<\/span><\/div><span class="cs-rep-lin">276 lín\.<\/span>[\s\S]*?<span class="cs-talento">BEATRIZ SOL<\/span><\/div><span class="cs-rep-lin">30 lín\.<\/span>/.test(c.html));
    A.M.CS.repBuscar = 'jana'; A.M.CS.repVista = 'talento';
    c = controles(A, 'programa');
    t.ok('el buscador: por personaje…', /<b>BEATRIZ SOL<\/b>/.test(c.html) && !/<b>ANA ROJAS<\/b>/.test(c.html));
    A.M.CS.repBuscar = 'ana roj';
    c = controles(A, 'programa');
    t.ok('…y por talento', /<b>ANA ROJAS<\/b>/.test(c.html) && !/<b>BEATRIZ SOL<\/b>/.test(c.html));
    A.M.CS.repBuscar = 'nadie';
    t.ok('si nada coincide, se dice', /Nada coincide con «nadie»/.test(controles(A, 'programa').html));
    A.M.CS.repBuscar = ''; A.M.CS.repOrden = 'az';
    c = controles(A, 'programa');
    t.ok('de la A a la Z', c.html.indexOf('<b>ANA ROJAS</b>') < c.html.indexOf('<b>BEATRIZ SOL</b>') && /data-cs="repOrden" data-v="az">A–Z/.test(c.html));
    A.M.CS.repOrden = 'lineas';
  }

  t.seccion('5 · editar: cada control, su cambio, guardado en DublajeCast');
  {
    const A = armar();
    A.M.CS.vista = 'episodio'; A.M.CS.prog = 's:s1'; A.M.CS.ep = 'e:e1';
    let c = controles(A, 'episodio');
    const tito = c.de('talento', { ep: 11, ch: 103 });
    tito.value = 'luz mar'; tito.onchange(); await espera();
    const P = A.nube();
    t.ok('asignar un talento nuevo: se da de alta y se asigna', P.talents.some(x => x.name === 'LUZ MAR') && P.castings.some(x => x.episode_id === 11 && x.character_id === 103 && x.talent_id === P.talents.find(y => y.name === 'LUZ MAR').id));
    t.ok('y se dice y se repinta', A.avisos.includes('TITO BOY: LUZ MAR (antes: sin asignar)') && A.diario.includes('renderLibrary'));
    c = controles(A, 'episodio');
    const jana = c.de('talento', { ep: 11, ch: 102 }); jana.value = ''; jana.onchange(); await espera();
    t.ok('vaciarlo lo quita', !A.nube().castings.some(x => x.episode_id === 11 && x.character_id === 102) && A.avisos.includes('JANA: sin talento (antes: BEATRIZ SOL)'));
    c = controles(A, 'episodio');
    const fase = c.de('epCampo', { campo: 'fase' }); fase.value = 'produccion_activa'; fase.onchange(); await espera();
    const miami = c.de('epCampo', { campo: 'fecha_miami' }); miami.value = '2026-10-21'; miami.onchange(); await espera();
    t.eq('la fase y la fecha de Miami del episodio', JSON.stringify(A.nube().episodes.find(e => e.id === 11), ['fase', 'fecha_miami']), '{"fase":"produccion_activa","fecha_miami":"2026-10-21"}');
    t.ok('el estado, el formato y la fecha de la DUBCARD, también', !!c.de('epCampo', { campo: 'status' }) && !!c.de('epCampo', { campo: 'formato_dubcard' }) && !!c.de('epCampo', { campo: 'fecha_dubcard' }));
  }
  {
    const A = armar();
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1'; A.M.CS.tab = 'reparto';
    let c = controles(A, 'programa');
    c.de('repAbrir', { v: 'ch:101' }).onclick();
    c = controles(A, 'programa');
    A.campos.csRepNuevo = { value: 'Carla Paz' };
    c.de('repGuardar', { v: 'ch:101' }).onclick(); await espera(); await espera();
    t.eq('cambiar el talento de un personaje en todos sus episodios', A.nube().castings.filter(x => x.character_id === 101).map(x => A.nube().talents.find(y => y.id === x.talent_id).name).join(','), 'CARLA PAZ,CARLA PAZ,CARLA PAZ');
    c = controles(A, 'programa');
    c.de('principal', { ch: 102 }).onclick(); await espera();
    c = controles(A, 'programa');
    c.de('principal', { ch: 101 }).onclick(); await espera();
    t.eq('marcar y desmarcar principales', A.nube().characters.map(x => x.canonical_name + ':' + x.tipo).join(' '), 'ALLY:secundario JANA:principal TITO BOY:undefined');
    c = controles(A, 'programa');
    const cli = c.de('progCampo', { campo: 'cliente' }); cli.value = ' Disney '; cli.onchange(); await espera();
    c = controles(A, 'programa');
    c.de('estadoProg').onclick(); await espera();
    t.eq('el cliente y el estado del programa', JSON.stringify(A.nube().series[0], ['cliente', 'status']), '{"cliente":"Disney","status":"completo"}');
  }
  {
    const A = armar();
    A.campos.csTalNuevo = { value: ' nora díaz ' };
    let c = controles(A, 'talentos');
    c.de('talNuevo').onclick(); await espera();
    t.ok('un talento nuevo desde Talentos', A.nube().talents.some(x => x.name === 'NORA DÍAZ') && A.avisos.includes('Talento añadido: NORA DÍAZ'));
    c = controles(A, 'talentos');
    const gen = c.de('talCampo', { id: 2, campo: 'genero' }); gen.value = 'femenino'; gen.onchange(); await espera();
    t.eq('y su ficha', A.nube().talents.find(x => x.id === 2).genero, 'femenino');
    A.campos.csTalNuevo = { value: '' };
    c = controles(A, 'talentos'); c.de('talNuevo').onclick();
    t.ok('sin nombre, se pide', A.avisos.includes('Escribe el nombre del talento'));
  }
  {
    const A = armar();
    Object.assign(A.campos, { csTrTitulo: { value: 'Teaser final' }, csTrTipo: { value: 'teaser' }, csTrProg: { value: '2' }, csTrFecha: { value: '2026-11-02' } });
    let c = controles(A, 'trailers');
    c.de('trNuevo').onclick(); await espera();
    const tr = A.nube().trailers.find(x => x.title === 'Teaser final');
    t.eq('un tráiler nuevo, con su programa (como número) y su fecha', tr && JSON.stringify(tr, ['title', 'type', 'series_id', 'deadline', 'status']), '{"title":"Teaser final","type":"teaser","series_id":2,"deadline":"2026-11-02","status":"pendiente"}');
    c = controles(A, 'trailers');
    const st = c.de('trCampo', { id: 7, campo: 'status' }); st.value = 'completo'; st.onchange(); await espera();
    t.eq('su estado', A.nube().trailers.find(x => x.id === 7).status, 'completo');
    c = controles(A, 'trailers');
    await c.de('trBorrar', { id: 7 }).onclick(); await espera();
    t.ok('y borrarlo, preguntando antes', !A.nube().trailers.some(x => x.id === 7) && A.diario.some(x => /^pregunta Borrar tráiler/.test(x)));
    const N = armar({ confirmar: false });
    await controles(N, 'trailers').de('trBorrar', { id: 7 }).onclick(); await espera();
    t.ok('si se dice que no, no se borra ni se guarda nada', N.nube().trailers.some(x => x.id === 7) && !N.diario.some(x => /^guarda/.test(x)));
  }
  {
    const S = armar({ sinSesion: true });
    t.eq('sin sesión de DublajeCast: se pide entrar', await S.M.csEditar(p => DX.dcxSerie(p, 1, { cliente: 'X' }), 'ok') + ' ' + S.diario.includes('dcPanel') + ' ' + /entra con tu cuenta de DublajeCast/.test(S.avisos[0]), 'sesion true true');
    const F = armar({ fallaGuardar: true });
    t.eq('si falla, se dice y se repinta como estaba', await F.M.csEditar(p => DX.dcxSerie(p, 1, { cliente: 'X' }), 'ok') + ' ' + F.avisos[0] + ' ' + F.diario.includes('renderLibrary'), 'error No se pudo guardar en DublajeCast: sin red true');
    const I = armar();
    t.eq('si no cambia nada, ni se dice', await I.M.csEditar(p => DX.dcxSerie(p, 1, { cliente: 'Netflix' }), 'ok') + ' ' + I.avisos.length, 'igual 0');
  }
  {
    const A = armar();
    const f = { personaje: 'X', dc: 'ANA', dubbipt: 'LUZ', talento: 'LUZ', choca: true, charId: 5 };
    t.ok('la celda avisa si Dubbipt dice otro', /data-ch="5" data-per="X" data-antes="ANA" value="ANA"[\s\S]*?en Dubbipt: LUZ/.test(A.M.csTalentoCelda(f, { id: 9 })));
    t.eq('sin episodio de DublajeCast, no se edita: se lee', A.M.csTalentoCelda({ personaje: 'X', dc: '', dubbipt: 'LUZ', talento: 'LUZ', charId: null }, null), '<span class="cs-talento">LUZ</span> <small class="cs-tenue">de Dubbipt</small>');
  }

  t.seccion('6 · cada nombre, el cambiador de talento y quién cambió qué');
  {
    const A = armar();
    const progs = () => A.M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], PR.prodNormalizar(A.nube()));
    const p1 = progs().find(p => p.clave === 's:s1');
    t.eq('renombrar un programa que está en los dos lados: en los dos', await A.M.csRenombrarPrograma(p1, '  A Filipino Christmas  2 '), 'guardado');
    t.eq('en DublajeCast', A.nube().series[0].name, 'A Filipino Christmas 2');
    t.eq('y en Dubbipt, el mismo programa', JSON.stringify(A.sbInsertados.filter(x => x[0] === 'shows~')), '[["shows~",{"name":"A Filipino Christmas 2"},"s1"]]');
    t.eq('apuntado: quién, qué y dónde', JSON.stringify(A.H[0], ['quien', 'que', 'programa', 'serieId', 'showId']), '{"quien":"Pamela","que":"Programa renombrado: «A FILIPINO CHRISTMAS» → «A Filipino Christmas 2»","programa":"A FILIPINO CHRISTMAS","serieId":1,"showId":"s1"}');
    t.eq('el mismo nombre o vacío, nada', await A.M.csRenombrarPrograma(p1, 'A FILIPINO CHRISTMAS') + ' ' + await A.M.csRenombrarPrograma(p1, '  ') + ' ' + A.H.length, 'igual igual 1');
    const solo = A.M.csProgramas([{ id: 's9', name: 'Solo aquí' }], () => [], PR.prodNormalizar(A.nube())).find(p => p.clave === 's:s9');
    t.eq('uno que solo está en Dubbipt: allí, y apuntado', await A.M.csRenombrarPrograma(solo, 'Solo en Dubbipt') + ' ' + A.sbInsertados.filter(x => x[0] === 'shows~').length + ' ' + A.H[0].que, 'guardado 2 Programa renombrado: «Solo aquí» → «Solo en Dubbipt»');
    const B = armar({ fallaUpdate: true });
    const pB = B.M.csProgramas([{ id: 's9', name: 'Solo aquí' }], () => [], PR.prodNormalizar(B.nube())).find(p => p.clave === 's:s9');
    t.eq('si Dubbipt no deja, se dice y no se apunta', await B.M.csRenombrarPrograma(pB, 'Otro') + ' ' + B.avisos[0] + ' ' + B.H.length, 'error No se pudo renombrar en Dubbipt: sin permiso 0');
  }
  {
    const A = armar();
    const p1 = A.M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], PR.prodNormalizar(A.nube())).find(p => p.clave === 's:s1');
    const e1 = A.M.csEpisodios(p1).find(e => e.clave === 'e:e1');
    t.eq('renombrar un episodio en Dubbipt', await A.M.csRenombrarEpisodio(p1, e1, 'Episodio 1 · Boracay') + ' ' + JSON.stringify(A.sbInsertados[0]), 'guardado ["episodes~",{"name":"Episodio 1 · Boracay"},"e1"]');
    t.eq('apuntado en su episodio', JSON.stringify(A.H[0], ['que', 'episodio', 'epId', 'dcEpId']), '{"que":"Episodio renombrado en Dubbipt: «Episodio 1» → «Episodio 1 · Boracay»","episodio":"Ep. 1 · Episodio 1","epId":"e1","dcEpId":11}');
    t.eq('sin episodio de Dubbipt, nada', await A.M.csRenombrarEpisodio(p1, { ep: null }, 'X'), 'igual');
    t.ok('y su casting guardado se va con el nombre nuevo', A.diario.includes('registro s1 Episodio 1 → Episodio 1 · Boracay'));
    const soloDc = A.M.csEpisodios(p1).find(e => !e.ep && e.dcEp && e.dcEp.id === 13);
    t.eq('uno que solo está en DublajeCast cambia su título allí', await A.M.csRenombrarEpisodio(p1, soloDc, 'Año nuevo 2') + ' ' + A.nube().episodes.find(e => e.id === 13).title, 'guardado Año nuevo 2');
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1'; A.M.CS.tab = 'episodios';
    const cp = controles(A, 'programa');
    t.ok('cada episodio tiene su lápiz para cambiarle el nombre', !!cp.de('renEp', { v: 'e:e1' }) && !!cp.de('renEp', { v: 'd:13' }));
    A.M.CS.vista = 'programas'; A.M.CS.filtro = 'todos';
    t.ok('y cada programa, en su tarjeta', !!controles(A, 'programas').de('renProg', { v: 's:s1' }));
    A.M.CS.vista = 'episodio'; A.M.CS.prog = 's:s1'; A.M.CS.ep = 'e:e1';
    const c = controles(A, 'episodio');
    t.ok('en el episodio: su nombre en Dubbipt y su título en DublajeCast, para cambiarlos', c.de('epNombre').value === 'Episodio 1' && c.de('epCampo', { campo: 'title' }).value === 'Boracay');
    const tit = c.de('epCampo', { campo: 'title' }); tit.value = ' Boracay  nuevo '; tit.onchange(); await espera();
    t.eq('el título, en DublajeCast y apuntado', A.nube().episodes.find(e => e.id === 11).title + ' · ' + A.H[0].que, 'Boracay nuevo · Título en DublajeCast:  Boracay  nuevo ');
  }
  {
    const A = armar();
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1'; A.M.CS.tab = 'episodios';
    let c = controles(A, 'programa');
    t.ok('en el programa: el cambiador, con los talentos que hay y cuántas asignaciones', /<select id="csCambiaDe"><option value="1">ANA ROJAS \(2\)<\/option><option value="2">BEATRIZ SOL \(2\)<\/option><\/select>/.test(c.html) && /data-cs="cambiar" data-ambito="programa"/.test(c.html));
    t.ok('y su nombre para cambiarlo', c.de('progNombre').value === 'A FILIPINO CHRISTMAS');
    A.campos.csCambiaDe = { value: '1' }; A.campos.csCambiaA = { value: 'luz mar' };
    c.de('cambiar').onclick(); await espera();
    t.eq('cambiar ANA ROJAS por LUZ MAR en todo el programa', A.nube().castings.map(x => x.id + ':' + A.nube().talents.find(y => y.id === x.talent_id).name).join(' '), '501:LUZ MAR 502:BEATRIZ SOL 503:LUZ MAR 504:BEATRIZ SOL');
    t.eq('apuntado', A.H[0].que + ' · ' + A.H[0].programa, 'Talento cambiado en todo el programa: ANA ROJAS → LUZ MAR · A FILIPINO CHRISTMAS');
    A.campos.csCambiaA = { value: '' };
    controles(A, 'programa').de('cambiar').onclick();
    t.ok('sin el talento nuevo, se pide', A.avisos.includes('Escribe el talento nuevo'));
    A.M.CS.vista = 'episodio'; A.M.CS.ep = 'e:e1';
    c = controles(A, 'episodio');
    t.ok('en el episodio, el suyo', /data-cs="cambiar" data-ambito="episodio"/.test(c.html) && /<option value="2">BEATRIZ SOL \(1\)<\/option>/.test(c.html));
    A.campos.csCambiaDe = { value: '2' }; A.campos.csCambiaA = { value: 'Nora Díaz' };
    c.de('cambiar').onclick(); await espera();
    t.eq('cambiar solo en ese episodio', A.nube().castings.map(x => x.id + ':' + A.nube().talents.find(y => y.id === x.talent_id).name).join(' '), '501:LUZ MAR 502:NORA DÍAZ 503:LUZ MAR 504:BEATRIZ SOL');
    t.eq('apuntado en el episodio', A.H[0].que + ' · ' + A.H[0].episodio + ' · ' + A.H[0].dcEpId, 'Talento cambiado en el episodio: BEATRIZ SOL → NORA DÍAZ · Ep. 1 · Episodio 1 · 11');
    c = controles(A, 'episodio');
    const tito = c.de('talento', { ch: 103 }); tito.value = 'Ana Rojas'; tito.onchange(); await espera();
    t.eq('asignar a mano también se apunta: quién, a quién, y qué había', A.H[0].que, 'TITO BOY: ANA ROJAS (antes: sin asignar)');
    t.ok('y los cambios del episodio se ven en él', /Cambios de este episodio[\s\S]*?TITO BOY: ANA ROJAS[\s\S]*?Talento cambiado en el episodio/.test(controles(A, 'episodio').html));
    A.H.push({ cuando: '2026-10-08T09:00:00Z', quien: 'Otro', que: 'Algo de Akka', programa: 'Akka', serieId: 2 });
    A.M.CS.vista = 'programa'; A.M.CS.tab = 'historial';
    c = controles(A, 'programa');
    t.ok('el programa tiene su pestaña de cambios, con todos los suyos', /data-v="historial">Cambios <b>3<\/b>/.test(c.html) && /<b>Pamela<\/b><span>Talento cambiado en todo el programa: ANA ROJAS → LUZ MAR/.test(c.html) && !/Algo de Akka/.test(c.html));
    t.ok('y el Dashboard, los últimos', /Últimos cambios[\s\S]*?TITO BOY: ANA ROJAS/.test(controles(A, 'dashboard').html));
  }
  {
    const A = armar();
    t.eq('los talentos que hay en unos episodios', JSON.stringify(A.M.csTalentosEn(PR.prodNormalizar(A.nube()), [11, 13])), '[{"id":1,"name":"ANA ROJAS","n":1},{"id":2,"name":"BEATRIZ SOL","n":2}]');
    t.eq('sin talentos, sin cambiador', A.M.csCambiadorHtml([], 'programa'), '');
    t.eq('sin cambios todavía, se dice', /Todavía no hay cambios apuntados/.test(controles(A, 'dashboard').html), true);
  }

  t.seccion('7 · capítulos repetidos y personajes con dos talentos');
  {
    const A = armar();
    const progs = () => A.M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], PR.prodNormalizar(A.nube()));
    const akka = progs().find(p => p.clave === 'dc:2');
    const rep = A.M.csRepetidosDc(akka, PR.prodNormalizar(A.nube()));
    t.eq('el Ep. 1 de Akka está dos veces en DublajeCast', rep.map(g => g.numero + ': se queda ' + g.keep.id + ', fusiona ' + g.dups.map(e => e.id).join(',')).join(' | '), '1: se queda 21, fusiona 22');
    const peli = PR.prodNormalizar(Object.assign(VOLCADO(), { episodes: VOLCADO().episodes.concat([{ id: 32, series_id: 3, episode_number: 1, title: 'La peli (versión 2)' }]) }));
    t.eq('una película con dos «episodios» no es un repetido', A.M.csRepetidosDc(A.M.csProgramas([], () => [], peli).find(p => p.clave === 'dc:3'), peli).length, 0);
    t.eq('una película no tiene repetidos, ni un programa de Dubbipt sin DublajeCast', A.M.csRepetidosDc(progs().find(p => p.clave === 'dc:3'), PR.prodNormalizar(A.nube())).length + ' ' + A.M.csRepetidosDc({ serie: null }, null).length, '0 0');
    const p1 = progs().find(p => p.clave === 's:s1');
    const inc = A.M.csInconsistencias(p1, PR.prodNormalizar(A.nube()));
    t.eq('ALLY tiene dos talentos en el programa', inc.map(r => r.personaje + ': ' + r.talentos.map(x => x.nombre + ' ' + x.eps.join(',')).join(' / ')).join(' | '), 'ALLY: ANA ROJAS 1,2 / BEATRIZ SOL 3');
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1'; A.M.CS.tab = 'episodios';
    let c = controles(A, 'programa');
    t.ok('el programa lo pregunta: ¿cuál vale?', /Para revisar[\s\S]*?<b>ALLY<\/b> tiene 2 talentos[\s\S]*?¿Cuál vale\?/.test(c.html) && !!c.de('usarTalento', { tal: 'ANA ROJAS' }) && !!c.de('aceptarRelevo', { ch: 101 }));
    c.de('aceptarRelevo', { ch: 101 }).onclick();
    t.ok('«es un relevo»: se apunta y no se vuelve a preguntar', A.RELEVOS.length === 1 && A.H[0].que === 'ALLY: relevo aceptado, se deja con sus dos talentos' && !/tiene 2 talentos/.test(controles(A, 'programa').html));
    A.RELEVOS.length = 0;
    c = controles(A, 'programa');
    c.de('usarTalento', { tal: 'ANA ROJAS' }).onclick(); await espera();
    t.eq('«ANA ROJAS en todos»: queda uno solo', A.nube().castings.filter(x => x.character_id === 101).map(x => A.nube().talents.find(y => y.id === x.talent_id).name).join(','), 'ANA ROJAS,ANA ROJAS,ANA ROJAS');
    t.ok('apuntado, y ya no se pregunta', A.H[0].que === 'ALLY: ANA ROJAS en todos sus episodios (tenía dos talentos)' && !/tiene 2 talentos/.test(controles(A, 'programa').html));
  }
  {
    const pl = VOLCADO();
    pl.appearances.push({ character_id: 102, episode_id: 21, line_count: 5 }, { character_id: 102, episode_id: 22, line_count: 9 }, { character_id: 103, episode_id: 22, line_count: 4 });
    pl.castings.push({ id: 601, character_id: 102, talent_id: 1, episode_id: 21 }, { id: 602, character_id: 102, talent_id: 2, episode_id: 22 }, { id: 603, character_id: 103, talent_id: 2, episode_id: 22 });
    pl.episodes.find(e => e.id === 21).fecha_miami = '2026-10-30';
    const A = armar({ payload: pl });
    A.M.CS.vista = 'programa'; A.M.CS.prog = 'dc:2'; A.M.CS.tab = 'episodios';
    let c = controles(A, 'programa');
    t.ok('los repetidos se ofrecen fusionar', /El <b>Ep\. 1<\/b> está 2 veces en DublajeCast/.test(c.html) && !!c.de('fusionar', { v: 1 }));
    c.de('fusionar', { v: 1 }).onclick();
    c = controles(A, 'programa');
    t.ok('al fusionar: cuál se queda, qué pasa, y la pregunta por lo que choca', /Se queda <b>Ep\. 1 · Akka 1 \(bis\)<\/b> \(4 registros\)/.test(c.html) && /van a la papelera de DublajeCast/.test(c.html) && /¿Cuál vale\?[\s\S]*?<b>JANA<\/b><label><input type="radio" name="csEl102" data-cs="elegir" data-ch="102" value="2" checked> BEATRIZ SOL<\/label><label><input type="radio" name="csEl102" data-cs="elegir" data-ch="102" value="1"> ANA ROJAS/.test(c.html));
    const el = c.de('elegir', { ch: 102 }); el.value = '1'; el.onchange();
    c.de('fusionarYa', { v: 1 }).onclick(); await espera();
    const P = A.nube();
    t.eq('queda un solo Ep. 1: el que más tenía', P.episodes.filter(e => e.series_id === 2).map(e => e.id).join(','), '22');
    t.eq('con los personajes de los dos y las líneas mayores', P.appearances.filter(a => a.episode_id === 22).map(a => a.character_id + ':' + a.line_count).sort().join(' '), '102:9 103:4');
    t.eq('con el talento elegido donde chocaban, y los que solo estaban en el repetido', P.castings.filter(x => x.episode_id === 22).map(x => x.character_id + ':' + x.talent_id).sort().join(' '), '102:1 103:2');
    t.ok('nada se queda apuntando al repetido', !P.appearances.some(a => a.episode_id === 21) && !P.castings.some(x => x.episode_id === 21));
    t.eq('lo que le faltaba al que se queda, del repetido', P.episodes.find(e => e.id === 22).fecha_miami, '2026-10-30');
    t.ok('el repetido, a la papelera de DublajeCast, para poder restaurarlo', P.trash && P.trash[0].kind === 'episode' && P.trash[0].data.episodes[0].id === 21 && P.trash[0].data.castings.length === 1);
    t.eq('y apuntado', A.H[0].que, 'Fusionado el Ep. 1: 2 capítulos repetidos en uno');
  }
  {
    const A = armar();
    A.M.CS.vista = 'programa'; A.M.CS.prog = 'dc:2';
    const c = controles(A, 'programa'); c.de('fusionar', { v: 1 }).onclick();
    controles(A, 'programa').de('fusionCancelar').onclick();
    t.eq('cancelar no toca nada', A.M.CS.fusion + ' ' + A.nube().episodes.length, 'null 6');
  }
  {
    const A = armar();
    const showDup = [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }];
    const epsDup = [{ id: 'e1', show_id: 's1', name: 'Episodio 1' }, { id: 'e1b', show_id: 's1', name: 'Episodio 1 (bis)' }, { id: 'e2', show_id: 's1', name: 'Episodio 2' }];
    const p = A.M.csProgramas(showDup, () => epsDup, PR.prodNormalizar(A.nube())).find(x => x.clave === 's:s1');
    const hay = (id) => id === 'e1';
    t.eq('repetidos en Dubbipt: el que tiene libreto se queda, el vacío se puede quitar', JSON.stringify(A.M.csRepetidosDub(p, hay).map(g => [g.numero, g.queda.id, g.vacios.map(x => x.id)])), '[[1,"e1",["e1b"]]]');
    t.eq('si los dos tienen libreto, no se quita ninguno', A.M.csRepetidosDub(p, () => true)[0].vacios.length, 0);
    t.eq('quitar los vacíos: pregunta, quita y apunta', await A.M.csQuitarVacios(p, 1, hay) + ' ' + A.borrados.join(',') + ' · ' + A.H[0].que, 'hecho episodes:e1b · Quitados los repetidos vacíos del Ep. 1: Episodio 1 (bis)');
    const N = armar({ confirmar: false });
    t.eq('si se dice que no, nada', await N.M.csQuitarVacios(p, 1, hay) + ' ' + N.borrados.length, 'cancelado 0');
  }
  {
    const A = armar();
    t.ok('el Dashboard dice qué programas hay que revisar', /Para revisar[\s\S]*?<b>A FILIPINO CHRISTMAS<\/b> · 1 personaje con dos talentos[\s\S]*?data-cs="abrirProg" data-v="s:s1"[\s\S]*?<b>Akka<\/b> · 1 capítulo repetido/.test(controles(A, 'dashboard').html));
    t.ok('sin nada borrado, no sale el apartado', !/Lo que se borró en DublajeCast/.test(controles(A, 'dashboard').html));
  }

  t.seccion('8 · que no se borre nada');
  {
    /* Al entrar: lo guardado y lo último, una vez; sin prisa de repetir. */
    const A = armar({ trae: true });
    A.PROD.cargado = false;
    await A.M.csAsegurarDatos();
    t.eq('carga lo guardado y trae lo último, y repinta', A.diario.filter(x => /^prodCargar|^prodSincronizar|^renderLibrary/.test(x)).join(','), 'prodCargar,prodSincronizar,renderLibrary');
    t.eq('pintar otra vez enseguida no vuelve a traer', await A.M.csAsegurarDatos() + ' ' + A.diario.filter(x => x === 'prodSincronizar').length, 'false 1');
    A.M.CS_TRAER.ultima = Date.now() - 121000;
    await A.M.csAsegurarDatos();
    t.eq('a los dos minutos, sí', A.diario.filter(x => x === 'prodSincronizar').length, 2);
    const N = armar(); N.PROD.cargado = true; N.PROD.ws = 'wsP';
    await N.M.csAsegurarDatos();
    t.eq('si DublajeCast no trae nada nuevo, no repinta', N.diario.filter(x => x === 'renderLibrary').length, 0);
  }
  {
    /* Si al traer falta algo, se avisa y se ofrece devolverlo. */
    const COPIA = () => ({ id: 77, cuando: Date.now(), por: { series: 1, episodes: 3 }, total: 4, datos: PR.prodNormalizar(VOLCADO()) });
    const copia = COPIA();
    const A = armar({ trae: true, payload: Object.assign(VOLCADO(), { series: VOLCADO().series.filter(s => s.id !== 3) }), alSincronizar: (l) => l.unshift(copia) });
    A.PROD.cargado = true; A.PROD.ws = 'wsP';
    await A.M.csAsegurarDatos();
    t.eq('se avisa de lo que falta', A.avisos.join('|'), 'En DublajeCast faltan 1 programa, 3 capítulos que antes estaban. Dubbipt guardó una copia: se puede devolver desde el Dashboard de Casting');
    let c = controles(A, 'dashboard');
    t.ok('el Dashboard lo enseña, con devolver y descargar', /Lo que se borró en DublajeCast[\s\S]*?faltaban 1 programa, 3 capítulos[\s\S]*?data-cs="devolver" data-v="77"[\s\S]*?data-cs="bajarCopia" data-v="77"/.test(c.html));
    c.de('bajarCopia').onclick();
    const bajado = A.bajados[0];
    t.ok('descargar: un archivo que DublajeCast sabe importar', /^dublajecast_copia_\d{4}-\d\d-\d\d\.json$/.test(bajado[0]) && JSON.parse(bajado[1])._version === 'dublajecast_v2' && JSON.parse(bajado[1]).series.length === VOLCADO().series.length && bajado[2] === 'application/json');
    const antes = A.nube().series.length;
    t.eq('devolver: pregunta, vuelve lo que faltaba y se apunta', await A.M.csDevolverCopia(77) + ' ' + (A.nube().series.length - antes) + ' · ' + A.H[0].que,
         'guardado 1 · Devuelto a DublajeCast lo que se había borrado (1 programa, 3 capítulos)');
    t.ok('preguntó diciendo que lo de ahora no se toca', A.diario.some(x => /^pregunta Devolver a DublajeCast · .*Lo que hay ahora no se toca\./.test(x)));
    t.eq('y la copia queda como devuelta: ya no sale', A.COPIAS[0].devuelta + ' ' + /Lo que se borró en DublajeCast/.test(controles(A, 'dashboard').html), '1 false');
    const B = armar({ copias: [COPIA()] });
    B.M.CS.copias = B.COPIAS.slice();
    t.eq('si ya estaba todo, se dice y no se escribe nada', await B.M.csDevolverCopia(77) + ' ' + B.avisos.includes('Ya estaba todo en DublajeCast: no faltaba nada'), 'igual true');
    const C = armar({ copias: [COPIA()], confirmar: false });
    C.M.CS.copias = C.COPIAS.slice();
    t.eq('si se dice que no, nada', await C.M.csDevolverCopia(77) + ' ' + C.diario.filter(x => /^guarda/.test(x)).length + ' ' + !C.COPIAS[0].devuelta, 'cancelado 0 true');
    const D = armar({ copias: [COPIA()], sinSesion: true });
    D.M.CS.copias = D.COPIAS.slice();
    t.eq('sin sesión de DublajeCast, la copia sigue para luego', await D.M.csDevolverCopia(77) + ' ' + !D.COPIAS[0].devuelta, 'sesion true');
    t.eq('una copia que no existe', await D.M.csDevolverCopia(5), 'no hay');
  }

  t.seccion('8b · el talento, también en lo que solo está en Dubbipt');
  {
    const ZS = [{ id: 'sZ', name: 'ZOMBIES' }], ZE = { sZ: [{ id: 'z1', show_id: 'sZ', name: 'Episodio 1' }, { id: 'z2', show_id: 'sZ', name: 'Episodio 2' }] };
    const ZR = () => ({ sZ: { personajes: { MAX: { display: 'Max', talent: 'LUZ MAR', episodios: ['Episodio 1', 'Episodio 2'] }, RITA: { display: 'Rita', talent: '', episodios: ['Episodio 2'] } } } });
    const A = armar({ shows: ZS, eps: ZE, registros: ZR() });
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:sZ'; A.M.CS.tab = 'reparto';
    controles(A, 'programa'); await espera();
    let c = controles(A, 'programa');
    t.ok('el reparto de un programa sin DublajeCast, del registro de Dubbipt', /<b>LUZ MAR<\/b><div class="cs-tenue">1 pers\. · 2 apar\. · <b>0<\/b> lín\.<\/div>[\s\S]*?<b>Max<\/b><\/div><span class="cs-rep-eps"><span class="cs-rep-ep">Ep\.1<\/span><span class="cs-rep-ep">Ep\.2<\/span>/.test(c.html)
         && /Sin talento \(1\)[\s\S]*?<b>Rita<\/b>/.test(c.html));
    c.de('repAbrir', { v: 'per:MAX' }).onclick();
    c = controles(A, 'programa');
    A.campos.csRepNuevo = { value: 'Ana Rojas' };
    c.de('repGuardar', { v: 'per:MAX' }).onclick(); await espera(); await espera();
    t.eq('«Reasignar» lo cambia en el registro del programa, y se apunta', A.regGuardados.sZ.personajes.MAX.talent + ' · ' + A.regGuardados.sZ.personajes.MAX.episodios.join('+') + ' · ' + A.H[0].que + ' · ' + A.M.CS.repAbierto,
         'Ana Rojas · Episodio 1+Episodio 2 · Max: Ana Rojas (antes: LUZ MAR) · null');
    const B = armar({ shows: ZS, eps: ZE, registros: ZR() });
    B.M.CS.vista = 'episodio'; B.M.CS.prog = 's:sZ'; B.M.CS.ep = 'e:z2';
    controles(B, 'episodio'); await espera();
    c = controles(B, 'episodio');
    const max = c.de('talentoDub', { per: 'Max' });
    t.eq('en el episodio, el talento se puede cambiar aunque no esté en DublajeCast', max.value + ' · ' + c.de('talentoDub', { per: 'Rita' }).value + ' · ' + max.getAttribute('data-e'), 'LUZ MAR ·  · e:z2');
    const rita = c.de('talentoDub', { per: 'Rita' }); rita.value = '  Pepe   Gil '; rita.onchange(); await espera();
    t.eq('y se guarda en el registro, limpio', B.regGuardados.sZ.personajes.RITA.talent + ' · ' + B.avisos[B.avisos.length - 1], 'Pepe Gil · Rita: Pepe Gil (antes: sin asignar)');
    const C = armar({ shows: ZS, eps: ZE, registros: ZR() });
    C.M.CS.vista = 'episodio'; C.M.CS.prog = 's:sZ'; C.M.CS.ep = 'e:z1';
    controles(C, 'episodio'); await espera();
    const igual = controles(C, 'episodio').de('talentoDub', { per: 'Max' }); igual.value = 'luz mar'; igual.onchange(); await espera();
    t.eq('el mismo talento, nada que guardar', Object.keys(C.regGuardados).length + ' ' + C.H.length, '0 0');
    C.M.CS.vista = 'programa'; C.M.CS.tab = 'casting';
    t.ok('y en el casting de todo el programa, igual', /data-cs="talentoDub" data-e="e:z1" data-per="Max"/.test(controles(C, 'programa').html));
  }

  t.seccion('8c · el casting de cada capítulo llena el reparto (PRO-22)');
  {
    const ZS = [{ id: 'sZ', name: 'ZOMBIES' }], ZE = { sZ: [{ id: 'z1', show_id: 'sZ', name: 'Episodio 1' }, { id: 'z2', show_id: 'sZ', name: 'Episodio 2' }, { id: 'z3', show_id: 'sZ', name: 'Episodio 3' }] };
    const REG = { personajes: { MAX: { display: 'Max', talent: 'ANA ROJAS', episodios: ['Episodio 1', 'Episodio 2', 'Episodio 3'] }, VIEJO: { display: 'Viejo', talent: 'PEPE', episodios: ['Episodio 3'] } },
                  capitulos: { 'Episodio 1': { ts: 1, personajes: { MAX: { display: 'Max', talent: 'LUZ MAR', lineas: 40 }, RITA: { display: 'Rita', talent: '', lineas: 10 } } },
                               'Episodio 2': { ts: 2, personajes: { MAX: { display: 'Max', talent: 'ANA ROJAS', lineas: 30 }, RITA: { display: 'Rita', talent: '', lineas: 5 } } } } };
    const A = armar({ shows: ZS, eps: ZE });
    const p = A.M.csProgramas(ZS, (id) => ZE[id], null).find(x => x.clave === 's:sZ');
    const rep = A.M.csRepartoDe(p, null, REG);
    const de = (n) => rep.find(r => r.personaje === n);
    t.eq('cada personaje, con las intervenciones de cada capítulo casteado', rep.map(r => r.personaje + ' ' + r.episodios + 'ep ' + r.lineas + 'l').join(' | '), 'Max 3ep 70l | Rita 2ep 15l | Viejo 1ep 0l');
    t.eq('y su talento por tramos: un relevo entre capítulos se ve', de('Max').tramos.map(x => x.talento + ' ' + A.M.csTramoTexto(x.eps) + ' ' + x.lineas).join(' → '), 'LUZ MAR 1 40 → ANA ROJAS 2–3 30');
    t.eq('quien aún no tiene talento también está, con sus líneas', JSON.stringify(de('Rita').tramos), '[{"talento":"","talentoId":null,"eps":[1,2],"lineas":15}]');
    t.eq('lo de antes de las fotos sigue contando en los capítulos sin foto, y no repite los que tienen', de('Viejo').tramos.map(x => x.talento + ' ' + x.eps.join(',')).join('') + ' · ' + de('Max').tramos.map(x => x.eps.join(',')).join('|'), 'PEPE 3 · 1|2,3');
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:sZ'; A.M.CS.tab = 'reparto'; A.M.CS.registros = { sZ: REG };
    const c = controles(A, 'programa');
    t.ok('el Reparto lo enseña: líneas de verdad y «Sin talento» con quien falta', /<b>LUZ MAR<\/b><div class="cs-tenue">1 pers\. · 1 apar\. · <b>40<\/b> lín\.<\/div>/.test(c.html) && /Sin talento \(1\)[\s\S]*?<b>Rita<\/b><\/div><span class="cs-rep-lin">15 lín\.<\/span>/.test(c.html));
  }
  {
    /* En un programa que también está en DublajeCast, lo casteado en Dubbipt manda. */
    const A = armar();
    const d = PR.prodNormalizar(A.nube());
    const p = A.M.csProgramas(SHOWS, (id) => EPS_DUB[id] || [], d).find(x => x.clave === 's:s1');
    const REG = { personajes: {}, capitulos: { 'Episodio 1': { ts: 1, personajes: { ALLY: { display: 'ALLY', talent: 'CARLA PAZ', lineas: 99 }, NUEVO: { display: 'NUEVO', talent: 'LUZ MAR', lineas: 7 } } } } };
    const rep = A.M.csRepartoDe(p, d, REG);
    const ally = rep.find(r => r.personaje === 'ALLY');
    t.eq('el talento de Dubbipt en su capítulo; las líneas, las de DublajeCast', ally.tramos.map(x => x.talento + ' ' + A.M.csTramoTexto(x.eps) + ' ' + x.lineas).join(' → ') + ' · ' + ally.de, 'CARLA PAZ 1 186 → ANA ROJAS 2 90 → BEATRIZ SOL 3 30 · ambos');
    t.eq('y el personaje que solo salió en Dubbipt, también, con su reasignar de Dubbipt', JSON.stringify(rep.filter(r => r.personaje === 'NUEVO').map(r => [r.clave, r.de, r.lineas])), '[["per:NUEVO","dubbipt",7]]');
    t.eq('sin fotos, igual que antes', A.M.csRepartoDe(p, d, { personajes: {} }).find(r => r.personaje === 'ALLY').tramos.map(x => x.talento).join(','), 'ANA ROJAS,BEATRIZ SOL');
  }
  {
    /* Cambiar el talento desde la vista de Casting cambia también la foto. */
    const ZS = [{ id: 'sZ', name: 'ZOMBIES' }], ZE = { sZ: [{ id: 'z1', show_id: 'sZ', name: 'Episodio 1' }, { id: 'z2', show_id: 'sZ', name: 'Episodio 2' }] };
    const REG = () => ({ sZ: { personajes: { MAX: { display: 'Max', talent: 'LUZ MAR', episodios: ['Episodio 1', 'Episodio 2'] } },
                               capitulos: { 'Episodio 1': { ts: 1, personajes: { MAX: { display: 'Max', talent: 'LUZ MAR', lineas: 4 } } }, 'Episodio 2': { ts: 1, personajes: { MAX: { display: 'Max', talent: 'LUZ MAR', lineas: 6 } } } } } });
    const A = armar({ shows: ZS, eps: ZE, registros: REG() });
    const p = A.M.csProgramas(ZS, (id) => ZE[id], null)[0];
    const e2 = A.M.csEpisodios(p).find(e => e.clave === 'e:z2');
    await A.M.csTalentoDub(p, 'Max', 'Ana Rojas', e2);
    const g = A.regGuardados.sZ.capitulos;
    t.eq('en un episodio: solo su foto', g['Episodio 1'].personajes.MAX.talent + ' · ' + g['Episodio 2'].personajes.MAX.talent, 'LUZ MAR · Ana Rojas');
    const B = armar({ shows: ZS, eps: ZE, registros: REG() });
    await B.M.csTalentoDub(p, 'Max', 'Pepe', null);
    const h = B.regGuardados.sZ.capitulos;
    t.eq('«Reasignar» en todo el programa: todas las fotos', h['Episodio 1'].personajes.MAX.talent + ' · ' + h['Episodio 2'].personajes.MAX.talent, 'Pepe · Pepe');
  }
  {
    const A = armar({ shows: [{ id: 'sA', name: 'A' }, { id: 'sC', name: 'C' }], eps: { sA: [], sC: [] },
                      registros: { sA: { personajes: {}, capitulos: { 'Episodio 5': { ts: 1, personajes: {} }, 'Episodio 1': { ts: 1, personajes: { X: {} } } } }, sC: { personajes: {}, capitulos: { 'Episodio 1': { ts: 2, personajes: {} } } } } });
    await A.M.csJuntarRegistro('sA', 'sC');
    t.eq('al fusionar programas, las fotos de los capítulos pasan; las que ya tenía el que se queda, se quedan', Object.keys(A.regGuardados.sC.capitulos).sort().join(',') + ' · ' + Object.keys(A.regGuardados.sC.capitulos['Episodio 1'].personajes).length, 'Episodio 1,Episodio 5 · 0');
  }

  t.seccion('8d · moverse por Casting trae lo nuevo, sin recargar');
  {
    const A = armar();
    const veces = () => A.diario.filter(x => x === 'libFetchAll').length;
    t.eq('al moverse, se pide la biblioteca', A.M.csAlDia() + ' ' + (await espera(), await espera(), veces()), 'true 1');
    t.eq('como mucho cada 10 s', A.M.csAlDia() + ' ' + veces() + ' ' + A.M.CS_BIB.cada, 'false 1 10000');
    t.eq('«Actualizar» no espera', A.M.csAlDia(true) + ' ' + (await espera(), await espera(), veces()), 'true 2');
    t.ok('y después repinta, para que se vea', A.diario.lastIndexOf('renderLibrary') > A.diario.lastIndexOf('libFetchAll'));
    A.M.CS_BIB.ultima = 0;
    A.M.CS.vista = 'programas'; A.M.CS.filtro = 'todos';
    controles(A, 'programas').de('abrirProg').onclick(); await espera(); await espera();
    t.eq('abrir un programa lo trae', veces(), 3);
  }

  t.seccion('8e · programas con un número en el nombre: «100 Days of Deception»');
  {
    t.eq('los números del programa no son el del capítulo', [['100 Days of Deception 3', '100 DAYS OF DECEPTION'], ['100 DAYS OF DECEPTION 3_QC', '100 Days of Deception'], ['Episodio 100', '100 Days of Deception'], ['Episodio 101', 'FILIPINO'], ['102', ''], ['Sin número', 'X']].map(x => DC.dcastNumerosDe(x[0], x[1]).join('+') || '—').join(' | '), '3 | 3 | 100 | 101 | 102 | —');
    const DS = [{ id: 'sD', name: '100 DAYS OF DECEPTION' }];
    const DE = { sD: [{ id: 'd1', show_id: 'sD', name: '100 Days of Deception 1' }, { id: 'd3', show_id: 'sD', name: '100 Days of Deception 3_QC' }, { id: 'd2', show_id: 'sD', name: '100 Days of Deception 2' }] };
    const A = armar({ shows: DS, eps: DE });
    const p = A.M.csProgramas(DS, (id) => DE[id], null)[0];
    t.eq('cada capítulo con su número de verdad, en orden', A.M.csEpisodios(p).map(e => e.numero + ':' + e.ep.id).join(' '), '1:d1 2:d2 3:d3');
    t.eq('y no parecen repetidos', A.M.csRepetidosDub(p, () => true).length, 0);
    const d = PR.prodNormalizar({ series: [{ id: 7, name: '100 Days of Deception' }], episodes: [{ id: 71, series_id: 7, episode_number: 1 }, { id: 73, series_id: 7, episode_number: 3 }, { id: 700, series_id: 7, episode_number: 100 }],
                                  characters: [], talents: [], castings: [], appearances: [] });
    const pd = A.M.csProgramas(DS, (id) => DE[id], d)[0];
    t.eq('con DublajeCast, cada uno con su pareja, aunque allí haya un Ep. 100', A.M.csEpisodios(pd).map(e => e.ep ? e.ep.id + '→' + (e.dcEp ? e.dcEp.id : '—') : 'dc:' + e.dcEp.id).join(' '), 'd1→71 d2→— d3→73 dc:700');
  }

  t.seccion('8f · marcar los programas completados (PRO-25)');
  {
    const { M } = armar();
    t.eq('el estado: completado si lo dice Dubbipt o DublajeCast', [[{ estado: 'completo' }, null], [{ estado: 'en_curso' }, { status: 'completo' }], [{ estado: 'en_curso' }, { status: 'en_curso' }], [{ id: 1 }, null], [null, { status: 'pendiente' }]].map(x => M.csEstadoDe(x[0], x[1])).join(' '), 'completo completo en_curso en_curso pendiente');
    const ZS = [{ id: 'sZ', name: 'ZOMBIES', estado: 'en_curso' }, { id: 'sY', name: 'YETI', estado: 'completo' }];
    const A = armar({ shows: ZS, eps: { sZ: [], sY: [] } });
    A.M.CS.vista = 'programas'; A.M.CS.filtro = 'todos'; A.M.CS.buscarProg = '';
    let c = controles(A, 'programas');
    t.ok('en curso en ámbar y completado en verde, con su marca', /<b>ZOMBIES<\/b>[\s\S]*?<span class="cs-chip cs-estado cs-estado-en_curso">En curso<\/span>/.test(c.html) && /class="cs-prog cs-prog-hecho"><div class="cs-prog-arriba"><div class="cs-prog-t"><b>YETI<\/b>[\s\S]*?<span class="cs-chip cs-estado cs-estado-completo"><svg [\s\S]*?Completado<\/span>/.test(c.html));
    t.ok('cada tarjeta, con su botón para marcarla', /data-cs="estadoCard" data-v="s:sZ" title="Marcarlo como completado">[\s\S]*?<span>Completar<\/span>/.test(c.html) && /data-cs="estadoCard" data-v="s:sY" title="Volver a ponerlo en curso">[\s\S]*?<span>Reabrir<\/span>/.test(c.html));
    t.ok('«Abrir» en amarillo si está en curso y en verde si está completado', /class="cs-b cs-pri cs-prog-abrir cs-prog-abrir-curso" data-cs="abrirProg" data-v="s:sZ"/.test(c.html) && /class="cs-b cs-pri cs-prog-abrir" data-cs="abrirProg" data-v="s:sY"/.test(c.html));
    t.ok('renombrar y eliminar, arriba en la esquina; abajo solo «Abrir» y el estado', /<div class="cs-prog-acc"><button class="cs-b cs-b-icono" data-cs="renProg" data-v="s:sZ"/.test(c.html) && !/<div class="cs-prog-bots">(?:(?!<\/div>)[\s\S])*data-cs="renProg"/.test(c.html));
    c.de('estadoCard', { v: 's:sZ' }).onclick(); await espera(); await espera();
    t.eq('marcar desde la tarjeta: se guarda en la columna del programa', JSON.stringify(A.sbInsertados.filter(x => x[0] === 'shows~').map(x => [x[2], x[1]])), '[["sZ",{"estado":"completo"}]]');
    t.ok('y se ve ya, completado', ZS[0].estado === 'completo' && /<b>ZOMBIES<\/b>[\s\S]*?cs-estado-completo/.test(controles(A, 'programas').html) && /Programa completado: ZOMBIES$/.test(A.avisos[A.avisos.length - 1]));
    t.eq('el filtro lo cuenta donde toca', A.M.CS.filtro = 'completo', 'completo');
    t.eq('…en Completados', /<b>ZOMBIES<\/b>/.test(controles(A, 'programas').html) + ' ' + /<b>YETI<\/b>/.test(controles(A, 'programas').html), 'true true');
  }
  {
    /* Sin la columna todavía: en este equipo, y se dice cómo compartirlo. */
    const ZS = [{ id: 'sZ', name: 'ZOMBIES' }];
    const A = armar({ shows: ZS, eps: { sZ: [] }, sinColumna: true });
    const p = A.M.csActual().lista.find(x => x.clave === 's:sZ');
    t.eq('se guarda en este equipo', await A.M.csCambiarEstado(p, 'completo'), 'equipo');
    t.eq('apuntado por espacio de trabajo', A.guardado['ddl-estados::wsP'], '{"sZ":"completo"}');
    t.ok('y se dice qué SQL correr para compartirlo', /guardado solo en este equipo: para que lo vea todo el equipo, corre sql\/mejora-04-estado-programas\.sql una vez/.test(A.avisos[A.avisos.length - 1]));
    t.eq('al pintar, se ve completado', A.M.csActual().lista.find(x => x.clave === 's:sZ').estado, 'completo');
    await A.M.csCambiarEstado(A.M.csActual().lista.find(x => x.clave === 's:sZ'), 'en_curso');
    t.eq('y se puede volver a poner en curso', A.M.csActual().lista.find(x => x.clave === 's:sZ').estado + ' ' + A.guardado['ddl-estados::wsP'], 'en_curso {"sZ":"en_curso"}');
    const B = armar({ shows: [{ id: 'sZ', name: 'ZOMBIES' }], eps: { sZ: [] }, fallaUpdate: true });
    t.eq('otro error: se dice y no se finge', await B.M.csCambiarEstado(B.M.csActual().lista.find(x => x.clave === 's:sZ'), 'completo') + ' · ' + B.avisos[B.avisos.length - 1], 'error · No se pudo guardar el estado de «ZOMBIES»: sin permiso');
    t.eq('un estado raro, nada', await B.M.csCambiarEstado(B.M.csActual().lista[0], 'roto'), 'nada');
  }
  {
    /* En DublajeCast también, para el administrador. */
    const A = armar();
    const p = A.M.csActual().lista.find(x => x.clave === 's:s1');
    t.eq('en los dos lados', await A.M.csCambiarEstado(p, 'completo') + ' · ' + A.nube().series[0].status + ' · ' + JSON.stringify(A.sbInsertados.filter(x => x[0] === 'shows~').map(x => x[1])), 'nube · completo · [{"estado":"completo"}]');
    const D = armar({ sinSesion: true });
    const pd = D.M.csActual().lista.find(x => x.clave === 'dc:2');
    t.eq('uno solo de DublajeCast sin sesión: no se finge', await D.M.csCambiarEstado(pd, 'completo'), 'error');
  }

  t.seccion('9 · fusionar programas');
  const ALW = [{ id: 'sA', name: 'ALWAYS' }, { id: 'sC', name: 'ALWAYS ON CALL' }, { id: 's1', name: 'A FILIPINO CHRISTMAS' }];
  const ALW_EPS = { sA: [{ id: 'eA1', show_id: 'sA', name: 'Episodio 1', xls_path: 'sA/eA1/desglose.xlsm', pdf_path: 'sA/eA1/libreto.pdf', json_path: 'otra/ruta.json' }, { id: 'eA2', show_id: 'sA', name: 'Episodio 2' }],
                    sC: [{ id: 'eC1', show_id: 'sC', name: 'Episodio 1' }], s1: EPS_DUB.s1 };
  const ALW_ARCH = { 'sA/eA1': ['desglose.xlsm', 'libreto.pdf'], 'sA/eA2': ['libreto.pdf'] };
  const ALW_REG = { sA: { personajes: { ANA: { display: 'Ana', talent: 'LUZ MAR', episodios: ['Episodio 1'] }, LEO: { display: 'Leo', talent: 'PEPE', episodios: ['Episodio 2'] }, TOM: { display: 'Tom', talent: 'RAUL', episodios: ['Episodio 2'] } } },
                   sC: { personajes: { ANA: { display: 'Ana', talent: 'LUZ MAR', episodios: ['Episodio 3'] }, TOM: { display: 'Tom', talent: 'BETO', episodios: ['Episodio 1'] } } } };
  {
    const A = armar({ shows: ALW, eps: ALW_EPS });
    const lista = A.M.csActual().lista;
    const pares = A.M.csParecidos(lista);
    t.eq('parecen el mismo cuando un nombre es el principio del otro, palabra a palabra', pares.map(x => x.map(y => y.nombre).join(' ~ ')).join(' | '), 'ALWAYS ~ ALWAYS ON CALL');
    t.eq('«A» no es el principio de «A FILIPINO…» si no es una palabra entera, ni «Akka» de nada', A.M.csParecidos([{ nombre: 'ALWAY' }, { nombre: 'ALWAYS' }, { nombre: 'Akka' }, { nombre: 'THE OFFICE' }, { nombre: 'THE CROWN' }]).length, 0);
    t.eq('o todas sus palabras están en el otro, en cualquier sitio: «FILIPINO» y «A FILIPINO CHRISMAS»', A.M.csParecidos([{ nombre: 'FILIPINO' }, { nombre: 'A FILIPINO CHRISMAS' }, { nombre: 'DOFUS' }]).map(x => x.map(y => y.nombre).join(' ~ ')).join(' | '), 'FILIPINO ~ A FILIPINO CHRISMAS');
    {
      const F = armar({ shows: [{ id: 'sF', name: 'FILIPINO' }, { id: 'sX', name: 'A FILIPINO CHRISMAS' }], eps: { sF: [{ id: 'f1', show_id: 'sF', name: 'Episodio 101' }], sX: [{ id: 'f2', show_id: 'sX', name: '102' }] } });
      F.M.CS.vista = 'programa'; F.M.CS.prog = 's:sF'; F.M.CS.tab = 'episodios'; F.M.CS.fusionProg = null;
      const cf = controles(F, 'programa');
      t.ok('dentro del programa, se avisa del otro que parece el mismo, con sus capítulos', /Hay otro programa que parece este: <b>A FILIPINO CHRISMAS<\/b> · 4 episodios \(Ep\. 1, Ep\. 2, Ep\. 3, Ep\. 102\)/.test(cf.html) && cf.de('abrirProg', { v: 's:sX' }) && cf.de('fusionPar', { v: 's:sX|s:sF' }));
      cf.de('fusionPar').onclick();
      t.ok('y «Fusionar» abre la fusión ya elegida, sin repetir el aviso', F.M.CS.prog === 's:sX' && F.M.CS.fusionProg.otro === 's:sF' && !/Hay otro programa que parece este/.test(controles(F, 'programa').html));
    }
    t.eq('una palabra larga casi igual cuenta como la misma', A.M.csParecidos([{ nombre: 'A FILIPINO CHRISMAS' }, { nombre: 'A Filipino Christmas' }]).length, 1);
    t.eq('las palabras vacías solas no bastan', A.M.csParecidos([{ nombre: 'THE' }, { nombre: 'THE CROWN' }, { nombre: 'LOS DE' }, { nombre: 'LOS SIMPSON DE SIEMPRE' }]).map(x => x.map(y => y.nombre).join(' ~ ')).join(' | '), 'THE ~ THE CROWN');
    const por = (n) => lista.find(x => x.nombre === n);
    t.eq('se queda el que está en los dos lados; si no, el de nombre más largo', A.M.csQuedaDe(por('ALWAYS'), por('ALWAYS ON CALL')).nombre + ' · ' + A.M.csQuedaDe(por('A FILIPINO CHRISTMAS'), por('Akka')).nombre + ' · ' + A.M.csQuedaDe({ nombre: 'AKKA', show: {}, serie: {} }, { nombre: 'AKKA LA SERIE', show: {} }).nombre, 'ALWAYS ON CALL · A FILIPINO CHRISTMAS · AKKA');
    A.M.CS.vista = 'programas'; A.M.CS.filtro = 'todos';
    let c = controles(A, 'programas');
    t.ok('la lista de programas avisa de los que parecen el mismo', /Programas que parecen el mismo[\s\S]*?<b>ALWAYS<\/b> y <b>ALWAYS ON CALL<\/b>[\s\S]*?data-cs="fusionPar" data-v="s:sC\|s:sA"/.test(c.html));
    c.de('fusionPar').onclick();
    c = controles(A, 'programa');
    t.ok('«Fusionar» abre el que se queda, con el otro elegido', A.M.CS.prog === 's:sC' && /Fusionar con otro programa[\s\S]*?<option value="s:sA" selected>ALWAYS · parece el mismo<\/option>/.test(c.html));
    t.ok('y dice lo que va a pasar', /value="este" checked> ALWAYS ON CALL[\s\S]*?<li>En Dubbipt, 2 capítulos de «ALWAYS» pasan a «ALWAYS ON CALL» con sus libretos, su registro de casting se junta y «ALWAYS» se borra\.<\/li>/.test(c.html));
    c.de('fusionQueda', { v: undefined }); const radio = c.de('fusionQueda'); radio.value = 'otro'; radio.onchange();
    t.ok('se puede elegir que se quede el otro', /value="otro" checked> ALWAYS<\/label>[\s\S]*?«ALWAYS ON CALL» pasan a «ALWAYS»/.test(controles(A, 'programa').html));
    controles(A, 'programa').de('fusionProgNo').onclick();
    t.ok('Cancelar cierra la caja', A.M.CS.fusionProg === null && !/Fusionar con otro programa/.test(controles(A, 'programa').html));
    controles(A, 'programa').de('fusionProg').onclick();
    t.ok('el botón «Fusionar» del programa la abre, sin nada elegido', /Fusionar con otro programa/.test(controles(A, 'programa').html) && !/data-cs="fusionProgYa"/.test(controles(A, 'programa').html));
  }
  {
    /* Dos de Dubbipt: los capítulos con sus archivos, el registro, y el vacío se borra. */
    const A = armar({ shows: ALW, eps: ALW_EPS, archivos: ALW_ARCH, registros: ALW_REG });
    const lista = A.M.csActual().lista, queda = lista.find(x => x.nombre === 'ALWAYS ON CALL'), pasa = lista.find(x => x.nombre === 'ALWAYS');
    t.eq('fusionar: pregunta y lo hace', await A.M.csFusionarProgramas(queda, pasa), 'hecho');
    t.ok('preguntó diciendo lo que pasa', A.diario.some(x => /^pregunta Fusionar programas · Se queda «ALWAYS ON CALL»\. En Dubbipt, 2 capítulos/.test(x)));
    t.eq('los archivos, de carpeta en carpeta', A.movidos.join(', '), 'sA/eA1/desglose.xlsm > sC/eA1/desglose.xlsm, sA/eA1/libreto.pdf > sC/eA1/libreto.pdf, sA/eA2/libreto.pdf > sC/eA2/libreto.pdf');
    t.eq('y la fila, con sus rutas nuevas (las que no son de la carpeta, igual)', JSON.stringify(A.sbInsertados.filter(x => x[0] === 'episodes~').map(x => [x[2], x[1]])),
         '[["eA1",{"show_id":"sC","xls_path":"sC/eA1/desglose.xlsm","pdf_path":"sC/eA1/libreto.pdf"}],["eA2",{"show_id":"sC"}]]');
    const reg = A.regGuardados.sC.personajes;
    t.eq('el registro se junta: lo nuevo entra, lo igual suma capítulos, lo distinto se queda como estaba', [reg.ANA.episodios.join('+'), reg.LEO.talent, reg.TOM.talent].join(' · '), 'Episodio 3+Episodio 1 · PEPE · BETO');
    t.eq('el vacío se borra, y queda apuntado', A.borrados.join(',') + ' · ' + A.H[0].que, 'shows:sA · Fusionado «ALWAYS» en «ALWAYS ON CALL»');
    t.eq('el aviso dice lo que chocaba', A.avisos[A.avisos.length - 1], 'Fusionado «ALWAYS» en «ALWAYS ON CALL» · 1 personaje con otro talento en «ALWAYS»: se queda el de «ALWAYS ON CALL»');
    t.eq('y se queda en el programa que queda', A.M.CS.prog + ' ' + A.M.CS.vista + ' ' + A.M.CS.fusionProg, 's:sC programa null');
  }
  {
    const A = armar({ shows: ALW, eps: ALW_EPS, archivos: ALW_ARCH, registros: ALW_REG, fallaMover: 'eA2' });
    const lista = A.M.csActual().lista;
    t.eq('si un archivo no se deja mover, se para', await A.M.csFusionarProgramas(lista.find(x => x.nombre === 'ALWAYS ON CALL'), lista.find(x => x.nombre === 'ALWAYS')), 'error');
    t.ok('y el que se iba a borrar no se borra: se dice cuánto se movió', !A.borrados.length && /se movieron 1 de 2 capítulos \(Episodio 2: sin permiso para mover\)\. «ALWAYS» no se borra: vuelve a fusionar para terminar\./.test(A.avisos.join('|')));
    const B = armar({ shows: ALW, eps: ALW_EPS, archivos: ALW_ARCH, fallaUpdate: true });
    await B.M.csMoverEpisodiosDub({ id: 'sA' }, { id: 'sC' });
    t.eq('si la fila no se deja, los archivos vuelven a su sitio', B.movidos.join(', '), 'sA/eA1/desglose.xlsm > sC/eA1/desglose.xlsm, sA/eA1/libreto.pdf > sC/eA1/libreto.pdf, sC/eA1/desglose.xlsm > sA/eA1/desglose.xlsm, sC/eA1/libreto.pdf > sA/eA1/libreto.pdf');
    const N = armar({ shows: ALW, eps: ALW_EPS, confirmar: false });
    const ln = N.M.csActual().lista;
    t.eq('si se dice que no, nada', await N.M.csFusionarProgramas(ln[1], ln[0]) + ' ' + N.movidos.length + ' ' + N.borrados.length, 'cancelado 0 0');
    t.eq('consigo mismo, nada', await N.M.csFusionarProgramas(ln[0], ln[0]), 'nada');
  }
  {
    /* Con DublajeCast: el de allí pasa al que se queda. */
    const A = armar();
    const lista = A.M.csActual().lista, queda = lista.find(x => x.clave === 's:s1'), pasa = lista.find(x => x.clave === 'dc:2');
    t.eq('el plan, en los dos lados', A.M.csPlanFusion(queda, pasa).join(' '), 'En DublajeCast, 2 capítulos, tráilers y producción de «Akka» pasan a «A FILIPINO CHRISTMAS», y «Akka» va a la papelera de DublajeCast.');
    t.eq('fusionar en DublajeCast', await A.M.csFusionarProgramas(queda, pasa), 'hecho');
    const P = A.nube();
    t.ok('«Akka» desaparece y sus capítulos son del que queda', !P.series.some(s => s.id === 2) && P.episodes.filter(e => String(e.series_id) === '1').length === VOLCADO().episodes.filter(e => ['1', '2'].includes(String(e.series_id))).length && P.trash[0].kind === 'series');
    t.eq('en Dubbipt no se toca nada', A.movidos.length + ' ' + A.borrados.length + ' ' + A.sbInsertados.length, '0 0 0');
    const S = armar({ sinSesion: true });
    const ls = S.M.csActual().lista;
    t.eq('sin sesión de DublajeCast, nada en ningún lado', await S.M.csFusionarProgramas(ls.find(x => x.clave === 's:s1'), ls.find(x => x.clave === 'dc:2')) + ' ' + S.H.length, 'sesion 0');
  }
  {
    /* Uno solo en DublajeCast y otro solo en Dubbipt: se renombra para que casen. */
    const A = armar({ shows: [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }, { id: 'sP', name: 'LA PELI DOBLADA' }], eps: { s1: EPS_DUB.s1, sP: [] } });
    const lista = A.M.csActual().lista, peli = lista.find(x => x.clave === 'dc:3'), dub = lista.find(x => x.clave === 's:sP');
    t.eq('se queda el de DublajeCast: el de Dubbipt se llama como él', (await A.M.csFusionarProgramas(peli, dub)) + ' ' + JSON.stringify(A.sbInsertados.filter(x => x[0] === 'shows~').map(x => [x[2], x[1].name])), 'hecho [["sP","La peli"]]');
    t.eq('y se va a él', A.M.CS.prog, 's:sP');
    const B = armar({ shows: [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }, { id: 'sP', name: 'LA PELI DOBLADA' }], eps: { s1: EPS_DUB.s1, sP: [] } });
    const lb = B.M.csActual().lista;
    await B.M.csFusionarProgramas(lb.find(x => x.clave === 's:sP'), lb.find(x => x.clave === 'dc:3'));
    t.eq('se queda el de Dubbipt: el de DublajeCast se llama como él', B.nube().series.find(s => s.id === 3).name, 'LA PELI DOBLADA');
  }

  t.seccion('10 · eliminar por completo: Dubbipt y DublajeCast');
  {
    const P0 = VOLCADO();
    const P1 = JSON.parse(JSON.stringify(P0));
    t.eq('borrar un episodio de DublajeCast quita sus personajes y castings', DX.dcxBorrarEpisodios(P1, [11]) + ' ' + P1.episodes.some(e => e.id === 11) + ' ' + P1.appearances.some(a => a.episode_id === 11) + ' ' + P1.castings.some(c => c.episode_id === 11), 'true false false false');
    t.eq('y lo deja en su papelera, con todo, para poder restaurarlo', P1.trash[0].kind + ' ' + P1.trash[0].data.episodes.length + ' ' + P1.trash[0].data.castings.length, 'episode 1 2');
    t.eq('los demás no se tocan', P1.episodes.length + ' ' + P1.castings.length, (P0.episodes.length - 1) + ' ' + (P0.castings.length - 2));
    t.eq('uno que no existe no cambia nada', DX.dcxBorrarEpisodios(JSON.parse(JSON.stringify(P0)), [999]), false);
    const P2 = Object.assign(JSON.parse(JSON.stringify(P0)), { produccion: [{ programa: 'A Filipino Christmas', capitulo: 1 }, { programa: 'Akka', capitulo: 1 }] });
    t.eq('borrar un programa de DublajeCast quita sus episodios, castings, tráilers y producción', DX.dcxBorrarSerie(P2, 1) + ' ' + P2.series.map(x => x.id).join(',') + ' · ' + P2.episodes.filter(e => e.series_id === 1).length + ' ' + P2.castings.length + ' ' + P2.trailers.length + ' ' + P2.produccion.map(r => r.programa).join(','), 'true 2,3 · 0 0 0 Akka');
    t.eq('y va entero a la papelera', P2.trash[0].kind + ' ' + P2.trash[0].data.series[0].name, 'series A Filipino Christmas');
    t.ok('los talentos y los personajes, que son de todos, se quedan', P2.talents.length === P0.talents.length && P2.characters.length === P0.characters.length);
  }
  {
    /* «Eliminé este episodio, se borró el casting de Dubbipt pero se quedó el ep»: tenía pareja en DublajeCast. */
    const A = armar();
    const p = A.M.csActual().lista.find(x => x.clave === 's:s1');
    const e1 = A.M.csEpisodios(p).find(x => x.ep && x.ep.id === 'e1');
    t.ok('el Episodio 1 de Dubbipt tiene su pareja en DublajeCast', !!(e1 && e1.dcEp && e1.dcEp.id === 11));
    t.eq('eliminarlo lo borra de Dubbipt y de DublajeCast, preguntando una vez', (await A.M.csBorrarEpisodio(p, e1)) + ' ' + A.diario.filter(x => /^borra|^pregunta/.test(x)).length + ' ' + A.diario.includes('borraEp e1 true') + ' ' + A.nube().episodes.some(e => e.id === 11), 'true 2 true false');
    t.ok('la pregunta dice que es de los dos sitios', A.diario.some(x => /^pregunta Eliminar episodio .*de Dubbipt y de DublajeCast/.test(x)));
    t.ok('y queda apuntado quién lo eliminó', A.H.some(h => /^Episodio eliminado/.test(h.que)));
    const p2 = A.M.csActual().lista.find(x => x.clave === 's:s1');
    const solo = A.M.csEpisodios(p2).find(x => !x.ep && x.dcEp && x.dcEp.id === 13);
    t.eq('uno que ya solo está en DublajeCast también se puede eliminar', (await A.M.csBorrarEpisodio(p2, solo)) + ' ' + A.nube().episodes.some(e => e.id === 13), 'true false');
  }
  {
    const A = armar();
    const p = A.M.csActual().lista.find(x => x.clave === 's:s1');
    t.eq('eliminar el programa lo borra de Dubbipt y de DublajeCast', (await A.M.csBorrarPrograma(p)) + ' ' + A.diario.includes('borraProg s1 true') + ' ' + A.nube().series.some(s => s.id === 1) + ' ' + A.M.CS.vista, 'true true false programas');
    const N = armar({ confirmar: false });
    const pn = N.M.csActual().lista.find(x => x.clave === 's:s1');
    t.eq('si se cancela, nada', (await N.M.csBorrarPrograma(pn)) + ' ' + N.diario.filter(x => /^borra/.test(x)).length + ' ' + N.nube().series.some(s => s.id === 1), 'false 0 true');
    const S = armar({ sinSesion: true });
    const ps = S.M.csActual().lista.find(x => x.clave === 's:s1');
    await S.M.csBorrarPrograma(ps);
    t.ok('sin sesión en DublajeCast: lo de Dubbipt se borra y se dice cómo terminar', S.diario.includes('borraProg s1 true') && S.avisos.some(a => /Entra en DublajeCast y vuelve a pulsar «Eliminar»/.test(a)));
    const B = armar();
    t.eq('la papelera de la biblioteca también borra su pareja de DublajeCast', (await B.M.csBorrarDeBiblioteca(null, EPS_DUB.s1[1])) + ' ' + B.diario.includes('borraEp e2 true') + ' ' + B.nube().episodes.some(e => e.id === 12), 'true true false');
  }

  t.seccion('11 · cada episodio, en producción o completado; y la lista de activos (PRO-31)');
  {
    const A = armar();
    const p = A.M.csActual().lista.find(x => x.clave === 's:s1');
    const e1 = A.M.csEpisodios(p).find(x => x.ep && x.ep.id === 'e1');
    t.eq('por omisión, en producción', A.M.csEstadoEp(e1), 'en_curso');
    t.eq('completado en DublajeCast o en Dubbipt, completado', A.M.csEstadoEp({ ep: { id: 'x', estado: 'completo' }, dcEp: { status: 'en_curso' } }) + ' ' + A.M.csEstadoEp({ ep: { id: 'x' }, dcEp: { status: 'completo' } }), 'completo completo');
    const r = await A.M.csCambiarEstadoEp(p, e1, 'completo');
    t.eq('marcarlo completado: en Dubbipt, en una petición', r + ' ' + JSON.stringify(A.sbInsertados.find(x => /^episodes/.test(x[0])) || null), 'nube ["episodes~",{"estado":"completo"},["e1"]]');
    t.eq('y en DublajeCast, su status', A.nube().episodes.find(x => x.id === 11).status, 'completo');
    t.ok('apuntado y dicho', A.H.some(h => /^Episodio completado: /.test(h.que)) && A.avisos.some(a => /^Episodio completado: /.test(a)));
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1'; A.M.CS.tab = 'episodios';
    const v = controles(A, 'programa');
    t.ok('cada episodio dice su estado y tiene su botón con nombre: «Reabrir» si está completado', /cs-estado-completo/.test(v.html) && !!v.de('estadoEp', { v: 'e:e1' }) && /data-cs="estadoEp" data-v="e:e1"[^>]*>[\s\S]*?<span>Reabrir<\/span>/.test(v.html));
    t.ok('y «Completar» si está en curso, también en los que solo están en DublajeCast', /data-cs="estadoEp" data-v="e:e2"[^>]*>[\s\S]*?<span>Completar<\/span>/.test(v.html) && !!v.de('estadoEp', { v: 'd:13' }));
    for(const x of EPS_DUB.s1) delete x.estado;            // lo compartido, como estaba
  }
  {
    t.eq('el número de cada línea, como venga', ['Always on Call: Season 1 - EP4', 'DSC - In The Eye of the Storm S3 Ep. 303 H#638706 (DUBBING)', 'HHL - Brain Doctors: Inside Neurosurgery S1 EP101 H#660225 (DUBBING) - SCREENER', 'The Wayans Bros Season 2 EP 14', '100 Days of Deception EP6']
      .map(l => armar().M.csNumeroDeLinea(l, '')).join(','), '4,303,101,14,6');
    const A = armar();
    const lista = A.M.csActual().lista;
    t.eq('el programa: el de nombre más largo cuyas palabras están todas', (A.M.csProgramaDeLinea('A Filipino Christmas: Season 1 - EP2', lista) || {}).clave, 's:s1');
    const plan = A.M.csLeerActivos('A Filipino Christmas: Season 1 - EP2\n\nA Filipino Christmas: Season 1 - EP2\nFinal Table: Season 1 - EP3', lista);
    t.eq('cada línea casa con su episodio, sin repetir; lo que no casa se dice', plan.activos.map(x => x.e.clave).join(',') + ' · ' + plan.sinCasar.join(','), 'e:e2 · Final Table: Season 1 - EP3');
    t.ok('los demás en producción, para pasarlos a completados', plan.resto.some(x => x.e.clave === 'e:e1') && !plan.resto.some(x => x.e.clave === 'e:e2'));
    const r = await A.M.csAplicarActivos(plan, true);
    const p = A.M.csActual().lista.find(x => x.clave === 's:s1');
    const est = (c) => A.M.csEstadoEp(A.M.csEpisodios(p).find(x => x.clave === c));
    t.eq('al aplicar: los de la lista en producción y los demás completados', est('e:e2') + ' ' + est('e:e1') + ' ' + r.r1 + ' ' + r.r2, 'en_curso completo nube nube');
    t.ok('y se dice cuántos', A.avisos.some(a => /^Episodios activos: 1 en curso, \d+ completados/.test(a)));
  }

  t.seccion('12 · «Reasignar» del Reparto, en los dos lados');
  {
    /* Un programa de los dos lados con ALLY casteado también en Dubbipt: manda Dubbipt en el Reparto. */
    const REGS = { s1: { personajes: { ALLY: { display: 'ALLY', talent: 'ANA ROJAS', episodios: ['Episodio 1', 'Episodio 2'], ts: 1 } },
                         capitulos: { 'Episodio 1': { ts: 1, personajes: { ALLY: { display: 'ALLY', talent: 'ANA ROJAS', lineas: 186 } } },
                                      'Episodio 2': { ts: 1, personajes: { ALLY: { display: 'ALLY', talent: 'BEATRIZ SOL', lineas: 90 } } } } } };
    const A = armar({ registros: REGS });
    A.M.CS.vista = 'programa'; A.M.CS.prog = 's:s1'; A.M.CS.tab = 'reparto';
    controles(A, 'programa'); await espera();
    controles(A, 'programa').de('repAbrir', { v: 'ch:101' }).onclick();
    A.campos.csRepNuevo = { value: 'Carla Paz' };
    controles(A, 'programa').de('repGuardar', { v: 'ch:101' }).onclick(); await espera(); await espera(); await espera();
    t.eq('cambia en DublajeCast', A.nube().castings.filter(x => x.character_id === 101).map(x => A.nube().talents.find(y => y.id === x.talent_id).name).join(','), 'CARLA PAZ,CARLA PAZ,CARLA PAZ');
    const g = A.regGuardados.s1;
    t.eq('y en Dubbipt, en todos sus episodios: si no, el Reparto seguía con el viejo', g && (g.personajes.ALLY.talent + ' · ' + g.capitulos['Episodio 1'].personajes.ALLY.talent + ' · ' + g.capitulos['Episodio 2'].personajes.ALLY.talent), 'Carla Paz · Carla Paz · Carla Paz');
    t.ok('y se cierra', A.M.CS.repAbierto === null);
    /* Un relevo: el último tramo ya es el nuevo, los anteriores no. */
    const R = { sZ: { personajes: { MAX: { display: 'Max', talent: 'Ana Rojas', episodios: ['Episodio 1', 'Episodio 2'], ts: 1 } },
                      capitulos: { 'Episodio 1': { ts: 1, personajes: { MAX: { display: 'Max', talent: 'LUZ MAR', lineas: 3 } } }, 'Episodio 2': { ts: 1, personajes: { MAX: { display: 'Max', talent: 'Ana Rojas', lineas: 4 } } } } } };
    const B = armar({ shows: [{ id: 'sZ', name: 'SOLO DUBBIPT' }], eps: { sZ: [{ id: 'z1', show_id: 'sZ', name: 'Episodio 1' }, { id: 'z2', show_id: 'sZ', name: 'Episodio 2' }] }, registros: R });
    B.M.CS.vista = 'programa'; B.M.CS.prog = 's:sZ'; B.M.CS.tab = 'reparto';
    controles(B, 'programa'); await espera();
    B.M.CS.repAbierto = 'per:MAX';
    B.campos.csRepNuevo = { value: 'Ana Rojas' };
    controles(B, 'programa').de('repGuardar', { v: 'per:MAX' }).onclick(); await espera(); await espera();
    t.eq('en un relevo, el mismo talento que el último tramo cambia también los anteriores', B.regGuardados.sZ && B.regGuardados.sZ.capitulos['Episodio 1'].personajes.MAX.talent, 'Ana Rojas');
    const C = armar();
    C.M.CS.vista = 'programa'; C.M.CS.prog = 's:s1'; C.M.CS.tab = 'reparto'; C.M.CS.repAbierto = 'ch:101';
    C.campos.csRepNuevo = { value: '  ' };
    controles(C, 'programa').de('repGuardar', { v: 'ch:101' }).onclick(); await espera();
    t.ok('vacío: se pide el nombre y no se toca nada', C.avisos.includes('Escribe el talento nuevo') && C.M.CS.repAbierto === 'ch:101');
  }

  t.seccion('13 · buscar un personaje en Talentos: qué programa y qué talento, aunque esté mal escrito');
  {
    const A = armar();
    const M = A.M;
    const casos = [['anantip', 'ANANTHIP'], ['cristofer', 'CHRISTOPHER'], ['kristopher', 'CHRISTOPHER'], ['josefin', 'JOSEPHINE'], ['doctor viyalobos', 'DOCTOR VILLALOBOS'],
                   ['villa lobos', 'DOCTOR VILLALOBOS'], ['titoboi', 'TITO BOY'], ['narador', 'NARRADOR'], ['ali', 'ALLY'], ['betriz', 'BEATRIZ']];
    t.eq('mal escrito, junto o separado, por cómo suena: se encuentra', casos.filter(([q, n]) => M.csParecidoPersonaje(q, n) >= 0.7).length, casos.length);
    t.ok('lo que no se parece, no', M.csParecidoPersonaje('soldado', 'NARRADOR') < 0.7 && M.csParecidoPersonaje('kai', 'JOSEPHINE') < 0.7);
    const d = PR.prodNormalizar(A.nube());
    const regs = [{ showId: 's1', programa: 'A FILIPINO CHRISTMAS', serieId: 1, reg: { personajes: {}, capitulos: { 'Episodio 2': { personajes: { ALLY: { display: 'ALLY', talent: 'Luz Mar', lineas: 95 } } } } } },
                  { showId: 'sZ', programa: 'SOLO DUBBIPT', serieId: null, reg: { personajes: { MAX: { display: 'Max', talent: 'Pepe', episodios: ['Episodio 4'] } } } }];
    const papeles = M.csIndicePapeles(d, regs);
    const ally = M.csBuscarPersonajes(papeles, 'aly');
    t.eq('cada papel: programa (el nombre de Dubbipt si es de los dos), talento, episodios y líneas, y de dónde sale; por líneas',
         ally[0].personaje + ' · ' + ally[0].papeles.map(x => x.programa + ' / ' + x.talento + ' / ' + x.eps.join('+') + ' / ' + x.lineas + ' / ' + x.de).join(' | '),
         'ALLY · A FILIPINO CHRISTMAS / ANA ROJAS / 1+2 / 276 / DublajeCast | A FILIPINO CHRISTMAS / Luz Mar / 2 / 95 / Dubbipt | A FILIPINO CHRISTMAS / BEATRIZ SOL / 3 / 30 / DublajeCast');
    t.eq('también lo que solo está en Dubbipt', M.csBuscarPersonajes(papeles, 'macs').map(g => g.personaje + ' · ' + g.papeles[0].programa + ' / ' + g.papeles[0].talento + ' / ' + g.papeles[0].eps.join('+')).join(), 'Max · SOLO DUBBIPT / Pepe / 4');
    t.eq('quien aún no tiene talento también sale', M.csBuscarPersonajes(papeles, 'tito boy')[0].papeles[0].talento, '');
    t.eq('lo escrito tal cual va primero', M.csBuscarPersonajes([{ personaje: 'JANAS', programa: 'P', talento: 'T', eps: [], lineas: 0, de: 'x' }, { personaje: 'JANA', programa: 'P', talento: 'T', eps: [], lineas: 0, de: 'x' }], 'jana').map(g => g.personaje).join(','), 'JANA,JANAS');
    t.eq('sin escribir nada, nada', M.csBuscarPersonajes(papeles, '  ').length, 0);
    M.CS_REGS.lista = regs; M.CS_REGS.ts = Date.now();
    M.CS.vista = 'talentos'; M.CS.talModo = 'personajes'; M.CS.buscarPer = 'aly';
    const v = controles(A, 'talentos');
    t.ok('en Talentos, la pestaña «Buscar personaje» con su buscador y los resultados', !!v.de('talModo', { v: 'personajes' }) && !!v.de('buscarPer')
         && /<b>ALLY<\/b><span class="cs-tenue">parecido \d+%<\/span>[\s\S]*?<span class="cs-per-prog">A FILIPINO CHRISTMAS<\/span><span class="cs-talento">ANA ROJAS<\/span>/.test(v.html));
    M.CS.talModo = 'talentos';
  }
};
