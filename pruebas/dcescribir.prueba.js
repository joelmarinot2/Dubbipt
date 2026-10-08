/* Editar DublajeCast desde Dubbipt · especificacion 09, PRO-13
 *
 * Pedido de sala: «que se puedan hacer todas las funciones que se hacían en
 * DublajeCast». Lo que cambia sus datos se escribe en SU nube, como lo
 * escribe DublajeCast, con su control de revisión.
 *
 * Lo que protege esta prueba:
 *  · que cada cambio toque lo que tiene que tocar y nada más;
 *  · que los registros nuevos salgan como los hace DublajeCast (ids, campos,
 *    nombres de talento en mayúsculas);
 *  · que no se pise lo que otro guardó entre medias: se vuelve a leer y el
 *    cambio se aplica sobre lo nuevo, una vez;
 *  · y que sin sesión no se escribe nada.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Editar DublajeCast desde Dubbipt';

const EXPORTA = ['DCX', 'dcxUid', 'dcxNombreTalento', 'dcxTalentoPorNombre', 'dcxAsignar', 'dcxReasignar', 'dcxEpisodio', 'dcxSerie', 'dcxPersonaje',
                 'dcxTalento', 'dcxTalentoNuevo', 'dcxTrailerNuevo', 'dcxTrailer', 'dcxTrailerBorrar', 'dcxGuardar', 'dcxLocal',
                 'dcxCambiarTalento', 'dcxQuien', 'dcxEntrada', 'dcxHistorial', 'dcxRegistrar', 'DCX_HISTORIAL',
                 'dcxConflictosFusion', 'dcxFusionarEpisodios', 'dcxRelevosAceptados', 'dcxAceptarRelevo'];

/* El JSON de DublajeCast, con sus nombres de siempre. */
const BASE = () => ({
  series: [{ id: 1, name: 'A Filipino Christmas', status: 'en_curso', cliente: 'Netflix' }, { id: 2, name: 'Akka', status: 'en_curso' }],
  episodes: [{ id: 11, series_id: 1, episode_number: 1, fase: 'pre_produccion' }, { id: 12, series_id: 1, episode_number: 2 }, { id: 21, series_id: 2, episode_number: 1 }],
  characters: [{ id: 101, canonical_name: 'ALLY', tipo: 'principal' }, { id: 102, canonical_name: 'JANA' }],
  talents: [{ id: 1, name: 'ANA ROJAS', genero: 'femenino' }, { id: 2, name: 'BEATRIZ SOL' }],
  castings: [{ id: 501, character_id: 101, talent_id: 1, episode_id: 11 }, { id: 502, character_id: 101, talent_id: 1, episode_id: 12 },
             { id: 503, character_id: 101, talent_id: 2, episode_id: 21 }, { id: 504, character_id: 102, talent_id: 2, episode_id: 11 }],
  trailers: [{ id: 7, title: 'Tráiler oficial', type: 'trailer', status: 'pendiente', series_id: 1 }],
  loQueSea: { x: 1 }
});

function armar(o){
  o = o || {};
  const diario = [];
  const nube = { payload: BASE(), rev: 5, choques: o.choques || 0 };
  const PROD = { datos: null, cuando: 0, origen: '' };
  const M = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']], EXPORTA, {
    castNorm: undefined,
    dcSesion: async () => (o.sinSesion ? null : { id: 'u' }),
    dcLeer: async () => { diario.push('lee ' + nube.rev); return JSON.parse(JSON.stringify(nube.payload)); },
    dcEscribir: async (p) => {
      if(nube.choques > 0){ nube.choques--; nube.rev++; nube.payload.talents.push({ id: 99, name: 'DE OTRO EQUIPO' }); throw new Error('alguien cambió los datos en DublajeCast mientras tanto: vuelve a leer y repite'); }
      if(o.fallaEscribir) throw new Error('sin red');
      nube.payload = JSON.parse(JSON.stringify(p)); nube.rev++; diario.push('escribe ' + nube.rev); return nube.rev;
    },
    prodNormalizar: (p) => ({ normalizado: true, talents: p.talents }), prodGuardar: async () => diario.push('prodGuardar'), PROD: PROD,
    sbUser: ('usuario' in o) ? o.usuario : { email: 'pamela@estudio.co', user_metadata: { full_name: 'Pamela Hernández' } }
  });
  return { M, nube, diario, PROD };
}

