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
                 'segCascada', 'segCorregirEnGuion', 'segCorregir', 'segCorregirDesdeAviso', 'segCorregirPanel', 'segPanelHtml', 'segPanelCablear',
                 'ponerGuion: (g) => { script = g; }', 'verGuion: () => script', 'ponerEp: (e) => { currentEp = e; }'];

const tc = (h, m, s) => h * 3600 + m * 60 + s;
const blq = (propio, mas) => Object.assign({ key: 'ANA', display: 'ANA', page: 3, tcSec: propio, tcEff: propio, lines: ['Una frase de prueba.'] }, mas || {});
const fmt = (sec) => { const p = (v) => String(v).padStart(2, '0'); const s = Math.floor(sec); return p(Math.floor(s / 3600)) + ':' + p(Math.floor(s % 3600 / 60)) + ':' + p(s % 60) + ':00'; };

/* El caso de sala: 00:16:40, 00:16:45, 01:16:50 (mal), 00:16:55, 00:17:00. */
const SALA = () => [
  blq(tc(0, 16, 40)), blq(tc(0, 16, 45), { key: 'BETO', display: 'BETO' }),
  blq(tc(1, 16, 50)),
  blq(tc(0, 16, 55), { key: 'BETO', display: 'BETO' }), blq(tc(0, 17, 0)), blq(tc(0, 17, 30))
];

/* Un documento de mentira con lo justo que mira la lista de correcciones: las
   casillas y los campos salen del propio HTML que pinta. */
