/* DublajeCast, copiado dentro de Dubbipt pero suelto · especificacion 09, PRO-9, PRO-10 y PRO-49
 *
 * Pedido de sala (PRO-9): traer la plataforma entera dentro de Dubbipt; y
 * luego (PRO-49): «desvincula DublajeCast de Dubbipt, pero mantén todos los
 * datos que hay». Dubbipt ya no abre DublajeCast ni le obedece: los datos de
 * Casting son de Dubbipt. La copia (dublajecast/) sigue publicada y suelta.
 *
 * Lo que protege esta prueba:
 *  · que casar un capítulo de Casting con uno de Dubbipt siga como estaba;
 *  · que Dubbipt ya no abra DublajeCast ni tenga botón para ello;
 *  · que la copia publicada siga sin lo que rompería Dubbipt (service worker
 *    propio, borrado de cachés) y que la seguridad de Dubbipt no se afloje.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, RAIZ } = require('./ayuda');

exports.nombre = 'DublajeCast entero, dentro de Dubbipt';

const RECORTES = [
  ['function castNorm(t){', 'async function castRegCargar(showId){'],
  ['/* ═══ DUBLAJECAST ENTERO', '/* ═══ FIN DE DUBLAJECAST ENTERO']
];
const EXPORTA = ['DCAST', 'dcastCasarCapitulo', 'dcastAbrir', 'dcastCerrar', 'dcastDatos'];

const EPS = [{ id: 'e1', show_id: 's1', name: 'Episodio 1' }, { id: 'e2', show_id: 's1', name: 'Episodio 2' },
             { id: 'e3', show_id: 's1', name: '3 - La boda' }, { id: 'e12', show_id: 's1', name: 'E12 The Last New Year' }];

function armar(o){
  o = o || {};
  const avisos = [];
  const PROD = { datos: ('datos' in o) ? o.datos : { series: [] } };
  const M = montar(RECORTES, EXPORTA, { castNorm: undefined, castAviso: (t) => avisos.push(t), PROD: PROD, prodCasarPrograma: () => null, prodIndices: () => ({}) });
  return { M, avisos, PROD };
}

exports.pruebas = async function(t){
  const { M } = armar();

  t.seccion('1 · el capítulo de Dubbipt que corresponde');
  t.eq('por título igual, sin mayúsculas ni signos', (M.dcastCasarCapitulo(12, 'e12 the last new year!', EPS) || {}).id, 'e12');
  t.eq('o por número, cuando solo uno lo lleva en el nombre', [1, 2, 3, 12].map(n => (M.dcastCasarCapitulo(n, '', EPS) || {}).id).join(' '), 'e1 e2 e3 e12');
  t.eq('el número como texto también', (M.dcastCasarCapitulo('2', '', EPS) || {}).id, 'e2');
  t.eq('«12» no es «1» ni «2»', (M.dcastCasarCapitulo(1, '', [{ id: 'x', name: 'Episodio 12' }]) || {}).id, undefined);
  const dudosos = [{ id: 'a', name: 'Episodio 2' }, { id: 'b', name: 'Episodio 2 (versión cine)' }];
  t.eq('dos con el mismo número: ninguno, mejor abrir el programa que equivocarse', M.dcastCasarCapitulo(2, '', dudosos), null);
  t.eq('pero si el título casa, ese', (M.dcastCasarCapitulo(2, 'Episodio 2 (versión cine)', dudosos) || {}).id, 'b');
  t.eq('dos con el mismo título tampoco: ninguno', M.dcastCasarCapitulo(null, 'Piloto', [{ id: 'p1', name: 'Piloto' }, { id: 'p2', name: 'PILOTO' }]), null);
  t.eq('sin número ni título, ninguno', M.dcastCasarCapitulo(null, '', EPS) + ' ' + M.dcastCasarCapitulo('dos', '', EPS), 'null null');

  t.seccion('2 · Dubbipt ya no abre DublajeCast ni le obedece (PRO-49)');
  {
    const A = armar();
    t.eq('abrir DublajeCast: se dice que ya no está enlazado, y no se abre nada', A.M.dcastAbrir('series', 1) + ' ' + A.avisos[0], 'false DublajeCast ya no está enlazado con Dubbipt: todo el casting se hace aquí, con los datos de Dubbipt');
    t.eq('los datos son siempre los de Dubbipt, nunca «en vivo»', (A.M.dcastDatos().datos === A.PROD.datos) + ' ' + A.M.dcastDatos().vivo, 'true false');
    t.eq('cerrar no hace nada', A.M.dcastCerrar(), undefined);
    const JS = fs.readFileSync(path.join(RAIZ, 'js', 'dublajecast.js'), 'utf8');
    t.ok('ni marco, ni puente, ni mensajes', !/createElement\('iframe'\)/.test(JS) && !/addEventListener\('message'/.test(JS) && !/dcastAtender|dcastMensajeValido|__dcDatos/.test(JS));
  }

  t.seccion('5 · la copia de DublajeCast');
  const { retocar, RETOQUES } = require('../local/traer-dublajecast.js');
  const falso = '<html><head>\n<meta name="dc-version" content="9.9"/>\n' + RETOQUES.map(r => r[1]).join('\n') + '\n</head><body>\n</body>\n</html>';
  const r = retocar(falso);
  t.eq('dice qué versión es', r.version, '9.9');
  t.ok('los cuatro retoques puestos', /if\(false\/\*/.test(r.html) && !/caches\.delete/.test(r.html) && !/rel="manifest"/.test(r.html) && /window\.DubbiptBarra&&s\.curSeries/.test(r.html));
  t.ok('y el puente al final del cuerpo, con su ruta entera', /<script src="\/dublajecast\/puente\.js"><\/script>\n<\/body>/.test(r.html));
  t.eq('los iconos también con su ruta entera: Vercel la sirve sin barra al final', retocar(falso.replace('<head>', '<head><link rel="icon" href="icons/a.png"/>')).html.indexOf('href="/dublajecast/icons/a.png"') > 0, true);
  let err = '';
  try{ retocar(falso.replace(RETOQUES[1][1], '')); }catch(e){ err = e.message; }
  t.ok('si DublajeCast cambia por dentro, se para y lo dice', /«la versión nueva no borra las cachés de Dubbipt»: lo que se busca aparece 0 veces/.test(err), err);
  err = '';
  try{ retocar(falso + RETOQUES[2][1]); }catch(e){ err = e.message; }
  t.ok('también si aparece dos veces', /aparece 2 veces/.test(err), err);
  const copia = fs.readFileSync(path.join(RAIZ, 'dublajecast', 'index.html'), 'utf8');
  t.ok('la copia que se publica está retocada', /Copia de DublajeCast [\d.]+ dentro de Dubbipt/.test(copia) && /if\(false\/\* Dubbipt/.test(copia)
       && !/caches\.delete\(k\)/.test(copia) && !/rel="manifest"/.test(copia) && /<script src="\/dublajecast\/puente\.js"><\/script>/.test(copia)
       && !/(src|href)="(\.\/|icons\/)/.test(copia));
  t.ok('y su atajo a la IA está al lado', fs.existsSync(path.join(RAIZ, 'api', 'llm.js')) && fs.existsSync(path.join(RAIZ, 'dublajecast', 'puente.js')));

  t.seccion('6 · la seguridad de Dubbipt no se afloja');
  const V = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
  const regla = (src) => (V.headers.find(h => h.source === src) || { headers: [] }).headers.reduce((m, h) => (m[h.key] = h.value, m), {});
  const dc = regla('/dublajecast(.*)'), gen = regla('/((?!dublajecast|dctools).*)'), dct = regla('/dctools/(.*)');
  t.ok('DublajeCast se deja meter solo en Dubbipt', /frame-ancestors 'self'/.test(dc['Content-Security-Policy']) && dc['X-Frame-Options'] === 'SAMEORIGIN');
  t.ok('compilar en el navegador, solo en su carpeta', /'unsafe-eval'/.test(dc['Content-Security-Policy']) && !/'unsafe-eval'/.test(gen['Content-Security-Policy']) && !/unpkg\.com|sheetjs/.test((gen['Content-Security-Policy'].match(/script-src[^;]*/) || [''])[0]));
  const re = new RegExp('^' + '/((?!dublajecast|dctools).*)' + '$'), reDc = new RegExp('^' + '/dublajecast(.*)' + '$');
  t.eq('la regla general cubre todo lo demás y no su carpeta', [re.test('/index.html'), re.test('/js/dublajecast.js'), re.test('/dublajecast/index.html'), re.test('/dublajecast'), re.test('/api/llm')].join(' '), 'true true false false true');
  t.ok('las herramientas copiadas de DublajeCast (dctools) tienen su regla: su SheetJS, sin compilar en el navegador ni nada de fuera más', re.test('/dctools/pegado-casting.html') === false && /cdn\.sheetjs\.com/.test(dct['Content-Security-Policy'] || '') && !/'unsafe-eval'/.test(dct['Content-Security-Policy'] || '') && /frame-ancestors 'self'/.test(dct['Content-Security-Policy'] || '') && /connect-src 'self';/.test(dct['Content-Security-Policy'] || ''));
  t.ok('y Dubbipt puede hablar con Anthropic, para los breakdowns', /connect-src [^;]*https:\/\/api\.anthropic\.com/.test(gen['Content-Security-Policy']));
  t.eq('y la suya cubre también /dublajecast sin barra, que es como la sirve Vercel', [reDc.test('/dublajecast'), reDc.test('/dublajecast/puente.js'), reDc.test('/js/dublajecast.js')].join(' '), 'true true false');
  const SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const pasa = (ruta) => { const m = SW.match(/if \(url\.origin === self\.location\.origin && (\/.+\/)\.test\(url\.pathname\)\) return;/); return !!m && eval(m[1]).test(ruta); };
  t.eq('el service worker de Dubbipt deja pasar su carpeta, con y sin barra, y la IA', ['/dublajecast', '/dublajecast/index.html', '/api/llm', '/index.html', '/js/dublajecast.js'].map(pasa).join(' '), 'true true true false false');
  t.ok('y carga el módulo', /'\.\/js\/dublajecast\.js'/.test(SW));

  t.seccion('7 · el puente, por dentro');
  const PUENTE = fs.readFileSync(path.join(RAIZ, 'dublajecast', 'puente.js'), 'utf8');
  const correr = (dentro) => {
    const enviados = [];
    const padre = { location: { origin: 'https://dubbipt.vercel.app' }, postMessage: (d, o) => enviados.push([d, o]) };
    const R = { createElement: () => ({}), useState: (v) => [v, () => {}], useEffect: () => {} };
    const win = { addEventListener: () => {}, React: R };
    win.parent = dentro ? padre : win;
    new Function('window', 'location', 'React', PUENTE)(win, { origin: 'https://dubbipt.vercel.app' }, R);
    return { win, enviados };
  };
  const dentro = correr(true);
  t.eq('dentro de Dubbipt, con React, hay barra', typeof dentro.win.DubbiptBarra, 'function');
  t.eq('dentro de Dubbipt, pide con su firma y solo a nuestro sitio', dentro.win.dubbiptPedir('consulta', { programa: 'X' }) + ' ' + JSON.stringify(dentro.enviados[0]), 'true [{"fuente":"dublajecast","accion":"consulta","programa":"X"},"https://dubbipt.vercel.app"]');
  const fuera = correr(false);
  t.eq('abierto suelto, no pide nada ni pinta barra', fuera.win.dubbiptPedir('consulta') + ' ' + fuera.enviados.length + ' ' + typeof fuera.win.DubbiptBarra, 'false 0 undefined');

  t.seccion('8 · por dónde se entraba, ya no');
  const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  t.ok('ni el botón de Programas ni el del casting abren DublajeCast', !/DublajeCast original/.test(HTML) && !/btnProduccion/.test(HTML) && !/id="dcEntero"/.test(HTML) && !/id="btnDcast"/.test(HTML));
  t.ok('la cuenta de DublajeCast queda solo para importar, sin «Llevar»', /Importar de DublajeCast \(una vez\)/.test(HTML) && !/id="dcLlevar"/.test(HTML) && !/dcExportar\(\)/.test(HTML.slice(HTML.indexOf('async function dcPanel'), HTML.indexOf('async function dcPanel') + 6000)));
  t.ok('el módulo se carga después de Producción', HTML.indexOf('<script src="./js/produccion.js"></script>') < HTML.indexOf('<script src="./js/dublajecast.js"></script>'));
};
