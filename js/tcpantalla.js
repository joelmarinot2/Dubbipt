/* Timecode de Pro Tools leido de la pantalla · especificacion 09
 *
 * El seguimiento del libreto NO va enganchado al video ni al audio que se
 * suben a Dubbipt: va enganchado al contador de Pro Tools, que es el reloj que
 * manda en la sala. Aqui se lee ese contador.
 *
 * Como funciona, en corto:
 *   1. Se comparte la ventana de Pro Tools (getDisplayMedia). No se instala
 *      nada ni hacen falta cables.
 *   2. Se marca UNA vez el recuadro del contador grande. Se guarda en
 *      proporciones, no en pixeles, para que siga valiendo si cambia la
 *      resolucion o el tamaño de la ventana. Si se coge de más, se ajusta
 *      solo a las cifras.
 *   3. Se le enseñan las diez cifras: se escribe UNA vez lo que pone el
 *      contador, con Pro Tools parado, y se le da al play. Las que falten las
 *      aprende solo contando cómo cambian los segundos.
 *   4. A partir de ahi lee quince veces por segundo. Los días siguientes solo
 *      hay que volver a compartir: en cuanto se comparte, arranca.
 *
 * Es el seguimiento de todos los perfiles, y el ÚNICO de QC, que no lleva
 * vídeo.
 *
 * LO IMPORTANTE, y es lo que hace que esto valga: leer cifras de una pantalla
 * no acierta siempre. Medido, ronda el 90% por cifra, que sobre ocho cifras es
 * poco mas de una lectura buena de cada dos. Por eso el reloj NO es la lectura:
 *
 *   · se engancha una vez y a partir de ahi CUENTA SOLO, con el reloj del
 *     navegador, que no falla;
 *   · una lectura solo se acepta si CUADRA con lo que el reloj ya predecia;
 *   · una lectura que no cuadra se tira, no descoloca el libreto;
 *   · si varias seguidas no cuadran pero coinciden ENTRE SI, es que han saltado
 *     en Pro Tools, y entonces si se vuelve a enganchar ahi.
 *
 * Con eso, media docena de lecturas malas seguidas no mueven nada y basta una
 * buena de vez en cuando para no irse de sitio. Sin esto, este camino no sirve:
 * se probo leyendo a pelo y el libreto daba saltos absurdos.
 *
 * El bucle va con temporizador, no con requestAnimationFrame: rAF no se dispara
 * si la pestaña no esta pintando, y aqui lo NORMAL es tener Pro Tools delante y
 * Dubbipt detras (ENT-N4).
 *
 * De donde depende: castAviso, esc, DDL_UI
 */

/* Tamaño al que se reduce cada cifra para compararla. Pequeño a proposito: asi
   da igual el tamaño del contador en pantalla y dos capturas de la misma cifra
   con un pixel de diferencia salen iguales. */
const TCP_W = 12, TCP_H = 18;

/* Cuanto se puede separar una lectura de lo que predice el reloj para darla por
   buena. Tres decimas es mas de siete fotogramas: de sobra para la latencia de
   compartir pantalla, y muy poco para colar una cifra mal leida. */
const TCP_TOL = 0.30;

/* Lecturas seguidas que tienen que coincidir entre si para enganchar de cero o
   para creerse un salto. Con tres, la probabilidad de que tres lecturas malas
   digan casualmente lo mismo y ademas encajen en una recta es despreciable. */
const TCP_SEGUIDAS = 3;

const TCP = {
  on: false,            // ¿esta siguiendo a Pro Tools?
  video: null,          // el <video> con la ventana compartida
  stream: null,
  rect: null,           // recuadro del contador, en proporciones 0..1
  celdas: null,         // las ocho casillas de las cifras, en proporciones
  plantillas: {},       // '0'..'9' -> Float32Array(TCP_W*TCP_H)
  fps: 25,
  lat: 0,               // ajuste fino, en segundos
  tc: null,             // segundos del ultimo anclaje
  t0: 0,                // performance.now() de ese anclaje
  rodando: false,
  ritmo: 0,
  _timer: 0,
  _leidas: 0, _malas: 0,
  _hist: [], _dudas: [],
  aprendiendo: null,    // la cuenta de las cifras con Pro Tools rodando
  _aprTimer: 0,
  _cv: null, _g: null
};

/* ── Timecode y segundos ───────────────────────────────────────────────── */

function tcpDos(n){ n = Math.floor(Math.abs(n)); return (n < 10 ? '0' : '') + n; }

/** Segundos -> "HH:MM:SS:FF". */
function tcpTexto(seg, fps){
  if(seg == null || !isFinite(seg)) return '--:--:--:--';
  const f = fps || 25;
  let s = Math.max(0, seg);
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60);   s -= m * 60;
  const ss = Math.floor(s);
  /* El pellizco es por los decimales del ordenador: 4/25 vuelve como
     3,9999999 y sin él saldría el fotograma 3 donde tiene que salir el 4. */
  let ff = Math.floor((s - ss) * f + 1e-6);
  if(ff >= Math.round(f)) ff = Math.round(f) - 1;
  return tcpDos(h) + ':' + tcpDos(m) + ':' + tcpDos(ss) + ':' + tcpDos(ff);
}

/** "HH:MM:SS:FF" (con separadores o sin ellos) -> segundos, o null. */
function tcpSegundos(txt, fps){
  const t = String(txt == null ? '' : txt).replace(/[^0-9]/g, '');
  if(t.length !== 8) return null;
  const h = +t.slice(0, 2), m = +t.slice(2, 4), s = +t.slice(4, 6), f = +t.slice(6, 8);
  const F = fps || 25;
  if(m > 59 || s > 59 || f >= Math.round(F) + 1) return null;
  return h * 3600 + m * 60 + s + f / F;
}

/** Que cifras no ha aprendido todavia. */
function tcpFaltan(){
  const f = [];
  for(let i = 0; i < 10; i++) if(!TCP.plantillas[String(i)]) f.push(String(i));
  return f;
}

/* ── El reloj ──────────────────────────────────────────────────────────── */

/**
 * Donde esta AHORA el timecode. No es la ultima lectura: es el ultimo anclaje
 * mas el tiempo que ha pasado desde entonces, si es que Pro Tools va rodando.
 * Parado, se queda quieto donde estaba.
 */
function tcpAhora(T, ahora){
  if(!T || T.tc == null) return null;
  if(!T.rodando) return T.tc;
  return T.tc + Math.max(0, (ahora - T.t0) / 1000);
}

/** El timecode que ve el resto del programa, con el ajuste fino aplicado. */
function tcpFuente(){
  if(!TCP.on) return null;
  const s = tcpAhora(TCP, (typeof performance !== 'undefined' ? performance.now() : Date.now()));
  return s == null ? null : s + (TCP.lat || 0);
}

/**
 * ¿Hay entre estas lecturas un grupo que cuente la misma historia?
 *
 * NO vale mirarlas todas juntas y exigir que encajen. Aqui la mitad de las
 * lecturas son basura, asi que una sola mala en medio tumbaria el grupo entero
 * y no se engancharia nunca —se probo asi primero y no enganchaba—. Lo que se
 * hace es buscar el grupo MAS GRANDE que caiga sobre una misma recta: se prueba
 * la recta que pasa por cada pareja y se cuenta a cuantas mas les vale.
 *
 * La recta ademas tiene que ir a un ritmo creible: o parado, o a tiempo real.
 * Un monton de cifras mal leidas puede alinearse por casualidad, pero no a
 * exactamente un segundo por segundo.
 *
 * Devuelve { n, v, ult } o null: cuantas concuerdan, a que ritmo, y la ultima.
 */
function tcpRecta(ds){
  if(!ds || ds.length < TCP_SEGUIDAS) return null;
  let mejor = null;
  for(let i = 0; i < ds.length; i++) for(let j = i + 1; j < ds.length; j++){
    const dt = (ds[j].t - ds[i].t) / 1000;
    if(dt <= 0.05) continue;                       // demasiado juntas: la recta no dice nada
    const v = (ds[j].seg - ds[i].seg) / dt;
    if(Math.abs(v) >= 0.15 && Math.abs(v - 1) >= 0.15) continue;
    const dentro = ds.filter(d =>
      Math.abs(d.seg - (ds[i].seg + v * (d.t - ds[i].t) / 1000)) <= TCP_TOL);
    if(dentro.length >= TCP_SEGUIDAS && (!mejor || dentro.length > mejor.n))
      mejor = { n: dentro.length, v: v, ult: dentro[dentro.length - 1] };
  }
  return mejor;
}

/**
 * Engancha el reloj a una lectura. `seguido` dice si viene de una lectura que
 * ya cuadraba: si no (o sea, un salto en Pro Tools), se tira el historial,
 * porque si no el ritmo saldria calculado a caballo del salto y diria que va
 * rodando a toda velocidad.
 */
