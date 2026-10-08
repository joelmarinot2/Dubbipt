/* La salud del servidor, y no cargarlo de más · especificacion 06, SYN-18 y SYN-19 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX, RAIZ } = require('./ayuda');

exports.nombre = 'Nube: la salud del servidor, y no cargarlo de más';

const R_SALUD = ['/* ═══ LA SALUD DEL SERVIDOR', '/* ═══ FIN DE LA SALUD DEL SERVIDOR'];
const EXPORTA = ['SALUD', 'SALUD_UMBRAL', 'saludEsDelServidor', 'saludEspera', 'saludNota', 'saludFallo', 'saludBien', 'saludPausa', 'saludProbar', 'saludSano', 'saludPintar'];

/** Un documento mínimo: lo justo para el aviso. */
function documento(){
  const els = {};
  const el = (tag) => ({ tag, id: '', className: '', _html: '', attrs: {}, disabled: false, textContent: '',
    setAttribute(k, v){ this.attrs[k] = v; }, remove(){ delete els[this.id]; },
    set innerHTML(h){ this._html = h; this._boton = /id="saludProbar"/.test(h) ? { onclick: null, disabled: false, textContent: 'Probar ahora' } : null; },
    get innerHTML(){ return this._html; },
    querySelector(sel){ return sel === '#saludProbar' ? this._boton : null; } });
  return { els, getElementById: (id) => els[id] || null, createElement: (t) => el(t),
           body: { appendChild: (e) => { els[e.id] = e; } } };
}

function armar(o){
  o = o || {};
  const diario = [], esperas = [];
  const doc = documento();
  const respuestas = o.respuestas || [];
  const ctx = {
    window: { SUPA: { url: 'https://x.supabase.co', anonKey: 'clave' } }, document: doc,
    navigator: { onLine: ('enLinea' in o) ? o.enLinea : true },
    setTimeout: (f, ms) => { esperas.push(ms); return esperas.length; }, clearTimeout: () => {},
    AbortController: function(){ this.signal = {}; this.abort = () => {}; },
    fetch: async (url, op) => { diario.push('fetch ' + url.replace('https://x.supabase.co', '') + ' ' + op.headers.apikey); const r = respuestas.shift(); if(r instanceof Error) throw r; return r || { ok: true, status: 200 }; },
    DDL_UI: { toast: (t) => diario.push('toast ' + t) },
    libAutoRefresh: () => diario.push('libAutoRefresh'), _libAutoAt: 99
  };
  const M = montar([R_SALUD], EXPORTA, ctx);
  return { M, diario, esperas, doc };
}

