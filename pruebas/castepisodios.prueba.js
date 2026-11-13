/* Reasignar en el programa cambia también los capítulos · especificacion 09, PRO-65
 *
 * Pedido de sala: «cuando reasigno un personaje en el panel de los programas,
 * que se cambie automáticamente en los episodios que estén».
 *
 * Lo que protege esta prueba: que el talento nuevo llega al casting guardado
 * de cada capítulo (en la nube y en la copia de este equipo) y al capítulo
 * abierto (en memoria, guardado como al asignar a mano); que sus gemelos
 * —(ARCHIVO), (VO)— cambian con él si tenían su mismo talento, y los que no,
 * no; que lo demás del capítulo no se toca; que desde un episodio solo cambia
 * ese; y que el Reparto y la tabla de un episodio lo llaman.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX, montar } = require('./ayuda');

exports.nombre = 'Reasignar en el programa cambia también los capítulos';

const RAIZ = path.dirname(INDEX);

function cargar(o){
  o = o || {};
  const N = montar([['function castNorm(t){', '/** El número final']], ['castNorm'], {});
  const filas = o.filas || {}, subidos = [], idb = {}, borrados = [], pings = [], upserts = [];
  const sb = { from: () => {
    const q = { _id: null, select(){ return q; }, eq(k, v){ q._id = v; return q; },
      maybeSingle: async () => o.falla === q._id ? { data: null, error: { message: 'sin red' } } : { data: filas[q._id] ? JSON.parse(JSON.stringify(filas[q._id])) : null, error: null },
      upsert: async (row) => { subidos.push(row); filas[row.ep_id] = { data: row.data, updated_at: row.updated_at }; return { error: null }; } };
    return q;
  } };
  const ctx = vm.createContext({ console, castNorm: N.castNorm, castClave: N.castNorm,
    castSinSufijo: (n) => String(n).replace(/\s*\((ARCHIVO|VO|V\.O\.|OFF)\)\s*$/i, ''),
    NO_REC: new Set(['X', 'ORIGINAL', 'TODOS']), norm: (s) => String(s || '').toUpperCase().trim(),
    sb: sb, sbEps: (id) => (o.eps || []).filter(e => e.show_id === id),
    idbSet: async (k, v) => { idb[k] = v; }, idbDel: async (k) => { borrados.push(k); },
    libPing: (t, id, sh) => pings.push(t + ' ' + id + ' ' + sh), fallo: () => {},
    currentEp: o.abierto || null, window: { _dataEpId: o.abierto ? o.abierto.id : null, _charsRaw: o.raw || null },
    chars: o.chars || [], renderCards: () => pings.push('renderCards'), castPintarOcupacion: () => {},
    epDataUpsert: async (id, sh) => { upserts.push(id + ' ' + sh); return true; } });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'castepisodios.js'), 'utf8') + ';this.E = { ceCambiarEnDatos, ceReasignarEnEpisodios, ceFrase };', ctx);
  return { E: ctx.E, filas, subidos, idb, borrados, pings, upserts, ctx };
}
const ch = (display, talent, extra) => Object.assign({ key: display.toUpperCase(), display: display, talent: talent, pages: [{ p: 1, ints: 3 }], totalInts: 3 }, extra || {});

exports.pruebas = async function(t){
  t.seccion('1 · en los datos de un capítulo');
  {
    const { E } = cargar();
    const d = { chars: [ch('Max', 'LUZ MAR'), ch('Max (ARCHIVO)', 'LUZ MAR'), ch('Max (VO)', 'OTRA'), ch('Rita', 'LUZ MAR')], charsRaw: [ch('Max', 'LUZ MAR')], script: [{ x: 1 }] };
    const r = E.ceCambiarEnDatos(d, 'MAX', 'Ana Rojas');
    t.eq('él y su gemelo con su mismo talento; el gemelo con otro talento y los demás, no', d.chars.map(c => c.display + '=' + c.talent).join(' · '), 'Max=Ana Rojas · Max (ARCHIVO)=Ana Rojas · Max (VO)=OTRA · Rita=LUZ MAR');
    t.eq('dice qué cambió y qué tenía', r.cambiados.join(',') + ' · ' + r.antes, 'Max,Max (ARCHIVO) · LUZ MAR');
    t.eq('la copia en bruto del desglose, también', d.charsRaw[0].talent, 'Ana Rojas');
    t.eq('lo demás no se toca', JSON.stringify(d.script), '[{"x":1}]');
    t.eq('X, ORIGINAL, TODOS: no se graba', (E.ceCambiarEnDatos(d, 'Rita', 'X'), d.chars[3].noRec + ' ' + d.chars[3].talent), 'true X');
    t.eq('si ya lo tiene, nada', E.ceCambiarEnDatos(d, 'Max', 'Ana Rojas').cambiados.length, 0);
    t.eq('si no sale en el capítulo, nada', E.ceCambiarEnDatos(d, 'Pepe', 'Ana').cambiados.length, 0);
  }

  t.seccion('2 · en los capítulos del programa');
  {
    const eps = [{ id: 'e1', show_id: 's1', name: 'Ep 101' }, { id: 'e2', show_id: 's1', name: 'Ep 102' }, { id: 'e3', show_id: 's1', name: 'Ep 103' }, { id: 'e4', show_id: 's1', name: 'Ep 104' }, { id: 'x1', show_id: 's2', name: 'Otro' }];
    const filas = {
      e1: { data: { name: 'Ep 101', chars: [ch('Max', 'LUZ MAR')], script: [1, 2] }, updated_at: 'v1' },
      e2: { data: { name: 'Ep 102', chars: [ch('Rita', 'PEPE')], script: [1] }, updated_at: 'v1' },
      e3: { data: { name: 'Ep 103', chars: [ch('Max', 'Ana Rojas')], script: [1] }, updated_at: 'v1' },
      x1: { data: { name: 'Otro', chars: [ch('Max', 'LUZ MAR')], script: [1] }, updated_at: 'v1' }
    };
    const A = cargar({ eps, filas });
    const r = await A.E.ceReasignarEnEpisodios('s1', 'Max', 'Ana Rojas');
    t.eq('cambia donde sale con otro talento: no donde no sale, ni donde ya lo tiene, ni en otro programa, ni en uno sin datos', r.episodios.join(',') + ' · ' + r.fallos.length, 'Ep 101 · 0');
    t.eq('en la nube, con lo demás del capítulo intacto y la hora nueva', JSON.stringify(A.subidos.map(x => [x.ep_id, x.show_id, x.data.chars[0].talent, x.data.script.length, x.updated_at !== 'v1'])), '[["e1","s1","Ana Rojas",2,true]]');
    t.ok('en la copia de este equipo, con la misma hora que la nube (no se vuelve a bajar); la caché vieja, fuera', A.idb['data:e1'].stamp === A.subidos[0].updated_at && A.idb['data:e1'].data.chars[0].talent === 'Ana Rojas' && A.idb['data:e1'].data._epId === 'e1' && A.borrados.includes('ep:e1'));
    t.ok('se avisa a los demás equipos', A.pings.includes('ep e1 s1'));
    t.eq('la frase del aviso', A.E.ceFrase(r), ' · cambiado en 1 capítulo (Ep 101)');
    const B = cargar({ eps, filas: JSON.parse(JSON.stringify(filas)) });
    const rb = await B.E.ceReasignarEnEpisodios('s1', 'Max', 'Ana Rojas', { epId: 'e3' });
    t.eq('desde un episodio, solo ese', rb.episodios.length + ' ' + B.subidos.length, '0 0');
    const C = cargar({ eps, filas: JSON.parse(JSON.stringify(filas)), falla: 'e2' });
    const rc = await C.E.ceReasignarEnEpisodios('s1', 'Rita', 'Luz');
    t.eq('si uno no se puede leer, se dice', C.E.ceFrase(rc), ' · ⚠️ no se pudo cambiar en Ep 102');
  }

  t.seccion('3 · el capítulo abierto');
  {
    const eps = [{ id: 'e1', show_id: 's1', name: 'Ep 101' }];
    const chars = [ch('Max', 'LUZ MAR')];
    const A = cargar({ eps, filas: { e1: { data: { chars: [ch('Max', 'LUZ MAR')], script: [1] }, updated_at: 'v1' } }, abierto: { id: 'e1', showId: 's1', name: 'Ep 101' }, chars });
    const r = await A.E.ceReasignarEnEpisodios('s1', 'Max', 'Ana Rojas');
    t.eq('en memoria, repinta y se guarda como al asignar a mano (no se pisa con lo de la nube)', [chars[0].talent, A.pings.includes('renderCards'), A.upserts.join(), A.subidos.length, r.episodios.join()].join(' · '), 'Ana Rojas · true · e1 s1 · 0 · Ep 101');
  }

  t.seccion('4 · cableado');
  const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8'), HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
  t.ok('al cambiar el talento en el registro (Reparto del programa, o un episodio) se cambia en sus capítulos', /ceReasignarEnEpisodios\(p\.show\.id, personaje, limpio, \(e && e\.ep\) \? \{ epId: e\.ep\.id \} : null\)/.test(CV));
  t.ok('aunque el registro ya lo tuviera (capítulos de antes)', /El registro ya lo tenía; puede que algún capítulo no/.test(CV));
  t.ok('y si el personaje solo está en Casting pero el programa también en Dubbipt', /const rc = await ceReasignarEnEpisodios\(p\.show\.id, r\.personaje, nombre, null\);/.test(CV));
  t.ok('el módulo se carga y queda para usar sin conexión', /<script src="\.\/js\/castepisodios\.js"><\/script>/.test(HTML) && /'\.\/js\/castepisodios\.js'/.test(SW));
};
