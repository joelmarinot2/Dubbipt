/* El libreto sigue al video, y los dos dispositivos ven el mismo · esp. 01 y 06
 *
 * Dos cosas que vienen del mismo sitio: saber SIEMPRE por que parlamento va el
 * trabajo.
 *
 * SEGUIR AL VIDEO · el timecode manda y el libreto se coloca solo. Lo que se
 * prueba es lo que antes no hacia y es justo lo que se usa: seguir con el video
 * parado, seguir al saltar aunque sea el mismo parlamento, y callarse mientras
 * una persona mueve el libreto con la mano.
 *
 * LA HUELLA · la sincronia entre tablet y escritorio viaja por INDICE de
 * intervencion, que es igual en los dos... siempre que los dos tengan el mismo
 * libreto. Nadie lo comprobaba. Basta con que uno venga de una copia guardada
 * vieja para que el indice 300 sea una intervencion distinta en cada aparato, y
 * lo que se ve es que las paginas no coinciden.
 */
'use strict';
const { montar } = require('./ayuda');

exports.nombre = 'El libreto sigue al vídeo · y los dos dispositivos, al mismo libreto';

/* ── La huella ─────────────────────────────────────────────────────────── */

const R_HUELLA = [['/* ═══ ¿LOS DOS DISPOSITIVOS VEN EL MISMO LIBRETO?',
                    '// qué intervención (índice GLOBAL de script)']];

function conHuella(guion, avisos){
  return montar(R_HUELLA, ['libHuella', 'libAvisarDesajuste'], {
    script: guion,
    currentEp: null, sb: null, pop2: null,
    hydrateEpisode: () => {}, renderLibretoBlocks: () => {}, renderLibretoChips: () => {},
    libMsg: (m) => (avisos || []).push(m),
    DDL_UI: { toast: (m, o) => (avisos || []).push({ msg: m, accion: o && o.actionLabel }) },
    fallo: () => {},
    console: { warn: () => {}, log: () => {} }
  });
}

const B = (key, tcEff, page) => ({ key, tcEff, page, lines: ['da igual el texto'] });
const GUION = [B('NILA', 10, 1), B('BABU', 14, 1), B('NILA', 20, 2)];

/* ── Seguir al vídeo ───────────────────────────────────────────────────── */

/* `stCurBlock` va ANTES del bloque de seguimiento en el archivo: dos recortes,
   en ese orden. */
const R_SEGUIR = [['function stCurBlock(t){', '/* ═══ EL LIBRETO SIGUE AL VÍDEO'],
                  ['/* ═══ EL LIBRETO SIGUE AL VÍDEO', 'function studioTick(forzado){'],
                  ['function studioTick(forzado){', '/* ═══ KARAOKE ═══']];

/**
 * Monta el seguimiento con un libreto de mentira.
 * `pintados` son los índices que existen en pantalla; `hace` es cuánto hace que
 * la persona tocó el libreto con la mano, en milisegundos.
 *
 * El libreto de mentira tiene geometría: cada parlamento `i` empieza a 400·i
 * píxeles y mide 120 —o lo que diga `altos[i]`—, y el visor mide 1000. Lo que
 * se apunta en `movidos` es a qué píxel se coloca el visor y cómo: `suave`
 * (deslizando, con el deslizar de la casa) o `golpe` (de una vez).
 */
