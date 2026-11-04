/* El TC inicial del video, por proyecto y por casa · especificacion 04, EST-5
 *
 * Pedido de sala: «quiero que cada uno de los proyectos, o sea por bloque de
 * episodios o clientes, siempre tengan el mismo time code inicial para el
 * video», y «que uno elija la casa cada vez que se crea el proyecto:
 * Discovery, Pixelogic, Netflix, Herald, Paramount, Pipeline Studio y otros».
 *
 * Lo que protege esta prueba: el número del capítulo se saca del nombre; manda
 * el bloque más estrecho y después el programa; un programa nuevo hereda el TC
 * de su casa; fijarlo para una casa llega a todos sus programas y a ninguno de
 * otra; el capítulo fijado «solo para él» se respeta, y lo demás sigue la regla
 * (también un 00:00:00); lo que viene de la nube se sanea; y está cableado en
 * el Video Estudio y en «Nuevo programa».
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'TC inicial del video por proyecto y por casa';

const RAIZ = path.dirname(INDEX);

/* Un almacén de mentira: archivos JSON por ruta, y la copia del equipo. */
function entorno(o){
  o = o || {};
  const nube = o.nube || {}, idb = {}, V = { subidas: [], avisos: [], pintado: [], ctx: null };
  const shows = o.shows || [{ id: 's1', name: 'Show Uno' }, { id: 's2', name: 'Show Dos' }, { id: 's3', name: 'Show Tres' }];
  const sync = { marks: o.marks || {} };
  const ctx = vm.createContext({
    console, Blob, setTimeout, Date, JSON, Promise,
    window: {}, document: { getElementById: (id) => (id === 'stTc0' ? V.campo : null) },
    sb: { storage: { from: () => ({
      download: async (ruta) => (ruta in nube ? { data: { text: async () => nube[ruta] } } : { data: null, error: { message: 'no existe' } }),
      upload: async (ruta, blob) => { nube[ruta] = await blob.text(); V.subidas.push(ruta); return { error: o.falla ? { message: 'x' } : null }; } }) } },
    idbGet: async (k) => idb[k] || null, idbSet: async (k, v) => { idb[k] = v; },
    sbShows: () => shows, currentEp: o.ep === undefined ? { id: 'e1', showId: 's1', name: '100 DAYS OF DECEPTION 108' } : o.ep,
    sync, studio: { on: false, cur: 0 }, studioTick(){}, stMsg: (t) => V.avisos.push(t),
    stFmtTC: (s) => { s = Math.max(0, s || 0); const f = (n) => String(Math.floor(n)).padStart(2, '0'); return f(s / 3600) + ':' + f(s % 3600 / 60) + ':' + f(s % 60); },
    studioTc0: () => (sync.marks._tcOff && +sync.marks._tcOff.v) || 0,
    studioSetTc0: (sec, save, origen) => { V.campo.value = 'puesto'; if(save !== false) sync.marks._tcOff = { v: sec, o: origen || 'manual' }; },
    studioParseTC: (t) => { const m = String(t).match(/^(\d{1,2}):(\d{2}):(\d{2})$/); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] : null; },
    libMsg(){}, fallo(){}, esc: (x) => String(x == null ? '' : x)
  });
  V.campo = { value: '' };
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'tcinicial.js'), 'utf8') + ';this.A = { TCI, TCI_CASAS, tciNumEp, tciSan, tciDe, tciPoner, tciQuitar, tciEtiqueta, tciCargar, tciGuardar, tciTodos, tciCasaTc, tciAsignarCasa, tciAplicar, tciFijar, tciCasaNombre };', ctx);
  V.A = ctx.A; V.nube = nube; V.sync = sync; V.ctx = ctx;
  return V;
}
const HORA = (h) => h * 3600;

