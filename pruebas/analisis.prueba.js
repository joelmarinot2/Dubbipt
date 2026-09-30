/* Analizar cambios · especificacion 01 (QC-22 a QC-31)
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

const R_MEDIDAS = ['/* Las medidas del análisis', '/* ── 0 · Con qué se escucha'];
const R_OIDOS   = ['/* ── 0 · Con qué se escucha', '/* ── 1 · Dónde hay voz'];
const R_VOZ     = ['/* ── 1 · Dónde hay voz', '/* ── 2 · Los tramos'];
const R_TRAMOS  = ['/* ── 2 · Los tramos', '/* ── 3 · Las palabras'];
const R_PALAB   = ['/* ── 3 · Las palabras', '/* ── 4 · A qué parlamento'];
const R_REPARTO = ['/* ── 4 · A qué parlamento', '/* ── 5 · El reparto del trabajo'];
const R_TRABAJO = ['/* ── 5 · El reparto del trabajo', '/** Las ventanas de los parlamentos'];

const callado = { warn: () => {}, log: () => {} };
const REAL = montar([R_MEDIDAS], ['ANA', 'ANA_TRABAJADOR'], {});

/** Un almacén de mentira. `roto` lo hace fallar como en una ventana privada. */
function almacen(inicial, roto){
  const d = Object.assign({}, inicial || {});
  return { d: d,
    getItem(k){ if(roto) throw new Error('prohibido'); return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
    setItem(k, v){ if(roto) throw new Error('prohibido'); d[k] = String(v); } };
}

/** Los oídos, con el almacén que se les dé. */
function oidos(ls){
  return montar([R_OIDOS],
    ['ANA_OIDOS', 'ANA_OIDO_DEFECTO', 'ANA_OIDO_GUARDADO', 'ANA_RITMO_GUARDADO', 'anaOido', 'anaOidoElegido',
     'anaOidoElegir', 'anaRitmo', 'anaRitmoGuardar', 'anaEstima', 'anaAviso', 'anaCuentaComoCambio'],
    { localStorage: ls || almacen(), console: callado });
}

/** Todo lo que decide, con las medidas de verdad o con otras. */
function logica(ana){
  return montar([R_VOZ, R_TRAMOS, R_PALAB, R_REPARTO],
    ['anaEnergia', 'anaUmbral', 'anaVoces', 'anaPartir', 'anaTramos', 'anaMontar', 'anaTiempo',
     'anaNumero', 'anaSinAcotaciones', 'anaFonetica', 'anaPalabras', 'anaUnir', 'anaJuntar', 'anaCasi', 'anaOidas',
     'anaCasar', 'anaParlamento', 'anaRepartir',
     'anaTrozos', 'anaEsGrafica', 'anaLigera', 'anaJuntarIx', 'anaDistancia', 'anaHolgura', 'ANA_GRAFICAS'],
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
  const M = montar([R_OIDOS, R_TRAMOS, R_TRABAJO],
    ['anaTranscribir', 'anaTranscribirAqui', 'anaCuantos', 'anaQueda', 'anaRespiro', 'anaParar',
     'anaTrabajador', 'ANA_ACTIVOS', 'ANA_OIDOS'],
    { ANA: Object.assign({}, REAL.ANA, { sr: 10, hueco: 0.1 }, ana || {}),
      ANA_TRABAJADOR: './js/analisis-worker.js',
      KARIA_LIB: 'lib', KARIA_MODELO: 'modelo',
      navigator: nav || { hardwareConcurrency: 4, deviceMemory: 8 },
      Worker: F.Worker, karIa: { pipe: null }, localStorage: almacen(), console: callado });
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

  t.seccion('0 · con qué se escucha');
  {
    const ls = almacen();
    const Oi = oidos(ls);
    t.eq('tres oídos, de más rápido a más fiel', Object.keys(Oi.ANA_OIDOS).join(','), 'rapido,fiel,muyfiel');
    t.eq('sin elegir, el fiel', Oi.anaOidoElegido(), 'fiel',
         'con el rápido, una palabra suelta cambiada no se avisa: por defecto tiene que ser el que sí');
    t.eq('lo que no es un oído, el de por defecto', Oi.anaOido('sordo') + '|' + Oi.anaOido(undefined), 'fiel|fiel');
    t.eq('ni lo que hereda cualquier objeto', Oi.anaOido('toString'), 'fiel',
         'sin mirar que sea suyo, «toString» pasaría por un oído y reventaría al usarlo');
    t.eq('se elige', Oi.anaOidoElegir('muyfiel'), 'muyfiel');
    t.eq('y se recuerda', Oi.anaOidoElegido(), 'muyfiel');
    t.eq('guardado con su nombre', ls.d[Oi.ANA_OIDO_GUARDADO], 'muyfiel');
    t.eq('elegir lo que no existe deja el de por defecto', Oi.anaOidoElegir('sordo'), 'fiel');
    const roto = oidos(almacen({}, true));
    let revienta = false;
    try{ roto.anaOidoElegir('rapido'); }catch(e){ revienta = true; }
    t.ok('sin almacén, elegir no revienta', !revienta, 'en una ventana privada el almacén falla al tocarlo');
    t.eq('y se usa el de por defecto', roto.anaOidoElegido(), 'fiel');
    const ls2 = almacen({ ddl_oido: 'muyfiel' });
    t.eq('lo guardado en otra sesión se lee', oidos(ls2).anaOidoElegido(), 'muyfiel');

    const O = Oi.ANA_OIDOS;
    t.ok('cada uno con su modelo, y distintos', new Set(Object.keys(O).map(k => O[k].modelo)).size === 3);
    t.ok('el rápido y el fiel oyen con la pieza que escucha SIN comprimir',
         ['rapido', 'fiel'].every(k => O[k].opciones && O[k].opciones.dtype
           && O[k].opciones.dtype.encoder_model === 'fp32' && O[k].opciones.dtype.decoder_model_merged === 'q8'),
         'comprimida a 8 bits se equivocaba un tercio más, y tarda lo mismo: medido');
    t.ok('los grandes, con menos trabajadores', O.rapido.trabajadores > O.fiel.trabajadores
         && O.fiel.trabajadores > O.muyfiel.trabajadores && O.muyfiel.trabajadores >= 1);
    t.ok('cada uno dice cuánto baja y qué es', Object.keys(O).every(k => O[k].mb > 0 && O[k].dice && O[k].nombre));
    t.ok('los fieles avisan de UNA palabra; el rápido pide más', O.fiel.dif === 1 && O.muyfiel.dif === 1 && O.rapido.dif > 1);

    t.eq('el ritmo, sin medir, el de la tabla', Oi.anaRitmo('fiel'), O.fiel.ritmo);
    t.ok('lo que tardó de verdad se apunta', Oi.anaRitmoGuardar('fiel', 90, 150));
    t.ok('distinto del de la tabla, para que se note cuál se usa', O.fiel.ritmo !== 0.6);
    t.cerca('y es lo que se usa después', Oi.anaRitmo('fiel'), 0.6, 1e-9);
    t.cerca('para decir cuánto va a tardar', Oi.anaEstima('fiel', 300), 180, 1e-9,
            'con el de la tabla diría otra cosa: el equipo de cada uno manda');
    t.eq('cada oído con su ritmo', Oi.anaRitmo('rapido'), O.rapido.ritmo);
    t.ok('un audio de menos de medio minuto de voz no se apunta', !Oi.anaRitmoGuardar('rapido', 10, 20),
         'casi todo ese tiempo es arrancar: no dice nada de lo que tarda un capítulo');
    t.eq('y no cambia nada', Oi.anaRitmo('rapido'), O.rapido.ritmo);
    t.ok('ni un tiempo que no es tiempo', !Oi.anaRitmoGuardar('fiel', 0, 100) && !Oi.anaRitmoGuardar('fiel', NaN, 100));
    const ls3 = almacen({ ddl_oido_ritmo: '{roto' });
    t.eq('con lo guardado roto, el de la tabla', oidos(ls3).anaRitmo('muyfiel'), O.muyfiel.ritmo);
    t.ok('y se puede volver a apuntar encima', oidos(ls3).anaRitmoGuardar('muyfiel', 100, 100));
    t.eq('sin voz, nada que estimar', Oi.anaEstima('fiel', 0), 0);

    const av = (r) => Oi.anaAviso(r, 0.45, 0.72);
    t.eq('lo de antes de los oídos, como antes: 0,30 no cuadra', av({ sim: 0.3 }), 'mal');
    t.eq('0,60 dudoso', av({ sim: 0.6 }), 'dudoso');
    t.eq('0,45 ya es dudoso, no «no cuadra»', av({ sim: 0.45 }), 'dudoso');
    t.eq('0,72 cuadra', av({ sim: 0.72 }), null);
    t.eq('con el fiel, una palabra distinta en una frase larga YA avisa', av({ sim: 0.95, dif: 1, o: 'fiel' }), 'dudoso',
         'por parecido, una palabra de veinte es un 95 % y pasaba por buena');
    t.eq('una casi igual sola, no', av({ sim: 0.95, dif: 0.5, o: 'fiel' }), null,
         'el reconocedor se come una ese a menudo: avisar de cada una es avisar de medio capítulo');
    t.eq('dos casi iguales, sí', av({ sim: 0.9, dif: 1, o: 'muyfiel' }), 'dudoso');
    t.eq('igual, nada', av({ sim: 1, dif: 0, o: 'fiel' }), null);
    t.eq('con el rápido, dos palabras distintas se toleran', av({ sim: 0.88, dif: 2, o: 'rapido' }), null);
    t.eq('tres, no', av({ sim: 0.85, dif: 3, o: 'rapido' }), 'dudoso');
    t.eq('ni una frase que no se parece, aunque sea corta', av({ sim: 0.5, dif: 2, o: 'rapido' }), 'dudoso');
    t.eq('lo que no cuadra no cuadra con ningún oído', av({ sim: 0.4, dif: 3, o: 'muyfiel' }), 'mal');
    t.eq('un oído que no existe se mide como antes', av({ sim: 0.95, dif: 1, o: 'sordo' }), null);
    t.eq('y sin la cuenta de palabras, también', av({ sim: 0.6, o: 'fiel' }), 'dudoso');
    t.eq('también con el rápido: sin cuenta, su listón no vale', av({ sim: 0.65, o: 'rapido' }), 'dudoso',
         'el 60 % del rápido va con su regla de las tres palabras; sin palabras que contar, el listón de antes');
    t.eq('ni lo que hereda cualquier objeto es un oído', av({ sim: 0.6, dif: 1, o: 'toString' }), 'dudoso',
         'tomado por oído, «toString» no tiene listón y el 60 % pasaría por bueno');
    t.eq('ni «constructor»', av({ sim: 0.6, dif: 1, o: 'constructor' }), 'dudoso');
    t.eq('sin resultado, nada', av(null), null);
  }

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

  t.seccion('6b · lo que se funde al hablar, y lo casi igual');
  /* Todo esto salió del premix de prueba oído con el oído fiel: eran la mitad
     de sus avisos falsos. */
  t.eq('«de espacio» es «despacio»', sim('Me lo cuentas despacio.', 'me lo cuentas de espacio'), 1);
  t.eq('«estado» es «he estado»', sim('He estado de viaje.', 'Estado de viaje.'), 1);
  t.eq('«esta segura» es «estás segura»: la ese se funde', sim('¿Estás segura?', 'esta segura'), 1);
  t.eq('«no os has» es «nos has»', sim('Qué susto nos has dado.', 'que susto no os has dado'), 1);
  t.eq('«de lospital» es «del hospital»: mismas letras, otro corte',
       sim('Son las normas del hospital.', 'son las normas de lospital'), 1);
  t.eq('«cerebre be» es «seré breve»', sim('No se preocupe, seré breve.', 'no se preocupe cerebre be'), 1);
  t.eq('«leer» partido en «le er» sigue siendo «leer»',
       L.anaJuntar(L.anaPalabras('quiero leer'), L.anaPalabras('quiero le er'))[1].join(' '),
       L.anaPalabras('quiero leer').join(' '), 'juntas tal cual, aunque fundidas no casen');
  t.eq('la erre no se funde: «dar risa» no es «darisa»', L.anaUnir('dar', 'risa'), 'darrisa');
  t.eq('ni la i', L.anaUnir('casi', 'ido'), 'casiido');
  t.eq('la ese sí', L.anaUnir('estas', 'segura'), 'estasegura');
  t.eq('y con una vacía, la otra tal cual', L.anaUnir('', 'sol') + '|' + L.anaUnir('sol', ''), 'sol|sol');
  t.eq('dos parejas que están tal cual en el otro lado no se tocan',
       L.anaJuntar(['de', 'la', 'sal'], ['de', 'la', 'sal']).map(x => x.join(' ')).join('|'), 'de la sal|de la sal');
  t.eq('una palabra cambiada sigue siendo un cambio', sim('Tuerce a la derecha.', 'tuerce a la izquierda') < 1, true);
  [['esta', 'estas'], ['deje', 'dejen'], ['puede', 'puedes'], ['de', 'del']]
    .forEach(([a, b]) => t.ok('«' + a + '» y «' + b + '» son casi iguales', L.anaCasi(L.anaFonetica(a), L.anaFonetica(b))
                                && L.anaCasi(L.anaFonetica(b), L.anaFonetica(a))));
  [['niño', 'niña'], ['hijo', 'hija']]
    .forEach(([a, b]) => t.ok('«' + a + '» y «' + b + '» NO son casi iguales', !L.anaCasi(L.anaFonetica(a), L.anaFonetica(b)),
                              'cambiar una letra por otra es otra palabra: niño y niña es un cambio de verdad'));
  t.ok('«a» y «as» tampoco: en una palabra de una letra, una más es otra palabra', !L.anaCasi('a', 'as'));
  [['hola', 'hola'], ['dia', 'dias2'], ['casa', 'casitas'], ['', 'y']]
    .forEach(([a, b]) => t.ok('«' + a + '» y «' + b + '» no son «casi» iguales', !L.anaCasi(a, b),
                              'iguales no es casi, y dos letras de más ya es otra palabra'));
  t.ok('la letra de más puede ir en medio', L.anaCasi('kasa', 'kaxsa'));
  const ca = L.anaCasar(['esta', 'bien'], ['estas', 'bien']);
  t.cerca('una casi igual cuenta media', ca.comunes, 1.5, 1e-9);
  t.cerca('y media palabra de diferencia', ca.dif, 0.5, 1e-9);
  const c8 = L.anaCasar(L.anaPalabras('Si todo va bien, en unos diez días.'), L.anaPalabras('si todo va bien en unos quince días'));
  t.eq('una palabra cambiada es una de diferencia', c8.dif, 1);
  const c6 = L.anaCasar(L.anaPalabras('Mamá pregunta por ti todos los días.'),
                        L.anaPalabras('Mamá pregunta por ti todos los días y todas las noches sin parar.'));
  t.eq('seis añadidas son seis', c6.dif, 6);
  t.eq('contra nada, todas', L.anaCasar(['a', 'b', 'c'], []).dif, 3);

  t.seccion('6c · lo que no se dobla, lo que pesa poco y lo que cambió, marcado');
  /* Pedido de sala, con el informe de Dofus delante: 568 «cambios» de 710
     parlamentos, y la mayoría no lo eran. */
  ['TEXTO', 'GRÁFICA', 'Gráfica', 'INSERTO', 'CARTEL', 'LETRERO', 'RÓTULO', 'TÍTULO', 'TEXTO 2', 'GRÁFICA EN PANTALLA']
    .forEach(g => t.ok('«' + g + '» es una gráfica: no se dobla', L.anaEsGrafica(g)));
  ['JORIS', 'NARRADORA', 'TEXTORIO', 'CARTELERO', 'REY DE BONTA', '', null]
    .forEach(g => t.ok('«' + g + '» no lo es', !L.anaEsGrafica(g)));
  const una = (x) => L.anaPalabras(x)[0];
  t.ok('«y», «además», «bueno», «pues» pesan poco', ['y', 'además', 'bueno', 'pues', 'que', 'muy'].every(x => L.anaLigera(una(x))));
  t.ok('«no», «nunca», «casa», «Bakara» pesan', ['no', 'nunca', 'casa', 'Bakara', 'nadie'].every(x => !L.anaLigera(una(x))),
       'quitar una negación cambia la frase entera');
  /* Los nombres propios, que el reconocedor escribe como le suenan. */
  t.ok('«liluta» es casi «lilota»: una letra cambiada en una palabra larga', L.anaCasi(L.anaFonetica('Liluta'), L.anaFonetica('Lilota')));
  t.ok('«gordias» es casi «guardias»: dos letras en una de siete', L.anaCasi(una('Gordias'), una('Guardias')));
  t.ok('pero «hija» sigue sin ser «hijo», ni «casa» «cosa»', !L.anaCasi('ija', 'ijo') && !L.anaCasi('kasa', 'kosa'),
       'en una palabra corta, una letra cambiada es otra palabra');
  t.ok('ni dos letras en una de seis', !L.anaCasi('lilota', 'lulita'));
  t.ok('ni cuatro letras en una de siete: «palabra» no es «palomar»', !L.anaCasi('palabra', 'palomar'));
  t.eq('la distancia entre palabras, con tope', [L.anaDistancia('gordias', 'guardias', 2), L.anaDistancia('abc', 'xyz', 2), L.anaDistancia('igual', 'igual', 2)].join(','), '2,3,0');
  t.eq('más allá del tope da igual cuántas: se para y dice tope más uno', L.anaDistancia('aaaaaaa', 'bbbbbbb', 2), 3);
  /* Los trozos: cada palabra con sus signos, cada acotación entera. */
  const tz = L.anaTrozos('(JADEA) ¿Tú? Bueno, 1.500 —dijo— (RÍE)');
  t.eq('cada palabra es un trozo con sus signos, y cada acotación uno sin palabras',
       tz.map(x => x.txt + ':' + x.p.length).join('|'), '(JADEA):0|¿Tú?:1|Bueno,:1|1.500:2|—dijo—:1|(RÍE):0');
  t.eq('una raya entre dos palabras parte, como siempre', L.anaTrozos('bien-estar').map(x => x.txt).join('|'), 'bien-|estar');
  t.eq('y las palabras de los trozos son las de siempre', tz.reduce((a, x) => a.concat(x.p), []).join(' '), L.anaPalabras('Tú bueno mil quinientos dijo').join(' '));
  /* Las marcas: qué palabra faltó, cuál sobró, cuál es casi. */
  const M1 = L.anaCasar(L.anaPalabras('Tampoco es que me cambie tanto, y un huérfano puede elegir.'),
                        L.anaPalabras('Tampoco es que me cambié tanto. Además, un huérfano puede elegir.'));
  t.eq('en lo escrito, la «y» falta', M1.me, 'iiiiiifiiii');
  t.eq('en lo oído, «además» sobra', M1.mo, 'iiiiiisiiii');
  t.eq('y como las dos pesan poco, el cambio no pesa', M1.pesada, 0);
  const M2 = L.anaCasar(L.anaPalabras('Tuerce a la derecha.'), L.anaPalabras('tuerce a la izquierda'));
  t.eq('una palabra por otra: falta una y sobra otra', M2.me + ' ' + M2.mo, 'iiif iiis');
  t.eq('y pesa', M2.pesada, 2);
  const M3 = L.anaCasar(L.anaPalabras('Esta bien'), L.anaPalabras('Estás bien'));
  t.eq('la casi igual va marcada como casi en los dos lados', M3.me + ' ' + M3.mo, 'ci ci');
  const M4 = L.anaCasar(L.anaPalabras('Ha dormido bien'), L.anaPalabras('Adormido bien'));
  t.eq('dos palabras que se oyeron juntas se marcan las dos como oídas', M4.me + ' ' + M4.mo, 'iii ii',
       'la marca vuelve a las palabras de entrada, no a la juntada');
  const M5 = L.anaCasar(L.anaPalabras('Ven aquí'), []);
  t.eq('contra nada, todas faltan', M5.me + '|' + M5.mo + '|' + M5.pesada, 'ff||1');
  t.ok('las marcas también cuando lo oído es más largo', L.anaCasar(['a'], ['a', 'b', 'c']).mo === 'iss');
  /* La holgura de los bordes: gruesa con los timecodes en segundos enteros. */
  t.eq('timecodes enteros: un segundo', L.anaHolgura([3611, 3615, 3619]), 1);
  t.eq('con fotogramas, la de siempre', L.anaHolgura([3611.16, 3615.36]), 0.3);
  t.eq('sin ninguno, la de siempre', L.anaHolgura([]), 0.3);
  {
    /* El caso de Dofus: «hecha» de Julith, dicho en el primer segundo del
       parlamento del soldado, se le colgaba a la fuerza y bajaba el parecido. */
    const ww = (x, tt) => ({ p: una(x), t: tt, txt: x });
    const OO = [ww('hecha', 12.4), ww('gordias', 12.9), ww('atrapenla', 13.3)];
    const V = [{ si: 0, texto: '¡Guardias! ¡Atrápenla!', v0: 12, v1: 15 }];
    const fina = L.anaRepartir(V, OO, 100, { holgura: 0.3 }).por[0];
    const gruesa = L.anaRepartir(V, OO, 100, { holgura: 1 }).por[0];
    t.ok('con la holgura fina, «hecha» se cuela y baja el parecido', fina.sim < gruesa.sim, fina.sim + ' / ' + gruesa.sim);
    t.eq('con la gruesa, se lee bien: «gordias» es casi «guardias»', gruesa.sim, 0.75);
    t.eq('y lo oído es solo lo suyo', gruesa.oido, 'gordias atrapenla');
    t.eq('las marcas viajan con el resultado', gruesa.me + ' ' + gruesa.mo, 'ci ci');
    t.eq('y se apunta que es muy corto', gruesa.corto, true);
    /* Una palabra oída que se convirtió en varias -«42»- es un solo trozo en
       lo oído, y se lleva la peor de las marcas de sus palabras. */
    const oidas42 = L.anaOidas([{ text: ' tengo', timestamp: [0.1, 0.3] }, { text: ' 42', timestamp: [0.5, 0.8] }], [{ t: 0, a: 20, d: 5 }]);
    const r42 = L.anaRepartir([{ si: 0, texto: 'Tengo cuarenta.', v0: 20, v1: 23 }], oidas42, 100, { holgura: 0.3 });
    t.eq('lo oído se escribe una vez por palabra oída', r42.por[0].oido, 'tengo 42');
    t.eq('y «42» lleva la marca de lo que sobra, que «y dos» no estaba escrito', r42.por[0].mo, 'is');
  }
  {
    /* Las ventanas del capítulo: las gráficas se quedan fuera, y se cuentan. */
    const V = montar([['/** Las ventanas de los parlamentos', '/** De lo que hay que comparar']], ['anaVentanas'], {
      script: [{ tcEff: 10, who: 'TEXTO', key: 'TEXTO', lines: ['Un Dofus es un huevo'] },
               { tcEff: 20, who: 'NARRADORA', key: 'NARRADORA', lines: ['El Dofus Marfil'] },
               { tcEff: 30, who: 'GRÁFICA', key: 'GRAFICA', lines: ['DOFUS'] },
               { tcEff: 40, who: 'JORIS', key: 'JORIS', lines: ['(GRITA)'] },
               { tcEff: null, who: 'JORIS', key: 'JORIS', lines: ['sin tiempo'] }],
      karVentana: (si) => [10 * (si + 1), 10 * (si + 1) + 5], karVid: (t) => t - 5,
      anaEsGrafica: L.anaEsGrafica, console: callado });
    const vs = V.anaVentanas();
    t.eq('las gráficas no entran en el análisis', vs.map(v => v.si).join(','), '1,3');
    t.eq('y se cuentan, para decirlo', vs.graficas, 2);
    t.eq('cada ventana lleva su timecode del libreto, para saber si son enteros', vs[0].tc, 20);
  }
  {
    /* Lo que decide el aviso con todo eso. */
    const A = oidos();
    const av = (r) => A.anaAviso(Object.assign({ o: 'fiel' }, r), 0.45, 0.72);
    t.eq('cuadra: nada', av({ sim: 1, dif: 0, pesada: 0 }), null);
    t.eq('una palabra que pesa, dudoso, como siempre', av({ sim: 0.9, dif: 1, pesada: 2 }), 'dudoso');
    t.eq('solo ligeras o casi iguales: leve', av({ sim: 0.9, dif: 1, pesada: 0 }), 'leve');
    t.eq('leve aunque sean varias, si ninguna pesa', av({ sim: 0.75, dif: 2.5, pesada: 0 }), 'leve');
    t.eq('pero sin llegar a no cuadrar', av({ sim: 0.3, dif: 5, pesada: 0 }), 'mal');
    t.eq('muy corto y no se oyó nada: sin comprobar', av({ sim: 0, dif: 1, pesada: 1, n: 0, corto: true }), 'sin');
    t.eq('muy corto y se oyó UNA palabra de otro: sin comprobar', av({ sim: 0, dif: 2, pesada: 2, n: 1, corto: true }), 'sin');
    t.eq('muy corto y se oye claramente otra frase: no cuadra', av({ sim: 0.1, dif: 3, pesada: 3, n: 3, corto: true }), 'mal');
    t.eq('muy corto que cuadra, cuadra', av({ sim: 1, dif: 0, pesada: 0, n: 2, corto: true }), null);
    t.eq('un resultado de antes, sin marcas, se mide como antes', av({ sim: 0.9, dif: 1 }), 'dudoso');
    t.ok('solo no cuadra y dudoso cuentan como cambio',
         A.anaCuentaComoCambio('mal') && A.anaCuentaComoCambio('dudoso') && !A.anaCuentaComoCambio('leve') && !A.anaCuentaComoCambio('sin') && !A.anaCuentaComoCambio(null));
  }

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
  t.eq('y una palabra de diferencia, que es lo que decide el aviso', R2.por[1].dif, 1);
  t.eq('lo que cuadra, ninguna', R.por[0].dif, 0);
  const R3 = L.anaRepartir([{ si: 2, texto: 'Hola, amigo.', v0: 30, v1: 34 }],
                           [w('hola', 30.5), w('amigo', 31), w('que', 31.5), w('tal', 32), w('estas', 32.5)], 100);
  t.eq('lo que cae BIEN DENTRO es suyo, coincida o no', R3.por[2].sim, 0.4,
       'si se pudiera dejar fuera lo que sobra, las palabras añadidas no saldrían nunca');
  const R4 = L.anaRepartir([{ si: 3, texto: 'Yo prefiero quedarme.', v0: 50, v1: 52 }], O, 100);
  t.eq('lo que no se dijo, cero', R4.por[3].sim, 0);
  t.eq('y oído, nada', R4.por[3].oido, '');
  t.eq('lo que no se dijo son todas sus palabras de diferencia', R4.por[3].dif, 3);
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
  t.eq('un oído grande pone su tope', Rp.anaCuantos(16, 10, 16, 2), 2,
       'cada copia de un modelo grande pesa tanto que con más no se gana: se pelean por la memoria');
  t.eq('su tope, pero no más que núcleos', Rp.anaCuantos(3, 10, 16, 3), 2);
  t.eq('ni más que el tope de siempre', Rp.anaCuantos(16, 10, 16, 9), 4);
  t.eq('sin tope, el de siempre', Rp.anaCuantos(16, 10, 16, 0), 4);
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
    const prep = M._creados.map(w => w.recibidos[0]);
    t.ok('sin decir oído, se oye con el fiel', prep.every(p => p.modelo === M.ANA_OIDOS.fiel.modelo),
         JSON.stringify(prep.map(p => p.modelo)));
    t.ok('con sus opciones: la pieza que escucha, sin comprimir',
         prep.every(p => p.opciones && p.opciones.dtype && p.opciones.dtype.encoder_model === 'fp32'));
  }
  {
    const M = reparto(null, { hardwareConcurrency: 16, deviceMemory: 16 });
    const { pcm, tramos } = tramosDePrueba(6);
    const r = await conTope(M.anaTranscribir(pcm, tramos, { oido: 'muyfiel' }));
    t.eq('con el muy fiel también se oyen todos', r && r.length, 6);
    t.ok('con su modelo', M._creados.every(w => w.recibidos[0].modelo === M.ANA_OIDOS.muyfiel.modelo));
    t.eq('y con sus dos trabajadores, aunque haya dieciséis núcleos', M._creados.length, 2);
    const R2 = reparto(null, { hardwareConcurrency: 16, deviceMemory: 16 });
    await conTope(R2.anaTranscribir(pcm, tramos, { oido: 'rapido' }));
    t.eq('el rápido, con cuatro', R2._creados.length, 4);
    t.ok('y el suyo', R2._creados.every(w => w.recibidos[0].modelo === R2.ANA_OIDOS.rapido.modelo));
    const R3 = reparto();
    await conTope(R3.anaTranscribir(pcm, tramos, { oido: 'sordo' }));
    t.ok('un oído que no existe, el de por defecto', R3._creados.every(w => w.recibidos[0].modelo === R3.ANA_OIDOS.fiel.modelo));
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
  {
    /* Al actualizar la app, el service worker tira sus cajas viejas. Tiraba
       TODAS las que no eran la suya, y entre ellas la del modelo de voz: con
       cada versión había que volver a bajar el oído, 60 a 240 MB. Se vio
       validando la app en el navegador. Se corre el sw.js de verdad. */
    const version = (sw.match(/const VERSION = '([^']+)'/) || [])[1];
    const oyentes = {}, tiradas = [];
    const yo = { addEventListener: (ev, f) => { oyentes[ev] = f; }, skipWaiting: () => {},
                 clients: { claim: async () => {} }, location: { origin: 'https://dubbipt.vercel.app' } };
    const cajas = { keys: async () => ['dubbipt-2020-01-01T00:00', 'dubbipt-' + version, 'transformers-cache', 'otra-cosa'],
                    delete: async (k) => { tiradas.push(k); return true; },
                    open: async () => ({ addAll: async () => {} }) };
    new Function('self', 'caches', sw)(yo, cajas);
    let espera = null;
    oyentes.activate({ waitUntil: (p) => { espera = p; } });
    await espera;
    t.eq('al actualizar se tiran solo las cajas viejas de Dubbipt', tiradas.join(','), 'dubbipt-2020-01-01T00:00',
         'la del modelo de voz la llena la librería del reconocedor: no es nuestra, y tirarla es bajar el oído otra vez');
  }

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
      anaPlan: () => ({ tramos: o.sinVoz ? [] : [{ piezas: [{ a: 0, b: 5 }], dur: 5 }], duracion: 300, voz: o.voz || 5 }),
      anaVentanas: () => { const v = o.ventanas || [{ si: 0, texto: 'a', v0: 1, v1: 2, tc: 3601 }]; v.graficas = o.graficas || 0; return v; },
      anaTranscribir: o.transcribir || (async () => { diario.push('trabajadores'); return [{ items: [], mapa: [] }]; }),
      anaTranscribirAqui: async () => { diario.push('en la página'); return [{ items: [], mapa: [] }]; },
      anaOidas: () => [],
      /* La holgura, la de verdad: gruesa con los timecodes enteros. */
      anaHolgura: (tcs) => (tcs.length && tcs.every(t => t === Math.round(t))) ? 1 : 0.3,
      anaRepartir: (v, p, d, op) => { diario.push('holgura ' + (op && op.holgura));
                            return { por: o.por || { 0: { sim: 1, oido: 'a' }, 1: { sim: 0.3, oido: 'b' }, 2: { sim: 0.6, oido: 'c' } },
                            fuera: o.fuera || 0, sinTexto: 0 }; },
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
      localStorage: o.ls || almacen(),
      console: callado
    };
    /* Los oídos, los de verdad: de ellos depende qué se avisa. */
    const M = montar([R_OIDOS, ['/* `total`, `vistos`, `mal` y `dudosos`', '/* ── El panel de los planos']],
                     ['cotejarTodo', 'COTEJO', 'cotejoTardo', 'cotejoAviso', 'cotejoOidoUsado'], ctx);
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
    t.ok('dice cuánto ha tardado', X.avisos.some(a => /analizados con el oído fiel en \d+ s/.test(a)), JSON.stringify(X.avisos));
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
    t.ok('con los timecodes en segundos enteros, un segundo de holgura en los bordes', X.diario.includes('holgura 1'),
         'si no, el final del parlamento de antes se colgaba de este: «hecho ¡Gordias!»');
    const F = orquesta({ ventanas: [{ si: 0, texto: 'a', v0: 1, v1: 2, tc: 3601.24 }] });
    await F.M.cotejarTodo();
    t.ok('con fotogramas, la de siempre', F.diario.includes('holgura 0.3'));
  }
  {
    /* Lo que no cuenta como cambio se cuenta aparte, y las gráficas se dicen. */
    const X = orquesta({ graficas: 2, por: { 0: { sim: 1, oido: 'a', dif: 0, pesada: 0 },
                                             1: { sim: 0.3, oido: 'b', dif: 2, pesada: 2 },
                                             2: { sim: 0.9, oido: 'c', dif: 1, pesada: 0 },
                                             3: { sim: 0, oido: '', dif: 1, pesada: 1, n: 0, corto: true } } });
    const r = await X.M.cotejarTodo();
    t.eq('no cuadran, dudosos, leves y sin comprobar, cada uno en su cuenta',
         [r.hechos, r.mal, r.dudosos, r.leves, r.sin, r.graficas].join('/'), '4/1/0/1/1/2');
    t.ok('y se dicen', X.avisos.some(a => /1 no cuadran · 0 dudosos · 1 leves · 1 sin comprobar · 2 gráficas sin analizar/.test(a)),
         JSON.stringify(X.avisos.slice(-2)));
    t.eq('un cambio leve se avisa como leve, con sus marcas', X.M.cotejoAviso(2) && X.M.cotejoAviso(2).nivel, 'leve');
    t.eq('y el muy corto del que no se oyó nada, sin comprobar', X.M.cotejoAviso(3) && X.M.cotejoAviso(3).et, 'sin comprobar');
  }

  t.seccion('12b · el análisis, con el oído elegido');
  {
    let pedido = null;
    const ls = almacen({ ddl_oido: 'muyfiel' });
    const X = orquesta({ ls: ls, voz: 120,
      por: { 0: { sim: 1, dif: 0, oido: 'a' }, 1: { sim: 0.3, dif: 4, oido: 'b' }, 2: { sim: 0.95, dif: 1, oido: 'c' },
             3: { sim: 0.97, dif: 0.5, oido: 'd' } },
      transcribir: async (pcm, tramos, o) => {
        pedido = o;
        o.avisa(0, 5, 1);
        await new Promise(r => setTimeout(r, 30));
        o.avisa(5, 5, 1);
        return [{ items: [], mapa: [] }];
      } });
    const r = await X.M.cotejarTodo();
    t.eq('se oye con el oído elegido', pedido && pedido.oido, 'muyfiel');
    t.ok('cada resultado dice con qué oído se oyó', ['0', '1', '2', '3'].every(k => X.w._cotejo[k].o === 'muyfiel'),
         JSON.stringify(X.w._cotejo));
    t.eq('y se cuenta con SU listón: una palabra distinta es dudosa, media no', r.mal + '/' + r.dudosos, '1/1',
         'con el listón de antes, el 95 % habría pasado por bueno');
    t.eq('lo mismo que dice después cada parlamento', X.M.cotejoAviso(2) && X.M.cotejoAviso(2).nivel, 'dudoso');
    t.eq('el casi igual, sin aviso', X.M.cotejoAviso(3), null);
    t.ok('el aviso dice el oído', X.avisos.some(a => /con el oído muy fiel/.test(a)), JSON.stringify(X.avisos));
    t.eq('y lo devuelve, para el informe', r.oido + '|' + r.oidoNombre, 'muyfiel|muy fiel');
    t.eq('el informe sabe con qué se oyó', X.M.cotejoOidoUsado(), 'muy fiel');
    const ritmo = JSON.parse(ls.d.ddl_oido_ritmo || '{}');
    t.ok('lo que tardó queda apuntado para la próxima vez', ritmo.muyfiel > 0 && ritmo.muyfiel < 1,
         JSON.stringify(ritmo));
  }
  {
    const X = orquesta({ por: { 0: { sim: 0.95, dif: 1, oido: 'a' } } });
    const r = await X.M.cotejarTodo();
    t.eq('sin elegir, con el fiel', X.w._cotejo[0].o, 'fiel');
    t.eq('que también avisa de una palabra', r.dudosos, 1);
  }
  {
    const X = orquesta({ ls: almacen({ ddl_oido: 'rapido' }), por: { 0: { sim: 0.9, dif: 2, oido: 'a' } } });
    const r = await X.M.cotejarTodo();
    t.eq('con el rápido, dos palabras distintas no avisan', r.dudosos, 0,
         'se equivoca en una o dos a menudo: avisaría de medio capítulo');
  }
  {
    const e = new Error('el navegador no deja'); e.sinTrabajadores = true;
    const X = orquesta({ transcribir: async () => { throw e; }, por: { 0: { sim: 0.95, dif: 1, oido: 'a' } } });
    const r = await X.M.cotejarTodo();
    t.ok('oído en la propia página, el resultado NO lleva oído', !('o' in X.w._cotejo[0]),
         'ahí se oye con el de siempre: medirlo con el listón del fiel sería inventarse avisos');
    t.eq('y se mide como antes: el 95 % cuadra', r.dudosos, 0);
    t.eq('sin decir un oído que no se usó', r.oidoNombre, '');
  }
  {
    const X = orquesta();
    X.w._cotejo = { 0: { sim: 1 }, 1: { sim: 1, o: 'fiel' }, 2: { sim: 1, o: 'fiel' }, 3: { sim: 1, o: 'rapido' } };
    t.eq('con varios, el que más oyó', X.M.cotejoOidoUsado(), 'fiel');
    X.w._cotejo = { 0: { sim: 1 } };
    t.eq('lo de antes de los oídos, sin nombre', X.M.cotejoOidoUsado(), '');
  }
  {
    const X = orquesta();
    t.eq('el tiempo, en segundos', X.M.cotejoTardo(47.7), '48 s');
    t.eq('y en minutos cuando pasa de uno', X.M.cotejoTardo(135), '2 min 15 s');
    t.eq('minutos justos', X.M.cotejoTardo(120), '2 min');
  }
};
