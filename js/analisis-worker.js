/* ═══ EL QUE TRANSCRIBE, EN SEGUNDO PLANO ══════════════════════════════════
 *
 * Un trabajador por núcleo. Cada uno carga su copia del reconocedor de voz y
 * transcribe los tramos de audio que le van llegando, sin tocar la página: la
 * barra de progreso se mueve y el botón de parar responde mientras tanto.
 *
 * Por qué varios: el reconocedor corre en WebAssembly con UN solo hilo —para
 * tener más haría falta aislar el sitio entero de otros orígenes, y eso rompe
 * la nube y las fuentes—. Varios trabajadores con un hilo cada uno sí caben, y
 * se reparten los tramos.
 *
 * Aquí NO hay lógica del análisis: ni qué tramos se cortan, ni a qué parlamento
 * va cada palabra, ni qué cuenta como cambio. Todo eso vive en la página, donde
 * se prueba. Esto solo oye y devuelve lo que oyó, con el tiempo de cada palabra.
 *
 * Es un módulo: se carga con `new Worker(url, { type: 'module' })`.
 */

let reconocedor = null;
let libreria = null;

/** Lo que cuenta de un error, sin el chorro de la pila. */
function causa(e){
  return String((e && e.message) || e || 'error desconocido').slice(0, 400);
}

self.onmessage = async (ev) => {
  const m = ev.data || {};
  try{
    if(m.que === 'preparar'){
      if(!libreria) libreria = await import(m.lib);
      libreria.env.allowLocalModels = false;
      let ultimo = 0;
      /* El modelo son varios archivos que bajan a la vez, y cada uno cuenta su
         propio porcentaje. Contados por separado la cifra saltaba de un 71 % a
         un 48 % —se vio—, así que se suma lo bajado de todos. */
      const bajado = {};
      reconocedor = await libreria.pipeline('automatic-speech-recognition', m.modelo, Object.assign({}, m.opciones || {}, {
        /* La descarga del modelo se cuenta, pero sin inundar: un aviso cada
           cuarto de segundo basta para que la barra se mueva. */
        progress_callback: (p) => {
          if(!m.avisaDescarga || !p || p.status !== 'progress' || !p.file) return;
          bajado[p.file] = +p.loaded || 0;
          const ahora = Date.now();
          if(ahora - ultimo < 250) return;
          ultimo = ahora;
          let suma = 0;
          for(const f in bajado) suma += bajado[f];
          self.postMessage({ que: 'bajando', id: m.id, bytes: suma });
        }
      }));
      self.postMessage({ que: 'listo', id: m.id });
      return;
    }
    if(m.que === 'tramo'){
      if(!reconocedor) throw new Error('el reconocedor no está preparado');
      const t0 = Date.now();
      const out = await reconocedor(m.pcm, m.opciones || {});
      self.postMessage({ que: 'hecho', id: m.id, texto: (out && out.text) || '',
                         palabras: (out && out.chunks) || [], ms: Date.now() - t0 });
      return;
    }
    if(m.que === 'soltar'){
      try{ if(reconocedor && reconocedor.dispose) await reconocedor.dispose(); }
      catch(e){ /* se va a cerrar igual: lo que no se suelte aquí se lo lleva el cierre */ }
      reconocedor = null;
      self.postMessage({ que: 'suelto', id: m.id });
      return;
    }
    throw new Error('no sé qué es «' + m.que + '»');
  }catch(e){
    self.postMessage({ que: 'error', id: m.id, error: causa(e) });
  }
};
