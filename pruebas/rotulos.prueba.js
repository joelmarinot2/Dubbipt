/* Los rótulos de pantalla · especificacion 01
 *
 * Llego de sala, con el guion delante: el personaje GRAFICA -el que lee lo que
 * sale ESCRITO en pantalla- tenia sus catorce parlamentos pero todos VACIOS.
 *
 * El motivo es que un rotulo casi siempre lleva dentro un nombre:
 *
 *     01:05:21
 *     GRAFICA
 *     GORDA NAN            <- el rotulo... y tambien un personaje del reparto
 *     MAMA DE BIG JOHN
 *
 * GORDA NAN se reconocia como cabecera nueva, se llevaba el renglon, y GRAFICA
 * se quedaba con la caja vacia. Y de propina le colgaba a GORDA NAN un
 * parlamento que no dice.
 *
 * Esta prueba corre el scanPdf DE VERDAD -con un pdf.js de mentira que devuelve
 * los trozos con sus coordenadas- sobre paginas copiadas LETRA POR LETRA del
 * guion que llego de sala, alturas incluidas. Asi se prueba tambien el
 * agrupado de renglones por altura, que antes no probaba nadie.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Los rótulos de pantalla: un nombre dentro de un rótulo no es quien habla';

const RECORTES = [
  ['const TC_RE = ', 'function norm(s){'],
  ['function norm(s){', 'function esc(s){'],
  ['const LAT_STROKE = {', 'const CUE_RE'],
  ['const CUE_RE', 'function headIsAllName(t){'],
  ['function headIsAllName(t){', 'function showScanMissing(){'],
  ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'],
  ['function segsFromRange(line, from, to){', 'function rebuild(){']
];

/* Paginas del guion real. Cada renglon es [x, altura, texto]; las alturas son
   las del PDF, para que el agrupado por altura sea el de verdad.
   No se copia el numero de pagina impreso: el documento de mentira tiene dos
   paginas y el guion las numera 32 y 40, asi que el filtro de numeros de
   pagina no cuadraria. Eso ya lo prueba otra cosa; aqui estorba. */
const PAG32 = [
  [90, 707, '01:05:20'],
  [90, 671, 'CHARLOTTE'],
  [90, 635, 'Están todos aquí. Tienes suerte de que haya tres.'],
  [90, 562, '01:05:21'],
  [90, 526, 'GRÁFICA'],
  [90, 490, 'GORDA NAN'],
  [90, 454, 'MAMÁ DE BIG JOHN'],
  [90, 382, '01:05:23'],
  [90, 345, 'HENRY'],
  [90, 309, '¡Abuela!'],
  [90, 237, '01:05:24'],
  [90, 201, 'GORDA NAN'],
  [90, 165, 'Hola.']
];

const PAG40 = [
  [90, 707, '01:07:01'],
  [90, 671, 'GRÁFICA'],
  [90, 635, 'CHAT BOSH'],
  [90, 562, '01:07:01'],
  [90, 526, 'GRÁFICA'],
  [90, 490, 'BIG JOHN'],
  [90, 454, 'EL TAXI LLEGARÁ EN 10 MINUTOS. FISHER, UNIDOS.'],
  [90, 382, '01:07:03'],
  [90, 345, 'GRÁFICA'],
  [90, 309, 'CHARLOTTE'],
  [90, 273, 'YA QUIERO IR. ¡NUNCA HE IDO A MONTECARLO!']
];

/* Un rotulo de chat con DOS remitentes seguidos. Esta pagina NO esta copiada
   del guion: se arma aqui porque el encadenado hay que probarlo y en las dos
   paginas de arriba cada rotulo solo lleva un nombre. Sin encadenar, al quitar
   el primero el segundo se quedaria como cabecera buena. */
const PAG_DOS_NOMBRES = [
  [90, 707, '01:09:00'],
  [90, 671, 'GRÁFICA'],
  [90, 635, 'BIG JOHN'],
  [90, 598, 'CHARLOTTE'],
  [90, 562, 'VAMOS TARDE'],
  [90, 490, '01:09:04'],
  [90, 454, 'HENRY'],
  [90, 418, 'Ya voy.']
];

/* Dos personajes de verdad, uno detras de otro, con su dialogo EN EL MISMO
   renglon. Aqui la segunda cabecera SI es una cabecera, y no se puede tocar. */
const PAG_DIALOGO = [
  [90, 707, '01:08:00'],
  [90, 671, 'BIG JOHN: Hola.'],
  [90, 635, 'CHARLOTTE: Adiós.']
];

const REPARTO = ['GRÁFICA', 'BIG JOHN', 'CHARLOTTE', 'GORDA NAN', 'HENRY'];

function fingePdf(paginas){
  return {
    numPages: paginas.length,
    getPage: (n) => Promise.resolve({
      getTextContent: () => Promise.resolve({
        items: paginas[n - 1].map(([x, y, t]) =>
          ({ str: t, transform: [10, 0, 0, 10, x, y], width: t.length * 5 }))
      })
    })
  };
}

