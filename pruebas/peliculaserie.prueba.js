/* Serie o película al crear el programa · especificacion 09, PRO-61
 *
 * Pedido de sala: «quiero que cuando se cree un programa se defina si es una
 * serie o una película; si es una película se sube de una vez el libreto».
 *
 * Lo que protege esta prueba: que «Nuevo programa» no crea sin elegir el tipo,
 * que la película pide su libreto en la misma ventana (y no el número de
 * episodios), que después lo lee, enseña el desglose y lo guarda como su único
 * capítulo con el nombre de la película, y que el tipo queda guardado con el
 * programa (junto a la casa) y sobrevive al saneado de lo que viene de la nube.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Serie o película al crear el programa; la película sube su libreto de una vez';

const RAIZ = path.dirname(INDEX);

exports.pruebas = async function(t){
  const html = fs.readFileSync(INDEX, 'utf8');
  const ini = html.indexOf('async function newShow(){');
  const fn = html.slice(ini, html.indexOf('\nasync function ', ini + 10) > 0 ? html.indexOf('\nasync function ', ini + 10) : ini + 20000);

  t.seccion('1 · la ventana de «Nuevo programa»');
  t.ok('se elige Serie o Película, sin ninguna marcada de antemano',
       /<input type="radio" name="npTipo" value="serie"> Serie/.test(fn) && /<input type="radio" name="npTipo" value="pelicula"> Película/.test(fn) && !/<input type="radio" name="npTipo"[^>]*checked/.test(fn));
  t.ok('sin elegir, no se crea', /if\(!tipo\)\{ \$q\('npErr'\)\.textContent='Elige si es una serie o una película'; return; \}/.test(fn));
  t.ok('la película trae su libreto en la misma ventana (PDF, Word o Excel)', /id="npPeliW" style="display:none"/.test(fn) && /<input type="file" id="npFile" accept="application\/pdf,\.pdf,\.docx,\.xlsx,\.xlsm,\.xls">/.test(fn));
  t.ok('y sin libreto no se crea', /if\(tipo==='pelicula' && !archivoPeli\)\{ \$q\('npErr'\)\.textContent='Sube el libreto de la película/.test(fn));
  t.ok('al elegir película: aparece el libreto, se esconde el n.º de episodios y cambia el botón',
       /\$q\('npPeliW'\)\.style\.display = peli \? '' : 'none'/.test(fn) && /\$q\('npEpsW'\)\.style\.display = peli \? 'none' : ''/.test(fn) && /'Crear película y subir libreto'/.test(fn));
  t.ok('una película tiene un capítulo', /const epsN = tipo==='pelicula' \? 1 :/.test(fn));
  t.ok('las validaciones van antes de crear nada en la nube', fn.indexOf("'Elige si es una serie o una película'") < fn.indexOf("sb.from('shows').insert") && fn.indexOf("'Sube el libreto de la película") < fn.indexOf("sb.from('shows').insert"));

  t.seccion('2 · la película, de una vez');
  const tras = fn.slice(fn.indexOf('LDB.showId=show.id'));
  t.ok('después de crearla (ya dentro de su programa) se lee el libreto, se revisa el desglose y se guarda con su nombre',
       /if\(archivoPeli\)\{/.test(tras) && /await loadFileForEp\(archivoPeli\);/.test(tras)
       && /showDesgloseReview\(name, async \(\)=>\{ window\._epNameOverride = name; await saveEpHere\(\);/.test(tras));
  t.ok('si el libreto no se puede leer, se dice: la película ya existe y se sube con «Nuevo episodio»', /fallo\('loadFileForEp · index\.html:newShow', e, 'la película se creó, pero su libreto no se pudo leer/.test(tras));
  t.ok('el aviso dice película o programa', /tipo==='pelicula' \? 'Película «'\+name\+'» creada' : 'Programa «'\+name\+'» creado'/.test(fn));
  t.ok('el tipo se guarda con la casa', /tciAsignarCasa\(show\.id, casa, tipo\)/.test(fn));

  t.seccion('3 · guardado con el programa');
  const nube = {};
  const ctx = vm.createContext({
    console, Blob, setTimeout, Date, JSON, Promise, window: {}, document: { getElementById: () => null },
    sb: { storage: { from: () => ({
      download: async (r) => (r in nube ? { data: { text: async () => nube[r] } } : { data: null, error: { message: 'no existe' } }),
      upload: async (r, b) => { nube[r] = await b.text(); return { error: null }; } }) } },
    idbGet: async () => null, idbSet: async () => {}, sbShows: () => [{ id: 'p1' }, { id: 's1' }], currentEp: null,
    sync: { marks: {} }, studio: { on: false }, studioTick(){}, stMsg(){}, libMsg(){}, fallo(){}, esc: String,
    stFmtTC: String, studioTc0: () => 0, studioSetTc0(){}, studioParseTC: () => null
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'tcinicial.js'), 'utf8') + ';this.A = { tciSan, tciAsignarCasa };', ctx);
  const A = ctx.A;
  await A.tciAsignarCasa('p1', 'Netflix', 'pelicula');
  await A.tciAsignarCasa('s1', 'Discovery', 'serie');
  t.eq('película y serie quedan guardadas en el programa', JSON.parse(nube['p1/video-tc.json']).tipo + ' ' + JSON.parse(nube['s1/video-tc.json']).tipo, 'pelicula serie');
  t.eq('lo que viene de la nube se sanea: un tipo raro se descarta', [A.tciSan({ tipo: 'pelicula' }).tipo, A.tciSan({ tipo: 'documental' }).tipo, A.tciSan({}).tipo].map(String).join(','), 'pelicula,undefined,undefined');
  await A.tciAsignarCasa('p1', 'Netflix');
  t.eq('cambiar la casa después, sin decir el tipo, no lo borra', JSON.parse(nube['p1/video-tc.json']).tipo, 'pelicula');
};
