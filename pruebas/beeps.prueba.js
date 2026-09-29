/* Los beeps de sala · especificacion 04 (SALA-5 y SALA-6)
 *
 * Antes de cada entrada suenan tres pitidos de 1 kHz, uno por segundo, y el
 * cuarto no suena: ese es el de entrar. La especificación lo tenía como «sin
 * comprobar»: nadie había medido con un cronómetro que cayeran a -3, -2 y -1 s.
 *
 * Aquí el cronómetro es la propia prueba. Se corre el `salaBeeps` de verdad
 * con el tiempo del vídeo avanzando fotograma a fotograma, como lo avanza el
 * bucle de la sala, a distintas velocidades de refresco, y se apunta cada
 * pitido con el instante en que sonó.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { montar, RAIZ } = require('./ayuda');

exports.nombre = 'Los beeps de sala: tres, uno por segundo, y el cuarto no suena';

/** La sala montada con un vídeo de mentira y un altavoz que apunta. */
function sala(cues, o){
  o = o || {};
  const suenan = [];
  const video = { paused: !!o.pausado };
  const reloj = { t: 0 };
  const SALA = { on: o.on !== false, beeps: o.beeps !== false, beepHecho: -1 };
  const M = montar([['function salaSituar(t){', '/* ── Los pitidos'],
                    ['/* Cuánto antes de su marca se programa cada pitido', '/* ── Botones y ajustes']],
    ['salaBeeps', 'salaSituar'],
    { SALA: SALA, salaCues: () => cues, studioEl: () => video,
      /* Apunta el instante al que queda PROGRAMADO, en tiempo del vídeo. */
      salaBeep: (hz, ms, retraso) => suenan.push({ t: reloj.t + (retraso || 0) * (+video.playbackRate || 1), hz: hz, ms: ms }) });
  M.en = (tt) => { reloj.t = tt; M.salaBeeps(tt); };
  /** Pasa el vídeo de `desde` a `hasta` a `fps` fotogramas por segundo. */
  M.rodar = (desde, hasta, fps, fase) => {
    const paso = 1 / fps;
    for(let t = desde + (fase || 0); t <= hasta + 1e-9; t += paso){ reloj.t = t; M.salaBeeps(t); }
  };
  M.suenan = suenan; M.SALA = SALA; M.video = video;
  return M;
}

const r2 = (x) => Math.round(x * 100) / 100;

