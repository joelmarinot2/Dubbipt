'use strict';
/* ────────────────────────────────────────────────────────────────────
   Ventana de control. Aqui vive el reloj y desde aqui se alimenta el overlay.
   ──────────────────────────────────────────────────────────────────── */

const $ = (id) => document.getElementById(id);
const enviar = (m) => window.pt.aOverlay(m);

let muestras = null;      // Float32Array mono
let sr = 48000;
let marcas = null;        // marcas de un alineador externo
let alineado = null;      // resultado del worker
let audioLocal = null;    // AudioBuffer, para reproducir aqui al calibrar

function msg(txt, tipo){
  const f = $('msg');
  f.textContent = txt || '';
  f.className = tipo || '';
}

/* ── 1 · Texto ──────────────────────────────────────────────────────── */

function contar(){
  const n = palabras(tokenize($('texto').value)).length;
  $('cuenta').textContent = n + (n === 1 ? ' palabra' : ' palabras');
  $('bAlinear').disabled = !(n && (muestras || marcas));
}
$('texto').addEventListener('input', contar);

/* ── 2 · Audio y alineacion ─────────────────────────────────────────── */

async function leerArchivo(ruta){
  // file:// dentro de Electron: fetch lo sirve sin tener que tocar fs aqui
  const url = 'file:///' + ruta.replace(/\\/g, '/').replace(/^\/+/, '');
  const r = await fetch(url);
  if(!r.ok) throw new Error('no se pudo leer el archivo');
  return r.arrayBuffer();
}

/** Pasa a mono sumando canales: la voz esta en todos y asi no se pierde nada. */
function aMono(buf){
  const n = buf.length, ch = buf.numberOfChannels;
  if(ch === 1) return buf.getChannelData(0);
  const out = new Float32Array(n);
  for(let c = 0; c < ch; c++){
    const d = buf.getChannelData(c);
    for(let i = 0; i < n; i++) out[i] += d[i];
  }
  for(let i = 0; i < n; i++) out[i] /= ch;
  return out;
}

$('bAudio').addEventListener('click', async () => {
  try{
    const ruta = await window.pt.pedirAudio();
    if(!ruta) return;
    msg('Descodificando audio...');
    const ab = await leerArchivo(ruta);
    const ctx = new AudioContext();
    const buf = await ctx.decodeAudioData(ab);
    ctx.close();
    muestras = aMono(buf);
    sr = buf.sampleRate;
    audioLocal = buf;
    $('nomAudio').textContent = ruta.split(/[\\/]/).pop() + ' - ' +
      (buf.duration / 60).toFixed(1) + ' min - ' + sr + ' Hz';
    msg('Audio listo.', 'bien');
    contar();
  }catch(e){
    msg('No se pudo cargar el audio: ' + e.message, 'mal');
  }
});

$('bMarcas').addEventListener('click', () => {
  // JSON de whisper.cpp / WhisperX / MFA: [{word,start,end}, ...]
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json';
  inp.onchange = async () => {
    try{
      const j = JSON.parse(await inp.files[0].text());
      const lista = Array.isArray(j) ? j : (j.words || j.segments || []);
      if(!Array.isArray(lista) || !lista.length) throw new Error('no hay marcas dentro');
      marcas = lista;
      $('nomMarcas').textContent = lista.length + ' marcas - ' + inp.files[0].name;
      msg('Marcas cargadas: se usaran en vez del analisis de energia.', 'bien');
      contar();
    }catch(e){ msg('JSON no valido: ' + e.message, 'mal'); }
  };
  inp.click();
});

