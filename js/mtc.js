/* Timecode de Pro Tools por MIDI (MTC) · especificacion 04
 *
 * La otra manera de saber por donde va Pro Tools, y la buena: Pro Tools
 * GENERA MIDI Time Code de serie -Setup › Peripherals › Synchronization, y el
 * boton «Gen MTC» del transporte-, y Chrome lo recibe con Web MIDI. Llega
 * exacto al fotograma, con los saltos y a la velocidad que sea, sin leer
 * pixeles y sin enseñarle cifras a nadie.
 *
 * Sin cables si Dubbipt corre en el mismo equipo que Pro Tools: en Mac el
 * puerto virtual (IAC) viene de fabrica; en Windows hace falta loopMIDI, un
 * programa gratuito de un mega. Con Dubbipt en otro equipo, un cable USB-MIDI
 * o MIDI por red.
 *
 * Como llega: ocho «cuartos de trama» (F1 nn) por cada dos fotogramas, cada
 * uno con un trocito del timecode; juntos los ocho, se sabe el tiempo. Y al
 * localizar, un mensaje entero (F0 7F .. 01 01 hh mm ss ff F7).
 *
 * Aqui no hay reloj propio: se ENGANCHA el mismo reloj que usa la lectura de
 * pantalla (TCP, en tcpantalla.js), para que todo lo demas -el boton Seguir,
 * el libreto, las correcciones de QC- no sepa ni le importe de donde viene el
 * timecode. Mientras llega MIDI, la lectura de pantalla se calla.
 *
 * De donde depende: TCP, tcpArrancar, tcpTexto, tcpLatido, castAviso
 */

const MTC = {
  acceso: null,        // el acceso a MIDI del navegador
  entrada: null,       // el puerto conectado
  puerto: '',          // su nombre
  on: false,           // ¿conectado a un puerto?
  vivo: false,         // ¿esta llegando timecode ahora mismo?
  piezas: [null, null, null, null, null, null, null, null],
  ultimaPieza: -1,
  sentido: 1,          // +1 hacia delante, -1 hacia atras
  fps: 25,
  recibidos: 0,        // cuartos de trama recibidos desde que se conecto
  ult: 0,              // performance.now() del ultimo cuarto de trama
  ultSeg: null, ultT: 0, // el ultimo timecode entero decodificado, y cuando
  ritmo: 1,
  _vigia: 0
};

const MTC_PUERTO_GUARDADO = 'ddl_mtc_puerto';
/* Sin cuartos de trama en este tiempo, Pro Tools esta parado. A 24 fotogramas,
   un timecode entero tarda 83 ms; con 250 no se confunde un hipo con parar. */
const MTC_PARADO_MS = 250;
/* Los cuatro tipos de MTC: 24, 25, 30 con salto de cuadro y 30. Para el
   libreto los dos de 30 son 30: sus timecodes son etiquetas, no duraciones. */
const MTC_FPS = [24, 25, 30, 30];

function mtcAhora(){ return (typeof performance !== 'undefined') ? performance.now() : Date.now(); }

/** ¿Sabe este navegador de MIDI? Chrome y Edge, en una pagina segura. */
function mtcDisponible(){
  return !!(typeof navigator !== 'undefined' && navigator && navigator.requestMIDIAccess);
}

/**
 * El acceso a MIDI, pidiendolo la primera vez. Con sysex, que es como llega el
 * timecode entero al localizar; si no lo dan, sin el, que los cuartos de trama
 * llegan igual.
 */
async function mtcAcceso(){
  if(MTC.acceso) return MTC.acceso;
  if(!mtcDisponible()) throw new Error('Este navegador no sabe de MIDI · hace falta Chrome o Edge');
  let a = null;
  try{ a = await navigator.requestMIDIAccess({ sysex: true }); }
  catch(e){ a = await navigator.requestMIDIAccess(); }
  MTC.acceso = a;
  try{ a.onstatechange = () => { mtcEnchufado(); try{ if(typeof tcpPintarEstado === 'function') tcpPintarEstado(); }catch(e){ /* sin panel */ } }; }
  catch(e){ /* sin avisos de enchufar: se vera al abrir el panel */ }
  return a;
}

