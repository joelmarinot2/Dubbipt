/* Las animaciones del tema «vidrio» · especificacion 07, ENT-27
 *
 * Pedido de sala: «quiero también los efectos de animación. Recuerda: la barra
 * de navegación o de secciones de Casting quiero que tenga el efecto de
 * animación del video».
 *
 * Lo que protege esta prueba: que la luz de la barra de Casting se crea donde
 * estaba y viaja a la sección activa (y no viaja si no se ha movido, ni con
 * «reducir movimiento»); que la barra solo «nace» al entrar en Casting, no en
 * cada cambio de sección; que lo nuevo entra en cascada y los números cuentan
 * SOLO cuando la sección cambia de verdad (Casting se repinta a menudo); que
 * un contador acaba siempre en el texto que había; y que todo está cableado,
 * dentro de «sin preferencia de movimiento reducido» y en la caché.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Las animaciones del tema: la luz de la barra de Casting, la cascada y los contadores';

const RAIZ = path.dirname(INDEX);

/* Lo justo del navegador. */
function El(tag, o){
  Object.assign(this, { tag: tag, hijos: [], estilo: {}, clases: new Set(), attrs: {}, offsetLeft: 0, offsetTop: 0, offsetWidth: 0, offsetHeight: 0, isConnected: true, textContent: '' }, o || {});
  const yo = this;
  this.style = this.estilo;
  this.classList = { add: (c) => yo.clases.add(c), remove: (c) => yo.clases.delete(c), contains: (c) => yo.clases.has(c) };
}
El.prototype.setAttribute = function(k, v){ this.attrs[k] = v; };
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
  const cuadros = [], tiempos = [];
  let ahora = 0;
  const ctx = vm.createContext({
    console, setTimeout: (f, ms) => { tiempos.push([f, ms]); return tiempos.length; }, clearTimeout(){},
    performance: { now: () => ahora }, requestAnimationFrame: (f) => { cuadros.push(f); },
    window: { matchMedia: () => ({ matches: !!reducir }) },
    document: { createElement: (t) => new El(t), getElementById: () => null, querySelector: () => null }
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'animaciones.js'), 'utf8') + ';this.A = { ANIM, animPuede, animLuz, animContar, animVista, animBiblioteca, animMarcar };', ctx);
  return { A: ctx.A, avanzar: (ms) => { ahora += ms; const c = cuadros.splice(0); c.forEach(f => f(ahora)); }, tiempos };
}
function barra(activa){
  const nav = new El('nav');
  ['dashboard', 'programas', 'talentos'].forEach((v, i) => { const b = new El('button', { offsetLeft: 10, offsetTop: 40 + i * 30, offsetHeight: 28 }); b.offsetWidth = 180; b.clases.add('cs-nav-b'); if(v === activa) b.clases.add('on'); nav.hijos.push(b); b.padre = nav; });
  return nav;
}
const luzDe = (nav) => nav.hijos.find(h => h.clases.has('tv-luz'));

