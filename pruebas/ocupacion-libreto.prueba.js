/* La ocupacion dentro del libreto · especificacion 02
 *
 * La ocupacion -que actor lleva cuantos personajes y cuantas lineas, y donde se
 * pisa consigo mismo- vivia solo en el costado de la pantalla principal. Pero
 * repartiendo se pasa el rato DENTRO del libreto, que es una capa a pantalla
 * completa por encima de todo: habia que cerrarlo, mirar, y volver a abrirlo.
 *
 * Lo que se prueba aqui son las tres decisiones que pueden salir mal:
 *
 *  · que NO aparezca en grabacion, donde no pinta nada y estorba
 *  · que el contenido se corra a la izquierda al abrirlo, y vuelva al cerrarlo
 *  · que en una pantalla estrecha NO se corra, porque dejaria el libreto
 *    ilegible y ahi es mejor que el cajon se ponga encima
 *
 * Los datos son los MISMOS que los de la pantalla principal -castOcupacion()-,
 * asi que no hay una segunda cuenta que pueda decir otra cosa.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'La ocupación dentro del libreto';

const RECORTES = [['/* ═══ LA OCUPACIÓN, DENTRO DEL LIBRETO',
                    '/* ═══ CUÁNTAS LÍNEAS TIENE ESTE PERSONAJE']];
/* `ocuAbierto` se REASIGNA dentro, y al ser parametro la reasignacion no se ve
   desde fuera. La flecha si cierra sobre el parametro. */
const EXPORTA = ['libOcupacion', 'verDoc: () => _doc', 'verAbierto: () => ocuAbierto'];

/** Un elemento de mentira que solo sabe de clases, estilo e hijos. */
function nodo(id){
  const clases = new Set();
  const el = {
    id: id, innerHTML: '', style: {}, hijos: [],
    classList: {
      add: (...c) => c.forEach(x => clases.add(x)),
      remove: (...c) => c.forEach(x => clases.delete(x)),
      contains: (c) => clases.has(c),
      toggle: (c, v) => { if(v) clases.add(c); else clases.delete(c); }
    },
    className: '',
    appendChild(h){ el.hijos.push(h); return h; },
    remove(){ el.quitado = true; },
    getBoundingClientRect: () => ({ width: 320 }),
    querySelector: () => null,
    querySelectorAll: () => []
  };
  return el;
}

/**
 * Monta el modulo con un documento de libreto de mentira.
 * `ancho` es el ancho del libreto en pixeles; `abierto`, si el cajon lo esta.
 */
function correr(opts){
  opts = opts || {};
  const caja = nodo('lOcu');
  const wrap = nodo('lWrap');
  const body = nodo('body');
  const doc = {
    body: body,
    head: nodo('head'),
    getElementById: (id) => ({ lOcu: (opts.yaHay === false ? null : caja), lWrap: wrap })[id] || null,
    createElement: (t) => nodo(t)
  };
  const M = montar(RECORTES, EXPORTA, {
    pop2: { doc: doc, key: opts.key || 'MARLON',
            win: { innerWidth: opts.ancho != null ? opts.ancho : 1400 } },
    DDL_MODO: opts.modo || 'casting',
    chars: opts.chars || [],
    ocuAbierto: !!opts.abierto,
    castOcupacion: () => opts.filas || [],
    castChoques: () => opts.choques || {},
    castNorm: (s) => String(s || '').toUpperCase(),
    castPintarOcupacion: () => {},
    openPopup: () => {},
    esc: (s) => String(s),
    LIB_OCU_CSS: '.locu{}',
    localStorage: { setItem(){}, getItem(){ return null; } },
    fallo: () => {},
    console: { warn: () => {}, log: () => {} },
    _doc: doc
  });
  M._caja = caja; M._wrap = wrap; M._body = body;
  return M;
}

const P = (key, talent) => ({ key, display:key, talent });
const FILAS = [
  { talento:'HARI MORENO',   ints:82, personajes:[{key:'MARLON',display:'MARLON',ints:62},
                                                  {key:'SHAWN',display:'SHAWN',ints:20}] },
  { talento:'MARCELA BORDA', ints:14, personajes:[{key:'LISA',display:'LISA',ints:14}] }
];
const CHARS = [P('MARLON','HARI MORENO'), P('SHAWN','HARI MORENO'),
               P('LISA','MARCELA BORDA'), P('POPS','')];