/** Las entradas MIDI que hay: `[{ id, nombre }]`. */
function mtcEntradas(){
  const out = [];
  if(!MTC.acceso || !MTC.acceso.inputs) return out;
  MTC.acceso.inputs.forEach(i => out.push({ id: i.id, nombre: String(i.name || i.id), fabricante: String(i.manufacturer || '') }));
  return out;
}

/** El puerto que se uso la ultima vez, por nombre: el id cambia al reiniciar. */
function mtcPuertoGuardado(){
  try{ return localStorage.getItem(MTC_PUERTO_GUARDADO) || ''; }catch(e){ return ''; }
}

/**
 * Se conecta a una entrada. A partir de ahi el reloj de Pro Tools es el que
 * llega por aqui, y se arranca a seguir si no se estaba.
 */
function mtcConectar(id){
  if(!MTC.acceso) return { ok: false, motivo: 'Primero hay que pedir el acceso a MIDI' };
  const ent = MTC.acceso.inputs.get ? MTC.acceso.inputs.get(id) : null;
  if(!ent) return { ok: false, motivo: 'Ese puerto MIDI ya no esta' };
  mtcDesconectar(true);
  MTC.entrada = ent;
  MTC.puerto = String(ent.name || ent.id);
  MTC.on = true; MTC.vivo = false; MTC.recibidos = 0; MTC.ultSeg = null; MTC.ultimaPieza = -1;
  MTC.piezas = [null, null, null, null, null, null, null, null];
  ent.onmidimessage = (ev) => { try{ mtcMensaje(ev && ev.data, mtcAhora()); }catch(e){ /* un mensaje raro no para el reloj */ } };
  try{ localStorage.setItem(MTC_PUERTO_GUARDADO, MTC.puerto); }catch(e){ /* no se recuerda */ }
  /* El vigia: sin cuartos de trama, parado. Desde un trabajador, que la
     pestaña tapada no lo frene (PT-11). */
  if(!MTC._vigia){
    MTC._vigia = (typeof tcpLatido === 'function')
      ? tcpLatido(100, () => mtcVigilar(mtcAhora()))
      : ((t) => ({ parar(){ clearInterval(t); } }))(setInterval(() => mtcVigilar(mtcAhora()), 100));
  }
  if(typeof TCP !== 'undefined' && TCP){
    TCP.fuente = 'midi';
    if(!TCP.on && typeof tcpArrancar === 'function') tcpArrancar();
  }
  return { ok: true, motivo: '' };
}

/** Suelta el puerto. Con `callado`, sin tocar lo que se recuerda: es un
    cambio de puerto, no un adios. */
function mtcDesconectar(callado){
  try{ if(MTC.entrada) MTC.entrada.onmidimessage = null; }catch(e){ /* ya estaba suelto */ }
  MTC.entrada = null; MTC.on = false; MTC.vivo = false;
  if(!callado){
    MTC.puerto = '';
    try{ localStorage.removeItem(MTC_PUERTO_GUARDADO); }catch(e){ /* no habia nada */ }
    if(MTC._vigia){ try{ MTC._vigia.parar(); }catch(e){ /* ya parado */ } MTC._vigia = 0; }
    if(typeof TCP !== 'undefined' && TCP && TCP.fuente === 'midi') TCP.fuente = 'pantalla';
  }
}

/**
 * Si el puerto de la ultima vez esta enchufado, se conecta solo: los dias
 * siguientes no hay que hacer NADA, ni compartir. Se llama al tener acceso y
 * cada vez que se enchufa o desenchufa algo.
 */
