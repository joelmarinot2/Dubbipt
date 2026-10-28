/* DUBCARD de Pipeline Studio · especificacion 09, PRO-59
 *
 * Pedido de sala, con el desglose de «Lyla in the Loop» 119ABI y la DUBCARD
 * entregada: «un nuevo cliente para las DUBCARD, Pipeline Studio». Lo que
 * protege esta prueba: que un episodio con segmentos (119A, 119B, 119I) da un
 * archivo con una hoja por segmento; que el personaje sale sin el timecode
 * pegado y el talento sin la ciudad («PAULA ESPINOSA MEXICO»), con el nombre
 * del directorio si está; que «LIDIA» se une a «LYDIA» (mismo actor); el
 * orden (el principal primero, los demás alfabéticos); que ORIGINAL y TODOS no
 * entran; el Excel de la entrega; el nombre del archivo; y lo que se recuerda.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'DUBCARD de Pipeline Studio';

const RAIZ = path.dirname(INDEX);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{FE0F}]/u;

/* La hoja CASTING del desglose de «Lyla in the Loop» 119ABI (tal como la da SheetJS). */
const V12 = (a, l) => [a, '', '', '', '', '', '', '', '', '', '', l];
const CASTING = [[], [], [], [], [], ['CASTING DE PELICULA'],
  ['FECHA: ', 'FEBRERO 28 DE 2024', '', '', '', '', 'DIRECTOR:', '', '', '', '', 'KEVIN SANCHEZ'],
  ['GENERO:', 'SERIE ANIMADA', '', '', '', '', 'TECNICO:                ', '', '', '', '', 'SOFIA DUARTE'],
  ['TITULO(inglés):', 'LYLA IN THE LOOP 119 ABI', '', '', '', '', 'CASTING ', '', '', '', '', 'PAMELA HERNANDEZ'],
  ['TIEMPO:            ', "30'"], [],
  ['LOCUTOR', 'LUGAR', 'DESCRIPCION', 'ED', 'P', 'CP', 'SC', 'FG', 'R', '', '', 'NOMBRE DEL ACTOR', 'ESTIMADO', 'REAL'],
  V12('EPS 119A   ', '….'),
  V12('LYLA   01:00:31', 'PAULA ESPINOSA MEXICO'), [],
  V12('EVERETT   01:00:41', 'GABRIEL ACUNA'),
  V12('THI   01:01:38', 'VERONICA PERILLA'),
  V12('LYDIA   01:01:41', 'ASTRID OVIEDO'),
  V12('LOUISA   01:04:23', 'ANGELICA SAENZ'),
  V12('LIANA   01:04:23', 'JAZMIN DIAZ'),
  V12('LOUIS   01:04:23', 'GIOVANNY CRUZ'),
  V12('LUKE   01:04:54', 'LUKAS CASTILLO'),
  V12('VOCES   01:05:00', 'TODOS'),
  V12('EPS 119B   ', '…'),
  V12('LYLA   01:11:36', 'PAULA ESPINOSA MEXICO'),
  V12('LUKE   01:11:56', 'LUKAS CASTILLO'),
  V12('LIANA   01:12:07', 'JAZMIN DIAZ'),
  V12('EPS 119I   ', '…'),
  V12('LYLA   01:00:04', 'PAULA ESPINOSA MEXICO'),
  V12('LOUISA   01:00:04', 'ANGELICA SAENZ'),
  V12('LIDIA   01:00:13', 'ASTRID OVIEDO'),
  V12('LUKE   01:00:54', 'LUKAS CASTILLO')];

