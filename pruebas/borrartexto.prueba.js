/* Una X para borrar el texto de las casillas · especificacion 07, ENT-25
 *
 * Pedido de sala: «quiero que coloque una X para borrar el texto en las
 * casillas de texto en general». Lo que protege esta prueba: en qué casillas
 * sale y en cuáles no; que borrar deja la casilla vacía, con el foco dentro y
 * avisando a quien escuche (buscadores, lo que se guarda al escribir); que la
 * × se esconde sin foco o sin texto; y que está cargada en la app, con su
 * estilo y en la caché.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'La × para borrar el texto de las casillas';

const RAIZ = path.dirname(INDEX);

function casilla(o){
  o = o || {};
  const at = Object.assign({ type: 'text' }, o.at || {}), avisos = [], clases = new Set();
  const el = {
    tagName: o.tag || 'INPUT', value: o.value == null ? 'hola' : o.value, readOnly: !!o.readOnly, disabled: !!o.disabled,
    getAttribute: (k) => (k in at ? at[k] : null), hasAttribute: (k) => k in at, closest: () => null,
    getBoundingClientRect: () => ({ width: o.ancho == null ? 200 : o.ancho, height: 30, left: 10, right: 210, top: 40 }),
    focus(){ D.activo = el; }, select(){}, dispatchEvent: (ev) => { avisos.push(ev.type + ':' + el.value); return true; },
    classList: { add: (c) => clases.add(c), remove: (c) => clases.delete(c) }, avisos, clases
  };
  return el;
}
const D = { activo: null };

function cargar(){
  const creados = [];
  const doc = {
    readyState: 'complete', get activeElement(){ return D.activo; }, contains: () => true, addEventListener(){},
    createElement: () => { const b = { style: {}, setAttribute(){}, addEventListener(){}, textContent: '' }; creados.push(b); return b; },
    body: { appendChild(){} }
  };
  const ctx = vm.createContext({ document: doc, window: { addEventListener(){} }, Event: class { constructor(t){ this.type = t; } }, setTimeout,
                                 getComputedStyle: () => ({ boxSizing: 'border-box' }) });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'borrartexto.js'), 'utf8') + ';this.API = { BX, bxVale, bxBorrar, bxColocar };', ctx);
  return { A: ctx.API, creados };
}

exports.pruebas = async function(t){
  const { A, creados } = cargar();

  t.seccion('1 · en qué casillas sale');
  t.eq('texto, buscador, correo, web y teléfono, sí', ['text', 'search', 'email', 'url', 'tel'].map(ty => A.bxVale(casilla({ at: { type: ty } }))).join(','), 'true,true,true,true,true');
  t.eq('sin tipo (es texto), sí', A.bxVale(casilla({ at: { type: null } })), true);
  t.eq('números, fechas, contraseñas, casillas de marcar: no', ['number', 'date', 'password', 'checkbox'].map(ty => A.bxVale(casilla({ at: { type: ty } }))).join(','), 'false,false,false,false');
  t.eq('solo lectura, desactivada o marcada con data-sin-x: no', [casilla({ readOnly: true }), casilla({ disabled: true }), casilla({ at: { 'data-sin-x': '' } })].map(A.bxVale).join(','), 'false,false,false');
  t.eq('un timecode corto (menos de 70 px): no', A.bxVale(casilla({ ancho: 60 })), false);
  t.eq('un texto largo (área de texto): no', A.bxVale(casilla({ tag: 'TEXTAREA' })), false);

  t.seccion('2 · borrar');
  const c = casilla({ value: 'LYLA IN THE LOOP' });
  A.BX.campo = c;
  t.eq('queda vacía, con el foco dentro, y avisa como si se hubiera borrado a mano', A.bxBorrar(c) + ' ' + JSON.stringify(c.value) + ' ' + (D.activo === c) + ' ' + c.avisos.join(','), 'true "" true input:,change:');
  t.eq('vacía, no hay nada que borrar', A.bxBorrar(c), false);

  t.seccion('3 · dónde se ve la ×');
  const v = casilla({ value: 'Ana' });
  A.BX.campo = v; D.activo = v; A.bxColocar();
  const b = creados[0];
  t.eq('con foco y texto: a la derecha de la casilla, por encima de todo', b.style.display + ' ' + b.style.left + ' ' + b.style.top + ' ' + b.className + ' ' + b.title, 'flex 181px 43px ddl-encima ddl-x Borrar el texto');
  t.ok('y lo escrito no queda debajo', v.clases.has('ddl-x-con'));
  v.value = ''; A.bxColocar();
  t.eq('sin texto, escondida', b.style.display + ' ' + v.clases.has('ddl-x-con'), 'none false');
  v.value = 'Ana'; D.activo = null; A.bxColocar();
  t.eq('sin foco, escondida', b.style.display, 'none');

  t.seccion('4 · en la app');
  const html = fs.readFileSync(INDEX, 'utf8'), sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('se carga en todas las pantallas', /<script src="\.\/js\/borrartexto\.js"><\/script>/.test(html));
  t.ok('con su estilo', /\.ddl-x\{ position:fixed; z-index:2147483640;/.test(html) && /input\.ddl-x-con\{ padding-right:30px !important; \}/.test(html));
  t.ok('y en la caché, para que funcione sin conexión', /'\.\/js\/borrartexto\.js'/.test(sw));
};
