/* Acceso solo por invitación · especificacion 07, ENT-23
 *
 * Pedido de sala, para cumplir la confidencialidad de Netflix: «quitar
 * "Crear cuenta" y dejar el acceso solo por invitación». Lo que protege esta
 * prueba: que la pantalla de acceso ya no crea cuentas ni lo ofrece; que se
 * dice cómo conseguir una; que quien llega del correo de invitación elige su
 * contraseña antes de entrar (y pasa por el autenticador); y que el error del
 * servidor cuando alguien intenta entrar con Google sin estar invitado se
 * explica en palabras.
 */
'use strict';
const { montar, INDEX } = require('./ayuda');
const fs = require('fs');

exports.nombre = 'Acceso solo por invitación';

// En Windows git saca los archivos con CRLF; los patrones de abajo cuentan con «\n», como en la nube.
const HTML = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');

exports.pruebas = async function(t){
  t.seccion('1 · aquí no se crean cuentas');
  const gate = HTML.slice(HTML.indexOf('<div class="gate" id="gate">'), HTML.indexOf('<div class="wrap">'));
  t.ok('ni la pestaña «Crear cuenta» ni el campo del nombre', !/Crear cuenta/.test(gate) && !/gTabReg|gNameRow|gFull/.test(gate) && /<h2 class="gtit">Iniciar sesión<\/h2>/.test(gate));
  t.ok('y se dice cómo conseguir una', /El acceso es solo por invitación\. Si necesitas una cuenta, pídesela al administrador del estudio\./.test(gate) && /#gate \.ginv\{/.test(HTML));
  t.ok('ni una llamada para registrarse en todo Dubbipt', !/auth\.signUp\(/.test(HTML) && !/gTabReg|getElementById\('gFull'\)/.test(HTML));
  t.ok('si el servidor tiene el registro cerrado, el aviso lo explica', /Esa cuenta no existe y aquí no se crean cuentas: el acceso es solo por invitación/.test(HTML));

  t.seccion('2 · la invitación: elegir contraseña y entrar');
  const M = (url0, loc) => montar([['function esInvitacion(){', 'function esRegresoDeRecuperacion(){']], ['esInvitacion'], { RECOV_URL0: url0, location: loc });
  t.eq('se reconoce el enlace de invitación (aunque la librería ya haya limpiado la dirección)', [M({ type: 'invite' }, { hash: '', search: '' }).esInvitacion(), M({}, { hash: '#access_token=x&type=invite', search: '' }).esInvitacion(), M({ type: 'recovery' }, { hash: '', search: '' }).esInvitacion()].join(' '), 'true true false');
  const ini = HTML.slice(HTML.indexOf('async function authInit(){'), HTML.indexOf('function authErrMsg('));
  t.ok('con la sesión de la invitación, primero la contraseña; no entra sin ella', /if\(esInvitacion\(\)\)\{ showNewPasswordScreen\(true\); return; \}\n    authEntrar\(\(\) => postLogin\(\)\);/.test(ini));
  t.ok('la pantalla le da la bienvenida y avisa del autenticador', /invitacion \? 'Bienvenido a Dubbipt' : 'Tu cuenta'/.test(HTML) && /invitacion \? 'Elige tu contraseña'/.test(HTML) && /después activarás la verificación en dos pasos/.test(HTML));
  t.ok('al guardarla entra por la misma puerta (con el código) y ve la guía de la primera vez', /authEntrar\(\(\) => invitacion \? showTutorial\(\(\) => postLogin\(\)\) : postLogin\(\)\)/.test(HTML));
  t.ok('si cambiar la contraseña pide la sesión verificada, se pide el código y se reintenta', /if\(error && \/aal2\|insufficient_aal/.test(HTML) && /const ok = await mfaAsegurar\(\);[\s\S]{0,120}updateUser\(\{ password: a \}\)/.test(HTML));
};
