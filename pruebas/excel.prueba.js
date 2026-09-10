/* El Excel de la empresa · especificacion 03
 *
 * Esta es la prueba mas valiosa del proyecto, porque es donde mas caro sale un
 * fallo: el desglose de un capitulo real trae 41.000 formulas repartidas en
 * diez hojas que se alimentan entre ellas, y un error aqui no da ningun
 * mensaje. Entrega un archivo que parece bueno y que en la hoja de presupuesto
 * sale a cero.
 *
 * Se prueban las funciones que trabajan sobre el XML, que son puras: entra una
 * cadena, sale una cadena. No hace falta ZIP, ni Excel, ni navegador. El
 * empaquetado del .xlsm sigue sin prueba automatica -eso necesita la libreria
 * de ZIP- pero el empaquetado nunca fue el problema: el problema estuvo siempre
 * en el XML.
 *
 * XLS-9 es la razon de ser de este archivo. Una expresion codiciosa en vez de
 * perezosa borraba las formulas de la columna de al lado SIN LANZAR NINGUN
 * ERROR. Se descubrio contando formulas antes y despues, a mano. Ahora lo
 * cuenta una maquina en cada empujon.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Excel: escribir sin romper';

/* Una hoja con la forma EXACTA que rompio: una celda de cierre corto
   -<c r="D13" s="99"/>- seguida de otra con formula. Ahi es donde la
   expresion codiciosa se llevaba por delante la celda siguiente. */
function hoja(){
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>'
    + '<row r="7" spans="1:6">'
    +   '<c r="A7" s="5" t="inlineStr"><is><t>FECHA</t></is></c>'
    +   '<c r="B7" s="6"/>'
    +   '<c r="C7" s="5" t="inlineStr"><is><t>DIRECTOR</t></is></c>'
    +   '<c r="D7" s="6"/>'
    + '</row>'
    + '<row r="8" spans="1:6">'
    +   '<c r="A8" s="5" t="inlineStr"><is><t>GENERO</t></is></c>'
    +   '<c r="B8" s="6"/>'
    +   '<c r="C8" s="5" t="inlineStr"><is><t>TECNICO</t></is></c>'
    +   '<c r="D8" s="6"/>'
    + '</row>'
    + '<row r="9" spans="1:6">'
    +   '<c r="A9" s="5" t="inlineStr"><is><t>TITULO</t></is></c>'
    +   '<c r="B9" s="7"><f>IF(DESGLOCE!H9="","",DESGLOCE!H9)</f><v>EMPRESS 101</v></c>'
    + '</row>'
    + '<row r="10" spans="1:6">'
    +   '<c r="A10" s="5" t="inlineStr"><is><t>TIEMPO</t></is></c>'
    +   '<c r="B10" s="8"/>'
    +   '<c r="C10" s="5" t="inlineStr"><is><t>ESTUDIO</t></is></c>'
    +   '<c r="D10" s="8"/>'
    + '</row>'
    + '<row r="13" spans="1:6">'
    +   '<c r="A13" s="10" t="inlineStr"><is><t>NILA</t></is></c>'
    +   '<c r="D13" s="99"/>'
    +   '<c r="E13" s="12"><f>SUM(F13:H13)</f><v>7</v></c>'
    +   '<c r="F13" s="12"><f>COUNTIF(D:D,A13)</f><v>2</v></c>'
    + '</row>'
    + '<row r="14" spans="1:6">'
    +   '<c r="A14" s="10" t="inlineStr"><is><t>BABU</t></is></c>'
    +   '<c r="D14" s="99" t="s"><v>903</v></c>'
    +   '<c r="E14" s="12"><f>SUM(F14:H14)</f><v>3</v></c>'
    + '</row>'
    + '<row r="15" spans="1:6">'
    +   '<c r="A15" s="10" t="inlineStr"><is><t>TIA</t></is></c>'
    +   '<c r="E15" s="12"><f>SUM(F15:H15)</f><v>0</v></c>'
    + '</row>'
    + '</sheetData></worksheet>';
}

