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
 *   · al cambiar de sección, lo de antes se va y lo nuevo entra desenfocado y
 *     subiendo, en cascada;
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
 * Es un script clásico: comparte el ámbito global con index.html.
 */

const ANIM = { luz: null, clave: null, bib: null, nacio: false, seguia: false };

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

/**
 * La luz de la barra de Casting. La barra se vuelve a pintar entera en cada
 * cambio, así que la luz se crea otra vez DONDE ESTABA y, un instante después,
 * se manda a la sección activa: el navegador anima el viaje.
 */
function animLuz(nav){
  if(!nav || typeof nav.querySelector !== 'function') return null;
  const activo = nav.querySelector('.cs-nav-b.on');
  const vieja = nav.querySelector('.tv-luz');
  if(vieja) vieja.remove();
  if(!activo){ ANIM.luz = null; nav.classList.remove('tv-con-luz'); return null; }
  const luz = document.createElement('span');
  luz.className = 'tv-luz';
  luz.setAttribute('aria-hidden', 'true');
  nav.insertBefore(luz, nav.firstChild);
  nav.classList.add('tv-con-luz');
  const destino = animCaja(activo), origen = ANIM.luz;
  const viaja = animPuede() && origen && (origen.x !== destino.x || origen.y !== destino.y || origen.w !== destino.w);
  if(viaja){
    luz.classList.add('tv-quieta');                 // sin transición: aparece donde estaba
    animPonerLuz(luz, origen);
    void luz.offsetWidth;                           // que el navegador lo dé por pintado
    luz.classList.remove('tv-quieta');
    animPonerLuz(luz, destino);
    luz.classList.add('tv-llega');                  // el destello, al llegar
  }else{
    luz.classList.add('tv-quieta');
    animPonerLuz(luz, destino);
    void luz.offsetWidth;
    luz.classList.remove('tv-quieta');
    if(animPuede() && !origen) luz.classList.add('tv-nace-luz');
  }
  ANIM.luz = destino;
  return { viaja: !!viaja, destino: destino };
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
 * capítulo, pestaña): solo cuando cambia entra lo nuevo en cascada y cuentan
 * los números. La luz se coloca siempre.
 */
function animVista(nav, vista, clave){
  let r = null;
  try{
    /* La barra se vuelve a crear en cada pintado de la biblioteca: «nace» solo cuando Casting no estaba ya en pantalla. */
    if(nav && !ANIM.seguia){ ANIM.luz = null; if(animPuede()) animMarcar(nav, 'tv-nace', 1400); }
    ANIM.seguia = true;
    r = animLuz(nav);
  }catch(e){ if(typeof fallo === 'function') fallo('animLuz · js/animaciones.js', e); }
  const cambio = clave !== ANIM.clave;
  ANIM.clave = clave;
  if(!cambio || !animPuede() || !vista) return { cambio: cambio, luz: r };
  animMarcar(vista, 'tv-cambio', 1200);
  try{ vista.querySelectorAll('.cs-kpi b, .tr-kpi b, .cs-tr-kpi b').forEach(b => animContar(b)); }
  catch(e){ /* los números se quedan como estaban */ }
  return { cambio: true, luz: r };
}

/** Después de pintar la biblioteca: los programas, o los episodios de uno. Entra en cascada solo al cambiar. */
function animBiblioteca(clave){
  const cambio = clave !== ANIM.bib;
  ANIM.bib = clave;
  if(!cambio || !animPuede()) return false;
  ['libGrid', 'dashHead', 'epsHead'].forEach(id => { const el = document.getElementById(id); if(el) animMarcar(el, 'tv-cambio', 1200); });
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
  /* Si la ventana cambia de tamaño, la luz se recoloca sin viajar. */
  window.addEventListener('resize', () => { const nav = document.getElementById('csNav'); if(nav){ ANIM.luz = null; try{ animLuz(nav); }catch(e){ /* se recolocará al cambiar de sección */ } } });
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { ANIM, animPuede, animLuz, animContar, animVista, animBiblioteca, animEntrada, animMarcar };
}
