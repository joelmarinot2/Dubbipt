'use strict';
/* Prueba visual: pone un guion en el overlay, lo muestra sobre lo que haya en
   pantalla y captura el ESCRITORIO entero. Si en la imagen se ve el texto sin
   ningun rectangulo de fondo, la transparencia funciona de verdad.

   Se lanza con:  node_modules/electron/dist/electron.exe tools/captura.js
*/

const fs = require('fs');
const path = require('path');
const SALIDA = path.join(__dirname, 'captura.png');
const LOG = path.join(__dirname, 'captura-log.txt');
const SALTO = String.fromCharCode(10);
let buffer = '';
const linea = (t) => { buffer += t + SALTO; try{ fs.writeFileSync(LOG, buffer); }catch(e){} };

process.on('uncaughtException', (e) => { linea('EXCEPCION: ' + ((e && e.stack) || e)); process.exit(1); });

require('../main.js');
const { app, BrowserWindow, desktopCapturer, screen } = require('electron');
setTimeout(() => { linea('AGOTADO'); app.exit(1); }, 60000);

// Escena larga a proposito: hay que ver que solo asoman tres lineas y que la
// linea en curso queda centrada, no que se pinta el guion entero en pantalla.
const TEXTO = [
  'Nunca pense que volveria a verte en un sitio como este.',
  'Y sin embargo aqui estas, puntual como siempre.',
  'Te dije que no volvieras a llamarme, y lo dije en serio.',
  'Lo se. Pero esta vez no vengo a pedirte nada.',
  'Entonces dime que quieres y acabemos con esto de una vez.',
  'Solo quiero que escuches lo que tengo que contarte.',
  'Tienes cinco minutos. Ni uno mas.'
].join(SALTO);

app.whenReady().then(async () => {
  const wins = BrowserWindow.getAllWindows();
  const control = wins.find(w => w.getTitle().indexOf('Overlay para') === 0) || wins[0];
  const overlay = wins.find(w => w !== control);
  await new Promise(res => overlay.webContents.isLoading()
    ? overlay.webContents.once('did-finish-load', res) : res());
  await new Promise(res => control.webContents.isLoading()
    ? control.webContents.once('did-finish-load', res) : res());

  // guion repartido a mano, para no depender del audio en esta prueba
  await control.webContents.executeJavaScript(`(() => {
    const fichas = tokenize(${JSON.stringify(TEXTO)});
    const ws = palabras(fichas);
    const words = ws.map((w, i) => ({wi: w.wi, t0: i * 0.35, t1: i * 0.35 + 0.35}));
    window.pt.aOverlay({tipo:'guion', fichas, words, maxChars: 46});
    window.pt.aOverlay({tipo:'estilo', tam: 46, abajo: 12,
      pendiente:'#e9edf6', activa:'#ffd24a', hecha:'#8f9bb3'});
    window.pt.aOverlay({tipo:'ver', v: true});
    // parado a mitad de la frase, para que se vea el barrido a medias
    // parado por la mitad del guion, a media palabra
    window.pt.aOverlay({tipo:'reloj', t: words[Math.floor(words.length/2)].t0 + 0.17, en: Date.now(), rodando: false});
    return ws.length;
  })()`).then(n => linea('palabras en el guion: ' + n));

  overlay.showInactive();
  overlay.setAlwaysOnTop(true, 'screen-saver');
  await new Promise(res => setTimeout(res, 1500));
  linea('overlay visible: ' + overlay.isVisible());

  const { width, height } = screen.getPrimaryDisplay().size;
  const fuentes = await desktopCapturer.getSources({
    types: ['screen'], thumbnailSize: { width, height }
  });
  if(!fuentes.length){ linea('no hay fuentes de pantalla'); return app.exit(1); }
  fs.writeFileSync(SALIDA, fuentes[0].thumbnail.toPNG());
  linea('captura guardada: ' + SALIDA);
  linea('tamano: ' + fuentes[0].thumbnail.getSize().width + 'x' +
        fuentes[0].thumbnail.getSize().height);

  // ¿que se ve en la banda? Se lee el estado del propio overlay.
  const est = await overlay.webContents.executeJavaScript(`JSON.stringify({
    palabras: document.querySelectorAll('#lineas .pal').length,
    lineas: document.querySelectorAll('#lineas .linea').length,
    hechas: document.querySelectorAll('#lineas .pal.hecha').length,
    activa: (document.querySelector('#lineas .pal.activa .base') || {}).textContent || null,
    bandaVisible: !document.getElementById('banda').classList.contains('oculto')
  })`);
  linea('estado del overlay: ' + est);
  setTimeout(() => app.exit(0), 200);
});
