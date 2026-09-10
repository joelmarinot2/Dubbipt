/* Ocupación de talentos.
 *
 * Lo que protege esta prueba: que las casillas que NO son un actor -«X»,
 * «ORIGINAL», «X ORIGINAL», «TODOS»- no cuenten como carga de nadie. Si
 * cuentan, salen las primeras de la lista con cien líneas y provocan choques
 * falsos en cada página, y tapan a los actores de verdad, que es para lo que
 * sirve el panel.
 *
 * El riesgo al revés también importa: que un actor que se llame «MÁXIMO» o
 * «ORIGINALES DE LA TORRE» no desaparezca por parecerse a una palabra de la
 * lista. Por eso hay tantos casos de lo que SÍ es un actor.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Ocupación de talentos';

exports.pruebas = function(t){
  const charIdx = {};
  const O = montar(
    [['const CAST_CERCA', '/** Página de un bloque del libreto'],
     ['function castNorm(t){', '/** El número final']],
    ['castOcupacion', 'castEsActor'],
    { charIdx, script: [], scriptByKey: {} }
  );

  t.seccion('1 · qué cuenta como actor y qué no');
  const noActores = ['X', 'x', 'ORIGINAL', 'Original', 'X ORIGINAL', 'x original',
                     'ORIGINAL X', 'TODOS', 'Todos', 'TODAS', 'N/A', 'NA',
                     'VOZ ORIGINAL', 'AUDIO ORIGINAL', 'SIN DOBLAJE', 'NO SE DOBLA',
                     '', '   ', '---'];
  for(const x of noActores) t.eq('«' + x + '» no es un actor', O.castEsActor(x), false);

  const actores = ['ANA MARIA', 'JOEL', 'XÁVIER', 'ORIGINALES DE LA TORRE', 'MAXIMO',
                   'TODOS SANTOS', 'NATALIA'];
  for(const x of actores) t.eq('«' + x + '» sí es un actor', O.castEsActor(x), true);

  t.seccion('2 · la ocupación los deja fuera');
  Object.assign(charIdx, {
    A: { display: 'HERO',         talent: 'ANA MARIA',  totalInts: 40, pages: [{ p: 1 }, { p: 2 }] },
    B: { display: 'MALE SOLDIER', talent: 'X ORIGINAL', totalInts: 12, pages: [{ p: 1 }] },
    C: { display: 'CROWD',        talent: 'TODOS',      totalInts: 90, pages: [{ p: 3 }] },
    D: { display: 'TV',           talent: 'ORIGINAL',   totalInts:  7, pages: [{ p: 4 }] },
    E: { display: 'SIDEKICK',     talent: 'ANA MARIA',  totalInts: 10, pages: [{ p: 5 }] },
    F: { display: 'EXTRA',        talent: '',           totalInts:  3, pages: [{ p: 6 }] }
  });
  const filas = O.castOcupacion();
  t.eq('queda un solo talento', filas.length, 1);
  t.eq('y es la actriz', filas[0].talento, 'ANA MARIA');
  t.eq('con sus dos personajes', filas[0].personajes.length, 2);
  t.eq('y la suma de sus líneas', filas[0].ints, 50);
  t.eq('«TODOS» no aparece', filas.some(f => f.talento === 'TODOS'), false);
  t.eq('nada con «ORIGINAL» aparece', filas.some(f => /ORIGINAL/i.test(f.talento)), false);
  t.eq('sus páginas, sin repetir', Array.from(filas[0].paginas).sort((a, b) => a - b).join(','), '1,2,5');
};
