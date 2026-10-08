/* La interfaz compartida de Casting · especificacion 09, PRO-11
 *
 * Pedido de sala: «quiero que sea una interfaz compartida de Dubbipt:
 *   1. pantalla de inicio de Dubbipt, elegir qué perfil quiero: QC, grabación y casting;
 *   2. si se elige casting se abre la parte de programas y tiene las
 *      herramientas que tiene DublajeCast;
 *   3. si abro cada programa puedo ver el casting de cada episodio, y si entro
 *      a cada episodio puedo usar las herramientas de Dubbipt».
 *
 * Lo que protege esta prueba:
 *  · que cada herramienta abra DublajeCast en SU pantalla, ahora o en cuanto
 *    la persona entre en su cuenta;
 *  · que el casting de un capítulo sea el de ESE capítulo, con los personajes
 *    que salen, sus líneas y su talento, y que un desacuerdo entre DublajeCast
 *    y Dubbipt se vea en vez de esconderse;
 *  · que ver el casting no abra el capítulo, y que entrar sí.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, RAIZ } = require('./ayuda');

exports.nombre = 'La interfaz compartida de Casting';

/* Lo justo del navegador: elementos con clases, hijos, eventos y búsqueda. */
class El {
  constructor(tag){ this.tag = tag; this.id = ''; this.className = ''; this.style = {}; this.title = ''; this.textContent = '';
    this._html = ''; this.hijos = []; this.parentNode = null; this.oyentes = {}; this.dataset = {}; this.onclick = null; this.stubs = {}; }
  get classList(){
    const el = this;
    const lista = () => el.className.split(/\s+/).filter(Boolean);
    return { contains: (c) => lista().includes(c), add: (c) => { if(!lista().includes(c)) el.className = (el.className + ' ' + c).trim(); },
             remove: (c) => { el.className = lista().filter(x => x !== c).join(' '); } };
  }
  set innerHTML(h){ this._html = h; this.hijos = []; this.stubs = {}; }
  get innerHTML(){ return this._html; }
  get innerText(){ return this._html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() + ' ' + this.hijos.map(h => h.innerText || h.textContent).join(' '); }
  appendChild(n){ if(n.parentNode) n.remove(); n.parentNode = this; this.hijos.push(n); return n; }
  insertBefore(n, ref){ if(n.parentNode) n.remove(); n.parentNode = this; const i = ref ? this.hijos.indexOf(ref) : -1; if(i < 0) this.hijos.push(n); else this.hijos.splice(i, 0, n); return n; }
  remove(){ if(this.parentNode){ const h = this.parentNode.hijos; h.splice(h.indexOf(this), 1); this.parentNode = null; } }
  get nextSibling(){ return this.nextElementSibling; }
  get nextElementSibling(){ if(!this.parentNode) return null; const h = this.parentNode.hijos; return h[h.indexOf(this) + 1] || null; }
  addEventListener(ev, f){ (this.oyentes[ev] = this.oyentes[ev] || []).push(f); }
  click(){ let parado = false; const ev = { stopPropagation: () => { parado = true; }, target: this };
    (this.oyentes.click || []).forEach(f => f(ev)); if(this.onclick) this.onclick(ev);
    let p = this.parentNode; while(p && !parado){ (p.oyentes.click || []).forEach(f => f(ev)); p = p.parentNode; } }
  casa(sel){
    let m;
    if((m = sel.match(/^\.([\w-]+)$/))) return this.classList.contains(m[1]);
    if((m = sel.match(/^#([\w-]+)$/))) return this.id === m[1];
    if((m = sel.match(/^\.([\w-]+)\[data-ep="([^"]*)"\]$/))) return this.classList.contains(m[1]) && this.dataset.ep === m[2];
    return false;
  }
  querySelector(sel){
    for(const h of this.hijos){ if(h.casa(sel)) return h; const r = h.querySelector(sel); if(r) return r; }
    /* Lo que vino como HTML escrito: un botón con esa clase, siempre el mismo. */
    const m = sel.match(/^\.([\w-]+)$/);
    if(m && new RegExp('class="[^"]*\\b' + m[1] + '\\b').test(this._html)) return (this.stubs[sel] = this.stubs[sel] || Object.assign(new El('button'), { className: m[1] }));
    return null;
  }
  querySelectorAll(sel){
    const m = sel.match(/^\.([\w-]+)$/);
    if(!m) return [];
    const re = new RegExp('<button class="' + m[1] + '" data-v="([^"]+)"', 'g');
    if(!this._todos) this._todos = [...this._html.matchAll(re)].map(x => Object.assign(new El('button'), { className: m[1], dataset: { v: x[1] } }));
    return this._todos;
  }
}

const VOLCADO = {
  _version: 'dublajecast_v2',
  series: [{ id: 1, name: 'A Filipino Christmas' }, { id: 2, name: 'Akka' }],
  episodes: [{ id: 11, series_id: 1, episode_number: 1, title: 'The Last New Year in Boracay' }, { id: 12, series_id: 1, episode_number: 2, title: 'Episodio 2' },
             { id: 21, series_id: 2, episode_number: 1, title: 'Akka 1' }],
  characters: [{ id: 101, canonical_name: 'ALLY', tipo: 'principal' }, { id: 102, canonical_name: 'JANA' }, { id: 103, canonical_name: 'TITO BOY' }, { id: 104, canonical_name: 'LOLA' }],
  talents: [{ id: 1, name: 'ANA ROJAS' }, { id: 2, name: 'BEATRIZ SOL' }, { id: 3, name: 'CARLOS RUIZ' }],
  appearances: [{ character_id: 101, episode_id: 11, line_count: 186 }, { character_id: 102, episode_id: 11, line_count: 54 }, { character_id: 103, episode_id: 11, line_count: 12 },
                { character_id: 101, episode_id: 12, line_count: 90 }, { character_id: 104, episode_id: 21, line_count: 30 }],
  castings: [{ character_id: 101, talent_id: 1, episode_id: 11 }, { character_id: 102, talent_id: 2, episode_id: 11 }, { character_id: 101, talent_id: 1, episode_id: 12 },
             { character_id: 104, talent_id: 3, episode_id: 21 }]
};
const SH = { id: 's1', name: 'A FILIPINO CHRISTMAS' };
const EPS = [{ id: 'e1', show_id: 's1', name: 'Episodio 1' }, { id: 'e2', show_id: 's1', name: 'Episodio 2' }, { id: 'e9', show_id: 's1', name: 'Especial de Navidad' }];
const REGISTRO = { personajes: { JANA: { display: 'JANA', talent: 'LUZ MAR', episodios: ['Episodio 1'] }, ALLY: { display: 'ALLY', talent: 'ANA ROJAS', episodios: ['Episodio 1', 'Episodio 2'] },
                                 NARRADOR: { display: 'NARRADOR', talent: 'PEPE', episodios: ['Episodio 2'] },
                                 COROS: { display: 'COROS', talent: 'TODOS', episodios: ['Especial de Navidad'] } } };

/* Producción de verdad, para normalizar e indexar como en la app. */
const PR = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']],
  ['prodNormalizar', 'prodIndices', 'prodCasarPrograma'], { castNorm: undefined, console: { warn: () => {} } });

function armar(o){
  o = o || {};
  const diario = [], avisos = [];
  const doc = { body: new El('body'), createElement: (t) => new El(t), getElementById: (id) => doc.body.querySelector('#' + id) };
  doc.body.classList.add = doc.body.classList.add;
  const PROD = { datos: ('datos' in o) ? o.datos : PR.prodNormalizar(VOLCADO), cuando: new Date(2026, 9, 6).getTime() };
  const LDB = { showId: ('showId' in o) ? o.showId : 's1' };
  const M = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ DUBLAJECAST ENTERO', '/* ═══ FIN DE DUBLAJECAST ENTERO']],
    ['DCAST', 'dcastIr', 'dcastAbrir', 'dcastAtender', 'dcastDatos', 'dcastSerieDe', 'dcastEpDeDc', 'dcastFilasCasting'],
    { castNorm: undefined, document: doc, window: { addEventListener: () => {} }, location: { origin: 'https://dubbipt.vercel.app' },
      prodPuede: () => (o.puede !== undefined ? o.puede : true), PROD_SIN_PERMISO: '🔒 solo admin', prodPintarBoton: () => {},
      prodCasarPrograma: PR.prodCasarPrograma, prodNormalizar: PR.prodNormalizar, prodIndices: PR.prodIndices, PROD: PROD,
      prodCargar: async () => diario.push('prodCargar'), prodPanel: async () => {},
      castRegCargar: async (id) => { diario.push('registro ' + id); return o.registro !== undefined ? o.registro : REGISTRO; },
      castAviso: (t) => avisos.push(t), esc: (x) => String(x).replace(/</g, '&lt;'),
      sbShows: () => [SH], sbEps: () => EPS, LDB: LDB, libView: 'eps',
      renderLibrary: () => {}, precacheShowData: () => {}, updateBackBtn: () => {}, refreshTopbar: () => {}, ponerModo: () => {},
      openEpisode: async (id) => diario.push('openEpisode ' + id), newShow: async () => {}, talPanel: () => {}, herramientasPanel: () => {},
      fallo: (d) => diario.push('fallo ' + d) });
  return { M, diario, avisos, doc, PROD, LDB };
}

exports.pruebas = async function(t){
  const { M } = armar();

  t.seccion('1 · el capítulo de DublajeCast que corresponde a uno de Dubbipt');
  const dcEps = PR.prodNormalizar(VOLCADO).episodes.filter(e => e.series_id === 1);
  t.eq('por el número del nombre', (M.dcastEpDeDc('Episodio 1', dcEps) || {}).id + ' ' + (M.dcastEpDeDc('E02', dcEps) || {}).id, '11 12');
  t.eq('o por título igual', (M.dcastEpDeDc('the last new year in boracay', dcEps) || {}).id, 11);
  t.eq('«12» no es «1» ni «2»', M.dcastEpDeDc('Episodio 12', dcEps), null);
  t.eq('sin número ni título que case, ninguno', M.dcastEpDeDc('Especial de Navidad', dcEps) + ' ' + M.dcastEpDeDc('', dcEps), 'null null');
  t.eq('dos con el mismo número: ninguno', M.dcastEpDeDc('Episodio 1', [{ id: 'a', episode_number: 1, title: 'x' }, { id: 'b', episode_number: '1', title: 'y' }]), null);
  t.eq('dos con el mismo título tampoco', M.dcastEpDeDc('Piloto', [{ id: 'a', title: 'Piloto' }, { id: 'b', title: 'PILOTO' }]), null);
  t.eq('el programa de DublajeCast, por nombre', (M.dcastSerieDe(SH, PR.prodNormalizar(VOLCADO)) || {}).id + ' ' + M.dcastSerieDe({ id: 'z', name: 'Dofus' }, PR.prodNormalizar(VOLCADO)) + ' ' + M.dcastSerieDe(SH, null), '1 null null');

  t.seccion('2 · el casting de un capítulo');
  const d = PR.prodNormalizar(VOLCADO);
  const ep = (id) => d.episodes.find(e => e.id === id);
  const c1 = M.dcastFilasCasting(d, ep(11), REGISTRO, 'Episodio 1');
  t.eq('los personajes que salen, por líneas', c1.map(f => f.personaje + ':' + f.lineas).join(' '), 'ALLY:186 JANA:54 TITO BOY:12');
  t.eq('con su talento; sin talento, vacío', c1.map(f => f.talento || '—').join(' | '), 'ANA ROJAS | LUZ MAR | —');
  t.eq('el principal, marcado', c1.map(f => f.principal).join(' '), 'true false false');
  t.eq('si DublajeCast y Dubbipt dicen otra cosa, se marca y manda Dubbipt', JSON.stringify(c1.filter(f => f.choca).map(f => [f.personaje, f.dubbipt, f.dc])), '[["JANA","LUZ MAR","BEATRIZ SOL"]]');
  t.eq('si dicen lo mismo, no choca', c1.find(f => f.personaje === 'ALLY').choca, false);
  const c2 = M.dcastFilasCasting(d, ep(12), REGISTRO, 'Episodio 2');
  t.eq('cada capítulo el suyo: el registro solo cuenta lo de ese capítulo', c2.map(f => f.personaje + '=' + f.talento).join(' '), 'ALLY=ANA ROJAS NARRADOR=PEPE');
  t.eq('lo que solo sabe Dubbipt también sale', c2.find(f => f.personaje === 'NARRADOR').lineas, 0);
  t.eq('un capítulo que DublajeCast no tiene: solo lo de Dubbipt', M.dcastFilasCasting(d, null, REGISTRO, 'Especial de Navidad').map(f => f.personaje).join(' '), 'COROS');
  t.eq('uno que Dubbipt no tiene: solo lo de DublajeCast', M.dcastFilasCasting(d, ep(11), REGISTRO, '').map(f => f.personaje + '=' + (f.talento || '—')).join(' '), 'ALLY=ANA ROJAS JANA=BEATRIZ SOL TITO BOY=—');
  t.eq('sin datos de DublajeCast, lo de Dubbipt', M.dcastFilasCasting(null, null, REGISTRO, 'Episodio 1').map(f => f.personaje).join(' '), 'ALLY JANA');
  t.eq('sin nada, nada', M.dcastFilasCasting(null, null, null, 'Episodio 1').length, 0);
  t.eq('y se encuentra el capítulo de DublajeCast desde el de Dubbipt', M.dcastEpDeDc('Episodio 1', d.episodes.filter(e => e.series_id === 1)).id + ' ' + M.dcastSerieDe(SH, d).name, '11 A Filipino Christmas');

  t.seccion('4 · los datos: en vivo si DublajeCast está abierto, si no lo traído');
  {
    const A = armar();
    t.eq('sin DublajeCast abierto, lo traído', A.M.dcastDatos().vivo + ' ' + (A.M.dcastDatos().datos === A.PROD.datos), 'false true');
    A.M.DCAST.marco = { contentWindow: { __dcDatos: () => ({ series: [{ id: 9, name: 'Nueva' }], characters: [{ id: 1, canonical_name: 'X' }] }) } };
    const v = A.M.dcastDatos();
    t.eq('abierto y con sesión, lo de ahora mismo, normalizado', v.vivo + ' ' + v.datos.series[0].name + ' ' + v.datos.characters[0].name + ' ' + Array.isArray(v.datos.castings), 'true Nueva X true');
    A.M.DCAST.marco = { contentWindow: { __dcDatos: () => null } };
    t.eq('abierto sin sesión, lo traído', A.M.dcastDatos().vivo, false);
    A.M.DCAST.marco = { get contentWindow(){ throw new Error('cruzado'); } };
    t.eq('si el marco no deja mirar, lo traído', A.M.dcastDatos().vivo, false);
  }

  t.seccion('5 · cada herramienta abre DublajeCast en SU pantalla');
  {
    const A = armar();
    const llamadas = [];
    A.M.DCAST.ov = { style: {} };
    A.M.DCAST.marco = { contentWindow: {} };
    t.eq('si DublajeCast todavía no está listo, la pantalla queda pendiente', A.M.dcastAbrir('talents') + ' ' + JSON.stringify(A.M.DCAST.pendiente), 'true {"vista":"talents","serieId":null}');
    A.M.DCAST.marco.contentWindow.__dcNav = (v, s, e) => llamadas.push([v, s, e]);
    t.eq('al llegar su «listo», va', await A.M.dcastAtender({ accion: 'listo' }) + ' ' + JSON.stringify(llamadas) + ' ' + A.M.DCAST.pendiente, 'listo [["talents",null,null]] null');
    A.M.dcastAbrir('casting', 1, 11);
    t.eq('si ya está listo, va enseguida: el casting de un capítulo', JSON.stringify(llamadas[1]), '["casting",1,11]');
    A.M.dcastAbrir();
    t.eq('abrir sin decir pantalla no mueve nada', llamadas.length, 2);
    t.eq('y sin nada pendiente, «listo» no hace nada', A.M.dcastIr(), false);
    A.M.DCAST.pendiente = { vista: 'x' };
    A.M.DCAST.marco.contentWindow.__dcNav = () => { throw new Error('roto'); };
    t.ok('si DublajeCast falla, se dice y queda pendiente', A.M.dcastIr() === false && A.M.DCAST.pendiente && A.diario.some(x => /^fallo dcastIr/.test(x)));
  }
  {
    const N = armar({ puede: false });
    N.M.dcastAbrir('talents');
    t.eq('sin permiso no se abre aunque se pida una pantalla', N.avisos.join('') + ' ' + N.M.DCAST.ov, '🔒 solo admin null');
  }

  t.seccion('8 · el recorrido entero');
  const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  t.ok('1. al entrar se elige el perfil: QC, Grabación o Casting', /function perfilAlEntrar\(done\)\{[\s\S]{0,200}preguntarModo\('', modoUltimo\(\), \{\s+titulo: 'Dubbipt',\s+sub: '¿Qué vas a hacer\?'/.test(HTML));
  t.ok('2. Programas pinta las secciones de DublajeCast, y dentro de un programa también', /try\{ csPintar\('shows', head, grid\); \}catch\(e\)\{ fallo\('csPintar · index\.html:renderLibrary'/.test(HTML) && /try\{ csPintar\('eps', ehead, grid\); \}catch\(e\)\{ fallo\('csPintar · index\.html:renderLibrary'/.test(HTML));
  const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
  t.ok('3. en el episodio, «Realizar casting» abre el capítulo con el perfil Casting', /data-cs="realizar"/.test(CV) && /ponerModo\(e\.ep\.id, 'casting'\);[\s\S]{0,160}await openEpisode\(e\.ep\.id\);/.test(CV));
  t.ok('y la tabla vieja de capítulos ya no pinta su casting aparte', !/dcastPintarCastings/.test(HTML));
  const PROD_JS = fs.readFileSync(path.join(RAIZ, 'js', 'produccion.js'), 'utf8');
  t.ok('cambiar de perfil pone o quita las secciones', /const nav = document\.getElementById\('csNav'\);\s+if\(!!nav !== prodPuede\(\) && typeof csRepintar === 'function'\) csRepintar\(\);/.test(PROD_JS));
  const COPIA = fs.readFileSync(path.join(RAIZ, 'dublajecast', 'index.html'), 'utf8');
  t.ok('DublajeCast se deja llevar a una pantalla y enseña sus datos', /window\.__dcNav=\(v,sid,eid\)=>\{if\(sid!=null\)store\.setSelSeriesId\(sid\);if\(eid!==undefined&&store\.setSelEpId\)store\.setSelEpId\(eid\);store\.navTo\(v\);\};window\.__dcDatos=\(\)=>__dbDatos\.current;/.test(COPIA)
       && /window\.dubbiptPedir\("listo"\)/.test(COPIA));
};
