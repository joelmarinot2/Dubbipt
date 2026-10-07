/* El TXT de marcadores de Pro Tools en el convertidor de QC · especificacion 01, QC-46
 *
 * Pedido de sala: «quiero que la herramienta de PDF QC acepte este formato;
 * tienes que quitar toda la información que no sirve». El formato es el que
 * saca Pro Tools con «Export Session Info as Text»: cabecera de sesión y tabla
 * de marcadores separada por tabuladores.
 *
 * Lo que protege esta prueba:
 *  · que se quede lo que sirve -dónde, quién, qué- y se vaya lo demás;
 *  · que las tildes, la ñ, «¿» y «¡» lleguen enteras venga de Windows, de Mac
 *    (Mac Roman, como lo exporta Pro Tools para TextEdit) o en UTF;
 *  · y la regla de siempre del convertidor: NO SE CAMBIA NI UNA PALABRA.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El TXT de marcadores de Pro Tools en el convertidor de QC';

const QC = montar([['/* Los cuatro tipos de corrección', '/** Cuántas quedan por resolver']],
                  ['QC_TIPOS', 'QC_TIPO_POR_DEFECTO', 'qcTipo', 'qcTipoSugerido', 'qcCuentaTipos'],
                  { window: {}, qcDatos: () => [], console: { warn: () => {}, log: () => {} } });
const M = montar([['/* ── Medidas de la hoja', '/* ── Dibujar'], ['/* ── Leer el informe que entra', '/* ── Los paneles del dashboard']],
  ['qcpdfDecodificar', 'qcpdfPuntosCastellano', 'qcpdfEsTxtProTools', 'qcpdfLeerTxt', 'qcpdfQuitadoTexto', 'qcpdfDeInforme', 'QCTXT_SITIO'],
  { TextDecoder: TextDecoder, QC_TIPOS: QC.QC_TIPOS, qcTipoSugerido: QC.qcTipoSugerido, qcCuentaTipos: QC.qcCuentaTipos, pdfjsLib: {}, console: { warn: () => {} } });

const T = '\t';
/* Un listado como los de Pro Tools: con sus columnas de relleno, filas vacías y anchos con espacios. */
const LISTADO = [
  'SESSION NAME:' + T + 'Serie de prueba 3_QC',
  'SAMPLE RATE:' + T + '48000.000000',
  'BIT DEPTH:' + T + '24-bit',
  'SESSION START TIMECODE:' + T + '00:00:00:00',
  'TIMECODE FORMAT:' + T + '23.976 Frame',
  '# OF AUDIO TRACKS:' + T + '33',
  '# OF AUDIO CLIPS:' + T + '6893',
  '# OF AUDIO FILES:' + T + '3039',
  '', '',
  'M A R K E R S  L I S T I N G',
  ['#   ', 'LOCATION     ', 'TIME REFERENCE    ', 'UNITS    ', 'NAME                             ', 'TRACK NAME                       ', 'TRACK TYPE   ', 'COMMENTS'].join(T),
  ['5   ', '00:03:01:15  ', '8726852           ', 'Samples  ', 'MIGUEL P                         ', 'Markers                          ', 'Ruler                            ', 'LARGO. DEJAR COMO ESTA EN EL GUION: Quiero mostrar mi identificación del Gobierno General.'].join(T),
  ['3   ', '00:04:13:15  ', '12188013          ', 'Samples  ', 'diana                            ', 'Markers                          ', 'Ruler                            ', ''].join(T),
  ['20  ', '00:07:37:10  ', '21978213          ', 'Samples  ', 'FALTA MALE OFFICER 7', 'Markers', 'Ruler', 'GUION: ¡Arresté a un sospechoso! // Está afuera. Sígame.'].join(T),
  ['    ', '             ', '                  ', '           ', '                                 ', '                                 ', '             ', ''].join(T),
  ['    ', '             ', '                  ', '           ', '', '', '', ''].join(T),
  ['23  ', '00:10:44:05  ', '30954682          ', 'Samples  ', 'FALTA MALE INN GEST', 'Markers', 'Ruler', 'GUION: Pero, dígame… ¿acaso vio el aspecto del sujeto?'].join(T),
  ['    ', '             ', '', '', '', '', '', 'Y sigue: año, niño.'].join(T),
  ['9   ', '00:45:34:06  ', '131376775         ', 'Samples  ', 'YARLEY G', 'Markers', 'Ruler', 'DEBE SER:EL  Inspector viene de una familia de samuráis que se mudó a Joseon (yosón).'].join(T),
  '',
  'T R A C K  L I S T I N G',
  ['TRACK NAME:', 'Dial 1'].join(T),
  /* Un renglón de otra sección que, columna por columna, parecería un marcador. */
  ['1', '00:59:00:00', '0', 'Samples', 'CLIP 1', 'Dial 1', 'Audio', 'no es un marcador'].join(T)
].join('\r\n');

