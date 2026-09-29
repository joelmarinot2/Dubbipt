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
/* La tabla de qué perfil lleva vídeo, la de verdad: la puerta del estudio
   pregunta ahí, y con una de mentira la prueba diría lo que yo quisiera. */
const R_PERFIL = ['/* De quién es cada herramienta del cajón.', '/**\n * Deja en el cajón'];

/**
 * `perfil`: con qué perfil se pulsa; sin él se monta como antes, sin tabla.
 * `abierto`: si el panel ya estaba desplegado, o sea, si pulsar es CERRARLO.
 */
function correr(conHost, perfil, abierto){
  const dom = { stLeft: nodo(), stSplit: nodo(), stTc0: { value: '' }, libFrame: nodo() };
  dom.stLeft.style.display = abierto ? 'flex' : 'none';   // oculto: pulsar es ENCENDERLO
  if(conHost){ dom.libInline = nodo(); dom.libInline.style.display = abierto ? 'flex' : 'block'; }
  const diario = [];
  const deMas = perfil ? { DDL_MODO: perfil, castAviso: (m) => diario.push('aviso: ' + m) } : {};
  const M = montar(perfil ? [R_PERFIL].concat(RECORTES) : RECORTES, ['studioToggleStrip'], Object.assign({
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
  }, deMas));
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

  t.seccion('4 · desde un perfil sin vídeo, el estudio no se abre');
  /* Pedido de sala: «quita la opcion de video en QC». Los botones van
     escondidos, pero esta es la puerta por la que pasan todos, y aqui es donde
     se cierra de verdad: un boton nuevo que llame a esto no puede colarlo. */
  const q = correr(true, 'qc', false);
  t.eq('no revienta', q.error, null);
  t.eq('el panel sigue cerrado', q.dom.stLeft.style.display, 'none');
  t.eq('el libreto sigue a todo el ancho', q.dom.libInline.style.display, 'block');
  t.ok('ni se llega a montar la tira', !q.diario.includes('se monta la tira'), JSON.stringify(q.diario));
  t.ok('ni a cargar el medio', !q.diario.includes('carga el medio'));
  t.eq('y se dice por qué, una vez', q.diario.filter(x => /^aviso: /.test(x)).length, 1,
       'un «no» que no se lee parece un botón roto: ' + JSON.stringify(q.diario));
  t.ok('nombrando el perfil como salida', /perfil/i.test(q.diario.join(' ')));

  const qs = correr(false, 'qc', false);
  t.ok('sin el libreto abierto tampoco lo abre para nada', !qs.diario.includes('se abre el libreto'),
       'abrir el libreto para luego negarse es trabajo tirado, y además lo enseña');

  t.seccion('5 · pero CERRARLO se deja siempre');
  /* Es justo lo que hay que poder hacer al entrar en QC con el estudio
     abierto. Si la puerta se cerrara en los dos sentidos, el panel se quedaria
     desplegado para siempre. */
  const c = correr(true, 'qc', true);
  t.eq('no revienta', c.error, null);
  t.eq('el panel se cierra', c.dom.stLeft.style.display, 'none',
       'si la guarda parase también el cierre, el panel no se podría quitar');
  t.eq('y el libreto vuelve a todo el ancho', c.dom.libInline.style.display, 'block');
  t.eq('sin aviso ninguno', c.diario.filter(x => /^aviso: /.test(x)).length, 0, JSON.stringify(c.diario));

  t.seccion('6 · en Grabación y en Casting se abre como siempre');
  ['grabacion', 'casting'].forEach(p => {
    const g = correr(true, p, false);
    t.eq(p + ': no revienta', g.error, null);
    t.eq(p + ': el panel se ve', g.dom.stLeft.style.display, 'flex',
         'solo se pidió quitarlo de QC');
    t.eq(p + ': a dos columnas', g.dom.libInline.style.display, 'flex');
  });
};
