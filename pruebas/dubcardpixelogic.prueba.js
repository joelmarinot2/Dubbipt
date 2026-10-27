/* DUBCARD en formato Pixelogic · especificacion 09, PRO-58
 *
 * Pedido de sala, con el presupuesto de «Final Table» 103 y el archivo que se
 * entregó: «en la sección de Dubcards, un nuevo tipo que sea Pixelogic». Lo
 * que protege esta prueba: que del desglose salen la temporada y el episodio
 * (103 es la 1, episodio 3); que va una fila por actor, con su personaje (el
 * de más líneas) o como voz adicional si solo hace papeles genéricos; que
 * ORIGINAL y TODOS no entran; que el Excel es el «Contract Inventory» de la
 * entrega, con las fórmulas de nombre y apellido; que M.C. y Adulto/Menor se
 * recuerdan para el siguiente episodio; y el nombre del archivo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'DUBCARD en formato Pixelogic';

const RAIZ = path.dirname(INDEX);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u;

/* La hoja CASTING del presupuesto de «Final Table» 103 (un trozo, tal como la da SheetJS). */
const CASTING = [[], [], [], [], [], ['CASTING DE PELICULA'],
  ['FECHA: ', 'OCTUBRE 06 DE  2026', 'DIRECTOR:', 'ANGELO SALAZAR'],
  ['GENERO:', 'K-DRAMA', 'TECNICO:                ', 'JUAN BENAVIDES'],
  ['TITULO(inglés):', 'FINAL TABLE 103', 'CASTING ', 'JOEL MARINO'],
  ['TIEMPO:            ', 75, 'ESTUDIO #', 1], [],
  ['LOCUTOR', 'TIME CODE', 'DESCRIPCION', 'NOMBRE DEL ACTOR', 'REAL', 'TELEFONO'],
  ['WALLA', '00:00:30 ', '', 'TODOS', 11],
  ['SONG-YI', '00:00:56 ', '', 'LAURA ROMAN', 101],
  ['DU-YEONG', '00:03:26 ', '', 'CLAUDIA COTE', 87],
  ['CAPTAIN COOK', '00:04:17 ', '', 'EDWARD PINEDA', 41],
  ['GEON-WOO', '00:08:02 ', '', 'MAVERICK MUÑOZ', 48],
  ['DU-YEON', '00:09:06 ', '', 'CLAUDIA COTE', 1],
  ['', '', '', '', ''],
  ['MICHAEL', '00:12:21 ', '', 'DIEGO PINZON', 7],
  ['EXCEPTION DINING ROOM MANAGER 3A', '00:13:40 ', '', 'JOSETH CASTAÑEDA', 3],
  ['HYEONG-KOO', '00:18:38 ', '', 'ANGELO SALAZAR', 13],
  ['CHEF 3A', '00:36:10 ', '', 'ANGELO SALAZAR', 8],
  ['YOUNG SONG-YI', '00:46:04 ', '', 'ELIANA BAQUERO', 5],
  ['JUN-HO', '00:46:05 ', '', 'DIEGO PINZON', 5],
  ['CHEF 3G', '00:48:27 ', '', 'ORIGINAL', 3],
  ['SAGE 3A', '00:49:04 ', '', 'ELEAZAR OSORIO', 9],
  ['PRODUCTION STAFF 3A', '00:57:19 ', '', 'KATHERINE GUZMAN', 3],
  ['SAN', '', '', 'EDWARD PINEDA', 0],
  ['TEENAGE HAN', '', '', 'TODOS', 0]];

function cargar(o){
  o = o || {};
  const V = { avisos: [], bajados: [], zips: [], ls: o.ls || {} };
  const ctx = vm.createContext({
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController,
    XLSX: { read: (bytes) => bytes.buffer.__wb, utils: { sheet_to_json: (ws) => ws.filas } },
    fflate: { strToU8: (t) => new TextEncoder().encode(t), zipSync: (f) => { V.zips.push(f); return new Uint8Array(4); } },
    localStorage: { getItem: (k) => (k in V.ls ? V.ls[k] : null), setItem: (k, v) => { V.ls[k] = String(v); } },
    castAviso: (t) => V.avisos.push(t), csRepintar(){}, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    csDatos: () => ({ datos: { series: [] } }), sbShows: () => [],
    URL: { createObjectURL: (b) => { V.bajados.push(b); return 'blob:x'; }, revokeObjectURL(){} },
    document: { createElement: () => ({ click(){}, remove(){}, setAttribute(){} }), body: { appendChild(){} }, getElementById: () => null },
    location: { origin: 'https://dubbipt.app' }
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'dctools.js'), 'utf8') + ';this.DCT = DCT;', ctx);
  V.D = ctx.DCT;
  return V;
}
function archivo(nombre, casting){
  const buf = new ArrayBuffer(8);
  const wb = { SheetNames: ['DESGLOCE', 'CASTING', 'CASTING 1'], Sheets: { DESGLOCE: { filas: [] }, CASTING: { filas: casting }, 'CASTING 1': { filas: [] } } };
  return { name: nombre, size: 8, arrayBuffer: async () => Object.assign(buf, { __wb: wb }) };
}
const de = (f, ruta) => new TextDecoder().decode(f[ruta]);
const txt = (ref, v, s) => '<c r="' + ref + '" s="' + s + '" t="inlineStr"><is><t xml:space="preserve">' + v + '</t></is></c>';

