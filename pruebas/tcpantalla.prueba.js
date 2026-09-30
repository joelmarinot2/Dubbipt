/* Timecode de Pro Tools leido de la pantalla · especificacion 09
 *
 * Lo que de verdad hay que demostrar aqui no es que sepa leer cifras: es que
 * SIGA BIEN AUNQUE NO SEPA. Leer una pantalla falla, y falla mucho. La seccion
 * 8 es el corazon de esta prueba: se simula una sesion con la mitad de las
 * lecturas inventadas y se exige que el reloj no se mueva ni un fotograma de
 * donde va Pro Tools de verdad.
 *
 * Las cifras se dibujan aqui a mano, como un contador de siete segmentos, para
 * poder probar el reconocimiento entero sin navegador: no hay canvas en Node,
 * asi que se sustituye tcpFoto por un generador de pantallas de mentira.
 */
'use strict';
const { montar, trozo, fuentes } = require('./ayuda');
const fs = require('fs');
const path = require('path');

exports.nombre = 'El libreto sigue al contador de Pro Tools, no al vídeo';


/* ── El reloj falso ────────────────────────────────────────────────────── */

let ahora = 1000;
const perf = { now: () => ahora };

const avisos = [];
const latidos = [];

const guardado = {};
const almacen = {
  getItem: (k) => (k in guardado ? guardado[k] : null),
  setItem: (k, v) => { guardado[k] = String(v); },
  removeItem: (k) => { delete guardado[k]; }
};

/* Un navegador de mentira: lo justo para probar el camino de compartir. */
let videoQueSale = () => ({ play: async () => {}, videoWidth: 0, videoHeight: 0 });
/* Y un lienzo de mentira que apunta lo que se le dibuja y con qué tamaño. */
const trazos = [];
const lienzoDeMentira = () => {
  const c = { width: 0, height: 0 };
  c.getContext = () => ({
    drawImage: (...a) => { trazos.push(a); },
    getImageData: (x, y, w, h) => ({ data: new Uint8ClampedArray(w * h * 4) })
  });
  return c;
};
const doc = { createElement: (q) => (q === 'video' ? videoQueSale() : q === 'canvas' ? lienzoDeMentira() : {}) };
let restriccionesPedidas = null;
const nav = { mediaDevices: { getDisplayMedia: null } };
const pista = () => ({ addEventListener: () => {}, stop: () => {} });
const arroyo = () => ({ getVideoTracks: () => [pista()], getTracks: () => [pista()] });

const M = montar(
  [['const TCP_W = 12', '/* ── El panel ──']],
  ['TCP', 'TCP_TOL', 'TCP_SEGUIDAS', 'tcpTexto', 'tcpSegundos', 'tcpFaltan',
   'tcpAhora', 'tcpFuente', 'tcpRecta', 'tcpAnclar', 'tcpMirar',
   'tcpGrupos', 'tcpFilas', 'tcpLayout', 'tcpCelda', 'tcpParecido', 'tcpCasar',
   'tcpLeerUna', 'tcpEnsenar', 'tcpAprender', 'tcpActivo', 'tcpParar', 'tcpGuardar',
   'ponFoto: (f) => { tcpFoto = f; }',
   'tcpCompartir', 'tcpPrimerFotograma', 'tcpSoltar',
   'ponLeer: (f) => { tcpLeerUna = f; }',
   'tcpAprendizajeNuevo', 'tcpAprendizajePaso', 'tcpAprendizajeGuardar', 'tcpAprenderVuelta',
   'TCP_IGUAL', 'TCP_GEMELA', 'TCP_APRENDER_S',
   'tcpRecortar', 'tcpDentroDe', 'tcpQueFalta', 'tcpFoto: () => tcpFoto',
   'tcpFranjas', 'tcpDosPuntos', 'tcpSeparadores', 'tcpGruposEn', 'tcpPasoCifra',
   'tcpLayoutPuntos', 'tcpLayoutTrozos', 'tcpCorridas', 'tcpAlinear',
   'tcpCargar', 'tcpOlvidar', 'tcpPorQueNoLee', 'tcpArrancar', 'tcpFotoDeVerdad: tcpFoto', 'TCP_FOTO_MAX',
   'TCP_HOLGURA', 'TCP_RENUEVA', 'TCP_AVISO_MS', 'TCP_GUARDADO_V',
   'TCP_SUAVE', 'TCP_PERIODO_MS', 'tcpRetardo',
   'TCP_QUIETAS', 'TCP_RITMO_MAX', 'TCP_RUEDA', 'tcpQuieto', 'tcpApuntar', 'tcpDiagnosticoTexto', 'verDiario: () => TCP._diario'],
  { performance: perf, localStorage: almacen, document: doc, navigator: nav,
    castAviso: (t) => { avisos.push(String(t)); },
    /* El latido del trabajador de la aplicación, de mentira: se apunta a qué
       ritmo se pide y se le da a mano. */
    tcpLatido: (ms, fn) => { const L = { ms: ms, fn: fn, parado: false }; latidos.push(L); return { parar(){ L.parado = true; } }; } }
);
const TCP = M.TCP;

/* ── Cifras de siete segmentos, para tener una pantalla que leer ───────── */

const SEG7 = { '0':'abcdef', '1':'bc', '2':'abdeg', '3':'abcdg', '4':'bcfg',
               '5':'acdfg', '6':'acdefg', '7':'abc', '8':'abcdefg', '9':'abcdfg' };

function pintaCifra(d, w, h, gro){
  const g = new Float32Array(w * h);
  const s = SEG7[String(d)] || '';
  const G = Math.max(1, gro || 2);
  const put = (x, y) => { if(x >= 0 && x < w && y >= 0 && y < h) g[y * w + x] = 1; };
  const hl = (y) => { for(let k = 0; k < G; k++) for(let x = G; x < w - G; x++) put(x, y + k); };
  const vl = (x, y0, y1) => { for(let k = 0; k < G; k++) for(let y = y0; y <= y1; y++) put(x + k, y); };
  const m = (h - G) >> 1;
  if(s.indexOf('a') >= 0) hl(0);
  if(s.indexOf('g') >= 0) hl(m);
  if(s.indexOf('d') >= 0) hl(h - G);
  if(s.indexOf('f') >= 0) vl(0, G, m - 1);
  if(s.indexOf('b') >= 0) vl(w - G, G, m - 1);
  if(s.indexOf('e') >= 0) vl(0, m + G, h - G - 1);
  if(s.indexOf('c') >= 0) vl(w - G, m + G, h - G - 1);
  return g;
}

/**
 * Una pantalla de mentira con un timecode escrito: ocho cifras y tres dos
 * puntos, con sus huecos y su margen, igual que el contador grande.
 * `opt.sinPuntos` la hace sin separadores, para probar ese caso.
 *
 * Y lo que tiene la letra de verdad y rompía el reparto por trozos:
 *   · `aire`: hueco de más a cada lado de los dos puntos, como en una letra de
 *     ancho fijo, donde unos dos puntos ocupan lo que una cifra;
 *   · `pegadas`: las dos cifras de cada pareja tocándose, como en letra pequeña;
 *   · `delante`: algo escrito a la izquierda en la misma franja, como la
 *     etiqueta «Main» del contador;
 *   · `baile`: cada cifra corrida unos píxeles de su sitio;
 *   · `tenue`: los dos puntos en gris, como salen pequeños y algo borrosos;
 *   · `corre3`: el tercer dos puntos corrido esos píxeles de su sitio.
 * Devuelve además `cifras`: dónde cae el centro del sitio de cada cifra.
 */
function pantalla(txt, opt){
  const o = opt || {};
  const t8 = String(txt).replace(/[^0-9]/g, '');
  const cw = o.cw || 18, ch = o.ch || 28, hueco = o.hueco || 7;
  const sw = o.sw || 5, pad = o.pad || 6, gro = o.gro || 3;
  const aire = o.aire || 0;
  const items = [];
  if(o.delante) for(let k = 0; k < 3; k++) items.push({ tipo: 'x', w: 7 });
  for(let i = 0; i < 8; i++){
    items.push({ tipo: 'd', d: t8[i], w: cw, i: i });
    if(!o.sinPuntos && (i === 1 || i === 3 || i === 5)) items.push({ tipo: 's', w: sw });
  }
  const espacio = (i) => {
    if(!i) return 0;
    const a = items[i - 1], b = items[i];
    if(a.tipo === 's' || b.tipo === 's') return hueco + aire;
    if(o.pegadas && a.tipo === 'd' && b.tipo === 'd' && (a.i & 1) === 0) return 0;
    return hueco;
  };
  let W = pad * 2, H = ch + pad * 2;
  items.forEach((it, i) => { W += it.w + espacio(i); });
  const g = new Float32Array(W * H);
  const cifras = [];
  let x = pad;
  items.forEach((it, i) => {
    x += espacio(i);
    if(it.tipo === 'd'){
      cifras.push(x + it.w / 2);
      const dx = o.baile ? (o.baile[it.i] || 0) : 0;
      const c = pintaCifra(it.d, it.w, ch, gro);
      for(let yy = 0; yy < ch; yy++) for(let xx = 0; xx < it.w; xx++){
        const X = x + xx + dx;
        if(c[yy * it.w + xx] && X >= 0 && X < W) g[(yy + pad) * W + X] = 1;
      }
    }else if(it.tipo === 's'){
      const sx = x + ((o.corre3 && it === items.filter(q => q.tipo === 's')[2]) ? o.corre3 : 0);
      for(const cy of [Math.round(ch * 0.33), Math.round(ch * 0.7)])
        for(let yy = 0; yy < gro; yy++) for(let xx = 0; xx < it.w; xx++)
          g[(cy + yy + pad) * W + (sx + xx)] = o.tenue || 1;
    }else{
      /* Una letra de mentira: de arriba abajo, con un trazo en medio. */
      for(let yy = Math.round(ch * 0.3); yy < ch; yy++) for(let xx = 0; xx < it.w; xx++)
        if(xx < 2 || xx >= it.w - 2 || yy === Math.round(ch * 0.6)) g[(yy + pad) * W + (x + xx)] = 1;
    }
    x += it.w;
  });
  return { g: g, w: W, h: H, cifras: cifras };
}

