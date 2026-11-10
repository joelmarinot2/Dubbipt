/* El TIME de CASTING 1, como timecode · especificacion 02, CAST-46
 *
 * Llegó de sala con THE WAYANS BROS 415: en la hoja CASTING 1 la columna TIME
 * salía «0,0416782407…» en vez de «01:00:01». CASTING 1 lee los tiempos del
 * desglose con fórmulas: el valor es una hora de Excel (la fracción del día)
 * y su celda no tenía formato de hora. Lo que protege esta prueba: que al
 * descargar, la columna TIME / TIME CODE de las hojas CASTING recibe formato
 * hh:mm:ss sin perder su letra, bordes ni relleno; que no se toca lo que ya
 * es una hora, ni los valores, ni otras columnas u hojas; y que se reutiliza el
 * formato hh:mm:ss si el libro ya lo tiene.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El TIME de CASTING 1 sale como timecode (hh:mm:ss)';

const enc = (t) => new TextEncoder().encode(t), dec = (b) => new TextDecoder().decode(b);

const ESTILOS = (fmts) => '<styleSheet xmlns="x">' + (fmts || '') + '<fonts count="1"><font/></fonts><fills count="2"><fill/><fill/></fills>'
  + '<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>'
  + '<xf numFmtId="0" fontId="0" fillId="1" borderId="1" applyFill="1" applyBorder="1"/>'
  + '<xf numFmtId="21" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>';
const libro = (fmts) => ({
  'xl/workbook.xml': enc('<workbook><sheets><sheet name="DESGLOCE" sheetId="1" r:id="rId1"/><sheet name="CASTING 1" sheetId="2" r:id="rId2"/><sheet name="PLANILLA" sheetId="3" r:id="rId3"/></sheets></workbook>'),
  'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/></Relationships>'),
  'xl/styles.xml': enc(ESTILOS(fmts)),
  'xl/sharedStrings.xml': enc('<sst><si><t>PERSONAJE</t></si><si><t>TIME</t></si><si><t>LOCUTOR</t></si></sst>'),
  'xl/worksheets/sheet1.xml': enc('<worksheet><sheetData><row r="15"><c r="B15" t="s"><v>1</v></c></row><row r="17"><c r="B17" s="0"><v>0.0416782407407407</v></c></row></sheetData></worksheet>'),
  'xl/worksheets/sheet2.xml': enc('<worksheet><sheetData>'
    + '<row r="9"><c r="B9" s="1"><v>30</v></c></row>'
    + '<row r="15"><c r="A15" s="1" t="s"><v>0</v></c><c r="B15" s="1" t="s"><v>1</v></c><c r="C15" s="1" t="s"><v>2</v></c></row>'
    + '<row r="17"><c r="A17" s="1" t="str"><f>DESGLOCE!A17</f><v>MARLON</v></c><c r="B17" s="1"><f>DESGLOCE!B17</f><v>0.0416782407407407</v></c><c r="C17" s="1"><v>0.5</v></c></row>'
    + '<row r="18"><c r="B18" s="1" t="str"><f>IF(DESGLOCE!B18="","",DESGLOCE!B18)</f><v></v></c></row>'
    + '<row r="19"><c r="B19" s="2"><f>DESGLOCE!B19</f><v>0.0419907407</v></c></row>'
    + '<row r="20"><c r="B20" s="1"><f>SUM(X1:X9)</f><v>190</v></c></row>'
    + '<row r="21"><c r="B21" s="1"><v>0.0525</v></c></row>'
    + '</sheetData></worksheet>'),
  'xl/worksheets/sheet3.xml': enc('<worksheet><sheetData><row r="15"><c r="B15" t="s"><v>1</v></c></row><row r="17"><c r="B17" s="0"><v>0.25</v></c></row></sheetData></worksheet>')
});
const estilo = (xml, ref) => ((xml.match(new RegExp('<c r="' + ref + '"[^>]*?\\bs="(\\d+)"')) || [])[1]);

exports.pruebas = function(t){
  const M = montar([['function norm(s){', 'function esc(s){'], ['function castNorm(t){', '/** El número final, si lo hay'], ['const CAST_HOJA', '/** Catálogo de talentos de la hoja TALENTOS']],
    ['castFormatoTiempos', 'castEsFormatoHora'], { norm: undefined, window: {}, charIdx: {}, castVerificar: () => {}, fallo: () => {}, NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), console });

  t.seccion('1 · el caso de sala');
  const arch = libro('<numFmts count="1"><numFmt numFmtId="164" formatCode="General"/></numFmts>');
  const r = M.castFormatoTiempos(arch);
  const h = dec(arch['xl/worksheets/sheet2.xml']), st = dec(arch['xl/styles.xml']);
  t.eq('en CASTING 1 se arreglan los tiempos de la columna TIME (los números de hora y las fórmulas)', JSON.stringify(r), '{"CASTING 1":3}');
  t.eq('con una copia de su estilo: el mismo relleno y borde, y formato hh:mm:ss', [estilo(h, 'B17'), estilo(h, 'B18'), estilo(h, 'B21')].join(',') + ' · '
       + (st.match(/<xf\b[^>]*\/>/g) || [])[4], '4,4,4 · <xf numFmtId="165" fontId="0" fillId="1" borderId="1" applyFill="1" applyBorder="1" applyNumberFormat="1"/>');
  t.ok('el formato nuevo, en numFmts y en la cuenta de estilos', /<numFmts count="2"><numFmt numFmtId="165" formatCode="hh:mm:ss"\/><numFmt numFmtId="164" formatCode="General"\/>/.test(st) && /<cellXfs count="5">/.test(st));
  t.ok('los valores y las fórmulas no se tocan', /<c r="B17" s="4"><f>DESGLOCE!B17<\/f><v>0.0416782407407407<\/v><\/c>/.test(h) && /<c r="B21" s="4"><v>0.0525<\/v><\/c>/.test(h));
  t.eq('lo que ya es una hora, un total (190) y lo de otras columnas, igual', [estilo(h, 'B19'), estilo(h, 'B20'), estilo(h, 'C17'), estilo(h, 'B15'), estilo(h, 'B9')].join(','), '2,1,1,1,1');
  t.eq('ni el DESGLOCE ni la PLANILLA', dec(arch['xl/worksheets/sheet1.xml']) + dec(arch['xl/worksheets/sheet3.xml']), dec(libro()['xl/worksheets/sheet1.xml']) + dec(libro()['xl/worksheets/sheet3.xml']));

  t.seccion('2 · sin repetir ni romper');
  {
    const a = libro('<numFmts count="1"><numFmt numFmtId="170" formatCode="hh:mm:ss"/></numFmts>');
    M.castFormatoTiempos(a);
    const s2 = dec(a['xl/styles.xml']);
    t.ok('si el libro ya tiene hh:mm:ss, se usa ese', /<numFmts count="1"><numFmt numFmtId="170" formatCode="hh:mm:ss"\/><\/numFmts>/.test(s2) && /numFmtId="170" fontId="0" fillId="1"/.test(s2));
  }
  {
    const a = libro();
    M.castFormatoTiempos(a);
    t.ok('un libro sin numFmts los recibe al principio', /^<styleSheet xmlns="x"><numFmts count="1"><numFmt numFmtId="164" formatCode="hh:mm:ss"\/><\/numFmts><fonts/.test(dec(a['xl/styles.xml'])));
    const otra = M.castFormatoTiempos(a);
    t.eq('una segunda vez no cambia nada', JSON.stringify(otra), '{}');
  }
  {
    const a = libro(); a['xl/styles.xml'] = enc('<styleSheet><cellXfs count="9"><xf/></cellXfs></styleSheet>');
    t.eq('si los estilos no cuadran, no se tocan', JSON.stringify(M.castFormatoTiempos(a)) + ' ' + dec(a['xl/styles.xml']).length, '{} 59');
  }
  t.seccion('3 · los tiempos que vienen del DESGLOCE como texto (B17 hacia abajo)');
  {
    const a = libro();
    a['xl/worksheets/sheet2.xml'] = enc('<worksheet><sheetData>'
      + '<row r="17"><c r="B17" s="1" t="str"><f>DESGLOCE!B17&amp;""</f><v>0,0416782407</v></c></row>'
      + '<row r="18"><c r="B18" s="1" t="str"><f t="shared" ref="B18:B20" si="0">IF(DESGLOCE!B18="","",DESGLOCE!B18&amp;"")</f><v>0,0419907407</v></c></row>'
      + '<row r="19"><c r="B19" s="1" t="str"><f t="shared" si="0"/><v>0,0525</v></c></row>'
      + '<row r="20"><c r="B20" s="1" t="str"><f t="shared" si="0"/><v></v></c></row>'
      + '<row r="21"><c r="B21" s="1" t="inlineStr"><is><t>0.0436921296</t></is></c></row>'
      + '<row r="22"><c r="B22" s="1" t="str"><f>DESGLOCE!C22</f><v>MARLON</v></c></row>'
      + '<row r="23"><c r="B23" s="1"><v>0.0525</v></c></row>'
      + '</sheetData></worksheet>');
    const r = M.castFormatoTiempos(a), h = dec(a['xl/worksheets/sheet2.xml']);
    t.eq('sin cabecera TIME, en CASTING 1 se toma la B desde la fila 17', JSON.stringify(r), '{"CASTING 1":6}');
    t.ok('la fórmula que da texto («0,0416782407») se envuelve para que dé «01:00:01»',
         h.indexOf('<c r="B17" s="1" t="str"><f>IFERROR(TEXT(VALUE(DESGLOCE!B17&amp;""),"hh:mm:ss"),DESGLOCE!B17&amp;"")</f><v>01:00:01</v></c>') >= 0);
    t.ok('la arrastrada hacia abajo: se envuelve la principal y las demás la siguen', /<c r="B18" s="1" t="str"><f t="shared" ref="B18:B20" si="0">IFERROR\(TEXT\(VALUE\(IF\(DESGLOCE!B18/.test(h)
         && h.indexOf('<c r="B19" s="1" t="str"><f t="shared" si="0"/><v>01:15:36</v></c>') >= 0);
    t.ok('el texto escrito a mano pasa a número con formato de hora', /<c r="B21" s="4"><v>0.0436921296<\/v><\/c>/.test(h) && /<c r="B23" s="4"><v>0.0525<\/v><\/c>/.test(h));
    t.ok('un texto que no es una hora (MARLON) no se toca', h.indexOf('<c r="B22" s="1" t="str"><f>DESGLOCE!C22</f><v>MARLON</v></c>') >= 0);
  }
  {
    const a = libro();
    a['xl/worksheets/sheet2.xml'] = enc('<worksheet><sheetData><row r="17"><c r="B17" s="1" t="str"><f t="shared" ref="A17:C20" si="3">X17&amp;""</f><v>0,0416782407</v></c></row></sheetData></worksheet>');
    M.castFormatoTiempos(a);
    t.ok('una fórmula compartida que pasa por otras columnas no se envuelve (cambiaría las otras)', /<f t="shared" ref="A17:C20" si="3">X17&amp;""<\/f><v>0,0416782407<\/v>/.test(dec(a['xl/worksheets/sheet2.xml'])));
  }
  t.eq('qué es un formato de hora', [[21, {}], [0, {}], [164, { 164: 'General' }], [164, { 164: '[$-409]h:mm:ss AM/PM' }], [164, { 164: '[h]:mm' }], [164, { 164: 'dd/mm/yyyy' }], [164, { 164: '0.00 "s"' }], [164, { 164: 'Standard' }]]
       .map(x => M.castEsFormatoHora(x[0], x[1]) ? 1 : 0).join(''), '10011000');
};
