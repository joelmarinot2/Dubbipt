/* Verificación en dos pasos y sesión por inactividad · especificacion 07, ENT-20 y ENT-21
 *
 * Pedido de sala: «agregar un autenticador cada vez que se inicia sesión, a
 * todos los usuarios y obligatorio para entrar, y que la sesión tenga un
 * tiempo de inactividad». Lo que protege esta prueba: que sin el código no se
 * entra (y sin poder comprobarlo, tampoco); que la primera vez se da de alta
 * con el QR; que un código malo se dice; que todas las puertas de entrada
 * pasan por el código; que la sesión caduca sin uso y avisa antes; que en las
 * tablets cuenta lo que llega de la sala; y el SQL que lo exige en la nube.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Verificación en dos pasos y sesión por inactividad';

const RAIZ = path.dirname(INDEX);
// En Windows git saca los archivos con CRLF; los patrones de abajo cuentan con «\n», como en la nube.
const HTML = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');

/* Lo justo del DOM: la pantalla de acceso y la tarjeta del código, con sus controles por clase. */
function dom(){
  const D = { gate: { off: true, hijos: [], classList: null, appendChild(c){ this.hijos.push(c); D.card = c; c.puesta = true; } }, form: { style: {} }, card: null, body: { locked: false } };
  D.gate.classList = { remove: (k) => { if(k === 'off') D.gate.off = false; }, add: () => {} };
  const ctrl = () => ({ value: '', textContent: '', disabled: false, l: {}, addEventListener(ev, f){ this.l[ev] = f; }, focus(){}, set onclick(f){ this.l.click = f; }, get onclick(){ return this.l.click; } });
  D.document = {
    getElementById: (id) => (id === 'gate' ? D.gate : id === 'gform' ? D.form : id === 'mfaCard' ? (D.card && D.card.puesta ? D.card : null) : null),
    createElement: () => {
      const c = { innerHTML: '', className: '', id: '', offsetWidth: 0, ctrls: {}, classList: { add(){}, remove(){} } };
      c.querySelector = (sel) => (c.ctrls[sel] = c.ctrls[sel] || ctrl());
      c.remove = () => { c.puesta = false; };
      return c;
    },
    body: { classList: { add: (k) => { if(k === 'locked') D.body.locked = true; } } },
    addEventListener(){}, querySelectorAll: () => []
  };
  return D;
}
const espera = () => new Promise(r => setTimeout(r, 0));

function armar(o){
  const D = dom(), V = { verificados: [], quitados: [], altas: 0, salidas: 0, abiertos: 0, toasts: [] };
  V.D = D;
  const ls = {};
  V.ls = ls;
  const sb = { auth: {
    getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }),
    signOut: async () => { V.salidas++; return {}; },
    mfa: {
      getAuthenticatorAssuranceLevel: async () => { const r = o.nivel.shift(); return r instanceof Error ? { data: null, error: r } : { data: { currentLevel: r, nextLevel: 'aal2' }, error: null }; },
      listFactors: async () => ({ data: o.factores, error: null }),
      unenroll: async ({ factorId }) => { V.quitados.push(factorId); return {}; },
      enroll: async () => { V.altas++; return { data: { id: 'nuevo', totp: { qr_code: 'data:image/svg+xml;utf-8,<svg/>', secret: 'ABCDEFGHIJKLMNOP' } }, error: null }; },
      challengeAndVerify: async ({ factorId, code }) => { V.verificados.push(factorId + ':' + code); return code === '123456' ? { data: {}, error: null } : { data: null, error: { message: 'Invalid TOTP code entered' } }; }
    } } };
  V.M = montar([['/* ═══ VERIFICACIÓN EN DOS PASOS Y SESIÓN POR INACTIVIDAD', 'async function authInit(){']],
    ['sesionActividad', 'sesionRemota', 'sesionCaducada', 'sesionUltima', 'mfaAsegurar', 'authEntrar', 'SESION', 'SESION_INACTIVIDAD_MIN'],
    { document: D.document, localStorage: { getItem: (k) => (k in ls ? ls[k] : null), setItem: (k, v) => { ls[k] = String(v); }, removeItem: (k) => { delete ls[k]; } },
      sb: sb, DEVROLE: o.rol || 'pc', window: { OFFLINE: false, addEventListener(){} }, location: { reload(){} }, console: { error(){} }, setTimeout: (f) => f(), setInterval: () => 1, clearInterval(){},
      DDL_UI: { toast: (m) => V.toasts.push(m) }, fallo: () => {}, sbUser: null,
      authUnlock: () => { V.abiertos++; }, renderLibrary: () => {}, onlineDisconnect: () => {} });
  return V;
}

