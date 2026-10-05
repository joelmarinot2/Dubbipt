/* La lista de diálogos en idioma original · especificacion 01 y 02
 *
 * Llegó de sala «en_DIALOG_LIST-AFilipinoChristmas-…-QC.xlsx»: la lista de
 * diálogos que manda Netflix antes de que exista el libreto traducido. Una
 * fila por subtítulo, y el personaje repetido en todas:
 *
 *     IN-TIMECODE │ OUT-TIMECODE │ SOURCE │ TRANSCRIPTION      │ DIALOGUE
 *     00:00:22:03 │ 00:00:24:16  │ TONTON │ Boracay, here we … │ Boracay, here we come!
 *     00:00:29:16 │ 00:00:32:03  │ TONTON │ Whatever, bro. Na… │ Whatever, bro. We're here again.
 *     00:00:33:22 │ 00:00:35:10  │ ROSS   │ All thanks to Fra… │ All thanks to Francis.
 *
 * Con ella se puede ADELANTAR el casting: quién sale, cuánto dice y dónde. El
 * libreto traducido llega después, así que el capítulo queda marcado «sin
 * libreto traducido» hasta que una persona diga lo contrario.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: norm, docxLineas, charColor, NO_REC, XLSX, castAviso,
 * epDataUpsert, fallo, y las variables del libreto (script, chars, charIdx…).
 */

/* ═══ LISTA DE DIÁLOGOS ORIGINAL ═══════════════════════════════════════════ */

/* Cómo se llama cada columna. Se casa la casilla ENTERA, no una palabra dentro
   (CAST-10): «SOURCE ONSCREEN» no es la columna del personaje, y «DIALOG WORD
   COUNT» -la hoja del resumen- no es la del diálogo. */
const LD_COLS = {
  tc:    ['IN TIMECODE', 'TIMECODE IN', 'IN TC', 'TC IN', 'TIMECODE', 'TC'],
  tcOut: ['OUT TIMECODE', 'TIMECODE OUT', 'OUT TC', 'TC OUT'],
  quien: ['SOURCE', 'CHARACTER', 'CHARACTER NAME', 'SPEAKER'],
  trans: ['TRANSCRIPTION'],
  dial:  ['DIALOGUE', 'DIALOG', 'TRANSLATION', 'ENGLISH TRANSLATION'],
  anot:  ['ANNOTATIONS', 'ANNOTATION'],
  tags:  ['TAGS', 'TAG']
};

/** Una casilla de cabecera como se compara: «IN-TIMECODE» es «IN TIMECODE». */
function ldCab(s){
  return String(s == null ? '' : s).normalize('NFD').replace(/[^\x20-\x7E]/g, '').toUpperCase()
    .replace(/[^A-Z0-9]+/g, ' ').trim();
}

/**
 * Dónde está la cabecera y qué columna es cada cosa. Hace falta el timecode
 * de entrada, el personaje y al menos una de las dos de texto; si no, no es
 * una lista de diálogos. Devuelve `{ fila, tc, tcOut, quien, trans, dial,
 * anot, tags }` -cada una su columna, o -1- o nulo.
 */
function ldCabecera(rows){
  const n = Math.min((rows || []).length, 12);
  for(let i = 0; i < n; i++){
    const row = rows[i] || [];
    const m = { fila: i, tc: -1, tcOut: -1, quien: -1, trans: -1, dial: -1, anot: -1, tags: -1 };
    for(let j = 0; j < row.length; j++){
      const c = ldCab(row[j]);
      if(!c) continue;
      for(const k in LD_COLS) if(m[k] < 0 && LD_COLS[k].indexOf(c) >= 0) m[k] = j;
    }
    if(m.tc >= 0 && m.quien >= 0 && (m.dial >= 0 || m.trans >= 0)) return m;
  }
  return null;
}

/**
 * Las filas de la lista: quién, cuándo y qué dice. El texto es el de DIALOGUE
 * -la lengua pivote, que es de la que sale la traducción- y, si esa casilla
 * viene vacía, el de TRANSCRIPTION. Devuelve nulo si la hoja no es una lista.
 */
function ldFilas(rows){
  const cab = ldCabecera(rows);
  if(!cab) return null;
  const celda = (row, j) => (j >= 0 && row[j] != null) ? String(row[j]).replace(/\s+/g, ' ').trim() : '';
  const out = [];
  for(let i = cab.fila + 1; i < rows.length; i++){
    const row = rows[i] || [];
    const quien = celda(row, cab.quien);
    const dial = celda(row, cab.dial), trans = celda(row, cab.trans);
    if(!quien && !dial && !trans) continue;
    out.push({ tc: celda(row, cab.tc), tcOut: celda(row, cab.tcOut), quien: quien,
               texto: dial || trans, orig: trans, anot: celda(row, cab.anot), tags: celda(row, cab.tags) });
  }
  return out;
}

/** Un timecode partido en sus números: horas, minutos, segundos y lo último,
    que son fotogramas si trae dos cifras y milésimas si trae tres. */
