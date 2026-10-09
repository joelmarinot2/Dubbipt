/* La lista de diálogos en idioma original · especificacion 01 y 02
 *
 * Llegó de sala «en_DIALOG_LIST-AFilipinoChristmas-…-QC.xlsx»: la lista que
 * manda Netflix antes de que exista el libreto traducido. Con ella se adelanta
 * el casting, y el capítulo queda marcado «sin libreto traducido».
 *
 *     IN-TIMECODE │ OUT-TIMECODE │ SOURCE │ TRANSCRIPTION │ DIALOGUE │ …
 *
 * Lo que protege esta prueba:
 *  · que un desglose de los de siempre NO se tome por una lista: un sí de más
 *    se salta el lector de desgloses;
 *  · que las líneas se cuenten sobre el parlamento entero y no fila a fila,
 *    que daría casi el doble y con eso se cita y se paga;
 *  · que la marca de «sin libreto traducido» no pise lo que dijo una persona.
 *
 * Las primeras filas están copiadas de la lista de verdad. Las de WALLA y las
 * de reacción llevan el texto que traen en ella: «[INDISTINCT]», «[REACTION]».
 */
'use strict';
const { montar, fuentes } = require('./ayuda');

exports.nombre = 'Lista de diálogos original: desglose para adelantar el casting';

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['/** Las doce palabras que hacen una línea.', '/** Las filas de las tablas del documento'],
  ['/* ═══ LISTA DE DIÁLOGOS ORIGINAL', '/* ═══ FIN DE LA LISTA DE DIÁLOGOS']
];
const EXPORTA = ['ldCab', 'ldCabecera', 'ldFilas', 'ldFps', 'ldTC', 'ldInfo', 'ldDeLibro', 'ldArmar', 'ldAvisar',
                 'libTraducido', 'libTraducidoParaGuardar', 'libTraducidoCargar', 'libTraducidoPintar', 'libTraducidoCambiar',
                 'verScript: () => script', 'verChars: () => chars', 'verIdx: () => charIdx',
                 'verPdf: () => [pdfDoc, pdfName, lastPdfBuf, numPages]', 'ponerEp: (e) => { currentEp = e; }'];

const CAB = ['IN-TIMECODE', 'OUT-TIMECODE', 'SOURCE', 'TRANSCRIPTION', 'DIALOGUE', 'ANNOTATIONS', 'TAGS',
             'SOURCE ONSCREEN', 'FN TREATMENT', 'FN POSITION'];
const HOJA = [
  CAB,
  ['00:00:10:06', '00:00:13:11', 'MAIN TITLE', 'Paskong\nPinoy', 'A Filipino\nChristmas', '', 'MAIN TITLE', 'OFF', '', ''],
  ['00:00:18:14', '00:00:21:20', 'GRAPHICS INSERTS', 'The Last New Year in Boracay', 'The Last New Year in Boracay', 'English', 'GRAPHICS INSERTS,FOREIGN DIALOG', 'OFF', '', ''],
  ['00:00:22:03', '00:00:24:16', 'TONTON', 'Boracay, here we come!', 'Boracay, here we come!', 'speaking English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:29:16', '00:00:32:03', 'TONTON', 'Whatever, bro. Nandito na naman tayo.', "Whatever, bro. We're here again.", 'speaking partial English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:32:05', '00:00:33:10', 'TONTON', 'Party time na.', "It's party time.", 'speaking partial English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:33:22', '00:00:35:10', 'ROSS', 'All thanks to Francis.', 'All thanks to Francis.', 'speaking English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:35:12', '00:00:36:15', 'TONTON', 'Exactly!', 'Exactly!', 'speaking English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:36:23', '00:00:38:23', 'TONTON', 'Magsasaya tayo para sa kaniya.', "We'll celebrate with him.", '', '', 'OFF', '', ''],
  ['00:00:39:06', '00:00:40:13', 'TONTON', 'When was the last time?', 'When was the last time?', 'speaking English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:41:04', '00:00:44:06', 'BENNY', 'Kami pa ni Jana last time ko dito sa Bora.', 'The last time I was in Bora,\nI was still with Jana.', 'speaking partial English', 'FOREIGN DIALOG', '', '', ''],
  ['00:00:45:10', '00:00:47:02', 'WALLA', '[INDISTINCT]', '[INDISTINCT]', '', 'INAUDIBLE', '', '', ''],
  ['00:00:47:12', '00:00:48:01', 'ROSS', '[REACTION]', '[REACTION]', '', '', '', '', ''],
  ['', '', '', '', '', '', '', '', '', ''],
  ['00:00:49:00', '00:00:50:23', 'CELIA', 'Salamat po.', '', '', '', '', '', '']
];
const RESUMEN = [
  ['CHARACTER NAME', 'DIALOG WORD COUNT', 'TRANSCRIPTION WORD COUNT', 'TOTAL WORD COUNT BY CHARACTER'],
  ['ALLY', '756', '985', '1011'], ['ALON', '252', '280', '306']
];
const INFO = [['SHOW TITLE', 'A Filipino Christmas'], ['EPISODE TITLE', 'Episode 1- The Last New Year in Boracay'], ['SEASON #', '1']];
const libro = (hojas) => ({ SheetNames: Object.keys(hojas), Sheets: hojas });