function tcpAnclar(seg, ahora, seguido){
  /* El primer anclaje cambia de quién cuelga el libreto —del vídeo pasa a Pro
     Tools—, y eso se escribe en el botón. Se repinta solo aquí, no en cada
     vuelta del bucle: quince veces por segundo tocando el DOM para nada. */
  const era = TCP.tc != null;
  if(!seguido) TCP._hist = [];
  TCP._hist.push({ seg: seg, t: ahora });
  TCP._hist = TCP._hist.filter(h => ahora - h.t < 1200);
  if(TCP._hist.length >= 3){
    const a = TCP._hist[0], b = TCP._hist[TCP._hist.length - 1];
    const dt = (b.t - a.t) / 1000;
    if(dt > 0.3){
      TCP.ritmo = (b.seg - a.seg) / dt;
      TCP.rodando = TCP.ritmo > 0.5;
    }
  }
  TCP.tc = seg;
  TCP.t0 = ahora;
  if(!era){
    try{ if(typeof libPintarSeguir === 'function') libPintarSeguir(); }catch(e){ /* sin libreto */ }
  }
}

/* ── Leer la pantalla ──────────────────────────────────────────────────── */

/**
 * Recorta el recuadro del contador y lo devuelve en gris, ya normalizado y con
 * la tinta valiendo 1. La polaridad se decide sola —contador claro sobre fondo
 * oscuro o al reves— mirando que es lo minoritario: las cifras siempre ocupan
 * menos que el fondo.
 */
function tcpFoto(){
  const v = TCP.video, R = TCP.rect;
  if(!v || !v.videoWidth || !R) return null;
  const W = v.videoWidth, H = v.videoHeight;
  const x = Math.max(0, Math.min(W - 2, Math.round(R.x * W)));
  const y = Math.max(0, Math.min(H - 2, Math.round(R.y * H)));
  const w = Math.max(8, Math.min(W - x, Math.round(R.w * W)));
  const h = Math.max(6, Math.min(H - y, Math.round(R.h * H)));
  if(!TCP._cv){
    TCP._cv = document.createElement('canvas');
    TCP._g = TCP._cv.getContext('2d', { willReadFrequently: true });
  }
  if(TCP._cv.width !== w || TCP._cv.height !== h){ TCP._cv.width = w; TCP._cv.height = h; }
  try{ TCP._g.drawImage(v, x, y, w, h, 0, 0, w, h); }catch(e){ return null; }
  let d;
  try{ d = TCP._g.getImageData(0, 0, w, h).data; }catch(e){ return null; }
  const g = new Float32Array(w * h);
  let mn = 1, mx = 0;
  for(let i = 0, j = 0; i < g.length; i++, j += 4){
    const t = (d[j] * 0.299 + d[j + 1] * 0.587 + d[j + 2] * 0.114) / 255;
    g[i] = t; if(t < mn) mn = t; if(t > mx) mx = t;
  }
  const r = (mx - mn) || 1;
  let suma = 0;
  for(let i = 0; i < g.length; i++){ g[i] = (g[i] - mn) / r; suma += g[i]; }
  if(suma / g.length > 0.5) for(let i = 0; i < g.length; i++) g[i] = 1 - g[i];
  return { g: g, w: w, h: h };
}

/**
 * Grupos de columnas con tinta: cada cifra y cada separador es uno.
 *
 * Una columna tiene tinta si al menos DOS pixeles pasan de medio. Con la MEDIA
 * de la columna no vale, y no es una sutileza: el trazo de en medio de un 4 o
 * de un 7 es una linea fina cruzando una columna alta, la media sale baja, la
 * columna se da por vacia y la cifra se parte en dos trozos. Medido: un 4
 * partia en dos y el contador daba doce trozos donde tenia que haber once, con
 * lo que el reparto fallaba y con el las ocho cifras a la vez.
 *
 * Se piden dos pixeles y no uno para que un pixel suelto de ruido no cuente.
 */
function tcpGrupos(f){
  const gr = [];
  let a = -1;
  for(let x = 0; x <= f.w; x++){
    let n = 0;
    if(x < f.w) for(let y = 0; y < f.h; y++) if(f.g[y * f.w + x] > 0.5){ if(++n >= 2) break; }
    const hay = n >= 2;
    if(hay && a < 0) a = x;
    if(!hay && a >= 0){ gr.push({ a: a, b: x - 1 }); a = -1; }
  }
  return gr;
}

/** La franja de filas que tiene tinta, en proporciones. */
function tcpFilas(f){
  let mx = 0;
  const row = new Float32Array(f.h);
  for(let y = 0; y < f.h; y++){
    let s = 0;
    for(let x = 0; x < f.w; x++) s += f.g[y * f.w + x];
    row[y] = s / f.w;
    if(row[y] > mx) mx = row[y];
  }
  const u = mx * 0.18;
  let a = -1, b = -1;
  for(let y = 0; y < f.h; y++) if(row[y] > u){ if(a < 0) a = y; b = y; }
  if(a < 0) return { y: 0, h: 1 };
  return { y: a / f.h, h: (b - a + 1) / f.h };
}

/**
 * Donde cae cada una de las ocho cifras. Se calcula UNA vez, al enseñarle las
 * cifras, y a partir de ahi se reutiliza tal cual: el contador de Pro Tools es
 * de paso fijo y no se mueve de sitio.
 *
 * Esto es lo que antes se hacia en cada lectura, y era el fallo gordo: partir
 * la imagen en trozos fallaba de vez en cuando —dos cifras pegadas cuentan como
 * una—, y una particion mala estropea las ocho cifras a la vez. Calculandola
 * una sola vez, con el usuario mirando y diciendo si esta bien, deja de ser un
 * problema de cada fotograma.
 *
 * Se admiten once grupos (ocho cifras y tres separadores) u ocho (si los
 * separadores son tan finos que no pintan).
 */
function tcpLayout(f){
  const gr = tcpGrupos(f);
  let ds = null, k = null;
  if(gr.length === 11){
    ds = [0, 1, 3, 4, 6, 7, 9, 10].map(i => gr[i]);
    k  = [2, 5, 8].map(i => (gr[i].a + gr[i].b) / 2);
  }else if(gr.length === 8){
    ds = gr.slice();
  }else return null;

  const fl = tcpFilas(f);
  const an = ds.map(d => d.b - d.a + 1).slice().sort((p, q) => p - q);
  const am = Math.max(3, an[Math.floor(an.length / 2)]);   // lo que ocupa una cifra normal
  const xL = Math.min.apply(null, ds.map(d => d.a));
  const xR = Math.max.apply(null, ds.map(d => d.b));

  /* NO se usa el centro de cada trozo de tinta para colocar su casilla, y es a
     proposito: un 1 solo pinta su palo derecho, asi que su centro de tinta cae
     medio digito a la derecha de donde esta de verdad su sitio. Colocando por
     el centro de la tinta, cualquier timecode con un 1 salia torcido.
     Como el contador es de paso fijo, se calcula la REJILLA y se cuelgan las
     ocho casillas de ella. La rejilla sale de dos medidas que no dependen de
     que cifras toquen: la separacion entre los dos puntos, que es siempre la
     misma, y lo que ocupa la tira entera.
     Ademas la casilla se hace del ancho del PASO, no del ancho de la tinta:
     asi la cifra baila dentro de su caja sin salirse, y —lo que importa— la
     caja es la misma al aprender y al leer. */
  if(k){
    const D = (k[2] - k[0]) / 2;                  // de un dos puntos al siguiente
    /* tira = 8·paso + 3·separador − el aire de los extremos, y separador =
       D − 2·paso. Despejando queda esto, que es un calculo, no un apaño. */
    let a = (xR - xL + 1) - 3 * D - am;
    if(!(a > am * 0.8) || !(a < am * 2.5)) a = am * 1.25;   // si sale absurdo, lo de siempre
    const b = D - 2 * a;
    const cs = [
      k[0] - b / 2 - 3 * a / 2, k[0] - b / 2 - a / 2, k[0] + b / 2 + a / 2, k[0] + b / 2 + 3 * a / 2,
      k[1] + b / 2 + a / 2, k[1] + b / 2 + 3 * a / 2,
      k[2] + b / 2 + a / 2, k[2] + b / 2 + 3 * a / 2
    ];
    return cs.map(c => ({ x: (c - a / 2) / f.w, w: a / f.w, y: fl.y, h: fl.h }));
  }
  /* Sin separadores a la vista no hay de donde colgar la rejilla, pero tampoco
     hace falta: son ocho cifras seguidas a paso fijo repartidas por la tira. */
  const a = (xR - xL + 1) / 8;
  return [0, 1, 2, 3, 4, 5, 6, 7].map(i =>
    ({ x: (xL + i * a) / f.w, w: a / f.w, y: fl.y, h: fl.h }));
}

