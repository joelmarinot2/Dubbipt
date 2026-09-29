/* Analizar cambios · especificacion 01 (QC-22 a QC-28)
 *
 * Oír el premix, compararlo con el libreto y decir qué parlamentos no dicen lo
 * que pone. Pedido de sala: «que el proceso sea mucho más rápido».
 *
 * Antes se transcribía parlamento a parlamento, y el reconocedor cobra lo
 * mismo por medio segundo que por treinta: rellena con silencio. Ahora se
 * busca dónde hay voz, se junta en tramos de 29 s y los tramos se reparten
 * entre varios trabajadores. Lo que se prueba aquí es todo lo que decide:
 *
 *   · dónde hay voz y dónde no, y por dónde se parte;
 *   · que cada segundo del tramo vuelva a su segundo del audio;
 *   · que lo que SUENA igual cuente como igual, y lo que no, no;
 *   · a qué parlamento va cada palabra, con un timecode que nunca es exacto;
 *   · que el trabajo se reparta, se reintente y se pare como se dice.
 *
 * El reconocedor de verdad no corre aquí: hace falta un navegador y un modelo
 * de 40 MB. Se sustituye por trabajadores de mentira que contestan lo que se
 * les dice, que es justo lo que permite probar los caminos raros —uno que se
 * cae, uno que no contesta, un tramo que falla dos veces—.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, karNormReal, RAIZ } = require('./ayuda');

exports.nombre = 'Analizar cambios: más rápido, y sin inventarse cambios';

const R_MEDIDAS = ['/* Las medidas del análisis', '/* ── 1 · Dónde hay voz'];
const R_VOZ     = ['/* ── 1 · Dónde hay voz', '/* ── 2 · Los tramos'];
const R_TRAMOS  = ['/* ── 2 · Los tramos', '/* ── 3 · Las palabras'];
const R_PALAB   = ['/* ── 3 · Las palabras', '/* ── 4 · A qué parlamento'];
const R_REPARTO = ['/* ── 4 · A qué parlamento', '/* ── 5 · El reparto del trabajo'];
const R_TRABAJO = ['/* ── 5 · El reparto del trabajo', '/** Las ventanas de los parlamentos'];

const callado = { warn: () => {}, log: () => {} };
const REAL = montar([R_MEDIDAS], ['ANA', 'ANA_TRABAJADOR'], {});

/** Todo lo que decide, con las medidas de verdad o con otras. */
function logica(ana){
  return montar([R_VOZ, R_TRAMOS, R_PALAB, R_REPARTO],
    ['anaEnergia', 'anaUmbral', 'anaVoces', 'anaPartir', 'anaTramos', 'anaMontar', 'anaTiempo',
     'anaNumero', 'anaSinAcotaciones', 'anaFonetica', 'anaPalabras', 'anaJuntar', 'anaOidas',
     'anaCasar', 'anaParlamento', 'anaRepartir'],
    { ANA: ana || REAL.ANA, karNorm: karNormReal(), console: callado });
}

/** Una energía fabricada: `trozos` son [desde, hasta] en segundos con voz. */
function energia(trozos, dur, paso){
  const n = Math.round(dur / paso);
  const e = new Float32Array(n);
  for(const [a, b] of trozos) for(let i = Math.round(a / paso); i < Math.round(b / paso) && i < n; i++) e[i] = 0.5;
  return e;
}
const r2 = (x) => Math.round(x * 100) / 100;

/* ── Trabajadores de mentira ─────────────────────────────────────────────── */

/**
 * Un `Worker` que contesta lo que dice el guion. Cada tramo lleva su número en
 * la primera muestra -se fabrica así-, y el trabajador contesta «tramo k»: con
 * eso se ve si cada respuesta vuelve a SU tramo.
 *   guion.preparar(i, msg) -> 'ok' | 'error' | 'caer'
 *   guion.tramo(i, k, msg)  -> nada | 'error' | 'caer' | 'callar'
 */
function fabrica(guion){
  guion = guion || {};
  const creados = [];
  class Falso {
    constructor(url, opts){
      this.url = url; this.opts = opts; this.recibidos = []; this.pasados = [];
      this.terminado = false; this.i = creados.length; creados.push(this);
    }
    postMessage(msg, pasar){
      this.recibidos.push(msg); this.pasados.push(pasar || []);
      const yo = this;
      const contestar = (data) => setTimeout(() => { if(!yo.terminado && yo.onmessage) yo.onmessage({ data: data }); }, 1);
      const caer = () => setTimeout(() => {
        if(!yo.terminado && yo.onerror) yo.onerror({ message: 'reventó', preventDefault(){} });
      }, 1);
      if(msg.que === 'preparar'){
        const q = guion.preparar ? guion.preparar(yo.i, msg) : 'ok';
        if(q === 'error') return contestar({ que: 'error', id: msg.id, error: 'no arranca' });
        if(q === 'caer') return caer();
        if(msg.avisaDescarga) contestar({ que: 'bajando', id: msg.id, bytes: 5 * 1048576 });
        return contestar({ que: 'listo', id: msg.id });
      }
      if(msg.que === 'tramo'){
        const k = Math.round(msg.pcm[0]) - 1;
        const q = guion.tramo ? guion.tramo(yo.i, k, msg) : null;
        if(q === 'callar') return;
        if(q === 'caer') return caer();
        if(q === 'error') return contestar({ que: 'error', id: msg.id, error: 'no se entiende' });
        return contestar({ que: 'hecho', id: msg.id, texto: 'tramo ' + k,
                           palabras: [{ text: ' tramo' + k, timestamp: [0.1, 0.2] }], ms: 3 });
      }
    }
    terminate(){ this.terminado = true; }
  }
  return { Worker: Falso, creados: creados };
}

