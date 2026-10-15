/* Episodios activos desde una captura · especificacion 09, PRO-51
 *
 * Pedido de sala, con una captura de la lista: «que en los episodios
 * diarios se pueda subir una captura como esta». Lo que protege esta
 * prueba: lo leído de una captura se limpia (etiquetas «GUEST», iconos, la
 * raya del borde, líneas vacías y repetidas) sin tocar el nombre ni el
 * episodio; la imagen se prepara (agrandada, en grises, invertida si es
 * oscura) y se lee con Tesseract, que se carga una vez; y la ventana deja
 * subirla, arrastrarla o pegarla, y la vuelca al texto para revisarla.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Casting: episodios activos desde una captura';

const RAIZ = path.dirname(INDEX);
const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
const castNorm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

/* Lo que Tesseract suele devolver de una captura como la de sala. */
const LEIDO = [
  '| Always on Call: Season 1 - EP4 GUEST &',
  '| 100 Days of Deception EP7 GUEST ©',
  '| Lyla in the Loop 205AB - DUB 5 GUEST |',
  '| HHL - Most Extreme Humans S1 Ep. 104 H#640842 (DUB) GUEST %',
  '| Final Table: Season 1 - EP5 GUEST',
  '',
  '| The Wayans Bros Season 3 EP 1 GUEST',
  '| Big John’s Bosh Family fka Meet the Fishers - EP4 GUEST &',
  '| A Filipino Christmas: Season 1 - EP2 GUEST',
  '| TLC - One Born Every Minute: UK S9 Ep. 903 H#210072 (DUBBING) GUEST',
  '| HHL - Brain Doctors: Inside Neurosurgery S1 EP101 H#660225 (DUBBING) - SCREENER GUEST »',
  '| Trailer: Avedon GUEST ¥',
  'GUEST',
  '— | «',
  '| The Wayans Bros Season 3 EP 1 GUEST'
].join('\n');

