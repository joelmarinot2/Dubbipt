/* Cambiar el libreto conservando el casting · especificacion 02
 *
 * Pedido de sala: «cuando ya tenga el libreto quiero poder subirlo e
 * intercambiarlo, y que se peguen los talentos que ya asigné con el libreto no
 * traducido. Importante: algunos nombres cambian por la traducción, entonces
 * analiza el diálogo y pregúntame si esos dos personajes son los mismos».
 *
 * Lo que protege esta prueba:
 *  · que un talento NO se pegue a otro personaje sin que una persona diga que
 *    sí: una voz cambiada es el error caro (CAST-N3);
 *  · que cancelar deje el capítulo EXACTAMENTE como estaba;
 *  · que al subir un PDF en el sitio de la lista de Excel, el capítulo deje de
 *    apuntar a la lista: si no, en otro equipo se leería encima del libreto.
 *
 * El caso es el de «A Filipino Christmas»: la lista de Netflix cuenta desde
 * 00:00:00:00 y trae RANDOM FEMALE 4, MALE DJ y WALLA; el libreto traducido
 * empieza en 01:00:00:00, sin fotogramas, y los llama MUJER 4, DJ y AMBIENTE.
 */
'use strict';
const { montar, fuentes, INDEX } = require('./ayuda');

exports.nombre = 'Cambiar el libreto conservando el casting';

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['function castNorm(t){', '/** El número final, si lo hay'],
  ['/* ═══ CAMBIAR EL LIBRETO CONSERVANDO EL CASTING', '/* ═══ FIN DE CAMBIAR EL LIBRETO']
];
const EXPORTA = ['LC', 'lcTiempos', 'lcDesfase', 'lcHayAlguien', 'lcQuienHablaba', 'lcClave', 'lcCasar', 'lcAplicar', 'lcHora', 'lcPrueba',
                 'lcFoto', 'lcRestaurar', 'lcSubir', 'lcResumen', 'libCambiar',
                 'ver: () => ({ chars, charIdx, script, scriptByKey, numPages, tcIndex, pdfName, xlsFileName, pdfDoc, lastPdfBuf, lastXlsBuf, pageData, occByChar, charMarks, progress, currentEp })',
                 'poner: (o) => { if("chars" in o){ chars = o.chars; charIdx = {}; chars.forEach(c => charIdx[c.key] = c); } if("script" in o) script = o.script; if("pdf" in o) lastPdfBuf = o.pdf; if("xls" in o) lastXlsBuf = o.xls; if("ep" in o) currentEp = o.ep; if("pdfName" in o) pdfName = o.pdfName; if("xlsName" in o) xlsFileName = o.xlsName; }'];

/* ── El libreto viejo: la lista de diálogos, con el timecode de cada fila ── */
const fila = (key, tcs, lines) => ({ key, tcSec: tcs[0], tcEff: tcs[0], lines, tcs });
const VIEJO_SCRIPT = [
  fila('ALLY',           [10.25, 12.5],        ['Hi, Tonton.', 'Where is everybody?']),
  fila('TONTON',         [15.0],               ['They went to the beach.']),
  fila('RANDOMFEMALE4',  [20.5],               ['Excuse me, miss!']),
  fila('ALLY',           [22.0],               ['Yes?']),
  fila('RANDOMFEMALE4',  [24.75, 27.0],        ['You dropped this.', 'Your wallet.']),
  fila('WALLA',          [30.0],               ['[INDISTINCT]']),
  fila('MALEDJ',         [35.5],               ['Are you ready, Boracay?']),
  fila('WALLA',          [37.0, 39.5],         ['[INDISTINCT]', 'Stays in Boracay!']),
  fila('TONTON',         [42.0],               ['Let us go.']),
  fila('RANDOMFEMALE4',  [45.25],              ['Thank you!']),
  fila('GRAPHICSINSERTS', [50.0],              ['FOR RED']),
  fila('ROSS',           [52.0],               ['[REACTION]'])
];
const pj = (key, display, talent, mas) => Object.assign({ key, display, talent: talent || '', totalInts: 1, pages: [{ p: 1, ints: 1 }] }, mas || {});
const VIEJO_CHARS = () => [
  pj('ALLY', 'ALLY', 'ANA ROJAS'), pj('TONTON', 'TONTON', 'BETO SUR', { heredado: true }),
  pj('RANDOMFEMALE4', 'RANDOM FEMALE 4', 'CARLA DIAZ', { heredado: true }), pj('MALEDJ', 'MALE DJ', 'DANI PAZ'),
  pj('WALLA', 'WALLA', 'TODOS', { noRec: true, gestOk: true }), pj('GRAPHICSINSERTS', 'GRAPHICS INSERTS', ''), pj('ROSS', 'ROSS', '')
];

