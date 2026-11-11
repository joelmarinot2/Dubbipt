/* El tema «vidrio», en claro y en oscuro · especificacion 07, ENT-26
 *
 * Pedido de sala: «quiero cambiar la interfaz gráfica general a esta» (un
 * panel de vidrio claro: fondo pastel, tarjetas blancas redondeadas, barra y
 * cabeceras en verde petróleo, acentos menta y durazno) y «también haz una
 * interfaz dark».
 *
 * El tema es una CAPA sobre el CSS de siempre: herramientas/tema.js recorre
 * cada regla y escribe la misma solo con sus colores, convertidos. Lo que
 * protege esta prueba: que el conversor da colores legibles (tinta oscura
 * sobre claro, blanco sobre un relleno), que las dos capas generadas están AL
 * DÍA con el CSS de index.html (si alguien toca un color y no regenera, se
 * dice), que el botón cambia de tema y se recuerda, que el libreto —otro
 * documento— recibe su paleta y sigue al tema, y que todo se carga y queda en
 * la caché para trabajar sin conexión.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'El tema «vidrio»: claro y oscuro';

const RAIZ = path.dirname(INDEX);
const T = require(path.join(RAIZ, 'js', 'tema.js'));
const G = require(path.join(RAIZ, 'herramientas', 'tema.js'));

/* Claridad relativa y contraste (WCAG), para comprobar que se lee. */
const lum = (hex) => { const c = T.leerColor(hex); const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const contraste = (a, b) => { const x = lum(a), y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
const conv = (hex, uso, modo) => T.convertir(T.leerColor(hex), uso, modo);

exports.pruebas = function(t){
  t.seccion('1 · el conversor, en claro');
  const fondo = conv('#15171a', 'fondo'), tinta = conv('#f2f3f5', 'texto'), tenue = conv('#8b8f97', 'texto'), linea = conv('#2c3036', 'borde');
  t.ok('un fondo oscuro pasa a superficie casi blanca, y el texto claro a tinta oscura que se lee', lum(fondo) > 0.9 && contraste(tinta, fondo) > 10, fondo + ' ' + tinta);
  t.ok('el texto tenue sigue leyéndose sobre blanco', contraste(tenue, fondo) >= 4.5, tenue + ' ' + contraste(tenue, fondo).toFixed(2));
  t.ok('las líneas quedan más oscuras que la superficie, sin ser negras', lum(linea) < lum(fondo) && lum(linea) > 0.5, linea);
  const relleno = conv('#22C55E', 'fondo'), acento = conv('#4ADE80', 'texto');
  t.ok('el verde de la marca: relleno esmeralda donde el blanco se lee, y texto esmeralda que se lee sobre blanco', contraste('#ffffff', relleno) >= 4.5 && contraste(acento, fondo) >= 4.5, relleno + ' ' + acento);
  t.eq('un botón de color con su texto: el texto, en blanco', T.capa('.b{background:#22C55E;color:#06210f}', 'claro').trim(), '.b{background:' + relleno + ';color:#ffffff}');
  t.ok('un fondo claro (un botón blanco) pasa a relleno petróleo, y su texto a blanco', lum(conv('#ffffff', 'fondo')) < 0.05 && /color:#ffffff/.test(T.capa('.b{background:#fff;color:#111}', 'claro')));
  t.ok('ámbar, rojo y violeta: el mismo tono, oscurecido para leerse sobre blanco', ['#fbbf24', '#f87171', '#a78bfa'].every(c => contraste(conv(c, 'texto'), fondo) >= 3.6), ['#fbbf24', '#f87171', '#a78bfa'].map(c => conv(c, 'texto')).join(' '));
  t.ok('la sombra negra se suaviza; un brillo blanco sigue blanco', /rgba\(\d+,\d+,\d+,0\.15\)/.test(conv('rgba(0,0,0,.5)', 'sombra')) && conv('rgba(255,255,255,.08)', 'sombra') === 'rgba(255,255,255,0.08)');
  t.eq('con transparencia: se conserva', /,0\.3\)$/.test(conv('rgba(74,222,128,.30)', 'borde')), true);
  t.eq('los violetas apagados del tema viejo eran sus neutros', [T.familia(T.aHsl(0x19, 0x12, 0x38)), T.familia(T.aHsl(0xEC, 0xE9, 0xFB)), T.familia(T.aHsl(0xA7, 0x8B, 0xFA))].join(','), 'neutro,neutro,otro');

  t.seccion('2 · el conversor, en oscuro');
  const oFondo = conv('#15171a', 'fondo', 'oscuro'), oVerde = conv('#4ADE80', 'texto', 'oscuro');
  t.ok('las claridades de siempre, teñidas de verde petróleo', Math.abs(lum(oFondo) - lum('#15171a')) < 0.01 && T.aHsl(...Object.values(T.leerColor(oFondo)).slice(0, 3)).h > 150, oFondo);
  t.ok('el verde pasa a menta, igual de claro', T.aHsl(...Object.values(T.leerColor(oVerde)).slice(0, 3)).h > 155 && lum(oVerde) > 0.4, oVerde);
  t.eq('lo que no cambia no se repite', T.capa('.a{color:#f87171;padding:4px}', 'oscuro'), '');

  t.seccion('3 · la capa');
  t.eq('solo las declaraciones con color, con su !important', T.capa('.a{padding:4px;color:#f2f3f5 !important;border-radius:9px}', 'claro').trim(), '.a{color:' + tinta + ' !important}');
  t.eq('las reglas sin color no salen; las @media sí, con lo suyo', T.capa('.a{padding:4px} @media(max-width:600px){ .a{margin:0} .b{color:#f2f3f5} }', 'claro').replace(/\s+/g, ' ').trim(), '@media(max-width:600px){ .b{color:' + tinta + '} }');
  t.eq('una imagen incrustada no se repite', T.capa('.a{background:#101215 url(data:image/png;base64,AAAA) no-repeat}', 'claro'), '');
  t.ok('el Video Estudio es un panel oscuro en los dos temas', /^#stStage\{background:#0[0-9a-f]{5}\}/.test(T.capa('#stStage{background:#0b0718}', 'claro', { oscuroSi: G.ESTUDIO }))
       && G.ESTUDIO.test('.st-btn:hover') && G.ESTUDIO.test('body .adr-ficha') && !G.ESTUDIO.test('.stat b') && !G.ESTUDIO.test('.cs-estado'));
  t.eq('con prefijo: cada selector, atado a su tema', T.capa(':root{--bg:#0b0c0e} .a,.b:hover{color:#f2f3f5}', 'claro', { prefijo: 'html[data-tema="claro"]' }).split('\n').map(x => x.split('{')[0]).join(' | '),
       'html[data-tema="claro"] | html[data-tema="claro"] .a,html[data-tema="claro"] .b:hover | ');
  t.ok('lo que el código inyecta lleva sus dos capas', /html\[data-tema="claro"\] #x\{/.test(T.temaDosCapas('#x{background:#111316}')) && /html\[data-tema="oscuro"\] #x\{/.test(T.temaDosCapas('#x{background:#111316}')));

  t.seccion('4 · las capas generadas, al día');
  for(const modo of ['claro', 'oscuro']){
    const hay = fs.existsSync(G.SALIDAS[modo]) ? fs.readFileSync(G.SALIDAS[modo], 'utf8') : '';
    t.ok(path.basename(G.SALIDAS[modo]) + ' sale tal cual de herramientas/tema.js (si no: `node herramientas/tema.js`)', hay === G.generar(modo));
  }
  const claro = fs.readFileSync(G.SALIDAS.claro, 'utf8');
  t.ok('lleva las variables de siempre convertidas y los colores escritos en style="…" por el código', /^:root\{--bg:#f[0-9a-f]{5};--panel:#f[0-9a-f]{5};/m.test(claro) && /\[style\*="color:#ECE9FB"\]\{color:#[0-9a-f]{6} !important\}/.test(claro));
  t.ok('sin imágenes incrustadas (no se repiten los logos)', !/url\(data:/.test(claro) && claro.length < 120000);

  t.seccion('5 · el botón: claro u oscuro, y se recuerda');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  const guion = HTML.slice(HTML.indexOf('/** Pone el tema («claro» u «oscuro»)'), HTML.indexOf('</script>', HTML.indexOf('/** Pone el tema («claro» u «oscuro»)')));
  const mk = (guardado) => {
    const ls = guardado ? { ddl_tema: guardado } : {};
    const el = (id) => ({ id: id, media: '', attrs: {}, innerHTML: '', title: '', setAttribute(k, v){ this.attrs[k] = v; }, click(){ this.clics = (this.clics || 0) + 1; } });
    const els = { temaClaro: el('temaClaro'), temaOscuro: el('temaOscuro'), btnTema: el('btnTema') };
    const html = { attrs: {}, setAttribute(k, v){ this.attrs[k] = v; }, getAttribute(k){ return this.attrs[k]; } };
    const avisos = [];
    const ctx = vm.createContext({ localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); } },
      document: { getElementById: (id) => els[id] || null, documentElement: html, querySelector: () => null, addEventListener(){} }, DDL_UI: { toast: (x) => avisos.push(x) } });
    vm.runInContext(guion + ';this.F = { temaPoner, temaActual, temaCambiar, temaBoton, temaPintarBoton, temaAlLibreto, temaVestir };', ctx);
    return { F: ctx.F, els, html, ls, avisos, ctx };
  };
  let V = mk(null);
  t.eq('sin nada guardado: el claro, con su capa puesta y la otra apagada', [V.html.attrs['data-tema'], V.els.temaClaro.media, V.els.temaOscuro.media].join(' | '), 'claro | all | not all');
  t.eq('el botón pasa al oscuro, lo guarda y lo dice', [V.F.temaBoton(), V.html.attrs['data-tema'], V.els.temaClaro.media, V.els.temaOscuro.media, V.ls.ddl_tema, V.avisos[0]].join(' | '), 'oscuro | oscuro | not all | all | oscuro | Tema oscuro');
  t.ok('y su dibujo cambia: el sol para volver al claro', /circle cx="12" cy="12" r="4"/.test(V.els.btnTema.innerHTML) && V.els.btnTema.title === 'Cambiar al tema claro');
  V = mk('oscuro');
  t.eq('al volver a entrar, el guardado', [V.html.attrs['data-tema'], V.els.temaOscuro.media].join(' | '), 'oscuro | all');
  V = mk('cualquier cosa');
  t.eq('un valor raro guardado: el claro', V.html.attrs['data-tema'], 'claro');
  {
    const W = mk('claro');
    const lTheme = { click(){ this.clics = (this.clics || 0) + 1; } }, raiz = { attrs: {}, setAttribute(k, v){ this.attrs[k] = v; } };
    W.ctx.pop2 = { theme: 'dark', doc: { documentElement: raiz, getElementById: (id) => (id === 'lTheme' ? lTheme : null) } };
    W.F.temaAlLibreto();
    t.eq('el libreto abierto sigue al tema: con el claro, a su modo claro', [raiz.attrs['data-tema'], lTheme.clics].join(' | '), 'claro | 1');
    W.ctx.pop2.theme = 'light'; W.F.temaAlLibreto();
    t.eq('si ya está en su modo, no se toca', lTheme.clics, 1);
  }

  t.seccion('6 · cableado');
  t.ok('las tres hojas después del CSS de siempre, y el módulo', /<link rel="stylesheet" href="\.\/tema-claro-auto\.css" id="temaClaro">\s*<link rel="stylesheet" href="\.\/tema-oscuro-auto\.css" id="temaOscuro" media="not all">\s*<link rel="stylesheet" href="\.\/tema-vidrio\.css" id="temaVidrio">/.test(HTML)
       && HTML.lastIndexOf('</style>', HTML.indexOf('id="temaClaro"')) > HTML.indexOf('<style>') && /<script src="\.\/js\/tema\.js"><\/script>/.test(HTML));
  t.ok('el botón, en la barra', /<button class="tb-icon" id="btnTema" onclick="temaBoton\(\)"/.test(HTML));
  t.ok('el libreto recibe su paleta y arranca en el modo del tema', /st3\.textContent = temaLibretoCss\(LIB_CSS \+ '\\n' \+ LIB_OVERRIDE\)/.test(HTML) && /pop2\.theme = temaActual\(\) === 'claro' \? 'light' : 'dark';/.test(HTML));
  t.ok('la paleta del libreto: sus colores en menta y petróleo, y la barra de arriba en petróleo', /html body \.lh\{ background:linear-gradient\(180deg,#143c36,#0c2b27\) !important;/.test(T.temaLibretoCss('.x{color:#4ADE80}')) && /^\.x\{color:#[0-9a-f]{6}\}/.test(T.temaLibretoCss('.x{color:#4ADE80}')));
  t.ok('lo que se inyecta en la ventana principal y la ventana de karaoke, también', (HTML.match(/document\.head\.appendChild\(temaVestir\(st\)\)/g) || []).length === 2 && /temaCapa\(KARWIN_CSS, 'oscuro'\)/.test(HTML));
  const SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('todo queda en la caché, para trabajar sin conexión', ["'./js/tema.js'", "'./tema-claro-auto.css'", "'./tema-oscuro-auto.css'", "'./tema-vidrio.css'"].every(x => SW.indexOf(x) > 0));
  const MANO = fs.readFileSync(path.join(RAIZ, 'tema-vidrio.css'), 'utf8');
  t.ok('lo que va a mano vale para los dos temas: las formas en html[data-tema], los colores en variables de cada uno', /html\[data-tema="claro"\]\{[\s\S]*?--tv-fondo:/.test(MANO) && /html\[data-tema="oscuro"\]\{[\s\S]*?--tv-fondo:/.test(MANO)
       && /html\[data-tema\] #topbar\{/.test(MANO) && /html\[data-tema\] #csNav\{/.test(MANO) && !/html\[data-tema="claro"\] [#.]/.test(MANO));
  t.ok('sin desenfoque en cada tarjeta (una tablet de sala no puede con decenas)', !/html\[data-tema\] \.card,[\s\S]{0,900}backdrop-filter:blur/.test(MANO.slice(MANO.indexOf('/* ── Las superficies'), MANO.indexOf('html[data-tema] .fcard:hover'))));
};
