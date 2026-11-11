/* El código del autenticador, en casillas de vidrio con su animación · especificacion 07, ENT-28
 *
 * Pedido de sala, con un video («Glassy OTP Animation»): «quiero esta
 * animación para el código OTP».
 *
 * Lo que protege esta prueba: que el campo de verdad sigue siendo el de
 * siempre (autocompletado de un solo uso, teclado numérico, seis cifras) y las
 * casillas solo enseñan lo que lleva; que al verificar se van a su anillo y
 * giran; que con el código bueno se funden, sale el visto bueno y SOLO
 * entonces se entra; que con el malo vuelven a su fila y se vacían; que la
 * verificación la sigue decidiendo la nube y no la animación; y que con
 * «reducir movimiento» no hay esperas.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'El código OTP en casillas de vidrio, con su animación';

const RAIZ = path.dirname(INDEX);

function El(clases, o){
  Object.assign(this, { hijos: [], estilo: {}, cl: new Set(clases || []), l: {}, textContent: '', innerHTML: '', value: '', offsetLeft: 0, offsetWidth: 0 }, o || {});
  const yo = this;
  this.style = this.estilo;
  this.classList = { add: (...c) => c.forEach(x => yo.cl.add(x)), remove: (...c) => c.forEach(x => yo.cl.delete(x)), contains: (c) => yo.cl.has(c), toggle: (c, v) => { if(v) yo.cl.add(c); else yo.cl.delete(c); } };
}
El.prototype.addEventListener = function(k, f){ this.l[k] = f; };
El.prototype.querySelector = function(sel){ return this.querySelectorAll(sel)[0] || null; };
El.prototype.querySelectorAll = function(sel){
  const c = sel.replace(/^\./, ''), out = [];
  const rec = (e) => { for(const h of e.hijos){ if(h.cl.has(c) || h.tag === c) out.push(h); rec(h); } };
  rec(this); return out;
};
El.prototype.focus = function(){ this.enfocado = true; };

/* Una tarjeta con su campo, sus seis casillas (44 px, separadas 9) y su botón. */
function tarjeta(){
  const t = new El(['mfa-card']), caja = new El(['otp']), inp = new El(['mfa-codigo']), fila = new El(['otp-casillas'], { offsetWidth: 309 });
  for(let i = 0; i < 6; i++) fila.hijos.push(new El(['otp-c'], { offsetLeft: i * 53, offsetWidth: 44 }));
  const h2 = new El([], { tag: 'h2', textContent: 'Verificación en dos pasos' }), btn = new El(['mfa-ok'], { textContent: 'Verificar' });
  caja.hijos.push(inp, fila); t.hijos.push(h2, caja, btn);
  return { t, caja, inp, fila, casillas: fila.hijos, h2, btn };
}
function cargar(reducir){
  const esperas = [];
  let ahora = 1000;
  const ctx = vm.createContext({ console, Date: { now: () => ahora }, Promise,
    setTimeout: (f, ms) => { esperas.push(ms); ahora += ms || 0; f(); return 1; },
    window: { matchMedia: () => ({ matches: !!reducir }) }, document: { activeElement: null } });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'otp.js'), 'utf8') + ';this.O = { otpHtml, otpEstado, otpMontar, otpBotonVerificando, OTP_MIN_ORBITA, OTP_FUNDIR, OTP_EXITO };', ctx);
  return { O: ctx.O, ctx, esperas, pasa: (ms) => { ahora += ms; } };
}