/** El reparto del trabajo montado con trabajadores de mentira. */
function reparto(guion, nav, ana){
  const F = fabrica(guion);
  const M = montar([R_TRAMOS, R_TRABAJO],
    ['anaTranscribir', 'anaTranscribirAqui', 'anaCuantos', 'anaQueda', 'anaRespiro', 'anaParar',
     'anaTrabajador', 'ANA_ACTIVOS'],
    { ANA: Object.assign({}, REAL.ANA, { sr: 10, hueco: 0.1 }, ana || {}),
      ANA_TRABAJADOR: './js/analisis-worker.js',
      KARIA_LIB: 'lib', KARIA_MODELO: 'modelo',
      navigator: nav || { hardwareConcurrency: 4, deviceMemory: 8 },
      Worker: F.Worker, karIa: { pipe: null }, console: callado });
  M._creados = F.creados;
  return M;
}

/** Tramos de mentira: el k-ésimo empieza en el segundo k y dura medio. A 10
    muestras por segundo, su primera muestra es la k*10 y vale k+1. */
function tramosDePrueba(n){
  const pcm = new Float32Array(n * 10 + 20);
  const tramos = [];
  for(let k = 0; k < n; k++){ pcm[k * 10] = k + 1; tramos.push({ piezas: [{ a: k, b: k + 0.5 }], dur: 0.5 }); }
  return { pcm: pcm, tramos: tramos };
}

/** Espera, pero no para siempre: si algo se cuelga, sale en rojo en vez de
    colgar el juego entero. */
const COLGADO = { colgado: true };
const conTope = (p, ms) => Promise.race([p, new Promise(r => setTimeout(() => r(COLGADO), ms || 3000))]);

