/* «Solo gestos» con nombre propio y ORIGINAL por continuidad · especificacion 02, CAST-42
 *
 * Pedido de sala: «si en las tarjetas de doblaje aparecen personajes con solo
 * gesto y yo los verifico con otro nombre, por favor pasar la tarjeta con el
 * nombre que coloco, no con ORIGINAL; también los personajes que por
 * continuidad son ORIGINAL, verificarlos y colocarlos en otro color para yo
 * colocar un talento que lo interpretó u otro talento».
 *
 * Lo que protege esta prueba:
 *   1. un personaje de solo gestos al que se le escribe un nombre queda
 *      mirado y se cierra con ESE nombre; y «verificar» no lo cambia por
 *      ORIGINAL (sí lo hace con quien no tiene a nadie);
 *   2. un ORIGINAL heredado de otro capítulo se distingue del resto de los
 *      heredados (celeste), y «Confirmar todos» no lo da por bueno;
 *   3. la tarjeta y la tabla lo pintan, con su color y su botón.
 */
'use strict';
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Solo gestos con nombre propio y ORIGINAL por continuidad';

exports.pruebas = async function(t){
  const HTML = fs.readFileSync(INDEX, 'utf8');

  t.seccion('1 · solo gestos: el nombre que pones es el que se queda');
  {
    const script = [{ idx: 0, key: 'MALESOLDIER', lines: ['(REACCIÓN)'] }, { idx: 1, key: 'GUARDIA', lines: ['(GRUNTS)'] }, { idx: 2, key: 'EXTRA', lines: ['(REACCIÓN)'] }];
    const charIdx = {
      MALESOLDIER: { key: 'MALESOLDIER', display: 'MALE SOLDIER', talent: '' },
      GUARDIA: { key: 'GUARDIA', display: 'GUARDIA', talent: 'LUZ MAR', heredado: false },
      EXTRA: { key: 'EXTRA', display: 'EXTRA', talent: 'PEPE GIL', heredado: true }
    };
    const w = { _charsRaw: Object.keys(charIdx).map(k => Object.assign({}, charIdx[k])), _dataEpId: 'x' };
    const G = montar([['const GEST_PAL', '/** Aviso al entrar en casting']],
      ['gestVerificar', 'gestDarPorMirado', 'gestPendiente', 'gestOlvidar', 'GEST_ORIGINAL'],
      { script, charIdx, DDL_MODO: 'casting', window: w, NO_REC: new Set(['ORIGINAL', 'TODOS', 'X']), norm: (s) => String(s).toUpperCase().trim(),
        castHistPush: () => {}, castFoto: () => ({}), fallo: () => {} });
    G.gestOlvidar();
    t.eq('al principio, los tres están por mirar', ['MALESOLDIER', 'GUARDIA', 'EXTRA'].map(k => G.gestPendiente(k)).join(','), 'true,true,true');
    /* Escribe un nombre a mano: queda mirado, con ese nombre. */
    charIdx.MALESOLDIER.talent = 'ANA ROJAS';
    G.gestDarPorMirado('MALESOLDIER');
    t.eq('con un nombre escrito a mano, deja de estar pendiente', G.gestPendiente('MALESOLDIER'), false);
    t.eq('también en lo crudo, que es lo que se reabre', w._charsRaw.find(x => x.key === 'MALESOLDIER').gestOk, true);
    /* «Verificar» con un nombre ya puesto no lo cambia por ORIGINAL. */
    G.gestVerificar('GUARDIA', true);
    t.eq('verificar respeta el nombre que ya tenía', charIdx.GUARDIA.talent + ' ' + charIdx.GUARDIA.noRec + ' ' + w._charsRaw.find(x => x.key === 'GUARDIA').talent, 'LUZ MAR undefined LUZ MAR');
    /* Un nombre HEREDADO de otro capítulo no es tuyo: verificar sí lo deja ORIGINAL. */
    G.gestVerificar('EXTRA', true);
    t.eq('el heredado de otro capítulo sí pasa a ORIGINAL', charIdx.EXTRA.talent + ' ' + charIdx.EXTRA.noRec + ' ' + charIdx.EXTRA.heredado, 'ORIGINAL true false');
    t.eq('y sin nadie, ORIGINAL como siempre', (() => { charIdx.MALESOLDIER.talent = ''; charIdx.MALESOLDIER.gestOk = false; G.gestVerificar('MALESOLDIER', true); return charIdx.MALESOLDIER.talent; })(), 'ORIGINAL');
  }
  t.ok('al guardar un talento en la tarjeta y en la tabla, el personaje de gestos queda mirado',
       /if\(val\) try\{ gestDarPorMirado\(c\.key\); \}catch/.test(HTML) && /if\(val\) try\{ gestDarPorMirado\(key\); \}catch/.test(HTML));

  t.seccion('2 · ORIGINAL por continuidad');
  {
    const charIdx = {
      A: { key: 'A', display: 'A', talent: 'ORIGINAL', heredado: true, noRec: true },
      B: { key: 'B', display: 'B', talent: ' original ', heredado: true, noRec: true },
      C: { key: 'C', display: 'C', talent: 'ANA ROJAS', heredado: true },
      D: { key: 'D', display: 'D', talent: 'ORIGINAL', heredado: false, noRec: true },
      E: { key: 'E', display: 'E', talent: 'TODOS', heredado: true, noRec: true },
      F: { key: 'F', display: 'F', talent: '', heredado: true }
    };
    const D = { avisos: [], boton: { disabled: null, textContent: '', title: '' } };
    const M = montar([['function castVerificar(key, verificado){', '/** Los casos que NO son coincidencia exacta se preguntan, uno por uno. */']],
      ['castVerificar', 'castOriginalHeredado', 'castConfirmarTodos', 'castPintarConfirmar'],
      { charIdx, window: { _charsRaw: Object.keys(charIdx).map(k => Object.assign({}, charIdx[k])) }, currentEp: null,
        castHistPush: () => {}, castFoto: (k) => k, renderPlanilla: () => {}, renderCards: () => {}, epDataUpsert: async () => true,
        castRegAnotarPronto: () => {}, castAviso: (m) => D.avisos.push(m), fallo: () => {},
        document: { getElementById: (id) => id === 'btnCastOk' ? D.boton : null } });
    t.eq('es ORIGINAL por continuidad si es ORIGINAL (escrito como sea) y viene de otro capítulo', Object.keys(charIdx).map(k => M.castOriginalHeredado(charIdx[k])).join(','), 'true,true,false,false,false,false');
    t.eq('el botón «Confirmar todos» solo cuenta los demás heredados', M.castPintarConfirmar() + ' ' + D.boton.textContent, '2 Confirmar todos (2)');
    t.eq('y confirma esos, no los ORIGINAL', (await M.castConfirmarTodos()) + ' ' + Object.keys(charIdx).map(k => charIdx[k].heredado).join(','), '2 true,true,false,false,false,true');
    t.eq('los ORIGINAL siguen por decidir; al verificar uno (o ponerle un talento), se cierra', (() => { M.castVerificar('A', true); return charIdx.A.heredado + ' ' + M.castOriginalHeredado(charIdx.A) + ' ' + M.castOriginalHeredado(charIdx.B); })(), 'false false true');
  }

  t.seccion('3 · en pantalla');
  t.ok('la tarjeta lleva la clase y la marca «original por continuidad», con su botón, y «Asignar talento» en vez de «Editar»',
       /const origCont = !soloGestos && castOriginalHeredado\(c\);/.test(HTML) && /\(origCont\?' origcont':''\)/.test(HTML)
       && /<small class="ctal-orig"[^>]*>original por continuidad<\/small>/.test(HTML) && /<button class="verbtn verbtn-orig"/.test(HTML)
       && /\(origCont \? 'Asignar talento' : 'Editar'\)/.test(HTML));
  t.ok('la tabla también, y dice cuántos hay', /const origCont = cast && !gestPend && castOriginalHeredado\(c\);/.test(HTML) && /\(origCont \? ' origcont' : ''\)/.test(HTML)
       && /original por continuidad'\):''\)/.test(HTML));
  t.ok('en celeste, por encima del naranja, y solo en casting',
       /body\.modo-casting \.card\.heredado\.origcont\{\s*border-color:#38BDF8 !important;/.test(HTML) && /\.verbtn-orig\{ background:#38BDF8;/.test(HTML)
       && /body\.modo-casting \.pla tbody tr\.origcont td\{ background:rgba\(56,189,248,\.08\); \}/.test(HTML));
  t.ok('«Confirmar todos» lo deja aparte', /&& !castOriginalHeredado\(c\); \}\);\s*\n\s*if\(!claves\.length\)/.test(HTML) && /String\(c\.talent\)\.trim\(\) && !castOriginalHeredado\(c\)\) n\+\+/.test(HTML));
};
