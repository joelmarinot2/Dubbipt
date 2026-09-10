/* Señalizacion de sala y banda ritmica · especificacion 04
 *
 * Salio de index.html en la fase 2 (un archivo por asunto). El codigo va tal
 * cual: esta extraccion NO cambia comportamiento, solo lo saca de un archivo
 * de 18.700 lineas.
 *
 * Sigue siendo un script clasico, no un modulo: comparte el ambito global con
 * los dos <script> en linea de index.html, igual que antes. Se carga DESPUES
 * de ellos, asi que puede usar todo lo que declaran; y ellos pueden usar estas
 * funciones porque cuando se llaman ya esta todo cargado.
 *
 * De donde depende: studioEl, studioTc0, studioFine, stMsg, karVentana, karSilabas, karEnv, karRepartir, karIa, adrDe, charIdx, script, esc
 */

/* ═══ SALA · SEÑALIZACIÓN DE ADR SOBRE LA IMAGEN ══════════════════════════

   Lo que en una sala de doblaje se proyecta encima del vídeo para que el actor
   entre a tiempo sin mirar un reloj:

   · STREAMER · una línea de color que cruza la pantalla de izquierda a derecha
     y llega al borde JUSTO en el fotograma en que empieza la intervención. El
     actor no cuenta segundos: ve venir la raya.
   · PUNCH · el destello del momento de entrada. Confirma lo que anunció el
     streamer.
   · BEEPS · los tres pitidos, uno por segundo. El cuarto no suena: ese es el
     de entrar. Es la señal de toda la vida, para cuando no se mira la pantalla.
   · BARRA · mientras dura la intervención, cuánto le queda.
   · TEXTO · el parlamento sobre la imagen, con el color del personaje.

   Y aparte, la BANDA RÍTMICA: la tira de texto que se desplaza bajo la imagen
   contra una línea fija. Cada palabra cruza esa línea en su instante, y el
   tamaño de la letra se ajusta al tiempo que tiene esa frase — que es lo que
   hace que se pueda leer «montado» sobre la boca. El karaoke enciende palabras
   en su sitio; la banda las mueve. Son cosas distintas y se usan a la vez.

   Todo se apoya en lo que ya hay: los timecodes del libreto (tcEff), el
   reparto de palabras del karaoke y el TC de inicio del vídeo. Nada de esto
   necesita audio decodificado para funcionar; con él, afina. */

const SALA = {
  on:false,            // señalización sobre la imagen
  banda:false,         // banda rítmica bajo la imagen
  seg:3,               // segundos que tarda el streamer en cruzar
  beeps:true,
  punch:true,
  texto:true,
  barra:true,
  pos:'abajo',         // dónde va el texto sobre la imagen
  tam:26,              // cuerpo de letra del texto sobre la imagen
  dir:'lr',            // 'lr' izquierda a derecha · 'bc' de los bordes al centro
  remate:true,         // la barra fija que marca dónde muere el streamer
  pps:150,             // píxeles por segundo de la banda rítmica
  bandaTam:30,
  marca:32,            // % de ancho donde está la línea de sincronía
  marcaGrosor:3,
  carriles:true,       // un carril por personaje en la banda
  actor:false,         // enseñar también el nombre del talento
  raf:0, ac:null, beepHecho:-1, cues:null, sello:''
};

/* Duraciones de streamer que se usan en sala. La de 2,67 s y la de 3,3 s
   vienen de los 4 y 5 metros de película a 24 fotogramas: no son caprichos,
   son las que trae la tradición y las que espera un actor con oficio. */
const SALA_SEGS = [1, 2, 2.67, 3, 3.3, 5];

/** El segundo de VÍDEO de un timecode de libreto. */
function salaVid(tc){ return tc - studioTc0() - studioFine(); }