function cargar(o){
  o = o || {};
  const V = { avisos: [], bajados: [], zips: [], ls: o.ls || {} };
  const ctx = vm.createContext({
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController,
    XLSX: { read: (bytes) => bytes.buffer.__wb, utils: { sheet_to_json: (ws) => ws.filas } },
    fflate: { strToU8: (t) => new TextEncoder().encode(t), zipSync: (f) => { V.zips.push(f); return new Uint8Array(4); } },
    localStorage: { getItem: (k) => (k in V.ls ? V.ls[k] : null), setItem: (k, v) => { V.ls[k] = String(v); } },
    castAviso: (t) => V.avisos.push(t), csRepintar(){}, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    csDatos: () => ({ datos: { series: [] } }), sbShows: () => [], talNombres: () => o.talentos || [],
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
const lista = g => g.filas.map(x => x.personaje + '=' + x.actor).join(' | ');

exports.pruebas = async function(t){
  t.seccion('1 · del desglose, el episodio y sus segmentos');
  const D0 = cargar().D;
  const d = D0.pmDatosDeHojas(CASTING, []);
  t.eq('los segmentos, con el personaje sin su timecode', d.segmentos.map(g => g.nombre + ':' + g.reparto.map(x => x.personaje).join(',')).join(' · '),
       '119A:LYLA,EVERETT,THI,LYDIA,LOUISA,LIANA,LOUIS,LUKE,VOCES · 119B:LYLA,LUKE,LIANA · 119I:LYLA,LOUISA,LIDIA,LUKE');
  t.eq('la fila del segmento no es un personaje', d.reparto.some(x => /EPS/.test(x.personaje)), false);

  const V = cargar({ talentos: ['Gabriel Acuña', 'Lukas Castillo'] }), D = V.D;
  D.ST.pl.cfg = D.plCfgCargar();
  D.ST.pl.entries.push({ name: 'DES_LYLAINTHELOOP_EP_119ABI.xlsm', file: archivo('DES_LYLAINTHELOOP_EP_119ABI.xlsm', CASTING) });
  await D.plProcesar();
  const S = D.ST.pl, ep = S.eps[0], mem = S.cfg.memoria[ep.clave];
  t.eq('lo que dice al procesar', S.logs[0].msg, 'DES_LYLAINTHELOOP_EP_119ABI.xlsm: episodio 119 · 3 segmentos (119A, 119B, 119I) · 8 + 3 + 4 personajes · 1 fuera (no son talentos)');
  t.eq('número, serie, director e ingeniero', ep.numero + ' | ' + mem.nombre + ' | ' + ep.director + ' | ' + ep.tecnico, '119 | Lyla in the Loop | Kevin Sanchez | Sofia Duarte');
  t.eq('el principal primero y los demás en orden; el talento sin la ciudad y con el nombre del directorio', lista(ep.segmentos[0]),
       'LYLA=PAULA ESPINOSA | EVERETT=GABRIEL ACUÑA | LIANA=JAZMIN DIAZ | LOUIS=GIOVANNY CRUZ | LOUISA=ANGELICA SAENZ | LUKE=LUKAS CASTILLO | LYDIA=ASTRID OVIEDO | THI=VERONICA PERILLA');
  t.eq('«LIDIA» es «LYDIA»: mismo actor, una letra de diferencia', lista(ep.segmentos[2]), 'LYLA=PAULA ESPINOSA | LOUISA=ANGELICA SAENZ | LUKE=LUKAS CASTILLO | LYDIA=ASTRID OVIEDO');
  t.eq('TODOS no entra, y se dice', ep.fuera.join(', '), '119A: VOCES (TODOS)');
  t.eq('el talento: lo corregido antes, el directorio, sin ciudad ni país', [
    D.plActor('PAULA ESPINOSA MEXICO', { actores: {} }, []), D.plActor('ana ruiz (remoto)', { actores: {} }, []),
    D.plActor('GIOVANNY CRUZ', { actores: { 'GIOVANNY CRUZ': 'GIOVANNI CRUZ' } }, []), D.plActor('LUKAS CASTILLO BOGOTA', { actores: {} }, ['Lukas Castillo'])].join(' | '),
    'PAULA ESPINOSA | ANA RUIZ | GIOVANNI CRUZ | LUKAS CASTILLO');

  t.seccion('2 · el Excel: un archivo, una hoja por segmento');
  mem.trad = 'Lyla Lo Logra'; mem.traductor = 'Nelly Sabogal';
  const f = D.plArchivosXlsx(ep, S.cfg), h1 = f['xl/worksheets/sheet1.xml'], h3 = f['xl/worksheets/sheet3.xml'];
  t.ok('tres hojas: Ep 119A, Ep 119B y Ep 119I', /<sheet name="Ep 119A" sheetId="1" r:id="rId1"\/><sheet name="Ep 119B" sheetId="2" r:id="rId2"\/><sheet name="Ep 119I" sheetId="3" r:id="rId3"\/>/.test(f['xl/workbook.xml'])
    && /Target="styles.xml"/.test(f['xl/_rels/workbook.xml.rels']) && /sheet3\.xml/.test(f['[Content_Types].xml']));
  t.ok('la cabecera: versión, título traducido entre comillas y el segmento', h1.indexOf(txt('A1', 'Versión Español Latino', 1)) >= 0 && h1.indexOf(txt('A2', '&quot;Lyla Lo Logra&quot;', 2)) >= 0
    && h1.indexOf(txt('A3', 'Episodio 119A', 2)) >= 0 && h3.indexOf(txt('A3', 'Episodio 119I', 2)) >= 0 && /<mergeCell ref="A1:C1"\/><mergeCell ref="A2:C2"\/>/.test(h1));
  t.ok('estudio, director, ingeniero y traducción', h1.indexOf(txt('A5', 'Estudio', 4) + '<c r="B5" s="5"/>' + txt('C5', 'Centauro Comunicaciones', 6)) >= 0
    && h1.indexOf(txt('C6', 'Kevin Sanchez', 6)) >= 0 && h1.indexOf(txt('A7', 'Ingeniero de Grabación', 4)) >= 0 && h1.indexOf(txt('C7', 'Sofia Duarte', 6)) >= 0 && h1.indexOf(txt('C8', 'Nelly Sabogal', 6)) >= 0);
  t.ok('Personajes / Talento y la lista desde la fila 11', h1.indexOf(txt('A10', 'Personajes', 7) + '<c r="B10" s="5"/>' + txt('C10', 'Talento', 8)) >= 0
    && h1.indexOf(txt('A11', 'LYLA', 9) + '<c r="B11" s="9"/>' + txt('C11', 'PAULA ESPINOSA', 9)) >= 0 && h1.indexOf(txt('A18', 'THI', 9)) >= 0 && h3.indexOf(txt('A14', 'LYDIA', 9)) >= 0);
  t.ok('con su formato: Calibri, negrita, bordes y anchos', /<b\/><sz val="12"\/><name val="Calibri"\/>/.test(f['xl/styles.xml']) && /<col min="1" max="1" width="44.42578125"/.test(h1) && /<col min="3" max="3" width="45"/.test(h1));
  t.eq('el nombre del archivo, como el de la entrega', D.plNombreArchivo(S.cfg, ep), 'Lyla in the Loop_Ep 119_es_DubCard.xlsx');
  const sinSeg = D.plEpisodio(D.pmDatosDeHojas(CASTING.filter(r => !/^EPS/.test(r[0] || '')), []), 'x.xlsm', D.plCfgCargar());
  t.eq('sin segmentos, una sola hoja con el número', sinSeg.segmentos.length + ' ' + sinSeg.segmentos[0].nombre, '1 119');

  t.seccion('3 · en pantalla, y lo que se recuerda');
  D.ST.dc.modo = 'pipeline';
  let h = D.html('dubcards');
  t.ok('la pestaña «Pipeline Studio» dentro de Dubcards, sin emojis', /data-dct="dcModo" data-v="pipeline">Pipeline Studio/.test(h) && /data-dct="plElegir"/.test(h) && /<input type="file" id="dctPlFiles" multiple/.test(h) && !EMOJI.test(h));
  t.ok('por segmento, cada fila se corrige; y quién va primero', /Episodio 119B/.test(h) && /data-dct="plFila" data-i="0" data-s="0" data-j="3" data-k="actor" value="GIOVANNY CRUZ"/.test(h)
    && /data-dct="plArriba" data-i="0">[\s\S]*?<option selected>LYLA<\/option>/.test(h) && /value="Lyla Lo Logra"/.test(h) && /No entran \(no son talentos\): 119A: VOCES \(TODOS\)/.test(h));
  ep.segmentos[0].filas[3].actor = 'Giovanni Cruz';
  const botones = [];
  D.cablear({ querySelector: () => null, querySelectorAll: () => [{ getAttribute: (k) => ({ 'data-dct': 'plBajar', 'data-i': '0' })[k] || null, set onclick(fn){ botones.push(fn); } }] }, 'dubcards');
  botones[0]();
  t.eq('descargar: el .xlsx con su nombre', V.bajados.length + ' ' + Object.keys(V.zips[0]).length + ' ' + V.avisos.slice(-1)[0], '1 8 Descargado: Lyla in the Loop_Ep 119_es_DubCard.xlsx');
  t.ok('con lo corregido, en mayúsculas', /GIOVANNI CRUZ/.test(de(V.zips[0], 'xl/worksheets/sheet1.xml')));
  {
    /* Otro día, el episodio siguiente de la serie. */
    const W = cargar({ ls: V.ls });
    W.D.ST.pl.cfg = W.D.plCfgCargar(); W.D.ST.pl.pausa = 0;
    const cap = n => CASTING.map(fl => (fl[0] === 'TITULO(inglés):' ? [fl[0], 'LYLA IN THE LOOP ' + n] : fl));
    W.D.ST.pl.entries.push({ name: 'DES_121.xlsm', file: archivo('DES_121.xlsm', cap('121')) }, { name: 'DES_120.xlsm', file: archivo('DES_120.xlsm', cap('120 AB')) });
    await W.D.plProcesar();
    const e = W.D.ST.pl.eps[0], m = W.D.ST.pl.cfg.memoria[e.clave];
    t.eq('se recuerdan el título traducido, la traducción y el talento corregido', m.trad + ' | ' + m.traductor + ' | ' + e.segmentos[0].filas.find(x => x.personaje === 'LOUIS').actor, 'Lyla Lo Logra | Nelly Sabogal | GIOVANNI CRUZ');
    const hechos = await W.D.plDescargarVarios(W.D.ST.pl.eps);
    t.eq('varios a la vez: un archivo por episodio, en orden', hechos.join(' · '), 'Lyla in the Loop_Ep 120_es_DubCard.xlsx · Lyla in the Loop_Ep 121_es_DubCard.xlsx');
  }
};
