/* Velocidad de carga y de uso · especificacion 07, ENT-30
 *
 * Pedido de sala: un vídeo con 25 consejos para que una aplicación no vaya
 * lenta, «aplica esas mejoras a todo el entorno». Lo que protege esta prueba:
 * las librerías pesadas no se bajan al abrir (solo al hacer falta, una vez y
 * con su huella SRI), las fuentes son propias, el Excel no bloquea el primer
 * pintado, la base local se abre una vez, las cargas repetidas no se piden dos
 * veces, el buscador de Casting espera a que dejes de escribir, y la velocidad
 * real de cada equipo va en el informe de fallos.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX, RAIZ } = require('./ayuda');

exports.nombre = 'Velocidad: librerías bajo demanda, fuentes propias, sin llamadas repetidas';

const HTML = fs.readFileSync(INDEX, 'utf8');
const leer = (r) => fs.readFileSync(path.join(RAIZ, r), 'utf8');
const espera = () => new Promise(r => setTimeout(r, 0));

exports.pruebas = async function(t){
  const cabeza = HTML.slice(0, HTML.indexOf('</head>'));

  t.seccion('1 · lo que se baja al abrir');
  {
    t.ok('pdf.js ya no va en la cabecera', !/<script[^>]+pdf\.min\.js/.test(cabeza));
    t.ok('mammoth (Word) ya no va en la cabecera', !/<script[^>]+mammoth/.test(cabeza));
    const xlsx = (cabeza.match(/<script[^>]+xlsx\.full\.min\.js[^>]*>/) || [''])[0];
    t.ok('el lector de Excel va con defer (no frena el primer pintado)', /\sdefer[\s>]/.test(xlsx));
    t.ok('… y mantiene su huella SRI', /integrity="sha384-/.test(xlsx) && /crossorigin="anonymous"/.test(xlsx));
    t.ok('sin Google Fonts', !/fonts\.googleapis|fonts\.gstatic/.test(HTML));
    t.ok('fuentes propias, con la de texto precargada', /<link rel="stylesheet" href="\.\/fuentes\.css">/.test(cabeza)
      && /<link rel="preload" href="\.\/fuentes\/inter-latin-[0-9a-f]+\.woff2" as="font" type="font\/woff2" crossorigin>/.test(cabeza));
  }

  t.seccion('2 · las fuentes propias');
  {
    const css = leer('fuentes.css');
    const urls = [...css.matchAll(/url\(\.\/fuentes\/([^)]+\.woff2)\)/g)].map(m => m[1]);
    t.ok('fuentes.css declara las cuatro familias', ['Inter', 'Fraunces', 'JetBrains Mono', 'Space Grotesk'].every(f => css.includes("font-family: '" + f + "'")));
    t.ok('todas con font-display: swap (se lee el texto aunque la fuente tarde)', (css.match(/@font-face/g) || []).length === (css.match(/font-display: swap/g) || []).length);
    t.ok('cada archivo existe', urls.length >= 8 && urls.every(u => fs.existsSync(path.join(RAIZ, 'fuentes', u))));
    const precarga = (cabeza.match(/href="\.\/fuentes\/([^"]+)" as="font"/) || [])[1];
    t.ok('la precargada es una de las declaradas', urls.includes(precarga));
    const sw = leer('sw.js');
    t.ok('el service worker guarda fuentes.css y todas las fuentes (sin conexión siguen)', sw.includes("'./fuentes.css'") && urls.every(u => sw.includes("'./fuentes/" + u + "'")));
    const v = JSON.parse(leer('vercel.json'));
    const regla = (v.headers || []).find(h => h.source === '/fuentes/(.*)');
    t.ok('Vercel las sirve con caché larga', !!regla && regla.headers.some(h => /immutable/.test(h.value) && /max-age=31536000/.test(h.value)));
    t.ok('el libreto suelto usa las mismas fuentes', /new URL\('\.\/fuentes\.css', location\.href\)/.test(HTML));
  }

  t.seccion('3 · librerías bajo demanda');
  {
    const añadidos = [];
    const win = {};
    const doc = { createElement: () => ({}), head: { appendChild(s){ añadidos.push(s); } } };
    const M = montar([['const DDL_LIBS = {', '/* ── La velocidad real']], ['ddlLib', 'DDL_LIBS'], { PDFJS_VERSION: '3.11.174', window: win, document: doc, pdfjsLib: undefined });
    const a = M.ddlLib('pdf'), b = M.ddlLib('pdf');
    t.ok('dos peticiones a la vez → una sola descarga', a === b && añadidos.length === 1);
    t.ok('con su huella SRI y crossorigin', /^sha384-/.test(añadidos[0].integrity) && añadidos[0].crossOrigin === 'anonymous');
    t.ok('de la versión de pdf.js de siempre', añadidos[0].src.includes('/pdf.js/3.11.174/pdf.min.js'));
    win.pdfjsLib = { GlobalWorkerOptions: {} };
    añadidos[0].onload();
    const lib = await a;
    t.ok('al llegar, queda listo con su worker', lib === win.pdfjsLib && /pdf\.worker\.min\.js$/.test(win.pdfjsLib.GlobalWorkerOptions.workerSrc));
    await M.ddlLib('pdf');
    t.ok('ya bajada, no se vuelve a pedir', añadidos.length === 1);
    const c = M.ddlLib('mammoth');
    añadidos[1].onerror();
    let msg = '';
    try{ await c; }catch(e){ msg = e.message; }
    t.ok('sin conexión: aviso claro en castellano', /no se pudo bajar el lector de Word/.test(msg));
    M.ddlLib('mammoth');
    t.ok('… y se puede reintentar', añadidos.length === 3);
    t.ok('el PDF y el Word la piden al abrir', /await ddlLib\('pdf'\)/.test(HTML) && /await ddlLib\('mammoth'\)/.test(HTML));
    t.ok('el convertidor de QC y las herramientas también', /ddlLib\('pdf'\)/.test(leer('js/qcpdf.js')) && /ddlLib\('pdf'\)/.test(leer('js/dctools.js')));
  }

  t.seccion('4 · la base local se abre una vez');
  {
    let aperturas = 0;
    const idb = { open(){ aperturas++; const r = {}; setTimeout(() => { r.result = {}; r.onsuccess(); }, 0); return r; } };
    const M = montar([['let _idbP = null;', 'async function idbGet(k){']], ['idbOpen'], { indexedDB: idb });
    const d1 = await M.idbOpen(), d2 = await M.idbOpen();
    t.ok('dos usos → una apertura, la misma conexión', aperturas === 1 && d1 === d2);
    d1.onclose();
    await M.idbOpen();
    t.ok('si el navegador la cierra, se vuelve a abrir', aperturas === 2);
  }

  t.seccion('5 · sin llamadas duplicadas');
  {
    let nube = 0;
    const ctx = { currentEp: null, LDB: { showId: 's1' }, _regNubeVisto: {}, CAST_REG_NUBE_CADA: 60000, window: {},
      idbGet: async () => null, idbSet: async () => {}, castRegFusionar: (a, b) => b,
      castRegDeLaNube: async () => { nube++; await espera(); return { personajes: { ANA: { talento: 'X' } } }; } };
    const M = montar([['async function castRegCargar(showId){', 'async function castRegGuardar(showId, reg){']], ['castRegCargar'], ctx);
    const [r1, r2] = await Promise.all([M.castRegCargar('s1'), M.castRegCargar('s1')]);
    t.ok('el registro de un programa, pedido dos veces a la vez → una sola lectura de la nube', nube === 1);
    t.ok('… y cada quien recibe su copia (tocar una no cambia la otra)', r1 !== r2 && r1.personajes.ANA.talento === 'X' && r2.personajes.ANA.talento === 'X');
    const tci = leer('js/tcinicial.js');
    t.ok('el timecode inicial guardado tampoco se pide dos veces', /TCI\.enCurso\[k\]\) return TCI\.enCurso\[k\]/.test(tci));
  }

  t.seccion('6 · el buscador de Casting espera a que dejes de escribir');
  {
    const cv = leer('js/castingvistas.js');
    const ms = +((cv.match(/const CS_BUSCAR_MS = (\d+);/) || [])[1]);
    t.ok('espera un instante corto (no se nota, y no repinta en cada letra)', ms >= 100 && ms <= 300);
    t.ok('cada letra anula el repintado anterior', /clearTimeout\(CS\._tBuscar\)/.test(cv) && /CS\._tBuscar = setTimeout\(/.test(cv));
  }

  t.seccion('7 · portadas e imágenes');
  {
    t.ok('la portada se sube en WebP', /await imgWebp\(f, \d+\)/.test(HTML) && /'\/portada\.'\+ext/.test(HTML) && /'image\/webp'/.test(HTML));
    t.ok('las portadas de la biblioteca se cargan al verse', /class="dcov"[^>]*loading="lazy"/.test(HTML));
    t.ok('sin PNG en base64 dentro de la página', !/data:image\/png;base64,[A-Za-z0-9+/]{2000}/.test(HTML));
  }

  t.seccion('8 · la velocidad real, en el informe de fallos');
  {
    const ls = {};
    const M = montar([['function ddlVelocidadTexto(){', '/* Con la aplicación ya en pantalla']], ['ddlVelocidadTexto'],
      { localStorage: { getItem: (k) => ls[k] || null } });
    t.ok('sin medidas: lo dice', /aún sin medir/.test(M.ddlVelocidadTexto()));
    ls.ddl_velocidad = JSON.stringify([{ fcp: 900, lcp: 1500, carga: 3000, largas: 2, msLargas: 180, red: '4g', nucleos: 8 },
                                       { fcp: 1100, lcp: 1700, carga: 3400, largas: 4, msLargas: 300, red: '3g', nucleos: 8 },
                                       { fcp: 5000, lcp: 6000, carga: 9000, largas: 9, msLargas: 900, red: '3g', nucleos: 8 }]);
    const txt = M.ddlVelocidadTexto();
    t.ok('con medidas: la mediana, en segundos, y la red', /3 entradas/.test(txt) && /primer pintado 1,1 s/.test(txt) && /red 3g/.test(txt), txt);
    const informe = HTML.slice(HTML.indexOf('function falloInforme(){'), HTML.indexOf('function falloInforme(){') + 4000);
    t.ok('va en «Copiar» del informe de fallos', /ddlVelocidadTexto\(\)/.test(informe));
  }

  t.seccion('9 · índices en la base de datos');
  {
    const sql = leer('sql/mejora-07-indices.sql');
    t.ok('capítulos por programa', /create index if not exists episodes_show_id_idx\s+on public\.episodes \(show_id\)/.test(sql));
    t.ok('datos de capítulo por programa', /episode_data_show_id_idx\s+on public\.episode_data \(show_id\)/.test(sql));
    t.ok('se puede volver a pasar sin romper nada', !/create index (?!if not exists)/i.test(sql));
  }
};
