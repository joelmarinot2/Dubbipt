/* Cues de ADR · especificacion 04
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
 * De donde depende: studioEl, studioTc0, studioFine, studioPreroll, studioSeekSi, studioStripOn, stMsg, stFmt, stFmtTC, karVentana, charIdx, script, currentEp, epDataUpsert, cotejoAviso, impCabecera, impEsc, impLanzar, castAviso, esc
 */

/* ═══ CUES DE ADR ═════════════════════════════════════════════════════════

   Cada intervención del libreto es un CUE: tiene entrada y salida, dura lo que
   dura, se ensaya, se graba y alguien la da por buena. Eso es lo que se apunta
   en la hoja de ADR y lo que se factura.

   Lo que se guarda por cue es solo lo que NO se puede deducir del libreto:
   el estado, el número de take, las notas del director y, si alguien la ha
   corregido a mano, la entrada y la salida. Todo lo demás -personaje, texto,
   timecode- sigue viniendo del libreto, que es la única fuente.

   Se guarda con el capítulo, así que viaja a la nube con todo lo demás y lo
   ve el resto del estudio.

   El estado va en un orden que es el del trabajo real:

     pendiente → ensayo → grabado → aprobado
                              ↘ repetir ↗

   «repetir» no es un paso atrás: es una marca para volver, y por eso se ve. */

const ADR_ESTADOS = {
  pendiente: { et:'Pendiente', ico:'○',  color:'#8892a6' },
  ensayo:    { et:'Ensayo',    ico:'◐',  color:'#60A5FA' },
  grabado:   { et:'Grabado',   ico:'●',  color:'#FBBF24' },
  aprobado:  { et:'Aprobado',  ico:'✓',  color:'#4ADE80' },
  repetir:   { et:'Repetir',   ico:'↻',  color:'#F87171' }
};
const ADR_ORDEN = ['pendiente','ensayo','grabado','aprobado','repetir'];

function adrDatos(){
  if(!window._adrDatos || typeof window._adrDatos !== 'object') window._adrDatos = {};
  return window._adrDatos;
}

/** Ficha completa de un cue: lo del libreto + lo que se haya apuntado. */
function adrDe(si){
  const b = script[si];
  if(!b) return null;
  const g = adrDatos()[si] || {};
  const ven = (b.tcEff != null && typeof karVentana === 'function') ? karVentana(si) : null;
  const tc0 = (g.tc0 != null) ? g.tc0 : (ven ? ven[0] : b.tcEff);
  const tc1 = (g.tc1 != null) ? g.tc1 : (ven ? ven[1] : (b.tcEff != null ? b.tcEff + 2 : null));
  const c = b.key ? charIdx[b.key] : null;
  return {
    si: si,
    key: b.key || '',
    display: (c && c.display) || b.display || '—',
    talento: (c && c.talent) || '',
    color: (c && c.color) || '#4ADE80',
    texto: (b.lines || []).join(' '),
    pagina: b.page,
    tc0: tc0, tc1: tc1,
    dur: (tc0 != null && tc1 != null) ? Math.max(0, tc1 - tc0) : null,
    estado: g.estado || 'pendiente',
    take: g.take || 0,
    notas: g.notas || '',
    tocado: !!(g.tc0 != null || g.tc1 != null)
  };
}

/** Todos los cues del capítulo, en orden. */
function adrTodos(){
  const out = [];
  for(let i = 0; i < script.length; i++){
    const b = script[i];
    if(!b || b.tcEff == null) continue;      // sin timecode no es un cue
    out.push(adrDe(i));
  }
  return out;
}

let _adrGuardaT = 0;
/** Apunta un campo del cue y lo guarda con el capítulo. */
function adrFijar(si, campo, valor){
  const d = adrDatos();
  const g = d[si] || (d[si] = {});
  if(valor === null || valor === '' || valor === undefined) delete g[campo];
  else g[campo] = valor;
  if(!Object.keys(g).length) delete d[si];
  clearTimeout(_adrGuardaT);
  _adrGuardaT = setTimeout(async () => {
    try{ if(currentEp && currentEp.id) await epDataUpsert(currentEp.id, currentEp.showId); }catch(e){}
  }, 700);
}