exports.pruebas = async function(t){
  t.seccion('1 · sin el código no se entra');
  {
    const V = armar({ nivel: ['aal2'], factores: { all: [], totp: [] } });
    t.eq('con la sesión ya verificada (aal2), se entra sin pedir nada', (await V.M.mfaAsegurar()) + ' ' + !!V.D.card, 'true false');
  }
  {
    const V = armar({ nivel: ['aal1'], factores: { all: [{ id: 'f1', factor_type: 'totp', status: 'verified' }], totp: [{ id: 'f1', status: 'verified', friendly_name: 'Mi teléfono' }] } });
    let entro = null, despues = 0;
    const p = V.M.authEntrar(() => { despues++; }).then(r => { entro = r; });
    await espera();
    const c = V.D.card;
    t.ok('con autenticador: se pide el código de 6 dígitos, tapando el formulario', /Verificación en dos pasos/.test(c.innerHTML) && /autocomplete="one-time-code"/.test(c.innerHTML) && V.D.form.style.display === 'none' && V.D.gate.off === false && V.abiertos === 0);
    const inp = c.ctrls['.mfa-codigo'], err = c.ctrls['.gerr'];
    inp.value = '11a1111'; inp.l.input(); await espera(); await espera();
    t.eq('solo cifras; un código malo se dice y no se entra', inp.value + ' | ' + err.textContent + ' | ' + V.abiertos + ' ' + entro, ' | Código incorrecto o vencido. Escribe el que se ve ahora en la app. | 0 null');
    inp.value = '123456'; inp.l.input(); await p;
    t.eq('el bueno: se verifica con su autenticador, se entra y se hace lo de después', V.verificados.join(',') + ' · ' + entro + ' ' + V.abiertos + ' ' + despues + ' · ' + !!V.D.card.puesta, 'f1:111111,f1:123456 · true 1 1 · false');
    t.ok('y empieza a contar la inactividad', V.M.SESION.vigilando === true && !!V.ls.ddl_ultima_actividad);
  }
  {
    const V = armar({ nivel: ['aal1'], factores: { all: [{ id: 'viejo', factor_type: 'totp', status: 'unverified' }], totp: [] } });
    let r = null;
    const p = V.M.mfaAsegurar().then(x => { r = x; });
    await espera(); await espera(); await espera();
    const c = V.D.card;
    t.ok('sin autenticador: se da de alta, con el QR y la clave para escribir a mano', V.altas === 1 && V.quitados.join() === 'viejo' && /Activa la verificación en dos pasos/.test(c.innerHTML)
      && /<img alt="Código QR para la app autenticadora" src="data:image\/svg\+xml;utf-8,&lt;svg\/>"/.test(c.innerHTML) && /ABCD EFGH IJKL MNOP/.test(c.innerHTML) && /Google Authenticator/.test(c.innerHTML));
    c.ctrls['.mfa-codigo'].value = '123456'; c.ctrls['.mfa-codigo'].l.input(); await p;
    t.eq('el primer código confirma el alta y se entra', r + ' ' + V.verificados.join() + ' · ' + V.toasts.length, 'true nuevo:123456 · 1');
  }
  {
    const V = armar({ nivel: [new Error('Failed to fetch'), 'aal2'], factores: { all: [], totp: [] } });
    let r = null;
    const p = V.M.mfaAsegurar().then(x => { r = x; });
    await espera();
    t.eq('sin poder comprobarlo, no se entra: se dice y se puede reintentar', r + ' | ' + /Sin conexión con el servidor/.test(V.D.card.innerHTML) + ' ' + /mfa-reintentar/.test(V.D.card.innerHTML), 'null | true true');
    V.D.card.ctrls['.mfa-reintentar'].onclick(); await p;
    t.eq('al reintentar con la red de vuelta, se entra', r, true);
  }

  t.seccion('2 · todas las puertas pasan por el código');
  const ini = HTML.slice(HTML.indexOf('async function authInit(){'), HTML.indexOf('function authErrMsg('));
  t.eq('sesión guardada, contraseña y vuelta de recuperar la contraseña o de la invitación (ya no se crean cuentas aquí, ENT-23)', (HTML.match(/authEntrar\(/g) || []).length - 1 + ' ' + (ini.match(/authUnlock\(\)/g) || []).length, '3 0');
  t.ok('Google vuelve por la sesión guardada: también pide el código', /if\(session\)\{\n    sbUser = session\.user;[\s\S]{0,400}authEntrar\(\(\) => postLogin\(\)\);/.test(ini));
  t.ok('solo el modo sin conexión entra sin código (no hay nube a la que llegar)', /function enterOffline\(\)\{[\s\S]{0,120}authUnlock\(\); renderLibrary\(\); postLogin\(\);/.test(HTML));

  t.seccion('3 · la sesión caduca sin uso');
  {
    const V = armar({ nivel: [], factores: {} }), M = V.M, MIN = M.SESION_INACTIVIDAD_MIN;
    t.eq('sin nada apuntado (la primera vez), no caduca', M.sesionCaducada(Date.now()), false);
    M.sesionActividad(true);
    const u = M.sesionUltima();
    t.eq('caduca pasados ' + MIN + ' minutos sin usarse, ni un minuto antes', M.sesionCaducada(u + (MIN - 1) * 60000) + ' ' + M.sesionCaducada(u + (MIN + 1) * 60000), 'false true');
    t.eq('se apunta en este equipo, para todas las ventanas de Dubbipt', V.ls.ddl_ultima_actividad, String(u));
    V.ls.ddl_ultima_actividad = String(u + 120000);
    t.eq('el uso en otra ventana cuenta', M.sesionUltima(), u + 120000);
  }
  {
    const pc = armar({ nivel: [], factores: {}, rol: 'pc' }), tab = armar({ nivel: [], factores: {}, rol: 'talent' });
    pc.M.sesionRemota(); tab.M.sesionRemota();
    t.eq('lo que llega de la sala cuenta en la tablet del actor, no en el ordenador', !!pc.ls.ddl_ultima_actividad + ' ' + !!tab.ls.ddl_ultima_actividad, 'false true');
  }
  t.ok('los movimientos que llegan de la sala lo avisan', ['function onRemotePos(p){', 'function onRemoteScroll(p){', 'function onRemoteNav(p){'].every(f => HTML.indexOf(f + "\n  try{ if(typeof sesionRemota === 'function') sesionRemota(); }") >= 0));
  t.ok('al abrir con la sesión caducada se cierra y se dice por qué', /if\(session && sesionCaducada\(\)\)\{[\s\S]{0,200}signOut\(\{ scope: 'local' \}\)/.test(ini) && /sesionMotivoMostrar\(\);/.test(ini) && /Tu sesión se cerró tras/.test(HTML));
  t.ok('cerrar por inactividad, solo en este equipo; un minuto antes, el aviso con «Seguir conectado», encima de todo', /sb\.auth\.signOut\(\{ scope: 'local' \}\)/.test(HTML) && /const SESION_AVISO_S = 60;/.test(HTML)
    && /d\.className = 'ses-aviso ddl-encima'/.test(HTML) && /Seguir conectado/.test(HTML) && /\.ses-aviso\{/.test(HTML) && /\.mfa-card\{/.test(HTML));

  t.seccion('4 · también en la nube');
  const SQL = fs.readFileSync(path.join(RAIZ, 'sql', 'seguridad-13-mfa-obligatorio.sql'), 'utf8');
  t.ok('las tablas con RLS, los archivos y los canales exigen la sesión verificada (aal2), sumándose a lo que ya hay', /as restrictive for all to authenticated/.test(SQL) && /auth\.jwt\(\) ->> ''aal''\) = ''aal2''/.test(SQL)
    && /on storage\.objects as restrictive/.test(SQL) && /realtime\.messages/.test(SQL) && /drop policy if exists mfa_aal2/.test(SQL));
  t.ok('y cómo reiniciar el autenticador de quien pierde el teléfono', /delete from auth\.mfa_factors/.test(SQL));
};
