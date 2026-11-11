/* Las animaciones del tema «vidrio» · especificacion 07, ENT-27
 *
 * Pedido de sala, con el mismo video del panel: «quiero también los efectos de
 * animación. Recuerda: la barra de navegación o de secciones de Casting quiero
 * que tenga el efecto de animación del video».
 *
 * Lo que hace el video, y lo que hace esto:
 *   · la barra nace creciendo desde arriba y sus botones entran uno tras otro;
 *   · el activo es una LUZ menta que no salta: se desliza de una sección a la
 *     otra con un poco de rebote, y al llegar da un destello; a su derecha,
 *     la muesca que asoma de la barra viaja con ella;
 *   · al cambiar de sección, lo de antes se va y lo nuevo aparece;
 *   · los números cuentan desde cero hasta su valor;
 *   · al entrar, la aplicación se descubre con un círculo que se abre.
 * Las formas y los tiempos están en tema-vidrio.css; aquí va lo que el CSS
 * solo no sabe: de dónde viene la luz, cuándo ha cambiado de verdad la
 * sección (Casting se repinta a menudo, y animar cada repintado marearía) y
 * los contadores.
 *
 * Quien tiene puesto «reducir movimiento» en su equipo no ve nada de esto: la
 * luz se coloca en su sitio sin viajar y los números salen ya puestos.
 *
 * Que no cueste (ENT-29, «con la interfaz nueva está menos fluido»): medido
 * con 300 talentos y la máquina frenada como una tablet, la primera versión
 * bajaba un cambio de sección de 22-35 cuadros por segundo a 1-9. Por eso:
 *   · lo nuevo ya no entra pieza a pieza, desenfocado y subiendo: aparece de
 *     una vez, con una sola animación de opacidad sobre la sección entera (ver
 *     animEntra). Ni clases en el contenedor ni un retraso por pieza;
 *   · la luz existe SOLO mientras viaja. Casting se repinta a menudo (cada
 *     dato que llega), y en reposo el activo es el propio botón: un repintado
 *     no crea nada ni obliga a medir la página.
 *
 * Es un script clásico: comparte el ámbito global con index.html.
 */

const ANIM = { luz: null, clave: null, bib: null, nacio: false, seguia: false, finLuz: 0 };

/** ¿Se puede animar? No, si el equipo pide reducir el movimiento. */
function animPuede(){
  try{ return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(e){ return true; /* sin matchMedia: se anima */ }
}

/** Dónde está un botón dentro de la barra: { x, y, w, h }. */
function animCaja(el){
  return { x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight };
}
function animPonerLuz(luz, c){
  luz.style.width = c.w + 'px';
  luz.style.height = c.h + 'px';
  luz.style.transform = 'translate(' + c.x + 'px,' + c.y + 'px)';
}
const ANIM_VIAJE_MS = 620;      // lo que tarda la luz en llegar (con el rebote)

/**
 * La luz de la barra de Casting. En reposo no existe: el activo es el propio
 * botón (su fondo menta y su muesca, por CSS), y un repintado no cuesta nada.
 * Solo cuando la sección activa CAMBIA se crea la luz donde estaba la de
 * antes, viaja a la nueva y, al llegar, se quita y el botón vuelve a mandar.
 * `nace`: la barra acaba de aparecer (no hay de dónde venir).
 */
function animLuz(nav, nace){
  if(!nav || typeof nav.querySelector !== 'function') return null;
  const activo = nav.querySelector('.cs-nav-b.on');
  const v = activo ? (activo.dataset ? activo.dataset.v : null) || activo.getAttribute('data-v') : null;
  const antes = ANIM.luz;
  ANIM.luz = v;
  const vieja = nav.querySelector('.tv-luz');
  /* Sin viaje: nada que crear. Si la barra se repintó a medio viaje, la luz ya no está: que mande el botón. */
  if(!activo || nace || antes == null || antes === v || !animPuede()){
    if(!vieja) nav.classList.remove('tv-con-luz');
    return { viaja: false, hacia: v };
  }
  let origen = null;
  nav.querySelectorAll('.cs-nav-b').forEach(b => { if(((b.dataset && b.dataset.v) || b.getAttribute('data-v')) === antes) origen = b; });
  if(!origen){ if(!vieja) nav.classList.remove('tv-con-luz'); return { viaja: false, hacia: v }; }
  if(vieja) vieja.remove();
  const luz = document.createElement('span');
  luz.className = 'tv-luz tv-quieta';
  luz.setAttribute('aria-hidden', 'true');
  nav.insertBefore(luz, nav.firstChild);
  nav.classList.add('tv-con-luz');                // mientras viaja, el botón activo no pinta su fondo
  animPonerLuz(luz, animCaja(origen));
  void luz.offsetWidth;                           // que el navegador la dé por pintada donde estaba
  luz.classList.remove('tv-quieta');
  luz.classList.add('tv-llega');                  // el destello, al llegar
  animPonerLuz(luz, animCaja(activo));
  clearTimeout(ANIM.finLuz);
  ANIM.finLuz = setTimeout(() => {
    try{ if(luz.parentNode){ luz.parentNode.classList.remove('tv-con-luz'); luz.remove(); } }catch(e){ /* la barra ya no está */ }
  }, ANIM_VIAJE_MS);
  return { viaja: true, hacia: v, desde: antes };
}

const ANIM_ENTRA_MS = 320;      // lo que tarda lo nuevo en aparecer

/**
 * Lo nuevo aparece: UNA sola animación, de opacidad, sobre el bloque entero.
 * Antes entraba pieza a pieza, cada una subiendo con su retraso; medido, eso
 * era lo que más pesaba —cada pieza que arranca es una capa nueva que el
 * navegador tiene que preparar, y con dieciséis el cambio de sección bajaba a
 * 10-15 cuadros por segundo—. Una opacidad sobre un solo bloque no mueve
 * nada, no recalcula estilos y no cambia de sitio lo que va fijo dentro.
 */
function animEntra(el){
  if(!el || typeof el.animate !== 'function' || !animPuede()) return false;
  try{
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: ANIM_ENTRA_MS, easing: 'ease-out' });
    return true;
  }catch(e){ return false; /* entra sin efecto */ }
}

