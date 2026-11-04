/* Talentos de training · especificacion 02, CAST-43
 *
 * Pedido de sala: «clic derecho a la tarjeta y colocar que es de training; se
 * marca en amarillo en el desglose; en el Excel se le pide un número de
 * teléfono, que va donde dice TELEFONO; y en la planilla, al costado derecho
 * de las líneas de ese talento, se pone la palabra training. Importante: eso
 * se marca solo en el programa que lo haga, nada de automatizaciones». Y
 * después: «más que un personaje, se marca al TALENTO de training en ese
 * episodio: si marqué a María Coronado y tiene tres personajes, los tres se
 * marcan; el teléfono se pide una sola vez».
 *
 * Por eso lo que se guarda es la lista de talentos de training DEL CAPÍTULO
 * (`{ TALENTO: { nombre, tel } }`, con los datos del capítulo): todos los
 * personajes de ese talento en ese capítulo son training, también el que se le
 * reparta después. Nada sale del capítulo: no se hereda, no va al registro del
 * programa ni a otros capítulos. El Excel lo escribe castDescargar
 * (castAplicarTraining, en index.html).
 *
 * Solo en el perfil Casting, que es donde se reparte y se descarga el desglose.
 *
 * De donde depende: charIdx, currentEp, DDL_MODO, renderCards, renderPlanilla,
 * epDataUpsert, castHistPush, esc, fallo, DDL_UI.
 */

/* ═══ TRAINING ═══════════════════════════════════════════════════════════ */

const TRN = { menu: null };

function trnLimpiarTel(t){ return String(t == null ? '' : t).replace(/\s+/g, ' ').trim().slice(0, 40); }
/** La clave de un talento: sin tildes, en mayúsculas y con un espacio entre palabras. */
function trnClave(t){ return String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim(); }

function trnEpId(){ return (typeof currentEp !== 'undefined' && currentEp && currentEp.id) || ''; }
/** Los talentos de training del capítulo abierto (los de otro capítulo no valen aquí). */
function trnMapa(){
  const t = (typeof window !== 'undefined') ? window._epTraining : null;
  return (t && t.mapa && t.ep === trnEpId()) ? t.mapa : {};
}
function trnFijarMapa(m){ window._epTraining = { ep: trnEpId(), mapa: m || {} }; }

/** ¿Este personaje es de training? Lo es si su talento lo es en este capítulo. Devuelve {nombre, tel} o null. */
function trnDe(c){
  if(!c || !c.talent || c.noRec) return null;
  return trnMapa()[trnClave(c.talent)] || null;
}
/** Los personajes del capítulo que hace un talento. */
function trnPersonajesDe(talento){
  const k = trnClave(talento), out = [];
  for(const key in (typeof charIdx !== 'undefined' ? charIdx : {})){
    const c = charIdx[key];
    if(c && c.talent && trnClave(c.talent) === k) out.push(key);
  }
  return out;
}

/** Lo guardado, ya limpio (viene de la nube). */
function trnSanear(m){
  const out = {};
  if(!m || typeof m !== 'object') return out;
  for(const k of Object.keys(m).slice(0, 500)){
    const x = m[k];
    if(!x || typeof x !== 'object') continue;
    const nombre = String((x && x.nombre) || k).replace(/\s+/g, ' ').trim().slice(0, 120), kk = trnClave(nombre);
    if(kk) out[kk] = { nombre: nombre, tel: trnLimpiarTel(x && x.tel) };
  }
  return out;
}
/**
 * Al abrir un capítulo: su lista. La de la primera versión (v11.93.0) iba en
 * cada personaje (`c.training`, `c.tel`): se pasa a su talento y se quita de ahí.
 */
function trnCargar(d, epId){
  const mapa = trnSanear(d && d.training);
  const viejos = (typeof chars !== 'undefined' && Array.isArray(chars) ? chars : []).concat(Array.isArray(window._charsRaw) ? window._charsRaw : []);
  for(const c of viejos){
    if(!c || c.training === undefined) continue;
    if(c.training === true && c.talent && !c.noRec){ const k = trnClave(c.talent); if(k && !mapa[k]) mapa[k] = { nombre: String(c.talent).trim(), tel: trnLimpiarTel(c.tel) }; }
    delete c.training; delete c.tel;
  }
  window._epTraining = { ep: epId || trnEpId(), mapa: mapa };
  return mapa;
}
/** Lo que se guarda con el capítulo. */
function trnParaGuardar(){ const m = trnMapa(); return Object.keys(m).length ? m : null; }
/** Deshacer: la lista como estaba. */
function trnRestaurar(m){ trnFijarMapa(JSON.parse(JSON.stringify(m || {}))); }

