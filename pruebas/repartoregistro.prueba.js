/* El casting de cada capítulo va llenando el reparto del programa · especificacion 09, PRO-22 */
'use strict';
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Casting: el casting de cada capítulo llena el reparto del programa';

function armar(o){
  o = o || {};
  const guardados = [];
  const CS = { registros: {} };
  const local = o.local || { personajes: {} };
  const M = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['async function castRegDeLaNube(showId){', 'let _regT = 0;']],
    ['castRegFusionar', 'castRegAnotar', 'castRegDeLaNube'],
    { castNorm: undefined, LDB: { showId: 's1' }, currentEp: o.ep === undefined ? { id: 'e1', name: 'Episodio 1', showId: 's1' } : o.ep,
      charIdx: o.charIdx || {}, CS: CS,
      castRegCargar: async () => JSON.parse(JSON.stringify(local)),
      castRegGuardar: async (id, reg) => { guardados.push([id, JSON.parse(JSON.stringify(reg))]); return true; },
      sb: { storage: { from: () => ({ download: async (ruta) => {
        if(o.nubeFalla) throw new Error('sin red');
        return o.nube ? { data: { text: async () => JSON.stringify(o.nube) } } : { data: null, error: { message: 'no existe' } };
      } }) } } });
  return { M, guardados, CS };
}

