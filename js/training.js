/* Personajes de training · especificacion 02, CAST-43
 *
 * Pedido de sala: «una opción en los personajes: clic derecho a la tarjeta y
 * colocar que ese personaje es de training; se marca en amarillo en el
 * desglose; en el Excel se le pide un número de teléfono, que va donde dice
 * TELEFONO; y en la planilla, al costado derecho de las líneas de ese talento,
 * se pone la palabra training. Importante: eso se marca solo en el programa
 * que lo haga, nada de automatizaciones».
 *
 * Por eso es una marca A MANO y de ESE capítulo: vive solo en el personaje
 * (`c.training`, `c.tel`) y se guarda con el capítulo. No se hereda al repartir
 * (castHeredar), no va al registro del programa (castRegAnotar), no se copia a
 * los gemelos (ARCHIVO, VO) ni se contagia al fusionar personajes. El Excel lo
 * escribe castDescargar (castAplicarTraining, en index.html).
 *
 * Solo en el perfil Casting, que es donde se reparte y se descarga el desglose.
 *
 * De donde depende: charIdx, currentEp, DDL_MODO, renderCards, renderPlanilla,
 * epDataUpsert, castHistPush, castFoto, esc, fallo, DDL_UI.
 */

/* ═══ TRAINING ═══════════════════════════════════════════════════════════ */

const TRN = { menu: null };

function trnLimpiarTel(t){ return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 40); }

/** Marca o quita el training de un personaje, en la tarjeta y en lo crudo (lo que se reabre). Devuelve false si no existe. */
function trnPoner(key, activo, tel){
  const c = (typeof charIdx !== 'undefined') ? charIdx[key] : null;
  if(!c) return false;
  const t = trnLimpiarTel(tel);
  const aplica = (o) => { if(activo){ o.training = true; o.tel = t; } else { delete o.training; delete o.tel; } };
  aplica(c);
  try{ const raw = (window._charsRaw || []).find(x => x.key === key); if(raw) aplica(raw); }
  catch(e){ fallo('trnPoner · js/training.js', e, 'la marca puede perderse al reabrir el capítulo'); }
  return true;
}

/** Lo guarda y repinta. */
async function trnGuardar(key, activo, tel, aviso){
  const c = charIdx[key];
  if(!c) return;
  try{ castHistPush(castFoto([key]), (activo ? 'training de ' : 'quitar training de ') + (c.display || key)); }
  catch(e){ /* sin deshacer para este paso */ }
  trnPoner(key, activo, tel);
  try{ renderCards(); }catch(e){ fallo('renderCards · js/training.js', e); }
  try{ if(typeof renderPlanilla === 'function') renderPlanilla(); }catch(e){ fallo('renderPlanilla · js/training.js', e); }
  try{ if(typeof currentEp !== 'undefined' && currentEp && currentEp.id) await epDataUpsert(currentEp.id, currentEp.showId); }
  catch(e){ fallo('epDataUpsert · js/training.js', e, 'puede que esto no se haya guardado en la nube'); }
  if(typeof DDL_UI !== 'undefined') DDL_UI.toast(aviso || ((c.display || key) + (activo ? ' · training' + (trnLimpiarTel(tel) ? ' · ' + trnLimpiarTel(tel) : '') : ' · ya no es training')));
}

/** El teléfono: una pregunta pequeña. Se puede dejar vacío y ponerlo después. */
function trnPedirTel(key){
  const c = charIdx[key];
  if(!c) return;
  const viejo = document.getElementById('trnOv');
  if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'trnOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja" style="max-width:420px;text-align:left">'
    + '<div class="modo-tit">Training · ' + esc(c.display || key) + '</div>'
    + '<div class="meta-nota">En el Excel, la fila de este personaje sale en amarillo con su teléfono en <b>TELEFONO</b>, y la planilla lleva la palabra <b>training</b> a la derecha de sus líneas. Solo en este capítulo.</div>'
    + '<label class="tci-f">Número de teléfono <input id="trnTel" type="text" inputmode="tel" autocomplete="off" placeholder="316 847 9418" value="' + esc(c.tel || '') + '"></label>'
    + '<div class="dud-btns"><button class="modo-op dud-b" id="trnNo">Cancelar</button><button class="modo-op dud-b dud-ok" id="trnOk">' + (c.training ? 'Guardar' : 'Marcar training') + '</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove(), inp = ov.querySelector('#trnTel');
  const ok = async () => { const t = inp.value; cerrar(); await trnGuardar(key, true, t); };
  ov.querySelector('#trnNo').onclick = cerrar;
  ov.querySelector('#trnOk').onclick = ok;
  ov.addEventListener('mousedown', (e) => { if(e.target === ov) cerrar(); });
  inp.addEventListener('keydown', (e) => { if(e.key === 'Enter'){ e.preventDefault(); ok(); } if(e.key === 'Escape') cerrar(); });
  setTimeout(() => { try{ inp.focus(); inp.select(); }catch(e){ /* sin foco se escribe igual */ } }, 40);
}

/** El menú del clic derecho sobre una tarjeta. */
function trnMenuCerrar(){ if(TRN.menu){ TRN.menu.remove(); TRN.menu = null; } }
function trnMenu(ev, key){
  if(typeof DDL_MODO === 'undefined' || DDL_MODO !== 'casting') return false;     // solo en Casting
  const c = charIdx[key];
  if(!c) return false;
  ev.preventDefault(); ev.stopPropagation();
  trnMenuCerrar();
  const m = document.createElement('div');
  m.id = 'trnMenu'; m.className = 'ddl-encima trn-menu'; m.setAttribute('role', 'menu');
  const op = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = txt; b.onclick = () => { trnMenuCerrar(); fn(); }; m.appendChild(b); };
  const t = document.createElement('div'); t.className = 'trn-menu-t'; t.textContent = c.display || key; m.appendChild(t);
  if(c.training){
    op('Cambiar el teléfono…' + (c.tel ? ' (' + c.tel + ')' : ''), () => trnPedirTel(key));
    op('Quitar training', () => { trnGuardar(key, false).catch(e => fallo('trnGuardar · js/training.js', e)); });
  }else{
    op('Marcar como training…', () => trnPedirTel(key));
  }
  document.body.appendChild(m);
  const w = m.offsetWidth || 220, h = m.offsetHeight || 90;
  m.style.left = Math.max(4, Math.min(ev.clientX, window.innerWidth - w - 4)) + 'px';
  m.style.top = Math.max(4, Math.min(ev.clientY, window.innerHeight - h - 4)) + 'px';
  TRN.menu = m;
  return true;
}

if(typeof document !== 'undefined'){
  /* Se cierra al pulsar fuera, con Escape o al mover la pantalla. */
  document.addEventListener('mousedown', (e) => { if(TRN.menu && !TRN.menu.contains(e.target)) trnMenuCerrar(); }, true);
  document.addEventListener('keydown', (e) => { if(e.key === 'Escape') trnMenuCerrar(); }, true);
  window.addEventListener('scroll', trnMenuCerrar, true);
  window.addEventListener('blur', trnMenuCerrar);
}