/** Saca una casilla y la reduce a TCP_W x TCP_H promediando por areas. */
function tcpCelda(f, c){
  const x0 = c.x * f.w, y0 = c.y * f.h, cw = c.w * f.w, ch = c.h * f.h;
  const out = new Float32Array(TCP_W * TCP_H);
  for(let j = 0; j < TCP_H; j++){
    const ya = y0 + ch * j / TCP_H, yb = y0 + ch * (j + 1) / TCP_H;
    for(let i = 0; i < TCP_W; i++){
      const xa = x0 + cw * i / TCP_W, xb = x0 + cw * (i + 1) / TCP_W;
      let s = 0, n = 0;
      for(let y = Math.max(0, Math.floor(ya)); y < Math.min(f.h, Math.ceil(yb)); y++)
        for(let x = Math.max(0, Math.floor(xa)); x < Math.min(f.w, Math.ceil(xb)); x++){
          s += f.g[y * f.w + x]; n++;
        }
      out[j * TCP_W + i] = n ? s / n : 0;
    }
  }
  let mn = 1, mx = 0;
  for(let i = 0; i < out.length; i++){ if(out[i] < mn) mn = out[i]; if(out[i] > mx) mx = out[i]; }
  const r = (mx - mn) || 1;
  for(let i = 0; i < out.length; i++) out[i] = (out[i] - mn) / r;
  return out;
}

/** Parecido entre dos casillas: correlacion, asi el brillo no cuenta. */
function tcpParecido(a, b){
  const n = a.length;
  if(!b || b.length !== n) return -1;
  let ma = 0, mb = 0;
  for(let i = 0; i < n; i++){ ma += a[i]; mb += b[i]; }
  ma /= n; mb /= n;
  let num = 0, da = 0, db = 0;
  for(let i = 0; i < n; i++){
    const p = a[i] - ma, q = b[i] - mb;
    num += p * q; da += p * p; db += q * q;
  }
  const den = Math.sqrt(da * db);
  return den ? num / den : 0;
}

/** Que cifra es esta casilla, y con cuanta ventaja sobre la segunda. */
function tcpCasar(cel){
  let m1 = -2, m2 = -2, d = '';
  for(const k in TCP.plantillas){
    const s = tcpParecido(cel, TCP.plantillas[k]);
    if(s > m1){ m2 = m1; m1 = s; d = k; }
    else if(s > m2) m2 = s;
  }
  return { d: d, s: m1, margen: m1 - m2 };
}

/** Una lectura del contador. Devuelve null si no hay imagen. */
function tcpLeerUna(){
  const f = tcpFoto();
  if(!f) return null;
  let cs = TCP.celdas;
  if(!cs){
    cs = tcpLayout(f);
    if(!cs) return { celdas: tcpGrupos(f).length };
  }
  let txt = '', conf = 1;
  for(let i = 0; i < cs.length; i++){
    const m = tcpCasar(tcpCelda(f, cs[i]));
    if(!m.d) return { celdas: cs.length };
    txt += m.d;
    /* Una cifra que gana por los pelos vale la mitad: casi siempre es un 8 que
       podria ser un 0, o un 3 que podria ser un 9. */
    conf = Math.min(conf, m.s * (m.margen > 0.05 ? 1 : 0.5));
  }
  return { celdas: cs.length, txt: txt, seg: tcpSegundos(txt, TCP.fps), conf: conf, foto: f };
}

/** Se queda con el dibujo de las cifras que hay ahora mismo en pantalla. */
function tcpEnsenar(txt){
  const t = String(txt == null ? '' : txt).replace(/[^0-9]/g, '');
  if(t.length !== 8)
    return { ok: false, motivo: 'Escribe las ocho cifras, como 01:18:23:04', faltan: tcpFaltan() };
  const f = tcpFoto();
  if(!f) return { ok: false, motivo: 'No llega imagen de la ventana compartida', faltan: tcpFaltan() };
  const L = TCP.celdas || tcpLayout(f);
  if(!L) return { ok: false, motivo: 'No distingo ocho cifras · vuelve a marcar el recuadro más ajustado', faltan: tcpFaltan() };
  TCP.celdas = L;
  tcpAprender(f, t);
  tcpGuardar();
  return { ok: true, faltan: tcpFaltan() };
}

/**
 * Mete estas ocho cifras en las plantillas. Si ya conocia una, no la sustituye:
 * la mezcla. Asi una captura borrosa suelta no estropea lo aprendido, y a la
 * vez la plantilla se va adaptando si cambia el tamaño de la ventana.
 */
function tcpAprender(f, t){
  const L = TCP.celdas;
  if(!L) return;
  for(let i = 0; i < 8 && i < L.length; i++){
    const c = tcpCelda(f, L[i]), k = t[i], v = TCP.plantillas[k];
    if(!v) TCP.plantillas[k] = c;
    else for(let j = 0; j < c.length; j++) v[j] = v[j] * 0.85 + c[j] * 0.15;
  }
}

/* ── Aprender las cifras solas, con Pro Tools rodando ──────────────────── */

/*
 * Enseñarle las diez cifras era lo más pesado de todo: hay que escribir lo que
 * pone el contador, y un timecode como 01:00:00:00 solo trae dos. Había que ir
 * moviendo el cursor de Pro Tools y volver a escribir hasta que salieran todas.
 *
 * Ahora se escribe UNA vez, con Pro Tools parado, y se le da al play. La casilla
 * de las unidades de segundo cambia una vez por segundo y pasa por las diez
 * cifras en diez segundos, en orden: contando sus cambios se sabe qué cifra hay
 * en cada momento SIN LEERLA, y de ahí se aprende su dibujo.
 *
 * Solo esa casilla: los fotogramas cambian demasiado deprisa para saber cuál se
 * ha capturado, y el resto demasiado despacio para servir. Y solo si el RITMO es
 * el de reproducir, un cambio por segundo: si en vez de darle al play se
 * arrastra el cursor, los cambios no llevan ese ritmo y no se aprende nada.
 * Aprender un dibujo con la cifra equivocada estropearía la lectura para
 * siempre, que es mucho peor que tener que repetir.
 */

/* Parecido desde el que dos fotos de la casilla son la MISMA cifra. */
const TCP_IGUAL = 0.95;
/* Dos cifras distintas no pueden parecerse tanto: si una recién aprendida se
   parece así a otra que ya conocía, algo se contó mal y no se guarda. */
const TCP_GEMELA = 0.97;
/* Lo que se espera a que salgan todas, en segundos de reloj. */
const TCP_APRENDER_S = 30;
/* El hueco más largo entre dos fotos que deja saber cuándo cambió la cifra.
   Con la ventana tapada el navegador frena los temporizadores a uno por
   segundo —se vio probándolo—, y un cambio que cae en un hueco así no se sabe
   cuándo pasó: contarlo a ciegas es contar mal. */
const TCP_HUECO_S = 0.3;

/** Empieza a contar desde el timecode que se ha escrito. `img` es la casilla de
    las unidades de segundo tal y como está ahora, con Pro Tools parado. */
function tcpAprendizajeNuevo(txt, img, ahora){
  const t = String(txt == null ? '' : txt).replace(/[^0-9]/g, '');
  return { d: +t[5], ref: img, cand: null, cambios: [], vistos: {},
           inicio: ahora, estado: 'esperando', motivo: '' };
}

/**
 * Una foto nueva de la casilla. Cuenta los cambios; no toca las plantillas, que
 * eso lo hace `tcpAprendizajeGuardar` cuando la cuenta ya es de fiar.
 *
 * Un cambio se da por bueno cuando DOS fotos seguidas coinciden entre sí y no
 * con la de antes: una sola puede ser la de en medio de la transición, con las
 * dos cifras mezcladas. Y cada cambio tiene que llegar un segundo después del
 * anterior —o dos o tres, si uno no se vio: el 8 y el 9 se parecen—.
 */
