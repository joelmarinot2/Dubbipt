/* Producción: lo que viene de DublajeCast · especificacion 09
 *
 * Pedido de sala: «quiero migrar la plataforma de DublajeCast a Dubbipt».
 * Primera fase: traer los datos enteros y verterlos en lo que Dubbipt ya
 * tiene -la base de talentos y el registro de casting de cada programa-.
 *
 * Lo que protege esta prueba:
 *  · que traer solo SUME: ni se quita un talento ni se pisa un casting que
 *    Dubbipt ya tenía distinto;
 *  · que lo que no se entiende del JSON se conserve: es de alguien;
 *  · que las alertas de entrega se calculen como allí, con fecha local.
 */
'use strict';
const { montar, fuentes } = require('./ayuda');

exports.nombre = 'Producción: lo que viene de DublajeCast';

const RECORTES = [
  ['function castNorm(t){', 'async function castRegCargar(showId){'],
  ['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']
];
const EXPORTA = ['PROD', 'PROD_CLAVES', 'prodVacio', 'prodNormalizar', 'prodEsVolcado', 'prodResumen', 'prodIndices', 'prodFecha', 'prodDias',
                 'prodAlertaMiami', 'prodAlertaDubcard', 'prodPlazo', 'prodFormatoDubcard', 'prodAlertasEp', 'prodFicha', 'prodFichaTexto',
                 'prodCasarPrograma', 'prodAplicar', 'prodGuardar', 'prodCargar', 'prodImportar', 'prodImportarArchivo', 'prodExportarJson',
                 'prodResumenTexto', 'prodSinTabla', 'prodHtmlProgramas', 'prodHtmlTalentos', 'prodHtmlTrailers',
                 'prodPuede', 'prodPintarBoton', 'prodPanel', 'PROD_SIN_PERMISO'];

