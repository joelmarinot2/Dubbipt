/* El reparto del programa en una ventana aparte, desde el casting · especificacion 09, PRO-36
 *
 * Pedido de sala: «quiero incluir cuando se haga el casting un apartado que se
 * abra en una pestaña aparte, que abra el reparto del programa, que yo pueda
 * buscarlo».
 *
 * Con el capítulo abierto en Casting, el botón «Reparto» abre una ventana del
 * navegador aparte (para llevarla a otra pantalla, como la Disponibilidad)
 * con el Reparto del programa: el mismo que la vista de Casting (csRepartoDe:
 * DublajeCast y lo casteado en Dubbipt, capítulo a capítulo). Por personaje
 * -con su talento por tramos de episodios y sus líneas- o por talento -con
 * sus personajes-. Se busca por personaje o por talento, sin tildes ni
 * mayúsculas. Se pone al día sola al asignar un talento aquí o al cambiar de
 * capítulo. Si el navegador bloquea la ventana, se abre dentro de la página.
 *
 * Es un script clásico: comparte el ámbito global con index.html.
 * De donde depende: castNorm, castRegCargar, castOcupacion, currentEp, sbShows,
 * sbEps, csDatos, csProgramas, csRepartoDe, csRepartoPorTalento, dispEsc,
 * DISP_CSS, fallo.
 */

/* ═══ EL REPARTO EN UNA VENTANA APARTE ══════════════════════════════════════ */

const REPV = { buscar: '', vista: 'personaje', w: null, tmr: null, firma: '', nombre: 'dubbiptReparto', cada: 2000, datos: null };

/** El programa del capítulo abierto, como lo ve la vista de Casting, y su reparto. */
async function repvDatos(){
  const showId = (typeof currentEp !== 'undefined' && currentEp) ? currentEp.showId : null;
  const d = (typeof csDatos === 'function') ? csDatos().datos : null;
  let p = null;
  try{
    const lista = csProgramas((typeof sbShows === 'function') ? sbShows() : [], (typeof sbEps === 'function') ? sbEps : null, d);
    p = lista.find(x => x.show && x.show.id === showId) || null;
  }catch(e){ p = null; }
  let registro = { personajes: {} };
  try{ if(showId) registro = await castRegCargar(showId); }catch(e){ fallo('castRegCargar · js/castreparto.js', e); }
  let reparto = [];
  try{ if(p) reparto = csRepartoDe(p, d, registro); }catch(e){ fallo('csRepartoDe · js/castreparto.js', e); }
  return { p: p, d: d, reparto: reparto, programa: p ? p.nombre : '', capitulo: (typeof currentEp !== 'undefined' && currentEp) ? (currentEp.name || '') : '' };
}

/** Lo que se ve: por personaje o por talento, buscado. */
function repvFilas(reparto, buscar, vista, d){
  const q = castNorm(buscar);
  const tiene = (txt) => !q || castNorm(txt).indexOf(q) >= 0;
  if(vista === 'talento'){
    const grupos = (typeof csRepartoPorTalento === 'function') ? csRepartoPorTalento(reparto, d) : [];
    return grupos.filter(g => tiene(g.talento) || g.personajes.some(x => tiene(x.r.personaje))).sort((a, b) => (b.lineas - a.lineas) || a.talento.localeCompare(b.talento, 'es'));
  }
  return reparto.filter(r => tiene(r.personaje) || r.tramos.some(t => tiene(t.talento)));
}

function repvEps(eps){ return (eps || []).map(n => '<span class="repv-ep">Ep. ' + dispEsc(n) + '</span>').join(''); }

