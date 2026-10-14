/* Talentos: cambiar el nombre de un talento · especificacion 09, PRO-50
 *
 * Pedido de sala: «en la sección de Talentos se puedan editar los nombres de
 * cada talento». Lo que protege esta prueba: el nombre cambia en los datos
 * de Casting, en el registro de casting de cada programa de Dubbipt (y en el
 * capítulo abierto) y en la base de talentos; uno repetido no se admite; y
 * los lápices están en la tarjeta y en la ficha.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Talentos: cambiar el nombre de un talento';

const RAIZ = path.dirname(INDEX);
const castNorm = (t) => String(t == null ? '' : t).toUpperCase().replace(/\s+/g, ' ').trim();

exports.pruebas = async function(t){
  t.seccion('1 · desde Casting: en los tres sitios');
  {
    const armar = () => {
      const D = { avisos: [], regs: [], base: [], pintadas: 0, cambios: [] };
      const datos = { talents: [{ id: 1, name: 'ANA ROJAS' }, { id: 2, name: 'BEATRIZ SOL' }] };
      D.ctx = { CS: { talAbierto: 'ANA ROJAS', registros: { s1: {} } }, CS_REGS: { lista: [1], ts: 9 } };
      D.M = montar([['/* ── Cambiar el nombre de un talento', '/* ── Un episodio nuevo entra en Producción']], ['csRenombrarTalento'],
        { castNorm: castNorm, CS: D.ctx.CS, CS_REGS: D.ctx.CS_REGS, castAviso: (m) => D.avisos.push(m), csRepintar: () => { D.pintadas++; }, fallo: () => {},
          dcxNombreTalento: (n) => castNorm(n),
          dcxTalento: (pl, id, c) => { if(pl.talents.some(x => x.id !== id && castNorm(x.name) === castNorm(c.name))) throw new Error('ya hay un talento que se llama «' + c.name + '»'); const x = pl.talents.find(y => y.id === id); x.name = c.name; return true; },
          csEditar: async (cambio, que) => { try{ const r = cambio(datos); D.cambios.push(que); return r ? 'guardado' : 'igual'; }catch(e){ D.avisos.push('No se pudo guardar: ' + e.message); return 'error'; } },
          sbShows: () => [{ id: 's1', name: 'A' }, { id: 's2', name: 'B' }],
          castRegRenombrarTalento: async (sid, v, n) => { D.regs.push(sid + ':' + v + '>' + n); return sid === 's1'; },
          talRenombrar: async (v, n) => { D.base.push(v + '>' + n); return true; } });
      D.datos = datos;
      return D;
    };
    const A = armar();
    t.eq('cambia en Casting, en los registros de cada programa y en la base, y se apunta', (await A.M.csRenombrarTalento(A.datos.talents[0], ' ana  rojas de la vega ')) + ' ' + A.datos.talents[0].name + ' · ' + A.regs.join(',') + ' · ' + A.base.join(',') + ' · ' + A.cambios[0],
         'guardado ANA ROJAS DE LA VEGA · s1:ANA ROJAS>ANA ROJAS DE LA VEGA,s2:ANA ROJAS>ANA ROJAS DE LA VEGA · ANA ROJAS>ANA ROJAS DE LA VEGA · Talento renombrado: ANA ROJAS → ANA ROJAS DE LA VEGA');
    t.eq('la ficha abierta sigue abierta con el nombre nuevo; lo leído se olvida para releerlo; se repinta', A.ctx.CS.talAbierto + ' ' + JSON.stringify(A.ctx.CS.registros) + ' ' + A.ctx.CS_REGS.lista + ' ' + A.pintadas, 'ANA ROJAS DE LA VEGA {} null 1');
    t.ok('se dice en cuántos programas de Dubbipt cambió', A.avisos.some(a => a === 'El nombre también cambió en el casting de 1 programa de Dubbipt'));
    t.eq('el mismo nombre, nada; vacío, nada; sin talento, nada', (await A.M.csRenombrarTalento(A.datos.talents[1], 'beatriz sol')) + ' ' + (await A.M.csRenombrarTalento(A.datos.talents[1], '  ')) + ' ' + (await A.M.csRenombrarTalento(null, 'x')), 'nada nada nada');
    const B = armar();
    t.eq('uno que ya se llama así: se dice y no se toca nada más', (await B.M.csRenombrarTalento(B.datos.talents[0], 'Beatriz Sol')) + ' ' + B.datos.talents[0].name + ' ' + B.regs.length + ' ' + B.base.length + ' ' + B.avisos[0], 'error ANA ROJAS 0 0 No se pudo guardar: ya hay un talento que se llama «BEATRIZ SOL»');
  }

  t.seccion('2 · el registro de casting de un programa, y el capítulo abierto');
  {
    const reg = { personajes: { ALLY: { display: 'Ally', talent: 'Ana Rojas', episodios: ['Ep 1'] }, JANA: { display: 'Jana', talent: 'LUZ MAR' } },
                  capitulos: { 'Ep 1': { personajes: { ALLY: { display: 'Ally', talent: 'ANA ROJAS', lineas: 10 }, TITO: { display: 'Tito', talent: '' } } } } };
    const D = { guardados: [], pintadas: 0, subidos: 0 };
    const charIdx = { ALLY: { key: 'ALLY', talent: 'ANA ROJAS' }, JANA: { key: 'JANA', talent: 'LUZ MAR' } };
    const raw = [{ key: 'ALLY', talent: 'ANA ROJAS' }];
    const M = montar([['async function castRegRenombrarTalento', 'function castRegAnotarPronto(){']], ['castRegRenombrarTalento'],
      { castNorm: castNorm, castRegCargar: async (id) => (id === 's1' ? reg : { personajes: {} }), castRegGuardar: async (id, r) => { D.guardados.push(id); return true; },
        CS: { registros: {} }, charIdx: charIdx, currentEp: { id: 'e1', showId: 's1' }, window: { _charsRaw: raw }, renderCards: () => { D.pintadas++; }, epDataUpsert: async () => { D.subidos++; } });
    t.eq('cambia por personaje y en cada foto de capítulo, y guarda', (await M.castRegRenombrarTalento('s1', 'ANA ROJAS', 'ANA ROJAS DE LA VEGA')) + ' ' + reg.personajes.ALLY.talent + ' · ' + reg.capitulos['Ep 1'].personajes.ALLY.talent + ' · ' + reg.personajes.JANA.talent + ' · ' + D.guardados.join(','), 'true ANA ROJAS DE LA VEGA · ANA ROJAS DE LA VEGA · LUZ MAR · s1');
    t.eq('y en el capítulo abierto de ese programa: tarjetas y crudo, repintado y subido', charIdx.ALLY.talent + ' ' + raw[0].talent + ' ' + charIdx.JANA.talent + ' ' + D.pintadas + ' ' + D.subidos, 'ANA ROJAS DE LA VEGA ANA ROJAS DE LA VEGA LUZ MAR 1 1');
    t.eq('un nombre que no está en ese programa: nada, sin guardar', (await M.castRegRenombrarTalento('s2', 'ANA ROJAS', 'X')) + ' ' + D.guardados.length, 'false 1');
    t.eq('sin datos, nada', (await M.castRegRenombrarTalento('', 'a', 'b')) + ' ' + (await M.castRegRenombrarTalento('s1', '', 'b')), 'false false');
  }

  t.seccion('3 · la base de talentos');
  {
    const TAL = { nombres: ['ANA ROJAS', 'LUZ MAR'], claves: new Set(['ANA ROJAS', 'LUZ MAR']), origen: 'x' };
    const D = { guardados: 0 };
    const M = montar([['async function talRenombrar', '/**\n * Carga la base.']], ['talRenombrar'],
      { TAL: TAL, castNorm: castNorm, talPoner: (l, o) => { TAL.nombres = l.slice().sort(); TAL.claves = new Set(l.map(castNorm)); }, talGuardar: async () => { D.guardados++; } });
    t.eq('si está en la base, se cambia y se guarda', (await M.talRenombrar('ana rojas', 'ANA ROJAS DE LA VEGA')) + ' ' + TAL.nombres.join(',') + ' ' + D.guardados, 'true ANA ROJAS DE LA VEGA,LUZ MAR 1');
    t.eq('si no está, nada', (await M.talRenombrar('NADIE', 'X')) + ' ' + D.guardados, 'false 1');
  }

  t.seccion('4 · dónde está');
  {
    const CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
    t.ok('el lápiz en la tarjeta (solo con ficha) y junto al nombre en la ficha', /cs-tcard-ren" data-cs="talRen" data-v="' \+ csEsc\(f\.t\.id\)/.test(CV) && /cs-tficha-ren" data-cs="talRen" data-v="' \+ csEsc\(t\.id\)/.test(CV));
    t.ok('el campo Nombre de «Editar ficha» pasa por el mismo camino', /if\(campo === 'name'\)\{[\s\S]{0,300}csRenombrarTalento\(t, valor\)/.test(CV) && /que === 'talRen'/.test(CV));
    t.ok('con sus estilos', /\.cs-tcard-ren\{/.test(fs.readFileSync(INDEX, 'utf8')));
  }
};
