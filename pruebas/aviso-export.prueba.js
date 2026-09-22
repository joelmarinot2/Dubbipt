/* El aviso del desglose solo salta cuando algo va mal · especificacion 02
 *
 * Llego de sala el diagnostico del capitulo 101 de «100 days of deception», y
 * decia que todo habia ido BIEN:
 *
 *     personajesEnLaAplicacion: 63   talentosAsignados: 62
 *     filasDePersonajeEnElExcel: 63  celdasEscritas: 62
 *     filasSinActor: 1               sinSitioEnElExcel: []
 *
 * Sesenta y dos de sesenta y tres repartidos, sesenta y dos escritos, ni un
 * talento sin fila. Y aun asi el panel se abria solo, como si hubiera una
 * averia.
 *
 * La culpa era de la condicion: mirbaa `filasSinActor` a secas. Pero una fila
 * se queda en blanco por dos razones que no se parecen en nada:
 *
 *   - a ese personaje TODAVIA no se le ha puesto nadie  -> el curso normal
 *   - la aplicacion SI tenia su talento y no se escribio -> eso es la averia
 *
 * Solo la segunda merece abrir el panel. Un aviso que salta siempre deja de
 * querer decir nada, y este saltaba con un solo personaje sin repartir, o sea
 * practicamente siempre.
 */
'use strict';
const { montar, fuentes } = require('./ayuda');

exports.nombre = 'El aviso del desglose distingue «falta repartir» de «se ha perdido»';

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['function castNorm(t){', '/** El número final, si lo hay'],
  ['function castClave(t){', '/** Del nombre de la hoja al archivo XML'],
  ['/** De las filas en blanco, las que NO deberían estarlo', 'function castDiagExport(fuente, asign, r){']
];

function armar(){
  return montar(RECORTES,
    ['castFilasVaciasConTalento', 'castDiagHayAveria', 'castQuienVaEnLaFila'],
    { charIdx: {}, NO_REC: new Set(['X', 'ORIGINAL']),
      castVerificar: () => {}, fallo: () => {},
      window: {}, console: { warn: () => {}, log: () => {} } });
}

/* Un trozo del desglose que llego de sala, con sus numeros de fila de verdad. */
const NOM = { 21: 'MALE STATION RICKSHAW DRIVER 1', 22: 'GA-GYEONG', 39: 'SO-RAN', 42: 'PHILIP' };
const FILAS = [21, 22, 39, 42];

