/* El frame rate de los videos · especificacion 04, EST-6
 *
 * Pedido de sala: «los videos que suba, también hay que detectar el frame
 * rate». Dubbipt daba por hecho 25 fps y, peor, que un segundo de timecode es
 * un segundo de video. En los videos NTSC (23.976, 29.97, 59.94, los de casi
 * todo Netflix) el timecode corre un 0,1 % más despacio que el reloj: a la hora
 * de programa, el libreto iba 3,6 segundos desfasado del video.
 *
 * Ahora, al cargar un video, se lee su frame rate de la cabecera del archivo,
 * sin leer el video entero:
 *   · MP4 / MOV / M4V: la pista de video del `moov` (escala de tiempo del
 *     `mdhd` y duración de cada fotograma del `stts`);
 *   · WebM / MKV: el `DefaultDuration` de la pista de video;
 *   · si el archivo no lo dice, se mide al reproducir (requestVideoFrameCallback).
 * Se ajusta al más cercano de los de siempre (23.976, 24, 25, 29.97, 30, 50,
 * 59.94, 60…) y se guarda con el capítulo; se puede cambiar a mano (y marcar
 * drop frame, que en 29.97 DF sí sigue al reloj).
 *
 * De aquí salen: los fotogramas del timecode (los «:FF») y el factor `vfpsK`
 * entre timecode y tiempo del video, que el Video Estudio aplica en todas sus
 * cuentas (studioTcDeVid / studioVidDeTc, en index.html). A 24, 25, 30, 50 o
 * 60 el factor es 1: todo queda exactamente como estaba.
 */

/* ═══ EL FRAME RATE DEL VIDEO ════════════════════════════════════════════ */

const VFPS_NORMALES = [23.976, 24, 25, 29.97, 30, 47.952, 48, 50, 59.94, 60, 119.88, 120];
const VFPS_NTSC = new Set([23.976, 29.97, 47.952, 59.94, 119.88]);

/** El frame rate de siempre más cercano (dentro de un 0,5 %, o de `tol`); si no hay ninguno, el medido con tres decimales. */
function vfpsNormal(f, tol){
  f = +f;
  if(!isFinite(f) || f <= 0) return null;
  let mejor = null;
  const margen = (+tol > 0 && +tol < 0.1) ? +tol : 0.005;          // solo un margen pequeño (no el índice de un .map)
  for(const n of VFPS_NORMALES) if(Math.abs(f - n) / n < margen && (mejor == null || Math.abs(f - n) < Math.abs(f - mejor))) mejor = n;
  return mejor != null ? mejor : Math.round(f * 1000) / 1000;
}
/** Segundos de video por segundo de timecode: 1.001 en NTSC sin drop frame; 1 en los demás (y en drop frame, que compensa). */
function vfpsK(f, df){ return (VFPS_NTSC.has(vfpsNormal(f)) && !df) ? 1.001 : 1; }
/** Fotogramas por segundo de timecode: 24 en 23.976, 30 en 29.97… */
function vfpsNominal(f){ const n = vfpsNormal(f); return n ? Math.round(n) : 25; }
/** «23.976», «29.97 DF», «25». */
function vfpsEtiqueta(f, df){ const n = vfpsNormal(f); return n == null ? '' : String(n) + (df ? ' DF' : ''); }

/* ── MP4 / MOV ── */
const vfpsU32 = (b, i) => ((b[i] << 24) >>> 0) + (b[i + 1] << 16) + (b[i + 2] << 8) + b[i + 3];
const vfpsTipo = (b, i) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);
async function vfpsLeer(blob, ini, n){ return new Uint8Array(await blob.slice(ini, ini + n).arrayBuffer()); }

/** Las cajas dentro de b[ini..fin): [{ tipo, ini (contenido), fin }]. */
function vfpsCajas(b, ini, fin){
  const out = [];
  let p = ini;
  while(p + 8 <= fin){
    let size = vfpsU32(b, p), cab = 8;
    const tipo = vfpsTipo(b, p + 4);
    if(size === 1){ size = vfpsU32(b, p + 8) * 4294967296 + vfpsU32(b, p + 12); cab = 16; }
    else if(size === 0) size = fin - p;
    if(size < cab || p + size > fin) break;
    out.push({ tipo: tipo, ini: p + cab, fin: p + size });
    p += size;
  }
  return out;
}
const vfpsHija = (b, caja, tipo) => vfpsCajas(b, caja.ini, caja.fin).find(c => c.tipo === tipo) || null;

/** El frame rate de la pista de video de un `moov` ya leído (su contenido). Nulo si no hay. */
function vfpsDeMoov(b){
  for(const trak of vfpsCajas(b, 0, b.length).filter(c => c.tipo === 'trak')){
    const mdia = vfpsHija(b, trak, 'mdia');
    if(!mdia) continue;
    const hdlr = vfpsHija(b, mdia, 'hdlr');
    if(!hdlr || vfpsTipo(b, hdlr.ini + 8) !== 'vide') continue;
    const mdhd = vfpsHija(b, mdia, 'mdhd');
    if(!mdhd) continue;
    const escala = vfpsU32(b, mdhd.ini + (b[mdhd.ini] === 1 ? 20 : 12));
    const minf = vfpsHija(b, mdia, 'minf'), stbl = minf && vfpsHija(b, minf, 'stbl'), stts = stbl && vfpsHija(b, stbl, 'stts');
    if(!escala || !stts) continue;
    const n = vfpsU32(b, stts.ini + 4);
    let muestras = 0, dur = 0;
    for(let i = 0; i < n && stts.ini + 8 + i * 8 + 8 <= stts.fin; i++){
      const cuenta = vfpsU32(b, stts.ini + 8 + i * 8), delta = vfpsU32(b, stts.ini + 12 + i * 8);
      muestras += cuenta; dur += cuenta * delta;
    }
    if(muestras && dur) return vfpsNormal(escala * muestras / dur);
  }
  return null;
}

