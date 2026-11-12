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
  t.eq('la cabecera (FECHA, LOCUTOR) no cuenta como personaje', JSON.stringify(M.castFaltanActor({ 7: '0', 9: 'FECHA:', 11: 'LOCUTOR', 17: 'MARLON' }, { 7: 'WILFREDO HUESO', 11: 'NOMBRE DEL ACTOR', 17: 'JUAN D PEREZ' })), '{"total":1,"faltan":[],"noHablan":[]}');
  t.eq('filas vacías del final no cuentan', JSON.stringify(M.castFaltanActor({ 11: 'LOCUTOR', 17: 'MARLON', 33: '', 34: ' ' }, { 11: 'NOMBRE DEL ACTOR', 17: 'X' })), '{"total":1,"faltan":[],"noHablan":[]}');
  arch = libro({});
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN' }), null);
  t.eq('sin personajes leídos no es COMPLETO', r.completo, false);

  t.seccion('2b · los que no hablan en el capítulo no lo dejan INCOMPLETO (CAST-53)');
  /* «Ya terminé todo este programa (CHOR NIKAL KE BHAAGA 2) y al descargar aparece INCOMPLETO»: el desglose trae filas de
     personajes que en este capítulo no dicen nada; Dubbipt no los carga y su fila se quedaba sin actor para siempre. */
  arch = libro({ 17: 'MARLON', 20: 'RON WOO', 21: 'SHAWN', 22: 'ABUELA (VO)', 27: 'GRUPO MIXTO' }, { 27: 'TODOS' });
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN D PEREZ', SHAWN: 'SERGIO GARZON' }), null, null, ['MARLON', 'SHAWN']);
  t.eq('todos los que hablan tienen actor: COMPLETO, aunque RON WOO y ABUELA (VO) se queden sin actor', JSON.stringify([r.completo, r.faltanActor, r.noHablan]), '[true,[],["RON WOO","ABUELA (VO)"]]');
  arch = libro({ 17: 'MARLON', 20: 'RON WOO', 21: 'SHAWN' }, {});
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN D PEREZ' }), null, null, ['MARLON', 'SHAWN']);
  t.eq('si falta uno que SÍ habla: INCOMPLETO, y se dice cuál', JSON.stringify([r.completo, r.faltanActor, r.noHablan]), '[false,["SHAWN"],["RON WOO"]]');
  arch = libro({ 17: 'MARLON', 21: 'SHAWN (VO)' }, {});
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN D PEREZ' }), null, null, ['MARLON', 'SHAWN']);
  t.eq('el mismo personaje con sufijo (VO, ARCHIVO…) sí habla: cuenta', JSON.stringify([r.completo, r.faltanActor]), '[false,["SHAWN (VO)"]]');
  arch = libro({ 17: 'MARLON', 20: 'RON WOO' }, {});
  r = M.castRellenar(null, asignDe({ MARLON: 'JUAN D PEREZ' }), null, null, []);
  t.eq('sin la lista del capítulo, cuentan todas, como antes', JSON.stringify([r.completo, r.faltanActor]), '[false,["RON WOO"]]');
  t.eq('un personaje que no habla pero ya trae actor escrito, cuenta como lleno', JSON.stringify(M.castFaltanActor({ 11: 'LOCUTOR', 17: 'MARLON', 18: 'TELE' }, { 11: 'NOMBRE DEL ACTOR', 17: 'JUAN', 18: 'ORIGINAL' }, ['MARLON'])), '{"total":2,"faltan":[],"noHablan":[]}');

  t.seccion('2c · los sin diálogo: fallo del desglose (X) o real (con su talento) (CAST-54)');
  {
    const S = montar([['function castNorm(t){', '/** El número final, si lo hay'], ['/** Las respuestas → lo que se escribe', '/**\n * El diálogo: cada personaje']], ['castSinDialogoAsign'],
      { castClave: M.castClave });
    const extra = S.castSinDialogoAsign([{ nombre: 'PANG (DIAMOND EXPERT)', fallo: true }, { nombre: 'Guardia 2', fallo: false, talento: '  Ana  Ochoa ' }, { nombre: 'NADIE', fallo: false, talento: '' }]);
    t.eq('fallo → X; real → su talento; sin contestar, nada', JSON.stringify(extra), JSON.stringify({ [M.castClave('PANG (DIAMOND EXPERT)')]: 'X', [M.castClave('Guardia 2')]: 'Ana Ochoa' }));
    arch = libro({ 17: 'MARLON', 20: 'PANG (DIAMOND EXPERT)', 21: 'SHAWN' }, {});
    const asign = Object.assign(asignDe({ MARLON: 'JUAN D PEREZ', SHAWN: 'SERGIO GARZON' }), extra);
    r = M.castRellenar(null, asign, null, null, ['MARLON', 'SHAWN']);
    t.eq('con la respuesta, la fila de PANG lleva X: COMPLETO y ya no queda nadie «sin diálogo»', JSON.stringify([r.completo, r.faltanActor, r.noHablan]), '[true,[],[]]');
    const R = montar([['function castRegFusionar(local, nube){', '/**\n * Apunta en el registro']], ['castRegFusionar'], {});
    t.eq('lo contestado se recuerda en el registro del programa; al juntar equipos, lo más reciente', JSON.stringify(R.castRegFusionar({ personajes: {}, sinDialogo: { PANG: { talent: 'X', ts: 9 } } }, { personajes: {}, sinDialogo: { PANG: { talent: 'ANA', ts: 2 }, LOU: { talent: 'X', ts: 1 } } }).sinDialogo),
         '{"PANG":{"talent":"X","ts":9},"LOU":{"talent":"X","ts":1}}');
  }

  t.seccion('3 · en la descarga');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  t.ok('el nombre sale del programa, el capítulo y si es película; el aviso dice COMPLETO o INCOMPLETO y el nombre',
       /const nombre = castNombreDescarga\(programa, capitulo, num, r\.completo, r\.ext, pelicula\);/.test(HTML) && /sbShows\(\)\.find\(x => String\(x\.id\) === String\(showId\)\)/.test(HTML)
       && /' · COMPLETO: todos los personajes tienen actor'/.test(HTML) && /' · INCOMPLETO: ' \+ r\.faltanActor\.length/.test(HTML) && /msg \+= ' · ' \+ nombre;/.test(HTML) && !/' · CASTING\.'/.test(HTML)
       && /const delCapitulo = Object\.keys\(charIdx\)\.map\(k => \(charIdx\[k\] && charIdx\[k\]\.display\) \|\| k\);/.test(HTML) && /del Excel sin actor de personajes que no hablan en este capítulo \(no cuentan\)/.test(HTML)
       && /if\(r\.noHablan && r\.noHablan\.length\)\{[\s\S]{0,400}const resp = await castPreguntarSinDialogo\(r\.noHablan, previos\);[\s\S]{0,200}Object\.assign\(asign, extra\);\s+r = castRellenar\(buf, asign, meta, training, delCapitulo\);/.test(HTML));
};