exports.pruebas = function(t){
  const M = armar();

  t.seccion('1 · una fila en blanco porque falta repartir NO es una avería');
  /* El caso que llego de sala: PHILIP sin actor en el Excel porque nadie se lo
     ha asignado todavia. */
  const asignCasi = { 'MALE STATION RICKSHAW DRIVER 1': 'MIGUEL VELEZ',
                      'GA-GYEONG': 'VALERIA JIMENEZ', 'SO-RAN': 'YARLEY GOMEZ' };
  const actCasi = { 21: 'MIGUEL VELEZ', 22: 'VALERIA JIMENEZ', 39: 'YARLEY GOMEZ' };
  t.eq('no se cuenta como perdida', M.castFilasVaciasConTalento(NOM, actCasi, FILAS, asignCasi).length, 0,
       'a PHILIP no se le ha puesto nadie: su celda vacía es correcta');

  t.seccion('2 · una fila en blanco TENIENDO talento sí lo es');
  /* La misma foto, pero con PHILIP repartido. Si su celda sigue vacia, algo se
     ha perdido entre el reparto y el Excel: eso es lo que hay que cantar. */
  const asignTodos = Object.assign({ PHILIP: 'LUIS H MORENO' }, asignCasi);
  const perdidas = M.castFilasVaciasConTalento(NOM, actCasi, FILAS, asignTodos);
  t.eq('se cuenta una', perdidas.length, 1);
  t.eq('y es la fila de PHILIP', perdidas[0], 42);

  t.seccion('3 · la fila que SÍ tiene actor no cuenta, esté como esté el reparto');
  /* Caso propio para esta señal: sin el `if(act[f]) return false` las tres
     filas escritas contarian como perdidas. */
  t.eq('ninguna de las escritas', M.castFilasVaciasConTalento(NOM, actCasi, [21, 22, 39], asignTodos).length, 0);

  t.seccion('4 · la fila de archivo encuentra el talento de su gemelo');
  /* El desglose del 307 separa el material de archivo en su propia fila. Si la
     fila (ARCHIVO) sale vacia y el personaje base tiene talento, es una
     perdida: no se puede excusar diciendo que «esa clave no esta repartida». */
  const nomArch = { 7: 'MARK PEYTON', 8: 'MARK PEYTON (ARCHIVO)' };
  const conBase = M.castFilasVaciasConTalento(nomArch, { 7: 'DIEGO TORO' }, [7, 8],
                                              { 'MARK PEYTON': 'DIEGO TORO' });
  t.eq('la de archivo se reclama', conBase.length, 1, JSON.stringify(conBase));
  t.eq('y es la fila 8', conBase[0], 8);

  t.seccion('5 · un nombre de fila que no está en el reparto no se inventa nada');
  t.eq('no cuenta', M.castFilasVaciasConTalento({ 90: 'ALGUIEN QUE NO ESTÁ' }, {}, [90], asignTodos).length, 0,
       'si no hay a quién reclamarle la celda, no hay pérdida que avisar');

  /* Y el que esta en el reparto pero con la casilla del talento en blanco:
     figura, asi que `castQuienVaEnLaFila` devuelve su clave, pero no hay nada
     que se haya podido perder. Caso propio, porque es la otra mitad de la
     condicion y sin el podia caerse sin que nada se pusiera rojo. */
  t.eq('ni el que está repartido con el talento vacío',
       M.castFilasVaciasConTalento({ 42: 'PHILIP' }, {}, [42], { PHILIP: '' }).length, 0);

  t.seccion('6 · cuándo se abre el panel solo');
  const base = { esElFormatoComunDeOtroCapitulo: false, sinSitioEnElExcel: [],
                 filasVaciasTeniendoTalento: [], filasSinActor: 0 };
  t.eq('sin diagnóstico, no', M.castDiagHayAveria(null), false);
  t.eq('si todo cuadra, no', M.castDiagHayAveria(base), false);

  /* Las tres señales, cada una sola, para que ninguna pueda desaparecer
     escondida detras de otra. */
  t.eq('solo el común de otro capítulo, sí',
       M.castDiagHayAveria(Object.assign({}, base, { esElFormatoComunDeOtroCapitulo: true })), true);
  t.eq('solo un talento sin fila, sí',
       M.castDiagHayAveria(Object.assign({}, base, { sinSitioEnElExcel: ['PHILIP'] })), true);
  t.eq('solo una fila vacía teniendo talento, sí',
       M.castDiagHayAveria(Object.assign({}, base, { filasVaciasTeniendoTalento: ['f42  PHILIP'] })), true);

  t.seccion('7 · el caso de sala, entero: 62 de 63 y el panel callado');
  t.eq('con una fila sin repartir, el panel NO se abre',
       M.castDiagHayAveria(Object.assign({}, base, { filasSinActor: 1 })), false,
       'esto es lo que saltaba: 62 talentos de 63 personajes y el aviso abriéndose '
       + 'como si el desglose hubiera salido mal');
  t.eq('ni con veinte sin repartir',
       M.castDiagHayAveria(Object.assign({}, base, { filasSinActor: 20 })), false);

  t.seccion('8 · la condición vive en un solo sitio');
  /* Si el sitio donde se decide vuelve a mirar el total, todo lo de arriba
     sigue verde y el fallo vuelve. */
  const TODO = fuentes().map(f => f.src).join('\n');
  t.ok('el panel se abre llamando a castDiagHayAveria',
       /if\(castDiagHayAveria\(diag\)\)/.test(TODO));
  t.eq('y `filasSinActor` ya no decide nada', (TODO.match(/\|\|\s*diag\.filasSinActor/g) || []).length, 0,
       'volver a sumarlo a la condición devuelve el aviso que salta siempre');
};
