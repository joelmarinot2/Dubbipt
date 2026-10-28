/* Los guiones de Discovery · especificacion 01, LIB-27
 *
 * Pedido de sala, con «Hoarding For The Holidays» (HOUSE # HHL625819): «que se
 * pueda leer como libreto original, así como los de formato de Netflix, pero
 * estos son de otra casa, que es Discovery». Un Word con una tabla de tres
 * columnas -timecode, personaje, lo que dice- y una fila vacía entre cada dos.
 * Lo que va sin personaje NO es continuación de nadie: son gráficas («GRAPHICS
 * ON SCREEN: …») y marcas de montaje («Break 1», «CREDITS BEGIN»). Detrás, una
 * tabla de «Profanity Markers» y un índice de dos columnas que no son del guion.
 *
 * Lo que protege esta prueba, en el libreto y en Continuidades original: que se
 * reconoce el guion pese a las filas vacías; que las gráficas van a GRÁFICA y
 * el montaje a EDICIÓN, sin pegarse a quien hablaba; que «Frank (Archive)» es
 * FRANK; que las otras tablas no cuelan personajes; y que el guion de
 * subtítulos (la fila sin personaje SÍ es continuación) sigue igual.
 * Las filas están copiadas del guion de verdad.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Guiones de Discovery: en el libreto y en Continuidades original';

const RAIZ = path.dirname(INDEX);

/* ── El libreto: un documento de mentira, con sus tablas ── */
const celda = (ps) => ({ querySelectorAll: () => ps.map(t => ({ textContent: t })), textContent: ps.join(' ') });
function tabla(filas){
  const tb = { querySelectorAll: (sel) => (sel === 'tr' ? trs : []) };
  const trs = filas.map(f => ({ closest: () => tb, querySelectorAll: () => f.map(c => celda(c ? [].concat(c) : [])) }));
  return tb;
}
const documento = (tablas) => ({ querySelectorAll: (sel) => (sel === 'table' ? tablas : sel === 'tr' ? [].concat(...tablas.map(t => t.querySelectorAll('tr'))) : []) });

const V = ['', '', ''];
const GUION = [
  ['01:00:00', '', 'TITLE SEQUENCE'], V,
  ['01:00:00', '', 'GRAPHICS ON SCREEN:HOARDING FOR THE Holidays'], V,
  ['01:00:14', 'Christa', 'Squeeze between these trees.'], V,
  ['01:00:19', 'Christa', "Really excited about making some sweaters. I've been wanting to do this for a while."], V,
  ['01:00:20', '', 'GRAPHICS ON SCREEN:CHRISTA, 48 WANTS A CHRISTMAS-THEMED WEDDING'], V,
  ['01:00:24', 'Valerie', "They're supposed to be ugly, though, right?"], V,
  ['01:12:02', '', 'Break 1'], V,
  ['01:12:24', 'Frank (Archive)', 'I think my father would kick my ass.'], V,
  ['01:22:02', '', '2015'], V,
  ['01:22:10', 'Frank', 'That was the year.'], V,
  ['01:44:04', '', 'CREDITS BEGIN'], V,
  ['', '', 'Executive Producer JASON BOLICKI'], V,
  ['01:44:19', '', 'END OF PROGRAMME']
];
const PROFANIDAD = [['Profanity Markers(Total: 1)'], ['Timecode', 'Label', 'Content'], ['01:00:30', 'Profanity', 'ass']];
const INDICE = [['01:12:40', 'Alex'], ['01:12:45', 'Alex']];