const HOY = new Date(2026, 9, 7);                      // 7 de octubre de 2026, local
const dia = (n) => { const d = new Date(HOY); d.setDate(d.getDate() + n); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

/* Un volcado pequeño, con la forma de los de verdad. */
const VOLCADO = () => ({
  _version: 'dublajecast_v2', _exportedAt: '2026-10-06T10:00:00Z',
  series: [
    { id: 1, name: ' A Filipino Christmas ', type: 'serie', status: 'en_curso', director: 'Wilfredo Hueso', cliente: 'Netflix', studio_id: 1 },
    { id: 2, name: 'Akka', type: 'serie', status: 'completo', director: '', cliente: 'Discovery', studio_id: 2, requiere_dubcard: false }
  ],
  episodes: [
    { id: 11, series_id: 1, episode_number: 1, title: 'The Last New Year in Boracay', studio_id: 1, status: 'en_curso', fase: 'pre_produccion', fecha_dubcard: dia(2), fecha_miami: dia(-1) },
    { id: 12, series_id: '1', episode_number: 2, title: 'Episodio 2', studio_id: 1, status: 'pendiente', fase: 'pre_produccion', fecha_dubcard: dia(10) },
    { id: 21, series_id: 2, episode_number: 101, title: 'Akka 101', studio_id: 2, status: 'completo', fase: 'completado', fecha_dubcard: dia(-9) }
  ],
  characters: [{ id: 101, canonical_name: 'ALLY', tipo: 'principal' }, { id: 102, canonical_name: 'JANA' }, { id: 201, name: 'MANJAYA' }],
  talents: [
    { id: 1, name: 'ANA ROJAS', genero: 'femenino', edad_aparente: 'adulto', tono_de_voz: 'agudo', email: 'ana@x.co' },
    { id: 2, name: 'Beatriz  Sol', genero: 'femenino', edad_aparente: 'adolescente', tono_de_voz: 'medio' },
    { id: 3, name: 'CARLOS RUIZ', genero: 'masculino', edad_aparente: 'mayor', tono_de_voz: 'grave', registro: 'Barítono' }
  ],
  castings: [{ id: 1, character_id: 101, talent_id: 1, episode_id: 11 }, { id: 2, character_id: '102', talent_id: 2, episode_id: '11' }, { id: 3, character_id: 201, talent_id: 3, episode_id: 21 },
             { id: 4, character_id: 101, talent_id: 1, episode_id: 11 }],
  appearances: [{ id: 1, character_id: 101, episode_id: 11, line_count: 186, first_timecode: '00:00:22' }],
  trailers: [
    { id: 1, type: 'trailer', etapa: 'mezcla', title: 'Tráiler oficial', series_id: 1, deadline: dia(1), status: 'pendiente' },
    { id: 2, type: 'teaser', title: 'Teaser 30s', series_id: 2, deadline: dia(-3), status: 'completo' }
  ],
  studios: [{ id: 1, name: 'Estudio 1' }],
  loQueSea: { nota: 'esto no lo conoce Dubbipt' }
});

function armar(o){
  o = o || {};
  const diario = [], avisos = [], idb = {};
  const clave = (n) => String(n).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  const TAL = { nombres: o.base ? o.base.slice() : [], claves: new Set((o.base || []).map(clave)), origen: o.origen || '', cargada: true };
  const registros = o.registros || {};
  let tabla = ('tabla' in o) ? o.tabla : 'vacia';          // 'vacia' | 'sin' (no existe) | {fila}
  const almacen = {};
  const sb = {
    from: (t) => ({
      upsert: async (fila) => { diario.push('upsert ' + t + ' ' + fila.workspace_id + ' rev ' + fila.rev); if(tabla === 'sin') return { error: { code: '42P01', message: 'relation "public.produccion" does not exist' } }; tabla = fila; return { error: null }; },
      select: () => ({ eq: () => ({ maybeSingle: async () => { if(tabla === 'sin') return { data: null, error: { code: 'PGRST205', message: "Could not find the table 'public.produccion' in the schema cache" } }; return { data: (tabla && tabla !== 'vacia') ? { data: tabla.data, rev: tabla.rev, updated_at: tabla.updated_at } : null, error: null }; } }) })
    }),
    storage: { from: () => ({
      upload: async (ruta, blob) => { diario.push('almacen ' + ruta); almacen[ruta] = blob; return { error: null }; },
      download: async (ruta) => almacen[ruta] ? { data: { text: async () => almacen[ruta].x[0] } } : { data: null, error: { message: 'no' } }
    }) },
    auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) }
  };
  const boton = { style: { display: 'x' } };
  const M = montar(RECORTES, EXPORTA, {
    castNorm: undefined, WORKSPACE: ('ws' in o) ? o.ws : { id: 'ws1', name: 'Estudio' },
    DDL_MODO: ('modo' in o) ? o.modo : 'casting', MYROLE: ('rol' in o) ? o.rol : 'admin',
    sb: sb, Blob: function(partes){ this.x = partes; },
    idbGet: async (k) => (k in idb ? idb[k] : null), idbSet: async (k, v) => { idb[k] = v; diario.push('idb ' + k); },
    TAL: TAL, talCargar: async () => TAL.nombres.length,
    talPoner: (nombres, origen) => { const vistos = new Set(), limpio = []; for(const n of nombres){ const k = clave(n); if(!k || vistos.has(k)) continue; vistos.add(k); limpio.push(String(n).replace(/\s+/g, ' ').trim()); } limpio.sort((a, b) => a.localeCompare(b, 'es')); TAL.nombres = limpio; TAL.claves = vistos; TAL.origen = origen; return limpio.length; },
    talGuardar: async () => { diario.push('talGuardar'); return true; },
    sbShows: () => o.shows || [],
    castRegCargar: async (id) => JSON.parse(JSON.stringify(registros[id] || { personajes: {} })),
    castRegGuardar: async (id, reg) => { registros[id] = reg; diario.push('registro ' + id); return true; },
    dcLeer: async () => o.nube || VOLCADO(),
    castAviso: (x) => avisos.push(x), fallo: (d) => diario.push('fallo ' + d),
    esc: (x) => String(x).replace(/</g, '&lt;'),
    document: { getElementById: (id) => { diario.push('busca ' + id); return id === 'btnProduccion' ? boton : null; } },
    console: { warn: () => {}, log: () => {} }
  });
  return { M, diario, avisos, idb, TAL, registros, sb, almacen, boton, tabla: () => tabla };
}

