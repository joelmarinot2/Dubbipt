/* Corre todas las pruebas de Dubbipt.
 *
 *   node pruebas/correr.js
 *
 * Tres partes, en este orden:
 *
 *  1. SINTAXIS. Se saca el JavaScript de los dos <script> en línea de
 *     index.html y de sw.js y se pasa por el propio comprobador de Node. Es lo
 *     primero porque un paréntesis mal cerrado deja la aplicación en blanco, y
 *     eso no lo detecta ninguna prueba de comportamiento: no llega a arrancar.
 *
 *  2. CARCASA. Que todo archivo local que index.html cargue esté en la lista
 *     SHELL de sw.js (regla ENT-6). Si falta, la aplicación funciona hasta que
 *     alguien la abre sin conexión, y entonces falla sin explicación.
 *
 *  3. COMPORTAMIENTO. Cada archivo *.prueba.js recorta el trozo de index.html
 *     que le toca y lo comprueba.
 *
 * Devuelve 1 si algo falla, para que la integración continua se ponga en rojo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const { RAIZ, fuentes, nuevoTablero } = require('./ayuda');

const t0 = Date.now();
let malSintaxis = 0;

console.log('');
console.log('  Dubbipt · pruebas');

/* ── 1. Sintaxis ───────────────────────────────────────────────────────── */

console.log('');
console.log('  SINTAXIS');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'dubbipt-pruebas-'));
try{
  const trozos = fuentes();
  try{
    trozos.push({ nombre: 'sw.js', src: fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8') });
  }catch(e){ console.log('    ✗ no pude leer sw.js: ' + e.message); malSintaxis++; }

  for(const trozo of trozos){
    const f = path.join(tmp, trozo.nombre.replace(/[^a-z0-9]+/gi, '_') + '.js');
    fs.writeFileSync(f, trozo.src, 'utf8');
    const r = spawnSync(process.execPath, ['--check', f], { encoding: 'utf8' });
    if(r.status === 0){
      console.log('    ✓ ' + trozo.nombre + '  (' + trozo.src.split('\n').length + ' líneas)');
    }else{
      malSintaxis++;
      console.log('    ✗ ' + trozo.nombre);
      console.log('      ' + String(r.stderr || '').trim().split('\n').slice(0, 6).join('\n      '));
    }
  }
}catch(e){
  malSintaxis++;
  console.log('    ✗ no pude sacar el código de index.html: ' + e.message);
}finally{
  try{ fs.rmSync(tmp, { recursive: true, force: true }); }catch(e){}
}

/* ── 2. Carcasa: lo que carga index.html tiene que estar en el SHELL ─────
 *
 * Regla ENT-6 de la especificación. Un archivo local que index.html cargue y
 * que no esté en la lista SHELL de sw.js funciona perfectamente... hasta que
 * alguien abre la aplicación sin conexión. Entonces falta, y no hay ningún
 * error que lo explique. Es un olvido de dos segundos con una consecuencia
 * invisible, así que lo vigila una máquina.
 */

console.log('');
console.log('  CARCASA (sin conexión)');
let malCarcasa = 0;
try{
  const html = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  const sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const shell = (sw.match(/const SHELL\s*=\s*\[([\s\S]*?)\]/) || [, ''])[1];

  const locales = new Set();
  for(const re of [/<script[^>]*\ssrc="(\.\/[^"]+)"/g, /<link[^>]*\shref="(\.\/[^"]+)"/g]){
    let m;
    while((m = re.exec(html))) locales.add(m[1]);
  }

  if(!locales.size){
    console.log('    · index.html no carga ningún archivo local suelto');
  }
  for(const f of Array.from(locales).sort()){
    const nombre = f.replace(/^\.\//, '');
    if(shell.includes("'" + f + "'") || shell.includes('"' + f + '"')
       || shell.includes("'./" + nombre + "'") || shell.includes('"./' + nombre + '"')){
      console.log('    ✓ ' + nombre + ' está en el SHELL');
    }else{
      malCarcasa++;
      console.log('    ✗ ' + nombre + ' lo carga index.html y NO está en el SHELL de sw.js');
      console.log('      Sin conexión faltará, y no dará ningún error que lo explique.');
    }
    if(!fs.existsSync(path.join(RAIZ, nombre))){
      malCarcasa++;
      console.log('    ✗ ' + nombre + ' no existe en el repositorio');
    }
  }
}catch(e){
  malCarcasa++;
  console.log('    ✗ no pude comprobar la carcasa: ' + e.message);
}

/* ── 3. Comportamiento ─────────────────────────────────────────────────── */

const archivos = fs.readdirSync(__dirname)
  .filter(f => f.endsWith('.prueba.js'))
  .sort();

let pasadas = 0;
const fallos = [];

for(const archivo of archivos){
  let mod;
  try{
    mod = require(path.join(__dirname, archivo));
  }catch(e){
    fallos.push({ seccion: archivo, nombre: 'ni se pudo cargar', detalle: e.message });
    console.log('');
    console.log('  ' + archivo.toUpperCase());
    console.log('    ✗ no se pudo cargar: ' + e.message);
    continue;
  }
  console.log('');
  console.log('  ' + String(mod.nombre || archivo).toUpperCase());
  const t = nuevoTablero();
  try{
    mod.pruebas(t);
  }catch(e){
    t.fallos.push({ seccion: '(se cortó)', nombre: 'la prueba lanzó una excepción', detalle: e.message });
    console.log('    ✗ la prueba se cortó: ' + e.message);
  }
  pasadas += t.pasadas;
  for(const f of t.fallos) fallos.push({ ...f, archivo });
}

/* ── Resumen ───────────────────────────────────────────────────────────── */

const seg = ((Date.now() - t0) / 1000).toFixed(1);
console.log('');
console.log('  ' + '─'.repeat(56));
if(!fallos.length && !malSintaxis && !malCarcasa){
  console.log('  ✓ ' + pasadas + ' comprobaciones, todas bien · ' + seg + ' s');
  console.log('');
  process.exit(0);
}
console.log('  ✗ ' + fallos.length + ' de ' + (pasadas + fallos.length) + ' comprobaciones mal'
          + (malSintaxis ? (' · ' + malSintaxis + ' archivo(s) con la sintaxis rota') : '')
          + (malCarcasa ? (' · ' + malCarcasa + ' problema(s) de carcasa') : '')
          + ' · ' + seg + ' s');
for(const f of fallos)
  console.log('      · ' + (f.archivo || '') + ' › ' + f.seccion + ' › ' + f.nombre
            + (f.detalle ? ('  (' + f.detalle + ')') : ''));
console.log('');
process.exit(1);
