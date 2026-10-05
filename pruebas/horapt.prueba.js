/* La hora de Pro Tools y la del libreto · especificacion 04
 *
 * Llegó de sala: «recibiendo a 24 fps dice, pero no cambió el libreto». El
 * timecode llegaba bien por MIDI; lo que no cuadraba era la hora: la sesión
 * empieza en 01:00:00:00 y el libreto cuenta desde 00:00:00:00, así que Pro
 * Tools caía siempre «después del último parlamento» y el libreto se quedaba
 * clavado al final.
 *
 * Lo que protege esta prueba:
 *  · que con la MISMA hora no se reste nada: el caso de siempre no se toca;
 *  · que la hora de diferencia se saque sola cuando no hay duda, y cuando la
 *    hay -un libreto de más de una hora- se suponga la de costumbre y lo ya
 *    visto la corrija;
 *  · que cuando no coinciden de ninguna manera se DIGA, una vez.
 *
 * Los números son los de «A Filipino Christmas»: el libreto va de 00:00:10 a
 * 01:09:42.
 */
'use strict';
const { montar, fuentes } = require('./ayuda');

exports.nombre = 'La hora de Pro Tools y la del libreto';

const RECORTES = [['/* ═══ LA HORA DE PRO TOOLS Y LA DEL LIBRETO', '/* ═══ FIN DE LA HORA DE PRO TOOLS']];
const EXPORTA = ['HPT', 'HPT_MARGEN', 'hptRango', 'hptCalcular', 'hptFijada', 'hptFijar', 'hptTC', 'hptHoras', 'hptTexto', 'hptDe',
                 'hptEstadoTexto', 'hptPanelHtml', 'hptPanelCablear', 'ponerGuion: (g) => { script = g; }'];

const H = 3600;
const guion = (tiempos) => tiempos.map((t, i) => ({ idx: i, key: 'A', tcSec: t, tcEff: t == null ? 0 : t, lines: ['x'] }));
const CORTO = { a: 10, b: 2520 };                 // 42 minutos, desde cero
const LARGO = { a: 10, b: 4182 };                 // 01:09:42, desde cero: «A Filipino Christmas»
const CON_HORA = { a: H + 5, b: H + 2520 };       // 42 minutos, desde 01:00:00

function armar(o){
  o = o || {};
  const almacen = {};
  const avisos = [];
  const w = { _dataEpId: 'ep1' };
  const estudio = { cur: 5 };
  const diario = [];
  const M = montar(RECORTES, EXPORTA, {
    script: o.guion || guion([10, 100, 2520]), currentEp: { id: 'ep1' }, window: w,
    localStorage: { getItem: (k) => (k in almacen ? almacen[k] : null), setItem: (k, v) => { almacen[k] = String(v); }, removeItem: (k) => { delete almacen[k]; } },
    castAviso: (x) => avisos.push(x), studio: estudio, studioTick: (f) => diario.push('tick ' + f)
  });
  return { M, almacen, avisos, w, estudio, diario };
}

