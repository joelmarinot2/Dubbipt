'use strict';
/* ────────────────────────────────────────────────────────────────────
   Alineacion forzada.

   Dos motores, misma salida ([{wi,t0,t1}]):

   · 'senal'  (incluido, sin modelo): reparte las palabras entre los tramos
     de voz detectados, en proporcion a sus SILABAS. El error no se acumula
     porque cada pausa vuelve a anclar el texto al audio. Precision tipica al
     nivel de FRASE; dentro de la frase, interpolado.

   · 'externo' (recomendado para el nivel de PALABRA): recibe marcas ya
     calculadas por un alineador de verdad -whisper.cpp, WhisperX, MFA- y solo
     las normaliza. Es el unico camino honesto para +-50 ms por palabra: un
     analisis de energia no distingue donde acaba una palabra y empieza la
     siguiente si no hay pausa entre ellas.
   ──────────────────────────────────────────────────────────────────── */

// En node (tests) llegan por require; en el worker ya estan puestos en self
// por los importScripts previos. Los mismos ficheros sirven en los dos sitios.
// Todo el modulo va dentro de un cierre: con importScripts estos ficheros
// comparten ambito global, y aqui se vuelven a nombrar `segments`,
// `tokenize` y compania, que ya existen. Fuera solo salen las exportaciones.
(function(){
  const _en = (typeof require === 'function') ? require('./energy') : self;
  const _tx = (typeof require === 'function') ? require('../text')  : self;
  const { segments, nucleos, HOP } = _en;
  const { tokenize, palabras } = _tx;

  class AudioNoInteligible extends Error {
    constructor(motivo){
      super('Audio no inteligible' + (motivo ? ': ' + motivo : ''));
      this.name = 'AudioNoInteligible';
      this.code = 'AUDIO_NO_INTELIGIBLE';
    }
  }

  /** Reparte un tramo [t0,t1] entre palabras, en proporcion a sus silabas. */
  function repartir(ws, t0, t1){
    const total = ws.reduce((a, w) => a + w.sil, 0) || ws.length;
    const dur = Math.max(0, t1 - t0);
    const out = [];
    let cursor = t0;
    for(const w of ws){
      const parte = dur * (w.sil / total);
      out.push({ wi: w.wi, t0: cursor, t1: cursor + parte });
      cursor += parte;
    }
    if(out.length) out[out.length - 1].t1 = t1;   // cerrar exacto, sin arrastre
    return out;
  }

  /**
   * Reparte un tramo apoyandose en los NUCLEOS silabicos (los picos de energia).
   *
   * Interpolar por silabas supone que todas duran lo mismo, y al hablar no es
   * asi. Contando crestas se sigue el ritmo de verdad: se cuenta cuantos picos
   * le tocan a cada palabra y se corta en el VALLE entre el ultimo pico de una
   * y el primero de la siguiente. Si el tramo no da picos fiables, se vuelve al
   * reparto proporcional.
   */
  function repartirTramo(ws, t0, t1, db, hop){
    if(ws.length < 2 || !db) return repartir(ws, t0, t1);
    const h = hop || HOP;
    const i0 = Math.round(t0 / h), i1 = Math.round(t1 / h);
    const nuc = nucleos(db, i0, i1);
    const totalSil = ws.reduce((a, w) => a + w.sil, 0);
    // sin picos suficientes para repartir no hay nada que ganar
    if(nuc.length < ws.length || !totalSil) return repartir(ws, t0, t1);

    const cortes = [t0];
    let acum = 0, prev = t0;
    for(let k = 0; k < ws.length - 1; k++){
      acum += ws[k].sil;
      // que pico le toca a esta frontera, escalado si hay mas o menos picos que silabas
      let ni = Math.round(acum * nuc.length / totalSil);
      ni = Math.min(nuc.length - 1, Math.max(1, ni));
      // el valle entre el pico anterior y este: ahi acaba una palabra
      let mejor = nuc[ni - 1], vMin = Infinity;
      for(let i = nuc[ni - 1]; i <= nuc[ni]; i++){
        if(db[i] < vMin){ vMin = db[i]; mejor = i; }
      }
      let t = mejor * h;
      if(t <= prev) t = prev + h;              // fronteras siempre crecientes
      if(t >= t1)   t = Math.max(prev + h / 2, t1 - h);
      cortes.push(t); prev = t;
    }
    cortes.push(t1);

    const out = [];
    for(let k = 0; k < ws.length; k++){
      out.push({ wi: ws[k].wi, t0: cortes[k], t1: cortes[k + 1] });
    }
    return out;
  }

  /**
   * Motor de señal.
   * @param {Float32Array} samples  mono
   * @param {number} sampleRate
   * @param {string} texto
   */
  function alignBySignal(samples, sampleRate, texto, opts){
    const fichas = tokenize(texto);
    const ws = palabras(fichas);
    if(!ws.length) throw new AudioNoInteligible('no hay texto que alinear');

    const r = segments(samples, sampleRate, opts);
    if(!r.segs.length) throw new AudioNoInteligible('no se detecto voz');
    // Sin pausas en toda la pista no hay nada a lo que anclarse: o es ruido
    // continuo, o la voz viene enterrada. Mejor decirlo que inventar marcas.
    if(r.ratio > 0.985) throw new AudioNoInteligible('no se distinguen pausas');
    if((r.techo - r.suelo) < 6) throw new AudioNoInteligible('senal demasiado plana');

    // Reparto de palabras entre tramos.
    //
    // La cuota se RECALCULA en cada tramo con lo que queda de texto y lo que
    // queda de audio: asi un desvio en un tramo no se arrastra hasta el final.
    // Y el corte se elige por cercania a la cuota, no por "el primero que la
    // supere": con cuota 4 y palabras de 3 silabas, cortar en 3 (error 1) es
    // mejor que cortar en 6 (error 2), y evita que un tramo largo robe la
    // palabra del siguiente.
    const out = [];
    let idx = 0;
    let silQuedan = ws.reduce((a, w) => a + w.sil, 0);
    let durQuedan = r.segs.reduce((a, s) => a + (s.t1 - s.t0), 0);
    for(let i = 0; i < r.segs.length && idx < ws.length; i++){
      const s = r.segs[i];
      const sDur = s.t1 - s.t0;
      const tramosQuedan = r.segs.length - i;
      let n;
      if(tramosQuedan === 1){
        n = ws.length - idx;                       // el ultimo se lleva el resto
      }else{
        const cuota = durQuedan > 0 ? silQuedan * (sDur / durQuedan) : 0;
        // dejar al menos una palabra para cada tramo que aun queda por delante
        const tope = Math.max(1, ws.length - idx - (tramosQuedan - 1));
        let acum = 0, mejor = 1, dMejor = Infinity;
        for(let k = 1; k <= tope; k++){
          acum += ws[idx + k - 1].sil;
          const d = Math.abs(acum - cuota);
          if(d < dMejor){ dMejor = d; mejor = k; }
          if(acum >= cuota) break;                 // pasada la cuota ya solo empeora
        }
        n = mejor;
      }
      const trozo = ws.slice(idx, idx + n);
      out.push(...repartirTramo(trozo, s.t0, s.t1, r.db, r.hop));
      idx += n;
      silQuedan -= trozo.reduce((a, w) => a + w.sil, 0);
      durQuedan -= sDur;
    }
    // si sobraron palabras (mas texto que audio), se pegan al final del ultimo tramo
    if(idx < ws.length){
      const fin = r.segs[r.segs.length - 1].t1;
      out.push(...repartir(ws.slice(idx), fin, fin + 0.001 * (ws.length - idx)));
    }
    return { words: out, fichas, motor: 'senal', segs: r.segs, ratio: r.ratio };
  }

  /**
   * Motor externo: marcas ya calculadas fuera (whisper.cpp / WhisperX / MFA).
   * Se acepta [{word,start,end}] o [{wi,t0,t1}] y se casa por orden con el texto.
   */
  function alignFromExternal(texto, marcas){
    const fichas = tokenize(texto);
    const ws = palabras(fichas);
    if(!ws.length) throw new AudioNoInteligible('no hay texto que alinear');
    if(!Array.isArray(marcas) || !marcas.length) throw new AudioNoInteligible('el alineador no devolvio marcas');
    const out = [];
    const n = Math.min(ws.length, marcas.length);
    for(let i = 0; i < n; i++){
      const m = marcas[i];
      const t0 = Number(m.t0 != null ? m.t0 : m.start);
      const t1 = Number(m.t1 != null ? m.t1 : m.end);
      if(!isFinite(t0) || !isFinite(t1) || t1 < t0) continue;
      out.push({ wi: ws[i].wi, t0, t1 });
    }
    if(!out.length) throw new AudioNoInteligible('las marcas no eran validas');
    return { words: out, fichas, motor: 'externo' };
  }

  /** Mueve todas las marcas N milisegundos (calibracion manual). */
  function applyOffset(words, ms){
    const d = (Number(ms) || 0) / 1000;
    return words.map(w => ({ wi: w.wi, t0: w.t0 + d, t1: w.t1 + d }));
  }

  // Sirve en node (tests, worker) y en el navegador. Sin variable con nombre:
  // estos ficheros comparten ambito global al cargarse como scripts clasicos,
  // y un `const` repetido tumbaria al segundo que se cargue.
  if(typeof module !== 'undefined' && module.exports) module.exports = { alignBySignal, alignFromExternal, applyOffset, AudioNoInteligible, repartir, repartirTramo };
  if(typeof self !== 'undefined') Object.assign(self, { alignBySignal, alignFromExternal, applyOffset, AudioNoInteligible, repartir, repartirTramo });
})();
