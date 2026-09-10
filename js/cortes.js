/* Cambios de plano y cotejo con la voz · especificacion 04
 *
 * Salio de index.html en la fase 2 (un archivo por asunto). El codigo va tal
 * cual: esta extraccion NO cambia comportamiento, solo lo saca de un archivo
 * de 18.700 lineas.
 *
 * Sigue siendo un script clasico, no un modulo: comparte el ambito global con
 * los dos <script> en linea de index.html, igual que antes. Se carga DESPUES
 * de ellos, asi que puede usar todo lo que declaran; y ellos pueden usar estas
 * funciones porque cuando se llaman ya esta todo cargado.
 *
 * De donde depende: studioEl, studioTc0, studioFine, stMsg, stDrawWave, karVentana, karVid, karNorm, karIa, adrDe, adrFijar, adrRepintar, salaOlvidar, epDataUpsert, castAviso
 */

/* ═══ CAMBIOS DE PLANO Y COTEJO CON LA VOZ ════════════════════════════════

   Dos cosas que en sala se hacen a mano y son puro trabajo de aguja:

   CAMBIOS DE PLANO · saber dónde corta la imagen. Un cue que empieza medio
   fotograma antes del corte suena mal aunque el timecode «cuadre»; y a la hora
   de repartir el libreto en takes, los cortes mandan. Se detectan mirando el
   vídeo fotograma a fotograma: un corte es un salto brusco entre dos
   fotogramas seguidos. Los fundidos y las cortinillas cambian POCO de un
   fotograma al siguiente aunque cambien mucho en total, así que no se cuelan.

   COTEJO · comprobar que lo que está escrito es lo que de verdad se dice.
   Se transcribe cada intervención con el mismo Whisper que ya afina el
   karaoke -dentro del navegador, el audio no sale del equipo- y se compara
   con el texto del libreto. Lo que no se parece se marca para que lo mire una
   persona. No se corrige solo nada: el reconocedor se equivoca, y un libreto
   cambiado a espaldas de nadie es peor que un libreto con una errata. */

const CORTES = { lista:[], analizando:false, cancelar:false, x:4 };

function cortesCargar(d){
  CORTES.lista = [];
  try{
    const src = Array.isArray(d) ? d : [];
    for(const v of src) if(isFinite(+v) && +v >= 0) CORTES.lista.push(+v);
    CORTES.lista.sort((a, b) => a - b);
  }catch(e){}
}

/** Diferencia media entre dos fotogramas, canal a canal.
    En gris no basta: dos planos distintos pueden tener el mismo brillo -un
    exterior de dia contra otro exterior de dia- y el corte se perderia. El
    color los separa. */
function cortesDif(a, b){
  let s = 0;
  for(let i = 0; i < a.length; i++) s += Math.abs(a[i] - b[i]);
  return s / a.length / 255;
}

/**
 * Recorre el vídeo y apunta dónde salta la imagen.
 * Va reproduciendo en silencio a velocidad `x` y mirando cada fotograma que
 * el navegador presenta; no se puede ir más rápido que eso sin perder cortes.
 */