function conSeguir(opts){
  opts = opts || {};
  const movidos = [];
  const avisos = [];
  const enviados = [];
  const pintados = opts.pintados || [0, 1, 2];
  const altos = opts.altos || {};
  let deslizando = false;
  const wrap = { clientHeight: 1000, _top: opts.top || 0,
    get scrollTop(){ return wrap._top; },
    set scrollTop(v){ wrap._top = v; movidos.push({ top: v, modo: deslizando ? 'suave' : 'golpe' }); } };
  const nodo = (i) => ({ si: i, top: 400 * i, h: altos[i] || 120,
                         classList: { add: () => {}, remove: () => {} } });
  const casilla = { checked: opts.seguir !== false };
  /* La etiqueta del botón: es lo que dice de qué reloj cuelga el libreto. */
  const etiqueta = { textContent: '' };
  const boton = { clases: new Set(opts.seguir === false ? [] : ['on']), atrib: {}, title: '',
    classList: { toggle: (c, v) => { if(v) boton.clases.add(c); else boton.clases.delete(c); },
                 contains: (c) => boton.clases.has(c) },
    setAttribute: (k, v) => { boton.atrib[k] = v; },
    /* El estilo en linea CON su prioridad: es lo que decide si el boton se ve,
       porque la barra del libreto impone el suyo con !important. */
    style: { props: {}, setProperty: (k, v, p) => { boton.style.props[k] = v + (p ? ' !' + p : ''); } },
    querySelector: (q) => (q === 'span' ? etiqueta : null) };
  const _guardado = {};
  const doc = {
    getElementById: (id) => (id === 'lSeguir' ? boton : null),
    querySelector: (sel) => {
      const m = /data-si="(\d+)"/.exec(sel);
      const i = m ? +m[1] : -1;
      return pintados.includes(i) ? nodo(i) : null;
    },
    querySelectorAll: () => [],
    hidden: false
  };
  const latidos = [];
  const timers = [];
  /* Con `perfil` se monta ademas la tabla de que perfil lleva video, la de
     verdad: el boton pregunta ahi. Sin el, como antes. */
  const recortes = opts.perfil
    ? [['/* De quién es cada herramienta del cajón.', '/**\n * Deja en el cajón']].concat(R_SEGUIR)
    : R_SEGUIR;
  const M = montar(recortes, ['stSeguirOn', 'stSeguirPoner', 'libPintarSeguir', 'SEG',
                              'studioSeguirLibreto', 'studioAvisarFueraDeAlcance',
                              'stCurBlock', 'verAvisado: () => _stFueraAvisado',
                              'verGuardado: () => _guardado', 'studioTick', 'seguirEncendido',
                              'studioTopPara', 'studioColocar', 'studioEmitirSitio', 'SEG_ADELANTO', 'SEG_LINEA', 'libAsegurarTop',
                              'studioLatidoArrancar', 'studioLatidoParar', 'SEG_LATIDO_MS', 'studio'], Object.assign(
                              opts.perfil ? { DDL_MODO: opts.perfil } : {},
                              /* El lector de la pantalla de Pro Tools, de mentira: encendido o no, y
                                 enganchado o no al contador. */
                              opts.tcp ? { TCP: opts.tcp, tcpActivo: () => !!(opts.tcp.on && opts.tcp.tc != null) } : {}, {
    /* El seguimiento ya no vive en una casilla de la tira de video: es un
       estado propio que se recuerda entre sesiones. Se enciende y se apaga
       por ahi. */
    localStorage: { getItem: () => (opts.seguir === false ? '0' : '1'),
                    setItem: (k, v) => { _guardado[k] = v; } },
    $: (id) => (id === 'stFollow' ? casilla : null),
    studioEl: () => opts.video || null,
    studioTc0: () => 0,
    studioStripOn: () => !!opts.tiraAbierta,
    stFmt: () => '', stFmtTC: () => '', stDrawWave: () => { M._dibujos++; }, adrRepintar: () => {},
    pop2: { doc: doc, scopeAll: opts.scopeAll !== false, els: { wrap: wrap },
            _interact: opts.hace != null ? (1000 - opts.hace) : 0 },
    performance: { now: () => 1000 },
    /* La geometría del libreto de mentira, y el deslizar de la casa. */
    oTop: (n) => n.top, oH: (n) => n.h, libMaxTop: () => 100000,
    libAnimScroll: (top) => { deslizando = true; wrap.scrollTop = top; deslizando = false; },
    libHighlightCenter: () => {},
    document: { hidden: !!opts.oculto },
    sync: { isOn: !!opts.sync },
    syncSendScroll: (p) => enviados.push(p),
    studioFine: () => 0,
    studioInjectCurCss: () => {},
    /* La ventana, de mentira: los temporizadores se apuntan y se disparan a mano. */
    window: { setTimeout: (f) => { timers.push(f); return timers.length; }, clearTimeout: () => {}, cancelAnimationFrame: () => {} },
    /* El latido de un trabajador, de mentira: se apunta y se le da a mano. */
    tcpLatido: (ms, fn) => { const L = { ms: ms, fn: fn, parado: false }; latidos.push(L); return { parar(){ L.parado = true; } }; },
    script: opts.script || GUION,
    charIdx: { NILA: { display: 'NILA' }, BABU: { display: 'BABU' } },
    studio: { cur: -1 },
    DDL_UI: { toast: (m, o) => avisos.push({ msg: m, accion: o && o.actionLabel }) },
    renderLibretoBlocks: () => {}, renderLibretoChips: () => {},
    syncSendTool: () => {},
    fallo: () => {},
    console: { warn: () => {}, log: () => {} }
  }));
  M._movidos = movidos; M._avisos = avisos; M._enviados = enviados; M._latidos = latidos; M._wrap = wrap; M._timers = timers;
  M._dibujos = 0;
  M._casilla = casilla; M._boton = boton; M._guardado = _guardado; M._etiqueta = etiqueta;
  return M;
}

