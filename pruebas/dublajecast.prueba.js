/* DublajeCast entero, dentro de Dubbipt · especificacion 09, PRO-9 y PRO-10
 *
 * Pedido de sala: «quiero traer prácticamente toda la plataforma: que cuando
 * le dé al botón de DublajeCast me abra todas las funciones del programa, y
 * que dentro de los programas estén las herramientas de Dubbipt también».
 *
 * Lo que protege esta prueba:
 *  · que la barra de DublajeCast lleve al programa y al capítulo correctos,
 *    y que ante la duda abra el programa en vez de equivocar el capítulo;
 *  · que Dubbipt solo obedezca a SU DublajeCast, y solo al administrador;
 *  · que la copia no traiga lo que rompería Dubbipt: un service worker propio
 *    y el borrado de todas las cachés del sitio;
 *  · que la seguridad de Dubbipt no se afloje para hacerle sitio.
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
const EXPORTA = ['DCAST', 'dcastCasarCapitulo', 'dcastMensajeValido', 'dcastAtender', 'dcastAbrir', 'dcastCerrar'];

const EPS = [{ id: 'e1', show_id: 's1', name: 'Episodio 1' }, { id: 'e2', show_id: 's1', name: 'Episodio 2' },
             { id: 'e3', show_id: 's1', name: '3 - La boda' }, { id: 'e12', show_id: 's1', name: 'E12 The Last New Year' }];

function armar(o){
  o = o || {};
  const diario = [], respuestas = [], avisos = [];
  const LDB = { showId: null, browse: false };
  const nodos = {};
  const marco = { contentWindow: { postMessage: (d, origen) => respuestas.push([d, origen]) } };
  const cuerpo = { clases: new Set(), classList: null };
  cuerpo.classList = { add: (c) => cuerpo.clases.add(c), remove: (c) => cuerpo.clases.delete(c) };
  const doc = {
    body: Object.assign(cuerpo, { appendChild: (n) => diario.push('pega ' + n.id) }),
    getElementById: (id) => nodos[id] || null,
    createElement: (tag) => {
      const n = { tag, style: {}, innerHTML: '', id: '', className: '', src: '', title: '', onclick: null, contentWindow: marco.contentWindow,
                  appendChild: () => {}, querySelector: (s) => { const k = s.replace('#', ''); return (nodos[k] = nodos[k] || { onclick: null }); } };
      return n;
    }
  };
  let modoPuesto = null, libVistaFinal = null;
  const M = montar(RECORTES, EXPORTA, {
    castNorm: undefined, document: doc, window: { addEventListener: (ev) => diario.push('escucha ' + ev) },
    location: { origin: 'https://dubbipt.vercel.app' },
    prodPuede: () => (o.puede !== undefined ? o.puede : true), PROD_SIN_PERMISO: '🔒 solo admin',
    prodCasarPrograma: (n, shows) => shows.find(s => s.name.toUpperCase() === String(n).toUpperCase()) || null,
    prodPanel: async () => diario.push('prodPanel'), prodPintarBoton: () => diario.push('prodPintarBoton'),
    castAviso: (t) => avisos.push(t),
    sbShows: () => [{ id: 's1', name: 'A Filipino Christmas' }],
    sbEps: (id) => EPS.filter(e => e.show_id === id),
    LDB: LDB,
    renderLibrary: () => { libVistaFinal = 'pinta'; diario.push('renderLibrary'); },
    precacheShowData: (id) => diario.push('precarga ' + id),
    updateBackBtn: () => {}, refreshTopbar: () => {},
    ponerModo: (ep, m) => { modoPuesto = m; diario.push('ponerModo ' + ep + ' ' + m); },
    openEpisode: async (id) => diario.push('openEpisode ' + id),
    newShow: async () => { nodos.npName = { value: '', focus: () => {} }; diario.push('newShow'); },
    talPanel: () => diario.push('talPanel'), herramientasPanel: () => diario.push('herramientasPanel'),
    fallo: (d) => diario.push('fallo ' + d),
    libView: 'shows'
  });
  M.DCAST.marco = marco;
  M.DCAST.ov = { style: { display: '' } };
  return { M, diario, respuestas, avisos, LDB, nodos, marco, cuerpo, modo: () => modoPuesto };
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
  t.eq('sin número ni título, ninguno', M.dcastCasarCapitulo(null, '', EPS) + ' ' + M.dcastCasarCapitulo('dos', '', EPS), 'null null');

  t.seccion('2 · solo se obedece a NUESTRA DublajeCast');
  const marco = { contentWindow: {} };
  const ok = { origin: 'https://dubbipt.vercel.app', source: marco.contentWindow, data: { fuente: 'dublajecast', accion: 'consulta' } };
  const v = (e) => M.dcastMensajeValido(e, marco, 'https://dubbipt.vercel.app');
  t.eq('el bueno', v(ok), true);
  t.eq('de otro sitio, no', v(Object.assign({}, ok, { origin: 'https://dubcast.netlify.app' })), false);
  t.eq('de otra ventana del mismo sitio, no', v(Object.assign({}, ok, { source: {} })), false);
  t.eq('sin su firma, no', v(Object.assign({}, ok, { data: { accion: 'consulta' } })) + ' ' + v(Object.assign({}, ok, { data: { fuente: 'dublajecast' } })) + ' ' + v(Object.assign({}, ok, { data: 'consulta' })), 'false false false');
  t.eq('sin marco abierto, nada', M.dcastMensajeValido(ok, null, 'https://dubbipt.vercel.app'), false);

  t.seccion('3 · lo que pide la barra');
  {
    const A = armar();
    t.eq('consulta: el programa existe', await A.M.dcastAtender({ accion: 'consulta', programa: 'a filipino christmas' }), 'estado');
    t.eq('y se contesta a la barra, solo a nuestro sitio', JSON.stringify(A.respuestas[0]), JSON.stringify([{ fuente: 'dubbipt', tipo: 'estado', programa: 'a filipino christmas', existe: true, nombre: 'A Filipino Christmas' }, 'https://dubbipt.vercel.app']));
    await A.M.dcastAtender({ accion: 'consulta', programa: 'Akka' });
    t.eq('consulta: no existe', A.respuestas[1][0].existe + ' ' + A.respuestas[1][0].nombre, 'false ');
  }
  {
    const A = armar();
    t.eq('abrir el programa', await A.M.dcastAtender({ accion: 'programa', programa: 'A Filipino Christmas', perfil: 'qc' }), 'programa');
    t.eq('en el perfil pedido, en su lista de capítulos, y DublajeCast a un lado', [A.modo(), A.LDB.showId, A.LDB.browse, A.M.DCAST.ov.style.display, A.diario.includes('renderLibrary'), A.diario.includes('precarga s1')].join(' '), 'qc s1 true none true true');
  }
  {
    const A = armar();
    await A.M.dcastAtender({ accion: 'programa', programa: 'A Filipino Christmas', perfil: 'administrador' });
    t.eq('un perfil que no existe no se pone', A.modo(), null);
  }
  {
    const A = armar();
    t.eq('abrir un capítulo', await A.M.dcastAtender({ accion: 'capitulo', programa: 'A Filipino Christmas', perfil: 'casting', numero: 2, titulo: 'Otro título' }), 'capitulo');
    t.ok('con su perfil y abriéndolo', A.diario.includes('ponerModo e2 casting') && A.diario.includes('openEpisode e2') && A.LDB.showId === 's1' && A.M.DCAST.ov.style.display === 'none', A.diario.join(' | '));
  }
  {
    const A = armar();
    t.eq('un capítulo que no está: abre el programa', await A.M.dcastAtender({ accion: 'capitulo', programa: 'A Filipino Christmas', perfil: 'casting', numero: 40 }), 'programa');
    t.ok('y lo dice en la barra', /No encuentro el capítulo 40/.test(A.respuestas[0][0].texto) && !A.diario.some(x => /^openEpisode/.test(x)));
  }
  {
    const A = armar();
    t.eq('un programa que no está en Dubbipt', await A.M.dcastAtender({ accion: 'programa', programa: 'Akka' }), 'falta');
    t.ok('no se mueve nada y se dice', A.LDB.showId === null && A.M.DCAST.ov.style.display === '' && /«Akka» no está en Dubbipt/.test(A.respuestas[0][0].texto));
  }
  {
    const A = armar();
    t.eq('crearlo', await A.M.dcastAtender({ accion: 'crear', programa: 'Akka' }), 'crear');
    t.eq('con el nombre ya escrito', A.nodos.npName.value + ' ' + A.diario.includes('newShow'), 'Akka true');
  }
  {
    const A = armar();
    t.eq('la base de talentos, las herramientas y Producción', [await A.M.dcastAtender({ accion: 'talentos' }), await A.M.dcastAtender({ accion: 'herramientas' }), await A.M.dcastAtender({ accion: 'produccion' })].join(' '), 'talentos herramientas produccion');
    t.ok('cada una abre lo suyo', A.diario.includes('talPanel') && A.diario.includes('herramientasPanel') && A.diario.includes('prodPanel'));
    t.eq('algo que no se conoce, nada', await A.M.dcastAtender({ accion: 'borrarTodo' }), 'nada');
  }

  t.seccion('4 · solo el administrador, en el perfil Casting (PRO-8)');
  {
    const N = armar({ puede: false });
    t.eq('la barra no consigue nada', await N.M.dcastAtender({ accion: 'programa', programa: 'A Filipino Christmas' }), 'permiso');
    t.ok('ni se mueve, ni se abre nada, y se le dice', N.LDB.showId === null && !N.diario.some(x => /renderLibrary|openEpisode|talPanel/.test(x)) && N.respuestas[0][0].texto === '🔒 solo admin');
    N.M.DCAST.ov = null;
    t.eq('el botón no abre DublajeCast', N.M.dcastAbrir() + ' ' + N.avisos.join('|') + ' ' + N.diario.includes('prodPintarBoton'), 'false 🔒 solo admin true');
  }
  {
    const A = armar(); A.M.DCAST.ov = null; A.M.DCAST.marco = null;
    t.eq('al administrador sí: con su marco', A.M.dcastAbrir() + ' ' + A.M.DCAST.marco.src + ' ' + A.cuerpo.clases.has('dcast-abierto'), 'true ./dublajecast/index.html true');
    const primero = A.M.DCAST.marco;
    A.M.dcastCerrar(); A.M.dcastAbrir();
    t.eq('y al volver es el mismo: lo que se hacía allí sigue', A.M.DCAST.marco === primero, true);
    t.ok('el marco se pega una sola vez', A.diario.filter(x => x === 'pega dcastOv').length === 1);
  }

  t.seccion('5 · la copia de DublajeCast');
  const { retocar, RETOQUES } = require('../local/traer-dublajecast.js');
  const falso = '<html><head>\n<meta name="dc-version" content="9.9"/>\n' + RETOQUES.map(r => r[1]).join('\n') + '\n</head><body>\n</body>\n</html>';
  const r = retocar(falso);
  t.eq('dice qué versión es', r.version, '9.9');
  t.ok('los cuatro retoques puestos', /if\(false\/\*/.test(r.html) && !/caches\.delete/.test(r.html) && !/rel="manifest"/.test(r.html) && /window\.DubbiptBarra&&s\.curSeries/.test(r.html));
  t.ok('y el puente al final del cuerpo', /<script src="\.\/puente\.js"><\/script>\n<\/body>/.test(r.html));
  let err = '';
  try{ retocar(falso.replace(RETOQUES[1][1], '')); }catch(e){ err = e.message; }
  t.ok('si DublajeCast cambia por dentro, se para y lo dice', /«la versión nueva no borra las cachés de Dubbipt»: lo que se busca aparece 0 veces/.test(err), err);
  err = '';
  try{ retocar(falso + RETOQUES[2][1]); }catch(e){ err = e.message; }
  t.ok('también si aparece dos veces', /aparece 2 veces/.test(err), err);
  const copia = fs.readFileSync(path.join(RAIZ, 'dublajecast', 'index.html'), 'utf8');
  t.ok('la copia que se publica está retocada', /Copia de DublajeCast [\d.]+ dentro de Dubbipt/.test(copia) && /if\(false\/\* Dubbipt/.test(copia)
       && !/caches\.delete\(k\)/.test(copia) && !/rel="manifest"/.test(copia) && /<script src="\.\/puente\.js"><\/script>/.test(copia));
  t.ok('y su atajo a la IA está al lado', fs.existsSync(path.join(RAIZ, 'api', 'llm.js')) && fs.existsSync(path.join(RAIZ, 'dublajecast', 'puente.js')));

  t.seccion('6 · la seguridad de Dubbipt no se afloja');
  const V = JSON.parse(fs.readFileSync(path.join(RAIZ, 'vercel.json'), 'utf8'));
  const regla = (src) => (V.headers.find(h => h.source === src) || { headers: [] }).headers.reduce((m, h) => (m[h.key] = h.value, m), {});
  const dc = regla('/dublajecast/(.*)'), gen = regla('/((?!dublajecast/).*)');
  t.ok('DublajeCast se deja meter solo en Dubbipt', /frame-ancestors 'self'/.test(dc['Content-Security-Policy']) && dc['X-Frame-Options'] === 'SAMEORIGIN');
  t.ok('compilar en el navegador, solo en su carpeta', /'unsafe-eval'/.test(dc['Content-Security-Policy']) && !/'unsafe-eval'/.test(gen['Content-Security-Policy']) && !/unpkg\.com|sheetjs/.test((gen['Content-Security-Policy'].match(/script-src[^;]*/) || [''])[0]));
  const re = new RegExp('^' + '/((?!dublajecast/).*)' + '$');
  t.eq('la regla general cubre todo lo demás y no su carpeta', [re.test('/index.html'), re.test('/js/dublajecast.js'), re.test('/dublajecast/index.html'), re.test('/api/llm')].join(' '), 'true true false true');
  const SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('el service worker de Dubbipt deja pasar su carpeta y la IA', /if \(url\.origin === self\.location\.origin && \/\^\\\/\(dublajecast\|api\)\\\/\/\.test\(url\.pathname\)\) return;/.test(SW));
  t.ok('y carga el módulo', /'\.\/js\/dublajecast\.js'/.test(SW));

  t.seccion('7 · el puente, por dentro');
  const PUENTE = fs.readFileSync(path.join(RAIZ, 'dublajecast', 'puente.js'), 'utf8');
  const correr = (dentro) => {
    const enviados = [];
    const padre = { location: { origin: 'https://dubbipt.vercel.app' }, postMessage: (d, o) => enviados.push([d, o]) };
    const win = { addEventListener: () => {}, React: null };
    win.parent = dentro ? padre : win;
    new Function('window', 'location', 'React', PUENTE)(win, { origin: 'https://dubbipt.vercel.app' }, undefined);
    return { win, enviados };
  };
  const dentro = correr(true);
  t.eq('dentro de Dubbipt, pide con su firma y solo a nuestro sitio', dentro.win.dubbiptPedir('consulta', { programa: 'X' }) + ' ' + JSON.stringify(dentro.enviados[0]), 'true [{"fuente":"dublajecast","accion":"consulta","programa":"X"},"https://dubbipt.vercel.app"]');
  const fuera = correr(false);
  t.eq('abierto suelto, no pide nada ni pinta barra', fuera.win.dubbiptPedir('consulta') + ' ' + fuera.enviados.length + ' ' + typeof fuera.win.DubbiptBarra, 'false 0 undefined');

  t.seccion('8 · por dónde se entra');
  const HTML = fs.readFileSync(path.join(RAIZ, 'index.html'), 'utf8');
  t.ok('el botón de Programas abre DublajeCast entero', />🎬 DublajeCast<\/button>'/.test(HTML) && /bp\.onclick=\(\)=> dcastAbrir\(\);/.test(HTML));
  t.ok('y el puente del casting también, solo para quien puede', /\? '<button class="modo-op dc-b" id="dcEntero">/.test(HTML) && /if\(de\) de\.onclick = \(\) => \{ cerrar\(\); dcastAbrir\(\); \};/.test(HTML));
  t.ok('el módulo se carga después de Producción', HTML.indexOf('<script src="./js/produccion.js"></script>') < HTML.indexOf('<script src="./js/dublajecast.js"></script>'));
};
