/* Casting en una ventana emergente · especificacion 09, PRO-46
 *
 * Pedido de sala: «quiero que la vista de hacer casting se abra en una
 * ventana emergente para poder navegar en el dashboard en otra ventana».
 * Lo que protege esta prueba: «Casting» abre otra ventana de Dubbipt con el
 * capítulo y el programa en la dirección y esta se queda; si el navegador no
 * deja, se abre aquí como antes; dentro de una ventana de casting se abre
 * ahí mismo; al cerrarse la otra o al volver a esta, el casting se relee; y
 * al entrar con ?casting=… la app va derecha al capítulo con el perfil
 * Casting, sin preguntar.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Casting en una ventana emergente';

const RAIZ = path.dirname(INDEX);
const HTML = fs.readFileSync(INDEX, 'utf8');

function armar(o){
  o = o || {};
  const D = { diario: [], avisos: [], pintadas: 0, intervalos: [], abiertas: [] };
  const CS = { registros: { s1: { personajes: {} }, s2: { personajes: {} } } };
  const CS_REGS = { lista: [1], ts: 999, cada: 60000 };
  const win = ('window' in o) ? o.window : {
    name: o.nombre || '',
    open: (url, nombre, rasgos) => { D.abiertas.push([url, nombre, rasgos]); if(o.bloquea) return null; const w = { closed: false, focus(){ D.diario.push('focus ' + nombre); } }; D.ultima = w; return w; }
  };
  const M = montar([['async function csRealizarCasting(p, e){', '/**\n * Eliminar un programa o un capítulo POR COMPLETO']],
    ['csRealizarCasting', 'csCastingUrl', 'csCastingEnVentana', 'csEsVentanaCasting', 'csVentanasAlVolver', 'CS_VENT'],
    { CS: CS, CS_REGS: CS_REGS, LDB: { showId: null }, window: win, location: { pathname: '/app/' },
      ponerModo: (ep, m) => D.diario.push('ponerModo ' + ep + ' ' + m), openEpisode: async (id) => D.diario.push('openEpisode ' + id),
      castAviso: (t) => D.avisos.push(t), csRepintar: () => { D.pintadas++; }, fallo: (d) => D.diario.push('fallo ' + d),
      setInterval: (f, ms) => { D.intervalos.push({ f: f, ms: ms }); return D.intervalos.length; }, clearInterval: (id) => { D.diario.push('clearInterval ' + id); },
      Date: { now: () => D.ahora || 100000 } });
  return Object.assign(D, { M: M, CS: CS, CS_REGS: CS_REGS });
}
const P = { clave: 's:s1', nombre: 'AKKA', show: { id: 's1' } }, E = { clave: 'e:e1', titulo: 'Episodio 1', ep: { id: 'e1', name: 'Episodio 1' } };

exports.pruebas = async function(t){
  t.seccion('1 · «Casting» abre otra ventana y esta se queda');
  {
    const A = armar();
    t.eq('se abre otra ventana de Dubbipt con el capítulo y el programa en la dirección', (await A.M.csRealizarCasting(P, E)) + ' ' + JSON.stringify(A.abiertas), 'true [["/app/?casting=e1&show=s1","ddl_casting_e1","width=1280,height=860,resizable=yes,scrollbars=yes"]]');
    t.eq('esta ventana no abre el capítulo: se queda donde estaba', A.diario.filter(x => /^ponerModo|^openEpisode/.test(x)).length + ' ' + A.diario.includes('focus ddl_casting_e1'), '0 true');
    t.ok('se dice', /abierto en otra ventana/.test(A.avisos[0]));
    t.eq('el casting del programa se olvida, para releerlo', 's1' in A.CS.registros, false);
    t.eq('y se vigila la otra ventana', A.intervalos.length + ' ' + A.intervalos[0].ms, '1 2500');
    t.ok('el mismo capítulo otra vez va a la misma ventana (mismo nombre)', (await A.M.csRealizarCasting(P, E), A.abiertas[1][1] === 'ddl_casting_e1' && A.M.CS_VENT.abiertas.size === 1));
  }

  t.seccion('2 · si el navegador no deja, aquí como antes; en una ventana de casting, ahí mismo');
  {
    const B = armar({ bloquea: true });
    t.eq('bloqueada la ventana: se abre aquí', (await B.M.csRealizarCasting(P, E)) + ' ' + B.diario.filter(x => /^ponerModo|^openEpisode/.test(x)).join(','), 'true ponerModo e1 casting,openEpisode e1');
    const C = armar({ nombre: 'ddl_casting_e9' });
    t.eq('dentro de una ventana de casting, el siguiente capítulo se abre ahí mismo', (await C.M.csRealizarCasting(P, E)) + ' ' + C.abiertas.length + ' ' + C.diario.filter(x => /^openEpisode/.test(x)).length, 'true 0 1');
    const S = armar({ window: undefined });
    t.eq('sin ventana (pruebas), como antes', (await S.M.csRealizarCasting(P, E)) + ' ' + S.diario.filter(x => /^openEpisode/.test(x)).length, 'true 1');
    t.eq('sin capítulo de Dubbipt, nada', await S.M.csRealizarCasting({ show: null }, { ep: null }), false);
  }

  t.seccion('3 · lo casteado allí se relee aquí');
  {
    const A = armar();
    await A.M.csRealizarCasting(P, E);
    A.CS.registros.s1 = { personajes: { X: 1 } };
    A.ahora = 100000 + 1000;
    t.eq('mientras la otra sigue abierta y acabamos de releer, el reloj no hace nada', (A.intervalos[0].f(), A.pintadas + ' ' + ('s1' in A.CS.registros)), '0 true');
    t.eq('al volver a esta ventana: se relee el programa y la lista de registros', A.M.csVentanasAlVolver() + ' ' + ('s1' in A.CS.registros) + ' ' + A.CS_REGS.lista + ' ' + A.pintadas, 'true false null 1');
    t.eq('pero no más de una vez cada pocos segundos', A.M.csVentanasAlVolver(), false);
    A.CS.registros.s1 = { personajes: {} }; A.ultima.closed = true; A.ahora = 100000 + 9000;
    A.intervalos[0].f();
    t.eq('cerrada la otra: se relee, se deja de vigilar', ('s1' in A.CS.registros) + ' ' + A.pintadas + ' ' + A.M.CS_VENT.abiertas.size + ' ' + A.diario.includes('clearInterval 1'), 'false 2 0 true');
    t.eq('sin ventanas abiertas, volver no hace nada', A.M.csVentanasAlVolver(), false);
  }

  t.seccion('4 · la ventana nueva va derecha al capítulo con el perfil Casting');
  {
    const V = montar([['function ventanaCastingPedida(){', '/** Una sesión nueva:']], ['ventanaCastingPedida'],
      { location: { search: '?casting=e1&show=s1' }, WORKSPACE: { id: 'w1' }, document: { body: { classList: { add(){} } } } });
    t.eq('con ?casting=…: un «dónde» con el capítulo, el programa, el espacio y el perfil Casting, sin avisos', JSON.stringify(V.ventanaCastingPedida()), '{"v":1,"modo":"casting","rol":null,"ws":"w1","show":"s1","vista":"eps","ep":"e1","silencio":true}');
    const N = montar([['function ventanaCastingPedida(){', '/** Una sesión nueva:']], ['ventanaCastingPedida'], { location: { search: '?x=1' }, WORKSPACE: null, document: {} });
    t.eq('sin el parámetro, nada', N.ventanaCastingPedida(), null);
    t.ok('al entrar se mira antes que nada, y reanudar ahí no pregunta ni avisa', /const vc = ventanaCastingPedida\(\);\s*\n\s*if\(vc\)\{\s*\n\s*dondeReanudar\(vc\)/.test(HTML) && /if\(!d\.silencio && typeof DDL_UI/.test(HTML) && /if\(d\.silencio\)\{ try\{ await libEnsure\(\);/.test(HTML));
    t.ok('al volver a la ventana principal se relee', /addEventListener\('focus', \(\) => \{ try\{ csVentanasAlVolver\(\);/.test(fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8')));
  }
};
