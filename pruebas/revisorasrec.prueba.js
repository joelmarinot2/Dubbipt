/* Revisor ASREC · revisor-asrec.html
 *
 * Una herramienta aparte de la aplicación: un solo HTML que revisa, sin
 * internet, la ortografía, la gramática y las reglas del guion As-Recorded de
 * Netflix en la hoja «Dialogue List» del Excel del guion de doblaje.
 *
 * Se prueba el motor QUE VA DENTRO del HTML construido, no motor.js: si
 * alguien cambia motor.js y no reconstruye, lo que se reparte es lo viejo, y
 * eso es lo primero que se comprueba.
 *
 * Las frases de las pruebas salen del guion de verdad (Akka, T1 E5).
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { RAIZ } = require('./ayuda');

exports.nombre = 'Revisor ASREC: ortografía y reglas del guion As-Recorded';

/* Un diccionario de juguete: lo justo para las frases de aquí. */
const PALABRAS = ('pero ya lo sabías las guardaban esa tierra para el templo de la diosa todo todos tus esfuerzos fueron en vano ' +
  'admito que quizá tu belleza me impidió ver despiadada eres hace tiempo cientos de antepasadas lucharon como arqueros ' +
  'ejército reina otra vez esas zorras vayan adentro idiotas mi gente se ha negado a luchar por gesto dijiste vendrías ' +
  'no sé qué hacer cómo estás hizo haber si vienes fui mercado al bien solo quería este guion y hoy estamos aquí una más ' +
  'para consagrar como protectora con las bendiciones guerrera sí era hola amigo iba decir quiero saberlo firmé divorcio ' +
  'te esta del lo hermanas pagarán declaración redefinimos leyes pasamos linaje materno paterno sus venas corre sangre brasas ardientes').split(' ');

function cargar(){
  const html = fs.readFileSync(path.join(RAIZ, 'revisor-asrec.html'), 'utf8').replace(/\r\n/g, '\n');
  const m = /<script id="motor">\n?([\s\S]*?)<\/script>/.exec(html);
  if(!m) throw new Error('revisor-asrec.html no tiene <script id="motor">');
  const src = m[1];
  const M = new Function(src + '\nreturn RevisorASREC;')();
  return { html, src, M };
}

const fila = (n, source, dialogo, extra) => Object.assign({ fila: n, tcIn: '00:00:' + String(n).padStart(2, '0') + ':00',
  tcOut: '00:00:' + String(n).padStart(2, '0') + ':20', source, dialogo, anot: '', tags: '', pantalla: 'ON' }, extra || {});
const reglas = (res, n) => res.hallazgos.filter(h => h.fila === n).map(h => h.regla);

