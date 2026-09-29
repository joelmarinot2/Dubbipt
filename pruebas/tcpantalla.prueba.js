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

const guardado = {};
const almacen = {
  getItem: (k) => (k in guardado ? guardado[k] : null),
  setItem: (k, v) => { guardado[k] = String(v); },
  removeItem: (k) => { delete guardado[k]; }
};

/* Un navegador de mentira: lo justo para probar el camino de compartir. */
let videoQueSale = () => ({ play: async () => {}, videoWidth: 0, videoHeight: 0 });
const doc = { createElement: (q) => (q === 'video' ? videoQueSale() : {}) };
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
   'tcpRecortar', 'tcpDentroDe', 'tcpQueFalta', 'tcpFoto: () => tcpFoto'],
  { performance: perf, localStorage: almacen, document: doc, navigator: nav }
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
 */
function pantalla(txt, opt){
  const o = opt || {};
  const t8 = String(txt).replace(/[^0-9]/g, '');
  const cw = o.cw || 18, ch = o.ch || 28, hueco = o.hueco || 7;
  const sw = o.sw || 5, pad = o.pad || 6, gro = o.gro || 3;
  const items = [];
  for(let i = 0; i < 8; i++){
    items.push({ tipo: 'd', d: t8[i], w: cw });
    if(!o.sinPuntos && (i === 1 || i === 3 || i === 5)) items.push({ tipo: 's', w: sw });
  }
  let W = pad * 2, H = ch + pad * 2;
  items.forEach((it, i) => { W += it.w + (i ? hueco : 0); });
  const g = new Float32Array(W * H);
  let x = pad;
  items.forEach((it, i) => {
    if(i) x += hueco;
    if(it.tipo === 'd'){
      const c = pintaCifra(it.d, it.w, ch, gro);
      for(let yy = 0; yy < ch; yy++) for(let xx = 0; xx < it.w; xx++)
        if(c[yy * it.w + xx]) g[(yy + pad) * W + (x + xx)] = 1;
    }else{
      for(const cy of [Math.round(ch * 0.33), Math.round(ch * 0.7)])
        for(let yy = 0; yy < gro; yy++) for(let xx = 0; xx < it.w; xx++)
          g[(cy + yy + pad) * W + (x + xx)] = 1;
    }
    x += it.w;
  });
  return { g: g, w: W, h: H };
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
t.ok('a triple velocidad no es creible', !M.tcpRecta(recta(3, 5)));
t.ok('hacia atras no es creible', !M.tcpRecta(recta(-1, 5)));
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
}
};
