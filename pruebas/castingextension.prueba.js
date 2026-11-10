/* El Excel del casting, con la extensión de lo que es · especificacion 02, CAST-45
 *
 * Llegó de sala: «Excel no puede abrir el archivo "415_INDEPENDENCE DAY ·
 * CASTING.xlsm" porque el formato o la extensión no son válidos». El desglose
 * que se subió no tenía macros (un .xlsx) y la descarga salía SIEMPRE con
 * «.xlsm»: Excel ve un libro sin macros con nombre de libro con macros y no lo
 * abre. Lo que protege esta prueba: la extensión y el tipo salen de lo que el
 * archivo trae por dentro (.xlsm solo con macros), y la hoja CASTING se
 * encuentra también en libros guardados por otros programas (Target antes que
 * Id, ruta desde la raíz).
 */
'use strict';
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'El Excel del casting sale con la extensión de lo que es (.xlsx o .xlsm)';

const enc = (t) => new TextEncoder().encode(t);
const TIPOS = (main) => enc('<Types><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="' + main + '"/></Types>');
const SIN = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml', CON = 'application/vnd.ms-excel.sheet.macroEnabled.main+xml';

exports.pruebas = function(t){
  const M = montar([['function norm(s){', 'function esc(s){'], ['function castNorm(t){', '/** El número final, si lo hay'], ['const CAST_HOJA', '/** Catálogo de talentos de la hoja TALENTOS']],
    ['castFormatoSalida', 'castHojaXml'], { norm: undefined, window: {}, charIdx: {}, castVerificar: () => {}, fallo: () => {}, NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), console });

  t.seccion('1 · la extensión sale de lo que el archivo trae');
  t.eq('un desglose sin macros (.xlsx) sale como .xlsx', JSON.stringify(M.castFormatoSalida({ '[Content_Types].xml': TIPOS(SIN) })),
       '{"ext":"xlsx","mime":"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"}');
  t.eq('uno con macros (.xlsm) sale como .xlsm', JSON.stringify(M.castFormatoSalida({ '[Content_Types].xml': TIPOS(CON), 'xl/vbaProject.bin': new Uint8Array(2) })),
       '{"ext":"xlsm","mime":"application/vnd.ms-excel.sheet.macroEnabled.12"}');
  t.eq('basta con el tipo macroEnabled, o con el vbaProject', [M.castFormatoSalida({ '[Content_Types].xml': TIPOS(CON) }).ext, M.castFormatoSalida({ '[Content_Types].xml': TIPOS(SIN), 'xl/vbaProject.bin': new Uint8Array(2) }).ext].join(','), 'xlsm,xlsm');
  t.eq('una plantilla con macros (.xltm) en otra parte no cuenta: manda el libro', M.castFormatoSalida({ '[Content_Types].xml': enc('<Types><Override PartName="/xl/workbook.xml" ContentType="' + SIN + '"/><Override PartName="/x/otro.xml" ContentType="application/vnd.ms-excel.template.macroEnabled.main+xml"/></Types>') }).ext, 'xlsx');

  t.seccion('2 · la hoja CASTING, guarde quien guarde el libro');
  const libro = (rel) => ({ 'xl/workbook.xml': enc('<workbook><sheets><sheet name="DESGLOCE" sheetId="1" r:id="rId1"/><sheet name="CASTING" sheetId="2" r:id="rId2"/></sheets></workbook>'),
                            'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/>' + rel + '</Relationships>') });
  t.eq('como lo guarda Excel', M.castHojaXml(libro('<Relationship Id="rId2" Type="x" Target="worksheets/sheet2.xml"/>'), 'CASTING'), 'xl/worksheets/sheet2.xml');
  t.eq('con Target antes que Id y la ruta desde la raíz (otros programas)', M.castHojaXml(libro('<Relationship Type="x" Target="/xl/worksheets/sheet2.xml" Id="rId2"/>'), 'CASTING'), 'xl/worksheets/sheet2.xml');
  t.eq('rId2 no se confunde con rId20', M.castHojaXml(libro('<Relationship Id="rId20" Target="worksheets/sheet9.xml"/><Relationship Id="rId2" Target="worksheets/sheet2.xml"/>'), 'CASTING'), 'xl/worksheets/sheet2.xml');

  t.seccion('3 · la descarga');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  t.ok('el nombre y el tipo del archivo descargado salen del resultado, no van fijos en .xlsm',
       /const nombre = castNombreDescarga\(programa, capitulo, num, r\.completo, r\.ext, pelicula\);/.test(HTML) && /\{ type: r\.mime \|\| /.test(HTML) && !/' · CASTING\.xlsm'/.test(HTML)
       && /return \{ datos: fflate\.zipSync\(arch, \{ level: 6 \}\), ext: formato\.ext, mime: formato\.mime,/.test(HTML));
};
