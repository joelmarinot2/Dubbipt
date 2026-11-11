/* El código del autenticador, en casillas de vidrio con su animación · especificacion 07, ENT-28
 *
 * Pedido de sala, con un video («Glassy OTP Animation»): «quiero esta
 * animación para el código OTP».
 *
 * Lo que hace el video, y lo que hace esto:
 *   · cada cifra va en su casilla de vidrio; la que toca escribir brilla y
 *     lleva el cursor; cada cifra entra con un pequeño salto;
 *   · al completar el código, el botón pasa a «Verificando…» y las casillas se
 *     sueltan de su fila, se juntan en un anillo y giran en órbita;
 *   · si el código es bueno, se funden en una sola en el centro, que late con
 *     una onda verde y se convierte en un visto bueno; el título y el botón
 *     pasan a «Verificado»;
 *   · si es malo, vuelven a su fila, tiemblan en rojo y se vacían.
 *
 * Lo que NO cambia: el campo de verdad sigue siendo el mismo <input> de siempre
 * (.mfa-codigo), con su autocompletado de código de un solo uso, su teclado
 * numérico y su pegado. Está encima de las casillas, invisible; las casillas
 * solo enseñan lo que lleva. Quien verifica es el mismo código de antes
 * (mfaCablear, en index.html): aquí no se decide nada, solo se dibuja.
 *
 * Con «reducir movimiento» puesto en el equipo no hay órbita ni esperas: las
 * casillas están, y el visto bueno sale sin más.
 *
 * Es un script clásico: comparte el ámbito global con index.html.
 */

const OTP_CIFRAS = 6;
const OTP_MIN_ORBITA = 1150;     // lo mínimo que se ve girar, aunque la nube conteste antes
const OTP_FUNDIR = 400;          // lo que tardan en juntarse en el centro
const OTP_EXITO = 800;           // lo que se enseña el visto bueno antes de entrar
const OTP_RADIO = 46;            // el anillo de la órbita, en px

const OTP_ICO_OK = '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
const OTP_ICO_GIRA = '<svg class="otp-gira" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" aria-hidden="true"><path d="M21 12a9 9 0 11-6.2-8.6"/></svg>';

/** El HTML del campo: el <input> de siempre dentro de su caja, y las casillas (y el sello del final) detrás. */
function otpHtml(){
  let casillas = '';
  for(let i = 0; i < OTP_CIFRAS; i++) casillas += '<span class="otp-c"></span>';
  /* data-sin-x: aquí no va la × de borrar el texto (ENT-25); taparía la última casilla. */
  return '<div class="otp" data-sin-x>'
    + '<input type="text" id="mfaCodigo" class="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="' + OTP_CIFRAS + '" placeholder="000000" aria-label="Código de ' + OTP_CIFRAS + ' cifras">'
    + '<div class="otp-casillas" aria-hidden="true">' + casillas + '</div>'
    + '<span class="otp-sello" aria-hidden="true">' + OTP_ICO_OK + '</span>'
    + '</div>';
}

function otpPuede(){
  try{ return !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); }
  catch(e){ return true; /* sin matchMedia: se anima */ }
}
const otpEspera = (ms) => new Promise(r => setTimeout(r, ms));

/** Lo que enseña cada casilla, según lo que lleva el campo: la cifra, cuál es la activa, cuál acaba de entrar. */
function otpEstado(valor, conFoco, antes){
  const v = String(valor == null ? '' : valor).replace(/\D/g, '').slice(0, OTP_CIFRAS);
  const out = [];
  for(let i = 0; i < OTP_CIFRAS; i++){
    out.push({ cifra: v[i] || '', llena: i < v.length, activa: !!conFoco && i === Math.min(v.length, OTP_CIFRAS - 1) && v.length < OTP_CIFRAS,
               entra: i < v.length && (antes == null || i >= String(antes).length || String(antes)[i] !== v[i]) });
  }
  return out;
}

/**
 * Monta las casillas sobre el campo de una tarjeta. Devuelve { pintar, verificando, exito, error } o null si la
 * tarjeta no las trae (entonces todo sigue como siempre, con el campo a la vista).
 */
