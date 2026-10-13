/* Entregas: un capítulo completado no tiene nada pendiente · especificacion 09, PRO-48
 *
 * Pedido de sala, con una captura del Dashboard: «¿por qué me salen estas
 * DUBCARD vencidas si ya están completadas?». Lo que protege esta prueba:
 * completado en DublajeCast, completado en Dubbipt, programa completado o
 * fila de Producción finalizada: sin entregas; y si el capítulo está en
 * Producción, mandan las fechas y la fase de su fila.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Entregas: lo completado no vence';

const HOY = new Date(2026, 9, 13);
const castNorm = (t) => String(t == null ? '' : t).toUpperCase().replace(/[^A-Z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

exports.pruebas = async function(t){
  const PR = montar([['/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST', '/* ═══ FIN DE PRODUCCIÓN']], ['prodNormalizar', 'prodIndices', 'prodAlertasEp', 'prodFormatoDubcard'], { castNorm: castNorm, console: { warn(){} } });
  const serie = { id: 1, name: 'AGENTE KIM', status: 'en_curso' };
  const ep = (x) => Object.assign({ id: 11, series_id: 1, episode_number: 101, title: 'Episodio 101', fecha_miami: '2026-06-17', fecha_dubcard: '2026-06-16', fase: 'pre_produccion' }, x || {});

  t.seccion('1 · lo de siempre, y lo completado en DublajeCast');
  {
    t.eq('un capítulo con fechas pasadas y sin completar: vencidas', PR.prodAlertasEp(ep(), serie, HOY).map(a => a.texto).join(' · '), 'Miami vencida hace 118 d · DUBCARD vencida hace 119 d');
    t.eq('completado en DublajeCast: nada', PR.prodAlertasEp(ep({ status: 'completo' }), serie, HOY).length, 0);
    t.eq('de un programa completado: nada', PR.prodAlertasEp(ep(), { id: 1, name: 'X', status: 'completo' }, HOY).length, 0);
  }

  t.seccion('2 · completado en Dubbipt o en Producción');
  {
    const estados = {}, ED = { pl: null, que: '' };
    const lista = [{ clave: 's:s1', nombre: 'AGENTE KIM', show: { id: 's1', name: 'AGENTE KIM' }, serie: serie, eps: [{ id: 'e1', name: 'Episodio 101' }], dcEps: [] }];
    const M = montar([['/* ── Las entregas de un capítulo: lo que de verdad falta', '/**\n * La ocupación de cada talento']],
      ['csAlertasEp', 'csFilaProduccionDe', 'csDcCompletadosEnDubbipt', 'csResumen', 'csProgRequiereDubcard'],
      { castNorm: castNorm, prodAlertasEp: PR.prodAlertasEp, prodIndices: PR.prodIndices, prodPlazo: () => ({ nivel: 'hecho' }), csContexto: () => null,
        dcxSerie: (pl, id, c) => { const x = pl.series.find(y => y.id === id); if(!x || x.requiere_dubcard === c.requiere_dubcard) return false; x.requiere_dubcard = c.requiere_dubcard; return true; },
        csEditar: async (cambio, que) => { const r = cambio(ED.pl); ED.que = que; return r ? 'guardado' : 'igual'; },
        csActual: () => ({ lista: lista }), csEpisodios: (p) => [{ clave: 'e:e1', ep: p.eps[0], dcEp: { id: 11 }, numero: 101 }], csEstadoEp: (e) => estados[e.clave] || 'en_curso' });
    const d = PR.prodNormalizar({ series: [serie], episodes: [ep()], produccion: [] });
    t.eq('sin nada que lo complete: vencidas (y en el Dashboard)', M.csAlertasEp(d, serie, d.episodes[0], HOY).length + ' ' + M.csResumen(d, HOY).entregas.length, '2 2');
    estados['e:e1'] = 'completo';
    t.eq('completado en Dubbipt (su pareja): nada, tampoco en el Dashboard', M.csDcCompletadosEnDubbipt().has('11') + ' ' + M.csAlertasEp(d, serie, d.episodes[0], HOY, M.csDcCompletadosEnDubbipt()).length + ' ' + M.csResumen(d, HOY).entregas.length, 'true 0 0');
    delete estados['e:e1'];
    const d2 = PR.prodNormalizar({ series: [serie], episodes: [ep()], produccion: [{ id: 1, programa: 'Agente Kim', capitulo: 'Episodio 101', fase: 'completado', fecha_miami: '2026-06-17', fecha_dubcard: '2026-06-16' }] });
    t.eq('su fila de Producción finalizada: nada', M.csFilaProduccionDe(d2, serie, d2.episodes[0]).id + ' ' + M.csAlertasEp(d2, serie, d2.episodes[0], HOY).length + ' ' + M.csResumen(d2, HOY).entregas.length, '1 0 0');
    const d3 = PR.prodNormalizar({ series: [serie], episodes: [ep()], produccion: [{ id: 2, programa: 'AGENTE KIM', capitulo: '101', fase: 'produccion_activa', fecha_miami: '2026-06-17', fecha_dubcard: '2026-10-15', formato_dubcard: 'BACKLOT' }] });
    t.eq('en Producción mandan su fase y sus fechas: Miami entregada, DUBCARD en 2 días', M.csAlertasEp(d3, serie, d3.episodes[0], HOY).map(a => a.texto).join(' · '), 'DUBCARD en 2 d');
    const d4 = PR.prodNormalizar({ series: [serie], episodes: [ep({ episode_number: null, title: 'Final' })], produccion: [{ id: 3, programa: 'AGENTE KIM', capitulo: 'final', fase: 'pre_produccion', fecha_miami: '', fecha_dubcard: '', formato_dubcard: 'No necesita DUBCARD' }] });
    t.eq('la fila se encuentra también por el título, y sin fechas en ella no hay nada', !!M.csFilaProduccionDe(d4, serie, d4.episodes[0]) + ' ' + M.csAlertasEp(d4, serie, d4.episodes[0], HOY).length, 'true 0');
    t.eq('otro programa con el mismo capítulo no se confunde', M.csFilaProduccionDe(d3, { id: 9, name: 'OTRO' }, d3.episodes[0]), null);
  }

  t.seccion('3 · un programa que no requiere DUBCARD (pedido de sala)');
  {
    const ED = { pl: null, que: '' }, estados = {};
    const lista = [];
    const M = montar([['/* ── Las entregas de un capítulo: lo que de verdad falta', '/**\n * La ocupación de cada talento']],
      ['csAlertasEp', 'csProgRequiereDubcard'],
      { castNorm: castNorm, prodAlertasEp: PR.prodAlertasEp, prodIndices: PR.prodIndices, prodPlazo: () => ({ nivel: 'hecho' }), csContexto: () => null, csActual: () => ({ lista: lista }), csEpisodios: () => [], csEstadoEp: () => 'en_curso',
        dcxSerie: (pl, id, c) => { const x = pl.series.find(y => y.id === id); if(!x || x.requiere_dubcard === c.requiere_dubcard) return false; x.requiere_dubcard = c.requiere_dubcard; return true; },
        csEditar: async (cambio, que) => { const r = cambio(ED.pl); ED.que = que; return r ? 'guardado' : 'igual'; } });
    const sinDc = { id: 1, name: 'AGENTE KIM', status: 'en_curso', requiere_dubcard: false };
    const d = PR.prodNormalizar({ series: [sinDc], episodes: [ep()], produccion: [{ id: 1, programa: 'AGENTE KIM', capitulo: 'Episodio 101', fase: 'pre_produccion', fecha_miami: '2026-06-17', fecha_dubcard: '2026-06-16', formato_dubcard: 'Excel' }] });
    t.eq('la marca del programa manda, aunque su fila de Producción traiga formato y fecha: solo avisa Miami', M.csAlertasEp(d, sinDc, d.episodes[0], HOY).map(a => a.texto).join(' · '), 'Miami vencida hace 118 d');
    ED.pl = { series: [{ id: 1, name: 'AGENTE KIM', requiere_dubcard: true }], produccion: [{ id: 1, programa: 'Agente Kim', capitulo: '101', cliente: 'Netflix', formato_dubcard: 'BACKLOT' }, { id: 2, programa: 'OTRO', formato_dubcard: 'Excel' }] };
    const p = { nombre: 'AGENTE KIM', serie: ED.pl.series[0] };
    t.eq('quitarle la marca: en DublajeCast, y sus filas de Producción pasan a «No necesita DUBCARD» (las de otros, no)', (await M.csProgRequiereDubcard(p, false)) + ' ' + ED.pl.series[0].requiere_dubcard + ' ' + ED.pl.produccion.map(r => r.formato_dubcard).join(','), 'guardado false No necesita DUBCARD,Excel');
    t.ok('queda apuntado', /AGENTE KIM: no requiere DUBCARD/.test(ED.que));
    t.eq('volver a ponerla: sus filas vuelven a su formato por cliente', (await M.csProgRequiereDubcard(p, true)) + ' ' + ED.pl.produccion.map(r => r.formato_dubcard).join(','), 'guardado BACKLOT,Excel');
    t.eq('sin serie en DublajeCast, nada', await M.csProgRequiereDubcard({ nombre: 'X', serie: null }, false), 'nada');
  }
};