exports.pruebas = async function(t){

/* ── 1 · timecode y segundos ───────────────────────────────────────────── */
t.seccion('1 · timecode y segundos');
t.eq('segundos a texto', M.tcpTexto(3600 + 18 * 60 + 23 + 4 / 25, 25), '01:18:23:04');
t.eq('texto a segundos', M.tcpSegundos('01:18:23:04', 25), 3600 + 18 * 60 + 23 + 4 / 25);
t.eq('ida y vuelta', M.tcpTexto(M.tcpSegundos('10:09:59:24', 25), 25), '10:09:59:24');
t.eq('sin separadores vale igual', M.tcpSegundos('01182304', 25), M.tcpSegundos('01:18:23:04', 25));
t.eq('siete cifras no valen', M.tcpSegundos('0118230', 25), null);
t.eq('minutos imposibles no valen', M.tcpSegundos('01:78:23:04', 25), null);
t.eq('sin nada no vale', M.tcpSegundos('', 25), null);
t.eq('a 30 cuadros el fotograma dura menos',
  M.tcpSegundos('00:00:00:15', 30), 0.5);
t.eq('nada que decir todavia', M.tcpTexto(null, 25), '--:--:--:--');

/* ── 2 · el reloj cuenta solo ──────────────────────────────────────────── */
t.seccion('2 · el reloj cuenta solo');
t.eq('sin enganchar no dice nada', M.tcpAhora({ tc: null }, 0), null);
t.eq('parado se queda quieto', M.tcpAhora({ tc: 100, t0: 0, rodando: false }, 5000), 100);
t.cerca('rodando avanza con el reloj del navegador',
  M.tcpAhora({ tc: 100, t0: 0, rodando: true }, 2500), 102.5, 0.001);

/* ── 3 · que lecturas cuentan la misma historia ────────────────────────── */
t.seccion('3 · que lecturas cuentan la misma historia');
const recta = (v, n, desde) => {
  const a = [];
  for(let i = 0; i < n; i++) a.push({ seg: (desde || 0) + v * i * 0.066, t: i * 66 });
  return a;
};
t.ok('tres a tiempo real concuerdan', !!M.tcpRecta(recta(1, 3)));
t.ok('tres paradas concuerdan', !!M.tcpRecta(recta(0, 3)));
t.ok('dos no bastan', !M.tcpRecta(recta(1, 2)));
/* Llegó de sala: «sincroniza cuando se maneja lento, pero a cambios abruptos
   no». Avanzar rápido, rebobinar y arrastrar el cursor también son Pro Tools:
   ahora se siguen hasta cuatro veces la velocidad, en los dos sentidos. */
t.ok('a triple velocidad es avanzar rápido: creíble', !!M.tcpRecta(recta(3, 5)));
t.ok('hacia atrás a tiempo real es rebobinar: creíble', !!M.tcpRecta(recta(-1, 5)));
t.cerca('y el ritmo sale de la recta', M.tcpRecta(recta(-1, 5)).v, -1, 0.05);
t.ok('a diez veces ya no: eso es una cifra mal leída', !M.tcpRecta(recta(10, 5)));
t.ok('ni a medias: ni parado ni rodando no es un ritmo', !M.tcpRecta(recta(0.2, 5)));
{
  /* Esto es lo que rompio la primera version: entre lecturas buenas se cuelan
     malas, y mirandolas todas juntas no concordaba ninguna. */
  const mezcla = recta(1, 12);
  mezcla[1].seg += 9; mezcla[4].seg -= 14; mezcla[7].seg += 22; mezcla[9].seg -= 6;
  const R = M.tcpRecta(mezcla);
  t.ok('con basura en medio, encuentra igual el grupo bueno', !!R);
  t.eq('y el grupo bueno son las ocho que quedan', R ? R.n : 0, 8);
  t.cerca('a tiempo real', R ? R.v : 0, 1, 0.05);
}
{
  const azar = [];
  let s = 7;
  for(let i = 0; i < 20; i++){ s = (s * 1103515245 + 12345) & 0x7fffffff; azar.push({ seg: (s / 0x7fffffff) * 60, t: i * 66 }); }
  t.ok('veinte lecturas inventadas no forman una recta creible', !M.tcpRecta(azar));
}

/* ── 4 · trocear el contador ───────────────────────────────────────────── */
t.seccion('4 · trocear el contador');
{
  const f = pantalla('01182304');
  t.eq('ve once trozos: ocho cifras y tres dos puntos', M.tcpGrupos(f).length, 11);
  const L = M.tcpLayout(f);
  t.eq('y saca ocho casillas', L ? L.length : 0, 8);
  t.ok('todas las casillas miden lo mismo',
    !!L && L.every(c => Math.abs(c.w - L[0].w) < 1e-9));
  t.ok('y van de izquierda a derecha sin volverse locas',
    !!L && L.every((c, i) => i === 0 || c.x > L[i - 1].x));
  const fil = M.tcpFilas(f);
  t.ok('la franja con tinta no es la caja entera', fil.h < 1 && fil.h > 0.5);

  const f8 = pantalla('01182304', { sinPuntos: true });
  t.eq('sin dos puntos tambien saca ocho', (M.tcpLayout(f8) || []).length, 8);

  /* Un recuadro mal marcado —con media cifra de al lado— no da ni once ni
     ocho trozos, y entonces NO se inventa un reparto: dice que no. */
  const f9 = pantalla('011823', { sinPuntos: true });
  t.eq('con seis cifras se planta', M.tcpLayout(f9), null);
}

/* ── 4b · sin contador en el recuadro ──────────────────────────────────── */
t.seccion('4b · sin contador en el recuadro');
{
  const antes = { c: TCP.celdas, r: TCP.rect };
  TCP.celdas = null; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
  M.ponFoto(() => pantalla('011823', { sinPuntos: true }));
  const l = M.tcpLeerUna();
  t.ok('leer donde no hay contador dice que no hay casillas, y no lee nada', !!l && l.celdas === 0 && !l.txt,
       JSON.stringify(l));
  TCP.celdas = antes.c; TCP.rect = antes.r;
}

/* ── 5 · reconocer las cifras ──────────────────────────────────────────── */
t.seccion('5 · reconocer las cifras');
{
  TCP.celdas = null; TCP.plantillas = {}; TCP.fps = 25; TCP.lat = 0;
  TCP.rect = { x: 0, y: 0, w: 1, h: 1 };

  let cual = pantalla('01234567');
  M.ponFoto(() => cual);
  t.eq('al principio no conoce ninguna cifra', M.tcpFaltan().length, 10);

  let r = M.tcpEnsenar('01:23:45:67');
  t.ok('aprende de la primera pantalla', r.ok);
  t.eq('y le faltan las dos que no salian', r.faltan.join(''), '89');

  cual = pantalla('89012345');
  r = M.tcpEnsenar('89:01:23:45');
  t.ok('aprende las que faltaban', r.ok);
  t.eq('ya conoce las diez', r.faltan.length, 0);

  cual = pantalla('12345678');
  const l = M.tcpLeerUna();
  t.eq('lee un timecode que no habia visto', l && l.txt, '12345678');
  t.ok('y con confianza alta', !!l && l.conf > 0.8, l ? ('dio ' + l.conf) : 'no leyo');
  t.cerca('en segundos', l ? l.seg : -1, M.tcpSegundos('12345678', 25), 1e-9);

  /* El contador cambia de tamaño —se agranda la ventana de Pro Tools— y tiene
     que seguir leyendose: por eso cada casilla se reduce a un tamaño fijo. */
  TCP.celdas = null;
  cual = pantalla('12345678', { cw: 27, ch: 42, hueco: 11, sw: 8, gro: 4 });
  const l2 = M.tcpLeerUna();
  t.eq('con el contador mas grande lee lo mismo', l2 && l2.txt, '12345678');

  t.ok('ocho cifras o nada', !M.tcpEnsenar('01:23').ok);
  t.eq('y lo dice', M.tcpEnsenar('01:23').motivo, 'Escribe las ocho cifras, como 01:18:23:04');
}

/* ── 6 · una lectura mala no mueve el reloj ────────────────────────────── */
t.seccion('6 · una lectura mala no mueve el reloj');
{
  ahora = 10000;
  TCP.on = true; TCP.tc = 100; TCP.t0 = ahora; TCP.rodando = true;
  TCP._hist = []; TCP._dudas = []; TCP._leidas = 0; TCP._malas = 0;

  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 943.7, conf: 0.9 }));
  ahora += 66; M.tcpMirar();
  t.cerca('el reloj no se va detras de una lectura absurda',
    M.tcpAhora(TCP, ahora), 100.066, 0.002);
  t.eq('pero queda apuntada como descartada', TCP._malas, 1);

  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 100.5, conf: 0.2 }));
  ahora += 66; M.tcpMirar();
  t.cerca('una lectura sin confianza tampoco cuenta',
    M.tcpAhora(TCP, ahora), 100.132, 0.002);

  /* Y una que SI cuadra recoloca, que es para lo que esta todo esto. */
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 100.20, conf: 0.9 }));
  ahora += 66; M.tcpMirar();
  t.cerca('una lectura que cuadra si recoloca', M.tcpAhora(TCP, ahora), 100.20, 0.002);
}

/* ── 7 · si saltan en Pro Tools, se engancha alli ──────────────────────── */
t.seccion('7 · si saltan en Pro Tools, se engancha alli');
{
  ahora = 20000;
  TCP.on = true; TCP.tc = 100; TCP.t0 = ahora; TCP.rodando = false;
  TCP._hist = []; TCP._dudas = []; TCP._leidas = 0; TCP._malas = 0;

  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 500, conf: 0.9 }));
  ahora += 66; M.tcpMirar();
  t.cerca('con una sola no se lo cree', M.tcpAhora(TCP, ahora), 100, 0.002);
  ahora += 66; M.tcpMirar();
  ahora += 66; M.tcpMirar();
  t.cerca('con tres seguidas coincidiendo, si', M.tcpAhora(TCP, ahora), 500, 0.02);
  t.eq('y ve que esta parado', TCP.rodando, false);

  /* Y un salto estando rodando: el ritmo lo saca de la propia recta, no del
     historial, que se tira al saltar. */
  ahora += 66;
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 900 + (ahora - 20264) / 1000, conf: 0.9 }));
  for(let i = 0; i < 4; i++){ ahora += 66; M.tcpMirar(); }
  t.eq('tras saltar rodando, sabe que rueda', TCP.rodando, true);
  t.cerca('y en el sitio nuevo', M.tcpAhora(TCP, ahora), 900 + (ahora - 20264) / 1000, 0.05);
}