async function cortesAnalizar(){
  const el = studioEl();
  if(!el || !el.src){ stMsg('⚠️ Primero carga el vídeo'); return null; }
  if(!studio.isVideo){ stMsg('⚠️ Lo que hay cargado es solo audio: no hay imagen que mirar'); return null; }
  if(CORTES.analizando){ CORTES.cancelar = true; return null; }
  if(typeof el.requestVideoFrameCallback !== 'function'){
    stMsg('⚠️ Este navegador no deja mirar el vídeo fotograma a fotograma (hace falta Chrome o Edge)');
    return null;
  }
  CORTES.analizando = true; CORTES.cancelar = false;

  const W = 64, H = 36;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d', { willReadFrequently:true });
  const dur = el.duration || 0;
  const eraVol = el.volume, eraMudo = el.muted, eraRate = el.playbackRate, eraT = el.currentTime;
  const eraPausa = el.paused;

  const muestras = [];        // {t, dif}
  let previo = null, ultT = -1;
  const gris = () => {
    g.drawImage(el, 0, 0, W, H);
    const d = g.getImageData(0, 0, W, H).data;
    const out = new Uint8Array(W * H * 3);
    for(let i = 0, j = 0; i < d.length; i += 4, j += 3){
      out[j] = d[i]; out[j+1] = d[i+1]; out[j+2] = d[i+2];
    }
    return out;
  };

  el.muted = true; el.playbackRate = Math.min(8, Math.max(1, CORTES.x));
  try{ el.currentTime = 0; }catch(e){}
  await new Promise(r => setTimeout(r, 120));
  try{ await el.play(); }catch(e){}

  await new Promise(fin => {
    const paso = (ahora, meta) => {
      if(CORTES.cancelar || el.ended || (dur && el.currentTime >= dur - 0.05)){ fin(); return; }
      const t = (meta && meta.mediaTime != null) ? meta.mediaTime : el.currentTime;
      if(t > ultT){
        const ahora2 = gris();
        if(previo) muestras.push({ t: t, dif: cortesDif(previo, ahora2) });
        previo = ahora2; ultT = t;
        if(muestras.length % 40 === 0)
          stMsg('🎞 Buscando cambios de plano… ' + Math.round(100 * t / (dur || 1)) + '%'
                + ' · ' + muestras.length + ' fotogramas');
      }
      el.requestVideoFrameCallback(paso);
    };
    el.requestVideoFrameCallback(paso);
    // red de seguridad: si el navegador deja de presentar fotogramas
    const guardia = setInterval(() => {
      if(!CORTES.analizando || CORTES.cancelar || el.paused || el.ended){ clearInterval(guardia); fin(); }
    }, 1000);
  });

  el.pause();
  el.muted = eraMudo; el.volume = eraVol; el.playbackRate = eraRate;
  try{ el.currentTime = eraT; }catch(e){}
  if(!eraPausa) try{ el.play(); }catch(e){}
  CORTES.analizando = false;

  // Si el navegador no ha ido presentando fotogramas -pestaña en segundo plano,
  // otra ventana delante- no llega ninguno. Entonces se recorre a saltos: más
  // lento, pero funciona sin que nadie mire la pantalla.
  if(muestras.length < 10){
    stMsg('🎞 El vídeo no se estaba pintando: recorriendo a saltos, esto tarda más…');
    const r2 = await cortesPorSaltos(el, gris, dur);
    muestras.length = 0;
    if(r2) for(const m of r2) muestras.push(m);
  }
  if(muestras.length < 10){ stMsg('⚠️ No se pudieron leer fotogramas suficientes'); return null; }

  const dec = cortesDecidir(muestras);
  const cortes = dec.cortes, umbral = dec.umbral, mediana = dec.mediana;
  CORTES.lista = cortes;
  try{ if(currentEp && currentEp.id) await epDataUpsert(currentEp.id, currentEp.showId); }catch(e){ fallo('epDataUpsert · js\cortes.js:135', e, 'puede que esto no se haya guardado en la nube'); }
  try{ stDrawWave(); }catch(e){ fallo('stDrawWave · js\cortes.js:136', e); }
  stMsg('✂ ' + cortes.length + ' cambio' + (cortes.length === 1 ? '' : 's') + ' de plano · '
        + muestras.length + ' fotogramas mirados');
  return { cortes: cortes.length, fotogramas: muestras.length, umbral: umbral, mediana: mediana };
}

/**
 * De las diferencias entre fotogramas, cuáles son cortes.
 *
 * El listón es LOCAL, no global: un corte es un fotograma que salta mucho más
 * que los de su alrededor -tres veces la mediana del segundo anterior y el
 * siguiente- y que además es el pico. Local y no global porque en una misma
 * película conviven una persecución a cámara en mano y un plano fijo de un
 * salón: con un solo listón para todo, o la persecución inventa cortes o el
 * salón se los pierde.
 *
 * Un fundido reparte el cambio entre muchos fotogramas, así que su diferencia
 * por fotograma se queda pegada a la de su vecindario y nunca llega a tres
 * veces: por eso las transiciones no se cuelan.
 *
 * Va aparte para poder comprobarla sin depender de que haya vídeo delante.
 */
