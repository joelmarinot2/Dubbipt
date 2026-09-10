/* Traer y llevar formatos · especificacion 05
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
 * De donde depende: studioTc0, stFmtTC, castNorm, norm, charColor, karVentana, adrDatos, adrDe, ADR_ESTADOS, salaOlvidar, buildPronIndex, renderCards, renderPlanilla, epDataUpsert, castAviso
 */

/* ═══ ENTRADA Y SALIDA DE FORMATOS ════════════════════════════════════════

   El libreto vive aquí, pero tiene que poder venir de otro sitio y volver a
   salir. Lo que se mueve en una casa de doblaje:

   ENTRA   · SRT / VTT   subtítulos, que traen tiempo y texto
           · STL         el EBU de toda la vida, binario
           · CSV         la hoja de cues de cualquier otro programa
   SALE    · SRT         para subtitular o para llevárselo
           · CSV         para Excel y para cualquier otro programa
           · TTML/DFXP   el estándar de texto temporizado del W3C
           · Marcadores  en el formato en que Pro Tools escribe los suyos

   El timecode: dentro de Dubbipt cada línea lleva su `tcEff` en segundos de
   RELOJ (con la hora del rollo incluida). Los subtítulos vienen contados desde
   el principio del vídeo, así que al importar se les suma el «TC inicio» y al
   exportar se les resta. Es la misma cuenta que hace el Video Estudio. */

function ioTC(sec, coma){
  sec = Math.max(0, sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60);
  const s = Math.floor(sec % 60), ms = Math.round((sec - Math.floor(sec)) * 1000);
  const p = (v, n) => String(v).padStart(n || 2, '0');
  return p(h) + ':' + p(m) + ':' + p(s) + (coma ? ',' : '.') + p(ms, 3);
}
/** Timecode con fotogramas, como lo escribe Pro Tools. */
function ioTCf(sec, fps){
  fps = fps || 25;
  sec = Math.max(0, sec || 0);
  const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = Math.floor(sec % 60);
  const f = Math.min(fps - 1, Math.floor((sec - Math.floor(sec)) * fps));
  const p = v => String(v).padStart(2, '0');
  return p(h) + ':' + p(m) + ':' + p(s) + ':' + p(f);
}
/** Lee 00:00:12,340 · 00:00:12.340 · 00:00:12:08 · 12,5 · 12.5 */
function ioLeerTC(str, fps){
  if(str == null) return null;
  str = String(str).trim();
  if(!str) return null;
  let m = str.match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})[.,](\d{1,3})$/);
  if(m) return +m[1]*3600 + +m[2]*60 + +m[3] + (+m[4]) / Math.pow(10, m[4].length);
  m = str.match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})[:;](\d{1,2})$/);
  if(m) return +m[1]*3600 + +m[2]*60 + +m[3] + (+m[4]) / (fps || 25);
  m = str.match(/^(\d{1,3}):(\d{1,2}):(\d{1,2})$/);
  if(m) return +m[1]*3600 + +m[2]*60 + +m[3];
  m = str.match(/^(\d{1,2}):(\d{1,2})$/);
  if(m) return +m[1]*60 + +m[2];
  if(/^\d+([.,]\d+)?$/.test(str)) return +str.replace(',', '.');
  return null;
}

