/* Guion de Word en TABLA · especificacion 01
 *
 * Llego de sala «01 Capitulo - Cuidad del sol.docx»: una tabla de tres
 * columnas, un renglon por subtitulo.
 *
 *     00:14:21,000 │ Xu Shaojie │ Son numeros de estafas. No los llame.
 *     00:14:23,240 │            │ Mire el folleto
 *     00:14:28,799 │            │ y lo hablamos en privado.
 *     00:14:33,639 │ Xu Shaojie │ Abuela,                    <- empieza otro
 *
 * El lector de Word que ya habia busca nombres en MAYUSCULAS al principio del
 * renglon, asi que con este guion no encontraba NI UN personaje: los nombres
 * van en minusculas y en su propia casilla.
 *
 * Las tres reglas las dijo quien lo usa: manda la segunda columna, los rotulos
 * son graficas y no continuacion de nadie, y una linea son doce palabras.
 *
 * Los datos de estas pruebas estan copiados del guion de verdad, filas 3 a 11 y
 * 399 a 408.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Guion de Word en tabla: timecode, personaje y lo que dice';

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'],
  ['/* ═══ GUION DE WORD EN TABLA', '// Cargar un guion en Word (.docx)']
];
const EXPORTA = ['docxTC', 'docxLineas', 'docxFilas', 'docxEsRotulo', 'docxDeTabla',
                 'verScript: () => script', 'verChars: () => chars', 'verIdx: () => charIdx'];

/* Un documento de mentira con lo justo que miran docxFilas y docxDeTabla:
   querySelectorAll y textContent. Nada de navegador. */
const celda = (parrafos) => ({
  querySelectorAll: () => parrafos.map(t => ({ textContent: t })),
  textContent: parrafos.join(' ')
});
const fila = (tc, quien, parrafos) => ({
  querySelectorAll: () => [celda(tc ? [tc] : []), celda(quien ? [quien] : []), celda(parrafos)]
});
const documento = (filas) => ({ querySelectorAll: (sel) => (sel === 'tr' ? filas : []) });

function armar(filas){
  const M = montar(RECORTES, EXPORTA, {
    norm: undefined, charColor: () => '#5FC85A', NO_REC: new Set(['X', 'ORIGINAL']),
    libMsg: () => {},
    pdfDoc: null, pdfName: '', lastPdfBuf: null, xlsFileName: null,
    pageData: {}, occByChar: {}, charMarks: {}, tcIndex: [],
    script: [], scriptByKey: {}, chars: [], charIdx: {}, numPages: 0,
    window: {}, console: { warn: () => {}, log: () => {} }
  });
  const ok = M.docxDeTabla(documento(filas), 'guion.docx');
  return { M: M, ok: ok, script: M.verScript(), chars: M.verChars(), idx: M.verIdx() };
}

/* El tramo de Xu Shaojie, copiado del guion. */
const XU = [
  fila('00:14:21,000', 'Xu Shaojie', ['Son números de estafas. No los llame.']),
  fila('00:14:23,240', '', ['Mire el folleto']),
  fila('00:14:24,360', '', ['contra el fraude']),
  fila('00:14:26,200', '', ['que le envié.']),
  fila('00:14:27,080', '', ['Si no entiende algo,']),
  fila('00:14:28,039', '', ['llámeme']),
  fila('00:14:28,799', '', ['y lo hablamos en privado.']),
  fila('00:14:33,639', 'Xu Shaojie', ['Abuela,']),
  fila('00:14:35,799', '', ['sobre el asunto del seguro médico,']),
  fila('00:14:37,200', '', ['tengo que explicárselo a usted en persona.'])
];

/* Y el de la camarera con el rótulo de Chodzong en medio. */
const ROTULO = [
  fila('00:02:18,000', 'Camarera', ['Claro, ya voy.']),
  fila('00:02:19,280', '', ['Cuatro platos de fideos tibetanos.']),
  fila('', '', ['Chodzong', 'Hija mayor de Tubten']),
  fila('00:02:21,960', 'Chodzong', ['Una jarra de té de mantequilla.']),
  fila('00:02:24,319', '', ['Aquí tienes tu cambio.']),
  fila('00:02:26,719', '', ['Señora.']),
  fila('00:02:27,840', '', ['¡Aquí están los fideos calientes!']),
  fila('00:02:30,199', '', ['Coman con calma.'])
];