/** Los cues del capítulo, en segundos de vídeo. Con memoria. */
function salaCues(){
  // el sello incluye las correcciones de los cues: si alguien mueve una
  // entrada, la lista tiene que rehacerse sola
  let firma = '';
  try{ firma = JSON.stringify(window._adrDatos || {}).length + ':'
             + Object.keys(window._adrDatos || {}).length; }catch(e){}
  const sello = (script ? script.length : 0) + '|' + studioTc0() + '|' + studioFine() + '|' + firma;
  if(SALA.cues && SALA.sello === sello) return SALA.cues;
  const out = [];
  for(let i = 0; i < script.length; i++){
    const b = script[i];
    if(!b || b.tcEff == null) continue;
    // La entrada y la salida son las del CUE, no las del libreto a secas: si
    // alguien las ha corregido a mano -o las ha pegado a un corte de plano-,
    // el streamer y la banda tienen que ir a donde de verdad entra.
    let t0, t1;
    const a = (typeof adrDe === 'function') ? adrDe(i) : null;
    if(a && a.tc0 != null && a.tc1 != null){ t0 = salaVid(a.tc0); t1 = salaVid(a.tc1); }
    else{
      const ven = (typeof karVentana === 'function') ? karVentana(i) : null;
      t0 = salaVid(ven ? ven[0] : b.tcEff);
      t1 = salaVid(ven ? ven[1] : (b.tcEff + 2));
    }
    const c = b.key ? charIdx[b.key] : null;
    out.push({ si:i, t0:t0, t1:Math.max(t0 + 0.25, t1), key:b.key || '',
               display:(c && c.display) || b.display || '',
               talento:(c && c.talent) || '',
               color:(c && c.color) || '#4ADE80',
               texto:(b.lines || []).join(' ') });
  }
  out.sort((a, b) => a.t0 - b.t0);
  SALA.cues = out; SALA.sello = sello;
  return out;
}
function salaOlvidar(){ SALA.cues = null; SALA.sello = ''; _salaPalCache.clear(); }

/**
 * Un CARRIL por personaje, como en una banda rítmica de verdad: si dos
 * personajes se solapan -y se solapan constantemente, que para eso es un
 * diálogo- cada uno va por su altura y se leen los dos. Se reparten los
 * carriles por orden de entrada y se reutiliza el primero que haya quedado
 * libre, que es como se reparten las pistas de una sesión.
 */
const SALA_CARRILES = 4;
function salaCarriles(cues){
  const finDe = new Array(SALA_CARRILES).fill(-1e9);
  const dePers = new Map();
  for(const c of cues){
    let carril = dePers.has(c.key) ? dePers.get(c.key) : -1;
    // el personaje conserva su carril mientras no se pise consigo mismo
    if(carril >= 0 && finDe[carril] > c.t0 + 0.001) carril = -1;
    if(carril < 0){
      carril = 0;
      for(let i = 0; i < SALA_CARRILES; i++) if(finDe[i] <= c.t0 + 0.001){ carril = i; break; }
      if(c.key) dePers.set(c.key, carril);
    }
    c.carril = carril;
    finDe[carril] = Math.max(finDe[carril], c.t1);
  }
  let usados = 1;
  for(const c of cues) usados = Math.max(usados, c.carril + 1);
  return usados;
}

/** El cue que suena ahora, y el siguiente que va a entrar. */
function salaSituar(t){
  const cs = salaCues();
  let act = null, prox = null;
  for(let i = 0; i < cs.length; i++){
    const c = cs[i];
    if(t >= c.t0 && t < c.t1){ act = c; }
    if(c.t0 > t){ prox = c; break; }
  }
  return { act:act, prox:prox };
}

/* ── Los pitidos ──────────────────────────────────────────────────────── */

function salaAudio(){
  try{
    if(!SALA.ac) SALA.ac = new (window.AudioContext || window.webkitAudioContext)();
    if(SALA.ac.state === 'suspended') SALA.ac.resume();
    return SALA.ac;
  }catch(e){ return null; }
}
/** Un pitido corto. 1 kHz es el de sala; el de entrada, más agudo. */
function salaBeep(hz, ms){
  const ac = salaAudio(); if(!ac) return;
  try{
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = 'sine'; o.frequency.value = hz || 1000;
    const t = ac.currentTime, d = (ms || 60) / 1000;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.005);
    g.gain.setValueAtTime(0.25, t + d - 0.01);
    g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g); g.connect(ac.destination);
    o.start(t); o.stop(t + d + 0.02);
  }catch(e){}
}

/* ── El lienzo de encima de la imagen ─────────────────────────────────── */

function salaCanvas(){
  const stage = $('stStage'); if(!stage) return null;
  let cv = document.getElementById('salaCv');
  if(!cv){
    cv = document.createElement('canvas');
    cv.id = 'salaCv';
    cv.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:5';
    stage.appendChild(cv);
  }
  const r = stage.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  return cv;
}

