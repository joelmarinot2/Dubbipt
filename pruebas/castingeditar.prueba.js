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
  ['prodNormalizar', 'prodIndices', 'prodCasarPrograma', 'prodAlertasEp', 'prodPlazo', 'prodFormatoDubcard', 'prodFichaTexto', 'PROD_ET'], { castNorm: undefined, console: { warn: () => {} } });
const DC = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DUBLAJECAST ENTERO', '/* ═══ FIN DE DUBLAJECAST ENTERO']],
  ['dcastSerieDe', 'dcastEpDeDc', 'dcastFilasCasting'],
  { castNorm: undefined, prodCasarPrograma: PR.prodCasarPrograma, prodIndices: PR.prodIndices, window: { addEventListener: () => {} }, document: {}, location: { origin: '' } });
const DX = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']],
  ['dcxNombreTalento', 'dcxAsignar', 'dcxReasignar', 'dcxEpisodio', 'dcxSerie', 'dcxPersonaje', 'dcxTalento', 'dcxTalentoNuevo', 'dcxTrailerNuevo', 'dcxTrailer', 'dcxTrailerBorrar', 'dcxCambiarTalento', 'dcxConflictosFusion', 'dcxFusionarEpisodios'],
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
    update: (cambios) => ({ eq: async (k, v) => { sbInsertados.push([tabla + '~', cambios, v]); return { error: o.fallaUpdate ? { message: 'sin permiso' } : null }; } })
  }) };
  const H = [], RELEVOS = [];
  const borrados = [];
  const M = montar([['/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST', '/* ═══ FIN DE CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST']],
    ['CS', 'csProgramas', 'csEpisodios', 'csActual', 'csFilasPrograma', 'csOrdenarCasting', 'csTramoTexto', 'csReparto', 'csNombreEpisodio', 'csPlanImportar', 'csImportarTodo', 'csEditar',
     'csHtml', 'csHtmlPrograma', 'csCablear', 'csTalentoCelda', 'csRenombrarPrograma', 'csRenombrarEpisodio', 'csContexto', 'csHistorialDe', 'csTalentosEn', 'csCambiadorHtml', 'csRepetidosDc', 'csRepetidosDub', 'csInconsistencias', 'csQuitarVacios', 'CS'],
    { castNorm: (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim(),
      document: { getElementById: (id) => campos[id] || null, querySelector: () => null, body: { classList: { contains: () => false, toggle: () => {}, remove: () => {} } } },
      prodPuede: () => true, PROD: PROD, PROD_ET: PR.PROD_ET, prodIndices: PR.prodIndices, prodAlertasEp: PR.prodAlertasEp, prodPlazo: PR.prodPlazo, prodFormatoDubcard: PR.prodFormatoDubcard,
      prodFichaTexto: PR.prodFichaTexto, prodCasarPrograma: PR.prodCasarPrograma, prodPanel: () => {}, prodVista: '',
      dcastDatos: () => ({ datos: PROD.datos, vivo: false }), dcastAbrir: (v) => diario.push('dcastAbrir ' + v),
      dcastSerieDe: DC.dcastSerieDe, dcastEpDeDc: DC.dcastEpDeDc, dcastFilasCasting: DC.dcastFilasCasting,
      sbShows: () => SHOWS, sbEps: (id) => EPS_DUB[id] || [], LDB: LDB, libView: 'shows',
      castRegCargar: async () => ({ personajes: {} }), castAviso: (t) => avisos.push(t), renderLibrary: () => diario.push('renderLibrary'),
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
      dcxTalento: DX.dcxTalento, dcxTalentoNuevo: DX.dcxTalentoNuevo, dcxTrailerNuevo: DX.dcxTrailerNuevo, dcxTrailer: DX.dcxTrailer, dcxTrailerBorrar: DX.dcxTrailerBorrar, dcxCambiarTalento: DX.dcxCambiarTalento, dcxConflictosFusion: DX.dcxConflictosFusion, dcxFusionarEpisodios: DX.dcxFusionarEpisodios,
      dcxRelevosAceptados: () => RELEVOS, dcxAceptarRelevo: (k) => { if(RELEVOS.includes(k)) return false; RELEVOS.push(k); return true; },
      dcxHistorial: () => H, dcxEntrada: (que, ctx) => Object.assign({ cuando: '2026-10-08T10:05:00Z', quien: 'Pamela', que: que }, ctx || {}), dcxRegistrar: (e) => { H.unshift(e); return true; },
      DDL_MODO: 'casting', currentEp: null, herramientasPanel: () => {},
      dcPanel: () => diario.push('dcPanel'),
      DDL_UI: { confirmModal: async (cfg) => { diario.push('pregunta ' + cfg.title + ' · ' + cfg.body); return o.confirmar !== false; } },
      sb: sb, uid: () => 'u' + (sbInsertados.length + 1) + '-' + Math.random().toString(36).slice(2, 6), libFetchAll: async () => diario.push('libFetchAll'),
      WORKSPACE: ('ws' in o) ? o.ws : { id: 'wsP' } });
  return { M, diario, avisos, PROD, LDB, campos, sbInsertados, H, RELEVOS, borrados, nube: () => P };
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
  t.eq('y el que no tiene, vacío', JSON.stringify(rep[2].tramos), '[{"talento":"","talentoId":null,"eps":[1]}]');
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
    t.ok('Reparto: los personajes, con el relevo avisado y para cambiar el talento en todos', /ANA ROJAS <i class="cs-tenue">1–2<\/i><\/span> → <span class="cs-talento">BEATRIZ SOL <i class="cs-tenue">3<\/i><\/span> <small class="cs-aviso">[\s\S]*?relevo/.test(c.html) && !!c.de('reasignar', { ch: 101 }) && c.de('principal', { ch: 101 }).classList.contains('on'));
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
    const re = c.de('reasignar', { ch: 101 }); re.value = 'Carla Paz'; re.onchange(); await espera();
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
  }
};