/** El cuerpo de la ventana. */
function repvHtml(datos, o){
  o = o || {};
  const r = datos.reparto || [];
  const filas = repvFilas(r, REPV.buscar, REPV.vista, datos.d);
  const pest = (k, t) => '<button class="repv-pest' + (REPV.vista === k ? ' on' : '') + '" data-repv="' + k + '">' + t + '</button>';
  const cuerpo = !datos.p ? '<div class="disp-nada">Abre un capítulo de un programa para ver su reparto.</div>'
    : (!r.length ? '<div class="disp-nada">Este programa todavía no tiene reparto: se arma al hacer el casting de cada capítulo.</div>'
    : (!filas.length ? '<div class="disp-nada">Nada coincide con «' + dispEsc(REPV.buscar) + '».</div>'
    : '<div class="disp-lista">' + (REPV.vista === 'talento'
        ? filas.map(g => '<div class="disp-fila"><div class="disp-nom"><b>' + dispEsc(g.talento) + '</b><span class="disp-ficha">' + g.personajes.length + ' pers. · ' + g.lineas + ' líneas</span></div>'
            + '<div class="repv-tramos">' + g.personajes.map(x => '<div class="repv-tramo"><span class="repv-per">' + (x.r.principal ? '★ ' : '') + dispEsc(x.r.personaje) + '</span>'
                + (x.lineas ? '<span class="repv-lin">' + x.lineas + ' lín.</span>' : '') + '<span class="repv-eps">' + repvEps(x.eps) + '</span></div>').join('') + '</div></div>').join('')
        : filas.map(x => '<div class="disp-fila' + (x.tramos.some(t => t.talento) ? ' disp-del' : '') + '"><div class="disp-nom"><b>' + (x.principal ? '★ ' : '') + dispEsc(x.personaje) + '</b>'
            + '<span class="disp-ficha">' + x.episodios + ' ep. · ' + x.lineas + ' líneas' + (x.tramos.filter(t => t.talento).length > 1 ? ' · relevo' : '') + '</span></div>'
            + '<div class="repv-tramos">' + x.tramos.map(t => '<div class="repv-tramo">' + (t.talento ? '<span class="repv-tal">' + dispEsc(t.talento) + '</span>' : '<span class="repv-sin">sin talento</span>')
                + (t.lineas ? '<span class="repv-lin">' + t.lineas + ' lín.</span>' : '') + '<span class="repv-eps">' + repvEps(t.eps) + '</span></div>').join('') + '</div></div>').join(''))
      + '</div>'));
  const nPer = r.length, nTal = new Set([].concat.apply([], r.map(x => x.tramos.map(t => castNorm(t.talento)).filter(Boolean)))).size;
  return '<div class="disp-cab"><div><div class="modo-tit">Reparto del programa</div>'
    + '<div class="modo-sub">' + dispEsc(datos.programa || 'Sin programa') + (datos.capitulo ? ' · casteando ' + dispEsc(datos.capitulo) : '') + ' · ' + nPer + ' personaje' + (nPer === 1 ? '' : 's') + ' · ' + nTal + ' talento' + (nTal === 1 ? '' : 's') + '</div></div>'
    + '<div class="disp-cab-b">'
    +   (o.enVentana ? '<button class="disp-b" id="repvActualizar" title="Volver a mirar"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 12a9 9 0 11-2.64-6.36"/><path d="M21 3.5V8h-4.5"/></svg><span>Actualizar</span></button>' : '')
    +   '<button class="disp-x" id="repvCerrar" title="Cerrar" aria-label="Cerrar"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button>'
    + '</div></div>'
    + (o.nota ? '<div class="meta-nota disp-aviso">' + dispEsc(o.nota) + '</div>' : '')
    + '<div class="disp-filtros"><input type="text" id="repvBuscar" placeholder="Buscar personaje o talento…" value="' + dispEsc(REPV.buscar) + '" autocomplete="off">'
    +   '<div class="repv-pests">' + pest('personaje', 'Por personaje') + pest('talento', 'Por talento') + '</div></div>'
    + cuerpo;
}

/* Lo que necesita la ventana aparte además de lo de la Disponibilidad. */
const REPV_CSS = ".repv-pests{ display:flex; gap:4px; background:#11131a; border:1px solid #2b3040; border-radius:9px; padding:3px; }"
  + ".repv-pest{ background:none; border:0; color:#aab3c2; font:inherit; font-size:12.5px; padding:5px 10px; border-radius:7px; cursor:pointer; }"
  + ".repv-pest.on{ background:#22C55E; color:#06210f; font-weight:700; }"
  + ".repv-tramos{ display:flex; flex-direction:column; gap:4px; }"
  + ".repv-tramo{ display:flex; flex-wrap:wrap; align-items:center; gap:5px 10px; font-size:12.5px; }"
  + ".repv-tal{ color:#4ADE80; font-weight:700; } .repv-sin{ color:#FB7185; } .repv-per{ color:#e7ebf3; font-weight:600; }"
  + ".repv-lin{ color:#aab3c2; font-variant-numeric:tabular-nums; } .repv-eps{ display:flex; flex-wrap:wrap; gap:4px; }"
  + ".repv-ep{ background:#161a22; border:1px solid #2b3040; border-radius:999px; padding:0 7px; font-size:11px; color:#cbd5e1; font-variant-numeric:tabular-nums; }";