exports.pruebas = function(t){
  t.seccion('1 · el libreto se coloca en el parlamento que suena');
  const S = conSeguir({ hace: 99999 });
  S.studioSeguirLibreto(1, false);
  /* El parlamento 1 empieza a 400 y mide 120: centrado en la línea de lectura,
     que está al 42 % de un visor de 1000, el visor va a 400 − 420 + 60 = 40. */
  t.eq('se mueve al que toca, con su centro en la línea de lectura', S._movidos.map(x => x.top), [40]);
  t.eq('y suave, que el vídeo va corriendo', S._movidos[0].modo, 'suave');
  t.eq('la línea de lectura es la misma con la que se entienden la tablet y el escritorio', S.SEG_LINEA, 0.42);

  t.seccion('2 · al saltar en el vídeo va de golpe, no deslizando');
  const F = conSeguir({ hace: 99999 });
  F.studioSeguirLibreto(2, true);
  t.eq('sin animación', F._movidos[0].modo, 'golpe',
       'deslizar treinta páginas tras un salto es peor que aparecer donde toca');
  t.eq('y al sitio', F._movidos[0].top, 440);

  t.seccion('3 · mi mano manda: si acabo de mover el libreto, el vídeo no me lo quita');
  const H = conSeguir({ hace: 400 });
  H.studioSeguirLibreto(1, false);
  t.eq('no se toca', H._movidos.length, 0,
       'sin esto es imposible adelantarse a leer mientras corre el vídeo');
  H.studioSeguirLibreto(1, true);
  t.eq('pero un salto del vídeo SÍ manda', H._movidos.length, 1,
       'si salto a propósito, quiero ir ahí');

  t.seccion('4 · con el seguimiento apagado no se mueve nada');
  const A = conSeguir({ seguir: false, hace: 99999 });
  A.studioSeguirLibreto(1, false);
  A.studioSeguirLibreto(1, true);
  t.eq('ni siquiera al saltar', A._movidos.length, 0);

  t.seccion('5 · si el parlamento no está en pantalla, se dice');
  /* Con un personaje abierto, el libreto solo trae sus intervenciones. Antes no
     pasaba nada y parecia que el seguimiento estaba roto. */
  const X = conSeguir({ pintados: [0, 2], scopeAll: false, hace: 99999 });
  X.studioSeguirLibreto(1, false);
  t.eq('no se ha movido a ninguna parte', X._movidos.length, 0);
  t.eq('pero se avisa', X._avisos.length, 1);
  t.ok('diciendo por quién va el vídeo', X._avisos[0].msg.includes('BABU'),
       'el aviso sin el nombre no dice nada: ' + JSON.stringify(X._avisos[0]));
  t.ok('y con el botón para verlo entero', /entero/i.test(X._avisos[0].accion || ''));
  X.studioSeguirLibreto(1, false);
  t.eq('no se repite: llegan veinte mensajes por segundo', X._avisos.length, 1);

  t.seccion('6 · con el libreto entero abierto no hay nada que avisar');
  const T = conSeguir({ pintados: [0, 2], scopeAll: true, hace: 99999 });
  T.studioSeguirLibreto(1, false);
  t.eq('ni aviso', T._avisos.length, 0,
       'si ya está entero y aun así no aparece, el aviso mandaría a abrir lo que ya está abierto');

  t.seccion('6b · con la pestaña tapada, de golpe: el deslizar no avanza sin pintar');
  /* Lo normal en la sala es tener Pro Tools delante y Dubbipt detrás. Con el
     deslizar suave del navegador el libreto se quedaba arriba mientras el
     parlamento marcado se iba página abajo: medido, el 7 a 1050 px y el visor
     en 0. */
  const O = conSeguir({ hace: 99999, oculto: true });
  O.studioSeguirLibreto(1, false);
  t.eq('se coloca igual', O._movidos.map(x => x.top), [40]);
  t.eq('pero de golpe', O._movidos[0].modo, 'golpe');

  t.seccion('6c · un parlamento largo deja el principio a la vista');
  /* Centrado entero, un parlamento de dos pantallas empezaba fuera de ella. */
  const L = conSeguir({ hace: 99999, altos: { 2: 2000 } });
  L.studioSeguirLibreto(2, false);
  const arriba = 800 - L._movidos[0].top;                  // a cuántos píxeles del borde queda su principio
  t.ok('su principio queda en el tercio de arriba del visor', arriba > 100 && arriba < 340, 'a ' + arriba + ' px');
  const CG = conSeguir({ hace: 99999, altos: { 2: 2000 } });
  CG.studioSeguirLibreto(2, true);
  t.eq('y de golpe, igual', CG._movidos[0].top, L._movidos[0].top);

  t.seccion('6c2 · si el deslizar no llega, el visor se pone igual');
  /* El deslizar va con requestAnimationFrame, que no se dispara si la pestaña
     no se está pintando: tapada a mitad de camino, el libreto se quedaba a
     medias. Aquí el deslizar de mentira NO mueve nada, como uno congelado. */
  const M2 = conSeguir({ hace: 99999 });
  M2.studioSeguirLibreto(1, false);
  t.eq('al colocar deslizando queda apuntado un plazo', M2._timers.length, 1);
  M2._wrap._top = 5;                                       // el deslizar se quedó a medias
  M2._movidos.length = 0;
  M2._timers[0]();
  t.eq('pasado el plazo, se pone en su sitio de golpe', JSON.stringify(M2._movidos), '[{"top":40,"modo":"golpe"}]');
  M2._movidos.length = 0;
  M2._timers[0]();
  t.eq('y si ya está, no se toca', M2._movidos.length, 0);
  M2.studioSeguirLibreto(2, false);
  M2._wrap._top = 5; M2._movidos.length = 0;
  M2._timers[0]();
  t.eq('un plazo viejo no manda: entre medias se pidió otro sitio', M2._movidos.length, 0);

  t.seccion('6d · la posición viaja al otro aparato al momento');
  /* Desde aquí y no desde el evento de scroll: con la pestaña tapada ese
     evento no se dispara y la tablet se quedaba sin saber que el libreto se
     había movido. */
  const E = conSeguir({ hace: 99999, sync: true, oculto: true });
  E.studioSeguirLibreto(1, false);
  t.eq('se manda el parlamento y por dónde va la línea de lectura', JSON.stringify(E._enviados), '[{"si":1,"f":0.5,"seg":true}]');
  const E2 = conSeguir({ hace: 99999, sync: true, altos: { 2: 2000 } });
  E2.studioSeguirLibreto(2, false);
  t.ok('con uno largo, la línea cae cerca de su principio', E2._enviados[0].f > 0 && E2._enviados[0].f < 0.1, String(E2._enviados[0].f));
  t.eq('marcada como del seguimiento, para que la tablet se coloque con su deslizar corto', E2._enviados[0].seg, true);
  const E3 = conSeguir({ hace: 99999, sync: false });
  E3.studioSeguirLibreto(1, false);
  t.eq('sin sincronía no se manda nada', E3._enviados.length, 0);

  t.seccion('6e · el parlamento se marca un poco antes de que empiece');
  /* La vista tiene que estar en la línea cuando empieza a sonar, no llegar a
     ella entonces; y a la tablet la posición le llega unas décimas después. */
  const AD = conSeguir({ hace: 99999, video: { duration: 100, currentTime: 0 } });
  t.ok('tres décimas', AD.SEG_ADELANTO > 0.2 && AD.SEG_ADELANTO <= 0.4, String(AD.SEG_ADELANTO));
  AD.studioTick();
  t.eq('en 0, ninguno', AD.studio.cur, -1);
  const V = conSeguir({ hace: 99999, video: { duration: 100, currentTime: 14 - 0.2 } });
  V.studioTick();
  t.eq('dos décimas antes del segundo parlamento, ya se marca el segundo', V.studio.cur, 1);
  const V2 = conSeguir({ hace: 99999, video: { duration: 100, currentTime: 14 - 0.4 } });
  V2.studioTick();
  t.eq('cuatro décimas antes, todavía el primero', V2.studio.cur, 0);

  t.seccion('6f · con vídeo, el libreto late cada 66 ms mientras suena');
  /* `timeupdate` llega cuatro veces por segundo: la marca podía salir un cuarto
     de segundo tarde. */
  const vid = { duration: 100, currentTime: 12, paused: false, ended: false };
  const LT = conSeguir({ hace: 99999, video: vid, tiraAbierta: true });
  LT.studioTick();
  t.eq('en 12 va el primero', LT.studio.cur, 0);
  LT.studioLatidoArrancar();
  t.eq('late desde un trabajador, cada 66 ms', LT._latidos.length + ' ' + LT._latidos[0].ms, '1 66');
  LT.studioLatidoArrancar();
  t.eq('arrancarlo dos veces no dobla el latido', LT._latidos.length, 1);
  vid.currentTime = 13.8;
  LT._latidos[0].fn();
  t.eq('un latido en el que cambia el parlamento lo marca', LT.studio.cur, 1);
  const nMov = LT._movidos.length, nDib = LT._dibujos;
  LT._latidos[0].fn();
  t.eq('uno en el que no cambia no toca nada', LT._movidos.length + ' ' + LT._dibujos, nMov + ' ' + nDib,
       'la tira se repinta con timeupdate, no quince veces por segundo');
  vid.paused = true;
  LT._latidos[0].fn();
  t.ok('con el vídeo parado el latido se para solo', LT._latidos[0].parado);
  LT.studioLatidoParar();
  t.ok('y pararlo parado no rompe nada', LT._latidos[0].parado);

  t.seccion('7 · qué parlamento suena en cada instante');
  const C = conSeguir({ hace: 99999 });
  t.eq('antes del primero, ninguno', C.stCurBlock(5), -1);
  t.eq('justo en el primero', C.stCurBlock(10), 0);
  t.eq('entre el primero y el segundo, sigue el primero', C.stCurBlock(12), 0);
  t.eq('en el segundo', C.stCurBlock(14), 1);
  t.eq('y al final, el último', C.stCurBlock(900), 2);

  /* ── La huella ───────────────────────────────────────────────────────── */
  t.seccion('8 · la huella dice si los dos ven el mismo libreto');
  const uno = conHuella(GUION).libHuella();
  const otro = conHuella([B('NILA', 10, 1), B('BABU', 14, 1), B('NILA', 20, 2)]).libHuella();
  t.eq('dos libretos iguales, la misma huella', uno, otro);
  t.ok('y no está vacía', !!uno);

  t.seccion('9 · cualquier diferencia que descoloque cambia la huella');
  const casos = [
    ['una intervención de más', GUION.concat([B('NILA', 30, 3)])],
    ['una intervención de menos', GUION.slice(0, 2)],
    ['otro personaje en medio', [B('NILA', 10, 1), B('TIA', 14, 1), B('NILA', 20, 2)]],
    ['otro timecode', [B('NILA', 10, 1), B('BABU', 15, 1), B('NILA', 20, 2)]],
    ['otra página', [B('NILA', 10, 1), B('BABU', 14, 2), B('NILA', 20, 2)]],
    ['el mismo, en otro orden', [B('BABU', 14, 1), B('NILA', 10, 1), B('NILA', 20, 2)]]
  ];
  for(const [porque, g] of casos)
    t.ok(porque + ': huella distinta', conHuella(g).libHuella() !== uno,
         'si no cambiara, el índice 2 sería otra intervención en cada aparato y nadie se enteraría');

  t.seccion('10 · sin libreto no hay huella que comparar');
  t.eq('vacío', conHuella([]).libHuella(), '',
       'una huella inventada sobre un libreto que no está daría un falso desajuste');

  t.seccion('11 · el desajuste se avisa una vez, con qué hacer');
  const av = [];
  const D = conHuella(GUION, av);
  D.libAvisarDesajuste('otra-huella');
  t.eq('se avisa', av.length, 1);
  t.ok('diciendo que las páginas no coinciden por eso',
       String(av[0].msg).includes('páginas no coinciden'));
  t.ok('y con qué hacer', /al d.a/i.test(av[0].accion || ''),
       'decir que algo va mal sin decir qué hacer es dejar el problema a medias');
  D.libAvisarDesajuste('otra-huella');
  t.eq('no se repite con la misma pareja', av.length, 1,
       'los mensajes de posición llegan veinte por segundo');
  D.libAvisarDesajuste('una-tercera');
  t.eq('pero un desajuste NUEVO sí se dice', av.length, 2);

  t.seccion('14 · el interruptor vive en la barra del libreto, no en la tira del vídeo');
  /*
   * El seguimiento vivia en el `checked` de una casilla de la tira de video. Al
   * plegar la tira -que es lo que se hace para leer con el libreto entero- el
   * estado se iba con ella y el libreto dejaba de seguir. Ahora es un estado
   * propio, se recuerda entre sesiones, y los dos mandos ensenan lo mismo.
   */
  const I = conSeguir({ hace: 99999 });
  t.eq('arranca encendido', I.stSeguirOn(), true,
       'seguir al timecode es lo que se quiere el 99 % de las veces');

  I.stSeguirPoner(false);
  t.eq('se apaga', I.stSeguirOn(), false);
  t.eq('se recuerda para la proxima sesion', I._guardado['ddl_seguir'], '0');
  t.eq('la casilla de la tira se entera', I._casilla.checked, false,
       'dos mandos que digan cosas distintas son peor que uno solo');
  t.eq('y el boton de la barra se apaga', I._boton.classList.contains('on'), false);
  t.eq('con su estado para quien no ve el color', I._boton.atrib['aria-pressed'], 'false');

  I.stSeguirPoner(true);
  t.eq('se enciende', I.stSeguirOn(), true);
  t.eq('se recuerda', I._guardado['ddl_seguir'], '1');
  t.eq('la casilla tambien', I._casilla.checked, true);
  t.ok('y el boton se pinta encendido', I._boton.classList.contains('on'));
  /* Y lo que de verdad importa: al encenderlo el libreto se coloca YA, sin
     esperar al siguiente parlamento -que puede ser medio minuto mirando otra
     pagina-. Se mira el efecto, no la llamada. */
  const K = conSeguir({ hace: 99999, tiraAbierta: false,
                        video: { currentTime: 14, duration: 100, paused: false } });
  K.stSeguirPoner(false);
  const antes = K._movidos.length;
  K.stSeguirPoner(true);
  t.ok('al encenderlo, el libreto se coloca YA', K._movidos.length > antes,
       'esperar al siguiente parlamento puede ser medio minuto mirando otra pagina');

  t.seccion('15 · apagarlo no coloca nada');
  const J = conSeguir({ hace: 99999, tiraAbierta: false,
                        video: { currentTime: 14, duration: 100, paused: false } });
  J.stSeguirPoner(false);
  t.eq('sin tocar el libreto', J._movidos.length, 0,
       'apagar el seguimiento es justo pedir que deje de moverse');

  t.seccion('16 · el libreto sigue aunque la tira de vídeo esté plegada');
  /*
   * ESTA es la que faltaba. studioTick salia por la puerta de atras si la tira
   * estaba plegada, asi que el seguimiento moria en cuanto se recogia el panel
   * -que es justo lo que se hace para leer con el libreto entero-. Se descubrio
   * rompiendolo a proposito y viendo que ninguna prueba se quejaba.
   */
  const conTick = (tiraAbierta) => {
    const M = conSeguir({ hace: 99999, tiraAbierta: tiraAbierta,
                          video: { currentTime: 14, duration: 100, paused: false } });
    /* El contador de tics es del stSeguirPoner de mentira; aqui se mira lo que
       de verdad importa: si el libreto se ha movido. */
    M.studioTick(false);
    return M._movidos.map(x => x.top);
  };
  t.eq('con la tira abierta se mueve', conTick(true), [40]);
  t.eq('y PLEGADA tambien', conTick(false), [40],
       'recoger el panel de video no puede apagar el seguimiento: es lo que se hace para leer');

  t.seccion('17 · sin vídeo cargado no hay timecode al que seguir');
  const SV = conSeguir({ hace: 99999, tiraAbierta: true, video: null });
  SV.studioTick(false);
  t.eq('no se mueve nada', SV._movidos.length, 0,
       'y sobre todo: no revienta');

  t.seccion('18 · en QC, Seguir es la captura de la pantalla de Pro Tools');
  /* Salió de QC con el vídeo y volvió a pedido de sala: «agrega la opción de
     seguimiento en QC, que sea por captura de pantalla». En QC el ÚNICO reloj
     es el contador de Pro Tools leído de la pantalla, así que el botón está
     encendido cuando se está leyendo, y nunca dice «vídeo». */
  const QV = conSeguir({ hace: 99999, perfil: 'qc', tcp: { on: false, tc: null } });
  QV.libPintarSeguir();
  t.eq('se ve, vestido de pastilla', QV._boton.style.props.display, 'inline-flex !important');
  t.eq('con el seguimiento de otro perfil encendido pero sin leer pantalla, sale APAGADO',
       QV._boton.clases.has('on'), false,
       'antes salía «Seguir · vídeo» sobre un vídeo que no hay');
  t.eq('y dice solo «Seguir»', QV._etiqueta.textContent, 'Seguir');
  t.ok('y qué hace pulsarlo', /leyéndolo de la pantalla/.test(QV._boton.title), QV._boton.title);
  t.eq('pulsarlo NO apaga nada: abre la captura', QV.seguirEncendido(), false,
       'el clic pregunta por lo que enseña el botón, no por el estado a secas');

  const QB = conSeguir({ hace: 99999, perfil: 'qc', tcp: { on: true, tc: null } });
  QB.libPintarSeguir();
  t.ok('leyendo la pantalla sin haberse enganchado todavía, encendido', QB._boton.clases.has('on'));
  t.eq('y dice que está leyendo', QB._etiqueta.textContent, 'Seguir · leyendo…',
       'antes esto salía como «Seguir · vídeo», que era mentira dos veces');

  const QP = conSeguir({ hace: 99999, perfil: 'qc', tcp: { on: true, tc: 3600 } });
  QP.libPintarSeguir();
  t.eq('enganchado al contador, «Seguir · PT»', QP._etiqueta.textContent, 'Seguir · PT');

  ['grabacion', 'casting'].forEach(p => {
    const GV = conSeguir({ hace: 99999, perfil: p, tcp: { on: false, tc: null } });
    GV.libPintarSeguir();
    t.eq(p + ': con vídeo, lo de siempre: el seguimiento encendido sigue al vídeo',
         GV._etiqueta.textContent, 'Seguir · vídeo');
    t.eq(p + ': y encendido', GV.seguirEncendido(), true);
  });
  const GB = conSeguir({ hace: 99999, perfil: 'grabacion', tcp: { on: true, tc: null } });
  GB.libPintarSeguir();
  t.eq('también en Grabación, leyendo sin enganchar no es «vídeo»', GB._etiqueta.textContent, 'Seguir · leyendo…');

  t.seccion('19 · en la tablet, un parlamento nuevo se coloca con el deslizar corto');
  /* Lo que llega marcado como del seguimiento no va con el suavizado de los
     gestos —que se acerca poco a poco y tarda casi medio segundo en
     asentarse— sino con el deslizar corto y acotado de la casa; y con la
     pantalla tapada, de golpe. */
  const conTablet = (o) => {
    o = o || {};
    const movidos = [];
    let deslizando = false;
    const wrap = { clientHeight: 1000, scrollHeight: 20000, _top: 0,
      get scrollTop(){ return wrap._top; },
      set scrollTop(v){ wrap._top = v; movidos.push({ top: v, modo: deslizando ? 'suave' : 'golpe' }); } };
    const els = [0, 1, 2].map(i => ({ top: 400 * i, h: 120 }));
    const pop2 = { els: { wrap: wrap }, blockEls: els, blockMap: [0, 1, 2], _interact: 0, _rTargetPx: 777, _rVel: 3, _applyRemote: false,
                   win: { setTimeout: (f) => { pop2._tmr = f; return 1; }, clearTimeout: () => {} } };
    const M = montar([['function resolveTargetPx(p){', '// BUCLE DE SEGUIMIENTO PERMANENTE']],
      ['onRemoteScroll', 'libColocarRemoto', 'resolveTargetPx'], {
        pop2: pop2, sync: { meId: 'yo', _lastNavAt: 0 },
        oTop: (n) => n.top, oH: (n) => n.h, libMaxTop: () => 19000,
        libAnimScroll: (top) => { deslizando = true; wrap.scrollTop = top; deslizando = false; },
        libHighlightCenter: () => {}, ensureMirrorLoop: () => { movidos.push({ modo: 'motor' }); },
        libAsegurarTop: (top) => { movidos.push({ modo: 'plazo', top: top }); },
        libHuella: () => 'h', libAvisarDesajuste: () => {},
        document: { hidden: !!o.oculto }, performance: { now: () => 5000 },
        console: { warn: () => {}, log: () => {} } });
    M._movidos = movidos; M._pop2 = pop2;
    return M;
  };
  const T1 = conTablet();
  T1.onRemoteScroll({ si: 1, f: 0.5, seg: true, from: 'otro' });
  /* La línea de lectura (42 % de 1000) sobre la mitad del parlamento 1, que va
     de 400 a 520: el visor a 460 − 420 = 40, igual que en el escritorio. */
  t.eq('se coloca donde el escritorio, deslizando, y con su plazo por si el deslizar no llega',
       JSON.stringify(T1._movidos), '[{"top":40,"modo":"suave"},{"modo":"plazo","top":40}]');
  t.ok('sin pasar por el motor de los gestos', T1._pop2._rTargetPx === null && T1._pop2._rVel === 0);
  t.eq('y mientras se coloca no se reenvía: vino del otro lado', T1._pop2._applyRemote, true);
  T1._pop2._tmr();
  t.eq('pasado el deslizar, se vuelve a mandar lo propio', T1._pop2._applyRemote, false);
  const T2 = conTablet({ oculto: true });
  T2.onRemoteScroll({ si: 1, f: 0.5, seg: true, from: 'otro' });
  t.eq('con la pantalla tapada, de golpe', JSON.stringify(T2._movidos), '[{"top":40,"modo":"golpe"}]');
  const T3 = conTablet();
  T3.onRemoteScroll({ si: 1, f: 0.5, from: 'otro' });
  t.eq('un gesto del otro sigue yendo por el motor suave', JSON.stringify(T3._movidos), '[{"modo":"motor"}]');
  const T4 = conTablet();
  T4._pop2._interact = 4800;
  T4.onRemoteScroll({ si: 1, f: 0.5, seg: true, from: 'otro' });
  t.eq('mi mano manda también sobre el seguimiento del otro', T4._movidos.length, 0);
};