function ioDescargar(nombre, texto, tipo){
  const url = URL.createObjectURL(new Blob([texto], { type: (tipo || 'text/plain') + ';charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url; a.download = nombre;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
function ioBase(){
  const n = (currentEp && currentEp.name) || 'libreto';
  return String(n).replace(/[\\/:*?"<>|]+/g, '-').trim() || 'libreto';
}

/* ── ENTRADA ──────────────────────────────────────────────────────────── */

/** Un personaje delante del texto: «NILA: hola» o «- NILA: hola». */
function ioPersonajeDe(txt){
  const m = String(txt || '').match(/^\s*[-–—]?\s*([A-ZÁÉÍÓÚÑÜ0-9][A-ZÁÉÍÓÚÑÜ0-9 .'’#\-]{1,30}?)\s*[:：]\s*(.*)$/s);
  if(!m) return null;
  const nom = m[1].trim();
  if(nom.length < 2) return null;
  return { nombre: nom, resto: m[2].trim() };
}

/** SRT y WebVTT: numeración opcional, «tc --> tc» y el texto debajo. */
function ioLeerSRT(txt){
  const t = String(txt).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const out = [];
  const re = /(\d{1,3}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})\s*-->\s*(\d{1,3}:\d{2}:\d{2}[.,]\d{1,3}|\d{1,2}:\d{2}[.,]\d{1,3})[^\n]*\n([\s\S]*?)(?=\n\s*\n|\n\s*\d+\s*\n\s*\d{1,3}:|\s*$)/g;
  let m;
  while((m = re.exec(t))){
    const t0 = ioLeerTC(m[1]), t1 = ioLeerTC(m[2]);
    if(t0 == null) continue;
    const cuerpo = m[3].replace(/<[^>]*>/g, '').replace(/\{[^}]*\}/g, '').trim();
    if(!cuerpo) continue;
    out.push({ t0: t0, t1: t1, texto: cuerpo });
  }
  return out;
}

/** CSV con separador y comillas de verdad. */
function ioLeerCSV(txt){
  const t = String(txt).replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const cabecera = t.slice(0, t.indexOf('\n') < 0 ? t.length : t.indexOf('\n'));
  const sep = (cabecera.split(';').length > cabecera.split(',').length) ? ';'
            : (cabecera.split('\t').length > cabecera.split(',').length ? '\t' : ',');
  const filas = []; let campo = '', fila = [], comillas = false;
  for(let i = 0; i < t.length; i++){
    const c = t[i];
    if(comillas){
      if(c === '"'){ if(t[i+1] === '"'){ campo += '"'; i++; } else comillas = false; }
      else campo += c;
    }else if(c === '"') comillas = true;
    else if(c === sep){ fila.push(campo); campo = ''; }
    else if(c === '\n'){ fila.push(campo); filas.push(fila); fila = []; campo = ''; }
    else campo += c;
  }
  if(campo !== '' || fila.length){ fila.push(campo); filas.push(fila); }
  return filas.filter(f => f.some(x => String(x).trim() !== ''));
}

/** Qué columna es cada cosa, por el nombre de la cabecera. */
function ioColumnas(cab){
  const n = cab.map(x => castNorm(x));
  const busca = (...claves) => {
    for(let i = 0; i < n.length; i++)
      for(const k of claves) if(n[i] === k) return i;
    for(let i = 0; i < n.length; i++)
      for(const k of claves) if(n[i].indexOf(k) >= 0) return i;
    return -1;
  };
  return {
    in:    busca('TC IN','TCIN','ENTRADA','START','INICIO','IN','TC'),
    out:   busca('TC OUT','TCOUT','SALIDA','END','FIN','OUT'),
    pers:  busca('PERSONAJE','CHARACTER','ROLE','ROL','NOMBRE','NAME'),
    texto: busca('TEXTO','TEXT','DIALOGO','DIALOGUE','LINEA','LINE','SUBTITULO')
  };
}

/* ── EBU-STL ──────────────────────────────────────────────────────────────
   Cabecera GSI de 1024 bytes y luego bloques TTI de 128. De cada TTI hacen
   falta el timecode de entrada (bytes 5-8), el de salida (9-12) y el texto
   (16-127). Los saltos de línea van con 0x8A y los códigos 0x80-0x85 son
   marcas de color que aquí no pintan nada.

   El juego de caracteres se declara en el GSI (CCT). Se soportan los latinos
   (00 y 8859-1..5 aproximados): con otro alfabeto el texto saldrá raro y se
   avisa, que es mejor que colar basura sin decirlo. */
function ioLeerSTL(buf){
  const b = new Uint8Array(buf);
  if(b.length < 1024 + 128) return { error: 'El archivo es demasiado corto para ser un STL' };
  const txt = (a, b2) => new TextDecoder('latin1').decode(b.slice(a, b2)).trim();
  const cct = txt(12, 14);                       // 00 = latino
  const dfc = txt(3, 11);                        // STL25.01 / STL30.01
  const fps = /STL30/.test(dfc) ? 30 : 25;
  const out = [];
  for(let p = 1024; p + 128 <= b.length; p += 128){
    const ebn = b[p + 3];
    if(ebn >= 0xF0) continue;                    // bloques reservados
    const tc = (o) => b[p+o]*3600 + b[p+o+1]*60 + b[p+o+2] + b[p+o+3]/fps;
    const t0 = tc(5), t1 = tc(9);
    let crudo = b.slice(p + 16, p + 128);
    let fin = crudo.length;
    while(fin > 0 && crudo[fin-1] === 0x8F) fin--;   // relleno
    crudo = crudo.slice(0, fin);
    let s = '';
    for(const c of crudo){
      if(c === 0x8A){ s += '\n'; continue; }
      if(c >= 0x80 && c <= 0x85) continue;           // colores
      if(c === 0x8F || c < 0x20) continue;
      s += String.fromCharCode(c);
    }
    s = s.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if(!s) continue;
    const ult = out[out.length - 1];
    if(ult && Math.abs(ult.t0 - t0) < 0.001 && Math.abs(ult.t1 - t1) < 0.001) ult.texto += ' ' + s;
    else out.push({ t0: t0, t1: t1, texto: s });
  }
  return { filas: out, fps: fps, cct: cct, latino: (cct === '00' || /^8[0-9]/.test(cct)) };
}

/* ── Construir el libreto con lo importado ────────────────────────────── */

/**
 * Monta script + chars con las filas leídas. Cada fila trae {t0,t1,texto} y,
 * si se sabe, {personaje}. Los tiempos vienen contados desde el principio del
 * vídeo: se les suma el TC de inicio para dejarlos en timecode de reloj.
 */
function ioMontarLibreto(filas, opts){
  opts = opts || {};
  const desfase = (opts.relativo === false) ? 0 : studioTc0();
  const gen = opts.personaje || 'DIÁLOGO';
  script = []; scriptByKey = {}; tcIndex = [];
  const pags = new Map();
  const porPers = new Map();
  let pagina = 1, enPag = 0;
  for(const f of filas){
    let nombre = f.personaje || null, texto = f.texto;
    if(!nombre){
      const p = ioPersonajeDe(texto);
      if(p && p.resto){ nombre = p.nombre; texto = p.resto; }
    }
    if(!nombre) nombre = gen;
    texto = String(texto || '').replace(/\s*\n\s*/g, ' ').trim();
    if(!texto) continue;
    if(enPag >= 12){ pagina++; enPag = 0; }        // páginas de mentira, para el riel
    enPag++;
    const key = norm(nombre);
    const blk = { idx: script.length, key: key, display: nombre.trim(),
                  tcSec: f.t0 + desfase, tcEff: f.t0 + desfase, page: pagina, lines: [texto] };
    script.push(blk);
    (scriptByKey[key] = scriptByKey[key] || []).push(blk.idx);
    tcIndex.push({ sec: blk.tcEff, page: pagina, lineIdx: 0 });
    pags.set(key + '|' + pagina, (pags.get(key + '|' + pagina) || 0) + 1);
    if(!porPers.has(key)) porPers.set(key, nombre.trim());
    // salida distinta de la del libreto: se guarda como corrección del cue
    if(f.t1 != null && f.t1 > f.t0){
      const d = adrDatos();
      (d[blk.idx] = d[blk.idx] || {}).tc1 = f.t1 + desfase;
    }
  }
  numPages = pagina;
  chars = []; charIdx = {};
  for(const [key, display] of porPers){
    const pages = [];
    for(const [k, ints] of pags){
      const [kk, pg] = k.split('|');
      if(kk === key) pages.push({ p: +pg, ints: ints });
    }
    pages.sort((a, b) => a.p - b.p);
    const o = { key: key, display: display, talent: '', pages: pages,
                totalInts: pages.reduce((n, x) => n + x.ints, 0), noRec: false,
                color: (typeof charColor === 'function' ? charColor(key) : '#5FC85A') };
    chars.push(o); charIdx[key] = o;
  }
  chars.sort((a, b) => b.totalInts - a.totalInts || a.display.localeCompare(b.display, 'es'));
  chars.forEach(c => { if(typeof charColor === 'function') c.color = charColor(c.key); });
  window._charsRaw = chars.map(c => ({ ...c, pages: c.pages.map(p => ({ ...p })) }));
  // la cascada de timecodes que usa el resto de la aplicación
  let ult = 0;
  for(const b of script){ if(b.tcEff != null) ult = b.tcEff; b.tcEff = (b.tcEff != null ? b.tcEff : ult); }
  tcIndex.sort((a, b) => a.sec - b.sec);
  try{ salaOlvidar(); }catch(e){}
  try{ if(typeof buildPronIndex === 'function') buildPronIndex(); }catch(e){}
  return { cues: script.length, personajes: chars.length, paginas: numPages };
}

async function ioImportar(file){
  if(!file) return;
  if(!currentEp){ castAviso('Abre primero un capítulo'); return; }
  const nombre = file.name || '';
  const ext = (nombre.match(/\.([a-z0-9]+)$/i) || [,''])[1].toLowerCase();
  let filas = null, aviso = '';
  try{
    if(ext === 'stl'){
      const r = ioLeerSTL(await file.arrayBuffer());
      if(r.error){ castAviso('❌ ' + r.error); return; }
      filas = r.filas;
      if(!r.latino) aviso = ' · ⚠️ el STL declara el juego de caracteres «' + r.cct
        + '», que no es latino: revisa las tildes';
    }else{
      const txt = await file.text();
      if(ext === 'csv' || ext === 'tsv' || /[;,\t][^\n]*[;,\t]/.test(txt.slice(0, 200)) && !/-->/.test(txt)){
        const f = ioLeerCSV(txt);
        if(!f.length){ castAviso('❌ Ese CSV está vacío'); return; }
        const col = ioColumnas(f[0]);
        const hayCab = col.in >= 0 || col.texto >= 0;
        const cuerpo = hayCab ? f.slice(1) : f;
        const cIn = col.in >= 0 ? col.in : 0;
        const cOut = col.out >= 0 ? col.out : 1;
        const cPer = col.pers >= 0 ? col.pers : -1;
        const cTx = col.texto >= 0 ? col.texto : (f[0].length - 1);
        filas = [];
        for(const r of cuerpo){
          const t0 = ioLeerTC(r[cIn]); if(t0 == null) continue;
          filas.push({ t0: t0, t1: ioLeerTC(r[cOut]),
                       personaje: cPer >= 0 ? String(r[cPer] || '').trim() : null,
                       texto: String(r[cTx] || '').trim() });
        }
        if(!hayCab) aviso = ' · sin cabecera reconocida: se han tomado las columnas por su orden';
      }else{
        filas = ioLeerSRT(txt);
      }
    }
  }catch(e){ castAviso('❌ No se pudo leer: ' + (e.message || e)); return; }

  if(!filas || !filas.length){ castAviso('❌ No encontré ninguna línea con tiempo en ese archivo'); return; }

  const conPers = filas.filter(f => f.personaje || ioPersonajeDe(f.texto)).length;
  const ok = await ioConfirmar(nombre, filas.length, conPers);
  if(!ok) return;

  const r = ioMontarLibreto(filas);
  try{ renderCards(); }catch(e){ fallo('renderCards · js\formatos.js:298', e); }
  try{ if(typeof renderPlanilla === 'function') renderPlanilla(); }catch(e){ fallo('renderPlanilla · js\formatos.js:299', e); }
  try{ if(typeof refreshLibretoChips === 'function') refreshLibretoChips(); }catch(e){ fallo('refreshLibretoChips · js\formatos.js:300', e); }
  try{ if(typeof renderLibretoBlocks === 'function' && pop2 && pop2.doc) renderLibretoBlocks(); }catch(e){ fallo('renderLibretoBlocks · js\formatos.js:301', e); }
  try{ if(currentEp && currentEp.id) await epDataUpsert(currentEp.id, currentEp.showId); }catch(e){ fallo('epDataUpsert · js\formatos.js:302', e, 'puede que esto no se haya guardado en la nube'); }
  castAviso('✅ ' + r.cues + ' líneas · ' + r.personajes + ' personaje'
    + (r.personajes === 1 ? '' : 's') + ' · ' + r.paginas + ' páginas' + aviso);
}

function ioConfirmar(nombre, n, conPers){
  return new Promise(resolve => {
    const ov = document.createElement('div');
    ov.className = 'modo-cap';
    ov.innerHTML = '<div class="modo-caja" style="max-width:520px;text-align:left">'
      + '<div class="modo-tit">Importar</div>'
      + '<div class="modo-sub" style="margin-bottom:8px">' + esc(nombre) + '</div>'
      + '<div class="meta-nota">Se han leído <b>' + n + '</b> líneas con tiempo'
      + (conPers ? (', <b>' + conPers + '</b> con el personaje delante («NILA: …»)') : '')
      + '.<br><br>Esto <b>sustituye el libreto</b> de este capítulo: lo que haya ahora se pierde. '
      + 'Los tiempos se cuentan desde el principio del vídeo, así que se les suma el '
      + '<b>TC inicio</b> que tengas puesto (' + stFmtTC(studioTc0()) + ').</div>'
      + '<div class="dud-btns"><button class="modo-op dud-b" id="ioNo">Cancelar</button>'
      + '<button class="modo-op dud-b dud-ok" id="ioSi">Sustituir el libreto</button></div></div>';
    document.body.appendChild(ov);
    const fin = (v) => { ov.remove(); resolve(v); };
    ov.querySelector('#ioNo').onclick = () => fin(false);
    ov.querySelector('#ioSi').onclick = () => fin(true);
    ov.addEventListener('click', e => { if(e.target === ov) fin(false); });
  });
}

/* ── SALIDA ───────────────────────────────────────────────────────────── */

function ioCues(){
  const out = [];
  for(let i = 0; i < script.length; i++){
    if(!script[i] || script[i].tcEff == null) continue;
    const a = adrDe(i);
    if(a && a.tc0 != null) out.push(a);
  }
  return out;
}

function ioExportarSRT(){
  const cues = ioCues();
  if(!cues.length){ castAviso('No hay líneas con timecode que exportar'); return; }
  const off = studioTc0();
  let s = '';
  cues.forEach((a, i) => {
    s += (i + 1) + '\n' + ioTC(a.tc0 - off, true) + ' --> ' + ioTC(a.tc1 - off, true) + '\n'
      + (a.display ? a.display + ': ' : '') + a.texto + '\n\n';
  });
  ioDescargar(ioBase() + '.srt', s, 'application/x-subrip');
  castAviso('✅ ' + cues.length + ' líneas en SRT');
}

function ioExportarCSV(){
  const cues = ioCues();
  if(!cues.length){ castAviso('No hay líneas con timecode que exportar'); return; }
  const q = v => '"' + String(v == null ? '' : v).replace(/"/g, '""') + '"';
  let s = '﻿' + ['TC in','TC out','Duración','Personaje','Talento','Página','Texto','Take','Estado','Notas']
    .map(q).join(',') + '\n';
  for(const a of cues){
    s += [ioTCf(a.tc0), ioTCf(a.tc1), (a.dur != null ? a.dur.toFixed(2) : ''), a.display, a.talento,
          (a.pagina != null ? a.pagina : ''), a.texto, (a.take || ''),
          (ADR_ESTADOS[a.estado] || {}).et || '', a.notas].map(q).join(',') + '\n';
  }
  ioDescargar(ioBase() + '.csv', s, 'text/csv');
  castAviso('✅ ' + cues.length + ' cues en CSV');
}

/** TTML (DFXP), el texto temporizado del W3C: lo lee casi cualquier cosa. */
function ioExportarTTML(){
  const cues = ioCues();
  if(!cues.length){ castAviso('No hay líneas con timecode que exportar'); return; }
  const off = studioTc0();
  const esc2 = t => String(t == null ? '' : t)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const pers = {};
  for(const a of cues) if(a.key) pers[a.key] = a;
  let s = '<?xml version="1.0" encoding="UTF-8"?>\n'
    + '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:tts="http://www.w3.org/ns/ttml#styling"\n'
    + '    xmlns:ttm="http://www.w3.org/ns/ttml#metadata" xml:lang="es">\n'
    + '  <head>\n    <metadata>\n';
  for(const k in pers)
    s += '      <ttm:agent xml:id="p_' + esc2(k.replace(/[^A-Za-z0-9]+/g, '_')) + '" type="character">'
       + '<ttm:name type="full">' + esc2(pers[k].display) + '</ttm:name></ttm:agent>\n';
  s += '    </metadata>\n  </head>\n  <body>\n    <div>\n';
  for(const a of cues)
    s += '      <p begin="' + ioTC(a.tc0 - off) + '" end="' + ioTC(a.tc1 - off) + '"'
       + (a.key ? ' ttm:agent="p_' + esc2(a.key.replace(/[^A-Za-z0-9]+/g, '_')) + '"' : '')
       + '>' + esc2(a.texto) + '</p>\n';
  s += '    </div>\n  </body>\n</tt>\n';
  ioDescargar(ioBase() + '.ttml', s, 'application/ttml+xml');
  castAviso('✅ ' + cues.length + ' líneas en TTML');
}

/** Marcadores en el mismo formato en que Pro Tools escribe los suyos. */
function ioExportarMarcadores(){
  const cues = ioCues();
  if(!cues.length){ castAviso('No hay cues que exportar'); return; }
  let s = 'SESSION NAME:\t' + ((currentEp && currentEp.name) || 'Dubbipt') + '\n'
        + 'TIMECODE FORMAT:\t25 Frame\n\n'
        + 'M A R K E R S  L I S T I N G\n'
        + '#\tLOCATION\tTIME REFERENCE\tUNITS\tNAME\tCOMMENTS\n';
  cues.forEach((a, i) => {
    const nombre = (a.display || 'CUE') + (a.take ? (' T' + a.take) : '');
    s += (i + 1) + '\t' + ioTCf(a.tc0) + '\t' + Math.round(a.tc0 * 48000) + '\tSamples\t'
      + nombre.replace(/\t/g, ' ') + '\t' + String(a.texto || '').replace(/\t/g, ' ').slice(0, 120) + '\n';
  });
  ioDescargar(ioBase() + ' · marcadores.txt', s, 'text/plain');
  castAviso('✅ ' + cues.length + ' marcadores · 25 fps, referencia a 48 kHz');
}

/* ── El panel ─────────────────────────────────────────────────────────── */

function ioPanel(){
  const viejo = document.getElementById('ioOv'); if(viejo) viejo.remove();
  const cues = ioCues();
  const ov = document.createElement('div');
  ov.id = 'ioOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja" style="max-width:560px;text-align:left">'
    + '<div class="modo-tit">Formatos</div>'
    + '<div class="modo-sub" style="margin-bottom:8px">' + cues.length + ' cue'
    + (cues.length === 1 ? '' : 's') + ' con timecode</div>'
    + '<div class="meta-nota">Al <b>importar</b>, los tiempos se cuentan desde el principio del vídeo '
    + 'y se les suma el <b>TC inicio</b> (' + stFmtTC(studioTc0()) + '); al <b>exportar</b>, se les resta. '
    + 'Si el texto trae el personaje delante («NILA: …»), se separa solo.</div>'
    + '<div class="io-tit">Traer</div>'
    + '<div class="io-rej">'
    +   '<button class="io-b" id="ioIn">⬆ SRT · VTT · STL · CSV</button>'
    + '</div>'
    + '<div class="io-tit">Llevar</div>'
    + '<div class="io-rej">'
    +   '<button class="io-b" id="ioSrt">⬇ SRT</button>'
    +   '<button class="io-b" id="ioCsv">⬇ CSV</button>'
    +   '<button class="io-b" id="ioTtml">⬇ TTML</button>'
    +   '<button class="io-b" id="ioMk">⬇ Marcadores de Pro Tools</button>'
    + '</div>'
    + '<div class="meta-nota" style="margin:10px 0 0">TTAL de Netflix no está: es un formato suyo y no '
    + 'me invento un esquema que no puedo comprobar. Pásame un TTAL de ejemplo y lo añado.</div>'
    + '<div class="dud-btns"><button class="modo-op dud-b dud-ok" id="ioCerrar">Cerrar</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('#ioCerrar').onclick = cerrar;
  ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });
  ov.querySelector('#ioIn').onclick = () => { cerrar(); const i = document.getElementById('ioFile'); if(i) i.click(); };
  ov.querySelector('#ioSrt').onclick = () => { cerrar(); ioExportarSRT(); };
  ov.querySelector('#ioCsv').onclick = () => { cerrar(); ioExportarCSV(); };
  ov.querySelector('#ioTtml').onclick = () => { cerrar(); ioExportarTTML(); };
  ov.querySelector('#ioMk').onclick = () => { cerrar(); ioExportarMarcadores(); };
}