exports.pruebas = async function(t){
  const CHARS = () => ({
    ANA: { display: 'Ana', talent: 'LUZ MAR', totalInts: 40 },
    LEO: { display: 'Leo', talent: '', totalInts: 12 },
    TOM: { display: 'Tom', talent: '  Pepe Gil ', totalInts: 3 }
  });

  t.seccion('1 · la foto del capítulo');
  {
    const A = armar({ charIdx: CHARS(), local: { personajes: { ANA: { display: 'Ana', talent: 'LUZ MAR', episodios: ['Episodio 3'], ts: 5 } } } });
    const n = await A.M.castRegAnotar();
    const reg = A.guardados[0][1];
    t.eq('se guarda en el registro de su programa', A.guardados.length + ' ' + A.guardados[0][0], '1 s1');
    t.eq('con TODOS sus personajes, tengan o no talento, y sus intervenciones', JSON.stringify(reg.capitulos['Episodio 1'].personajes),
         '{"ANA":{"display":"Ana","talent":"LUZ MAR","lineas":40},"LEO":{"display":"Leo","talent":"","lineas":12},"TOM":{"display":"Tom","talent":"Pepe Gil","lineas":3}}');
    t.ok('con su momento', reg.capitulos['Episodio 1'].ts > 0);
    t.eq('y lo de siempre, para heredar: solo quien tiene talento, con este capítulo apuntado', n + ' · ' + Object.keys(reg.personajes).sort().join(',') + ' · ' + reg.personajes.ANA.episodios.join('+'), '2 · ANA,TOM · Episodio 3+Episodio 1');
    t.ok('la vista de Casting lo tiene ya, sin volver a pedirlo', A.CS.registros.s1 && A.CS.registros.s1.capitulos['Episodio 1']);
    const B = armar({ charIdx: CHARS(), ep: null });
    await B.M.castRegAnotar();
    t.eq('sin capítulo abierto, sin foto', JSON.stringify(B.guardados[0][1].capitulos || null), 'null');
  }

  t.seccion('2 · dos personas, dos capítulos del mismo programa');
  {
    const nube = { personajes: { ANA: { display: 'Ana', talent: 'OTRA', episodios: ['Episodio 2'], ts: 9e15 }, RUI: { display: 'Rui', talent: 'X', episodios: [], ts: 1 } },
                   capitulos: { 'Episodio 2': { ts: 7, personajes: { RUI: { display: 'Rui', talent: 'X', lineas: 2 } } }, 'Episodio 1': { ts: 1, personajes: {} } } };
    const A = armar({ charIdx: { LEO: { display: 'Leo', talent: '', totalInts: 1 } }, nube: nube, local: { personajes: { ANA: { display: 'Ana', talent: 'LUZ MAR', episodios: [], ts: 3 } } } });
    await A.M.castRegAnotar();
    const reg = A.guardados[0][1];
    t.ok('el capítulo que casteó la otra persona se conserva', reg.capitulos['Episodio 2'] && reg.capitulos['Episodio 2'].personajes.RUI.lineas === 2);
    t.ok('el de este capítulo es el de ahora', !!reg.capitulos['Episodio 1'].personajes.LEO);
    t.eq('de cada personaje, el más reciente', reg.personajes.ANA.talent + ' · ' + !!reg.personajes.RUI, 'OTRA · true');
    const M = armar().M;
    t.eq('juntar a mano: de cada cosa, la más reciente', JSON.stringify(M.castRegFusionar({ personajes: { A: { ts: 5, t: 'local' }, B: { ts: 1, t: 'local' } }, capitulos: { e1: { ts: 9, x: 'local' } } },
                                                                                       { personajes: { A: { ts: 2, t: 'nube' }, B: { ts: 7, t: 'nube' } }, capitulos: { e1: { ts: 3, x: 'nube' }, e2: { ts: 1, x: 'nube' } } })),
         '{"personajes":{"A":{"ts":5,"t":"local"},"B":{"ts":7,"t":"nube"}},"capitulos":{"e1":{"ts":9,"x":"local"},"e2":{"ts":1,"x":"nube"}}}');
    const S = armar({ charIdx: CHARS(), nubeFalla: true, local: { personajes: {}, capitulos: { 'Episodio 9': { ts: 1, personajes: {} } } } });
    await S.M.castRegAnotar();
    t.ok('sin nube, se sigue con lo de este equipo', S.guardados.length === 1 && !!S.guardados[0][1].capitulos['Episodio 9'] && !!S.guardados[0][1].capitulos['Episodio 1']);
  }

  t.seccion('3 · lo casteado en otros capítulos llega a los nuevos');
  {
    const cargar = (o) => {
      const idb = {}, bajadas = [];
      if(o.local) idb['ddl-registro::s1'] = { reg: o.local, ts: 1 };
      const M = montar([['function castNorm(t){', 'let _regT = 0;']],
        ['castRegCargar', '_regNubeVisto'],
        { LDB: { showId: 'otro' }, currentEp: { id: 'e9', name: 'Episodio 9', showId: 's1' }, window: {},
          idbGet: async (k) => idb[k], idbSet: async (k, v) => { idb[k] = v; },
          sb: { storage: { from: () => ({ download: async (ruta) => {
            bajadas.push(ruta);
            return o.nube ? { data: { text: async () => JSON.stringify(o.nube) } } : { data: null, error: { message: 'no existe' } };
          } }) } } });
      return { M, idb, bajadas };
    };
    const local = { personajes: { ANA: { display: 'Ana', talent: 'LUZ MAR', episodios: ['Episodio 1'], ts: 1 } } };
    const nube = { personajes: { LEO: { display: 'Leo', talent: 'PEPE', episodios: ['Episodio 2'], ts: 5 } } };
    const A = cargar({ local: local, nube: nube });
    const reg = await A.M.castRegCargar();
    t.eq('con copia en este equipo se mira igual la nube, y se juntan', Object.keys(reg.personajes).sort().join(',') + ' · ' + A.bajadas.join(','), 'ANA,LEO · s1/casting-registro.json');
    t.ok('y lo junto se queda en este equipo', !!A.idb['ddl-registro::s1'].reg.personajes.LEO);
    await A.M.castRegCargar();
    t.eq('pero no en cada llamada: una vez cada poco', A.bajadas.length, 1);
    const B = cargar({ local: local });
    t.eq('sin nube, lo de este equipo', Object.keys((await B.M.castRegCargar()).personajes).join(','), 'ANA');
    t.eq('el programa es el del capítulo abierto, no el que se mira en la biblioteca', A.bajadas[0], 's1/casting-registro.json');
  }

  t.seccion('4 · cuándo se hace la foto');
  const HTML = fs.readFileSync(INDEX, 'utf8');
  t.ok('al abrir un capítulo en Casting, aunque aún no se asigne nada', /if\(m === 'casting' && esteEp\)\{ try\{ if\(typeof chars !== 'undefined' && chars && chars\.length\) castRegAnotarPronto\(\); \}catch\(e\)\{\} \}/.test(HTML));
  t.ok('desde la vista de Casting el perfil se pone antes de abrir el capítulo: solo se hereda y se fotografía el capítulo abierto',
       /const esteEp = !epId \|\| \(typeof currentEp !== 'undefined' && currentEp && currentEp\.id === epId\);/.test(HTML));
  t.ok('y al asignar o quitar un talento, como siempre', (HTML.match(/try\{ castRegAnotarPronto\(\); \}catch\(e\)\{\}/g) || []).length >= 2);

  t.seccion('5 · eliminar no deja nada');
  {
    const arbol = { 's1': [{ name: 'e1', id: null, metadata: null }, { name: 'casting-registro.json', id: 'a', metadata: {} }],
                    's1/e1': [{ name: 'libreto.json', id: 'b', metadata: {} }, { name: 'versiones', id: null, metadata: null }],
                    's1/e1/versiones': [{ name: 'v1.pdf', id: 'c', metadata: {} }] };
    const quitados = [], idb = { 'ep:e1': 1, 'data:e1': 1, 'ddl-registro::s1': 1, 'ep:e9': 1 }, ls = { 'ddl_modo::e1': 'casting', 'ddl_density': 'x', 'ddl_last_ep': 'e1' };
    const M = montar([['/** Borra todo lo que hay bajo una carpeta de un bucket', '/**\n * Elimina un programa POR COMPLETO']], ['libBorrarCarpeta', 'libOlvidarLocal'],
      { fallo: () => {},
        sb: { storage: { from: () => ({ list: async (dir) => ({ data: arbol[dir] || [] }), remove: async (rutas) => { quitados.push(...rutas); return {}; } }) } },
        idbOpen: async () => ({ transaction: () => ({ objectStore: () => ({ getAllKeys: () => { const t = {}; setTimeout(() => { t.result = Object.keys(idb); t.onsuccess(); }); return t; } }) }) }),
        idbDel: async (k) => { delete idb[k]; },
        localStorage: { get length(){ return Object.keys(ls).length; }, key: (i) => Object.keys(ls)[i], getItem: (k) => (k in ls ? ls[k] : null), removeItem: (k) => { delete ls[k]; } } });
    t.eq('todos los archivos del programa, también los de las subcarpetas', (await M.libBorrarCarpeta('libretos', 's1')) + ' ' + quitados.sort().join(','), '3 s1/casting-registro.json,s1/e1/libreto.json,s1/e1/versiones/v1.pdf');
    await M.libOlvidarLocal(['s1', 'e1']);
    t.eq('y lo que este equipo guardaba de él, sin tocar lo demás', Object.keys(idb).join(',') + ' · ' + Object.keys(ls).join(','), 'ep:e9 · ddl_density');
  }
};