function ldTCPartes(t){
  const m = String(t == null ? '' : t).trim().match(/^(\d{1,2})[:;.](\d{2})[:;.](\d{2})[:;.,](\d{2,3})$/);
  return m ? { h: +m[1], m: +m[2], s: +m[3], f: +m[4], ms: m[4].length === 3 } : null;
}

/**
 * A cuántos fotogramas por segundo va la lista. No lo dice en ningún sitio,
 * pero el fotograma más alto que aparece sí: hasta 23, va a 24; hasta 24, a
 * 25; más, a 30. La de Netflix que llegó de sala llega a 23.
 */
function ldFps(filas){
  let max = -1;
  for(const f of (filas || [])){
    const p = ldTCPartes(f.tc);
    if(p && !p.ms && p.f > max) max = p.f;
    const q = ldTCPartes(f.tcOut);
    if(q && !q.ms && q.f > max) max = q.f;
  }
  return max <= 23 ? 24 : (max <= 24 ? 25 : 30);
}

/** El timecode en segundos, con sus fotogramas. Nulo si no es un timecode. */
function ldTC(t, fps){
  const s = String(t == null ? '' : t).trim();
  const p = ldTCPartes(s);
  if(p) return p.h * 3600 + p.m * 60 + p.s + (p.ms ? p.f / 1000 : p.f / (fps || 24));
  const m = s.match(/^(\d{1,2})[:;.](\d{2})[:;.](\d{2})$/);
  return m ? (+m[1]) * 3600 + (+m[2]) * 60 + (+m[3]) : null;
}

/** De qué programa y de qué capítulo es, si el libro lo dice en «Project Info». */
function ldInfo(wb){
  const out = { programa: '', episodio: '' };
  try{
    for(const n of wb.SheetNames){
      if(ldCab(n) !== 'PROJECT INFO') continue;
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false });
      for(const r of rows){
        const k = ldCab(r && r[0]), v = String((r && r[1]) == null ? '' : r[1]).trim();
        if(k === 'SHOW TITLE') out.programa = v;
        if(k === 'EPISODE TITLE') out.episodio = v;
      }
    }
  }catch(e){ /* sin la hoja de datos, la lista se lee igual */ }
  return out;
}

/**
 * ¿Este libro de Excel es una lista de diálogos? Devuelve la hoja ya leída
 * -`{ hoja, filas, fps, info }`- o nulo. Importa no decir que sí de más: un
 * sí aquí se salta el lector de desgloses, que es el de siempre. Por eso no
 * basta la cabecera: la mitad de las filas tienen que traer un timecode.
 */
function ldDeLibro(wb){
  if(!wb || !Array.isArray(wb.SheetNames)) return null;
  for(const n of wb.SheetNames){
    let rows = null;
    try{ rows = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false }); }
    catch(e){ rows = null; }
    if(!Array.isArray(rows)) continue;
    const filas = ldFilas(rows);
    if(!filas || !filas.length) continue;
    const fps = ldFps(filas);
    const conTC = filas.filter(f => ldTC(f.tc, fps) != null).length;
    if(!filas.some(f => f.quien) || conTC < filas.length / 2) continue;
    return { hoja: n, filas: filas, fps: fps, info: ldInfo(wb) };
  }
  return null;
}

/**
 * Arma el libreto y el desglose desde la lista.
 *
 * El personaje viene repetido en cada fila, así que las filas SEGUIDAS del
 * mismo son un solo parlamento -la misma regla que el guion de Word en tabla
 * (LIB-24)-, y las líneas se cuentan al final sobre el parlamento entero: doce
 * palabras cada una. Fila a fila saldría una línea por subtítulo, casi el
 * doble. Lo que va entre corchetes -«[REACTION]», «[INDISTINCT]»- se deja como
 * viene: el barrido de solo gestos lo entiende.
 */
