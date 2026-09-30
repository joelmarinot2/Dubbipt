/* Timecode de Pro Tools por MIDI (MTC) · especificacion 04
 *
 * Pro Tools genera MIDI Time Code y Chrome lo recibe con Web MIDI: exacto al
 * fotograma, con los saltos y a cualquier velocidad. Aqui se prueba con un
 * MIDI de mentira: lo que hay que demostrar es que los ocho cuartos de trama
 * se juntan bien, que el timecode entero se lee, que al dejar de llegar se da
 * por parado, y que todo eso engancha el MISMO reloj que la lectura de
 * pantalla, para que el resto del programa no sepa de donde viene.
 */
'use strict';
const { montar } = require('./ayuda');
const fs = require('fs');
const path = require('path');

exports.nombre = 'El timecode de Pro Tools por MIDI (MTC)';

let ahora = 1000;

/* Un Web MIDI de mentira: puertos que se pueden enchufar y por los que se
   pueden meter mensajes. */
function midiDeMentira(nombres, opts){
  opts = opts || {};
  const inputs = new Map();
  const acceso = { inputs: inputs, onstatechange: null };
  const poner = (nombre) => {
    const id = 'id-' + nombre;
    const ent = { id: id, name: nombre, manufacturer: 'prueba', onmidimessage: null,
                  manda(bytes){ if(this.onmidimessage) this.onmidimessage({ data: Uint8Array.from(bytes) }); } };
    inputs.set(id, ent);
    if(acceso.onstatechange) acceso.onstatechange({});
    return ent;
  };
  (nombres || []).forEach(poner);
  const pedidos = [];
  const nav = { requestMIDIAccess: async (o) => {
    pedidos.push(o || {});
    if(opts.sinSysex && o && o.sysex) throw new Error('sysex denegado');
    if(opts.denegado) throw new Error('permiso denegado');
    return acceso;
  } };
  return { acceso: acceso, nav: nav, poner: poner, pedidos: pedidos };
}

function montaje(midi, opts){
  opts = opts || {};
  const guardado = Object.assign({}, opts.guardado || {});
  const avisos = [], latidos = [];
  const TCP = { on: false, tc: null, t0: 0, rodando: false, ritmo: 0, fps: 25, lat: 0, fuente: 'pantalla', _hist: [], _dudas: [] };
  const ctx = {
    navigator: midi.nav,
    localStorage: { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); }, removeItem: (k) => { delete guardado[k]; } },
    performance: { now: () => ahora },
    TCP: TCP,
    tcpArrancar: () => { TCP.on = true; avisos.push('arrancar'); },
    tcpAhora: (T, t) => (T.tc == null ? null : (T.rodando ? T.tc + (T.ritmo || 1) * (t - T.t0) / 1000 : T.tc)),
    tcpTexto: (s) => String(s),
    tcpGuardar: () => { avisos.push('guardar'); },
    tcpLatido: (ms, fn) => { const L = { ms: ms, fn: fn, parado: false }; latidos.push(L); return { parar(){ L.parado = true; } }; },
    tcpPintarEstado: () => {},
    libPintarSeguir: () => { avisos.push('pintar'); },
    castAviso: (m) => avisos.push(m),
    setInterval: () => 0, clearInterval: () => {},
    console: { warn: () => {}, log: () => {} }
  };
  /* Todo el modulo menos la ultima linea, que arranca sola. */
  const M = montar([['const MTC = {', '/* Al arrancar: si hay un puerto de otro día']],
    ['MTC', 'MTC_PARADO_MS', 'MTC_FPS', 'mtcDisponible', 'mtcAcceso', 'mtcEntradas', 'mtcPuertoGuardado', 'mtcConectar',
     'mtcDesconectar', 'mtcEnchufado', 'mtcAlArrancar', 'mtcSegundos', 'mtcPieza', 'mtcEntero', 'mtcMensaje',
     'mtcEngancha', 'mtcVigilar', 'mtcEstadoTexto'], ctx);
  M._TCP = TCP; M._guardado = guardado; M._avisos = avisos; M._latidos = latidos;
  return M;
}

/** Los ocho cuartos de trama de un timecode, hacia delante. */
function cuartos(h, m, s, f, tipo){
  return [f & 15, (f >> 4) & 1, s & 15, (s >> 4) & 3, m & 15, (m >> 4) & 3, h & 15, ((h >> 4) & 1) | (tipo << 1)]
    .map((v, i) => (i << 4) | v);
}