function docFalso(){
  const puestos = [];
  const pieza = () => ({ onclick: null, oninput: null, style: {}, checked: false, value: '', textContent: '', focus(){}, remove(){ this.quitado = true; } });
  const doc = {
    puestos: puestos,
    getElementById: (id) => puestos.find(e => e.id === id && !e.quitado) || null,
    body: { appendChild: (e) => { puestos.push(e); } },
    createElement: () => {
      const el = { id: '', className: '', innerHTML: '', _q: {}, quitado: false,
        remove(){ el.quitado = true; }, addEventListener(){},
        querySelector(s){ return el._q[s] || (el._q[s] = pieza()); },
        querySelectorAll(s){
          const h = el.innerHTML;
          if(s === 'input.seg-ok') return el._ok || (el._ok = [...h.matchAll(/class="seg-ok" data-n="\d+"( checked)?/g)].map(m => Object.assign(pieza(), { checked: !!m[1] })));
          if(s === 'input.seg-tc') return el._tc || (el._tc = [...h.matchAll(/class="seg-tc lc-sel" data-n="\d+" value="([^"]*)"/g)].map(m => Object.assign(pieza(), { value: m[1] })));
          return [];
        } };
      return el;
    }
  };
  return doc;
}

function armar(guion, o){
  o = o || {};
  const avisos = [], diario = [], tostadas = [];
  const doc = docFalso();
  const ctx = {
    script: guion || SALA(), charIdx: { ANA: { display: 'ANA' }, BETO: { display: 'BETO' } },
    castAviso: (x) => avisos.push(x), fmtTC4: fmt, studio: { cur: -1 },
    currentEp: ('ep' in o) ? o.ep : { id: 'ep1', showId: 'sh1' },
    pop2: { doc: {} }, renderLibretoBlocks: () => diario.push('pinta'),
    epDataUpsert: async (ep, sh) => { diario.push('datos ' + ep + '/' + sh); return true; },
    saveEpCache: async (ep) => { diario.push('copia ' + ep); },
    sync: { isOn: true, channel: {} }, syncEmit: (que, d) => diario.push('emite ' + que + ' ' + d.epId),
    studioTick: (f) => diario.push('tick ' + f), fallo: (d) => diario.push('fallo ' + d),
    parseTC: (s) => { const m = String(s || '').match(/(\d{1,2})\s*:\s*(\d{2})(?:\s*:\s*(\d{2}))?(?:\s*[:;.]\s*(\d{2}))?/); if(!m) return null; return m[3] == null ? (+m[1]) * 60 + (+m[2]) : (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) + (m[4] != null ? +m[4] : 0) / 25; },
    esc: (x) => String(x).replace(/</g, '&lt;'), document: doc
  };
  if(o.tostadas) ctx.DDL_UI = { toast: (txt, op) => { tostadas.push({ txt: txt, op: op || {} }); } };
  const M = montar(RECORTES, EXPORTA, ctx);
  return { M, avisos, diario, tostadas, doc };
}

exports.pruebas = async function(t){
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
       '⚠️ Un timecode del libreto está fuera de orden y parece mal escrito: pág. 3 · ANA · 01:16:50:00, entre 00:16:45:00 y 00:16:55:00 · se sigue como 00:16:50:00. Se sigue igual; con «Corregir» se arregla en el libreto.');
  t.eq('al empezar a seguir se avisa', B.M.segAvisar() + ' ' + B.avisos.length, 'true 1');
  B.M.segAvisar(); B.M.segAvisar();
  t.eq('y una sola vez', B.avisos.length, 1);
  const C = armar([blq(10), blq(20), blq(30)]);
  t.eq('sin erratas no se dice nada', C.M.segAvisar() + ' ' + C.avisos.length + ' «' + C.M.segRarosTexto() + '»', 'false 0 «»');
  const D = armar([blq(1000), blq(4605), blq(1610), blq(1015), blq(8220), blq(1025)]);
  t.ok('con varias, las dos primeras y cuántas más', /^⚠️ 3 timecodes del libreto están fuera de orden y parecen mal escritos: .* ; .* ; y 1 más\. Se sigue igual; con «Corregir» se arreglan en el libreto\.$/.test(D.M.segRarosTexto()), D.M.segRarosTexto());
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

  t.seccion('9 · corregirlos en el libreto');
  /* Llegó de sala al día siguiente: «aún molesta si el timecode está mal,
     quiero que lo cambies tú o que me des la opción para cambiarlos». */
  const Z = armar();
  const hechos = Z.M.segCorregirEnGuion([{ i: 2, tc: 1010 }]);
  t.eq('se cambia el timecode del parlamento, y se devuelve lo cambiado', JSON.stringify(hechos), '[{"i":2,"antes":4610,"ahora":1010}]');
  const gz = Z.M.verGuion();
  t.eq('en el libreto, el propio y el efectivo', gz[2].tcSec + ' ' + gz[2].tcEff, '1010 1010');
  t.eq('y se guarda el que traía el guion, por si hay que volver', gz[2].tcOrig, 4610);
  t.eq('los demás no se tocan', gz.map(b => b.tcSec).join(' '), '1000 1005 1010 1015 1020 1050');
  t.eq('ya no hay nada fuera de orden, ni nada que decir', Z.M.segTiempos().raros.length + ' «' + Z.M.segRarosTexto() + '»', '0 «»');
  t.eq('cambiarlo otra vez por lo mismo no es un cambio', Z.M.segCorregirEnGuion([{ i: 2, tc: 1010 }]).length, 0);
  t.eq('volver al del guion', JSON.stringify(Z.M.segCorregirEnGuion([{ i: 2, tc: 4610 }])), '[{"i":2,"antes":1010,"ahora":4610}]');
  t.ok('y entonces ya no consta como corregido', !('tcOrig' in Z.M.verGuion()[2]) && Z.M.verGuion()[2].tcSec === 4610);
  t.eq('lo que no vale no cambia nada: un parlamento que no hay, un timecode que no es un número, uno negativo',
       Z.M.segCorregirEnGuion([{ i: 99, tc: 10 }, { i: 0, tc: NaN }, { i: 1, tc: -5 }, null]).length + ' ' + Z.M.verGuion().map(b => b.tcSec).join(' '), '0 1000 1005 4610 1015 1020 1050');
  /* El que no trae timecode hereda del corregido, no del malo. */
  const Hh = armar([blq(1000), blq(4605), { key: 'ANA', tcSec: null, tcEff: 4605, lines: ['sigue'] }, blq(1010)]);
  Hh.M.segCorregirEnGuion([{ i: 1, tc: 1005 }]);
  t.eq('el que hereda del corregido hereda el timecode nuevo', Hh.M.verGuion().map(b => b.tcEff).join(' '), '1000 1005 1005 1010');
  /* Un libreto de antes, sin timecodes propios: se cambia el efectivo y no se arrastra nada. */
  const Vv = armar([{ key: 'A', tcEff: 10, lines: [] }, { key: 'A', tcEff: 4000, lines: [] }, { key: 'A', tcEff: 30, lines: [] }]);
  Vv.M.segCorregirEnGuion([{ i: 1, tc: 20 }]);
  t.eq('en un libreto de antes se cambia el efectivo, sin dejar los demás a cero', Vv.M.verGuion().map(b => b.tcEff).join(' '), '10 20 30');
  t.eq('la cascada: el suyo, o el del anterior', (() => { const g = [{ tcSec: null }, { tcSec: 5 }, { tcSec: null }, { tcSec: 9 }, null]; Z.M.segCascada(g); return g.filter(Boolean).map(b => b.tcEff).join(' '); })(), '0 5 5 9');

  t.seccion('10 · corregir: se pinta, se guarda, se avisa y se puede deshacer');
  const C1 = armar(null, { tostadas: true });
  const hc = await C1.M.segCorregir([{ i: 2, tc: 1010 }]);
  t.eq('se corrige', hc.length + ' ' + C1.M.verGuion()[2].tcSec, '1 1010');
  t.ok('se repinta el libreto, se guarda en la nube y en este equipo, y se avisa a los demás equipos',
       C1.diario.includes('pinta') && C1.diario.includes('datos ep1/sh1') && C1.diario.includes('copia ep1') && C1.diario.includes('emite reload ep1'), C1.diario.join(' · '));
  t.ok('y el libreto se recoloca', C1.diario.includes('tick true'));
  t.eq('se dice qué se cambió, con el botón de deshacer', C1.tostadas[0].txt + ' [' + C1.tostadas[0].op.actionLabel + ']',
       '✓ 1 timecode corregido en el libreto: 01:16:50:00 → 00:16:50:00 [Deshacer]');
  await C1.tostadas[0].op.onAction();
  t.eq('deshacer lo deja como venía en el guion', C1.M.verGuion()[2].tcSec + ' ' + ('tcOrig' in C1.M.verGuion()[2]), '4610 false');
  t.eq('y se dice, ya sin ofrecer deshacer otra vez', C1.avisos[C1.avisos.length - 1] + ' · tostadas ' + C1.tostadas.length, '↩ Corrección deshecha · 1 timecode como venía en el guion · tostadas 1');
  const C2 = armar(null, { ep: null });
  await C2.M.segCorregir([{ i: 2, tc: 1010 }]);
  t.ok('sin capítulo guardado se corrige aquí y no se sube nada', C2.M.verGuion()[2].tcSec === 1010 && !C2.diario.some(x => /^(datos|copia|emite)/.test(x)));
  t.eq('sin nada que cambiar se dice y no se guarda', (await C2.M.segCorregir([{ i: 2, tc: 1010 }])).length + ' ' + C2.avisos[C2.avisos.length - 1], '0 No había ningún timecode que cambiar');

  t.seccion('11 · el botón del aviso y la lista');
  const A1 = armar(null, { tostadas: true });
  A1.M.segAvisar();
  t.eq('el aviso lleva el botón «Corregir» y dura lo bastante para leerlo', A1.tostadas[0].op.actionLabel + ' ' + (A1.tostadas[0].op.duration >= 15000) + ' ' + A1.tostadas[0].op.kind, 'Corregir true err');
  await A1.tostadas[0].op.onAction();
  t.eq('si todos son una hora de más o de menos, ese clic los corrige', A1.M.verGuion()[2].tcSec + ' ' + A1.M.segTiempos().raros.length, '1010 0');
  /* Con uno que no se sabe cuál es, se abre la lista. */
  const MIX = () => [blq(1000), blq(4605), blq(1610, { key: 'BETO', display: 'BETO', lines: ['Diez minutos de más.'] }), blq(1015), blq(1020)];
  const A2 = armar(MIX(), { tostadas: true });
  A2.M.segAvisar();
  A2.tostadas[0].op.onAction();
  const ov = A2.doc.puestos[0];
  t.ok('con alguno que no es cosa de horas, el clic abre la lista y no cambia nada todavía', !!ov && ov.id === 'segOv' && A2.M.verGuion()[1].tcSec === 4605);
  t.ok('la lista dice quién, qué pone, entre cuáles está y qué dice el parlamento',
       /<b>ANA<\/b> <span class="dud-ant">pág\. 3<\/span>/.test(ov.innerHTML) && /pone <b>01:16:45:00<\/b>, entre 00:16:40:00 y 00:16:55:00/.test(ov.innerHTML) && /Diez minutos de más\./.test(ov.innerHTML));
  const cajas = ov.querySelectorAll('input.seg-ok'), campos = ov.querySelectorAll('input.seg-tc');
  t.eq('el de la hora viene marcado con su corrección; el otro, sin marcar y con una propuesta', cajas.map(c => c.checked).join(',') + ' ' + campos.map(c => c.value).join(','), 'true,false 00:16:45:00,00:16:50:00');
  t.ok('y del que no se sabe se dice', /no se sabe cuál es: escríbelo/.test(ov.innerHTML));
  /* Escribir uno lo marca. */
  campos[1].value = '00:16:48:00'; campos[1].oninput();
  t.eq('escribir un timecode es querer corregirlo', cajas[1].checked, true);
  await ov.querySelector('#segOk').onclick();
  t.eq('al corregir los marcados se cambian los dos', A2.M.verGuion().map(b => b.tcSec).join(' '), '1000 1005 1008 1015 1020');
  t.ok('y la lista se cierra', ov.quitado === true);
  /* Un timecode que no se entiende no cambia nada. */
  const A3 = armar(MIX());
  const ov3 = A3.M.segCorregirPanel();
  ov3.querySelectorAll('input.seg-tc')[0].value = 'a las cinco';
  await ov3.querySelector('#segOk').onclick();
  t.ok('un timecode que no se entiende se dice, se señala y no se cambia nada',
       /no se entiende/.test(ov3.querySelector('#segMsg').textContent) && ov3.querySelectorAll('input.seg-tc')[0].style.borderColor === '#F87171'
       && A3.M.verGuion()[1].tcSec === 4605 && !ov3.quitado);
  const A4 = armar(MIX());
  const ov4 = A4.M.segCorregirPanel();
  ov4.querySelectorAll('input.seg-ok')[0].checked = false;
  await ov4.querySelector('#segOk').onclick();
  t.ok('sin ninguno marcado se pide marcar alguno', /Marca al menos uno/.test(ov4.querySelector('#segMsg').textContent) && A4.M.verGuion()[1].tcSec === 4605);
  ov4.querySelector('#segNo').onclick();
  t.eq('cerrar no cambia nada', ov4.quitado + ' ' + A4.M.verGuion()[1].tcSec, 'true 4605');
  const A5 = armar([blq(10), blq(20)]);
  t.ok('sin nada fuera de orden la lista lo dice y no ofrece corregir', /Ningún timecode de este libreto está fuera de orden/.test(A5.M.segCorregirPanel().innerHTML) && !/id="segOk"/.test(A5.doc.puestos[0].innerHTML));
  /* El renglón del panel del timecode. */
  t.eq('en el panel del timecode, nada si no hay ninguno', A5.M.segPanelHtml(), '');
  const A6 = armar(MIX());
  t.ok('y si los hay, cuántos y el botón', /2 timecodes del libreto están fuera de orden/.test(A6.M.segPanelHtml()) && /<button class="modo-op" id="tcpRaros"/.test(A6.M.segPanelHtml()));
  const panel = { quitado: false, remove(){ panel.quitado = true; }, _b: { onclick: null }, querySelector: (q) => (q === '#tcpRaros' ? panel._b : null) };
  t.eq('el botón se conecta', A6.M.segPanelCablear(panel), true);
  panel._b.onclick();
  t.ok('y al pulsarlo se cierra el panel y se abre la lista', panel.quitado && A6.doc.puestos.length === 1 && A6.doc.puestos[0].id === 'segOv');
  t.eq('sin botón no hay nada que conectar', A6.M.segPanelCablear({ querySelector: () => null }), false);

  t.seccion('12 · dónde se usa');
  const F = fuentes().map(f => f.src).join('\n');
  t.ok('al seguir se avisa de los timecodes mal escritos, sin que el aviso pueda tirar el seguimiento',
       /const bi = stCurBlock\(t \+ SEG_ADELANTO\);\s+try\{ segAvisar\(\); \}catch\(e\)\{/.test(F));
  t.ok('el panel del timecode enseña los que hay fuera de orden y conecta su botón',
       /\+ \(\(typeof segPanelHtml === 'function'\) \? segPanelHtml\(\) : ''\)/.test(F) && /if\(typeof segPanelCablear === 'function'\) segPanelCablear\(ov\);/.test(F));
  t.ok('y la hora de Pro Tools se saca del libreto limpio: una errata no lo alarga una hora',
       /if\(typeof segTiempos === 'function' && typeof script !== 'undefined' && guion === script\)\{\s+const S = segTiempos\(\);\s+return S\.a == null \? null : \{ a: S\.a, b: S\.b \};/.test(F));
};
