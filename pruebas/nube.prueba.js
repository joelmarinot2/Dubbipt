/* Guardar en la nube cuando falla · especificacion 06
 *
 * El progreso de las páginas y las marcas del libreto se guardan en la nube
 * poco después de tocarlos. Si falla, se reintenta: las claves siguen «sucias»
 * y nada se pierde. Pero se reintentaba a los 5 s, siempre y para siempre, con
 * un aviso rojo en cada intento: con la sesión caducada o sin permiso eran doce
 * avisos por minuto y doce llamadas que no iban a entrar nunca. Se vio
 * validando la app: 190 intentos seguidos en una sesión de prueba.
 *
 * Se prueba con la nube y el reloj de mentira: qué se reintenta, cuándo, y qué
 * se dice.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Guardar en la nube cuando falla: reintentar sin martillear';

const R_NUBE = ['/* Cuándo se reintenta un guardado en la nube que falló.', '// Token de sesión de forma síncrona'];
const R_MARCAS = ['function cloudSaveMarks(){', 'async function loadCloudMarks(){'];

/** Un reloj de mentira: los temporizadores se apuntan y se disparan a mano. */
function reloj(){
  const cola = [];
  let sig = 1;
  return {
    cola: cola,
    setTimeout: (f, ms) => { const t = { f: f, ms: ms, id: sig++, vivo: true }; cola.push(t); return t.id; },
    clearTimeout: (id) => { const t = cola.find(x => x.id === id); if(t) t.vivo = false; },
    /** El siguiente temporizador vivo, ya quitado de la cola. */
    siguiente(){ const t = cola.find(x => x.vivo); if(t) t.vivo = false; return t || null; }
  };
}

/** Una nube que contesta lo que se le diga, y apunta lo que le piden. */
function nube(respuesta){
  const pedidos = [];
  return { pedidos: pedidos, respuesta: respuesta,
    rpc: async function(nombre, args){ pedidos.push({ nombre: nombre, args: args }); return this.respuesta(); } };
}

const SIN_PERMISO = { code: '42501', message: 'permission denied for function merge_episode_progress' };
const SIN_RED = { code: '', message: 'TypeError: Failed to fetch' };

function progreso(sb){
  const R = reloj(), avisos = [];
  const M = montar([R_NUBE],
    ['nubeEspera', 'nubeSinPermiso', 'nubeAviso', 'progTouched', 'cloudSaveProgress', 'fallos: () => _cloudFallos'],
    { sb: sb, currentEp: { id: 'ep1' }, progress: { a: new Set([1, 2]), b: new Set([7]) }, charMerges: {},
      DDL_UI: { toast: (m, o) => avisos.push(m) },
      setTimeout: R.setTimeout, clearTimeout: R.clearTimeout,
      console: { error: () => {}, warn: () => {}, log: () => {} } });
  return { M: M, R: R, avisos: avisos };
}

/** Dispara temporizadores hasta que se programe un reintento, y devuelve su espera. */
async function hastaElReintento(X){
  for(let i = 0; i < 6; i++){
    const t = X.R.siguiente();
    if(!t) return null;
    if(t.ms !== 800 && t.ms !== 400) return t;     // un reintento, no el retraso de guardar
    await t.f();
  }
  return null;
}