function mtcEnchufado(){
  if(MTC.on) return false;
  const quiero = mtcPuertoGuardado();
  if(!quiero) return false;
  const e = mtcEntradas().find(x => x.nombre === quiero);
  if(!e) return false;
  return mtcConectar(e.id).ok;
}

/** Al arrancar la aplicacion: si hay un puerto recordado, se pide el acceso
    -ya concedido otro dia- y se conecta. Sin puerto recordado no se pide nada:
    el permiso de MIDI se pide cuando alguien lo quiere. */
async function mtcAlArrancar(){
  if(!mtcPuertoGuardado() || !mtcDisponible()) return false;
  try{ await mtcAcceso(); }catch(e){ return false; }
  return mtcEnchufado();
}

/* ── Descifrar lo que llega ────────────────────────────────────────────── */

/** hh:mm:ss:ff -> segundos de etiqueta, con los fotogramas de su tipo. */
function mtcSegundos(h, m, s, f, fps){ return h * 3600 + m * 60 + s + f / (fps || 25); }

/**
 * Un cuarto de trama. `dato` es el byte que sigue al F1: en el nibble alto
 * cual de las ocho piezas es, en el bajo su valor. Devuelve el timecode
 * entero cuando se completan las ocho, o null.
 *
 * Hacia delante llegan de la 0 a la 7 y el timecode es el del momento en que
 * salio la 0: para cuando llega la 7 han pasado dos fotogramas, y se suman.
 * Hacia atras llegan de la 7 a la 0.
 */
function mtcPieza(E, dato, ahora){
  const idx = (dato >> 4) & 7, val = dato & 15;
  E.recibidos = (E.recibidos || 0) + 1;
  E.ult = ahora;
  if(E.ultimaPieza >= 0){
    if(idx === (E.ultimaPieza + 1) % 8) E.sentido = 1;
    else if(idx === (E.ultimaPieza + 7) % 8) E.sentido = -1;
    else E.piezas = [null, null, null, null, null, null, null, null];   // se perdio alguna: se empieza otra vez
  }
  E.ultimaPieza = idx;
  E.piezas[idx] = val;
  const fin = E.sentido > 0 ? 7 : 0;
  if(idx !== fin || E.piezas.some(p => p == null)) return null;
  const p = E.piezas;
  const f = p[0] | ((p[1] & 1) << 4);
  const s = p[2] | ((p[3] & 3) << 4);
  const m = p[4] | ((p[5] & 3) << 4);
  const h = p[6] | ((p[7] & 1) << 4);
  const tipo = (p[7] >> 1) & 3;
  const fps = MTC_FPS[tipo];
  E.fps = fps;
  E.piezas = [null, null, null, null, null, null, null, null];
  const seg = mtcSegundos(h, m, s, f, fps) + (E.sentido > 0 ? 2 / fps : 0);
  return { seg: seg, fps: fps, sentido: E.sentido };
}

/** Un timecode entero por sysex (al localizar): F0 7F dd 01 01 hh mm ss ff F7.
    En `hh` van tambien los dos bits del tipo. Devuelve { seg, fps } o null. */
function mtcEntero(bytes){
  const d = bytes || [];
  if(d.length < 10 || d[0] !== 0xF0 || d[1] !== 0x7F || d[3] !== 0x01 || d[4] !== 0x01) return null;
  const tipo = (d[5] >> 5) & 3, h = d[5] & 31, m = d[6] & 63, s = d[7] & 63, f = d[8] & 31;
  const fps = MTC_FPS[tipo];
  return { seg: mtcSegundos(h, m, s, f, fps), fps: fps };
}

