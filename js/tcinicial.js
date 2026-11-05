/* El TC inicial del video, por proyecto y por casa · especificacion 04, EST-5
 *
 * Pedido de sala: «quiero que cada uno de los proyectos, o sea por bloque de
 * episodios o clientes, siempre tengan el mismo time code inicial para el
 * video» y «que uno elija la casa cada vez que se crea el proyecto: Discovery,
 * Pixelogic, Netflix, Herald, Paramount, Pipeline Studio y otros». El «TC
 * inicio» del Video Estudio (el timecode con el que empieza el video) se
 * guardaba POR CAPÍTULO: había que fijarlo en cada episodio, aunque todos los
 * de un proyecto empiecen en el mismo.
 *
 * Ahora cada programa tiene su CASA (se elige al crearlo) y el TC se fija una
 * vez, con el alcance que se quiera; cada capítulo lo toma solo al abrirse:
 *   · solo este capítulo (como siempre: es la excepción y se respeta);
 *   · un BLOQUE de capítulos del programa (del 101 al 110);
 *   · TODO el programa;
 *   · TODOS los programas de una CASA.
 * Manda lo más concreto: el bloque, después el programa. Un programa nuevo
 * hereda el TC que ya tenga su casa.
 *
 * Se guarda en el almacén, en la carpeta del programa (`<programa>/
 * video-tc.json`: su casa y sus reglas), con copia en el equipo. Sirve a todos
 * los perfiles, no solo a Casting.
 *
 * De donde depende: sb, idbGet, idbSet, currentEp, sync, studio, studioSetTc0,
 * studioTc0, studioParseTC, stFmtTC, studioTick, stMsg, libMsg, fallo, esc,
 * sbShows.
 */

/* ═══ EL TC INICIAL POR PROYECTO Y POR CASA ══════════════════════════════ */

const TCI = { datos: {}, vistos: {}, cada: 30000 };
/** Las casas con las que se trabaja; cualquier otra se escribe («Otra…»). */
const TCI_CASAS = ['Discovery', 'Pixelogic', 'Netflix', 'Herald', 'Paramount', 'Pipeline Studio'];

