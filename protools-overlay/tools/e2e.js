'use strict';
/* Prueba de la aplicacion de verdad: arranca main.js, mira como quedaron las
   ventanas, recoge los errores de consola de cada renderizador y hace pasar
   una alineacion completa por el worker. Al terminar, cierra.

   Se lanza con:  npx electron tools/e2e.js
*/

const fs = require('fs');
const path = require('path');
// En Windows, Electron es aplicacion de ventana: su stdout no llega a la
// consola que la lanzo. El informe se escribe en un archivo, que si se lee.
const SALIDA = path.join(__dirname, 'e2e-resultado.txt');
const fallos = [];
let buffer = '';
const SALTO = String.fromCharCode(10);
const linea = (t) => { buffer += t + SALTO; try{ fs.writeFileSync(SALIDA, buffer); }catch(e){} };
process.on('uncaughtException', (e) => { linea('EXCEPCION: ' + ((e && e.stack) || e)); process.exit(1); });
linea('arranca la prueba');

try{ require('../main.js'); linea('main.js cargado'); }
catch(e){ linea('main.js FALLO: ' + ((e && e.stack) || e)); process.exit(1); }
const { app, BrowserWindow } = require('electron');
linea('electron ' + process.versions.electron);
// si algo se cuelga, que no quede la ventana abierta para siempre
setTimeout(() => { linea('AGOTADO: no termino en 45 s'); app.exit(1); }, 45000);

function espiar(win, nombre){
  win.webContents.on('console-message', (_e, nivel, texto) => {
    if(nivel >= 2 && !/Electron Security Warning/.test(texto))
      fallos.push(nombre + ' consola: ' + texto);
  });
  win.webContents.on('preload-error', (_e, ruta, err) => {
    fallos.push(nombre + ' preload: ' + err.message);
  });
  win.webContents.on('did-fail-load', (_e, code, desc) => {
    fallos.push(nombre + ' no cargo: ' + desc + ' (' + code + ')');
  });
}

const listo = (win) => new Promise((res) => {
  if(!win.webContents.isLoading()) return res();
  win.webContents.once('did-finish-load', res);
});

