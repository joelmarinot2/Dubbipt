/* CASTING 1, ordenado por talento cuando el casting está completo · especificacion 02, CAST-48
 *
 * Pedido de sala: «que en CASTING 1, solamente cuando esté completo todo el
 * casting, se reorganice por el talento (el locutor); si el talento tiene dos
 * personajes, primero el importante. No cambies las fórmulas, solo la
 * reorganización; el segmento de páginas e intervenciones también se cambia,
 * y el total. Que no afecte ninguna de las demás hojas».
 * Lo que protege esta prueba: el orden (locutor, y del mismo locutor el de más
 * intervenciones; TODOS al final), que cada personaje se mueve con todas sus
 * filas, que las fórmulas que leen de otras hojas quedan IGUALES, que lo que
 * suma su propio bloque sigue sumando su bloque, que las demás hojas siguen
 * dando lo mismo, y que lo que no se puede mover sin cambiar resultados no se
 * mueve (y se dice).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'CASTING 1 se ordena por talento cuando el casting está completo';

const RAIZ = path.dirname(INDEX);
const enc = (t) => new TextEncoder().encode(t), dec = (b) => new TextDecoder().decode(b);

function cargar(){
  const ctx = vm.createContext({ TextDecoder, TextEncoder, console });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'castorden.js'), 'utf8') + ';this.O = corOrdenarCasting1; this.D = corDesplazar;', ctx);
  return ctx;
}
const f = (ref, formula, v, t) => '<c r="' + ref + '" s="2"' + (t ? ' t="' + t + '"' : '') + '><f>' + formula + '</f><v>' + v + '</v></c>';
const s = (ref, i) => '<c r="' + ref + '" t="s"><v>' + i + '</v></c>';
/* CASTING 1: MARLON (3 filas), RON WOO, POPS y GRUPO MIXTO; con TOTAL, SUMA de su bloque y un total al pie. */
const PERS = [['MARLON', 17, 3, 190], ['RON WOO', 20, 1, 6], ['HOMBRE EN TV 2', 21, 1, 2], ['GRUPO MIXTO', 22, 1, 1], ['POPS', 23, 2, 44]];
function libro(o){
  o = o || {};
  let filas = '<row r="15">' + s('A15', 0) + s('B15', 1) + s('C15', 2) + '</row><row r="16">' + s('E16', 3) + '</row>';
  for(const [n, r0, alto, tot] of PERS) for(let k = 0; k < alto; k++){
    const r = r0 + k;
    filas += '<row r="' + r + '" ht="15"' + '>'
      + f('A' + r, 'IF(DESGLOCE!A' + r + '="","",DESGLOCE!A' + r + ')', k ? '' : n, 'str')
      + f('C' + r, 'IF(A' + r + '="","",VLOOKUP(A' + r + ',CASTING!$A$12:$D$40,4,0))', '', 'str')
      + f('D' + r, 'DESGLOCE!D' + r, r)
      + (k ? '' : f('E' + r, 'DESGLOCE!J' + r, tot) + f('F' + r, 'SUM(D' + r + ':D' + (r + alto - 1) + ')', 0))
      + '</row>';
  }
  filas += '<row r="40">' + f('B40', 'SUM(E17:E24)', 243) + '</row>';
  const merges = o.merge || '<mergeCells count="1"><mergeCell ref="B17:B19"/></mergeCells>';
  return {
    '[Content_Types].xml': enc('<Types><Override PartName="/xl/calcChain.xml" ContentType="x.calcChain"/></Types>'),
    'xl/workbook.xml': enc('<workbook><sheets><sheet name="DESGLOCE" sheetId="1" r:id="rId1"/><sheet name="CASTING 1" sheetId="3" r:id="rId3"/><sheet name="PLANILLA" sheetId="4" r:id="rId4"/></sheets>'
      + '<definedNames><definedName name="_xlnm.Print_Area" localSheetId="1">\'CASTING 1\'!$A$1:$K$41</definedName></definedNames></workbook>'),
    'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId1" Target="worksheets/sheet1.xml"/><Relationship Id="rId3" Target="worksheets/sheet3.xml"/><Relationship Id="rId4" Target="worksheets/sheet4.xml"/><Relationship Id="rId9" Type="x/calcChain" Target="calcChain.xml"/></Relationships>'),
    'xl/calcChain.xml': enc('<calcChain/>'),
    'xl/sharedStrings.xml': enc('<sst><si><t>PERSONAJE</t></si><si><t>TIME</t></si><si><t>LOCUTOR</t></si><si><t>TOTAL</t></si></sst>'),
    'xl/worksheets/sheet1.xml': enc('<worksheet><sheetData><row r="17"><c r="A17" t="inlineStr"><is><t>MARLON</t></is></c></row></sheetData></worksheet>'),
    'xl/worksheets/sheet3.xml': enc('<worksheet><dimension ref="A15:K40"/><sheetData>' + filas + '</sheetData>' + merges + '</worksheet>'),
    'xl/worksheets/sheet4.xml': enc('<worksheet><sheetData><row r="5">' + f('A5', o.planilla || "'CASTING 1'!A17", 'MARLON', 'str') + f('B5', "SUM('CASTING 1'!E17:E30)", 243) + f('C5', "'CASTING 1'!F23", 0) + '</row></sheetData></worksheet>')
  };
}
const ACT = { 'MARLON': 'JUAN D PEREZ', 'RON WOO': 'JOHN GREY', 'HOMBRE EN TV 2': 'ALEXANDER RIVERA', 'GRUPO MIXTO': 'TODOS', 'POPS': 'ALEXANDER RIVERA' };
const filaDe = (xml, n) => { const m = xml.match(new RegExp('<row r="(\\d+)"[^>]*><c r="A\\d+"[^>]*><f>[^<]*</f><v>' + n + '</v>')); return m ? +m[1] : null; };
const celda = (xml, ref) => (xml.match(new RegExp('<c r="' + ref + '"[^>]*?(?:/>|>[\\s\\S]*?</c>)')) || [''])[0];