exports.pruebas = async function(t){
  t.seccion('1 · el campo de verdad sigue siendo el de siempre');
  const { O } = cargar(false);
  const html = O.otpHtml();
  t.ok('el mismo <input>: código de un solo uso, teclado numérico, seis cifras', /<input type="text" id="mfaCodigo" class="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6"/.test(html));
  t.ok('seis casillas y el sello, de adorno (no los lee un lector de pantalla); el campo dice qué es', (html.match(/<span class="otp-c"><\/span>/g) || []).length === 6 && /<div class="otp-casillas" aria-hidden="true">/.test(html) && /<span class="otp-sello" aria-hidden="true">/.test(html) && /aria-label="Código de 6 cifras"/.test(html));
  t.ok('sin la × de borrar el texto, que taparía la última casilla', /<div class="otp" data-sin-x>/.test(html));

  t.seccion('2 · lo que enseñan las casillas');
  const e = (v, foco, antes) => O.otpEstado(v, foco, antes).map(x => (x.cifra || '_') + (x.activa ? '*' : '') + (x.entra ? '+' : '')).join(' ');
  t.eq('vacío y con el foco: la primera es la activa', e('', true, ''), '_* _ _ _ _ _');
  t.eq('cada cifra en su casilla; la que toca escribir, activa; la recién escrita, entra', e('56', true, '5'), '5 6+ _* _ _ _');
  t.eq('sin el foco, ninguna activa', e('56', false, '56'), '5 6 _ _ _ _');
  t.eq('completo: no queda casilla activa', e('565656', true, '56565'), '5 6 5 6 5 6+');
  t.eq('pegado con espacios o letras: solo las cifras, y entran todas', e('565 656', true, ''), '5+ 6+ 5+ 6+ 5+ 6+');
  t.eq('más de seis: las seis primeras', e('1234567', true, '123456').replace(/[+*]/g, ''), '1 2 3 4 5 6');

  t.seccion('3 · verificar: el anillo, el visto bueno o la vuelta a la fila');
  {
    const V = cargar(false), T = tarjeta();
    const otp = V.O.otpMontar(T.t);
    T.inp.value = '565656'; T.inp.l.input();
    t.eq('al escribir, las casillas lo enseñan', T.casillas.map(c => c.textContent).join('') + ' ' + T.casillas.every(c => c.cl.has('llena')), '565656 true');
    otp.verificando();
    const pos = T.casillas.map(c => c.estilo.transform);
    t.ok('al verificar: cada casilla a su sitio de un anillo (ninguna en el mismo), y sin la animación de entrada, que le pisaría la posición',
         T.caja.cl.has('otp-verificando') && new Set(pos).size === 6 && pos.every(p => /^translate\(-?[\d.]+px,-?[\d.]+px\) scale\(\.72\)$/.test(p)) && T.casillas.every(c => !c.cl.has('entra')), pos.join(' | '));
    t.eq('la de arriba del anillo, centrada y 46 px por encima', pos[0], 'translate(132.5px,-46.0px) scale(.72)');
    V.esperas.length = 0;
    const r = await otp.exito();
    t.eq('el bueno: gira lo mínimo aunque la nube conteste al momento, se funden y sale el visto bueno', [r, V.esperas.join('+'), T.caja.cl.has('otp-ok'), T.caja.cl.has('otp-verificando'), T.casillas.every(c => c.estilo.opacity === '0')].join(' | '),
         'true | ' + V.O.OTP_MIN_ORBITA + '+' + V.O.OTP_FUNDIR + '+' + V.O.OTP_EXITO + ' | true | false | true');
    t.ok('el título y el botón pasan a «Verificado»', T.h2.textContent === 'Verificado' && /<span>Verificado<\/span>/.test(T.btn.innerHTML) && T.btn.cl.has('otp-btn-ok') && T.t.cl.has('otp-tarjeta-ok'));
  }
  {
    const V = cargar(false), T = tarjeta();
    const otp = V.O.otpMontar(T.t);
    otp.verificando(); V.pasa(5000); V.esperas.length = 0;
    await otp.exito();
    t.eq('si la nube tardó más que el giro mínimo, no se espera de más', V.esperas.join('+'), V.O.OTP_FUNDIR + '+' + V.O.OTP_EXITO);
  }
  {
    const V = cargar(false), T = tarjeta();
    const otp = V.O.otpMontar(T.t);
    T.inp.value = '123456'; T.inp.l.input(); otp.verificando();
    T.inp.value = ''; otp.error();
    t.eq('el malo: vuelven a su fila, vacías, y tiemblan', [T.casillas.every(c => c.estilo.transform === '' && c.textContent === '' && !c.cl.has('llena')), T.caja.cl.has('otp-verificando')].join(' '), 'true false');
  }
  {
    const V = cargar(true), T = tarjeta();
    const otp = V.O.otpMontar(T.t);
    T.inp.value = '565656'; T.inp.l.input(); otp.verificando(); V.esperas.length = 0;
    const r = await otp.exito();
    t.eq('con «reducir movimiento»: ni anillo ni esperas; el visto bueno sale sin más', [r, V.esperas.length, T.casillas.every(c => !c.estilo.transform), T.caja.cl.has('otp-ok'), T.casillas.some(c => c.cl.has('entra'))].join(' | '), 'true | 0 | true | true | false');
  }
  t.eq('una tarjeta sin casillas: no se monta nada, y todo sigue como siempre', cargar(false).O.otpMontar(new El(['mfa-card'])), null);

  t.seccion('4 · la verificación la sigue decidiendo la nube');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  const cab = HTML.slice(HTML.indexOf('function mfaCablear(c, verificar, alAcertar){'), HTML.indexOf('/** Ya tiene autenticador: pedir el código. */'));
  t.ok('primero se verifica; solo si no falla, el visto bueno; y solo después se entra', /await verificar\(code\);\s+if\(otp\) await otp\.exito\(\);[^\n]*\n\s+if\(alAcertar\) alAcertar\(\);/.test(cab));
  t.ok('si la nube dice que no: el error, el campo vacío y las casillas a su fila; nunca se entra', /catch\(e\)\{\s+err\.textContent = mfaError\(e\); inp\.value = '';\s+if\(otp\)\{ otp\.error\(\); btn\.textContent = rotulo; \}/.test(cab));
  t.ok('las dos tarjetas (entrar y dar de alta) quitan la tarjeta y entran en «alAcertar», no antes', /if\(error\) throw error;\s+\}, \(\) => \{ mfaQuitarTarjeta\(\); resolve\(true\); \}\);/.test(HTML) && /if\(e2\) throw e2;\s+\}, \(\) => \{\s+mfaQuitarTarjeta\(\);/.test(HTML));
  t.ok('se sigue enviando solo al llegar a seis cifras, y no dos veces', /if\(inp\.value\.length === 6\) enviar\(\);/.test(cab) && /if\(yendo\) return;/.test(cab));
  t.ok('si el módulo de las casillas no está, el campo de siempre', /return \(typeof otpHtml === 'function'\) \? otpHtml\(\)\s+: '<input type="text" id="mfaCodigo" class="mfa-codigo" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000">';/.test(HTML)
       && (HTML.match(/' \+ mfaCampoCodigo\(\)/g) || []).length === 2);

  t.seccion('5 · cableado');
  const CSS = fs.readFileSync(path.join(RAIZ, 'tema-vidrio.css'), 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const otpCss = CSS.slice(CSS.indexOf('EL CÓDIGO DEL AUTENTICADOR, EN CASILLAS DE VIDRIO'));
  t.ok('el campo, encima e invisible, con letra de 16 px (el teléfono no hace zoom); las casillas no estorban al toque', /\.otp \.mfa-codigo\{\s+position:absolute; inset:0;[\s\S]{0,220}opacity:0;[\s\S]{0,200}font-size:16px !important;/.test(otpCss) && /\.otp-casillas\{[\s\S]{0,160}pointer-events:none;/.test(otpCss));
  t.ok('la órbita gira la fila entera; la entrada de una cifra no se queda mandando sobre la posición', /\.otp\.otp-verificando \.otp-casillas\{ animation:otp-orbita/.test(otpCss) && /\.otp-c\.entra\{ animation:otp-entra \.32s cubic-bezier\(\.3,1\.5,\.5,1\); \}/.test(otpCss));
  t.ok('todo lo que se mueve, dentro de «sin preferencia de movimiento reducido»', ['otp-entra', 'otp-cursor', 'otp-orbita', 'otp-onda', 'otp-trazo', 'otp-tiembla'].every(k => otpCss.indexOf('@keyframes ' + k + '{') > otpCss.indexOf('@media (prefers-reduced-motion: no-preference){')));
  t.ok('el módulo se carga en la cabecera (el código puede pedirse nada más abrir) y queda en la caché', HTML.indexOf('<script src="./js/otp.js"></script>') > 0 && HTML.indexOf('<script src="./js/otp.js"></script>') < HTML.indexOf('</head>') && /'\.\/js\/otp\.js'/.test(SW));
};
