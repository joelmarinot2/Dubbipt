/* Los tiempos del libreto, limpios · especificacion 04
 *
 * Llegó de sala, después de buscarlo en otro sitio: «un diálogo tiene mal
 * marcado el timecode: pasa de 00:16:45:00 a 01:16:50:00 y luego continúa
 * normal, 00:16:55:00. Ahí es donde ocurre el problema».
 *
 * El seguimiento recorría el libreto hasta el primer timecode mayor que el de
 * ahora, y ese 01:16:50 paraba ahí la búsqueda: desde ese parlamento hasta el
 * final, el libreto ya no seguía a nadie.
 *
 * Lo que protege esta prueba:
 *  · que UN timecode mal escrito no deje sin seguimiento el resto del libreto;
 *  · que un pisotón de dos segundos entre dos que hablan a la vez NO se tome
 *    por una errata ni se avise de él;
 *  · que los timecodes del libreto no se toquen: se limpian para seguir, y se
 *    dice cuáles son para que alguien los corrija.
 */
'use strict';
const { montar, fuentes } = require('./ayuda');

exports.nombre = 'Los tiempos del libreto, limpios: un timecode mal escrito no para el seguimiento';

const RECORTES = [
  ['function stCurBlock(t){', '/* ═══ EL LIBRETO SIGUE AL VÍDEO'],
  ['/** Sílabas del texto de un bloque', '/** Tiempos de cada palabra del bloque']
];
const EXPORTA = ['stCurBlock', 'segLimpiar', 'segTiempos', 'segRaroTexto', 'segRarosTexto', 'segAvisar', 'SEG_RARO', 'karVentana',
                 'ponerGuion: (g) => { script = g; }'];

const tc = (h, m, s) => h * 3600 + m * 60 + s;
const blq = (propio, mas) => Object.assign({ key: 'ANA', display: 'ANA', page: 3, tcSec: propio, tcEff: propio, lines: ['Una frase de prueba.'] }, mas || {});
const fmt = (sec) => { const p = (v) => String(v).padStart(2, '0'); const s = Math.floor(sec); return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60) + ':00'; };

/* El caso de sala: 00:16:40, 00:16:45, 01:16:50 (mal), 00:16:55, 00:17:00. */
const SALA = () => [
  blq(tc(0, 16, 40)), blq(tc(0, 16, 45), { key: 'BETO', display: 'BETO' }),
  blq(tc(1, 16, 50)),
  blq(tc(0, 16, 55), { key: 'BETO', display: 'BETO' }), blq(tc(0, 17, 0)), blq(tc(0, 17, 30))
];

function armar(guion){
  const avisos = [];
  const M = montar(RECORTES, EXPORTA, {
    script: guion || SALA(), charIdx: { ANA: { display: 'ANA' }, BETO: { display: 'BETO' } },
    castAviso: (x) => avisos.push(x), fmtTC4: fmt, studio: { cur: -1 }
  });
  return { M, avisos };
}