exports.pruebas = function(t){
  const C = cargar();

  t.seccion('1 · el orden');
  const a = libro(), r = C.O(a, { actorDe: (p) => ACT[p] });
  const h = dec(a['xl/worksheets/sheet3.xml']);
  t.eq('por locutor; del mismo locutor, primero el de más intervenciones; TODOS al final', JSON.stringify(r.orden),
       '["POPS (ALEXANDER RIVERA)","HOMBRE EN TV 2 (ALEXANDER RIVERA)","RON WOO (JOHN GREY)","MARLON (JUAN D PEREZ)","GRUPO MIXTO (TODOS)"]');
  t.eq('cada personaje en su sitio nuevo', ['POPS', 'HOMBRE EN TV 2', 'RON WOO', 'MARLON', 'GRUPO MIXTO'].map(n => filaDe(h, n)).join(','), '17,19,20,21,24');
  {
    /* Un personaje sin actor en CASTING 1 sale como «0» o «#N/A» (lo deja la fórmula): va al final, no al principio (CAST-54). */
    const raros = Object.assign({}, ACT); raros[Object.keys(raros)[0]] = '0';
    const r0 = C.O(libro(), { actorDe: (p) => raros[p] });
    t.eq('un locutor «0» (fórmula sin actor) va al final, con TODOS', JSON.stringify(r0.orden.slice(-2).map(x => String(x).split(' (')[0]).sort()), JSON.stringify(['GRUPO MIXTO', 'MARLON']), JSON.stringify(r0.orden));
  }

  t.seccion('2 · se mueve con sus páginas, intervenciones y total; las fórmulas, iguales');
  t.ok('las fórmulas que leen del DESGLOCE no cambian: el dato va con su fila', celda(h, 'A17').indexOf('<f>IF(DESGLOCE!A23="","",DESGLOCE!A23)</f><v>POPS</v>') >= 0
       && celda(h, 'D18').indexOf('<f>DESGLOCE!D24</f>') >= 0 && celda(h, 'E17').indexOf('<f>DESGLOCE!J23</f><v>44</v>') >= 0);
  t.ok('las filas de debajo (páginas e intervenciones) van con su personaje', celda(h, 'D22').indexOf('<f>DESGLOCE!D18</f>') >= 0 && celda(h, 'D23').indexOf('<f>DESGLOCE!D19</f>') >= 0);
  t.ok('lo que suma su propio bloque sigue sumando su bloque', celda(h, 'F21').indexOf('<f>SUM(D21:D23)</f>') >= 0 && celda(h, 'F17').indexOf('<f>SUM(D17:D18)</f>') >= 0);
  t.ok('lo que mira su propia fila, también', celda(h, 'C21').indexOf('<f>IF(A21="","",VLOOKUP(A21,CASTING!$A$12:$D$40,4,0))</f><v>JUAN D PEREZ</v>') >= 0);
  t.ok('el total al pie, que coge toda la tabla, igual', celda(h, 'B40').indexOf('<f>SUM(E17:E24)</f>') >= 0);
  t.ok('las combinadas dentro de un bloque se mueven con él; la fila conserva su alto', /<mergeCell ref="B21:B23"\/>/.test(h) && /<row r="21" ht="15">/.test(h));

  t.seccion('3 · las demás hojas dan lo mismo');
  const p = dec(a['xl/worksheets/sheet4.xml']);
  t.ok('PLANILLA sigue mirando a MARLON y al total de POPS, donde estén ahora', celda(p, 'A5').indexOf("<f>'CASTING 1'!A21</f>") >= 0 && celda(p, 'C5').indexOf("<f>'CASTING 1'!F17</f>") >= 0);
  t.ok('un rango que coge toda la tabla no cambia', celda(p, 'B5').indexOf("<f>SUM('CASTING 1'!E17:E30)</f>") >= 0);
  t.ok('el DESGLOCE, intacto; el área de impresión, igual', dec(a['xl/worksheets/sheet1.xml']) === dec(libro()['xl/worksheets/sheet1.xml']) && /\$A\$1:\$K\$41<\/definedName>/.test(dec(a['xl/workbook.xml'])));
  t.ok('la cadena de cálculo vieja se quita (Excel la rehace)', !a['xl/calcChain.xml'] && !/calcChain/.test(dec(a['[Content_Types].xml'])) && !/calcChain/.test(dec(a['xl/_rels/workbook.xml.rels'])));

  t.seccion('4 · lo que no se puede mover sin cambiar resultados, no se mueve');
  {
    const b = libro({ planilla: "SUM('CASTING 1'!E17:E21)" }), antes = dec(b['xl/worksheets/sheet3.xml']);
    const x = C.O(b, { actorDe: (p) => ACT[p] });
    t.eq('un rango que coge media tabla: no se ordena, y se dice', x.hecho + ' · ' + x.motivo, "false · una fórmula coge solo una parte de la tabla de CASTING 1 (CASTING 1!E17:E21)");
    t.ok('…y CASTING 1 queda como estaba', dec(b['xl/worksheets/sheet3.xml']) === antes && !!b['xl/calcChain.xml']);
  }
  {
    /* CHOR NIKAL KE BHAAGA 2 (CAST-55): un filtro viejo en una columna de CASTING 1 y un área de impresión que no llega al
       final de la tabla. Son nombres de Excel para la hoja (_xlnm.), no calculan nada: no deben impedir ordenar. */
    const b = libro();
    b['xl/workbook.xml'] = enc(dec(b['xl/workbook.xml']).replace('</definedNames>',
      '<definedName name="_xlnm._FilterDatabase" localSheetId="1" hidden="1">\'CASTING 1\'!$AW$17:$AW$21</definedName>'
      + '<definedName name="_xlnm.Print_Titles" localSheetId="1">\'CASTING 1\'!$15:$16</definedName></definedNames>')
      .replace("\'CASTING 1\'!$A$1:$K$41", "\'CASTING 1\'!$A$1:$K$21"));
    const x = C.O(b, { actorDe: (p) => ACT[p] });
    const w = dec(b['xl/workbook.xml']);
    t.eq('un filtro viejo y un área de impresión que coge media tabla no impiden ordenar', x.hecho + ' · ' + (x.motivo || ''), 'true · ');
    t.ok('…y se quedan como estaban', /\$AW\$17:\$AW\$21<\/definedName>/.test(w) && /\$A\$1:\$K\$21<\/definedName>/.test(w) && /!\$15:\$16<\/definedName>/.test(w));
    const c = libro();
    c['xl/workbook.xml'] = enc(dec(c['xl/workbook.xml']).replace('</definedNames>', '<definedName name="TotalesParte">\'CASTING 1\'!$E$17:$E$21</definedName></definedNames>'));
    t.eq('un nombre que sí calcula (de quien hizo la plantilla) y coge media tabla, sí lo impide', C.O(c, { actorDe: (p) => ACT[p] }).hecho, false);
  }
  {
    const b = libro({ merge: '<mergeCells count="1"><mergeCell ref="B19:B20"/></mergeCells>' });
    const x = C.O(b, { actorDe: (p) => ACT[p] });
    t.eq('una combinación entre dos personajes: no se ordena', x.hecho + ' · ' + x.motivo, 'false · las celdas combinadas B19:B20 cruzan dos personajes');
  }
  {
    const b = libro(); C.O(b, { actorDe: (p) => ACT[p] });
    const y = C.O(b, { actorDe: (p) => ACT[p] });
    t.eq('si ya está en orden, no se toca', JSON.stringify([y.hecho, y.igual]), '[true,true]');
  }

  t.seccion('5 · las fórmulas arrastradas');
  t.eq('se escriben enteras como Excel las desplaza', [C.D('DESGLOCE!A17&B$2&$C3', 2, 0), C.D('SUM(D17:D19)', 3, 1), C.D('"A17"&A17', 1, 0)].join(' | '), 'DESGLOCE!A19&B$2&$C5 | SUM(E20:E22) | "A17"&A18');
  {
    const b = libro();
    b['xl/worksheets/sheet3.xml'] = enc(dec(b['xl/worksheets/sheet3.xml'])
      .replace('<c r="D17" s="2"><f>DESGLOCE!D17</f>', '<c r="D17" s="2"><f t="shared" ref="D17:D19" si="0">DESGLOCE!D17</f>')
      .replace('<c r="D18" s="2"><f>DESGLOCE!D18</f>', '<c r="D18" s="2"><f t="shared" si="0"/>').replace('<c r="D19" s="2"><f>DESGLOCE!D19</f>', '<c r="D19" s="2"><f t="shared" si="0"/>'));
    C.O(b, { actorDe: (p) => ACT[p] });
    const hb = dec(b['xl/worksheets/sheet3.xml']);
    t.ok('una compartida se reparte en fórmulas normales, cada una con lo suyo', !/t="shared"/.test(hb) && celda(hb, 'D21').indexOf('<f>DESGLOCE!D17</f>') >= 0 && celda(hb, 'D23').indexOf('<f>DESGLOCE!D19</f>') >= 0);
  }

  t.seccion('6 · en la descarga');
  const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('solo cuando el casting está COMPLETO, y con el actor recién escrito', /if\(completo && typeof corOrdenarCasting1 === 'function'\)\{/.test(HTML) && /corOrdenarCasting1\(arch, \{ actorDe: \(p\) => actorDe\[castClave\(p\)\] \|\| null \}\)/.test(HTML));
  t.ok('el aviso dice si se ordenó, o por qué no', /' · CASTING 1 ordenado por talento \(' \+ r\.orden1\.bloques/.test(HTML) && /' · ⚠️ CASTING 1 no se ordenó: ' \+ r\.orden1\.motivo/.test(HTML));
  t.ok('el módulo se carga y queda para usar sin conexión', /<script src="\.\/js\/castorden\.js"><\/script>/.test(HTML) && /'\.\/js\/castorden\.js'/.test(SW));
};