async function escanear(paginas, reparto){
  const M = montar(RECORTES, ['scanPdf', 'verPageData: () => pageData'], {
    pdfDoc: fingePdf(paginas), numPages: paginas.length,
    chars: (reparto || REPARTO).map(d => ({ key: d, display: d })),
    occByChar: {}, pageData: {}, charMarks: {}, tcIndex: [], window: {},
    libMsg: () => {}, DDL_UI: { progress: () => {}, progressReset: () => {} },
    console: { warn: () => {}, log: () => {} },
    showScanMissing: () => {}, buildScript: () => {},
    autoDesgloseFromScan: () => {}, renderPlanilla: () => {}, updatePopup: () => {}
  });
  await M.scanPdf();
  return M.verPageData();
}

/** Quien se reconoce como cabecera, en orden de renglón. */
const quienes = (p) => p.marks.map(m => m.key);

exports.pruebas = async function(t){

  t.seccion('1 · el nombre que hay DENTRO de un rótulo no es quien habla');
  const p32 = (await escanear([PAG32]))[1];
  t.eq('en la página 32 las cabeceras son estas y no más', quienes(p32).join(' · '),
       'CHARLOTTE · GRÁFICA · HENRY · GORDA NAN',
       'si GORDA NAN aparece dos veces, la de dentro del rótulo se ha colado');
  t.eq('y son exactamente cuatro cabeceras', p32.marks.length, 4);
  t.eq('la del rótulo, la que va pegada debajo de GRÁFICA, no cuenta',
       p32.marks.filter(m => m.lineIdx === 6).length, 0,
       'ese renglón es «GORDA NAN», y es lo que PONE el rótulo, no quien lo dice');
  t.eq('pero GORDA NAN conserva el suyo, el de verdad',
       p32.marks.filter(m => m.key === 'GORDA NAN').length, 1);

  t.seccion('2 · aunque el rótulo lleve dos nombres seguidos');
  const p40 = (await escanear([PAG40]))[1];
  t.eq('en la página 40 todo son rótulos', quienes(p40).join(' · '),
       'GRÁFICA · GRÁFICA · GRÁFICA',
       'BIG JOHN y CHARLOTTE salen DENTRO de los rótulos: no hablan aquí');
  t.eq('y son tres', p40.marks.length, 3);

  t.seccion('3 · un rótulo con dos nombres seguidos: ninguno de los dos habla');
  const pdn = (await escanear([PAG_DOS_NOMBRES]))[1];
  t.eq('solo el rótulo y quien habla después', quienes(pdn).join(' · '),
       'GRÁFICA · HENRY',
       'si sale CHARLOTTE, es que solo se quitó el primer nombre y el segundo '
       + 'se coló: hay que seguir quitando mientras vengan pegados');

  t.seccion('4 · dos personajes de verdad seguidos siguen siéndolo');
  /* La regla solo se aplica cuando la cabecera de arriba se queda SIN NADA
     detrás. Si lleva su diálogo en el mismo renglón, la de abajo es de verdad
     y no se puede tocar: si no, se perderían parlamentos por todas partes. */
  const pd = (await escanear([PAG_DIALOGO]))[1];
  t.eq('las dos cuentan', quienes(pd).join(' · '), 'BIG JOHN · CHARLOTTE',
       'llevan su diálogo pegado, así que ninguna se queda vacía');

  t.seccion('5 · y el libreto que sale de ahí');
  const pdTodo = await escanear([PAG32, PAG40]);
  const win = {};
  const M2 = montar([
    ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'],
    ['const CUE_RE', 'function headIsAllName(t){'],
    ['function stripPageNum(t, p){', 'let script = [];'],
    ['const AD_ROW', 'function buildScriptAD(){'],
    ['function buildScript(){', 'let pronIdx = {};']
  ], ['buildScript'], {
    pageData: pdTodo, numPages: 2, script: [], scriptByKey: {},
    charIdx: Object.fromEntries(REPARTO.map(k => [k, { display: k }])),
    chars: REPARTO.map(k => ({ key: k })), aliasOf: {},
    buildScriptAD: () => {}, buildPronIndex: () => {},
    window: win, console: { warn: () => {}, log: () => {} }
  });
  M2.buildScript();
  const deQuien = (k) => win._script.filter(b => b.key === k).map(b => b.lines.join(' / '));

  const graficas = deQuien('GRÁFICA');
  t.eq('el rótulo del nombre llega entero',
       graficas.some(x => x === 'GORDA NAN / MAMÁ DE BIG JOHN'), true,
       'esto es LO QUE LLEGÓ DE SALA: esa caja salía vacía · ' + JSON.stringify(graficas));
  t.eq('y el del chat, también',
       graficas.some(x => x === 'BIG JOHN / EL TAXI LLEGARÁ EN 10 MINUTOS. FISHER, UNIDOS.'), true,
       JSON.stringify(graficas));
  t.eq('ninguna GRÁFICA se queda vacía', graficas.filter(x => !x).length, 0,
       JSON.stringify(graficas));

  t.eq('a GORDA NAN no se le cuelga lo que dice el rótulo',
       deQuien('GORDA NAN').join(' | '), 'Hola.',
       'antes se le colgaba «MAMÁ DE BIG JOHN», un parlamento que no dice');
  t.eq('ni a BIG JOHN el del chat',
       deQuien('BIG JOHN').length, 0,
       'en estas dos páginas BIG JOHN no habla: solo sale escrito');
};