/* Mac Roman, como lo exporta Pro Tools para TextEdit. */
const MAC = { 'á': 0x87, 'é': 0x8E, 'í': 0x92, 'ó': 0x97, 'ú': 0x9C, 'ñ': 0x96, '¡': 0xC1, '¿': 0xC0, '…': 0xC9 };
const enMac = (s) => Uint8Array.from([...s].map(ch => MAC[ch] != null ? MAC[ch] : ch.charCodeAt(0)));
const WIN = { 'á': 0xE1, 'é': 0xE9, 'í': 0xED, 'ó': 0xF3, 'ú': 0xFA, 'ñ': 0xF1, '¡': 0xA1, '¿': 0xBF, '…': 0x85 };
const enWin = (s) => Uint8Array.from([...s].map(ch => WIN[ch] != null ? WIN[ch] : ch.charCodeAt(0)));

exports.pruebas = function(t){
  t.seccion('1 · leer el archivo con su codificación');
  t.eq('de Mac (Mac Roman): las tildes, la ñ, «¿», «¡» y «…» enteras', M.qcpdfDecodificar(enMac('¿Dígame… ¡Sí! Año, niño, acción.')), '¿Dígame… ¡Sí! Año, niño, acción.');
  t.eq('de Windows, también', M.qcpdfDecodificar(enWin('¿Dígame… ¡Sí! Año, niño, acción.')), '¿Dígame… ¡Sí! Año, niño, acción.');
  t.eq('en UTF-8, con y sin marca', M.qcpdfDecodificar(Buffer.from('¿Sí? ñ', 'utf8')) + ' | ' + M.qcpdfDecodificar(Buffer.concat([Buffer.from([0xEF, 0xBB, 0xBF]), Buffer.from('Año', 'utf8')])), '¿Sí? ñ | Año');
  t.eq('en UTF-16', M.qcpdfDecodificar(Buffer.concat([Buffer.from([0xFF, 0xFE]), Buffer.from('¿Qué?', 'utf16le')])), '¿Qué?');
  t.eq('las comillas y el guion largo de Windows también', M.qcpdfDecodificar(Uint8Array.from([0x93, 0x41, 0x94, 0x20, 0x97, 0x20, 0x80])), '“A” — €');
  t.eq('sin letras especiales, da igual cuál', M.qcpdfDecodificar(enWin('DIANA 00:04:13:15')), 'DIANA 00:04:13:15');
  t.eq('cuántas letras del castellano trae', M.qcpdfPuntosCastellano('¿Año? ¡Sí!') + ' ' + M.qcpdfPuntosCastellano('Àacaso'), '4 -1');

  t.seccion('2 · quedarse con lo que sirve');
  t.ok('se reconoce como listado de marcadores', M.qcpdfEsTxtProTools(LISTADO) && !M.qcpdfEsTxtProTools('hola\tmundo'));
  const inf = M.qcpdfLeerTxt(LISTADO, 'Serie de prueba 3_QC.txt');
  t.eq('tres columnas: dónde, quién y qué', inf.columnas.join(' | '), 'LOCATION | NAME | COMMENTS');
  t.eq('lo demás, fuera: número, muestras, unidades, pista y tipo', inf.quitado.columnas.join(', '), '#, TIME REFERENCE, UNITS, TRACK NAME, TRACK TYPE');
  t.eq('las filas vacías, fuera', inf.quitado.vacias, 2);
  t.eq('de la sesión, el nombre y el formato de timecode; lo demás, fuera', JSON.stringify(inf.tarjetas) + ' · ' + inf.quitado.sesion, '[{"k":"Session Name","v":"Serie de prueba 3_QC"},{"k":"Timecode Format","v":"23.976 Frame"}] · 6');
  t.eq('una fila por marcador, en su orden', inf.filas.map(f => f[0] + ' ' + f[1]).join(' | '), '00:03:01:15 MIGUEL P | 00:04:13:15 diana | 00:07:37:10 FALTA MALE OFFICER 7 | 00:10:44:05 FALTA MALE INN GEST | 00:45:34:06 YARLEY G');
  t.eq('sin los espacios de relleno de Pro Tools', inf.filas[0].map(x => '[' + x + ']').join(''), '[00:03:01:15][MIGUEL P][LARGO. DEJAR COMO ESTA EN EL GUION: Quiero mostrar mi identificación del Gobierno General.]');
  t.eq('NI UNA PALABRA cambiada: minúsculas, erratas y dobles espacios tal cual', inf.filas[1][1] + ' | ' + inf.filas[3][1] + ' | ' + inf.filas[4][2], 'diana | FALTA MALE INN GEST | DEBE SER:EL  Inspector viene de una familia de samuráis que se mudó a Joseon (yosón).');
  t.eq('un marcador sin comentario se queda, con el comentario vacío', JSON.stringify(inf.filas[1]), '["00:04:13:15","diana",""]');
  t.eq('un comentario partido en dos renglones va con el suyo', inf.filas[3][2], 'GUION: Pero, dígame… ¿acaso vio el aspecto del sujeto?\nY sigue: año, niño.');
  t.ok('y lo de la sección siguiente no se cuela, aunque parezca un marcador', !inf.filas.some(f => /Dial 1|TRACK|CLIP 1|00:59:00:00/.test(f.join(' '))));
  t.eq('lo quitado, dicho en corto', M.qcpdfQuitadoTexto(inf.quitado), 'quitado: 5 columnas (#, TIME REFERENCE, UNITS, TRACK NAME, TRACK TYPE), 2 filas vacías, 6 datos de sesión');
  t.eq('con nada quitado, nada que decir', M.qcpdfQuitadoTexto({ columnas: [], vacias: 0, sesion: 0 }) + '|' + M.qcpdfQuitadoTexto(null), '|');
  const mac = M.qcpdfLeerTxt(M.qcpdfDecodificar(enMac(LISTADO)), 'x.txt');
  t.eq('desde un archivo de Mac, igual', mac.filas[2][2], 'GUION: ¡Arresté a un sospechoso! // Está afuera. Sígame.');

  t.seccion('3 · lo que no es un listado, o casi');
  t.eq('un texto cualquiera no es un listado', M.qcpdfLeerTxt('Esto es un correo.\nSaludos.', 'a.txt'), null);
  const sinCom = M.qcpdfLeerTxt(['#\tLOCATION\tNAME', '1\t00:00:05:00\tDIANA'].join('\n'), 'b.txt');
  t.eq('sin columna de comentarios, con las que haya', sinCom.columnas.join(',') + ' · ' + JSON.stringify(sinCom.filas), 'LOCATION,NAME · [["00:00:05:00","DIANA"]]');
  t.eq('un renglón sin sitio válido no es un marcador', M.qcpdfLeerTxt(['LOCATION\tNAME\tCOMMENTS', 'mañana\tX\ty'].join('\n'), 'c.txt').filas.length, 0);
  t.eq('los sitios que pone Pro Tools: timecode, compases, minutos', ['01:02:03:04', '01:02:03;04', '12|3|000', '3:05.250', '12', 'ayer'].map(x => M.QCTXT_SITIO.test(x)).join(' '), 'true true true true false false');

  t.seccion('4 · y sale el informe de siempre');
  const d = M.qcpdfDeInforme(inf, { revisor: 'Ana', estudio: 'Estudio 1' });
  t.eq('con el nombre del archivo, sin «.txt»', d.titulo + ' · ' + d.nombreDoc, 'Serie de prueba 3_QC · Serie de prueba 3_QC');
  t.eq('es un informe de QC, con sus correcciones contadas', d.etiqueta + ' · ' + d.conteo, 'Control de calidad · 5 correcciones');
  t.eq('con el tipo deducido del comentario y el círculo para marcar', d.columnas.map(c => c.et || '○').join(' | '), 'LOCATION | NAME | COMMENTS | Tipo | ○');
  t.eq('el timecode en su estilo y el nombre en negrita', d.columnas.slice(0, 3).map(c => c.clase).join(' '), 'tc nombre texto');
  t.eq('con los dos datos de sesión que quedan', d.tarjetas.map(x => x.k).join(', '), 'Session Name, Timecode Format');
  const iT = d.columnas.findIndex(c => c.clase === 'tipo');
  t.eq('el tipo mira también el nombre: «FALTA …» en el nombre es Falta', d.filas.map(f => f[iT]).join(' '), 'ajuste ajuste falta falta ajuste');
  t.eq('y se cuentan arriba', d.chips.map(c => c.et + ' ' + c.n).join(', '), 'Falta 2, Ajuste 3');

  t.seccion('5 · por dónde entra');
  const SRC = require('fs').readFileSync(require('path').join(__dirname, '..', 'js', 'qcpdf.js'), 'utf8');
  t.ok('el convertidor acepta .txt al buscar y al soltar', /accept="application\/pdf,\.pdf,text\/plain,\.txt,image\/\*"/.test(SRC) && /!\/\\\.txt\$\/i\.test\(f\.name\) && f\.type !== 'text\/plain'\) continue;/.test(SRC));
  t.ok('el TXT se lee sin PDF de por medio', /const inf = esTxt \? qcpdfLeerTxt\(qcpdfDecodificar\(buf\), f\.nombre\)\s+: qcpdfLeerInforme\(await qcpdfLeerPdf\(buf\), f\.nombre\);/.test(SRC));
  t.ok('y dice lo que ha quitado', /qcpdfQuitadoTexto\(inf\.quitado\)/.test(SRC));
  t.ok('el archivo que sale se llama como el que entra, sin «.txt»', (SRC.match(/replace\(\/\\\.\(pdf\|txt\)\$\/i, ''\) \+ ' · QC\.pdf'\)/g) || []).length === 2);
  t.ok('sin emojis en el panel del convertidor', !/🖼|✕|⤓/.test(SRC.slice(SRC.indexOf('function qcConvPintar'), SRC.indexOf('function qcConvEnganchar'))));
};