/* ── 7b · saltos, rebobinar y avanzar rápido ───────────────────────────── */
t.seccion('7b · saltos, rebobinar y avanzar rápido');
{
  /* Llegó de sala: «sí sincroniza cuando se maneja lento, pero a cambios
     abruptos no». El reloj solo se creía parado o a tiempo real. */
  const arranque = (tc, rodando) => {
    ahora = 40000;
    TCP.on = true; TCP.tc = tc; TCP.t0 = ahora; TCP.rodando = rodando; TCP.ritmo = rodando ? 1 : 0;
    TCP._hist = []; TCP._dudas = []; TCP._leidas = 0; TCP._malas = 0; TCP._diario = [];
  };
  /* Rebobinando a tiempo real: las lecturas van hacia atrás. */
  arranque(500, true);
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 500 - (ahora - 40000) / 1000, conf: 0.9 }));
  for(let i = 0; i < 12; i++){ ahora += 66; M.tcpMirar(); }
  t.ok('rebobinando, el reloj va hacia atrás', TCP.rodando && TCP.ritmo < -0.8, 'ritmo ' + TCP.ritmo.toFixed(2));
  t.cerca('y está donde Pro Tools', M.tcpAhora(TCP, ahora), 500 - (ahora - 40000) / 1000, 0.1);
  ahora += 200;
  t.cerca('y entre lecturas sigue yendo hacia atrás, no hacia delante', M.tcpAhora(TCP, ahora), 500 - (ahora - 40000) / 1000, 0.1);
  /* Avanzando rápido, al triple. */
  arranque(100, false);
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 100 + 3 * (ahora - 40000) / 1000, conf: 0.9 }));
  for(let i = 0; i < 12; i++){ ahora += 66; M.tcpMirar(); }
  t.ok('avanzando rápido, el reloj corre al triple', TCP.rodando && TCP.ritmo > 2.5 && TCP.ritmo < 3.5, 'ritmo ' + TCP.ritmo.toFixed(2));
  t.cerca('y está donde Pro Tools', M.tcpAhora(TCP, ahora), 100 + 3 * (ahora - 40000) / 1000, 0.15);
  t.ok('con la parte del retardo al mismo ritmo', M.tcpFuente() - M.tcpAhora(TCP, ahora) > 2.5 * M.tcpRetardo(25),
       'a triple velocidad lo leído tiene el triple de atraso');
  /* Un salto con Pro Tools PARADO: dos lecturas iguales bastan. */
  arranque(100, false);
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 777, conf: 0.9 }));
  ahora += 66; M.tcpMirar();
  t.cerca('con una lectura no se cree el salto', M.tcpAhora(TCP, ahora), 100, 0.002);
  ahora += 66; M.tcpMirar();
  t.cerca('con dos iguales, ya', M.tcpAhora(TCP, ahora), 777, 0.002, 'parado, la lectura es exacta: dos iguales no son casualidad');
  t.eq('y parado', TCP.rodando, false);
  t.eq('dos iguales bastan', M.TCP_QUIETAS, 2);
  /* Pero dos iguales VIEJAS no: tienen que ser seguidas y de ahora. */
  t.eq('dos iguales de hace un segundo no valen', M.tcpQuieto([{ seg: 5, t: 1000 }, { seg: 5, t: 1100 }], 2500), null);
  t.eq('ni dos distintas', M.tcpQuieto([{ seg: 5, t: 2400 }, { seg: 6, t: 2450 }], 2500), null);
  t.ok('dos iguales y seguidas, sí, y dicen parado', (function(){ const q = M.tcpQuieto([{ seg: 5, t: 2400 }, { seg: 5, t: 2450 }], 2500); return q && q.v === 0 && q.ult.seg === 5; })());
  /* Un salto rodando, y se sigue rodando: se recoge en tres lecturas. */
  arranque(100, true);
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 900 + (ahora - 40000) / 1000, conf: 0.9 }));
  let cuando = -1;
  for(let i = 0; i < 8; i++){ ahora += 66; M.tcpMirar(); if(cuando < 0 && Math.abs(M.tcpAhora(TCP, ahora) - (900 + (ahora - 40000) / 1000)) < 0.1) cuando = i + 1; }
  t.ok('un salto rodando se recoge en tres lecturas', cuando > 0 && cuando <= 3, 'en ' + cuando);
  t.ok('y sigue rodando a tiempo real', TCP.rodando && Math.abs(TCP.ritmo - 1) < 0.2, 'ritmo ' + TCP.ritmo.toFixed(2));
  /* Y el ritmo más rápido que se cree. */
  t.eq('hasta cuatro veces la velocidad, en los dos sentidos', M.TCP_RITMO_MAX, 4);
  t.ok('a diez veces no se mueve: eso es una cifra mal leída', (function(){
    arranque(100, false);
    M.ponLeer(() => ({ celdas: 8, txt: '', seg: 100 + 10 * (ahora - 40000) / 1000, conf: 0.9 }));
    for(let i = 0; i < 12; i++){ ahora += 66; M.tcpMirar(); }
    return Math.abs(M.tcpAhora(TCP, ahora) - 100) < 0.002 || TCP.rodando === false; })());

  /* El diario: qué se hizo con cada lectura, para la captura de revisar. */
  arranque(100, true);
  M.ponLeer(() => ({ celdas: 8, txt: '01000000', seg: 100.05, conf: 0.9 }));
  ahora += 66; M.tcpMirar();
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: null, conf: 0 }));
  ahora += 66; M.tcpMirar();
  M.ponLeer(() => ({ celdas: 8, txt: '05000000', seg: 5 * 3600, conf: 0.9 }));
  ahora += 66; M.tcpMirar();
  const diario = M.verDiario();
  t.eq('cada lectura queda apuntada con lo que se hizo', diario.map(e => e.que).join(','), 'cuadra,mala,duda');
  t.eq('con lo leído y el reloj', diario[0].txt + ' ' + diario[0].seg + ' ' + (diario[0].reloj != null), '01000000 100.05 true');
  const texto = M.tcpDiagnosticoTexto();
  t.ok('y el texto de la captura lleva el estado y el diario', texto.some(l => /^fps 25/.test(l)) && texto.some(l => /01000000 conf 0.9 seg 100.05 .*cuadra/.test(l)),
       texto.join(' | ').slice(0, 300));
  for(let i = 0; i < 200; i++) M.tcpApuntar(ahora + i, { txt: '', conf: 0, seg: null }, 'mala');
  t.ok('el diario no crece sin tope: se queda con las ultimas', M.verDiario().length <= 80, 'tiene ' + M.verDiario().length);
  TCP.on = false; TCP._diario = [];
}

/* ── 8 · con la mitad de las lecturas malas, el libreto no se va ───────── */
t.seccion('8 · con la mitad de las lecturas malas, el libreto no se va');
{
  /* Esta es la seccion que justifica el diseño entero. Leer una pantalla
     acierta ~90% por cifra, que sobre ocho cifras es poco mas de una lectura
     buena de cada dos. Si el reloj fuese la lectura, el libreto daria saltos
     absurdos una vez de cada dos. Se comprueba que no. */
  ahora = 30000;
  TCP.on = true; TCP.tc = null; TCP.t0 = ahora; TCP.rodando = false;
  TCP._hist = []; TCP._dudas = []; TCP._leidas = 0; TCP._malas = 0;

  let real = 3600 + 2 * 60 + 5;
  let s = 987654321;
  const azar = () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; };
  M.ponLeer(() => ({
    celdas: 8, txt: '', conf: 0.9,
    seg: azar() < 0.5 ? real : real + (azar() * 40 - 20)
  }));

  let enganchoEn = -1;
  for(let i = 0; i < 400; i++){
    ahora += 66; real += 0.066;
    M.tcpMirar();
    if(enganchoEn < 0 && TCP.tc != null) enganchoEn = i;
  }
  t.ok('engancha, y pronto', enganchoEn >= 0 && enganchoEn < 40,
    'engancho en la lectura ' + enganchoEn);
  t.ok('sabe que Pro Tools esta rodando', TCP.rodando);
  t.cerca('y el reloj sigue clavado en el timecode de verdad',
    M.tcpAhora(TCP, ahora), real, 1 / 25);
  t.ok('descartando de verdad la mitad de las lecturas',
    TCP._malas > TCP._leidas * 0.3,
    'descarto ' + TCP._malas + ' de ' + TCP._leidas);

  /* Y ahora paran en Pro Tools: el reloj tiene que pararse tambien, no seguir
     corriendo solo. */
  const parado = real;
  for(let i = 0; i < 100; i++){ ahora += 66; M.tcpMirar(); }
  t.eq('si paran, se para', TCP.rodando, false);
  t.cerca('y se queda donde estaba', M.tcpAhora(TCP, ahora), parado, 1 / 25);
}

/* ── 9 · lo que se recuerda ────────────────────────────────────────────── */
t.seccion('9 · lo que se recuerda');
{
  TCP.rect = { x: 0.1, y: 0.2, w: 0.3, h: 0.05 };
  TCP.celdas = M.tcpLayout(pantalla('01234567'));
  TCP.fps = 24; TCP.lat = -0.14;
  M.tcpGuardar();
  const o = JSON.parse(almacen.getItem('ddl_tcp'));
  t.eq('guarda el recuadro', o.rect.x, 0.1);
  t.eq('guarda los fotogramas', o.fps, 24);
  t.eq('guarda el ajuste fino', o.lat, -0.14);
  t.eq('guarda las casillas', Array.isArray(o.celdas), true);
  t.eq('y las diez cifras aprendidas', Object.keys(o.plantillas).length, 10);
  t.ok('las cifras se guardan como numeros, no como objetos raros',
    Array.isArray(o.plantillas['7']) && o.plantillas['7'].length === 12 * 18);
}