exports.pruebas = async function(t){
  const { M } = armar();

  t.seccion('1 · el volcado, como se usa aquí');
  const d = M.prodNormalizar(VOLCADO());
  t.eq('todas las listas presentes aunque falten', M.PROD_CLAVES.every(k => Array.isArray(d[k])), true);
  t.eq('los personajes se llaman canonical_name allí: aquí también name', d.characters.map(c => c.name + '/' + c.canonical_name).join(' '), 'ALLY/ALLY JANA/JANA MANJAYA/MANJAYA');
  t.eq('los nombres, recortados', d.series[0].name + ' · ' + d.talents[1].name, 'A Filipino Christmas · Beatriz Sol');
  t.eq('lo que no se conoce se conserva: es de alguien', JSON.stringify(d.loQueSea), '{"nota":"esto no lo conoce Dubbipt"}');
  t.eq('las claves de control del archivo no se cuelan', '_version' in d, false);
  t.eq('un volcado vacío', M.PROD_CLAVES.every(k => Array.isArray(M.prodNormalizar(null)[k]) && !M.prodNormalizar(null)[k].length), true);
  t.eq('es un volcado si lo dice, o si trae dos de las listas de siempre', M.prodEsVolcado(VOLCADO()) + ' ' + M.prodEsVolcado({ series: [], talents: [] }) + ' ' + M.prodEsVolcado({ _version: 'dublajecast_v2' }), 'true true true');
  t.eq('un JSON cualquiera no lo es', M.prodEsVolcado({ hola: 1 }) + ' ' + M.prodEsVolcado([1, 2]) + ' ' + M.prodEsVolcado(null) + ' ' + M.prodEsVolcado({ series: [] }), 'false false false false');
  const r = M.prodResumen(d);
  t.eq('cuánto hay de cada cosa', [r.series, r.episodios, r.personajes, r.talentos, r.castings, r.apariciones, r.trailers, r.estudios].join(','), '2,3,3,3,4,1,2,1');
  t.eq('un talento que viene como «nombre»', M.prodNormalizar({ talents: [{ nombre: ' Zed  Uno ' }] }).talents[0].name, 'Zed Uno');
  const ix = M.prodIndices(d);
  t.eq('los índices casan ids que vienen unas veces como número y otras como texto', ix.epsPorSerie['1'].length + ' ' + ix.castingsPorEp['11'].length + ' ' + ix.char['102'].name, '2 3 JANA');

  t.seccion('2 · fechas, alertas y plazos, como los calcula DublajeCast');
  t.eq('«AAAA-MM-DD» es fecha local, no UTC: no cae en el día anterior', M.prodFecha('2026-10-07').getDate() + ' ' + M.prodFecha('2026-10-07').getHours(), '7 0');
  t.eq('«DD/MM/AAAA» también', M.prodFecha('07/10/2026').getMonth() + 1, 10);
  t.eq('lo que no es una fecha, nulo', M.prodFecha('mañana') + ' ' + M.prodFecha(''), 'null null');
  t.eq('los días que faltan', M.prodDias(dia(3), HOY) + ' ' + M.prodDias(dia(-2), HOY) + ' ' + M.prodDias('', HOY), '3 -2 null');
  t.eq('Miami: vencida', M.prodAlertaMiami(dia(-1), 'pre_produccion', HOY).texto, 'Miami vencida hace 1 d');
  t.eq('Miami: hoy y en dos días', M.prodAlertaMiami(dia(0), '', HOY).texto + ' · ' + M.prodAlertaMiami(dia(2), '', HOY).texto, 'Miami hoy · Miami en 2 d');
  t.eq('Miami: a cuatro días no avisa, y con la producción en marcha tampoco', M.prodAlertaMiami(dia(4), '', HOY) + ' ' + M.prodAlertaMiami(dia(-1), 'produccion_activa', HOY) + ' ' + M.prodAlertaMiami(dia(-1), 'completado', HOY), 'null null null');
  t.eq('DUBCARD: igual, salvo que no haga falta o esté finalizado', M.prodAlertaDubcard(dia(-9), 'Excel', 'pre_produccion', HOY).texto + ' · ' + M.prodAlertaDubcard(dia(-9), 'No necesita DUBCARD', '', HOY) + ' · ' + M.prodAlertaDubcard(dia(-9), 'Excel', 'completado', HOY), 'DUBCARD vencida hace 9 d · null · null');
  t.eq('el formato de la DUBCARD: el del capítulo, o el del cliente', M.prodFormatoDubcard({ formato_dubcard: 'PNG' }, {}) + ' · ' + M.prodFormatoDubcard({}, { cliente: 'Netflix' }) + ' · ' + M.prodFormatoDubcard({}, { cliente: 'Discovery' }) + ' · ' + M.prodFormatoDubcard({}, { requiere_dubcard: false }) + ' · ' + M.prodFormatoDubcard({ requiere_dubcard: false }, { cliente: 'Netflix' }), 'PNG · BACKLOT · Excel · No necesita DUBCARD · No necesita DUBCARD');
  t.eq('las alertas de un capítulo, las dos', M.prodAlertasEp(d.episodes[0], d.series[0], HOY).map(a => a.texto).join(' | '), 'Miami vencida hace 1 d | DUBCARD en 2 d');
  t.eq('un capítulo finalizado no avisa', M.prodAlertasEp(d.episodes[2], d.series[1], HOY).length, 0);
  t.eq('ni uno que no necesita DUBCARD', M.prodAlertasEp({ fecha_dubcard: dia(1), requiere_dubcard: false, fase: 'pre_produccion' }, { cliente: 'Netflix' }, HOY).length, 0);
  const pl = (dl, st) => M.prodPlazo(dl, st, HOY); const p2 = (x) => x.nivel + ':' + x.texto;
  t.eq('el plazo de un tráiler', [pl(dia(-3), 'pendiente'), pl(dia(0), ''), pl(dia(1), ''), pl(dia(2), ''), pl(dia(3), ''), pl(dia(5), ''), pl(dia(6), ''), pl('', ''), pl(dia(-3), 'completo')].map(p2).join(' | '),
       'vencido:Vencido hace 3 d | urgente:Hoy | urgente:Mañana | urgente:2 días | aviso:3 días | aviso:5 días | ok:6 días | sin:Sin fecha | hecho:Completado');

  t.seccion('3 · la ficha de un talento y casar programas');
  M.PROD.datos = d;
  t.eq('la ficha, como se dice', M.prodFichaTexto(M.prodFicha('ana rojas')) + ' | ' + M.prodFichaTexto(M.prodFicha('CARLOS RUIZ')), 'Femenino · Adulto · Agudo | Masculino · Mayor · Grave · Barítono');
  t.eq('sin ficha, vacío; sin talento, nulo', M.prodFichaTexto({ name: 'X' }) + '|' + M.prodFicha('NADIE'), '|null');
  const shows = [{ id: 's1', name: 'A FILIPINO CHRISTMAS' }, { id: 's2', name: 'Akka (Netflix)' }, { id: 's3', name: 'Dofus, temporada 2' }];
  t.eq('por nombre exacto, sin mayúsculas ni espacios', M.prodCasarPrograma(' a filipino christmas ', shows).id, 's1');
  t.eq('o muy parecido', (M.prodCasarPrograma('Dofus temporada 2 ', shows) || {}).id + ' ' + (M.prodCasarPrograma('Dofus temporadas 2', shows) || {}).id, 's3 s3');
  t.eq('pero no uno cualquiera', M.prodCasarPrograma('Akka', shows) + ' ' + M.prodCasarPrograma('Dofus temporada 20 bis', shows) + ' ' + M.prodCasarPrograma('', shows), 'null null null', '«Akka» y «Akka (Netflix)» se parecen poco: mejor pedir el nombre que equivocar el programa');

  t.seccion('4 · verter lo traído: talentos a la base, castings al registro');
  const A = armar({ base: ['ANA ROJAS', 'ZOE ÁVILA'], shows: [{ id: 's1', name: 'A Filipino Christmas' }],
                    registros: { s1: { personajes: { JANA: { display: 'JANA', talent: 'LUZ MAR', episodios: ['Episodio 9'] } } } } });
  const ef = await A.M.prodAplicar(A.M.prodNormalizar(VOLCADO()));
  t.eq('los talentos se suman: los que había siguen, los nuevos entran', A.TAL.nombres.join(','), 'ANA ROJAS,Beatriz Sol,CARLOS RUIZ,ZOE ÁVILA');
  t.eq('y se cuentan y se guardan', ef.talentosNuevos + ' ' + A.diario.includes('talGuardar'), '2 true');
  t.eq('el programa que se llama igual casa; el otro se nombra', ef.programasCasados.join('|') + ' / ' + ef.programasSinCasar.join('|'), 'A Filipino Christmas / Akka');
  t.eq('ALLY entra en el registro con su talento y su capítulo, una sola vez aunque el casting venga repetido', JSON.stringify([A.registros.s1.personajes.ALLY.talent, A.registros.s1.personajes.ALLY.episodios, A.registros.s1.personajes.ALLY.de]), '["ANA ROJAS",["The Last New Year in Boracay"],"DublajeCast"]');
  t.eq('JANA ya la tenía Dubbipt con otra: se respeta y se cuenta', A.registros.s1.personajes.JANA.talent + ' ' + ef.conflictos, 'LUZ MAR 1');
  t.eq('dos filas apuntadas, y el registro guardado', ef.registros + ' ' + A.diario.includes('registro s1'), '2 true');
  const B = armar({ base: [], shows: [] });
  const ef2 = await B.M.prodAplicar(B.M.prodNormalizar(VOLCADO()));
  t.eq('sin programas aquí, nada al registro y todos los talentos a la base', ef2.registros + ' ' + ef2.programasSinCasar.length + ' ' + B.TAL.nombres.length, '0 2 3');

  t.seccion('5 · guardar y cargar: la tabla, el almacén o el equipo');
  const C = armar({ tabla: 'vacia' });
  C.M.PROD.datos = d; C.M.PROD.rev = 0; C.M.PROD.origen = 'prueba';
  t.eq('con la tabla: en la nube del espacio, con la revisión subida, y copia en el equipo', JSON.stringify(await C.M.prodGuardar()) + ' ' + C.diario.includes('upsert produccion ws1 rev 1') + ' ' + C.diario.includes('idb ddl-produccion::ws1'), '{"ok":true,"donde":"tabla","causa":""} true true');
  const D = armar({ tabla: 'sin' });
  D.M.PROD.datos = d;
  const gd = await D.M.prodGuardar();
  t.ok('sin tabla: en la carpeta de este usuario en el almacén, y se dice por qué', gd.ok && gd.donde === 'almacen' && /no existe todavía/.test(gd.causa) && D.diario.includes('almacen _diag/u1/produccion.json'), JSON.stringify(gd));
  t.eq('y no se intenta la tabla dos veces en vano', D.diario.filter(x => /^upsert/.test(x)).length, 1);
  const E = armar({ ws: null });
  E.M.PROD.datos = d;
  t.eq('sin espacio de trabajo, solo en el equipo', (await E.M.prodGuardar()).donde + ' ' + E.diario.filter(x => /^(upsert|almacen)/.test(x)).length, 'equipo 0');
  t.eq('sin datos no se guarda nada', (await armar().M.prodGuardar()).ok, false);
  t.ok('qué errores son «no hay tabla»', D.M.prodSinTabla({ code: '42P01' }) && D.M.prodSinTabla({ message: "Could not find the table 'public.produccion' in the schema cache" }) && !D.M.prodSinTabla({ message: 'permission denied' }));
  /* Cargar: de la tabla. */
  const F = armar({ tabla: { data: VOLCADO(), rev: 7, updated_at: '2026-10-06T10:00:00Z' } });
  const rf = await F.M.prodCargar();
  t.eq('de la tabla: datos, revisión y de dónde', rf.series + ' ' + F.M.PROD.rev + ' ' + F.M.PROD.donde + ' ' + F.M.PROD.datos.characters[0].name, '2 7 tabla ALLY');
  t.ok('y queda copia en el equipo', F.diario.includes('idb ddl-produccion::ws1'));
  t.eq('cargar otra vez no vuelve a bajar', (await F.M.prodCargar()).series + ' ' + F.diario.filter(x => x === 'idb ddl-produccion::ws1').length, '2 1');
  /* Del almacén, cuando no hay tabla. */
  const G = armar({ tabla: 'sin' });
  G.M.PROD.datos = d; await G.M.prodGuardar();
  G.M.PROD.datos = null; G.M.PROD.cargado = false; delete G.idb['ddl-produccion::ws1'];
  t.eq('sin tabla, del almacén', (await G.M.prodCargar()).talentos + ' ' + G.M.PROD.donde, '3 almacen');
  /* Del equipo, sin nube. */
  const H = armar({ ws: null });
  H.idb['ddl-produccion::sin-espacio'] = { datos: VOLCADO(), rev: 2, origen: 'de antes', cuando: 5 };
  t.eq('sin espacio, lo del equipo', (await H.M.prodCargar()).series + ' ' + H.M.PROD.donde + ' ' + H.M.PROD.origen, '2 equipo de antes');
  t.eq('sin nada en ningún sitio, nulo', await armar({ ws: null }).M.prodCargar(), null);

  t.seccion('6 · traer: de la nube de DublajeCast o de un archivo');
  const I = armar({ shows: [{ id: 's1', name: 'A Filipino Christmas' }] });
  const ri = await I.M.prodImportar(VOLCADO(), 'DublajeCast · hoy');
  t.eq('se normaliza, se vierte y se guarda', ri.resumen.series + ' ' + ri.efectos.talentosNuevos + ' ' + ri.efectos.registros + ' ' + ri.guardado.donde + ' ' + I.M.PROD.origen, '2 3 3 tabla DublajeCast · hoy');
  t.eq('el resumen, en un renglón', I.M.prodResumenTexto(ri), '📦 Traído de DublajeCast: 2 programas, 3 capítulos, 3 talentos, 4 asignaciones, 2 tráilers · 3 talentos nuevos en la base · 3 asignaciones al registro de 1 programa · sin programa aquí: Akka');
  t.eq('con conflictos y sin poder guardar, se dice', I.M.prodResumenTexto({ resumen: { series: 1, episodios: 1, talentos: 1, castings: 2, trailers: 0 }, efectos: { talentosNuevos: 1, registros: 1, programasCasados: ['X'], conflictos: 1, programasSinCasar: [] }, guardado: { ok: false, donde: '', causa: 'sin sesión' } }),
       '📦 Traído de DublajeCast: 1 programa, 1 capítulo, 1 talento, 2 asignaciones · 1 talento nuevo en la base · 1 asignaciones al registro de 1 programa (1 se respetan como estaban aquí) · ⚠️ no se pudo guardar en la nube: sin sesión');
  t.eq('muchos programas sin pareja: los cuatro primeros y puntos suspensivos', I.M.prodResumenTexto({ resumen: { series: 6, episodios: 0, talentos: 0, castings: 0 }, efectos: { programasSinCasar: ['A', 'B', 'C', 'D', 'E', 'F'] }, guardado: { ok: true, donde: 'tabla' } }), '📦 Traído de DublajeCast: 6 programas, 0 capítulos, 0 talentos, 0 asignaciones · sin programa aquí: A, B, C, D…');
  const J = armar({ tabla: 'sin' });
  const rj = await J.M.prodImportar(VOLCADO(), 'x');
  t.ok('sin tabla, el resumen dice cómo compartirlo', /guardado en este usuario: para compartirlo con el equipo, corre sql\/mejora-03-produccion\.sql/.test(J.M.prodResumenTexto(rj)));
  let mal = '';
  try{ await I.M.prodImportar({ hola: 1 }, 'x'); }catch(e){ mal = e.message; }
  t.ok('un JSON que no es un volcado se rechaza diciéndolo', /no es un volcado de DublajeCast/.test(mal));
  const K = armar();
  const rk = await K.M.prodImportarArchivo({ name: 'dublajecast_backup_2026-10-06.json', text: async () => JSON.stringify(VOLCADO()) });
  t.eq('desde el archivo que exporta DublajeCast', rk.resumen.talentos + ' ' + K.M.PROD.origen, '3 archivo dublajecast_backup_2026-10-06.json');
  let mal2 = '';
  try{ await K.M.prodImportarArchivo({ name: 'roto.json', text: async () => '{no json' }); }catch(e){ mal2 = e.message; }
  t.eq('y uno roto se dice', mal2, '«roto.json» no es un JSON');
  const salida = JSON.parse(K.M.prodExportarJson());
  t.ok('lo traído vuelve a salir en el formato de DublajeCast', salida._version === 'dublajecast_v2' && salida._de === 'Dubbipt' && salida.series.length === 2 && salida.characters[0].canonical_name === 'ALLY' && salida.loQueSea.nota);
  t.eq('sin datos no hay nada que exportar', armar().M.prodExportarJson(), null);

  t.seccion('7 · lo que se pinta');
  const L = armar(); L.M.PROD.datos = d;
  const hp = L.M.prodHtmlProgramas(d, HOY);
  t.ok('los programas con su cliente, estado, capítulos y la peor alerta arriba', /<b>A Filipino Christmas<\/b>/.test(hp) && /Netflix/.test(hp) && /En curso/.test(hp) && /2 cap\./.test(hp) && /⚠ Miami vencida hace 1 d · cap\. 1/.test(hp));
  t.ok('el finalizado, sin alerta', /<b>Akka<\/b>[\s\S]*?Completado/.test(hp) && !/Akka[\s\S]*?DUBCARD vencida/.test(hp.split('<b>Akka</b>')[1] || ''));
  const ht = L.M.prodHtmlTalentos(d);
  t.ok('los talentos con su ficha y en qué han salido', /ANA ROJAS<\/b> <span class="prod-ficha">Femenino · Adulto · Agudo<\/span>/.test(ht) && /A Filipino Christmas: ALLY/.test(ht) && /Akka: MANJAYA/.test(ht));
  const htr = L.M.prodHtmlTrailers(d, HOY);
  t.ok('los tráilers con su plazo, los más urgentes primero', /Tráiler · mezcla[\s\S]*?Mañana[\s\S]*?Teaser[\s\S]*?Completado/.test(htr));

  t.seccion('8 · quién lo ve: el administrador, en el perfil Casting');
  t.eq('las dos cosas a la vez', [['casting', 'admin'], ['qc', 'admin'], ['grabacion', 'admin'], ['casting', 'casting'], ['casting', 'member'], ['casting', null], ['', 'admin']].map(x => L.M.prodPuede(x[0], x[1])).join(' '),
       'true false false false false false false', 'un rol «casting» no basta: el pedido es que solo lo vea el administrador');
  t.eq('sin decir nada, mira el perfil y el rol de ahora', armar().M.prodPuede() + ' ' + armar({ modo: 'qc' }).M.prodPuede() + ' ' + armar({ rol: 'member' }).M.prodPuede(), 'true false false');
  for(const [que, o] of [['un miembro en Casting', { rol: 'member' }], ['el administrador en QC', { modo: 'qc' }]]){
    const N = armar(o);
    N.M.prodPintarBoton();
    t.eq(que + ': el botón, escondido', N.boton.style.display, 'none');
    await N.M.prodPanel();
    t.eq(que + ': el panel no se abre y se dice por qué', N.avisos.join('|') + ' · ' + N.diario.includes('busca prodOv'), N.M.PROD_SIN_PERMISO + ' · true');
    t.eq(que + ': ni se carga nada', N.diario.some(x => /^idb|^upsert/.test(x)), false);
    let err = '';
    try{ await N.M.prodImportar(VOLCADO(), 'x'); }catch(e){ err = e.message; }
    t.eq(que + ': ni se puede traer', err + ' · ' + (N.M.PROD.datos === null) + ' · ' + N.diario.includes('talGuardar'), N.M.PROD_SIN_PERMISO + ' · true · false');
  }
  const Ad = armar(); Ad.M.prodPintarBoton();
  t.eq('al administrador en Casting, el botón se le ve', Ad.boton.style.display, '');

  t.seccion('9 · por dónde se entra');
  const F2 = fuentes().map(f => f.src).join('\n');
  const HTML = require('fs').readFileSync(require('./ayuda').INDEX, 'utf8');
  t.ok('el botón de Producción está en la cabecera de Programas, la que se ve, y no en la de la biblioteca, que la app oculta siempre',
       /id="btnProduccion"'\+\(\(typeof prodPuede==='function' && prodPuede\(\)\) \? '' : ' style="display:none"'\)\+' title="Lo que viene de DublajeCast/.test(HTML) && /head\.querySelector\('#btnProduccion'\); if\(bp\) bp\.onclick=\(\)=> prodPanel\(\);/.test(HTML)
       && !/<button class="btnv sm" id="btnProduccion"/.test(HTML));
  t.ok('se repinta al cambiar de perfil y al saber el rol', /prodPintarBoton\(\); \}catch\(e\)\{ fallo\('prodPintarBoton · index\.html:ponerModo'/.test(HTML) && /prodPintarBoton\(\); \}catch\(e\)\{ fallo\('prodPintarBoton · index\.html:loadMyRole'/.test(HTML));
  t.ok('«Traer TODO» y la caja de herramientas, solo para quien puede', /\(\(typeof prodPuede === 'function' && prodPuede\(\)\)\s+\? '<button class="modo-op dc-b" id="dcTodo">/.test(HTML) && /\(\(typeof prodPuede === 'function' && prodPuede\(\)\)\s+\? '<button class="herr-it" id="herrProd">/.test(F2));
  t.ok('la base de datos solo deja al administrador', (() => { const q = require('fs').readFileSync(require('path').join(__dirname, '..', 'sql', 'mejora-03-produccion.sql'), 'utf8'); return /using \(public\.is_admin\(\)\)\s+with check \(public\.is_admin\(\)\);/.test(q) && !/w\.owner = auth\.uid\(\)/.test(q); })());
  t.ok('y también en la caja de herramientas', /id="herrProd"/.test(F2) && /#herrProd'\);\s+if\(p\) p\.onclick = \(\)=>\{ ov\.remove\(\); prodPanel\(\); \};/.test(F2));
  t.ok('y el puente con DublajeCast ofrece traerlo todo', /id="dcTodo"/.test(F2) && /const r = await prodImportarDesdeDublajeCast\(\);\s+castAviso\(prodResumenTexto\(r\)\);/.test(F2));
  t.ok('la base de talentos dice cuándo trae la ficha de DublajeCast', /con la ficha de DublajeCast/.test(F2));
};
