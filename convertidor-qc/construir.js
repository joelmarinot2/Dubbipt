/* Construye convertidor-qc.html · un solo archivo que funciona sin internet
 *
 *   node convertidor-qc/construir.js              escribe convertidor-qc.html en la raíz
 *   node convertidor-qc/construir.js --comprobar  no escribe: sale con error si no está al día
 *
 * Pedido de sala: «quiero que me des el HTML de lo del formato de QC para que
 * funcione localmente».
 *
 * El convertidor de informes de QC de la aplicación (Herramientas →
 * Convertidor PDF QC) necesita la aplicación servida por http, la sesión y
 * dos librerías que se bajan de internet. Esto lo deja en un archivo que se
 * abre con doble clic, en cualquier equipo, sin red y sin cuenta.
 *
 * NO es una copia del convertidor: lleva dentro el mismo js/qcpdf.js de la
 * aplicación y, de index.html, los tipos de corrección. Por eso hay que
 * volver a construirlo cuando cualquiera de los dos cambia
 * (pruebas/convertidorqc.prueba.js lo vigila).
 *
 *   plantilla.html           la página
 *   ../js/qcpdf.js           el motor: leer el informe y dibujar el PDF
 *   ../index.html            los tipos de corrección, esc y _svgI
 *   lib/jspdf.umd.min.js     jsPDF 2.5.1 (MIT): escribe el PDF
 *   lib/pdf.min.js           pdf.js 3.11.174 (Apache 2.0): lee el PDF que entra
 *   lib/pdf.worker.min.js    su hilo de trabajo
 */
'use strict';
const fs = require('fs');
const path = require('path');

const AQUI = __dirname;
const RAIZ = path.join(AQUI, '..');
const SALIDA = path.join(RAIZ, 'convertidor-qc.html');

const leer = (...p) => fs.readFileSync(path.join(...p), 'utf8').replace(/\r\n/g, '\n');

/** Un trozo de index.html, entre dos marcas (la segunda no entra). */
function trozo(html, desde, hasta){
  const a = html.indexOf(desde);
  const b = a < 0 ? -1 : html.indexOf(hasta, a);
  if(a < 0 || b < 0) throw new Error('index.html ya no tiene «' + (a < 0 ? desde : hasta) + '»: revisa convertidor-qc/construir.js');
  return html.slice(a, b);
}
/** Una línea de index.html que empieza así. */
function linea(html, empieza){
  const a = html.indexOf('\n' + empieza);
  if(a < 0) throw new Error('index.html ya no tiene «' + empieza + '»: revisa convertidor-qc/construir.js');
  return html.slice(a + 1, html.indexOf('\n', a + 1));
}

/** Lo que el motor usa de index.html: escapar texto, los iconos y los cuatro tipos de corrección. */
function deIndex(html){
  return [
    "'use strict';",
    linea(html, 'function esc(s){'),
    linea(html, 'const _svgI = '),
    trozo(html, '/* Los cuatro tipos de corrección', '/** Quién revisa y qué estudio hace los cambios.').trim()
  ].join('\n');
}

function construir(fecha){
  const plantilla = leer(AQUI, 'plantilla.html');
  const piezas = {
    '/*@@JSPDF@@*/': leer(AQUI, 'lib', 'jspdf.umd.min.js'),
    '/*@@PDFJS@@*/': leer(AQUI, 'lib', 'pdf.min.js'),
    '@@PDFWORKER@@': leer(AQUI, 'lib', 'pdf.worker.min.js'),
    '/*@@DE_INDEX@@*/': deIndex(leer(RAIZ, 'index.html')),
    '/*@@MOTOR@@*/': leer(RAIZ, 'js', 'qcpdf.js')
  };
  let html = plantilla;
  for(const [marca, texto] of Object.entries(piezas)){
    if(plantilla.split(marca).length !== 2) throw new Error('plantilla.html debe llevar una vez la marca ' + marca);
    /* Dentro de un <script>, estas dos secuencias lo cierran o lo estropean. */
    if(/<\/script|<!--/i.test(texto)) throw new Error('lo que va en ' + marca + ' no puede llevar «</script» ni «<!--» dentro');
    /* Con función de reemplazo: un «$&» dentro de una librería no debe interpretarse. */
    html = html.replace(marca, () => texto);
  }
  if(plantilla.split('@@FECHA@@').length !== 2) throw new Error('plantilla.html debe llevar una vez la marca @@FECHA@@');
  return html.replace('@@FECHA@@', () => fecha);
}

/** La fecha que lleva el archivo ya construido (para comprobar sin que el día cambie el resultado). */
function fechaDe(html){
  const m = /construido el (\d{4}-\d{2}-\d{2}) ·/.exec(html || '');
  return m ? m[1] : null;
}

if(require.main === module){
  const hay = fs.existsSync(SALIDA) ? fs.readFileSync(SALIDA, 'utf8').replace(/\r\n/g, '\n') : '';
  if(process.argv.includes('--comprobar')){
    if(!hay || construir(fechaDe(hay) || '') !== hay){
      console.error('convertidor-qc.html no está al día: corre `node convertidor-qc/construir.js`');
      process.exit(1);
    }
    console.log('convertidor-qc.html está al día');
  }else{
    const hoy = new Date().toISOString().slice(0, 10);
    /* Si solo cambiaría la fecha, no se toca: que construir dos veces no ensucie el repositorio. */
    if(hay && construir(fechaDe(hay) || '') === hay){
      console.log('convertidor-qc.html ya estaba al día');
    }else{
      const html = construir(hoy);
      fs.writeFileSync(SALIDA, html, 'utf8');
      console.log('convertidor-qc.html · ' + (Buffer.byteLength(html) / 1048576).toFixed(2) + ' MB');
    }
  }
}

module.exports = { construir, fechaDe, deIndex, SALIDA };