function tcpAprendizajePaso(A, img, ahora){
  if(!A || A.estado !== 'esperando' || !img) return A;
  const hueco = (A.ultimo != null) ? (ahora - A.ultimo) / 1000 : 0;
  A.ultimo = ahora;
  if(tcpParecido(img, A.ref) >= TCP_IGUAL){ A.cand = null; return A; }
  /* Ha cambiado, y entre esta foto y la anterior hay un hueco demasiado largo
     para saber cuándo. Un hueco sin cambio no importa -la cifra solo cambia
     una vez por segundo-, pero uno con cambio deja la cuenta a ciegas. */
  if(hueco > TCP_HUECO_S){ A.estado = 'mal'; A.motivo = 'pausa'; return A; }
  if(!A.cand || tcpParecido(img, A.cand.img) < TCP_IGUAL){ A.cand = { img: img, t: ahora }; return A; }
  const t = A.cand.t;
  const ult = A.cambios.length ? A.cambios[A.cambios.length - 1] : null;
  /* A menos de medio segundo del cambio anterior no es otra cifra: es la misma
     transición asentándose. Una captura puede tardar dos fotos en cambiar, con
     las dos cifras mezcladas en proporciones distintas, y esas dos fotos se
     parecen entre sí: se tomaban por la cifra nueva, y luego llegaba la de
     verdad como un «segundo cambio» imposible. Lo cazó una prueba. */
  if(ult != null && (t - ult) < 500){ A.ref = img; A.cand = null; return A; }
  let pasos = 1;
  if(ult != null){
    const dt = (t - ult) / 1000;
    pasos = Math.round(dt);
    if(pasos < 1 || pasos > 3 || Math.abs(dt - pasos) > 0.25){
      A.estado = 'mal'; A.motivo = 'ritmo';
      return A;
    }
  }
  /* El dibujo de una cifra se guarda cuando SE VA, no cuando llega: para
     entonces ya se ha visto entera y asentada, y no una mezcla con la de antes.
     Y de paso solo se guarda con el ritmo ya visto: la primera cifra que se
     va es la que se escribió, que ya se aprendió al escribirla, y la segunda
     se va con el primer intervalo, que acaba de pasar la prueba del segundo.
     Un primer cambio de haber arrastrado el cursor no deja nada guardado. */
  if(ult != null) A.vistos[String(A.d)] = A.ref;
  A.cambios.push(t);
  A.d = (A.d + pasos) % 10;
  A.ref = img;
  A.cand = null;
  return A;
}

/** Pasa a las plantillas lo aprendido. Devuelve las cifras nuevas. */
function tcpAprendizajeGuardar(A){
  if(!A) return [];
  const nuevas = [];
  for(const k in A.vistos){
    const img = A.vistos[k];
    if(!TCP.plantillas[k]){
      let gemela = false;
      for(const j in TCP.plantillas)
        if(j !== k && tcpParecido(img, TCP.plantillas[j]) > TCP_GEMELA) gemela = true;
      if(!gemela){ TCP.plantillas[k] = img; nuevas.push(k); }
    }
  }
  A.vistos = {};
  if(!tcpFaltan().length) A.estado = 'hecho';
  return nuevas;
}

/**
 * Una vuelta del aprendizaje: foto, cuenta y guardar. Devuelve el estado, que
 * dice cómo va: 'esperando', 'hecho', 'mal' (el ritmo no era el de reproducir)
 * o 'tarde' (no han salido todas a tiempo).
 */
function tcpAprenderVuelta(ahora){
  const A = TCP.aprendiendo;
  if(!A) return null;
  const f = tcpFoto();
  if(f && TCP.celdas && TCP.celdas[5]) tcpAprendizajePaso(A, tcpCelda(f, TCP.celdas[5]), ahora);
  if(tcpAprendizajeGuardar(A).length) tcpGuardar();
  if(A.estado === 'esperando' && (ahora - A.inicio) / 1000 > TCP_APRENDER_S) A.estado = 'tarde';
  return A;
}

/* ── El recuadro, ajustado solo a las cifras ───────────────────────────── */

/*
 * Marcar a mano, sobre la pantalla entera, un contador que en el lienzo es un
 * sello es difícil, y coger de más —la etiqueta, el borde, un trozo de ventana—
 * dejaba el contador sin leer: «veo 13 trozos y tienen que ser 8». Ahora se
 * busca DENTRO de lo marcado.
 *
 * Primero la franja de texto más alta, que en el contador son las cifras. Y en
 * ella, once trozos con forma de timecode: dos cifras, dos puntos, dos cifras…
 * Los dos puntos se reconocen por las FILAS con tinta, no por su ancho ni por
 * su alto. Un 1 puede ser más estrecho que unos dos puntos, y unos dos puntos
 * de verdad llegan de arriba abajo casi lo que una cifra —medido con Consolas:
 * el 77 %—. Pero una cifra tiene tinta en casi todas sus filas, y unos dos
 * puntos solo en las de sus dos puntos, con un hueco en medio.
 */

/** Cuántas filas de una franja tienen tinta en unas columnas. */
function tcpAltoTinta(f, a, b, y0, y1){
  let n = 0;
  for(let y = y0; y <= y1; y++){
    for(let x = a; x <= b; x++) if(f.g[y * f.w + x] > 0.5){ n++; break; }
  }
  return n;
}

/** En una franja de filas, el tramo de trozos que es un timecode. */
function tcpRecortarFranja(f, y0, y1){
  const alto = y1 - y0 + 1;
  if(alto < 5) return null;
  const gr = [];
  let a = -1;
  for(let x = 0; x <= f.w; x++){
    let n = 0;
    if(x < f.w) for(let y = y0; y <= y1; y++) if(f.g[y * f.w + x] > 0.5){ if(++n >= 2) break; }
    const hay = n >= 2;
    if(hay && a < 0) a = x;
    if(!hay && a >= 0){ gr.push({ a: a, b: x - 1, alto: tcpAltoTinta(f, a, x - 1, y0, y1) }); a = -1; }
  }
  /* Una cifra tiene tinta en casi todas las filas —medido con Consolas, del 95
     al 100 %; la que menos, un 1 de siete segmentos, el 68 % por su hueco en
     medio— y unos dos puntos, en la mitad o menos: el 51 % con Consolas y el
     21 % con siete segmentos. El corte va entre el 51 y el 68. */
  const esCifra = (g) => g.alto >= alto * 0.62;
  const esPunto = (g) => !esCifra(g);
  const DIG = [0, 1, 3, 4, 6, 7, 9, 10], SEP = [2, 5, 8];
  let tramo = null;
  for(let i = 0; i + 11 <= gr.length && !tramo; i++){
    const w = gr.slice(i, i + 11);
    if(DIG.every(k => esCifra(w[k])) && SEP.every(k => esPunto(w[k]))) tramo = w;
  }
  if(!tramo && gr.length === 8 && gr.every(esCifra)) tramo = gr;
  if(!tramo) return null;
  const anchos = tramo.filter(esCifra).map(g => g.b - g.a + 1).sort((p, q) => p - q);
  const md = anchos[anchos.length >> 1] || 1;
  const mx = Math.max(1, Math.round(md * 0.3)), my = Math.max(1, Math.round(alto * 0.15));
  const x0 = Math.max(0, tramo[0].a - mx), x1 = Math.min(f.w - 1, tramo[tramo.length - 1].b + mx);
  const ya = Math.max(0, y0 - my), yb = Math.min(f.h - 1, y1 + my);
  return { x: x0 / f.w, y: ya / f.h, w: (x1 - x0 + 1) / f.w, h: (yb - ya + 1) / f.h };
}

/**
 * El recuadro de las cifras dentro de una foto de lo marcado, en proporciones
 * de esa foto, o nulo si ahí no hay un timecode.
 */
function tcpRecortar(f){
  if(!f || !f.w || !f.h) return null;
  const cuenta = new Int32Array(f.h);
  let mx = 0;
  for(let y = 0; y < f.h; y++){
    let n = 0;
    for(let x = 0; x < f.w; x++) if(f.g[y * f.w + x] > 0.5) n++;
    cuenta[y] = n; if(n > mx) mx = n;
  }
  if(!mx) return null;
  /* Una fila cuenta si tiene tinta de verdad, no un borde: la raya vertical
     del marco pinta un par de píxeles en TODAS las filas y juntaría la etiqueta
     y las cifras en una sola franja. */
  const umbral = Math.max(2, mx * 0.12);
  const franjas = [];
  for(let y = 0; y < f.h; y++){
    if(cuenta[y] < umbral) continue;
    const u = franjas[franjas.length - 1];
    if(u && y - u.b <= 2) u.b = y; else franjas.push({ a: y, b: y });
  }
  franjas.sort((p, q) => (q.b - q.a) - (p.b - p.a));
  for(const r of franjas){
    const x = tcpRecortarFranja(f, r.a, r.b);
    if(x) return x;
  }
  return null;
}

/** Un recuadro de dentro de otro, pasado a proporciones de la pantalla. */
function tcpDentroDe(R, r){
  return { x: R.x + r.x * R.w, y: R.y + r.y * R.h, w: r.w * R.w, h: r.h * R.h };
}

/* ── El bucle ──────────────────────────────────────────────────────────── */

/**
 * Una vuelta: leer, y decidir si la lectura merece mover el reloj. Todo el
 * criterio de "el reloj manda, la lectura solo corrige" esta aqui.
 */
