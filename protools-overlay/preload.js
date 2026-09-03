'use strict';
/* Puente unico entre las ventanas y el proceso principal. Nada de Node suelto
   en el renderizador: solo estas funciones. */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('pt', {
  // control -> overlay
  aOverlay:      (msg) => ipcRenderer.send('overlay', msg),
  verOverlay:    (v)   => ipcRenderer.invoke('overlay:visible', v),
  clickThrough:  (v)   => ipcRenderer.invoke('overlay:clickThrough', v),
  pantallas:     ()    => ipcRenderer.invoke('pantallas'),
  ponerPantalla: (id)  => ipcRenderer.invoke('overlay:pantalla', id),
  pedirAudio:    ()    => ipcRenderer.invoke('dialogo:audio'),
  // overlay <- control
  alRecibir: (fn) => ipcRenderer.on('overlay', (_e, msg) => fn(msg))
});
