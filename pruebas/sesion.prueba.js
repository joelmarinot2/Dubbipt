/* Al recargar, donde se estaba · especificacion 01 (QC-35)
 *
 * Pedido de sala: «quiero que si recargo la página no se ponga desde el
 * inicio, sino donde estaba trabajando». Recargar vuelve al sitio -tarea,
 * dispositivo, programa, capítulo, libreto y por dónde iba- sin preguntar
 * nada; entrar de nuevo empieza por la tarea. Lo que distingue una cosa de la
 * otra es el almacén de la PESTAÑA: sobrevive a recargar y se pierde al
 * cerrarla.
 *
 * Se corre el código de verdad con todo lo de alrededor sustituido: aquí se
 * prueba qué se guarda, cuándo, y en qué orden se vuelve.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Al recargar, donde se estaba';

const R_DONDE = ['/* ═══ AL RECARGAR, DONDE SE ESTABA', '/**\n * El perfil de trabajo, lo PRIMERO'];

function almacen(inicial, roto){
  const d = Object.assign({}, inicial || {});
  return { d: d,
    getItem(k){ if(roto) throw new Error('prohibido'); return Object.prototype.hasOwnProperty.call(d, k) ? d[k] : null; },
    setItem(k, v){ if(roto) throw new Error('prohibido'); d[k] = String(v); },
    removeItem(k){ if(roto) throw new Error('prohibido'); delete d[k]; } };
}

/** La app alrededor, de mentira. `o` dice cómo está. */
function app(o){
  o = o || {};
  const X = { diario: [], avisos: [], oyentes: {}, relojes: [], ss: o.ss || almacen() };
  const clases = new Set(o.enCapitulo ? ['ep-open'] : []);
  const win = Object.assign({ addEventListener: (ev, f) => { X.oyentes[ev] = f; } }, o.win || {});
  X.win = win;
  const libreto = { visible: !!o.libretoVisible };
  X.pop2 = o.pop2 || { type: 'inline', key: null, doc: { querySelector: () => ({}) }, els: { wrap: { scrollTop: 0 } } };
  X.LDB = o.LDB || { showId: null, browse: false };
  X.M = montar([R_DONDE],
    ['dondeAhora', 'dondeGuardar', 'dondeLeer', 'dondeOlvidar', 'dondeReanudar', 'postLogin', 'DONDE_CLAVE',
     'rol: () => DEVROLE', 'vista: () => libView'],
    { window: win, sessionStorage: X.ss, localStorage: almacen(),
      document: { body: { classList: { contains: (c) => clases.has(c) } } },
      setInterval: (f, ms) => X.relojes.push(ms), setTimeout: (f) => { f(); },
      DDL_MODO: o.modo || 'qc', DEVROLE: ('rol' in o) ? o.rol : null, sync: { role: null },
      WORKSPACE: ('ws' in o) ? o.ws : { id: 'ws1' }, LDB: X.LDB, libView: o.vista || 'shows',
      currentEp: ('ep' in o) ? o.ep : null, pop2: X.pop2, charIdx: { NILA: {} },
      dispValido: (r) => (['pc', 'tablet', 'talent'].indexOf(r) >= 0 ? r : ''),
      modoValido: (m) => (['grabacion', 'qc', 'casting'].indexOf(m) >= 0 ? m : ''),
      perfilUsaDispositivo: (m) => m === 'grabacion',
      libretoVisible: () => libreto.visible,
      ponerModo: (ep, m) => { X.diario.push('perfil ' + m); win._perfilSesion = m; },
      applyDeviceRole: () => X.diario.push('aplicar dispositivo'),
      perfilDispositivo: (m, hecho) => { X.diario.push('dispositivo para ' + m); if(hecho) hecho(); },
      ensureWorkspace: async () => { X.diario.push('espacio'); },
      openEpisode: async (id) => { X.diario.push('abrir ' + id); X.pedidoAlAbrir = [X.pop2._keepTop, X.pop2._keepKey];
        if(o.qcAbreSolo) libreto.visible = true;
        /* Como pasa de verdad: el primer repintado se come lo apuntado. */
        if(o.seCome){ X.pop2._keepTop = null; X.pop2._keepKey = null; }
        return o.falla !== true; },
      openLibretoInline: (k) => { X.diario.push('libreto ' + (k == null ? 'entero' : k)); X.pedidoAlLibreto = [X.pop2._keepTop, X.pop2._keepKey];
        libreto.visible = true; X.pop2.key = k; },
      renderLibrary: async () => { X.diario.push('biblioteca ' + X.LDB.showId); },
      perfilAlEntrar: (hecho) => { X.diario.push('preguntar tarea'); },
      DDL_UI: { toast: (m) => X.avisos.push(m) },
      fallo: (d, e) => X.diario.push('FALLO ' + (e && e.message)) });
  return X;
}