/** Siguiente estado al pulsar el chip: el ciclo del trabajo real. */
function adrAvanzar(si){
  const a = adrDe(si); if(!a) return;
  const paso = { pendiente:'ensayo', ensayo:'grabado', grabado:'aprobado',
                 aprobado:'pendiente', repetir:'grabado' };
  const nuevo = paso[a.estado] || 'ensayo';
  adrFijar(si, 'estado', nuevo === 'pendiente' ? null : nuevo);
  if(nuevo === 'grabado') adrFijar(si, 'take', (a.take || 0) + 1);
  adrRepintar();
  return nuevo;
}

function adrEstado(si, estado){
  adrFijar(si, 'estado', estado === 'pendiente' ? null : estado);
  if(estado === 'grabado'){ const a = adrDe(si); adrFijar(si, 'take', (a.take || 0) + 1); }
  adrRepintar();
}

/* ── Entrada y salida: cogerlas del vídeo ─────────────────────────────── */

/** Pone la entrada (o la salida) del cue donde esté el vídeo ahora. */
function adrCapturar(si, cual){
  const el = studioEl();
  if(!el || !el.src){ stMsg('⚠️ Primero carga el vídeo'); return false; }
  const tc = el.currentTime + studioTc0() + studioFine();
  const a = adrDe(si);
  if(cual === 'in'){
    if(a.tc1 != null && tc >= a.tc1 - 0.1){ stMsg('⚠️ La entrada quedaría después de la salida'); return false; }
    adrFijar(si, 'tc0', tc);
  }else{
    if(a.tc0 != null && tc <= a.tc0 + 0.1){ stMsg('⚠️ La salida quedaría antes de la entrada'); return false; }
    adrFijar(si, 'tc1', tc);
  }
  salaOlvidar(); adrRepintar();
  stMsg((cual === 'in' ? '⌖ Entrada' : '⌖ Salida') + ' del cue en ' + stFmtTC(tc));
  return true;
}
/** Devuelve el cue a lo que dice el libreto. */
function adrSoltar(si){
  adrFijar(si, 'tc0', null); adrFijar(si, 'tc1', null);
  salaOlvidar(); adrRepintar();
  stMsg('↺ Entrada y salida otra vez como en el libreto');
}

/* ── El bucle de ensayo ───────────────────────────────────────────────── */

/* El vigilante va con un temporizador, no con requestAnimationFrame: rAF no
   se dispara si la pestana no esta pintando -otra ventana delante, el libreto
   en otra pantalla- y entonces el bucle se saldria del cue sin volver. */
const adrLoop = { si:-1, t0:0, t1:0, iv:0 };
function adrBucleParar(){
  if(adrLoop.iv){ clearInterval(adrLoop.iv); adrLoop.iv = 0; }
  adrLoop.si = -1;
  try{ const b = $('adrLoopBtn'); if(b) b.classList.remove('on'); }catch(e){}
  adrRepintar();
}
function adrBucleVigilar(){
  if(adrLoop.si < 0){ adrBucleParar(); return; }
  const el = studioEl();
  if(el && el.duration && el.currentTime >= adrLoop.t1){
    try{ el.currentTime = adrLoop.t0; }catch(e){}
  }
}
/** Repite el cue una y otra vez, con su pre-roll: es como se ensaya. */
function adrBucle(si){
  if(adrLoop.si === si){ adrBucleParar(); stMsg('Bucle parado'); return false; }
  const a = adrDe(si);
  const el = studioEl();
  if(!el || !el.src){ stMsg('⚠️ Primero carga el vídeo'); return false; }
  if(a.tc0 == null || a.tc1 == null){ stMsg('⚠️ Ese cue no trae timecode'); return false; }
  const pre = studioPreroll();
  adrLoop.si = si;
  adrLoop.t0 = Math.max(0, a.tc0 - studioTc0() - studioFine() - pre);
  adrLoop.t1 = a.tc1 - studioTc0() - studioFine() + 0.25;
  try{ el.currentTime = adrLoop.t0; el.play().catch(()=>{}); }catch(e){}
  if(!adrLoop.iv) adrLoop.iv = setInterval(adrBucleVigilar, 50);
  adrRepintar();
  stMsg('🔁 Bucle en «' + a.display + '» · ' + stFmtTC(a.tc0) + ' → ' + stFmtTC(a.tc1)
        + (pre ? (' · pre-roll ' + pre + ' s') : ''));
  return true;
}