exports.pruebas = async function(t){
  const L = logica();

  t.seccion('1 · dónde hay voz');
  const e1 = L.anaEnergia(new Float32Array(1000).fill(0.25), 100, 0.1);
  t.eq('la energía de una señal constante es su amplitud', r2(e1[0]), 0.25);
  t.eq('una medida por paso', e1.length, 100);
  t.eq('sin nada que medir, el suelo', L.anaUmbral(new Float32Array(0)), 0.0015);
  t.eq('el silencio digital nunca cuenta como voz', L.anaUmbral(new Float32Array(500)), 0.0015,
       'sin suelo, en un audio de silencio absoluto cualquier cero pasaría el listón');
  t.cerca('el listón va 28 dB por debajo de lo que suena fuerte',
          L.anaUmbral(new Float32Array(500).fill(0.5)), 0.02, 1e-6);

  const P = 0.02;
  const e2 = energia([[1.0, 2.0], [2.3, 2.5], [5.0, 5.06], [8.0, 9.0], [10.0, 11.0], [11.3, 11.38]], 12, P);
  const v = L.anaVoces(e2, P, 0.1, 12).map(x => [r2(x.a), r2(x.b)]);
  t.eq('dos trozos a menos de 0,6 s son el mismo', v[0], [0.8, 2.7]);
  t.eq('un chasquido suelto no es voz', v.length, 3, JSON.stringify(v));
  t.eq('el tercero, con su margen a cada lado', v[1], [7.8, 9.2]);
  t.eq('primero se junta y DESPUÉS se tiran los cortos', v[2], [9.8, 11.58],
       'al revés, la consonante suelta del final de la frase se habría perdido');
  const vb = L.anaVoces(energia([[0, 0.5], [11.8, 12]], 12, P), P, 0.1, 12).map(x => [r2(x.a), r2(x.b)]);
  t.eq('el margen no se sale por delante del audio', vb[0][0], 0);
  t.eq('ni por detrás', vb[vb.length - 1][1], 12);
  /* Con las medidas de verdad dos trozos no llegan a solaparse con su margen;
     con otras sí, y entonces se juntan. Se prueba con otras. */
  const L2 = logica(Object.assign({}, REAL.ANA, { juntar: 0.1, relleno: 0.3 }));
  const vs = L2.anaVoces(energia([[1, 2], [2.4, 3]], 4, P), P, 0.1, 4);
  t.eq('dos trozos que se pisan con su margen se funden', vs.length, 1, JSON.stringify(vs));

  t.seccion('2 · un trozo largo se parte por donde menos suena');
  const e3 = energia([[0, 24.9], [25.1, 49.9], [50.1, 70]], 70, P);
  const pa = L.anaPartir([{ a: 0, b: 70 }], e3, P, 29).map(x => [r2(x.a), r2(x.b)]);
  t.eq('en tres', pa.length, 3, JSON.stringify(pa));
  t.ok('el primer corte cae en MEDIO del silencio de 25 s', Math.abs(pa[0][1] - 25) <= 0.03, JSON.stringify(pa[0]),
       'en su primer instante acaba de terminar la voz, y cortar ahí se lleva la última sílaba');
  t.ok('y el segundo en el de 50', Math.abs(pa[1][1] - 50) <= 0.03, JSON.stringify(pa[1]));
  t.ok('ninguno pasa del tope', pa.every(x => x[1] - x[0] <= 29 + 1e-9));
  t.ok('ni se pierde nada entre medias', pa[0][1] === pa[1][0] && pa[1][1] === pa[2][0]);
  const pb = L.anaPartir([{ a: 0, b: 70 }], new Float32Array(0), P, 29);
  t.ok('sin medidas, se corta al tope y se sigue', pb.length === 3 && r2(pb[0].b) === 29, JSON.stringify(pb));

  t.seccion('3 · los tramos, y la vuelta a su sitio');
  const tr = L.anaTramos([{ a: 0, b: 10 }, { a: 20, b: 30 }, { a: 40, b: 50 }, { a: 60, b: 60 }], 29, 0.3);
  t.eq('caben dos de diez en un tramo de 29', tr[0].piezas.length, 2);
  t.cerca('con su hueco entre medias', tr[0].dur, 20.3, 1e-9);
  t.eq('el tercero ya no cabe', tr.length, 2);
  t.eq('y lo que no dura nada no entra', tr[1].piezas.length, 1);
  const trH = L.anaTramos([{ a: 0, b: 14.4 }, { a: 20, b: 34.5 }], 29, 0.3);
  t.eq('el hueco también cuenta: 14,4 + 0,3 + 14,5 ya no cabe en 29', trH.length, 2,
       'sin contarlo, el tramo mediría 29,2 s y se pasaría del tope');

  const sr = 100;
  const pcm = new Float32Array(500).map((_, i) => i);
  const mo = L.anaMontar(pcm, sr, { piezas: [{ a: 1.0, b: 1.5 }, { a: 3.0, b: 3.25 }] }, 0.1);
  t.eq('el audio montado mide las dos piezas y el hueco', mo.pcm.length, 50 + 10 + 25);
  t.eq('empieza en la primera pieza', mo.pcm[0], 100);
  t.eq('el hueco es silencio', mo.pcm[55], 0);
  t.eq('y sigue con la segunda', mo.pcm[60], 300);
  t.eq('el mapa: dónde empieza cada pieza en el tramo y en el audio',
       mo.mapa.map(m => [r2(m.t), r2(m.a), r2(m.d)]), [[0, 1, 0.5], [0.6, 3, 0.25]]);
  t.cerca('un segundo del tramo vuelve a su segundo del audio', L.anaTiempo(mo.mapa, 0.2), 1.2, 1e-9);
  t.cerca('y en la segunda pieza también', L.anaTiempo(mo.mapa, 0.7), 3.1, 1e-9,
          'sin el mapa, cada palabra iría a parar al parlamento equivocado');
  t.cerca('lo que cae en el hueco se queda al final de la anterior', L.anaTiempo(mo.mapa, 0.55), 1.5, 1e-9);
  t.cerca('y lo de más allá no se sale de la última', L.anaTiempo(mo.mapa, 9), 3.25, 1e-9);
  t.cerca('ni lo de antes, por delante de la primera', L.anaTiempo(mo.mapa, -1), 1.0, 1e-9);
  t.cerca('sin mapa, el tiempo es el que es', L.anaTiempo(null, 4.5), 4.5, 1e-9);

  t.seccion('4 · los números, dichos como se dicen');
  const num = (n) => (L.anaNumero(n) || ['NULO']).join(' ');
  t.eq('cinco', num(5), 'cinco');
  t.eq('veintiuno', num(21), 'veintiuno');
  t.eq('cuarenta y dos', num(42), 'cuarenta y dos');
  t.eq('treinta', num(30), 'treinta');
  t.eq('cien', num(100), 'cien');
  t.eq('ciento uno', num(101), 'ciento uno');
  t.eq('doscientos cincuenta', num(250), 'doscientos cincuenta');
  t.eq('mil', num(1000), 'mil');
  t.eq('mil quinientos', num(1500), 'mil quinientos');
  t.eq('dos mil veinticuatro', num(2024), 'dos mil veinticuatro');
  t.eq('lo que no es un número entero no se dice', num(1.5) + '|' + num(-1), 'NULO|NULO');
  const pal = (s) => L.anaPalabras(s).join(' ');
  t.eq('«solo 5 minutos» es «solo cinco minutos»', pal('Solo 5 minutos'), pal('solo cinco minutos'),
       'el reconocedor escribe cifras y el libreto letras: sin esto era un cambio');
  t.eq('«el 42» es «el cuarenta y dos»', pal('Era el 42.'), pal('era el cuarenta y dos'));
  t.eq('y «1.500» es un número, no dos', pal('1.500'), pal('mil quinientos'));
  t.eq('las acotaciones no se dicen', pal('Hola (ríe) amigo [Música] *suspira*'), pal('hola amigo'));

  t.seccion('5 · lo que suena igual cuenta como igual');
  const fon = (a, b) => L.anaFonetica(a) === L.anaFonetica(b);
  [['hola', 'ola'], ['vais', 'bais'], ['casa', 'caza'], ['cielo', 'sielo'], ['llave', 'yave'],
   ['queso', 'keso'], ['gente', 'jente'], ['ascensor', 'asensor'], ['hecho', 'echo'], ['cosa', 'kosa'],
   ['acción', 'aksión']]
    .forEach(([a, b]) => t.ok('«' + a + '» suena como «' + b + '»', fon(a, b),
      L.anaFonetica(a) + ' ≠ ' + L.anaFonetica(b)));
  /* Y lo que SÍ suena distinto se queda distinto: es lo que hay que encontrar. */
  [['hija', 'hijo'], ['pero', 'perro'], ['diez', 'quince'], ['gato', 'jato'], ['chico', 'sico'],
   ['derecha', 'izquierda'], ['coma', 'goma'], ['guerra', 'jerra']]
    .forEach(([a, b]) => t.ok('«' + a + '» NO suena como «' + b + '»', !fon(a, b),
      'un cambio de verdad no se puede tapar: ' + L.anaFonetica(a)));

  t.seccion('6 · las palabras que el reconocedor parte o junta');
  const sim = (a, b) => r2(L.anaCasar(L.anaPalabras(a), L.anaPalabras(b)).sim);
  t.eq('«está vais» es «estabais»', sim('¿Se puede saber dónde estabais?', 'se puede saber dónde está, vais'), 1);
  t.eq('«hoy es» es «oyes»', sim('Hermano, ¿me oyes? Soy yo.', 'hermano, me hoy es. Soy yo.'), 1);
  t.eq('«adormido» es «ha dormido»', sim('Ha dormido bien', 'Adormido bien'), 1);
  t.eq('«de la» contra «de la» no se toca', L.anaJuntar(['de', 'la'], ['de', 'la']).map(x => x.join(' ')).join('|'),
       'de la|de la', 'dos palabras que son dos palabras en los dos lados son dos palabras');
  t.eq('ni se juntan dos que YA son palabras del otro lado, aunque juntas también lo sean',
       L.anaJuntar(['sin', 'fin', 'sinfin'], ['sin', 'fin'])[1].join(' '), 'sin fin',
       'si no, «sin fin» se comería la palabra que viene detrás');
  t.eq('idéntico', sim('Esta es la casa de su madre', 'esta es la casa de su madre'), 1);
  t.cerca('una palabra cambiada de ocho', L.anaCasar(L.anaPalabras('Si todo va bien, en unos diez días.'),
          L.anaPalabras('si todo va bien en unos quince días')).sim, 7 / 8, 1e-9);
  t.ok('lo añadido también cuenta: una frase con seis palabras de más no cuadra',
       sim('Mamá pregunta por ti todos los días.', 'Mamá pregunta por ti todos los días y todas las noches sin parar.') < 0.72,
       'se divide por la más larga de las dos: añadir es un cambio igual que quitar');
  t.eq('contra nada, cero', L.anaCasar([], ['hola']).sim, 0);
  t.ok('el orden cuenta', sim('uno dos tres cuatro cinco', 'cinco cuatro tres dos uno') < 1);

  t.seccion('7 · lo que devuelve el reconocedor, a su sitio y limpio');
  const mapa = [{ t: 0, a: 100, d: 5 }, { t: 5.3, a: 200, d: 5 }];
  const oi = L.anaOidas([
    { text: ' Hola,', timestamp: [0.1, 0.3] },
    { text: ' (ríe)', timestamp: [0.4, 0.5] },
    { text: ' [Música', timestamp: [0.6, 0.7] },
    { text: ' suave]', timestamp: [0.8, 0.9] },
    { text: ' (risas', timestamp: [0.95, 1.0] },
    { text: ' fuertes)', timestamp: [1.0, 1.05] },
    { text: ' 42', timestamp: [6.0, 6.2] },
    { text: ' final', timestamp: [6.4, null] },
    { text: ' perdida', timestamp: [null, 1] }
  ], mapa);
  t.eq('sale cada palabra que se dijo, y solo esas', oi.map(x => x.p).join(' '),
       L.anaPalabras('hola cuarenta y dos final').join(' '),
       'las acotaciones fuera, aunque ocupen dos trozos; lo que no tiene tiempo, fuera');
  t.cerca('con su tiempo en el audio de verdad', oi[0].t, 100.2, 1e-9);
  t.cerca('también en la segunda pieza', oi[1].t, 200.8, 1e-9);
  t.eq('«42» lleva su texto una sola vez', oi.slice(1, 4).map(x => x.txt).join('|'), '42||',
       'si lo llevaran las tres palabras, lo oído saldría «42 42 42»');
  t.cerca('sin fin, se le da una quinta de segundo', oi[4].t, 201.2, 1e-9);
  const largo = [{ text: ' (Música', timestamp: [0, 0.1] }];
  for(let i = 1; i <= 10; i++) largo.push({ text: ' p' + i, timestamp: [i, i + 0.1] });
  t.ok('un paréntesis sin cerrar no se come el resto', L.anaOidas(largo, null).length >= 3,
       'una acotación son dos o tres palabras, no el tramo entero');

  t.seccion('8 · a qué parlamento va cada palabra');
  const w = (p, tt) => ({ p: L.anaFonetica(p), t: tt, txt: p });
  const O = [w('uno', 10.5), w('dos', 11.0), w('tres', 12.2),       // A, dicho un poco tarde
             w('cuatro', 12.6), w('cinco', 13.2)];                   // B
  const R = L.anaRepartir([{ si: 0, texto: 'Uno, dos, tres.', v0: 10, v1: 12 },
                           { si: 1, texto: 'Cuatro, cinco.', v0: 12, v1: 14 }], O, 100);
  t.eq('A se lleva su última palabra aunque caiga ya en B', R.por[0].sim, 1,
       'el timecode del libreto nunca es exacto: la frase de A se alargó dos décimas');
  t.eq('y B no la quiere, porque no le va', R.por[1].sim, 1);
  t.eq('lo oído de A, escrito como se oyó', R.por[0].oido, 'uno dos tres');
  const R2 = L.anaRepartir([{ si: 1, texto: 'Cuatro, cinco.', v0: 12, v1: 14 }],
                           [w('cuatro', 12.6), w('seis', 13.2)], 100);
  t.eq('una palabra cambiada, a la mitad', R2.por[1].sim, 0.5);
  const R3 = L.anaRepartir([{ si: 2, texto: 'Hola, amigo.', v0: 30, v1: 34 }],
                           [w('hola', 30.5), w('amigo', 31), w('que', 31.5), w('tal', 32), w('estas', 32.5)], 100);
  t.eq('lo que cae BIEN DENTRO es suyo, coincida o no', R3.por[2].sim, 0.4,
       'si se pudiera dejar fuera lo que sobra, las palabras añadidas no saldrían nunca');
  const R4 = L.anaRepartir([{ si: 3, texto: 'Yo prefiero quedarme.', v0: 50, v1: 52 }], O, 100);
  t.eq('lo que no se dijo, cero', R4.por[3].sim, 0);
  t.eq('y oído, nada', R4.por[3].oido, '');
  const R5 = L.anaRepartir([{ si: 4, texto: 'Fuera.', v0: 120, v1: 122 },
                            { si: 5, texto: 'Antes.', v0: -5, v1: -1 },
                            { si: 6, texto: '(risas)', v0: 10, v1: 11 }], O, 100);
  t.eq('lo que cae fuera del audio se cuenta aparte', R5.fuera, 2,
       'fuera del audio no es «no se dijo»: no se puede comparar');
  t.eq('y no se da por analizado', Object.keys(R5.por).length, 0);
  t.eq('un parlamento que solo son acotaciones no se compara', R5.sinTexto, 1);
  const R6 = L.anaRepartir([{ si: 0, texto: 'Uno, dos, tres.', v0: 10, v1: 12 }], O.slice().reverse(), 100);
  t.eq('da igual el orden en que lleguen las palabras', R6.por[0].sim, 1,
       'los tramos acaban desordenados: se reparten entre varios trabajadores');

  t.seccion('9 · cuántos trabajadores');
  const Rp = reparto();
  t.eq('cuatro núcleos: tres, y uno para la página', Rp.anaCuantos(4, 10, 8), 3);
  t.eq('con muchos núcleos, el tope', Rp.anaCuantos(16, 10, 16), 4);
  t.eq('con dos núcleos, uno', Rp.anaCuantos(2, 10, 8), 1);
  t.eq('nunca más que tramos', Rp.anaCuantos(16, 2, 16), 2);
  t.eq('con poca memoria, dos como mucho', Rp.anaCuantos(8, 10, 4), 2,
       'cada uno carga su copia del reconocedor');
  t.eq('sin saber nada, uno', Rp.anaCuantos(undefined, 5, 0), 1);
  t.eq('al principio no se promete nada', Rp.anaQueda(5, 100, 10), '',
       'un «quedan 40 minutos» calculado con el primer tramo asusta y es mentira');
  t.eq('a la mitad, lo que queda', Rp.anaQueda(50, 100, 30), 'quedan unos 30 s');
  t.eq('y en minutos cuando es mucho', Rp.anaQueda(10, 100, 60), 'quedan unos 9 min');
  let respiro = false;
  await Rp.anaRespiro().then(() => { respiro = true; });
  t.ok('dejar respirar a la página termina', respiro);

  t.seccion('10 · el reparto del trabajo');
  {
    const M = reparto();
    const { pcm, tramos } = tramosDePrueba(5);
    const avisos = [], bajadas = [];
    const r = await conTope(M.anaTranscribir(pcm, tramos, { avisa: (h, tot) => avisos.push([h, tot]),
                                                   bajando: (m) => bajadas.push(m.bytes) }));
    t.eq('se oyen todos', r.length, 5);
    t.eq('y cada respuesta vuelve a SU tramo', r.map(x => x.items[0].text.trim()).join(' '),
         'tramo0 tramo1 tramo2 tramo3 tramo4', 'si no, lo oído iría a parar a otro trozo del capítulo');
    t.ok('con su mapa para volver al audio', r.every(x => Array.isArray(x.mapa) && x.mapa.length === 1));
    t.eq('con cuatro núcleos trabajan tres', M._creados.length, 3);
    t.eq('el primero baja el modelo y avisa de la descarga',
         M._creados.map(w => !!(w.recibidos[0] && w.recibidos[0].avisaDescarga)).join(','), 'true,false,false',
         'si arrancaran todos a la vez, lo bajarían todos');
    t.eq('y la descarga se cuenta en bytes', bajadas[0], 5 * 1048576);
    t.ok('son trabajadores de módulo', M._creados.every(w => w.opts && w.opts.type === 'module'));
    t.ok('del archivo que es', M._creados.every(w => w.url === './js/analisis-worker.js'));
    const env = [];
    M._creados.forEach(w => w.recibidos.forEach((m, i) => { if(m.que === 'tramo') env.push(w.pasados[i][0] === m.pcm.buffer); }));
    t.ok('el audio se TRASPASA, no se copia', env.length === 5 && env.every(Boolean),
         'copiar un tramo a cada trabajador es gastar memoria por nada');
    t.ok('se pide cada palabra con su tiempo', M._creados.some(w => w.recibidos.some(m =>
         m.que === 'tramo' && m.opciones.return_timestamps === 'word')));
    t.eq('el aviso llega al final', avisos[avisos.length - 1][0], avisos[avisos.length - 1][1]);
    t.ok('y va a más', avisos.every((a, i) => i === 0 || a[0] >= avisos[i - 1][0]));
    t.ok('al acabar se cierran todos', M._creados.every(w => w.terminado));
    t.eq('y no queda ninguno en marcha', M.ANA_ACTIVOS.length, 0);
  }
  {
    const intentos = {};
    const M = reparto({ tramo: (i, k) => { intentos[k] = (intentos[k] || 0) + 1; return (k === 2 && intentos[k] === 1) ? 'error' : null; } });
    const { pcm, tramos } = tramosDePrueba(4);
    const r = await conTope(M.anaTranscribir(pcm, tramos, {}));
    t.eq('un tramo que falla una vez se intenta otra', intentos[2], 2);
    t.eq('y sale', r[2].items[0].text.trim(), 'tramo2');
  }
  {
    let veces = 0;
    const M = reparto({ tramo: (i, k) => { if(k === 1){ veces++; return 'error'; } return null; } });
    const { pcm, tramos } = tramosDePrueba(4);
    let error = null;
    try{ await conTope(M.anaTranscribir(pcm, tramos, {})); }catch(e){ error = e; }
    t.ok('si falla dos veces, se para y se dice', !!error && /no se pudo transcribir/.test(error.message),
         String(error && error.message));
    t.eq('dos veces, ni una más', veces, 2, 'insistir con un tramo que no se entiende es tardar más en fallar igual');
    t.ok('sin culpar a los trabajadores', !!error && !error.sinTrabajadores,
         'repetirlo todo en la página solo tardaría más en fallar igual');
    t.ok('y se cierran todos', M._creados.every(w => w.terminado));
  }
  {
    const M = reparto({ tramo: (i, k) => (i === 0 && k === 0 ? 'caer' : null) });
    const { pcm, tramos } = tramosDePrueba(5);
    const r = await conTope(M.anaTranscribir(pcm, tramos, {}));
    t.eq('si un trabajador se cae, los demás hacen su tramo', r && r[0] && r[0].items[0].text.trim(), 'tramo0');
    t.ok('y el caído se cierra', M._creados[0].terminado);
  }
  {
    const M = reparto({ tramo: (i, k) => (i === 0 ? 'callar' : null) }, null, { espera: 40 });
    const { pcm, tramos } = tramosDePrueba(4);
    const r = await conTope(M.anaTranscribir(pcm, tramos, {}));
    t.eq('uno que deja de contestar se da por caído, y se sigue', r && r.length, 4,
         'sin esto se esperaba para siempre a un trabajador colgado');
  }
  {
    const M = reparto({ tramo: () => 'caer' });
    const { pcm, tramos } = tramosDePrueba(3);
    let error = null;
    try{ await conTope(M.anaTranscribir(pcm, tramos, {})); }catch(e){ error = e; }
    t.ok('si se caen todos, el fallo es de los trabajadores', !!error && error.sinTrabajadores === true,
         String(error && error.message));
  }
  {
    const M = reparto({ preparar: (i) => (i === 0 ? 'error' : 'ok') });
    const { pcm, tramos } = tramosDePrueba(3);
    let error = null;
    try{ await conTope(M.anaTranscribir(pcm, tramos, {})); }catch(e){ error = e; }
    t.ok('si ni el primero arranca, el fallo es de los trabajadores', !!error && error.sinTrabajadores === true,
         'y así se prueba en la propia página en vez de rendirse');
    t.eq('y no se arranca ninguno más', M._creados.length, 1);
  }
  {
    const M = reparto({ preparar: (i) => (i === 1 ? 'error' : 'ok') });
    const { pcm, tramos } = tramosDePrueba(4);
    const r = await conTope(M.anaTranscribir(pcm, tramos, {}));
    t.eq('uno de los otros que no arranca no tira el análisis', r && r.length, 4);
    t.ok('y no se queda colgado', M._creados[1].terminado);
  }
  {
    let parar = false, vistos = 0;
    const M = reparto({ tramo: () => { if(++vistos >= 2) parar = true; return null; } });
    const { pcm, tramos } = tramosDePrueba(8);
    const r = await conTope(M.anaTranscribir(pcm, tramos, { parado: () => parar }));
    t.eq('parado a medias no devuelve nada', r, null,
         'medio análisis dado por bueno dejaría la otra mitad «sin cambios»');
    t.ok('y se cierran todos', M._creados.every(w => w.terminado));
  }
  {
    let parar = false;
    const M = reparto({ tramo: () => 'callar' }, { hardwareConcurrency: 2 });
    const { pcm, tramos } = tramosDePrueba(3);
    const p = M.anaTranscribir(pcm, tramos, { parado: () => parar });
    await new Promise(r => setTimeout(r, 30));
    t.eq('con el análisis en marcha hay trabajadores activos', M.ANA_ACTIVOS.length, 1);
    parar = true;
    M.anaParar();
    const r = await conTope(p);
    t.eq('«Parar» los cierra y el análisis acaba', r, null);
    t.eq('sin dejar ninguno', M.ANA_ACTIVOS.length, 0);
  }
  {
    const M = reparto();
    const { pcm, tramos } = tramosDePrueba(3);
    const oidos = [];
    const karIa = { pipe: async (x) => { oidos.push(x[0]); return { chunks: [{ text: 'k' + x[0], timestamp: [0, 1] }] }; } };
    const Aqui = montar([R_TRAMOS, R_TRABAJO], ['anaTranscribirAqui'],
      { ANA: Object.assign({}, REAL.ANA, { sr: 10, hueco: 0.1 }), ANA_TRABAJADOR: '', KARIA_LIB: '', KARIA_MODELO: '',
        navigator: {}, Worker: function(){}, karIa: karIa, console: callado });
    const r = await Aqui.anaTranscribirAqui(pcm, tramos, {});
    t.eq('en la propia página, también por tramos y en orden', oidos.join(','), '1,2,3');
    t.eq('y devuelve lo mismo', r.map(x => x.items[0].text).join(','), 'k1,k2,k3');
    let n = 0;
    const r2b = await Aqui.anaTranscribirAqui(pcm, tramos, { parado: () => (++n > 1) });
    t.eq('y también se para', r2b, null);
  }

  t.seccion('11 · el trabajador, por dentro');
  /* Se carga el archivo de verdad. `import()` no se puede sustituir desde
     fuera, así que se cambia por una función con otro nombre: si el archivo
     cambia de forma, esta prueba lo dice en vez de probar otra cosa. */
  const archivo = path.join(RAIZ, REAL.ANA_TRABAJADOR);
  t.ok('el archivo del trabajador existe', fs.existsSync(archivo), archivo);
  const src0 = fs.readFileSync(archivo, 'utf8');
  const src = src0.replace('await import(m.lib)', 'await __importar(m.lib)');
  t.ok('carga la librería con import()', src !== src0);
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('y está en el SHELL, para que funcione sin conexión',
       sw.indexOf("'" + REAL.ANA_TRABAJADOR + "'") >= 0,
       'index.html no lo carga con un <script>, así que la carcasa no lo ve: se mira aquí');

  const correrTrabajador = () => {
    const yo = { enviados: [], postMessage(m){ yo.enviados.push(m); } };
    let reloj = 1000;
    const Reloj = { now: () => reloj };
    const lib = { env: {}, pedidos: [], soltado: false,
      pipeline: async (tarea, modelo, op) => {
        lib.pedidos.push({ tarea: tarea, modelo: modelo, op: op });
        op.progress_callback({ status: 'progress', file: 'a.onnx', loaded: 1048576 });
        reloj += 300;
        op.progress_callback({ status: 'progress', file: 'b.onnx', loaded: 2 * 1048576 });
        reloj += 100;
        op.progress_callback({ status: 'progress', file: 'b.onnx', loaded: 3 * 1048576 });
        const pipe = async (pcm, o) => {
          if(o && o.falla) throw new Error('x'.repeat(600));
          return { text: ' hola', chunks: [{ text: ' hola', timestamp: [0, 0.3] }] };
        };
        pipe.dispose = async () => { lib.soltado = true; };
        return pipe;
      } };
    new Function('self', '__importar', 'Date', src)(yo, async () => lib, Reloj);
    return { yo: yo, lib: lib };
  };
  {
    const { yo, lib } = correrTrabajador();
    await yo.onmessage({ data: { que: 'tramo', id: 1, pcm: [] } });
    t.ok('sin preparar no transcribe: lo dice', yo.enviados[0].que === 'error' && /no está preparado/.test(yo.enviados[0].error));
    await yo.onmessage({ data: { que: 'preparar', id: 2, lib: 'x', modelo: 'Xenova/whisper-tiny', avisaDescarga: true } });
    t.eq('prepara el reconocedor de voz', lib.pedidos[0].tarea + '|' + lib.pedidos[0].modelo,
         'automatic-speech-recognition|Xenova/whisper-tiny');
    t.eq('sin modelos locales', lib.env.allowLocalModels, false);
    const bajando = yo.enviados.filter(m => m.que === 'bajando');
    t.eq('la descarga suma lo bajado de todos los archivos', bajando.map(m => m.bytes / 1048576).join(','), '1,3',
         'contado archivo a archivo la cifra saltaba de un 71 % a un 48 %');
    t.eq('y no inunda: un aviso cada cuarto de segundo', bajando.length, 2);
    t.eq('y dice que está listo, con su número', yo.enviados[yo.enviados.length - 1].que + ':' + yo.enviados[yo.enviados.length - 1].id, 'listo:2');
    await yo.onmessage({ data: { que: 'tramo', id: 3, pcm: [0], opciones: {} } });
    const h = yo.enviados[yo.enviados.length - 1];
    t.eq('transcribe y devuelve lo oído con sus palabras', h.que + '|' + h.id + '|' + h.texto + '|' + h.palabras.length, 'hecho|3| hola|1');
    t.ok('y lo que tardó', isFinite(h.ms));
    await yo.onmessage({ data: { que: 'tramo', id: 4, pcm: [0], opciones: { falla: true } } });
    const f = yo.enviados[yo.enviados.length - 1];
    t.ok('si el reconocedor falla, lo dice sin la pila entera', f.que === 'error' && f.id === 4 && f.error.length <= 400);
    await yo.onmessage({ data: { que: 'nosequé', id: 5 } });
    t.eq('lo que no entiende, lo dice', yo.enviados[yo.enviados.length - 1].que, 'error');
    await yo.onmessage({ data: { que: 'soltar', id: 6 } });
    t.ok('y suelta el modelo al acabar', lib.soltado && yo.enviados[yo.enviados.length - 1].que === 'suelto');
  }
  {
    const { yo } = correrTrabajador();
    await yo.onmessage({ data: { que: 'preparar', id: 1, lib: 'x', modelo: 'm' } });
    t.eq('los demás no avisan de la descarga', yo.enviados.filter(m => m.que === 'bajando').length, 0,
         'solo el primero la baja; los demás la cogen ya guardada');
  }

  t.seccion('12 · el análisis entero: lo de antes no se toca hasta tener lo nuevo');
  /* `cotejarTodo`, con todo lo que llama sustituido: aquí se prueba el ORDEN y
     las decisiones -qué se borra, cuándo, qué se dice-, no el reconocedor. */
  const orquesta = (o) => {
    o = o || {};
    const diario = [], avisos = [];
    const w = { _cotejo: o.antes || { 99: { sim: 0.2, oido: 'de otro día' } } };
    const karIa = { pcm: new Float32Array(10), sr: 16000, idioma: 'spanish', error: null };
    const ctx = {
      window: w, karIa: karIa,
      karIaAudio: async () => { diario.push('audio'); if(o.audioFalla) throw new Error('formato raro'); return true; },
      karIaPreparar: async () => { diario.push('preparar en la página'); return o.preparaAqui !== false; },
      anaPlan: () => ({ tramos: o.sinVoz ? [] : [{ piezas: [{ a: 0, b: 5 }], dur: 5 }], duracion: 300, voz: 5 }),
      anaVentanas: () => [{ si: 0, texto: 'a', v0: 1, v1: 2 }],
      anaTranscribir: o.transcribir || (async () => { diario.push('trabajadores'); return [{ items: [], mapa: [] }]; }),
      anaTranscribirAqui: async () => { diario.push('en la página'); return [{ items: [], mapa: [] }]; },
      anaOidas: () => [],
      anaRepartir: () => ({ por: o.por || { 0: { sim: 1, oido: 'a' }, 1: { sim: 0.3, oido: 'b' }, 2: { sim: 0.6, oido: 'c' } },
                            fuera: o.fuera || 0, sinTexto: 0 }),
      anaQueda: () => '',
      anaParar: () => diario.push('parar trabajadores'),
      stMsg: (m) => avisos.push(m),
      castAviso: (m) => avisos.push('TOAST ' + m),
      epDataUpsert: async () => diario.push('nube'),
      adrRepintar: () => {},
      fallo: () => {},
      currentEp: { id: 'ep', showId: 'sh' },
      studio: o.sinAudio ? {} : { dlgUrl: 'blob:x' },
      perfilLlevaVideo: (m) => m !== 'qc',
      DDL_MODO: o.modo || 'qc',
      console: callado
    };
    const M = montar([['/* `total`, `vistos`, `mal` y `dudosos`', '/* ── El panel de los planos']],
                     ['cotejarTodo', 'COTEJO', 'cotejoTardo'], ctx);
    return { M, w, karIa, diario, avisos };
  };
  {
    const X = orquesta();
    const r = await X.M.cotejarTodo();
    t.eq('cuenta lo analizado', r && (r.hechos + '/' + r.mal + '/' + r.dudosos), '3/1/1');
    t.ok('lo de antes se SUSTITUYE, no se mezcla', !(99 in X.w._cotejo) && Object.keys(X.w._cotejo).length === 3,
         'un resultado de otro día colgando de un parlamento que hoy no se comparó sería un cambio inventado');
    t.ok('y se guarda en la nube', X.diario.includes('nube'));
    t.ok('por los trabajadores, sin pasar por la página', X.diario.includes('trabajadores') && !X.diario.includes('en la página'));
    t.eq('al acabar ya no trabaja', X.M.COTEJO.trabajando, false);
    t.eq('y la barra llega al final', X.M.COTEJO.vistos, X.M.COTEJO.total);
    t.ok('dice cuánto ha tardado', X.avisos.some(a => /analizados en \d+ s/.test(a)), JSON.stringify(X.avisos));
    t.ok('y devuelve lo que tardó, para el informe', isFinite(r.segundos));
    t.ok('en QC manda a «≠ Cambios»', X.avisos.some(a => /TOAST.*«≠ Cambios»/.test(a)));
    t.ok('en Grabación, a «📋 Cues»', await (async () => {
      const G = orquesta({ modo: 'grabacion' }); await G.M.cotejarTodo();
      return G.avisos.some(a => /TOAST.*«📋 Cues»/.test(a)); })());
  }
  {
    let soltar = null;
    const X = orquesta({ transcribir: () => new Promise(r => { soltar = r; }) });
    const p = X.M.cotejarTodo();
    await new Promise(r => setTimeout(r, 5));
    t.eq('mientras trabaja, está trabajando', X.M.COTEJO.trabajando, true);
    const segunda = await X.M.cotejarTodo();
    t.eq('pulsar otra vez PARA, no lanza otro', segunda, null);
    t.ok('y cierra los trabajadores', X.diario.includes('parar trabajadores'));
    soltar(null);
    const r = await p;
    t.eq('el análisis parado no devuelve nada', r, null);
    t.eq('y se sabe que fue parado, no un fallo', X.M.COTEJO.parado, true);
    t.ok('lo de antes sigue como estaba', 99 in X.w._cotejo,
         'parar a medias no puede dejar el capítulo sin su análisis anterior');
    t.eq('ya no trabaja', X.M.COTEJO.trabajando, false);
  }
  {
    const e = new Error('el navegador no deja'); e.sinTrabajadores = true;
    const X = orquesta({ transcribir: async () => { throw e; } });
    const r = await X.M.cotejarTodo();
    t.ok('si los trabajadores no arrancan, se hace en la propia página',
         X.diario.includes('preparar en la página') && X.diario.includes('en la página') && !!r);
  }
  {
    const e = new Error('el navegador no deja'); e.sinTrabajadores = true;
    const X = orquesta({ transcribir: async () => { throw e; }, preparaAqui: false });
    const r = await X.M.cotejarTodo();
    t.ok('y si en la página tampoco, se para sin inventar nada', r === null && !X.diario.includes('en la página'));
    t.ok('dejando lo de antes', 99 in X.w._cotejo);
  }
  {
    const X = orquesta({ transcribir: async () => { throw new Error('un tramo del audio no se pudo transcribir'); } });
    const r = await X.M.cotejarTodo();
    t.eq('un tramo que no se oye para el análisis', r, null);
    t.ok('sin repetirlo todo en la página', !X.diario.includes('en la página'),
         'solo tardaría más en fallar igual');
    t.ok('y la causa queda dicha', /no se pudo transcribir/.test(X.karIa.error || ''), String(X.karIa.error));
    t.eq('no es un «parado»', X.M.COTEJO.parado, false);
    t.eq('ya no trabaja', X.M.COTEJO.trabajando, false,
         'si se quedara en «trabajando», el botón ya no volvería a arrancar nunca');
  }
  {
    const X = orquesta({ sinVoz: true });
    const r = await X.M.cotejarTodo();
    t.ok('un audio sin ninguna voz se dice', r === null && /ninguna voz/.test(X.karIa.error || ''), String(X.karIa.error));
    t.ok('sin llamar al reconocedor', !X.diario.includes('trabajadores'));
  }
  {
    const X = orquesta({ audioFalla: true });
    const r = await X.M.cotejarTodo();
    t.ok('un audio que no se puede leer se dice', r === null && /no se pudo leer el audio/.test(X.karIa.error || ''));
    t.eq('y no se queda trabajando', X.M.COTEJO.trabajando, false);
  }
  {
    const X = orquesta({ sinAudio: true });
    t.eq('sin audio cargado no arranca', await X.M.cotejarTodo(), null);
    t.ok('y pide que se cargue', X.avisos.some(a => /carga el audio/i.test(a)));
  }
  {
    const X = orquesta({ fuera: 7 });
    const r = await X.M.cotejarTodo();
    t.eq('cuenta los que cayeron fuera del audio', r.fuera, 7);
  }
  {
    const X = orquesta();
    t.eq('el tiempo, en segundos', X.M.cotejoTardo(47.7), '48 s');
    t.eq('y en minutos cuando pasa de uno', X.M.cotejoTardo(135), '2 min 15 s');
    t.eq('minutos justos', X.M.cotejoTardo(120), '2 min');
  }
};