function tcpMirar(){
  const ahora = (typeof performance !== 'undefined' ? performance.now() : Date.now());
  const r = tcpLeerUna();
  TCP._leidas++;
  if(!r || r.seg == null || r.conf < 0.55){ TCP._malas++; return; }

  const p = tcpAhora(TCP, ahora);
  if(p != null && Math.abs(r.seg - p) <= TCP_TOL){
    tcpAnclar(r.seg, ahora, true);
    TCP._dudas = [];
    /* Esta lectura cuadra con el reloj, o sea que las ocho cifras son las que
       son: buena ocasion para afinar las plantillas con el contador tal y como
       se ve ahora mismo, tamaño y nitidez incluidos. */
    if(r.foto && r.txt) tcpAprender(r.foto, r.txt);
    return;
  }

  TCP._malas++;
  /* No cuadra. Puede ser una cifra mal leida —se tira— o que hayan saltado en
     Pro Tools. Para distinguirlo se espera a ver si varias seguidas cuentan la
     misma historia. */
  TCP._dudas.push({ seg: r.seg, t: ahora });
  TCP._dudas = TCP._dudas.filter(d => ahora - d.t < 1500);
  const R = tcpRecta(TCP._dudas);
  if(R){
    /* Se engancha donde dice la RECTA proyectada hasta ahora, no donde dice la
       ultima lectura: la ultima puede ser precisamente una de las malas. */
    tcpAnclar(R.ult.seg + R.v * (ahora - R.ult.t) / 1000, ahora, false);
    /* El ritmo sale de la recta, y se pone despues de anclar: anclar tras un
       salto tira el historial, y sin historial no sabria si rueda o esta
       parado hasta pasado mas de un segundo. */
    TCP.rodando = R.v > 0.5;
    TCP.ritmo = R.v;
    TCP._dudas = [];
  }
}

function tcpArrancar(){
  tcpParar(true);
  /* Seguir y aprender a la vez no: las dos cosas leen la misma casilla con
     criterios distintos. Si se arranca, lo aprendido hasta ahora se queda. */
  try{ if(typeof tcpAprenderParar === 'function') tcpAprenderParar(); }catch(e){ /* no estaba aprendiendo */ }
  const paso = () => {
    if(!TCP.on) return;
    try{ tcpMirar(); }catch(e){ /* una lectura mala no puede tirar el bucle */ }
    try{ tcpPintarEstado(); }catch(e){ /* el panel no esta abierto */ }
    try{ if(typeof studioTick === 'function') studioTick(false); }catch(e){ /* sin libreto */ }
    TCP._timer = setTimeout(paso, 66);
  };
  TCP.on = true;
  /* Leer Pro Tools ES el seguimiento: no tiene sentido estar leyendo la
     pantalla con el libreto suelto. */
  try{ if(typeof stSeguirPoner === 'function') stSeguirPoner(true); }catch(e){ /* sin libreto */ }
  paso();
}

function tcpParar(soloElBucle){
  if(TCP._timer){ clearTimeout(TCP._timer); TCP._timer = 0; }
  if(!soloElBucle){
    TCP.on = false;
    TCP.tc = null;
    TCP.rodando = false;
    TCP._hist = []; TCP._dudas = [];
    try{ tcpPintarEstado(); }catch(e){ /* el panel no esta abierto */ }
    try{ if(typeof stSeguirPoner === 'function') stSeguirPoner(false); }catch(e){ /* sin libreto */ }
    try{ if(typeof libPintarSeguir === 'function') libPintarSeguir(); }catch(e){ /* sin libreto */ }
  }
}

/** ¿Esta Pro Tools mandando el reloj ahora mismo? */
function tcpActivo(){ return !!(TCP.on && TCP.tc != null); }

/**
 * Qué falta para poder seguir a Pro Tools: 'compartir', 'marcar', 'ensenar' o
 * 'listo'. Es lo que decide qué se enseña en el panel y qué se hace solo al
 * compartir: con el recuadro y las diez cifras ya guardados de otro día, lo
 * único que queda es compartir, y en cuanto se comparte se arranca.
 */
function tcpQueFalta(){
  if(!TCP.video) return 'compartir';
  if(!TCP.rect) return 'marcar';
  if(tcpFaltan().length) return 'ensenar';
  return 'listo';
}

/* ── Compartir la ventana ──────────────────────────────────────────────── */

function tcpSoltar(){
  try{ if(TCP.stream) TCP.stream.getTracks().forEach(t => t.stop()); }catch(e){ /* ya estaba suelto */ }
  TCP.stream = null;
  TCP.video = null;
}

/**
 * Espera al PRIMER FOTOGRAMA de verdad. Hace falta: `play()` vuelve antes de
 * que llegue imagen, y hasta entonces videoWidth vale 0 y tcpFoto devuelve
 * null. El sintoma era «no llega la captura» con la ventana ya compartida.
 */
function tcpPrimerFotograma(v, ms){
  return new Promise(resolve => {
    const t0 = Date.now();
    const mira = () => {
      if(v.videoWidth > 0 && v.videoHeight > 0) return resolve(true);
      if(Date.now() - t0 > (ms || 4000)) return resolve(false);
      setTimeout(mira, 80);
    };
    mira();
  });
}

/**
 * Comparte la pantalla o una ventana. Devuelve { ok, motivo }: NO vale
 * devolver solo false, porque entonces cancelar el dialogo, no dar permiso y
 * quedarse sin imagen se ven todos igual —o sea, no se ven—, y quien lo usa no
 * sabe si ha hecho algo mal.
 *
 * `pantallaEntera` es una PREFERENCIA que se le pasa al navegador para que abra
 * el dialogo ya en la pestaña de pantallas. Hace falta para el Big Counter de
 * Pro Tools: es una ventana flotante y el selector de Windows solo lista
 * ventanas principales, asi que ahi NO aparece y hay que compartir la pantalla
 * entera. (El contador de la ventana de edicion si esta dentro de una ventana
 * que se puede elegir.)
 */
async function tcpCompartir(pantallaEntera){
  if(!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia)
    return { ok: false, motivo: 'Este navegador no sabe compartir pantalla · hace falta Chrome o Edge' };
  try{
    const v0 = { frameRate: 30 };
    if(pantallaEntera) v0.displaySurface = 'monitor';
    const st = await navigator.mediaDevices.getDisplayMedia({ video: v0, audio: false });
    tcpSoltar();
    TCP.stream = st;
    const v = document.createElement('video');
    v.srcObject = st; v.muted = true; v.playsInline = true;
    try{ await v.play(); }catch(e){ /* algunos navegadores no lo necesitan */ }
    if(!await tcpPrimerFotograma(v)){
      try{ st.getTracks().forEach(t => t.stop()); }catch(e){ /* ya estaba suelto */ }
      return { ok: false, motivo: 'Se compartió, pero no llega imagen · prueba a compartir otra vez' };
    }
    TCP.video = v;
    st.getVideoTracks().forEach(t => t.addEventListener('ended', () => {
      tcpParar();
      tcpSoltar();
      try{ castAviso('Se dejó de compartir la ventana · el libreto ya no sigue a Pro Tools'); }
      catch(e){ /* el aviso es un extra: lo que importa ya se ha hecho, que es parar */ }
      try{ tcpPintarEstado(); }catch(e){ /* el panel no está abierto: nada que repintar */ }
    }));
    return { ok: true, motivo: '' };
  }catch(e){
    const n = (e && e.name) || '';
    if(n === 'NotAllowedError')
      return { ok: false, motivo: 'No se compartió nada · hay que elegir la pantalla y darle a Compartir' };
    if(n === 'NotFoundError' || n === 'NotReadableError')
      return { ok: false, motivo: 'El sistema no deja leer esa pantalla · prueba con otra' };
    return { ok: false, motivo: 'No se pudo compartir' + ((e && e.message) ? ' · ' + e.message : '') };
  }
}

/* ── Lo que se recuerda ────────────────────────────────────────────────── */

/* El recuadro, las cifras aprendidas y los ajustes se guardan; la ventana
   compartida NO se puede guardar —el navegador obliga a volver a darle permiso
   cada sesion— y por eso al abrir hay que compartir otra vez, pero ya sin
   volver a marcar nada ni volver a enseñarle las cifras. */
function tcpGuardar(){
  try{
    const pl = {};
    for(const k in TCP.plantillas) pl[k] = Array.from(TCP.plantillas[k]);
    localStorage.setItem('ddl_tcp', JSON.stringify({
      rect: TCP.rect, celdas: TCP.celdas, plantillas: pl, fps: TCP.fps, lat: TCP.lat
    }));
  }catch(e){ /* sin sitio donde guardar: funciona igual, pero no se recuerda */ }
}

function tcpCargar(){
  try{
    const s = localStorage.getItem('ddl_tcp');
    if(!s) return;
    const o = JSON.parse(s);
    if(o.rect) TCP.rect = o.rect;
    if(o.celdas) TCP.celdas = o.celdas;
    if(o.fps) TCP.fps = +o.fps || 25;
    if(o.lat != null) TCP.lat = +o.lat || 0;
    if(o.plantillas) for(const k in o.plantillas)
      TCP.plantillas[k] = Float32Array.from(o.plantillas[k]);
  }catch(e){ /* lo guardado no vale: se empieza de cero */ }
}
try{ tcpCargar(); }catch(e){ /* en las pruebas no hay localStorage */ }

/* ── El panel ──────────────────────────────────────────────────────────── */

