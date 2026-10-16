/* La lista de diálogos en PDF · especificacion 01, LIB-25b
 *
 * Llegó de sala «Centauro_FinalTable_F0007_Final_DialogueList.pdf», la
 * «As-Broadcast Dialogue List» de Pixelogic. Lo que protege esta prueba, con
 * la geometría de ese PDF (las x y las y de sus palabras): se reconoce por la
 * cabecera de las columnas; cada parlamento es de su timecode, también lo que
 * pasa a la página siguiente; cabeceras y pies de página no cuentan; el texto
 * es la traducción sin notas del traductor y sin coreano; GRÁFICA, marcas y
 * varias voces; y que un PDF que no lo es sigue por el lector de siempre.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Libreto: la lista de diálogos en PDF (Pixelogic)';

/* Una palabra en x, y (de arriba abajo). */
const w = (x, y, s) => ({ x: x, y: y, s: s });
/* Las columnas del PDF de sala: TIMECODE 68, CHARACTER 137, ORIGINAL 237, ENGLISH 365. */
const cabecera = (p) => [w(63, 47, '“Final'), w(93, 47, 'Table”'), w(420, 47, 'As-Broadcast'), w(477, 47, 'Dialogue'), w(516, 47, 'List'),
  w(505, 60, 'Page'), w(527, 60, String(p)), w(63, 61, 'Episode'), w(108, 61, 'Episode'), w(149, 61, '7'), w(158, 61, '-'), w(165, 61, 'Final')];
const pie = () => [w(63, 780, 'Prepared'), w(110, 780, 'by:'), w(430, 780, 'October'), w(470, 780, '13,'), w(490, 780, '2026'), w(63, 794, 'Pixelogic')];
const linea = (x, y, texto) => texto.split(' ').map((s, i, a) => w(x + a.slice(0, i).join(' ').length * 5, y, s));

const PAG1 = [].concat(cabecera(1), [w(226, 97, 'DIALOGUE'), w(328, 97, 'LIST')],
  [w(68, 143.5, 'TIMECODE'), w(137, 143.5, 'CHARACTER'), w(237, 143.5, 'ORIGINAL'), w(291, 143.5, 'DIALOGUE'), w(365, 143.5, 'ENGLISH'), w(413, 143.5, 'TRANSLATION')],
  [w(68, 166, '00:00:26:20'), w(137, 166, 'MAIN'), w(172, 166, 'TITLE'), w(237, 169, '파이널'), w(273, 169, '테이블'), w(365, 165, 'FINAL'), w(402, 165, 'TABLE')],
  /* «(through speakers)» queda un punto más arriba que el timecode: es de su fila. */
  linea(237, 244, '(through speakers)'), linea(365, 244, '(through speakers) Hello, everyone!'), [w(68, 245, '00:00:46:01'), w(137, 245, 'CAPTAIN'), w(192, 245, 'COOK')],
  linea(365, 259, "I'm Captain Cook, your K-food"), linea(237, 262, '안녕하십니까, 더'), linea(365, 273, 'ambassador on The Table: K-Chef!'),
  /* La nota del traductor, sangrada y entre paréntesis. */
  linea(411, 295, '(K-food ambassador ='), linea(411, 311, 'note, phrasal consistency)'),
  [w(68, 340, '00:00:52:18'), w(137, 340, 'WALLA')], linea(237, 340, '<audience in hall>'), linea(365, 340, '<audience in hall> <cheering>'),
  [w(68, 380, '00:01:09:22'), w(137, 380, 'STUDENT'), w(180, 380, '7A'), w(195, 380, '/')], linea(137, 394, 'STUDENT 7B'), linea(365, 380, 'Hi, chef!'),
  [w(68, 420, '00:01:15:07'), w(137, 420, 'OK-SEON'), w(180, 420, '/'), w(190, 420, 'SU-')], linea(137, 434, 'IN (shouting)'), linea(365, 420, '(shouting) Go, go!'),
  [w(68, 460, '00:01:23:15'), w(137, 460, 'HAN')], linea(237, 460, '깨끗한 물을'), linea(365, 460, "It's also known for its clean"),
  pie());
/* La página 2 empieza con lo que le quedaba a HAN, sin timecode. */
const PAG2 = [].concat(cabecera(2), linea(237, 90, '청정 지역입니다'), linea(365, 90, 'water. (Haeon = fictional county)'),
  linea(411, 105, '(source - ep103; 01:05:12:11 Final)'),
  [w(68, 130, '00:02:20:20'), w(137, 130, 'HAN')], linea(365, 130, '(mouth full) Mmm. <chews>'),
  [w(68, 160, '00:02:23:09'), w(137, 160, 'NARRATIVE'), w(200, 160, 'TITLE')], linea(365, 160, 'ROUND 3'),
  [w(68, 200, '01:06:05:09'), w(137, 200, 'LAST'), w(165, 200, 'FRAME'), w(200, 200, 'OF')], linea(137, 214, 'PICTURE'),
  pie());