/** Texto con sombra: encima de una imagen cualquiera tiene que leerse. */
function salaTexto(g, txt, x, y, px, color, centro){
  g.font = '700 ' + px + 'px Inter, system-ui, sans-serif';
  g.textAlign = centro ? 'center' : 'left';
  g.textBaseline = 'middle';
  g.lineWidth = Math.max(2, px * 0.16);
  g.strokeStyle = 'rgba(0,0,0,.85)';
  g.strokeText(txt, x, y);
  g.fillStyle = color || '#fff';
  g.fillText(txt, x, y);
}

/** Parte una frase en renglones que quepan en `ancho`. */
function salaRenglones(g, txt, ancho, px){
  g.font = '700 ' + px + 'px Inter, system-ui, sans-serif';
  const pal = String(txt || '').split(/\s+/).filter(Boolean);
  const out = []; let linea = '';
  for(const p of pal){
    const prueba = linea ? (linea + ' ' + p) : p;
    if(g.measureText(prueba).width > ancho && linea){ out.push(linea); linea = p; }
    else linea = prueba;
  }
  if(linea) out.push(linea);
  return out.slice(0, 3);
}

/** Pinta la señalización para el segundo de vídeo `t`. */
function salaPintar(t){
  const cv = salaCanvas(); if(!cv) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  g.clearRect(0, 0, W, H);
  if(!SALA.on) return;
  const dpr = W / Math.max(1, $('stStage').getBoundingClientRect().width);
  const { act, prox } = salaSituar(t);

  // ── STREAMER: cruza la pantalla y muere en la entrada del cue ──
  if(prox){
    const falta = prox.t0 - t;
    if(falta >= 0 && falta <= SALA.seg){
      const k = 1 - falta / SALA.seg;            // 0 al empezar, 1 al entrar
      const raya = (x) => { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, H); g.stroke(); };
      g.save();
      g.strokeStyle = prox.color;
      g.lineWidth = Math.max(3, 4 * dpr);
      g.shadowColor = prox.color; g.shadowBlur = 12 * dpr;
      if(SALA.dir === 'bc'){                     // de los dos bordes al centro
        raya(W * 0.5 * k);
        raya(W - W * 0.5 * k);
      }else{                                     // de izquierda a derecha
        raya(W * k);
      }
      g.restore();
      // el remate: la barra fija que dice dónde va a morir la raya
      if(SALA.remate){
        g.save(); g.globalAlpha = 0.5; g.fillStyle = prox.color;
        const gr = Math.max(2, 3 * dpr);
        if(SALA.dir === 'bc') g.fillRect(W/2 - gr/2, 0, gr, H);
        else g.fillRect(W - gr, 0, gr, H);
        g.restore();
      }
      // el nombre del personaje viaja con la raya
      const xn = (SALA.dir === 'bc') ? (W * 0.5 * k) : (W * k);
      salaTexto(g, prox.display + (SALA.actor && prox.talento ? ' · ' + prox.talento : ''),
                Math.min(W - 8 * dpr, xn + 9 * dpr), 18 * dpr, 13 * dpr, prox.color);
    }
  }

  // ── PUNCH: destello en el fotograma de entrada ──
  if(SALA.punch && act){
    const d = t - act.t0;
    if(d >= 0 && d < 0.18){
      const k = 1 - d / 0.18;
      g.save();
      g.globalAlpha = 0.75 * k;
      g.strokeStyle = '#fff'; g.lineWidth = Math.max(3, 5 * dpr);
      const R = Math.min(W, H) * 0.16;
      g.beginPath(); g.arc(W - R - 22 * dpr, R + 22 * dpr, R, 0, Math.PI * 2); g.stroke();
      g.restore();
    }
  }

  // ── BARRA: cuánto le queda a la intervención en curso ──
  if(SALA.barra && act){
    const k = Math.min(1, Math.max(0, (t - act.t0) / Math.max(0.2, act.t1 - act.t0)));
    const alto = Math.max(4, 5 * dpr), y = H - alto;
    g.fillStyle = 'rgba(255,255,255,.18)'; g.fillRect(0, y, W, alto);
    g.fillStyle = act.color; g.fillRect(0, y, W * k, alto);
  }

  // ── TEXTO del parlamento, con el color del personaje ──
  if(SALA.texto && act){
    const px = SALA.tam * dpr;
    const margen = 26 * dpr;
    const rens = salaRenglones(g, act.texto, W - margen * 2, px);
    const alto = px * 1.35;
    let y = (SALA.pos === 'arriba') ? (margen + px) : (H - margen - alto * rens.length);
    salaTexto(g, act.display, W / 2, y - alto * 0.75, px * 0.55, act.color, true);
    for(const r of rens){ salaTexto(g, r, W / 2, y, px, '#fff', true); y += alto; }
  }
}