exports.pruebas = function(t){

  t.seccion('1 · el timecode viene con milisegundos, no con fotogramas');
  const M0 = armar(XU).M;
  t.cerca('se leen enteros', M0.docxTC('00:01:56,159'), 116.159, 1e-9,
          'el motor de la casa devuelve nada con la coma, y por el otro camino '
          + 'se deja los 159 ms, que son cuatro fotogramas');
  t.cerca('con punto en vez de coma, igual', M0.docxTC('00:01:56.159'), 116.159, 1e-9);
  t.cerca('sin milisegundos sigue valiendo', M0.docxTC('00:01:56'), 116, 1e-9);
  t.cerca('minutos y segundos sueltos, también', M0.docxTC('02:08'), 128, 1e-9);
  t.eq('y un número suelto NO es un timecode', M0.docxTC('2031'), null,
       'el guion trae cuatro así, mal escritos: valen menos que un timecode falso');
  t.eq('ni una casilla vacía', M0.docxTC(''), null);

  t.seccion('2 · una línea son doce palabras');
  t.eq('doce palabras, una línea', M0.docxLineas('una dos tres cuatro cinco seis siete ocho nueve diez once doce'), 1);
  t.eq('trece, dos', M0.docxLineas('una dos tres cuatro cinco seis siete ocho nueve diez once doce trece'), 2);
  t.eq('veinticuatro, dos', M0.docxLineas(new Array(24).fill('x').join(' ')), 2);
  t.eq('una acotación sola también se graba', M0.docxLineas('(RÍE)'), 1);
  t.eq('y una casilla vacía no baja de una', M0.docxLineas(''), 1);

  t.seccion('3 · la segunda columna manda');
  const a = armar(XU);
  t.ok('lo reconoce como guion en tabla', a.ok);
  t.eq('dos parlamentos, no diez', a.script.length, 2,
       'las filas sin nombre son el MISMO personaje; el nombre repetido empieza otro');
  t.eq('el primero trae sus siete renglones', a.script[0].lines.length, 7);
  t.eq('y el segundo los otros tres', a.script[1].lines.length, 3);
  t.cerca('con su timecode, milisegundos incluidos', a.script[0].tcSec, 861.000, 1e-9);
  t.cerca('y el segundo con el suyo', a.script[1].tcSec, 873.639, 1e-9);
  t.eq('el nombre va en MAYÚSCULAS', a.script[0].display, 'XU SHAOJIE',
       'como en los desgloses de Excel, para que casen solos');

  t.seccion('4 · las líneas se cuentan con el parlamento entero');
  /* Contarlas fila a fila daria una linea por subtitulo -diez aqui-, que es
     otra cosa y bastante mas cara. */
  const xu = a.idx[Object.keys(a.idx).find(k => k === 'XU SHAOJIE')];
  t.ok('está el personaje', !!xu, Object.keys(a.idx).join(', '));
  t.eq('sus líneas salen del texto junto, no de los renglones', xu.totalInts, 5,
       'son 26 y 14 palabras: 3 líneas y 2. Fila a fila serían 10, el doble');

  t.seccion('5 · un rótulo no es la continuación de quien hablaba');
  const b = armar(ROTULO);
  const nombres = new Set(['CHODZONG', 'CAMARERA']);
  t.ok('lo reconoce por el nombre que lo encabeza',
       b.M.docxEsRotulo({ tc: '', quien: '', parrafos: ['Chodzong', 'Hija mayor de Tubten'] }, nombres));
  t.ok('la canción sin timecode NO es un rótulo',
       !b.M.docxEsRotulo({ tc: '', quien: '', parrafos: ['el sol y la luna brillan con esplendor.'] }, nombres),
       'viene igual de pelada —sin timecode y sin personaje— y es continuación: '
       + 'meterla en GRÁFICA partiría la canción');
  t.ok('una fila con personaje tampoco',
       !b.M.docxEsRotulo({ tc: '', quien: 'Chodzong', parrafos: ['Chodzong'] }, nombres));

  const g = b.idx['GRAFICA'];
  t.ok('el rótulo es de GRÁFICA', !!g, Object.keys(b.idx).join(', '));
  t.eq('con su texto entero', b.script.find(x => x.key === 'GRAFICA').lines.join(' / '),
       'Chodzong / Hija mayor de Tubten');
  t.eq('a la camarera se le queda lo suyo y nada más',
       b.script[0].lines.join(' / '),
       'Claro, ya voy. / Cuatro platos de fideos tibetanos.',
       'si el rótulo cayera aquí, el actor tendría que leer «Hija mayor de Tubten»');
  t.eq('y lo de después del rótulo es de CHODZONG, que es quien lo dice',
       b.script[b.script.length - 1].display, 'CHODZONG');
  t.eq('con sus cinco renglones', b.script[b.script.length - 1].lines.length, 5);

  t.seccion('6 · lo que NO es un guion en tabla se deja pasar');
  /* Una tabla de portada o de tiempos no puede secuestrar el lector: si se
     devuelve true, el camino de siempre -nombres en MAYUSCULAS- no se prueba. */
  t.eq('una tabla de dos filas, no', armar([
    fila('', 'Título', ['Ciudad del sol']),
    fila('', 'Duración', ['48 min'])
  ]).ok, false);
  t.eq('y una tabla larga donde casi nadie habla, tampoco', armar(
    new Array(20).fill(0).map((_, i) => fila('', '', ['renglón ' + i]))
  ).ok, false);
};
