/* El diagnóstico de un personaje al que le falta texto · especificacion 01
 *
 * Llego de sala: el personaje GRAFICA no traia uno de sus parlamentos. Unas
 * cabeceras suyas SI se reconocian y otras no, y ese caso -a medias- no
 * avisaba de nada: el diagnostico solo salia cuando el personaje estaba a
 * CERO. Lo unico que se veia era que faltaba texto, sin saber cual ni por que.
 *
 * Aqui se prueba lo que ahora tiene que contar: cuantas cabeceras suyas se
 * reconocieron, cuantas no, y CUALES son las que no.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'Cuando a un personaje le falta texto, el libreto dice cuál y por qué';

const RECORTES = [
  ['function norm(s){', 'function esc(s){'],
  ['const LAT_STROKE = {', 'const CUE_RE'],
  ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'],
  ['function libDiagData(key){', 'function libDiagHtml(key, dHecho){']
];

/** Monta el diagnostico con unas paginas, unas marcas y un desglose. */
function diag(key, paginas, opts){
  opts = opts || {};
  const pageData = {};
  paginas.forEach((p, i) => {
    pageData[i + 1] = { lines: p.lines.map(t => ({ text: t })), marks: p.marks || [] };
  });
  const M = montar(RECORTES, ['libDiagData'], {
    pageData: pageData,
    script: opts.script || [],
    charIdx: opts.charIdx || {},
    window: {},
    console: { warn: () => {}, log: () => {} }
  });
  return M.libDiagData(key);
}

const CH = { GRAFICA: { display: 'GRÁFICA' } };
const BLK = [{ key: 'GRAFICA' }];

exports.pruebas = function(t){

  t.seccion('1 · las cabeceras que sí se reconocieron y las que no');
  /* Dos cabeceras de GRAFICA: la de la pagina 1 con marca, la de la pagina 2
     sin ella. Es el caso exacto que llego de sala. */
  const d = diag('GRAFICA', [
    { lines: ['01:05:40', 'GRÁFICA', 'HOLA'], marks: [{ key: 'GRAFICA', lineIdx: 1 }] },
    { lines: ['01:05:53', 'GRÁFICA', 'DISFRUTA A LO GRANDE', 'BOSH'], marks: [] }
  ], { charIdx: CH, script: BLK });

  t.eq('cuenta las reconocidas', d.cabecerasReconocidas, 1);
  t.eq('y las que no', d.cabecerasSinReconocer, 1);
  t.ok('la que falla sale marcada y con su página',
       d.renglonesDelPdf.some(r => /SIN RECONOCER/.test(r) && /p\.2/.test(r)),
       JSON.stringify(d.renglonesDelPdf));
  t.ok('las que se han perdido salen PRIMERO, que son las que importan',
       /SIN RECONOCER/.test(d.renglonesDelPdf[0]));
  t.ok('la que va bien sale como buena',
       d.renglonesDelPdf.some(r => /^✓/.test(r) && /p\.1/.test(r)));

  t.seccion('2 · el nombre dentro del diálogo NO es una cabecera perdida');
  /* Si se contara cualquier renglon que MENCIONA el nombre, cada vez que un
     personaje nombra a otro saltaria una alarma falsa y el aviso dejaria de
     significar nada. Solo cuentan los renglones que EMPIEZAN por el nombre. */
  const d2 = diag('GRAFICA', [
    { lines: ['JOE', 'Mira la GRÁFICA que han puesto.', 'Y entonces GRÁFICA dijo algo'], marks: [] }
  ], { charIdx: CH, script: BLK });
  t.eq('ninguna cabecera perdida', d2.cabecerasSinReconocer, 0);
  t.eq('ni reconocida', d2.cabecerasReconocidas, 0);

  t.seccion('3 · con el timecode delante, sigue siendo una cabecera');
  const d3 = diag('GRAFICA', [
    { lines: ['01:05:53 GRÁFICA', 'DISFRUTA A LO GRANDE'], marks: [] }
  ], { charIdx: CH, script: BLK });
  t.eq('la ve, aunque lleve el timecode pegado delante', d3.cabecerasSinReconocer, 1);

  t.seccion('4 · el acento no cambia nada');
  const d4 = diag('GRAFICA', [
    { lines: ['GRAFICA', 'sin tilde'], marks: [] },
    { lines: ['GRÁFICA', 'con tilde'], marks: [] }
  ], { charIdx: CH, script: BLK });
  t.eq('las dos formas cuentan igual', d4.cabecerasSinReconocer, 2,
       'el desglose escribe GRAFICA y el guion GRÁFICA: si el acento contara, '
       + 'el aviso no vería la mitad de los renglones');

  t.seccion('5 · si todo va bien, no hay nada que avisar');
  const d5 = diag('GRAFICA', [
    { lines: ['GRÁFICA', 'HOLA'], marks: [{ key: 'GRAFICA', lineIdx: 0 }] }
  ], { charIdx: CH, script: BLK });
  t.eq('ninguna perdida', d5.cabecerasSinReconocer, 0,
       'con esto en cero el aviso NO sale, que es lo que tiene que pasar cuando '
       + 'el personaje está entero');
  t.eq('y una reconocida', d5.cabecerasReconocidas, 1);

  t.seccion('6 · el aviso sale también cuando el personaje tiene parlamentos');
  /* La condicion que decide si se enseña el panel. Antes era `!mineCount` a
     secas -solo con cero parlamentos-, y por eso el caso de GRAFICA era mudo. */
  const TODO = require('./ayuda').fuentes().map(f => f.src).join('\n');
  t.ok('renderLibretoBlocks mira las cabeceras perdidas, no solo el total',
       /if\(!mineCount \|\| d\.cabecerasSinReconocer > 0\)/.test(TODO),
       'si vuelve a mirar solo el total, un personaje al que le falten '
       + 'parlamentos se queda otra vez sin decir nada');
};