exports.pruebas = async function(t){
  const M = montar([['/* ═══ LISTA DE DIÁLOGOS ORIGINAL', '/* ═══ ¿CON LIBRETO TRADUCIDO O SIN ÉL?']],
    ['ldPdfFilas', 'ldPdfColumnas', 'ldPdfSinNotas', 'ldPdfVoces', 'ldDePdf', 'ldFps', 'ldTC'], { XLSX: {}, norm: (s) => String(s).toUpperCase(), libMsg: () => {} });

  t.seccion('1 · se reconoce por la cabecera de las columnas');
  t.eq('las columnas: timecode, personaje, original e inglés', JSON.stringify(M.ldPdfColumnas(PAG1)), '{"y":143.5,"tc":68,"quien":137,"orig":237,"dial":365}');
  t.eq('una página sin esa cabecera, nada', M.ldPdfColumnas(PAG2), null);
  t.eq('un PDF que no es una lista, nada (sigue el lector de siempre)', M.ldPdfFilas([{ p: 1, pal: [w(60, 100, 'JUAN:'), w(100, 100, 'Hola')] }]), null);

  t.seccion('2 · las filas');
  const r = M.ldPdfFilas([{ p: 1, pal: PAG1 }, { p: 2, pal: PAG2 }]);
  const ver = (f) => f.tc + ' ' + f.quien + ' «' + f.texto + '»';
  t.eq('el programa y el capítulo, de la cabecera de la página', JSON.stringify(r.info), '{"programa":"Final Table","episodio":"Episode 7 - Final"}');
  t.eq('MAIN TITLE es GRÁFICA', ver(r.filas[0]), '00:00:26:20 GRÁFICA «FINAL TABLE»');
  t.eq('la traducción entera, con su acotación y sin la nota del traductor ni el coreano', ver(r.filas[1]), "00:00:46:01 CAPTAIN COOK «(through speakers) Hello, everyone! I'm Captain Cook, your K-food ambassador on The Table: K-Chef!»");
  t.eq('el original, aparte', r.filas[1].orig, '(through speakers) 안녕하십니까, 더');
  t.eq('WALLA, como viene', ver(r.filas[2]), '00:00:52:18 WALLA «<audience in hall> <cheering>»');
  t.eq('a dos voces: el parlamento es de cada una', r.filas.filter(f => f.tc === '00:01:09:22').map(f => f.quien + ' «' + f.texto + '»').join(' | '), 'STUDENT 7A «Hi, chef!» | STUDENT 7B «Hi, chef!»');
  t.eq('el nombre partido al final del renglón se junta, y su acotación no es nombre', r.filas.filter(f => f.tc === '00:01:15:07').map(f => f.quien).join(' | '), 'OK-SEON | SU-IN');
  t.eq('lo que pasa a la página siguiente es del mismo parlamento; las notas («=», «source»), fuera', ver(r.filas.find(f => f.tc === '00:01:23:15')), "00:01:23:15 HAN «It's also known for its clean water.»");
  t.eq('ni la cabecera ni el pie de página se cuelan', r.filas.some(f => /Prepared|Pixelogic|Page|Broadcast|October/.test(f.texto + f.quien)), false);
  t.eq('NARRATIVE TITLE también es GRÁFICA; LAST FRAME OF PICTURE no es un parlamento', r.filas.slice(-2).map(ver).join(' | '), '00:02:20:20 HAN «(mouth full) Mmm. <chews>» | 00:02:23:09 GRÁFICA «ROUND 3»');
  t.eq('timecodes con fotogramas, a 24', M.ldFps(r.filas) + ' ' + M.ldTC(r.filas[1].tc, 24).toFixed(3), '24 46.042');

  t.seccion('3 · las notas del traductor');
  t.eq('fuera las notas; se quedan las acotaciones', M.ldPdfSinNotas('(softly) Thanks, chef. (pristine = alt. \'unpolluted\') (Joseon = dynastic kingdom (1392 to 1897)) Go (partial English FN) on.'), '(softly) Thanks, chef. Go on.');
  t.eq('y las largas, de más de ocho palabras', M.ldPdfSinNotas('Okay. (previous edit only contained the latter third of this dialogue, edited)'), 'Okay.');
  t.eq('varias voces, sin repetir', JSON.stringify(M.ldPdfVoces('SONG-YI / YEONG-SU / SONG-YI (overlapping)')), '["SONG-YI","YEONG-SU"]');

  t.seccion('4 · desde el PDF de verdad (pdf.js)');
  {
    const pag = (pal) => ({ view: [0, 0, 595, 842], getTextContent: async () => ({ items: pal.map(x => ({ str: x.s, transform: [10, 0, 0, 10, x.x, 842 - x.y] })).concat([{ str: '  ', transform: [1, 0, 0, 1, 0, 0] }]) }) });
    const doc = { numPages: 2, getPage: async (n) => pag(n === 1 ? PAG1 : PAG2) };
    const L = await M.ldDePdf(doc);
    t.eq('se lee con pdf.js (la y, de abajo arriba) y sale lo mismo', L.hoja + ' ' + L.pdf + ' ' + L.fps + ' ' + L.filas.length + ' ' + L.filas[1].quien, 'PDF true 24 10 CAPTAIN COOK');
    let leidas = 0;
    const otro = { numPages: 40, getPage: async () => { leidas++; return pag([w(60, 100, 'JUAN:'), w(100, 100, 'Hola')]); } };
    t.eq('si la primera página no es una lista, no se leen las demás', (await M.ldDePdf(otro)) + ' ' + leidas, 'null 2');
  }

  t.seccion('5 · dónde está');
  {
    const HTML = fs.readFileSync(INDEX, 'utf8');
    t.ok('al cargar un PDF se mira antes que nada, y si lo es se arma como la de Excel', /ldp = \(typeof ldDePdf === 'function'\) \? await ldDePdf\(pdfDoc\) : null;/.test(HTML) && /ldArmar\(ldp, name\);\s*\n\s*lastPdfBuf = copia;/.test(HTML));
    t.ok('el PDF se sigue guardando en la nube', HTML.indexOf('const copia = lastPdfBuf;') > 0);
    t.ok('el aviso dice que es en PDF', /lista && lista\.pdf \? ' en PDF'/.test(fs.readFileSync(path.join(path.dirname(INDEX), 'js', 'listadialogos.js'), 'utf8')));
  }
};
