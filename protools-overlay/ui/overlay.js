'use strict';
/* ────────────────────────────────────────────────────────────────────
   Pintado del overlay.

   Regla de oro: por IPC no llega un tiempo por frame, llega un ANCLA
   (tiempo + instante en que se tomo). Cada repintado calcula el tiempo por
   su cuenta con esa ancla, asi que la latencia del puente no se ve.

   Y no se reconstruye el DOM en cada frame: los tramos de texto se crean una
   vez, y por frame solo se tocan las clases que cambian y el recorte de la
   palabra activa.
   ──────────────────────────────────────────────────────────────────── */

const $banda  = document.getElementById('banda');
const $lineas = document.getElementById('lineas');
const $aviso  = document.getElementById('aviso');

let tl = null;                 // Timeline
let posDe = new Map();         // wi -> posicion dentro de words
let spans = [];                // spans por posicion de palabra
let lineaDe = [];              // posicion de palabra -> indice de linea
let elLineas = [];
let offsetS = 0;               // calibracion, en segundos

// ancla de reloj
let ancla = { t: 0, en: Date.now(), rodando: false };
let deriva = 0;                // correccion suave, para que no de saltitos

function ahora(){
  if(!ancla.rodando) return ancla.t + offsetS;
  return ancla.t + (Date.now() - ancla.en) / 1000 + deriva + offsetS;
}

/* ── Construccion del texto (una sola vez por guion) ────────────────── */

function montar(fichas, words, maxChars){
  $lineas.textContent = '';
  spans = []; lineaDe = []; elLineas = []; posDe = new Map();
  words.forEach((w, i) => posDe.set(w.wi, i));

  const ls = lineas(fichas, maxChars || 42);
  ls.forEach((linea, li) => {
    const div = document.createElement('div');
    div.className = 'linea';
    for(const f of linea){
      if(f.wi === undefined){ div.appendChild(document.createTextNode(f.t)); continue; }
      const pos = posDe.get(f.wi);
      const sp = document.createElement('span');
      sp.className = 'pal';
      const base = document.createElement('span'); base.className = 'base'; base.textContent = f.t;
      const luz  = document.createElement('span'); luz.className  = 'luz';  luz.textContent  = f.t;
      sp.appendChild(base); sp.appendChild(luz);
      div.appendChild(sp);
      if(pos !== undefined){ spans[pos] = sp; lineaDe[pos] = li; }
    }
    $lineas.appendChild(div);
    elLineas.push(div);
  });
}

/* ── Bucle de pintado ───────────────────────────────────────────────── */

/** Deja la linea `li` en el centro de la ventana de tres lineas. */
function centrar(li){
  const el = elLineas[li];
  if(!el) return;
  const alto = $banda.clientHeight;
  const y = el.offsetTop + el.offsetHeight / 2 - alto / 2;
  $lineas.style.transform = 'translateY(' + (-Math.max(0, y)).toFixed(1) + 'px)';
}

let hechasPrev = 0, activaPrev = -1, lineaPrev = -1;

function pintar(){
  requestAnimationFrame(pintar);
  if(!tl || !spans.length) return;

  const e = tl.at(ahora());

  // palabras ya dichas: solo se tocan las que cambian de estado
  if(e.done !== hechasPrev){
    const a = Math.min(hechasPrev, e.done), b = Math.max(hechasPrev, e.done);
    for(let i = a; i < b; i++){ const s = spans[i]; if(s) s.classList.toggle('hecha', i < e.done); }
    hechasPrev = e.done;
  }

  // palabra activa: se apaga la anterior y se recorta la nueva
  if(e.active !== activaPrev){
    const ant = spans[activaPrev];
    if(ant){ ant.classList.remove('activa'); ant.querySelector('.luz').style.clipPath = 'inset(0 100% 0 0)'; }
    activaPrev = e.active;
    const s = spans[e.active];
    if(s) s.classList.add('activa');
  }
  if(e.active >= 0){
    const s = spans[e.active];
    if(s) s.querySelector('.luz').style.clipPath =
            'inset(0 ' + ((1 - e.fill) * 100).toFixed(1) + '% 0 0)';
  }

  // linea en curso
  const ref = e.active >= 0 ? e.active : Math.max(0, e.done - 1);
  const li = lineaDe[ref];
  if(li !== undefined && li !== lineaPrev){
    if(elLineas[lineaPrev]) elLineas[lineaPrev].classList.remove('actual');
    if(elLineas[li]) elLineas[li].classList.add('actual');
    lineaPrev = li;
    centrar(li);
  }
}
requestAnimationFrame(pintar);

/* ── Mensajes del control ───────────────────────────────────────────── */

let avisoT = 0;
function aviso(txt, ms){
  $aviso.textContent = txt || '';
  $aviso.classList.toggle('ver', !!txt);
  clearTimeout(avisoT);
  if(txt && ms) avisoT = setTimeout(() => $aviso.classList.remove('ver'), ms);
}

window.pt.alRecibir(msg => {
  if(!msg) return;
  switch(msg.tipo){

    case 'guion':
      tl = new Timeline(msg.words);
      montar(msg.fichas, msg.words, msg.maxChars);
      hechasPrev = 0; activaPrev = -1; lineaPrev = -1;
      $lineas.style.transform = 'translateY(0px)';
      if(elLineas[0]) elLineas[0].classList.add('actual');
      break;

    case 'reloj': {
      // correccion suave: un salto grande se aplica entero, uno pequeño se
      // reparte, para que la palabra activa no parpadee
      const prevista = ahora() - offsetS;
      const nueva = msg.t;
      const dif = nueva - prevista;
      ancla = { t: nueva, en: msg.en || Date.now(), rodando: !!msg.rodando };
      deriva = (Math.abs(dif) < 0.040) ? -dif * 0.5 : 0;
      break;
    }

    case 'ajuste':
      if(msg.offsetMs != null) offsetS = Number(msg.offsetMs) / 1000;
      break;

    case 'estilo': {
      const r = document.documentElement.style;
      if(msg.tam)       $banda.style.fontSize = msg.tam + 'px';
      if(msg.abajo != null) $banda.style.bottom = msg.abajo + 'vh';
      if(msg.pendiente) r.setProperty('--pendiente', msg.pendiente);
      if(msg.activa)    r.setProperty('--activa', msg.activa);
      if(msg.hecha)     r.setProperty('--hecha', msg.hecha);
      break;
    }

    case 'ver':
      $banda.classList.toggle('oculto', !msg.v);
      break;

    case 'colocando':
      document.body.classList.toggle('colocando', !!msg.v);
      aviso(msg.v ? 'Colocacion activa · el raton ya no pasa a Pro Tools' : '', 0);
      break;

    case 'aviso':
      aviso(msg.txt, msg.ms || 2600);
      break;
  }
});
