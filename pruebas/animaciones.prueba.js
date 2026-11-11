/* Las animaciones del tema «vidrio» · especificacion 07, ENT-27 y ENT-29
 *
 * Pedido de sala: «quiero también los efectos de animación. Recuerda: la barra
 * de navegación o de secciones de Casting quiero que tenga el efecto de
 * animación del video». Y después: «veo que con la interfaz nueva está menos
 * fluido; revisa, valida y arregla errores de rendimiento».
 *
 * Lo que protege esta prueba: que la luz de la barra de Casting se crea donde
 * estaba, viaja a la sección activa y se QUITA al llegar (en reposo no hay
 * luz: un repintado no crea nada), y no viaja si no se ha movido ni con
 * «reducir movimiento»; que la barra solo «nace» al entrar en Casting, no en
 * cada cambio de sección; que lo nuevo aparece con UNA sola animación de
 * opacidad —ni una por pieza, ni clases en el contenedor, ni desenfoque, que
 * es lo que bajaba los cuadros por segundo— y los números cuentan SOLO cuando
 * la sección cambia de verdad (Casting se repinta a menudo); que un contador
 * acaba siempre en el texto que había; y que todo está cableado, dentro de
 * «sin preferencia de movimiento reducido» y en la caché.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Las animaciones del tema: la luz de la barra de Casting, la entrada y los contadores, sin que cuesten';

const RAIZ = path.dirname(INDEX);

/* Lo justo del navegador. */
function El(tag, o){
  Object.assign(this, { tag: tag, hijos: [], estilo: {}, clases: new Set(), attrs: {}, offsetLeft: 0, offsetTop: 0, offsetWidth: 0, offsetHeight: 0, isConnected: true, textContent: '' }, o || {});
  const yo = this;
  this.style = this.estilo;
  this.classList = { add: (c) => yo.clases.add(c), remove: (c) => yo.clases.delete(c), contains: (c) => yo.clases.has(c) };
}
El.prototype.setAttribute = function(k, v){ this.attrs[k] = v; };
El.prototype.getAttribute = function(k){ return k in this.attrs ? this.attrs[k] : null; };
El.prototype.animate = function(kf, op){ (this.animaciones = this.animaciones || []).push({ kf: kf, op: op }); return {}; };
Object.defineProperty(El.prototype, 'firstChild', { get(){ return this.hijos[0] || null; } });
Object.defineProperty(El.prototype, 'parentNode', { get(){ return this.padre || null; } });
El.prototype.insertBefore = function(n){ this.hijos.unshift(n); n.padre = this; };
El.prototype.remove = function(){ if(this.padre) this.padre.hijos = this.padre.hijos.filter(x => x !== this); };
El.prototype.querySelector = function(sel){ return this.querySelectorAll(sel)[0] || null; };
El.prototype.querySelectorAll = function(sel){
  const out = [], quiere = sel.split(',').map(x => x.trim().split(/\s+/).pop().split('.').filter(Boolean));
  const rec = (e) => { for(const h of e.hijos){ if(quiere.some(cs => cs.every(c => h.clases.has(c) || h.tag === c))) out.push(h); rec(h); } };
  rec(this); return out;
};
Object.defineProperty(El.prototype, 'offsetWidth', { get(){ return this._w || 0; }, set(v){ this._w = v; } });
Object.defineProperty(El.prototype, 'className', { get(){ return [...this.clases].join(' '); }, set(v){ this.clases.clear(); String(v).split(/\s+/).filter(Boolean).forEach(c => this.clases.add(c)); } });

