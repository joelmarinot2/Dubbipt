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
 */
function conSeguir(opts){
  opts = opts || {};
  const movidos = [];
  const avisos = [];
  const pintados = opts.pintados || [0, 1, 2];
  const casilla = { checked: opts.seguir !== false };
  const boton = { clases: new Set(opts.seguir === false ? [] : ['on']), atrib: {}, title: '',
    classList: { toggle: (c, v) => { if(v) boton.clases.add(c); else boton.clases.delete(c); },
                 contains: (c) => boton.clases.has(c) },
    setAttribute: (k, v) => { boton.atrib[k] = v; } };
  const _guardado = {};
  const doc = {
    getElementById: (id) => (id === 'lSeguir' ? boton : null),
    querySelector: (sel) => {
      const m = /data-si="(\d+)"/.exec(sel);
      const i = m ? +m[1] : -1;
      return pintados.includes(i)
        ? { scrollIntoView: (o) => movidos.push({ si: i, modo: o && o.behavior }) } : null;
    },
    querySelectorAll: () => []
  };
  const M = montar(R_SEGUIR, ['stSeguirOn', 'stSeguirPoner', 'libPintarSeguir', 'SEG',
                              'studioSeguirLibreto', 'studioAvisarFueraDeAlcance',
                              'stCurBlock', 'verAvisado: () => _stFueraAvisado',
                              'verGuardado: () => _guardado', 'studioTick'], {
    /* El seguimiento ya no vive en una casilla de la tira de video: es un
       estado propio que se recuerda entre sesiones. Se enciende y se apaga
       por ahi. */
    localStorage: { getItem: () => (opts.seguir === false ? '0' : '1'),
                    setItem: (k, v) => { _guardado[k] = v; } },
    $: (id) => (id === 'stFollow' ? casilla : null),
    studioEl: () => opts.video || null,
    studioTc0: () => 0,
    studioStripOn: () => !!opts.tiraAbierta,
    stFmt: () => '', stFmtTC: () => '', stDrawWave: () => {}, adrRepintar: () => {},
    pop2: { doc: doc, scopeAll: opts.scopeAll !== false,
            _interact: opts.hace != null ? (1000 - opts.hace) : 0 },
    performance: { now: () => 1000 },
    script: opts.script || GUION,
    charIdx: { NILA: { display: 'NILA' }, BABU: { display: 'BABU' } },
    studio: { cur: -1 },
    DDL_UI: { toast: (m, o) => avisos.push({ msg: m, accion: o && o.actionLabel }) },
    renderLibretoBlocks: () => {}, renderLibretoChips: () => {},
    syncSendTool: () => {},
    fallo: () => {},
    console: { warn: () => {}, log: () => {} }
  });
  M._movidos = movidos; M._avisos = avisos;
  M._casilla = casilla; M._boton = boton; M._guardado = _guardado;
  return M;
}

exports.pruebas = function(t){
  t.seccion('1 · el libreto se coloca en el parlamento que suena');
  const S = conSeguir({ hace: 99999 });
  S.studioSeguirLibreto(1, false);
  t.eq('se mueve al que toca', S._movidos.map(x => x.si), [1]);
  t.eq('y suave, que el vídeo va corriendo', S._movidos[0].modo, 'smooth');

  t.seccion('2 · al saltar en el vídeo va de golpe, no deslizando');
  const F = conSeguir({ hace: 99999 });
  F.studioSeguirLibreto(2, true);
  t.eq('sin animación', F._movidos[0].modo, 'auto',
       'deslizar treinta páginas tras un salto es peor que aparecer donde toca');

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
    return M._movidos.map(x => x.si);
  };
  t.eq('con la tira abierta se mueve', conTick(true), [1]);
  t.eq('y PLEGADA tambien', conTick(false), [1],
       'recoger el panel de video no puede apagar el seguimiento: es lo que se hace para leer');

  t.seccion('17 · sin vídeo cargado no hay timecode al que seguir');
  const SV = conSeguir({ hace: 99999, tiraAbierta: true, video: null });
  SV.studioTick(false);
  t.eq('no se mueve nada', SV._movidos.length, 0,
       'y sobre todo: no revienta');
};