exports.pruebas = function(t){
  t.seccion('1 · tres beeps, uno por segundo, y el cuarto no suena (SALA-5)');
  const cue = [{ si: 4, t0: 10, t1: 12 }];
  for(const fps of [60, 30, 25, 24]){
    const S = sala(cue);
    S.rodar(5, 11, fps);
    t.eq('a ' + fps + ' imágenes por segundo, tres', S.suenan.length, 3, JSON.stringify(S.suenan.map(b => r2(b.t))));
    t.ok('justo a -3, -2 y -1 s: ni un fotograma antes',
         S.suenan.length === 3 && [7, 8, 9].every((x, i) => Math.abs(S.suenan[i].t - x) <= 1e-6),
         JSON.stringify(S.suenan.map(b => r2(b.t))));
  }
  {
    const S = sala(cue);
    S.rodar(5, 11, 60);
    t.ok('todos de 1 kHz', S.suenan.every(b => b.hz === 1000));
    t.ok('ninguno en el instante de entrar, ni después', S.suenan.every(b => b.t < 9.5),
         'el cuarto no suena: ese es el de entrar');
  }
  {
    /* Con la página cargada el bucle puede ir a trompicones. Diez imágenes por
       segundo, con el fotograma cayendo justo entre dos marcas, siguen dando
       los tres: la ventana de cada pitido es más ancha que un fotograma. */
    const S = sala(cue);
    S.rodar(5, 11, 10, 0.05);
    t.eq('a trompicones -diez por segundo, a destiempo- siguen siendo tres', S.suenan.length, 3,
         JSON.stringify(S.suenan.map(b => r2(b.t))));
    t.ok('y en su sitio', S.suenan.length === 3 && [7, 8, 9].every((x, i) => Math.abs(S.suenan[i].t - x) <= 1e-6),
         JSON.stringify(S.suenan.map(b => r2(b.t))));
    /* Caiga donde caiga el fotograma: con una ventana de antes más corta que
       un fotograma, algunos desfases llegaban siempre tarde. */
    const tarde = [];
    for(const fase of [0, 0.02, 0.03, 0.05, 0.07, 0.09]){
      const S2 = sala(cue);
      S2.rodar(5, 11, 10, fase);
      if(!(S2.suenan.length === 3 && [7, 8, 9].every((x, i) => Math.abs(S2.suenan[i].t - x) <= 1e-6)))
        tarde.push(fase + ': ' + S2.suenan.map(b => r2(b.t)).join(','));
    }
    t.eq('a diez por segundo, en su sitio con cualquier desfase', tarde.join(' | '), '');
  }
  {
    const S = sala(cue);
    S.video.playbackRate = 2;
    S.rodar(5, 11, 60);
    t.ok('con el vídeo al doble, también en su marca', S.suenan.length === 3
         && [7, 8, 9].every((x, i) => Math.abs(S.suenan[i].t - x) <= 1e-6),
         'lo que falta está en tiempo del vídeo; el audio va en tiempo real');
  }
  {
    /* El bucle se salta la ventana de antes de la marca -la página iba
       cargada- y llega justo después. */
    const S = sala(cue);
    S.en(6.8);
    S.en(7.03);
    t.eq('si el bucle llega un poco tarde, suena ya: no se pierde', S.suenan.map(b => r2(b.t)).join(','), '7.03');
    const S2 = sala(cue);
    S2.en(6.8);
    S2.en(7.1);
    t.eq('más tarde que eso, no: sonaría a destiempo', S2.suenan.length, 0);
  }

  t.seccion('2 · solo con el vídeo rodando, y una vez por segundo y por cue (SALA-6)');
  {
    const S = sala(cue, { pausado: true });
    S.rodar(5, 11, 60);
    t.eq('con el vídeo parado no suena nada', S.suenan.length, 0);
  }
  {
    const S = sala(cue, { beeps: false });
    S.rodar(5, 11, 60);
    t.eq('con los beeps quitados, tampoco', S.suenan.length, 0);
  }
  {
    const S = sala(cue, { on: false });
    S.rodar(5, 11, 60);
    t.eq('ni con la sala apagada', S.suenan.length, 0);
  }
  {
    const S = sala(cue);
    S.rodar(5, 11, 240);
    t.eq('muchos fotogramas dentro de la misma marca siguen siendo un pitido', S.suenan.length, 3,
         'a 240 imágenes por segundo caen catorce fotogramas en cada ventana');
  }
  {
    const S = sala(cue);
    S.rodar(5, 9.5, 60);
    S.rodar(6.5, 11, 60);
    t.eq('volver atrás y pasar otra vez los vuelve a dar, los tres', S.suenan.length, 6,
         'es otra pasada: el actor vuelve a necesitar la cuenta');
  }
  {
    /* Dos cues seguidas: la cuenta es de la que viene, y al entrar en la
       primera empieza la de la segunda donde vaya. */
    const S = sala([{ si: 1, t0: 10, t1: 11 }, { si: 2, t0: 11.5, t1: 13 }]);
    S.rodar(5, 12, 60);
    t.eq('la cuenta es de la cue que viene', S.suenan.map(b => r2(b.t)).join(','), '7,8,9,10.5');
  }

  t.seccion('3 · el pitido, en el reloj del audio');
  {
    const hechos = [];
    const ac = { currentTime: 100, state: 'running', destination: {},
      createOscillator: () => { const o = { type: '', frequency: {}, connect: () => {}, start: (x) => { o.empieza = x; }, stop: (x) => { o.acaba = x; } }; hechos.push(o); return o; },
      createGain: () => ({ gain: { setValueAtTime: () => {}, linearRampToValueAtTime: () => {} }, connect: () => {} }) };
    const B = montar([['function salaAudio(){', '/* ── El lienzo de encima de la imagen']], ['salaBeep'],
                     { SALA: { ac: ac }, window: {} });
    B.salaBeep(1000, 55, 0.04);
    t.cerca('programado para dentro de lo que falta', hechos[0].empieza, 100.04, 1e-9);
    t.eq('de 1 kHz', hechos[0].frequency.value, 1000);
    t.ok('y corto: 55 ms y la caída', hechos[0].acaba - hechos[0].empieza < 0.1);
    B.salaBeep(1000, 55);
    t.cerca('sin retraso, ya', hechos[1].empieza, 100, 1e-9);
    B.salaBeep(1000, 55, -3);
    t.cerca('un retraso negativo no lo manda al pasado', hechos[2].empieza, 100, 1e-9);
  }

  t.seccion('4 · probarlos suena al mismo ritmo');
  const src = fs.readFileSync(path.join(RAIZ, 'js', 'sala.js'), 'utf8');
  const probar = src.slice(src.indexOf("querySelector('#salaProbar').onclick"), src.indexOf('const num = (id, campo, min, max)'));
  t.ok('el botón de probar los da uno por segundo',
       /salaBeep\(1000, 55\);\s*setTimeout\(\(\) => salaBeep\(1000, 55\), 1000\);\s*setTimeout\(\(\) => salaBeep\(1000, 55\), 2000\);/.test(probar),
       'sonaban cada 0,7 s: probar enseñaba un ritmo que no es el de sala');
};