/* ── 9b · el reloj no tiembla: se acerca a cada lectura, no salta a ella ── */
t.seccion('9b · el reloj no tiembla: se acerca a cada lectura, no salta a ella');
{
  /* Cada lectura es un fotograma ENTERO: el contador enseña el mismo número
     durante 40 ms. Saltando a cada lectura el reloj iba a trompicones de hasta
     un fotograma: medido con el contador de mentira, 20 ms de desviación y
     saltos de 100 ms. Se simula Pro Tools rodando de verdad y leído cada 66 ms
     con el número de fotograma truncado, y se mira cuánto se separa el reloj
     de donde está Pro Tools de verdad. */
  const FPS = 25;
  const sesion = (suave) => {
    ahora = 70000;
    TCP.on = true; TCP.tc = null; TCP.t0 = ahora; TCP.rodando = false; TCP.fps = FPS; TCP.lat = 0;
    TCP._hist = []; TCP._dudas = []; TCP._leidas = 0; TCP._malas = 0;
    const real = () => 100 + (ahora - 70000) / 1000;
    /* La imagen que hay al leer llegó hace entre nada y una imagen de la
       captura (33 ms a 30 por segundo): se sortea. */
    let z = 4321;
    const azar = () => { z = (z * 1103515245 + 12345) & 0x7fffffff; return z / 0x7fffffff; };
    M.ponLeer(() => ({ celdas: 8, txt: '', conf: 0.9, seg: Math.floor((real() - azar() / 30) * FPS) / FPS }));
    const difs = [];
    for(let i = 0; i < 300; i++){
      ahora += 66; M.tcpMirar();
      if(i > 60) difs.push((M.tcpFuente() - real()) * 1000);
    }
    const m = difs.reduce((a, b) => a + b, 0) / difs.length;
    const sd = Math.sqrt(difs.reduce((a, b) => a + (b - m) * (b - m), 0) / difs.length);
    return { media: m, desv: sd, saltoMax: Math.max.apply(null, difs.map(d => Math.abs(d - m))) };
  };
  const R = sesion();
  t.ok('rodando, el reloj va a menos de 10 ms del contador de verdad', Math.abs(R.media) < 10, 'media ' + R.media.toFixed(1) + ' ms');
  t.ok('con la cuenta del retardo puesta: sin ella iría unos 35 ms por detrás',
       Math.abs(R.media - M.tcpRetardo(FPS) * 1000) > 25, 'media ' + R.media.toFixed(1) + ' ms');
  t.ok('y sin temblar: desviación de menos de 8 ms', R.desv < 8, 'desviación ' + R.desv.toFixed(1) + ' ms');
  t.ok('sin trompicones de un fotograma', R.saltoMax < 20, 'el mayor, ' + R.saltoMax.toFixed(1) + ' ms');
  t.ok('se cree cada lectura en parte, no entera', M.TCP_SUAVE > 0.1 && M.TCP_SUAVE < 0.5, String(M.TCP_SUAVE));
  /* Lo que se sabe que va por detrás una lectura: medio bucle y medio fotograma. */
  t.cerca('el retardo de leer: medio fotograma del contador y media imagen de la captura', M.tcpRetardo(25), 0.02 + 1 / 60, 0.002);
  t.cerca('a 30 fotogramas, medio fotograma es menos', M.tcpRetardo(30), 1 / 60 + 1 / 60, 0.002);
  t.eq('el bucle late cada 66 ms', M.TCP_PERIODO_MS, 66);
  /* Parado, la lectura es exacta: el reloj se pone en ella tal cual, sin
     acercarse poco a poco, y sin sumar ningún retardo de rodar. */
  ahora = 80000;
  TCP.on = true; TCP.tc = 100; TCP.t0 = ahora; TCP.rodando = false; TCP._hist = []; TCP._dudas = [];
  M.ponLeer(() => ({ celdas: 8, txt: '', conf: 0.9, seg: 100.2 }));
  ahora += 66; M.tcpMirar();
  t.cerca('parado, una lectura que cuadra se toma tal cual', M.tcpFuente(), 100.2, 1e-9);
  TCP.on = false;
}

/* ── 10 · encendido y apagado ──────────────────────────────────────────── */
t.seccion('10 · encendido y apagado');
{
  TCP.on = true; TCP.tc = 500; TCP.t0 = ahora; TCP.rodando = false; TCP.lat = 0.5;
  t.ok('mientras lee, esta activo', M.tcpActivo());
  t.cerca('y el resto del programa ve el timecode con su ajuste fino',
    M.tcpFuente(), 500.5, 0.002);

  M.tcpParar();
  t.ok('apagado deja de estar activo', !M.tcpActivo());
  t.eq('y el resto del programa no ve ningun timecode', M.tcpFuente(), null);
  t.eq('y suelta el enganche', TCP.tc, null);
}

/* ── 11 · el programa lo carga de verdad ───────────────────────────────── */
t.seccion('11 · el programa lo carga de verdad');
{
  const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
  t.ok('index.html carga el modulo', html.indexOf('./js/tcpantalla.js') > 0);
  const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
  t.ok('y el servicio lo guarda, o serviria una version vieja del resto',
    sw.indexOf('./js/tcpantalla.js') > 0);
  t.ok('las fuentes lo ven como un archivo mas',
    fuentes().some(f => f.nombre === 'js/tcpantalla.js'));
}

/* ── 12 · el seguimiento cuelga de Pro Tools, no del video ─────────────── */
t.seccion('12 · el seguimiento cuelga de Pro Tools, no del video');
{
  /* Esto es LA peticion: el boton Seguir va enganchado al contador de Pro
     Tools, no al video ni al audio que se suban. Se comprueba en el codigo que
     se despliega, no de memoria. */
  const src = trozo('function studioTick(forzado)', 'stDrawWave();');
  t.ok('studioTick pregunta primero por el timecode de Pro Tools',
    src.indexOf('tcpFuente') > 0);
  t.ok('y solo usa el video si Pro Tools no esta leyendo',
    src.indexOf('pt != null') > 0 && src.indexOf('el.currentTime') > src.indexOf('pt != null'));
  t.ok('sin video cargado sigue colocando el libreto',
    src.indexOf('if(t == null) return;') > 0);
  /* El orden importa: la salida por «no hay video» tiene que estar DEBAJO de
     donde se coloca el libreto. Si estuviese arriba, seguir a Pro Tools sin
     video cargado no movería nada. */
  t.ok('y la salida por falta de video va despues de colocarlo',
    src.indexOf('studioSeguirLibreto(bi') < src.indexOf('if(!el || !el.duration)'));

  const sw2 = trozo('function stSeguirPoner(on)', '/** Pinta el botón de la barra');
  t.ok('apagar el seguimiento suelta la lectura de la pantalla',
    sw2.indexOf('tcpParar') > 0);
}


/* ── 13 · compartir: que se pueda, y que si no, lo diga ────────────────── */
t.seccion('13 · compartir: que se pueda, y que si no, lo diga');
{
  /* El Big Counter de Pro Tools es una ventana FLOTANTE y Windows no la lista
     entre las ventanas compartibles. Por eso hay que poder pedir la pantalla
     entera, y por eso un fallo al compartir tiene que decirse: antes se
     devolvia false a secas y cancelar no se distinguia de no tener imagen. */
  nav.mediaDevices.getDisplayMedia = async (c) => { restriccionesPedidas = c; return arroyo(); };
  videoQueSale = () => ({ play: async () => {}, videoWidth: 1920, videoHeight: 1080 });

  const r1 = await M.tcpCompartir(true);
  t.ok('compartiendo la pantalla entera, sale bien', r1.ok, r1.motivo);
  t.eq('y se le pide al navegador la pantalla, no una ventana',
    restriccionesPedidas.video.displaySurface, 'monitor');

  await M.tcpCompartir(false);
  t.eq('pidiendo una ventana, no se le impone la pantalla',
    restriccionesPedidas.video.displaySurface, undefined);

  nav.mediaDevices.getDisplayMedia = async () => { const e = new Error('no'); e.name = 'NotAllowedError'; throw e; };
  const r2 = await M.tcpCompartir(false);
  t.ok('si se cancela, no sale bien', !r2.ok);
  t.ok('y dice por que, en vez de callarse', /elegir la pantalla/.test(r2.motivo), r2.motivo);

  nav.mediaDevices.getDisplayMedia = async () => { throw new Error('vaya'); };
  const r3 = await M.tcpCompartir(false);
  t.ok('cualquier otro fallo tambien se cuenta', !r3.ok && r3.motivo.length > 10, r3.motivo);

  const sinNada = nav.mediaDevices;
  nav.mediaDevices = null;
  const r4 = await M.tcpCompartir(false);
  t.ok('y si el navegador no sabe compartir, lo dice',
    !r4.ok && /Chrome o Edge/.test(r4.motivo), r4.motivo);
  nav.mediaDevices = sinNada;

  /* Esto es lo que se veia como «no llega la captura» con la ventana ya
     compartida: play() vuelve antes de que haya imagen, videoWidth vale 0 y
     la foto sale nula. Ahora se espera al primer fotograma de verdad. */
  const lento = { videoWidth: 0, videoHeight: 0 };
  setTimeout(() => { lento.videoWidth = 1280; lento.videoHeight = 720; }, 150);
  t.ok('espera al primer fotograma de verdad', await M.tcpPrimerFotograma(lento, 2000));

  const nuncaLlega = { videoWidth: 0, videoHeight: 0 };
  t.ok('y si no llega nunca, se rinde en vez de colgarse',
    !(await M.tcpPrimerFotograma(nuncaLlega, 250)));

  nav.mediaDevices.getDisplayMedia = async () => arroyo();
  videoQueSale = () => ({ play: async () => {}, videoWidth: 0, videoHeight: 0 });
  const r5 = await M.tcpCompartir(false);
  t.ok('compartido pero sin imagen no cuenta como compartido', !r5.ok, r5.motivo);
  t.ok('y lo dice con esas palabras', /no llega imagen/.test(r5.motivo), r5.motivo);
  M.tcpSoltar();
}