const formulas = (xml) => (xml.match(/<f>/g) || []).length;
const celdas = (xml) => (xml.match(/<c r="/g) || []).length;

exports.pruebas = function(t){
  const X = montar(
    [['function castEsc(t){', '/** Marca el libro para que Excel RECALCULE'],
     ['function castForzarRecalculo(arch){', '/**\n * Rellena el desglose'],
     ['const CAST_META_CELDAS', '/* ── El formulario']],
    ['castEsc', 'castHojaXml', 'castReCelda', 'castLeerColumna', 'castEscribirColumna',
     'castForzarRecalculo', 'castEscribirCelda', 'castEscribirMeta', 'CAST_META_CELDAS'],
    { TextDecoder: global.TextDecoder, TextEncoder: global.TextEncoder }
  );

  /* ── XLS-9 · la razon de ser de este archivo ────────────────────────── */
  t.seccion('1 · XLS-9 · escribir una columna NO puede tocar las de al lado');
  const antes = hoja();
  t.eq('la hoja de partida trae 5 formulas', formulas(antes), 5);
  const r = X.castEscribirColumna(antes, 'D', { 13: 'ANA MARIA', 14: 'LUIS PEREZ' });
  t.eq('se han escrito los dos actores', r.puestos, 2);
  t.eq('NO se ha perdido ni una formula', formulas(r.xml), 5);
  t.eq('ni una celda', celdas(r.xml), celdas(antes));
  t.ok('la formula de E13, la vecina de la celda de cierre corto, sigue entera',
       r.xml.indexOf('<c r="E13" s="12"><f>SUM(F13:H13)</f><v>7</v></c>') >= 0,
       'esta es la que borraba la expresion codiciosa');
  t.ok('y la de F13 tambien', r.xml.indexOf('<f>COUNTIF(D:D,A13)</f>') >= 0);
  t.ok('el actor esta en D13', r.xml.indexOf('>ANA MARIA<') >= 0);
  t.ok('y en D14, que era una celda con contenido', r.xml.indexOf('>LUIS PEREZ<') >= 0);

  /* ── XLS-3 y XLS-4 ──────────────────────────────────────────────────── */
  t.seccion('2 · XLS-3 · el estilo de la celda se conserva');
  t.ok('D13 mantiene su s="99"', /<c r="D13" s="99"[ >]/.test(r.xml),
       'sin el estilo, el actor sale con otra fuente y otro borde');
  t.ok('D14 tambien', /<c r="D14" s="99"[ >]/.test(r.xml));

  t.seccion('3 · XLS-4 · el texto va como inlineStr');
  t.ok('se usa inlineStr', r.xml.indexOf('t="inlineStr"><is><t xml:space="preserve">ANA MARIA') >= 0,
       'asi no hay que tocar la tabla de cadenas compartidas, que es global al libro');
  t.ok('D14 deja de ser t="s"', !/<c r="D14"[^>]*t="s"/.test(r.xml),
       'si se queda como t="s" el numero 903 se leeria como indice de la tabla de cadenas');

  t.seccion('4 · una celda vacia se queda vacia, pero con su estilo');
  const rv = X.castEscribirColumna(hoja(), 'D', { 13: '' });
  t.eq('se cuenta como escrita', rv.puestos, 1);
  t.ok('queda cerrada y con estilo', rv.xml.indexOf('<c r="D13" s="99"/>') >= 0);
  t.eq('sin perder formulas', formulas(rv.xml), 5);

  t.seccion('5 · una fila sin esa columna no se inventa');
  const r15 = X.castEscribirColumna(hoja(), 'D', { 15: 'ROSA' });
  t.eq('la fila 15 no tiene D, asi que no se escribe nada', r15.puestos, 0);
  t.eq('y no se toca nada', formulas(r15.xml), 5);

  /* ── Leer ───────────────────────────────────────────────────────────── */
  t.seccion('6 · leer una columna toma el valor guardado, tambien de una formula');
  const leidoB = X.castLeerColumna(hoja(), 'B');
  t.eq('B9 es una formula y se lee su valor cacheado', leidoB[9], 'EMPRESS 101');
  const leidoE = X.castLeerColumna(hoja(), 'E');
  t.eq('E13', leidoE[13], '7');
  t.eq('E14', leidoE[14], '3');

  /* ── XLS-5, XLS-6 y XLS-N2 ──────────────────────────────────────────── */
  t.seccion('7 · XLS-5 · los numeros se escriben como numeros');
  const rn = X.castEscribirCelda(hoja(), 'B7', '25', true);
  t.ok('sale como <v>25</v>, no como texto', rn.xml.indexOf('<c r="B7" s="6"><v>25</v></c>') >= 0,
       'como texto, las formulas que lo usan dejan de sumar');
  const rt = X.castEscribirCelda(hoja(), 'B7', '03 DE SEPTIEMBRE', false);
  t.ok('y un texto, como inlineStr', rt.xml.indexOf('t="inlineStr"><is><t xml:space="preserve">03 DE SEPTIEMBRE') >= 0);
  t.ok('conservando el estilo', /<c r="B7" s="6"/.test(rt.xml));

  t.seccion('8 · XLS-6 · una celda que no existe se inserta en orden de columna');
  const rc = X.castEscribirCelda(hoja(), 'B13', 'X', false);
  t.ok('se ha insertado', rc.puesto);
  const fila13 = rc.xml.match(/<row r="13"[^>]*>([\s\S]*?)<\/row>/)[1];
  const orden = [...fila13.matchAll(/<c r="([A-Z]+)13"/g)].map(m => m[1]);
  t.eq('la fila queda en orden A, B, D, E, F', orden.join(''), 'ABDEF',
       'Excel exige que las celdas de una fila vayan en orden de columna');
  t.eq('sin perder formulas', formulas(rc.xml), 5);

  t.seccion('9 · XLS-N2 · B9 no se toca nunca: es el titulo del capitulo');
  const refs = Object.keys(X.CAST_META_CELDAS).map(k => X.CAST_META_CELDAS[k].ref);
  t.eq('B9 no esta entre las celdas de la cabecera', refs.indexOf('B9'), -1);
  t.eq('las seis celdas son las esperadas', refs.sort().join(','), 'B10,B7,B8,D10,D7,D8');
  const rm = X.castEscribirMeta(hoja(), { fecha: '03 DE SEPTIEMBRE', genero: 'DRAMA',
                                          tiempo: '25', director: 'JOEL', tecnico: 'ANA',
                                          estudio: '3' });
  t.eq('se escriben las que caben en esta hoja de prueba', rm.puestas, 6);
  t.ok('B9 sigue siendo una formula',
       rm.xml.indexOf('<c r="B9" s="7"><f>IF(DESGLOCE!H9="","",DESGLOCE!H9)</f>') >= 0,
       'escribir encima la borraria y el titulo dejaria de actualizarse solo');
  t.eq('y no se ha perdido ninguna formula', formulas(rm.xml), 5);
  t.ok('el tiempo va como numero, no como texto',
       /<c r="B10" s="8"><v>25<\/v><\/c>/.test(rm.xml),
       'como texto, las formulas que lo usan dejan de sumar');
  t.ok('y el estudio tambien', /<c r="D10" s="8"><v>3<\/v><\/c>/.test(rm.xml));
  t.ok('el genero va como texto', rm.xml.indexOf('t="inlineStr"><is><t xml:space="preserve">DRAMA') >= 0);
  t.eq('un valor vacio no se escribe',
       X.castEscribirMeta(hoja(), { fecha: '', genero: '   ' }).puestas, 0);

  /* Un limite real del codigo, que conviene tener escrito: se puede insertar
     una CELDA que falta en una fila que existe, pero no crear una FILA que no
     existe. Si un desglose no trajera la fila 10, el numero de estudio no se
     escribiria. No es un fallo silencioso -castEscribirMeta devuelve cuantas
     ha puesto, y la aplicacion lo dice- pero hay que saberlo. */
  t.seccion('9b · una fila que no existe no se inventa, y se nota en la cuenta');
  const sinFila10 = hoja().replace(/<row r="10"[\s\S]*?<\/row>/, '');
  const r10 = X.castEscribirMeta(sinFila10, { tiempo: '25', estudio: '3', fecha: 'HOY' });
  t.eq('solo se escribe la que cabe', r10.puestas, 1);
  t.ok('y la fecha si esta', r10.xml.indexOf('>HOY<') >= 0);

  /* ── XLS-7 ──────────────────────────────────────────────────────────── */
  t.seccion('10 · XLS-7 · el libro se marca para recalcular al abrirlo');
  const enc = (s) => new TextEncoder().encode(s);
  const dec = (b) => new TextDecoder().decode(b);

  const conCalcPr = { 'xl/workbook.xml': enc('<workbook><calcPr calcId="191029"/></workbook>') };
  t.ok('con <calcPr> existente, devuelve true', X.castForzarRecalculo(conCalcPr));
  t.ok('le pone fullCalcOnLoad', dec(conCalcPr['xl/workbook.xml']).indexOf('fullCalcOnLoad="1"') >= 0,
       'sin esto el actor entra en CASTING y no llega a PLANILLA ni a PRESUPUESTO');
  t.ok('y conserva el calcId', dec(conCalcPr['xl/workbook.xml']).indexOf('calcId="191029"') >= 0);

  const sinCalcPr = { 'xl/workbook.xml': enc('<workbook><sheets/></workbook>') };
  t.ok('sin <calcPr>, tambien', X.castForzarRecalculo(sinCalcPr));
  t.ok('lo anade antes de cerrar', dec(sinCalcPr['xl/workbook.xml'])
        .indexOf('<calcPr fullCalcOnLoad="1"/></workbook>') >= 0);

  const yaPuesto = { 'xl/workbook.xml': enc('<workbook><calcPr fullCalcOnLoad="0" calcId="1"/></workbook>') };
  X.castForzarRecalculo(yaPuesto);
  const xy = dec(yaPuesto['xl/workbook.xml']);
  t.eq('si ya estaba a 0, queda a 1 y una sola vez', (xy.match(/fullCalcOnLoad/g) || []).length, 1);
  t.ok('y a 1', xy.indexOf('fullCalcOnLoad="1"') >= 0);

  t.eq('sin workbook.xml, devuelve false', X.castForzarRecalculo({}), false);

  /* ── La hoja, por su nombre ─────────────────────────────────────────── */
  t.seccion('11 · del nombre de la hoja a su archivo dentro del ZIP');
  const arch = {
    'xl/workbook.xml': enc('<workbook><sheets>'
      + '<sheet name="DESGLOCE" sheetId="1" r:id="rId1"/>'
      + '<sheet name="CASTING" sheetId="2" r:id="rId4"/>'
      + '</sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': enc('<Relationships>'
      + '<Relationship Id="rId1" Target="worksheets/sheet1.xml"/>'
      + '<Relationship Id="rId4" Target="worksheets/sheet7.xml"/>'
      + '</Relationships>')
  };
  t.eq('CASTING esta en sheet7', X.castHojaXml(arch, 'CASTING'), 'xl/worksheets/sheet7.xml');
  t.eq('DESGLOCE en sheet1', X.castHojaXml(arch, 'DESGLOCE'), 'xl/worksheets/sheet1.xml');
  let err = '';
  try{ X.castHojaXml(arch, 'NO EXISTE'); }catch(e){ err = e.message; }
  t.ok('si la hoja no existe, se dice con su nombre', err.indexOf('NO EXISTE') >= 0,
       'dio: ' + err);
  err = '';
  try{ X.castHojaXml({}, 'CASTING'); }catch(e){ err = e.message; }
  t.ok('y si no parece un Excel, tambien se dice', err.length > 0, 'dio: ' + err);

  /* ── Escapado ───────────────────────────────────────────────────────── */
  t.seccion('12 · un nombre con & o < no rompe el XML');
  const re = X.castEscribirColumna(hoja(), 'D', { 13: 'TOM & JERRY <VO>' });
  t.ok('se escapa', re.xml.indexOf('TOM &amp; JERRY &lt;VO&gt;') >= 0);
  t.eq('sin perder formulas', formulas(re.xml), 5);
};