/* ── La banda rítmica ─────────────────────────────────────────────────── */

/** Tiempos de cada palabra de un bloque, SIN depender del libreto pintado. */
function salaPalabras(si){
  const b = script[si]; if(!b) return null;
  const pal = (b.lines || []).join(' ').split(/\s+/).filter(Boolean);
  if(!pal.length) return null;
  const ven = karVentana(si); if(!ven) return null;
  const ia = (typeof karIa !== 'undefined' && karIa.on && karIa.marcas.get(si)) || null;
  let tr = null;
  if(ia && ia.length === pal.length) tr = ia;
  else{
    const sil = pal.map(p => karSilabas(p));
    let db = null;
    try{ db = karEnv(salaVid(ven[0]), salaVid(ven[1])); }catch(e){}
    try{ tr = karRepartir(sil, ven[0], ven[1], db); }catch(e){ tr = null; }
  }
  if(!tr || tr.length !== pal.length) return null;
  // el motor devuelve {t0,t1}; la IA, lo mismo. Se admiten las dos formas por
  // si alguna vez vuelve un par [t0,t1]: un NaN aqui vacia la banda entera.
  const par = (x) => (x && x.t0 !== undefined) ? [x.t0, x.t1] : [x[0], x[1]];
  const out = [];
  for(let i = 0; i < pal.length; i++){
    const [a, b2] = par(tr[i]);
    if(!isFinite(a) || !isFinite(b2)) return null;
    out.push({ p:pal[i], t0:salaVid(a), t1:salaVid(b2) });
  }
  return out;
}
const _salaPalCache = new Map();
function salaPalabrasCache(si){
  const clave = si + '|' + studioTc0() + '|' + studioFine();
  if(_salaPalCache.has(clave)) return _salaPalCache.get(clave);
  let r = null; try{ r = salaPalabras(si); }catch(e){}
  if(_salaPalCache.size > 300) _salaPalCache.clear();
  _salaPalCache.set(clave, r);
  return r;
}

function salaBandaCanvas(){
  const left = $('stLeft'); if(!left) return null;
  let cv = document.getElementById('salaBanda');
  if(!cv){
    cv = document.createElement('canvas');
    cv.id = 'salaBanda';
    cv.style.cssText = 'display:none;flex:0 0 auto;width:100%;height:96px;background:#07060f;'
      + 'border-top:1px solid #241d4d;border-bottom:1px solid #241d4d';
    const stage = $('stStage');
    if(stage && stage.nextSibling) left.insertBefore(cv, stage.nextSibling);
    else left.appendChild(cv);
  }
  cv.style.display = SALA.banda ? 'block' : 'none';
  if(!SALA.banda) return cv;
  const r = cv.getBoundingClientRect();
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if(cv.width !== w || cv.height !== h){ cv.width = w; cv.height = h; }
  return cv;
}