/** Pinta en `raiz` y engancha sus controles. */
function repvPintarEn(raiz, datos, o){
  const doc = raiz.ownerDocument || document;
  const activo = doc.activeElement && doc.activeElement.id === 'repvBuscar';
  const pos = activo ? doc.activeElement.selectionStart : null;
  raiz.innerHTML = repvHtml(datos, o);
  const repintar = () => repvPintarEn(raiz, datos, o);
  const b = raiz.querySelector('#repvBuscar');
  if(b){
    b.oninput = () => { REPV.buscar = b.value; repintar(); };
    if(activo){ try{ b.focus(); b.setSelectionRange(pos, pos); }catch(e){ /* sin cursor */ } }
  }
  (raiz.querySelectorAll ? Array.from(raiz.querySelectorAll('[data-repv]')) : []).forEach(el => { el.onclick = () => { REPV.vista = el.getAttribute('data-repv'); repintar(); }; });
  const x = raiz.querySelector('#repvCerrar'); if(x) x.onclick = () => { if(o && o.cerrar) o.cerrar(); };
  const a = raiz.querySelector('#repvActualizar'); if(a) a.onclick = () => { if(o && o.actualizar) o.actualizar(); };
}

/** La huella de lo que puede cambiar el reparto mientras se castea: el capítulo y lo asignado en él. */
function repvFirma(){
  const showId = (typeof currentEp !== 'undefined' && currentEp) ? currentEp.showId : '';
  const cap = (typeof currentEp !== 'undefined' && currentEp) ? (currentEp.name || '') : '';
  let en = [];
  try{ en = (typeof castOcupacion === 'function') ? castOcupacion() : []; }catch(e){ en = []; }
  return String(showId) + '|' + cap + '|' + en.map(e => castNorm(e.talento) + ':' + (e.personajes || []).map(p => p.display).join(',')).sort().join(';');
}

/** Abre el reparto: en una ventana aparte si el navegador deja; si no, dentro de la página. */
async function repvAbrir(){
  let w = null;
  try{ w = window.open('', REPV.nombre, 'width=820,height=920,resizable=yes,scrollbars=yes'); }catch(e){ w = null; }
  if(w && !w.closed) return repvEnVentana(w);
  return repvEnPagina('Tu navegador no dejó abrir una ventana aparte. Para llevarla a otra pantalla, permite las ventanas emergentes de Dubbipt y vuelve a pulsar «Reparto».');
}

async function repvEnVentana(w){
  REPV.w = w;
  const doc = w.document;
  if(!doc.getElementById('repvRaiz')){
    doc.open();
    doc.write('<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">'
      + '<title>Reparto · Dubbipt</title><style>' + (typeof DISP_CSS === 'string' ? DISP_CSS : '') + REPV_CSS + '</style></head>'
      + '<body><div id="repvRaiz" class="disp-ventana"><div class="modo-sub">Armando el reparto…</div></div></body></html>');
    doc.close();
  }
  try{ w.focus(); }catch(e){ /* el navegador decide */ }
  await repvRefrescar();
  repvVigilar();
  return w;
}

/** Vuelve a mirar y repinta la ventana aparte. */
async function repvRefrescar(){
  const w = REPV.w;
  if(!w || w.closed) return false;
  const datos = await repvDatos();
  REPV.datos = datos;
  REPV.firma = repvFirma();
  const raiz = w.document.getElementById('repvRaiz');
  if(!raiz) return false;
  try{ w.document.title = 'Reparto · ' + (datos.programa || 'Dubbipt'); }catch(e){ /* sin título */ }
  repvPintarEn(raiz, datos, { enVentana: true, cerrar: () => w.close(), actualizar: () => repvRefrescar() });
  return true;
}

/** Mientras la ventana esté abierta, cada 2 s mira si cambió lo de aquí; si cambió, la pone al día. */
function repvVigilar(){
  if(REPV.tmr) return;
  REPV.tmr = setInterval(() => {
    const w = REPV.w;
    if(!w || w.closed){ clearInterval(REPV.tmr); REPV.tmr = null; REPV.w = null; return; }
    if(repvFirma() === REPV.firma) return;
    /* Lo asignado se apunta en el registro un momento después: se espera a que esté. */
    REPV.firma = repvFirma();
    setTimeout(() => { repvRefrescar().catch(e => fallo('repvRefrescar · js/castreparto.js', e)); }, 1800);
  }, REPV.cada);
}

/** Dentro de la página: cuando no se puede abrir la ventana aparte. */
async function repvEnPagina(nota){
  const viejo = document.getElementById('repvOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'repvOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja disp-caja"><div class="modo-sub">Armando el reparto…</div></div>';
  document.body.appendChild(ov);
  const datos = await repvDatos();
  repvPintarEn(ov.querySelector('.modo-caja'), datos, { nota: nota, cerrar: () => ov.remove() });
  ov.addEventListener('click', (e) => { if(e.target === ov) ov.remove(); });
  return ov;
}

/* ═══ FIN DEL REPARTO EN UNA VENTANA APARTE ═══ */