function ldArmar(lista, name){
  const filas = (lista && lista.filas) || [];
  const fps = (lista && lista.fps) || ldFps(filas);
  pdfDoc = null; pdfName = name; lastPdfBuf = null;
  pageData = {}; occByChar = {}; charMarks = {}; tcIndex = [];
  script = []; scriptByKey = {};
  let cur = null, clen = 0;

  for(const f of filas){
    const key = f.quien ? norm(f.quien) : (cur ? cur.key : '');
    if(!key) continue;                           // texto sin nadie delante: no hay a quién dárselo
    clen += f.texto.length + 1;
    const pag = Math.max(1, Math.ceil(clen / 1800));
    const tcSec = ldTC(f.tc, fps);
    if(!cur || cur.key !== key){
      cur = { idx: script.length, key: key, display: (f.quien || key).toUpperCase(), tcSec: tcSec, page: pag, lines: [] };
      script.push(cur);
      (scriptByKey[key] = scriptByKey[key] || []).push(cur.idx);
    }
    if(cur.tcSec == null && tcSec != null) cur.tcSec = tcSec;
    if(f.texto) cur.lines.push(f.texto);
  }

  const byKey = {};
  for(const b of script){
    const n = docxLineas(b.lines.join(' '));
    const c = byKey[b.key] || (byKey[b.key] = { key: b.key, display: b.display, pages: {}, total: 0 });
    c.pages[b.page] = (c.pages[b.page] || 0) + n;
    c.total += n;
  }
  chars = Object.values(byKey).map(c => ({
    key: c.key, display: c.display, talent: '',
    pages: Object.keys(c.pages).map(p => ({ p: +p, ints: c.pages[p] })).sort((a, b) => a.p - b.p),
    totalInts: c.total, color: charColor(c.key), noRec: NO_REC.has(c.key)
  })).sort((a, b) => b.totalInts - a.totalInts || a.display.localeCompare(b.display, 'es'));
  charIdx = {}; chars.forEach(c => charIdx[c.key] = c);
  window._charsRaw = chars.map(c => ({ ...c, pages: c.pages.map(p => ({ ...p })) }));

  let lastTC = 0;
  for(const b of script){ if(b.tcSec != null) lastTC = b.tcSec; b.tcEff = (b.tcSec != null ? b.tcSec : lastTC); }
  numPages = script.length ? script[script.length - 1].page : 1;
  window._script = script; window._adFormat = false;

  /* Sale de la lista original: mientras nadie diga otra cosa, este capítulo
     está SIN libreto traducido. Si ya estaba dicho -la lista se vuelve a leer
     sola cuando cambia en la nube-, no se pisa lo que marcó una persona. */
  if(window._libTraducido == null) window._libTraducido = false;
  return true;
}

/** Se dice lo que se ha leído y cómo queda marcado. */
function ldAvisar(lista){
  const de = (lista && lista.info && lista.info.programa) ? ' de «' + lista.info.programa + '»' : '';
  const txt = '🌐 Lista de diálogos original' + de + ' · ' + script.length + ' parlamentos de '
    + chars.length + ' personajes · queda SIN libreto traducido';
  if(typeof castAviso === 'function') castAviso(txt);
  else if(typeof libMsg === 'function') libMsg(txt);
  return txt;
}

/* ═══ ¿CON LIBRETO TRADUCIDO O SIN ÉL? ═════════════════════════════════════

   Pedido de sala: «que yo pueda marcar si es con libreto traducido o no, es
   para adelantar el casting si no ha llegado el libreto». Es una marca del
   capítulo, la pone una persona y viaja a la nube con él.

   `window._libTraducido`: true, con libreto traducido · false, sin él · nulo,
   nadie lo ha dicho -los capítulos de siempre-, y eso cuenta como traducido. */

/** ¿Este capítulo tiene el libreto traducido? */
function libTraducido(){ return window._libTraducido !== false; }

/** Lo que se guarda con el capítulo: true, false, o nulo si nadie lo ha dicho. */
function libTraducidoParaGuardar(){
  return window._libTraducido === false ? false : (window._libTraducido === true ? true : null);
}

/** Al abrir un capítulo guardado. Lo que no sea un sí o un no es «nadie lo ha dicho». */
function libTraducidoCargar(v){
  window._libTraducido = (v === false) ? false : (v === true ? true : null);
  try{ libTraducidoPintar(); }catch(e){ /* sin barra de casting no hay nada que pintar */ }
  return window._libTraducido;
}

/** El botón de la barra de casting dice cómo está el capítulo. */
function libTraducidoPintar(){
  const b = (typeof document !== 'undefined') ? document.getElementById('btnLibTrad') : null;
  if(!b) return false;
  const si = libTraducido();
  b.textContent = si ? '📄 Con libreto traducido' : '🌐 Sin libreto traducido';
  b.classList.toggle('sin-libreto', !si);
  b.title = si
    ? 'Este capítulo tiene su libreto traducido. Pulsa si todavía no ha llegado y el casting va adelantado con el original.'
    : 'Casting adelantado: el libreto traducido no ha llegado. Pulsa cuando llegue.';
  return true;
}

/** Lo marca una persona: con libreto traducido, o sin él. Se guarda con el capítulo. */
async function libTraducidoCambiar(){
  window._libTraducido = !libTraducido();
  libTraducidoPintar();
  try{
    castAviso(libTraducido()
      ? '📄 Marcado CON libreto traducido'
      : '🌐 Marcado SIN libreto traducido: el casting va adelantado con el original');
  }catch(e){ /* el aviso es lo de menos: la marca ya está puesta */ }
  try{ if(currentEp && currentEp.id) await epDataUpsert(currentEp.id, currentEp.showId); }
  catch(e){ fallo('epDataUpsert · js/listadialogos.js:libTraducidoCambiar', e, 'puede que la marca no se haya guardado en la nube'); }
  return window._libTraducido;
}

/* ═══ FIN DE LA LISTA DE DIÁLOGOS ══════════════════════════════════════════ */
