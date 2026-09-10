/* Personajes que en un capítulo SOLO hacen gestos.
 *
 * Lo que protege esta prueba: que a «MALE SOLDIER» no se le herede el actor
 * del capítulo anterior cuando aquí solo reacciona. Los extras repiten nombre
 * sin ser la misma persona, y un actor convocado para grabar tres jadeos —o,
 * peor, una voz cambiada al que sí habla— es un problema de sala y de dinero.
 *
 * El riesgo real está en los FALSOS POSITIVOS: marcar como «solo gestos» a
 * alguien que habla. Por eso la sección 2 es la más larga, e incluye los dos
 * casos que ya fallaron una vez: «Sí.» y «No.» son diálogo, cortos pero
 * diálogo, y están en la lista de relleno.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Solo gestos';

exports.pruebas = function(t){
  const script = [];
  const charIdx = {};
  const G = montar(
    [['const GEST_PAL', '/** Aviso al entrar en casting']],
    ['gestNucleo', 'gestRenglonMudo', 'gestBloqueMudo', 'gestEscanear'],
    { script, charIdx, DDL_MODO: 'casting', window: { _charsRaw: [], _dataEpId: 'x' } }
  );

  t.seccion('1 · renglones que SÍ son gesto');
  const mudos = [
    '(REACCIÓN)', '(REACCIONES)', '(REACC.)', '(GESTOS)', '(GESTO DE DOLOR)',
    '(EFFORTS)', '(EFFORT)', '(REACTS)', '(REACTION)', '(GRITA)', '(GRITOS)',
    '(RÍE)', '(RISAS)', '(LAUGHS)', '(LLORA)', '(SOLLOZA)', '(SIGHS)',
    '(JADEOS)', '(GASPS)', '(GRUÑIDO)', '(GRUNTS)', '(TOSE)', '(COUGHS)',
    '(MURMULLOS)', '(WALLA)', '(AMBIENTE)', '(SUSURRA)', '(BOSTEZA)',
    '(ESFUERZOS)', '(QUEJIDOS)', '(SCREAMS OFF)', '(REACCIÓN) (OFF)',
    'REACCIÓN', 'REACCIONES', 'GESTOS', 'EFFORTS', 'AD LIBS',
    'AH', 'AHH', 'OH', 'OHHH', 'HMM', 'MMM', 'UF', 'AY', 'UGH', 'JA JA JA',
    '¡AH!', '¡OH!', '...', '—', '¡!', '', '   ',
    '(REACCIÓN)  (V.O.)', '[REACTS]', '*sighs*', '(GRUNTS) (GROANS)',
    '(REACCIÓN X2)', '(EFFORTS, GRUNTS)', 'AH… OH…'
  ];
  for(const x of mudos) t.eq('«' + x + '»', G.gestRenglonMudo(x), true);

  t.seccion('2 · renglones que NO son gesto: hay texto de verdad');
  const hablados = [
    'Hola, ¿cómo estás?',
    '(GRITA) ¡Corre!',
    '(REACCIÓN) No puedo más.',
    'Sí.',                                  // ya falló una vez: SI está en el relleno
    'No.',                                  // ídem
    '¡Alto ahí, soldado!',
    'Ah, ya entiendo lo que pasa.',
    'Reaccionó tarde y por eso lo perdimos.',
    'Un grito en la noche.',
    'Stop!',
    'The soldier is here.',
    '(OFF) Vámonos.',
    'Ja, muy gracioso, señor.',
    'Mmm, qué rico está esto.'
  ];
  for(const x of hablados) t.eq('«' + x + '»', G.gestRenglonMudo(x), false);

  t.seccion('3 · la intervención entera');
  t.eq('cabecera sin texto debajo', G.gestBloqueMudo({ lines: [] }), true);
  t.eq('todo acotaciones', G.gestBloqueMudo({ lines: ['(REACCIÓN)', '(GRITA)'] }), true);
  t.eq('una acotación y una frase', G.gestBloqueMudo({ lines: ['(REACCIÓN)', 'Ven aquí.'] }), false);
  t.eq('acotación quitada, queda diálogo', G.gestNucleo('(RÍE) Vámonos ya').trim(), 'Vámonos ya');
  t.eq('paréntesis sin cerrar se come el resto', G.gestNucleo('(RÍE mucho').trim(), '');

  t.seccion('4 · el escaneo de un libreto');
  const libreto = [
    { idx: 0, key: 'MALESOLDIER', lines: ['(REACCIÓN)'] },
    { idx: 1, key: 'MALESOLDIER', lines: ['(EFFORTS)'] },
    { idx: 2, key: 'MALESOLDIER', lines: ['(GRUNTS)'] },
    { idx: 3, key: 'NILA', lines: ['¿Quién anda ahí?'] },
    { idx: 4, key: 'NILA', lines: ['(REACCIÓN)'] },
    { idx: 5, key: 'FEMALEOWNER', lines: ['(RISAS)', '(TOSE)'] },
    { idx: 6, key: 'GUARDIA', lines: [] },
    { idx: 7, key: null, lines: ['texto suelto sin personaje'] }
  ];
  script.length = 0;
  for(const b of libreto) script.push(b);
  charIdx.MALESOLDIER = { display: 'MALE SOLDIER', talent: '' };
  charIdx.NILA = { display: 'NILA', talent: 'ANA' };
  charIdx.FEMALEOWNER = { display: 'FEMALE OWNER', talent: '' };
  charIdx.GUARDIA = { display: 'GUARDIA', talent: '' };

  const mapa = G.gestEscanear();
  t.eq('los mudos, y solo ellos', Object.keys(mapa).sort().join(','),
       'FEMALEOWNER,GUARDIA,MALESOLDIER');
  t.eq('NILA no está: habla en una de las dos', !!mapa.NILA, false);
  t.eq('MALE SOLDIER, tres intervenciones', mapa.MALESOLDIER.bloques, 3);
  t.eq('con su nombre de pantalla', mapa.MALESOLDIER.display, 'MALE SOLDIER');
  t.eq('y un ejemplo de lo que hace',
       mapa.MALESOLDIER.muestras.join(' | '), '(REACCIÓN) | (EFFORTS) | (GRUNTS)');
  t.eq('un bloque sin líneas cuenta como mudo', mapa.GUARDIA.bloques, 1);
};