function armar(){
  const w = {};
  const boton = { textContent: '', title: '', clases: {}, classList: { toggle: (n, on) => { boton.clases[n] = !!on; } } };
  const diario = [];
  const M = montar(RECORTES, EXPORTA, {
    norm: undefined, charColor: () => '#5FC85A', NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']),
    XLSX: { utils: { sheet_to_json: (ws) => { if(ws === 'rota') throw new Error('hoja rota'); return ws; } } },
    pdfDoc: { viejo: true }, pdfName: 'viejo.pdf', lastPdfBuf: { viejo: true },
    pageData: { 1: 'viejo' }, occByChar: { A: 1 }, charMarks: { A: 1 }, tcIndex: [1],
    script: [{ viejo: true }], scriptByKey: { VIEJO: [0] }, chars: [{ viejo: true }], charIdx: { VIEJO: {} }, numPages: 99,
    window: w, document: { getElementById: (id) => (id === 'btnLibTrad' ? boton : null) },
    castAviso: (x) => diario.push('aviso ' + x),
    epDataUpsert: async (ep, show) => { diario.push('nube ' + ep + '/' + show); return true; },
    currentEp: null, fallo: (d) => diario.push('fallo ' + d),
    console: { warn: () => {}, log: () => {} }
  });
  return { M, w, boton, diario };
}