function tcpEstadoTexto(){
  if(!TCP.video) return 'sin compartir la ventana de Pro Tools';
  if(!TCP.on) return 'apagado';
  if(TCP.tc == null) return 'esperando a leer el contador…';
  const perdidas = TCP._leidas ? Math.round(100 * TCP._malas / TCP._leidas) : 0;
  return tcpTexto(tcpAhora(TCP, performance.now()), TCP.fps)
       + (TCP.rodando ? ' · rodando' : ' · parado')
       + (perdidas > 60 ? ' · ⚠ ' + perdidas + '% de lecturas descartadas' : '');
}

function tcpPintarEstado(){
  const e = document.getElementById('tcpEstado');
  if(e) e.textContent = tcpEstadoTexto();
  const c = document.getElementById('stTcPt');
  if(c) c.textContent = TCP.on ? ('⏱ PT ' + tcpTexto(tcpAhora(TCP, performance.now()), TCP.fps)) : '';
}

/* ── Aprender con Pro Tools rodando: el bucle y lo que se ve ───────────── */

/** Lo que dice la línea del aprendizaje en el panel. */
function tcpAprenderTexto(){
  const A = TCP.aprendiendo;
  const sabe = 10 - tcpFaltan().length;
  if(!A) return '';
  if(A.estado === 'esperando')
    return A.cambios.length
      ? ('Aprendiendo con Pro Tools rodando… ya conoce ' + sabe + ' de 10')
      : 'Ahora dale al PLAY en Pro Tools y déjalo correr unos diez segundos';
  return '';
}

function tcpAprenderParar(){
  if(TCP._aprTimer){ try{ TCP._aprTimer.parar(); }catch(e){ /* ya estaba parado */ } TCP._aprTimer = 0; }
  TCP.aprendiendo = null;
}

/**
 * Un latido que NO se duerme con la ventana tapada.
 *
 * Para darle al play hay que ir a Pro Tools, y Pro Tools tapa Dubbipt: con la
 * ventana tapada el navegador frena los temporizadores de la página a uno por
 * segundo, y contando los segundos a una foto por segundo la cuenta se pierde.
 * Los de un trabajador en segundo plano no se frenan así, así que el latido
 * sale de uno. Si el navegador no deja crearlo, un temporizador normal.
 */
function tcpLatido(ms, fn){
  let w = null, url = '', t = 0;
  try{
    url = URL.createObjectURL(new Blob(['setInterval(function(){ postMessage(0); }, ' + (+ms || 66) + ');'],
                                       { type: 'text/javascript' }));
    w = new Worker(url);
    w.onmessage = () => { try{ fn(); }catch(e){ /* una vuelta mala no para el latido */ } };
    w.onerror = () => { try{ w.terminate(); }catch(e){ /* ya estaba parado */ } w = null; if(!t) t = setInterval(fn, ms); };
  }catch(e){
    w = null;
  }
  if(!w) t = setInterval(fn, ms);
  return { parar(){
    try{ if(w) w.terminate(); }catch(e){ /* ya estaba parado */ }
    if(t) clearInterval(t);
    try{ if(url) URL.revokeObjectURL(url); }catch(e){ /* nada que soltar */ }
    w = null; t = 0;
  } };
}

/**
 * Se queda con las cifras que hay en pantalla —como siempre— y, si faltan,
 * se pone a contar la casilla de los segundos para aprender las demás en
 * cuanto le den al play. Devuelve lo mismo que `tcpEnsenar`.
 */
function tcpAprenderArrancar(txt){
  const r = tcpEnsenar(txt);
  if(!r.ok || !r.faltan.length) return r;
  const f = tcpFoto();
  if(!f || !TCP.celdas || !TCP.celdas[5]) return r;
  tcpAprenderParar();
  TCP.aprendiendo = tcpAprendizajeNuevo(txt, tcpCelda(f, TCP.celdas[5]), performance.now());
  const vuelta = () => {
    const A = tcpAprenderVuelta(performance.now());
    if(!A) return;
    const e = document.getElementById('tcpAprEstado');
    if(e) e.textContent = tcpAprenderTexto();
    if(A.estado === 'esperando') return;
    tcpAprenderParar();
    if(A.estado === 'hecho'){
      castAviso('🎉 Ya conoce las diez cifras');
      /* Con todo listo no se hace esperar a nadie: se engancha ya. */
      if(tcpQueFalta() === 'listo') tcpEmpezarASeguir();
      else tcpPanel();
      return;
    }
    const falta = tcpFaltan().join(', ');
    castAviso(A.estado === 'mal'
      ? (A.motivo === 'pausa'
          ? '⚠️ Se perdió la vista del contador un momento: vuelve a escribir lo que pone con Pro Tools parado y dale al play'
          : '⚠️ El contador no avanzaba de segundo en segundo: con Pro Tools parado, vuelve a escribir lo que pone y dale al play sin tocar nada más')
      : ('⚠️ No han salido todas a tiempo · faltan ' + falta + ' · vuelve a escribir lo que pone y dale al play un poco más'));
    tcpPanel();
  };
  TCP._aprTimer = tcpLatido(66, vuelta);
  return r;
}

/** Engancha el seguimiento y quita el panel de en medio: el libreto tiene que
    verse, que es lo que se viene a mirar. */
function tcpEmpezarASeguir(){
  TCP.tc = null; TCP._leidas = 0; TCP._malas = 0; TCP._hist = []; TCP._dudas = [];
  tcpArrancar();
  const ov = document.getElementById('tcpOv'); if(ov) ov.remove();
  castAviso('▶ El libreto sigue ya al contador de Pro Tools');
}

/**
 * Lo que viene después de compartir, según lo que falte. Con el recuadro y las
 * cifras de otro día guardados, compartir es lo ÚNICO que hay que hacer: se
 * arranca solo. Si falta el recuadro se abre directamente la pantalla de
 * marcarlo, que es lo siguiente que habría que pulsar.
 */
function tcpTrasCompartir(){
  const q = tcpQueFalta();
  if(q === 'listo'){ tcpEmpezarASeguir(); return q; }
  if(q === 'marcar'){
    castAviso('Compartido · ahora marca el recuadro del contador');
    const ov = document.getElementById('tcpOv'); if(ov) ov.remove();
    tcpMarcarRect();
    return q;
  }
  castAviso('Compartido · falta enseñarle las cifras');
  tcpPanel();
  return q;
}

/**
 * Enseña en el panel lo que se está leyendo AHORA, con el recorte del contador
 * al lado. Es la única manera de saber de un vistazo si está bien: antes había
 * que arrancar y mirar si el libreto se movía.
 */
function tcpVistaEnMarcha(ov){
  const cv = ov.querySelector('#tcpVista'), lee = ov.querySelector('#tcpLee');
  if(!cv || !lee) return;
  const vuelta = () => {
    if(!ov.isConnected || !TCP.video || !TCP.rect) return;
    try{
      const v = TCP.video, R = TCP.rect;
      const sw = Math.max(1, Math.round(R.w * v.videoWidth)), sh = Math.max(1, Math.round(R.h * v.videoHeight));
      const k = Math.max(1, Math.min(4, Math.floor(320 / sw)));
      if(cv.width !== sw * k || cv.height !== sh * k){ cv.width = sw * k; cv.height = sh * k; }
      const g = cv.getContext('2d');
      g.imageSmoothingEnabled = false;
      g.drawImage(v, Math.round(R.x * v.videoWidth), Math.round(R.y * v.videoHeight), sw, sh, 0, 0, cv.width, cv.height);
    }catch(e){ /* todavía sin fotograma: se vuelve a probar en la siguiente vuelta */ }
    let txt = '', bien = false;
    try{
      const r = tcpLeerUna();
      if(tcpFaltan().length === 10) txt = 'todavía no sabe leerlo: enséñale las cifras';
      else if(r && r.seg != null && r.conf >= 0.55){ txt = 'lee ' + tcpTexto(r.seg, TCP.fps); bien = true; }
      else if(r && r.celdas && r.celdas !== 8) txt = 'en el recuadro ve ' + r.celdas + ' trozos: vuelve a marcarlo';
      else txt = tcpFaltan().length ? ('no lo entiende todavía · le faltan ' + tcpFaltan().join(', ')) : 'no lo entiende ahora mismo';
    }catch(e){ txt = 'no lo entiende ahora mismo'; }
    lee.textContent = txt;
    lee.style.color = bien ? '#4ADE80' : '#F59E0B';
    setTimeout(vuelta, 250);
  };
  vuelta();
}

