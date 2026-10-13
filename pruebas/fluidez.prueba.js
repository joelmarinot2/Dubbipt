/* Fluidez: lo que se recuerda entre pintados, y cuándo se rehace · especificacion 09, PRO-45
 *
 * Pedido de sala: «haz una verificación y validación y quiero que todo el
 * programa sea más fluido». Lo que protege esta prueba: cada memoria devuelve
 * lo mismo que calcular de nuevo, no se rehace mientras nada cambia, y se
 * rehace en cuanto cambia lo que la alimenta; y repintar Casting no vuelve a
 * pintar la biblioteca tapada de debajo.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Fluidez: memorias y repintado solo de Casting';

const RAIZ = path.dirname(INDEX);
const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');

exports.pruebas = async function(t){
  const PR = montar([['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']], ['prodNormalizar', 'prodIndices'], { castNorm: undefined, console: { warn(){} } });
  const NORM = montar([['function castNorm(t){', '/** El número final, si lo hay']], ['castNorm'], {});

  t.seccion('1 · los índices de DublajeCast');
  {
    const d = PR.prodNormalizar({ series: [{ id: 1, name: 'A' }], episodes: [{ id: 1, series_id: 1 }, { id: 2, series_id: 1 }], castings: [{ id: 1, episode_id: 1 }] });
    const a = PR.prodIndices(d), b = PR.prodIndices(d);
    t.ok('el mismo juego de datos da el mismo índice, sin rehacerlo', a === b && a.epsPorSerie['1'].length === 2);
    d.castings.push({ id: 2, episode_id: 2 });
    const c = PR.prodIndices(d);
    t.ok('si una lista crece, se rehace', c !== a && c.castingsPorEp['2'].length === 1);
    d.episodes = [{ id: 3, series_id: 1 }];
    t.ok('si una lista se cambia por otra, también', PR.prodIndices(d).epsPorSerie['1'].length === 1);
    t.ok('otro juego de datos, otro índice', PR.prodIndices(PR.prodNormalizar({ series: [] })) !== c);
  }

  t.seccion('2 · castNorm con memoria');
  {
    t.eq('normaliza igual que siempre', NORM.castNorm('  Dra. Tracy  Fanará (archivo) ') + '|' + NORM.castNorm(null) + '|' + NORM.castNorm(12), 'DRA TRACY FANARA ARCHIVO||12');
    t.eq('y la segunda vez sale de la memoria, igual', NORM.castNorm('  Dra. Tracy  Fanará (archivo) '), 'DRA TRACY FANARA ARCHIVO');
    t.ok('la memoria existe y no crece sin límite', NORM.castNorm.memo instanceof Map && /memo\.size > 30000\) memo\.clear\(\)/.test(fs.readFileSync(INDEX, 'utf8')));
  }

  t.seccion('3 · lo guardado en el equipo se lee una vez');
  {
    let lecturas = 0, parses = 0;
    const almacen = { 'ddl-estados::w': '{"s1":"completo"}' };
    const L = montar([['function csClaveEstados(){', '/** El estado de un programa de Dubbipt:']], ['csEstadosLocales', 'csEstadoLocal'],
      { WORKSPACE: { id: 'w' }, localStorage: { getItem: (k) => { lecturas++; return k in almacen ? almacen[k] : null; }, setItem: (k, v) => { almacen[k] = v; } },
        JSON: { parse: (x) => { parses++; return JSON.parse(x); }, stringify: JSON.stringify } });
    L.csEstadosLocales(); L.csEstadosLocales(); L.csEstadosLocales();
    t.eq('tres lecturas, un solo JSON.parse', parses + ' ' + L.csEstadosLocales().s1, '1 completo');
    L.csEstadoLocal('s2', 'completo');
    t.eq('al escribir, se vuelve a leer', L.csEstadosLocales().s2 + ' ' + parses, 'completo 2');
    almacen['ddl-estados::w'] = '{}';
    t.eq('y si otro lo cambia en el almacén, también', Object.keys(L.csEstadosLocales()).length + ' ' + parses, '0 3');
  }

  t.seccion('4 · los episodios de un programa');
  {
    const LDB = { epsAll: [] };
    const E = montar([['const CS_EPS_MEMO = new Map();', '/** El casting de un episodio:']], ['csEpisodios'],
      { LDB: LDB, dcastEpDeDc: (nombre, dcEps) => dcEps.find(e => e.title === nombre) || null, csNumeroDe: (n) => parseInt(String(n).match(/\d+/) || 'x', 10) });
    const dcEps = [{ id: 11, episode_number: 1, title: 'Episodio 1' }];
    const p = { clave: 's:1', nombre: 'A', eps: [{ id: 'e1', name: 'Episodio 1' }, { id: 'e2', name: 'Episodio 2' }], dcEps: dcEps };
    const a = E.csEpisodios(p);
    t.ok('lo de siempre: cada capítulo con su pareja de DublajeCast', a.length === 2 && a[0].dcEp === dcEps[0] && a[1].dcEp === null);
    t.ok('pedido otra vez, el mismo resultado sin rehacerlo', E.csEpisodios({ clave: 's:1', nombre: 'A', eps: p.eps.slice(), dcEps: dcEps }) === a);
    const b = E.csEpisodios({ clave: 's:1', nombre: 'A', eps: [{ id: 'e1', name: 'Episodio 1' }, { id: 'e2', name: 'Capítulo dos' }], dcEps: dcEps });
    t.ok('renombrado un capítulo, se rehace', b !== a && b[1].titulo === 'Capítulo dos');
    const c = E.csEpisodios({ clave: 's:1', nombre: 'A', eps: p.eps, dcEps: [{ id: 11, episode_number: 1, title: 'Episodio 1' }, { id: 12, episode_number: 2, title: 'Episodio 2' }] });
    t.ok('cambiados los de DublajeCast, también', c !== a && c[1].dcEp && c[1].dcEp.id === 12);
    LDB.epsAll = [];
    t.ok('recargada la biblioteca, también', E.csEpisodios(p) !== a);
  }

  t.seccion('5 · dónde está');
  {
    t.ok('el reparto, los papeles, las fichas y la ocupación se recuerdan', ['CS_REPARTO_MEMO', 'CS_PAPELES_MEMO', 'CS_FICHAS_MEMO', 'CS_OC_MEMO'].every(k => CV.indexOf('const ' + k) >= 0));
    t.ok('repintar Casting no repinta la biblioteca tapada de debajo', /function csRepintarSolo\(\)/.test(CV) && /if\(csRepintarSolo\(\)\) return;\s*\n\s*renderLibrary\(true\);/.test(CV));
    t.ok('la serie de cada programa se recuerda por juego de datos', /DCAST_SERIES/.test(fs.readFileSync(path.join(RAIZ, 'js', 'dublajecast.js'), 'utf8')));
    t.ok('lo del marco de DublajeCast no se normaliza dos veces', /DCAST\.normDe === v/.test(fs.readFileSync(path.join(RAIZ, 'js', 'dublajecast.js'), 'utf8')));
    t.ok('la copia para guardar va por structuredClone cuando lo hay', /function dcxCopia\(x\)[\s\S]*?structuredClone/.test(fs.readFileSync(path.join(RAIZ, 'js', 'dcescribir.js'), 'utf8')) && /dcxCopia\(dcast\.payload\)/.test(CV));
  }
};