exports.pruebas = async function(t){
  t.seccion('1 · del presupuesto, el episodio');
  const V = cargar(), D = V.D;
  V.D.ST.px.cfg = D.pxCfgCargar();
  V.D.ST.px.entries.push({ name: 'PRESUP_FINAL_TABLE_103.xlsm', file: archivo('PRESUP_FINAL_TABLE_103.xlsm', CASTING) });
  await D.pxProcesar();
  const S = D.ST.px, ep = S.eps[0];
  t.eq('la serie del título, la temporada y el episodio (103 es la 1, episodio 3)', S.cfg.serie + ' | ' + ep.temporada + ' | ' + ep.episodio + ' | ' + ep.titulo + ' | ' + ep.tituloTrad,
       'Final Table | 1 | 3 | Episode 3 | Episodio 3');
  t.eq('director y técnico del desglose', ep.director + ' | ' + ep.tecnico, 'Angelo Salazar | Juan Benavides');
  t.eq('lo que dice al procesar', S.logs[0].msg, 'PRESUP_FINAL_TABLE_103.xlsm: temporada 1, episodio 3 · 7 personajes · 3 voces adicionales · 3 fuera (no son talentos)');
  t.eq('una fila por actor: los personajes en orden y después las voces adicionales, por actor',
       ep.filas.map(x => (x.personaje || '-') + ':' + x.actor).join(' | '),
       'Du-Yeong:Claudia Cote | Geon-Woo:Maverick Muñoz | Hyeong-Koo:Angelo Salazar | Michael:Diego Pinzon | San:Edward Pineda | Song-Yi:Laura Roman | Young Song-Yi:Eliana Baquero | '
       + '-:Eleazar Osorio | -:Joseth Castañeda | -:Katherine Guzman');
  t.eq('con varios personajes, el de más líneas; los demás se pueden elegir', ep.filas[0].opciones.join('/') + ' · ' + ep.filas[3].opciones.join('/'), 'Du-Yeong/Du-Yeon · Michael/Jun-Ho');
  t.eq('un papel genérico (CAPTAIN COOK, CHEF 3A) no es un personaje', ep.filas[4].opciones.join('/') + ' · ' + ep.filas[2].otros.join(', '), 'San · Chef 3A');
  t.eq('ORIGINAL y TODOS no entran, y se dice cuáles', ep.fuera.join(', '), 'Walla (TODOS), Chef 3G (ORIGINAL), Teenage Han (TODOS)');
  t.eq('menor, si el papel lo dice («Young…»); los demás, adultos', ep.filas.filter(x => x.menor).map(x => x.personaje).join(','), 'Young Song-Yi');
  t.eq('nombre y apellido como las fórmulas de la plantilla', D.pxPartes('Luis D Martinez').join('|') + ' ' + D.pxPartes('Cher').join('|'), 'Luis|D Martinez Cher|');

  t.seccion('2 · el Excel: el Contract Inventory de Pixelogic');
  Object.assign(S.cfg, { totalEps: '12' });
  Object.assign(S.cfg.creditos, { traductor: 'Johannys Cisneros', adaptador: 'Jennyfer Homez', produccion: 'Flor Garcia' });
  ep.filas[0].mc = true; ep.filas[1].mc = true;
  const f = D.pxArchivosXlsx(ep, S.cfg), hoja = f['xl/worksheets/sheet1.xml'], listas = f['xl/worksheets/sheet2.xml'];
  t.ok('dos hojas: «Contract Inventory» y «List Items»', /<sheet name="Contract Inventory" sheetId="1" r:id="rId1"\/><sheet name="List Items" sheetId="2" r:id="rId2"\/>/.test(f['xl/workbook.xml'])
    && !!f['[Content_Types].xml'] && /sheet2\.xml/.test(f['xl/_rels/workbook.xml.rels']) && /<sheetProtection sheet="1"\/>/.test(listas));
  t.ok('los datos del proyecto, de A1 a C11', hoja.indexOf(txt('A1', 'PROJECT TITLE (ENGLISH)', 1) + '<c r="B1" s="2"/>' + txt('C1', 'Final Table', 2)) >= 0
    && hoja.indexOf(txt('C4', 'LIP SYNC DUBBING', 2)) >= 0 && hoja.indexOf(txt('C6', 'Spanish (Latin American)', 2)) >= 0 && hoja.indexOf(txt('C7', 'Amazon Prime Video', 2)) >= 0
    && hoja.indexOf(txt('C8', 'Episodic', 2)) >= 0 && /<c r="C9" s="2"><v>1<\/v><\/c>/.test(hoja) && /<c r="C10" s="2"><v>3<\/v><\/c>/.test(hoja) && /<c r="C11" s="2"><v>12<\/v><\/c>/.test(hoja)
    && /<mergeCells count="11"><mergeCell ref="A1:B1"\/>/.test(hoja) && hoja.indexOf(txt('C13', 'LAS', 4)) >= 0);
  t.ok('los créditos técnicos: título, estudio y cada persona con nombre, apellido y nombre legal', hoja.indexOf(txt('C19', 'Episodio 3', 8) + txt('D19', 'Episode 3', 8)) >= 0
    && hoja.indexOf(txt('C21', 'Centauro Comunicaciones', 8) + txt('D21', 'Centauro Communications', 8) + '<c r="E21" s="8"/>' + txt('F21', 'Centauro Comunicaciones', 8)) >= 0
    && hoja.indexOf(txt('B23', 'Translator', 9) + '<c r="C23" s="8"/>' + txt('D23', 'Johannys', 8) + txt('E23', 'Cisneros', 8) + txt('F23', 'Johannys Cisneros', 8)) >= 0
    && hoja.indexOf(txt('D25', 'Angelo', 8) + txt('E25', 'Salazar', 8)) >= 0 && hoja.indexOf(txt('B26', 'Recording Engineer', 8) + '<c r="C26" s="8"/>' + txt('D26', 'Juan', 8)) >= 0
    && hoja.indexOf(txt('D27', 'Edwin', 8)) >= 0 && hoja.indexOf(txt('D28', 'Flor', 8)) >= 0 && hoja.indexOf(txt('B31', 'AD Director', 9)) >= 0);
  t.ok('el reparto desde la fila 36: M.C., personaje, traducción, fórmulas de nombre y apellido, actor y edad',
    hoja.indexOf(txt('A36', 'X', 12) + txt('B36', 'Du-Yeong', 11) + txt('C36', 'Du-Yeong', 11)
      + '<c r="D36" s="11" t="str"><f>LEFT(F36, FIND(&quot; &quot;, F36) - 1)</f><v>Claudia</v></c><c r="E36" s="11" t="str"><f>MID(F36, FIND(&quot; &quot;, F36) + 1, LEN(F36))</f><v>Cote</v></c>'
      + txt('F36', 'Claudia Cote', 11) + txt('G36', 'Adulto', 13)) >= 0
    && hoja.indexOf('<c r="A38" s="12"/>' + txt('B38', 'Hyeong-Koo', 11)) >= 0 && hoja.indexOf(txt('G42', 'Menor', 13)) >= 0
    && hoja.indexOf('<c r="A43" s="12"/><c r="B43" s="11"/><c r="C43" s="11"/>') >= 0 && hoja.indexOf(txt('F43', 'Eleazar Osorio', 11)) >= 0);
  t.ok('las cabeceras de la tabla y de las tarjetas', hoja.indexOf(txt('C34', 'Con las voces de', 10) + txt('D34', 'Voces adicionales', 10)) >= 0
    && hoja.indexOf(txt('A35', 'M.C.', 16) + txt('B35', 'Character Name', 5)) >= 0 && hoja.indexOf(txt('G35', 'Adult or Minor', 5)) >= 0);
  t.ok('con su formato: Arial y Calibri, amarillo y gris, bordes y anchos', /FFFFFF00/.test(f['xl/styles.xml']) && /FFBFBFBF/.test(f['xl/styles.xml']) && /<name val="Arial"\/>/.test(f['xl/styles.xml'])
    && /<col min="6" max="6" width="77.875" customWidth="1"\/>/.test(hoja));
  t.ok('las listas de la plantilla', /LIP SYNC DUBBING/.test(listas) && /All rights excluding theatrical/.test(listas) && /Episodic/.test(listas));
  t.eq('el nombre del archivo, como el de la entrega', D.pxNombreArchivo(S.cfg, ep) + ' ' + D.pxNombreArchivo({ serie: 'Señor Ávila', sufijo: '' }, { temporada: '2', episodio: '13' }),
       'Final_Table_S1_E0003_OV_FP_DDO_PROHQ_HD_SDR_239_LAS_178_MOS_20.xlsx Senor_Avila_S2_E0013.xlsx');

  t.seccion('3 · en pantalla, y lo que se recuerda para el siguiente episodio');
  D.ST.dc.modo = 'pixelogic';
  let h = D.html('dubcards');
  t.ok('la pestaña «Formato Pixelogic» dentro de Dubcards, sin emojis', /data-dct="dcModo" data-v="pixelogic">Formato Pixelogic/.test(h) && /data-dct="pxElegir"/.test(h)
    && /<input type="file" id="dctPxFiles" multiple/.test(h) && !EMOJI.test(h));
  t.ok('por fila: M.C., personaje (o voces adicionales), traducción, actor y edad',
    /data-dct="pxMc" data-i="0" data-j="0" checked/.test(h) && /<option selected>Michael<\/option><option>Jun-Ho<\/option><option value="">\(voces adicionales\)<\/option>/.test(h)
    && /data-dct="pxMenor" data-i="0" data-j="6"><option value="0">Adulto<\/option><option value="1" selected>Menor/.test(h) && /data-dct="pxBajar" data-i="0"/.test(h)
    && /No entran \(no son talentos\): Walla \(TODOS\)/.test(h));
  /* Se elige Jun-Ho para Diego Pinzon, como en la entrega. */
  const cambios = [];
  D.cablear({ querySelector: () => null, querySelectorAll: () => [{ tagName: 'SELECT', value: 'Jun-Ho', getAttribute: (k) => ({ 'data-dct': 'pxPapel', 'data-i': '0', 'data-j': '3' })[k] || null, set onchange(fn){ cambios.push(fn); } }] }, 'dubcards');
  cambios[0]();
  t.eq('cambiar el personaje reordena', ep.filas.slice(0, 5).map(x => x.personaje).join(','), 'Du-Yeong,Geon-Woo,Hyeong-Koo,Jun-Ho,San');
  const botones = [];
  D.cablear({ querySelector: () => null, querySelectorAll: () => [{ getAttribute: (k) => ({ 'data-dct': 'pxBajar', 'data-i': '0' })[k] || null, set onclick(fn){ botones.push(fn); } }] }, 'dubcards');
  botones[0]();
  t.eq('descargar: el .xlsx armado con fflate, con su nombre', V.bajados.length + ' ' + Object.keys(V.zips[0]).length + ' ' + V.avisos.slice(-1)[0],
       '1 7 Descargado: Final_Table_S1_E0003_OV_FP_DDO_PROHQ_HD_SDR_239_LAS_178_MOS_20.xlsx');
  t.ok('con Jun-Ho en el archivo', /Jun-Ho/.test(de(V.zips[0], 'xl/worksheets/sheet1.xml')) && !/Michael/.test(de(V.zips[0], 'xl/worksheets/sheet1.xml')));
  {
    /* Otro día, el episodio siguiente: lo marcado se recuerda. */
    const W = cargar({ ls: V.ls });
    W.D.ST.px.cfg = W.D.pxCfgCargar(); W.D.ST.px.pausa = 0;
    const cap = (n) => CASTING.map(fl => (fl[0] === 'TITULO(inglés):' ? [fl[0], 'FINAL TABLE ' + n] : fl));
    W.D.ST.px.entries.push({ name: 'P105.xlsm', file: archivo('P105.xlsm', cap(105)) }, { name: 'P104.xlsm', file: archivo('P104.xlsm', cap(104)) });
    await W.D.pxProcesar();
    const e = W.D.ST.px.eps[0];
    t.eq('se recuerdan la serie, los créditos, M.C. y el personaje elegido', W.D.ST.px.cfg.serie + ' | ' + W.D.ST.px.cfg.creditos.traductor + ' | '
      + e.filas.filter(x => x.mc).map(x => x.personaje).join(',') + ' | ' + e.filas.find(x => x.actor === 'Diego Pinzon').personaje,
      'Final Table | Johannys Cisneros | Du-Yeong,Geon-Woo | Jun-Ho');
    t.eq('varios a la vez, en orden', W.D.ST.px.eps.map(x => x.episodio).join(','), '4,5');
    const hechos = await W.D.pxDescargarVarios(W.D.ST.px.eps);
    t.eq('descarga varios: un archivo por episodio', hechos.join(' ') + ' · ' + W.bajados.length,
         'Final_Table_S1_E0004_OV_FP_DDO_PROHQ_HD_SDR_239_LAS_178_MOS_20.xlsx Final_Table_S1_E0005_OV_FP_DDO_PROHQ_HD_SDR_239_LAS_178_MOS_20.xlsx · 2');
    W.D.ST.px.cfg.serie = '';
    t.eq('sin título del proyecto, no baja nada y lo pide', (await W.D.pxDescargarVarios(W.D.ST.px.eps)).length + ' ' + W.avisos.slice(-1)[0], '0 Escribe el título del proyecto (PROJECT TITLE)');
  }
};