/* ── 14 · las cifras se aprenden solas con Pro Tools rodando ───────────── */
t.seccion('14 · las cifras se aprenden solas con Pro Tools rodando');
{
  /* Lo que había que hacer antes: escribir el timecode, mover el cursor hasta
     que salieran otras cifras y volver a escribir, hasta ver las diez. Ahora se
     escribe una vez y se le da al play: la casilla de las unidades de segundo
     pasa por las diez en diez segundos, y contando sus cambios se sabe cuál es
     cada una SIN LEERLA. */
  const FPS = 25;
  /* Una sesión de mentira: el contador empieza en `desde`, se le da al play a
     los `play` segundos, y `cuadro(seg)` da lo que se ve. Con `mezcla`, la
     transición de cada cambio de segundo dura DOS fotos, con las dos cifras
     encima en proporciones distintas, como en una captura de verdad: cada foto
     de en medio se parece poco a la de antes y poco a la siguiente. */
  const sesion = (desde, play, o) => {
    o = o || {};
    TCP.celdas = null; TCP.plantillas = {}; TCP.fps = FPS; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
    let t = 0;
    const tcDe = (tt) => (o.tc ? o.tc(tt) : desde + Math.max(0, tt - play));
    M.ponFoto(() => {
      const s = tcDe(t);
      const f = pantalla(M.tcpTexto(s, FPS));
      const fase = s - Math.floor(s);
      if(o.mezcla && fase < 0.14 && s > desde + 0.5){
        const alfa = 0.25 + 0.5 * (fase / 0.14);          // cuánto hay ya de la cifra nueva
        const g = pantalla(M.tcpTexto(s - 0.5, FPS));
        for(let i = 0; i < f.g.length; i++) f.g[i] = f.g[i] * alfa + g.g[i] * (1 - alfa);
      }
      return f;
    });
    const r = M.tcpEnsenar(M.tcpTexto(desde, FPS));
    const f0 = M.tcpFoto()();
    TCP.aprendiendo = M.tcpAprendizajeNuevo(M.tcpTexto(desde, FPS), M.tcpCelda(f0, TCP.celdas[5]), 0);
    const correr = (hasta) => {
      let A = TCP.aprendiendo;
      for(; t <= hasta && A && A.estado === 'esperando'; t += 0.066) A = M.tcpAprenderVuelta(t * 1000);
      return A;
    };
    return { r, correr };
  };

  const S = sesion(3600, 0.4, { mezcla: true });
  t.eq('con 01:00:00:00 solo se ven dos cifras', S.r.faltan.length, 8,
       'es justo el caso que obligaba a ir moviendo el cursor');
  const A = S.correr(13);
  t.eq('dándole al play, las aprende todas', A && A.estado, 'hecho',
       'faltan: ' + M.tcpFaltan().join(','));
  t.eq('las diez', M.tcpFaltan().length, 0);
  t.ok('en unos diez segundos', A && (A.cambios[A.cambios.length - 1] / 1000) < 11.5,
       A ? ('tardó ' + (A.cambios[A.cambios.length - 1] / 1000).toFixed(1) + ' s') : '');
  t.ok('sin dejarse engañar por el fotograma de en medio del cambio',
       A && A.cambios.length >= 8 && A.cambios.length <= 10, A ? String(A.cambios.length) : '');
  M.ponFoto(() => pantalla('23:45:67:89'));
  t.eq('y con lo aprendido lee un timecode que no había visto', (M.tcpLeerUna() || {}).txt, '23456789');
  M.ponFoto(() => pantalla('17:08:59:36'));
  t.eq('y otro', (M.tcpLeerUna() || {}).txt, '17085936');
}
{
  /* Empezando cerca del final de un minuto también: 57, 58, 59, 00… */
  TCP.celdas = null; TCP.plantillas = {}; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
  let reloj = 0;
  const desde = 3600 + 57;
  M.ponFoto(() => pantalla(M.tcpTexto(desde + Math.max(0, reloj - 0.2), 25)));
  M.tcpEnsenar(M.tcpTexto(desde, 25));
  TCP.aprendiendo = M.tcpAprendizajeNuevo(M.tcpTexto(desde, 25), M.tcpCelda(M.tcpFoto()(), TCP.celdas[5]), 0);
  let A = TCP.aprendiendo;
  for(; reloj <= 13 && A.estado === 'esperando'; reloj += 0.066) A = M.tcpAprenderVuelta(reloj * 1000);
  t.eq('pasando por el cambio de minuto, igual', A.estado + ' ' + M.tcpFaltan().join(''), 'hecho ');
}
{
  /* Si en vez de darle al play se ARRASTRA el cursor, los cambios no llevan
     el ritmo de reproducir. Aprender ahí un dibujo con la cifra equivocada
     estropearía la lectura para siempre: no se aprende nada. */
  TCP.celdas = null; TCP.plantillas = {}; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
  const saltos = [0, 0.3, 0.55, 1.9, 2.1, 3.7, 3.8, 6.0];
  let reloj = 0;
  const tcA = (tt) => { let k = 0; for(let i = 0; i < saltos.length; i++) if(tt >= saltos[i]) k = i; return 3600 + [0, 7, 3, 11, 5, 19, 2, 13][k]; };
  M.ponFoto(() => pantalla(M.tcpTexto(tcA(reloj), 25)));
  M.tcpEnsenar(M.tcpTexto(3600, 25));
  const antes = M.tcpFaltan().length;
  TCP.aprendiendo = M.tcpAprendizajeNuevo(M.tcpTexto(3600, 25), M.tcpCelda(M.tcpFoto()(), TCP.celdas[5]), 0);
  let A = TCP.aprendiendo;
  for(; reloj <= 8 && A.estado === 'esperando'; reloj += 0.066) A = M.tcpAprenderVuelta(reloj * 1000);
  t.eq('arrastrando el cursor, se planta', A.estado, 'mal');
  t.eq('y dice por qué', A.motivo, 'ritmo');
  t.eq('sin aprender ni una cifra más', M.tcpFaltan().length, antes,
       'una cifra aprendida con el dibujo de otra no se arregla sola');
}
{
  /* Sin tocar el play, no pasa nada... y al rato se dice. */
  TCP.celdas = null; TCP.plantillas = {}; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
  M.ponFoto(() => pantalla('01:00:00:00'));
  M.tcpEnsenar('01:00:00:00');
  TCP.aprendiendo = M.tcpAprendizajeNuevo('01:00:00:00', M.tcpCelda(M.tcpFoto()(), TCP.celdas[5]), 0);
  let A = TCP.aprendiendo;
  for(let tt = 0; tt <= M.TCP_APRENDER_S + 1 && A.estado === 'esperando'; tt += 0.25) A = M.tcpAprenderVuelta(tt * 1000);
  t.eq('si nadie le da al play, avisa pasado el tiempo', A.estado, 'tarde');
}
{
  /* Un cambio que no se vio -el 8 y el 9 se parecen- no rompe la cuenta: dos
     segundos entre cambios son dos pasos. */
  const img = (d) => M.tcpCelda(pantalla('0000000' + d), M.tcpLayout(pantalla('00000000'))[7]);
  TCP.plantillas = {};
  const A = M.tcpAprendizajeNuevo('00:00:00:00', img(0), 0);
  /* Fotos cada 66 ms, como de verdad: `d` desde `desde` hasta `hasta`. */
  const tramo = (d, desde, hasta) => { for(let ms = desde; ms < hasta; ms += 66) M.tcpAprendizajePaso(A, img(d), ms); };
  tramo(0, 0, 1000);
  tramo(1, 1000, 2000);
  t.eq('tras un solo cambio todavía no se fía', M.tcpAprendizajeGuardar(A).length, 0,
       'el primer cambio puede ser de haber arrastrado el cursor');
  /* El 2 se ve igual que el 1 -como si se parecieran tanto como el 8 y el 9-, y
     el siguiente cambio que se ve es ya el 3, dos segundos después. */
  tramo(1, 2000, 3000);
  tramo(3, 3000, 3200);
  t.eq('dos segundos después, dos pasos: va por el 3', A.d, 3);
  t.eq('y guarda la que se fue, que ya se vio entera', M.tcpAprendizajeGuardar(A).join(''), '1',
       'la de ahora todavía puede estar a media transición');
  tramo(3, 3200, 4000);
  tramo(4, 4000, 4200);
  t.eq('la siguiente, cuando se va', M.tcpAprendizajeGuardar(A).join(''), '3');
  t.ok('sin inventarse la de en medio', !TCP.plantillas['2']);

  /* Un parpadeo de la captura: dos fotos seguidas que no son ni la cifra de
     antes ni la misma entre sí, y vuelta a la de antes. No es un cambio: un
     cambio son dos fotos seguidas IGUALES entre sí. */
  const P = M.tcpAprendizajeNuevo('00:00:00:00', img(0), 0);
  for(let ms = 0; ms < 500; ms += 66) M.tcpAprendizajePaso(P, img(0), ms);
  M.tcpAprendizajePaso(P, img(8), 528);
  M.tcpAprendizajePaso(P, img(5), 594);
  M.tcpAprendizajePaso(P, img(0), 660);
  t.eq('un parpadeo de dos fotos distintas no cuenta como cambio', P.cambios.length + ' ' + P.d, '0 0');

  /* Con la ventana tapada el navegador frena los temporizadores a uno por
     segundo -se vio probándolo en el navegador-: un cambio que cae en un hueco
     así no se sabe cuándo pasó, y contarlo a ciegas es contar mal. */
  const H = M.tcpAprendizajeNuevo('00:00:00:00', img(0), 0);
  for(let ms = 0; ms < 900; ms += 66) M.tcpAprendizajePaso(H, img(0), ms);
  M.tcpAprendizajePaso(H, img(0), 1500);
  t.eq('un hueco sin cambio no importa', H.estado, 'esperando',
       'la cifra solo cambia una vez por segundo: si sigue la misma, no se perdió nada');
  M.tcpAprendizajePaso(H, img(1), 2100);
  t.eq('un cambio que cae en un hueco para la cuenta', H.estado + ' ' + H.motivo, 'mal pausa');
  /* Y una cifra recién aprendida que es clavada a otra ya conocida es que algo
     se contó mal: no se guarda. */
  TCP.plantillas = { '0': img(0) };
  const B = M.tcpAprendizajeNuevo('00:00:00:00', img(0), 0);
  B.vistos = { '5': img(0) };
  t.eq('una cifra clavada a otra no se guarda', M.tcpAprendizajeGuardar(B).length, 0);
  t.ok('las dos cifras que más se parecen no llegan a gemelas',
       M.tcpParecido(img(6), img(8)) < M.TCP_GEMELA && M.tcpParecido(img(8), img(9)) < M.TCP_IGUAL,
       '6/8 ' + M.tcpParecido(img(6), img(8)).toFixed(3) + ' · 8/9 ' + M.tcpParecido(img(8), img(9)).toFixed(3));
}

