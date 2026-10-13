/* Producción Casting, como en DublajeCast · especificacion 09, PRO-42 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Casting: Producción Casting, como en DublajeCast';

const RAIZ = path.dirname(INDEX);

/* Hoy, 13/10/2026: las alertas cuentan desde aquí. */
const HOY = new Date(2026, 9, 13);
class FechaFija extends Date { constructor(...a){ if(a.length) super(...a); else super(HOY.getTime()); } static now(){ return HOY.getTime(); } }

function cargar(o){
  o = o || {};
  const V = { avisos: [], pintadas: 0, apuntes: [], datos: o.datos || {
    produccion: [
      { id: 1, programa: '100 DAYS OF DECEPTION', capitulo: 'Episodio 105', cliente: 'Netflix', director: 'SEBASTIAN', fecha_miami: '2026-10-14', formato_dubcard: 'BACKLOT', fecha_dubcard: '2026-10-14', fase: 'produccion_activa', desglose_provisional: true, casting_completo: true },
      { id: 2, programa: 'THE WAYANS BROS', capitulo: 'Episodio 215', cliente: 'DELUX', director: 'WILFREDO HUESO', fecha_miami: '2026-10-09', formato_dubcard: 'Excel', fecha_dubcard: '2026-10-09', fase: 'pre_produccion' },
      { id: 3, programa: 'EMPRESS OF FLAMES', capitulo: 'Episodio 106', cliente: 'Netflix', director: 'WILFREDO HUESO', fecha_miami: '2026-10-25', formato_dubcard: 'BACKLOT', fecha_dubcard: '2026-10-25', fase: 'pre_produccion' },
      { id: 4, programa: 'GAJAB RAAT', capitulo: 'Episodio 101', cliente: 'Netflix', director: 'DIEGO', fecha_miami: '2026-09-01', formato_dubcard: 'BACKLOT', fecha_dubcard: '2026-09-17', fase: 'completado' }
    ], clienteList: ['Netflix', 'DELUX', 'PIXELOGIC'], directorList: ['DIEGO'], team: [{ name: 'WILFREDO HUESO', role: 'Director' }, { name: 'SEBASTIAN', role: 'Director' }] } };
  const ctx = vm.createContext({
    console, Date: FechaFija, setTimeout: () => 0, clearTimeout(){}, setInterval: () => 0, clearInterval(){},
    localStorage: { _d: {}, getItem(k){ return k in this._d ? this._d[k] : null; }, setItem(k, v){ this._d[k] = String(v); }, removeItem(k){ delete this._d[k]; } },
    window: { dispatchEvent(){}, __cspSync: true }, Event: function(){},
    castAviso: (t) => V.avisos.push(t), csRepintar: () => { V.pintadas++; }, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    csDatos: () => ({ datos: V.datos }), csCabecera: (t, sub) => '<div class="cs-cab"><h2>' + t + '</h2><div class="cs-cab-sub">' + sub + '</div></div>',
    csEditar: async (cambio, que) => { const copia = JSON.parse(JSON.stringify(V.datos)); const r = cambio(copia); if(r){ V.datos = copia; V.apuntes.push(que); } return r ? 'guardado' : 'igual'; },
    dcxUid: (() => { let n = 100; return () => ++n; })(),
    fetch: o.fetch || (async () => { throw new Error('Failed to fetch'); }),
    XLSX: o.XLSX
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'csproduccion.js'), 'utf8') + ';this.CSP = CSP;', ctx);
  V.P = ctx.CSP; V.ctx = ctx;
  return V;
}
/* Los controles de lo pintado, como en las demás pruebas de Casting. */
function controles(html){
  const todos = [...html.matchAll(/<(input|button|select|th|div)\b[^>]*data-pc="([^"]+)"[^>]*>/g)].map(x => {
    const e = { tag: x[1], atrs: {}, value: '', getAttribute(k){ return k in this.atrs ? this.atrs[k] : null; } };
    for(const m of x[0].matchAll(/(data-[\w-]+|id)="([^"]*)"/g)) e.atrs[m[1]] = m[2];
    const v = x[0].match(/ value="([^"]*)"/); e.value = v ? v[1] : '';
    return e;
  });
  const raiz = { querySelectorAll: () => todos, querySelector: (s) => { const m = s.match(/^#(.+)$/); return m ? (todos.find(e => e.atrs.id === m[1]) || null) : null; } };
  return { raiz, de: (que, f) => todos.find(e => e.atrs['data-pc'] === que && (!f || Object.keys(f).every(k => e.atrs['data-' + k] === String(f[k])))) };
}
const espera = () => new Promise(r => setImmediate(r));

exports.pruebas = async function(t){
  t.seccion('1 · lo que se ve');
  {
    const V = cargar(), P = V.P;
    const h = P.html(V.datos, false);
    t.ok('cabecera con en curso, completados y total, y sus botones: Excel (subir y bajar) y Reset',
         /<h2>Producción Casting<\/h2>[\s\S]*?3 en curso[\s\S]*?1 completados[\s\S]*?4 total/.test(h) && ['importar', 'exportar', 'reset'].every(k => new RegExp('data-pc="' + k + '"').test(h)));
    t.ok('pestañas, buscador, filtros por cliente, director y alertas, y la leyenda de colores',
         /data-pc="tab" data-v="en_curso">En curso <b>3<\/b>/.test(h) && /data-pc="tab" data-v="completados">Completados <b>1<\/b>/.test(h) && /data-pc="buscar"/.test(h)
         && /data-c="cliente"><option value="">Todos los clientes/.test(h) && /data-c="director"><option value="">Todos los directores/.test(h) && /data-c="alerta"/.test(h) && /Vencida \(muestra días\)/.test(h));
    t.ok('las columnas de DublajeCast, sin las casillas de desglose ni de casting', /Programa \/ cap\.[\s\S]*?Cliente[\s\S]*?Director[\s\S]*?Entrega Miami[\s\S]*?Formato DUBCARD[\s\S]*?Entrega DUBCARD/.test(h) && !/Desglose|>Casting</.test(h) && !/desglose_provisional|casting_completo/.test(h));
    t.ok('preproducción y producción activa, cada una con lo suyo', /Preproducción <i>\(2\)<\/i>[\s\S]*?Producción activa <i>\(1\)<\/i>/.test(h));
    t.ok('en producción activa, Miami ya entregada; y «Finalizar»; en preproducción, «Iniciar»', /Entregada<\/span>/.test(h) && /data-pc="fase" data-id="1"[^>]*>[\s\S]*?<span>Finalizar/.test(h) && /data-pc="fase" data-id="2"[^>]*>[\s\S]*?<span>Iniciar/.test(h));
    t.eq('el color de cada fila por sus alertas: vencida, DUBCARD urgente, sin alerta, completada', [2, 1, 3, 4].map(id => P.colorFila(Object.assign({ fase: 'pre_produccion' }, V.datos.produccion.find(r => r.id === id)), id === 4)).join(' '), 'cp-fila-vencida cp-fila-dubcard cp-fila-normal cp-fila-hecha');
    t.ok('y el botón flotante «Nuevo»', /<button class="cp-nuevo" data-pc="nuevo"/.test(h));
    P.ST.tab = 'completados';
    const hc = P.html(V.datos, false);
    t.ok('los completados, de solo lectura, con «Reabrir»', /Archivo · solo lectura \(1\)/.test(hc) && /data-pc="reabrir" data-id="4"/.test(hc) && !/data-pc="txt" data-id="4"/.test(hc));
    P.ST.tab = 'en_curso';
  }

  t.seccion('2 · buscar, filtrar y ordenar');
  {
    const V = cargar(), P = V.P, rows = P.filas(V.datos).filter(r => r.fase !== 'completado');
    const ids = () => P.aplicar(rows).map(r => r.id).join(',');
    P.ST.buscar = 'wayans'; t.eq('buscar por programa, capítulo, cliente o director', ids(), '2');
    P.ST.buscar = 'hueso'; t.eq('también por director', ids(), '2,3');
    P.ST.buscar = ''; P.ST.cliente = 'Netflix'; t.eq('por cliente', ids(), '1,3');
    P.ST.cliente = ''; P.ST.alerta = 'vencida'; t.eq('solo vencidas', ids(), '2');
    P.ST.alerta = 'urgente'; t.eq('solo urgentes (menos de 3 días)', ids(), '1');
    P.ST.alerta = ''; P.ST.sortBy = 'programa'; P.ST.sortDir = 'desc'; t.eq('ordenar por una columna, y al revés', ids(), '2,3,1');
    P.ST.sortBy = null; P.ST.sortDir = 'asc';
  }

  t.seccion('3 · las funciones, guardadas en DublajeCast');
  {
    const V = cargar(), P = V.P;
    let c = controles(P.html(V.datos, false));
    P.cablear(c.raiz);
    c.de('nuevo').onclick(); await espera();
    t.ok('«Nuevo» añade un registro en preproducción', V.datos.produccion.length === 5 && V.datos.produccion[0].fase === 'pre_produccion' && V.datos.produccion[0].formato_dubcard === 'Excel');
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    const cli = c.de('sel', { id: 2, c: 'cliente' }); cli.value = 'Netflix'; cli.onchange(); await espera();
    t.eq('cambiar el cliente a Netflix pone la DUBCARD en BACKLOT, como en DublajeCast', JSON.stringify(V.datos.produccion.find(r => r.id === 2), ['cliente', 'formato_dubcard']), '{"cliente":"Netflix","formato_dubcard":"BACKLOT"}');
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    const prog = c.de('txt', { id: 3, c: 'capitulo' }); prog.value = 'Episodio 107 '; prog.onchange(); await espera();
    t.eq('programa y capítulo se editan en la tabla', V.datos.produccion.find(r => r.id === 3).capitulo, 'Episodio 107');
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    const f = c.de('fecha', { id: 3, c: 'fecha_dubcard' }); f.value = '2026-10-30'; f.onchange(); await espera();
    t.eq('y las fechas', V.datos.produccion.find(r => r.id === 3).fecha_dubcard, '2026-10-30');
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    c.de('fase', { id: 3 }).onclick(); await espera();
    t.eq('«Iniciar» la pasa a producción activa (Miami entregada)', V.datos.produccion.find(r => r.id === 3).fase, 'produccion_activa');
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    c.de('fase', { id: 3 }).onclick(); await espera();
    t.eq('y «Finalizar», a completados', V.datos.produccion.find(r => r.id === 3).fase, 'completado');
    P.ST.tab = 'completados'; c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    c.de('reabrir', { id: 3 }).onclick(); await espera();
    t.eq('«Reabrir» la devuelve a producción activa y a «En curso»', V.datos.produccion.find(r => r.id === 3).fase + ' ' + P.ST.tab, 'produccion_activa en_curso');
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    await c.de('borrar', { id: 2 }).onclick(); await espera();
    t.ok('eliminar un registro', !V.datos.produccion.some(r => r.id === 2));
    t.ok('cada cambio se guarda en DublajeCast y se apunta lo importante', V.apuntes.includes('Producción: registro nuevo') && V.apuntes.some(a => /^Producción: finalizado EMPRESS OF FLAMES/.test(a)));
  }
  {
    const V = cargar(), P = V.P;
    let c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    c.de('lista', { v: 'director' }).onclick();
    t.eq('la lista de directores, para gestionarla', P.ST.listaItems.join(','), 'DIEGO');
    let h = P.html(V.datos, false);
    t.ok('en una ventana flotante', /<div class="cs-tr-ov" data-pc="fondo">[\s\S]*?Lista de directores/.test(h));
    c = controles(h); c.raiz.querySelector = (s) => s === '#cpListaNuevo' ? { value: 'ANGELO SALAZAR' } : null; P.cablear(c.raiz);
    c.de('listaAdd').onclick();
    c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    c.de('listaGuardar').onclick(); await espera();
    t.eq('añadir y guardar', V.datos.directorList.join(','), 'DIEGO,ANGELO SALAZAR');
    t.ok('el director nuevo sale para elegir, junto al equipo', /<option value="ANGELO SALAZAR">/.test(P.html(V.datos, false)) && /<option value="SEBASTIAN"/.test(P.html(V.datos, false)));
  }
  {
    const V = cargar(), P = V.P;
    let c = controles(P.html(V.datos, false)); P.cablear(c.raiz);
    await c.de('reset').onclick(); await espera();
    t.eq('«Reset» limpia todo, preguntando antes', V.datos.produccion.length, 0);
  }

  t.seccion('4 · sin API externa ni «Sincronizar fechas» (pedido de sala)');
  {
    const V = cargar(), P = V.P;
    const h = P.html(V.datos, false);
    t.ok('ni el botón de la API ni el de sincronizar fechas', !/data-pc="(api|sincronizar)"/.test(h) && !/API|Sincronizar/.test(h));
    t.ok('ni su código: nada llama fuera', !/fetch\(|computeExternalUpdates|arrancarSync|dc_ext_api_cfg/.test(fs.readFileSync(path.join(RAIZ, 'js', 'csproduccion.js'), 'utf8')) && !('sincronizar' in P));
  }

  t.seccion('4b · guardar se ve al instante (pedido de sala: «está un poco lento»)');
  {
    const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
    const trozo = CV.slice(CV.indexOf('let CS_COLA'), CV.indexOf('/* ── Nombres, el cambiador de talento'));
    const montarEd = () => {
      const W = { pintado: [], avisos: [], llamadas: [], esperas: [] };
      W.ctx = vm.createContext({
        dcast: { sesion: { id: 'u' }, payload: { produccion: [{ id: 1, fase: 'pre_produccion' }] } },
        PROD: { datos: { produccion: [{ id: 1, fase: 'pre_produccion' }], historialDubbipt: ['h'] } }, DCX: { escrito: 0 },
        prodNormalizar: (x) => x, castAviso: (t) => W.avisos.push(t), dcxEntrada: (x) => x, dcPanel(){},
        csRepintar: () => W.pintado.push(JSON.stringify(W.ctx.PROD.datos.produccion)),
        dcxGuardar: (cambio) => new Promise((ok, mal) => { W.llamadas.push(cambio); W.esperas.push({ ok, mal }); })
      });
      vm.runInContext(trozo + ';this.csEditar = csEditar;', W.ctx);
      return W;
    };
    const fase = (c) => (c.PROD.datos.produccion[0] || {}).fase;
    const W = montarEd();
    const r1 = W.ctx.csEditar(p => { p.produccion[0].fase = 'completado'; return true; }, 'Producción: finalizado');
    t.eq('al pulsar, ya se ve (antes de que DublajeCast conteste)', fase(W.ctx) + ' ' + W.pintado.length, 'completado 1');
    t.ok('lo propio de Dubbipt (quién cambió qué) no se pierde al pintar antes', W.ctx.PROD.datos.historialDubbipt && W.ctx.PROD.datos.historialDubbipt[0] === 'h');
    W.ctx.csEditar(p => { p.produccion[0].director = 'DIEGO'; return true; }, 'Director');
    await espera();
    t.eq('dos cambios seguidos: van en fila, no «espera un momento»', W.llamadas.length, 1);
    W.esperas[0].ok({ cambiado: true }); t.eq('el primero, guardado', await r1, 'guardado');
    await espera(); await espera();
    t.eq('y entonces va el segundo', W.llamadas.length, 2);
    const X = montarEd();
    const r2 = X.ctx.csEditar(p => { p.produccion[0].fase = 'completado'; return true; }, 'x');
    await espera(); X.esperas[0].mal(new Error('sin red'));
    t.eq('si no se pudo guardar, vuelve a lo de antes y lo dice', (await r2) + ' ' + fase(X.ctx) + ' ' + /sin red/.test(X.avisos[0]), 'error pre_produccion true');
    const Y = montarEd(); Y.ctx.dcast.payload = null;
    Y.ctx.csEditar(p => { p.produccion[0].fase = 'completado'; return true; }, 'x');
    t.eq('sin copia leída todavía, espera a guardar (como antes)', fase(Y.ctx) + ' ' + Y.pintado.length, 'pre_produccion 0');
  }

  t.seccion('5 · dónde está');
  const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
  t.ok('el archivo, cargado y en la caché', /<script src="\.\/js\/csproduccion\.js"><\/script>/.test(HTML) && /'\.\/js\/csproduccion\.js'/.test(SW));
  t.ok('la sección Producción de Casting es esta', /case 'produccion': return \(datos && typeof CSP !== 'undefined'[^\n]*CSP\.html\(datos, vivo\)/.test(CV) && /CSP\.cablear\(vista\)/.test(CV));
  const CSPJS = fs.readFileSync(path.join(RAIZ, 'js', 'csproduccion.js'), 'utf8');
  t.ok('sin React', !/React\.|useState|useMemo/.test(CSPJS));
};