/** Cuenta desde cero hasta el número que el elemento ya enseña. Solo enteros («12», «1.204»). */
function animContar(el, ms){
  const texto = String(el.textContent || '').trim();
  if(!/^\d{1,3}(?:[.\s]\d{3})*$|^\d+$/.test(texto)) return false;
  const fin = parseInt(texto.replace(/[.\s]/g, ''), 10);
  if(!isFinite(fin) || fin <= 0 || fin > 999999) return false;
  const dur = ms || 700, t0 = performance.now(), miles = /[.\s]/.test(texto);
  const pinta = (n) => { el.textContent = miles ? n.toLocaleString('es') : String(n); };
  const paso = (t) => {
    const k = Math.min(1, (t - t0) / dur), suave = 1 - Math.pow(1 - k, 3);      // rápido al principio, despacio al final
    pinta(Math.round(fin * suave));
    if(k < 1 && el.isConnected) requestAnimationFrame(paso);
    else if(el.isConnected) el.textContent = texto;                             // el valor de verdad, tal cual estaba
  };
  pinta(0);
  requestAnimationFrame(paso);
  return true;
}

/** Marca un elemento para que el CSS lo anime, y le quita la marca al acabar. */
function animMarcar(el, clase, ms){
  if(!el || !el.classList) return;
  el.classList.remove(clase);
  void el.offsetWidth;                                // para que la animación vuelva a empezar
  el.classList.add(clase);
  clearTimeout(el['_tv_' + clase]);
  el['_tv_' + clase] = setTimeout(() => { try{ el.classList.remove(clase); }catch(e){ /* ya no está */ } }, ms || 1100);
}

/**
 * Después de pintar Casting. `clave` dice qué se ve (sección, programa,
 * capítulo, pestaña): solo cuando cambia aparece lo nuevo y cuentan los
 * números. Un repintado de lo mismo no hace nada.
 */
function animVista(nav, vista, clave){
  let r = null;
  const nace = !ANIM.seguia;                      // Casting no estaba en pantalla: la barra nace
  try{
    if(nav && nace && animPuede()) animMarcar(nav, 'tv-nace', 1400);
    ANIM.seguia = true;
    r = animLuz(nav, nace);
  }catch(e){ if(typeof fallo === 'function') fallo('animLuz · js/animaciones.js', e); }
  const cambio = clave !== ANIM.clave;
  ANIM.clave = clave;
  if(!cambio || !animPuede() || !vista) return { cambio: cambio, luz: r };
  try{
    animEntra(vista);
    vista.querySelectorAll('.cs-kpi b, .tr-kpi b, .cs-tr-kpi b').forEach(b => animContar(b));
  }catch(e){ /* entra sin efecto */ }
  return { cambio: true, luz: r };
}

/** Después de pintar la biblioteca: los programas, o los episodios de uno. Aparece solo al cambiar. */
function animBiblioteca(clave){
  const cambio = clave !== ANIM.bib;
  ANIM.bib = clave;
  if(!cambio || !animPuede()) return false;
  try{
    animEntra(document.getElementById('libGrid'));
  }catch(e){ /* entra sin efecto */ }
  return true;
}

/** Al entrar (cuando la pantalla de acceso se va): la aplicación se descubre con un círculo que se abre. */
function animEntrada(){
  if(ANIM.nacio || !animPuede()) return false;
  ANIM.nacio = true;
  const w = document.querySelector('.wrap');
  if(w) animMarcar(w, 'tv-revela', 1300);
  const b = document.getElementById('topbar');
  if(b) animMarcar(b, 'tv-baja', 1300);
  return true;
}

if(typeof document !== 'undefined' && typeof MutationObserver !== 'undefined'){
  const alEstar = () => {
    try{
      if(!document.body.classList.contains('locked')) animEntrada();
      new MutationObserver(() => { if(!document.body.classList.contains('locked')) animEntrada(); else ANIM.nacio = false; })
        .observe(document.body, { attributes: true, attributeFilter: ['class'] });
    }catch(e){ /* sin observador: la aplicación entra sin efecto */ }
  };
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', alEstar); else alEstar();
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { ANIM, animPuede, animLuz, animEntra, animContar, animVista, animBiblioteca, animEntrada, animMarcar };
}