function cortesDecidir(muestras){
  const n = muestras.length;
  const cortes = [], puntos = [];
  if(!n) return { cortes: cortes, umbral: 0, mediana: 0, puntos: puntos };
  const VENT = 12;                 // ~1 s a cada lado
  const MIN = 0.06;                // por debajo de esto no es un corte, es ruido
  const VECES = 3;                 // cuantas veces por encima de lo normal
  const ordenar = (a) => a.slice().sort((x, y) => x - y);
  const medianaDe = (a) => a.length ? ordenar(a)[Math.floor(a.length / 2)] : 0;
  const global = medianaDe(muestras.map(m => m.dif));
  for(let i = 0; i < n; i++){
    const d = muestras[i].dif;
    if(d < MIN) continue;
    // el vecindario SIN contar este fotograma ni sus pegados: si no, un corte
    // se taparia a si mismo
    const vec = [];
    for(let j = Math.max(0, i - VENT); j <= Math.min(n - 1, i + VENT); j++)
      if(Math.abs(j - i) > 1) vec.push(muestras[j].dif);
    const base = Math.max(0.004, medianaDe(vec));
    const veces = d / base;
    if(veces < VECES) continue;
    // tiene que ser el pico: en un corte solo hay UN fotograma que salta
    if(i > 0 && muestras[i-1].dif > d) continue;
    if(i < n - 1 && muestras[i+1].dif > d) continue;
    if(cortes.length && muestras[i].t - cortes[cortes.length - 1] < 0.25) continue;
    cortes.push(+muestras[i].t.toFixed(3));
    puntos.push({ t: +muestras[i].t.toFixed(3), dif: +d.toFixed(4), veces: +veces.toFixed(2) });
  }
  return { cortes: cortes, umbral: MIN, veces: VECES, mediana: global, puntos: puntos };
}

/** Coloca el vídeo en un instante exacto y espera a que esté ahí de verdad. */
function cortesIr(el, t){
  return new Promise(resolve => {
    let hecho = false;
    const ok = () => { if(hecho) return; hecho = true; el.removeEventListener('seeked', ok); resolve(true); };
    el.addEventListener('seeked', ok);
    try{ el.currentTime = t; }catch(e){ ok(); return; }
    setTimeout(ok, 400);            // si el navegador no avisa, se sigue igual
  });
}

/**
 * Recorrido a saltos: no depende de que el vídeo se esté pintando. Se mira
 * cada 80 ms -suficiente para ver un corte- y luego se afina cada candidato a
 * 20 ms para dar el instante bueno. Es más lento, y por eso es el plan B.
 */
async function cortesPorSaltos(el, gris, dur){
  if(!dur || !isFinite(dur)) return null;
  const PASO = 0.08;
  const muestras = [];
  let previo = null;
  for(let t = 0; t < dur - 0.02; t += PASO){
    if(CORTES.cancelar) break;
    await cortesIr(el, t);
    const ahora = gris();
    if(previo) muestras.push({ t: +t.toFixed(3), dif: cortesDif(previo, ahora) });
    previo = ahora;
    if(muestras.length % 25 === 0)
      stMsg('🎞 Recorriendo a saltos… ' + Math.round(100 * t / dur) + '%');
  }
  return muestras;
}

/** El corte más cercano a un segundo de vídeo, si cae dentro del margen. */
function cortesCerca(t, margen){
  let mejor = null, dist = 1e9;
  for(const c of CORTES.lista){
    const d = Math.abs(c - t);
    if(d < dist){ dist = d; mejor = c; }
  }
  return (mejor != null && dist <= (margen || 0.4)) ? mejor : null;
}