exports.pruebas = async function(t){
  const { html, src, M } = cargar();

  t.seccion('El HTML construido');
  const motor = fs.readFileSync(path.join(RAIZ, 'revisor-asrec', 'motor.js'), 'utf8').replace(/\r\n/g, '\n');
  t.ok('lleva el motor.js de ahora (si no: node revisor-asrec/construir.js)', src.trim() === motor.trim());
  const ui = /<script>\n?('use strict';[\s\S]*?)<\/script>\s*<\/body>/.exec(html);
  let sintaxis = true;
  try{ new Function(ui[1]); }catch(e){ sintaxis = e.message; }
  t.ok('la pantalla no tiene la sintaxis rota', sintaxis === true, String(sintaxis));
  for(const id of ['dic-base', 'dic-extra']){
    const b64 = (new RegExp('<script id="' + id + '" type="text/plain">([^<]{40})').exec(html) || [])[1];
    const cab = b64 ? Buffer.from(b64.slice(0, 4), 'base64') : Buffer.alloc(0);
    t.ok('el diccionario ' + id + ' va dentro, comprimido en gzip', cab[0] === 0x1f && cab[1] === 0x8b);
  }
  t.ok('no carga nada de internet', !/<script[^>]+src=|<link[^>]+href=["']https?:/.test(html));

  const dic = M.crearDiccionario(PALABRAS, ['sabéis', 'vosotros']);

  t.seccion('Gramática y ortografía');
  let res = M.revisar({ info: {}, filas: [
    fila(1, 'BHAVANI', 'Todo tus esfuerzos fueron en vano.'),
    fila(2, 'BHAVANI', 'Dijistes que vendrías.'),
    fila(3, 'BHAVANI', '¿Como estás?'),
    fila(4, 'BHAVANI', 'Haber si vienes.'),
    fila(5, 'BHAVANI', 'Fui a el mercado.'),
    fila(6, 'BHAVANI', 'Sólo quería este guión.'),
    fila(7, 'BHAVANI', 'Hace tiempo, cientos de tus antepasadas lucharon como arqueras.'),
    fila(8, 'BHAVANI', 'Vosotros sabéis la verdad.')
  ] }, dic, { variante: 'latam' });
  t.ok('«Todo tus esfuerzos» → «Todos tus»', res.hallazgos.some(h => h.fila === 1 && h.regla === 'todo' && h.sug === 'Todos tus'));
  t.ok('«Dijistes» → «Dijiste»', res.hallazgos.some(h => h.fila === 2 && h.regla === 'diccionario' && h.sug === 'Dijiste'));
  t.ok('«¿Como…?» lleva tilde', res.hallazgos.some(h => h.fila === 3 && h.regla === 'interrogativa' && h.sug === 'Cómo'));
  t.ok('«Haber si» → «A ver si»', reglas(res, 4).includes('homofonos'));
  t.ok('«a el» → «al»', reglas(res, 5).includes('contraccion'));
  t.eq('«Sólo» y «guión» sin tilde (RAE 2010)', res.hallazgos.filter(h => h.fila === 6 && h.regla === 'rae2010').map(h => h.sug), ['Solo', 'guion']);
  t.ok('un femenino que le falta al diccionario («arqueras») no es una falta', !reglas(res, 7).includes('diccionario'));
  t.ok('«vosotros sabéis» en un doblaje latino es un aviso', res.hallazgos.filter(h => h.fila === 8 && h.regla === 'vosotros').length === 2);

  t.seccion('Formato ASREC');
  res = M.revisar({ info: { 'SHOW TITLE': 'Akka' }, filas: [
    fila(1, 'AMAR', 'Admito que quizá tu belleza me impidió ver'),
    fila(2, 'AMAR', '…lo despiadada que eres.'),
    fila(3, 'BHAVANI', 'Hace tiempo, cientos de tus antepasadas… \u200B\u200Blucharon como arqueros.'),
    fila(4, 'TARNATH', '(GESTO)'),
    fila(5, 'TARNATH', '(gesto)'),
    fila(6, 'TARNATH', ''),
    fila(7, 'TARNATH', '¡Otra vez esas zorras!'),
    fila(8, 'GURUAMMA', 'Mi gente se ha negado a luchar, Akka (áka).'),
    fila(9, 'GURUAMMA', 'Mi gente se ha negado a luchar.', { tags: 'MAIN TITLE IN DIALOGUE' }),
    fila(10, 'GURUAMMA', 'Hoy estamos aquí... / una vez más ^ para consagrar.'),
    fila(11, 'GURUAMMA', 'Tengo 5 hijos y 20 nietos.'),
    fila(12, 'GURUAMMA', '…hola amigo.'),
    fila(13, 'GURUAMMA', 'Hola; ¡¿Cómo estás?!'),
    fila(14, 'GURUAMMA', 'Pero, ¿qué haces?'),
    fila(15, 'GURUAMMA', '¡NO!'),
    fila(16, 'GURUAMMA', 'Gesto.'),
    fila(17, 'GURUAMMA', 'Él me dijo: "Regresa mañana."'),
    fila(18, 'GURUAMMA', 'Cuesta 2,50 y pesa 2.000 kilos.'),
    fila(19, 'WALLA MERCADO', '(BULLICIO)'),
    fila(20, 'AMAR / RUDRA', '¡Vamos!'),
    fila(21, 'AMAR', '- ¿Vienes? - Ya voy.'),
    fila(22, 'AMAR', 'Habla con el FBI.')
  ] }, dic, {});
  t.ok('la frase que sigue en otra fila termina con «…»', reglas(res, 1).includes('contFin'));
  t.ok('los caracteres invisibles se ven', reglas(res, 3).includes('invisible'));
  t.eq('«(GESTO)» está bien', reglas(res, 4), []);
  t.ok('«(gesto)» va en mayúsculas', reglas(res, 5).includes('reaccionMayus'));
  t.ok('la casilla vacía es un error', reglas(res, 6).includes('vacio'));
  t.ok('«zorras» pide SENSITIVE LANGUAGE', reglas(res, 7).includes('sensible'));
  t.ok('dice «Akka» sin la etiqueta MAIN TITLE IN DIALOGUE', reglas(res, 8).includes('titulo'));
  t.ok('lleva la etiqueta y no dice «Akka»', reglas(res, 9).includes('titulo'));
  t.ok('tres puntos en vez de «…»', reglas(res, 10).includes('tresPuntos'));
  t.ok('/ y ^ no son «símbolos» que se dicen', !reglas(res, 10).includes('simbolos'));
  t.ok('pero la «/» es un error del estudio, y se quita con sus espacios', res.hallazgos.some(h => h.fila === 10 && h.regla === 'barra' && h.sev === 'error' && h.sug === ' '));
  t.eq('la «^» no es una «/»', res.hallazgos.filter(h => h.fila === 10 && h.regla === 'barra').length, 1);
  const conBarra = M.revisarTexto('Te iba a decir que /', dic);
  t.ok('una «/» al final no tapa que falta la puntuación', conBarra.hallazgos.some(h => h.regla === 'sinFinal' && h.sug === 'e.'));
  t.ok('y se propone quitarla del todo', conBarra.hallazgos.some(h => h.regla === 'barra' && h.sug === 'borrar'));
  t.eq('del 1 al 10 con letras, y 20 en cifras (guía de español)', res.hallazgos.filter(h => h.fila === 11 && h.regla === 'numeros').map(h => h.sug), ['cinco']);
  t.ok('sin punto y coma', reglas(res, 13).includes('puntoYComa'));
  t.ok('sin «?!» juntos', reglas(res, 13).includes('dobleSigno'));
  t.ok('«Pero, ¿…?» sin coma', reglas(res, 14).includes('peroComa'));
  t.ok('«¡NO!»: nada de MAYÚSCULAS sostenidas', reglas(res, 15).includes('mayusSostenidas'));
  t.ok('una sigla no es una mayúscula sostenida', !reglas(res, 22).includes('mayusSostenidas') && !reglas(res, 22).includes('diccionario'));
  t.ok('una reacción sin paréntesis', reglas(res, 16).includes('reaccionSigno'));
  t.ok('el punto va después de las comillas', reglas(res, 17).includes('comillas'));
  t.eq('decimal con punto en latino y 2000 sin separador', res.hallazgos.filter(h => h.fila === 18 && h.regla === 'numeros').map(h => h.sug), ['2.50', '2000']);
  t.ok('WALLA va separado con «-» o «:»', reglas(res, 19).includes('walla'));
  t.ok('dos personajes en SOURCE', reglas(res, 20).includes('unPersonaje'));
  t.ok('dos personajes con guiones en el diálogo', reglas(res, 21).includes('unPersonaje'));
  t.ok('«…» al principio sin una fila anterior que termine en «…» no inventa nada', !reglas(res, 12).includes('inicioMinus'));

  t.seccion('El guion comparado consigo mismo');
  res = M.revisar({ info: {}, filas: [
    fila(1, ' YOUNG GURUAMMA', 'Pero ya lo sabías… las Kathawa (katáwa) guardaban esa tierra para el templo de la Diosa Makwathi (Matwáti).'),
    fila(2, 'GURUAMMA', 'Rezaré para que la diosa Makwathi (matwáti) siempre las proteja.'),
    fila(3, 'GURUAMMA', 'Con las bendiciones de la diosa guerrera Makwathi (matwáti)…'),
    fila(4, 'KATHAWA WOMAN 2', '(GESTO)'), fila(5, 'KATHAWA WOMAN 3', '(GESTO)'), fila(6, 'KATHWA WOMAN 1', '(GESTO)'),
    fila(7, 'YERUMA MAN 8', '(GESTO)'), fila(8, 'YERUMA WOMAN 8', '(GESTO)')
  ] }, dic, {});
  const guionGuias = res;
  t.eq('las guías de pronunciación son un error del estudio, y se quitan con su espacio',
    res.hallazgos.filter(h => h.regla === 'guiaPronunciacion').map(h => h.fila + ':' + res.filas[h.i].dialogo.slice(h.desde, h.hasta) + ':' + h.sev),
    ['1: (katáwa):error', '1: (Matwáti):error', '2: (matwáti):error', '3: (matwáti):error']);
  t.ok('y entonces no se comparan entre sí', !res.hallazgos.some(h => h.regla === 'guias' || h.regla === 'sinGuia'));
  t.ok('un nombre con su guía sigue siendo un nombre', !res.hallazgos.some(h => h.regla === 'diccionario' && /áwa|áti/.test(h.palabra)));
  t.eq('entre corchetes, igual', M.revisarTexto('Hola, Kathawa [katáwa].', dic).hallazgos.filter(h => h.regla === 'guiaPronunciacion').map(h => h.sug), ['borrar']);
  t.eq('una reacción entre paréntesis no es una guía', M.revisarTexto('(GESTO)', dic).hallazgos.filter(h => h.regla === 'guiaPronunciacion').length, 0);
  /* Con la regla apagada (un cliente que sí las quiere), vuelven las comparaciones. */
  res = M.revisar({ info: {}, filas: guionGuias.filas.map(f => ({ ...f })) }, dic, { apagadas: new Set(['guiaPronunciacion']) });
  t.ok('la misma guía escrita con otra mayúscula', res.hallazgos.some(h => h.fila === 1 && h.regla === 'guias' && h.sug === 'Makwathi (matwáti)'));
  t.ok('«Diosa» y «diosa»', res.hallazgos.some(h => h.fila === 1 && h.regla === 'mayusculas'));
  t.ok('lo de dentro de una guía no se corrige', !res.hallazgos.some(h => h.regla === 'diccionario' && /áwa|áti/.test(h.palabra)));
  t.ok('espacio sobrante en SOURCE', reglas(res, 1).includes('personaje'));
  t.ok('KATHWA es la forma rara de KATHAWA aunque no haya un KATHAWA WOMAN 1', res.hallazgos.some(h => h.fila === 6 && h.regla === 'personaje' && h.sug === 'KATHAWA WOMAN 1'));
  t.ok('YERUMA MAN y YERUMA WOMAN no son el mismo', !reglas(res, 7).concat(reglas(res, 8)).includes('personaje'));

  t.seccion('Probar un diálogo');
  t.ok('la primera vez que sale un nombre, con su timecode inicial', res.terminos.some(x => x.termino === 'Makwathi' && x.primera && x.primera.fila === 1 && x.primera.tc === '00:00:01:00'));
  let p = M.revisarTexto('Todo tus esfuerzos fueron en vano', dic);
  t.eq('un diálogo suelto se revisa', p.hallazgos.map(h => h.regla), ['todo', 'sinFinal']);
  t.eq('y la sugerencia se puede aplicar tal cual', p.hallazgos.map(h => h.sug), ['Todos tus', 'o.']);
  p = M.revisarTexto('Hola amigo.', dic);
  t.eq('un diálogo bien escrito no da nada', p.hallazgos.length, 0);
  p = M.revisarTexto('Admito que quizá tu belleza me impidió ver\r\n\n…lo despiadada que eres.', dic);
  t.eq('cada línea es un evento, y se sabe dónde empieza', p.lineas.map(l => l.desde), [0, 45]);
  t.ok('las continuaciones se miran entre líneas', p.hallazgos.some(h => h.regla === 'contFin' && h.sug === 'r…'));
  const ctx = M.contexto(res, { info: { 'SHOW TITLE': 'Akka' } });
  const conGuias = { contexto: ctx, apagadas: new Set(['guiaPronunciacion']) };
  p = M.revisarTexto('Rezaré a la diosa Makwathi (Matwáti).', dic, conGuias);
  t.ok('con un guion abierto, su guía de pronunciación manda', p.hallazgos.some(h => h.regla === 'guias' && h.sug === 'Makwathi (matwáti)'));
  p = M.revisarTexto('Rezaré a la diosa Makwathi.', dic, conGuias);
  t.eq('con la regla del estudio encendida, no se pide la guía', M.revisarTexto('Rezaré a la diosa Makwathi.', dic, { contexto: ctx }).hallazgos.filter(h => h.regla === 'sinGuia').length, 0);
  t.ok('y avisa si el nombre va sin su guía', p.hallazgos.some(h => h.regla === 'sinGuia' && h.sug === 'Makwathi (matwáti)'));
  t.ok('lo que solo existe en el Excel no se revisa', !M.revisarTexto('Hola.', dic).hallazgos.some(h => h.regla === 'timecode' || h.regla === 'personaje'));

  t.seccion('La puntuación mira la fila de antes y la de después');
  p = M.revisarTexto('AMAR: Te iba a decir que\nRUDRA: ¡No quiero saberlo!\nAMAR: ya firmé el divorcio.', dic);
  t.eq('«NOMBRE:» dice quién habla', p.filas.map(f => f.source), ['AMAR', 'RUDRA', 'AMAR']);
  t.eq('y el texto empieza después del nombre', p.lineas.map(l => l.desde), [6, 32, 58]);
  t.ok('si otro personaje interrumpe, la frase termina con «…»', p.hallazgos.some(h => h.fila === 1 && h.regla === 'contFin' && /interrumpe RUDRA/.test(h.msg) && h.sug === 'e…'));
  t.ok('y se retoma con «…»', p.hallazgos.some(h => h.fila === 3 && h.regla === 'contIni' && h.sug === '…y'));
  t.ok('el aviso dice qué filas lo explican', p.hallazgos.find(h => h.fila === 1 && h.regla === 'contFin').vecinas.join() === '1,2');
  t.eq('bien puntuada, la interrupción no da nada', M.revisarTexto('AMAR: Te iba a decir que…\nRUDRA: ¡No quiero saberlo!\nAMAR: …ya firmé el divorcio.', dic).hallazgos.length, 0);
  t.ok('«…Lo»: la continuación sigue en minúscula', M.revisarTexto('Admito que quizá tu belleza me impidió ver…\n…Lo despiadada que eres.', dic).hallazgos.some(h => h.regla === 'contMayus' && h.sug === 'lo'));
  p = M.revisarTexto('Ya lo sabías.\n…las hermanas pagarán.', dic);
  t.eq('si la anterior cerró con punto, sobra el «…» (y no se pide a la vez uno al final)', p.hallazgos.map(h => h.regla), ['contSobra']);
  t.eq('y en minúscula, que empiece con mayúscula', M.revisarTexto('Ya lo sabías.\nlas hermanas pagarán.', dic).hallazgos.map(h => h.regla), ['inicioMinus']);
  t.eq('los dos puntos pueden quedarse al final', M.revisarTexto('Con esta declaración, redefinimos las leyes:\npasamos del linaje materno al paterno.', dic).hallazgos.filter(h => h.fila === 1).length, 0);
  t.ok('una coma que no sigue en la fila de después', M.revisarTexto('Por sus venas no corre sangre,\nY brasas ardientes.', dic).hallazgos.some(h => h.fila === 1 && h.regla === 'sinFinal'));
  res = M.revisar({ info: {}, filas: [
    fila(1, 'AMAR', 'Admito que quizá tu belleza me impidió ver', { tcOut: '00:00:01:10' }),
    fila(2, 'AMAR', '…lo despiadada que eres.', { tcIn: '00:00:30:00', tcOut: '00:00:31:00' })
  ] }, dic, {});
  t.ok('con más de diez segundos por medio ya no es la misma frase', !reglas(res, 1).includes('contFin') && reglas(res, 1).includes('sinFinal'));

  t.seccion('Leer una captura');
  t.eq('lo leído se ordena: sin timecodes ni ON, «...» → «…», el personaje delante y la casilla partida, junta',
    M.limpiarCaptura('00:06:18:09 00:06:20:11 PANDIT Con esta declaración, ON\nredefinimos las leyes:\nYOUNG GURUAMMA Pero ya lo sabías... las Kathawa\nguardaban esa tierra.\nAMAR (GESTO)\n¡NO!\n…lo despiadada que eres.\n12'),
    'PANDIT: Con esta declaración, redefinimos las leyes:\nYOUNG GURUAMMA: Pero ya lo sabías… las Kathawa guardaban esa tierra.\nAMAR: (GESTO)\n¡NO!\n…lo despiadada que eres.');
  t.eq('una tarjeta con el nombre solo y el diálogo debajo', M.limpiarCaptura('BHAVANI\nTodo tus esfuerzos fueron en vano.\nRUDRA\n¡NO!'),
    'BHAVANI: Todo tus esfuerzos fueron en vano.\nRUDRA: ¡NO!');

  /* La herramienta de Netflix, como la devuelve el lector: el punto de color,
     la flecha y la etiqueta On salen como basura («@», «v», «[On]»), y el
     icono del lápiz de las anotaciones, como «Z». */
  const caja = (y, alto) => ({ x0: 10, x1: 800, y0: y, y1: y + alto });
  const linea = (text, y, alto) => ({ text, bbox: caja(y, alto || 16) });
  const dicT = M.crearDiccionario(('oí que se sumó como nueva intérprete estuve muy ocupado no pude pasar a saludarla debe preocuparse ' +
    'yo debí haberlo saludado primero todo tus esfuerzos fueron en vano y aunque lo intentaste mil veces').split(' '), []);
  const tarjetas = M.ordenarTarjetas([
    linea('00:36:43:06 - 00:36:45:15 02:09 0781', 10), linea('@ FUKUDA v [On]', 34), linea('OÍ que se sumó como nueva intérprete.', 58, 24),
    linea('# Foreign Dialog, Context', 100), linea('Z speaks Japanese', 120), linea('The speaker switches to semi-formal speech.', 140),
    linea('00:36:46:09 - 00:36:49:21 03:12 0782', 180), linea('e FUKUDA ~ On', 204), linea('Estuve muy ocupado. No pude pasar a saludarla.', 228, 24),
    linea('# Foreign Dialog', 270), linea('speaks Japanese', 290), linea('FN', 310),
    linea('00:36:50:04 - 00:36:53:17 03:13 0783', 350), linea('GA-KYUNG On', 374), linea('Todo tus esfuerzos fueron en vano, y aunque lo', 398, 24),
    linea('intentaste mil veces.', 424, 24), linea('# Foreign Dialog', 466), linea('speaks Japanese', 486)
  ], dicT, [92, 262, 458]);
  t.eq('tarjetas de Netflix: solo el personaje y su línea, sin etiquetas ni anotaciones', tarjetas && tarjetas.texto,
    'FUKUDA: Oí que se sumó como nueva intérprete.\nFUKUDA: Estuve muy ocupado. No pude pasar a saludarla.\nGA-KYUNG: Todo tus esfuerzos fueron en vano, y aunque lo intentaste mil veces.');
  t.eq('y el timecode de cada una', tarjetas && tarjetas.eventos.map(e => e.tc), ['00:36:43:06', '00:36:46:09', '00:36:50:04']);
  const conTachado = M.ordenarTarjetas([
    linea('00:49:01:17 - 00:49:03:10 01:17 0980', 10), linea('@ FUKUDA v On', 34), linea('¿Creen se ganarán nuestra admiración', 54, 13),
    linea('¿Creen se ganarán nuestra admiración…?', 72, 26), linea('# Foreign Dialog', 112), linea('Z speaks Japanese', 132)
  ], M.crearDiccionario('creen se ganarán nuestra admiración'.split(' '), []), [104]);
  t.eq('la versión anterior, tachada y en pequeño encima, no es la línea', conTachado && conTachado.texto, 'FUKUDA: ¿Creen se ganarán nuestra admiración…?');
  t.eq('una cabecera de Excel no son tarjetas', M.ordenarTarjetas([linea('IN-TIMECODE OUT-TIMECODE SOURCE DIALOGUE', 0), linea('00:00:05:06 00:00:09:14 BHAVANI Hola.', 30)], dicT, []), null);

  /* El Excel: la cabecera dice qué columna es cada una. La casilla de RUDRA
     tiene dos líneas y el nombre, alineado abajo, cae en la segunda. */
  const pal = (text, x0, y) => ({ text, bbox: { x0, x1: x0 + text.length * 8, y0: y, y1: y + 16 } });
  const fila1 = (y, xs, textos) => textos.map((w, k) => pal(w, xs[k], y));
  const tabla = M.ordenarCaptura([
    ...fila1(0, [0, 200, 350, 600, 900, 970], ['IN-TIMECODE', 'SOURCE', 'TRANSCRIPTION', 'DIALOGUE', 'SOURCE', 'ONSCREEN']),
    ...fila1(30, [0, 200, 350, 400, 460, 600, 645, 680, 760, 900], ['00:05:31:02', 'BHAVANI', 'All', 'your', 'efforts', 'Todo', 'tus', 'esfuerzos', 'fueron.', 'ON']),
    ...fila1(60, [600, 640, 690], ['Te', 'iba', 'a']),
    ...fila1(80, [0, 200, 350, 380, 600, 650, 700, 900], ['00:05:33:10', 'RUDRA', 'I', 'was', 'decir', 'que…', 'ya', 'OFF'])
  ], dicT, [20, 50, 100]);
  t.eq('tabla con cabecera: el personaje y el diálogo, sin timecodes, inglés ni ON/OFF', tabla && tabla.texto,
    'BHAVANI: Todo tus esfuerzos fueron.\nRUDRA: Te iba a decir que… ya');
  t.eq('sabe que la sacó de la cabecera', tabla && tabla.como, 'cabecera');

  for(const id of ['ocr-lib', 'ocr-worker', 'ocr-core', 'ocr-spa']){
    const b64 = (new RegExp('<script id="' + id + '" type="text/plain">([^<]{40})').exec(html) || [])[1];
    const cab = b64 ? Buffer.from(b64.slice(0, 4), 'base64') : Buffer.alloc(0);
    t.ok('el lector de capturas va dentro (' + id + ')', cab[0] === 0x1f && cab[1] === 0x8b);
  }

  t.seccion('Una pregunta partida en dos eventos (estilo del estudio)');
  const dicP = M.crearDiccionario('creen que se ganarán nuestra admiración y conseguirán su independencia me habrá traído el libro'.split(' '), []);
  let pp = M.revisarTexto('FUKUDA: ¿Creen que se ganarán nuestra admiración…?\nFUKUDA: ¿…y conseguirán su independencia?', dicP);
  t.eq('cerrada en cada evento y abierta otra vez: es lo correcto', pp.hallazgos.length, 0);
  pp = M.revisarTexto('FUKUDA: ¿Creen se ganarán nuestra admiración…?\nFUKUDA: ¿…y conseguirán su independencia?', dicP);
  t.eq('«creen se ganarán»: solo falta el «que»', pp.hallazgos.map(h => h.regla + ':' + h.sug), ['dequeismo:Creen que se ganarán']);
  pp = M.revisarTexto('FUKUDA: ¿Creen que se ganarán nuestra admiración…\nFUKUDA: …y conseguirán su independencia?', dicP);
  t.eq('abierta en uno y cerrada en otro: se cierra en el primero y se abre en el segundo',
    pp.hallazgos.map(h => h.fila + ':' + h.regla + ':' + h.sug), ['1:preguntaPartida:…?', '2:preguntaPartida:¿…']);
  t.ok('y no se avisa además «se abre y no se cierra»', !pp.hallazgos.some(h => h.regla === 'signosPares'));
  pp = M.revisarTexto('FUKUDA: ¿Creen que se ganarán nuestra admiración…\nFUKUDA: ¿…y conseguirán su independencia?', dicP);
  t.eq('a medio corregir, cerrar la primera', pp.hallazgos.map(h => h.fila + ':' + h.regla + ':' + h.sug), ['1:preguntaPartida:…?']);
  t.eq('dos preguntas de verdad, nada', M.revisarTexto('¿Me habrá traído…?\n¿Y el libro?', dicP).hallazgos.length, 0);

  t.seccion('El Excel, de ida y vuelta');
  const libro = M.xlsx([{ nombre: 'Dialogue List', filas: [
    ['IN-TIMECODE', 'OUT-TIMECODE', 'SOURCE', 'TRANSCRIPTION', 'DIALOGUE', 'ANNOTATIONS', 'TAGS', 'SOURCE ONSCREEN'],
    ['00:00:05:06', '00:00:09:14', 'YOUNG GURUAMMA', '', 'Pero ya lo sabías… <&> «ñ»', '', '', 'ON']
  ] }, { nombre: 'Project Info', filas: [['SHOW TITLE', 'Akka']] }]);
  const g = M.extraerGuion(await M.leerLibro(new Uint8Array(await libro.arrayBuffer())));
  t.eq('se lee la hoja que se escribió', g.hoja, 'Dialogue List');
  t.eq('el diálogo vuelve igual, con sus signos', g.filas[0].dialogo, 'Pero ya lo sabías… <&> «ñ»');
  t.eq('y la información del proyecto', g.info['SHOW TITLE'], 'Akka');
};
