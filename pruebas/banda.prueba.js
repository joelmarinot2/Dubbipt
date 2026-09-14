/* La banda rítmica · especificacion 04
 *
 * La banda es la tira de texto que se desplaza bajo la imagen contra una línea
 * fija. Cada palabra cruza esa línea en su instante. Tiene que cumplir DOS
 * cosas a la vez, y hasta ahora solo cumplia una:
 *
 *  · cada palabra empieza EN SU INSTANTE  (sincronia)
 *  · ninguna palabra se pisa con la de al lado  (se puede leer)
 *
 * Se dibujaban todas del mismo cuerpo desde su instante, asi que una palabra
 * larga dicha deprisa se comia a la siguiente. En una captura de sala se leia
 * «Peescaparon» y «cuandpudieron». Ahora cada palabra se estrecha para caber en
 * el hueco que va hasta la siguiente, que es lo que hace una banda ritmica de
 * verdad: las letras se aprietan con la velocidad del habla.
 *
 * El lienzo es de mentira y apunta cada trazo con su posicion y su ancho ya
 * escalado. La geometria es exacta -no depende de fuentes reales- porque el
 * ancho de un caracter se fija aqui: ANCHO_CAR por el cuerpo.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'La banda rítmica: a tiempo y sin pisarse';

const RECORTES = [
  ['/** Texto con sombra', '/** Parte una frase en renglones'],
  ['const SALA_CARRILES = 4;', 'function salaCarriles(cues){'],
  ['function salaCarriles(cues){', '/* ── Los pitidos'],
  ['function salaBandaCanvas(){', '/* ── El bucle']
];

const ANCHO_CAR = 0.6;      // ancho de un caracter = 0,6 · cuerpo
const ANCHO_CV  = 1000;     // ancho del lienzo, en pixeles
const PPS       = 150;      // pixeles por segundo
const MARCA     = 32;       // % de ancho donde esta la linea de sincronia

/** Un contexto de canvas que apunta lo que se dibuja, con su transformacion. */
function lienzo(){
  const trazos = [];
  const st = { font: '' };
  let m = { a: 1, e: 0 };               // escala en x y traslacion en x
  const pila = [];
  const cuerpo = () => parseFloat((st.font.match(/(\d+(?:\.\d+)?)px/) || [0, 10])[1]);
  const g = {
    save(){ pila.push({ ...m }); },
    restore(){ const p = pila.pop(); if(p) m = p; },
    translate(x){ m.e += m.a * x; },
    scale(kx){ m.a *= kx; },
    clearRect(){}, fillRect(){}, beginPath(){}, moveTo(){}, lineTo(){}, stroke(){}, arc(){},
    strokeText(){},
    measureText(s){ return { width: s.length * ANCHO_CAR * cuerpo() }; },
    fillText(s, x){
      trazos.push({ t: s, x: m.e + m.a * x,
                    w: s.length * ANCHO_CAR * cuerpo() * m.a, k: m.a });
    }
  };
  Object.defineProperty(g, 'font', { get: () => st.font, set: (v) => { st.font = v; } });
  for(const k of ['textAlign','textBaseline','lineWidth','strokeStyle','fillStyle',
                  'globalAlpha','shadowColor','shadowBlur'])
    Object.defineProperty(g, k, { get: () => st[k], set: (v) => { st[k] = v; } });
  return { g, trazos };
}

/** Pinta la banda con unas palabras dadas y devuelve los trazos de texto. */
function pintar(palabras, opts){
  opts = opts || {};
  const L = lienzo();
  const cv = { style: {}, width: 0, height: 0,
               getContext: () => L.g,
               getBoundingClientRect: () => ({ width: ANCHO_CV, height: 96 }) };
  const dom = { stLeft: { appendChild(){}, insertBefore(){} }, stStage: { nextSibling: null } };
  const cue = Object.assign({ si: 0, t0: 0, t1: 3, key: 'CHILD DEJU', display: 'CHILD DEJU',
                              talento: '', color: '#4ADE80', texto: 'sin repartir', carril: 0 },
                            opts.cue || {});
  const M = montar(RECORTES, ['salaBandaPintar'], {
    SALA: Object.assign({ banda: true, carriles: false, pps: PPS, bandaTam: 30,
                          marca: MARCA, marcaGrosor: 3, actor: false }, opts.SALA || {}),
    $: (id) => dom[id] || null,
    document: { getElementById: () => null, createElement: () => cv },
    window: { devicePixelRatio: 1 },
    salaCues: () => [cue],
    salaPalabrasCache: () => palabras,
    studioTc0: () => 0, studioFine: () => 0,
    console: { warn: () => {}, log: () => {} }
  });
  M.salaBandaPintar(opts.t != null ? opts.t : 0);
  // el primer trazo es el nombre del personaje; las palabras van detras
  return L.trazos.filter(z => z.t !== cue.display);
}