exports.pruebas = async function(t){
  t.seccion('1 · el número del capítulo y quién manda');
  {
    const { A } = entorno();
    t.eq('el número del capítulo, del nombre', ['100 DAYS OF DECEPTION 108', 'S01E03', 'Ep 12', 'LYLA IN THE LOOP 119ABI', 'Episodio 5', 'Sin número', ''].map(x => A.tciNumEp(x)).join(','), '108,3,12,119,5,,');
    const d = A.tciSan({});
    A.tciPoner(d, 'programa', HORA(1), { casa: 'Netflix' });
    A.tciPoner(d, 'bloque', HORA(10), { desde: 101, hasta: 199 });
    A.tciPoner(d, 'bloque', 0, { desde: 108, hasta: 110 });
    t.eq('el bloque más estrecho manda sobre el ancho y sobre el programa', [101, 108, 110, 111, 200, null].map(n => { const r = A.tciDe(d, n); return r ? r.v / 3600 + r.alcance[0] : '-'; }).join(','), '10b,0b,0b,10b,1p,1p');
    A.tciPoner(d, 'bloque', HORA(2), { desde: 108, hasta: 110 });
    t.eq('el mismo bloque se sustituye, no se duplica', d.bloques.length + ' ' + A.tciDe(d, 109).v / 3600, '2 2');
    t.eq('quitar un bloque y quitar el programa', (A.tciQuitar(d, '108-110'), A.tciQuitar(d, 'programa'), d.bloques.length + ' ' + String(d.programa) + ' ' + A.tciDe(d, 109).v / 3600), '1 null 10');
    let err = ''; try{ A.tciPoner(d, 'bloque', 1, { desde: 110, hasta: 108 }); }catch(e){ err = e.message; }
    t.eq('un bloque al revés no vale', err, 'El bloque de capítulos no es válido');
    t.eq('cómo se dice cada regla', [A.tciEtiqueta({ alcance: 'bloque', desde: 101, hasta: 110 }), A.tciEtiqueta({ alcance: 'bloque', desde: 7, hasta: 7 }), A.tciEtiqueta({ alcance: 'programa', casa: 'Netflix' }), A.tciEtiqueta({ alcance: 'programa', casa: '' })].join(' | '),
         'Capítulos 101 a 110 | Capítulo 7 | Toda la casa Netflix | Todo el programa');
  }

  t.seccion('2 · lo que viene de la nube se sanea');
  {
    const { A } = entorno();
    const d = A.tciSan({ casa: '  Netflix  ', programa: { v: -5 }, bloques: [{ desde: 5, hasta: 2, v: 1 }, { desde: 'x', hasta: 3, v: 1 }, { desde: 1, hasta: 3, v: 'abc' }, { desde: 1, hasta: 3, v: 3600 }, null] });
    t.eq('solo queda lo válido', JSON.stringify(d), '{"v":1,"casa":"Netflix","programa":null,"bloques":[{"desde":1,"hasta":3,"v":3600}]}');
    t.eq('basura entera: vacío', JSON.stringify(A.tciSan('hola')), '{"v":1,"casa":"","programa":null,"bloques":[]}');
    t.eq('las casas de la lista, como se escriben', [A.tciCasaNombre('netflix'), A.tciCasaNombre('PIPELINE   studio'), A.tciCasaNombre('paramount'), A.tciCasaNombre(' Disney  ')].join(','), 'Netflix,Pipeline Studio,Paramount,Disney');
    t.eq('la lista de casas del pedido', A.TCI_CASAS.join(','), 'Discovery,Pixelogic,Netflix,Herald,Paramount,Pipeline Studio');
  }

  t.seccion('3 · la casa se elige al crear el programa, y hereda el TC de su casa');
  {
    const V = entorno({ nube: { 's2/video-tc.json': JSON.stringify({ v: 1, casa: 'Netflix', programa: { v: HORA(1), casa: 'Netflix', ts: 50 }, bloques: [] }) } });
    t.eq('una casa sin TC todavía: se guarda la casa y no hereda nada', String(await V.A.tciAsignarCasa('s1', 'discovery')) + ' ' + JSON.stringify(V.A.TCI.datos.s1), 'null {"v":1,"casa":"Discovery","programa":null,"bloques":[]}');
    t.ok('queda en la carpeta del programa', JSON.parse(V.nube['s1/video-tc.json']).casa === 'Discovery');
    t.eq('una casa que ya tiene TC en otro programa: el nuevo lo hereda', String(await V.A.tciAsignarCasa('s3', 'NETFLIX')) / 3600 + ' ' + JSON.parse(V.nube['s3/video-tc.json']).programa.casa, '1 Netflix');
    let err = ''; try{ await V.A.tciAsignarCasa('s3', '   '); }catch(e){ err = e.message; }
    t.eq('sin casa no se crea', err, 'Elige la casa del proyecto');
    const rec = await V.A.tciAsignarCasa('s1', 'Netflix');
    t.eq('si el programa ya tiene su regla, la suya no se pisa', String(await V.A.tciAsignarCasa('s1', 'Netflix')) + ' ' + String(rec), 'null ' + String(rec));
  }

  t.seccion('4 · fijar el TC con el alcance que se elija');
  {
    const V = entorno({ nube: {
      's1/video-tc.json': JSON.stringify({ casa: 'Netflix' }), 's2/video-tc.json': JSON.stringify({ casa: 'Netflix', programa: { v: 0, casa: 'Netflix', ts: 1 } }),
      's3/video-tc.json': JSON.stringify({ casa: 'Discovery', programa: { v: HORA(10), casa: 'Discovery', ts: 1 } }) } });
    const a = await V.A.tciFijar('casa', HORA(1));
    const leer = (id) => JSON.parse(V.nube[id + '/video-tc.json']);
    t.eq('toda la casa: sus programas, y solo los suyos', [leer('s1').programa.v / 3600, leer('s2').programa.v / 3600, leer('s3').programa.v / 3600].join(','), '1,1,10');
    t.eq('lo dice, con cuántos', a, 'TC inicial 01:00:00 para los 2 programas de Netflix');
    t.eq('y el capítulo abierto ya entra en la regla', JSON.stringify(V.sync.marks._tcOff), '{"v":3600,"o":"regla"}');
    await V.A.tciFijar('bloque', HORA(2), { desde: 101, hasta: 110 });
    t.eq('un bloque: solo este programa', JSON.stringify(leer('s1').bloques) + ' ' + leer('s2').bloques.length, '[{"desde":101,"hasta":110,"v":7200}] 0');
    await V.A.tciFijar('programa', HORA(3));
    t.eq('todo el programa: ya no lleva la casa en su etiqueta', leer('s1').programa.v / 3600 + ' ' + JSON.stringify(leer('s1').programa.casa), '3 ""');
    await V.A.tciFijar('episodio', HORA(5));
    t.eq('solo este capítulo: no toca ninguna regla y queda «a mano»', JSON.stringify(V.sync.marks._tcOff) + ' ' + (leer('s1').programa.v / 3600), '{"v":18000,"o":"manual"} 3');
    const sinCasa = entorno({ nube: { 's1/video-tc.json': JSON.stringify({}) } });
    let err = ''; try{ await sinCasa.A.tciFijar('casa', 3600); }catch(e){ err = e.message; }
    t.eq('sin casa elegida no se puede fijar para la casa', err, 'Elige primero la casa de este programa');
  }

  t.seccion('5 · al abrir el capítulo');
  {
    const reglas = { 's1/video-tc.json': JSON.stringify({ casa: 'Netflix', programa: { v: 0, casa: 'Netflix', ts: 1 }, bloques: [{ desde: 101, hasta: 110, v: HORA(1) }] }) };
    let V = entorno({ nube: reglas });
    const r = await V.A.tciAplicar(true);
    t.eq('el bloque manda; se pone en el capítulo, en memoria, y se escribe en el campo', JSON.stringify(V.sync.marks._tcOff) + ' ' + V.campo.value + ' ' + r.alcance, '{"v":3600,"o":"regla"} 01:00:00 bloque');
    t.eq('y lo dice una vez', V.avisos.join('|'), 'TC inicial 01:00:00 · capítulos 101 a 110');
    await V.A.tciAplicar(true);
    t.eq('al repetirse, no repite el aviso', V.avisos.length, 1);
    V = entorno({ nube: reglas, ep: { id: 'e2', showId: 's1', name: 'SHOW 150' } });
    await V.A.tciAplicar();
    t.eq('fuera del bloque, el del programa; y un 00:00:00 vale (no se toma por «sin TC»)', JSON.stringify(V.sync.marks._tcOff), '{"v":0,"o":"regla"}');
    V = entorno({ nube: reglas, marks: { _tcOff: { v: HORA(5), o: 'manual' } } });
    t.eq('el capítulo fijado «solo para él» conserva el suyo', String(await V.A.tciAplicar()) + ' ' + JSON.stringify(V.sync.marks._tcOff), 'null {"v":18000,"o":"manual"}');
    V = entorno({ nube: reglas, marks: { _tcOff: { v: HORA(9) } } });
    await V.A.tciAplicar();
    t.eq('el que se guardó antes (sin marca de a mano) pasa a la regla', JSON.stringify(V.sync.marks._tcOff), '{"v":3600,"o":"regla"}');
    V = entorno({ nube: {} });
    t.eq('sin reglas, no toca nada', String(await V.A.tciAplicar()) + ' ' + JSON.stringify(V.sync.marks), 'null {}');
    V = entorno({ nube: reglas, ep: null });
    t.eq('sin capítulo abierto, nada', String(await V.A.tciAplicar()), 'null');
    V = entorno({ nube: reglas });
    const antes = V.A.tciAplicar();
    V.ctx.currentEp = { id: 'otro', showId: 's1', name: 'X 108' };
    t.eq('si se cambió de capítulo mientras leía las reglas, no se las pone al nuevo', String(await antes), 'null');
  }

  t.seccion('6 · cableado en la app');
  {
    const html = fs.readFileSync(INDEX, 'utf8'), sw = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8');
    t.ok('se carga el módulo y va en la caché', /<script src="\.\/js\/tcinicial\.js"><\/script>/.test(html) && /'\.\/js\/tcinicial\.js'/.test(sw));
    t.ok('«Nuevo programa» pide la casa, con las del pedido y «Otra…», y no crea sin ella',
         /<label for="npCasa">Casa<\/label><select id="npCasa">/.test(html) && /TCI_CASAS/.test(html) && /<option value="__otra">Otra…<\/option>/.test(html)
         && /if\(!casa\)\{ \$q\('npErr'\)\.textContent='Elige la casa del proyecto';/.test(html) && /tciAsignarCasa\(show\.id, casa\)/.test(html));
    t.ok('el estudio: botón «Más capítulos…», el TC con su origen y las reglas al cargar las marcas',
         /<button id="stTc0Regla"[^>]*>Más capítulos…<\/button>/.test(html) && /function studioSetTc0\(sec, save, origen\)/.test(html) && /sync\.marks\._tcOff = \{ v: sec, o: origen \|\| 'manual' \}/.test(html)
         && /if\(typeof tciAplicar==='function'\) tciAplicar\(\)/.test(html) && /studioSetTc0\(script\[0\]\.tcEff, true, 'auto'\)/.test(html));
    t.ok('el TC puesto por las reglas no lo pisa el automático', /!\(typeof sync!=='undefined' && sync\.marks && sync\.marks\._tcOff && sync\.marks\._tcOff\.o==='regla'\)/.test(html));
    t.ok('con su estilo', /\.tci-caja\{/.test(html) && /\.tci-op\{/.test(html));
  }
};
