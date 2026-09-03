'use strict';
/* ────────────────────────────────────────────────────────────────────
   Envolvente y segmentacion voz / silencio.

   La idea: la voz no llena el tiempo, lo alterna con pausas. Si se detectan
   bien esas pausas, el texto se puede repartir por tramos y el error deja de
   acumularse a lo largo del audio.

   Contra la sangria de otros instrumentos (bleed): el umbral NO es fijo, sale
   de la propia grabacion. Se toma un percentil bajo de la energia como suelo
   -eso ES el fondo, tenga el nivel que tenga- y se exige que la voz lo supere
   por un margen. Un fondo constante sube el suelo y no dispara nada; lo que se
   busca son los SALTOS sobre el.
   ──────────────────────────────────────────────────────────────────── */

const HOP = 0.010;          // 10 ms por trama de analisis
const VENTANA = 0.025;      // 25 ms de ventana

/** Envolvente RMS en dB, una muestra cada HOP segundos. */
function envelope(samples, sampleRate){
  const hop = Math.max(1, Math.round(sampleRate * HOP));
  const win = Math.max(hop, Math.round(sampleRate * VENTANA));
  const n = Math.max(0, Math.floor((samples.length - win) / hop) + 1);
  const out = new Float32Array(n);
  for(let i = 0; i < n; i++){
    const ini = i * hop;
    let suma = 0;
    for(let j = 0; j < win; j++){ const v = samples[ini + j] || 0; suma += v * v; }
    const rms = Math.sqrt(suma / win);
    out[i] = 20 * Math.log10(rms + 1e-9);      // dB, con suelo para no dar -Infinity
  }
  return { db: out, hop: HOP };
}

/** Percentil p (0..1) de un Float32Array, sin ordenar el original. */
function percentil(arr, p){
  if(!arr.length) return 0;
  const copia = Float32Array.from(arr);
  copia.sort();
  const i = Math.min(copia.length - 1, Math.max(0, Math.round(p * (copia.length - 1))));
  return copia[i];
}

/**
 * Tramos de voz. Devuelve [{t0,t1}] en segundos.
 * opts.margenDb  : cuanto tiene que superar la voz al suelo de ruido (def. 9 dB)
 * opts.minVoz    : tramo de voz mas corto que se acepta (def. 0.12 s)
 * opts.minPausa  : silencio minimo para partir dos tramos (def. 0.18 s)
 */
function segments(samples, sampleRate, opts){
  const o = opts || {};
  const margenDb = o.margenDb != null ? o.margenDb : 9;
  const minVoz   = o.minVoz   != null ? o.minVoz   : 0.12;
  const minPausa = o.minPausa != null ? o.minPausa : 0.18;

  const { db, hop } = envelope(samples, sampleRate);
  if(db.length < 10) return { segs: [], suelo: 0, techo: 0, ratio: 0 };

  const suelo = percentil(db, 0.15);     // el 15% mas bajo ES el fondo
  const techo = percentil(db, 0.95);
  const alto  = suelo + margenDb;
  const bajo  = suelo + margenDb * 0.6;  // histeresis: cuesta mas entrar que salir

  const segs = [];
  let dentro = false, ini = 0;
  for(let i = 0; i < db.length; i++){
    const v = db[i];
    if(!dentro && v >= alto){ dentro = true; ini = i; }
    else if(dentro && v < bajo){
      // solo se cierra si el silencio dura lo suficiente
      let j = i;
      while(j < db.length && db[j] < bajo) j++;
      if((j - i) * hop >= minPausa || j >= db.length){
        segs.push({ t0: ini * hop, t1: i * hop });
        dentro = false; i = j - 1;
      } else { i = j - 1; }
    }
  }
  if(dentro) segs.push({ t0: ini * hop, t1: db.length * hop });

  const utiles = segs.filter(s => (s.t1 - s.t0) >= minVoz);
  const dur = db.length * hop;
  const hablado = utiles.reduce((a, s) => a + (s.t1 - s.t0), 0);
  return { segs: utiles, suelo, techo, ratio: dur ? hablado / dur : 0, dur, db, hop };
}

/**
 * Nucleos silabicos dentro de [i0,i1) de la envolvente: los picos de energia.
 *
 * Al hablar, cada silaba es una cresta -la vocal- y los bordes entre silabas
 * son valles. Contar crestas sigue el RITMO real, que es justo lo que la
 * interpolacion por silabas no ve: una silaba alargada sigue siendo UN pico,
 * y una atona rapida tambien. Devuelve los indices de trama de cada pico.
 */
function nucleos(db, i0, i1, opts){
  const o = opts || {};
  const sep  = Math.max(1, Math.round((o.minSilaba != null ? o.minSilaba : 0.075) / HOP));
  const prom = o.prominencia != null ? o.prominencia : 2.5;   // dB
  const a = Math.max(0, i0), b = Math.min(db.length, i1);
  if(b - a < 3) return [];

  // suavizado corto: quita el rizado del RMS sin borrar las crestas
  const n = b - a;
  const suave = new Float32Array(n);
  for(let i = 0; i < n; i++){
    let sum = 0, c = 0;
    for(let k = -1; k <= 1; k++){ const j = i + k; if(j >= 0 && j < n){ sum += db[a + j]; c++; } }
    suave[i] = sum / c;
  }

  // candidatos: maximos locales
  const picos = [];
  for(let i = 1; i < n - 1; i++){
    if(suave[i] >= suave[i - 1] && suave[i] > suave[i + 1]) picos.push(i);
  }
  if(!picos.length) return [];

  // se exige un valle de al menos `prom` dB entre dos picos seguidos; si no lo
  // hay, son la misma silaba y se conserva el mas alto
  const fin = [];
  for(const p of picos){
    if(!fin.length){ fin.push(p); continue; }
    const q = fin[fin.length - 1];
    let valle = Infinity;
    for(let i = q; i <= p; i++) if(suave[i] < valle) valle = suave[i];
    const caida = Math.min(suave[q], suave[p]) - valle;
    if(p - q < sep || caida < prom){
      if(suave[p] > suave[q]) fin[fin.length - 1] = p;
    } else fin.push(p);
  }
  return fin.map(i => a + i);
}

// Sirve en node (tests, worker) y en el navegador. Sin variable con nombre:
// estos ficheros comparten ambito global al cargarse como scripts clasicos,
// y un `const` repetido tumbaria al segundo que se cargue.
if(typeof module !== 'undefined' && module.exports) module.exports = { envelope, segments, percentil, nucleos, HOP };
if(typeof self !== 'undefined') Object.assign(self, { envelope, segments, percentil, nucleos, HOP });
