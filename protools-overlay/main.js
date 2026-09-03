'use strict';
/* ────────────────────────────────────────────────────────────────────
   Proceso principal.

   Dos ventanas:
   · CONTROL  ventana normal. Ahi se pega el texto, se carga el audio, se
              elige la entrada MIDI y se calibra el desfase.
   · OVERLAY  ventana transparente, sin marco, siempre encima y que deja
              pasar el raton. Es la que se ve sobre Pro Tools.

   El reloj NO viaja frame a frame por IPC: eso metaria latencia y carga. El
   control manda un ancla (tiempo + marca de reloj local) y el overlay
   extrapola por su cuenta en cada repintado.
   ──────────────────────────────────────────────────────────────────── */

const { app, BrowserWindow, ipcMain, screen, dialog, globalShortcut } = require('electron');
const path = require('path');

let winControl = null;
let winOverlay = null;
let clickThrough = true;

function crearOverlay(){
  const pantalla = screen.getPrimaryDisplay();
  const { x, y, width, height } = pantalla.bounds;

  winOverlay = new BrowserWindow({
    x, y, width, height,
    transparent: true,          // RGBA: hace falta para que el fondo no exista
    frame: false,
    hasShadow: false,
    resizable: false,
    movable: false,
    focusable: false,           // que nunca robe el foco a Pro Tools
    skipTaskbar: true,
    fullscreenable: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      backgroundThrottling: false   // sin esto el rAF baja a 1 Hz al perder foco
    }
  });

  winOverlay.loadFile(path.join(__dirname, 'ui', 'overlay.html'));

  // Windows encaja las ventanas sin marco en el area de trabajo y deja fuera la
  // franja de la barra de tareas. Se vuelve a imponer el tamano completo.
  winOverlay.setBounds({ x, y, width, height });

  // 'screen-saver' es el nivel mas alto: por encima de Pro Tools a pantalla completa
  winOverlay.setAlwaysOnTop(true, 'screen-saver');
  winOverlay.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // deja pasar clics y movimiento del raton a la aplicacion de abajo
  winOverlay.setIgnoreMouseEvents(true, { forward: true });
  winOverlay.on('closed', () => { winOverlay = null; });
}

function crearControl(){
  winControl = new BrowserWindow({
    width: 940, height: 720, minWidth: 720, minHeight: 560,
    title: 'Overlay para Pro Tools',
    backgroundColor: '#14161c',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });
  winControl.loadFile(path.join(__dirname, 'ui', 'control.html'));
  winControl.on('closed', () => {
    winControl = null;
    if(winOverlay) winOverlay.close();
  });
}

app.whenReady().then(() => {
  crearControl();
  crearOverlay();

  // Interruptor de emergencia: si algo va mal, esto quita el overlay de encima.
  globalShortcut.register('CommandOrControl+Alt+O', () => {
    if(!winOverlay) return;
    if(winOverlay.isVisible()) winOverlay.hide(); else winOverlay.showInactive();
  });
});

app.on('window-all-closed', () => { app.quit(); });
app.on('will-quit', () => { globalShortcut.unregisterAll(); });

/* ── Puente entre las dos ventanas ─────────────────────────────────── */

// Lo que manda el control (texto alineado, ancla de reloj, ajustes) va al overlay.
ipcMain.on('overlay', (_e, msg) => {
  if(winOverlay && !winOverlay.isDestroyed()) winOverlay.webContents.send('overlay', msg);
});

ipcMain.handle('overlay:visible', (_e, v) => {
  if(!winOverlay) return false;
  if(v) winOverlay.showInactive(); else winOverlay.hide();
  return !!v;
});

// Para colocar el texto hay que poder pinchar en el overlay: se desactiva el
// click-through mientras dura el ajuste.
ipcMain.handle('overlay:clickThrough', (_e, v) => {
  if(!winOverlay) return clickThrough;
  clickThrough = !!v;
  winOverlay.setIgnoreMouseEvents(clickThrough, { forward: true });
  winOverlay.setFocusable(!clickThrough);
  return clickThrough;
});

ipcMain.handle('pantallas', () => {
  return screen.getAllDisplays().map((d, i) => ({
    id: d.id, i, w: d.bounds.width, h: d.bounds.height,
    principal: d.id === screen.getPrimaryDisplay().id
  }));
});

ipcMain.handle('overlay:pantalla', (_e, id) => {
  if(!winOverlay) return false;
  const d = screen.getAllDisplays().find(x => x.id === id) || screen.getPrimaryDisplay();
  winOverlay.setBounds(d.bounds);
  winOverlay.setBounds(d.bounds);   // dos veces: la primera Windows la recorta al area de trabajo
  winOverlay.setAlwaysOnTop(true, 'screen-saver');
  return true;
});

ipcMain.handle('dialogo:audio', async () => {
  const r = await dialog.showOpenDialog(winControl, {
    title: 'Audio de la escena',
    properties: ['openFile'],
    filters: [{ name: 'Audio', extensions: ['wav', 'aif', 'aiff', 'mp3', 'm4a', 'flac', 'ogg'] }]
  });
  return r.canceled ? null : r.filePaths[0];
});