/** Marca o quita un talento de training en este capítulo. Devuelve los personajes que tiene. */
function trnPoner(talento, activo, tel){
  const m = Object.assign({}, trnMapa()), k = trnClave(talento);
  if(!k) return [];
  if(activo) m[k] = { nombre: String(talento).replace(/\s+/g, ' ').trim(), tel: trnLimpiarTel(tel) };
  else delete m[k];
  trnFijarMapa(m);
  return trnPersonajesDe(talento);
}

/** Lo guarda y repinta. */
async function trnGuardar(talento, activo, tel){
  try{ castHistPush([{ key: '__training', mapa: JSON.parse(JSON.stringify(trnMapa())) }], (activo ? 'training de ' : 'quitar training a ') + talento); }
  catch(e){ /* sin deshacer para este paso */ }
  const pers = trnPoner(talento, activo, tel);
  try{ renderCards(); }catch(e){ fallo('renderCards · js/training.js', e); }
  try{ if(typeof renderPlanilla === 'function') renderPlanilla(); }catch(e){ fallo('renderPlanilla · js/training.js', e); }
  try{ if(trnEpId()) await epDataUpsert(currentEp.id, currentEp.showId); }
  catch(e){ fallo('epDataUpsert · js/training.js', e, 'puede que esto no se haya guardado en la nube'); }
  const n = pers.length, t = trnLimpiarTel(tel);
  if(typeof DDL_UI !== 'undefined') DDL_UI.toast(activo
    ? talento + ' · training en ' + n + ' personaje' + (n === 1 ? '' : 's') + (t ? ' · ' + t : ' · sin teléfono')
    : talento + ' ya no es training');
}

/** El teléfono: se pide una vez por talento. Se puede dejar vacío y ponerlo después. */
function trnPedirTel(talento){
  const viejo = document.getElementById('trnOv');
  if(viejo) viejo.remove();
  const ya = trnMapa()[trnClave(talento)], pers = trnPersonajesDe(talento).map(k => (charIdx[k] && charIdx[k].display) || k);
  const ov = document.createElement('div');
  ov.id = 'trnOv'; ov.className = 'modo-cap';
  ov.innerHTML = '<div class="modo-caja" style="max-width:440px;text-align:left">'
    + '<div class="modo-tit">Training · ' + esc(talento) + '</div>'
    + '<div class="meta-nota">Sus ' + pers.length + ' personaje' + (pers.length === 1 ? '' : 's') + ' en este capítulo: <b>' + esc(pers.join(', ')) + '</b>. '
    + 'En el Excel salen en amarillo con el teléfono en <b>TELEFONO</b>, y la planilla lleva la palabra <b>training</b> a la derecha de sus líneas. Solo en este capítulo.</div>'
    + '<label class="tci-f">Número de teléfono <input id="trnTel" type="text" inputmode="tel" autocomplete="off" placeholder="316 847 9418" value="' + esc((ya && ya.tel) || '') + '"></label>'
    + '<div class="dud-btns"><button class="modo-op dud-b" id="trnNo">Cancelar</button><button class="modo-op dud-b dud-ok" id="trnOk">' + (ya ? 'Guardar' : 'Marcar training') + '</button></div></div>';
  document.body.appendChild(ov);
  const cerrar = () => ov.remove(), inp = ov.querySelector('#trnTel');
  const ok = async () => { const t = inp.value; cerrar(); await trnGuardar(talento, true, t); };
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
  const linea = (txt, cls) => { const d = document.createElement('div'); d.className = cls; d.textContent = txt; m.appendChild(d); };
  const op = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'menuitem'); b.textContent = txt; b.onclick = () => { trnMenuCerrar(); fn(); }; m.appendChild(b); };
  const tal = String(c.talent || '').trim();
  linea((c.display || key) + (tal ? ' · ' + tal : ''), 'trn-menu-t');
  if(!tal) linea('Asigna primero el talento: el training es del talento en este capítulo', 'trn-menu-n');
  else if(c.noRec) linea(tal + ' no es un talento', 'trn-menu-n');
  else{
    const ya = trnDe(c), n = trnPersonajesDe(tal).length, pj = ' (' + n + ' personaje' + (n === 1 ? '' : 's') + ')';
    if(ya){
      op('Cambiar el teléfono de ' + tal + '…' + (ya.tel ? ' (' + ya.tel + ')' : ''), () => trnPedirTel(tal));
      op('Quitar training a ' + tal + pj, () => { trnGuardar(tal, false).catch(e => fallo('trnGuardar · js/training.js', e)); });
    }else{
      op('Marcar a ' + tal + ' como training…' + pj, () => trnPedirTel(tal));
    }
  }
  document.body.appendChild(m);
  const w = m.offsetWidth || 240, h = m.offsetHeight || 90;
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