/* ── 15 · el recuadro se ajusta solo a las cifras ──────────────────────── */
t.seccion('15 · el recuadro se ajusta solo a las cifras');
{
  /* Marcar a mano un contador que en la pantalla entera es un sello era
     difícil, y coger de más —la etiqueta, el borde— dejaba el contador sin
     leer: «veo 13 trozos y tienen que ser 8». Se fabrica eso mismo: el
     contador con su etiqueta encima y un marco alrededor. */
  const conMarco = (txt, o) => {
    o = o || {};
    const c = pantalla(txt, o);
    const W = c.w + 60, H = c.h + 44;
    const g = new Float32Array(W * H);
    for(let y = 0; y < c.h; y++) for(let x = 0; x < c.w; x++) g[(y + 34) * W + (x + 30)] = c.g[y * c.w + x];
    for(const x0 of [34, 50, 66, 82, 98])                         // la etiqueta: letras pequeñas
      for(let y = 6; y < 16; y++) for(let x = x0; x < x0 + 9; x++) if((x + y) % 3) g[y * W + x] = 1;
    for(let y = 0; y < H; y++) for(const x of [2, 3, W - 4, W - 3]) g[y * W + x] = 1;   // el marco
    return { g: g, w: W, h: H };
  };
  const f = conMarco('01:18:23:04');
  t.ok('con la etiqueta y el marco no salen las ocho cifras', [8, 11].indexOf(M.tcpGrupos(f).length) < 0,
       'salen ' + M.tcpGrupos(f).length);
  const r = M.tcpRecortar(f);
  t.ok('pero se encuentra el contador dentro', !!r);
  const recorte = (img, q) => {
    const x0 = Math.round(q.x * img.w), y0 = Math.round(q.y * img.h);
    const w = Math.round(q.w * img.w), h = Math.round(q.h * img.h);
    const g = new Float32Array(w * h);
    for(let y = 0; y < h; y++) for(let x = 0; x < w; x++) g[y * w + x] = img.g[(y + y0) * img.w + (x + x0)];
    return { g: g, w: w, h: h };
  };
  const c = r ? recorte(f, r) : null;
  t.eq('y ajustado a él salen los once trozos', c ? M.tcpGrupos(c).length : 0, 11);
  t.eq('y las ocho casillas', c ? (M.tcpLayout(c) || []).length : 0, 8);
  t.ok('sin la etiqueta: el recorte empieza por debajo de ella', !!r && r.y * f.h > 16);

  /* Los dos puntos se reconocen por su ALTO, no por su ancho: en un contador
     lleno de unos, cada 1 es tan estrecho como unos dos puntos. */
  const f1 = conMarco('11:11:11:11');
  const r1 = M.tcpRecortar(f1);
  t.eq('con todo unos, también', r1 ? M.tcpGrupos(recorte(f1, r1)).length : 0, 11);
  /* Y con un contador grande, donde los dos puntos miden más que un 1 pequeño:
     por el ancho no se distinguirían, por las filas con tinta sí. */
  const fG = conMarco('01:18:23:04', { cw: 54, ch: 84, hueco: 21, sw: 15, gro: 9, pad: 18 });
  const rG = M.tcpRecortar(fG);
  t.eq('con el contador grande, también', rG ? M.tcpGrupos(recorte(fG, rG)).length : 0, 11);

  t.eq('donde no hay un timecode no se inventa uno', M.tcpRecortar(pantalla('011823', { sinPuntos: true })), null,
       'mejor decir que no se ven las cifras que guardar un recuadro que no lee');
  const ya = pantalla('01:18:23:04');
  const rYa = M.tcpRecortar(ya);
  t.eq('un recuadro ya bueno sigue siendo bueno', rYa ? M.tcpGrupos(recorte(ya, rYa)).length : 0, 11);

  const D = M.tcpDentroDe({ x: 0.5, y: 0.2, w: 0.2, h: 0.1 }, { x: 0.25, y: 0.5, w: 0.5, h: 0.5 });
  t.ok('y el ajuste se pasa a proporciones de la pantalla',
       Math.abs(D.x - 0.55) < 1e-9 && Math.abs(D.y - 0.25) < 1e-9 && Math.abs(D.w - 0.1) < 1e-9 && Math.abs(D.h - 0.05) < 1e-9,
       JSON.stringify(D));
}

