/* Cuenta los `catch` que se comen el error sin decir nada.
 *
 * No es una prueba de comportamiento: es un TRINQUETE. El proyecto arrastra
 * cientos de estos, y arreglarlos todos de golpe seria mas peligroso que
 * dejarlos -hay que mirar uno por uno si ese fallo importa o es normal-. Lo
 * que si se puede garantizar es que el numero no SUBA: la deuda solo baja.
 *
 * Si al añadir codigo aparece un `catch(e){}` nuevo, esto se pone en rojo y
 * hay que decidir a conciencia: o se avisa con `fallo(...)`, o se documenta
 * dentro del catch por que ese fallo no interesa. Un comentario dentro ya
 * cuenta como decision tomada y no se cuenta aqui.
 *
 * El tope se sube SOLO si se ha pensado. Bajarlo es gratis y bienvenido.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const RAIZ = path.join(__dirname, '..');

/* Medido el 10 de septiembre de 2026, al cerrar la fase 3.
   Antes de la fase 3: 583 callados y 0 avisos.
   Al cerrarla:        486 callados y 97 avisos.
   Los 97 convertidos son los de nube y pintado; los 486 que quedan son, en su
   mayoria, almacenamiento local y limpiar memoria, donde un fallo es normal. */
const TOPE = 486;

/** Un catch con el cuerpo vacio de verdad: un comentario dentro no cuenta. */
const VACIO = /\}\s*catch\s*\(\s*\w*\s*\)\s*\{\s*\}/g;
const CON_AVISO = /\}\s*catch\s*\(\s*\w*\s*\)\s*\{\s*fallo\(/g;

function archivos(){
  const out = [path.join(RAIZ, 'index.html')];
  const js = path.join(RAIZ, 'js');
  if(fs.existsSync(js))
    for(const f of fs.readdirSync(js).sort())
      if(f.endsWith('.js')) out.push(path.join(js, f));
  return out;
}

function contar(){
  let callados = 0, avisados = 0;
  const porArchivo = [];
  for(const f of archivos()){
    const s = fs.readFileSync(f, 'utf8');
    const c = (s.match(VACIO) || []).length;
    const a = (s.match(CON_AVISO) || []).length;
    callados += c; avisados += a;
    porArchivo.push({ archivo: path.relative(RAIZ, f).replace(/\\/g, '/'), callados: c, avisados: a });
  }
  return { callados, avisados, porArchivo };
}

exports.nombre = 'Fallos callados (trinquete)';
exports.TOPE = TOPE;
exports.contar = contar;

exports.pruebas = function(t){
  const r = contar();
  t.seccion('1 · la deuda no sube');
  for(const a of r.porArchivo)
    console.log('    ' + a.archivo + ': ' + a.callados + ' callados · ' + a.avisados + ' avisan');
  t.ok('hay ' + r.callados + ' catch callados y el tope es ' + TOPE,
       r.callados <= TOPE,
       'han aparecido ' + (r.callados - TOPE) + ' catch vacios nuevos. O avisas con fallo(...), '
       + 'o explicas dentro del catch por que ese fallo no importa.');

  t.seccion('2 · los avisos siguen puestos');
  t.ok('al menos 90 sitios avisan con fallo() (hay ' + r.avisados + ')', r.avisados >= 90,
       'alguien ha quitado avisos: eran 97 al cerrar la fase 3');

  // Si la deuda ha bajado, se dice: el tope deberia bajar con ella.
  if(r.callados < TOPE - 10)
    console.log('    · la deuda ha bajado a ' + r.callados + ': baja el TOPE en pruebas/callados.js');
};
