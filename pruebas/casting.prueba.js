/* Casting: continuidad entre capitulos · especificacion 02
 *
 * CAST-N1 es la regla mas importante del proyecto: NUNCA se pisa un talento
 * que haya escrito una persona. Y hasta ahora no tenia ninguna prueba. Vivia
 * en una sola linea repetida en tres sitios -herencia, tabla previa y puente-,
 * o sea tres oportunidades de que una se quedara atras sin que nadie lo notara.
 *
 * Aqui se prueba la de la herencia, que es la que se ejecuta sola al abrir un
 * capitulo y por tanto la que puede hacer dano sin que nadie la haya pedido.
 *
 * Tambien CAST-8 (lo que no coincide exacto se pregunta, no se adivina) con la
 * comparacion de nombres de verdad, y CAST-10 y CAST-11 con la lectura de la
 * tabla de casting previa.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Casting: continuidad';

exports.pruebas = function(t){
  /* ── Comparar nombres · CAST-8 ────────────────────────────────────────── */
  t.seccion('1 · CAST-8 · lo exacto es seguro; lo parecido, dudoso');
  const N = montar(
    [['function castNorm(t){', 'async function castRegCargar(showId){'],
     ['function castRegBuscar(reg, nombre){', 'async function castHeredar(desdeExcel){']],
    ['castNorm', 'castNumFinal', 'castSimil', 'castRegBuscar'], {}
  );

  t.eq('normaliza tildes y mayusculas', N.castNorm('Adiós, Señor'), 'ADIOS SENOR');
  t.eq('el numero final se guarda aparte', N.castNumFinal('SOLDADO 2'), '2');
  t.eq('sin numero, vacio', N.castNumFinal('NILA'), '');
  t.eq('identicos', N.castSimil('NILA', 'NILA'), 1);
  t.ok('una letra de diferencia se parece mucho', N.castSimil('NILA', 'NILAA') > 0.7);
  t.eq('nombres de largo muy distinto, cero', N.castSimil('A', 'ABCDEFGHIJ'), 0);

  const reg = { personajes: {
    'NILA':         { talent: 'ANA MARIA', display: 'NILA' },
    'BABU':         { talent: 'LUIS PEREZ', display: 'BABU' },
    'MALE SOLDIER': { talent: 'CARLOS', display: 'MALE SOLDIER' },
    'SOLDADO 1':    { talent: 'PEDRO', display: 'SOLDADO 1' }
  } };
  const exacto = N.castRegBuscar(reg, 'NILA');
  t.eq('coincidencia exacta: se aplica sola', exacto.seguro, true);
  t.eq('con su talento', exacto.talent, 'ANA MARIA');

  /* Una tilde de diferencia NO genera dudas: castNorm las quita, asi que
     «BABÚ» y «BABU» son el mismo personaje y se aplica solo. */
  const conTilde = N.castRegBuscar(reg, 'BABÚ');
  t.ok('«BABÚ» encuentra a «BABU»', !!conTilde);
  t.eq('y es coincidencia exacta, no una duda', conTilde && conTilde.seguro, true,
       'las tildes no deben hacer dudar: castNorm ya las quita');

  /* Lo que si genera dudas es una errata de verdad. */
  const conErrata = N.castRegBuscar(reg, 'MALE SOLDER');
  t.ok('«MALE SOLDER» encuentra a «MALE SOLDIER»', !!conErrata);
  t.eq('pero se marca como DUDOSO, para preguntar', conErrata && conErrata.seguro, false,
       'un nombre mal heredado es peor que uno sin heredar');
  t.eq('y trae el talento propuesto', conErrata && conErrata.talent, 'CARLOS');
  t.ok('con su grado de parecido', conErrata && conErrata.parecido > 0.86);

  t.eq('una errata demasiado grande no se propone',
       N.castRegBuscar(reg, 'MALE COMMANDER'), null);

  t.eq('un personaje que no esta, nada', N.castRegBuscar(reg, 'TIA'), null);
  t.eq('«SOLDADO 2» NO es «SOLDADO 1»', N.castRegBuscar(reg, 'SOLDADO 2'), null,
       'el numero final distingue personajes: heredar aqui seria un error grave');
  t.eq('un nombre vacio, nada', N.castRegBuscar(reg, ''), null);

  /* ── CAST-N1 · la regla que no se puede romper ────────────────────────── */
  t.seccion('2 · CAST-N1 · nunca se pisa un talento escrito por una persona');

  const charIdx = {};
  const avisos = [];
  const historial = [];
  let mudos = {};                          // los que «solo hacen gestos»

  const H = montar(
    [['async function castHeredar(desdeExcel){', 'function castVerificar(key, verificado){']],
    ['castHeredar'],
    {
      charIdx: charIdx,
      LDB: { showId: 'sh1' },
      currentEp: { id: 'ep1', showId: 'sh1' },
      NO_REC: new Set(['ORIGINAL', 'TODOS', 'X', 'N/A', 'NA']),
      norm: N.castNorm,
      castNorm: N.castNorm,
      castRegCargar: async () => reg,
      castRegBuscar: N.castRegBuscar,
      gestPendiente: (k) => !!mudos[k],
      castHistPush: (foto, etq) => historial.push(etq),
      castFoto: (keys) => keys.map(k => ({ key: k, talent: (charIdx[k] || {}).talent || '' })),
      castPreguntarDudosos: async () => [],        // en esta prueba nadie confirma nada
      renderCards: () => {},
      epDataUpsert: async () => true,
      castAvisarChoquesTodos: () => {},
      castAviso: (m) => avisos.push(m),
      gestAvisar: () => {},
      window: { _charsRaw: [] }
    }
  );

  const monta = (defs) => {
    for(const k in charIdx) delete charIdx[k];
    for(const d of defs) charIdx[d.key] = { display: d.display || d.key, talent: d.talent || '' };
    avisos.length = 0; historial.length = 0;
  };

  // A tiene talento puesto A MANO y distinto del que dice el registro.
  // B esta vacio. El registro conoce a los dos.
  monta([{ key: 'NILA', talent: 'QUIEN YO DIGA' }, { key: 'BABU' }]);
  return Promise.resolve(H.castHeredar(null)).then(function(){
    t.eq('el talento escrito a mano sigue intacto', charIdx.NILA.talent, 'QUIEN YO DIGA',
         'si esto falla, la aplicacion le cambia la voz a un personaje ya repartido');
    t.ok('y NO se marca como heredado', !charIdx.NILA.heredado);
    t.eq('el que estaba vacio si hereda', charIdx.BABU.talent, 'LUIS PEREZ');
    t.eq('y se marca como heredado, para que alguien lo verifique', charIdx.BABU.heredado, true);

    /* Lo mismo con el casting que viene DENTRO del Excel subido. */
    t.seccion('3 · CAST-N1 · tampoco lo pisa el casting que trae el Excel');
    monta([{ key: 'NILA', talent: 'QUIEN YO DIGA' }, { key: 'BABU' }]);
    return H.castHeredar({ 'NILA': 'OTRO CUALQUIERA', 'BABU': 'DEL EXCEL' });
  }).then(function(){
    t.eq('sigue intacto', charIdx.NILA.talent, 'QUIEN YO DIGA');
    t.eq('y el vacio toma el del Excel', charIdx.BABU.talent, 'DEL EXCEL');

    /* CAST-N2 · los de solo gestos se saltan y se dice. */
    t.seccion('4 · CAST-N2 · un personaje de solo gestos no se rellena solo');
    monta([{ key: 'NILA' }, { key: 'BABU' }]);
    mudos = { NILA: true };
    return H.castHeredar(null);
  }).then(function(){
    t.eq('el mudo se queda sin talento', charIdx.NILA.talent, '');
    t.eq('el que habla si hereda', charIdx.BABU.talent, 'LUIS PEREZ');
    t.ok('y se dice a quien se ha saltado y por que',
         avisos.some(m => m.indexOf('NILA') >= 0 && m.indexOf('gestos') >= 0),
         'avisos: ' + JSON.stringify(avisos));
    mudos = {};

    /* Un talento que no se graba se marca como tal. */
    t.seccion('5 · un talento de los que no se graban se marca');
    monta([{ key: 'NILA' }]);
    reg.personajes['NILA'].talent = 'ORIGINAL';
    return H.castHeredar(null);
  }).then(function(){
    t.eq('hereda ORIGINAL', charIdx.NILA.talent, 'ORIGINAL');
    t.eq('y queda marcado como «no se graba»', charIdx.NILA.noRec, true);
    reg.personajes['NILA'].talent = 'ANA MARIA';

    t.seccion('6 · si no hay nada que heredar, no se toca ni se avisa');
    monta([{ key: 'DESCONOCIDO' }]);
    return H.castHeredar(null);
  }).then(function(){
    t.eq('sigue vacio', charIdx.DESCONOCIDO.talent, '');
    t.eq('sin avisos', avisos.length, 0);
    t.eq('y sin nada en el historial de deshacer', historial.length, 0);

    /* ── CAST-10 y CAST-11 · la tabla de casting previa ─────────────────── */
    t.seccion('7 · CAST-10 · la cabecera de la tabla, por coincidencia EXACTA');
    const T = montar(
      [['function castTablaLeer(rows){', 'async function castSubirTabla(file){']],
      ['castTablaLeer'], {}
    );

    const conCabecera = T.castTablaLeer([
      ['Personaje', 'Talento', 'Intervenciones'],
      ['NILA', 'ANA MARIA', 40],
      ['BABU', 'LUIS PEREZ', 12]
    ]);
    t.eq('la cabecera se salta', conCabecera.length, 2);
    t.eq('primera fila', conCabecera[0].personaje, 'NILA');

    /* Este es el caso que ya fallo una vez: buscando la palabra «actor»
       DENTRO de la celda, una tabla cuyo primer talento se llamara «ACTOR A»
       perdia su primera fila. */
    const talentoLlamadoActor = T.castTablaLeer([
      ['NILA', 'ACTOR A', 40],
      ['BABU', 'ACTOR B', 12]
    ]);
    t.eq('una tabla SIN cabecera no pierde su primera fila', talentoLlamadoActor.length, 2,
         'aunque el talento se llame «ACTOR A»');
    t.eq('y la primera es NILA', talentoLlamadoActor[0].personaje, 'NILA');
    t.eq('con su talento', talentoLlamadoActor[0].talento, 'ACTOR A');

    t.seccion('8 · CAST-11 · una celda de intervenciones vacia es DESCONOCIDO, no cero');
    const conVacio = T.castTablaLeer([
      ['NILA', 'ANA MARIA', ''],
      ['BABU', 'LUIS PEREZ', 0],
      ['TIA', 'ROSA', 7]
    ]);
    t.eq('vacia da null', conVacio[0].ints, null,
         'como cero disparaba el aviso de «no cuadran las intervenciones» sin motivo');
    t.eq('un cero de verdad si es cero', conVacio[1].ints, 0);
    t.eq('y un numero es su numero', conVacio[2].ints, 7);
    t.eq('una fila sin personaje se descarta',
         T.castTablaLeer([['', 'ANA', 4], ['NILA', 'ANA', 4]]).length, 1);
  });
};