exports.pruebas = function(t){
  const { M } = armar();

  t.seccion('1 · el caso de sala: un 01:16:50 entre 00:16:45 y 00:16:55');
  const L = M.segLimpiar(SALA());
  t.eq('los tiempos para seguir van en orden, con el mal escrito en su sitio', L.t.join(' '), '1000 1005 1010 1015 1020 1050',
       'le sobra una hora justa: quitándosela cabe entre el de antes y el de después');
  t.eq('y se apunta cuál es, cómo se sigue y entre cuáles está', JSON.stringify(L.raros), JSON.stringify([{ i: 2, tc: 4610, como: 1010, hora: true, antes: 1005, despues: 1015 }]));
  t.eq('el libreto va de 00:16:40 a 00:17:30: la errata no lo alarga una hora', L.a + ' ' + L.b, '1000 1050');
  t.eq('a las 00:16:52 suena el parlamento del timecode mal escrito', M.stCurBlock(1012), 2);
  t.eq('a las 00:16:56, el siguiente', M.stCurBlock(1016), 3, 'antes se quedaba en el de 00:16:45: la búsqueda paraba en el 01:16:50');
  t.eq('y sigue hasta el final', M.stCurBlock(1025) + ' ' + M.stCurBlock(2000), '4 5');
  t.eq('antes del mal escrito, como siempre', M.stCurBlock(1001) + ' ' + M.stCurBlock(1006) + ' ' + M.stCurBlock(900), '0 1 -1');
  t.eq('a la 01:16:50 de verdad suena el último, no el mal escrito', M.stCurBlock(4610), 5);
  t.eq('los timecodes del libreto no se tocan', SALA().map(b => b.tcSec).join(' '), '1000 1005 4610 1015 1020 1050');

  t.seccion('2 · otras erratas');
  const lim = (xs) => { const r = M.segLimpiar(xs.map(x => blq(x))); return r.t.join(' ') + ' | ' + r.raros.map(x => x.i + ':' + x.como).join(','); };
  t.eq('una hora de MENOS', lim([4600, 4605, 1010, 4615]), '4600 4605 4610 4615 | 2:4610');
  t.eq('dos horas de más', lim([1000, 1005, 8212, 1030]), '1000 1005 1012 1030 | 2:1012',
       'a medio camino entre sus vecinos sería 1017,5: no es eso, es su timecode con dos horas menos');
  t.eq('diez minutos de más: no es cosa de horas, se pone a medio camino y se dice', lim([1000, 1005, 1610, 1015]), '1000 1005 1010 1015 | 2:1010');
  t.eq('y se apunta que no salió de las horas', M.segLimpiar([1000, 1005, 1610, 1015].map(x => blq(x))).raros[0].hora, false);
  t.eq('el último del libreto, que retrocede mucho: se queda con el de antes', lim([1000, 1005, 900]), '1000 1005 1005 | 2:1005',
       'sin vecino detrás, ponerle una hora «cabría» siempre: no se le pone');
  t.eq('pero el último con una hora de menos, justo detrás del anterior, sí se corrige', lim([4600, 4605, 1010]), '4600 4605 4610 | 2:4610');
  t.eq('y el primero con una hora de más que no queda cerca del segundo, no', lim([9000, 1005, 1010]), '1005 1005 1010 | 0:1005');
  t.eq('el primero del libreto', lim([4600, 1005, 1010, 1015]), '1000 1005 1010 1015 | 0:1000');
  t.eq('dos seguidos mal', lim([1000, 4605, 4610, 1015, 1020]), '1000 1005 1010 1015 1020 | 1:1005,2:1010');
  t.eq('uno mal en un libreto que cuenta desde la una', lim([3700, 3705, 110, 3715]), '3700 3705 3710 3715 | 2:3710');
  /* El que no trae timecode y viene detrás del mal escrito heredaba el malo. */
  const her = M.segLimpiar([blq(1000), blq(4605), { key: 'ANA', tcSec: null, tcEff: 4605, lines: ['sigue'] }, blq(1010)]);
  t.eq('el que hereda del mal escrito hereda el corregido, no el malo', her.t.join(' '), '1000 1005 1005 1010');

  t.seccion('3 · lo que NO es una errata');
  t.eq('un libreto en orden queda igual, sin nada que decir', lim([10, 14, 14, 30, 900]), '10 14 14 30 900 | ');
  t.eq('dos que se pisan por dos segundos: se ordena y no se dice', lim([1000, 1012, 1010, 1015]), '1000 1010 1010 1015 | ',
       'se mete entre sus vecinos lo más cerca de lo que pone: en un libreto es normal, y avisar de cada pisotón sería ruido');
  t.eq('varios con el mismo timecode son todos fiables: el que retrocede es el otro', lim([1000, 1000, 1000, 500, 1010]), '1000 1000 1000 1005 1010 | 3:1005',
       'exigiendo que cada uno SUBA, de los tres iguales solo valdría uno y los raros serían ellos');
  t.eq('hasta medio minuto se calla', M.segLimpiar([blq(1000), blq(1029), blq(1000), blq(1040)]).raros.length, 0);
  t.eq('y desde medio minuto se dice', M.segLimpiar([blq(1000), blq(1100), blq(1001), blq(1002), blq(1040)]).raros.length, 1);
  t.eq('medio minuto justo es el listón', M.SEG_RARO, 30);

  t.seccion('4 · libretos sin timecodes, y los de antes');
  const sin = M.segLimpiar([{ key: 'A', tcSec: null, tcEff: 0, lines: [] }, { key: 'B', tcSec: null, tcEff: 0, lines: [] }]);
  t.eq('sin timecodes: todos a cero, y el libreto no va de ningún sitio a ninguno', sin.t.join(' ') + ' ' + sin.a + ' ' + sin.b, '0 0 null null');
  const viejo = M.segLimpiar([{ key: 'A', tcEff: 0 }, { key: 'A', tcEff: 10 }, { key: 'B', tcEff: 10 }, { key: 'A', tcEff: 4000 }, { key: 'B', tcEff: 30 }, { key: 'A', tcEff: 40 }]);
  t.eq('un libreto de antes, que no dice cuál es propio: valen los efectivos', viejo.t.join(' ') + ' | ' + viejo.raros.map(x => x.i).join(','), '0 10 10 20 30 40 | 3',
       '4000 no cabe entre 10 y 30 ni quitándole horas: a medio camino');
  t.eq('los de antes del primer timecode van a cero', M.segLimpiar([{ key: 'A', tcSec: null, tcEff: 0 }, blq(50), blq(60)]).t.join(' '), '0 50 60');
  t.eq('sin libreto, nada', JSON.stringify(M.segLimpiar(null)), '{"t":[],"raros":[],"a":null,"b":null}');
  const conNulo = armar([blq(10), { key: 'X', tcSec: null, tcEff: null, lines: [] }, blq(20)]);
  t.eq('uno sin tiempo ninguno no es «el que suena»', conNulo.M.stCurBlock(15), 0);

  t.seccion('5 · se calcula una vez, y otra cuando el libreto cambia');
  const A = armar();
  const s1 = A.M.segTiempos();
  t.ok('mientras el libreto no cambie, es el mismo', A.M.segTiempos() === s1);
  const g2 = SALA(); g2[2].tcSec = 1010; g2[2].tcEff = 1010;
  A.M.ponerGuion(g2);
  t.eq('con otro libreto se vuelve a calcular: este ya no tiene erratas', A.M.segTiempos().raros.length, 0);
  /* El mismo capítulo abierto otra vez: los mismos números en otro libreto. */
  const R = armar();
  const r1 = R.M.segTiempos(); R.M.segAvisar();
  R.M.ponerGuion(SALA());
  t.ok('al volver a abrir el capítulo es otro libreto aunque diga lo mismo: se calcula de nuevo', R.M.segTiempos() !== r1);
  t.eq('y la errata se vuelve a decir, una vez', R.M.segAvisar() + ' ' + R.avisos.length, 'true 2');
  g2[4].tcSec = 9000; g2[4].tcEff = 9000;
  t.eq('y si le cambian un timecode al mismo libreto, también', A.M.segTiempos().raros.length, 1);

  t.seccion('6 · se dice cuál es, una vez');
  const B = armar();
  t.eq('con todo para encontrarlo en el libreto', B.M.segRarosTexto(),
       '⚠️ Un timecode del libreto está fuera de orden y parece mal escrito: pág. 3 · ANA · 01:16:50:00, entre 00:16:45:00 y 00:16:55:00 · se sigue como 00:16:50:00. El libreto sigue igual; conviene corregirlo en el guion.');
  t.eq('al empezar a seguir se avisa', B.M.segAvisar() + ' ' + B.avisos.length, 'true 1');
  B.M.segAvisar(); B.M.segAvisar();
  t.eq('y una sola vez', B.avisos.length, 1);
  const C = armar([blq(10), blq(20), blq(30)]);
  t.eq('sin erratas no se dice nada', C.M.segAvisar() + ' ' + C.avisos.length + ' «' + C.M.segRarosTexto() + '»', 'false 0 «»');
  const D = armar([blq(1000), blq(4605), blq(1610), blq(1015), blq(8220), blq(1025)]);
  t.ok('con varias, las dos primeras y cuántas más', /^⚠️ 3 timecodes del libreto están fuera de orden y parecen mal escritos: .* ; .* ; y 1 más\. .*corregirlos en el guion\.$/.test(D.M.segRarosTexto()), D.M.segRarosTexto());
  t.ok('la que no es cosa de horas lo dice', /00:26:50:00, entre 00:16:45:00 y 00:16:55:00 · no es cosa de horas: se sigue como 00:16:50:00, a medio camino/.test(D.M.segRarosTexto()), D.M.segRarosTexto());
  t.ok('la primera del libreto dice antes de cuál', /, antes de 00:16:45:00/.test(armar([blq(4600), blq(1005), blq(1010)]).M.segRarosTexto()));

  t.seccion('7 · el trozo de audio de cada parlamento, para «Analizar cambios»');
  const K = armar();
  t.eq('el de antes del mal escrito acaba donde empieza este, no una hora después', K.M.karVentana(1).join(' '), '1005 1010',
       'con el timecode tal cual le tocaba una hora entera de audio');
  t.eq('y el mal escrito tiene su trozo en su sitio', K.M.karVentana(2).join(' '), '1010 1015', 'tal cual, le tocaba un trozo de una hora después');
  t.eq('los demás, como siempre', K.M.karVentana(0).join(' ') + ' · ' + K.M.karVentana(3).join(' '), '1000 1005 · 1015 1020');
  const comp = armar([blq(10), { key: 'B', tcSec: null, tcEff: 10, lines: ['Otra frase de prueba aquí.'] }, blq(20)]);
  t.ok('dos que comparten timecode se reparten la ventana, como antes', comp.M.karVentana(0)[0] === 10 && comp.M.karVentana(0)[1] === comp.M.karVentana(1)[0] && comp.M.karVentana(1)[1] === 20);
  t.eq('uno sin tiempo no tiene ventana', armar([blq(10), { key: 'X', tcSec: null, tcEff: null, lines: [] }]).M.karVentana(1), null);

  t.seccion('8 · dónde se usa');
  const F = fuentes().map(f => f.src).join('\n');
  t.ok('al seguir se avisa de los timecodes mal escritos, sin que el aviso pueda tirar el seguimiento',
       /const bi = stCurBlock\(t \+ SEG_ADELANTO\);\s+try\{ segAvisar\(\); \}catch\(e\)\{/.test(F));
  t.ok('y la hora de Pro Tools se saca del libreto limpio: una errata no lo alarga una hora',
       /if\(typeof segTiempos === 'function' && typeof script !== 'undefined' && guion === script\)\{\s+const S = segTiempos\(\);\s+return S\.a == null \? null : \{ a: S\.a, b: S\.b \};/.test(F));
};
