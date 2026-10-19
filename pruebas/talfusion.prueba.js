/* Talentos: buscar y fusionar · especificacion 09, PRO-52
 *
 * Pedido de sala, con una captura del directorio de talentos de Casting:
 * «que la sección de Talentos tenga una herramienta de búsqueda y de fusión
 * de talentos». Lo que protege esta prueba: buscar (aunque esté mal
 * escrito), filtrar por la ficha, «Sin categorizar» y ordenar; las parejas
 * que se parecen por encima del umbral, sin las que se dijo que no son; y
 * que fusionar pase todo al que se queda: asignaciones (sin repetirlas), lo
 * que faltaba de la ficha, el registro de cada programa y la base.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Talentos: buscar y fusionar';

const RAIZ = path.dirname(INDEX);
const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
const castNorm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();
const SIM = montar([['function castSimil(a, b){', '/* ── El registro, guardado por programa']], ['castSimil'], {});

const ficha = (nombre, o) => Object.assign({ clave: castNorm(nombre), nombre: nombre, t: null, programas: [], nProg: 0, nEps: 0, lineas: 0 }, o || {});
const FICHAS = [
  ficha('MARCELA BORDA', { t: { id: 1, name: 'MARCELA BORDA', genero: 'femenino', edad_aparente: 'adulto' }, nProg: 3, nEps: 20, lineas: 500, programas: [{ programa: 'Akka' }] }),
  ficha('MARCELA BORDAS', { t: { id: 2, name: 'MARCELA BORDAS', tono_de_voz: 'agudo' }, nProg: 1, nEps: 2, lineas: 40, programas: [{ programa: 'The Wayans Bros' }] }),
  ficha('CARMEN R FRANCO', { t: { id: 3, name: 'CARMEN R FRANCO', genero: 'femenino', edad_aparente: 'mayor' }, nProg: 0, nEps: 0, lineas: 0 }),
  ficha('Carmen Franco', { nProg: 1, nEps: 1, lineas: 12 }),
  ficha('CELSA CASTILLO', { t: { id: 5, name: 'CELSA CASTILLO', genero: 'femenino', edad_aparente: 'mayor', tono_de_voz: 'medio' }, nProg: 9, nEps: 37, lineas: 900, programas: [{ programa: 'Final Table' }] }),
  ficha('LUIS PEREZ', { t: { id: 6, name: 'LUIS PEREZ' }, nProg: 2, nEps: 5, lineas: 80 })
];

exports.pruebas = async function(t){
  const CS = { talUmbral: 80, talAbierto: null, registros: { s1: {} } };
  const D = { avisos: [], regs: [], base: [], editados: [], datos: null, pintadas: 0, confirmar: true, preguntas: [] };
  const M = montar([['/* ── Buscar y fusionar talentos (PRO-52)', '/* ── Ocupación: cada talento con sus programas en tarjetas']],
    ['csTalFiltrar', 'csTalSimil', 'csTalParecidos', 'csHtmlFusionTalentos', 'csFusionarTalentos', 'csTalRepetidas', 'csTalFichaDe'],
    { castNorm: castNorm, csEsMarca: (n) => ['ORIGINAL', 'X', 'TODOS', 'X ORIGINAL'].indexOf(castNorm(n)) >= 0, csSimil: SIM.castSimil, CS: CS, CS_REGS: { lista: [1], ts: 5 },
      csParecidoPersonaje: (q, n) => SIM.castSimil(castNorm(q), castNorm(n)),
      csEsc: (x) => String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), csIco: (n) => '<svg data-i="' + n + '"></svg>',
      castAviso: (m) => D.avisos.push(m), csRepintar: () => { D.pintadas++; }, fallo: () => {}, dcxRegistrar: () => {}, dcxEntrada: (x) => x,
      DDL_UI: { confirmModal: async (c) => { D.preguntas.push(c.body); return D.confirmar; } },
      csEditar: async (cambio, que) => { D.editados.push(que); return cambio(D.datos) ? 'guardado' : 'igual'; },
      dcxFusionarTalentos: (pl, q, p) => { pl.fus = [q, p]; return true; }, dcxTalento: (pl, id, c) => { pl.ren = [id, c.name]; return true; },
      sbShows: () => [{ id: 's1' }, { id: 's2' }],
      castRegRenombrarTalento: async (sid, v, n) => { D.regs.push(sid + ':' + v + '>' + n); return sid === 's1'; },
      talRenombrar: async (v, n) => { D.base.push(v + '>' + n); return true; } });

  t.seccion('1 · buscar, filtrar y ordenar');
  const nom = (l) => l.map(f => f.nombre).join(', ');
  t.eq('por nombre, aunque esté mal escrito', nom(M.csTalFiltrar(FICHAS, { buscar: 'selsa castiyo' })), 'CELSA CASTILLO');
  t.eq('o por programa', nom(M.csTalFiltrar(FICHAS, { buscar: 'wayans' })), 'MARCELA BORDAS');
  t.eq('con dos letras, solo lo que las lleva tal cual (no todo)', nom(M.csTalFiltrar(FICHAS, { buscar: 'zz' })) + '|' + nom(M.csTalFiltrar(FICHAS, { buscar: 'lu' })), '|LUIS PEREZ');
  t.eq('por género y edad de la ficha', nom(M.csTalFiltrar(FICHAS, { genero: 'femenino', edad: 'mayor' })), 'CARMEN R FRANCO, CELSA CASTILLO');
  t.eq('por tono', nom(M.csTalFiltrar(FICHAS, { tono: 'agudo' })), 'MARCELA BORDAS');
  t.eq('sin categorizar: sin género, edad ni tono (también los que no tienen ficha)', nom(M.csTalFiltrar(FICHAS, { sinCat: true })), 'Carmen Franco, LUIS PEREZ');
  t.eq('A→Z y Z→A', M.csTalFiltrar(FICHAS, { orden: 'az' })[0].nombre + ' · ' + M.csTalFiltrar(FICHAS, { orden: 'za' })[0].nombre, 'Carmen Franco · MARCELA BORDAS');
  t.eq('más y menos activos (episodios, luego líneas)', nom(M.csTalFiltrar(FICHAS, { orden: 'mas' }).slice(0, 2)) + ' · ' + nom(M.csTalFiltrar(FICHAS, { orden: 'menos' }).slice(0, 2)), 'CELSA CASTILLO, MARCELA BORDA · CARMEN R FRANCO, Carmen Franco');

  t.seccion('2 · los que parecen el mismo');
  t.eq('una letra de más, las palabras en otro orden, una inicial de más', [M.csTalSimil('MARCELA BORDA', 'MARCELA BORDAS') >= 0.9, M.csTalSimil('BORDA MARCELA', 'MARCELA BORDA') === 1, M.csTalSimil('CARMEN R FRANCO', 'Carmen Franco') >= 0.9, M.csTalSimil('LUIS PEREZ', 'CELSA CASTILLO') < 0.5].join(' '), 'true true true true');
  const pares = M.csTalParecidos(FICHAS, 80, []);
  t.eq('las parejas por encima del umbral, de más a menos parecidas', pares.map(x => x.a.nombre + ' / ' + x.b.nombre).join(' | '), 'MARCELA BORDA / MARCELA BORDAS | CARMEN R FRANCO / Carmen Franco');
  t.eq('subiendo el umbral salen menos: al 92% las dos, al 95% ninguna', M.csTalParecidos(FICHAS, 92, []).length + ' ' + M.csTalParecidos(FICHAS, 95, []).length, '2 0');
  t.eq('las que se dijo que no son, ya no salen', M.csTalParecidos(FICHAS, 80, ['MARCELA BORDA|MARCELA BORDAS']).map(x => x.a.nombre).join(), 'CARMEN R FRANCO');
  const h = M.csHtmlFusionTalentos(FICHAS, { talentosDistintos: [] });
  t.ok('la pestaña: el umbral, cada pareja con su porcentaje y sus cifras, y quedarse con uno u otro', /data-cs="talUmbral" value="80"/.test(h) && /<span class="cs-tfus-pct">93%<\/span>/.test(h)
       && /data-cs="talFusionarPar" data-v="MARCELA BORDA\|MARCELA BORDAS" data-queda="MARCELA BORDA" data-pasa="MARCELA BORDAS"/.test(h) && /data-queda="MARCELA BORDAS" data-pasa="MARCELA BORDA"/.test(h) && /3 prog\. · 20 ep\. · 500 líneas/.test(h) && /data-cs="talDistintos"/.test(h));
  {
    const d = { talents: [{ id: 7, name: 'CARLOS RUIZ' }, { id: 8, name: 'CARLOS RUÍZ' }, { id: 9, name: 'OTRO' }], castings: [{ talent_id: 7 }, { talent_id: 7 }, { talent_id: 8 }] };
    const rep = M.csTalRepetidas(d);
    t.eq('dos fichas con el mismo nombre salvo acentos, que en la lista se ven como una: también son pareja', rep.map(x => x.a.clave + '/' + x.b.clave + ' ' + x.sc + ' ' + x.a.asignaciones + '+' + x.b.asignaciones).join(), 'id:7/id:8 1 2+1');
    t.ok('salen en la pestaña, al 100%, y se encuentran por su clave', /<span class="cs-tfus-pct">100%<\/span>/.test(M.csHtmlFusionTalentos([], d)) && M.csTalFichaDe([], d, 'id:8').t.id === 8 && M.csTalFichaDe([], d, 'id:99') === null);
    t.ok('y si se dijo que no son el mismo, ya no', !/100%/.test(M.csHtmlFusionTalentos([], Object.assign({ talentosDistintos: ['id:7|id:8'] }, d))));
  }
  t.ok('sin parejas, lo dice', /Ningún par de talentos se parece al menos un 80%/.test(M.csHtmlFusionTalentos([FICHAS[4], FICHAS[5]], null)));

  t.seccion('3 · fusionar');
  {
    D.datos = {};
    const r = await M.csFusionarTalentos(FICHAS[0], FICHAS[1]);
    t.eq('pregunta, y los dos con ficha: se fusionan en los datos de Casting (el que pasa, en el que se queda)', r + ' ' + JSON.stringify(D.datos.fus) + ' ' + D.editados[0], 'guardado [1,2] Talentos fusionados: MARCELA BORDAS → MARCELA BORDA');
    t.ok('la pregunta dice qué pasa', /«MARCELA BORDAS» pasa a ser «MARCELA BORDA»: sus asignaciones \(2 ep\. en 1 programa\)/.test(D.preguntas[0]));
    t.eq('y su nombre, en el registro de cada programa de Dubbipt y en la base', D.regs.join(',') + ' · ' + D.base.join(','), 's1:MARCELA BORDAS>MARCELA BORDA,s2:MARCELA BORDAS>MARCELA BORDA · MARCELA BORDAS>MARCELA BORDA');
    t.ok('se relee lo leído y se dice', CS.registros && !Object.keys(CS.registros).length && D.avisos.some(a => /También en el casting de 1 programa de Dubbipt/.test(a)));
    D.datos = {}; D.regs = [];
    CS.talAbierto = 'CARMEN FRANCO';
    await M.csFusionarTalentos(FICHAS[3], FICHAS[2], false);
    t.eq('el que se queda no tiene ficha: la del que pasa toma su nombre; la ficha abierta sigue', JSON.stringify(D.datos.ren) + ' ' + CS.talAbierto, '[3,"Carmen Franco"] CARMEN FRANCO');
    D.datos = {}; D.regs = [];
    CS.talAbierto = 'CARMEN FRANCO';
    await M.csFusionarTalentos(FICHAS[2], FICHAS[3], false);
    t.eq('el que pasa no tiene ficha: solo cambia su nombre en el casting de Dubbipt; la ficha abierta pasa al que se queda', JSON.stringify(D.datos) + ' ' + D.regs.join(',') + ' ' + CS.talAbierto, '{} s1:Carmen Franco>CARMEN R FRANCO,s2:Carmen Franco>CARMEN R FRANCO CARMEN R FRANCO');
    D.confirmar = false; D.editados = [];
    t.eq('si se dice que no, nada', (await M.csFusionarTalentos(FICHAS[0], FICHAS[1])) + ' ' + D.editados.length, 'cancelado 0');
    t.eq('el mismo con el mismo, nada', await M.csFusionarTalentos(FICHAS[0], FICHAS[0]), 'nada');
  }

  t.seccion('4 · en los datos de Casting');
  {
    const DX = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']],
      ['dcxFusionarTalentos'], { castNorm: undefined, dcSesion: null, dcLeer: null, dcEscribir: null, prodNormalizar: null, prodGuardar: null, PROD: {} });
    const p = { talents: [{ id: 1, name: 'MARCELA BORDA', genero: 'femenino' }, { id: 2, name: 'MARCELA BORDAS', tono_de_voz: 'agudo', email: 'm@x.co', genero: 'masculino' }, { id: 3, name: 'OTRA' }],
                castings: [{ id: 10, episode_id: 1, character_id: 7, talent_id: 1 }, { id: 11, episode_id: 1, character_id: 7, talent_id: 2 }, { id: 12, episode_id: 2, character_id: 7, talent_id: 2 }, { id: 13, episode_id: 2, character_id: 8, talent_id: 3 }] };
    t.eq('fusiona', DX.dcxFusionarTalentos(p, 1, 2), true);
    t.eq('el que pasa se va', p.talents.map(x => x.id).join(','), '1,3');
    t.eq('la ficha toma lo que le faltaba, sin pisar lo suyo', JSON.stringify(p.talents[0]), '{"id":1,"name":"MARCELA BORDA","genero":"femenino","tono_de_voz":"agudo","email":"m@x.co"}');
    t.eq('sus asignaciones pasan; la que repetía personaje y episodio, una sola', p.castings.map(c => c.id + ':' + c.talent_id).join(' '), '10:1 12:1 13:3');
    t.eq('consigo mismo o con quien no está, nada', DX.dcxFusionarTalentos(p, 1, 1) + ' ' + DX.dcxFusionarTalentos(p, 1, 99), 'false false');
  }

  t.seccion('5 · dónde está');
  t.ok('la pestaña «Fusionar» en Talentos, y en la ficha «Fusionar con otro talento»', /modo\('fusion', 'Fusionar', 'fusionar'\)/.test(CV) && /Fusionar con otro talento/.test(CV) && /id="csTalFusOtro" list="csListaTalentos"/.test(CV));
  t.ok('los filtros de la ficha, el orden, «Sin categorizar» y «Limpiar filtros»', ['talFiltro', 'talOrden', 'talSinCat', 'talLimpiar', 'talUmbral', 'talFusionarPar', 'talDistintos', 'talFusionar'].every(k => CV.indexOf("que === '" + k + "'") >= 0));
  t.ok('ni un emoji', !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(CV.slice(CV.indexOf('/* ── Buscar y fusionar talentos (PRO-52)'), CV.indexOf('/* ── Ocupación: cada talento con sus programas en tarjetas'))));
};
