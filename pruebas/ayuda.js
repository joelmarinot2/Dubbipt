/* Ayudas para las pruebas.
 *
 * Todas leen el index.html QUE SE DESPLIEGA, no una copia. Se saca el
 * contenido de los dos <script> en línea, se recorta el trozo de código que se
 * quiere probar y se evalúa con las dependencias justas.
 *
 * Es deliberado, y tiene dos virtudes:
 *
 *  · Se prueba el código de verdad. Si alguien edita index.html, la prueba ve
 *    ese cambio; no hay una copia que se quede vieja sin que nadie lo note.
 *  · No hace falta empaquetador, ni módulos, ni tocar la aplicación. Dubbipt
 *    es un solo archivo a propósito, y las pruebas se adaptan a eso en vez de
 *    pedir que la aplicación se adapte a las pruebas.
 *
 * El precio: los recortes van por texto, así que si alguien cambia el
 * comentario que sirve de referencia, la prueba se queja de que no encuentra
 * el trozo. Se queja fuerte y con el nombre exacto — eso es un aviso, no un
 * fallo silencioso, que es justo lo que queremos.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');
const INDEX = path.join(RAIZ, 'index.html');

/** El contenido de los <script> en línea de index.html, en orden. */
function bloques(){
  const html = fs.readFileSync(INDEX, 'utf8');
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g;
  const out = [];
  let m;
  while((m = re.exec(html))) out.push(m[1]);
  if(out.length < 2)
    throw new Error('Esperaba al menos dos <script> en línea en index.html y encontré ' + out.length);
  return out;
}

let _cache = null;
function todoElCodigo(){
  if(!_cache) _cache = bloques();
  return _cache;
}

/**
 * Recorta el código entre dos marcas de texto, buscando en los dos bloques.
 * `desde` se incluye; `hasta` no.
 */
function trozo(desde, hasta){
  for(const src of todoElCodigo()){
    const i = src.indexOf(desde);
    if(i < 0) continue;
    const j = src.indexOf(hasta, i);
    if(j < 0)
      throw new Error('Encontré «' + desde + '» pero no «' + hasta + '» detrás.\n'
        + '   Alguien habrá cambiado ese comentario en index.html: ajusta la marca en la prueba.');
    return src.slice(i, j);
  }
  throw new Error('No encuentro «' + desde + '» en ningún <script> de index.html.\n'
    + '   O se ha movido, o se ha reescrito ese comentario: ajusta la marca en la prueba.');
}

/**
 * Monta un módulo a partir de varios recortes y devuelve lo que se le pida.
 *
 *   montar([['const GEST_PAL','/** Aviso al']], ['gestEscanear'], { script: [] })
 *
 * `contexto` son las variables globales que ese código espera encontrar
 * (script, charIdx, window…). Se pasan como parámetros de la función, así que
 * el código de dentro las ve exactamente como las vería en el navegador.
 */
function montar(recortes, exportar, contexto){
  const codigo = recortes.map(r => trozo(r[0], r[1])).join('\n');
  const nombres = Object.keys(contexto || {});
  const valores = nombres.map(k => contexto[k]);
  const cuerpo = codigo + '\nreturn { ' + exportar.join(', ') + ' };';
  let f;
  try{
    f = new Function(...nombres, cuerpo);
  }catch(e){
    throw new Error('El trozo recortado no compila: ' + e.message);
  }
  return f(...valores);
}

/* ── Lo mínimo del navegador que algunos módulos necesitan ─────────────── */

/** El mismo `karNorm` de la aplicación, para las pruebas que lo piden. */
function karNormReal(){
  return montar([['/** Quita tildes, signos y mayusculas', 'function karCasar']],
                ['karNorm'], {}).karNorm;
}

/* ── Aserciones ────────────────────────────────────────────────────────── */

function nuevoTablero(){
  const t = {
    pasadas: 0,
    fallos: [],
    seccion(nombre){ t._sec = nombre; console.log('  ' + nombre); },
    _apunta(nombre, ok, detalle){
      if(ok){ t.pasadas++; return; }
      t.fallos.push({ seccion: t._sec || '', nombre, detalle });
      console.log('    ✗ ' + nombre + (detalle ? ' — ' + detalle : ''));
    },
    /** Iguales, tal cual. */
    eq(nombre, real, esperado){
      const ok = (real === esperado)
        || (typeof real === 'object' && JSON.stringify(real) === JSON.stringify(esperado));
      t._apunta(nombre, ok, ok ? '' : 'dio ' + JSON.stringify(real) + ', esperaba ' + JSON.stringify(esperado));
    },
    /** Iguales con margen, para números. */
    cerca(nombre, real, esperado, tolerancia){
      const ok = isFinite(real) && Math.abs(real - esperado) <= tolerancia;
      t._apunta(nombre, ok, ok ? '' : 'dio ' + real + ', esperaba ' + esperado + ' ±' + tolerancia);
    },
    /** Verdadero, sin más. */
    ok(nombre, valor, detalle){
      t._apunta(nombre, !!valor, valor ? '' : (detalle || 'salió falso'));
    }
  };
  return t;
}

module.exports = { RAIZ, INDEX, bloques, trozo, montar, karNormReal, nuevoTablero };
