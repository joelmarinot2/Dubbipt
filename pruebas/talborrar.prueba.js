/* Eliminar talentos · especificacion 09, PRO-54
 *
 * Pedido de sala: «que se puedan eliminar talentos». Lo que protege esta
 * prueba: que se pregunta antes, diciendo qué personajes se quedan sin
 * talento; que se quita en los tres sitios -los datos de Casting (todas las
 * fichas con ese nombre y sus asignaciones), el casting de cada programa de
 * Dubbipt con el capítulo abierto, y la base de talentos-; y que cancelar no
 * toca nada.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Talentos: eliminar un talento';

const RAIZ = path.dirname(INDEX);
const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
const HTML = fs.readFileSync(INDEX, 'utf8');
const castNorm = (t) => String(t == null ? '' : t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();

exports.pruebas = async function(t){
  t.seccion('1 · desde Talentos: pregunta y quita en los tres sitios');
  {
    const armar = (confirmar) => {
      const D = { avisos: [], quitados: [], base: [], cambios: [], preguntas: [], pintadas: 0, apuntes: [] };
      D.datos = { talents: [{ id: 1, name: 'CARLOS RUIZ' }, { id: 2, name: 'CARLOS RUÍZ' }, { id: 3, name: 'ANA ROJAS' }],
                  castings: [{ talent_id: 1, episode_id: 1, character_id: 7 }, { talent_id: 2, episode_id: 2, character_id: 7 }, { talent_id: 3, episode_id: 1, character_id: 8 }] };
      D.CS = { talAbierto: 'CARLOS RUIZ', talEditar: 'CARLOS RUIZ', registros: { s1: {} } };
      D.CS_REGS = { lista: [1], ts: 9 };
      D.M = montar([['/* ── Eliminar un talento (PRO-54)', '/* ── Buscar y fusionar talentos (PRO-52)']], ['csBorrarTalento'],
        { castNorm: castNorm, CS: D.CS, CS_REGS: D.CS_REGS, castAviso: (m) => D.avisos.push(m), csRepintar: () => { D.pintadas++; }, fallo: () => {},
          csActual: () => ({ datos: D.datos }),
          DDL_UI: { confirmModal: async (o) => { D.preguntas.push(o); return confirmar; } },
          dcxBorrarTalentos: (pl, ids) => { pl.talents = pl.talents.filter(x => ids.indexOf(x.id) < 0); pl.castings = pl.castings.filter(c => ids.indexOf(c.talent_id) < 0); return true; },
          csEditar: async (cambio, que) => { const r = cambio(D.datos); D.cambios.push(que); return r ? 'guardado' : 'igual'; },
          prodPuede: () => true, dcxRegistrar: (e) => D.apuntes.push(e), dcxEntrada: (q) => q,
          sbShows: () => [{ id: 's1' }, { id: 's2' }],
          castRegQuitarTalento: async (sid, n) => { D.quitados.push(sid + ':' + n); return sid === 's1'; },
          talQuitar: async (n) => { D.base.push(n); return true; } });
      return D;
    };
    const f = { clave: 'CARLOS RUIZ', nombre: 'CARLOS RUIZ', t: { id: 1 }, nPer: 2, nProg: 1, programas: [{ programa: 'Akka', personajes: [1, 2] }] };
    const A = armar(true);
    const r = await A.M.csBorrarTalento(f);
    t.eq('pregunta antes, en rojo, diciendo qué personajes se quedan sin talento', A.preguntas.length + ' ' + A.preguntas[0].danger + ' ' + /Hace 2 personajes en 1 programa: se quedarán sin talento/.test(A.preguntas[0].body) + ' ' + /Fusionar/.test(A.preguntas[0].body) + ' ' + A.preguntas[0].items[0].label + ' ' + A.preguntas[0].items[0].meta,
         '1 true true true Akka 2 personajes');
    t.eq('en Casting: todas las fichas con ese nombre (aunque cambie una tilde) y sus asignaciones', r + ' ' + A.datos.talents.map(x => x.name).join(',') + ' ' + A.datos.castings.length + ' · ' + A.cambios[0],
         'guardado ANA ROJAS 1 · Talento eliminado: CARLOS RUIZ (2 asignaciones quedan sin talento)');
    t.eq('en el casting de cada programa de Dubbipt y en la base', A.quitados.join(',') + ' · ' + A.base.join(','), 's1:CARLOS RUIZ,s2:CARLOS RUIZ · CARLOS RUIZ');
    t.eq('cierra su ficha y el cuadro, olvida lo leído y repinta', A.CS.talAbierto + ' ' + A.CS.talEditar + ' ' + JSON.stringify(A.CS.registros) + ' ' + A.CS_REGS.lista + ' ' + A.pintadas, 'null null {} null 1');
    t.eq('y lo dice', A.avisos[0], 'Talento eliminado: CARLOS RUIZ · quitado del casting de 1 programa de Dubbipt');

    const B = armar(false);
    t.eq('cancelar no toca nada', (await B.M.csBorrarTalento(f)) + ' ' + B.datos.talents.length + ' ' + B.quitados.length + ' ' + B.base.length + ' ' + B.cambios.length, 'cancelado 3 0 0 0');

    const C = armar(true);
    const g = { clave: 'LUZ MAR', nombre: 'Luz Mar', t: null, nPer: 0, nProg: 0, programas: [] };
    t.eq('sin ficha ni papeles: se quita de la base y se apunta', (await C.M.csBorrarTalento(g)) + ' ' + /No tiene papeles/.test(C.preguntas[0].body) + ' ' + C.cambios.length + ' ' + C.datos.talents.length + ' ' + C.base.join(',') + ' ' + C.apuntes.join(','),
         'guardado true 0 3 Luz Mar Talento eliminado: Luz Mar');
  }

  t.seccion('2 · en los datos de Casting');
  {
    const DX = montar([['function castNorm(t){', 'async function castRegCargar(showId){'], ['/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT', '/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT']],
      ['dcxBorrarTalentos'], { castNorm: undefined, dcSesion: null, dcLeer: null, dcEscribir: null, prodNormalizar: null, prodGuardar: null, PROD: {} });
    const p = { talents: [{ id: 1, name: 'A' }, { id: '2', name: 'B' }, { id: 3, name: 'C' }], castings: [{ talent_id: 1 }, { talent_id: 2 }, { talent_id: 3 }, { talent_id: '1' }] };
    t.eq('quita los talentos y sus asignaciones (el id, como venga escrito)', DX.dcxBorrarTalentos(p, [1, 2]) + ' ' + p.talents.map(x => x.name).join(',') + ' ' + p.castings.map(c => c.talent_id).join(','), 'true C 3');
    t.eq('si no hay ninguno, nada', DX.dcxBorrarTalentos(p, [9]), false);
  }

  t.seccion('3 · el registro de casting de un programa, y el capítulo abierto');
  {
    const reg = { personajes: { ALLY: { display: 'Ally', talent: 'Carlos Ruiz' }, JANA: { display: 'Jana', talent: 'LUZ MAR' } },
                  capitulos: { 'Ep 1': { personajes: { ALLY: { display: 'Ally', talent: 'CARLOS RUIZ', lineas: 10 } } } } };
    const D = { guardados: [], pintadas: 0, subidos: 0 };
    const charIdx = { ALLY: { key: 'ALLY', talent: 'CARLOS RUIZ' }, JANA: { key: 'JANA', talent: 'LUZ MAR' } };
    const M = montar([['async function castRegRenombrarTalento', 'function castRegAnotarPronto(){']], ['castRegRenombrarTalento', 'castRegQuitarTalento'],
      { castNorm: castNorm, castRegCargar: async () => reg, castRegGuardar: async (id) => { D.guardados.push(id); return true; },
        CS: { registros: {} }, charIdx: charIdx, currentEp: { id: 'e1', showId: 's1' }, window: { _charsRaw: [] }, renderCards: () => { D.pintadas++; }, epDataUpsert: async () => { D.subidos++; } });
    t.eq('sus personajes se quedan sin talento, en el registro, en cada capítulo y en el abierto', (await M.castRegQuitarTalento('s1', 'CARLOS RUIZ')) + ' [' + reg.personajes.ALLY.talent + '] [' + reg.capitulos['Ep 1'].personajes.ALLY.talent + '] [' + charIdx.ALLY.talent + '] ' + reg.personajes.JANA.talent + ' ' + D.guardados.join(',') + ' ' + D.subidos,
         'true [] [] [] LUZ MAR s1 1');
    t.eq('renombrar sigue sin aceptar un nombre vacío', await M.castRegRenombrarTalento('s1', 'LUZ MAR', ''), false);
  }

  t.seccion('4 · la base de talentos');
  {
    const TAL = { nombres: ['ANA ROJAS', 'LUZ MAR'], claves: new Set(['ANA ROJAS', 'LUZ MAR']), origen: 'x' };
    const D = { guardados: 0 };
    const M = montar([['async function talQuitar', '/**\n * Carga la base.']], ['talQuitar'],
      { TAL: TAL, castNorm: castNorm, talPoner: (l) => { TAL.nombres = l.slice(); TAL.claves = new Set(l.map(castNorm)); }, talGuardar: async () => { D.guardados++; } });
    t.eq('si está, se quita y se guarda', (await M.talQuitar('luz mar')) + ' ' + TAL.nombres.join(',') + ' ' + D.guardados, 'true ANA ROJAS 1');
    t.eq('si no está, nada', (await M.talQuitar('NADIE')) + ' ' + D.guardados, 'false 1');
  }

  t.seccion('5 · dónde está');
  t.ok('«Eliminar talento» en el cuadro de editar y la papelera en la ficha', /data-cs="talBorrar" data-v="' \+ csEsc\(f\.clave\) \+ '" title="Eliminar este talento">/.test(CV) && /cs-b-icono cs-borrar" data-cs="talBorrar"/.test(CV) && /que === 'talBorrar'/.test(CV));
  t.ok('con sus estilos', /\.cs-tal-modal-b \.cs-borrar\{/.test(HTML));
};
