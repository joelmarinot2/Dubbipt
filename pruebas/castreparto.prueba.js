/* El reparto del programa en una ventana aparte, desde el casting · especificacion 09, PRO-36 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Casting: el reparto del programa en una ventana aparte';

const norm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^\p{L}\p{N} ]/gu, ' ').replace(/\s+/g, ' ').trim();

const REPARTO = () => [
  { clave: 'ch:1', personaje: 'ANANTHIP', principal: true, episodios: 3, lineas: 131, tramos: [{ talento: 'HELEN PIRABAN', eps: [1, 2], lineas: 80 }, { talento: 'ANA ROJAS', eps: [3], lineas: 51 }] },
  { clave: 'ch:2', personaje: 'Tito Boy', principal: false, episodios: 2, lineas: 30, tramos: [{ talento: 'ANA ROJAS', eps: [1, 2], lineas: 30 }] },
  { clave: 'per:X', personaje: 'Guardia 2', principal: false, episodios: 1, lineas: 4, tramos: [{ talento: '', eps: [2], lineas: 4 }] }
];

function ventanas(o){
  o = o || {};
  const V = { abiertas: [], intervalos: [], esperas: [], registros: [], pintadas: 0, enCap: [], ep: { id: 'e1', name: 'Episodio 3', showId: 's1' } };
  const raiz = { id: 'repvRaiz', _h: '', ownerDocument: null, querySelector: () => null, querySelectorAll: () => [],
    set innerHTML(h){ this._h = h; if(/disp-cab/.test(h)) V.pintadas++; }, get innerHTML(){ return this._h; } };
  const doc = { escrito: '', escritos: 0, title: '', activeElement: null, open(){}, close(){}, write(h){ this.escrito += h; this.escritos++; },
    getElementById(id){ return (id === 'repvRaiz' && this.escritos) ? raiz : null; } };
  raiz.ownerDocument = doc;
  V.w = { closed: false, focos: 0, document: doc, focus(){ this.focos++; }, close(){ this.closed = true; } };
  V.raiz = raiz;
  V.M = montar([['/* ═══ EL REPARTO EN UNA VENTANA APARTE', '/* ═══ FIN DEL REPARTO EN UNA VENTANA APARTE']],
    ['REPV', 'repvFilas', 'repvHtml', 'repvAbrir', 'repvFirma'],
    { castNorm: norm, dispEsc: (x) => String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'), fallo: () => {}, DISP_CSS: '.disp-ventana{}',
      window: { open: (...a) => { V.abiertas.push(a); return o.bloqueada ? null : V.w; } }, document: { body: { appendChild(){} }, createElement: () => ({}) },
      setInterval: (f, ms) => { V.intervalos.push([f, ms]); return 1; }, clearInterval: () => {}, setTimeout: (f) => { V.esperas.push(f); return 1; },
      currentEp: V.ep, sbShows: () => [{ id: 's1', name: '100 DAYS OF DECEPTION' }], sbEps: () => [],
      csDatos: () => ({ datos: null }), csProgramas: (shows) => shows.map(sh => ({ show: sh, nombre: sh.name })),
      csRepartoDe: () => V.reparto || REPARTO(), csRepartoPorTalento: (rep) => {
        const por = new Map();
        for(const r of rep) for(const t of r.tramos){ if(!t.talento) continue; let g = por.get(t.talento); if(!g){ g = { talento: t.talento, personajes: [], lineas: 0 }; por.set(t.talento, g); } g.personajes.push({ r: r, eps: t.eps, lineas: t.lineas }); g.lineas += t.lineas; }
        return Array.from(por.values());
      },
      castRegCargar: async (id) => { V.registros.push(id); return { personajes: {} }; }, castOcupacion: () => V.enCap });
  return V;
}

exports.pruebas = async function(t){
  const V = ventanas();
  const M = V.M;

  t.seccion('1 · buscar en el reparto');
  t.eq('por personaje o por el talento que lo hace, sin tildes ni mayúsculas', M.repvFilas(REPARTO(), 'tito', 'personaje').map(r => r.personaje).join(',') + ' · ' + M.repvFilas(REPARTO(), 'ana rojas', 'personaje').map(r => r.personaje).join(','), 'Tito Boy · ANANTHIP,Tito Boy');
  t.eq('por talento: cada talento con sus personajes, el de más líneas primero', M.repvFilas(REPARTO(), '', 'talento').map(g => g.talento + ':' + g.personajes.map(x => x.r.personaje).join('+')).join(' | '), 'ANA ROJAS:ANANTHIP+Tito Boy | HELEN PIRABAN:ANANTHIP');
  t.eq('y buscar por personaje en esa vista', M.repvFilas(REPARTO(), 'ananthip', 'talento').length, 2);

  t.seccion('2 · lo que se ve');
  const h = M.repvHtml({ p: { nombre: 'X' }, d: null, reparto: REPARTO(), programa: '100 DAYS OF DECEPTION', capitulo: 'Episodio 3' }, { enVentana: true });
  t.ok('el programa, el capítulo que se castea y cuántos', /100 DAYS OF DECEPTION · casteando Episodio 3 · 3 personajes · 2 talentos/.test(h));
  t.ok('cada personaje con su talento por tramos, episodios y líneas; el relevo y quien no tiene talento, dichos',
       /★ ANANTHIP<\/b><span class="disp-ficha">3 ep\. · 131 líneas · relevo<\/span>[\s\S]*?<span class="repv-tal">HELEN PIRABAN<\/span><span class="repv-lin">80 lín\.<\/span><span class="repv-eps"><span class="repv-ep">Ep\. 1<\/span><span class="repv-ep">Ep\. 2<\/span>/.test(h)
       && /<span class="repv-sin">sin talento<\/span>/.test(h));
  t.ok('con su buscador, sus dos vistas y «Actualizar»', /id="repvBuscar" placeholder="Buscar personaje o talento…"/.test(h) && /data-repv="personaje">Por personaje/.test(h) && /data-repv="talento">Por talento/.test(h) && /id="repvActualizar"/.test(h));
  M.REPV.buscar = 'zzz';
  t.ok('si nada coincide, se dice', /Nada coincide con «zzz»/.test(M.repvHtml({ p: {}, reparto: REPARTO() }, {})));
  M.REPV.buscar = '';
  t.ok('sin reparto todavía, se dice cómo se arma', /se arma al hacer el casting de cada capítulo/.test(M.repvHtml({ p: {}, reparto: [] }, {})));

  t.seccion('3 · en una ventana aparte, al día sola');
  const w = await M.repvAbrir();
  t.eq('se abre una ventana aparte, siempre la misma', JSON.stringify(V.abiertas[0]), '["","dubbiptReparto","width=820,height=920,resizable=yes,scrollbars=yes"]');
  t.ok('con el reparto del programa del capítulo abierto', w === V.w && /<title>Reparto · Dubbipt<\/title>/.test(V.w.document.escrito) && /ANANTHIP/.test(V.raiz.innerHTML) && V.registros.join() === 's1' && V.w.document.title === 'Reparto · 100 DAYS OF DECEPTION');
  V.intervalos[0][0]();
  t.eq('si nada cambia, no se repinta', V.pintadas + ' ' + V.esperas.length, '1 0');
  V.enCap = [{ talento: 'LUZ MAR', personajes: [{ display: 'Guardia 2' }] }];
  V.reparto = REPARTO().map(r => r.personaje === 'Guardia 2' ? Object.assign({}, r, { tramos: [{ talento: 'LUZ MAR', eps: [2], lineas: 4 }] }) : r);
  V.intervalos[0][0](); await V.esperas[0](); await new Promise(r => setTimeout(r, 0));
  t.ok('al asignar un talento aquí, la ventana lo refleja sola', V.pintadas === 2 && /<span class="repv-tal">LUZ MAR<\/span>/.test(V.raiz.innerHTML));
  const B = ventanas({ bloqueada: true });
  let enPagina = false;
  B.M.repvAbrir().catch(() => {}); enPagina = true;
  t.ok('si el navegador la bloquea, se abre dentro de la página', enPagina);

  t.seccion('4 · dónde está');
  const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(path.dirname(INDEX), 'sw.js'), 'utf8');
  t.ok('el botón «Reparto» en la barra del casting, junto a Disponibilidad', /<button class="btnv sm" id="btnRepVentana" style="display:none" onclick="repvAbrir\(\)" title="[^"]+">Reparto<\/button>/.test(HTML));
  t.ok('sale solo con el perfil Casting', /'btnDisp','btnRepVentana'\]\)\{/.test(HTML));
  t.ok('el archivo, cargado y en la caché', /<script src="\.\/js\/castreparto\.js"><\/script>/.test(HTML) && /'\.\/js\/castreparto\.js'/.test(SW));
};
