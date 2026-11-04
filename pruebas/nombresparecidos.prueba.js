/* Exportar el casting cuando el nombre no es idéntico · especificacion 02, CAST-44
 *
 * Llegó de sala el diagnóstico de IN THE EYE OF THE STORM 309: el Excel salía
 * bien (54 de 55 filas con su actor) pero avisaba de 4 talentos «sin fila» y
 * abría el panel de avería:
 *   · HOMBRE BRAD y HOMBRE FONDO 1 solo están en el desglose en versión
 *     (ARCHIVO) -una con espacio y otra sin: «HOMBRE BRAD(ARCHIVO)»-, y esas
 *     filas ya llevaban el mismo actor: no faltaba nada;
 *   · MUJER AUTO y CAMERON MUJER AUTO, escritos distinto en el libreto y en el
 *     desglose, con una fila que se quedaba vacía.
 * Lo que protege esta prueba: que lo cubierto por su archivo no es avería, que
 * lo escrito distinto se casa solo cuando no hay duda (y se dice), que nunca
 * se pisa una fila con actor, y que el diagnóstico enseña TODAS las filas.
 */
'use strict';
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Exportar el casting con nombres que no son idénticos (IN THE EYE OF THE STORM 309)';

const enc = (t) => new TextEncoder().encode(t);

/* La hoja CASTING con los nombres tal cual salen en el diagnóstico de sala; las cuatro últimas, como podrían estar. */
const FILAS = { 13: 'GRÁFICA', 14: 'BRANDON OWEN (ARCHIVO)', 27: 'MUJER BRAD (ARCHIVO)', 28: 'HOMBRE BRAD (ARCHIVO)', 29: 'HOMBRE BRAD(ARCHIVO)',
                32: 'HOMBRE FONDO (ARCHIVO)', 33: 'HOMBRE FONDO 1 (ARCHIVO)', 35: 'HOMBRE FONDO 2 (ARCHIVO)', 36: 'HOMBRE FONDO 1(ARCHIVO)',
                40: 'MUJER DEL AUTO', 41: 'CAMERON  MUJER EN AUTO', 42: 'HOMBRE FONDO 3', 43: 'POLICIA 1' };
function libro(filas, actores){
  const xml = '<worksheet><sheetData>' + Object.keys(filas).map(f => '<row r="' + f + '"><c r="A' + f + '" s="1" t="str"><f>IF(DESGLOCE!A1="","",DESGLOCE!A1)</f><v>' + filas[f] + '</v></c>'
    + (actores && actores[f] ? '<c r="D' + f + '" s="1" t="inlineStr"><is><t>' + actores[f] + '</t></is></c>' : '<c r="D' + f + '" s="1"/>') + '</row>').join('') + '</sheetData></worksheet>';
  return { 'xl/workbook.xml': enc('<workbook xmlns:r="x"><sheets><sheet name="CASTING" sheetId="1" r:id="rId1"/></sheets></workbook>'),
           'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
           'xl/worksheets/sheet1.xml': enc(xml) };
}

