/* El nombre del Excel del casting: DES_<programa>_COMPLETO / _INCOMPLETO · especificacion 02, CAST-47
 *
 * Pedido de sala: «quiero que el nombre del archivo de descarga sea DES_"nombre
 * del programa"_COMPLETO o INCOMPLETO; se determina si está completo o
 * incompleto si se llenan todos los personajes». Lo que protege esta prueba:
 * el nombre (programa y número del capítulo, o el capítulo si ya lo lleva; la
 * película, su nombre), y que COMPLETO es que TODOS los personajes de la hoja
 * CASTING tienen actor después de escribir —también los que ya lo traían—,
 * sin contar la cabecera.
 */
'use strict';
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'El Excel del casting se llama DES_<programa>_COMPLETO o _INCOMPLETO';

const enc = (t) => new TextEncoder().encode(t);
/* La hoja CASTING: la cabecera (rótulos con texto compartido), NOMBRE DEL ACTOR y los personajes con su fórmula. */
function libro(filas, actores){
  const xml = '<worksheet><sheetData>'
    + '<row r="7"><c r="A7" t="s"><v>0</v></c><c r="D7" t="s"><v>1</v></c></row>'
    + '<row r="11"><c r="A11" t="s"><v>2</v></c><c r="D11" t="s"><v>3</v></c></row>'
    + Object.keys(filas).map(f => '<row r="' + f + '"><c r="A' + f + '" s="1" t="str"><f>IF(DESGLOCE!A1="","",DESGLOCE!A1)</f><v>' + filas[f] + '</v></c>'
      + (actores && actores[f] ? '<c r="D' + f + '" s="1" t="inlineStr"><is><t>' + actores[f] + '</t></is></c>' : '<c r="D' + f + '" s="1"/>') + '</row>').join('') + '</sheetData></worksheet>';
  return { 'xl/workbook.xml': enc('<workbook xmlns:r="x"><sheets><sheet name="CASTING" sheetId="1" r:id="rId1"/></sheets></workbook>'),
           'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/></Relationships>'),
           'xl/sharedStrings.xml': enc('<sst><si><t>FECHA:</t></si><si><t>WILFREDO HUESO</t></si><si><t>LOCUTOR</t></si><si><t>NOMBRE DEL ACTOR</t></si></sst>'),
           'xl/worksheets/sheet1.xml': enc(xml) };
}

exports.pruebas = function(t){
  let arch = null;
  const M = montar([['function norm(s){', 'function esc(s){'], ['function castNorm(t){', '/** El número final, si lo hay'], ['const CAST_HOJA', '/** Catálogo de talentos de la hoja TALENTOS'], ['function castEscribirCelda(', '/** Mete la cabecera del programa'], ['function castLeerColumnaTexto(', '/**']],
    ['castRellenar', 'castClave', 'castNombreDescarga', 'castFaltanActor'],
    { norm: undefined, window: {}, charIdx: {}, castVerificar: () => {}, fallo: () => {}, NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), console,
      fflate: { unzipSync: () => arch, zipSync: (a) => a } });
  const K = M.castClave, asignDe = (o) => { const a = {}; for(const n in o) a[K(n)] = o[n]; return a; };

  t.seccion('1 · el nombre');
  const N = (p, c, n, ok, ext, peli) => M.castNombreDescarga(p, c, n, ok, ext, peli);
  t.eq('programa y número del capítulo', N('THE WAYANS BROS', '415_INDEPENDENCE DAY', 415, true, 'xlsx'), 'DES_THE WAYANS BROS 415_COMPLETO.xlsx');
  t.eq('incompleto', N('THE WAYANS BROS', '415_INDEPENDENCE DAY', 415, false, 'xlsx'), 'DES_THE WAYANS BROS 415_INCOMPLETO.xlsx');
  t.eq('si el capítulo ya lleva el nombre del programa, el del capítulo', N('The Wayans Bros', 'THE WAYANS BROS 415', 415, true, 'xlsx'), 'DES_THE WAYANS BROS 415_COMPLETO.xlsx');
  t.eq('una película: su nombre', N('Independence Day', 'Independence Day', null, false, 'xlsx', true), 'DES_INDEPENDENCE DAY_INCOMPLETO.xlsx');
  t.eq('con macros sigue siendo .xlsm (CAST-45)', N('FINAL TABLE', 'Ep 103', 103, true, 'xlsm'), 'DES_FINAL TABLE 103_COMPLETO.xlsm');
  t.eq('sin número, el programa y el capítulo', N('LA VIDA', 'Especial navidad', null, true, 'xlsx'), 'DES_LA VIDA ESPECIAL NAVIDAD_COMPLETO.xlsx');
  t.eq('sin caracteres que Windows no deja', N('WHO: "THE" SHOW?', 'ep 2', 2, true, 'xlsx'), 'DES_WHO THE SHOW 2_COMPLETO.xlsx');

  t.seccion('2 · completo es que todos los personajes tienen actor');
  arch = libro({ 17: 'MARLON', 20: 'RON WOO', 21: 'SHAWN', 27: 'GRUPO MIXTO' }, { 27: 'TODOS' });
  let r = M.castRellenar(null, asignDe({ MARLON: 'JUAN D PEREZ', 'RON WOO': 'JOHN GREY', SHAWN: 'SERGIO GARZON' }), null);
  t.eq('todos con actor (GRUPO MIXTO ya traía TODOS): COMPLETO', JSON.stringify([r.completo, r.faltanActor]), '[true,[]]');
  arch = libro({ 17: 'MARLON', 20: 'RON WOO', 21: 'SHAWN', 27: 'GRUPO MIXTO' }, { 27: 'TODOS' });
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN D PEREZ' }), null);
  t.eq('falta alguno: INCOMPLETO, y se dice cuáles', JSON.stringify([r.completo, r.faltanActor]), '[false,["RON WOO","SHAWN"]]');
  t.eq('la cabecera (FECHA, LOCUTOR) no cuenta como personaje', JSON.stringify(M.castFaltanActor({ 7: '0', 9: 'FECHA:', 11: 'LOCUTOR', 17: 'MARLON' }, { 7: 'WILFREDO HUESO', 11: 'NOMBRE DEL ACTOR', 17: 'JUAN D PEREZ' })), '{"total":1,"faltan":[]}');
  t.eq('filas vacías del final no cuentan', JSON.stringify(M.castFaltanActor({ 11: 'LOCUTOR', 17: 'MARLON', 33: '', 34: ' ' }, { 11: 'NOMBRE DEL ACTOR', 17: 'X' })), '{"total":1,"faltan":[]}');
  arch = libro({});
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN' }), null);
  t.eq('sin personajes leídos no es COMPLETO', r.completo, false);

  t.seccion('3 · en la descarga');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  t.ok('el nombre sale del programa, el capítulo y si es película; el aviso dice COMPLETO o INCOMPLETO y el nombre',
       /const nombre = castNombreDescarga\(programa, capitulo, num, r\.completo, r\.ext, pelicula\);/.test(HTML) && /sbShows\(\)\.find\(x => String\(x\.id\) === String\(showId\)\)/.test(HTML)
       && /' · COMPLETO: todos los personajes tienen actor'/.test(HTML) && /' · INCOMPLETO: ' \+ r\.faltanActor\.length/.test(HTML) && /msg \+= ' · ' \+ nombre;/.test(HTML) && !/' · CASTING\.'/.test(HTML));
};