function libreto(tablas){
  const M = montar([['function norm(s){', 'function esc(s){'], ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'], ['/* ═══ GUION DE WORD EN TABLA', '// Cargar un guion en Word (.docx)']],
    ['docxDeTabla', 'docxMarca', 'docxQuien', 'verScript: () => script', 'verChars: () => chars'], {
      norm: undefined, charColor: () => '#5FC85A', NO_REC: new Set(['X', 'ORIGINAL', 'EDICION']), libMsg: () => {},
      pdfDoc: null, pdfName: '', lastPdfBuf: null, xlsFileName: null, pageData: {}, occByChar: {}, charMarks: {}, tcIndex: [],
      script: [], scriptByKey: {}, chars: [], charIdx: {}, numPages: 0, window: {}, console: { warn(){}, log(){} }
    });
  const ok = M.docxDeTabla(documento(tablas), '625819.docx');
  return { M, ok, script: M.verScript(), chars: M.verChars() };
}

/* ── Continuidades: el .docx por dentro (document.xml y cabecera) ── */
const x = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const wp = (t) => '<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t xml:space="preserve">' + x(t) + '</w:t></w:r></w:p>';
const wtbl = (filas) => '<w:tbl><w:tblPr/>' + filas.map(f => '<w:tr><w:trPr/>' + f.map(c => '<w:tc><w:tcPr/>' + wp(c) + '</w:tc>').join('') + '</w:tr>').join('') + '</w:tbl>';
const PARTES = {
  'word/document.xml': '<w:document><w:body>' + wtbl(GUION) + wtbl(PROFANIDAD) + wtbl(INDICE) + '</w:body></w:document>',
  'word/header1.xml': '<w:hdr>' + ['SAMPLE - DUS 1', 'HOUSE #Item Info', "INT'L EDIT", 'PAGE ### OF 9'].map(wp).join('') + '</w:hdr>',
  'word/header2.xml': '<w:hdr>' + ['Hoarding For The Holidays', 'HOUSE #HHL625819', "INT'L EDIT", 'PAGE ### OF 9'].map(wp).join('') + '</w:hdr>'
};
function continuidad(respuesta){
  const preguntas = [];
  const ctx = vm.createContext({ console, XLSX: {}, fflate: {}, window: { prompt: (q, d) => { preguntas.push(q + ' [' + d + ']'); return respuesta; } } });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'continuidad.js'), 'utf8') + ';this.A = { contDeDocx, contPreguntarEp, contDocxEpisodio, contPalabras };', ctx);
  return { A: ctx.A, preguntas };
}