/* ── La ficha del cue que suena ahora, bajo el transporte ─────────────── */

function adrSiAhora(){
  const el = studioEl();
  if(!el || !el.duration) return -1;
  const t = el.currentTime + studioTc0() + studioFine();
  let mejor = -1;
  for(let i = 0; i < script.length; i++){
    const a = (script[i] && script[i].tcEff != null) ? adrDe(i) : null;
    if(!a || a.tc0 == null) continue;
    if(t >= a.tc0 && t < a.tc1) return i;
    if(a.tc0 <= t) mejor = i;
  }
  return mejor;
}

function adrFichaEl(){
  const left = $('stLeft'); if(!left) return null;
  let f = document.getElementById('adrFicha');
  if(!f){
    f = document.createElement('div');
    f.id = 'adrFicha';
    f.className = 'adr-ficha';
    const tp = $('stTransport');
    if(tp && tp.nextSibling) left.insertBefore(f, tp.nextSibling);
    else left.appendChild(f);
  }
  return f;
}

let adrFichaOn = false;
function adrFichaToggle(v){
  adrFichaOn = (v == null) ? !adrFichaOn : !!v;
  try{ localStorage.setItem('ddl_adr_ficha', adrFichaOn ? '1' : '0'); }catch(e){}
  const b = $('stAdr'); if(b) b.classList.toggle('on', adrFichaOn);
  adrRepintar();
  stMsg(adrFichaOn ? '🎬 Ficha del cue encendida' : 'Ficha del cue apagada');
}

function adrChip(a){
  const e = ADR_ESTADOS[a.estado] || ADR_ESTADOS.pendiente;
  return '<button class="adr-chip" data-si="' + a.si + '" style="--ec:' + e.color + '" '
    + 'title="Pulsa para pasar al siguiente estado">' + e.ico + ' ' + e.et
    + (a.take ? ' <b>T' + a.take + '</b>' : '') + '</button>';
}