exports.pruebas = async function(t){

  t.seccion('1 · los ocho cuartos de trama se juntan en un timecode');
  {
    const midi = midiDeMentira(['loopMIDI Port']);
    const M = montaje(midi);
    const E = { piezas: [null, null, null, null, null, null, null, null], ultimaPieza: -1, sentido: 1, fps: 25 };
    const q = cuartos(1, 2, 3, 4, 1);              // 01:02:03:04 a 25
    let r = null;
    q.forEach((b, i) => { ahora += 10; const x = M.mtcPieza(E, b, ahora); if(i < 7) t.eq('con ' + (i + 1) + ' piezas todavia no', x, null); else r = x; });
    t.ok('con las ocho, el timecode', !!r, 'no salio');
    t.cerca('01:02:03:04 a 25 fotogramas, mas los dos fotogramas que tardan en llegar las ocho', r.seg, 3600 + 120 + 3 + 4 / 25 + 2 / 25, 1e-9);
    t.eq('con su tipo de fotogramas', r.fps, 25);
    t.eq('y hacia delante', r.sentido, 1);
    t.eq('se apunta cuantos han llegado', E.recibidos, 8);
    /* Los tipos. */
    const tipo = (k) => { const F = { piezas: [null, null, null, null, null, null, null, null], ultimaPieza: -1, sentido: 1 }; let z = null; cuartos(0, 0, 0, 0, k).forEach(b => { z = M.mtcPieza(F, b, 1) || z; }); return z.fps; };
    t.eq('los cuatro tipos: 24, 25, 30 con salto y 30', [0, 1, 2, 3].map(tipo).join(','), '24,25,30,30');
    /* Hacia atras: llegan de la 7 a la 0. */
    const B = { piezas: [null, null, null, null, null, null, null, null], ultimaPieza: -1, sentido: 1 };
    let rb = null;
    cuartos(0, 0, 10, 0, 1).slice().reverse().forEach(b => { ahora += 10; rb = M.mtcPieza(B, b, ahora) || rb; });
    t.ok('rebobinando llegan al reves y tambien se juntan', !!rb && rb.sentido === -1, JSON.stringify(rb));
    t.cerca('y el timecode es el que dicen, sin sumar nada', rb.seg, 10, 1e-9);
    /* Si se pierde una pieza, se empieza otra vez: no se junta con las de antes. */
    const P = { piezas: [null, null, null, null, null, null, null, null], ultimaPieza: -1, sentido: 1 };
    const q2 = cuartos(0, 0, 20, 0, 1);
    let rp = null;
    [q2[0], q2[1], q2[3], q2[4], q2[5], q2[6], q2[7]].forEach(b => { rp = M.mtcPieza(P, b, 1) || rp; });
    t.eq('con una pieza perdida no se inventa un timecode', rp, null);
    q2.forEach(b => { rp = M.mtcPieza(P, b, 1) || rp; });
    t.ok('y con la vuelta siguiente entera, si', !!rp && Math.abs(rp.seg - (20 + 2 / 25)) < 1e-9);
    /* Entrando a mitad de una vuelta y perdiendo una pieza de la siguiente:
       las piezas viejas no se mezclan con las nuevas. */
    const Z = { piezas: [null, null, null, null, null, null, null, null], ultimaPieza: -1, sentido: 1 };
    const vieja = cuartos(0, 0, 40, 0, 1), nueva = cuartos(0, 0, 50, 0, 1);
    let rz = null;
    [vieja[4], vieja[5], vieja[6], vieja[7], nueva[0], nueva[1], nueva[2], nueva[3], nueva[5], nueva[6], nueva[7]]
      .forEach(b => { rz = M.mtcPieza(Z, b, 1) || rz; });
    t.eq('con una pieza perdida, las de la vuelta anterior no rellenan el hueco', rz, null,
         'si no, saldria un timecode mezcla de dos');
  }

  t.seccion('2 · el timecode entero, al localizar');
  {
    const M = montaje(midiDeMentira([]));
    const r = M.mtcEntero([0xF0, 0x7F, 0x7F, 0x01, 0x01, (1 << 5) | 2, 30, 15, 12, 0xF7]);   // 02:30:15:12 a 25
    t.cerca('02:30:15:12 a 25 fotogramas', r.seg, 2 * 3600 + 30 * 60 + 15 + 12 / 25, 1e-9);
    t.eq('con su tipo', r.fps, 25);
    t.eq('otro sysex cualquiera no es un timecode', M.mtcEntero([0xF0, 0x43, 0x10, 0x4C, 0xF7]), null);
    t.eq('ni uno largo de otro fabricante', M.mtcEntero([0xF0, 0x43, 0x10, 0x4C, 0x00, 0x00, 0x7E, 0x00, 0x00, 0xF7]), null);
    const r24 = M.mtcEntero([0xF0, 0x7F, 0x7F, 0x01, 0x01, (0 << 5) | 1, 0, 0, 12, 0xF7]);   // 01:00:00:12 a 24
    t.cerca('y el tipo se lee: a 24 fotogramas, el 12 es medio segundo', r24.seg, 3600 + 0.5, 1e-9);
    t.eq('con su tipo', r24.fps, 24);
    t.eq('ni uno cortado', M.mtcEntero([0xF0, 0x7F, 0x7F, 0x01, 0x01, 1]), null);
  }

  t.seccion('3 · engancha el reloj de Pro Tools, el mismo de la lectura de pantalla');
  {
    const midi = midiDeMentira(['loopMIDI Port']);
    const M = montaje(midi);
    t.ok('este navegador sabe de MIDI', M.mtcDisponible());
    await M.mtcAcceso();
    t.eq('se pide con sysex, que es como llega el timecode entero', midi.pedidos[0].sysex, true);
    t.eq('y se ven los puertos', M.mtcEntradas().map(e => e.nombre).join(','), 'loopMIDI Port');
    const r = M.mtcConectar('id-loopMIDI Port');
    t.ok('conectado', r.ok, r.motivo);
    t.eq('se recuerda por nombre, que el id cambia al reiniciar', M._guardado.ddl_mtc_puerto, 'loopMIDI Port');
    t.ok('y arranca a seguir', M._TCP.on && M._avisos.includes('arrancar'));
    t.eq('el timecode ahora llega por MIDI', M._TCP.fuente, 'midi');
    t.eq('y el vigia late desde un trabajador, cada decima', M._latidos.length + ' ' + M._latidos[0].ms, '1 100');
    const ent = midi.acceso.inputs.get('id-loopMIDI Port');
    /* Llega 01:00:00:00 y sigue: dos timecodes enteros seguidos a tiempo real. */
    ahora = 5000;
    cuartos(1, 0, 0, 0, 1).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    t.cerca('con el primero, el reloj se engancha ahi', M._TCP.tc, 3600 + 2 / 25, 1e-9);
    t.eq('rodando', M._TCP.rodando, true);
    t.ok('y se repinta el boton, que ahora dice PT', M._avisos.includes('pintar'));
    cuartos(1, 0, 0, 2, 1).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    t.cerca('con el segundo, el ritmo: dos fotogramas en 80 ms es tiempo real', M._TCP.ritmo, 1, 0.01);
    /* A doble velocidad llegan cuatro fotogramas por vuelta. */
    cuartos(1, 0, 0, 6, 1).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    t.cerca('a doble velocidad, el ritmo es dos', M._TCP.ritmo, 2, 0.01);
    t.ok('y el reloj lo sabe: rodando, con ese ritmo', M._TCP.rodando && Math.abs(M._TCP.ritmo - 2) < 0.01);
    t.eq('el estado lo dice', M.mtcEstadoTexto(), '«loopMIDI Port» · recibiendo a 25 fps');
    /* Un timecode entero: han localizado. */
    ent.manda([0xF0, 0x7F, 0x7F, 0x01, 0x01, (1 << 5) | 0, 10, 0, 0, 0xF7]);
    t.cerca('al localizar, el reloj salta ahi', M._TCP.tc, 600, 1e-9);
    t.eq('y parado', M._TCP.rodando, false);
    /* Otro tipo de fotogramas: se apunta y se guarda. */
    cuartos(0, 10, 0, 0, 0).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    t.eq('si Pro Tools va a 24, el reloj pasa a 24', M._TCP.fps, 24);
    t.ok('y se guarda', M._avisos.includes('guardar'));
  }

  t.seccion('4 · cuando deja de llegar, Pro Tools esta parado');
  {
    const midi = midiDeMentira(['IAC Driver Bus 1']);
    const M = montaje(midi);
    await M.mtcAcceso();
    M.mtcConectar('id-IAC Driver Bus 1');
    const ent = midi.acceso.inputs.get('id-IAC Driver Bus 1');
    ahora = 8000;
    cuartos(0, 0, 30, 0, 1).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    cuartos(0, 0, 30, 2, 1).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    t.ok('mientras llega, rueda', M._TCP.rodando && M.MTC.vivo);
    ahora += 100;
    t.eq('cien milisegundos sin nada no es parar: todavia rueda', M.mtcVigilar(ahora), false);
    ahora += 200;
    t.eq('trescientos si', M.mtcVigilar(ahora), true);
    t.eq('parado', M._TCP.rodando, false);
    t.cerca('donde estaba cuando dejo de llegar, no donde estaria ahora', M._TCP.tc, 30 + 2 / 25 + 2 / 25, 0.02,
            'el ultimo timecode mas lo que corrio hasta el ultimo cuarto de trama');
    t.eq('y el estado lo dice', M.mtcEstadoTexto(), '«IAC Driver Bus 1» · Pro Tools parado');
    t.eq('parado no se vuelve a parar', M.mtcVigilar(ahora + 1000), false);
    /* Y al volver a darle al play, sigue. */
    cuartos(0, 0, 31, 0, 1).forEach(b => { ahora += 10; ent.manda([0xF1, b]); });
    t.ok('al volver el timecode, rueda otra vez', M._TCP.rodando && M.MTC.vivo);
    t.eq('sin la parte del retardo de leer la pantalla, que por MIDI no hay', M._TCP.fuente, 'midi');
  }

  t.seccion('5 · los dias siguientes no hay que hacer nada');
  {
    /* Con el puerto de otro dia enchufado, al arrancar se conecta solo. */
    const midi = midiDeMentira(['Otro', 'loopMIDI Port']);
    const M = montaje(midi, { guardado: { ddl_mtc_puerto: 'loopMIDI Port' } });
    t.eq('al arrancar, conectado al de siempre', await M.mtcAlArrancar(), true);
    t.eq('a ese y no a otro', M.MTC.puerto, 'loopMIDI Port');
    t.eq('sin preguntar nada que no fuera el acceso', midi.pedidos.length, 1);
    /* Sin puerto recordado no se pide ni el permiso. */
    const midi2 = midiDeMentira(['loopMIDI Port']);
    const M2 = montaje(midi2);
    t.eq('sin puerto recordado no se pide el acceso', await M2.mtcAlArrancar(), false);
    t.eq('ni una vez', midi2.pedidos.length, 0);
    /* El puerto recordado que se enchufa despues. */
    const midi3 = midiDeMentira([]);
    const M3 = montaje(midi3, { guardado: { ddl_mtc_puerto: 'loopMIDI Port' } });
    t.eq('si al arrancar no esta, no se conecta', await M3.mtcAlArrancar(), false);
    midi3.poner('loopMIDI Port');
    t.eq('y al enchufarlo, se conecta solo', M3.MTC.on, true);
    /* Desconectar de verdad olvida el puerto. */
    M3.mtcDesconectar();
    t.ok('desconectar olvida el puerto y suelta el reloj', !M3.MTC.on && !M3._guardado.ddl_mtc_puerto && M3._TCP.fuente === 'pantalla');
    t.ok('y para el vigia', M3._latidos.every(l => l.parado));
  }

  t.seccion('6 · si el navegador no deja');
  {
    const midi = midiDeMentira(['loopMIDI Port'], { sinSysex: true });
    const M = montaje(midi);
    await M.mtcAcceso();
    t.eq('sin sysex se pide sin sysex, que los cuartos de trama llegan igual', midi.pedidos.length, 2);
    t.eq('y funciona', M.mtcConectar('id-loopMIDI Port').ok, true);
    const M2 = montaje({ nav: {}, acceso: null });
    t.eq('sin Web MIDI se dice', M2.mtcDisponible(), false);
    t.ok('con palabras', /Chrome o Edge/.test(M2.mtcEstadoTexto()));
    t.eq('y conectar sin acceso no revienta', M2.mtcConectar('x').ok, false);
  }

  t.seccion('7 · el programa lo carga, y la lectura de pantalla se calla');
  {
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
    t.ok('index.html carga el modulo, despues del reloj', html.indexOf('./js/mtc.js') > html.indexOf('./js/tcpantalla.js'));
    const sw = fs.readFileSync(path.join(__dirname, '..', 'sw.js'), 'utf8');
    t.ok('y el servicio lo guarda', sw.indexOf('./js/mtc.js') > 0);
    const src = fs.readFileSync(path.join(__dirname, '..', 'js', 'tcpantalla.js'), 'utf8').replace(/\r\n/g, '\n');
    t.ok('mientras llega MIDI, la pantalla no se lee', /function tcpMirar\(\)\{[\s\S]{0,400}?if\(tcpPorMidi\(\)\)\{[\s\S]{0,400}?return;\n  \}\n  const r = tcpLeerUna\(\);/.test(src));
    t.ok('por MIDI no falta nada para seguir', /function tcpQueFalta\(\)\{[\s\S]{0,200}?if\(tcpPorMidi\(\)\) return 'listo';/.test(src));
    t.ok('y el retardo de leer la pantalla no se suma al MIDI', /TCP\.rodando && TCP\.fuente !== 'midi'/.test(src));
    t.ok('el panel enseña el MIDI delante', src.indexOf('tcpPanelMidiHtml(esc2)') < src.indexOf("nPaso('compartir la pantalla'"));
    t.ok('y el boton de seguir arranca con MIDI sin pedir pantalla', /if\(tcpPorMidi\(\)\)\{ tcpEmpezarASeguir\(\); return; \}/.test(src));
  }
};
