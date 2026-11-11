/* El convertidor de QC en un solo archivo · convertidor-qc.html · especificacion 09, PDF-26
 *
 * Pedido de sala: «quiero que me des el HTML de lo del formato de QC para que
 * funcione localmente».
 *
 * convertidor-qc.html se abre con doble clic, sin servidor, sin internet y
 * sin cuenta. No es una copia del convertidor de la aplicación: lleva dentro
 * el mismo js/qcpdf.js y, de index.html, los tipos de corrección.
 *
 * Lo que protege esta prueba: que el archivo construido lleva el motor y los
 * tipos DE AHORA (si alguien cambia js/qcpdf.js y no reconstruye, el archivo
 * que se reparte se quedaría viejo sin que nadie lo notara); que no carga
 * nada de fuera; que lleva dentro las dos librerías y el hilo del lector de
 * PDF, de las mismas versiones que usa la aplicación; y que lo que toma de
 * index.html funciona suelto.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { RAIZ, INDEX } = require('./ayuda');
const { construir, fechaDe, deIndex, SALIDA } = require('../convertidor-qc/construir.js');

exports.nombre = 'El convertidor de QC en un solo archivo, sin internet';

const guion = (html, id) => {
  const m = new RegExp('<script id="' + id + '"[^>]*>\\n?([\\s\\S]*?)<\\/script>').exec(html);
  if(!m) throw new Error('convertidor-qc.html no tiene <script id="' + id + '">');
  return m[1];
};

exports.pruebas = function(t){
  const html = fs.readFileSync(SALIDA, 'utf8').replace(/\r\n/g, '\n');
  const INDEXHTML = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');
  const motor = fs.readFileSync(path.join(RAIZ, 'js', 'qcpdf.js'), 'utf8').replace(/\r\n/g, '\n');

  t.seccion('1 · el archivo que se reparte está al día');
  t.ok('lleva el js/qcpdf.js de ahora (si no: node convertidor-qc/construir.js)', guion(html, 'motor').trim() === motor.trim());
  t.ok('y los tipos de corrección de index.html de ahora (si no: node convertidor-qc/construir.js)', guion(html, 'de-index').trim() === deIndex(INDEXHTML).trim());
  t.ok('construirlo otra vez da lo mismo, letra a letra', !!fechaDe(html) && construir(fechaDe(html)) === html);
  t.ok('dice cuándo se construyó', /^\d{4}-\d{2}-\d{2}$/.test(fechaDe(html) || ''), String(fechaDe(html)));

  t.seccion('2 · no depende de nada de fuera');
  /* La página sin lo que llevan dentro sus <script> (una librería trae «<script src=» escrito en una cadena, y no es una etiqueta). */
  const cascara = html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/g, '$1$2');
  t.ok('ni un script ni una hoja de estilos de fuera: todo va dentro', (cascara.match(/<script\b/g) || []).length === 6 && !/<script[^>]+\bsrc=/.test(cascara) && !/<link\b/.test(cascara)
       && !/@import|url\(\s*["']?https?:/.test(cascara) && !/\b(?:src|href)=["']https?:/.test(cascara));
  t.ok('jsPDF 2.5.1 y pdf.js 3.11.174, los mismos que usa la aplicación', /2\.5\.1/.test(guion(html, 'lib-jspdf').slice(0, 600)) && /3\.11\.174/.test(guion(html, 'lib-pdfjs'))
       && /jspdf\/2\.5\.1\/jspdf\.umd\.min\.js/.test(motor) && /pdf\.js\/3\.11\.174\/pdf\.min\.js/.test(INDEXHTML));
  t.ok('el hilo del lector de PDF va dentro, como texto, y se arranca desde la memoria (desde un archivo no se puede cargar otro)',
       /<script id="lib-pdfworker" type="text\/plain">/.test(html) && guion(html, 'lib-pdfworker').length > 500000 && /3\.11\.174/.test(guion(html, 'lib-pdfworker'))
       && /GlobalWorkerOptions\.workerSrc = URL\.createObjectURL\(new Blob\(\[codigo\], \{ type: 'text\/javascript' \}\)\)/.test(guion(html, 'pantalla')));
  t.ok('con jsPDF ya dentro, el motor no lo baja', /if\(window\.jspdf && window\.jspdf\.jsPDF\) return Promise\.resolve\(window\.jspdf\.jsPDF\);/.test(motor));
  t.ok('ninguna pieza cierra su <script> antes de tiempo', ['lib-jspdf', 'lib-pdfjs', 'lib-pdfworker', 'de-index', 'motor', 'pantalla'].every(id => !/<\/script|<!--/i.test(guion(html, id))));

  t.seccion('3 · lo que toma de index.html funciona suelto');
  {
    const ctx = vm.createContext({});
    vm.runInContext(guion(html, 'de-index') + ';this.X = { esc, _svgI, QC_TIPOS, qcTipo, qcTipoSugerido, qcCuentaTipos };', ctx);
    const X = ctx.X;
    t.eq('los cuatro tipos, en su orden', X.QC_TIPOS.map(x => x.et).join(' '), 'Falta Cambiar Pegar Ajuste');
    t.eq('el tipo se deduce igual que en la aplicación', ['Falta el take. Pegar.', 'Falta el take.', 'Cambiar «sal» por «azúcar»', 'Subir el volumen'].map(X.qcTipoSugerido).join(' '), 'pegar falta cambiar ajuste');
    t.eq('y se cuentan, sin los ceros', X.qcCuentaTipos([{ tipo: 'falta' }, { tipo: 'falta' }, { tipo: 'pegar' }]).map(x => x.n + ' ' + x.et).join(' · '), '2 Falta · 1 Pegar');
    t.eq('el texto se escapa', X.esc('<b>"a"</b>'), '&lt;b&gt;&quot;a&quot;&lt;&#47;b&gt;');
    t.ok('y los iconos se dibujan', /^<svg viewBox="0 0 24 24" width="14" height="14"/.test(X._svgI('<path d="M0 0"/>', 2, 14)));
  }

  t.seccion('4 · la página');
  const pantalla = guion(html, 'pantalla');
  let sintaxis = true;
  try{ new Function(pantalla); }catch(e){ sintaxis = e.message; }
  t.ok('la pantalla no tiene la sintaxis rota', sintaxis === true, String(sintaxis));
  t.ok('el convertidor es la página (no una ventana): tiene dónde pintarse y se pinta al abrir', /<main id="convOv"><\/main>/.test(html) && /\n  qcConvPintar\(\);\n\}\)\(\);/.test(pantalla));
  t.ok('«Cerrar» aquí vacía la lista, no quita la página', /qcConvCerrar = function\(\)\{\s+QCCONV\.archivos = \[\]; QCCONV\.poster = null; QCCONV\.trabajando = false;\s+qcConvPintar\(\);/.test(pantalla) && /x\.textContent = 'Vaciar la lista';/.test(pantalla));
  t.ok('un archivo soltado fuera del recuadro no se abre en la pestaña: también cuenta', /\['dragover', 'drop'\]\.forEach\(ev => document\.addEventListener\(ev, \(e\) => \{ e\.preventDefault\(\); \}\)\);/.test(pantalla) && /document\.addEventListener\('drop', \(e\) => \{ qcConvAnadir\(/.test(pantalla));
  t.ok('quién revisa y el estudio se recuerdan en el equipo, y sin almacén no falla', /localStorage\.setItem\(CLAVE, JSON\.stringify\(\{ revisor:/.test(pantalla) && /QCCONV\.revisor = String\(g\.revisor \|\| ''\)\.slice\(0, 90\);/.test(pantalla));
  t.ok('si el lector de PDF no arranca, se dice (y el TXT sigue sirviendo)', /avisar\('El lector de PDF no ha podido arrancar/.test(pantalla));
  t.ok('las fuentes no se publican; el archivo construido, sí', /^convertidor-qc\/$/m.test(fs.readFileSync(path.join(RAIZ, '.vercelignore'), 'utf8')));
};
