/* El convertidor de informes de QC a PDF · especificacion 09
 *
 * Entra un informe feo -el que escupe Pro Tools al exportar las marcas de
 * memoria- y sale una hoja A4 limpia. La regla que manda:
 *
 *     NO SE CAMBIA NI UNA PALABRA
 *
 * Ni mayusculas, ni minusculas, ni erratas, ni abreviaturas. Solo cambia como
 * se ve. Quien recibe el informe lo compara con el original, y una palabra
 * «arreglada» por el camino es una correccion que nadie pidio.
 *
 * Lo que se prueba aqui es leer y decidir, que es donde estan los errores. El
 * dibujo -jsPDF- no se prueba: hace falta un navegador, y esta anotado.
 *
 * Los datos salen de la forma que tiene un informe de Pro Tools: renglones con
 * la X de cada trozo de texto, que es lo unico que dice de que columna es cada
 * cosa.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El convertidor de informes de QC: leer sin cambiar una palabra';

const RECORTES = [
  ['/* ── Medidas de la hoja', '/* ── Dibujar'],
  ['/* ── Leer el informe que entra', '/* ── Los paneles del dashboard']
];
const EXPORTA = ['QCPDF_HOJA', 'QCPDF_PASOS', 'qcpdfAnchos', 'qcpdfParrafos',
                 'qcpdfRenglones', 'qcpdfDatosSesion', 'qcpdfCabecera', 'qcpdfColumnaDe',
                 'qcpdfLeerInforme', 'qcpdfEsLlamado', 'qcpdfPorTurno',
                 'qcpdfPintaColumna', 'qcpdfDeInforme', 'qcpdfDeCorrecciones',
                 'qcpdfTipoDe', 'qcpdfClaveTipo', 'qcpdfFechaHoy', 'qcpdfDeCambios'];

/* Los tipos y el que los sugiere viven en index.html -son de QC, no del
   dibujo-, asi que aqui se pasan como los pasa el navegador. Se recortan del
   mismo sitio para que no haya dos tablas que puedan separarse. */
const QC = montar([['/* Los cuatro tipos de corrección', '/** Cuántas quedan por resolver']],
                  ['QC_TIPOS', 'QC_TIPO_POR_DEFECTO', 'qcTipo', 'qcTipoSugerido', 'qcCuentaTipos'],
                  { window: {}, qcDatos: () => [], console: { warn: () => {}, log: () => {} } });

const M = montar(RECORTES, EXPORTA, {
  window: {}, document: {}, pdfjsLib: null, URL: {},
  esc: (s) => String(s == null ? '' : s),
  fallo: () => {},
  qcTC: (s) => (s == null ? '' : 'TC' + s),
  QC_TIPOS: QC.QC_TIPOS,
  qcTipoSugerido: QC.qcTipoSugerido,
  qcCuentaTipos: QC.qcCuentaTipos,
  console: { warn: () => {}, log: () => {} }
});

/* Un trozo de texto donde cae en la hoja. La Y crece hacia arriba, como en un
   PDF de verdad. */
const tz = (t, x, y) => ({ t: t, x: x, y: y });

/* El informe tal como sale de Pro Tools: cuatro datos de sesion arriba y luego
   la tabla. Las X son las de una exportacion real. */
const CAB = [tz('#', 40, 700), tz('LOCATION', 60, 700), tz('NAME', 150, 700), tz('COMMENTS', 250, 700)];