/** Busca el `moov` entre las cajas de primer nivel (saltando el `mdat`, que puede pesar gigas) y lo lee. */
async function vfpsMoov(blob){
  let p = 0;
  for(let n = 0; n < 200 && p + 8 <= blob.size; n++){
    const h = await vfpsLeer(blob, p, 16);
    let size = vfpsU32(h, 0), cab = 8;
    const tipo = vfpsTipo(h, 4);
    if(size === 1){ size = vfpsU32(h, 8) * 4294967296 + vfpsU32(h, 12); cab = 16; }
    else if(size === 0) size = blob.size - p;
    if(size < cab) return null;
    if(tipo === 'moov') return size > 256 * 1024 * 1024 ? null : vfpsLeer(blob, p + cab, size - cab);
    p += size;
  }
  return null;
}

/* ── WebM / MKV (EBML) ── */
function vfpsVint(b, i, esId){
  const x = b[i];
  if(x == null) return null;
  let len = 1, m = 0x80;
  while(len <= 8 && !(x & m)){ m >>= 1; len++; }
  if(len > (esId ? 4 : 8)) return null;
  let v = esId ? x : (x & (m - 1)), todo1 = (x & (m - 1)) === (m - 1);
  for(let k = 1; k < len; k++){ v = v * 256 + b[i + k]; if(b[i + k] !== 255) todo1 = false; }
  return { v: v, len: len, desconocido: !esId && todo1 };
}
/** El frame rate de la pista de video (TrackType 1 con su DefaultDuration en nanosegundos). */
function vfpsDeEbml(b){
  const MAESTROS = new Set([0x18538067, 0x1654AE6B, 0xAE]);       // Segment, Tracks, TrackEntry
  let hallado = null;
  const recorrer = (ini, fin, pista) => {
    let p = ini;
    while(p < fin && hallado == null){
      const id = vfpsVint(b, p, true); if(!id) return;
      const sz = vfpsVint(b, p + id.len, false); if(!sz) return;
      const c = p + id.len + sz.len, f = sz.desconocido ? fin : Math.min(fin, c + sz.v);
      if(id.v === 0xAE){ const t = { tipo: 0, dur: 0 }; recorrer(c, f, t); if(t.tipo === 1 && t.dur > 0){ hallado = vfpsNormal(1e9 / t.dur); return; } }
      else if(MAESTROS.has(id.v)) recorrer(c, f, pista);
      else if(pista && (id.v === 0x83 || id.v === 0x23E383)){
        let v = 0; for(let k = 0; k < sz.v && k < 8; k++) v = v * 256 + b[c + k];
        if(id.v === 0x83) pista.tipo = v; else pista.dur = v;
      }
      if(id.v === 0x1F43B675) return;                                // Cluster: ya empieza el video, las pistas iban antes
      p = f;
    }
  };
  /* La cabecera EBML va primero; después, el Segment. */
  const cab = vfpsVint(b, 0, true);
  if(!cab || cab.v !== 0x1A45DFA3) return null;
  recorrer(0, b.length, null);
  return hallado;
}

/** El frame rate de un archivo de video, leído de su cabecera. { fps, de } o nulo si el archivo no lo dice. */
async function vfpsDeArchivo(blob, nombre){
  if(!blob || !blob.size) return null;
  const ini = await vfpsLeer(blob, 0, 12);
  if(ini.length >= 8 && /^(ftyp|moov|wide|free|mdat|skip|pnot)$/.test(vfpsTipo(ini, 4))){
    const moov = await vfpsMoov(blob);
    const f = moov ? vfpsDeMoov(moov) : null;
    return f ? { fps: f, de: 'mp4' } : null;
  }
  if(ini[0] === 0x1A && ini[1] === 0x45 && ini[2] === 0xDF && ini[3] === 0xA3){
    const f = vfpsDeEbml(await vfpsLeer(blob, 0, Math.min(blob.size, 8 * 1024 * 1024)));
    return f ? { fps: f, de: 'webm' } : null;
  }
  return null;
}

/**
 * Si la cabecera no lo dice: medirlo mientras se reproduce. Toma la mediana del
 * paso entre fotogramas de 40 fotogramas seguidos y llama a `listo(fps)` una vez.
 */
function vfpsMedir(el, listo){
  if(!el || typeof el.requestVideoFrameCallback !== 'function') return false;
  const pasos = [];
  let ultimo = null;
  const cb = (ahora, meta) => {
    if(meta && meta.mediaTime != null){
      if(ultimo != null){ const d = meta.mediaTime - ultimo; if(d > 0.004 && d < 0.2) pasos.push(d); }
      ultimo = meta.mediaTime;
    }
    if(pasos.length >= 40){ const s = pasos.slice().sort((a, b) => a - b), med = s[Math.floor(s.length / 2)]; listo(vfpsNormal(1 / med, 0.03)); return; }   // medir es menos fino que leer: margen del 3 %
    el.requestVideoFrameCallback(cb);
  };
  el.requestVideoFrameCallback(cb);
  return true;
}
