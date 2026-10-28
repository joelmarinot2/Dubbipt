/* Una X para borrar el texto de las casillas · especificacion 07, ENT-25
 *
 * Pedido de sala: «quiero que coloque una X para borrar el texto en las
 * casillas de texto en general». En TODA casilla de una línea (buscadores,
 * nombres, talentos, títulos…), mientras se escribe en ella y tiene texto,
 * aparece una × a la derecha: un toque y queda vacía, con el foco dentro
 * para seguir escribiendo. Se avisa como si se hubiera borrado a mano (los
 * buscadores filtran, lo que se guarda al escribir se guarda) y se puede
 * deshacer con Ctrl+Z / Cmd+Z.
 *
 * Es UNA sola × para toda la app, que se coloca sobre la casilla que tiene el
 * foco: no se toca el HTML de ninguna pantalla, así que vale también para lo
 * que se pinte mañana. No sale en las casillas de solo lectura o
 * desactivadas, en las de números, fechas, contraseñas o timecodes cortos
 * (menos de 70 px de ancho), ni en las marcadas con data-sin-x.
 */

/* ═══ LA X DE LAS CASILLAS ═══════════════════════════════════════════════ */

const BX = { boton: null, campo: null, tipos: /^(text|search|email|url|tel)$/i, minAncho: 70 };

/** ¿Esta casilla lleva la ×? */
function bxVale(el){
  if(!el || el.tagName !== 'INPUT') return false;
  if(!BX.tipos.test(el.getAttribute('type') || 'text')) return false;
  if(el.readOnly || el.disabled) return false;
  if(el.hasAttribute('data-sin-x') || (el.closest && el.closest('[data-sin-x]'))) return false;
  const r = el.getBoundingClientRect();
  return r.width >= BX.minAncho && r.height > 0;
}

function bxBoton(){
  if(BX.boton) return BX.boton;
  const b = document.createElement('button');
  b.type = 'button';
  b.id = 'ddlBorrarX';
  b.className = 'ddl-encima ddl-x';
  b.setAttribute('aria-label', 'Borrar el texto');
  b.title = 'Borrar el texto';
  b.tabIndex = -1;
  b.textContent = '×';
  /* Con el ratón o el dedo: que la casilla no pierda el foco al tocar la ×. */
  b.addEventListener('pointerdown', (ev) => { ev.preventDefault(); });
  b.addEventListener('mousedown', (ev) => { ev.preventDefault(); });
  b.addEventListener('click', (ev) => { ev.preventDefault(); ev.stopPropagation(); bxBorrar(BX.campo); });
  document.body.appendChild(b);
  BX.boton = b;
  return b;
}

/**
 * Deja la casilla vacía como si se hubiera borrado a mano: con el foco, el
 * aviso de «input» y de «change» a quien escuche, y se puede deshacer
 * (si el navegador lo permite, se borra como una edición normal).
 */
function bxBorrar(el){
  if(!el || !el.value) return false;
  try{ el.focus(); }catch(e){ /* sin foco se borra igual */ }
  let hecho = false;
  try{
    el.select();
    hecho = typeof document.execCommand === 'function' && document.execCommand('delete', false) && el.value === '';
  }catch(e){ hecho = false; }
  if(!hecho){
    el.value = '';
    el.dispatchEvent(new Event('input', { bubbles: true }));
  }
  el.dispatchEvent(new Event('change', { bubbles: true }));
  bxColocar();
  return true;
}

/** Pone la × sobre la casilla con el foco, o la esconde. */
function bxColocar(){
  const el = BX.campo;
  if(!el || !document.contains(el) || document.activeElement !== el || !el.value || !bxVale(el)){
    if(BX.boton) BX.boton.style.display = 'none';
    if(el && el.classList) el.classList.remove('ddl-x-con');
    return;
  }
  const b = bxBoton(), r = el.getBoundingClientRect(), lado = Math.max(18, Math.min(26, r.height - 6));
  /* Que lo escrito no quede debajo de la ×: hueco a la derecha, solo si el ancho de la casilla no cambia por ello. */
  try{ if(getComputedStyle(el).boxSizing === 'border-box') el.classList.add('ddl-x-con'); }catch(e){ /* sin hueco: la × encima del final */ }
  b.style.width = b.style.height = lado + 'px';
  b.style.fontSize = Math.round(lado * 0.8) + 'px';
  b.style.left = Math.round(r.right - lado - 5) + 'px';
  b.style.top = Math.round(r.top + (r.height - lado) / 2) + 'px';
  b.style.display = 'flex';
}

function bxEnganchar(){
  if(typeof document === 'undefined' || BX.enganchado) return;
  BX.enganchado = true;
  document.addEventListener('focusin', (ev) => { BX.campo = bxVale(ev.target) ? ev.target : null; bxColocar(); }, true);
  document.addEventListener('focusout', () => { setTimeout(bxColocar, 0); }, true);
  document.addEventListener('input', (ev) => { if(ev.target === BX.campo) bxColocar(); }, true);
  /* Al desplazarse o cambiar el tamaño, la casilla se mueve: la × con ella. */
  document.addEventListener('scroll', () => { if(BX.campo) bxColocar(); }, true);
  window.addEventListener('resize', () => { if(BX.campo) bxColocar(); });
}

if(typeof document !== 'undefined' && typeof window !== 'undefined'){
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bxEnganchar);
  else bxEnganchar();
}
