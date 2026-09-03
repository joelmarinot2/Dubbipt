'use strict';
/* ────────────────────────────────────────────────────────────────────
   Linea de tiempo de la letra.
   Dado un instante del cabezal, responde que palabra suena y con que
   fraccion de relleno. Tiene que aguantar:
     · saltos aleatorios (el usuario arrastra el cabezal),
     · ciclos (loop): al volver al inicio no puede quedar rastro,
   y responder en tiempo constante-ish, no recorriendo la lista entera.

   La busqueda es binaria (O(log n)) y ademas recuerda el ultimo indice: en
   reproduccion normal el siguiente instante casi siempre cae en la misma
   palabra o en la siguiente, asi que se resuelve en un par de comparaciones.
   ──────────────────────────────────────────────────────────────────── */

class Timeline {
  /** words: [{wi, t0, t1}] en segundos, ordenadas y sin solaparse. */
  constructor(words){
    this.words = Array.isArray(words) ? words.slice() : [];
    this.words.sort((a,b)=> a.t0 - b.t0);
    this._last = 0;
    this._t0s = this.words.map(w => w.t0);
  }

  get duration(){
    return this.words.length ? this.words[this.words.length-1].t1 : 0;
  }

  /** Indice de la ultima palabra cuyo t0 <= t. -1 si t es anterior a todo. */
  _index(t){
    const a = this._t0s;
    if(!a.length) return -1;
    // atajo: seguimos donde lo dejamos (caso normal reproduciendo)
    const l = this._last;
    if(l >= 0 && l < a.length && a[l] <= t && (l+1 >= a.length || a[l+1] > t)) return l;
    if(l+1 < a.length && a[l+1] <= t && (l+2 >= a.length || a[l+2] > t)){ this._last = l+1; return l+1; }
    if(t < a[0]) { this._last = 0; return -1; }
    let lo = 0, hi = a.length - 1, res = 0;
    while(lo <= hi){
      const mid = (lo + hi) >> 1;
      if(a[mid] <= t){ res = mid; lo = mid + 1; } else hi = mid - 1;
    }
    this._last = res;
    return res;
  }

  /**
   * Estado en el instante t (segundos).
   *   done  : palabras completamente dichas (indices < activa)
   *   active: indice de la palabra en curso, o -1
   *   fill  : 0..1 dentro de la palabra activa
   * Es una funcion PURA del tiempo: por eso un salto o un ciclo no necesitan
   * ningun "reset", basta con volver a preguntar.
   */
  at(t){
    const i = this._index(t);
    if(i < 0) return { done: 0, active: -1, fill: 0 };
    const w = this.words[i];
    if(t >= w.t1){
      // en el hueco entre dos palabras: la anterior ya esta entera
      return { done: i + 1, active: -1, fill: 0 };
    }
    const dur = Math.max(1e-6, w.t1 - w.t0);
    const fill = Math.max(0, Math.min(1, (t - w.t0) / dur));
    return { done: i, active: i, fill };
  }

  /** Reinicia el atajo de busqueda. Util al saltar muy lejos. */
  reset(){ this._last = 0; }
}

// Sirve en node (tests, worker) y en el navegador. Sin variable con nombre:
// estos ficheros comparten ambito global al cargarse como scripts clasicos,
// y un `const` repetido tumbaria al segundo que se cargue.
if(typeof module !== 'undefined' && module.exports) module.exports = { Timeline };
if(typeof self !== 'undefined') Object.assign(self, { Timeline });
