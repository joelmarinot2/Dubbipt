/* DUBCARD en formato Paramount · especificacion 09, PRO-55
 *
 * Pedido de sala, con el DUBCARD entregado de «Big John's Bosh Family» 101 y
 * su desglose: «en la sección de DUBCARD, otra sección que sea DUBCARD
 * formato Paramount; se tiene que entregar así, partiendo de los archivos del
 * presupuesto». Lo que protege esta prueba: que del desglose salen el título,
 * el director, el técnico y el reparto; que ORIGINAL y TODOS no entran; que
 * los nombres propios van en CHARACTER y los papeles traducidos en
 * TRANSLATION, escritos como en la entrega y en orden; que el Excel es la
 * plantilla de Paramount, con su formato; y el nombre del archivo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'DUBCARD en formato Paramount';

const RAIZ = path.dirname(INDEX);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u;

/* La hoja CASTING del presupuesto de sala (un trozo, tal como la da SheetJS). */
const CASTING = [[], [], [], [], [], ['CASTING DE PELICULA'],
  ['FECHA: ', 'SEPTIEMBRE 18 DE 2026', 'DIRECTOR:', 'DIEGO TORO'],
  ['GENERO:', 'TESTIMONIAL', 'TECNICO:                ', 'ANDRES ACOSTA'],
  ['TITULO(inglés):', "BIG JOHN'S BOSH FAMILY KFA MEET THE FISHERS 101", 'CASTING ', 'JOEL MARINO'],
  ['TIEMPO:            ', 60, 'ESTUDIO #', 8], [],
  ['LOCUTOR', 'TIME CODE', 'DESCRIPCION', 'NOMBRE DEL ACTOR', 'REAL', 'TELEFONO'],
  ['GRUPO DE NIÑOS', '01:00:07 ', '', 'TODOS', 1],
  ['BIG JOHN', '01:00:09 ', '', 'JOHN GREY', 372],
  ['', '', '', '', ''],
  ['PRESENTADORA', '01:01:10 ', '', 'ORIGINAL', 1],
  ['COMENTARISTA DE LA PELEA', '01:11:43 ', '', 'HECTOR I GONZALEZ', 10],
  ['JAKE BHARDWAJ', '01:17:53 ', '', 'MIGUEL PRADA', 17],
  ['GRÁFICA', '01:01:01 ', '', 'YOVANNY SUAREZ', 14],
  ['HOMBRE BINGO 1', '01:26:11 ', '', 'JOEL MARINO', 1],
  ['ANDY GOLDSTEIN', '01:34:50 ', '', 'HECTOR I GONZALEZ', 2],
  ['DOCTORA', '01:34:35 ', '', '', 2],
  ['BIG JOHN', '01:00:09 ', '', 'OTRO', 1]];

