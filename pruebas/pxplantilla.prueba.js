/* Otra plantilla de Pixelogic, por programa · especificacion 09, PRO-62
 *
 * Pedido de sala: «que en la sección de Dubcards, en el apartado de Pixelogic,
 * pueda subir otra plantilla dependiendo el programa». Lo que protege esta
 * prueba: que la plantilla se rellena buscando los rótulos (no celdas fijas),
 * también con otro orden de columnas, textos compartidos y celdas combinadas;
 * que no se toca el formato ni lo que no es del episodio, y un dato vacío no
 * borra lo que la plantilla trae; que el reparto toma el formato y las
 * fórmulas de su primera fila y borra las filas de ejemplo; que una plantilla
 * sin tabla de reparto no se acepta; y que cada programa usa la suya (y los
 * demás, la de siempre).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Pixelogic: otra plantilla por programa';

const RAIZ = path.dirname(INDEX);
const enc = (t) => new TextEncoder().encode(t), dec = (b) => new TextDecoder().decode(b);

function cargar(){
  const V = { avisos: [], zips: [], ls: {}, unzip: null };
  const ctx = vm.createContext({
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController, btoa, atob,
    fflate: { strToU8: enc, zipSync: (f) => { V.zips.push(f); return new Uint8Array(4); }, unzipSync: (b) => V.unzip(b) },
    localStorage: { getItem: (k) => (k in V.ls ? V.ls[k] : null), setItem: (k, v) => { V.ls[k] = String(v); } },
    castAviso: (t) => V.avisos.push(t), csRepintar(){}, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    csDatos: () => ({ datos: { series: [] } }), sbShows: () => [],
    URL: { createObjectURL: () => 'blob:x', revokeObjectURL(){} },
    document: { createElement: () => ({ click(){}, remove(){}, setAttribute(){} }), body: { appendChild(){} }, getElementById: () => null },
    location: { origin: 'https://dubbipt.app' }
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'dctools.js'), 'utf8') + ';this.DCT = DCT;', ctx);
  V.D = ctx.DCT;
  return V;
}

/* Un episodio ya procesado. */
const EP = () => ({ temporada: '1', episodio: '3', titulo: 'Episode 3', tituloTrad: 'Episodio 3', titleId: '', director: 'Angelo Salazar', tecnico: 'Juan Benavides',
  filas: [{ actor: 'Claudia Cote', personaje: 'Du-Yeong', trad: 'Du-Yeong', mc: true, menor: false, opciones: ['Du-Yeong'] },
          { actor: 'Eliana Baquero', personaje: 'Young Song-Yi', trad: 'Song-Yi joven', mc: false, menor: true, opciones: ['Young Song-Yi'] },
          { actor: 'Eleazar Osorio', personaje: '', trad: '', mc: false, menor: false, opciones: [] }] });

/* Una plantilla de otro cliente: un logo arriba, textos compartidos, otro orden de columnas, filas de ejemplo con fórmulas y un pie. */
const SS = ['LOGO XYZ', 'PROJECT TITLE (ENGLISH)', 'CLIENT', 'Netflix (de la plantilla)', 'SEASON NUMBER:', 'EPISODE NUMBER', 'Description', 'Translation', 'First Name to appear in Credits',
  'Last Name to appear in Credits', 'Legal Name', 'Show', 'Title', 'Translator', 'Dubbing Director', 'M.C.', 'Character Name', 'Adult or Minor', 'Ejemplo', 'Juan Perez', 'Ejemplo 2', 'Notas &amp; pie'];