/** La tira que se desplaza: cada palabra cruza la línea en su instante. */
function salaBandaPintar(t){
  const cv = salaBandaCanvas(); if(!cv || !SALA.banda) return;
  const g = cv.getContext('2d');
  const W = cv.width, H = cv.height;
  const dpr = W / Math.max(1, cv.getBoundingClientRect().width);
  const pps = SALA.pps * dpr;
  const xLinea = W * Math.min(0.9, Math.max(0.05, SALA.marca / 100));
  g.clearRect(0, 0, W, H);
  g.fillStyle = '#07060f'; g.fillRect(0, 0, W, H);

  const antes = xLinea / pps, despues = (W - xLinea) / pps;
  const cs = salaCues();
  const nCar = SALA.carriles ? salaCarriles(cs) : 1;
  const altoCar = H / nCar;
  const base = Math.min(SALA.bandaTam * dpr, altoCar * 0.42);

  for(const c of cs){
    if(c.t1 < t - antes || c.t0 > t + despues) continue;
    const car = SALA.carriles ? (c.carril || 0) : 0;
    const y0 = car * altoCar;
    const x0 = xLinea + (c.t0 - t) * pps, x1 = xLinea + (c.t1 - t) * pps;
    // la banda del personaje, tenue: se ve dónde empieza y dónde acaba
    g.save(); g.globalAlpha = 0.13; g.fillStyle = c.color;
    g.fillRect(x0, y0 + altoCar * 0.26, Math.max(2, x1 - x0), altoCar * 0.62); g.restore();
    g.fillStyle = c.color;
    g.fillRect(x0, y0 + altoCar * 0.26, Math.max(2, 2 * dpr), altoCar * 0.62);
    salaTexto(g, c.display + (SALA.actor && c.talento ? ' · ' + c.talento : ''),
              x0 + 6 * dpr, y0 + altoCar * 0.15, Math.min(12 * dpr, altoCar * 0.22), c.color);

    const pal = salaPalabrasCache(c.si);
    // el cuerpo se ajusta al tiempo que tiene la frase: es lo que permite
    // leerla montada sobre la boca en vez de ir a destiempo
    let px = base;
    if(pal){
      g.font = '700 ' + base + 'px Inter, system-ui, sans-serif';
      let ancho = 0;
      for(const w2 of pal) ancho += g.measureText(w2.p + ' ').width;
      const hueco = Math.max(1, x1 - x0);
      if(ancho > hueco) px = Math.max(9 * dpr, base * (hueco / ancho));
    }
    const y = y0 + altoCar * 0.58;
    if(pal){
      for(const w2 of pal){
        const wx = xLinea + (w2.t0 - t) * pps;
        if(wx > W + 40 * dpr || wx < -140 * dpr) continue;
        const dicha = t >= w2.t0;
        const ahora = t >= w2.t0 && t < w2.t1;
        salaTexto(g, w2.p, wx, y, px, ahora ? '#FFE066' : (dicha ? c.color : '#E7EBF3'));
      }
    }else{
      salaTexto(g, c.texto, x0 + 6 * dpr, y, px * 0.8, '#E7EBF3');
    }
  }

  // separación entre carriles, para no leer de un renglón a otro
  if(nCar > 1){
    g.fillStyle = 'rgba(255,255,255,.07)';
    for(let i = 1; i < nCar; i++) g.fillRect(0, i * altoCar, W, 1);
  }

  // la línea de sincronía: lo que la cruza, se dice
  g.save();
  g.strokeStyle = '#FFE066'; g.lineWidth = Math.max(2, SALA.marcaGrosor * dpr);
  g.shadowColor = '#FFE066'; g.shadowBlur = 10 * dpr;
  g.beginPath(); g.moveTo(xLinea, 0); g.lineTo(xLinea, H); g.stroke();
  g.restore();
}

/* ── El bucle ─────────────────────────────────────────────────────────── */

function salaAhora(){
  const el = studioEl();
  if(!el || !el.duration) return null;
  return el.currentTime;
}
function salaBucle(){
  SALA.raf = 0;
  if(!SALA.on && !SALA.banda) return;
  const t = salaAhora();
  if(t != null){
    try{ salaPintar(t); }catch(e){ fallo('salaPintar · js\sala.js:432', e); }
    try{ salaBandaPintar(t); }catch(e){ fallo('salaBandaPintar · js\sala.js:433', e); }
    try{ salaBeeps(t); }catch(e){}
  }
  SALA.raf = requestAnimationFrame(salaBucle);
}
function salaArrancar(){
  if(SALA.raf) return;
  if(!SALA.on && !SALA.banda) return;
  SALA.raf = requestAnimationFrame(salaBucle);
}
function salaParar(){
  if(SALA.raf){ cancelAnimationFrame(SALA.raf); SALA.raf = 0; }
  try{ const cv = document.getElementById('salaCv'); if(cv) cv.getContext('2d').clearRect(0,0,cv.width,cv.height); }catch(e){}
}