exports.pruebas = async function(t){
  t.seccion('1 · qué fallo es del servidor');
  const { M } = armar();
  t.eq('un 5xx, sí; un 4xx (permiso, sesión), no', [{ status: 504 }, { status: 522 }, { status: 401 }, { status: 404 }, { error: { status: 503 } }].map(M.saludEsDelServidor).join(' '), 'true true false false true');
  t.eq('por el mensaje: gateway, tiempo agotado, upstream', [new Error('Gateway Timeout'), { message: 'upstream request timeout' }, { message: 'canceling statement due to statement timeout' }, { message: 'duplicate key' }].map(M.saludEsDelServidor).join(' '), 'true true true false');
  t.eq('«failed to fetch» es del servidor solo si este equipo tiene red', M.saludEsDelServidor(new TypeError('Failed to fetch')) + ' ' + armar({ enLinea: false }).M.saludEsDelServidor(new TypeError('Failed to fetch')), 'true false');
  t.eq('nada, no', M.saludEsDelServidor(null), false);
  t.eq('cada prueba espera el doble: 15 s, 30 s, 1 min… hasta 5 min', [1, 2, 3, 4, 5, 6, 9].map(M.saludEspera).join(' '), '15000 30000 60000 120000 240000 300000 300000');

  t.seccion('2 · darlo por caído, y dejar de insistir');
  {
    const A = armar();
    t.eq('un fallo solo no basta', A.M.saludNota({ status: 504, error: { message: 'x' } }) + ' ' + A.M.saludPausa(), 'false false');
    t.eq('una respuesta buena en medio lo pone a cero', (A.M.saludNota({ status: 200, data: [] }), A.M.SALUD.fallos), 0);
    A.M.saludNota({ status: 504 }); A.M.saludNota({ status: 522 });
    t.eq('dos seguidos: caído, se deja de insistir', A.M.saludPausa() + ' ' + A.M.SALUD_UMBRAL, 'true 2');
    t.eq('y se programa la primera prueba a los 15 s', A.esperas.join(','), '15000');
    const aviso = A.doc.getElementById('saludAviso');
    t.ok('el aviso, encima de todo y con icono de trazo', aviso && /ddl-encima/.test(aviso.className) && /^<svg /.test(aviso.innerHTML) && /El servidor de Dubbipt no responde ahora mismo\.<\/b> Lo que hagas se queda en este equipo y se sube cuando vuelva\./.test(aviso.innerHTML) && /id="saludProbar"/.test(aviso.innerHTML));
    t.ok('sin emojis', !/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(aviso.innerHTML));
    A.M.saludNota({ status: 504 });
    t.eq('más fallos no vuelven a programar ni a pintar dos avisos', A.esperas.length + ' ' + Object.keys(A.doc.els).length, '1 1');
  }

  t.seccion('3 · volver a probar, solo');
  {
    const A = armar({ respuestas: [{ ok: false, status: 504 }, { ok: true, status: 200 }, { status: 522 }] });
    A.M.saludFallo(); A.M.saludFallo();
    t.eq('si el inicio de sesión no contesta, sigue caído y espera el doble', (await A.M.saludProbar()) + ' ' + A.esperas.filter(x => x !== 12000).join(','), 'false 15000,30000');
    t.ok('y cada consulta de prueba se corta a los 12 s, para no quedarse colgada', A.esperas.includes(12000));
    t.eq('si contesta pero la base de datos no, también', (await A.M.saludProbar()) + ' ' + A.esperas.filter(x => x !== 12000).join(','), 'false 15000,30000,60000');
    t.ok('la prueba es mínima y con la clave pública', A.diario.filter(x => /^fetch/.test(x)).join(' | ') === 'fetch /auth/v1/health clave | fetch /auth/v1/health clave | fetch /rest/v1/shows?select=id&limit=1 clave');
  }
  {
    const A = armar({ respuestas: [{ ok: true, status: 200 }, { ok: true, status: 200 }] });
    A.M.saludFallo(); A.M.saludFallo();
    t.eq('al volver: deja de estar caído', (await A.M.saludProbar()) + ' ' + A.M.saludPausa(), 'true false');
    t.eq('quita el aviso, lo dice y se pone al día una vez', !A.doc.getElementById('saludAviso') + ' · ' + A.diario.filter(x => !/^fetch/.test(x)).join(','), 'true · toast El servidor vuelve a responder,libAutoRefresh');
    t.eq('bien otra vez no repite nada', A.M.saludBien() + ' ' + A.diario.filter(x => x === 'libAutoRefresh').length, 'false 1');
  }
  {
    const A = armar({ respuestas: [new Error('Failed to fetch')] });
    t.eq('una prueba que revienta cuenta como no', await A.M.saludSano(), false);
    const B = armar(); B.M.saludFallo(); B.M.saludFallo();
    const boton = B.doc.getElementById('saludAviso').querySelector('#saludProbar');
    await boton.onclick();
    t.ok('«Probar ahora» prueba en el momento y, si responde, quita el aviso', !B.M.saludPausa() && !B.doc.getElementById('saludAviso'));
  }

  t.seccion('4 · Dubbipt no carga el servidor de más');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  const SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('el vigía, cargado y en la caché', /<script src="\.\/js\/salud\.js"><\/script>/.test(HTML) && /'\.\/js\/salud\.js'/.test(SW));
  t.ok('la biblioteca cuenta para la salud del servidor', /if\(typeof saludNota === 'function'\)\{ saludNota\(sh\); saludNota\(ep\); \}/.test(HTML));
  t.ok('el repaso de la biblioteca: cada 2 min y no 45 s', /if\(_ddlTick % 2400 === 0\)\{ try\{ if\(typeof libAutoRefresh==='function'\) libAutoRefresh\(\); \}catch\(e\)\{\} \}/.test(HTML) && !/_ddlTick % 900 === 0/.test(HTML));
  t.ok('ni con la pestaña escondida ni con el servidor caído', /async function libAutoRefresh\(\)\{\s+if\(!sb \|\| !sbUser\) return;[\s\S]{0,200}if\(typeof document !== 'undefined' && document\.hidden\) return;\s+if\(typeof saludPausa === 'function' && saludPausa\(\)\) return;/.test(HTML));
  t.ok('al pintar, el repaso de fondo cada 30 s y no 5', /Date\.now\(\) - _libLastBg > 30000 && !\(typeof saludPausa === 'function' && saludPausa\(\)\)/.test(HTML) && !/_libLastBg > 5000/.test(HTML));
  t.ok('el capítulo abierto se mira con sus columnas, no entero', /sb\.from\('episodes'\)\.select\('id,show_id,name,xls_path,pdf_path,xls_name,pdf_name'\)\.eq\('id', currentEp\.id\)\.single\(\)/.test(HTML) && !/sb\.from\('episodes'\)\.select\('\*'\)\.eq\('id', currentEp\.id\)/.test(HTML));
  t.ok('la biblioteca en vivo se reintenta cada vez más despacio, hasta 2 min, y no con el servidor caído',
       /LIBRT\.on = false; LIBRT\.busy = false; LIBRT\.fallos\+\+;[\s\S]{0,200}LIBRT\.next = Date\.now\(\) \+ Math\.min\(120000, 2000 \* Math\.pow\(2, LIBRT\.fallos - 1\)\);/.test(HTML)
       && /LIBRT\.next = 0; LIBRT\.fallos = 0;/.test(HTML) && /&& !\(typeof saludPausa === 'function' && saludPausa\(\)\)\) libRealtimeStart\(\);/.test(HTML));
  t.ok('la presencia, igual: ya no cada 4 s para siempre', /setTimeout\(onlineConnect, onlineEspera\(online\.fallosG\)\)/.test(HTML) && /onlineJoinWs\(\); \}, onlineEspera\(online\.fallosW\)\)/.test(HTML) && !/setTimeout\(onlineConnect, 4000\)/.test(HTML));
  {
    const O = montar([['function onlineEspera(fallos){', 'function onlineConnect(){']], ['onlineEspera'], { saludPausa: () => caido });
    var caido = false;
    t.eq('la espera de la presencia: 4 s, 8 s, 16 s… hasta 2 min', [1, 2, 3, 4, 5, 6].map(O.onlineEspera).join(' '), '4000 8000 16000 32000 64000 120000');
    caido = true;
    t.eq('con el servidor caído, 2 min directamente', O.onlineEspera(1), 120000);
  }
  {
    /* Los avisos de otros equipos: se juntan, cada pantalla a su momento, y no con la pestaña escondida. */
    const diario = [], esperas = [];
    let escondida = false;
    const P = montar([['const LIBPING = {', 'let _libAutoAt = 0;']], ['LIBPING', 'onLibPing', 'libPingAtender'], {
      document: { get hidden(){ return escondida; } },
      setTimeout: (f, ms) => { esperas.push([f, ms]); return esperas.length; },
      Math: Object.assign(Object.create(Math), { random: () => 0.5 }),
      saludPausa: () => false, libFetchAll: async () => diario.push('libFetchAll'), renderLibrary: () => diario.push('renderLibrary'),
      currentEp: null, libMsg: () => {}, refreshOpenEpisodeFromCloud: async () => {}, console: { error: () => {} }
    });
    P.onLibPing({ t: 'ep', id: 'e1' }); P.onLibPing({ t: 'show' }); P.onLibPing({ t: 'ep' });
    t.eq('tres avisos seguidos: una sola espera, de 1,5 a 4 s', esperas.length + ' ' + esperas[0][1], '1 2750');
    esperas[0][0](); await new Promise(r => setTimeout(r, 0));
    t.eq('y una sola recarga', diario.join(','), 'libFetchAll,renderLibrary');
    escondida = true; P.onLibPing({ t: 'ep' });
    t.eq('con la pestaña escondida no se recarga: se deja para cuando se vea', esperas.length + ' ' + P.LIBPING.pendiente, '1 true');
    t.ok('al volver a la pestaña, se pone al día', /if\(typeof LIBPING !== 'undefined' && LIBPING\.pendiente\)\{ LIBPING\.pendiente = false; _libAutoAt = 0; \}/.test(HTML));
  }

  t.seccion('5 · al entrar, decir que es el servidor');
  {
    const golpes = [];
    const E = montar([['function authErrMsg(error, sinSesion){', "document.getElementById('btnOut')"]], ['authErrMsg'], { saludFallo: () => golpes.push(1) });
    const SERV = 'El servidor de Dubbipt no responde ahora mismo: no es tu contraseña. Espera unos minutos y vuelve a probar.';
    t.eq('un 504 al entrar', E.authErrMsg({ message: '{}', status: 504 }).txt, SERV);
    t.eq('o un «Gateway Timeout»', E.authErrMsg({ message: 'Gateway Timeout' }).txt, SERV);
    t.ok('y el vigía se entera: deja de insistir y lo dice', golpes.length >= 2);
    t.eq('la contraseña mal sigue siendo la contraseña', E.authErrMsg({ message: 'Invalid login credentials', status: 400 }).txt, 'Correo o contraseña incorrectos.');
    t.eq('sin red en este equipo sigue diciendo lo de la red', /Revisa la conexión de este dispositivo/.test(E.authErrMsg({ message: 'Failed to fetch' }).txt), true);
  }

  t.seccion('6 · al entrar, esperar a que esté todo cargado (SYN-20)');
  {
    const oyentes = [];
    const doc = { readyState: 'loading', addEventListener: (ev, f, op) => oyentes.push([ev, f, op]) };
    const L = montar([['function ddlAunCargando(f){', 'function postLogin(){']], ['ddlAunCargando'], { document: doc });
    let hecho = 0;
    t.eq('mientras el navegador aún carga archivos: se deja para cuando acabe', L.ddlAunCargando(() => hecho++) + ' ' + hecho + ' ' + oyentes.map(o => o[0] + ':' + o[2].once).join(','), 'true 0 DOMContentLoaded:true');
    oyentes[0][1]();
    t.eq('y entonces se hace', hecho, 1);
    doc.readyState = 'interactive';
    t.eq('con todo cargado, se hace ya', L.ddlAunCargando(() => hecho++) + ' ' + oyentes.length, 'false 1');
    t.ok('volver a donde estabas espera', /function postLogin\(\)\{\s+if\(ddlAunCargando\(postLogin\)\) return;/.test(HTML));
    t.ok('pintar la biblioteca también, una sola vez aunque se pida varias', /async function renderLibrary\(silent\)\{\s+if\(typeof ddlAunCargando === 'function' && document\.readyState === 'loading'\)\{\s+if\(!renderLibrary\._esperando\)\{ renderLibrary\._esperando = true;/.test(HTML));
  }
};
