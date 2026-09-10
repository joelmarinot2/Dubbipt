/* El libreto · especificacion 01
 *
 * `buildScript` es la funcion de la que depende TODO lo demas: el casting, la
 * senalizacion de sala, la banda ritmica, los cues, los formatos. Un error
 * aqui se propaga a toda la aplicacion. Y hasta ahora no tenia ni una prueba:
 * era la mayor laguna que la propia especificacion se senalaba.
 *
 * Se puede probar sin PDF. `pageData` es una estructura plana -renglones de
 * texto y marcas de personaje- que aqui se fabrica a mano. Lo que hace el
 * lector de PDF es rellenar esa estructura; lo que hace buildScript es
 * convertirla en la lista de intervenciones, y eso es lo que se comprueba.
 *
 * Cada caso se monta por separado, con sus paginas: asi ninguno arrastra
 * estado del anterior.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El libreto: de las páginas a las intervenciones';

const RECORTES = [
  ['const TC_CORE_RE', 'function segsFromRange(line, from, to){'],
  ['const CUE_RE', 'function headIsAllName(t){'],
  ['function stripPageNum(t, p){', 'let script = [];'],
  ['const AD_ROW', 'function buildScriptAD(){'],
  ['function buildScript(){', 'let pronIdx = {};']
];
const EXPORTA = ['buildScript', 'strictTC', 'leadTC', 'trailTC', 'stripTCs', 'parseTC',
                 'tcFindAll', 'headerTail', 'stripPageNum', 'adDetect', 'adRows', 'AD_KEY'];

/** Un renglon de pagina. */
const ln = (t) => ({ text: t });
/** Una marca de personaje: en que renglon esta, donde empieza y cuanto mide. */
const mk = (key, lineIdx, at, len, tcSec) => ({ key, lineIdx, at, len, tcSec });

/**
 * Monta el modulo con unas paginas y devuelve el libreto que sale.
 * `paginas` es [{ lines, marks }]; la pagina 1 es la primera.
 */
function correr(paginas, opts){
  opts = opts || {};
  const pageData = {};
  paginas.forEach((p, i) => {
    pageData[i + 1] = { items: [], lines: p.lines, marks: p.marks || [] };
  });
  const win = {};
  const info = { ad: 0 };
  const M = montar(RECORTES, EXPORTA, {
    pageData: pageData,
    numPages: opts.numPages != null ? opts.numPages : paginas.length,
    script: opts.script || [],
    scriptByKey: {},
    charIdx: opts.charIdx || {},
    chars: opts.chars || [],
    aliasOf: opts.aliasOf || {},
    buildScriptAD: () => { info.ad++; },
    buildPronIndex: () => {},
    window: win,
    console: { warn: () => {}, log: () => {} }
  });
  M.buildScript();
  return { libreto: win._script, info: info, M: M };
}

const DOS = { NILA: { display: 'NILA' }, BABU: { display: 'BABU' } };

