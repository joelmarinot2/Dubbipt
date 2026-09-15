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
   'ponLeer: (f) => { tcpLeerUna = f; }'],
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
};