/** Pega las entradas de los cues al corte de plano más cercano. */
function cortesPegar(margen){
  if(!CORTES.lista.length){ stMsg('⚠️ Primero busca los cambios de plano'); return 0; }
  margen = margen || 0.4;
  let n = 0;
  for(let i = 0; i < script.length; i++){
    if(!script[i] || script[i].tcEff == null) continue;
    const a = adrDe(i);
    if(a.tc0 == null) continue;
    const v = a.tc0 - studioTc0() - studioFine();
    const c = cortesCerca(v, margen);
    if(c == null || Math.abs(c - v) < 0.005) continue;
    adrFijar(i, 'tc0', c + studioTc0() + studioFine());
    n++;
  }
  try{ salaOlvidar(); adrRepintar(); }catch(e){ fallo('salaOlvidar · js\cortes.js:247', e); }
  stMsg(n ? ('✂ ' + n + ' entrada' + (n === 1 ? '' : 's') + ' pegada' + (n === 1 ? '' : 's') + ' al corte')
          : 'Ninguna entrada estaba lo bastante cerca de un corte');
  return n;
}

/* ── Cotejo con lo que de verdad se dice ──────────────────────────────── */

const COTEJO = { res:new Map(), trabajando:false, cancelar:false, hechos:0 };

/** Palabras normalizadas de un texto, para comparar. */
function cotPalabras(t){
  return String(t || '').split(/\s+/).map(x => karNorm(x)).filter(Boolean);
}
/** Subsecuencia común más larga: mide parecido SIN perder el orden. */
function cotParecido(a, b){
  if(!a.length || !b.length) return 0;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0), cur = new Array(n + 1).fill(0);
  for(let i = 1; i <= m; i++){
    for(let j = 1; j <= n; j++)
      cur[j] = (a[i-1] === b[j-1]) ? prev[j-1] + 1 : Math.max(prev[j], cur[j-1]);
    const t = prev; prev = cur; cur = t; cur.fill(0);
  }
  return prev[n] / Math.max(m, n);
}

/** Transcribe la ventana de un cue y la compara con lo escrito. */
async function cotejarCue(si){
  const ven = karVentana(si);
  const b = script[si];
  if(!ven || !b) return null;
  const escrito = cotPalabras((b.lines || []).join(' '));
  if(!escrito.length) return null;
  const a0 = Math.max(0, karVid(ven[0]) - 0.25);
  const a1 = Math.min(karIa.pcm.length / karIa.sr, karVid(ven[1]) + 0.25);
  if(!(a1 > a0 + 0.25)) return null;
  const trozo = karIa.pcm.slice(Math.round(a0 * karIa.sr), Math.round(a1 * karIa.sr));
  try{
    const out = await karIa.pipe(trozo, { language:karIa.idioma, task:'transcribe' });
    const oido = String((out && out.text) || '').trim();
    const sim = cotParecido(escrito, cotPalabras(oido));
    return { sim: sim, oido: oido };
  }catch(e){ return null; }
}

function cotejoDatos(){
  if(!window._cotejo || typeof window._cotejo !== 'object') window._cotejo = {};
  return window._cotejo;
}
function cotejoDe(si){
  const r = cotejoDatos()[si];
  return (r && isFinite(+r.sim)) ? r : null;
}
/** Cómo de mal está: nada, dudoso o directamente no cuadra. */
function cotejoAviso(si){
  const r = cotejoDe(si);
  if(!r) return null;
  if(r.sim < 0.45) return { nivel:'mal', et:'no cuadra', color:'#F87171', sim:r.sim, oido:r.oido };
  if(r.sim < 0.72) return { nivel:'dudoso', et:'dudoso', color:'#FBBF24', sim:r.sim, oido:r.oido };
  return null;
}