exports.pruebas = function(t){
  const { M } = armar();

  t.seccion('1 · de dónde a dónde va el libreto');
  t.eq('su primer y su último timecode', JSON.stringify(M.hptRango(guion([10, 100, 2520]))), '{"a":10,"b":2520}');
  t.eq('aunque no vengan en orden', JSON.stringify(M.hptRango(guion([500, 10, 2520, 30]))), '{"a":10,"b":2520}');
  t.eq('solo los propios: uno heredado no dice nada nuevo', JSON.stringify(M.hptRango([{ tcSec: 40, tcEff: 40 }, { tcSec: null, tcEff: 40 }, { tcSec: 90, tcEff: 90 }])), '{"a":40,"b":90}');
  t.eq('un 00:00:00:00 propio sí cuenta: es un timecode, no la falta de él', JSON.stringify(M.hptRango([{ tcSec: 0, tcEff: 0 }, { tcSec: 40, tcEff: 40 }])), '{"a":0,"b":40}');
  t.eq('si ninguno trae el suyo, los efectivos', JSON.stringify(M.hptRango([{ tcEff: 40 }, { tcEff: 95 }])), '{"a":40,"b":95}');
  t.eq('un libreto sin timecodes, nada', M.hptRango([{ tcSec: null, tcEff: 0 }, { tcEff: 0 }, null]), null);
  t.eq('y sin libreto, nada', M.hptRango(null), null);

  t.seccion('2 · cuando no hay duda');
  const c = (pt, rango, visto, fijo) => { const r = M.hptCalcular(pt, rango, visto, fijo); return r.d + ' ' + r.tipo; };
  t.eq('la misma hora: no se resta nada', c(H + 600, CON_HORA), '0 igual', 'el caso de siempre no se toca');
  t.eq('y con los dos desde cero, tampoco', c(600, CORTO), '0 igual');
  t.eq('Pro Tools en 01:00:05 y el libreto desde cero: una hora por delante', c(H + 5, CORTO), '3600 hora');
  t.eq('a mitad del capítulo, igual', c(H + 1500, CORTO), '3600 hora');
  t.eq('Pro Tools desde cero y el libreto desde la una: una hora por detrás', c(600, CON_HORA), '-3600 hora');
  t.eq('una sesión que empieza en 10:00:00:00', c(10 * H + 300, CORTO), '36000 hora');
  t.eq('en la claqueta, dos minutos antes del primer parlamento, sigue dentro', c(H - 100, CORTO), '3600 hora');
  t.eq('y dos minutos después del último, en los créditos', c(H + 2520 + 120, CORTO), '3600 hora');
  t.eq('más allá, ninguna hora lo deja dentro', c(H + 2520 + 121, CORTO), 'null fuera');
  t.eq('muy lejos del libreto', c(5 * H + 3000, CORTO), 'null fuera');
  t.eq('sin timecodes en el libreto', c(H + 5, null), 'null sin');
  t.eq('sin timecode de Pro Tools', c(null, CORTO), 'null nada');

  t.seccion('3 · cuando valen dos: un libreto de más de una hora');
  /* 01:00:05 puede ser el segundo 5 de un libreto desde cero con la sesión en
     01:00:00:00, o el minuto 60 con la sesión desde cero. */
  t.eq('se supone la de costumbre: la sesión empieza en 01:00:00:00', c(H + 5, LARGO), '3600 supuesto');
  t.eq('también entrando a mitad: 02:05:00 es el 01:05:00 del libreto, no el 00:05:00', c(2 * H + 300, LARGO), '3600 supuesto',
       'valen una hora y dos; la de costumbre es una');
  t.eq('con un libreto que ya cuenta desde la una, lo de costumbre es ninguna', c(H + 100, { a: H + 5, b: 2 * H + 600 }), '0 supuesto');
  t.eq('y en uno de dos horas que cuenta desde la una, tampoco se supone una hora', c(2 * H + 100, { a: H + 5, b: 3 * H }), '0 supuesto',
       'valen ninguna, una por delante y una por detrás: con un libreto que no empieza en cero, la de costumbre es ninguna');
  t.eq('pero si a Pro Tools ya se le vio en 00:20:00, la sesión cuenta desde cero', c(H + 5, LARGO, { min: 1200, max: H + 5 }), '0 igual',
       'con una hora de diferencia, ese 00:20:00 habría sido cuarenta minutos antes de empezar el libreto');
  t.eq('y si se le vio en 02:05:00, no puede contar desde cero', c(H + 5, LARGO, { min: H + 5, max: 2 * H + 300 }), '3600 hora');
  t.eq('lo visto que las descarta todas no se atiende: mejor suponer que quedarse sin ninguna',
       c(H + 5, LARGO, { min: -5000, max: H + 5 }), '3600 supuesto', 'un rebobinado hasta mucho antes de la claqueta');
  t.eq('sin la de costumbre entre las que valen, la más corta', c(9 * H + 5000, { a: 4 * H, b: 6 * H + 600 }), '18000 supuesto',
       'valen cinco y seis horas: ninguna es la de costumbre, y se toma la menor');

  t.seccion('4 · fijada a mano, manda');
  t.eq('una hora por delante aunque todo diga que cuentan igual', c(600, CORTO, null, 1), '3600 mano');
  t.eq('y «cuentan igual» aunque parezca una hora', c(H + 5, CORTO, null, 0), '0 mano');
  t.eq('por detrás', c(600, CORTO, null, -2), '-7200 mano');
  const F = armar();
  t.eq('sin fijar, automática', F.M.hptFijada(), null);
  F.M.hptFijar(1);
  t.eq('se recuerda por capítulo', F.almacen['ddl_pt_hora:ep1'] + ' ' + F.M.hptFijada(), '1 1');
  F.M.hptFijar(0);
  t.eq('el cero es «cuentan igual», no «automática»', F.M.hptFijada(), 0);
  F.M.hptFijar(null);
  t.eq('y se vuelve a automática', ('ddl_pt_hora:ep1' in F.almacen) + ' ' + F.M.hptFijada(), 'false null');
  F.almacen['ddl_pt_hora:ep1'] = 'basura';
  t.eq('lo guardado que no es un número es automática', F.M.hptFijada(), null);

  t.seccion('5 · cómo se dice');
  t.eq('la hora', M.hptTC(3725.9), '01:02:05');
  t.eq('por delante y por detrás', M.hptHoras(3600) + ' · ' + M.hptHoras(-7200), '1 hora por delante · 2 horas por detrás');
  t.eq('una hora, sin duda', M.hptTexto({ d: 3600, tipo: 'hora' }, H + 5, CORTO),
       '⏱ Pro Tools va 1 hora por delante del libreto: su 01:00:05 es el 00:00:05 del libreto, y se sigue con esa diferencia.');
  t.ok('supuesta: se dice dónde cambiarlo', / Si no es así, cámbialo en el panel del timecode\.$/.test(M.hptTexto({ d: 3600, tipo: 'supuesto' }, H + 5, LARGO)));
  t.eq('fuera del libreto', M.hptTexto({ d: null, tipo: 'fuera' }, 5 * H + 3000, CORTO),
       '⚠️ Pro Tools va por 05:50:00 y el libreto va de 00:00:10 a 00:42:00: no coinciden ni con horas de diferencia, así que el libreto no lo puede seguir.');
  t.ok('sin timecodes', /no trae timecodes/.test(M.hptTexto({ d: null, tipo: 'sin' }, 5, null)));
  t.eq('cuentan igual: nada que decir', M.hptTexto({ d: 0, tipo: 'igual' }, 600, CORTO) + M.hptTexto({ d: 0, tipo: 'supuesto' }, 600, CORTO) + M.hptTexto({ d: 3600, tipo: 'mano' }, 600, CORTO), '');

  t.seccion('6 · lo que se le resta al timecode de Pro Tools, vuelta a vuelta');
  const A = armar({ guion: guion([10, 100, 2520]) });
  t.eq('en 01:00:05 con el libreto desde cero, una hora', A.M.hptDe(H + 5), 3600);
  t.eq('se dice', A.avisos.length + ' ' + /1 hora por delante/.test(A.avisos[0] || ''), '1 true');
  A.M.hptDe(H + 6); A.M.hptDe(H + 900); A.M.hptDe(H + 5);
  t.eq('y una sola vez, aunque se llame quince veces por segundo', A.avisos.length, 1);
  t.eq('al salirse del libreto se sigue con la última que valió', A.M.hptDe(H + 2520 + 500), 3600);
  t.ok('y eso también se dice, una vez', A.avisos.length === 2 && /no coinciden ni con horas/.test(A.avisos[1]));
  A.M.hptDe(H + 2520 + 600);
  t.eq('sin repetirlo', A.avisos.length, 2);
  t.eq('sin timecode se da la que hay', A.M.hptDe(null), 3600);
  /* Otro capítulo: lo de este no vale. */
  A.w._dataEpId = 'ep2';
  A.M.ponerGuion(guion([H + 5, H + 2520]));
  t.eq('al abrir otro capítulo se empieza de cero: este cuenta igual', A.M.hptDe(H + 600), 0);
  t.eq('y como cuentan igual, no hay nada que decir', A.avisos.length, 2);
  /* Lo visto corrige lo supuesto. */
  const B = armar({ guion: guion([10, 2000, 4182]) });
  t.eq('en un libreto largo, primero la de costumbre', B.M.hptDe(H + 5) + ' ' + B.M.HPT.tipo, '3600 supuesto');
  t.eq('al verle a Pro Tools un 00:20:00, cuentan igual', B.M.hptDe(1200) + ' ' + B.M.HPT.tipo, '0 igual');
  t.eq('y al volver a 01:00:05 ya no se duda: sigue sin diferencia', B.M.hptDe(H + 5) + ' ' + B.M.HPT.tipo, '0 igual');
  /* Fijada a mano. */
  const C = armar({ guion: guion([10, 100, 2520]) });
  C.M.hptFijar(0);
  t.eq('fijada a «cuentan igual», no se resta aunque parezca una hora', C.M.hptDe(H + 5), 0);
  t.eq('ni se avisa de nada', C.avisos.length, 0);
  C.M.hptFijar(null);
  t.eq('al volver a automática, se vuelve a calcular', C.M.hptDe(H + 5), 3600);
  /* Sin timecodes. */
  const D = armar({ guion: [{ key: 'A', tcSec: null, tcEff: 0, lines: ['x'] }] });
  t.eq('un libreto sin timecodes no resta nada', D.M.hptDe(H + 5), 0);
  t.ok('y dice por qué no puede seguir', D.avisos.length === 1 && /no trae timecodes/.test(D.avisos[0]));

  t.seccion('7 · el panel');
  const P = armar({ guion: guion([10, 100, 2520]) });
  t.eq('antes de que llegue timecode', P.M.hptEstadoTexto(), 'se sabrá cuando llegue timecode');
  P.M.hptDe(H + 5);
  t.eq('con una hora de diferencia', P.M.hptEstadoTexto(), 'Pro Tools 1 hora por delante');
  t.ok('el desplegable sale en automática, con «cuentan igual» y las horas a los dos lados',
       /<select id="tcpHora"><option value="auto" selected>Automática<\/option><option value="0">Cuentan igual<\/option><option value="1">Pro Tools 1 hora por delante<\/option><option value="-1">Pro Tools 1 hora por detrás<\/option>/.test(P.M.hptPanelHtml())
       && /<option value="-12">Pro Tools 12 horas por detrás<\/option><\/select>/.test(P.M.hptPanelHtml()));
  /* Elegir en el desplegable. */
  const estado = { textContent: '' };
  const sel = { value: '0', onchange: null };
  const ov = { querySelector: (q) => (q === '#tcpHora' ? sel : (q === '#tcpHoraEstado' ? estado : null)) };
  t.eq('se conecta', P.M.hptPanelCablear(ov), true);
  sel.onchange();
  t.eq('elegir «cuentan igual» lo fija', P.M.hptFijada() + ' · ' + estado.textContent, '0 · fijada a mano · cuentan igual');
  t.ok('y el libreto se recoloca ya', P.estudio.cur === -2 && P.diario.includes('tick true'));
  t.ok('con lo fijado a la vista en el desplegable', /<option value="0" selected>Cuentan igual/.test(P.M.hptPanelHtml()));
  sel.value = '2'; sel.onchange();
  t.eq('dos horas', P.M.hptFijada() + ' · ' + estado.textContent, '2 · fijada a mano · Pro Tools 2 horas por delante');
  sel.value = 'auto'; sel.onchange();
  t.eq('y de vuelta a automática', P.M.hptFijada(), null);
  t.eq('sin desplegable no hay nada que conectar', P.M.hptPanelCablear({ querySelector: () => null }), false);
  const D2 = armar({ guion: [{ key: 'A', tcSec: null, tcEff: 0, lines: [] }] }); D2.M.hptDe(50);
  t.eq('sin timecodes, el panel lo dice', D2.M.hptEstadoTexto(), 'el libreto no trae timecodes');
  const E2 = armar({ guion: guion([10, 100, 2520]) }); E2.M.hptDe(5 * H + 3000);
  t.eq('y fuera del libreto, también', E2.M.hptEstadoTexto(), 'Pro Tools está fuera del libreto');

  t.seccion('8 · dónde se usa');
  const F2 = fuentes().map(f => f.src).join('\n');
  t.ok('el seguimiento le resta la hora al timecode de Pro Tools antes de buscar el parlamento',
       /const hora = \(pt != null && typeof hptDe === 'function'\) \? hptDe\(pt\) : 0;\s+const t = \(pt != null\) \? pt - hora/.test(F2));
  t.ok('y la corrección de QC busca su parlamento con la hora del libreto',
       /stCurBlock\(ahora - \(\(typeof hptDe === 'function'\) \? hptDe\(ahora\) : 0\)\)/.test(F2));
  t.ok('pero el tiempo que se apunta sigue siendo el de Pro Tools', /tcSec: \(ahora != null\) \? ahora : /.test(F2));
  t.ok('el panel del timecode enseña el desplegable y lo conecta',
       /\(\(typeof hptPanelHtml === 'function'\) \? hptPanelHtml\(\) : ''\)/.test(F2) && /if\(typeof hptPanelCablear === 'function'\) hptPanelCablear\(ov\);/.test(F2));
};