/* ── 16 · lo que falta para seguir, y los días siguientes ──────────────── */
t.seccion('16 · lo que falta para seguir, y los días siguientes');
{
  /* Con el recuadro y las diez cifras guardados de otro día, lo único que hay
     que hacer es compartir: en cuanto se comparte, se arranca. */
  const antes = { video: TCP.video, rect: TCP.rect, pl: TCP.plantillas };
  TCP.video = null;
  t.eq('sin compartir, compartir', M.tcpQueFalta(), 'compartir');
  TCP.video = { videoWidth: 10 }; TCP.rect = null;
  t.eq('sin recuadro, marcarlo', M.tcpQueFalta(), 'marcar');
  TCP.rect = { x: 0, y: 0, w: 1, h: 1 }; TCP.plantillas = { '0': [1] };
  t.eq('sin las diez cifras, enseñarlas', M.tcpQueFalta(), 'ensenar');
  TCP.plantillas = {}; for(let i = 0; i < 10; i++) TCP.plantillas[String(i)] = [i];
  t.eq('con todo, listo', M.tcpQueFalta(), 'listo');
  TCP.video = antes.video; TCP.rect = antes.rect; TCP.plantillas = antes.pl;

  const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tcpantalla.js'), 'utf8').replace(/\r\n/g, '\n');
  t.ok('al compartir se hace lo siguiente sin más clics',
       /const r = await tcpCompartir\(pantallaEntera\);\n\s*if\(!r\.ok\)\{ castAviso\('❌ ' \+ r\.motivo\); return; \}\n\s*tcpTrasCompartir\(\);/.test(src));
  t.ok('y con todo listo, lo siguiente es seguir', /if\(q === 'listo'\)\{ tcpEmpezarASeguir\(\); return q; \}/.test(src));
  t.ok('y sin recuadro, marcarlo', /if\(q === 'marcar'\)\{[\s\S]{0,200}?tcpMarcarRect\(\);/.test(src));
  t.ok('«Es lo que pone» se pone a aprender el resto', /const r = tcpAprenderArrancar\(caja \? caja\.value : ''\);/.test(src));
  t.ok('al marcar se guarda el recuadro ajustado', /TCP\.rect = ajustada \|\| sel;/.test(src));
  t.ok('y las casillas se sacan ya', /const L = f \? tcpLayout\(f\) : null; if\(L\) TCP\.celdas = L;/.test(src),
       'si no, se recalculaban en cada lectura (PT-5)');
  t.ok('seguir y aprender a la vez no', /function tcpArrancar\(\)\{\n\s*tcpParar\(true\);[\s\S]{0,300}?tcpAprenderParar\(\)/.test(src));
  /* Con la ventana tapada el navegador frena los temporizadores de la página a
     uno por segundo, y así la cuenta de los segundos se pierde: se vio en el
     navegador. El latido del aprendizaje sale de un trabajador. */
  t.ok('el aprendizaje late desde un trabajador', /TCP\._aprTimer = tcpLatido\(66, vuelta\);/.test(src)
       && /function tcpLatido\(ms, fn\)\{[\s\S]{0,500}?w = new Worker\(url\);/.test(src),
       'con un temporizador de la página, la ventana tapada deja la cuenta a una foto por segundo');

  /* La lupa y el aviso al aceptar el recuadro decían «veo 13 trozos»: contaban
     trozos, que es justo lo que fallaba. Ahora dicen si encuentran el contador,
     con el mismo reparto que leerá después. */
  t.ok('la lupa mira si encuentra el contador, no cuántos trozos hay',
       src.indexOf("return { L: f ? tcpLayout(f) : null, f: f };") > 0 && src.indexOf('tcpGrupos(f).length') < 0);
  t.ok('y al aceptar, lo que cuenta es que salgan las casillas', /const ocho = !!TCP\.celdas;/.test(src));
  t.ok('hay un botón de empezar de cero', /id="tcpCero"/.test(src));
  t.ok('y uno de guardar la captura para revisar', /id="tcpCaptura"/.test(src) && /b\.onclick = \(\)=> tcpDiagnosticoBajar\(\);/.test(src));
  t.ok('que pregunta antes y solo entonces olvida',
       /if\(!ok\)\{ tcpPanel\(\); return; \}\n\s*tcpOlvidar\(\);/.test(src));
  t.ok('con el panel quitado antes, que taparía la pregunta', /cerrar\(\);\n\s*let ok = false;/.test(src));
  t.ok('la lupa enseña aumentado lo que se va a guardar: lo ajustado, si se ajustó',
       /const q = ajustada \|\| sel;/.test(src));
  t.ok('al arrancar se pone en marcha el reloj del aviso',
       /function tcpArrancar\(\)\{[\s\S]{0,1500}?TCP\._desde = [^;]+;\n\s*TCP\._avisado = false;/.test(src));
}

/* ── 17 · los dos puntos se reconocen por su forma ─────────────────────── */
t.seccion('17 · los dos puntos se reconocen por su forma');
{
  /* Esto es lo que arregla «no lo reconoce». El reparto por trozos necesitaba
     once trozos exactos, y con letra de verdad las cifras se parten o se
     pegan: medido con texto pintado con fuentes de verdad, leía 56 de 105
     contadores. Los dos puntos se buscan columna a columna por su forma. */
  const dondePuntos = (f, o) => {
    o = o || {};
    const cw = o.cw || 18, hueco = o.hueco || 7, sw = o.sw || 5, aire = o.aire || 0;
    return [1, 3, 5].map(i => f.cifras[i] + cw / 2 + hueco + aire + (sw - 1) / 2);
  };
  const f = pantalla('01:18:23:04');
  const fr = M.tcpFranjas(f)[0];
  t.ok('la franja más alta es la de las cifras', !!fr && fr.a === 6 && fr.b === 33, JSON.stringify(fr));
  const p = M.tcpSeparadores(f, fr.a, fr.b, M.tcpGruposEn(f, fr.a, fr.b));
  const esperado = dondePuntos(f);
  t.ok('encuentra los tres dos puntos, cada uno en su sitio',
       !!p && p.length === 3 && p.every((q, k) => Math.abs(q.c - esperado[k]) <= 0.5),
       p ? p.map(q => q.c).join(' ') + ' / ' + esperado.join(' ') : 'ninguno');

  for(const s of ['01234567', '89898989', '44444444', '11111111', '77777777']){
    const g = pantalla(s, { sinPuntos: true });
    const q = M.tcpFranjas(g)[0];
    const n = M.tcpDosPuntos(g, q.a, q.b, false).length + M.tcpDosPuntos(g, q.a, q.b, true).length;
    t.eq('ninguna cifra tiene columnas con forma de dos puntos: ' + s, n, 0);
  }
  t.eq('sin dos puntos no se inventa ninguno',
       M.tcpSeparadores(pantalla('01182304', { sinPuntos: true }), 6, 33,
                        M.tcpGruposEn(pantalla('01182304', { sinPuntos: true }), 6, 33)), null);

  const u = pantalla('11:11:11:11');
  t.ok('con todo unos, también', !!M.tcpSeparadores(u, 6, 33, M.tcpGruposEn(u, 6, 33)));

  /* Pequeños y algo borrosos, los dos puntos no llegan a medio gris. */
  const te = pantalla('01:18:23:04', { tenue: 0.4 });
  t.eq('unos dos puntos tenues no pasan el umbral fijo', M.tcpDosPuntos(te, 6, 33, false).length, 0);
  t.ok('pero se encuentran mirándolos contra su columna',
       !!M.tcpSeparadores(te, 6, 33, M.tcpGruposEn(te, 6, 33)));
  t.eq('y con ellos, las ocho casillas', (M.tcpLayout(te) || []).length, 8);

  /* Una columna de dos puntos, y cada cosa que se le parece sin serlo. Se
     dibujan columnas sueltas en una franja de 28 filas: `manchas` son los
     tramos de filas con tinta, contados desde arriba de la franja. */
  const columna = (manchas) => {
    const W = 20, H = 40, g = new Float32Array(W * H);
    for(const [a, b] of manchas) for(let y = a; y <= b; y++) for(let x = 8; x < 12; x++) g[(6 + y) * W + x] = 1;
    return M.tcpDosPuntos({ g: g, w: W, h: H }, 6, 33, false).length;
  };
  t.eq('unos dos puntos de verdad: dos manchas, la de abajo en la base', columna([[12, 15], [24, 27]]), 1);
  t.eq('dos manchas casi pegadas no son dos puntos', columna([[10, 16], [18, 27]]), 0);
  t.eq('un «=» no son dos puntos: la de abajo no llega a la base', columna([[8, 10], [14, 16]]), 0);
  t.eq('una mancha alta no es un punto', columna([[7, 9], [13, 27]]), 0);
  t.eq('ni arriba', columna([[6, 19], [23, 27]]), 0);
  t.eq('con tinta en lo alto de las cifras no son dos puntos', columna([[2, 5], [24, 27]]), 0);

  /* Tres a la misma distancia, y a distancia de timecode. */
  const sep = (f) => { const q = M.tcpFranjas(f)[0]; return M.tcpSeparadores(f, q.a, q.b, M.tcpGruposEn(f, q.a, q.b)); };
  const holgado = { ch: 40, hueco: 16 };
  t.ok('con sitio de sobra entre cifras, también', !!sep(pantalla('01:18:23:04', holgado)));
  t.eq('con el tercero fuera de su sitio no se inventa el reparto',
       sep(pantalla('01:18:23:04', Object.assign({ corre3: 14 }, holgado))), null);
  t.ok('pero un par de píxeles de más sí se perdonan', !!sep(pantalla('01:18:23:04', Object.assign({ corre3: 3 }, holgado))));
  const solos = (xs) => {
    const W = Math.max.apply(null, xs) + 20, H = 40, g = new Float32Array(W * H);
    for(const x0 of xs) for(const [a, b] of [[12, 14], [24, 26]])
      for(let y = a; y <= b; y++) for(let x = x0; x < x0 + 4; x++) g[(6 + y) * W + x] = 1;
    const f = { g: g, w: W, h: H };
    return M.tcpSeparadores(f, 6, 33, M.tcpGruposEn(f, 6, 33));
  };
  t.ok('tres dos puntos a distancia de timecode, sí', !!solos([10, 70, 130]));
  t.eq('tres pegados, como en «:::», no', solos([10, 20, 30]), null);
  t.eq('ni tres separados de más, que entre ellos caben más de dos cifras', solos([10, 110, 210]), null);
}

/* ── 18 · letra de ancho fijo, cifras pegadas y etiqueta al lado ───────── */
t.seccion('18 · letra de ancho fijo, cifras pegadas y etiqueta al lado');
{
  /* Cada casilla tiene que caer centrada en su cifra, y no vale partir a
     medias entre dos puntos: en letra de ancho fijo los dos puntos ocupan lo
     que una cifra, y partiendo a medias cada primera cifra de pareja quedaba
     pegada a un lado de su casilla y la segunda al otro: 0 de 21 con Courier. */
  const centradas = (f, L) => !!L && L.length === 8
    && L.every((c, i) => Math.abs((c.x + c.w / 2) * f.w - f.cifras[i]) <= 25 * 0.12);
  const lejos = (f, L) => L ? L.map((c, i) => ((c.x + c.w / 2) * f.w - f.cifras[i]).toFixed(1)).join(' ') : 'sin casillas';
  const casos = [
    ['como siempre', {}],
    ['letra de ancho fijo', { aire: 7 }],
    ['las cifras de cada pareja pegadas', { pegadas: true }],
    ['con la etiqueta al lado, en la misma franja', { delante: true }]
  ];
  for(const [nom, o] of casos){
    const f = pantalla('01:23:45:67', o);
    const L = M.tcpLayout(f);
    t.ok(nom + ': las ocho casillas centradas en sus cifras', centradas(f, L), lejos(f, L));

    TCP.celdas = null; TCP.plantillas = {}; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
    let cual = f;
    M.ponFoto(() => cual);
    M.tcpEnsenar('01:23:45:67');
    cual = pantalla('89:01:23:45', o);
    M.tcpEnsenar('89:01:23:45');
    cual = pantalla('12:34:56:78', o);
    const l = M.tcpLeerUna();
    t.eq(nom + ': y lee lo que pone', l && l.txt, '12345678');
  }
  t.eq('pegadas, por trozos no salía el reparto', M.tcpLayoutTrozos(pantalla('01:23:45:67', { pegadas: true })), null);
  t.eq('con la etiqueta al lado, tampoco', M.tcpLayoutTrozos(pantalla('01:23:45:67', { delante: true })), null);

  const fe = pantalla('01:18:23:04', { delante: true });
  const r = M.tcpRecortar(fe);
  const finEtiqueta = 6 + 3 * 7 + 2 * 7 - 1;         // su última columna: margen, tres letras y dos huecos
  t.ok('el recuadro se ajusta al contador y deja fuera la etiqueta', !!r && r.x * fe.w > finEtiqueta,
       r ? ('empieza en ' + (r.x * fe.w).toFixed(1)) : 'no lo encontró');
  t.ok('sin cortar la primera cifra', !!r && r.x * fe.w < fe.cifras[0] - 9);
  t.ok('ni la última', !!r && (r.x + r.w) * fe.w > fe.cifras[7] + 9);
  const fp = pantalla('01:18:23:04', { pegadas: true, delante: true });
  const rp = M.tcpRecortar(fp);
  t.ok('con las cifras pegadas, el recuadro se encuentra igual, que por trozos no salía',
       !!rp && rp.x * fp.w > finEtiqueta && rp.x * fp.w < fp.cifras[0] - 9, rp ? String(rp.x * fp.w) : 'no lo encontró');

  /* Unos dos puntos con algo escrito ENCIMA -una etiqueta sobre el contador-
     siguen yendo sueltos: los trozos se miran solo en las filas de las cifras.
     Si se mirasen en la foto entera, la etiqueta los juntaría en un trozo y
     cualquier otra cosa con forma de dos puntos les ganaría. Aquí, esa otra
     cosa son tres más a la derecha, más juntos. */
  {
    const W = 340, H = 40, g = new Float32Array(W * H);
    for(let y = 0; y < 4; y++) for(let x = 0; x < 200; x++) g[y * W + x] = 1;            // la etiqueta de encima
    for(const x0 of [10, 70, 130, 230, 270, 310]) for(const [a, b] of [[12, 14], [24, 26]])
      for(let y = a; y <= b; y++) for(let x = x0; x < x0 + 4; x++) g[(6 + y) * W + x] = 1;
    const f = { g: g, w: W, h: H };
    const q = M.tcpSeparadores(f, 6, 33, M.tcpGruposEn(f, 6, 33));
    t.eq('con una etiqueta encima, los dos puntos del contador siguen contando como sueltos',
         q ? q.map(x => x.a).join(' ') : 'ninguno', '10 70 130');
  }
  {
    /* Y tres sueltos le ganan a tres pegados a otra cosa, aunque los pegados
       estén más separados y a igual distancia. */
    const W = 340, H = 40, g = new Float32Array(W * H);
    for(const x0 of [10, 50, 90, 150, 210, 270]) for(const [a, b] of [[12, 14], [24, 26]])
      for(let y = a; y <= b; y++) for(let x = x0; x < x0 + 4; x++) g[(6 + y) * W + x] = 1;
    for(const x0 of [150, 210, 270]) for(let y = 6; y <= 33; y++) g[y * W + x0 + 4] = g[y * W + x0 + 5] = 1;
    const f = { g: g, w: W, h: H };
    const q = M.tcpSeparadores(f, 6, 33, M.tcpGruposEn(f, 6, 33));
    t.eq('tres sueltos ganan a tres pegados', q ? q.map(x => x.a).join(' ') : 'ninguno', '10 50 90');
  }
}

/* ── 19 · una cifra corrida se reconoce igual ──────────────────────────── */
t.seccion('19 · una cifra corrida se reconoce igual');
{
  /* La plantilla de un 0 se aprendió en su casilla, y el 0 que se lee puede
     estar en otra con la cifra un píxel o dos más a un lado: medir los dos
     puntos y el paso falla por eso. Por eso se prueba corrida. */
  TCP.celdas = null; TCP.plantillas = {}; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
  let cual = pantalla('01:23:45:67');
  M.ponFoto(() => cual);
  M.tcpEnsenar('01:23:45:67');
  cual = pantalla('89:01:23:45');
  M.tcpEnsenar('89:01:23:45');
  cual = pantalla('12:34:56:78', { baile: [3, -3, 2, -2, 3, -3, 1, -1] });
  const l = M.tcpLeerUna();
  t.eq('con cada cifra corrida hasta tres píxeles, lee lo que pone', l && l.txt, '12345678');
  t.ok('y con confianza', !!l && l.conf > 0.8, l ? String(l.conf) : 'no leyó');
  const c = TCP.celdas[0];
  const R = Math.max(1, Math.round(c.w * cual.w * M.TCP_HOLGURA));
  t.eq('se prueba corrida hasta la holgura, a cada lado, y un píxel arriba y abajo',
       M.tcpCorridas(cual, c).length, (2 * R + 1) * 3);
  t.ok('la holgura es menos de un cuarto de cifra: no llega a la de al lado',
       M.TCP_HOLGURA > 0.1 && M.TCP_HOLGURA < 0.25);
  const m = M.tcpCasar(cual, TCP.celdas[0]);
  t.ok('y dice cómo casó mejor, para aprender de ahí', !!m.cel && m.cel.length === 12 * 18);
}

/* ── 20 · enseñar a mano arregla una cifra mal aprendida ───────────────── */
t.seccion('20 · enseñar a mano arregla una cifra mal aprendida');
{
  TCP.celdas = null; TCP.plantillas = {}; TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
  let cual = pantalla('01:23:45:67');
  M.ponFoto(() => cual);
  M.tcpEnsenar('01:23:45:67');
  cual = pantalla('89:01:23:45');
  M.tcpEnsenar('89:01:23:45');
  const bueno2 = Float32Array.from(TCP.plantillas['2']);
  /* El 1 aprendido con el dibujo de un 8, como pasaba con el reparto de antes.
     Y se le enseña con un contador que solo trae UN 1, que es lo normal: con
     ocho unos, mezclar un 15 % ocho veces ya lo arreglaba. */
  const malo = () => { TCP.plantillas['1'] = Float32Array.from(TCP.plantillas['8']); };
  const unos = pantalla('11:11:11:11');
  const leeUnos = () => { const c = cual; cual = unos; const x = (M.tcpLeerUna() || {}).txt; cual = c; return x; };
  malo();
  t.ok('con el 1 mal aprendido no lee los unos', leeUnos() !== '11111111');
  cual = pantalla('01:20:00:00');
  M.tcpAprender(cual, '01200000');
  t.ok('mezclándolo, como se hacía, no se arregla: sigue sin leer los unos', leeUnos() !== '11111111', leeUnos());
  malo();
  const verdad = M.tcpCelda(cual, TCP.celdas[1]);
  const r = M.tcpEnsenar('01:20:00:00');
  t.ok('escribirlo a mano sí lo arregla: se queda con lo de ahora', r.ok && M.tcpParecido(TCP.plantillas['1'], verdad) > 0.999,
       M.tcpParecido(TCP.plantillas['1'], verdad).toFixed(3));
  t.eq('y ya lee los unos', leeUnos(), '11111111');
  /* Y una que se leería bien, pero por los pelos: medio 2 y medio 7. */
  TCP.plantillas['2'] = Float32Array.from(TCP.plantillas['2'], (v, i) => v * 0.5 + TCP.plantillas['7'][i] * 0.5);
  cual = pantalla('01:20:00:00');
  const de2 = M.tcpCasar(cual, TCP.celdas[2]);
  t.ok('una cifra que se leería bien pero por los pelos', de2.d === '2' && de2.s < M.TCP_RENUEVA,
       de2.d + ' ' + de2.s.toFixed(3));
  M.tcpEnsenar('01:20:00:00');
  t.ok('también se cambia al enseñarla a mano', M.tcpParecido(TCP.plantillas['2'], M.tcpCelda(cual, TCP.celdas[2])) > 0.999,
       M.tcpParecido(TCP.plantillas['2'], M.tcpCelda(cual, TCP.celdas[2])).toFixed(4));
  cual = pantalla('22:22:22:22', { baile: [1, 1, 1, 1, 1, 1, 1, 1] });
  M.tcpEnsenar('22:22:22:22');
  t.ok('una cifra que ya sabía bien no se tira al enseñarla: se mezcla',
       M.tcpParecido(TCP.plantillas['2'], bueno2) > 0.97,
       M.tcpParecido(TCP.plantillas['2'], bueno2).toFixed(3));
}

/* ── 21 · lo guardado de antes, y empezar de cero ──────────────────────── */
t.seccion('21 · lo guardado de antes, y empezar de cero');
{
  TCP.rect = { x: 0.1, y: 0.2, w: 0.3, h: 0.05 };
  M.tcpGuardar();
  t.eq('lo guardado lleva su versión', JSON.parse(almacen.getItem('ddl_tcp')).v, M.TCP_GUARDADO_V);

  /* Lo guardado con la versión de antes: sus casillas y sus cifras se sacaron
     con el reparto que no reconocía el contador. */
  const pl = {}; for(let i = 0; i < 10; i++) pl[String(i)] = Array.from({ length: 216 }, () => i / 10);
  almacen.setItem('ddl_tcp', JSON.stringify({ rect: { x: 0.4, y: 0.5, w: 0.2, h: 0.04 },
    celdas: [{ x: 0, y: 0, w: 0.1, h: 1 }], plantillas: pl, fps: 24, lat: 0.12 }));
  TCP.rect = null; TCP.celdas = null; TCP.plantillas = {}; TCP.fps = 25; TCP.lat = 0;
  M.tcpCargar();
  t.eq('de lo de antes se queda el recuadro', TCP.rect && TCP.rect.x, 0.4);
  t.eq('y los ajustes', TCP.fps + ' ' + TCP.lat, '24 0.12');
  t.eq('pero no las casillas', TCP.celdas, null);
  t.eq('ni las cifras', M.tcpFaltan().length, 10);

  almacen.setItem('ddl_tcp', JSON.stringify({ v: M.TCP_GUARDADO_V, rect: { x: 0.4, y: 0.5, w: 0.2, h: 0.04 },
    celdas: [{ x: 0, y: 0, w: 0.1, h: 1 }], plantillas: pl, fps: 24, lat: 0.12 }));
  M.tcpCargar();
  t.ok('lo de ahora se carga entero', !!TCP.celdas && M.tcpFaltan().length === 0);

  TCP.on = true; TCP.tc = 12; TCP.fps = 30; TCP.lat = 0.2;
  M.tcpOlvidar();
  t.ok('empezar de cero olvida el recuadro, las casillas y las cifras',
       TCP.rect === null && TCP.celdas === null && M.tcpFaltan().length === 10);
  t.eq('y deja de seguir', TCP.on + ' ' + TCP.tc, 'false null');
  t.eq('pero no los ajustes de la sala', TCP.fps + ' ' + TCP.lat, '30 0.2');
  const o = JSON.parse(almacen.getItem('ddl_tcp'));
  t.ok('y lo olvidado se olvida también en lo guardado',
       o.rect === null && o.celdas === null && Object.keys(o.plantillas).length === 0 && o.fps === 30);
  t.eq('con lo que al compartir, lo siguiente es marcar el contador',
       (() => { const v = TCP.video; TCP.video = { videoWidth: 10 }; const q = M.tcpQueFalta(); TCP.video = v; return q; })(), 'marcar');
}

/* ── 22 · si no engancha, dice por qué ─────────────────────────────────── */
t.seccion('22 · si no engancha, dice por qué');
{
  /* El síntoma que llegó de sala fue «no lo reconoce», sin más: no había
     manera de saber si no veía el contador o si no entendía las cifras. */
  const probar = (foto, lectura, enganchado) => {
    avisos.length = 0;
    ahora = 50000;
    TCP.on = true; TCP.tc = enganchado ? 100 : null; TCP.t0 = ahora; TCP.rodando = false;
    TCP._hist = []; TCP._dudas = []; TCP._leidas = 0; TCP._malas = 0;
    TCP._desde = ahora; TCP._avisado = false;
    TCP.rect = { x: 0, y: 0, w: 1, h: 1 };
    M.ponFoto(foto);
    M.ponLeer(lectura);
    const antes = [];
    for(let ms = 0; ms <= M.TCP_AVISO_MS + 3000; ms += 66){
      ahora += 66; M.tcpMirar();
      if(ms < M.TCP_AVISO_MS - 100) antes.push(avisos.length);
    }
    return { antes: Math.max.apply(null, antes), avisos: avisos.slice() };
  };
  const sinLeer = () => ({ celdas: 8, txt: '', seg: null, conf: 0 });
  const a = probar(() => pantalla('011823', { sinPuntos: true }), sinLeer, false);
  t.eq('no avisa enseguida: al principio puede estar la ventana tapada', a.antes, 0);
  t.eq('pasado el rato, avisa una vez y no machaca', a.avisos.length, 1, a.avisos.join(' | '));
  t.ok('sin contador en el recuadro, dice que no lo encuentra', /No encuentro el contador/.test(a.avisos[0] || ''),
       a.avisos[0]);
  const b = probar(() => pantalla('01:18:23:04'), sinLeer, false);
  t.ok('con el contador a la vista, dice que no entiende las cifras', /no entiendo sus cifras/.test(b.avisos[0] || ''),
       b.avisos[0]);
  const c = probar(() => null, () => null, false);
  t.ok('sin imagen, dice que no llega', /No llega imagen/.test(c.avisos[0] || ''), c.avisos[0]);
  const d = probar(() => pantalla('01:18:23:04'), sinLeer, true);
  t.eq('enganchado, no avisa de nada', d.avisos.length, 0);
  TCP.on = false; TCP._desde = 0;
}

/* ── 23 · el seguimiento late aunque Dubbipt esté tapado ───────────────── */
t.seccion('23 · el seguimiento late aunque Dubbipt esté tapado');
{
  /* Con Dubbipt tapado por Pro Tools -lo normal en la sala- el navegador frena
     los temporizadores de la página a uno por segundo, y para enganchar hacen
     falta tres lecturas en segundo y medio: con un temporizador no enganchaba
     nunca. Se vio en el navegador, con las diez cifras aprendidas y cada
     lectura bien leída. El latido sale del mismo trabajador que el del
     aprendizaje. */
  latidos.length = 0;
  ahora = 90000;
  TCP.on = false; TCP.tc = null; TCP._leidas = 0; TCP._malas = 0; TCP._hist = []; TCP._dudas = [];
  M.ponLeer(() => ({ celdas: 8, txt: '', seg: 100, conf: 0.9 }));
  M.tcpArrancar();
  t.eq('late con el latido del trabajador, cada 66 ms', latidos.length + ' ' + (latidos[0] || {}).ms, '1 66');
  t.eq('y lee ya, sin esperar al primer latido', TCP._leidas, 1);
  ahora += 66; latidos[0].fn();
  t.eq('cada latido es una lectura', TCP._leidas, 2);
  latidos[0].fn();
  t.eq('dos latidos pegados, una sola: si una vuelta tarda, no se hace cola', TCP._leidas, 2);
  ahora += 66; latidos[0].fn();
  ahora += 66; latidos[0].fn();
  t.ok('y con eso engancha', TCP.tc != null);
  M.tcpArrancar();
  t.ok('arrancar otra vez para el latido de antes', latidos[0].parado && !latidos[1].parado);
  M.tcpParar();
  t.ok('y parar, el suyo', latidos[1].parado);
  ahora += 66; latidos[1].fn();
  t.eq('parado, un latido rezagado ya no lee', TCP._leidas, 5);
}

/* ── 24 · un contador grande se reduce antes de leerlo ─────────────────── */
t.seccion('24 · un contador grande se reduce antes de leerlo');
{
  /* El Big Counter en una pantalla grande, a tamaño real, costaba 60 ms cada
     lectura, medido: el hilo de la página casi entero, quince veces por
     segundo. Se reduce al dibujarlo, que es donde no cuesta. */
  const antes = { v: TCP.video, r: TCP.rect, cv: TCP._cv, g: TCP._g };
  TCP._cv = null; TCP._g = null;
  TCP.video = { videoWidth: 3840, videoHeight: 2160 };
  TCP.rect = { x: 0.1, y: 0.1, w: 0.5, h: 0.1 };            // 1920 x 216 en pantalla
  trazos.length = 0;
  const f = M.tcpFotoDeVerdad();
  t.ok('un contador de 1920 de ancho se lee a ' + M.TCP_FOTO_MAX, !!f && f.w === 480 && f.h === 54,
       f ? f.w + 'x' + f.h : 'sin foto');
  const d = trazos[trazos.length - 1] || [];
  t.ok('reducido al dibujarlo', d[1] === 384 && d[3] === 1920 && d[4] === 216 && d[7] === 480 && d[8] === 54,
       JSON.stringify(d.slice(1)));
  TCP.rect = { x: 0.1, y: 0.1, w: 0.05, h: 0.02 };          // 192 x 43
  const g = M.tcpFotoDeVerdad();
  t.ok('uno pequeño se queda como está', !!g && g.w === 192 && g.h === 43, g ? g.w + 'x' + g.h : 'sin foto');
  TCP.video = antes.v; TCP.rect = antes.r; TCP._cv = antes.cv; TCP._g = antes.g;
}
};
