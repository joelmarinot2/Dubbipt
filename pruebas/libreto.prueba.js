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
const fs = require('fs');
const { montar, INDEX } = require('./ayuda');
/* Todo el codigo que se despliega, para comprobar que scanPdf sigue
   apoyandose en headerTail para vetar o aceptar una cabecera. */
const TODO_EL_CODIGO = require('./ayuda').fuentes().map(f => f.src).join('\n');
/* Las hojas de estilo del libreto son CSS dentro de plantillas de JS, y eso
   no sale en fuentes(): se lee el HTML aparte. Los finales de linea se
   normalizan igual que alli (ENT-15). */
const HTML = fs.readFileSync(INDEX, 'utf8').replace(/\r\n/g, '\n');

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

  /* ── La cuenta del personaje abierto ──────────────────────────────────── */
  t.seccion('14 · cuántas líneas tiene el personaje que estás leyendo');
  /*
   * Las LINEAS son la unidad con la que se paga y con la que se cita a un actor,
   * asi que es el numero que mas se consulta. Y son una cosa distinta de los
   * PARLAMENTOS -las cajas que se leen en pantalla-: un personaje con cuarenta
   * parlamentos cortos puede tener sesenta lineas. Confundirlos sale caro, por
   * eso salen los dos con su nombre.
   */
  const barra = { style:{}, innerHTML:'' };
  const banda = { getBoundingClientRect: () => ({ height: 34 }) };
  const medidas = {};
  const montarCuenta = (key, personajes, porClave) => {
    const M2 = montar(
      [['/* ═══ CUÁNTAS LÍNEAS TIENE ESTE PERSONAJE', 'function renderLibretoChips(){']],
      ['libBarraCuenta'],
      { pop2: { doc: {
          getElementById: (id) => ({ lCuenta: barra, lBarras: banda })[id] || null,
          /* libMedirBarras publica el alto de la banda aqui, para que la flecha
             de ocultar la barra no se quede encima del nombre. */
          documentElement: { style: {
            setProperty: (k, v) => { medidas[k] = v; },
            /* libMedirBarras lo consulta para no reescribir la variable cuando
               no ha cambiado: ahora lo llama un observador en cada cambio de
               tamaño, y tocar el DOM en cada vuelta sobra. */
            getPropertyValue: (k) => medidas[k] || ''
          } }
        }, key: key },
        charIdx: personajes,
        scriptByKey: porClave,
        esc: (x) => String(x),
        console: { warn: () => {}, log: () => {} } }
    );
    barra.style = {}; barra.innerHTML = '';
    M2.libBarraCuenta();
    return { visible: barra.style.display, texto: barra.innerHTML.replace(/<[^>]*>/g, ''),
             altoPublicado: medidas['--lbarsH'] };
  };

  const PERS = {
    MARLON:  { display:'MARLON',  totalInts:62, pages:[{p:1},{p:2},{p:3}] },
    LISA:    { display:'LISA',    totalInts:1,  pages:[{p:1}] },
    PUBLICO: { display:'PÚBLICO', totalInts:14, pages:[{p:2}] }
  };
  const POR = { MARLON: new Array(47).fill(0), LISA: [0] };

  const m = montarCuenta('MARLON', PERS, POR);
  t.eq('se enseña', m.visible, 'flex');
  t.ok('con su nombre', m.texto.includes('MARLON'));
  t.ok('las líneas del desglose', m.texto.includes('62 líneas'),
       'es el numero por el que se paga y por el que se cita a un actor');
  t.ok('y los parlamentos que vas a leer', m.texto.includes('47 parlamentos'),
       'son dos cosas distintas: confundirlas sale caro');
  t.ok('con sus páginas', m.texto.includes('3 páginas'));

  const l = montarCuenta('LISA', PERS, POR);
  t.ok('en singular, «1 línea»', l.texto.includes('1 línea') && !l.texto.includes('1 líneas'));
  t.ok('«1 parlamento»', l.texto.includes('1 parlamento') && !l.texto.includes('1 parlamentos'));
  t.ok('y «1 página»', l.texto.includes('1 página') && !l.texto.includes('1 páginas'));

  t.seccion('15 · un personaje sin parlamentos se dice, no se calla');
  const p = montarCuenta('PUBLICO', PERS, POR);
  t.ok('sale su cuenta del desglose', p.texto.includes('14 líneas'));
  t.ok('pero cero parlamentos', p.texto.includes('0 parlamentos'));
  t.ok('y se avisa', p.texto.includes('sin parlamentos en el libreto'),
       'es el sintoma de LIB-N4 -la clave que no casa- y callarlo fue lo que hizo '
       + 'que PUBLICO pasara desapercibido');

  t.seccion('16 · la banda dice cuánto ocupa, para que nada se le monte encima');
  /* La flecha de ocultar la barra de herramientas va fija y se quedaba ENCIMA
     del nombre del personaje. Ahora baja lo que mida la banda, que es una fila
     o dos segun el ancho: por eso se mide en vez de ponerle un numero. */
  t.eq('se publica el alto medido', m.altoPublicado, '34px',
       'con un numero fijo la flecha se queda corta o larga, y encima del nombre');

  t.seccion('17 · con el libreto completo abierto, la barra no estorba');
  const n = montarCuenta(null, PERS, POR);
  t.eq('se esconde', n.visible, 'none');
  t.eq('y se vacía', n.texto, '');

  t.seccion('18 · ninguna hoja de estilo lleva un acento grave dentro');
  /*
   * LIB_CSS, LIB_OVERRIDE y LIB_OCU_CSS son CSS dentro de PLANTILLAS de
   * JavaScript. Un acento grave ahi dentro -aunque sea en un comentario de
   * CSS- cierra la plantilla a media hoja y parte el archivo entero, con el
   * error saliendo cien lineas mas arriba, en un sitio que no tiene nada que
   * ver (ENT-17).
   *
   * La comprobacion de sintaxis ya lo caza, pero dice «Invalid left-hand side
   * expression» y senala otra linea. Esto dice cual es y por que.
   *
   * Pico dos veces el mismo dia, la segunda escribiendo el comentario que
   * explicaba la primera. Una regla escrita no basta.
   */
  const G = String.fromCharCode(96);
  for(const nombre of ['LIB_CSS', 'LIB_OVERRIDE', 'LIB_OCU_CSS']){
    const i = HTML.indexOf('const ' + nombre + ' = ' + G);
    t.ok(nombre + ' existe', i >= 0);
    if(i < 0) continue;
    const desde = i + ('const ' + nombre + ' = ' + G).length;
    const hasta = HTML.indexOf('\n' + G + ';', desde);
    t.ok(nombre + ' se cierra', hasta > desde);
    if(hasta < 0) continue;
    const dentro = HTML.slice(desde, hasta);
    const cuantos = dentro.split(G).length - 1;
    const linea = cuantos ? ('renglon «'
      + dentro.slice(0, dentro.indexOf(G)).split('\n').pop().trim().slice(0, 50) + '…»') : '';
    t.eq(nombre + ' no lleva ningun acento grave dentro', cuantos, 0,
         cuantos ? (linea + ' — cierra la hoja de estilos a la mitad y parte el archivo') : '');
  }

  t.seccion('19 · nada se monta encima de la banda del personaje');
  /*
   * La banda se mete entre la barra de herramientas y el libreto, y todo lo que
   * iba pegado a la altura de la cabecera se le quedaba encima: la flecha de
   * ocultar la barra, sobre el nombre; el riel de paginas, tapado por la banda
   * hasta comerse el «PAG.»; y la pestana de Ocupacion, sobre el boton de
   * quitar el talento. Los tres arrancan ahora DEBAJO, sumando --lbarsH.
   */
  /* El mismo selector aparece varias veces -`body.light .ltoolhide`, un
     `.lchips` que solo pone display-, asi que se busca la regla que de verdad
     coloca el `top`, no la primera que aparezca. */
  const bajo = (sel) => {
    let i = -1, n = 0;
    while((i = HTML.indexOf(sel, i + 1)) >= 0 && n++ < 20){
      const bloque = HTML.slice(i, HTML.indexOf('}', i));
      const j = bloque.indexOf('top:');
      if(j >= 0) return bloque.slice(j, bloque.indexOf(';', j));
    }
    return '(ninguna regla de ' + sel + ' pone top)';
  };
  t.ok('la flecha de ocultar la barra baja',
       bajo('.ltoolhide{').includes('var(--lbarsH'),
       'se quedaba encima del nombre del personaje');
  t.ok('el riel de paginas baja',
       bajo('body.deskchips .lchips{').includes('var(--lbarsH'),
       'la banda le pasaba por encima y se comia el «PAG.»');
  t.ok('y tambien con el riel a la izquierda',
       bajo('body.haschips .lchips{').includes('var(--lbarsH'));
  t.ok('la pestana de Ocupacion baja',
       bajo('.locu-tab{').includes('var(--lbarsH'),
       'caia sobre el boton de quitar el talento');

  /* ── 20 · la acotación que cuelga del nombre no puede vetar la cabecera ──
     Llegado de sala: el personaje TESTIGO salia con CERO parlamentos. En el PDF
     sus cabeceras ponen «TESTIGO (Archivo)» -metraje de archivo, una acotacion
     de lo mas normal en documental-, y esa coletilla vetaba la cabecera entera.

     Lo raro del fallo era la ARBITRARIEDAD: escrito «(ARCHIVO)» funcionaba y
     escrito «(Archivo)» no, porque solo se retiraban los parentesis vacios, los
     de la lista de acotaciones conocidas y los que fueran TODO mayusculas. Un
     guionista no tiene por que saber eso, y el sintoma que se ve es que un
     personaje desaparece del libreto sin explicacion. */
  t.seccion('20 · la acotación que cuelga del nombre no veta la cabecera');
  const H = correr([{ lines: [], marks: [] }]).M.headerTail;

  t.eq('«(Archivo)» se retira', H(' (Archivo)'), '',
       'es LO QUE LLEGO DE SALA: con esto sin retirar, TESTIGO se queda sin un '
       + 'solo parlamento en todo el libreto');
  t.eq('y en mayúsculas seguía funcionando', H(' (ARCHIVO)'), '');
  t.eq('y en minúsculas también', H(' (archivo)'), '');
  t.eq('una acotación de las conocidas, igual', H(' (V.O.)'), '');
  t.eq('una acotación cualquiera, también', H(' (susurrando)'), '');
  t.eq('de varias palabras, también', H(' (cámara de seguridad)'), '');
  t.eq('un paréntesis vacío no estorba', H(' ()'), '');
  t.eq('el timecode tampoco', H('  01:02:03:04'), '');
  t.eq('ni la puntuación suelta', H(' .-'), '');
  t.eq('ni dos acotaciones seguidas', H(' (Archivo) (OFF)'), '');

  /* Y lo que NO puede pasar: que por retirar acotaciones se trague el dialogo.
     Si detras del nombre hay texto, ese renglon no es una cabecera limpia y
     headerTail tiene que devolverlo para que quien decide lo vea. */
  t.eq('el diálogo NO se retira', H(' Yo estaba ahí cuando pasó'), 'Yo estaba ahí cuando pasó');
  t.eq('los dos puntos y su diálogo, tampoco', H(': Hola'), ': Hola');
  t.eq('tras la acotación, el diálogo sigue estando',
       H(' (Archivo) Yo estaba ahí'), 'Yo estaba ahí',
       'si esto volviera vacío, cualquier renglón de narración pasaría por cabecera');
  /* Las dos señales que separan una acotación de la narración, cada una con su
     caso propio: si comparten caso, una puede desaparecer sin que nadie note
     que ya no protege nada —pasó al escribir esto, y tres mutaciones se
     colaron sin poner ni una comprobación en rojo—. */
  t.eq('pasadas cuatro palabras ya no es una acotación',
       H(' (que ya sabemos que miente) responde'),
       '(que ya sabemos que miente) responde',
       'esta lleva cinco y NO tiene puntuación de frase: aquí solo decide el largo');
  t.eq('con puntuación de frase tampoco, aunque sea corta',
       H(' (¿de verdad?) responde'), '(¿de verdad?) responde',
       'esta lleva dos palabras: aquí solo decide la puntuación');

  /* Que el veto de scanPdf siga apoyandose en esto: si algun dia deja de
     usarlo, estas comprobaciones dejarian de proteger nada sin avisar. */
  t.ok('scanPdf sigue decidiendo el veto con headerTail',
       /const tail = headerTail\(after\)/.test(TODO_EL_CODIGO),
       'si ya no lo usa, esta sección no está protegiendo la cabecera de nadie');

  /* ── 21 · la banda se vuelve a medir cuando cambia de alto ───────────────
     Llego de sala: la pestaña de Ocupacion tapando el boton de guardar el
     talento. La banda mide UNA FILA O DOS segun el ancho, y eso cambia sin que
     nadie la vuelva a pintar -al estrechar la ventana, al abrir el libreto en
     media pantalla, o cuando acaba de cargar la tipografia-. Se medía solo al
     pintar, asi que el valor se quedaba viejo y todo lo que cuelga de el se
     quedaba ARRIBA, encima de la banda.
     Medido en un navegador con el CSS de verdad: a 1000 px la banda ocupa 45 y
     la variable dice 45; estrechada a 430 pasa a ocupar 64 y la variable sigue
     diciendo 45, con lo que la pestaña arranca en el 113 y la banda no acaba
     hasta el 118. */
  t.seccion('21 · la banda se vuelve a medir cuando cambia de alto');
  {
    /* Un libreto de mentira: una banda cuyo alto se puede cambiar a mano y un
       ResizeObserver que guarda a quien vigila y deja dispararlo. */
    let alto = 45;
    const vars = {};
    const raiz = { style: {
      setProperty: (k, v) => { vars[k] = v; },
      getPropertyValue: (k) => vars[k] || ''
    } };
    const banda = { getBoundingClientRect: () => ({ height: alto }) };
    const vigilados = [];
    let sueltos = 0;
    function ROFalso(fn){ this.fn = fn; }
    ROFalso.prototype.observe = function(el){ vigilados.push({ el: el, fn: this.fn }); };
    ROFalso.prototype.disconnect = function(){ sueltos++; };
    const oyentes = [];
    let quitados = 0;
    const pop2 = {
      win: {
        ResizeObserver: ROFalso,
        addEventListener: (ev, fn) => { oyentes.push({ ev: ev, fn: fn }); },
        removeEventListener: () => { quitados++; }
      },
      doc: { documentElement: raiz, getElementById: (id) => (id === 'lBarras' ? banda : null) }
    };
    const ctx = { pop2: pop2 };
    const M2 = montar([['function libMedirBarras(){', 'function renderLibretoChips(){']],
                      ['libMedirBarras', 'libVigilarBarras'], ctx);

    M2.libMedirBarras();
    t.eq('abierta ancha, la banda mide una fila', vars['--lbarsH'], '45px');

    M2.libVigilarBarras();
    t.eq('y queda vigilada', vigilados.length, 1);
    /* Con t.eq NO vale: compara objetos por su JSON, y estos dos solo tienen
       funciones dentro, así que los dos salen «{}» y cualquier cosa pasaría.
       Se comprobó mutando: vigilar otro elemento no ponía nada en rojo. */
    t.ok('se vigila la banda, no la ventana', vigilados[0].el === banda,
         'vigilando la ventana no contaría un nombre de talento largo, que hace '
         + 'saltar la fila sin que cambie el ancho');

    // se estrecha: la banda pasa a dos filas sin que nadie la vuelva a pintar
    alto = 64;
    t.eq('antes de avisar, la variable sigue diciendo lo de antes', vars['--lbarsH'], '45px');
    vigilados[0].fn();
    t.eq('el observador la vuelve a medir', vars['--lbarsH'], '64px',
         'es LO QUE LLEGÓ DE SALA: sin esto, la pestaña de Ocupación se queda '
         + 'encima del botón de Guardar');

    // volver a pintar no deja dos observadores colgando
    M2.libVigilarBarras();
    t.eq('al volver a pintar se suelta el anterior', sueltos, 1);
    t.eq('y solo queda uno vigilando', vigilados.length, 2,
         'el segundo observe() es el nuevo; el viejo se ha soltado');

    // sin cambios no se toca el DOM
    const antes = vars['--lbarsH'];
    raiz.style.setProperty = () => { t.ok('no se reescribe si no ha cambiado', false,
                                          'tocar el DOM en cada vuelta del observador'); };
    M2.libMedirBarras();
    raiz.style.setProperty = (k, v) => { vars[k] = v; };
    t.eq('y la variable se queda como estaba', vars['--lbarsH'], antes);

    /* La segunda vía: el aviso de la ventana. El observador es el bueno, pero
       no todos los navegadores lo traen y el caso que llegó de sala —abrir el
       libreto en media pantalla— lo cubre igual un resize. No se comprobó en un
       navegador que el observador dispare: el panel de pruebas no pinta y ahí
       no entrega avisos (ENT-18), así que se sostiene sobre las dos. */
    t.eq('también se escucha el cambio de tamaño de la ventana',
         oyentes.filter(o => o.ev === 'resize').length, 2,
         'dos porque libVigilarBarras se ha llamado dos veces');
    alto = 80;
    oyentes[oyentes.length - 1].fn();
    t.eq('y al avisar, vuelve a medir', vars['--lbarsH'], '80px');
    t.ok('al volver a pintar se quita el oyente viejo', quitados >= 1,
         'si no, cada render deja uno más colgando');

    // sin ResizeObserver no se rompe nada: queda el aviso de la ventana
    const winBueno = pop2.win;
    pop2.win = { addEventListener: () => {}, removeEventListener: () => {} };
    let reventó = false;
    try{ M2.libVigilarBarras(); }catch(e){ reventó = true; }
    t.ok('sin observador en el navegador, ni se queja', !reventó);
    pop2.win = winBueno;

    /* Y que alguien lo llame de verdad: todo lo de arriba lo dispara la prueba
       a mano, así que si nadie lo enchufa al pintar el libreto, no vigila nada
       y estas comprobaciones no protegen nada. */
    t.ok('el libreto lo pone a vigilar al pintarse',
         /renderLibretoChips[\s\S]{0,2000}?libVigilarBarras\(\)/.test(TODO_EL_CODIGO),
         'nadie llama a libVigilarBarras: la banda se mediría solo al pintar, '
         + 'que es justo el fallo que llegó de sala');
  }

  /* ── 22 · la barra de herramientas también cambia de alto sola ───────────
     Segunda captura de sala, con el cajón de Ocupación ABIERTO: la pestaña
     encima de los botones de la barra. La barra se parte en MÁS FILAS cuando
     se estrecha el hueco del libreto, y abrir ese cajón le quita 320 px de
     ancho de golpe — sin que la ventana cambie de tamaño, así que el oyente de
     `resize` que ya había no se entera. --lhH se quedaba en el alto de una
     barra de una fila y el cajón entero arrancaba ahí, encima de ella. */
  t.seccion('22 · la barra de herramientas también cambia de alto sola');
  {
    const M3 = montar([['function libMedirBarras(){', 'function renderLibretoChips(){']],
                      ['libVigilarAlto'], { pop2: null, fallo: () => {} });

    const vigilados = [];
    function ROFalso(fn){ this.fn = fn; }
    ROFalso.prototype.observe = function(el){ vigilados.push({ el: el, fn: this.fn }); };
    ROFalso.prototype.disconnect = function(){};
    const barra = { es: 'la barra' };
    let llamadas = 0;

    const ro = M3.libVigilarAlto({ ResizeObserver: ROFalso }, barra, () => { llamadas++; });
    t.ok('devuelve el observador, para poder soltarlo', !!ro);
    t.ok('y vigila lo que se le ha dado', vigilados.length === 1 && vigilados[0].el === barra);
    vigilados[0].fn();
    t.eq('al avisar, vuelve a medir', llamadas, 1);

    t.eq('sin ResizeObserver devuelve null, y ya está',
         M3.libVigilarAlto({}, barra, () => {}), null,
         'en un navegador sin observador queda el aviso de la ventana');
    t.eq('sin elemento, tampoco se inventa nada',
         M3.libVigilarAlto({ ResizeObserver: ROFalso }, null, () => {}), null);

    /* Una medición que se rompa no puede llevarse por delante el observador:
       dejaría de avisar para siempre y el fallo volvería en silencio. */
    const ro2 = M3.libVigilarAlto({ ResizeObserver: ROFalso }, barra, () => { throw new Error('ups'); });
    let reventó = false;
    try{ vigilados[vigilados.length - 1].fn(); }catch(e){ reventó = true; }
    t.ok('una medición rota no tumba el observador', !reventó && !!ro2);

    /* Y que la barra quede vigilada de verdad. Esto no se puede montar aparte
       -vive dentro del armado del libreto-, así que se comprueba en el código
       que se despliega. */
    t.ok('la barra de herramientas queda vigilada',
         /libVigilarAlto\(pop2\.win, d\.querySelector\('\.lh'\), libSyncHeadH\)/.test(TODO_EL_CODIGO),
         'sin esto, abrir el cajón de Ocupación parte la barra en más filas y '
         + 'nadie vuelve a medirla: el cajón arranca encima de ella');
    t.ok('y la banda también, por la misma vía',
         /pop2\._obsBarras = libVigilarAlto\(pop2\.win/.test(TODO_EL_CODIGO));
    t.ok('el alto de la barra solo se escribe si ha cambiado',
         /getPropertyValue\('--lhH'\) === h\+'px'\) return;/.test(TODO_EL_CODIGO),
         'ahora lo llama un observador en cada cambio: reescribirlo siempre '
         + 'sería tocar el DOM para nada');
  }
};