/** Tres pitidos, uno por segundo. El cuarto no suena: ese es el de entrar. */
function salaBeeps(t){
  if(!SALA.on || !SALA.beeps) return;
  const el = studioEl();
  if(!el || el.paused) return;
  const { prox } = salaSituar(t);
  if(!prox) return;
  const falta = prox.t0 - t;
  if(falta < 0 || falta > 3.2) return;
  const n = Math.round(falta);                 // 3, 2, 1
  if(n < 1 || n > 3) return;
  if(Math.abs(falta - n) > 0.06) return;       // solo justo al cruzar el segundo
  const marca = prox.si * 10 + n;
  if(SALA.beepHecho === marca) return;
  SALA.beepHecho = marca;
  salaBeep(1000, 55);
}

/* ── Botones y ajustes ────────────────────────────────────────────────── */

function salaGuardar(){
  try{ localStorage.setItem('ddl_sala', JSON.stringify({
    on:SALA.on, banda:SALA.banda, seg:SALA.seg, beeps:SALA.beeps, punch:SALA.punch,
    texto:SALA.texto, barra:SALA.barra, pos:SALA.pos, tam:SALA.tam,
    pps:SALA.pps, bandaTam:SALA.bandaTam, dir:SALA.dir, remate:SALA.remate,
    marca:SALA.marca, marcaGrosor:SALA.marcaGrosor, carriles:SALA.carriles,
    actor:SALA.actor })); }catch(e){}
}
function salaCargar(){
  try{
    const j = JSON.parse(localStorage.getItem('ddl_sala') || '{}');
    for(const k of ['on','banda','seg','beeps','punch','texto','barra','pos','tam','pps','bandaTam',
                    'dir','remate','marca','marcaGrosor','carriles','actor'])
      if(j[k] !== undefined) SALA[k] = j[k];
  }catch(e){}
}

function salaPintarBotones(){
  const b1 = $('stSala'), b2 = $('stBanda');
  if(b1){ b1.classList.toggle('on', SALA.on); b1.title = SALA.on
    ? 'Señalización de sala encendida — clic para apagarla'
    : 'Streamer, beeps, punch y texto sobre la imagen'; }
  if(b2){ b2.classList.toggle('on', SALA.banda); b2.title = SALA.banda
    ? 'Banda rítmica encendida — clic para apagarla'
    : 'Banda rítmica: el texto se desplaza contra una línea fija'; }
}

function salaToggle(v){
  SALA.on = (v == null) ? !SALA.on : !!v;
  SALA.beepHecho = -1;
  salaPintarBotones(); salaGuardar();
  if(SALA.on){ salaAudio(); salaArrancar(); stMsg('🎯 Sala: streamer de ' + SALA.seg + ' s'
    + (SALA.beeps ? ', 3 beeps' : ', sin beeps') + (SALA.texto ? ' y texto' : '')); }
  else{ if(!SALA.banda) salaParar(); else salaArrancar();
        try{ const cv=document.getElementById('salaCv'); if(cv) cv.getContext('2d').clearRect(0,0,cv.width,cv.height); }catch(e){}
        stMsg('Señalización de sala apagada'); }
}
function salaBandaToggle(v){
  SALA.banda = (v == null) ? !SALA.banda : !!v;
  salaPintarBotones(); salaGuardar();
  salaBandaCanvas();
  if(SALA.banda){ salaArrancar(); stMsg('🎞 Banda rítmica: ' + SALA.pps + ' px por segundo'); }
  else{ if(!SALA.on) salaParar(); stMsg('Banda rítmica apagada'); }
}