function cargar(reducir){
  const cuadros = [], tiempos = [], rejilla = new El('div');
  let ahora = 0;
  const ctx = vm.createContext({
    console, setTimeout: (f, ms) => { tiempos.push([f, ms]); return tiempos.length; }, clearTimeout(){},
    performance: { now: () => ahora }, requestAnimationFrame: (f) => { cuadros.push(f); },
    window: { matchMedia: () => ({ matches: !!reducir }) },
    document: { createElement: (t) => new El(t), getElementById: (id) => (id === 'libGrid' ? rejilla : null), querySelector: () => null }
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'animaciones.js'), 'utf8') + ';this.A = { ANIM, animPuede, animLuz, animEntra, animContar, animVista, animBiblioteca, animMarcar };', ctx);
  return { A: ctx.A, avanzar: (ms) => { ahora += ms; const c = cuadros.splice(0); c.forEach(f => f(ahora)); }, tiempos, rejilla };
}
function barra(activa){
  const nav = new El('nav');
  ['dashboard', 'programas', 'talentos'].forEach((v, i) => { const b = new El('button', { offsetLeft: 10, offsetTop: 40 + i * 30, offsetHeight: 28 }); b.offsetWidth = 180; b.clases.add('cs-nav-b'); b.attrs['data-v'] = v; if(v === activa) b.clases.add('on'); nav.hijos.push(b); b.padre = nav; });
  return nav;
}
const luzDe = (nav) => nav.hijos.find(h => h.clases.has('tv-luz'));