exports.pruebas = function(t){
  t.seccion('1 · repartiendo, la ocupación está en el libreto');
  const C = correr({ chars: CHARS, filas: FILAS, abierto: true });
  C.libOcupacion();
  t.ok('el cajón se pinta', C._caja.innerHTML.length > 0);
  t.ok('con su pestaña, que se ve también plegado',
       C._caja.innerHTML.includes('lOcuTab'),
       'un panel que se esconde del todo es un panel que nadie encuentra');
  t.ok('sale el talento con más carga', C._caja.innerHTML.includes('HARI MORENO'));
  t.ok('y el otro', C._caja.innerHTML.includes('MARCELA BORDA'));
  t.ok('con sus líneas', C._caja.innerHTML.includes('82 líneas'));
  t.ok('y sus personajes', C._caja.innerHTML.includes('MARLON') && C._caja.innerHTML.includes('SHAWN'));
  t.ok('se avisa de los que faltan por repartir',
       C._caja.innerHTML.includes('1 personaje sin asignar'),
       'POPS no tiene talento: verlo desde el libreto ahorra cerrarlo para mirar');

  t.seccion('2 · en grabación no aparece');
  const G = correr({ chars: CHARS, filas: FILAS, abierto: true, modo: 'grabacion' });
  G.libOcupacion();
  t.eq('el cajón se quita', G._caja.quitado, true,
       'en grabación la ocupación no pinta nada y el libreto tiene que estar despejado');
  t.eq('y el contenido vuelve a su ancho', G._wrap.style.paddingRight, '');
  t.eq('sin dejar la clase puesta', G._body.classList.contains('ocu-lib'), false);

  t.seccion('3 · sin personajes tampoco');
  const V = correr({ chars: [], filas: [], abierto: true });
  V.libOcupacion();
  t.eq('se quita', V._caja.quitado, true,
       'un panel a cero antes de subir el guion es ruido');

  t.seccion('4 · al abrirlo, todo se corre a la izquierda');
  const A = correr({ chars: CHARS, filas: FILAS, abierto: true, ancho: 1400 });
  A.libOcupacion();
  t.eq('el contenido se aparta el ancho del cajón', A._wrap.style.paddingRight, '332px',
       '320 del cajón y 12 de aire');
  t.eq('y se marca el cuerpo', A._body.classList.contains('ocu-lib'), true);

  t.seccion('5 · al plegarlo, vuelve a su sitio');
  const B = correr({ chars: CHARS, filas: FILAS, abierto: false, ancho: 1400 });
  B.libOcupacion();
  t.eq('sin hueco reservado', B._wrap.style.paddingRight, '');
  t.eq('ni clase', B._body.classList.contains('ocu-lib'), false);
  t.ok('pero el cajón sigue ahí, plegado', B._caja.innerHTML.includes('lOcuTab'),
       'la pestaña tiene que verse para poder volver a abrirlo');

  t.seccion('6 · en una pantalla estrecha NO se corre nada');
  const E = correr({ chars: CHARS, filas: FILAS, abierto: true, ancho: 700 });
  E.libOcupacion();
  t.eq('el contenido se queda entero', E._wrap.style.paddingRight, '',
       'correrlo dejaría el libreto ilegible: ahí es mejor que el cajón se ponga encima');
  t.eq('aunque el cajón sí esté abierto', E._body.classList.contains('ocu-lib'), true);

  t.seccion('7 · un choque se ve desde aquí');
  const CH = correr({ chars: CHARS, filas: FILAS, abierto: true,
    choques: { 'HARI MORENO': { choques: [{ a:'MARLON', b:'SHAWN', dist:2, pagina:4 }] } } });
  CH.libOcupacion();
  t.ok('se cuenta arriba', CH._caja.innerHTML.includes('1 choque de reparto'));
  t.ok('y se dice cuál', CH._caja.innerHTML.includes('«MARLON» y «SHAWN» a 2 líneas'),
       'el aviso sin el detalle obliga a ir a buscarlo');
  t.ok('con su página', CH._caja.innerHTML.includes('pág. 4'));
};