app.whenReady().then(async () => {
  const wins = BrowserWindow.getAllWindows();
  const control = wins.find(w => w.getTitle().indexOf('Overlay para') === 0) || wins[0];
  const overlay = wins.find(w => w !== control);
  espiar(control, 'control');
  espiar(overlay, 'overlay');
  await Promise.all([listo(control), listo(overlay)]);

  linea('\n== VENTANAS ==');
  const comprobar = (etiqueta, valor, esperado) => {
    const bien = valor === esperado;
    linea((bien ? '  ok   ' : '  FALLO') + ' ' + etiqueta + ': ' + valor);
    if(!bien) fallos.push(etiqueta + ' = ' + valor + ', se esperaba ' + esperado);
  };
  comprobar('overlay siempre encima', overlay.isAlwaysOnTop(), true);
  comprobar('overlay no movible', overlay.isMovable(), false);
  comprobar('overlay no enfocable', overlay.isFocusable(), false);
  comprobar('overlay vivo', overlay.isDestroyed(), false);
  linea('  ..   tamano overlay: ' + JSON.stringify(overlay.getBounds()));

  // Transparencia: el fondo real de la pagina tiene que ser transparente.
  const fondo = await overlay.webContents.executeJavaScript(
    'getComputedStyle(document.body).backgroundColor');
  comprobar('fondo del overlay transparente', fondo, 'rgba(0, 0, 0, 0)');

  // Los modulos tienen que estar en el ambito de la pagina, sin require.
  const globs = await overlay.webContents.executeJavaScript(
    'JSON.stringify({tl: typeof Timeline, li: typeof lineas, pt: typeof window.pt})');
  linea('  ..   globales del overlay: ' + globs);
  if(JSON.parse(globs).tl !== 'function') fallos.push('Timeline no llego al overlay');
  if(JSON.parse(globs).pt !== 'object')  fallos.push('el puente pt no llego al overlay');

  linea('\n== WORKER Y ALINEACION (dentro del renderizador) ==');
  const r = await control.webContents.executeJavaScript(`(async () => {
    const SR = 16000, x = new Float32Array(SR * 12);
    let t = 0.4;
    const marcasReales = [];
    for(let p = 0; p < 12; p++){
      marcasReales.push(t);
      for(let k = 0; k < 3; k++){
        const dur = 0.14, a = Math.round(t * SR), b = Math.round((t + dur * 0.9) * SR);
        for(let i = a; i < b; i++){
          const u = (i - a) / (b - a);
          x[i] += Math.sin(Math.PI * u) * 0.4 * Math.sin(2 * Math.PI * 130 * i / SR);
        }
        t += dur;
      }
      t += 0.25;
    }
    const texto = Array.from({length: 12}, (_, i) => 'palabra' + i).join(' ');
    const w = new Worker('../src/align/worker.js');
    const res = await new Promise((ok, mal) => {
      const reloj = setTimeout(() => mal(new Error('el worker no contesto en 15 s')), 15000);
      w.onmessage = (e) => { clearTimeout(reloj); ok(e.data); };
      w.onerror = (e) => { clearTimeout(reloj); mal(new Error(e.message || 'error del worker')); };
      w.postMessage({texto, samples: x, sampleRate: SR}, [x.buffer]);
    });
    if(!res.ok) return {ok: false, msg: res.msg};
    let peor = 0;
    res.words.forEach((p, i) => { peor = Math.max(peor, Math.abs(p.t0 - marcasReales[i]) * 1000); });
    return {ok: true, n: res.words.length, motor: res.motor, tramos: res.segs.length, peorMs: peor};
  })()`).catch(e => ({ ok: false, msg: String(e.message || e) }));

  if(r.ok){
    linea('  ok   el worker arranco desde file:// y devolvio ' + r.n + ' palabras');
    linea('  ok   motor "' + r.motor + '", ' + r.tramos + ' tramos, peor error ' + r.peorMs.toFixed(1) + ' ms');
    if(r.n !== 12) fallos.push('el worker devolvio ' + r.n + ' palabras, se esperaban 12');
    if(r.peorMs > 50) fallos.push('peor error ' + r.peorMs.toFixed(1) + ' ms');
  }else{
    linea('  FALLO el worker: ' + r.msg);
    fallos.push('worker: ' + r.msg);
  }

  linea('\n== PUENTE CONTROL -> OVERLAY ==');
  await control.webContents.executeJavaScript(
    "window.pt.aOverlay({tipo:'guion', fichas:[{t:'hola',wi:0},{t:' ',sep:true},{t:'mundo',wi:1}]," +
    " words:[{wi:0,t0:0,t1:1},{wi:1,t0:1,t1:2}]}); true");
  await new Promise(res => setTimeout(res, 400));
  const pintado = await overlay.webContents.executeJavaScript(
    "document.querySelectorAll('#lineas .pal').length");
  linea((pintado === 2 ? '  ok   ' : '  FALLO') + ' el overlay pinto ' + pintado + ' palabras');
  if(pintado !== 2) fallos.push('el overlay pinto ' + pintado + ' palabras, se esperaban 2');

  // El karaoke tiene que avanzar solo con el reloj, sin nada mas.
  await control.webContents.executeJavaScript(
    "window.pt.aOverlay({tipo:'reloj', t:1.5, en:Date.now(), rodando:false}); true");
  await new Promise(res => setTimeout(res, 300));
  const recorte = await overlay.webContents.executeJavaScript(
    "document.querySelectorAll('#lineas .pal')[1].querySelector('.luz').style.clipPath");
  linea('  ..   recorte de la palabra activa en t=1.5 s: ' + recorte);
  if(!/inset\(0(px)? (4\d|50)(\.\d)?% /.test(recorte)) fallos.push('el barrido karaoke no iba por la mitad: ' + recorte);
  else linea('  ok   el barrido va por la mitad de la segunda palabra');

  linea('\n== CLICK-THROUGH ==');
  linea('  ..   se desactiva y se vuelve a activar');
  overlay.setIgnoreMouseEvents(false);
  overlay.setIgnoreMouseEvents(true, { forward: true });
  linea('  ok   setIgnoreMouseEvents acepto los dos estados sin error');

  linea('\n== RESULTADO ==');
  if(fallos.length){
    fallos.forEach(f => linea('  FALLO ' + f));
    linea('  ' + fallos.length + ' fallo(s)');
  }else{
    linea('  todo correcto');
  }
  setTimeout(() => app.exit(fallos.length ? 1 : 0), 200);
});