/* El caso de la captura: palabras largas dichas muy seguidas. */
const CAPTURA = [
  { p: 'Pe',        t0: 0.00, t1: 0.12 },
  { p: 'escaparon', t0: 0.12, t1: 0.60 },
  { p: 'cuando',    t0: 0.62, t1: 0.78 },
  { p: 'pudieron.', t0: 0.80, t1: 1.30 }
];

/** El primer par de palabras que se pisan, si lo hay. */
function pisada(trazos){
  for(let i = 0; i + 1 < trazos.length; i++){
    const a = trazos[i], b = trazos[i + 1];
    if(a.x + a.w > b.x + 0.01)
      return a.t + ' se pisa con ' + b.t + ' (acaba en ' + a.x.toFixed(1)
           + ' y la otra empieza en ' + b.x.toFixed(1) + ')';
  }
  return null;
}

exports.pruebas = function(t){
  const xLinea = ANCHO_CV * MARCA / 100;

  t.seccion('1 · el caso que llegó de sala: ninguna palabra se pisa');
  const z = pintar(CAPTURA);
  t.eq('se dibujan las cuatro palabras', z.length, 4);
  t.eq('y en su orden', z.map(x => x.t), ['Pe', 'escaparon', 'cuando', 'pudieron.']);
  t.eq('ninguna se pisa con la siguiente', pisada(z), null,
       'era el «Peescaparon» y el «cuandpudieron» de la captura');

  t.seccion('2 · y cada una sigue entrando en SU instante');
  for(let i = 0; i < CAPTURA.length; i++)
    t.cerca('«' + CAPTURA[i].p + '» cruza la línea a los ' + CAPTURA[i].t0 + ' s',
            z[i].x, xLinea + CAPTURA[i].t0 * PPS, 0.01);

  t.seccion('3 · lo que cambia es el ancho, no el cuerpo');
  t.ok('la palabra apretada se estrecha', z[1].k < 1, 'k = ' + z[1].k);
  t.ok('pero nunca por debajo del suelo de legibilidad',
       z.every(x => x.k >= 0.25 - 1e-9), 'una letra más fina que eso ya no se lee');
  t.ok('ninguna se estira más allá de su tamaño',
       z.every(x => x.k <= 1 + 1e-9), 'la banda no agranda palabras, solo las aprieta');

  t.seccion('4 · con tiempo de sobra, el texto va a su tamaño natural');
  const holgado = [
    { p: 'Me',     t0: 0.0, t1: 0.9 },
    { p: 'dejaron', t0: 1.0, t1: 2.0 },
    { p: 'sola',   t0: 2.2, t1: 2.9 }
  ];
  const zh = pintar(holgado, { cue: { t1: 4 } });
  t.eq('tampoco se pisan', pisada(zh), null);
  t.ok('y ninguna hace falta apretarla', zh.every(x => x.k > 0.999),
       'con hueco de sobra la letra no se toca: apretarla sin motivo se lee peor');

  t.seccion('5 · dos palabras en el mismo instante no rompen la banda');
  const pegadas = [
    { p: 'una', t0: 0.5, t1: 0.5 },
    { p: 'otra', t0: 0.5, t1: 1.2 }
  ];
  const zp = pintar(pegadas);
  t.eq('se dibujan las dos', zp.length, 2);
  t.ok('con un ancho finito', zp.every(x => isFinite(x.w) && x.w > 0),
       'un hueco de cero segundos daba una división por cero');

  t.seccion('6 · sin reparto de palabras, se pinta la frase entera');
  const zs = pintar(null);
  t.eq('sale el texto del cue', zs.map(x => x.t), ['sin repartir'],
       'es la red de seguridad: sin karaoke la banda no se queda en blanco');
};
