/* Casting: «Confirmar todos» los talentos heredados · especificacion 02, CAST-7b
 *
 * Pedido de sala: «agrega en casting un botón que sea confirmar todos los
 * talentos». Lo que protege esta prueba: el botón da por buenos de una vez
 * los heredados con talento (y solo esos), lo guarda y lo apunta con un solo
 * paso de deshacer; sin ninguno, no hace nada y lo dice; y el botón cuenta
 * cuántos quedan y se apaga cuando no hay.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Casting: confirmar todos los talentos heredados';

function armar(chars){
  const D = { avisos: [], historial: [], guardados: 0, pintados: 0, apuntes: 0, boton: { disabled: null, textContent: '', title: '' } };
  const charIdx = {}; for(const c of chars) charIdx[c.key] = Object.assign({}, c);
  const raw = chars.map(c => Object.assign({}, c));
  const M = montar([['function castVerificar(key, verificado){', '/** Los casos que NO son coincidencia exacta se preguntan, uno por uno. */']],
    ['castVerificar', 'castConfirmarTodos', 'castPintarConfirmar'],
    { charIdx: charIdx, window: { _charsRaw: raw }, currentEp: { id: 'ep1', showId: 'sh1' },
      castHistPush: (foto, etq) => D.historial.push(etq + ':' + foto.length), castFoto: (keys) => keys.map(k => ({ key: k })),
      renderPlanilla: () => {}, renderCards: () => { D.pintados++; }, epDataUpsert: async () => { D.guardados++; return true; },
      castRegAnotarPronto: () => { D.apuntes++; }, castAviso: (m) => D.avisos.push(m), fallo: () => {},
      document: { getElementById: (id) => id === 'btnCastOk' ? D.boton : null } });
  return Object.assign(D, { M: M, charIdx: charIdx, raw: raw });
}

exports.pruebas = async function(t){
  t.seccion('1 · confirmar todos');
  {
    const A = armar([{ key: 'ALLY', display: 'Ally', talent: 'ANA ROJAS', heredado: true }, { key: 'JANA', display: 'Jana', talent: 'LUZ MAR', heredado: true },
                     { key: 'TITO', display: 'Tito', talent: 'BEA', heredado: false }, { key: 'SIN', display: 'Sin', talent: '', heredado: true }]);
    t.eq('el botón dice cuántos quedan', A.M.castPintarConfirmar() + ' ' + A.boton.textContent + ' ' + A.boton.disabled, '2 Confirmar todos (2) false');
    t.eq('confirma los heredados con talento, y solo esos', (await A.M.castConfirmarTodos()) + ' ' + ['ALLY', 'JANA', 'TITO', 'SIN'].map(k => A.charIdx[k].heredado).join(','), '2 false,false,false,true');
    t.ok('también en el crudo, que es lo que se reabre', A.raw.find(x => x.key === 'ALLY').heredado === false && A.raw.find(x => x.key === 'SIN').heredado === true);
    t.eq('un solo paso de deshacer, se repinta, se guarda en la nube y se apunta en el registro', A.historial.join('|') + ' ' + A.pintados + ' ' + A.guardados + ' ' + A.apuntes, 'confirmar 2 talentos:2 1 1 1');
    t.ok('y se dice', A.avisos.some(a => /2 talentos confirmados/.test(a)));
    t.eq('después, el botón se apaga', A.boton.disabled + ' ' + A.boton.textContent, 'true Confirmar todos');
    t.eq('sin nada que confirmar: nada, y se dice', (await A.M.castConfirmarTodos()) + ' ' + A.avisos.slice(-1)[0] + ' ' + A.guardados, '0 No hay talentos heredados por confirmar 1');
    const B = armar([{ key: 'UNO', display: 'Uno', talent: 'X', heredado: true }]);
    t.ok('con uno, en singular', (await B.M.castConfirmarTodos()) === 1 && B.avisos[0] === '✅ 1 talento confirmado' && B.historial[0] === 'confirmar 1 talento:1');
  }

  t.seccion('2 · dónde está');
  {
    const HTML = fs.readFileSync(INDEX, 'utf8');
    t.ok('el botón, en la barra del casting, y solo en casting', /<button class="btnv sm" id="btnCastOk" style="display:none" onclick="castConfirmarTodos\(\)" disabled/.test(HTML) && /'btnRepVentana','btnCastOk'\]/.test(HTML));
    t.ok('se pone al día al pintar las tarjetas y al entrar en casting', (HTML.match(/castPintarConfirmar\(\); \}catch/g) || []).length >= 2);
    t.ok('en la especificación', /CAST-7b/.test(fs.readFileSync(path.join(path.dirname(INDEX), 'especificacion', '02-casting.md'), 'utf8')));
  }
};