function otpMontar(tarjeta){
  const caja = tarjeta && tarjeta.querySelector ? tarjeta.querySelector('.otp') : null;
  if(!caja) return null;
  const inp = caja.querySelector('.mfa-codigo'), fila = caja.querySelector('.otp-casillas');
  if(!inp || !fila) return null;
  const casillas = Array.prototype.slice.call(fila.querySelectorAll('.otp-c'));
  let antes = '', t0 = 0;

  const pintar = () => {
    const foco = document.activeElement === inp;
    const est = otpEstado(inp.value, foco, antes);
    est.forEach((e, i) => {
      const c = casillas[i]; if(!c) return;
      c.textContent = e.cifra;
      c.classList.toggle('llena', e.llena);
      c.classList.toggle('activa', e.activa);
      if(e.entra && otpPuede()){ c.classList.remove('entra'); void c.offsetWidth; c.classList.add('entra'); }
    });
    antes = String(inp.value || '').replace(/\D/g, '').slice(0, OTP_CIFRAS);
  };
  const soltar = () => { casillas.forEach(c => { c.style.transform = ''; c.style.opacity = ''; }); };
  const limpiar = () => { caja.classList.remove('otp-verificando', 'otp-fundiendo', 'otp-ok', 'otp-mal'); soltar(); };

  /** Las casillas se sueltan de la fila y se van a un anillo, que gira. */
  const verificando = () => {
    limpiar();
    t0 = Date.now();
    caja.classList.add('otp-verificando');
    /* El salto de entrada de cada cifra es una animación, y una animación manda sobre la posición: fuera antes de moverlas. */
    casillas.forEach(c => c.classList.remove('entra', 'activa'));
    if(!otpPuede()) return;
    const cx = fila.offsetWidth / 2;
    casillas.forEach((c, i) => {
      const ang = (-90 + i * (360 / casillas.length)) * Math.PI / 180;
      const x = cx + OTP_RADIO * Math.cos(ang) - (c.offsetLeft + c.offsetWidth / 2), y = OTP_RADIO * Math.sin(ang);
      c.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(.72)';
    });
  };
  /** El código era bueno: se funden en el centro y sale el visto bueno. Se resuelve cuando ya se puede entrar. */
  const exito = async () => {
    if(otpPuede()){
      const falta = OTP_MIN_ORBITA - (Date.now() - t0);
      if(falta > 0) await otpEspera(falta);
      const cx = fila.offsetWidth / 2;
      caja.classList.add('otp-fundiendo');
      casillas.forEach(c => { c.style.transform = 'translate(' + (cx - (c.offsetLeft + c.offsetWidth / 2)).toFixed(1) + 'px,0) scale(.5)'; c.style.opacity = '0'; });
      await otpEspera(OTP_FUNDIR);
    }
    caja.classList.remove('otp-verificando', 'otp-fundiendo');
    caja.classList.add('otp-ok');
    try{
      tarjeta.classList.add('otp-tarjeta-ok');
      const h = tarjeta.querySelector('h2'); if(h) h.textContent = 'Verificado';
      const b = tarjeta.querySelector('.mfa-ok'); if(b){ b.innerHTML = OTP_ICO_OK.replace(/width="26" height="26"/, 'width="16" height="16"') + '<span>Verificado</span>'; b.classList.add('otp-btn-ok'); }
    }catch(e){ /* el título y el botón se quedan como estaban */ }
    if(otpPuede()) await otpEspera(OTP_EXITO);
    return true;
  };
  /** El código era malo: vuelven a su fila, tiemblan en rojo y se vacían. */
  const error = () => {
    limpiar();
    antes = '';
    pintar();
    if(otpPuede()){ caja.classList.add('otp-mal'); setTimeout(() => { caja.classList.remove('otp-mal'); }, 600); }
  };

  inp.addEventListener('input', pintar);
  inp.addEventListener('focus', pintar);
  inp.addEventListener('blur', pintar);
  /* Tocar una casilla es tocar el campo. */
  caja.addEventListener('click', () => { try{ inp.focus(); }catch(e){ /* sin foco */ } });
  pintar();
  return { pintar: pintar, verificando: verificando, exito: exito, error: error, limpiar: limpiar };
}

/** El botón mientras se verifica. */
function otpBotonVerificando(btn){
  if(!btn) return;
  btn.innerHTML = OTP_ICO_GIRA + '<span>Verificando…</span>';
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { otpHtml, otpEstado, otpMontar, otpBotonVerificando, OTP_CIFRAS, OTP_MIN_ORBITA, OTP_FUNDIR, OTP_EXITO };
}
