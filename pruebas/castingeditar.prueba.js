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
  ['dcxNombreTalento', 'dcxAsignar', 'dcxReasignar', 'dcxEpisodio', 'dcxSerie', 'dcxPersonaje', 'dcxTalento', 'dcxTalentoNuevo', 'dcxTrailerNuevo', 'dcxTrailer', 'dcxTrailerBorrar'],
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
    upsert: async (filas) => { sbInsertados.push([tabla + '*', filas]); return { error: null }; }
  }) };
  const M = montar([['/* ═══ CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST', '/* ═══ FIN DE CASTING CON LA ORGANIZACIÓN DE DUBLAJECAST']],
    ['CS', 'csProgramas', 'csEpisodios', 'csActual', 'csFilasPrograma', 'csOrdenarCasting', 'csTramoTexto', 'csReparto', 'csNombreEpisodio', 'csPlanImportar', 'csImportarTodo', 'csEditar',
     'csHtml', 'csHtmlPrograma', 'csCablear', 'csTalentoCelda'],
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
      dcxGuardar: async (cambio) => {
        if(o.sinSesion){ const e = new Error('sin sesión'); e.sinSesion = true; throw e; }
        if(o.fallaGuardar) throw new Error('sin red');
        const copia = JSON.parse(JSON.stringify(P)); const hubo = cambio(copia);
        if(hubo){ P = copia; PROD.datos = PR.prodNormalizar(P); }
        diario.push('guarda ' + !!hubo); return { cambiado: !!hubo };
      },
      dcxNombreTalento: DX.dcxNombreTalento, dcxAsignar: DX.dcxAsignar, dcxReasignar: DX.dcxReasignar, dcxEpisodio: DX.dcxEpisodio, dcxSerie: DX.dcxSerie, dcxPersonaje: DX.dcxPersonaje,
      dcxTalento: DX.dcxTalento, dcxTalentoNuevo: DX.dcxTalentoNuevo, dcxTrailerNuevo: DX.dcxTrailerNuevo, dcxTrailer: DX.dcxTrailer, dcxTrailerBorrar: DX.dcxTrailerBorrar,
      dcPanel: () => diario.push('dcPanel'),
      DDL_UI: { confirmModal: async (cfg) => { diario.push('pregunta ' + cfg.title + ' · ' + cfg.body); return o.confirmar !== false; } },
      sb: sb, uid: () => 'u' + (sbInsertados.length + 1) + '-' + Math.random().toString(36).slice(2, 6), libFetchAll: async () => diario.push('libFetchAll'),
      WORKSPACE: ('ws' in o) ? o.ws : { id: 'wsP' } });
  return { M, diario, avisos, PROD, LDB, campos, sbInsertados, nube: () => P };
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
    t.ok('y se dice y se repinta', A.avisos.includes('Asignado: LUZ MAR') && A.diario.includes('renderLibrary'));
    c = controles(A, 'episodio');
    const jana = c.de('talento', { ep: 11, ch: 102 }); jana.value = ''; jana.onchange(); await espera();
    t.ok('vaciarlo lo quita', !A.nube().castings.some(x => x.episode_id === 11 && x.character_id === 102) && A.avisos.includes('Talento quitado'));
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
    t.ok('la celda avisa si Dubbipt dice otro', /data-ch="5" value="ANA"[\s\S]*?en Dubbipt: LUZ/.test(A.M.csTalentoCelda(f, { id: 9 })));
    t.eq('sin episodio de DublajeCast, no se edita: se lee', A.M.csTalentoCelda({ personaje: 'X', dc: '', dubbipt: 'LUZ', talento: 'LUZ', charId: null }, null), '<span class="cs-talento">LUZ</span> <small class="cs-tenue">de Dubbipt</small>');
  }
};