exports.pruebas = async function(t){
  const { M } = armar();

  t.seccion('1 · ids y nombres, como los hace DublajeCast');
  const a = M.dcxUid(), b = M.dcxUid();
  t.ok('los ids nuevos son números grandes y no se repiten aunque se pidan seguidos', b > a && a > Date.now() * 999 && Number.isInteger(a));
  const muchos = Array.from({ length: 400 }, () => M.dcxUid());
  t.ok('ni pidiendo cuatrocientos en el mismo instante: siempre crecen', muchos.every((x, i) => i === 0 || x > muchos[i - 1]));
  t.eq('los nombres de talento, en mayúsculas y sin espacios de más', M.dcxNombreTalento('  luz   mar '), 'LUZ MAR');
  const p0 = BASE();
  t.eq('buscar un talento: sin mayúsculas ni acentos', (M.dcxTalentoPorNombre(p0, 'ana rojas') || {}).id + ' ' + M.dcxTalentoPorNombre(p0, 'nadie'), '1 null');
  const nuevo = M.dcxTalentoPorNombre(p0, 'luz mar', true);
  t.eq('y si no está y se pide, se da de alta', nuevo.name + ' ' + p0.talents.length + ' ' + (M.dcxTalentoPorNombre(p0, 'LUZ MAR', true) === nuevo), 'LUZ MAR 3 true');

  t.seccion('2 · el talento de un personaje en un episodio');
  {
    const p = BASE();
    t.eq('cambiar el que tenía', M.dcxAsignar(p, 11, 102, 'ana rojas') + ' ' + JSON.stringify(p.castings.find(c => c.id === 504)), 'true {"id":504,"character_id":102,"talent_id":1,"episode_id":11}');
    t.eq('el mismo que ya tenía: nada', M.dcxAsignar(p, 11, 102, 'ANA ROJAS'), false);
    t.eq('quitarlo', M.dcxAsignar(p, 11, 102, '') + ' ' + p.castings.some(c => c.id === 504), 'true false');
    t.eq('quitar uno que no estaba: nada', M.dcxAsignar(p, 12, 102, ''), false);
    const n = p.castings.length;
    t.ok('ponerlo donde no había: una asignación nueva, con sus campos', M.dcxAsignar(p, 12, 102, 'Beatriz Sol') && p.castings.length === n + 1
      && (() => { const c = p.castings[p.castings.length - 1]; return c.character_id === 102 && c.episode_id === 12 && c.talent_id === 2 && c.id > 1e12; })());
    t.ok('con un talento que no existe, se da de alta en mayúsculas', M.dcxAsignar(p, 21, 102, 'pepe pérez') && p.talents.some(x => x.name === 'PEPE PÉREZ'));
    t.eq('los ids pueden venir como texto', M.dcxAsignar(p, '11', '101', 'BEATRIZ SOL') + ' ' + p.castings.find(c => c.id === 501).talent_id, 'true 2');
    t.eq('y lo que no se conoce, se queda', JSON.stringify(p.loQueSea), '{"x":1}');
  }

  t.seccion('3 · cambiar el talento de un personaje en todo el programa');
  {
    const p = BASE();
    t.eq('en los episodios de ESE programa donde lo tenía', M.dcxReasignar(p, 1, 101, null, 'luz mar') + ' ' + p.castings.filter(c => c.character_id === 101).map(c => c.episode_id + ':' + (p.talents.find(x => x.id === c.talent_id) || {}).name).join(' '), 'true 11:LUZ MAR 12:LUZ MAR 21:BEATRIZ SOL');
    t.eq('no crea asignaciones donde no había', p.castings.length, 4);
    const q = BASE(); q.castings[1].talent_id = 2;
    t.eq('con «de», solo donde tenía ese', M.dcxReasignar(q, 1, 101, 1, 'LUZ MAR') + ' ' + q.castings.filter(c => c.character_id === 101 && c.episode_id !== 21).map(c => c.talent_id === 2 ? 'B' : 'L').join(''), 'true LB');
    t.eq('si ya lo tenía en todos, nada', M.dcxReasignar(BASE(), 1, 101, null, 'ANA ROJAS'), false);
    t.eq('sin nombre, nada', M.dcxReasignar(BASE(), 1, 101, null, '  '), false);
  }

  t.seccion('4 · capítulo, programa y personaje');
  {
    const p = BASE();
    t.eq('el episodio: fase, fechas, estado y DUBCARD', M.dcxEpisodio(p, 11, { fase: 'produccion_activa', fecha_miami: '2026-10-20', status: 'completo', formato_dubcard: 'Excel' }) + ' ' + JSON.stringify(p.episodes[0]),
         'true {"id":11,"series_id":1,"episode_number":1,"fase":"produccion_activa","status":"completo","fecha_miami":"2026-10-20","formato_dubcard":"Excel"}');
    t.eq('lo que no es de la ficha no se toca', M.dcxEpisodio(p, 11, { series_id: 2, episode_number: 9 }) + ' ' + p.episodes[0].series_id, 'false 1');
    t.eq('lo mismo que ya tenía: nada', M.dcxEpisodio(p, 11, { fase: 'produccion_activa' }), false);
    t.eq('uno que no existe: nada', M.dcxEpisodio(p, 999, { fase: 'x' }), false);
    t.eq('el programa: nombre, estado, cliente y director', M.dcxSerie(p, 2, { status: 'completo', cliente: 'Discovery', director: 'Ana', name: '  Akka   2 ', type: 'x' }) + ' ' + JSON.stringify(p.series[1]), 'true {"id":2,"name":"Akka 2","status":"completo","cliente":"Discovery","director":"Ana"}');
    t.eq('un nombre vacío no se pone', M.dcxSerie(p, 2, { name: '   ' }) + ' ' + p.series[1].name, 'false Akka 2');
    t.eq('el título del episodio en DublajeCast', M.dcxEpisodio(p, 12, { title: 'La boda' }) + ' ' + p.episodes[1].title, 'true La boda');
    t.eq('el personaje: principal o no', M.dcxPersonaje(p, 102, { tipo: 'principal', canonical_name: 'X' }) + ' ' + JSON.stringify(p.characters[1]), 'true {"id":102,"canonical_name":"JANA","tipo":"principal"}');
    t.ok('cada cambio deja un objeto nuevo, sin tocar el de antes', (() => { const q = BASE(); const antes = q.episodes[0]; M.dcxEpisodio(q, 11, { fase: 'completado' }); return antes.fase === 'pre_produccion' && q.episodes[0] !== antes; })());
  }

  t.seccion('5 · talentos y tráilers');
  {
    const p = BASE();
    t.eq('la ficha de un talento; el nombre en mayúsculas', M.dcxTalento(p, 2, { genero: 'femenino', name: ' beatriz  sol ', email: 'b@x.co', id: 9 }) + ' ' + JSON.stringify(p.talents[1]), 'true {"id":2,"name":"BEATRIZ SOL","genero":"femenino","email":"b@x.co"}');
    let err = '';
    try{ M.dcxTalento(p, 2, { name: 'ana rojas' }); }catch(e){ err = e.message; }
    t.eq('no se le pone el nombre de otro', err, 'ya hay un talento que se llama «ANA ROJAS»');
    t.eq('un nombre vacío no se pone', M.dcxTalento(p, 2, { name: '  ' }), false);
    t.ok('un talento nuevo, con su ficha', M.dcxTalentoNuevo(p, { name: 'carlos ruiz', genero: 'masculino', registro: '', x: 1 }) && JSON.stringify(Object.assign({}, p.talents[2], { id: 0 })) === '{"id":0,"name":"CARLOS RUIZ","genero":"masculino"}');
    err = '';
    try{ M.dcxTalentoNuevo(p, { name: 'Carlos  Ruiz' }); }catch(e){ err = e.message; }
    t.eq('repetido, no', err, 'ya hay un talento que se llama «CARLOS RUIZ»');
    t.eq('sin nombre, nada', M.dcxTalentoNuevo(p, { name: '' }), false);
    t.ok('un tráiler nuevo, pendiente, con lo que se diga', M.dcxTrailerNuevo(p, { title: ' Teaser 30s ', type: 'teaser', series_id: 2, deadline: '2026-10-30', etapa: '' })
      && JSON.stringify(Object.assign({}, p.trailers[1], { id: 0 })) === '{"id":0,"title":"Teaser 30s","type":"teaser","status":"pendiente","series_id":2,"deadline":"2026-10-30"}');
    t.eq('cualquier tipo que no sea teaser es tráiler; sin título, nada', M.dcxTrailerNuevo(p, { title: 'X', type: 'raro' }) && p.trailers[2].type + ' ' + M.dcxTrailerNuevo(p, { title: ' ' }), 'trailer false');
    t.eq('cambiar su estado y su fecha', M.dcxTrailer(p, 7, { status: 'completo', deadline: '2026-11-01', id: 3 }) + ' ' + JSON.stringify(p.trailers[0]), 'true {"id":7,"title":"Tráiler oficial","type":"trailer","status":"completo","series_id":1,"deadline":"2026-11-01"}');
    t.eq('y borrarlo', M.dcxTrailerBorrar(p, 7) + ' ' + p.trailers.some(x => x.id === 7) + ' ' + M.dcxTrailerBorrar(p, 7), 'true false false');
  }

  t.seccion('5b · el cambiador de talento');
  {
    const p = BASE();
    t.eq('en un episodio: donde estaba uno, el otro', M.dcxCambiarTalento(p, [11], 2, 'ana rojas') + ' ' + p.castings.map(c => c.id + ':' + c.talent_id).join(' '), 'true 501:1 502:1 503:2 504:1');
    const q = BASE();
    t.eq('en todo un programa: sus episodios, y solo donde estaba ese', M.dcxCambiarTalento(q, [11, 12], 1, 'Luz Mar') + ' ' + q.castings.map(c => c.id + ':' + (q.talents.find(x => x.id === c.talent_id) || {}).name).join(' '), 'true 501:LUZ MAR 502:LUZ MAR 503:BEATRIZ SOL 504:BEATRIZ SOL');
    t.eq('por el mismo, nada', M.dcxCambiarTalento(BASE(), [11], 1, 'ANA ROJAS'), false);
    t.eq('donde no estaba, nada', M.dcxCambiarTalento(BASE(), [21], 1, 'LUZ MAR'), false);
    t.eq('sin nombre, nada', M.dcxCambiarTalento(BASE(), [11], 1, ''), false);
  }

  t.seccion('5c · quién cambió qué');
  {
    const A = armar();
    t.eq('quién: su nombre en Dubbipt', A.M.dcxQuien(), 'Pamela Hernández');
    t.eq('o su correo', armar({ usuario: { email: 'x@y.co', user_metadata: {} } }).M.dcxQuien() + ' · ' + armar({ usuario: null }).M.dcxQuien(), 'x@y.co · sin sesión');
    const e = A.M.dcxEntrada('ALLY: LUZ MAR', { programa: 'A Filipino Christmas', serieId: 1 });
    t.ok('un apunte: cuándo, quién, qué y dónde', /^\d{4}-\d\d-\d\dT/.test(e.cuando) && e.quien === 'Pamela Hernández' && e.que === 'ALLY: LUZ MAR' && e.programa === 'A Filipino Christmas' && e.serieId === 1);
    await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS'), e);
    t.eq('al guardar, se apunta', A.M.dcxHistorial().map(x => x.que).join(' | '), 'ALLY: LUZ MAR');
    await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 12, 102, 'ANA ROJAS'), A.M.dcxEntrada('JANA: ANA ROJAS'));
    t.eq('lo último, primero; y se conserva al guardar lo siguiente', A.M.dcxHistorial().map(x => x.que).join(' | '), 'JANA: ANA ROJAS | ALLY: LUZ MAR');
    await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 12, 102, 'ANA ROJAS'), A.M.dcxEntrada('nada'));
    t.eq('lo que no cambia, no se apunta', A.M.dcxHistorial().length, 2);
    A.M.dcxRegistrar(A.M.dcxEntrada('Episodio renombrado en Dubbipt'));
    t.ok('lo que no pasa por DublajeCast también se apunta, y se guarda', A.M.dcxHistorial()[0].que === 'Episodio renombrado en Dubbipt' && A.diario.filter(x => x === 'prodGuardar').length === 3);
    t.eq('sin apunte, nada', A.M.dcxRegistrar(null), false);
    for(let i = 0; i < A.M.DCX_HISTORIAL + 20; i++) A.M.dcxRegistrar({ que: 'x' + i });
    t.eq('se guardan los últimos quinientos', A.M.dcxHistorial().length + ' ' + A.M.dcxHistorial()[0].que, '500 x519');
  }
  {
    const A = armar();
    A.M.dcxRegistrar(A.M.dcxEntrada('primero'));
    t.eq('sin Producción todavía, se crea para apuntarlo', A.M.dcxHistorial().length, 1);
  }

  t.seccion('5d · fusionar capítulos repetidos');
  {
    const p = BASE();
    p.episodes.push({ id: 13, series_id: 1, episode_number: 1, title: 'Repetido', fase: 'x', fecha_miami: '2026-11-01' });
    p.castings.push({ id: 601, character_id: 101, talent_id: 2, episode_id: 13 }, { id: 602, character_id: 103, talent_id: 1, episode_id: 13 });
    p.appearances = [{ id: 1, character_id: 101, episode_id: 11, line_count: 10 }, { id: 2, character_id: 101, episode_id: 13, line_count: 30 }, { id: 3, character_id: 103, episode_id: 13, line_count: 4 }];
    t.eq('lo que choca: ALLY con ANA en el que se queda y BEATRIZ en el repetido', JSON.stringify(M.dcxConflictosFusion(p, 11, [13])), '[{"charId":101,"opciones":[1,2]}]');
    t.ok('fusionar', M.dcxFusionarEpisodios(p, 11, [13], { '101': 2 }));
    t.eq('el repetido se va', p.episodes.map(e => e.id).join(','), '11,12,21');
    t.eq('las líneas, las mayores; el personaje que solo estaba allí, pasa', p.appearances.map(a => a.character_id + '@' + a.episode_id + ':' + a.line_count).join(' '), '101@11:30 103@11:4');
    t.eq('el talento elegido, y el que solo estaba allí', p.castings.filter(c => c.episode_id === 11).map(c => c.character_id + ':' + c.talent_id).join(' '), '101:2 102:2 103:1');
    t.ok('el que se queda conserva lo suyo y toma lo que le faltaba', (() => { const e = p.episodes[0]; return e.fase === 'pre_produccion' && e.title === 'Repetido' && e.fecha_miami === '2026-11-01'; })());
    t.ok('el repetido, a la papelera, con lo suyo', p.trash.length === 1 && p.trash[0].data.episodes[0].id === 13 && p.trash[0].data.castings.length === 2 && p.trash[0].data.appearances.length === 2);
    t.eq('sin elegir, manda el que se queda', (() => { const q = BASE(); q.episodes.push({ id: 13, series_id: 1, episode_number: 1 }); q.castings.push({ id: 601, character_id: 101, talent_id: 2, episode_id: 13 }); M.dcxFusionarEpisodios(q, 11, [13], {}); return q.castings.find(c => c.character_id === 101 && c.episode_id === 11).talent_id; })(), 1);
    t.eq('sin repetidos de verdad, nada', M.dcxFusionarEpisodios(BASE(), 11, [11, 999]) + ' ' + M.dcxFusionarEpisodios(BASE(), 999, [11]), 'false false');
  }

  t.seccion('5e · los relevos que se aceptan');
  {
    const A = armar();
    t.eq('se apuntan una vez', A.M.dcxAceptarRelevo('1:101:1,2') + ' ' + A.M.dcxAceptarRelevo('1:101:1,2') + ' ' + JSON.stringify(A.M.dcxRelevosAceptados()), 'true false ["1:101:1,2"]');
    t.eq('sin clave, nada', A.M.dcxAceptarRelevo(''), false);
    await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS'), null);
    t.eq('y se conservan al guardar en DublajeCast', JSON.stringify(A.M.dcxRelevosAceptados()), '["1:101:1,2"]');
  }

  t.seccion('6 · guardar: sobre lo último, sin pisar a nadie');
  {
    const A = armar();
    const r = await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS'));
    t.eq('lee, cambia y escribe con la revisión siguiente', JSON.stringify(r) + ' ' + A.diario.join(' | '), '{"cambiado":true} lee 5 | escribe 6 | prodGuardar');
    t.eq('y queda en la nube', A.nube.payload.castings.find(c => c.id === 504).talent_id, 1);
    t.ok('y aquí, al momento: Producción con lo escrito', A.PROD.datos.normalizado === true && A.PROD.cuando > 0 && A.M.DCX.escrito > 0 && A.PROD.origen === 'DublajeCast');
  }
  {
    const A = armar({ choques: 1 });
    const r = await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS'));
    t.eq('si otro guardó entre medias, se vuelve a leer y se aplica sobre lo suyo', JSON.stringify(r) + ' ' + A.diario.filter(x => /^lee|^escribe/.test(x)).join(' | '), '{"cambiado":true} lee 5 | lee 6 | escribe 7');
    t.ok('sin perder lo del otro', A.nube.payload.talents.some(x => x.name === 'DE OTRO EQUIPO') && A.nube.payload.castings.find(c => c.id === 504).talent_id === 1);
  }
  {
    const A = armar({ choques: 2 });
    let err = '';
    try{ await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS')); }catch(e){ err = e.message; }
    t.ok('dos veces seguidas, se para y lo dice', /cambió los datos/.test(err) && A.M.DCX.guardando === false);
  }
  {
    const A = armar();
    const r = await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'BEATRIZ SOL'));
    t.eq('si no cambia nada, no se escribe', JSON.stringify(r) + ' ' + A.diario.some(x => /^escribe/.test(x)), '{"cambiado":false} false');
  }
  {
    const A = armar({ sinSesion: true });
    let err = null;
    try{ await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS')); }catch(e){ err = e; }
    t.eq('sin sesión de DublajeCast: no se lee ni se escribe, y se sabe por qué', !!(err && err.sinSesion) + ' ' + A.diario.length, 'true 0');
  }
  {
    const A = armar({ fallaEscribir: true });
    let err = '';
    try{ await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS')); }catch(e){ err = e.message; }
    t.eq('otro fallo al escribir: se dice, no se repite, y aquí no se toca nada', err + ' · ' + A.diario.filter(x => /^lee/.test(x)).length + ' ' + A.PROD.datos, 'sin red · 1 null');
  }
  {
    const A = armar();
    const espera = A.M.dcxGuardar(p => A.M.dcxAsignar(p, 11, 102, 'ANA ROJAS'));
    let err = '';
    try{ await A.M.dcxGuardar(p => A.M.dcxAsignar(p, 12, 102, 'ANA ROJAS')); }catch(e){ err = e.message; }
    await espera;
    t.eq('dos a la vez, no: el segundo espera su turno', err, 'ya se está guardando otro cambio: espera un momento');
  }
};
