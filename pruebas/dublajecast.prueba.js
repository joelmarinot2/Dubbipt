/* DublajeCast, desvinculado de Dubbipt · especificacion 09, PRO-9, PRO-10, PRO-49 y PRO-64
 *
 * Pedido de sala (PRO-9): traer la plataforma entera dentro de Dubbipt; y
 * luego (PRO-49): «desvincula DublajeCast de Dubbipt, pero mantén todos los
 * datos que hay». Dubbipt ya no abre DublajeCast ni le obedece: los datos de
 * Casting son de Dubbipt. La copia que se publicaba aparte (dublajecast/) se
 * quitó en la limpieza (PRO-64).
 *
 * Lo que protege esta prueba:
 *  · que casar un capítulo de Casting con uno de Dubbipt siga como estaba;
 *  · que Dubbipt ya no abra DublajeCast ni tenga botón para ello;
 *  · que la copia ya no esté ni tenga reglas propias, y que la seguridad de
 *    Dubbipt no se afloje.
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

  t.seccion('5 · la copia de DublajeCast ya no está (PRO-64)');
  t.ok('ni la carpeta ni el script que la traía', !fs.existsSync(path.join(RAIZ, 'dublajecast')) && !fs.existsSync(path.join(RAIZ, 'local', 'traer-dublajecast.js')));
  t.ok('el atajo a la IA sigue, para los breakdowns', fs.existsSync(path.join(RAIZ, 'api', 'llm.js')));

  t.seccion('6 · la seguridad de Dubbipt no se afloja');
  const V = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
  const regla = (src) => (V.headers.find(h => h.source === src) || { headers: [] }).headers.reduce((m, h) => (m[h.key] = h.value, m), {});
  const gen = regla('/((?!dctools).*)'), dct = regla('/dctools/(.*)');
  t.ok('ya no hay regla aparte para /dublajecast: le toca la general, la estricta', !V.headers.some(h => /dublajecast/.test(h.source)));
  t.ok('en ningún sitio se compila en el navegador ni se carga de unpkg o sheetjs en la regla general', !V.headers.some(h => h.headers.some(x => /'unsafe-eval'/.test(x.value)))
       && !/unpkg\.com|sheetjs/.test((gen['Content-Security-Policy'].match(/script-src[^;]*/) || [''])[0]));
  const re = new RegExp('^' + '/((?!dctools).*)' + '$');
  t.eq('la regla general lo cubre todo menos dctools', [re.test('/index.html'), re.test('/js/dublajecast.js'), re.test('/dublajecast'), re.test('/api/llm'), re.test('/dctools/x.html')].join(' '), 'true true true true false');
  t.ok('las herramientas de dctools tienen su regla: su SheetJS, sin compilar en el navegador', /cdn\.sheetjs\.com/.test(dct['Content-Security-Policy'] || '') && !/'unsafe-eval'/.test(dct['Content-Security-Policy'] || ''));
  t.ok('y Dubbipt puede hablar con Anthropic, para los breakdowns', /connect-src [^;]*https:\/\/api\.anthropic\.com/.test(gen['Content-Security-Policy']));
  const SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  const pasa = (ruta) => { const m = SW.match(/if \(url\.origin === self\.location\.origin && (\/.+\/)\.test\(url\.pathname\)\) return;/); return !!m && eval(m[1]).test(ruta); };
  t.eq('el service worker deja pasar solo la IA', ['/api/llm', '/api', '/dublajecast', '/index.html', '/js/dublajecast.js'].map(pasa).join(' '), 'true true false false false');
  t.ok('y carga el módulo', /'\.\/js\/dublajecast\.js'/.test(SW));

  t.seccion('8 · por dónde se entraba, ya no');
  const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  t.ok('ni el botón de Programas ni el del casting abren DublajeCast', !/DublajeCast original/.test(HTML) && !/btnProduccion/.test(HTML) && !/id="dcEntero"/.test(HTML) && !/id="btnDcast"/.test(HTML));
  t.ok('la cuenta de DublajeCast queda solo para importar, sin «Llevar»', /Importar de DublajeCast \(una vez\)/.test(HTML) && !/id="dcLlevar"/.test(HTML) && !/dcExportar\(\)/.test(HTML.slice(HTML.indexOf('async function dcPanel'), HTML.indexOf('async function dcPanel') + 6000)));
  t.ok('el módulo se carga después de Producción', HTML.indexOf('<script src="./js/produccion.js"></script>') < HTML.indexOf('<script src="./js/dublajecast.js"></script>'));
};