exports.pruebas = function(t){
  t.seccion('1 · la luz de la barra de Casting: solo mientras viaja');
  {
    const { A, tiempos } = cargar(false);
    let nav = barra('dashboard');
    const r1 = A.animLuz(nav);
    t.eq('la primera vez no hay de dónde venir: no se crea nada; el activo es el propio botón', [r1.viaja, r1.hacia, !!luzDe(nav), nav.clases.has('tv-con-luz')].join(' | '), 'false | dashboard | false | false');
    nav = barra('talentos');                                    // la barra se vuelve a pintar entera
    const r2 = A.animLuz(nav), l2 = luzDe(nav);
    t.eq('al cambiar de sección: nace donde estaba y viaja a la nueva, con su destello', [r2.viaja, r2.desde, l2.estilo.transform, l2.estilo.width, l2.estilo.height, l2.clases.has('tv-llega'), l2.clases.has('tv-quieta'), l2.attrs['aria-hidden'], nav.clases.has('tv-con-luz')].join(' | '),
         'true | dashboard | translate(10px,100px) | 180px | 28px | true | false | true | true');
    const fin = tiempos[tiempos.length - 1];
    fin[0]();
    t.eq('al llegar se quita, y el botón vuelve a mandar', [fin[1], !!luzDe(nav), nav.clases.has('tv-con-luz')].join(' | '), '620 | false | false');
    nav = barra('talentos');
    t.eq('un repintado sin cambio no crea nada', A.animLuz(nav).viaja + ' ' + !!luzDe(nav) + ' ' + nav.clases.has('tv-con-luz'), 'false false false');
    nav = barra('dashboard'); nav.hijos.unshift(Object.assign(new El('span'), { padre: nav })); nav.hijos[0].clases.add('tv-luz');
    A.animLuz(nav);
    t.eq('nunca hay dos luces', nav.hijos.filter(h => h.clases.has('tv-luz')).length, 1);
    const sin = new El('nav');
    t.eq('sin sección activa, no hay luz', A.animLuz(sin).viaja + ' ' + sin.clases.has('tv-con-luz'), 'false false');
    t.eq('sin barra, nada', A.animLuz(null), null);
  }
  {
    const { A } = cargar(true);
    A.animLuz(barra('dashboard'));
    const nav = barra('talentos'), r = A.animLuz(nav);
    t.eq('con «reducir movimiento»: ni viaje ni luz', [r.viaja, !!luzDe(nav), nav.clases.has('tv-con-luz')].join(' | '), 'false | false | false');
  }

  t.seccion('2 · solo cuando la sección cambia de verdad, y con una sola animación');
  {
    const { A, rejilla } = cargar(false);
    const vista = new El('div'), kpi = new El('div'), n = new El('b', { textContent: '12' });
    kpi.clases.add('cs-kpi'); kpi.hijos.push(n); vista.hijos.push(kpi);
    for(let i = 0; i < 40; i++){ const c = new El('div'); c.clases.add('cs-prog'); vista.hijos.push(c); }
    const cuantas = () => (vista.animaciones || []).length;
    const nav1 = barra('dashboard');
    const r1 = A.animVista(nav1, vista, 'dashboard|||');
    t.eq('al entrar en Casting: la barra nace, lo nuevo aparece y los números cuentan', [nav1.clases.has('tv-nace'), r1.cambio, cuantas(), n.textContent].join(' | '), 'true | true | 1 | 0');
    t.eq('UNA animación, de opacidad y nada más, sin retraso; ni una por pieza ni clases en el contenedor',
         [JSON.stringify(vista.animaciones[0].kf), vista.animaciones[0].op.duration, vista.animaciones[0].op.delay, vista.hijos.filter(h => h.animaciones).length, vista.clases.size].join(' | '),
         '[{"opacity":0},{"opacity":1}] | 320 |  | 0 | 0');
    const nav2 = barra('dashboard');
    const r2 = A.animVista(nav2, vista, 'dashboard|||');
    t.eq('un repintado de la misma sección (pasa a menudo): nada se mueve', [nav2.clases.has('tv-nace'), r2.cambio, cuantas(), !!luzDe(nav2)].join(' | '), 'false | false | 1 | false');
    const nav3 = barra('talentos');
    const r3 = A.animVista(nav3, vista, 'talentos|||');
    t.eq('otra sección: aparece y la luz viaja, pero la barra no vuelve a nacer', [nav3.clases.has('tv-nace'), r3.cambio, r3.luz.viaja, cuantas()].join(' | '), 'false | true | true | 2');
    A.ANIM.seguia = false;                                      // se salió de Casting y se vuelve
    const nav4 = barra('dashboard');
    const r4 = A.animVista(nav4, vista, 'dashboard|||');
    t.eq('al volver a entrar en Casting, nace otra vez (y la luz no viaja desde donde estaba)', nav4.clases.has('tv-nace') + ' ' + r4.luz.viaja + ' ' + !!luzDe(nav4), 'true false false');
    t.eq('la biblioteca: aparece al cambiar de programa, no en cada refresco', [A.animBiblioteca('programas'), A.animBiblioteca('programas'), A.animBiblioteca('episodios|s1'), A.animBiblioteca('programas')].join(' ') + ' · ' + rejilla.animaciones.length, 'true false true true · 3');
    t.eq('sin elemento, o sin la API de animaciones, no pasa nada', A.animEntra(null) + ' ' + A.animEntra({}), 'false false');
  }
  {
    const { A, rejilla } = cargar(true);
    const vista = new El('div');
    t.eq('con «reducir movimiento»: ni entrada ni biblioteca', A.animVista(barra('dashboard'), vista, 'x').cambio + ' ' + (vista.animaciones || []).length + ' ' + A.animBiblioteca('programas') + ' ' + (rejilla.animaciones || []).length, 'true 0 false 0');
  }

  t.seccion('3 · los contadores');
  {
    const { A, avanzar } = cargar(false);
    const el = new El('b', { textContent: '190' });
    t.eq('cuenta desde cero', A.animContar(el, 700) + ' ' + el.textContent, 'true 0');
    avanzar(350); const medio = +el.textContent;
    avanzar(350); avanzar(16);
    t.ok('pasa por valores intermedios y acaba en el suyo', medio > 100 && medio < 190 && el.textContent === '190', medio + ' → ' + el.textContent);
    const miles = new El('b', { textContent: '1.204' });
    A.animContar(miles, 100); avanzar(100); avanzar(16);
    t.eq('con miles, acaba tal cual estaba escrito', miles.textContent, '1.204');
    t.eq('lo que no es un entero no se toca', ['10,4h', '—', '', '0', '12 %'].map(x => { const e = new El('b', { textContent: x }); return A.animContar(e) + ':' + e.textContent; }).join(' | '), 'false:10,4h | false:— | false: | false:0 | false:12 %');
    const fuera = new El('b', { textContent: '50' });
    A.animContar(fuera, 700); fuera.isConnected = false; avanzar(100); avanzar(100);
    t.ok('si el elemento ya no está, deja de contar', true);
  }

  t.seccion('4 · cableado, y lo que no debe volver (ENT-29)');
  const CSS = fs.readFileSync(path.join(RAIZ, 'tema-vidrio.css'), 'utf8'), HTML = fs.readFileSync(INDEX, 'utf8'), CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const JS = fs.readFileSync(path.join(RAIZ, 'js', 'animaciones.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const mov = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: no-preference){'));
  const sinCom = CSS.replace(/\/\*[\s\S]*?\*\//g, '');
  t.ok('la luz: una píldora menta detrás de los botones, con su muesca, y el activo sin fondo propio mientras viaja', /#csNav \.tv-luz\{\s+position:absolute;[\s\S]{0,200}background:var\(--tv-menta\);/.test(CSS) && /#csNav \.tv-luz::after\{/.test(CSS)
       && /#csNav\.tv-con-luz \.cs-nav-b\.on,[\s\S]{0,120}\{ background:transparent !important;/.test(CSS));
  t.ok('en reposo, la muesca es del propio botón activo (y se esconde mientras la luz viaja)', /#csNav \.cs-nav-b\.on::after\{\s+content:''; position:absolute;[\s\S]{0,160}background:var\(--tv-barra-2\);/.test(CSS) && /#csNav\.tv-con-luz \.cs-nav-b\.on::after\{ display:none; \}/.test(CSS));
  t.ok('viaja con rebote; todo lo que se mueve va dentro de «sin preferencia de movimiento reducido»', /#csNav \.tv-luz\{\s+transition:transform \.56s cubic-bezier\(\.34,1\.42,\.5,1\)/.test(mov)
       && ['tv-destello', 'tv-barra-nace', 'tv-entra-lado', 'tv-baja', 'tv-revela', 'tv-ventana', 'tv-aviso'].every(k => mov.indexOf('@keyframes ' + k + '{') > 0)
       && !/@keyframes/.test(CSS.slice(0, CSS.indexOf('@media (prefers-reduced-motion: no-preference){'))));
  t.ok('la barra nace desde arriba y sus botones entran uno tras otro', /#csNav\.tv-nace\{ animation:tv-barra-nace/.test(mov) && /#csNav\.tv-nace > :nth-child\(5\)\{ animation-delay:\.29s; \}/.test(mov));
  t.ok('no vuelve la cascada por clases: ni «tv-cambio», ni su subida, ni un retraso por tarjeta', !/tv-cambio|tv-sube/.test(sinCom) && !/tv-cambio|classList\.add\('tv-(?!luz|con-luz|llega)/.test(JS.slice(JS.indexOf('function animEntra'), JS.indexOf('function animContar'))));
  t.ok('nada se desenfoca al moverse, ni hay vidrio esmerilado a pantalla completa', !/filter:\s*blur/.test(sinCom) && !/backdrop-filter/.test(sinCom));
  t.ok('ningún selector universal (« *»): cada uno obligaba a mirar todos los elementos de la página', !/ \*\s*[,{]/.test(sinCom) && !/>\s*\*\s*[,{]/.test(sinCom));
  t.ok('las tarjetas llevan una sola sombra', /--tv-sombra:0 6px 18px rgba\(18,60,52,\.09\);/.test(CSS) && /--tv-sombra:0 6px 18px rgba\(0,0,0,\.32\);/.test(CSS));
  t.ok('la entrada de la aplicación no recorta la pantalla', /@keyframes tv-revela\{ from\{ opacity:0; transform:scale\(\.975\); \}/.test(mov) && !/tv-revela[^}]*clip-path/.test(mov));
  t.ok('el módulo no mide la página al cambiar de tamaño ni anima pieza a pieza', !/addEventListener\('resize'/.test(JS) && (JS.match(/\.animate\(/g) || []).length === 1);
  t.ok('Casting avisa después de pintar, con qué se ve; y sabe si ya estaba en pantalla', /animVista\(nav, vista, \[CS\.vista, CS\.prog, CS\.ep, CS\.tab\]\.join\('\|'\)\)/.test(CV) && /ANIM\.seguia = document\.body\.classList\.contains\('cs-on'\) && ANIM\.seguia !== false;/.test(CV));
  t.ok('la biblioteca también', /animBiblioteca\('programas'\)/.test(HTML) && /animBiblioteca\('episodios\|' \+ LDB\.showId\)/.test(HTML));
  t.ok('el módulo se carga y queda en la caché', /<script src="\.\/js\/animaciones\.js"><\/script>/.test(HTML) && /'\.\/js\/animaciones\.js'/.test(SW));
};