/** El número del capítulo, del nombre: «100 DAYS OF DECEPTION 108» → 108, «S01E03» → 3, «119ABI» → 119. Nulo si no trae. */
function tciNumEp(nombre){
  const t = String(nombre == null ? '' : nombre).trim();
  let m = t.match(/[st]\d{1,2}\s*[ex]\s*0*(\d{1,4})(?!\d)/i) || t.match(/(?:^|[^a-z])(?:ep|episodio|episode|cap(?:itulo)?)\.?[\s._#-]*0*(\d{1,4})(?!\d)/i);
  if(!m) m = t.match(/(\d{1,4})\s*[A-Za-z]{0,4}\s*$/);
  return m ? parseInt(m[1], 10) : null;
}

const tciCasaClave = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const tciCasaLimpia = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().slice(0, 60);
/** La casa como se escribe en la lista («netflix» → «Netflix»); una que no está en la lista, tal cual. */
function tciCasaNombre(s){
  const k = tciCasaClave(s), c = TCI_CASAS.find(x => tciCasaClave(x) === k);
  return c || tciCasaLimpia(s);
}

/** Lo que hay guardado, ya limpio (viene de la nube: lo pudo escribir otro equipo). */
function tciSan(d){
  const num = (x) => { const n = Number(x); return isFinite(n) && n >= 0 && n < 360000 ? n : null; };
  const out = { v: 1, casa: '', programa: null, bloques: [] };
  if(!d || typeof d !== 'object') return out;
  out.casa = tciCasaLimpia(d.casa);
  if(d.tipo === 'serie' || d.tipo === 'pelicula') out.tipo = d.tipo;          // serie o película (PRO-61)
  if(d.programa && num(d.programa.v) != null) out.programa = { v: num(d.programa.v), casa: tciCasaLimpia(d.programa.casa), ts: num(d.programa.ts) || 0 };
  for(const b of (Array.isArray(d.bloques) ? d.bloques : [])){
    const desde = parseInt(b && b.desde, 10), hasta = parseInt(b && b.hasta, 10), v = num(b && b.v);
    if(isFinite(desde) && isFinite(hasta) && desde >= 0 && hasta >= desde && v != null) out.bloques.push({ desde: desde, hasta: hasta, v: v });
  }
  return out;
}

/** El TC que le toca al capítulo `n`: el bloque más estrecho que lo contiene o, si no, el del programa. */
function tciDe(d, n){
  if(!d) return null;
  if(n != null){
    let mejor = null;
    for(const b of (d.bloques || [])) if(n >= b.desde && n <= b.hasta && (!mejor || (b.hasta - b.desde) < (mejor.hasta - mejor.desde))) mejor = b;
    if(mejor) return { v: mejor.v, alcance: 'bloque', desde: mejor.desde, hasta: mejor.hasta, casa: '' };
  }
  if(d.programa) return { v: d.programa.v, alcance: 'programa', desde: null, hasta: null, casa: d.programa.casa || '' };
  return null;
}

/** Pone una regla: 'programa' (con `o.casa` si viene de una casa) o 'bloque' (`o.desde`, `o.hasta`; el mismo bloque se sustituye). */
function tciPoner(d, alcance, sec, o){
  o = o || {};
  if(alcance === 'programa'){ d.programa = { v: sec, casa: tciCasaLimpia(o.casa), ts: Date.now() }; return d; }
  if(alcance === 'bloque'){
    const desde = parseInt(o.desde, 10), hasta = parseInt(o.hasta, 10);
    if(!isFinite(desde) || !isFinite(hasta) || desde < 0 || hasta < desde) throw new Error('El bloque de capítulos no es válido');
    d.bloques = (d.bloques || []).filter(b => !(b.desde === desde && b.hasta === hasta));
    d.bloques.push({ desde: desde, hasta: hasta, v: sec });
    d.bloques.sort((a, b) => a.desde - b.desde || a.hasta - b.hasta);
  }
  return d;
}

/** Quita una regla: 'programa' o el bloque «desde-hasta». */
function tciQuitar(d, cual){
  if(cual === 'programa') d.programa = null;
  else d.bloques = (d.bloques || []).filter(b => (b.desde + '-' + b.hasta) !== cual);
  return d;
}

/** Cómo se dice una regla: «Todo el programa», «Toda la casa Netflix», «Capítulos 101 a 110». */
function tciEtiqueta(r){
  if(!r) return '';
  if(r.alcance === 'bloque') return r.desde === r.hasta ? 'Capítulo ' + r.desde : 'Capítulos ' + r.desde + ' a ' + r.hasta;
  return r.casa ? 'Toda la casa ' + r.casa : 'Todo el programa';
}

/* ── Guardado: la nube y una copia en el equipo ── */
const tciRuta = (showId) => showId + '/video-tc.json';

async function tciCargar(showId, forzar){
  const k = String(showId);
  if(!forzar && TCI.datos[k] && Date.now() - (TCI.vistos[k] || 0) < TCI.cada) return TCI.datos[k];
  let d = null;
  try{
    if(!(typeof window !== 'undefined' && window.OFFLINE) && typeof sb !== 'undefined' && sb){
      const r = await sb.storage.from('libretos').download(tciRuta(showId));
      if(r && r.data) d = JSON.parse(await r.data.text());
    }
  }catch(e){ d = null; /* sin nube o aún sin reglas: se usa la copia del equipo */ }
  if(!d){
    try{ const c = await idbGet('tci::' + k); if(c && c.d) d = c.d; }catch(e){ d = null; /* sin copia */ }
  }
  TCI.datos[k] = tciSan(d); TCI.vistos[k] = Date.now();
  return TCI.datos[k];
}

async function tciGuardar(showId, d){
  const k = String(showId);
  TCI.datos[k] = d; TCI.vistos[k] = Date.now();
  try{ await idbSet('tci::' + k, { d: d, ts: Date.now() }); }catch(e){ /* sin copia: va a la nube */ }
  try{
    const r = await sb.storage.from('libretos').upload(tciRuta(showId), new Blob([JSON.stringify(d)], { type: 'application/json' }), { upsert: true });
    return !r.error;
  }catch(e){ return false; }
}

/* ── Las casas: lo que dice cada programa ── */

/** Todos los programas del espacio con lo suyo, de cinco en cinco. */
async function tciTodos(){
  const shows = (typeof sbShows === 'function') ? sbShows() : [];
  const out = []; let i = 0;
  const w = async () => {
    while(i < shows.length){
      const s = shows[i++];
      try{ out.push({ id: s.id, nombre: s.name, d: await tciCargar(s.id, true) }); }catch(e){ /* ese programa se salta */ }
    }
  };
  await Promise.all([w(), w(), w(), w(), w()]);
  return out;
}

/** El TC que ya tiene una casa: el de su regla más reciente en cualquiera de sus programas. Nulo si ninguno. */
function tciCasaTc(todos, casa, exceptoId){
  const k = tciCasaClave(casa);
  let mejor = null;
  for(const p of todos){
    if(String(p.id) === String(exceptoId) || !p.d || tciCasaClave(p.d.casa) !== k || !p.d.programa || !p.d.programa.casa) continue;
    if(!mejor || p.d.programa.ts > mejor.ts) mejor = p.d.programa;
  }
  return mejor ? { v: mejor.v, ts: mejor.ts } : null;
}

/**
 * La casa de un programa (al crearlo, o después). Si la casa ya tiene un TC en
 * otros programas y este no tiene el suyo, lo hereda. Devuelve el TC heredado o nulo.
 */
async function tciAsignarCasa(showId, casa, tipo){
  const nombre = tciCasaNombre(casa);
  if(!nombre) throw new Error('Elige la casa del proyecto');
  const d = await tciCargar(showId, true);
  d.casa = nombre;
  if(tipo === 'serie' || tipo === 'pelicula') d.tipo = tipo;                   // y si es serie o película (PRO-61)
  let heredado = null;
  if(!d.programa){
    const r = tciCasaTc(await tciTodos(), nombre, showId);
    if(r){ tciPoner(d, 'programa', r.v, { casa: nombre }); heredado = r.v; }
  }
  await tciGuardar(showId, d);
  return heredado;
}

function tciShowActual(){
  if(typeof currentEp === 'undefined' || !currentEp) return null;
  return (typeof sbShows === 'function' ? sbShows() : []).find(s => String(s.id) === String(currentEp.showId)) || null;
}

/* ── Al abrir un capítulo ── */

/**
 * Pone en el capítulo abierto el TC inicial que le toca. No toca el que se fijó
 * «solo para este capítulo» (marcado `manual`). El valor de la regla NO se
 * guarda en las marcas del capítulo: se recalcula cada vez, así que si la regla
 * cambia, cambia en todos. Devuelve la regla aplicada o nulo.
 */
async function tciAplicar(avisar){
  if(typeof currentEp === 'undefined' || !currentEp || !currentEp.showId) return null;
  const epId = currentEp.id, showId = currentEp.showId, n = tciNumEp(currentEp.name);
  const d = await tciCargar(showId);
  if(!currentEp || currentEp.id !== epId) return null;                 // se cambió de capítulo mientras se leía
  const r = tciDe(d, n);
  if(!r || !sync || !sync.marks) return null;
  const m = sync.marks._tcOff;
  if(m && m.o === 'manual') return null;                                // la excepción de este capítulo
  const ya = !!(m && m.o === 'regla' && +m.v === r.v);
  sync.marks._tcOff = { v: r.v, o: 'regla' };                           // en memoria: no se sube, se recalcula
  try{ const inp = document.getElementById('stTc0'); if(inp) inp.value = stFmtTC(r.v); }catch(e){ /* el estudio no está pintado */ }
  if(!ya){
    try{ if(studio && studio.on){ studio.cur = -1; studioTick(); } }catch(e){ /* sin estudio abierto */ }
    if(avisar) stMsg('TC inicial ' + stFmtTC(r.v) + ' · ' + tciEtiqueta(r).toLowerCase());
  }
  return r;
}

/* ── Fijar una regla (el panel) ── */

/** Aplica el TC a lo que se elija. `alcance`: 'episodio', 'bloque', 'programa' o 'casa'. Devuelve un texto con lo que se hizo. */
async function tciFijar(alcance, sec, o){
  o = o || {};
  const showId = currentEp && currentEp.showId;
  if(!showId) throw new Error('No hay un capítulo abierto');
  if(alcance === 'episodio'){
    studioSetTc0(sec);                                                  // «a mano»: solo este capítulo
    return 'TC inicial de este capítulo: ' + stFmtTC(sec);
  }
  if(alcance === 'casa'){
    const d = await tciCargar(showId, true), casa = d.casa;
    if(!casa) throw new Error('Elige primero la casa de este programa');
    const k = tciCasaClave(casa);
    let hechos = 0, fallos = 0;
    for(const p of await tciTodos()){
      if(String(p.id) !== String(showId) && tciCasaClave(p.d.casa) !== k) continue;
      tciPoner(p.d, 'programa', sec, { casa: casa });
      if(await tciGuardar(p.id, p.d)) hechos++; else fallos++;
    }
    studioSetTc0(sec, true, 'regla');
    return 'TC inicial ' + stFmtTC(sec) + ' para los ' + (hechos + fallos) + ' programas de ' + casa + (fallos ? ' (' + fallos + ' guardados solo en este equipo)' : '');
  }
  const d = await tciCargar(showId, true);
  tciPoner(d, alcance, sec, o);
  const ok = await tciGuardar(showId, d);
  studioSetTc0(sec, true, 'regla');                                     // este capítulo entra en la regla: sin su «a mano»
  return 'TC inicial ' + stFmtTC(sec) + ' · ' + (alcance === 'bloque' ? 'capítulos ' + o.desde + ' a ' + o.hasta : 'todo el programa') + (ok ? '' : ' (guardado solo en este equipo)');
}

/* ── El panel ── */

async function tciPanel(){
  const viejo = document.getElementById('tciOv');
  if(viejo) viejo.remove();
  const show = tciShowActual(), showId = currentEp && currentEp.showId;
  if(!showId){ stMsg('Abre un capítulo para fijar su TC inicial'); return; }
  const d = await tciCargar(showId, true);
  const n = tciNumEp(currentEp.name), casa = d.casa;
  const nombre = (show && show.name) || 'este programa';
  const sec0 = studioTc0();
  const ini = n != null ? (n >= 100 ? Math.floor(n / 100) * 100 + 1 : 1) : 1, fin = n != null ? (n >= 100 ? Math.floor(n / 100) * 100 + 99 : Math.max(n, 1)) : 1;
  const reglas = [];
  if(d.programa) reglas.push({ cual: 'programa', txt: tciEtiqueta({ alcance: 'programa', casa: d.programa.casa }), v: d.programa.v });
  for(const b of d.bloques) reglas.push({ cual: b.desde + '-' + b.hasta, txt: tciEtiqueta({ alcance: 'bloque', desde: b.desde, hasta: b.hasta }), v: b.v });
  const enLista = !casa || TCI_CASAS.indexOf(casa) >= 0;
  const ov = document.createElement('div');
  ov.id = 'tciOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja tci-caja" style="text-align:left">'
    + '<div class="modo-tit">TC inicial del video</div>'
    + '<div class="modo-sub">' + esc(nombre) + (currentEp.name ? ' · ' + esc(currentEp.name) : '') + '</div>'
    + '<div class="meta-nota">Fíjalo una vez y cada capítulo lo toma solo al abrirse. Manda lo más concreto: el bloque, después el programa. El capítulo donde lo fijas «solo para él» se queda con el suyo.</div>'
    + '<label class="tci-f">Casa de este programa <select id="tciCasa"><option value="">Elige la casa…</option>'
    +   TCI_CASAS.map(c => '<option' + (c === casa ? ' selected' : '') + '>' + esc(c) + '</option>').join('')
    +   '<option value="__otra"' + (enLista ? '' : ' selected') + '>Otra…</option></select>'
    +   '<input id="tciCasaOtra" placeholder="Nombre de la casa" value="' + (enLista ? '' : esc(casa)) + '"' + (enLista ? ' style="display:none"' : '') + '></label>'
    + '<label class="tci-f">TC con el que empieza el video <input id="tciTc" class="st-tc" value="' + esc(stFmtTC(sec0)) + '" placeholder="01:00:00"></label>'
    + '<div class="tci-op"><label><input type="radio" name="tciA" value="episodio"> Solo este capítulo</label></div>'
    + '<div class="tci-op"><label><input type="radio" name="tciA" value="bloque" checked> Un bloque de capítulos del programa:</label>'
    +   ' del <input id="tciDe" type="number" min="0" value="' + ini + '"> al <input id="tciA" type="number" min="0" value="' + fin + '"></div>'
    + '<div class="tci-op"><label><input type="radio" name="tciA" value="programa"> Todo el programa «' + esc(nombre) + '»</label></div>'
    + '<div class="tci-op"><label><input type="radio" name="tciA" value="casa" id="tciRCasa"' + (casa ? '' : ' disabled') + '> <span id="tciCasaTxt">' + (casa ? 'Todos los programas de la casa «' + esc(casa) + '»' : 'Todos los programas de la casa (elige primero la casa)') + '</span></label></div>'
    + '<div class="tci-reglas">' + (reglas.length ? '<b>Reglas de este programa</b>' + reglas.map(r => '<div class="tci-r"><span>' + esc(r.txt) + ': <b>' + esc(stFmtTC(r.v)) + '</b></span><button class="modo-op dud-b" style="width:auto;flex:0 0 auto;padding:4px 14px" data-q="' + esc(r.cual) + '">Quitar</button></div>').join('')
        : '<span class="tci-nada">Este programa aún no tiene reglas: cada capítulo usa el suyo.</span>') + '</div>'
    + '<div class="tci-msg" id="tciMsg"></div>'
    + '<div class="dud-btns"><button class="modo-op dud-b" id="tciCerrar">Cerrar</button><button class="modo-op dud-b dud-ok" id="tciOk">Aplicar</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove(), dec = (t) => { const e = document.getElementById('tciMsg'); if(e) e.textContent = t; };
  ov.querySelector('#tciCerrar').onclick = cerrar;
  ov.addEventListener('click', (e) => { if(e.target === ov) cerrar(); });
  /* La casa: se guarda al elegirla; si la casa ya tiene un TC y este programa no tiene el suyo, lo hereda. */
  const selCasa = ov.querySelector('#tciCasa'), otra = ov.querySelector('#tciCasaOtra');
  const casaElegida = () => tciCasaLimpia(selCasa.value === '__otra' ? otra.value : selCasa.value);
  const guardarCasa = async () => {
    const c = casaElegida();
    if(!c) return;
    try{
      const her = await tciAsignarCasa(showId, c);
      const rc = ov.querySelector('#tciRCasa'), tx = ov.querySelector('#tciCasaTxt');
      if(rc) rc.disabled = false;
      if(tx) tx.textContent = 'Todos los programas de la casa «' + tciCasaNombre(c) + '»';
      if(her != null){ dec('La casa ' + tciCasaNombre(c) + ' ya usa ' + stFmtTC(her) + ': este programa lo toma.'); await tciAplicar(true); }
      else dec('Casa guardada: ' + tciCasaNombre(c));
    }catch(e){ dec((e && e.message) || String(e)); }
  };
  selCasa.onchange = () => { otra.style.display = selCasa.value === '__otra' ? '' : 'none'; if(selCasa.value !== '__otra') guardarCasa(); else otra.focus(); };
  otra.onchange = guardarCasa;
  ov.querySelectorAll('button[data-q]').forEach(b => { b.onclick = async () => {
    try{
      const x = await tciCargar(showId, true);
      tciQuitar(x, b.getAttribute('data-q'));
      await tciGuardar(showId, x);
      try{ if(sync.marks._tcOff && sync.marks._tcOff.o === 'regla') delete sync.marks._tcOff; await tciAplicar(); }catch(e){ /* el capítulo queda como estaba */ }
      cerrar(); tciPanel();
    }catch(e){ fallo('tciQuitar · js/tcinicial.js', e, 'no se ha podido quitar la regla'); }
  }; });
  ov.querySelector('#tciOk').onclick = async () => {
    const sec = studioParseTC(document.getElementById('tciTc').value);
    if(sec == null){ dec('Formato de TC no válido: usa HH:MM:SS (por ejemplo 01:00:00)'); return; }
    const alc = (ov.querySelector('input[name="tciA"]:checked') || {}).value || 'episodio';
    try{
      if(alc === 'casa' && casaElegida() && tciCasaClave(casaElegida()) !== tciCasaClave(casa)) await guardarCasa();
      const texto = await tciFijar(alc, sec, { desde: document.getElementById('tciDe').value, hasta: document.getElementById('tciA').value });
      try{ studio.cur = -1; studioTick(); }catch(e){ /* sin estudio abierto */ }
      stMsg(texto); try{ libMsg(texto); }catch(e){ /* sin libreto */ }
      cerrar();
    }catch(e){ dec((e && e.message) || String(e)); }
  };
}