exports.pruebas = async function(t){
  const { M, w, boton, diario } = armar();

  t.seccion('1 · la cabecera: qué columna es cada cosa');
  t.eq('«IN-TIMECODE» se compara como «IN TIMECODE»', M.ldCab('IN-TIMECODE'), 'IN TIMECODE');
  t.eq('y una casilla con espacios y minúsculas, igual', M.ldCab('  Dialogue '), 'DIALOGUE');
  const cab = M.ldCabecera(HOJA);
  t.eq('la de Netflix: cada columna en su sitio',
       [cab.fila, cab.tc, cab.tcOut, cab.quien, cab.trans, cab.dial, cab.anot, cab.tags].join(','), '0,0,1,2,3,4,5,6');
  t.eq('con renglones de título encima, la encuentra más abajo', M.ldCabecera([['A Filipino Christmas'], [], CAB]).fila, 2);
  t.eq('la casilla ENTERA: «SOURCE ONSCREEN» delante no es la del personaje',
       M.ldCabecera([['IN-TIMECODE', 'SOURCE ONSCREEN', 'SOURCE', 'DIALOGUE']]).quien, 2);
  t.eq('la hoja del resumen de palabras no es una lista: «DIALOG WORD COUNT» no es DIALOGUE', M.ldCabecera(RESUMEN), null);
  t.eq('sin timecode de entrada, tampoco', M.ldCabecera([['SOURCE', 'DIALOGUE', 'TAGS']]), null);
  t.eq('sin ninguna columna de texto, tampoco', M.ldCabecera([['IN-TIMECODE', 'SOURCE', 'TAGS']]), null);
  t.eq('solo con la transcripción sí', M.ldCabecera([['IN-TIMECODE', 'SOURCE', 'TRANSCRIPTION']]).trans, 2);
  t.eq('un desglose de los de siempre, no', M.ldCabecera([['PERSONAJE', 'LOCUTOR', 'P', 'L'], ['NILA', 'ANA', 1, 3]]), null);
  t.eq('y la cabecera no se busca más allá de las doce primeras filas',
       M.ldCabecera(Array.from({ length: 12 }, () => ['x']).concat([CAB])), null);

  t.seccion('2 · las filas: quién, cuándo y qué dice');
  const filas = M.ldFilas(HOJA);
  t.eq('una por fila con algo, la vacía fuera', filas.length, 13);
  t.eq('el texto es el de DIALOGUE, en un solo renglón', filas[0].texto, 'A Filipino Christmas');
  t.eq('y lo original se guarda aparte', filas[4].orig + ' | ' + filas[4].texto, "Party time na. | It's party time.");
  t.eq('si DIALOGUE viene vacío, la transcripción', filas[12].texto, 'Salamat po.');
  t.eq('con su personaje y su timecode', filas[2].quien + ' ' + filas[2].tc + ' ' + filas[2].tcOut, 'TONTON 00:00:22:03 00:00:24:16');
  t.eq('y sus etiquetas', filas[1].tags, 'GRAPHICS INSERTS,FOREIGN DIALOG');
  t.eq('una hoja que no es lista, nulo', M.ldFilas(RESUMEN), null);

  t.seccion('3 · el timecode trae fotogramas, y no dice a cuántos por segundo');
  t.eq('hasta el fotograma 23, va a 24', M.ldFps(filas), 24);
  t.eq('con un 24, a 25', M.ldFps([{ tc: '00:00:01:24' }, { tc: '00:00:02:10' }]), 25);
  t.eq('con un 29, a 30', M.ldFps([{ tc: '00:00:01:29' }]), 30);
  t.eq('el de salida también cuenta', M.ldFps([{ tc: '00:00:01:10', tcOut: '00:00:02:24' }]), 25);
  t.eq('las milésimas no son fotogramas', M.ldFps([{ tc: '00:00:01,999' }]), 24);
  t.cerca('seis fotogramas a 24 son un cuarto de segundo', M.ldTC('00:00:10:06', 24), 10.25, 1e-9);
  t.cerca('y a 25, otra cosa', M.ldTC('00:00:10:06', 25), 10.24, 1e-9);
  t.eq('con la hora del rollo', M.ldTC('01:00:00:00', 24), 3600);
  t.cerca('con milésimas y coma, como los subtítulos', M.ldTC('00:01:56,159', 24), 116.159, 1e-9);
  t.eq('sin fotogramas', M.ldTC('00:00:10', 24), 10);
  t.eq('vacío, nulo', M.ldTC('', 24), null);
  t.eq('y lo que no es un timecode, nulo', M.ldTC('MAIN TITLE', 24), null);

  t.seccion('4 · ¿este Excel es una lista de diálogos?');
  const lista = M.ldDeLibro(libro({ 'Dialogue List': HOJA, 'Word Count Summary': RESUMEN, 'Project Info': INFO }));
  t.eq('el de Netflix sí: la hoja, las filas y los fotogramas', lista.hoja + ' ' + lista.filas.length + ' ' + lista.fps, 'Dialogue List 13 24');
  t.eq('y dice de qué programa es', lista.info.programa + ' · ' + lista.info.episodio, 'A Filipino Christmas · Episode 1- The Last New Year in Boracay');
  t.eq('aunque la lista no sea la primera hoja', M.ldDeLibro(libro({ 'Project Info': INFO, 'Word Count Summary': RESUMEN, 'Lista': HOJA })).hoja, 'Lista');
  t.eq('un desglose de los de siempre NO lo es', M.ldDeLibro(libro({ PLANILLA: [['PERSONAJE', 'LOCUTOR', 'P', 'L'], ['NILA', 'ANA', 1, 3]] })), null,
       'un sí de más se salta el lector de desgloses');
  t.eq('con la cabecera pero sin timecodes en las filas, tampoco',
       M.ldDeLibro(libro({ X: [CAB, ['', '', 'NILA', 'a', 'a'], ['', '', 'BETO', 'b', 'b'], ['00:00:01:00', '', 'ANA', 'c', 'c']] })), null,
       'la mitad de las filas tienen que traer timecode: una tabla cualquiera con esos títulos no es una lista');
  t.eq('con la cabecera y ninguna fila, tampoco', M.ldDeLibro(libro({ X: [CAB] })), null);
  t.eq('una hoja que no se puede leer no rompe: se mira la siguiente', M.ldDeLibro(libro({ Rota: 'rota', Lista: HOJA })).hoja, 'Lista');
  t.eq('sin libro, nulo', M.ldDeLibro(null), null);
  t.eq('sin la hoja de datos, el programa queda en blanco', M.ldDeLibro(libro({ L: HOJA })).info.programa, '');

  t.seccion('5 · el libreto y el desglose que salen de la lista');
  t.eq('se arma', M.ldArmar(lista, 'en_DIALOG_LIST.xlsx'), true);
  const sc = M.verScript(), ch = M.verChars(), ix = M.verIdx();
  t.eq('las filas seguidas del mismo personaje son UN parlamento',
       sc.map(b => b.key + '×' + b.lines.length).join(' '),
       'MAIN TITLE×1 GRAPHICS INSERTS×1 TONTON×3 ROSS×1 TONTON×3 BENNY×1 WALLA×1 ROSS×1 CELIA×1');
  t.cerca('con el timecode de su primera fila', sc[2].tcSec, 22 + 3 / 24, 1e-9);
  t.cerca('y el efectivo, que es el que sigue el libreto', sc[4].tcEff, 35 + 12 / 24, 1e-9);
  t.eq('cada fila es un renglón del parlamento', sc[2].lines.join(' | '), "Boracay, here we come! | Whatever, bro. We're here again. | It's party time.");
  t.eq('y cada renglón guarda su timecode: con ellos se sabrá quién hablaba cuando llegue el libreto',
       sc[2].tcs.map(x => x.toFixed(3)).join(' '), [22 + 3 / 24, 29 + 16 / 24, 32 + 5 / 24].map(x => x.toFixed(3)).join(' '));
  t.eq('tantos timecodes como renglones', sc.every(b => b.tcs.length === b.lines.length), true);
  t.eq('lo que va entre corchetes se deja como viene: el barrido de gestos lo entiende', sc[6].lines[0] + ' ' + sc[7].lines[0], '[INDISTINCT] [REACTION]');
  t.eq('el nombre, como está escrito', sc[1].display, 'GRAPHICS INSERTS');
  t.eq('los personajes, por líneas y luego por nombre',
       ch.map(c => c.display + '=' + c.totalInts).join(' '),
       'ROSS=2 TONTON=2 BENNY=1 CELIA=1 GRAPHICS INSERTS=1 MAIN TITLE=1 WALLA=1');
  t.eq('TONTON: dos parlamentos de once y diez palabras son dos líneas, no seis', ix.TONTON.totalInts, 2,
       'fila a fila saldría una línea por subtítulo: seis');
  t.ok('sin talento todavía, con su color y sus páginas', ix.TONTON.talent === '' && ix.TONTON.color === '#5FC85A' && ix.TONTON.pages[0].p === 1 && ix.TONTON.pages[0].ints === 2);
  t.eq('lo crudo, para poder deshacer fusiones', w._charsRaw.length, 7);
  t.eq('sin PDF: no hay página que pintar, y lo de antes se ha ido', JSON.stringify(M.verPdf()), JSON.stringify([null, 'en_DIALOG_LIST.xlsx', null, 1]));
  t.ok('el libreto queda publicado', w._script === sc && w._adFormat === false);
  /* Un parlamento largo: treinta palabras en tres filas son tres líneas. */
  const larga = { fps: 24, filas: [
    { tc: '00:00:01:00', quien: 'ANA', texto: 'uno dos tres cuatro cinco seis siete ocho nueve diez' },
    { tc: '00:00:03:00', quien: 'ANA', texto: 'uno dos tres cuatro cinco seis siete ocho nueve diez' },
    { tc: '00:00:05:00', quien: 'ANA', texto: 'uno dos tres cuatro cinco seis siete ocho nueve diez' },
    { tc: '', quien: '', texto: 'y sigue sin nombre' },
    { tc: '00:00:09:00', quien: 'Beto', texto: 'Hola.' } ] };
  M.ldArmar(larga, 'x.xlsx');
  t.eq('treinta y cuatro palabras seguidas son tres líneas', M.verIdx().ANA.totalInts, 3);
  t.eq('una fila sin nombre es del que venía hablando', M.verScript()[0].lines.length, 4);
  t.eq('el nombre se pasa a mayúsculas, como en los desgloses', M.verChars().map(c => c.display).join(','), 'ANA,BETO');
  M.ldArmar({ filas: [{ tc: '', quien: '', texto: 'nadie delante' }, { tc: '00:00:01:00', quien: 'ANA', texto: 'Hola.' }] }, 'x.xlsx');
  t.eq('un texto sin nadie delante no se le da a nadie', M.verScript().map(b => b.key + ':' + b.lines.join('')).join(' '), 'ANA:Hola.');
  t.cerca('y sin decirle los fotogramas, los saca de las filas', M.verScript()[0].tcSec, 1, 1e-9);

  t.seccion('6 · «sin libreto traducido»: lo marca la lista, y lo cambia una persona');
  t.eq('al armarse desde la lista, queda SIN libreto traducido', w._libTraducido, false);
  t.eq('y así se pregunta', M.libTraducido(), false);
  w._libTraducido = true;
  M.ldArmar(lista, 'en_DIALOG_LIST.xlsx');
  t.eq('pero si una persona ya dijo que sí, volver a leer la lista no lo pisa', w._libTraducido, true,
       'la lista se vuelve a leer sola cuando cambia en la nube');
  w._libTraducido = null;
  t.eq('lo que nadie ha dicho cuenta como traducido: los capítulos de siempre', M.libTraducido(), true);
  t.eq('y se guarda como «nadie lo ha dicho»', M.libTraducidoParaGuardar(), null);
  w._libTraducido = false; t.eq('el no se guarda como no', M.libTraducidoParaGuardar(), false);
  w._libTraducido = true;  t.eq('y el sí como sí', M.libTraducidoParaGuardar(), true);
  t.eq('al abrir un capítulo: el no', M.libTraducidoCargar(false), false);
  t.ok('y el botón lo dice, en ámbar', boton.textContent === '🌐 Sin libreto traducido' && boton.clases['sin-libreto'] === true && /no ha llegado/.test(boton.title));
  t.eq('el sí', M.libTraducidoCargar(true), true);
  t.ok('y el botón vuelve', boton.textContent === '📄 Con libreto traducido' && boton.clases['sin-libreto'] === false);
  t.eq('lo que venga raro de la nube es «nadie lo ha dicho»', M.libTraducidoCargar('no'), null);
  t.eq('y lo que no viene, también', M.libTraducidoCargar(undefined), null);
  /* Marcarlo a mano. */
  diario.length = 0;
  t.eq('pulsar en un capítulo de siempre lo marca SIN libreto', await M.libTraducidoCambiar(), false);
  t.ok('se avisa', diario.some(x => /^aviso 🌐 Marcado SIN libreto traducido/.test(x)));
  t.ok('y el botón pasa a ámbar en el momento, sin esperar a volver a entrar', boton.textContent === '🌐 Sin libreto traducido' && boton.clases['sin-libreto'] === true);
  t.ok('sin capítulo guardado no hay nada que subir', !diario.some(x => /^nube/.test(x)));
  M.ponerEp({ id: 'ep1', showId: 'sh1' });
  diario.length = 0;
  t.eq('volver a pulsar lo marca CON libreto', await M.libTraducidoCambiar(), true);
  t.ok('y con capítulo, viaja a la nube', diario.includes('nube ep1/sh1') && diario.some(x => /^aviso 📄 Marcado CON libreto traducido/.test(x)));
  t.eq('el botón, al día', boton.textContent, '📄 Con libreto traducido');
  t.eq('sin botón en pantalla, pintar no rompe', (() => { const { M: M2 } = armar(); return typeof M2.libTraducidoPintar(); })(), 'boolean');
  /* El aviso de lo leído. */
  M.ldArmar(lista, 'x.xlsx');
  t.eq('al leerla se dice qué es y cómo queda',
       M.ldAvisar(lista), '🌐 Lista de diálogos original de «A Filipino Christmas» · 9 parlamentos de 7 personajes · queda SIN libreto traducido');

  t.seccion('7 · por dónde entra y por dónde viaja');
  const F = fuentes().map(f => f.src).join('\n');
  const iLista = F.indexOf("const lista = (typeof ldDeLibro === 'function') ? ldDeLibro(wb) : null;"), iDes = F.indexOf('parseDesglose(wb);', iLista);
  t.ok('al leer un Excel, primero se mira si es una lista; si no, el lector de desgloses',
       iLista > 0 && iDes > iLista && iDes - iLista < 500 && /if\(lista\)\{\s+ldArmar\(lista, name\);/.test(F));
  t.ok('la marca se guarda con el capítulo en la nube', /const data = \{ name:\(currentEp&&currentEp\.name\)\|\|'', chars, script, numPages, tcIndex,\s+traducido: \(typeof libTraducidoParaGuardar === 'function'\) \? libTraducidoParaGuardar\(\) : null,/.test(F));
  t.ok('y en la copia de este equipo', /data:\{ _epId: epId, chars, script, numPages, tcIndex, pdfName, xlsName: xlsFileName,\s+traducido: /.test(F));
  t.ok('y vuelve al abrirlo', /try\{ libTraducidoCargar\(d\.traducido\); \}catch\(e\)\{\}/.test(F));
  t.ok('al abrir otro capítulo, la marca del anterior no vale',
       /async function openEpisode\(id\)\{\s+LDB\.browse = false;[^\n]*\s+window\._libTraducido = null;/.test(F));
  t.ok('ni al cargar un archivo nuevo, por cualquiera de las tres puertas',
       (F.match(/window\._libTraducido = null;/g) || []).length >= 4);
  t.ok('el botón está en la barra y solo se enseña en casting',
       /id="btnLibTrad" style="display:none" onclick="libTraducidoCambiar\(\)"/.test(fuentesHtml())
       && /\['btnImpDes','btnImpPla','btnDcast','btnMeta','btnGestos','btnBaseTal','btnLibTrad'[,\]]/.test(F));
  t.ok('y al entrar en casting se pone al día', /if\(m === 'casting' && esteEp\)\{\s+try\{ libTraducidoPintar\(\); \}/.test(F));
  t.ok('guardar un capítulo que sale de la lista no pregunta por el PDF: ya trae su libreto',
       /if\(esNuevo && !lastPdfBuf && lastXlsBuf && !\(script && script\.length\)\)\{/.test(F));
  t.ok('y las hojas impresas dicen que el casting va adelantado',
       /const adelantado = \(typeof libTraducido === 'function'\) && !libTraducido\(\);/.test(F)
       && /\(adelantado \? '<div class="adelantado">Casting adelantado · este capítulo todavía no tiene el libreto traducido<\/div>' : ''\)/.test(F));
};

/** El HTML entero, para lo que no vive en un <script>. */
function fuentesHtml(){
  return require('fs').readFileSync(require('./ayuda').INDEX, 'utf8');
}