function tcpPanel(){
  const viejo = document.getElementById('tcpOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'tcpOv'; ov.className = 'modo-cap';
  const esc2 = (s) => (typeof esc === 'function') ? esc(String(s)) : String(s);
  const faltan = tcpFaltan();
  const q = tcpQueFalta();
  /* Los pasos se numeran solos y llevan su marca de hecho: se ve de un golpe
     qué queda. Antes el panel ponía «1 ·» y saltaba a «3 ·», y un número que
     falta parece una avería. */
  let paso = 0;
  const nPaso = (txt, hecho) => '<div class="io-tit">' + (++paso) + ' · ' + txt
    + (hecho ? ' <span style="color:#4ADE80">✓</span>' : '') + '</div>';
  const aprendiendo = !!TCP.aprendiendo;

  ov.innerHTML = '<div class="modo-caja" style="max-width:600px;text-align:left">'
    + '<div class="modo-tit">Seguir a Pro Tools</div>'
    + '<div class="modo-sub" style="margin-bottom:8px" id="tcpEstado">' + esc2(tcpEstadoTexto()) + '</div>'
    + '<div class="meta-nota">El libreto sigue al <b>contador de Pro Tools</b>, leyéndolo de una '
    +   '<b>captura de pantalla</b>: no hace falta vídeo, ni instalar nada, ni ningún cable. Hace falta '
    +   '<b>Chrome o Edge</b> y que el contador se vea en pantalla. Lo del recuadro y las cifras se hace '
    +   '<b>una sola vez</b>: los días siguientes basta con compartir.</div>'
    + nPaso('compartir la pantalla', !!TCP.video)
    /* Las DOS rutas, dichas antes de elegir. El Big Counter de Pro Tools es una
       ventana flotante y el selector de Windows solo lista ventanas
       principales: ahí no sale, y quien lo busca se queda atascado sin saber
       por qué —pasó—. Así que se dice cuál es cuál. */
    + (TCP.video ? '' :
        '<div class="meta-nota">El <b>Big Counter</b> es una ventana flotante y <b>no aparece</b> en la '
      +   'lista de ventanas de Windows: para usarlo hay que compartir la <b>pantalla entera</b>. '
      +   'Compartiendo solo la ventana de Pro Tools vale el contador de la <b>barra de transporte</b>.</div>')
    + '<div class="io-rej" style="margin-bottom:12px">'
    +   '<button class="io-b" id="tcpVerPant">🖥 ' + (TCP.video ? 'Compartir otra pantalla' : 'Compartir la pantalla entera') + '</button>'
    +   '<button class="io-b" id="tcpVer">🗔 Compartir solo una ventana</button>'
    + '</div>'
    + (TCP.video
        ? nPaso('el contador', !!TCP.rect)
          + '<div class="io-rej" style="margin-bottom:10px;align-items:center">'
          +   '<button class="io-b" id="tcpRect">⬚ ' + (TCP.rect ? 'Volver a marcarlo' : 'Marcar el contador') + '</button>'
          +   (TCP.rect
                ? '<canvas id="tcpVista" style="image-rendering:pixelated;border:1px solid #2b3040;'
                  + 'border-radius:6px;background:#0b0d12;max-width:100%;height:auto"></canvas>'
                  + '<span id="tcpLee" style="font-family:monospace;font-size:12.5px"></span>'
                : '<span class="meta-nota" style="margin:0">Un recuadro sobre las cifras. No hace falta '
                  + 'ser preciso: si coges de más, se ajusta solo.</span>')
          + '</div>'
        : '')
    + (TCP.video && TCP.rect
        ? nPaso('las cifras', !faltan.length)
          + (faltan.length
              ? '<div class="meta-nota">Con Pro Tools <b>parado</b>, escribe lo que pone el contador '
                + '<b>ahora mismo</b> y pulsa «Es lo que pone». Después dale al <b>play</b> y déjalo correr '
                + 'unos diez segundos: aprende solo las cifras que falten.'
                + (faltan.length < 10 ? '<br><b style="color:#F59E0B">Todavía no conoce: ' + faltan.join(', ') + '</b>' : '')
                + '</div>'
                + '<div class="io-rej" style="margin-bottom:6px">'
                +   '<input id="tcpQue" type="text" placeholder="01:18:23:04" autocomplete="off" '
                +     'style="flex:1;min-width:130px;background:#11131a;color:#e7ebf3;border:1px solid #2b3040;'
                +     'border-radius:9px;padding:8px 10px;font-size:13px;font-family:monospace">'
                +   '<button class="io-b" id="tcpAprende">Es lo que pone</button>'
                + '</div>'
                + '<div id="tcpAprEstado" style="font-size:12.5px;color:#60A5FA;margin-bottom:12px">'
                +   esc2(aprendiendo ? tcpAprenderTexto() : '') + '</div>'
              : '<div class="meta-nota"><b style="color:#4ADE80">Ya conoce las diez cifras.</b></div>')
        : '')
    + nPaso('ajustes')
    + '<div class="sala-rej">'
    +   '<label class="sala-c">Fotogramas <select id="tcpFps">'
    +     [24, 25, 29.97, 30].map(v => '<option value="' + v + '"'
          + (Math.abs(TCP.fps - v) < 0.01 ? ' selected' : '') + '>' + v + '</option>').join('')
    +   '</select></label>'
    +   '<label class="sala-c">Ajuste fino <input id="tcpLat" type="number" step="0.02" min="-2" max="2" '
    +     'value="' + TCP.lat + '"> s</label>'
    + '</div>'
    /* Arrancar es LA accion de este panel, asi que va la ultima y va destacada.
       Estaba al reves —«Cerrar» ancho y en verde, y arrancar en un boton
       pequeño de mas arriba—: se vio en pantalla y lo que pedia el ojo era
       cerrar, que es justo lo que no se viene a hacer aqui. */
    + '<div class="dud-btns">'
    +   '<button class="modo-op dud-b" id="tcpCerrar">Cerrar</button>'
    +   (TCP.on ? '<button class="modo-op dud-b dud-ok" id="tcpOff">⏹ Dejar de seguir a Pro Tools</button>'
              : '<button class="modo-op dud-b dud-ok" id="tcpOn">▶ Seguir a Pro Tools</button>')
    + '</div></div>';
  document.body.appendChild(ov);

  const cerrar = () => ov.remove();
  ov.querySelector('#tcpCerrar').onclick = cerrar;
  ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });

  /* Un fallo al compartir TIENE que decirse. Antes se devolvía false a secas y
     quien cancelaba, o no daba permiso, o se quedaba sin imagen, veía
     exactamente lo mismo: nada. */
  const compartir = async (pantallaEntera) => {
    const r = await tcpCompartir(pantallaEntera);
    if(!r.ok){ castAviso('❌ ' + r.motivo); return; }
    tcpTrasCompartir();
  };
  ov.querySelector('#tcpVerPant').onclick = () => compartir(true);
  ov.querySelector('#tcpVer').onclick = () => compartir(false);
  const br = ov.querySelector('#tcpRect');
  if(br) br.onclick = () => { cerrar(); tcpMarcarRect(); };

  const ba = ov.querySelector('#tcpAprende');
  const caja = ov.querySelector('#tcpQue');
  if(ba) ba.onclick = () => {
    const r = tcpAprenderArrancar(caja ? caja.value : '');
    if(!r.ok){ castAviso('❌ ' + r.motivo); return; }
    if(!r.faltan.length){
      castAviso('🎉 Ya conoce las diez cifras');
      if(tcpQueFalta() === 'listo') tcpEmpezarASeguir(); else tcpPanel();
      return;
    }
    const e = ov.querySelector('#tcpAprEstado');
    if(e) e.textContent = tcpAprenderTexto();
  };
  if(caja){
    caja.addEventListener('keydown', (ev) => { if(ev.key === 'Enter' && ba){ ev.preventDefault(); ba.click(); } });
    /* Si lo que falta es esto, el cursor ya está donde hay que escribir. */
    if(q === 'ensenar' && !aprendiendo){ try{ caja.focus(); }catch(e){ /* sin foco se escribe igual */ } }
  }
  tcpVistaEnMarcha(ov);

  ov.querySelector('#tcpFps').onchange = (e) => { TCP.fps = +e.target.value || 25; tcpGuardar(); };
  ov.querySelector('#tcpLat').onchange = (e) => {
    const v = +e.target.value; TCP.lat = isFinite(v) ? Math.max(-2, Math.min(2, v)) : 0; tcpGuardar();
  };

  const on = ov.querySelector('#tcpOn');
  if(on) on.onclick = () => {
    if(!TCP.video){ castAviso('❌ Primero comparte la pantalla de Pro Tools'); return; }
    if(!TCP.rect){ castAviso('❌ Primero marca el recuadro del contador'); return; }
    if(tcpFaltan().length === 10){ castAviso('❌ Primero enséñale las cifras'); return; }
    tcpEmpezarASeguir();
  };
  const off = ov.querySelector('#tcpOff');
  if(off) off.onclick = () => { tcpParar(); castAviso('El libreto deja de seguir a Pro Tools'); tcpPanel(); };
}

/**
 * Marcar el recuadro del contador: se enseña lo compartido y se arrastra un
 * rectangulo encima. Se guarda en proporciones (0..1), no en pixeles: asi sigue
 * valiendo si cambia la resolucion o el tamaño de la ventana compartida.
 */