const s = (ref, i, st) => '<c r="' + ref + '" s="' + (st || 1) + '" t="s"><v>' + i + '</v></c>';
const OTRA = () => ({
  '[Content_Types].xml': enc('<Types><Override PartName="/xl/calcChain.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.calcChain+xml"/></Types>'),
  'xl/workbook.xml': enc('<workbook xmlns:r="r"><sheets><sheet name="Notas" sheetId="1" r:id="rId9"/><sheet name="Contract Inventory" sheetId="2" r:id="rId2"/></sheets><calcPr calcId="1"/></workbook>'),
  'xl/_rels/workbook.xml.rels': enc('<Relationships><Relationship Id="rId9" Target="worksheets/sheet9.xml"/><Relationship Id="rId2" Target="/xl/worksheets/hoja2.xml"/><Relationship Id="rId7" Type="x/calcChain" Target="calcChain.xml"/></Relationships>'),
  'xl/calcChain.xml': enc('<calcChain/>'),
  'xl/sharedStrings.xml': enc('<sst>' + SS.map(t => '<si><t>' + t + '</t></si>').join('') + '</sst>'),
  'xl/worksheets/sheet9.xml': enc('<worksheet><sheetData/></worksheet>'),
  'xl/worksheets/hoja2.xml': enc('<worksheet><dimension ref="A1:G30"/><sheetData>'
    + '<row r="1" spans="1:7">' + s('A1', 0, 9) + '</row>'
    + '<row r="3">' + s('A3', 1) + '<c r="C3" s="2"/></row>'
    + '<row r="4">' + s('A4', 2) + s('C4', 3, 2) + '</row>'
    + '<row r="5">' + s('A5', 4) + '<c r="C5" s="2"/></row>'
    + '<row r="6">' + s('A6', 5) + '</row>'
    + '<row r="10">' + s('B10', 6) + s('C10', 7) + s('D10', 8) + s('E10', 9) + s('F10', 10) + '</row>'
    + '<row r="11">' + s('B11', 11) + '</row><row r="12">' + s('B12', 12) + '</row><row r="13">' + s('B13', 13) + '</row><row r="14">' + s('B14', 14) + '</row>'
    + '<row r="20">' + s('A20', 15, 5) + s('B20', 16, 5) + s('C20', 7, 5) + s('D20', 10, 5) + s('E20', 8, 5) + s('F20', 9, 5) + s('G20', 17, 5) + '</row>'
    + '<row r="21" ht="18" customHeight="1">' + s('B21', 18, 7) + '<c r="C21" s="7"/>' + s('D21', 19, 7)
    +   '<c r="E21" s="7" t="str"><f>LEFT(D21, FIND(&quot; &quot;, D21) - 1)</f><v>Juan</v></c><c r="F21" s="7" t="str"><f>MID(D21, FIND(&quot; &quot;, D21) + 1, LEN(D21))</f><v>Perez</v></c><c r="G21" s="8"/></row>'
    + '<row r="22">' + s('B22', 20, 7) + '</row>'
    + '<row r="23">' + s('B23', 20, 7) + '</row>'
    + '<row r="30">' + s('B30', 21) + '</row>'
    + '</sheetData><mergeCells count="2"><mergeCell ref="A3:B3"/><mergeCell ref="A5:B5"/></mergeCells><dataValidations><dataValidation sqref="G21:G40"/></dataValidations></worksheet>')
});
const celda = (xml, ref) => (xml.match(new RegExp('<c r="' + ref + '"[^>]*?(?:/>|>[\\s\\S]*?</c>)')) || [''])[0];
const texto = (xml, ref) => { const c = celda(xml, ref); const m = c.match(/<t[^>]*>([^<]*)<\/t>/) || c.match(/<v>([^<]*)<\/v>/); return m ? m[1] : ''; };