function adrRepintar(){
  const f = document.getElementById('adrFicha');
  if(!f) return;
  if(!adrFichaOn || !studioStripOn()){ f.style.display = 'none'; return; }
  const si = adrSiAhora();
  if(si < 0){ f.style.display = 'block'; f.innerHTML = '<div class="adr-vacio">Sin cue: el vídeo está fuera de toda intervención.</div>'; return; }
  const a = adrDe(si);
  f.style.display = 'block';
  f.innerHTML =
      '<div class="adr-l1"><span class="adr-pers" style="color:' + a.color + '">' + esc(a.display) + '</span>'
    +   (a.talento ? '<span class="adr-tal">' + esc(a.talento) + '</span>' : '')
    +   '<span class="adr-tc">' + stFmtTC(a.tc0) + ' → ' + stFmtTC(a.tc1)
    +     ' · <b>' + (a.dur != null ? a.dur.toFixed(1) : '—') + ' s</b>'
    +     (a.tocado ? ' <i title="Entrada o salida corregidas a mano">✎</i>' : '') + '</span>'
    +   adrChip(a)
    + '</div>'
    + '<div class="adr-tx">' + esc(a.texto || '—') + '</div>'
    + (function(){
        const c = cotejoAviso(si);
        if(!c) return '';
        return '<div class="adr-cot" style="--cc2:' + c.color + '">🔎 ' + c.et
          + ' (' + Math.round(c.sim * 100) + '% se parece) · se oye: «' + esc(c.oido) + '»</div>';
      })()
    + '<div class="adr-btns">'
    +   '<button class="adr-b" data-a="in"   title="Poner la ENTRADA donde está el vídeo">⌖ entrada</button>'
    +   '<button class="adr-b" data-a="out"  title="Poner la SALIDA donde está el vídeo">salida ⌖</button>'
    +   '<button class="adr-b" data-a="soltar" title="Volver a los timecodes del libreto">↺</button>'
    +   '<button class="adr-b" id="adrLoopBtn" data-a="loop" title="Repetir este cue una y otra vez">🔁 bucle</button>'
    +   '<button class="adr-b ok" data-a="grabado" title="Marcar grabado (sube el número de take)">● grabado</button>'
    +   '<button class="adr-b" data-a="repetir" title="Hay que repetirlo">↻ repetir</button>'
    +   '<input class="adr-nota" data-si="' + a.si + '" placeholder="Nota del director…" value="' + esc(a.notas) + '">'
    + '</div>';
  if(adrLoop.si === si){ const b = f.querySelector('#adrLoopBtn'); if(b) b.classList.add('on'); }
  f.querySelectorAll('.adr-chip').forEach(b => b.onclick = () => adrAvanzar(+b.dataset.si));
  f.querySelectorAll('.adr-b').forEach(b => b.onclick = () => {
    const q = b.dataset.a;
    if(q === 'in' || q === 'out') adrCapturar(si, q);
    else if(q === 'soltar') adrSoltar(si);
    else if(q === 'loop') adrBucle(si);
    else adrEstado(si, q);
  });
  const nt = f.querySelector('.adr-nota');
  if(nt){
    nt.onchange = () => adrFijar(si, 'notas', nt.value.trim() || null);
    nt.onkeydown = (e) => { e.stopPropagation(); if(e.key === 'Enter') nt.blur(); };
  }
}

/* ── La hoja de cues entera ───────────────────────────────────────────── */

let adrFiltro = '';
function adrPanel(){
  const viejo = document.getElementById('adrOv'); if(viejo) viejo.remove();
  const cues = adrTodos();
  const ov = document.createElement('div');
  ov.id = 'adrOv'; ov.className = 'modo-cap';
  const cuenta = {};
  for(const k of ADR_ORDEN) cuenta[k] = 0;
  for(const a of cues) cuenta[a.estado] = (cuenta[a.estado] || 0) + 1;
  const total = cues.reduce((n, a) => n + (a.dur || 0), 0);
  const lista = cues
    .filter(a => !adrFiltro || a.estado === adrFiltro)
    .map(a =>
      '<div class="adr-f" data-si="' + a.si + '">'
      + '<div class="adr-f-tc">' + stFmtTC(a.tc0) + '<small>' + (a.dur != null ? a.dur.toFixed(1) + ' s' : '') + '</small></div>'
      + '<div class="adr-f-tx"><b style="color:' + a.color + '">' + esc(a.display) + '</b>'
      +   (a.talento ? ' <span class="adr-tal">' + esc(a.talento) + '</span>' : '')
      +   (a.pagina != null ? ' <span class="adr-pg">pág. ' + a.pagina + '</span>' : '')
      +   '<div>' + esc(a.texto) + '</div>'
      +   (a.notas ? '<div class="adr-nt">✎ ' + esc(a.notas) + '</div>' : '')
      +   (function(){ const c = cotejoAviso(a.si); return c
            ? '<div class="adr-cot" style="--cc2:' + c.color + '">🔎 ' + c.et + ' · se oye: «'
              + esc(c.oido) + '»</div>' : ''; })() + '</div>'
      + '<div class="adr-f-e">' + adrChip(a) + '</div></div>').join('')
    || '<div class="adr-vacio">Nada con ese estado.</div>';
  const filtros = ['', ...ADR_ORDEN].map(k => {
    const e = k ? ADR_ESTADOS[k] : { et:'Todos', ico:'', color:'#e7ebf3' };
    const n = k ? cuenta[k] : cues.length;
    return '<button class="adr-fl' + (adrFiltro === k ? ' on' : '') + '" data-f="' + k + '" '
      + 'style="--ec:' + e.color + '">' + (e.ico ? e.ico + ' ' : '') + e.et + ' <b>' + n + '</b></button>';
  }).join('');
  ov.innerHTML = '<div class="modo-caja" style="max-width:760px;text-align:left">'
    + '<div class="modo-tit">Cues de ADR</div>'
    + '<div class="modo-sub" style="margin-bottom:8px">' + cues.length + ' cue' + (cues.length === 1 ? '' : 's')
    + ' · ' + Math.round(total) + ' s de diálogo (' + stFmt(total) + ')</div>'
    + '<div class="adr-fls">' + filtros + '</div>'
    + '<div class="adr-lista">' + lista + '</div>'
    + '<div class="dud-btns"><button class="modo-op dud-b" id="adrCerrar">Cerrar</button>'
    + '<button class="modo-op dud-b" id="adrImp">🖨 Hoja de ADR</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('#adrCerrar').onclick = cerrar;
  ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });
  ov.querySelector('#adrImp').onclick = () => { cerrar(); imprimirADR(); };
  ov.querySelectorAll('.adr-fl').forEach(b => b.onclick = () => { adrFiltro = b.dataset.f; cerrar(); adrPanel(); });
  ov.querySelectorAll('.adr-chip').forEach(b => b.onclick = (e) => {
    e.stopPropagation(); adrAvanzar(+b.dataset.si); cerrar(); adrPanel();
  });
  ov.querySelectorAll('.adr-f').forEach(el => el.onclick = () => {
    const si = +el.dataset.si;
    cerrar();
    try{ studioSeekSi(si); }catch(e){}
  });
}