function tcpMarcarRect(){
  if(!TCP.video){ castAviso('❌ Primero comparte la ventana'); return; }
  const ov = document.createElement('div');
  ov.id = 'tcpRectOv';
  /* `ddl-encima` NO es decoracion: con el libreto abierto, `body.ddlov`
     esconde todo hijo de body que no esté exento, y esto nacia sin clase. El
     sintoma que llego de sala: «la opcion de elegir recuadro se coloca abajo
     del libreto y no deja elegir». Es EST-N2 otra vez, y esta vez la culpa es
     de acordarse del panel y olvidarse de esta pantalla. */
  ov.className = 'ddl-encima';
  ov.style.cssText = 'position:fixed;inset:0;z-index:2147483600;background:#07060f;'
    + 'display:flex;flex-direction:column;align-items:center;justify-content:center;gap:10px';
  ov.innerHTML = '<div style="color:#e7ebf3;font-family:Inter,sans-serif;font-size:14px;text-align:center">'
    + 'Arrastra un recuadro sobre el <b>contador grande de Pro Tools</b>.<br>'
    + '<span style="color:#8892a6;font-size:12.5px">Solo las cifras: sin la etiqueta ni los bordes.</span></div>'
    + '<div id="tcpLienzo" style="position:relative;max-width:94vw;max-height:66vh"></div>'
    /* La lupa. Compartiendo la pantalla entera el contador queda diminuto sobre
       el lienzo y no hay manera de saber si se ha cogido bien; aqui se ve
       aumentado y con la cuenta de cifras, que es el dato que decide. */
    + '<div id="tcpLupaCaja" style="display:none;flex-direction:column;align-items:center;gap:6px">'
    +   '<canvas id="tcpLupa" style="image-rendering:pixelated;border:1px solid #2b3040;'
    +     'border-radius:6px;background:#0b0d12;max-width:90vw"></canvas>'
    +   '<div id="tcpCuenta" style="font-family:Inter,sans-serif;font-size:13px"></div>'
    + '</div>'
    + '<div style="display:flex;gap:9px">'
    +   '<button id="tcpRectNo" class="modo-op dud-b">Cancelar</button>'
    +   '<button id="tcpRectOk" class="modo-op dud-b dud-ok">Usar este recuadro</button></div>';
  document.body.appendChild(ov);

  const caja = ov.querySelector('#tcpLienzo');
  const v = TCP.video;
  const cv = document.createElement('canvas');
  cv.width = v.videoWidth || 1280; cv.height = v.videoHeight || 720;
  cv.style.cssText = 'display:block;max-width:94vw;max-height:76vh;width:auto;height:auto;cursor:crosshair';
  caja.appendChild(cv);
  const g = cv.getContext('2d');
  const marco = document.createElement('div');
  marco.style.cssText = 'position:absolute;border:2px solid #22C55E;background:rgba(34,197,94,.15);'
    + 'display:none;pointer-events:none';
  caja.appendChild(marco);

  /* Con temporizador, no con requestAnimationFrame: rAF no se dispara si la
     pestaña no esta pintando, y aqui lo normal es tener Pro Tools delante
     (ENT-N4). */
  let pintando = true;
  const pintar = () => {
    if(!pintando) return;
    try{ g.drawImage(v, 0, 0, cv.width, cv.height); }catch(e){ /* aun sin fotograma */ }
    setTimeout(pintar, 100);
  };
  pintar();

  /* `ajustada`: el recuadro recortado a las cifras, si lo que se marcó cogía de
     más. Es el que se guarda. */
  let a = null, sel = null, ajustada = null;
  const pos = (ev) => {
    const r = cv.getBoundingClientRect();
    return { x: (ev.clientX - r.left) / r.width, y: (ev.clientY - r.top) / r.height };
  };
  const ponerMarco = (s) => {
    const rc = cv.getBoundingClientRect(), cc = caja.getBoundingClientRect();
    marco.style.left = Math.round(rc.left - cc.left + s.x * rc.width) + 'px';
    marco.style.top = Math.round(rc.top - cc.top + s.y * rc.height) + 'px';
    marco.style.width = Math.round(s.w * rc.width) + 'px';
    marco.style.height = Math.round(s.h * rc.height) + 'px';
  };
  cv.addEventListener('pointerdown', (ev) => { a = pos(ev); ajustada = null; marco.style.display = 'block'; });
  cv.addEventListener('pointermove', (ev) => {
    if(!a) return;
    const b = pos(ev);
    const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y);
    const w = Math.abs(b.x - a.x), h = Math.abs(b.y - a.y);
    sel = { x: x, y: y, w: w, h: h };
    ponerMarco(sel);
  });
  /**
   * Enseña aumentado lo que se ha cogido, y dice cuantas cifras ve ahi. Es la
   * unica manera de saber si el recuadro esta bien antes de darle a usarlo:
   * con la pantalla entera compartida, en el lienzo el contador es un sello.
   */
  const lupa = () => {
    if(!sel || sel.w <= 0 || sel.h <= 0) return;
    const caja2 = ov.querySelector('#tcpLupaCaja');
    const lc = ov.querySelector('#tcpLupa');
    const cuenta = ov.querySelector('#tcpCuenta');
    const sx = Math.round(sel.x * cv.width), sy = Math.round(sel.y * cv.height);
    const sw = Math.max(1, Math.round(sel.w * cv.width)), sh = Math.max(1, Math.round(sel.h * cv.height));
    const k = Math.max(1, Math.min(6, Math.floor(620 / sw)));
    lc.width = sw * k; lc.height = sh * k;
    const lg = lc.getContext('2d');
    lg.imageSmoothingEnabled = false;
    try{ lg.drawImage(cv, sx, sy, sw, sh, 0, 0, lc.width, lc.height); }
    catch(e){ /* el recuadro se ha salido del lienzo: no se enseña nada */ }
    caja2.style.display = 'flex';
    /* Se mide sobre el recuadro de verdad, con el mismo codigo que leera
       despues: no vale enseñar una cosa y medir otra. */
    const antes = TCP.rect;
    const trozos = (r) => {
      TCP.rect = r;
      try{ const f = tcpFoto(); return { n: f ? tcpGrupos(f).length : 0, f: f }; }
      catch(e){ return { n: 0, f: null }; /* sin imagen todavia: cero, y lo dice */ }
    };
    let m = trozos(sel);
    ajustada = null;
    /* Si no salen las ocho, se busca el contador DENTRO de lo marcado: coger
       de más —la etiqueta, el borde— era el fallo de siempre. */
    if(m.n !== 11 && m.n !== 8 && m.f){
      const r = tcpRecortar(m.f);
      if(r){
        const s2 = tcpDentroDe(sel, r);
        const m2 = trozos(s2);
        if(m2.n === 11 || m2.n === 8){ ajustada = s2; m = m2; ponerMarco(s2); }
      }
    }
    TCP.rect = antes;
    const n = m.n;
    const bien = (n === 11 || n === 8);
    cuenta.innerHTML = bien
      ? '<b style="color:#4ADE80">✓ veo las ocho cifras' + (ajustada ? ' · he ajustado el recuadro a ellas' : '') + '</b>'
      : '<b style="color:#F59E0B">Aquí veo ' + n + ' trozos y tienen que ser 8 cifras'
        + (n > 11 ? ' — coge el contador, sin otras cosas escritas al lado' : '')
        + (n < 8 ? ' — coge el contador entero, de la primera cifra a la última' : '') + '</b>';
  };
  cv.addEventListener('pointerup', () => { a = null; lupa(); });

  const fin = () => { pintando = false; ov.remove(); };
  ov.querySelector('#tcpRectNo').onclick = () => { fin(); tcpPanel(); };
  ov.querySelector('#tcpRectOk').onclick = () => {
    if(!sel || sel.w < 0.01 || sel.h < 0.005){ castAviso('❌ Arrastra un recuadro sobre el contador'); return; }
    TCP.rect = ajustada || sel;
    /* Recuadro nuevo, casillas nuevas: las de antes eran de otro sitio. Las
       plantillas SI se conservan, que el dibujo de un 7 sigue siendo un 7. Y
       las casillas se sacan YA, de lo que se ve ahora (PT-5): si no, se
       recalculaban en cada lectura hasta que alguien enseñara las cifras. */
    TCP.celdas = null;
    try{ const f = tcpFoto(); const L = f ? tcpLayout(f) : null; if(L) TCP.celdas = L; }
    catch(e){ /* se sacarán al enseñarle las cifras */ }
    tcpGuardar();
    fin();
    const r = tcpLeerUna();
    const ocho = !!(r && r.celdas === 8);
    castAviso(ocho
      ? '⬚ Recuadro guardado · veo 8 cifras'
      : ('⚠️ En el recuadro veo ' + ((r && r.celdas) || 0) + ' cifras y tienen que ser 8'));
    /* Lo siguiente, sin más clics: si ya conocía las cifras, a seguir. */
    if(ocho && tcpQueFalta() === 'listo') tcpEmpezarASeguir();
    else tcpPanel();
  };
}