exports.pruebas = async function(t){
  const V = cargar(), D = V.D, cfg = D.pxCfgCargar();
  Object.assign(cfg, { serie: 'Final Table', totalEps: '12', cliente: '' });
  Object.assign(cfg.creditos, { traductor: 'Johannys Cisneros' });

  t.seccion('1 · la plantilla de siempre, subida como plantilla, sale igual');
  {
    const ep = EP(), f = D.pxArchivosXlsx(ep, Object.assign({}, cfg, { cliente: 'Amazon Prime Video' })), arch = {};
    for(const k in f) arch[k] = enc(f[k]);
    /* La de siempre, vacía, con una fila de ejemplo en el reparto. */
    const vacia = D.pxArchivosXlsx({ temporada: '', episodio: '', filas: [{ actor: 'Juan Perez', personaje: 'Ejemplo', trad: 'Ejemplo', mc: false, menor: false }] }, Object.assign({}, cfg, { serie: '', idioma: '', cliente: '', tipo: '', producto: '', idLengua: '', estudio: '', estudioEn: '',
      creditos: { mezcla: '' } })), tpl = {};
    for(const k in vacia) tpl[k] = enc(vacia[k]);
    const out = D.pxLlenarPlantilla(tpl, ep, Object.assign({}, cfg, { cliente: 'Amazon Prime Video' }));
    const a = dec(out['xl/worksheets/sheet1.xml']), b = f['xl/worksheets/sheet1.xml'];
    const refs = ['C1', 'C4', 'C6', 'C7', 'C9', 'C10', 'C11', 'C13', 'D17', 'C19', 'D19', 'C21', 'D21', 'F21', 'D23', 'E23', 'F23', 'D25', 'E25', 'D26', 'A36', 'B36', 'C36', 'F36', 'G36', 'B37', 'C37', 'G37', 'F38', 'G38'];
    t.eq('las mismas celdas que el archivo de siempre', refs.filter(r => texto(a, r) !== texto(b, r)).join(','), '');
    t.ok('con las fórmulas de nombre y apellido, cada una en su fila', /<c r="D37" s="11" t="str"><f>LEFT\(F37, FIND\(&quot; &quot;, F37\) - 1\)<\/f><v>Eliana<\/v><\/c>/.test(a) && /<f>MID\(F38, FIND/.test(a));
    t.ok('la hoja «List Items» y los estilos, intactos', dec(out['xl/worksheets/sheet2.xml']) === vacia['xl/worksheets/sheet2.xml'] && dec(out['xl/styles.xml']) === vacia['xl/styles.xml']);
  }

  t.seccion('2 · la plantilla de otro cliente');
  const L = D.pxTplLibro(OTRA()), M = D.pxTplMapa(L);
  t.eq('se busca la hoja «Contract Inventory», aunque no sea la primera', L.hoja + ' · ' + L.ruta, 'Contract Inventory · xl/worksheets/hoja2.xml');
  t.eq('los datos del proyecto, a la derecha del rótulo: pasada su combinación, en la celda que trae, o en la columna de los demás', M.proyecto.map(p => p.dato + '@' + p.r + ':' + p.col).join(' '), 'serie@3:3 cliente@4:3 @temporada@5:3 @episodio@6:3');
  t.eq('la tabla de reparto, con sus columnas en otro orden', JSON.stringify(M.reparto), '{"fila":20,"mc":1,"personaje":2,"trad":3,"nombre":5,"apellido":6,"legal":4,"edad":7}');
  const out = D.pxLlenarPlantilla(OTRA(), EP(), cfg), h = dec(out['xl/worksheets/hoja2.xml']);
  t.eq('el proyecto: título, temporada y episodio; CLIENT vacío en Dubbipt no borra el de la plantilla',
       [texto(h, 'C3'), texto(h, 'C5'), texto(h, 'C6'), celda(h, 'C4'), celda(h, 'B4'), celda(h, 'B6')].join(' | '), 'Final Table | 1 | 3 | ' + s('C4', 3, 2) + ' |  | ');
  t.eq('los créditos por su «Description»', [texto(h, 'D11'), texto(h, 'C12'), texto(h, 'D12'), texto(h, 'D13'), texto(h, 'E13'), texto(h, 'F13'), texto(h, 'D14'), texto(h, 'F14')].join(' | '),
       'Final Table | Episodio 3 | Episode 3 | Johannys | Cisneros | Johannys Cisneros | Angelo | Angelo Salazar');
  t.eq('el reparto, desde la primera fila bajo la cabecera', [21, 22, 23].map(r => ['A', 'B', 'C', 'D', 'G'].map(c => texto(h, c + r)).join('/')).join(' | '),
       'X/Du-Yeong/Du-Yeong/Claudia Cote/Adulto | /Young Song-Yi/Song-Yi joven/Eliana Baquero/Menor | ///Eleazar Osorio/Adulto');
  t.ok('con el formato y las fórmulas de su primera fila (y su alto)', /<c r="E22" s="7" t="str"><f>LEFT\(D22, FIND\(&quot; &quot;, D22\) - 1\)<\/f><v>Eliana<\/v><\/c>/.test(h)
    && /<c r="F23" s="7" t="str"><f>MID\(D23, FIND\(&quot; &quot;, D23\) \+ 1, LEN\(D23\)\)<\/f><v>Osorio<\/v><\/c>/.test(h) && /<c r="G23" s="8"/.test(h) && /<row r="23" ht="18" customHeight="1">/.test(h));
  t.ok('lo que no es del episodio queda: el logo, el pie, las combinaciones y la lista de Adulto/Menor', texto(h, 'A1') === '0' && /s="9"/.test(celda(h, 'A1')) && texto(h, 'B30') === '21'
    && /<mergeCells count="2"><mergeCell ref="A3:B3"\/>/.test(h) && /<dataValidation sqref="G21:G40"\/>/.test(h));
  t.ok('filas en orden, sin «spans» viejos, y la dimensión al día', !/spans=/.test(h) && /<dimension ref="A1:G30"\/>/.test(h) && h.indexOf('<row r="21"') < h.indexOf('<row r="22"'));
  t.ok('Excel recalcula al abrir: sin la cadena de cálculo vieja', !out['xl/calcChain.xml'] && !/calcChain/.test(dec(out['[Content_Types].xml'])) && !/calcChain/.test(dec(out['xl/_rels/workbook.xml.rels']))
    && /<calcPr fullCalcOnLoad="1" calcId="1"\/>/.test(dec(out['xl/workbook.xml'])));
  {
    const ep = EP(); ep.filas = ep.filas.slice(0, 1);
    const h1 = dec(D.pxLlenarPlantilla(OTRA(), ep, cfg)['xl/worksheets/hoja2.xml']);
    t.eq('con menos actores que filas de ejemplo, el ejemplo se borra (y el pie no)', [texto(h1, 'B21'), texto(h1, 'B22'), texto(h1, 'B23'), texto(h1, 'B30')].join('|'), 'Du-Yeong|||21');
  }
  let err = '';
  try{ const x = OTRA(); x['xl/worksheets/hoja2.xml'] = enc('<worksheet><sheetData><row r="1">' + s('A1', 1) + '</row></sheetData></worksheet>'); D.pxTplMapa(D.pxTplLibro(x)); }catch(e){ err = e.message; }
  t.eq('sin la tabla de reparto no sirve', err, 'no tiene la tabla de reparto (la cabecera «Character Name»)');

  t.seccion('3 · una por programa');
  const S = D.ST.px; S.cfg = cfg;
  V.unzip = () => OTRA();
  const archivo = (n) => ({ name: n, size: 9, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer });
  S.cfg.serie = '';
  await D.pxTplSubir(archivo('xyz.xlsx'));
  t.eq('sin título del proyecto no se sube', V.avisos.pop(), 'Escribe primero el título del proyecto (PROJECT TITLE): la plantilla queda para ese programa');
  S.cfg.serie = 'Final Table';
  await D.pxTplSubir(archivo('xyz.xls'));
  t.eq('tiene que ser .xlsx', V.avisos.pop(), 'Ábrela en Excel y guárdala como .xlsx (libro de Excel)');
  await D.pxTplSubir(archivo('plantilla XYZ.xlsx'));
  t.eq('al subirla dice qué encontró', V.avisos.pop(), 'Plantilla de «Final Table»: plantilla XYZ.xlsx · hoja «Contract Inventory», 4 datos del proyecto, 4 créditos y el reparto desde la fila 21');
  t.eq('queda para ese programa, y no para otro', [D.pxTplDe('final  table') && D.pxTplDe('final  table').nombre, D.pxTplDe('Otra Serie')].join('|'), 'plantilla XYZ.xlsx|');
  V.zips.length = 0;
  D.pxDescargar(EP(), true);
  t.ok('al descargar «Final Table», se llena SU plantilla', V.zips.length === 1 && !!V.zips[0]['xl/worksheets/hoja2.xml'] && /Claudia Cote/.test(dec(V.zips[0]['xl/worksheets/hoja2.xml'])));
  S.cfg.serie = 'Otra Serie';
  D.pxDescargar(EP(), true);
  t.ok('otro programa, la de siempre', V.zips.length === 2 && !!V.zips[1]['xl/worksheets/sheet2.xml'] && !V.zips[1]['xl/worksheets/hoja2.xml']);
  let h2 = D.html('dubcards');
  D.ST.dc.modo = 'pixelogic'; h2 = D.html('dubcards');
  t.ok('en pantalla: la plantilla del programa y los otros que tienen la suya', /Plantilla de «Otra Serie»: <b>la de siempre \(Contract Inventory de Pixelogic\)<\/b>/.test(h2)
    && /data-dct="pxTplElegir">.*Subir otra plantilla \(\.xlsx\)/.test(h2) && /Otros programas con su plantilla: Final Table/.test(h2) && /<input type="file" id="dctPxTpl" accept="\.xlsx" hidden>/.test(h2));
  S.cfg.serie = 'Final Table'; h2 = D.html('dubcards');
  t.ok('y con la suya: cambiarla o volver a la de siempre', /Plantilla de «Final Table»: <b>plantilla XYZ\.xlsx<\/b>/.test(h2) && /Cambiar la plantilla \(\.xlsx\)/.test(h2) && /data-dct="pxTplQuitar"/.test(h2));
  D.pxTplQuitar();
  t.eq('«Usar la de siempre» la quita', [V.avisos.pop(), D.pxTplDe('Final Table')].join('|'), '«Final Table» vuelve a la plantilla de siempre|');
  V.unzip = () => { throw new Error('zip roto'); };
  await D.pxTplSubir(archivo('rota.xlsx'));
  t.eq('un archivo que no se puede leer, se dice', V.avisos.pop(), 'Esa plantilla no sirve: zip roto');
};
