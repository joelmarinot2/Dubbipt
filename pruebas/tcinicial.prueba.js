/* El timecode inicial en las tarjetas de doblaje · especificacion 01, LIB-28
 *
 * Pedido de sala: «quiero que en las tarjetas de doblaje esté el time code
 * inicial de cada personaje». La cajita estaba, pero solo se llenaba con las
 * marcas del PDF escaneado: con el libreto de Word, con el capítulo abierto
 * desde la nube (las marcas no se guardan) o con solo el desglose, salía
 * vacía. Lo que protege esta prueba: que el desglose guarda el timecode de
 * entrada (su columna TIME, la de LOCUTOR o el pegado al nombre, como en los
 * presupuestos de «Final Table» y «Lyla in the Loop»); el orden de dónde se
 * saca (PDF, libreto, desglose); los personajes fusionados; y que un
 * parlamento sin timecode no vuelve de la nube como «00:00:00».
 */
'use strict';
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');

exports.nombre = 'Tarjetas de doblaje: el timecode inicial de cada personaje';

function armar(){
  return montar([['function norm(s){', 'function esc(s){'], ['/**\n * El timecode con el que entra', 'function renderPlanilla(){'], ['function parseSheet(rows){', 'function parseDesglose(wb){']],
    ['parseSheet', 'desgloseTC', 'firstTCOf', 'pon: (o) => { charIdx = o.charIdx || {}; charMarks = o.charMarks || {}; script = o.script || []; scriptByKey = o.scriptByKey || {}; window._charsRaw = o.raw || []; }'],
    { norm: undefined, TC_RE: /^\d{1,2}\s*[:;.]\s*\d{2}/, window: { _charsRaw: [] }, fmtTC: (s) => 'TC' + s, charIdx: {}, charMarks: {}, script: [], scriptByKey: {} });
}

exports.pruebas = async function(t){
  const M = armar();
  const lista = (r) => (r || []).map(c => c.display + ' ' + (c.tc || '—')).join(' | ');

  t.seccion('1 · el desglose guarda el timecode de entrada');
  /* DESGLOCE de «Final Table» 103: el timecode va en la columna de LOCUTOR. */
  const ft = [[], ['PERSONAJE', 'LOCUTOR', '', '', '', 'PAGINA , No DE INTERVENCIONES'], ['', '', 'P', 'L', 'P', 'L', 'TOTAL'],
    ['WALLA', '00:00:30 ', 1, 1, 24, 1], ['SONG-YI', '00:00:56 ', 1, 2, 5, 1], ['', '', 45, 5, 46, 1]];
  t.eq('en la columna de LOCUTOR («Final Table»)', lista(M.parseSheet(ft)), 'WALLA 00:00:30 | SONG-YI 00:00:56');
  /* CASTING 1: columna TIME y el locutor al lado. */
  const c1 = [['PERSONAJE', 'TIME', 'LOCUTOR'], ['', '', '', 'P', 'L', 'TOTAL'], ['YEONG-SU', '00:12:23 ', 'ANDRES F MARULANDA', 19, 1, 20, 4]];
  const r1 = M.parseSheet(c1);
  t.eq('en su columna TIME, y el talento sigue en su sitio', lista(r1) + ' · ' + r1[0].talent, 'YEONG-SU 00:12:23 · ANDRES F MARULANDA');
  /* PLANILLA de «Lyla in the Loop»: pegado al nombre. */
  const ly = [['PERSONAJE', 'LOCUTOR'], ['', '', 'P', 'L', 'TOTAL'], ['LYLA   01:00:31', 'PAULA ESPINOSA MEXICO', 1, 2, 2, 4]];
  t.eq('pegado al nombre («Lyla in the Loop»): el nombre limpio y el timecode aparte', lista(M.parseSheet(ly)), 'LYLA 01:00:31');
  t.eq('como lo guarda Excel (fracción del día), texto con espacios, con fotogramas, o nada',
       [M.desgloseTC(0.00859), M.desgloseTC('0:12:23 '), M.desgloseTC('01:00:31:12'), M.desgloseTC('hola'), M.desgloseTC(null)].map(x => JSON.stringify(x)).join(','),
       '"00:12:22","00:12:23","01:00:31:12","",""');

  t.seccion('2 · de dónde sale el de la tarjeta');
  M.pon({ charIdx: { ANA: { key: 'ANA', tc0: '00:05:00' } }, charMarks: { ANA: [{ tcSec: null }, { tcSec: 60 }] }, script: [{ key: 'ANA', tcSec: 125 }], scriptByKey: { ANA: [0] } });
  t.eq('primero, las marcas del PDF', M.firstTCOf('ANA'), 'TC60');
  M.pon({ charIdx: { ANA: { key: 'ANA', tc0: '00:05:00' } }, script: [{ key: 'ANA', tcSec: null }, { key: 'ANA', tcSec: 125 }], scriptByKey: { ANA: [0, 1] } });
  t.eq('sin PDF (Word, o abierto desde la nube): el primer parlamento con timecode', M.firstTCOf('ANA'), 'TC125');
  M.pon({ charIdx: { ANA: { key: 'ANA', tc0: '00:05:00' } } });
  t.eq('sin libreto: el del desglose', M.firstTCOf('ANA'), '00:05:00');
  M.pon({ charIdx: { ANA: { key: 'ANA', tc0: '00:05:00', aliases: ['ANITA'] } }, raw: [{ key: 'ANITA', tc0: '00:01:10' }] });
  t.eq('fusionado con otro: el que entra antes', M.firstTCOf('ANA'), '00:01:10');
  M.pon({ charIdx: { LEO: { key: 'LEO' } } });
  t.eq('sin nada: la cajita vacía, como antes', M.firstTCOf('LEO'), null);

  t.seccion('3 · se guarda y se pinta');
  const html = fs.readFileSync(INDEX, 'utf8');
  t.ok('el desglose lo guarda en el personaje (tc0) y una fusión se queda con el primero',
       /if\(c\.tc\) obj\.tc0 = c\.tc;/.test(html) && /if\(ab\.tc0 && \(!prim\.tc0 \|\| String\(ab\.tc0\) < String\(prim\.tc0\)\)\) prim\.tc0 = ab\.tc0;/.test(html));
  t.ok('al volver de la nube, un parlamento sin timecode no pasa a 00:00:00', /if\(o\.tcSec!==null\) numIf\(o,'tcSec'\); if\(o\.tcEff!==null\) numIf\(o,'tcEff'\);/.test(html));
  t.ok('y la tarjeta lo pinta encima del nombre', /const tc0 = \(typeof firstTCOf==='function' \? firstTCOf\(c\.key\) : ''\) \|\| '';/.test(html) && /<div class="ctc">\$\{esc\(tc0\)\}<\/div>/.test(html));
};