/* ── La hoja impresa: una fila por cue, agrupada por talento ──────────── */

function imprimirADR(){
  const cues = adrTodos();
  if(!cues.length){ castAviso('No hay cues con timecode en este capítulo'); return; }
  const porTal = new Map();
  for(const a of cues){
    const t = a.talento || '— sin asignar —';
    if(!porTal.has(t)) porTal.set(t, []);
    porTal.get(t).push(a);
  }
  const tals = Array.from(porTal.keys()).sort((x, y) => x.localeCompare(y, 'es'));
  let cuerpo = impCabecera('Hoja de ADR');
  let totalG = 0, nG = 0;
  for(const t of tals){
    const filas = porTal.get(t);
    const seg = filas.reduce((n, a) => n + (a.dur || 0), 0);
    totalG += seg; nG += filas.length;
    cuerpo += '<h2 style="font-size:14px;margin:16px 0 6px">' + impEsc(t)
      + ' <span style="font-weight:400;color:#666;font-size:11.5px">· ' + filas.length + (filas.length===1?' cue · ':' cues · ')
      + stFmt(seg) + '</span></h2>'
      + '<table><thead><tr><th class="num">TC in</th><th class="num">TC out</th><th class="num">Dur.</th>'
      + '<th>Personaje</th><th>Texto</th><th class="num">Take</th><th>Estado</th></tr></thead><tbody>';
    for(const a of filas){
      const e = ADR_ESTADOS[a.estado] || ADR_ESTADOS.pendiente;
      cuerpo += '<tr><td class="num">' + stFmtTC(a.tc0) + '</td><td class="num">' + stFmtTC(a.tc1) + '</td>'
        + '<td class="num">' + (a.dur != null ? a.dur.toFixed(1) : '') + '</td>'
        + '<td class="pers">' + impEsc(a.display) + '</td>'
        + '<td>' + impEsc(a.texto) + (a.notas ? '<div style="color:#b00;font-size:11px">✎ ' + impEsc(a.notas) + '</div>' : '') + '</td>'
        + '<td class="num">' + (a.take || '') + '</td>'
        + '<td>' + e.ico + ' ' + e.et + '</td></tr>';
    }
    cuerpo += '</tbody></table>';
  }
  cuerpo += '<div class="pie">' + nG + ' cues · ' + tals.length + ' talento' + (tals.length === 1 ? '' : 's')
    + ' · ' + stFmt(totalG) + ' de diálogo en total</div>';
  impLanzar('Hoja de ADR', cuerpo);
}