/** Ajustes: lo justo, y cada cosa con su para qué. */
function salaPanel(){
  const viejo = document.getElementById('salaOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'salaOv'; ov.className = 'modo-cap';
  const chk = (id, on, txt) => '<label class="sala-c"><input type="checkbox" id="' + id + '"'
    + (on ? ' checked' : '') + '> ' + txt + '</label>';
  ov.innerHTML = '<div class="modo-caja" style="max-width:520px;text-align:left">'
    + '<div class="modo-tit">Sala</div>'
    + '<div class="modo-sub" style="margin-bottom:6px">Señalización sobre la imagen</div>'
    + '<div class="meta-nota">El <b>streamer</b> cruza la pantalla y llega al borde en el fotograma '
    + 'exacto de la entrada. Los <b>beeps</b> son tres, uno por segundo: el cuarto no suena, y ese '
    + 'es el de entrar.</div>'
    + '<div class="sala-rej">'
    +   '<label class="sala-c">Streamer <select id="salaSeg">'
    +     SALA_SEGS.map(v => '<option value="' + v + '"' + (Math.abs(SALA.seg - v) < 0.01 ? ' selected' : '') + '>'
    +       String(v).replace('.', ',') + ' s</option>').join('')
    +     (SALA_SEGS.some(v => Math.abs(SALA.seg - v) < 0.01) ? '' :
    +       '<option value="' + SALA.seg + '" selected>' + String(SALA.seg).replace('.', ',') + ' s</option>')
    +   '</select></label>'
    +   '<label class="sala-c">Sentido <select id="salaDir">'
    +     '<option value="lr"' + (SALA.dir === 'lr' ? ' selected' : '') + '>izquierda a derecha</option>'
    +     '<option value="bc"' + (SALA.dir === 'bc' ? ' selected' : '') + '>de los bordes al centro</option>'
    +   '</select></label>'
    +   '<label class="sala-c">Letra del texto <input id="salaTam" type="number" min="12" max="64" value="' + SALA.tam + '"> px</label>'
    +   '<label class="sala-c">Texto <select id="salaPos">'
    +     '<option value="abajo"' + (SALA.pos === 'abajo' ? ' selected' : '') + '>abajo</option>'
    +     '<option value="arriba"' + (SALA.pos === 'arriba' ? ' selected' : '') + '>arriba</option></select></label>'
    +   '<label class="sala-c">Banda <input id="salaPps" type="number" min="40" max="400" step="10" value="' + SALA.pps + '"> px/s</label>'
    +   '<label class="sala-c">Letra de la banda <input id="salaBTam" type="number" min="12" max="60" value="' + SALA.bandaTam + '"> px</label>'
    +   '<label class="sala-c">Línea de sincronía <input id="salaMarca" type="number" min="5" max="90" value="' + SALA.marca + '"> %</label>'
    +   '<label class="sala-c">Grosor de la línea <input id="salaMG" type="number" min="1" max="12" value="' + SALA.marcaGrosor + '"> px</label>'
    + '</div>'
    + '<div class="sala-rej">'
    +   chk('salaBeeps', SALA.beeps, 'Beeps')
    +   chk('salaPunch', SALA.punch, 'Punch (destello de entrada)')
    +   chk('salaTexto', SALA.texto, 'Texto sobre la imagen')
    +   chk('salaBarra', SALA.barra, 'Barra de lo que queda')
    +   chk('salaRemate', SALA.remate, 'Remate: la barra fija donde muere el streamer')
    +   chk('salaCarr', SALA.carriles, 'Un carril por personaje en la banda')
    +   chk('salaActor', SALA.actor, 'Enseñar también el nombre del talento')
    + '</div>'
    + '<div class="dud-btns"><button class="modo-op dud-b" id="salaProbar">▶ Probar beeps</button>'
    + '<button class="modo-op dud-b dud-ok" id="salaOk">Listo</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });
  ov.querySelector('#salaOk').onclick = cerrar;
  ov.querySelector('#salaProbar').onclick = () => {
    salaBeep(1000, 55);
    setTimeout(() => salaBeep(1000, 55), 700);
    setTimeout(() => salaBeep(1000, 55), 1400);
  };
  const num = (id, campo, min, max) => {
    const e = ov.querySelector('#' + id);
    e.onchange = () => { const v = +e.value; if(isFinite(v)) SALA[campo] = Math.min(max, Math.max(min, v)); salaGuardar(); };
  };
  num('salaTam', 'tam', 12, 64);
  num('salaPps', 'pps', 40, 400); num('salaBTam', 'bandaTam', 12, 60);
  num('salaMarca', 'marca', 5, 90); num('salaMG', 'marcaGrosor', 1, 12);
  ov.querySelector('#salaSeg').onchange = e => { SALA.seg = +e.target.value || 3; salaGuardar(); };
  ov.querySelector('#salaDir').onchange = e => { SALA.dir = e.target.value; salaGuardar(); };
  ov.querySelector('#salaPos').onchange = e => { SALA.pos = e.target.value; salaGuardar(); };
  for(const [id, campo] of [['salaBeeps','beeps'],['salaPunch','punch'],['salaTexto','texto'],
                            ['salaBarra','barra'],['salaRemate','remate'],['salaCarr','carriles'],
                            ['salaActor','actor']])
    ov.querySelector('#' + id).onchange = e => { SALA[campo] = e.target.checked; salaGuardar(); };
}