/** Coteja el capítulo entero, cue a cue, sin bloquear la aplicación. */
async function cotejarTodo(){
  if(COTEJO.trabajando){ COTEJO.cancelar = true; stMsg('Cotejo cancelado'); return null; }
  if(!studio.url && !studio.dlgUrl){ stMsg('⚠️ Primero carga el vídeo o la pista de diálogos'); return null; }
  COTEJO.trabajando = true; COTEJO.cancelar = false; COTEJO.hechos = 0;
  stMsg('⏳ Preparando el reconocimiento de voz…');
  const ok = await karIaPreparar();
  if(!ok){ COTEJO.trabajando = false; return null; }
  const d = cotejoDatos();
  const lista = [];
  for(let i = 0; i < script.length; i++)
    if(script[i] && script[i].tcEff != null && (script[i].lines || []).join('').trim()) lista.push(i);
  let mal = 0, dudosos = 0;
  for(let n = 0; n < lista.length; n++){
    if(COTEJO.cancelar) break;
    const si = lista[n];
    const r = await cotejarCue(si);
    if(r){
      d[si] = { sim: +r.sim.toFixed(3), oido: r.oido.slice(0, 300) };
      COTEJO.hechos++;
      if(r.sim < 0.45) mal++; else if(r.sim < 0.72) dudosos++;
    }
    if(n % 3 === 0 || n === lista.length - 1)
      stMsg('🔎 Cotejando… ' + (n + 1) + ' de ' + lista.length
            + (mal ? (' · ' + mal + ' no cuadran') : '') + (dudosos ? (' · ' + dudosos + ' dudosos') : ''));
    await new Promise(r2 => setTimeout(r2, 0));      // dejar respirar a la interfaz
  }
  COTEJO.trabajando = false;
  try{ if(currentEp && currentEp.id) await epDataUpsert(currentEp.id, currentEp.showId); }catch(e){ fallo('epDataUpsert · js\cortes.js:338', e, 'puede que esto no se haya guardado en la nube'); }
  try{ adrRepintar(); }catch(e){ fallo('adrRepintar · js\cortes.js:339', e); }
  const msg = '🔎 ' + COTEJO.hechos + ' cotejados · ' + mal + ' no cuadran · ' + dudosos + ' dudosos';
  stMsg(msg);
  castAviso(msg + ' — míralos en «📋 Cues», no se ha cambiado ni una palabra del libreto');
  return { hechos: COTEJO.hechos, mal: mal, dudosos: dudosos };
}

/* ── El panel de los planos ───────────────────────────────────────────── */

function cortesPanel(){
  const viejo = document.getElementById('cortesOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'cortesOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja" style="max-width:520px;text-align:left">'
    + '<div class="modo-tit">Cambios de plano</div>'
    + '<div class="modo-sub" style="margin-bottom:6px">'
    + (CORTES.lista.length ? (CORTES.lista.length + ' cortes encontrados') : 'Todavía sin buscar') + '</div>'
    + '<div class="meta-nota">Se mira el vídeo <b>fotograma a fotograma</b>: un corte es un salto brusco entre '
    + 'dos fotogramas seguidos. Los fundidos y las cortinillas cambian poco de un fotograma al siguiente, '
    + 'así que no se cuelan. Tarda lo que dure el vídeo dividido por la velocidad, y mientras tanto el vídeo '
    + 'corre en silencio.</div>'
    + '<div class="sala-rej">'
    +   '<label class="sala-c">Velocidad <select id="cortX">'
    +     [1,2,4,6,8].map(v => '<option value="' + v + '"' + (CORTES.x === v ? ' selected' : '') + '>' + v + '×</option>').join('')
    +   '</select></label>'
    +   '<label class="sala-c">Pegar si está a menos de <input id="cortM" type="number" min="0.1" max="2" step="0.1" value="0.4"> s</label>'
    + '</div>'
    + '<div class="io-rej">'
    +   '<button class="io-b" id="cortGo">' + (CORTES.analizando ? '⏹ Parar' : '✂ Buscar los cortes') + '</button>'
    +   '<button class="io-b" id="cortPeg">⇥ Pegar las entradas al corte</button>'
    + '</div>'
    + '<div class="dud-btns"><button class="modo-op dud-b dud-ok" id="cortCerrar">Cerrar</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('#cortCerrar').onclick = cerrar;
  ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });
  ov.querySelector('#cortX').onchange = e => { CORTES.x = +e.target.value || 4; };
  ov.querySelector('#cortGo').onclick = async () => {
    cerrar();
    await cortesAnalizar();
  };
  ov.querySelector('#cortPeg').onclick = () => {
    const m = +ov.querySelector('#cortM').value || 0.4;
    cerrar(); cortesPegar(m);
  };
}