exports.pruebas = function(t){
  let arch = null;
  const M = montar([['function norm(s){', 'function esc(s){'], ['function castNorm(t){', '/** El número final, si lo hay'], ['const CAST_HOJA', '/** Catálogo de talentos de la hoja TALENTOS'], ['function castEscribirCelda(', '/** Mete la cabecera del programa'], ['function castLeerColumnaTexto(', '/**']],
    ['castRellenar', 'castClave', 'castParecidas', 'castCasarPorParecido', 'castCubiertosPorGemelo', 'castPersonaClave', 'castLeerColumna'],
    { norm: undefined, window: {}, charIdx: {}, castVerificar: () => {}, fallo: () => {}, NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), console,
      fflate: { unzipSync: () => arch, zipSync: (a) => a } });
  const K = M.castClave, asignDe = (o) => { const a = {}; for(const n in o) a[K(n)] = o[n]; return a; };
  const leer = (r) => { const x = new TextDecoder().decode(r.datos['xl/worksheets/sheet1.xml']); const out = {}; for(const m of x.matchAll(/<c r="D(\d+)"[^>]*><is><t[^>]*>([^<]*)<\/t>/g)) out[m[1]] = m[2]; return out; };

  t.seccion('1 · el caso de sala');
  /* Los 9 talentos de la aplicación que tocan estas filas, como estaban repartidos. */
  const ASIGN = asignDe({ 'GRÁFICA': 'ANDRES PALACIO', 'BRANDON OWEN (ARCHIVO)': 'ANDRES MOLINARES', 'MUJER BRAD (ARCHIVO)': 'MARIA CORONADO',
    'HOMBRE BRAD (ARCHIVO)': 'KRISTIAN LIZCANO', 'HOMBRE BRAD': 'KRISTIAN LIZCANO', 'HOMBRE FONDO (ARCHIVO)': 'ERIK VILLAMIL', 'HOMBRE FONDO 1 (ARCHIVO)': 'DOUGLAS VARELA',
    'HOMBRE FONDO 2 (ARCHIVO)': 'JUAN PABLO CASILIMAS', 'HOMBRE FONDO 1': 'DOUGLAS VARELA', 'MUJER AUTO': 'SALOME YALTA', 'CAMERON MUJER AUTO': 'LAURA ROBAYO' });
  arch = libro(FILAS);
  const r = M.castRellenar(null, ASIGN, null);
  const d = leer(r);
  t.eq('ya no hay talentos «sin fila»: el panel de avería no se abre por esto', JSON.stringify(r.sinCasar), '[]');
  t.eq('HOMBRE BRAD y HOMBRE FONDO 1: ya en su fila de archivo con el mismo actor, se dice aparte', r.cubiertos.map(x => x.k + ' → ' + x.fila).join(' | '),
       'HOMBRE BRAD → HOMBRE BRAD (ARCHIVO) | HOMBRE FONDO 1 → HOMBRE FONDO 1 (ARCHIVO)');
  t.eq('las filas de archivo, con espacio y sin él, llevan su actor', [28, 29, 33, 36].map(f => d[f]).join(','), 'KRISTIAN LIZCANO,KRISTIAN LIZCANO,DOUGLAS VARELA,DOUGLAS VARELA');
  t.eq('MUJER AUTO y CAMERON MUJER AUTO: a sus filas escritas distinto, primero las que tienen las mismas palabras', r.porParecido.map(x => x.k + ' → ' + x.nombreFila).join(' | '),
       'MUJER AUTO → MUJER DEL AUTO | CAMERON MUJER AUTO → CAMERON  MUJER EN AUTO');
  t.eq('y quedan escritas', d[40] + ' · ' + d[41], 'SALOME YALTA · LAURA ROBAYO');
  t.eq('las que no tienen a nadie siguen vacías y se dicen', JSON.stringify(r.enBlanco), '["HOMBRE FONDO 3","POLICIA 1"]');

  t.seccion('2 · casar por parecido solo sin dudas');
  t.eq('mismas palabras salvo las vacías, en cualquier orden', ['MUJER AUTO|MUJER DEL AUTO', 'AUTO MUJER|MUJER EN EL AUTO', 'CAMERON MUJER AUTO|MUJER AUTO CAMERON'].map(x => M.castParecidas(...x.split('|').map(K))).join(','), 'true,true,true');
  t.eq('números distintos, no', ['HOMBRE FONDO 1|HOMBRE FONDO 2', 'POLICIA 1|POLICIA'].map(x => M.castParecidas(...x.split('|').map(K), false)).join(','), 'false,false');
  t.eq('uno con ARCHIVO y el otro sin, no (eso es otra cara del personaje)', M.castParecidas(K('HOMBRE BRAD'), K('HOMBRE BRAD (ARCHIVO)'), false), false);
  t.eq('una sola palabra no basta', M.castParecidas(K('ANA'), K('ANA MARIA'), false), false);
  t.eq('contenido solo si no se exige igual', M.castParecidas(K('MUJER AUTO'), K('CAMERON MUJER AUTO')) + ' ' + M.castParecidas(K('MUJER AUTO'), K('CAMERON MUJER AUTO'), false), 'false true');
  arch = libro({ 10: 'MUJER DEL AUTO', 11: 'MUJER EN EL AUTO' });
  const amb = M.castRellenar(null, asignDe({ 'MUJER AUTO': 'SALOME YALTA' }), null);
  t.eq('con dos filas posibles, no se elige: sigue «sin fila»', JSON.stringify([amb.porParecido.length, amb.sinCasar]), '[0,["MUJER AUTO"]]');
  arch = libro({ 10: 'MUJER DEL AUTO' }, { 10: 'OTRA PERSONA' });
  const llena = M.castRellenar(null, asignDe({ 'MUJER AUTO': 'SALOME YALTA' }), null);
  t.eq('nunca se pisa una fila que en el Excel ya trae un actor escrito', JSON.stringify([llena.porParecido.length, llena.sinCasar]), '[0,["MUJER AUTO"]]');
  arch = libro({ 28: 'HOMBRE BRAD (ARCHIVO)' });
  const otro = M.castRellenar(null, asignDe({ 'HOMBRE BRAD (ARCHIVO)': 'KRISTIAN LIZCANO', 'HOMBRE BRAD': 'OTRO ACTOR' }), null);
  t.eq('con OTRO actor en su archivo, sí falta su fila: sigue el aviso', JSON.stringify([otro.cubiertos.length, otro.sinCasar]), '[0,["HOMBRE BRAD"]]');

  t.seccion('3 · se dice, y el diagnóstico enseña todo');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  t.ok('el aviso de la descarga dice lo escrito por parecido (para revisarlo) y lo que ya estaba en su archivo', /escrito' \+ \(r\.porParecido\.length === 1 \? '' : 's'\) \+ ' por nombre parecido, revísalo: '/.test(HTML) && /sin fila propia pero ya en su fila de archivo\/VO con el mismo actor/.test(HTML));
  t.ok('el diagnóstico: lo escrito por parecido, lo cubierto, las filas sin actor con su nombre, y todas las filas (antes, 25)',
       /escritosPorNombreParecido: /.test(HTML) && /yaEnSuFilaDeArchivoOVO: /.test(HTML) && /filasSinActorNombres: vacias\.map/.test(HTML) && /comoHaQuedado: filas\.slice\(0, 150\)/.test(HTML));
};