let worker = null;
$('bAlinear').addEventListener('click', () => {
  const texto = $('texto').value;
  if(!texto.trim()) return msg('Falta el texto.', 'mal');
  if(!muestras && !marcas) return msg('Falta el audio.', 'mal');

  $('bAlinear').disabled = true;
  $('estadoAlin').textContent = 'analizando...';
  msg('Analizando. La ventana sigue respondiendo: el trabajo va en un worker.');

  if(worker) worker.terminate();
  worker = new Worker('../src/align/worker.js');
  const t0 = performance.now();

  worker.onmessage = (e) => {
    const r = e.data;
    $('bAlinear').disabled = false;
    if(!r.ok){
      $('estadoAlin').textContent = '';
      alineado = null;
      msg(r.code === 'AUDIO_NO_INTELIGIBLE'
        ? 'Audio no inteligible: ' + r.msg + '. Prueba con la pista de voz sola, o carga marcas de un alineador externo.'
        : 'Fallo al alinear: ' + r.msg, 'mal');
      return;
    }
    alineado = r;
    const seg = ((performance.now() - t0) / 1000).toFixed(2);
    $('estadoAlin').textContent = r.words.length + ' palabras - ' +
      (r.segs ? r.segs.length + ' tramos - ' : '') + seg + ' s';
    enviar({ tipo: 'guion', fichas: r.fichas, words: r.words, maxChars: 46 });
    enviar({ tipo: 'ajuste', offsetMs: Number($('offN').value) || 0 });
    msg('Alineado con el motor "' + r.motor + '". Ya puedes mostrar el overlay.', 'bien');
  };
  worker.onerror = (err) => {
    $('bAlinear').disabled = false;
    $('estadoAlin').textContent = '';
    msg('El worker no arranco: ' + (err.message || err), 'mal');
  };

  // el audio viaja sin copiarse: se transfiere el buffer
  const copia = muestras ? muestras.slice() : null;
  worker.postMessage({
    texto: texto, marcas: marcas, samples: copia, sampleRate: sr, offsetMs: 0
  }, copia ? [copia.buffer] : []);
});

/* ── 3 · Reloj: MTC o reproduccion local ────────────────────────────── */

const lector = new MtcReader();
let rodando = false;

function tcTexto(seg, fps){
  if(seg == null) return '--:--:--:--';
  const s = Math.max(0, seg);
  const h = Math.floor(s / 3600), m = Math.floor(s / 60) % 60, ss = Math.floor(s) % 60;
  const f = Math.floor((s - Math.floor(s)) * (fps || 25));
  const dd = (n) => String(n).padStart(2, '0');
  return dd(h) + ':' + dd(m) + ':' + dd(ss) + ':' + dd(f);
}

function anclar(t, va){
  enviar({ tipo: 'reloj', t: t, en: Date.now(), rodando: va });
  $('tc').textContent = tcTexto(t, lector.fps);
  if(va !== rodando){ rodando = va; $('luz').classList.toggle('on', va); }
}

async function midiInit(){
  if(!navigator.requestMIDIAccess){
    $('midi').innerHTML = '<option>MIDI no disponible</option>';
    return;
  }
  try{
    const acc = await navigator.requestMIDIAccess({ sysex: true });
    const pintar = () => {
      const sel = $('midi'), antes = sel.value;
      sel.innerHTML = '<option value="">- sin MIDI -</option>';
      for(const e of acc.inputs.values()){
        const o = document.createElement('option');
        o.value = e.id;
        o.textContent = e.name;
        sel.appendChild(o);
      }
      sel.value = antes;
    };
    pintar();
    acc.onstatechange = pintar;

    $('midi').addEventListener('change', () => {
      for(const e of acc.inputs.values()) e.onmidimessage = null;
      const id = $('midi').value;
      if(!id) return;
      const ent = acc.inputs.get(id);
      if(!ent) return;
      ent.onmidimessage = (ev) => {
        const r = lector.push(ev.data, performance.now());
        if(r && r.complete) anclar(r.seconds, lector.isRolling(performance.now()));
      };
      msg('Escuchando MTC en "' + ent.name + '".', 'bien');
    });
  }catch(e){
    $('midi').innerHTML = '<option>MIDI denegado</option>';
    msg('No se pudo abrir MIDI: ' + e.message, 'mal');
  }
}
midiInit();