exports.pruebas = async function(t){
  t.seccion('1 · cuánto se espera para reintentar');
  const P0 = progreso(nube(async () => ({ error: null })));
  t.eq('el primero, a los 5 s', P0.M.nubeEspera(1), 5000);
  t.eq('cada fallo seguido, el doble', [2, 3, 4].map(P0.M.nubeEspera).join(','), '10000,20000,40000');
  t.eq('con tope de 2 minutos', [6, 7, 50].map(P0.M.nubeEspera).join(','), '120000,120000,120000');
  t.eq('lo que no es una cuenta, como el primero', P0.M.nubeEspera(undefined) + ',' + P0.M.nubeEspera(-3), '5000,5000');

  t.seccion('2 · qué es un fallo de sesión o de permiso');
  const S = P0.M.nubeSinPermiso;
  t.ok('sin permiso (42501)', S(SIN_PERMISO));
  t.ok('por su código, diga lo que diga el mensaje', S({ code: '42501', message: 'x' }));
  t.ok('la sesión caducada (PGRST301)', S({ code: 'PGRST301', message: 'JWT expired' }));
  t.ok('un 401', S({ status: 401 }) && S({ status: 403 }));
  t.ok('sin red no es de permiso', !S(SIN_RED));
  t.ok('ni un fallo del servidor', !S({ code: '57014', message: 'canceling statement due to statement timeout' }));
  t.ok('ni nada', !S(null));
  t.ok('el aviso de sesión dice qué hacer', /Vuelve a entrar/.test(P0.M.nubeAviso('el progreso', SIN_PERMISO)));
  t.ok('y el de red, que se reintenta', /reintentando/.test(P0.M.nubeAviso('el progreso', SIN_RED))
       && !/Vuelve a entrar/.test(P0.M.nubeAviso('el progreso', SIN_RED)));

  t.seccion('3 · el progreso: reintentar sin martillear');
  {
    const sb = nube(async () => ({ error: SIN_PERMISO }));
    const X = progreso(sb);
    X.M.progTouched('a');
    X.M.cloudSaveProgress();
    const esperas = [];
    for(let i = 0; i < 8; i++){
      const r = await hastaElReintento(X);
      if(!r) break;
      esperas.push(r.ms);
      r.f();                                        // el reintento vuelve a programar el guardado
    }
    t.eq('cada fallo espera el doble, hasta 2 minutos', esperas.join(','),
         '5000,10000,20000,40000,80000,120000,120000,120000',
         'antes, 5 s siempre: doce llamadas por minuto que no iban a entrar nunca');
    t.eq('y se avisa UNA vez, no en cada intento', X.avisos.length, 1, JSON.stringify(X.avisos));
    t.ok('diciendo que es la sesión o el permiso', /sesión ha caducado o no hay permiso/.test(X.avisos[0] || ''));
    t.ok('sin perder lo tocado: cada intento lleva la clave, y solo esa', sb.pedidos.length >= 8
         && sb.pedidos.every(p => p.args.p_patch && Object.keys(p.args.p_patch).join(',') === 'a'),
         JSON.stringify(sb.pedidos.slice(0, 2)));
    t.eq('van al capítulo que era', sb.pedidos.every(p => p.args.p_id === 'ep1'), true);

    /* Vuelve la sesión: el siguiente entra, y la racha se acaba. */
    sb.respuesta = async () => ({ error: null });
    const r = await hastaElReintento(X);
    t.eq('cuando vuelve a entrar, la cuenta se pone a cero', r === null && X.M.fallos() === 0, true,
         'r=' + (r && r.ms) + ' fallos=' + X.M.fallos());
    sb.respuesta = async () => ({ error: SIN_RED });
    X.M.progTouched('a'); X.M.cloudSaveProgress();
    const r2 = await hastaElReintento(X);
    t.eq('una racha nueva empieza otra vez a los 5 s', r2 && r2.ms, 5000);
    t.eq('y se vuelve a decir, ahora que es la red', X.avisos.length, 2);
    t.ok('con su aviso de red', /reintentando/.test(X.avisos[1] || '') && !/Vuelve a entrar/.test(X.avisos[1] || ''));
  }

  t.seccion('4 · las marcas: lo mismo');
  {
    const R = reloj(), mensajes = [];
    const sb = nube(async () => ({ error: SIN_PERMISO }));
    const N = montar([R_NUBE], ['nubeEspera', 'nubeAviso'], { console: { error: () => {} } });
    const sync = { marks: { 3: { text: 'hola' } } };
    const M = montar([R_MARCAS], ['cloudSaveMarks'],
      { sb: sb, currentEp: { id: 'ep1' }, sync: sync, _marksDirty: new Set([3]), _rpcMarks: true,
        nubeEspera: N.nubeEspera, nubeAviso: N.nubeAviso, libMsg: (m) => mensajes.push(m),
        setTimeout: R.setTimeout, clearTimeout: R.clearTimeout, console: { error: () => {} } });
    M.cloudSaveMarks();
    const esperas = [];
    for(let i = 0; i < 12 && esperas.length < 5; i++){
      const tm = R.siguiente();
      if(!tm) break;
      if(tm.ms === 400){ await tm.f(); continue; }
      esperas.push(tm.ms);
      tm.f();
    }
    t.eq('las marcas también esperan cada vez más', esperas.join(','), '5000,10000,20000,40000,80000');
    t.eq('y lo dicen una vez', mensajes.length, 1, JSON.stringify(mensajes));
    t.ok('con lo que hay que hacer', /Vuelve a entrar/.test(mensajes[0] || ''));
    t.ok('llevando la marca en cada intento', sb.pedidos.every(p => p.args.p_patch && p.args.p_patch[3]));
    sb.respuesta = async () => ({ error: null });
    let tm = R.siguiente(); while(tm && tm.ms !== 400){ tm.f(); tm = R.siguiente(); }
    if(tm) await tm.f();
    t.eq('cuando entra, la racha se acaba', sync._fallos, 0);
  }
};
