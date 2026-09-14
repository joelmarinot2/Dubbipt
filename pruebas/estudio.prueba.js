/* El modo estudio · especificacion 04
 *
 * El modo estudio parte la ventana del libreto en dos columnas: el panel de
 * video a la izquierda y el libreto a la derecha. Para eso necesita el
 * contenedor `libInline`, que puede no existir todavia -si nadie ha abierto
 * antes el libreto incrustado, hay que crearlo primero-.
 *
 * Ahi estaba el fallo: el contenedor se pedia ANTES de crearlo y la variable se
 * quedaba en null para siempre. El panel se creaba bien, la guarda de `stLeft`
 * dejaba pasar, y el primer clic del dia en «modo estudio» reventaba con
 * «Cannot read properties of null (reading 'style')». Llego desde produccion.
 *
 * Aqui el DOM es de mentira -objetos con un `style`-, porque lo que se prueba
 * no es el navegador: es el ORDEN en que la funcion pide las cosas.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El modo estudio: encenderlo sin el libreto ya abierto';

const RECORTES = [['function studioToggleStrip(){', 'function studioShowPlayer(){']];

/** Un nodo con lo unico que esta funcion le toca: el estilo. */
const nodo = () => ({ style: { display: '' } });

/**
 * Monta la funcion con un DOM fabricado.
 * `conHost`: si el contenedor del libreto YA existe cuando se pulsa el boton.
 */
function correr(conHost){
  const dom = { stLeft: nodo(), stSplit: nodo(), stTc0: { value: '' } };
  dom.stLeft.style.display = 'none';        // el panel arranca oculto: esto es ENCENDERLO
  if(conHost){ dom.libInline = nodo(); dom.libInline.style.display = 'block'; }
  const diario = [];
  const M = montar(RECORTES, ['studioToggleStrip'], {
    currentEp: { id: 'ep1' },
    libMsg: (m) => diario.push('aviso: ' + m),
    $: (id) => dom[id] || null,
    pop2: { key: null, doc: conHost ? {} : null },
    /* Abrir el libreto incrustado CREA el contenedor. Es justo lo que la
       version rota no volvia a mirar. */
    openLibretoInline: () => {
      dom.libInline = nodo(); dom.libInline.style.display = 'block';
      diario.push('se abre el libreto');
    },
    studioEnsureStrip: () => { diario.push('se monta la tira'); },
    studio: { on: false, epId: null, url: null },
    script: [{ tcEff: 10 }],
    localStorage: { setItem(){}, getItem(){ return null; } },
    stFmtTC: () => '00:00:00:00',
    studioTc0: () => 0,
    studioInjectCurCss: () => {}, studioLoadSaved: () => { diario.push('carga el medio'); },
    studioShowPlayer: () => {}, stDrawWave: () => {}, stMsg: () => {},
    salaParar: () => {}, adrBucleParar: () => {}, studioEl: () => null,
    updateBackBtn: () => {},
    fallo: (d) => diario.push('fallo: ' + d),
    console: { warn: () => {}, log: () => {} }
  });
  let error = null;
  try{ M.studioToggleStrip(); }catch(e){ error = e.message; }
  return { dom, diario, error, M };
}

exports.pruebas = function(t){
  t.seccion('1 · con el libreto YA abierto, como siempre');
  const a = correr(true);
  t.eq('no revienta', a.error, null);
  t.eq('el contenedor pasa a dos columnas', a.dom.libInline.style.display, 'flex');
  t.eq('en fila', a.dom.libInline.style.flexDirection, 'row');
  t.eq('y el panel de vídeo se ve', a.dom.stLeft.style.display, 'flex');

  t.seccion('2 · sin el libreto abierto: hay que crearlo ANTES de usarlo');
  const b = correr(false);
  t.eq('tampoco revienta', b.error, null,
       'era el «Cannot read properties of null (reading \'style\')» de producción: '
       + 'el contenedor se pedía antes de existir y se quedaba en null');
  t.ok('el libreto se abre primero', b.diario.includes('se abre el libreto'));
  t.eq('el contenedor recién creado SÍ se usa', b.dom.libInline.style.display, 'flex',
       'si se quedara con el null de antes, esto no se habría tocado');
  t.eq('en fila', b.dom.libInline.style.flexDirection, 'row');
  t.eq('y el panel de vídeo se ve igual', b.dom.stLeft.style.display, 'flex');
  t.eq('llega a cargar el medio', b.diario.includes('carga el medio'), true);

  t.seccion('3 · las dos maneras acaban igual');
  t.eq('mismo estado del contenedor',
       [a.dom.libInline.style.display, a.dom.libInline.style.flexDirection],
       [b.dom.libInline.style.display, b.dom.libInline.style.flexDirection]);
  t.eq('mismo estado del panel', a.dom.stLeft.style.display, b.dom.stLeft.style.display);
};
