/* El título del programa, siempre en MAYÚSCULAS · especificacion 09, PRO-63
 *
 * Pedido de sala: «que el título del programa siempre esté en mayúsculas».
 * Lo que protege esta prueba: el nombre se escribe en mayúsculas al crearlo,
 * al renombrarlo (en la biblioteca y en Casting), al fusionar e importar; los
 * que ya estaban en la nube escritos de otra forma se ven en mayúsculas; y el
 * Excel del casting se llama con el título en mayúsculas.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'El título del programa, siempre en mayúsculas';

exports.pruebas = function(t){
  const M = montar([['function progMayus(s){', 'function sbShows(){']], ['progMayus', 'progMayusShows'], {});
  t.seccion('1 · mayúsculas, con tildes y eñes');
  t.eq('cualquier forma de escribirlo', ['The Wayans Bros', '  la vida   en seúl ', 'Año 2026: niños', 'FINAL TABLE'].map(M.progMayus).join(' | '), 'THE WAYANS BROS | LA VIDA EN SEÚL | AÑO 2026: NIÑOS | FINAL TABLE');
  const lista = [{ id: 1, name: 'The Wayans Bros', cover_path: 'x' }, { id: 2, name: 'FINAL TABLE' }, { id: 3 }];
  const r = M.progMayusShows(lista);
  t.eq('los que vienen de la nube se ven en mayúsculas, con lo demás igual', JSON.stringify(r), '[{"id":1,"name":"THE WAYANS BROS","cover_path":"x"},{"id":2,"name":"FINAL TABLE"},{"id":3}]');
  t.eq('sin tocar la lista original (la copia del equipo)', lista[0].name + ' · ' + (r[1] === lista[1]), 'The Wayans Bros · true');

  t.seccion('2 · en toda la aplicación');
  const HTML = fs.readFileSync(INDEX, 'utf8'), CV = fs.readFileSync(path.join(path.dirname(INDEX), 'js', 'castingvistas.js'), 'utf8');
  t.ok('al leer de la nube y de la copia del equipo', /if\(!sh\.error\) LDB\.shows = progMayusShows\(sh\.data\);/.test(HTML) && (HTML.match(/LDB\.shows = progMayusShows\(c\.shows\)/g) || []).length === 2);
  t.ok('al crear: se escribe y se guarda en mayúsculas', /const name=progMayus\(\$q\('npName'\)\.value\|\|''\);/.test(HTML) && /<input id="npName" placeholder="Ej\. LA VIDA EN SEÚL" style="text-transform:uppercase">/.test(HTML));
  t.ok('al renombrar en la biblioteca', /nn = nn0 == null \? null : progMayus\(nn0\);/.test(HTML) && /update\(\{ name: nn \}\)/.test(HTML));
  t.ok('en Casting: renombrar, fusionar, importar y los programas que solo están en Casting', /if\(typeof progMayus === 'function'\) nombre = progMayus\(nombre\);/.test(CV)
       && /update\(\{ name: \(typeof progMayus === 'function' \? progMayus\(a\.nombre\) : a\.nombre\) \}\)/.test(CV)
       && /insert\(\{ name: \(typeof progMayus === 'function' \? progMayus\(x\.nombre\) : x\.nombre\), workspace_id/.test(CV)
       && /nombre: show \? show\.name : \(typeof progMayus === 'function' \? progMayus\(serie\.name\) : serie\.name\),/.test(CV));
  t.ok('el Excel del casting, con el título en mayúsculas', /return 'DES_' \+ nombre\.toLocaleUpperCase\('es'\) \+ '_'/.test(HTML));
};