function cargar(o){
  o = o || {};
  const V = { avisos: [], bajados: [], zips: [], pintadas: 0, ls: {} };
  const ctx = vm.createContext({
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController,
    XLSX: { read: (bytes) => bytes.buffer.__wb, utils: { sheet_to_json: (ws) => ws.filas } },
    fflate: { strToU8: (t) => new TextEncoder().encode(t), zipSync: (f) => { V.zips.push(f); return new Uint8Array(4); } },
    localStorage: { getItem: (k) => (k in V.ls ? V.ls[k] : null), setItem: (k, v) => { V.ls[k] = String(v); } },
    castAviso: (t) => V.avisos.push(t), csRepintar: () => { V.pintadas++; }, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    csDatos: () => ({ datos: { series: [{ name: 'Otra Serie' }] } }), sbShows: o.shows || (() => []),
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

exports.pruebas = async function(t){
  const V = cargar(), D = V.D;

  t.seccion('1 · lo que se lee del presupuesto');
  const d = D.pmDatosDeHojas(CASTING, []);
  t.eq('título, director y técnico de la hoja CASTING', d.titulo + ' | ' + d.director + ' | ' + d.tecnico, "BIG JOHN'S BOSH FAMILY KFA MEET THE FISHERS 101 | DIEGO TORO | ANDRES ACOSTA");
  t.eq('cada personaje una vez, sin filas vacías', d.reparto.map(x => x.personaje + ':' + x.talento).join(','),
       'GRUPO DE NIÑOS:TODOS,BIG JOHN:JOHN GREY,PRESENTADORA:ORIGINAL,COMENTARISTA DE LA PELEA:HECTOR I GONZALEZ,JAKE BHARDWAJ:MIGUEL PRADA,GRÁFICA:YOVANNY SUAREZ,HOMBRE BINGO 1:JOEL MARINO,ANDY GOLDSTEIN:HECTOR I GONZALEZ,DOCTORA:');
  t.eq('sin título en CASTING, el de DESGLOCE', D.pmDatosDeHojas([['LOCUTOR', '', '', 'NOMBRE DEL ACTOR']], [[], [], [], [], [], [], [], [], ['', '', '', '', '', '', '', 'SERIE 102']]).titulo, 'SERIE 102');
  t.eq('sin la columna del actor, se dice', D.pmDatosDeHojas([['A']], []).sinCabecera, true);

  t.seccion('2 · el episodio, como lo entregó sala');
  const ep = D.pmEpisodio(d, 'PRESUP.xlsm', "BIG JOHN'S BOSH FAMILY");
  t.eq('número y título (sin la serie, en título inglés)', ep.numero + ' | ' + ep.titulo, '101 | Kfa Meet the Fishers');
  t.eq('ORIGINAL y TODOS no entran, y se dice cuáles', ep.fuera.join(', '), 'Grupo de niños (TODOS), Presentadora (ORIGINAL)');
  t.eq('nombre propio en CHARACTER, papel traducido en TRANSLATION, en orden y escritos como en la entrega', ep.filas.map(x => x.col + ':' + x.nombre + ':' + x.actor).join(' | '),
       'B:Andy Goldstein:Hector I Gonzalez | B:Big John:John Grey | C:Comentarista de la pelea:Hector I Gonzalez | C:Doctora: | C:Gráfica:Yovanny Suarez | C:Hombre bingo 1:Joel Marino | B:Jake Bhardwaj:Miguel Prada');
  t.eq('créditos del desglose', ep.director + ' | ' + ep.tecnico, 'Diego Toro | Andres Acosta');
  t.eq('sin serie conocida: se propone la del título', D.pmEpisodio(d, 'x.xlsm', '').serieAdivinada, "BIG JOHN'S BOSH FAMILY KFA MEET THE FISHERS");
  t.eq('papeles traducidos y nombres propios', ['Taxista', 'Voz de mujer', 'Gorda Nan', 'Mujer fila', 'Herry', 'Joe Marler', 'Eddie Hearn', 'William'].map(D.pmEsTraduccion).join(','), 'true,true,true,true,false,false,false,false');

  t.seccion('3 · el Excel: la plantilla de Paramount');
  const cfg = D.pmCfgCargar();
  cfg.serie = "BIG JOHN'S BOSH FAMILY"; cfg.creditos.adaptador = 'Jennyfer Homez';
  ep.titulo = 'Meet the Fishers';
  const f = D.pmArchivosXlsx([ep], cfg);
  const hoja = f['xl/worksheets/sheet1.xml'];
  t.ok('una hoja por episodio, con su número', /<sheet name="101" sheetId="1" r:id="rId1"\/>/.test(f['xl/workbook.xml']) && !!f['[Content_Types].xml'] && !!f['_rels/.rels'] && !!f['xl/_rels/workbook.xml.rels']);
  t.ok('la cabecera: aviso, serie, idioma, número y título', /<mergeCell ref="A1:E1"\/>/.test(hoja) && /PLEASE COPY THIS TEMPLATE AND ADD A NEW TAB FOR EACH EPISODE/.test(hoja)
    && /<c r="B2" s="3" t="inlineStr"><is><t xml:space="preserve">BIG JOHN&apos;S BOSH FAMILY|<c r="B2" s="3" t="inlineStr"><is><t xml:space="preserve">BIG JOHN'S BOSH FAMILY/.test(hoja)
    && /<c r="B4" s="3" t="inlineStr"><is><t xml:space="preserve">Versión en español latinoamericano/.test(hoja) && /<c r="B5" s="3"><v>101<\/v><\/c>/.test(hoja) && /<c r="B6" s="3" t="inlineStr"><is><t xml:space="preserve">Meet the Fishers/.test(hoja));
  t.ok('los créditos técnicos: los de siempre, y director y técnico del desglose', /<c r="A11" s="5" t="inlineStr"><is><t xml:space="preserve">Creative Supervisor<\/t><\/is><\/c><c r="B11" s="8"\/><c r="C11" s="6" t="inlineStr"><is><t xml:space="preserve">Henry Perez/.test(hoja)
    && /C12" s="6" t="inlineStr"><is><t xml:space="preserve">Centauro Comunicacions/.test(hoja) && /C14" s="6" t="inlineStr"><is><t xml:space="preserve">Diego Toro/.test(hoja)
    && /C16" s="6" t="inlineStr"><is><t xml:space="preserve">Edwin Rodriguez/.test(hoja) && /C17" s="6" t="inlineStr"><is><t xml:space="preserve">Andres Acosta/.test(hoja) && /C19" s="6" t="inlineStr"><is><t xml:space="preserve">Jennyfer Homez/.test(hoja));
  t.ok('el reparto desde la fila 25: CHARACTER o TRANSLATION, y el actor', /<c r="B25" s="7" t="inlineStr"><is><t xml:space="preserve">Andy Goldstein<\/t><\/is><\/c><c r="C25" s="7"\/><c r="D25" s="7" t="inlineStr"><is><t xml:space="preserve">Hector I Gonzalez/.test(hoja)
    && /<c r="B27" s="7"\/><c r="C27" s="7" t="inlineStr"><is><t xml:space="preserve">Comentarista de la pelea/.test(hoja) && /<c r="A24" s="4" t="inlineStr"><is><t xml:space="preserve">ORIGINAL ACTOR/.test(hoja));
  t.ok('con su formato: Calibri, Book Antiqua, gris en las cabeceras, bordes y anchos', /<name val="Book Antiqua"\/>/.test(f['xl/styles.xml']) && /FFD9D9D9/.test(f['xl/styles.xml']) && /<col min="1" max="1" width="49.375"/.test(hoja));
  t.eq('el nombre del archivo, como el de Paramount', D.pmNombreArchivo(cfg.serie, [ep]) + ' ' + D.pmNombreArchivo('Señor Ávila', [{ numero: '101' }, { numero: '102' }]), 'BigJohnsBoshFamily_101_dubcard_es.xlsx SenorAvila_101-102_dubcard_es.xlsx');
  t.ok('varios episodios: una hoja cada uno, sin repetir nombre', /<sheet name="101"[^>]*\/><sheet name="101 \(2\)"/.test(D.pmArchivosXlsx([ep, ep], cfg)['xl/workbook.xml']));

  t.seccion('4 · en pantalla');
  {
    const W = cargar({ shows: () => [{ name: "Big John's Bosh Family" }, { name: 'Big' }] });
    t.eq('la serie, si es un programa que ya se conoce, escrita como en el desglose', W.D.pmSerieConocida("BIG JOHN'S BOSH FAMILY KFA MEET THE FISHERS 101"), "BIG JOHN'S BOSH FAMILY");
    W.D.ST.dc.modo = 'paramount';
    let h = W.D.html('dubcards');
    t.ok('la sección «Formato Paramount» dentro de DUBCARDs, sin emojis', /data-dct="dcModo" data-v="paramount">Formato Paramount/.test(h) && /data-dct="pmElegir"/.test(h) && /Serie y créditos técnicos/.test(h) && !EMOJI.test(h));
    W.D.ST.pm.entries.push({ name: 'PRESUP_101.xlsm', file: archivo('PRESUP_101.xlsm', CASTING) });
    await W.D.pmProcesar();
    const e = W.D.ST.pm.eps[0];
    t.eq('procesar: la serie del programa, el episodio y lo que falta', W.D.ST.pm.cfg.serie + ' | ' + e.numero + ' | ' + e.titulo + ' | ' + W.D.ST.pm.logs[0].msg,
         "BIG JOHN'S BOSH FAMILY | 101 | Kfa Meet the Fishers | PRESUP_101.xlsm: episodio 101 · 7 personajes · 2 fuera (no son talentos) · 1 sin actor");
    t.ok('la serie y los créditos se recuerdan en este equipo', /BIG JOHN'S BOSH FAMILY/.test(W.ls['dc_paramount_v1'] || ''));
    h = W.D.html('dubcards');
    t.ok('cada fila se puede corregir: nombre, columna y actor; y se descarga', /data-dct="pmFila" data-i="0" data-j="0" data-k="nombre" value="Andy Goldstein"/.test(h) && /<option value="C" selected>Translation/.test(h) && /data-dct="pmBajar" data-i="0"/.test(h) && /No entran \(no son talentos\): Grupo de niños \(TODOS\), Presentadora \(ORIGINAL\)/.test(h));
    const botones = [];
    W.D.cablear({ querySelector: () => null, querySelectorAll: () => [{ getAttribute: (k) => (k === 'data-dct' ? 'pmBajar' : k === 'data-i' ? '0' : null), set onclick(fn){ botones.push(fn); } }] }, 'dubcards');
    botones[0]();
    t.eq('descargar: el .xlsx armado con fflate, con su nombre', W.bajados.length + ' ' + W.zips.length + ' ' + Object.keys(W.zips[0]).length + ' ' + W.avisos.slice(-1)[0] + ' ' + /Andy Goldstein/.test(de(W.zips[0], 'xl/worksheets/sheet1.xml')),
         '1 1 6 Descargado: BigJohnsBoshFamily_101_dubcard_es.xlsx true');
  }
  t.ok('con sus estilos', /\.dct-pm-tabla\{/.test(fs.readFileSync(INDEX, 'utf8')) && /\.dct-pm-campos\{/.test(fs.readFileSync(INDEX, 'utf8')));
};
