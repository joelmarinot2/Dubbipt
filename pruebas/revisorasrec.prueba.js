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
  'para consagrar como protectora con las bendiciones guerrera sí era hola amigo').split(' ');

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
  t.ok('/ y ^ son símbolos que la guía ASR admite', !reglas(res, 10).includes('simbolos'));
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
  p = M.revisarTexto('Rezaré a la diosa Makwathi (Matwáti).', dic, { contexto: ctx });
  t.ok('con un guion abierto, su guía de pronunciación manda', p.hallazgos.some(h => h.regla === 'guias' && h.sug === 'Makwathi (matwáti)'));
  p = M.revisarTexto('Rezaré a la diosa Makwathi.', dic, { contexto: ctx });
  t.ok('y avisa si el nombre va sin su guía', p.hallazgos.some(h => h.regla === 'sinGuia' && h.sug === 'Makwathi (matwáti)'));
  t.ok('lo que solo existe en el Excel no se revisa', !M.revisarTexto('Hola.', dic).hallazgos.some(h => h.regla === 'timecode' || h.regla === 'personaje'));

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