/* ── El libreto nuevo: traducido, una hora más tarde y sin fotogramas ────── */
const par = (key, tc, lines) => ({ key, tcSec: tc, tcEff: tc == null ? 0 : tc, lines });
const H = 3600;
const NUEVO_SCRIPT = () => [
  par('ALLY',      H + 10, ['Hola, Tonton. ¿Dónde están todos?']),
  par('TONTON',    H + 15, ['Se fueron a la playa.']),
  par('MUJER4',    H + 20, ['¡Disculpe, señorita!']),
  par('ALLY',      H + 22, ['¿Sí?']),
  par('MUJER4',    H + 24, ['Se le cayó esto. Su billetera.']),
  par('AMBIENTE',  H + 30, ['(BULLICIO)']),
  par('DJ',        H + 35, ['¿Están listos, Boracay?']),
  par('AMBIENTE',  H + 37, ['(BULLICIO)']),
  par('AMBIENTE',  H + 39, ['¡Se queda en Boracay!']),
  par('TONTON',    H + 42, ['Vámonos.']),
  par('MUJER4',    H + 45, ['¡Gracias!']),
  par('INSERTOS',  H + 50, ['PARA RED']),
  par('ROSS',      H + 52, ['(REACCIÓN)']),
  par('NARRADOR',  null,   ['Sin timecode propio.'])
];
const NUEVO_CHARS = () => [
  pj('ALLY', 'ALLY'), pj('TONTON', 'TONTON'), pj('MUJER4', 'MUJER 4'), pj('DJ', 'DJ'), pj('AMBIENTE', 'AMBIENTE'),
  pj('INSERTOS', 'INSERTOS'), pj('ROSS', 'ROSS'), pj('NARRADOR', 'NARRADOR')
];

function armar(o){
  o = o || {};
  const w = { _charsRaw: null, _script: null, _adFormat: false, _libTraducido: false, _dataEpId: 'ep1', _cotejo: { 3: { sim: 0.2 } } };
  const diario = [];
  const tabla = (nombre) => ({
    update: (fila) => ({ eq: async (col, id) => { diario.push('fila ' + JSON.stringify(fila) + ' ' + col + '=' + id); return { error: o.errFila ? { message: o.errFila } : null }; } })
  });
  const sb = {
    storage: { from: (cubo) => ({
      upload: async (ruta, blob, op) => { diario.push('sube ' + cubo + ':' + ruta); return { error: o.errSubir ? { message: o.errSubir } : null }; },
      remove: async (rutas) => { diario.push('quita ' + rutas.join(',')); return { error: null }; } }) },
    from: tabla
  };
  const M = montar(RECORTES, EXPORTA, {
    norm: undefined, castNorm: undefined, NO_REC: new Set(['ORIGINAL', 'TODOS', 'X']),
    chars: [], charIdx: {}, script: [], scriptByKey: { a: 1 }, numPages: 21, tcIndex: ['viejo'], pdfName: 'lista.xlsx',
    xlsFileName: 'lista.xlsx', pdfDoc: null, lastPdfBuf: null, lastXlsBuf: 'EXCEL-DE-LA-LISTA',
    pageData: { 1: 'viejo' }, occByChar: { a: 1 }, charMarks: { a: 1 }, progress: { ALLY: 'grabado' },
    currentEp: ('ep' in o) ? o.ep : { id: 'ep1', showId: 'sh1', name: 'Episodio 1' },
    window: w, LDB: { showId: 'sh1' }, sb: sb, Blob: function(x){ this.x = x; },
    loadFileForEp: async (file) => { diario.push('lee ' + file.name); if(o.cargar) return o.cargar(file, M); },
    rebuild: () => diario.push('rebuild'), renderCards: () => diario.push('tarjetas'),
    castAviso: (x) => diario.push('aviso ' + x), fallo: (d) => diario.push('fallo ' + d),
    gestOlvidar: () => diario.push('gestOlvidar'), gestAvisar: () => {}, gestMarcarTodos: () => { diario.push('gestMarcarTodos'); return []; },
    talMarcarSiempreX: () => { diario.push('siempreX'); return []; }, castGemelosAlDia: () => { diario.push('gemelos'); return []; },
    castAvisarChoquesTodos: () => {}, castRegAnotarPronto: () => diario.push('registro'),
    libTraducidoPintar: () => diario.push('boton'), refreshOpenLibretoForEpisode: () => {}, pop2: {},
    epDataUpsert: async (ep, show) => { diario.push('datos ' + ep + '/' + show); return !o.sinDatos; },
    epStamp: async (ep) => 'sello:' + (ep.xls_path || '-') + '|' + (ep.pdf_path || '-'),
    saveEpCache: async (ep, sello) => { diario.push('copia ' + ep + ' ' + sello); },
    idbSet: async (k, v) => { diario.push('idbSet ' + k + ' ' + Object.keys(v).sort().join(',')); },
    idbDel: async (k) => { diario.push('idbDel ' + k); },
    libFetchAll: async () => { diario.push('biblioteca'); }, libPing: (t, id, sh) => diario.push('ping ' + t + ' ' + id + ' ' + sh),
    esc: (x) => String(x).replace(/</g, '&lt;'), document: {},
    console: { warn: () => {}, log: () => {} }
  });
  const viejoChars = VIEJO_CHARS();
  M.poner({ chars: viejoChars, script: VIEJO_SCRIPT });
  w._charsRaw = viejoChars.map(c => ({ ...c }));
  w._script = VIEJO_SCRIPT;
  return { M, w, diario, viejoChars };
}