exports.pruebas = async function(t){
  const M = montar([['const CS_OCR = {', '/** Aplica la lista: los activos en producción']],
    ['csActivosLimpiarOcr', 'csOcrCargar', 'csOcrPreparar', 'csActivosLeerImagen', 'CS_OCR'], { castNorm: castNorm, document: {}, Tesseract: undefined, Image: undefined, URL: undefined });

  t.seccion('1 · lo leído, limpio');
  const l = M.csActivosLimpiarOcr(LEIDO);
  t.eq('una línea por episodio, sin etiquetas, iconos ni la raya del borde', l.join(' / '),
    'Always on Call: Season 1 - EP4 / 100 Days of Deception EP7 / Lyla in the Loop 205AB - DUB 5 / HHL - Most Extreme Humans S1 Ep. 104 H#640842 (DUB) / Final Table: Season 1 - EP5 / The Wayans Bros Season 3 EP 1 / Big John\'s Bosh Family fka Meet the Fishers - EP4 / A Filipino Christmas: Season 1 - EP2 / TLC - One Born Every Minute: UK S9 Ep. 903 H#210072 (DUBBING) / HHL - Brain Doctors: Inside Neurosurgery S1 EP101 H#660225 (DUBBING) - SCREENER / Trailer: Avedon');
  t.eq('las vacías, las que solo son etiqueta o basura, y las repetidas, fuera', l.length, 11);
  t.eq('lo que es del nombre se queda: (DUB), SCREENER, H#…', M.csActivosLimpiarOcr('Show S1 Ep. 2 (DUB)\nShow S1 Ep. 3 - SCREENER\nShow H#123 EP 4').join(' / '), 'Show S1 Ep. 2 (DUB) / Show S1 Ep. 3 - SCREENER / Show H#123 EP 4');
  t.eq('sin texto, nada', JSON.stringify(M.csActivosLimpiarOcr('')) + JSON.stringify(M.csActivosLimpiarOcr(null)), '[][]');

  t.seccion('2 · leer la imagen');
  {
    const D = { scripts: [], workers: [], params: [], liberadas: 0 };
    const pix = [20, 20, 20, 255, 30, 30, 30, 255];                     /* oscuro: se invierte */
    const ctx2 = { getImageData: () => ({ data: pix.slice() }), putImageData: (d) => { D.puesto = Array.from(d.data); }, drawImage: () => {}, imageSmoothingQuality: '' };
    const lienzo = { getContext: () => ctx2 };
    class Img { set src(v){ this._src = v; this.naturalWidth = 600; this.naturalHeight = 300; setTimeout(() => this.onload(), 0); } }
    const T = { createWorker: async (lang, oem, op) => {
      D.workers.push([lang, oem, op.langPath]);
      return { setParameters: async (p) => D.params.push(p), recognize: async (c) => { D.leido = c; op.logger({ status: 'recognizing text', progress: 0.5 }); return { data: { text: LEIDO } }; }, terminate: async () => { D.liberadas++; } };
    } };
    const R = montar([['const CS_OCR = {', '/** Aplica la lista: los activos en producción']], ['csActivosLeerImagen', 'csOcrCargar', 'CS_OCR'],
      { castNorm: castNorm, Tesseract: T, Image: Img, URL: { createObjectURL: () => 'blob:x', revokeObjectURL: () => { D.revocadas = (D.revocadas || 0) + 1; } },
        document: { createElement: (tag) => tag === 'canvas' ? lienzo : null, head: { appendChild: (s) => D.scripts.push(s.src) } } });
    const avances = [];
    const lineas = await R.csActivosLeerImagen({ type: 'image/png' }, (p, q) => avances.push(q + (p != null ? ' ' + p : '')));
    t.eq('lee y devuelve las líneas limpias', lineas.length + ' ' + lineas[0], '11 Always on Call: Season 1 - EP4');
    t.eq('con Tesseract en inglés y su idioma desde jsDelivr', JSON.stringify(D.workers[0]), '["eng",1,"https://cdn.jsdelivr.net/npm/@tesseract.js-data/eng/4.0.0_best_int"]');
    t.eq('la imagen, agrandada a 1800 de ancho (x3 como mucho)', lienzo.width + 'x' + lienzo.height, '1800x900');
    t.eq('en grises e invertida si es oscura, y eso es lo que se lee', D.puesto.slice(0, 3).join(',') + ' ' + (D.leido === lienzo), '235,235,235 true');
    t.eq('dice por dónde va, y libera el lector y la imagen', avances.join(' | ') + ' · ' + D.liberadas + ' ' + D.revocadas, 'cargando el lector de texto… | leyendo 50 · 1 1');
    t.ok('modo de bloque de texto y espacios entre palabras', D.params[0].tessedit_pageseg_mode === '6' && D.params[0].preserve_interword_spaces === '1');
    t.ok('ya cargado, no se vuelve a pedir el script', D.scripts.length === 0);
  }
  {
    const D = { scripts: [] };
    const R = montar([['const CS_OCR = {', '/** Aplica la lista: los activos en producción']], ['csOcrCargar', 'CS_OCR'],
      { castNorm: castNorm, Tesseract: undefined, document: { createElement: () => ({}), head: { appendChild: (s) => { D.scripts.push(s.src); setTimeout(() => s.onerror(), 0); } } } });
    let err = '';
    try{ await R.csOcrCargar(); }catch(e){ err = e.message; }
    t.eq('sin conexión: se dice, y se puede volver a intentar', D.scripts[0] + ' · ' + err + ' · ' + R.CS_OCR.cargando, 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js · no se ha podido cargar el lector de texto (sin conexión?) · null');
  }

  t.seccion('3 · la ventana');
  {
    t.ok('subir, arrastrar o pegar la captura', /id="csActImgArch" accept="image\/\*" multiple hidden/.test(CV) && /tx\.addEventListener\('paste'/.test(CV) && /caja\.addEventListener\('drop'/.test(CV));
    t.ok('lo leído se añade al texto, se revisa y se casa como siempre', /tx\.value = \(ya \? ya \+ '\\n' : ''\) \+ lineas\.join\('\\n'\);/.test(CV) && /zona\.classList\.remove\('leyendo'\);\s*\n\s*ver\(\);/.test(CV));
    t.ok('si falla, se dice y se puede pegar el texto', /No se pudo leer la captura: /.test(CV));
    const V = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
    const csp = V.headers.find(h => h.source === '/((?!dublajecast|dctools).*)').headers.find(h => h.key === 'Content-Security-Policy').value;
    t.ok('la política de seguridad ya lo deja: el script y su idioma de jsDelivr, el lector en un blob, y WebAssembly', /script-src[^;]*https:\/\/cdn\.jsdelivr\.net/.test(csp) && /connect-src[^;]*https:\/\/cdn\.jsdelivr\.net/.test(csp) && /worker-src[^;]*blob:/.test(csp) && /'wasm-unsafe-eval'/.test(csp));
    t.ok('ni un emoji', !/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(CV.slice(CV.indexOf('const CS_OCR = {'), CV.indexOf('/** Aplica la lista: los activos en producción'))));
  }
};