exports.pruebas = async function(t){
  t.seccion('1 · el libreto: se reconoce el guion de Discovery');
  const L = libreto([tabla(GUION), tabla(PROFANIDAD), tabla(INDICE)]);
  t.eq('es un guion, aunque la mitad de sus filas estén vacías', L.ok, true);
  t.eq('los personajes, y GRÁFICA y EDICIÓN aparte (EDICIÓN no se graba)', L.chars.map(c => c.key + (c.noRec ? '*' : '')).sort().join(','), 'CHRISTA,EDICION*,FRANK,GRAFICA,VALERIE');
  const sc = L.script.map(b => b.key + ': ' + b.lines.join(' / '));
  t.eq('cada cosa en su sitio, y una gráfica no se pega a quien hablaba', sc.join(' | '),
    'EDICION: TITLE SEQUENCE | GRAFICA: HOARDING FOR THE Holidays | CHRISTA: Squeeze between these trees. | '
    + "CHRISTA: Really excited about making some sweaters. I've been wanting to do this for a while. | GRAFICA: CHRISTA, 48 WANTS A CHRISTMAS-THEMED WEDDING | "
    + "VALERIE: They're supposed to be ugly, though, right? | EDICION: Break 1 | FRANK: (Archive) I think my father would kick my ass. | GRAFICA: 2015 | "
    + 'FRANK: That was the year. | EDICION: CREDITS BEGIN / Executive Producer JASON BOLICKI | EDICION: END OF PROGRAMME');
  t.eq('con su timecode', L.script.find(b => b.key === 'VALERIE').tcSec, 3624);
  t.ok('la tabla de Profanity Markers no cuela a «PROFANITY» ni a «LABEL»', !L.chars.some(c => /PROFANITY|LABEL/.test(c.key)));
  t.eq('las marcas', ['GRAPHICS ON SCREEN:X', 'Break 3', 'CREDITS BEGIN', 'END OF PROGRAMME', 'LOWER THIRD: Ana', 'Hola'].map(L.M.docxMarca).join(','), 'grafica,edicion,edicion,edicion,grafica,');
  t.eq("«Frank (Archive)» es FRANK; «(CONT'D)» no deja nota", JSON.stringify([L.M.docxQuien('Frank (Archive)'), L.M.docxQuien("Ana (CONT'D)"), L.M.docxQuien('(V.O.)')]),
       '[{"nombre":"Frank","nota":"(Archive)"},{"nombre":"Ana","nota":""},{"nombre":"(V.O.)","nota":""}]');

  t.seccion('2 · el guion de subtítulos sigue igual');
  const S = libreto([tabla([['00:14:21,000', 'Xu Shaojie', 'Son números de estafas.'], ['00:14:23,240', '', 'Mire el folleto'], ['00:14:24,360', '', 'contra el fraude'], ['00:14:33,639', 'Abuela', 'Ya.'], ['00:14:35,000', '', 'Bien.']])]);
  t.eq('sin personaje, es de quien venía hablando', S.script.map(b => b.key + ': ' + b.lines.join(' / ')).join(' | '), 'XU SHAOJIE: Son números de estafas. / Mire el folleto / contra el fraude | ABUELA: Ya. / Bien.');

  t.seccion('3 · Continuidades original: el Word de Discovery como libreto en original');
  const C = continuidad('3');
  const ep = C.A.contDeDocx(PARTES, '625819.docx');
  t.eq('título y número de casa, de la cabecera que los trae', ep.programa + ' · ' + ep.version + ' · ' + ep.casa, "Hoarding For The Holidays · HOUSE # HHL625819 · INT'L EDIT · HHL625819");
  t.eq('el número de casa no es el episodio: no se inventa', ep.ep, null);
  t.eq('los personajes, sin gráficas, montaje, Profanity Markers ni índice', Object.keys(ep.personajes).sort().join(','), 'CHRISTA,FRANK,VALERIE');
  const fr = ep.personajes.FRANK, ch = ep.personajes.CHRISTA;
  t.eq('intervenciones, palabras (las cuenta Dubbipt) y timecodes', ch.intervenciones + ' ' + ch.palabras + ' ' + ch.primerTC + '→' + ch.ultimoTC, '2 19 01:00:14→01:00:19');
  t.eq('de archivo: solo voz', fr.intervenciones + ' ' + fr.off, '2 1');
  t.eq('se pregunta el episodio, proponiendo el siguiente', C.A.contPreguntarEp('625819.docx', ep, { episodios: { 1: {}, 2: {} } }) + ' · ' + C.preguntas[0],
       '3 · ¿Qué episodio es «625819.docx» (Hoarding For The Holidays, HOUSE # HHL625819)? El libreto no lo dice. [3]');
  t.eq('sin respuesta, nada', continuidad(null).A.contPreguntarEp('x.docx', ep, {}), null);
  t.eq('el episodio, si el nombre del archivo lo dice claro', ['HHL_E03_final.docx', 'Hoarding Ep 4.docx', 'Episode 12.docx', '625819.docx', 'HHL625819.docx'].map(C.A.contDocxEpisodio).join(','), '3,4,12,,');
  t.eq('palabras: sin acotaciones', C.A.contPalabras('(laughs) Okay, so [music] we go 2 times.'), 6);
  t.eq('con el episodio en el nombre, no se pregunta', C.A.contDeDocx(PARTES, 'HHL_E07.docx').ep, 7);

  t.seccion('4 · en pantalla');
  const js = fs.readFileSync(path.join(RAIZ, 'js', 'continuidad.js'), 'utf8');
  t.ok('se pueden subir Word, y lo dice', /i\.accept = '\.xlsx,\.xls,\.docx'/.test(js) && /el guion de Discovery \(Word, \.docx\)/.test(js));
  t.ok('al subir, un .docx va por el lector de Word', /\/\\\.docx\$\/i\.test\(f\.name\) \? contDeDocx\(contDocxPartes\(bytes\), f\.name\)/.test(js));
};
