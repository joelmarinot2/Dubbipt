/* Personajes completados · especificacion 02
 *
 * Repartir un capitulo de sesenta personajes es ir tachando. Con todas las
 * tarjetas siempre a la vista, cada vez que buscas al siguiente sin repartir
 * vuelves a barrer los cuarenta que ya estan hechos.
 *
 * Lo que se prueba aqui es CUANDO se da un personaje por cerrado, que es lo
 * unico que decide si desaparece de la vista. Equivocarse por exceso es lo
 * caro: un personaje que se esconde sin estar resuelto no se reparte, y nadie
 * se entera hasta que el actor no aparece en la sesion.
 *
 * Un personaje esta cerrado cuando su reparto no espera nada de nadie:
 *   · tiene talento
 *   · ese talento NO esta pendiente de verificar (heredado de otro capitulo)
 *   · si solo hace gestos, tambien se ha mirado
 *
 * Y solo en modo casting: en grabacion «completado» significa otra cosa -todas
 * sus paginas grabadas- y mezclar las dos seria un lio.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Personajes completados: cuándo desaparece una tarjeta';

/* La marca de fin lleva el `||` a proposito: `window._cardFilter =` a secas
   casa antes con el `window._cardFilter ===` que hay DENTRO de
   castSalirTarjeta, y el recorte se cortaba por la mitad. */
const RECORTES = [['/* ═══ PERSONAJES COMPLETADOS', 'window._cardFilter = window._cardFilter ||']];
/* `_fila` es la fila de pestanas de mentira: se saca con una flecha porque
   montar() solo devuelve lo que se le pide por nombre. */
const EXPORTA = ['castCompletado', 'castCuentas', 'castPintarPestanas', 'castSalirTarjeta',
                 'verFila: () => _fila'];

/**
 * Monta el modulo.
 * `gestos` son las claves de los personajes que en este capitulo solo hacen
 * gestos y todavia nadie ha mirado.
 */
function correr(personajes, modo, gestos){
  const pend = new Set(gestos || []);
  const fila = { style:{}, innerHTML:'', querySelectorAll: () => [] };
  return montar(RECORTES, EXPORTA, {
    DDL_MODO: modo === undefined ? 'casting' : modo,
    chars: personajes,
    gestPendiente: (k) => pend.has(k),
    gestMapa: () => ({}),
    document: { getElementById: (id) => (id === 'filtrow' ? fila : null),
                querySelector: () => null },
    window: {},
    localStorage: { setItem(){}, getItem(){ return null; } },
    renderCards: () => {},
    fallo: () => {},
    setTimeout: (f) => f(),
    console: { warn: () => {}, log: () => {} },
    _fila: fila
  });
}

const P = (key, talent, heredado) => ({ key, display:key, talent, heredado: !!heredado });

exports.pruebas = function(t){
  t.seccion('1 · cuándo se da un personaje por cerrado');
  const M = correr([]);
  t.eq('con talento escrito a mano, sí', M.castCompletado(P('MARLON', 'HARI MORENO')), true);
  t.eq('sin talento, no', M.castCompletado(P('MARLON', '')), false);
  t.eq('con el talento en blancos, tampoco', M.castCompletado(P('MARLON', '   ')), false);
  t.eq('heredado y sin verificar, NO',
       M.castCompletado(P('MARLON', 'HARI MORENO', true)), false,
       'el naranja significa «míralo tú»: esconderlo sería darlo por bueno solo');
  t.eq('heredado y ya verificado, sí',
       M.castCompletado(P('MARLON', 'HARI MORENO', false)), true);

  t.seccion('2 · las marcas de producción también cierran');
  for(const m of ['ORIGINAL', 'TODOS', 'X'])
    t.eq('«' + m + '» cierra el personaje', M.castCompletado(P('PUBLICO', m)), true,
         'son una decisión tomada, no un hueco por rellenar');

  t.seccion('3 · un personaje de solo gestos sin mirar NO está cerrado');
  const G = correr([], 'casting', ['SOLDADO 1']);
  t.eq('aunque tenga talento heredado, se queda a la vista',
       G.castCompletado(P('SOLDADO 1', 'HARI MORENO')), false,
       'es justo el caso que hay que mirar: el extra repite nombre sin ser la misma persona');
  t.eq('otro personaje con talento sí está cerrado',
       G.castCompletado(P('MARLON', 'HARI MORENO')), true);

  t.seccion('4 · en grabación no se esconde nada');
  const R = correr([], 'grabacion');
  t.eq('ni siquiera con talento puesto', R.castCompletado(P('MARLON', 'HARI MORENO')), false,
       'allí «completado» son sus páginas grabadas, que es otra cosa');

  t.seccion('5 · las cuentas de las pestañas');
  const C = correr([
    P('MARLON', 'HARI MORENO'),                 // cerrado
    P('SHAWN', 'MARCELA BORDA'),                // cerrado
    P('POPS', 'CATALINA PLATA', true),          // heredado sin verificar
    P('LISA', ''),                              // sin repartir
    P('PUBLICO', 'ORIGINAL')                    // cerrado
  ]);
  const n = C.castCuentas();
  t.eq('tres completados', n.ok, 3);
  t.eq('dos por repartir', n.pend, 2);
  t.eq('y cinco en total', n.total, 5);
  t.eq('los dos lados suman el total', n.ok + n.pend, n.total,
       'si no sumaran, habría personajes que no salen en ninguna pestaña');

  t.seccion('6 · las pestañas solo salen repartiendo');
  t.eq('en casting se enseñan', C.verFila().style.display, undefined);   // aún sin pintar
  C.castPintarPestanas();
  t.eq('ahora sí', C.verFila().style.display, 'flex');
  t.ok('con las tres', C.verFila().innerHTML.includes('Por repartir')
       && C.verFila().innerHTML.includes('Personajes completados')
       && C.verFila().innerHTML.includes('Todos'));
  t.ok('y con sus números', C.verFila().innerHTML.includes('>3<') && C.verFila().innerHTML.includes('>2<'));

  const R2 = correr([P('MARLON', 'HARI MORENO')], 'grabacion');
  R2.castPintarPestanas();
  t.eq('en grabación se esconden', R2.verFila().style.display, 'none');
  t.eq('y se vacían', R2.verFila().innerHTML, '');

  const V = correr([]);
  V.castPintarPestanas();
  t.eq('sin personajes tampoco se enseñan', V.verFila().style.display, 'none',
       'unas pestañas a cero antes de subir el guion son ruido');
};