exports.pruebas = function(t){
  /* ── El motor de timecodes ────────────────────────────────────────────── */
  t.seccion('1 · un renglón que es SOLO timecode, escrito de mil maneras');
  const M = correr([{ lines: [ln('x')] }]).M;
  t.eq('con dos puntos', M.strictTC('01:00:15:03'), 3615.12);
  t.eq('con punto y coma', M.strictTC('01;00;15;03'), 3615.12);
  t.eq('entre paréntesis', M.strictTC('(01:00:15:03)'), 3615.12);
  t.eq('con la etiqueta TC delante', M.strictTC('TC 01:00:15:03'), 3615.12);
  t.eq('con un guion detrás', M.strictTC('01:00:15:03 -'), 3615.12);
  t.eq('minutos y segundos sueltos', M.strictTC('12:34'), 754);
  t.eq('una frase NO es un timecode', M.strictTC('y se fue'), null);
  t.eq('un número de página tampoco', M.strictTC('70'), null,
       'si «70» contara como timecode, cada página metería un salto falso');

  t.seccion('2 · LIB-4 y LIB-5 · timecode al principio y al final del renglón');
  t.eq('al principio, con el nombre detrás',
       JSON.stringify(M.leadTC('01:00:40:00 NILA')), '{"sec":3640,"rest":"NILA"}');
  t.eq('con texto real delante, NO encabeza', M.leadTC('y se fue 01:00:18:00'), null);
  t.eq('al final, con texto delante',
       JSON.stringify(M.trailTC('y se fue 01:00:18:00')), '{"sec":3618,"head":"y se fue"}');
  t.eq('un renglón que es solo timecode no tiene «final»', M.trailTC('01:00:18:00'), null);
  t.eq('quitar los timecodes deja el texto limpio',
       M.stripTCs('hola (01:00:15:03) que tal'), 'hola que tal',
       'y sin el paréntesis vacío que queda');

  t.seccion('3 · LIB-6 · el número de página impreso no es diálogo');
  t.eq('pegado al final, y coincide con la página', M.stripPageNum('hola 70', 70), 'hola');
  t.eq('pero un número cualquiera se queda', M.stripPageNum('hola 12', 70), 'hola 12',
       'un «12» en la página 70 es parte del diálogo, no la paginación');

  /* ── buildScript ──────────────────────────────────────────────────────── */
  t.seccion('4 · lo básico: una cabecera y su diálogo');
  const r1 = correr([{
    lines: [ln('NILA:'), ln('Esta es la casa de su madre.')],
    marks: [mk('NILA', 0, 0, 4, 3602)]
  }], { charIdx: DOS });
  t.eq('una intervención', r1.libreto.length, 1);
  t.eq('de NILA', r1.libreto[0].key, 'NILA');
  t.eq('con su timecode', r1.libreto[0].tcSec, 3602);
  t.eq('en su página', r1.libreto[0].page, 1);
  t.eq('y su texto', r1.libreto[0].lines.join(' '), 'Esta es la casa de su madre.');

  t.seccion('5 · LIB-4 · el timecode junto al nombre es SU timecode');
  const r2 = correr([{
    lines: [ln('NILA (V.O.) 01:00:40:00'), ln('Vamos allá.')],
    marks: [mk('NILA', 0, 0, 4, null)]
  }], { charIdx: DOS });
  t.eq('una sola intervención', r2.libreto.length, 1);
  t.eq('el timecode va a su casilla', r2.libreto[0].tcSec, 3640);
  t.eq('y NO se cuela como primera línea de diálogo',
       r2.libreto[0].lines.join(' '), 'Vamos allá.',
       'si se colara, alguien leería el timecode en voz alta');

  t.seccion('6 · LIB-5 · el timecode al final es del que EMPIEZA, no del que acaba');
  const r3 = correr([{
    lines: [ln('NILA:'), ln('y se fue 01:00:18:00'), ln('BABU:'), ln('vamos')],
    marks: [mk('NILA', 0, 0, 4, 3600), mk('BABU', 2, 0, 4, null)]
  }], { charIdx: DOS });
  t.eq('el texto de NILA queda limpio', r3.libreto[0].lines.join(' '), 'y se fue');
  t.eq('el timecode NO se queda con NILA', r3.libreto[0].tcSec, 3600);
  t.ok('se abre un punto de timecode justo después',
       r3.libreto.some(b => b.tcSec === 3618),
       'libreto: ' + JSON.stringify(r3.libreto.map(b => [b.key, b.tcSec])));
  const babu = r3.libreto.find(b => b.key === 'BABU');
  t.eq('y BABU, que es quien empieza, arranca en ese timecode', babu.tcEff, 3618);

  t.seccion('7 · LIB-3 · una intervención sin timecode propio hereda el anterior');
  const r4 = correr([{
    lines: [ln('NILA:'), ln('uno'), ln('BABU:'), ln('dos')],
    marks: [mk('NILA', 0, 0, 4, 3600), mk('BABU', 2, 0, 4, null)]
  }], { charIdx: DOS });
  t.eq('BABU no trae timecode propio', r4.libreto[1].tcSec, null);
  t.eq('pero el efectivo es el de NILA', r4.libreto[1].tcEff, 3600);
  t.eq('y el de NILA es el suyo', r4.libreto[0].tcEff, 3600);

  t.seccion('8 · LIB-6 · el número de página no genera una intervención');
  const r5 = correr([
    { lines: [ln('NILA:'), ln('hola')], marks: [mk('NILA', 0, 0, 4, 10)] },
    { lines: [ln('2'), ln('BABU:'), ln('adiós')], marks: [mk('BABU', 1, 0, 4, 20)] }
  ], { charIdx: DOS });
  t.eq('solo las dos intervenciones de verdad', r5.libreto.length, 2);
  t.ok('el «2» de la página 2 no aparece en ningún texto',
       !r5.libreto.some(b => b.lines.join(' ').indexOf('2') >= 0),
       JSON.stringify(r5.libreto.map(b => b.lines)));
  t.eq('la segunda va en la página 2', r5.libreto[1].page, 2);

  t.seccion('9 · LIB-N3 · renglón mixto: el timecode a su casilla, el texto se queda');
  const r6 = correr([{
    lines: [ln('NILA:'), ln('01:00:12:00 De verdad te digo')],
    marks: [mk('NILA', 0, 0, 4, null)]
  }], { charIdx: DOS });
  t.eq('una intervención', r6.libreto.length, 1);
  t.eq('el timecode se aparta', r6.libreto[0].tcSec, 3612);
  t.eq('y el texto sigue entero', r6.libreto[0].lines.join(' '), 'De verdad te digo');

  t.seccion('10 · LIB-N1 · con las páginas vacías NO se borra un libreto ya cargado');
  const yaCargado = [{ idx: 0, key: 'NILA', display: 'NILA', tcEff: 5, page: 1,
                       lines: ['esto viene de la nube'] }];
  const r7 = correr([], { script: yaCargado });
  t.eq('buildScript se retira sin tocar nada', r7.libreto, undefined,
       'un capítulo hidratado desde la nube no tiene páginas de PDF; '
       + 'reconstruir ahí borraría el libreto entero');

  /* ── LIB-8 y LIB-9 · audiodescripción ─────────────────────────────────── */
  t.seccion('11 · LIB-8 · un guion de audiodescripción se reconoce por su tabla');
  const tomas = (n, porPagina) => {
    const pgs = [];
    let hecho = 0, num = 1;
    while(hecho < n){
      const lines = [];
      for(let k = 0; k < porPagina && hecho < n; k++, hecho++, num++){
        const s = 3600 + num * 5;
        const hh = String(Math.floor(s / 3600)).padStart(2, '0');
        const mm = String(Math.floor(s % 3600 / 60)).padStart(2, '0');
        const ss = String(s % 60).padStart(2, '0');
        lines.push(ln(num + '  ' + hh + ':' + mm + ':' + ss + ':00  Ella mira la foto.'));
      }
      pgs.push({ lines: lines });
    }
    return pgs;
  };

  const ad10 = correr(tomas(10, 5), {});
  t.eq('diez tomas se leen como tomas', ad10.M.adRows().length, 10);
  t.eq('sin desglose, con diez basta para reconocerlo', ad10.M.adDetect(false), true);
  t.eq('y se delega en el lector de audiodescripción', ad10.info.ad, 1);

  t.seccion('12 · LIB-9 · con un desglose de doblaje cargado, hace falta MUCHO más');
  const conDesglose = { charIdx: DOS, chars: [{ key: 'NILA' }, { key: 'BABU' }] };
  const ad10b = correr(tomas(10, 5), conDesglose);
  t.eq('diez tomas NO secuestran un libreto de doblaje', ad10b.M.adDetect(true), false);
  t.eq('así que no se delega', ad10b.info.ad, 0);

  const ad25 = correr(tomas(25, 5), conDesglose);       // 25 tomas en 5 páginas de 5
  t.eq('veinticinco repartidas por la mitad de las páginas, sí', ad25.M.adDetect(true), true);
  t.eq('y se delega', ad25.info.ad, 1);

  /* Muchas tomas pero todas amontonadas en una página de doce: el patrón no
     recorre el guion, así que no es un guion de audiodescripción. */
  const amontonadas = tomas(25, 25).concat(
    Array.from({ length: 11 }, () => ({ lines: [ln('NILA:'), ln('hola')] })));
  const adAmont = correr(amontonadas, conDesglose);
  t.eq('veinticinco en una sola página de doce, no', adAmont.M.adDetect(true), false,
       'el patrón tiene que recorrer al menos la mitad del guion');

  t.seccion('13 · una numeración que no crece no es una tabla de tomas');
  const desordenadas = [{ lines: [
    ln('50  01:00:05:00  uno'), ln('3  01:00:10:00  dos'), ln('41  01:00:15:00  tres'),
    ln('7  01:00:20:00  cuatro'), ln('22  01:00:25:00  cinco'), ln('9  01:00:30:00  seis')
  ] }];
  t.eq('con los números revueltos, no se reconoce',
       correr(desordenadas, {}).M.adDetect(false), false);
};