exports.pruebas = function(t){
  t.seccion('1 · la luz de la barra de Casting');
  {
    const { A } = cargar(false);
    let nav = barra('dashboard');
    const r1 = A.animLuz(nav), l1 = luzDe(nav);
    t.eq('la primera vez: se coloca en el activo, sin viajar, y aparece', [r1.viaja, l1.estilo.transform, l1.estilo.width, l1.estilo.height, l1.clases.has('tv-nace-luz'), nav.clases.has('tv-con-luz')].join(' | '), 'false | translate(10px,40px) | 180px | 28px | true | true');
    nav = barra('talentos');                                    // la barra se vuelve a pintar entera
    const r2 = A.animLuz(nav), l2 = luzDe(nav);
    t.eq('al cambiar de sección: nace donde estaba y viaja a la nueva, con su destello', [r2.viaja, l2.estilo.transform, l2.clases.has('tv-llega'), l2.clases.has('tv-quieta'), l2.attrs['aria-hidden']].join(' | '), 'true | translate(10px,100px) | true | false | true');
    nav = barra('talentos');
    t.eq('un repintado sin cambio no la mueve', A.animLuz(nav).viaja + ' ' + luzDe(nav).clases.has('tv-llega'), 'false false');
    nav = barra('dashboard'); nav.hijos.unshift(Object.assign(new El('span'), { padre: nav })); nav.hijos[0].clases.add('tv-luz');
    A.animLuz(nav);
    t.eq('nunca hay dos luces', nav.hijos.filter(h => h.clases.has('tv-luz')).length, 1);
    const sin = new El('nav');
    t.eq('sin sección activa, no hay luz', A.animLuz(sin) + ' ' + sin.clases.has('tv-con-luz'), 'null false');
  }
  {
    const { A } = cargar(true);
    A.animLuz(barra('dashboard'));
    const nav = barra('talentos'), r = A.animLuz(nav);
    t.eq('con «reducir movimiento»: en su sitio, sin viajar ni destello', [r.viaja, luzDe(nav).estilo.transform, luzDe(nav).clases.has('tv-llega')].join(' | '), 'false | translate(10px,100px) | false');
  }

  t.seccion('2 · solo cuando la sección cambia de verdad');
  {
    const { A } = cargar(false);
    const vista = new El('div'), kpi = new El('div'), n = new El('b', { textContent: '12' });
    kpi.clases.add('cs-kpi'); kpi.hijos.push(n); vista.hijos.push(kpi);
    const nav1 = barra('dashboard');
    const r1 = A.animVista(nav1, vista, 'dashboard|||');
    t.eq('al entrar en Casting: la barra nace, lo nuevo entra en cascada y los números cuentan', [nav1.clases.has('tv-nace'), r1.cambio, vista.clases.has('tv-cambio'), n.textContent].join(' | '), 'true | true | true | 0');
    vista.clases.delete('tv-cambio');
    const nav2 = barra('dashboard');
    const r2 = A.animVista(nav2, vista, 'dashboard|||');
    t.eq('un repintado de la misma sección (pasa a menudo): nada se mueve', [nav2.clases.has('tv-nace'), r2.cambio, vista.clases.has('tv-cambio')].join(' | '), 'false | false | false');
    const nav3 = barra('talentos');
    const r3 = A.animVista(nav3, vista, 'talentos|||');
    t.eq('otra sección: cascada y viaje, pero la barra no vuelve a nacer', [nav3.clases.has('tv-nace'), r3.cambio, r3.luz.viaja, vista.clases.has('tv-cambio')].join(' | '), 'false | true | true | true');
    A.ANIM.seguia = false;                                      // se salió de Casting y se vuelve
    const nav4 = barra('talentos');
    A.animVista(nav4, vista, 'talentos|||');
    t.eq('al volver a entrar en Casting, nace otra vez (y la luz no viaja desde donde estaba)', nav4.clases.has('tv-nace') + ' ' + luzDe(nav4).clases.has('tv-llega'), 'true false');
    t.eq('la biblioteca: en cascada al cambiar de programa, no en cada refresco', [A.animBiblioteca('programas'), A.animBiblioteca('programas'), A.animBiblioteca('episodios|s1'), A.animBiblioteca('programas')].join(' '), 'true false true true');
  }
  {
    const { A } = cargar(true);
    const vista = new El('div');
    t.eq('con «reducir movimiento»: ni cascada ni biblioteca', A.animVista(barra('dashboard'), vista, 'x').cambio + ' ' + vista.clases.has('tv-cambio') + ' ' + A.animBiblioteca('programas'), 'true false false');
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

  t.seccion('4 · cableado');
  const CSS = fs.readFileSync(path.join(RAIZ, 'tema-vidrio.css'), 'utf8'), HTML = fs.readFileSync(INDEX, 'utf8'), CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const mov = CSS.slice(CSS.indexOf('@media (prefers-reduced-motion: no-preference){'));
  t.ok('la luz: una píldora menta detrás de los botones, con su muesca, y el activo sin fondo propio', /#csNav \.tv-luz\{\s+position:absolute;[\s\S]{0,200}background:var\(--tv-menta\);/.test(CSS) && /#csNav \.tv-luz::after\{/.test(CSS)
       && /#csNav\.tv-con-luz \.cs-nav-b\.on,[\s\S]{0,120}\{ background:transparent !important;/.test(CSS));
  t.ok('viaja con rebote; todo lo que se mueve va dentro de «sin preferencia de movimiento reducido»', /#csNav \.tv-luz\{\s+transition:transform \.56s cubic-bezier\(\.34,1\.42,\.5,1\)/.test(mov)
       && ['tv-destello', 'tv-barra-nace', 'tv-entra-lado', 'tv-sube', 'tv-baja', 'tv-revela', 'tv-ventana', 'tv-aviso'].every(k => mov.indexOf('@keyframes ' + k + '{') > 0)
       && !/@keyframes/.test(CSS.slice(0, CSS.indexOf('@media (prefers-reduced-motion: no-preference){'))));
  t.ok('la barra nace desde arriba y sus botones entran uno tras otro', /#csNav\.tv-nace\{ animation:tv-barra-nace/.test(mov) && /#csNav\.tv-nace > :nth-child\(5\)\{ animation-delay:\.29s; \}/.test(mov));
  t.ok('la cascada no desenfoca el contenedor (lo fijo dentro de él saltaría), sino cada pieza', /#csVista\.tv-cambio > \*,[\s\S]{0,260}\{ animation:tv-sube/.test(mov) && !/#csVista\.tv-cambio\{[^}]*filter/.test(mov));
  t.ok('Casting avisa después de pintar, con qué se ve; y sabe si ya estaba en pantalla', /animVista\(nav, vista, \[CS\.vista, CS\.prog, CS\.ep, CS\.tab\]\.join\('\|'\)\)/.test(CV) && /ANIM\.seguia = document\.body\.classList\.contains\('cs-on'\) && ANIM\.seguia !== false;/.test(CV));
  t.ok('la biblioteca también', /animBiblioteca\('programas'\)/.test(HTML) && /animBiblioteca\('episodios\|' \+ LDB\.showId\)/.test(HTML));
  t.ok('el módulo se carga y queda en la caché', /<script src="\.\/js\/animaciones\.js"><\/script>/.test(HTML) && /'\.\/js\/animaciones\.js'/.test(SW));
};
