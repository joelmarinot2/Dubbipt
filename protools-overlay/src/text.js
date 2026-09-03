'use strict';
/* ────────────────────────────────────────────────────────────────────
   Texto -> palabras, con peso por silabas.
   El peso importa: al repartir un tramo de audio entre las palabras que
   caen dentro, "extraordinariamente" tiene que llevarse mucho mas tiempo
   que "y". Contar silabas aproxima la duracion mucho mejor que contar
   letras.
   Todo trabaja sobre puntos de codigo, no bytes: las tildes y la ene no
   pueden partir una palabra por la mitad.
   ──────────────────────────────────────────────────────────────────── */

const VOCALES = 'aeiouáéíóúüàèìòùâêîôûäëïöÿ';
const ES_VOCAL = new Set([...VOCALES, ...VOCALES.toUpperCase()]);

/** Silabas aproximadas: grupos de vocales seguidas. Minimo 1. */
function silabas(palabra){
  let n = 0, dentro = false;
  for(const ch of String(palabra || '')){
    const v = ES_VOCAL.has(ch);
    if(v && !dentro) n++;
    dentro = v;
  }
  return Math.max(1, n);
}

/** ¿Tiene alguna letra o cifra? Un "—" suelto no es una palabra. */
function tieneLetra(s){
  return /[\p{L}\p{N}]/u.test(String(s || ''));
}

/**
 * Trocea el texto conservando TODO (espacios y saltos incluidos), para poder
 * repintarlo tal cual. Devuelve fichas: las que tienen `wi` son palabras
 * cronometrables; las demas son separadores.
 */
function tokenize(texto){
  const src = String(texto == null ? '' : texto);
  const fichas = [];
  let wi = 0;
  // Se parte por espacios pero se guardan: el overlay respeta los saltos de linea.
  const partes = src.split(/(\s+)/u);
  for(const p of partes){
    if(p === '') continue;
    if(/^\s+$/u.test(p)){ fichas.push({ t: p, sep: true }); continue; }
    if(!tieneLetra(p)){ fichas.push({ t: p, sep: true }); continue; }
    fichas.push({ t: p, wi: wi++, sil: silabas(p) });
  }
  return fichas;
}

/** Solo las palabras cronometrables, en orden. */
function palabras(fichas){ return fichas.filter(f => f.wi !== undefined); }

/**
 * Lineas para el overlay: se respetan los saltos del texto original y, si una
 * linea es larguisima, se parte por numero de caracteres para que quepa.
 */
function lineas(fichas, maxChars){
  const max = maxChars || 42;
  const out = [];
  let act = [], largo = 0;
  const cerrar = ()=>{ if(act.length){ out.push(act); act = []; largo = 0; } };
  for(const f of fichas){
    if(f.sep && /\n/.test(f.t)){ cerrar(); continue; }
    if(f.sep){ if(act.length){ act.push(f); largo += f.t.length; } continue; }
    if(largo + f.t.length > max && act.length){ cerrar(); }
    act.push(f); largo += f.t.length;
  }
  cerrar();
  // quitar separadores colgando al final de cada linea
  return out.map(l => { while(l.length && l[l.length-1].sep) l.pop(); return l; })
            .filter(l => l.length);
}

// Sirve en node (tests, worker) y en el navegador. Sin variable con nombre:
// estos ficheros comparten ambito global al cargarse como scripts clasicos,
// y un `const` repetido tumbaria al segundo que se cargue.
if(typeof module !== 'undefined' && module.exports) module.exports = { tokenize, palabras, lineas, silabas, tieneLetra };
if(typeof self !== 'undefined') Object.assign(self, { tokenize, palabras, lineas, silabas, tieneLetra });