exports.pruebas = async function(t){
  t.seccion('1 · qué se guarda');
  {
    const A = app();
    t.eq('sin tarea elegida no hay sesión que recordar', A.M.dondeAhora(), null);
    t.eq('ni se guarda nada', A.M.dondeGuardar() + '|' + Object.keys(A.ss.d).length, 'false|0');
  }
  {
    const A = app({ win: { _perfilSesion: 'qc' }, modo: 'qc', LDB: { showId: 'sh1' }, vista: 'eps' });
    const d = A.M.dondeAhora();
    t.eq('en la lista de capítulos: la tarea, el espacio, el programa y la vista',
         JSON.stringify(d), '{"v":1,"modo":"qc","rol":null,"ws":"ws1","show":"sh1","vista":"eps"}');
  }
  {
    const pop2 = { type: 'inline', key: 'NILA', doc: {}, els: { wrap: { scrollTop: 812.4 } } };
    const A = app({ win: { _perfilSesion: 'grabacion' }, modo: 'grabacion', rol: 'tablet', enCapitulo: true,
                    ep: { id: 'ep7', showId: 'sh2' }, libretoVisible: true, pop2: pop2 });
    const d = A.M.dondeAhora();
    t.eq('dentro de un capítulo, el capítulo y su programa', d.ep + '|' + d.show, 'ep7|sh2');
    t.eq('el dispositivo', d.rol, 'tablet');
    t.eq('el libreto abierto, con su personaje', d.libreto, 'NILA');
    t.eq('y por dónde iba', d.top, 812);
    pop2.key = null;
    t.eq('el libreto entero se apunta como entero', A.M.dondeAhora().libreto, '__full__');
  }
  {
    const A = app({ win: { _perfilSesion: 'qc' }, enCapitulo: true, ep: { id: 'ep7', showId: 'sh2' }, libretoVisible: false });
    t.ok('con el libreto cerrado, sin libreto', !('libreto' in A.M.dondeAhora()));
    t.ok('guardado en el almacén de la pestaña', A.M.dondeGuardar() && JSON.parse(A.ss.d[A.M.DONDE_CLAVE]).ep === 'ep7',
         'el de la pestaña sobrevive a recargar y se pierde al cerrarla: eso separa recargar de entrar');
    t.ok('se guarda cada poco', A.relojes.includes(1500));
    t.ok('y al irse, que es lo que hace recargar', typeof A.oyentes.beforeunload === 'function' && typeof A.oyentes.pagehide === 'function');
  }
  {
    const A = app({ win: { _perfilSesion: 'qc', _reanudando: true } });
    t.eq('mientras se vuelve al sitio no se guarda: sería el sitio a medio camino', A.M.dondeGuardar(), false);
  }
  {
    const ss = almacen();
    const A = app({ win: { _perfilSesion: 'qc' }, ss: ss });
    A.M.dondeGuardar();
    A.M.dondeOlvidar();
    t.eq('cerrar sesión lo olvida', Object.keys(ss.d).length, 0);
    t.eq('y ya no se vuelve a guardar al irse', A.M.dondeGuardar() + '|' + Object.keys(ss.d).length, 'false|0',
         'cerrar sesión recarga, y el guardado de al irse lo apuntaría otra vez');
  }
  {
    const A = app({ win: { _perfilSesion: 'qc' }, ss: almacen({}, true) });
    t.eq('sin almacén no revienta: se empezará desde el inicio', A.M.dondeGuardar(), false);
  }

  t.seccion('2 · qué vale de lo guardado');
  t.eq('nada', app().M.dondeLeer(), null);
  t.eq('lo roto no vale', app({ ss: almacen({ ddl_donde: '{roto' }) }).M.dondeLeer(), null);
  t.eq('ni una tarea que no existe', app({ ss: almacen({ ddl_donde: '{"v":1,"modo":"cocina"}' }) }).M.dondeLeer(), null);
  t.eq('ni otra versión', app({ ss: almacen({ ddl_donde: '{"v":2,"modo":"qc"}' }) }).M.dondeLeer(), null);
  t.eq('lo bueno, sí', app({ ss: almacen({ ddl_donde: '{"v":1,"modo":"qc","ep":"e"}' }) }).M.dondeLeer().ep, 'e');

  t.seccion('3 · al entrar: recargar vuelve, entrar empieza');
  {
    const A = app();
    A.M.postLogin();
    t.eq('sin nada guardado, la sesión empieza por la tarea', A.diario.join(','), 'preguntar tarea');
  }
  {
    const A = app({ ss: almacen({ ddl_donde: JSON.stringify({ v: 1, modo: 'casting', ws: 'ws1' }) }) });
    A.M.postLogin();
    await new Promise(r => setImmediate(r));
    t.eq('con algo guardado en la pestaña -es una recarga-, vuelve sin preguntar la tarea',
         A.diario[0] + '|' + A.diario.includes('preguntar tarea'), 'perfil casting|false');
  }
  {
    const PAGINA = require('fs').readFileSync(require('./ayuda').INDEX, 'utf8').replace(/\r\n/g, '\n');
    const salir = PAGINA.slice(PAGINA.indexOf("document.getElementById('btnOut').addEventListener('click'"), PAGINA.indexOf('authInit();\n\n/* ================= estado'));
    t.ok('cerrar sesión olvida dónde se estaba', /dondeOlvidar\(\);/.test(salir),
         'si no, recargar metería a quien entre después en el sitio del anterior');
    t.ok('también desde la salida escondida de la pantalla del dispositivo',
         /await sb\.auth\.signOut\(\); \}catch\(e\)\{\} try\{\['ddl_last_ep','ddl_last_key','ddl_last_top'\]\.forEach\(k=>localStorage\.removeItem\(k\)\);\}catch\(e\)\{\} dondeOlvidar\(\); location\.reload\(\);/.test(PAGINA));
  }
  {
    const A = app({ ss: almacen({ ddl_donde: JSON.stringify({ v: 1, modo: 'qc', rol: null, ws: 'ws1', show: 'sh2', ep: 'ep7', libreto: '__full__', top: 640 }) }),
                    qcAbreSolo: true });
    await A.M.dondeReanudar(A.M.dondeLeer());
    t.eq('recargar en QC vuelve al capítulo sin preguntar nada',
         A.diario.join(','), 'perfil qc,dispositivo para qc,espacio,abrir ep7');
    t.eq('con su programa', A.LDB.showId, 'sh2');
    t.eq('y el libreto por donde iba', A.pop2.els.wrap.scrollTop, 640);
    t.ok('sin volver a abrir el libreto que QC ya abre solo', !A.diario.some(x => /^libreto/.test(x)));
    t.eq('y el libreto ya se ABRE por donde iba: se le dice antes de abrir el capítulo', JSON.stringify(A.pedidoAlAbrir), '[640,null]',
         'abierto arriba y movido después, el refresco de la nube apuntaba «arriba» y lo devolvía ahí al repintar; se vio probándolo');
    t.eq('y lo dice', A.avisos.join(), 'Seguimos donde lo dejaste');
    t.eq('al acabar vuelve a guardar', A.win._reanudando, false);
  }
  {
    const A = app({ modo: 'grabacion' });
    await A.M.dondeReanudar({ v: 1, modo: 'grabacion', rol: 'tablet', ws: 'ws1', show: 'sh2', ep: 'ep7', libreto: 'NILA', top: 90 });
    t.eq('recargar en Grabación vuelve con su dispositivo, sin preguntarlo',
         A.diario.join(','), 'perfil grabacion,aplicar dispositivo,espacio,abrir ep7,libreto NILA');
    t.eq('el dispositivo es el que era', A.M.rol(), 'tablet');
    t.eq('y el libreto del personaje también se abre por donde iba', A.pop2._keepTop + '|' + A.pop2._keepKey, '90|NILA');
  }
  {
    const A = app({ modo: 'grabacion', seCome: true });
    await A.M.dondeReanudar({ v: 1, modo: 'grabacion', rol: 'pc', ws: 'ws1', ep: 'ep7', libreto: 'NILA', top: 90 });
    t.eq('aunque el capítulo, al abrirse, se coma lo apuntado: se vuelve a apuntar antes de abrir el personaje',
         JSON.stringify(A.pedidoAlLibreto), '[90,"NILA"]');
  }
  {
    const A = app({ modo: 'grabacion' });
    await A.M.dondeReanudar({ v: 1, modo: 'grabacion', rol: null, ws: 'ws1' });
    t.ok('Grabación sin dispositivo guardado lo pregunta: sin él no se graba', A.diario.includes('dispositivo para grabacion'));
  }
  {
    const A = app();
    await A.M.dondeReanudar({ v: 1, modo: 'casting', ws: 'ws1', show: 'sh3', vista: 'eps' });
    t.eq('en la lista de capítulos de un programa, vuelve a esa lista', A.diario.slice(-1)[0] + '|' + A.M.vista(), 'biblioteca sh3|eps');
  }
  {
    const A = app();
    await A.M.dondeReanudar({ v: 1, modo: 'qc', ws: 'ws1', ep: 'ep7', libreto: 'DESAPARECIDO' });
    t.ok('un personaje que ya no está no se abre', !A.diario.some(x => /^libreto/.test(x)));
  }
  {
    const A = app({ falla: true });
    const r = await A.M.dondeReanudar({ v: 1, modo: 'qc', ws: 'ws1', ep: 'borrado', libreto: '__full__' });
    t.eq('un capítulo que ya no abre se queda en la biblioteca', r + '|' + A.diario.some(x => /^libreto/.test(x)), 'false|false');
    t.eq('y se puede volver a guardar', A.win._reanudando, false);
  }
  {
    const A = app({ ws: null });
    const r = await A.M.dondeReanudar({ v: 1, modo: 'qc', ep: 'ep7' });
    t.eq('sin espacio elegido se para ahí, a que se elija', r + '|' + A.diario.includes('abrir ep7'), 'false|false');
  }
};