/** El lector de mentira: deja en memoria el libreto nuevo, como lo haría el de verdad. */
const cargaNueva = (extra) => (file, M) => {
  const nc = NUEVO_CHARS();
  M.poner(Object.assign({ chars: nc, script: NUEVO_SCRIPT(), pdf: 'PDF-NUEVO', pdfName: file.name, xlsName: null }, extra || {}));
};

exports.pruebas = async function(t){
  const { M } = armar();

  t.seccion('1 · quién habla cuándo');
  const tv = M.lcTiempos(VIEJO_SCRIPT);
  t.eq('de la lista, el timecode de cada fila', tv.length, 15);
  t.eq('en orden', tv.every((x, i) => !i || tv[i - 1].t <= x.t), true);
  t.eq('cada uno con lo que dice en ese momento', tv.find(x => x.t === 27).key + ': ' + tv.find(x => x.t === 27).txt, 'RANDOMFEMALE4: Your wallet.');
  const tn = M.lcTiempos(NUEVO_SCRIPT());
  t.eq('del libreto, el de cada parlamento con timecode propio', tn.length, 13,
       'el NARRADOR no trae el suyo: heredar el del anterior sirve para seguir el libreto, no para saber quién hablaba');
  t.eq('sin `tcs` válidos se usa el del parlamento', M.lcTiempos([{ key: 'A', tcSec: 5, lines: ['x'], tcs: [null, 'nada'] }]).map(x => x.t).join(','), '5');
  t.eq('lo que no tiene personaje no cuenta', M.lcTiempos([{ key: null, tcSec: 5, lines: ['x'] }, null]).length, 0);
  t.eq('y salen ordenados aunque el libreto no lo esté', M.lcTiempos([{ key: 'A', tcSec: 9, lines: [] }, { key: 'B', tcSec: 3, lines: [] }]).map(x => x.key).join(''), 'BA');

  t.seccion('2 · el desfase entre los dos libretos');
  const des = M.lcDesfase(tv, tn);
  t.ok('el libreto empieza una hora más tarde: se nota solo', des && Math.abs(des.d - 3600) <= 1, JSON.stringify(des));
  t.eq('y con él cuadran todos los parlamentos del libreto', des.n, 13);
  t.eq('con la misma base, cero', M.lcDesfase(tv, tv).d, 0);
  t.ok('¿empieza alguien entre dos instantes? con los bordes dentro',
       M.lcHayAlguien(tv, 20, 21) && M.lcHayAlguien(tv, 20.5, 20.5) && !M.lcHayAlguien(tv, 31, 35) && !M.lcHayAlguien(tv, 60, 70) && !M.lcHayAlguien(tv, 0, 10));
  t.eq('dos libretos que no se parecen en los tiempos no se pueden comparar',
       M.lcDesfase([{ t: 1 }, { t: 7 }, { t: 20 }, { t: 41 }, { t: 77 }, { t: 130 }, { t: 211 }, { t: 340 }, { t: 555 }, { t: 900 }],
                   [{ t: 3 }, { t: 14 }, { t: 33 }, { t: 61 }, { t: 108 }, { t: 180 }, { t: 290 }, { t: 470 }, { t: 760 }, { t: 1230 }]), null,
       'si ni la mitad de los parlamentos tienen a alguien hablando a esa hora, no hay desfase del que fiarse');
  t.eq('sin timecodes en uno de los dos, nada', M.lcDesfase(tv, []), null);
  /* Tres de diez cuadran, y ninguna otra diferencia cuadra con mas de uno: destaca, pero no cubre la mitad. */
  const pocosV = [5, 17, 31, 52, 80, 115, 160, 214, 280, 361].map(x => ({ t: x }));
  const pocosN = [5, 17, 31, 1000, 1100.3, 1250.7, 1444.1, 1700.9, 2000.2, 2500.6].map(x => ({ t: x }));
  t.eq('un desfase que destaca pero solo cuadra en tres de diez parlamentos no vale', M.lcDesfase(pocosV, pocosN), null,
       'si el libreto nuevo no es del mismo corte, mejor no proponer a nadie que proponer al azar');
  /* Sin fotogramas el libreto redondea hacia abajo: 10:06 y 24:18 son :10 y :24.
     Las dos diferencias -la hora justa y un segundo menos- son la misma. */
  const conF = [{ t: 10.2 }, { t: 20.2 }, { t: 30.2 }, { t: 40.2 }, { t: 50.2 }, { t: 61.9 }, { t: 75.9 }, { t: 90.9 }];
  const sinF = conF.map(x => ({ t: Math.floor(x.t) + 3600 }));
  const dF = M.lcDesfase(conF, sinF);
  t.ok('un libreto sin fotogramas cuadra igual, contando juntos los dos segundos', dF && dF.n === 8 && (dF.d === 3599 || dF.d === 3600), JSON.stringify(dF),
       'cinco diferencias redondean a la hora justa y tres a un segundo menos: por separado, ninguna cubre las ocho');
  /* Y tiene que destacar el DOBLE que cualquier otra diferencia. */
  const regular = Array.from({ length: 12 }, (_, i) => ({ t: i * 10 }));
  t.eq('un ritmo regular cuadra casi igual con varios desfases: ninguno destaca, no se usa ninguno',
       M.lcDesfase(regular, regular.map(x => ({ t: x.t + 5 }))), null,
       'con una frase cada diez segundos, +5, +15 y -5 cuadran casi igual de bien');

  t.seccion('3 · quién hablaba en ese instante');
  t.eq('el que empieza más cerca', M.lcQuienHablaba(tv, 24, 1.5).key, 'RANDOMFEMALE4', '24 está a 0,75 de su 24,75 y a 2 de ALLY');
  t.eq('en un cruce rápido, el más cercano y no el último', M.lcQuienHablaba(tv, 22.2, 1.5).key, 'ALLY');
  t.eq('con tres dentro del margen, el más cercano', M.lcQuienHablaba(tv, 22.2, 3).key, 'ALLY',
       'a 3 segundos caben el 20,5 y el 24,75 de RANDOM FEMALE 4, pero el de ALLY está a 0,2');
  t.eq('si nadie empieza cerca, sigue el último que empezó', M.lcQuienHablaba(tv, 33, 1.5).key, 'WALLA');
  t.eq('antes de que nadie hable, nadie', M.lcQuienHablaba(tv, 2, 1.5), null);
  t.eq('justo en el margen, vale', M.lcQuienHablaba(tv, 8.75, 1.5).key, 'ALLY');

  t.seccion('4 · casar los personajes: por nombre solos, y los demás por cuándo hablan');
  const plan = M.lcCasar({ chars: VIEJO_CHARS(), script: VIEJO_SCRIPT }, { chars: NUEVO_CHARS(), script: NUEVO_SCRIPT() });
  t.eq('los que se llaman igual van solos', plan.iguales.map(x => x.viejo + '=' + x.nuevo).join(' '), 'ALLY=ALLY TONTON=TONTON ROSS=ROSS');
  t.eq('de esos, los que tenían talento', plan.pegan, 2);
  t.eq('se pregunta por los que TIENEN talento y ya no están con su nombre', plan.dudosos.map(d => d.display).join(','), 'RANDOM FEMALE 4,MALE DJ,WALLA',
       'GRAPHICS INSERTS no tenía talento: no hay nada que pegar ni que preguntar');
  const rf = plan.dudosos[0], dj = plan.dudosos[1], wa = plan.dudosos[2];
  t.eq('RANDOM FEMALE 4 habla cuando habla MUJER 4', rf.propuesto + ' ' + rf.candidatos[0].coinciden + '/' + rf.candidatos[0].de, 'MUJER4 3/3');
  t.eq('MALE DJ, cuando DJ', dj.propuesto + ' ' + dj.candidatos[0].coinciden + '/' + dj.candidatos[0].de, 'DJ 1/1');
  t.eq('y WALLA, cuando AMBIENTE', wa.propuesto + ' ' + wa.candidatos[0].coinciden + '/' + wa.candidatos[0].de, 'AMBIENTE 3/3');
  t.eq('con su talento, para decirlo en la pregunta', rf.talent, 'CARLA DIAZ');
  t.eq('y los diálogos de los dos al lado', rf.candidatos[0].muestras.map(m => m.viejo + ' → ' + m.nuevo).join(' | '),
       'Excuse me, miss! → ¡Disculpe, señorita! | You dropped this. → Se le cayó esto. Su billetera. | Thank you! → ¡Gracias!');
  t.eq('los libres del libreto nuevo, para poder elegir otro', plan.libres.map(l => l.display).join(','), 'MUJER 4,DJ,AMBIENTE,INSERTOS,NARRADOR');
  t.eq('el desfase que se usó', Math.abs(plan.desfase - 3600) <= 1, true);
  t.eq('y cuántos hay en cada lado', plan.viejos + '/' + plan.nuevos, '7/8');
  /* No se propone a quien coincide en menos de la mitad. */
  const pocos = NUEVO_SCRIPT().concat([par('MUJER4', H + 60, ['a']), par('MUJER4', H + 70, ['b']), par('MUJER4', H + 80, ['c']), par('MUJER4', H + 90, ['d'])]);
  const p2 = M.lcCasar({ chars: VIEJO_CHARS(), script: VIEJO_SCRIPT }, { chars: NUEVO_CHARS(), script: pocos });
  t.eq('quien coincide en menos de la mitad se enseña pero NO se propone', p2.dudosos[0].propuesto + ' ' + p2.dudosos[0].candidatos[0].coinciden + '/' + p2.dudosos[0].candidatos[0].de, 'null 3/7');
  /* Sin timecodes en el libreto nuevo no se adivina. */
  const sinTC = NUEVO_SCRIPT().map(b => Object.assign({}, b, { tcSec: null }));
  const p3 = M.lcCasar({ chars: VIEJO_CHARS(), script: VIEJO_SCRIPT }, { chars: NUEVO_CHARS(), script: sinTC });
  t.eq('sin timecodes no se puede comparar', p3.desfase, null);
  t.eq('y entonces no se propone a nadie: elige la persona', p3.dudosos.map(d => d.propuesto + ':' + d.candidatos.length).join(' '), 'null:0 null:0 null:0');
  t.eq('pero los de igual nombre siguen yendo solos', p3.iguales.length, 3);
  /* El nombre, como se compara: una comilla curva no hace dos personajes. */
  const p4 = M.lcCasar({ chars: [pj('TARASGANG', "TARA'S GANG", 'EVA')], script: [] }, { chars: [pj('TARA’SGANG', 'TARA’S GANG')], script: [] });
  t.eq('una comilla curva no hace otro personaje', p4.iguales.map(x => x.nuevo).join(''), 'TARA’SGANG');
  /* Dos del viejo con el mismo nombre no se llevan los dos al mismo del nuevo. */
  const p5 = M.lcCasar({ chars: [pj('ANA', 'ANA', 'EVA'), pj('ANA.', 'ANA.', 'LUZ')], script: [] }, { chars: [pj('ANA', 'ANA')], script: [] });
  t.eq('dos del viejo con el mismo nombre: uno va solo y por el otro se pregunta', p5.iguales.length + ' ' + p5.dudosos.map(d => d.display + '=' + d.talent).join(','), '1 ANA.=LUZ');
  /* Y el que ya está por nombre no se ofrece a nadie más. */
  t.ok('un personaje que ya casó por nombre no es candidato de otro', !plan.libres.some(l => l.key === 'ALLY') && !rf.candidatos.some(c => c.nuevo === 'ALLY'));

  t.seccion('5 · pegar los talentos');
  const A = armar();
  const nuevos = NUEVO_CHARS();
  nuevos.find(c => c.key === 'ALLY').talent = 'LA DEL ARCHIVO';     // lo traía escrito el archivo nuevo
  A.M.poner({ chars: nuevos });
  A.w._charsRaw = nuevos.map(c => ({ ...c }));
  const res = A.M.lcAplicar(VIEJO_CHARS(), plan, [{ viejo: 'RANDOMFEMALE4', nuevo: 'MUJER4' }, { viejo: 'WALLA', nuevo: 'AMBIENTE' }]);
  const ix = A.M.ver().charIdx;
  t.eq('los de igual nombre, y los confirmados', res.porNombre + '+' + res.confirmados, '2+2');
  t.eq('cada uno con el suyo', [ix.ALLY.talent, ix.TONTON.talent, ix.MUJER4.talent, ix.AMBIENTE.talent].join(' · '), 'ANA ROJAS · BETO SUR · CARLA DIAZ · TODOS');
  t.eq('lo que repartió una persona manda sobre lo que traía el archivo', ix.ALLY.talent, 'ANA ROJAS');
  t.eq('MALE DJ no se confirmó: DJ se queda vacío', ix.DJ.talent, '', 'un talento no se pega a otro personaje sin que una persona diga que sí');
  t.eq('y se dice, para que no se pierda de vista', res.sinPegar.map(x => x.display + ' (' + x.talent + ') ' + x.causa).join(' | '), 'MALE DJ (DANI PAZ) sin confirmar');
  t.eq('el que no tenía talento sigue sin él', ix.ROSS.talent, '');
  t.ok('TODOS no es un actor: marca de producción, y ya mirado', ix.AMBIENTE.noRec === true && ix.AMBIENTE.gestOk === true && ix.MUJER4.noRec === false);
  t.ok('el heredado sin verificar sigue en naranja; el confirmado ya está mirado', ix.TONTON.heredado === true && ix.MUJER4.heredado === false && ix.ALLY.heredado === false);
  t.eq('y en lo crudo, que es lo que se guarda', A.w._charsRaw.filter(c => c.talent).map(c => c.key + '=' + c.talent).join(' '),
       'ALLY=ANA ROJAS TONTON=BETO SUR MUJER4=CARLA DIAZ AMBIENTE=TODOS');
  /* Dos del viejo en uno del nuevo. */
  const B = armar(); B.M.poner({ chars: NUEVO_CHARS() }); B.w._charsRaw = [];
  const r2 = B.M.lcAplicar(VIEJO_CHARS(), plan, [{ viejo: 'RANDOMFEMALE4', nuevo: 'MUJER4' }, { viejo: 'MALEDJ', nuevo: 'MUJER4' }, { viejo: 'WALLA', nuevo: 'NOESTA' }]);
  t.eq('dos del viejo no caben en uno del nuevo: manda el primero', B.M.ver().charIdx.MUJER4.talent, 'CARLA DIAZ');
  t.eq('y el segundo y el que no está se dicen', r2.sinPegar.map(x => x.display + ': ' + x.causa).join(' | '),
       'MALE DJ: MUJER 4 ya lleva a CARLA DIAZ | WALLA: no está en el libreto nuevo');
  t.eq('sin confirmar a nadie, solo los de igual nombre', B.M.lcAplicar(VIEJO_CHARS(), plan, []).porNombre, 2);

  t.seccion('6 · cómo se dice');
  t.eq('la hora', M.lcHora(3725.9), '01:02:05');
  t.eq('la prueba de una pareja', M.lcPrueba(rf.candidatos[0]).slice(0, 96),
       'Coinciden 3 de sus 3 parlamentos a la misma hora · 01:00:20 «Excuse me, miss!» → «¡Disculpe, señ');
  t.eq('con uno solo, en singular', M.lcPrueba({ coinciden: 1, de: 1, muestras: [] }), 'Coinciden 1 de sus 1 parlamento a la misma hora');
  t.ok('y sin pareja, que elija la persona', /elige tú/.test(M.lcPrueba(null)));
  t.eq('el resumen', M.lcResumen(res), '📥 Libreto cambiado · 4 talentos pegados (2 por nombre, 2 confirmados) · sin pegar: MALE DJ (DANI PAZ)');
  t.eq('sin nada que pegar', M.lcResumen({ porNombre: 0, confirmados: 0, sinPegar: [] }), '📥 Libreto cambiado · 0 talentos pegados');
  t.eq('con uno', M.lcResumen({ porNombre: 1, confirmados: 0, sinPegar: [] }), '📥 Libreto cambiado · 1 talento pegado (1 por nombre)');

  t.seccion('7 · cancelar deja el capítulo como estaba');
  const C = armar({ cargar: cargaNueva() });
  const antes = C.M.ver();
  const rc = await C.M.libCambiar({ name: 'libreto.pdf' }, async () => null);
  const despues = C.M.ver();
  t.eq('no se cambia nada', rc, false);
  t.ok('ni un dato del capítulo: los mismos personajes, el mismo libreto, los mismos archivos',
       Object.keys(antes).every(k => antes[k] === despues[k]), Object.keys(antes).filter(k => antes[k] !== despues[k]).join(','));
  t.ok('ni la marca, ni lo crudo, ni el análisis', C.w._libTraducido === false && C.w._script === VIEJO_SCRIPT && C.w._charsRaw.length === 7 && !!C.w._cotejo[3]);
  t.ok('se vuelve a pintar y se dice', C.diario.includes('rebuild') && C.diario.some(x => /^aviso Libreto sin cambiar/.test(x)));
  t.ok('y a la nube no sube nada', !C.diario.some(x => /^(sube|fila|datos|quita)/.test(x)), C.diario.join(' · '));
  /* Un archivo que no trae libreto. */
  const D = armar({ cargar: (f, M2) => M2.poner({ chars: [], script: [] }) });
  const antesD = D.M.ver();
  t.eq('un archivo sin libreto no cambia nada', await D.M.libCambiar({ name: 'desglose.xlsm' }, async () => []), false);
  t.ok('y el capítulo queda como estaba', Object.keys(antesD).every(k => antesD[k] === D.M.ver()[k]) && D.diario.some(x => /no trae un libreto/.test(x)));
  /* Un archivo que no se puede leer. */
  const E = armar({ cargar: () => { throw new Error('PDF roto'); } });
  const antesE = E.M.ver();
  t.eq('un archivo roto tampoco', await E.M.libCambiar({ name: 'roto.pdf' }, async () => []), false);
  t.ok('queda como estaba, y se dice por qué', Object.keys(antesE).every(k => antesE[k] === E.M.ver()[k]) && E.diario.some(x => /No se pudo leer «roto\.pdf»/.test(x)));
  t.eq('sin archivo, nada', await M.libCambiar(null), false);
  const F0 = armar(); F0.M.poner({ chars: [], script: [] });
  t.eq('sin capítulo abierto, nada', await F0.M.libCambiar({ name: 'x.pdf' }, async () => []), false);

  t.seccion('8 · decir que sí: se cambia, se pega y se sube');
  let visto = null;
  const G = armar({ cargar: cargaNueva() });
  const rg = await G.M.libCambiar({ name: 'libreto traducido.pdf' }, async (p, nombre) => { visto = { p, nombre }; return [{ viejo: 'RANDOMFEMALE4', nuevo: 'MUJER4' }]; });
  const g = G.M.ver();
  t.eq('a quien pregunta le llega el plan y el nombre del archivo', visto.nombre + ' · ' + visto.p.dudosos.length + ' dudosos', 'libreto traducido.pdf · 3 dudosos');
  t.eq('el libreto en memoria es el nuevo', g.script.length + ' ' + g.chars.length, '14 8');
  t.eq('con los talentos pegados', g.chars.filter(c => c.talent).map(c => c.display + '=' + c.talent).join(' '), 'ALLY=ANA ROJAS TONTON=BETO SUR MUJER 4=CARLA DIAZ');
  t.eq('lo que devuelve', rg.porNombre + '+' + rg.confirmados + ' sin pegar ' + rg.sinPegar.length, '2+1 sin pegar 2');
  t.eq('ya hay libreto: queda marcado como traducido', G.w._libTraducido, true);
  t.eq('y el análisis de cambios del libreto anterior se va', JSON.stringify(G.w._cotejo), '{}');
  t.ok('el capítulo sigue siendo el mismo', g.currentEp && g.currentEp.id === 'ep1');
  t.ok('se repasan los gemelos, las X y el bullicio del libreto nuevo', G.diario.includes('gemelos') && G.diario.includes('siempreX') && G.diario.includes('gestMarcarTodos'));
  t.ok('se pinta y se avisa', G.diario.includes('tarjetas') && G.diario.includes('boton') && G.diario.some(x => /^aviso 📥 Libreto cambiado · 3 talentos pegados/.test(x)));
  /* A la nube: el PDF nuevo, y el capítulo deja de apuntar a la lista. */
  t.ok('sube el PDF nuevo', G.diario.includes('sube libretos:sh1/ep1/libreto.pdf'));
  t.ok('y NO vuelve a subir el Excel de la lista, que seguía en memoria', !G.diario.some(x => /sube .*desglose\.xlsm/.test(x)),
       'se vacía antes de leer el archivo nuevo: si no, la lista se subiría como si fuera del libreto');
  const filaG = G.diario.find(x => /^fila /.test(x)) || '';
  t.ok('el capítulo apunta al PDF y deja de apuntar a la lista', /"xls_path":null,"xls_name":null,"pdf_path":"sh1\/ep1\/libreto\.pdf","pdf_name":"libreto traducido\.pdf"/.test(filaG) && / id=ep1$/.test(filaG), filaG);
  const iFila = G.diario.findIndex(x => /^fila /.test(x)), iQuita = G.diario.findIndex(x => /^quita /.test(x));
  t.ok('la lista vieja se quita DESPUÉS de que el capítulo deje de apuntarla', iFila >= 0 && iQuita > iFila && G.diario[iQuita] === 'quita sh1/ep1/desglose.xlsm');
  t.ok('el libreto ya leído va a la base de datos', G.diario.includes('datos ep1/sh1'));
  t.ok('y la copia de este equipo, con la huella nueva y el PDF', G.diario.includes('idbDel ep:ep1') && G.diario.includes('copia ep1 sello:-|sh1/ep1/libreto.pdf')
       && G.diario.includes('idbSet ddl-files::ep1 pdf,pdf_name,stamp,xls_name'));
  t.ok('se avisa a los otros equipos y se apunta en el registro del programa', G.diario.includes('ping ep ep1 sh1') && G.diario.includes('biblioteca') && G.diario.includes('registro'));
  /* Un Word no deja archivo: se quitan los dos. */
  const W = armar({ cargar: cargaNueva({ pdf: null }) });
  await W.M.libCambiar({ name: 'libreto.docx' }, async () => []);
  t.ok('un Word no sube archivo, y el capítulo deja de apuntar a los dos', !W.diario.some(x => /^sube /.test(x))
       && /"xls_path":null,"xls_name":null,"pdf_path":null,"pdf_name":null/.test(W.diario.find(x => /^fila /.test(x)) || '')
       && W.diario.includes('quita sh1/ep1/desglose.xlsm,sh1/ep1/libreto.pdf') && W.diario.includes('idbDel ddl-files::ep1'));
  /* Otra lista en Excel: se sube en su sitio. */
  const X = armar({ cargar: cargaNueva({ pdf: null, xls: 'EXCEL-NUEVO', xlsName: 'lista v2.xlsx', ep: null }) });   // leer un Excel suelta el capítulo
  await X.M.libCambiar({ name: 'lista v2.xlsx' }, async () => []);
  t.ok('otro Excel se sube en el sitio del anterior, y el capítulo sigue siendo este aunque leerlo lo suelte',
       X.M.ver().currentEp && X.M.ver().currentEp.id === 'ep1' && X.diario.includes('sube libretos:sh1/ep1/desglose.xlsm')
       && /"xls_path":"sh1\/ep1\/desglose\.xlsm","xls_name":"lista v2\.xlsx","pdf_path":null/.test(X.diario.find(x => /^fila /.test(x)) || ''));
  /* Lo que puede fallar en la nube se dice, y el cambio queda en este equipo. */
  const Y = armar({ cargar: cargaNueva(), errSubir: 'sin permiso' });
  await Y.M.libCambiar({ name: 'l.pdf' }, async () => []);
  t.ok('si el PDF no sube, se dice, y no se toca la fila del capítulo', Y.diario.some(x => /no se ha guardado en la nube: no se pudo subir el PDF: sin permiso/.test(x)) && !Y.diario.some(x => /^fila /.test(x)));
  const Z = armar({ cargar: cargaNueva(), errFila: 'RLS' });
  await Z.M.libCambiar({ name: 'l.pdf' }, async () => []);
  t.ok('si el capítulo no se puede actualizar, no se quita la lista vieja', Z.diario.some(x => /no se pudo actualizar el capítulo: RLS/.test(x)) && !Z.diario.some(x => /^quita /.test(x)));
  const Q = armar({ cargar: cargaNueva(), sinDatos: true });
  await Q.M.libCambiar({ name: 'l.pdf' }, async () => []);
  t.ok('y si el libreto no llega a la base de datos, también se dice', Q.diario.some(x => /el libreto no subió a la base de datos/.test(x)));
  /* Un capítulo suelto, sin programa: se cambia aquí y no hay nube. */
  const S = armar({ cargar: cargaNueva(), ep: null });
  const rs = await S.M.libCambiar({ name: 'l.pdf' }, async () => []);
  t.ok('sin capítulo guardado, se cambia en memoria y no se sube nada', rs && rs.porNombre === 2 && !S.diario.some(x => /^(sube|fila|datos)/.test(x)));
  t.eq('y subir a secas dice por qué no', (await S.M.lcSubir()).causa, 'el capítulo no está guardado en un programa');

  t.seccion('9 · por dónde se entra');
  const HTML = require('fs').readFileSync(INDEX, 'utf8');
  const F = fuentes().map(f => f.src).join('\n');
  t.ok('el botón está en la barra, con su entrada de archivo',
       /id="btnLibCambiar" style="display:none" onclick="document\.getElementById\('libCambioFile'\)\.click\(\)"/.test(HTML)
       && /id="libCambioFile" accept="application\/pdf,\.pdf,\.docx,\.xlsx,\.xlsm,\.xls" style="display:none" onchange="if\(this\.files\[0\]\) libCambiar\(this\.files\[0\]\); this\.value=''"/.test(HTML));
  t.ok('y solo se enseña en casting', /'btnBaseTal','btnLibTrad','btnLibCambiar'[,\]]/.test(F));
  t.ok('la ventana no trae nada marcado: cada pareja la confirma una persona',
       /<input type="checkbox" class="lc-ok" data-i="' \+ i \+ '"' \+ \(d\.propuesto \? '' : ' disabled'\) \+ '> Sí, es el mismo/.test(F) && !/class="lc-ok"[^>]*checked/.test(F));
  t.ok('al elegir otra pareja, la marca de antes no vale', /caja\.checked = false; caja\.disabled = !sel\.value;/.test(F));
  t.ok('cancelar la ventana es no cambiar nada', /cap\.querySelector\('#lcNo'\)\.onclick = \(\) => fin\(null\);/.test(F));
  t.ok('y solo cuentan las marcadas que tienen pareja', /if\(c\.checked && sel && sel\.value\) out\.push\(\{ viejo: plan\.dudosos\[i\]\.viejo, nuevo: sel\.value \}\);/.test(F));
};
