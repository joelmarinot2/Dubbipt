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
const { montar, fuentes } = require('./ayuda');

exports.nombre = 'Solo gestos';

exports.pruebas = function(t){
  const script = [];
  const charIdx = {};
  const w = { _charsRaw: [], _dataEpId: 'x' };
  const G = montar(
    [['const GEST_PAL', '/** Aviso al entrar en casting']],
    ['gestNucleo', 'gestRenglonMudo', 'gestBloqueMudo', 'gestEscanear', 'gestRenglonTodos', 'gestMarcarTodos', 'gestNombreTodos',
     'gestVerificar', 'gestOlvidar', 'gestPendientes', 'GEST_TODOS', 'GEST_ORIGINAL'],
    { script, charIdx, DDL_MODO: 'casting', window: w,
      NO_REC: new Set(['ORIGINAL', 'TODOS', 'X']), norm: (s) => String(s).toUpperCase().trim(),
      castHistPush: () => {}, castFoto: () => ({}), fallo: () => {} }
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

  t.seccion('5 · el bullicio, los wallas y lo indistinto lo graban TODOS');
  /* Pedido de sala: «en el modo casting, cuando se hace el barrido de quién
     es original, pon al talento TODOS cuando encuentre (BULLICIO) (WALLAS)
     (INDISTINTO)». Una multitud no se deja original: la graban todos. */
  for(const x of ['(BULLICIO)', '(WALLAS)', '(WALLA)', '(INDISTINTO)', '(MURMULLO INDISTINTO)', '(INDISTINCT CHATTER)',
                  'BULLICIO', '(BULLICIO) (OFF)', '(Bullicio de mercado)', '(REACCIÓN) (WALLAS)'])
    t.eq('«' + x + '» es de todos', G.gestRenglonTodos(x), true);
  for(const x of ['(REACCIÓN)', '(GRITA)', '(MURMULLOS)', '(AMBIENTE)', '', 'Qué bullicioso está esto.', '(RISAS)'])
    t.eq('«' + x + '» no', G.gestRenglonTodos(x), false);
  t.eq('INDISTINTO sin paréntesis también es gesto', G.gestRenglonMudo('INDISTINTO'), true);
  t.eq('pero una frase con bullicio dentro es diálogo', G.gestRenglonMudo('Qué bullicio hay en la plaza.'), false);
  /* En el escaneo: solo los que son todo gesto y traen bullicio. */
  script.length = 0;
  for(const b of [
    { idx: 0, key: 'MULTITUD', lines: ['(BULLICIO)'] },
    { idx: 1, key: 'MULTITUD', lines: ['(BULLICIO)', '(GRITOS)'] },
    { idx: 2, key: 'GENTE', lines: ['(REACCIÓN)'] },
    { idx: 3, key: 'GENTE', lines: ['(WALLAS)'] },
    { idx: 4, key: 'VOCES', lines: ['(INDISTINTO)'] },
    { idx: 5, key: 'PUBLICO', lines: ['(BULLICIO)'] },
    { idx: 6, key: 'PUBLICO', lines: ['¡Bravo!'] },                     // habla: no es de todos solo
    { idx: 7, key: 'MALESOLDIER', lines: ['(REACCIÓN)'] },
    { idx: 8, key: 'CORO', lines: ['(WALLA)'] }
  ]) script.push(b);
  for(const k in charIdx) delete charIdx[k];
  charIdx.MULTITUD = { display: 'MULTITUD', talent: '' };
  charIdx.GENTE = { display: 'GENTE', talent: '' };
  charIdx.VOCES = { display: 'VOCES', talent: '' };
  charIdx.PUBLICO = { display: 'PÚBLICO', talent: '' };
  charIdx.MALESOLDIER = { display: 'MALE SOLDIER', talent: '' };
  charIdx.CORO = { display: 'CORO', talent: 'ANA' };                   // lo escribió una persona
  w._charsRaw = Object.keys(charIdx).map(k => ({ key: k, talent: charIdx[k].talent }));
  w._dataEpId = 'y';
  G.gestOlvidar();
  const m2 = G.gestEscanear();
  t.eq('los de bullicio van marcados', Object.keys(m2).filter(k => m2[k].todos).sort().join(','), 'CORO,GENTE,MULTITUD,VOCES');
  t.eq('uno que solo reacciona, no', m2.MALESOLDIER.todos, false);
  t.eq('y uno que además habla no está en el barrido: se reparte a mano', !!m2.PUBLICO, false,
       'con una palabra de verdad podría ser un personaje con una línea de ruido, y TODOS sería un error caro');
  const puestos = G.gestMarcarTodos();
  t.eq('al entrar en casting se les pone TODOS, por nombre', puestos.sort().join(','), 'GENTE,MULTITUD,VOCES');
  t.eq('en la tarjeta', [charIdx.MULTITUD.talent, charIdx.GENTE.talent, charIdx.VOCES.talent].join(','), 'TODOS,TODOS,TODOS');
  t.ok('como marca de producción, no como actor, y ya mirado', charIdx.MULTITUD.noRec === true && charIdx.MULTITUD.gestOk === true && charIdx.MULTITUD.heredado === false);
  t.eq('el que escribió una persona no se toca (CAST-N1)', charIdx.CORO.talent, 'ANA');
  t.eq('el que solo reacciona sigue vacío: ese sí se deja original a mano', charIdx.MALESOLDIER.talent, '');
  t.eq('y en lo crudo, que es lo que se guarda', w._charsRaw.filter(x => x.talent === 'TODOS').map(x => x.key).sort().join(','), 'GENTE,MULTITUD,VOCES');
  t.eq('ya no quedan pendientes de bullicio: el que reacciona, y el coro que repartió una persona sin mirarlo',
       G.gestPendientes().map(x => x.key).join(','), 'CORO,MALESOLDIER');
  t.eq('volver a entrar no los vuelve a poner', G.gestMarcarTodos().length, 0);
  /* Y por el NOMBRE: en la lista de diálogos de Netflix el bullicio viene como
     un personaje que se llama WALLA, y ese grita alguna frase suelta
     -«Stays in Boracay!»- sin dejar de ser el bullicio. */
  for(const x of ['WALLA', 'WALLAS', 'Walla', 'WALLA 2', 'BULLICIO', 'INDISTINTO'])
    t.eq('quien se llama «' + x + '» es de todos', G.gestNombreTodos(x), true);
  for(const x of ['WALLACE', 'WALLA VENDOR', 'MALE SOLDIER', 'TODOS', '2', '', 'PUBLICO'])
    t.eq('«' + x + '» no', G.gestNombreTodos(x), false);
  script.push({ idx: 9, key: 'WALLA', lines: ['[INDISTINCT]'] });
  script.push({ idx: 10, key: 'WALLA', lines: ['Stays in Boracay!'] });
  script.push({ idx: 11, key: 'WALLACE', lines: ['(BULLICIO)'] }, { idx: 12, key: 'WALLACE', lines: ['Buenas noches.'] });
  charIdx.WALLA = { display: 'WALLA', talent: '' };
  charIdx.WALLACE = { display: 'WALLACE', talent: '' };
  w._charsRaw.push({ key: 'WALLA', talent: '' }, { key: 'WALLACE', talent: '' });
  G.gestOlvidar();
  t.eq('el WALLA que además grita una frase no está en el barrido de gestos', !!G.gestEscanear().WALLA, false);
  t.eq('pero se llama WALLA: TODOS', G.gestMarcarTodos().join(','), 'WALLA');
  t.ok('en la tarjeta y en lo crudo', charIdx.WALLA.talent === 'TODOS' && charIdx.WALLA.noRec === true && w._charsRaw.find(x => x.key === 'WALLA').talent === 'TODOS');
  t.eq('WALLACE habla y no se llama así: se reparte a mano', charIdx.WALLACE.talent, '');
  /* Verificar a mano: TODOS para el bullicio, ORIGINAL para el que reacciona. */
  G.gestVerificar('MALESOLDIER', true);
  t.eq('verificar al que reacciona lo deja original', charIdx.MALESOLDIER.talent, G.GEST_ORIGINAL);
  charIdx.CORO.talent = '';
  G.gestVerificar('CORO', true);
  t.eq('verificar al de wallas le pone TODOS, no ORIGINAL', charIdx.CORO.talent, G.GEST_TODOS);
  /* Y el camino de entrada: antes de avisar de los gestos. */
  const FUENTE = fuentes().map(f => f.src).join('\n');
  const iBloque = FUENTE.indexOf("if(m === 'casting' && esteEp){");
  const iMarcar = FUENTE.indexOf('const td = gestMarcarTodos();', iBloque), iAvisar = FUENTE.indexOf("try{ gestAvisar(); }catch(e){}", iBloque);
  t.ok('al entrar en casting se marca el bullicio antes de avisar de los gestos', iBloque > 0 && iMarcar > iBloque && iAvisar > iMarcar && iAvisar - iMarcar < 1500,
       'si se avisara antes, la multitud saldría como pendiente de mirar');
  t.ok('y el aviso de la tarjeta dice el talento que quedó, no siempre ORIGINAL',
       /DDL_UI\.toast\('Verificado: ' \+ c\.display \+ ' → ' \+ \(\(charIdx\[c\.key\] && charIdx\[c\.key\]\.talent\) \|\| GEST_ORIGINAL\)\)/.test(FUENTE));
  t.ok('y se dice a quién', /castAviso\('👥 ' \+ td\.length \+ ' con ' \+ GEST_TODOS/.test(FUENTE));
  t.ok('el panel de gestos dice cuál es bullicio y que lo graban todos', /x\.todos \? ', bullicio o wallas · lo graban ' \+ GEST_TODOS : ', todas gesto'/.test(FUENTE));
};
