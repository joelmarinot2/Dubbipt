'use strict';
/* Analisis fuera del hilo de interfaz: alinear 20 minutos de audio no puede
   congelar la ventana. Los modulos se cargan con importScripts y se van
   dejando en `self`, que es de donde los toma align.js cuando no hay require. */

importScripts('../text.js', './energy.js', './align.js');

self.onmessage = (e) => {
  const m = e.data || {};
  try{
    let r;
    if(m.marcas && m.marcas.length){
      r = self.alignFromExternal(m.texto, m.marcas);       // alineador externo
    }else{
      r = self.alignBySignal(m.samples, m.sampleRate, m.texto, m.opts);
    }
    const words = m.offsetMs ? self.applyOffset(r.words, m.offsetMs) : r.words;
    self.postMessage({ ok: true, words, fichas: r.fichas, motor: r.motor,
                       segs: r.segs || [], ratio: r.ratio });
  }catch(err){
    self.postMessage({ ok: false, code: err && err.code, msg: String(err && err.message || err) });
  }
};