/** Un mensaje MIDI cualquiera: se atienden los cuartos de trama y el entero. */
function mtcMensaje(data, ahora){
  if(!data || !data.length) return;
  if(data[0] === 0xF1 && data.length >= 2){
    const r = mtcPieza(MTC, data[1], ahora);
    if(r) mtcEngancha(r.seg, ahora, true, r.fps, r.sentido);
    return;
  }
  if(data[0] === 0xF0){
    const r = mtcEntero(Array.from(data));
    if(r){ MTC.recibidos++; MTC.ult = ahora; mtcEngancha(r.seg, ahora, false, r.fps, 1); }
  }
}

/**
 * Engancha el reloj de Pro Tools (TCP) a un timecode que acaba de llegar. El
 * ritmo sale de dos timecodes enteros seguidos: a tiempo real casi siempre,
 * pero rebobinando o a doble velocidad tambien.
 */
function mtcEngancha(seg, ahora, rodando, fps, sentido){
  if(typeof TCP === 'undefined' || !TCP) return;
  if(rodando && MTC.ultSeg != null && ahora - MTC.ultT > 20 && ahora - MTC.ultT < 600){
    const v = (seg - MTC.ultSeg) / ((ahora - MTC.ultT) / 1000);
    if(isFinite(v) && Math.abs(v) <= 8) MTC.ritmo = v;
  }else MTC.ritmo = rodando ? (sentido || 1) : 0;
  MTC.ultSeg = seg; MTC.ultT = ahora; MTC.vivo = true;
  if(fps && TCP.fps !== fps){ TCP.fps = fps; try{ if(typeof tcpGuardar === 'function') tcpGuardar(); }catch(e){ /* no se recuerda */ } }
  const era = TCP.tc != null;
  TCP.fuente = 'midi';
  TCP.tc = seg; TCP.t0 = ahora;
  TCP.rodando = !!rodando;
  TCP.ritmo = rodando ? MTC.ritmo : 0;
  TCP._hist = []; TCP._dudas = [];
  if(!era){ try{ if(typeof libPintarSeguir === 'function') libPintarSeguir(); }catch(e){ /* sin libreto */ } }
}

/** Cada decima: si dejo de llegar timecode, Pro Tools esta parado. El reloj
    se queda donde dijo el ultimo timecode entero. */
function mtcVigilar(ahora){
  if(!MTC.on || !MTC.vivo) return false;
  if(ahora - MTC.ult <= MTC_PARADO_MS) return false;
  MTC.vivo = false;
  MTC.piezas = [null, null, null, null, null, null, null, null];
  MTC.ultimaPieza = -1;
  if(typeof TCP !== 'undefined' && TCP && TCP.fuente === 'midi' && TCP.rodando){
    /* Donde estaba cuando dejo de llegar: el ultimo entero mas lo que corrio
       hasta el ultimo cuarto de trama. */
    if(TCP.tc != null && typeof tcpAhora === 'function') TCP.tc = tcpAhora(TCP, MTC.ult);
    TCP.t0 = MTC.ult;
    TCP.rodando = false; TCP.ritmo = 0;
  }
  return true;
}

/** Lo que dice el panel de como va el MIDI. */
function mtcEstadoTexto(){
  if(!mtcDisponible()) return 'este navegador no sabe de MIDI · hace falta Chrome o Edge';
  if(!MTC.acceso) return 'sin conectar';
  if(!MTC.on) return mtcEntradas().length ? 'sin conectar · elige el puerto' : 'no hay ningun puerto MIDI · en Windows, instala loopMIDI; en Mac, activa el IAC';
  if(!MTC.recibidos) return 'conectado a «' + MTC.puerto + '» · esperando timecode: en Pro Tools, Gen MTC y play';
  if(!MTC.vivo) return '«' + MTC.puerto + '» · Pro Tools parado';
  return '«' + MTC.puerto + '» · recibiendo a ' + MTC.fps + ' fps';
}

/* Al arrancar: si hay un puerto de otro día, se conecta solo y sin preguntar
   nada. Sin puerto recordado no se pide ningún permiso. */
try{ mtcAlArrancar(); }catch(e){ /* sin MIDI en este navegador */ }