// Si dejan de llegar cuartos de trama, el transporte esta parado.
setInterval(() => {
  if(!lector.running || fuenteLocal) return;
  const va = lector.isRolling(performance.now());
  if(!va && rodando) anclar(lector.seconds || 0, false);
}, 80);

/* Reproduccion local: para calibrar y probar sin Pro Tools delante. */
let ctxLocal = null, fuenteLocal = null, t0Local = 0, relojLocal = 0;

$('bLocal').addEventListener('click', async () => {
  if(!audioLocal) return msg('Carga primero un audio.', 'mal');
  pararLocal();
  ctxLocal = ctxLocal || new AudioContext();
  await ctxLocal.resume();
  fuenteLocal = ctxLocal.createBufferSource();
  fuenteLocal.buffer = audioLocal;
  fuenteLocal.connect(ctxLocal.destination);
  t0Local = ctxLocal.currentTime;
  fuenteLocal.start();
  fuenteLocal.onended = () => { if(fuenteLocal) pararLocal(); };
  relojLocal = setInterval(() => {
    if(!fuenteLocal || !ctxLocal) return;
    anclar(ctxLocal.currentTime - t0Local, true);
  }, 100);
  anclar(0, true);
  msg('Reproduciendo aqui. El overlay sigue este audio.', 'bien');
});

function pararLocal(){
  clearInterval(relojLocal);
  if(fuenteLocal){
    try{ fuenteLocal.onended = null; fuenteLocal.stop(); }catch(e){}
  }
  fuenteLocal = null;
  anclar(lector.seconds || 0, false);
}
$('bParar').addEventListener('click', () => { pararLocal(); msg('Parado.'); });

/* ── Calibracion ────────────────────────────────────────────────────── */

function ponerOffset(v){
  const n = Math.max(-1000, Math.min(1000, Number(v) || 0));
  $('off').value = n;
  $('offN').value = n;
  enviar({ tipo: 'ajuste', offsetMs: n });
}
$('off').addEventListener('input', (e) => ponerOffset(e.target.value));
$('offN').addEventListener('change', (e) => ponerOffset(e.target.value));

/* ── 4 · Pantalla y estilo ──────────────────────────────────────────── */

window.pt.pantallas().then((list) => {
  const sel = $('pant');
  list.forEach((d) => {
    const o = document.createElement('option');
    o.value = d.id;
    o.textContent = 'Monitor ' + (d.i + 1) + ' - ' + d.w + 'x' + d.h +
                    (d.principal ? ' (principal)' : '');
    sel.appendChild(o);
  });
  const p = list.find((d) => d.principal);
  if(p) sel.value = p.id;
});
$('pant').addEventListener('change', (e) => window.pt.ponerPantalla(Number(e.target.value)));

function estilo(){
  enviar({ tipo: 'estilo',
    tam: Number($('tam').value), abajo: Number($('abajo').value),
    pendiente: $('cPend').value, activa: $('cAct').value, hecha: $('cHec').value });
}
$('tam').addEventListener('input', () => { $('tamN').textContent = $('tam').value; estilo(); });
$('abajo').addEventListener('input', () => { $('abajoN').textContent = $('abajo').value; estilo(); });
for(const id of ['cPend','cAct','cHec']) $(id).addEventListener('input', estilo);

let visible = false;
$('bVer').addEventListener('click', async () => {
  visible = !visible;
  await window.pt.verOverlay(visible);
  enviar({ tipo: 'ver', v: visible });
  if(visible) estilo();
  $('bVer').textContent = visible ? 'Ocultar overlay' : 'Mostrar overlay';
  $('bVer').classList.toggle('activo', visible);
});

let colocando = false;
$('bColocar').addEventListener('click', async () => {
  colocando = !colocando;
  await window.pt.clickThrough(!colocando);   // colocando = NO click-through
  enviar({ tipo: 'colocando', v: colocando });
  $('bColocar').textContent = colocando ? 'Terminar colocacion' : 'Colocar (el raton deja de pasar)';
  $('bColocar').classList.toggle('activo', colocando);
});

contar();