exports.pruebas = function(t){

  t.seccion('1 · los renglones se agrupan por su altura');
  const filas = M.qcpdfRenglones([
    tz('COMMENTS', 250, 700), tz('#', 40, 700), tz('LOCATION', 60, 700.8),
    tz('1', 40, 686), tz('01:00:12:05', 60, 686)
  ]);
  t.eq('dos renglones', filas.length, 2);
  t.eq('el de arriba primero', filas[0].cel[0].t, '#',
       'en un PDF la Y crece hacia arriba: ordenar al revés pone el informe boca abajo');
  t.eq('y cada uno de izquierda a derecha', filas[0].cel.map(c => c.t).join(' '),
       '# LOCATION COMMENTS');
  t.eq('una diferencia de menos de un punto es el MISMO renglón', filas[0].cel.length, 3,
       'las letras de un renglón no caen todas a la misma altura exacta');

  t.seccion('2 · la cabecera de la tabla, y dónde empieza cada columna');
  const cab = M.qcpdfCabecera(M.qcpdfRenglones(CAB.concat([tz('1', 40, 686)])));
  t.ok('la encuentra', !!cab);
  t.eq('con sus cuatro columnas', cab.cols.map(c => c.et).join(' '), '# LOCATION NAME COMMENTS');

  /* Con UNA sola palabra conocida no se acepta. Este renglon -una celda que
     dice justo «Name»- aparece antes de la cabecera de verdad, y con el limite
     en uno se la lleva por delante: las columnas saldrian de ahi y el informe
     entero se descolocaria. Caso propio, porque el de abajo no tiene NINGUNA
     palabra exacta y no distingue «una» de «dos». */
  const conTrampa = M.qcpdfRenglones([
    tz('Name', 40, 720),                                  // una sola, y no es la cabecera
    CAB[0], CAB[1], CAB[2], CAB[3],
    tz('1', 40, 686)
  ]);
  const cabBuena = M.qcpdfCabecera(conTrampa);
  t.eq('con una sola palabra conocida NO es la cabecera', cabBuena.cols.length, 4,
       'se la llevaría por delante y las columnas saldrían de donde no deben');
  t.eq('la de verdad es la de las cuatro', cabBuena.cols.map(c => c.et).join(' '),
       '# LOCATION NAME COMMENTS');

  const falsa = M.qcpdfCabecera(M.qcpdfRenglones([
    tz('el actor dice su name mal', 40, 700), tz('1', 40, 686)
  ]));
  t.eq('y un renglón sin ninguna palabra exacta, tampoco', falsa, null);

  t.seccion('3 · de qué columna es cada cosa');
  const cols = cab.cols;
  t.eq('lo que empieza en la primera', M.qcpdfColumnaDe(40, cols), 0);
  t.eq('en la segunda', M.qcpdfColumnaDe(60, cols), 1);
  t.eq('un poco a la derecha, sigue siendo la segunda', M.qcpdfColumnaDe(95, cols), 1,
       'el texto de una celda crece hacia la derecha; por cercanía se iría a la siguiente');
  t.eq('la tercera', M.qcpdfColumnaDe(150, cols), 2);
  t.eq('y el comentario largo, la cuarta', M.qcpdfColumnaDe(320, cols), 3);

  t.seccion('4 · los datos de sesión salen como tarjetas');
  const tarj = M.qcpdfDatosSesion(M.qcpdfRenglones([
    tz('Session Name: 100 DAYS OF DECEPTION 101', 40, 760),
    tz('Sample Rate: 48000.000000', 40, 750),
    tz('Bit Depth: 24-bit', 40, 740),
    tz('Timecode Format: 25 Frame', 40, 730)
  ]));
  t.eq('las cuatro', tarj.length, 4, JSON.stringify(tarj));
  t.eq('con su valor', tarj[0].v, '100 DAYS OF DECEPTION 101');
  t.eq('y el nombre en su sitio', tarj[0].k, 'Session Name');
  t.eq('sin datos de sesión, ninguna tarjeta', M.qcpdfDatosSesion([]).length, 0);

  t.seccion('5 · el informe entero, fila a fila');
  const hoja = M.qcpdfRenglones(CAB.concat([
    tz('1', 40, 686), tz('01:00:12:05', 60, 686), tz('GRÁFICA', 150, 686),
      tz('Repetir, se come la última', 250, 686),
    tz('sílaba', 250, 676),                                   // continuación del comentario
    tz('2', 40, 660), tz('01:05:40:00', 60, 660), tz('PHILIP', 150, 660),
      tz('Ruido de boca', 250, 660)
  ]));
  const inf = M.qcpdfLeerInforme([hoja], 'QC 101.pdf');
  t.eq('dos filas, no tres', inf.filas.length, 2,
       'el renglón sin primera columna es la continuación del comentario, no una fila');
  t.eq('y el comentario partido queda junto',
       inf.filas[0][3], 'Repetir, se come la última\nsílaba');
  t.eq('el timecode en su columna', inf.filas[0][1], '01:00:12:05');
  t.eq('el personaje en la suya', inf.filas[0][2], 'GRÁFICA');
  t.eq('y la segunda fila entera', inf.filas[1].join(' | '), '2 | 01:05:40:00 | PHILIP | Ruido de boca');

  t.seccion('6 · no se cambia NI UNA palabra');
  /* La regla de arriba, comprobada: mayusculas, minusculas y una errata a
     proposito tienen que salir tal cual. */
  const raro = M.qcpdfLeerInforme([M.qcpdfRenglones(CAB.concat([
    tz('1', 40, 686), tz('01:00:01:00', 60, 686), tz('mc Donald', 150, 686),
      tz('DICE «vacasiones» y no se entinede', 250, 686)
  ]))], 'x.pdf');
  t.eq('la errata sigue ahí', raro.filas[0][3], 'DICE «vacasiones» y no se entinede',
       'corregir una errata del original es una corrección que nadie pidió');
  t.eq('y las mayúsculas tal cual', raro.filas[0][2], 'mc Donald');

  t.seccion('7 · «GUION:» va como párrafo aparte');
  t.eq('separado', M.qcpdfParrafos('Repetir la frase GUION: dice otra cosa').length, 2);
  t.eq('con su texto', M.qcpdfParrafos('Repetir la frase GUION: dice otra cosa')[1],
       'GUION: dice otra cosa');
  t.eq('un comentario normal es un solo párrafo',
       M.qcpdfParrafos('Repetir, se come la sílaba').length, 1);
  t.eq('y el partido en renglones se une',
       M.qcpdfParrafos('Repetir, se come la\núltima sílaba')[0], 'Repetir, se come la');
  t.eq('una casilla vacía no desaparece', M.qcpdfParrafos('').join('|'), '');

  t.seccion('8 · los números de página del original se ignoran');
  const conPag = M.qcpdfLeerInforme([M.qcpdfRenglones(CAB.concat([
    tz('1', 40, 686), tz('01:00:01:00', 60, 686), tz('A', 150, 686), tz('uno', 250, 686),
    tz('12', 300, 40)                                          // el número de hoja, solo y suelto
  ]))], 'x.pdf');
  t.eq('una fila, no dos', conPag.filas.length, 1);
  /* Y sobre todo: NO se le pega al comentario de arriba. Contar filas no basta
     -un renglon sin primera columna se va por el camino de la continuacion y el
     total sigue siendo uno-, asi que se mira lo que quedo escrito. */
  t.eq('y el número no se le pega al comentario de arriba', conPag.filas[0][3], 'uno',
       'el número de hoja acabaría dentro de una corrección, como si fuera texto suyo');

  t.seccion('9 · la cabecera repetida de cada hoja no se cuela como fila');
  const dos = M.qcpdfLeerInforme([
    M.qcpdfRenglones(CAB.concat([tz('1', 40, 686), tz('01:00:01:00', 60, 686),
                                 tz('A', 150, 686), tz('uno', 250, 686)])),
    M.qcpdfRenglones(CAB.concat([tz('2', 40, 686), tz('01:00:02:00', 60, 686),
                                 tz('B', 150, 686), tz('dos', 250, 686)]))
  ], 'x.pdf');
  t.eq('dos filas de las dos hojas', dos.filas.length, 2, JSON.stringify(dos.filas));
  t.eq('y la segunda es la de la segunda hoja', dos.filas[1][2], 'B');

  t.seccion('10 · sin tabla no se inventa un informe');
  t.eq('un PDF que no lo es', M.qcpdfLeerInforme([M.qcpdfRenglones([
         tz('Esto es una carta cualquiera', 40, 700)])], 'x.pdf'), null,
       'dibujar una tabla vacía haría creer que el informe salió bien');

  t.seccion('11 · qué pinta tiene cada columna');
  t.eq('el timecode va en azul', M.qcpdfPintaColumna('Location').clase, 'tc');
  t.ok('y en negrita', M.qcpdfPintaColumna('Location').negrita === true);
  t.eq('el nombre, en negrita', M.qcpdfPintaColumna('Name').clase, 'nombre');
  t.ok('el comentario es la columna ancha',
       M.qcpdfPintaColumna('Comments').peso > M.qcpdfPintaColumna('Name').peso);
  t.ok('y el número, la estrecha',
       M.qcpdfPintaColumna('#').peso < M.qcpdfPintaColumna('Name').peso);
  t.eq('una columna que no conozco sigue saliendo', M.qcpdfPintaColumna('Vestuario').clase, 'texto',
       'cada estudio pone las suyas: tirarlas perdería datos del original');

  t.seccion('12 · los anchos llenan la hoja, pase lo que pase con los pesos');
  const an = M.qcpdfAnchos([{ peso:1 }, { peso:3 }], 180);
  t.cerca('suman el ancho útil', an[0] + an[1], 180, 1e-9);
  t.cerca('y en su proporción', an[1] / an[0], 3, 1e-9);
  const raros = M.qcpdfAnchos([{ peso:0 }, { peso:-2 }, {}], 180);
  t.cerca('con pesos imposibles, se reparte a partes iguales', raros[0], 60, 1e-9,
         'un peso cero dejaría la columna en nada y el texto encima del de al lado');

  t.seccion('13 · un llamado de actores se agrupa por turno');
  t.ok('se reconoce por sus columnas', M.qcpdfEsLlamado({ columnas:['Hora','Actor','Personaje'] }));
  t.ok('y no se confunde con un QC', !M.qcpdfEsLlamado({ columnas:['#','Location','Comments'] }));
  const turnos = M.qcpdfPorTurno([
    ['15:30', 'LUIS H MORENO'], ['09:00', 'MIGUEL VELEZ'], ['10:15', 'VALERIA JIMENEZ'],
    ['', 'SIN HORA']
  ]);
  t.eq('Mañana primero', turnos[0].grupo, 'Mañana');
  t.eq('con los dos de la mañana', [turnos[1][1], turnos[2][1]].join(' '),
       'MIGUEL VELEZ VALERIA JIMENEZ');
  t.eq('después Tarde', turnos[3].grupo, 'Tarde');
  t.eq('y quien no trae hora va al final, no se pierde', turnos[5][1], 'SIN HORA');
  t.eq('las 14:00 ya son tarde', M.qcpdfPorTurno([['14:00','X']])[0].grupo, 'Tarde');
  t.eq('y las 13:59 aún son mañana', M.qcpdfPorTurno([['13:59','X']])[0].grupo, 'Mañana');

  t.seccion('14 · el llamado lleva columnas en blanco para rellenar a mano');
  const lla = M.qcpdfDeInforme({ columnas:['Hora','Actor'], filas:[['09:00','MIGUEL VELEZ']],
                                 tarjetas:[], nombre:'llamado.pdf' }, {});
  const ets = lla.columnas.map(c => c.et);
  t.ok('sale Salida', ets.indexOf('Salida') >= 0, ets.join(' · '));
  t.ok('y Observaciones', ets.indexOf('Observaciones') >= 0);
  t.eq('con su etiqueta', lla.etiqueta, 'Llamado de actores');
  t.ok('el conteo habla de llamados', /llamado/.test(lla.conteo), lla.conteo);
  /* Si el original YA las trae, no se duplican. */
  const yaLas = M.qcpdfDeInforme({ columnas:['Hora','Actor','Salida','Observaciones'],
                                   filas:[['09:00','A','','']], tarjetas:[], nombre:'l.pdf' }, {});
  t.eq('y no se repiten si ya venían', yaLas.columnas.length, 4,
       JSON.stringify(yaLas.columnas.map(c => c.et)));

  t.seccion('15 · un informe de QC no se agrupa, y gana el tipo y el círculo');
  const qc = M.qcpdfDeInforme({ columnas:['#','Location','Name','Comments'],
                                filas:[['1','01:00:01:00','A','Falta el take. Pegar.']],
                                tarjetas:[], nombre:'QC 101.pdf' }, {});
  const qets = qc.columnas.map(c => c.et);
  t.eq('las cuatro del original siguen', qets.slice(0, 4).join(' '), '# Location Name Comments',
       'una columna que no reconozco no se tira: cada estudio pone las suyas');
  t.eq('y se le añade el tipo', qets[4], 'Tipo');
  t.eq('y el círculo, sin nombre de columna', qets[5], '');
  t.eq('el círculo es una marca, no texto', qc.columnas[5].clase, 'marca');
  t.eq('y llega vacío, para marcarlo a mano', qc.filas[0][5], '',
       'con algo escrito dentro no se puede marcar, y eso es para lo que está');
  t.eq('no se agrupa por turnos', qc.filas.filter(f => f && f.grupo).length, 0);
  t.eq('su etiqueta', qc.etiqueta, 'Control de calidad');
  t.ok('y el conteo habla de correcciones', /correcci/.test(qc.conteo), qc.conteo);
  t.eq('el título sale del nombre del archivo, sin el .pdf', qc.titulo, 'QC 101');
  t.eq('no se pinta en gris', qc.gris, false);
  t.eq('y cabe en dos hojas', qc.topeHojas, 2);

  t.seccion('15b · el tipo se deduce del comentario cuando el original no lo trae');
  /* Deducir no es cambiar el texto -el comentario sigue intacto-, pero SI es
     una lectura nuestra, asi que solo se hace si no venia. */
  t.eq('«Falta el take. Pegar.» es Pegar', qc.filas[0][4], 'pegar',
       'gana la acción que hay que hacer, no la palabra con la que empieza');
  t.eq('y el comentario no se toca', qc.filas[0][3], 'Falta el take. Pegar.');

  const conTipo = M.qcpdfDeInforme({ columnas:['Location','Comments','Tipo'],
                                     filas:[['01:00:01:00','lo que sea','Cambiar']],
                                     tarjetas:[], nombre:'x.pdf' }, {});
  t.eq('si el original YA trae el tipo, se respeta el suyo',
       conTipo.filas[0][2], 'Cambiar',
       'deducirlo encima del que viene sería cambiar el informe de otro');
  t.eq('y no se añade una segunda columna de tipo',
       conTipo.columnas.filter(c => c.clase === 'tipo').length, 1,
       JSON.stringify(conTipo.columnas.map(c => c.et)));
  /* Y ese tipo, escrito como etiqueta y no como clave, TAMBIEN cuenta arriba:
     el original lo escribe «Cambiar» y la aplicacion «cambiar». */
  t.eq('y cuenta en las pastillas de arriba',
       (conTipo.chips.find(c => c.k === 'cambiar') || {}).n, 1,
       JSON.stringify(conTipo.chips));

  t.seccion('15b2 · el tipo se reconoce como clave y como etiqueta');
  t.eq('la clave que escribe la aplicación', M.qcpdfClaveTipo('pegar'), 'pegar');
  t.eq('la etiqueta que llega en un PDF ajeno', M.qcpdfClaveTipo('Pegar'), 'pegar',
       'el original lo escribe con mayúscula: si solo se acepta la clave, el tipo se pierde');
  t.eq('en mayúsculas del todo, igual', M.qcpdfClaveTipo('PEGAR'), 'pegar');
  t.eq('con espacios alrededor, igual', M.qcpdfClaveTipo('  Ajuste  '), 'ajuste');
  t.eq('lo que no es un tipo, nada', M.qcpdfClaveTipo('urgente'), null,
       'pintar una pastilla sin saber de qué sería peor que no pintarla');
  t.eq('y vacío, nada', M.qcpdfClaveTipo(''), null);

  t.seccion('15c · los contadores de arriba salen de los tipos');
  const varios = M.qcpdfDeInforme({ columnas:['Location','Comments'], filas:[
      ['01:00:01:00','Falta gesto.'],
      ['01:00:02:00','Falta gritos.'],
      ['01:00:03:00','Cambiar por: «Mike el blanquito».'],
      ['01:00:04:00','Mejorar vocalización.']
    ], tarjetas:[], nombre:'x.pdf' }, {});
  const porTipo = {};
  varios.chips.forEach(c => { porTipo[c.k] = c.n; });
  t.eq('dos faltas', porTipo.falta, 2, JSON.stringify(varios.chips));
  t.eq('un cambiar', porTipo.cambiar, 1);
  t.eq('un ajuste', porTipo.ajuste, 1);
  t.ok('y los tipos sin ninguna no salen', !('pegar' in porTipo),
       'una pastilla en cero no dice nada y quita sitio');

  t.seccion('15d · quién revisa y qué estudio hace los cambios');
  const conNombres = M.qcpdfDeInforme({ columnas:['Location','Comments'],
                                        filas:[['01:00:01:00','uno']], tarjetas:[], nombre:'x.pdf' },
                                       { revisor:'Pamela H', estudio:'Estudio Bogotá' });
  t.ok('salen los dos', /Pamela H/.test(conNombres.subtitulo) && /Estudio Bogotá/.test(conNombres.subtitulo),
       conNombres.subtitulo);
  t.ok('dicen cuál es cuál', /QC:/.test(conNombres.subtitulo) && /Cambios:/.test(conNombres.subtitulo),
       'dos nombres sueltos no dicen quién pregunta y quién arregla');
  const soloUno = M.qcpdfDeInforme({ columnas:['Location','Comments'],
                                     filas:[['01:00:01:00','uno']], tarjetas:[], nombre:'x.pdf' },
                                    { revisor:'Pamela H' });
  t.eq('con uno solo, no queda un separador huérfano', soloUno.subtitulo, 'QC: Pamela H');

  t.seccion('15e · el llamado NO lleva tipo ni círculo');
  const lla2 = M.qcpdfDeInforme({ columnas:['Hora','Actor'], filas:[['09:00','A']],
                                  tarjetas:[], nombre:'l.pdf' }, {});
  t.eq('ni tipo', lla2.columnas.filter(c => c.clase === 'tipo').length, 0);
  t.eq('ni círculo', lla2.columnas.filter(c => c.clase === 'marca').length, 0,
       'un llamado no se resuelve corrección a corrección: se rellena a mano');
  t.ok('y su nota lo dice', /a mano/.test(lla2.nota), lla2.nota);

  t.seccion('16 · con póster, todo en escala de grises');
  const gris = M.qcpdfDeInforme({ columnas:['#','Location'], filas:[['1','01:00:01:00']],
                                  tarjetas:[], nombre:'x.pdf' }, { poster:'data:image/jpeg;base64,xx' });
  t.eq('en grises', gris.gris, true, 'es la variante que se pide con póster');
  t.ok('y con el póster dentro', !!gris.poster);

  t.seccion('17 · el informe de las correcciones apuntadas en QC');
  const d = M.qcpdfDeCorrecciones([
    { tcSec: 3940, quien:'GRÁFICA', texto:'Repetir', tipo:'falta', hecha:false },
    { tcSec: 4000, quien:'PHILIP',  texto:'Ruido',   tipo:'ajuste', hecha:true }
  ], '100 days', '', { programa:'100 days', episodio:'101',
                       revisor:'Pamela H', estudio:'Estudio Bogotá' });
  t.eq('dos filas', d.filas.length, 2);
  t.eq('el programa va en el título', d.titulo, '100 days');
  t.eq('y el episodio detrás, en gris', d.titulo2, 'Episodio 101');
  t.ok('con la fecha', /\d{4}$/.test(d.fecha), d.fecha);
  t.ok('y los dos nombres', /Pamela H/.test(d.subtitulo) && /Estudio Bogotá/.test(d.subtitulo),
       d.subtitulo);
  t.ok('diciendo cuál es cuál', /QC: Pamela H/.test(d.subtitulo) && /Cambios: Estudio/.test(d.subtitulo),
       'dos nombres sueltos no dicen a quién preguntar y quién tiene que arreglarlo');
  t.eq('el tipo va en su columna', d.filas[0][3], 'falta');
  t.eq('y el círculo queda vacío', d.filas[0][4], '',
       'se marca a mano cuando la corrección queda resuelta');
  t.ok('la nota del pie lo explica', /círculo/.test(d.nota), d.nota);
  t.eq('las columnas son las de la hoja de sala',
       d.columnas.map(c => c.et).join('|'), 'Timecode|Actor|Comentario|Tipo|');
  t.ok('el nombre del documento lleva el episodio', /101/.test(d.nombreDoc), d.nombreDoc);
  t.eq('el tiempo escrito como timecode', d.filas[0][0], 'TC3940',
       'los segundos son de dentro; en el informe va el timecode');
  t.eq('con su personaje', d.filas[0][1], 'GRÁFICA');
  t.eq('y su comentario', d.filas[0][2], 'Repetir');
  t.eq('la resuelta sale marcada', d.filas[1][2], 'RESUELTA · Ruido',
       'quien recibe el informe tiene que ver qué se arregló ya');
  t.eq('el conteo', d.conteo, '2 correcciones');
  t.eq('en singular cuando hay una', M.qcpdfDeCorrecciones([{ tcSec:1, quien:'', texto:'x' }], 'a', '').conteo,
       '1 corrección');
  t.ok('el nombre del archivo no lleva caracteres que rompan al guardar',
       !/[\\/:*?"<>|]/.test(M.qcpdfDeCorrecciones([], 'A/B:C', '').nombreDoc),
       M.qcpdfDeCorrecciones([], 'A/B:C', '').nombreDoc);

  t.seccion('18 · lo que el PDF no sabe escribir no se lleva el renglón por delante');
  /* Medido en un navegador de verdad, y por eso esta aqui: una correccion
     marcada con «✓» salia COMPLETAMENTE VACIA en el informe. Las tipografias
     de serie de un PDF escriben WinAnsi, y lo que no esta ahi no falla: se
     traga el renglon entero, callando. Lo mismo con cualquier emoji que
     alguien escriba en un comentario. */
  t.eq('el visto se traduce, no desaparece', M.qcpdfParrafos('✓ Resuelta')[0], 'OK Resuelta',
       'el renglón entero se perdía del informe sin decir nada');
  t.eq('un emoji deja marca, no un hueco', M.qcpdfParrafos('\u{1F534} Repetir')[0], '? Repetir',
       'un hueco callado haría pensar que el original tampoco decía nada ahí');
  t.eq('la flecha se entiende', M.qcpdfParrafos('sube → baja')[0], 'sube -> baja');
  /* Y lo que SI sabe escribir no se toca: son casi todas las palabras del
     castellano y los signos de los libretos. */
  t.eq('los acentos no se tocan', M.qcpdfParrafos('GRÁFICA ñÁÉÍÓÚü')[0], 'GRÁFICA ñÁÉÍÓÚü');
  t.eq('ni las comillas del libreto', M.qcpdfParrafos('dice «así»')[0], 'dice «así»');
  t.eq('ni la raya', M.qcpdfParrafos('uno — dos')[0], 'uno — dos');
  t.eq('ni las comillas tipográficas', M.qcpdfParrafos('“hola”')[0], '“hola”');
  t.eq('ni el punto medio', M.qcpdfParrafos('a · b')[0], 'a · b');
  t.eq('el salto de línea sigue partiendo párrafos',
       M.qcpdfParrafos('una\ndos').length, 2);
  /* Y la marca de resuelta ya no es un simbolo, asi que pasa entera. */
  t.eq('la marca de resuelta llega intacta',
       M.qcpdfParrafos(M.qcpdfDeCorrecciones([{ tcSec:1, quien:'A', texto:'x', hecha:true }], 'a', '').filas[0][2])[0],
       'RESUELTA · x');

  t.seccion('18b · el informe de los diálogos que cambiaron');
  /* Lo que pide sala: «subo el premix, comparalo con el libreto y entregame
     un informe de los dialogos que cambiaron». */
  const dc = M.qcpdfDeCambios([
    { tcSec: 3650, quien:'BETO', escrito:'Adiós amigo', oido:'otra cosa', sim:0.30, nivel:'mal', et:'no cuadra' },
    { tcSec: 3800, quien:'ANA',  escrito:'Regular',     oido:'',          sim:0.60, nivel:'dudoso', et:'dudoso' }
  ], { programa:'100 days', episodio:'101', revisor:'Pamela H', estudio:'Estudio Bogotá',
       desfase:'01:00:00:00', audio:'premix.mp3' });
  t.eq('dos filas', dc.filas.length, 2);
  t.eq('escrito y oído van en columnas DISTINTAS',
       dc.columnas.map(c => c.et).join('|'), 'Timecode|Actor|Escrito|Oído|Coincidencia',
       'quien lee tiene que poder comparar: lo oído es una pista, no una prueba');
  t.eq('la coincidencia va en porcentaje con su veredicto', dc.filas[0][4], '30 % · no cuadra');
  t.eq('lo no oído se dice, no se deja en blanco', dc.filas[1][3], '(nada)',
       'una celda vacía parece que se olvidó');
  t.eq('las pastillas cuentan cada nivel', dc.chips.map(c => c.n + ' ' + c.et).join(' · '),
       '1 No cuadran · 1 Dudosos');
  t.ok('el pie dice con qué audio y qué inicio se cotejó',
       /Audio: premix\.mp3/.test(dc.subtitulo) && /Inicio: 01:00:00:00/.test(dc.subtitulo),
       'de eso depende todo lo demás: sin decirlo, el informe no se puede reproducir');
  t.ok('y avisa de que lo oído es una pista', /pista, no una prueba/.test(dc.nota), dc.nota);
  t.eq('el conteo', dc.conteo, '2 cambios');
  t.eq('en singular con uno', M.qcpdfDeCambios([dc && { tcSec:1, quien:'', escrito:'a', oido:'b',
        sim:0.1, nivel:'mal', et:'no cuadra' }], {}).conteo, '1 cambio');
  t.eq('sin dudosos, no sale su pastilla', M.qcpdfDeCambios([{ tcSec:1, quien:'', escrito:'a', oido:'b',
        sim:0.1, nivel:'mal', et:'no cuadra' }], {}).chips.length, 1,
       'una pastilla en cero no dice nada');
  t.eq('cabe en cuatro hojas, no en dos', dc.topeHojas, 4,
       'dos columnas de texto por fila: encoger a dos hojas lo haría ilegible');

  /* Se vio mirando la hoja: el timecode salia partido -«01:00:40:0» arriba y
     «7» abajo- y la coincidencia tambien. Las columnas eran estrechas para lo
     que llevan. Se mide el ancho que les toca en la hoja mas holgada. */
  const util = M.QCPDF_HOJA.w - M.QCPDF_PASOS[0].margen * 2;
  const anchosCam = M.qcpdfAnchos(dc.columnas, util);
  t.ok('el timecode cabe en un renglón', anchosCam[0] >= 25,
       'mide ' + anchosCam[0].toFixed(1) + ' mm y un timecode en negrita pide unos 25');
  t.ok('y «41 % · no cuadra» también', anchosCam[4] >= 31,
       'mide ' + anchosCam[4].toFixed(1) + ' mm y pide unos 31');
  t.ok('sin dejar a lo escrito y lo oído sin sitio', anchosCam[2] >= 44 && anchosCam[3] >= 44,
       'son las dos columnas que se leen: ' + anchosCam[2].toFixed(1) + ' mm cada una');
  t.cerca('escrito y oído miden lo mismo', anchosCam[2], anchosCam[3], 1e-9,
         'se comparan una con otra: si una es más ancha, la vista se va a ella');
  /* Y el de correcciones, que lleva el mismo timecode. */
  const anchosCor = M.qcpdfAnchos(d.columnas, util);
  t.ok('en el informe de correcciones el timecode también cabe', anchosCor[0] >= 25,
       'mide ' + anchosCor[0].toFixed(1) + ' mm');

  t.seccion('18c · el informe de cambios dice cuánto se analizó');
  /* Pedido de sala: «al finalizar me entregue tambien un PDF». Se entrega
     siempre, también sin cambios, y entonces lo que dice es que se analizó y
     que coincide. */
  const uno = { tcSec: 3650, quien: 'BETO', escrito: 'Adiós', oido: 'otra', sim: 0.3, nivel: 'mal', et: 'no cuadra' };
  const conA = M.qcpdfDeCambios([uno], { analizados: 72, tardo: '50 s' });
  t.eq('cuántos de cuántos', conA.conteo, '1 cambio de 72 parlamentos');
  t.eq('con las pastillas de analizados y de los que coinciden',
       conA.chips.map(c => c.n + ' ' + c.et).join(' · '), '72 Analizados · 71 Coinciden · 1 No cuadran');
  t.ok('y lo que tardó el análisis', /Análisis: 50 s/.test(conA.subtitulo), conA.subtitulo);
  t.eq('nunca menos analizados que cambios', M.qcpdfDeCambios([uno, uno], { analizados: 1 }).conteo,
       '2 cambios de 2 parlamentos', 'un «3 cambios de 2» no lo cree nadie');
  t.eq('sin saber cuántos, no se inventa', M.qcpdfDeCambios([uno], {}).conteo, '1 cambio');
  const sinC = M.qcpdfDeCambios([], { analizados: 72 });
  t.eq('sin cambios, una sola fila', sinC.filas.length, 1);
  t.eq('que lo dice con todas las letras', sinC.filas[0].aviso,
       'Sin cambios: los 72 parlamentos analizados coinciden con el libreto.',
       'una tabla vacía parece un informe roto');
  t.eq('y sus pastillas', sinC.chips.map(c => c.n + ' ' + c.et).join(' · '), '72 Analizados · 72 Coinciden');
  t.eq('con uno solo, en singular', M.qcpdfDeCambios([], { analizados: 1 }).filas[0].aviso,
       'Sin cambios: el parlamento analizado coincide con el libreto.');

  t.seccion('18d · la fila de «sin cambios» se pinta de verdad');
  /* El dibujo no se prueba con jsPDF -hace falta un navegador-, pero SÍ que el
     aviso llegue a la hoja: un documento de mentira apunta lo que se escribe y
     dónde. Sin esto, quitar la rama del aviso no ponía nada en rojo. */
  const D = montar([['const QCPDF_COLOR = {', 'function qcpdfCargar(){'],
                    ['/* ── Medidas de la hoja', '/* ── Una imagen en blanco y negro']],
                   ['qcpdfPintar', 'QCPDF_PASOS', 'QCPDF_HOJA'],
                   { QC_TIPOS: QC.QC_TIPOS, window: {}, document: {}, console: { warn: () => {}, log: () => {} } });
  const docFalso = () => {
    const d = { textos: [], hojas: 1, pt: 10 };
    ['setFillColor', 'setDrawColor', 'setLineWidth', 'setTextColor', 'setFont', 'setCharSpace',
     'rect', 'roundedRect', 'line', 'circle', 'setPage'].forEach(k => { d[k] = () => {}; });
    d.setFontSize = (n) => { d.pt = n; };
    d.getTextWidth = (s) => String(s).length * d.pt * 0.18;
    d.splitTextToSize = (s, w) => {
      const out = []; let l = '';
      for(const p of String(s).split(' ')){ const c = l ? l + ' ' + p : p;
        if(d.getTextWidth(c) > w && l){ out.push(l); l = p; } else l = c; }
      if(l) out.push(l);
      return out.length ? out : [''];
    };
    d.text = (s, x, y, o) => { d.textos.push({ s: Array.isArray(s) ? s.join(' ') : String(s), x: x, y: y, o: o || {} }); };
    d.addPage = () => { d.hojas++; };
    return d;
  };
  const doc = docFalso();
  const paso = D.QCPDF_PASOS[0];
  const hojas = D.qcpdfPintar(doc, sinC, paso, false);
  const av = doc.textos.find(x => /Sin cambios/.test(x.s));
  t.ok('el aviso está en la hoja', !!av, JSON.stringify(doc.textos.map(x => x.s)));
  t.eq('centrado, que no se lea como una celda suelta', av && av.o.align, 'center');
  t.cerca('en el centro de la tabla', av ? av.x : 0, D.QCPDF_HOJA.w / 2, 0.01);
  t.eq('en una sola hoja', hojas, 1);
  t.eq('y midiendo, también una', D.qcpdfPintar(docFalso(), sinC, paso, true), 1);

  t.seccion('19 · la hoja es A4 y el último paso no baja de 7,5 pt');
  t.eq('ancho A4', M.QCPDF_HOJA.w, 210);
  t.eq('alto A4', M.QCPDF_HOJA.h, 297);
  const P = M.QCPDF_PASOS;
  t.eq('el último paso', P[P.length - 1].fuente, 7.5,
       'más pequeño no se lee en sala, y el informe se lee en sala');
  t.ok('y cada paso encoge de verdad',
       P.every((p, i) => i === 0 || p.fuente < P[i-1].fuente),
       P.map(p => p.fuente).join(' > '));
  t.ok('los márgenes también', P.every((p, i) => i === 0 || p.margen <= P[i-1].margen));
};
