/* El Reparto de los programas, en vivo · especificacion 02, CAST-41
 *
 * Pedido de sala: «los talentos no se actualizan en vivo en el panel de
 * reparto de los programas». El registro de casting de cada programa se leía
 * una vez por sesión. Lo que protege esta prueba: que al guardar el casting
 * de un programa se avisa a los demás equipos; que el aviso hace que el
 * Reparto que se está mirando se vuelva a leer (sin recargar la biblioteca);
 * que hay un repaso por si un aviso se pierde; que solo se repinta si algo
 * cambió; y que no se repinta mientras se escribe.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Casting: el Reparto de los programas se pone al día en vivo';

const espera = () => new Promise(r => setTimeout(r, 0));

exports.pruebas = async function(t){
  t.seccion('1 · al guardar el casting de un programa, se avisa');
  {
    const pings = [];
    let falla = false;
    const M = montar([['async function castRegGuardar(showId, reg){', '/** El registro tal como está en la nube']], ['castRegGuardar'], {
      currentEp: null, LDB: { showId: null }, idbSet: async () => {}, castRegPath: (id) => 'reg/' + id + '.json',
      sb: { storage: { from: () => ({ upload: async () => (falla ? { error: { message: 'x' } } : { error: null }) }) } },
      libPing: (...a) => pings.push(a.join('|'))
    });
    t.eq('guardado: aviso de casting con su programa', String(await M.castRegGuardar('s1', { personajes: {} })) + ' ' + pings.join(','), 'true reg||s1');
    falla = true;
    t.eq('si no se pudo guardar, no se avisa', String(await M.castRegGuardar('s1', { personajes: {} })) + ' ' + pings.length, 'false 1');
  }

  t.seccion('2 · el aviso llega a los demás equipos');
  {
    const avisos = [], esperas = [];
    const P = montar([['const LIBPING = {', 'let _libAutoAt = 0;']], ['onLibPing'], {
      document: { hidden: false }, setTimeout: (f, ms) => { esperas.push(ms); return 1; }, Math,
      csRegistroAviso: (id) => avisos.push(id),
      saludPausa: () => false, libFetchAll: async () => {}, renderLibrary: () => {}, currentEp: null, libMsg: () => {}, refreshOpenEpisodeFromCloud: async () => {}, console
    });
    P.onLibPing({ t: 'reg', showId: 's1' });
    t.eq('un aviso de casting: se pone al día su Reparto y NO se recarga la biblioteca', avisos.join(',') + ' · ' + esperas.length, 's1 · 0');
    P.onLibPing({ t: 'ep', id: 'e1', showId: 's2' });
    t.eq('un capítulo guardado: su Reparto también, y la biblioteca como siempre', avisos.join(',') + ' · ' + esperas.length, 's1,s2 · 1');
  }

  t.seccion('3 · el Reparto que se está mirando se vuelve a leer');
  {
    const relojes = [], pintadas = [];
    let foco = null, escondida = false, activo = true;
    const nube = { s1: { personajes: { ANA: { talent: 'LUZ' } } } };
    const CS = { registros: {} }, RNV = { s1: 99 };
    const vista = { contains: (el) => el === foco };
    const M = montar([['/* ── El Reparto, en vivo (especificacion 02, CAST-41)', '/* Los programas a los que ya se les completó el casting en esta sesión. */']],
      ['CS_VIVO', 'csRegistroRefrescar', 'csRegistroAviso', 'csVivoRepaso', 'csVivoArrancar', 'csRepintarVivo'], {
        CS, castRegCargar: async (id) => JSON.parse(JSON.stringify(nube[id])), _regNubeVisto: RNV,
        csRepintar: () => pintadas.push(1), csActivo: () => activo,
        setTimeout: (f, ms) => { relojes.push({ f, ms }); return relojes.length; }, clearTimeout: () => {}, setInterval: () => 7,
        document: { get hidden(){ return escondida; }, get activeElement(){ return foco; }, getElementById: () => vista }
      });
    t.eq('lo que no se está mirando no se pide', String(await M.csRegistroRefrescar('s9')) + ' ' + pintadas.length, 'false 0');
    CS.registros.s1 = { personajes: { ANA: { talent: 'LUZ' } } };
    t.eq('sin cambios no se repinta', String(await M.csRegistroRefrescar('s1')) + ' ' + pintadas.length, 'false 0');
    nube.s1.personajes.ANA.talent = 'PEPE GIL';
    M.csRegistroAviso('s1');
    t.eq('el aviso espera un momento (varios seguidos, una vez)', relojes.length + ' ' + relojes[0].ms, '1 800');
    relojes[0].f(); await espera(); await espera();
    t.eq('y trae lo nuevo de la nube y repinta', CS.registros.s1.personajes.ANA.talent + ' ' + pintadas.length, 'PEPE GIL 1');
    t.eq('con el aviso se mira la nube ya, sin esperar los 20 s de la copia de este equipo', String(RNV.s1), '0');

    foco = { tagName: 'INPUT' };
    nube.s1.personajes.ANA.talent = 'OTRA';
    await M.csRegistroRefrescar('s1');
    t.eq('escribiendo en Casting: no se repinta todavía', pintadas.length + ' ' + relojes[relojes.length - 1].ms, '1 2000');
    foco = null; relojes[relojes.length - 1].f();
    t.eq('al terminar de escribir, sí', String(pintadas.length), '2');

    t.seccion('4 · el repaso, por si un aviso se pierde');
    const pedidos = [];
    const R = montar([['/* ── El Reparto, en vivo (especificacion 02, CAST-41)', '/* Los programas a los que ya se les completó el casting en esta sesión. */']],
      ['CS_VIVO', 'csVivoRepaso'], {
        CS: { registros: { a: {}, b: {}, c: {} } }, castRegCargar: async (id) => { pedidos.push(id); return {}; }, csRepintar: () => {}, csActivo: () => activo,
        setTimeout, clearTimeout, setInterval: () => 1, document: { get hidden(){ return escondida; }, getElementById: () => null }
      });
    const ahora = Date.now();
    Object.assign(R.CS_VIVO.uso, { a: ahora, b: ahora - 300000, c: ahora });
    Object.assign(R.CS_VIVO.ts, { a: ahora - 40000, b: ahora - 40000, c: ahora - 5000 });
    R.csVivoRepaso(); await espera();
    t.eq('solo lo que se mira ahora y no se leyó hace poco', pedidos.join(','), 'a');
    escondida = true; R.CS_VIVO.ts.a = 0; R.csVivoRepaso(); await espera();
    t.eq('con la pestaña escondida, nada', pedidos.join(','), 'a');
    escondida = false; activo = false; R.csVivoRepaso(); await espera();
    t.eq('fuera de Casting, nada', pedidos.join(','), 'a');
  }
};
