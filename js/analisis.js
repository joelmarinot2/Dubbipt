/* ═══ ANALIZAR CAMBIOS ═══════════════════════════════════════════════════════
 *
 * Oír el audio del programa, compararlo con el libreto y decir qué parlamentos
 * no dicen lo que pone. Pedido de sala: «que el proceso sea mucho más rápido».
 *
 * POR QUÉ ERA LENTO. Se transcribía parlamento a parlamento: se recortaba el
 * trocito de cada uno y se le pasaba al reconocedor. Pero el reconocedor no
 * trabaja por segundos de audio: trabaja por VENTANAS de treinta segundos, y
 * rellena con silencio lo que falte. Oír un «sí» de medio segundo le cuesta lo
 * mismo que oír treinta segundos de conversación. Medido en el equipo de sala:
 * de los 7 s que tarda una ventana, casi 5 son esa pasada fija. Un capítulo de
 * 450 parlamentos pagaba 450 pasadas.
 *
 * CÓMO SE HACE AHORA.
 *   1. Se busca dónde hay VOZ, mirando la energía del audio.
 *   2. Los trozos con voz se juntan en tramos de 29 s, saltándose el silencio
 *      de en medio. Un capítulo de 45 minutos con 25 de voz son unas 55
 *      pasadas en vez de 450.
 *   3. Los tramos se reparten entre varios trabajadores, uno por núcleo.
 *   4. El reconocedor devuelve cada palabra con su tiempo, y con ese tiempo se
 *      sabe a qué parlamento pertenece.
 *
 * Y DE PASO ACIERTA MÁS. Un trocito suelto de dos segundos, sin nada antes ni
 * después, es lo peor que se le puede dar a un reconocedor. Medido con un
 * premix de prueba de 72 parlamentos, 8 de ellos cambiados a propósito:
 *
 *                                         antes     ahora
 *     tiempo                              244 s      50 s
 *     dichos tal cual y marcados          23 de 64   9 de 64
 *     cambios de verdad encontrados       7 de 8     7 de 8
 *
 * Oyendo la conversación seguida entiende mucho mejor, y comparando por cómo
 * SUENAN las palabras —`anaFonetica`— deja de contar como cambio lo que solo
 * está mal escrito.
 *
 * Aquí está la LÓGICA, que es lo que se prueba. El reconocedor corre aparte,
 * en `analisis-worker.js`.
 */

/* Las medidas del análisis, en un solo sitio y con su porqué. */
const ANA = {
  sr: 16000,        // lo que pide el reconocedor: mono a 16 kHz
  paso: 0.02,       // cada cuánto se mide la energía, en segundos
  tramo: 29,        // segundos por tramo: la ventana del reconocedor es de 30
  relleno: 0.2,     // lo que se deja a cada lado de un trozo con voz
  juntar: 0.6,      // dos trozos más cerca que esto son el mismo
  minimo: 0.12,     // menos que esto no es voz: es un chasquido
  hueco: 0.3,       // el silencio que queda entre dos trozos dentro de un tramo
  margen: 1.2,      // cuánto puede salirse una palabra de la ventana de su parlamento
  holgura: 0.3,     // lo que no se fía uno de los bordes de esa ventana
  acotacion: 6,     // palabras que puede durar un paréntesis sin cerrar
  casi: 0.5,        // lo que cuenta una palabra casi igual: una letra de más o de menos
  trabajadores: 4,  // como mucho, por muchos núcleos que haya
  espera: 240000    // un tramo que tarda más que esto es que el trabajador se colgó
};

const ANA_TRABAJADOR = './js/analisis-worker.js';

/* ── 0 · Con qué se escucha ──────────────────────────────────────────────── */

/**
 * Los tres OÍDOS, de más rápido a más fiel. Pedido de sala: «la transcripción
 * aún no es tan fiel, mejora cómo escucha». Se elige en QC y se recuerda.
 *
 * Medidos con el premix de prueba —72 parlamentos, 8 cambiados a propósito,
 * dos minutos y medio de voz— en el equipo de sala, de cuatro hilos:
 *
 *                   palabras mal oídas   avisos falsos   cambios cazados   tarda
 *     antes              14 de 100           9 de 64          7 de 8        35 s
 *     rápido              9 de 100           1 de 64          7 de 8        34 s
 *     fiel                4 de 100           3 de 64          8 de 8        60 s
 *     muy fiel            1 de 100           0 de 64          8 de 8       160 s
 *
 * Por qué el rápido oye mejor que el de antes sin tardar más: el modelo son dos
 * piezas, la que ESCUCHA —el codificador— y la que escribe. La que escucha se
 * bajaba comprimida a 8 bits, y es donde más se pierde: sin comprimir se
 * equivoca un tercio menos y tarda lo mismo. Pesa 20 MB más, una vez.
 * En el muy fiel no: sin comprimir serían 350 MB más.
 *
 * Desde cuándo AVISA cada uno —`dif`, `u`—. Con un oído fiel, UNA palabra
 * distinta ya es un cambio. El rápido se equivoca en una o dos palabras a
 * menudo, y si avisara de cada una avisaría de medio capítulo: pide tres
 * palabras, o que la frase no se parezca. Por eso no caza una palabra suelta
 * cambiada; para eso está el fiel.
 *
 * `ritmo`: segundos de trabajo por segundo de voz, medidos ahí. Solo para decir
 * cuánto va a tardar antes de empezar; el equipo de cada uno lo corrige.
 */
const ANA_OIDOS = {
  rapido: {
    nombre: 'rápido', modelo: 'Xenova/whisper-tiny',
    opciones: { dtype: { encoder_model: 'fp32', decoder_model_merged: 'q8' } },
    mb: 63, trabajadores: 4, dif: 3, u: 0.6, ritmo: 0.23,
    dice: 'Para un primer vistazo. Avisa de las frases que cambian, no de una palabra suelta.'
  },
  fiel: {
    nombre: 'fiel', modelo: 'Xenova/whisper-base',
    opciones: { dtype: { encoder_model: 'fp32', decoder_model_merged: 'q8' } },
    mb: 133, trabajadores: 3, dif: 1, u: 0.72, ritmo: 0.4,
    dice: 'El de cada día. Avisa en cuanto una palabra no es la del libreto.'
  },
  muyfiel: {
    nombre: 'muy fiel', modelo: 'Xenova/whisper-small',
    opciones: { dtype: 'q8' },
    mb: 240, trabajadores: 2, dif: 1, u: 0.72, ritmo: 1.05,
    dice: 'Para la entrega final. Casi no se equivoca, y tarda unas cinco veces más que el rápido.'
  }
};
const ANA_OIDO_DEFECTO = 'fiel';
const ANA_OIDO_GUARDADO = 'ddl_oido';
const ANA_RITMO_GUARDADO = 'ddl_oido_ritmo';

/** La clave de un oído que existe: la que se pide, o la de por defecto. */
function anaOido(clave){
  return Object.prototype.hasOwnProperty.call(ANA_OIDOS, clave) ? clave : ANA_OIDO_DEFECTO;
}

/** El oído elegido en este equipo. Sin elegir, el fiel. */
function anaOidoElegido(){
  try{ return anaOido(localStorage.getItem(ANA_OIDO_GUARDADO)); }
  catch(e){ return ANA_OIDO_DEFECTO; /* sin almacén se usa el de por defecto */ }
}

/** Elige un oído y lo recuerda. Devuelve la clave que queda. */
function anaOidoElegir(clave){
  const k = anaOido(clave);
  try{ localStorage.setItem(ANA_OIDO_GUARDADO, k); }
  catch(e){ /* sin almacén se usa, pero no se recuerda */ }
  return k;
}

/** Segundos de trabajo por segundo de voz: lo medido en ESTE equipo si ya se
    analizó con ese oído, y si no el de la tabla. */
function anaRitmo(clave){
  const k = anaOido(clave);
  try{
    const g = JSON.parse(localStorage.getItem(ANA_RITMO_GUARDADO) || '{}');
    if(g && isFinite(+g[k]) && +g[k] > 0) return +g[k];
  }catch(e){ /* sin almacén, o guardado roto: el de la tabla */ }
  return ANA_OIDOS[k].ritmo;
}

/** Apunta lo que ha tardado de verdad. Un audio de menos de medio minuto de voz
    no dice nada —casi todo es arrancar— y no se apunta. */
function anaRitmoGuardar(clave, segundos, voz){
  if(!(+voz >= 30) || !(+segundos > 0)) return false;
  const k = anaOido(clave);
  try{
    let g = {};
    try{ g = JSON.parse(localStorage.getItem(ANA_RITMO_GUARDADO) || '{}') || {}; }catch(e){ g = {}; }
    g[k] = +(+segundos / +voz).toPrecision(4);
    localStorage.setItem(ANA_RITMO_GUARDADO, JSON.stringify(g));
    return true;
  }catch(e){ return false; /* sin almacén no se apunta */ }
}

/** Cuánto va a tardar con ese oído, en segundos, para `voz` segundos de voz. */
function anaEstima(clave, voz){
  return (+voz > 0) ? +voz * anaRitmo(clave) : 0;
}

/**
 * Si un parlamento se avisa, y cómo: 'mal' si no cuadra, 'dudoso' si algo no
 * es lo del libreto, y nulo si cuadra.
 *
 * `r` es un resultado: `{ sim, dif, o }`. Sin `o` es de antes de que hubiera
 * oídos —o se oyó en la propia página, con el de siempre—, y se mide como
 * entonces: solo por el parecido.
 */
function anaAviso(r, mal, dudoso){
  if(!r || !isFinite(+r.sim)) return null;
  if(+r.sim < mal) return 'mal';
  const oido = (r.o && Object.prototype.hasOwnProperty.call(ANA_OIDOS, r.o)) ? ANA_OIDOS[r.o] : null;
  if(!oido || !isFinite(+r.dif)) return (+r.sim < dudoso) ? 'dudoso' : null;
  return (+r.dif >= oido.dif - 1e-9 || +r.sim < oido.u) ? 'dudoso' : null;
}

/* ── 1 · Dónde hay voz ────────────────────────────────────────────────────── */

/** La energía del audio, una medida cada `paso` segundos. */
function anaEnergia(pcm, sr, paso){
  const n = Math.max(1, Math.round(sr * paso));
  const cuantas = Math.floor(pcm.length / n);
  const out = new Float32Array(cuantas);
  for(let i = 0; i < cuantas; i++){
    let s = 0;
    const a = i * n;
    for(let j = 0; j < n; j++){ const v = pcm[a + j]; s += v * v; }
    out[i] = Math.sqrt(s / n);
  }
  return out;
}

/**
 * A partir de qué energía se cuenta como voz.
 *
 * Relativo a lo FUERTE del propio audio, no un número fijo: un premix grabado
 * bajo tiene la voz donde otro tiene el ruido de fondo. Se toma lo que suena
 * casi más fuerte —no lo más fuerte del todo, que puede ser un golpe— y se
 * baja 28 dB. Con un suelo, para que el silencio digital no cuente nunca.
 */
function anaUmbral(energia){
  if(!energia || !energia.length) return 0.0015;
  const salto = Math.max(1, Math.floor(energia.length / 20000));
  const muestra = [];
  for(let i = 0; i < energia.length; i += salto) muestra.push(energia[i]);
  muestra.sort((a, b) => a - b);
  const fuerte = muestra[Math.min(muestra.length - 1, Math.floor(muestra.length * 0.98))];
  return Math.max(0.0015, fuerte * 0.04);
}

/**
 * Los trozos con voz, en segundos: `[{ a, b }]`.
 *
 * Primero se JUNTAN los que están cerca y después se tiran los cortos, en ese
 * orden: una consonante suelta pegada a su palabra no es un chasquido, y al
 * revés se perdería el final de muchas frases.
 */
function anaVoces(energia, paso, umbral, duracion){
  const crudos = [];
  let a = -1;
  for(let i = 0; i <= energia.length; i++){
    const voz = i < energia.length && energia[i] > umbral;
    if(voz && a < 0) a = i;
    else if(!voz && a >= 0){ crudos.push([a * paso, i * paso]); a = -1; }
  }
  const juntos = [];
  for(const r of crudos){
    const u = juntos[juntos.length - 1];
    if(u && r[0] - u[1] < ANA.juntar) u[1] = r[1];
    else juntos.push([r[0], r[1]]);
  }
  const fin = isFinite(+duracion) ? +duracion : energia.length * paso;
  const out = [];
  for(const r of juntos){
    if(r[1] - r[0] < ANA.minimo) continue;
    const x = Math.max(0, r[0] - ANA.relleno);
    const y = Math.min(fin, r[1] + ANA.relleno);
    const u = out[out.length - 1];
    if(u && x <= u.b) u.b = Math.max(u.b, y);
    else out.push({ a: x, b: y });
  }
  return out;
}

/**
 * Un trozo más largo que un tramo se parte, y se parte por donde MENOS suena
 * del último tercio: cortar por la mitad de una palabra la estropea para los
 * dos lados.
 */
function anaPartir(trozos, energia, paso, tope){
  const out = [];
  for(const t0 of trozos){
    let r = { a: t0.a, b: t0.b };
    let vueltas = 0;
    while(r.b - r.a > tope && vueltas++ < 10000){
      const desde = Math.max(0, Math.floor((r.a + tope * 0.66) / paso));
      const hasta = Math.min(energia.length - 1, Math.floor((r.a + tope) / paso));
      let k = hasta, menor = Infinity;
      for(let i = desde; i <= hasta; i++) if(energia[i] < menor){ menor = energia[i]; k = i; }
      /* Por la MITAD del silencio, no por su primer instante: ahí acaba de
         terminar la voz, y cortar pegado a ella se lleva la última sílaba. */
      let k1 = k;
      while(k1 + 1 <= hasta && energia[k1 + 1] <= menor + 1e-9) k1++;
      let corte = ((k + k1 + 1) / 2) * paso;
      /* Sin medidas donde buscar, se corta al tope: avanzar hay que avanzar. */
      if(!(corte > r.a + 1) || !(corte < r.b)) corte = r.a + tope;
      out.push({ a: r.a, b: corte });
      r = { a: corte, b: r.b };
    }
    out.push(r);
  }
  return out;
}

/* ── 2 · Los tramos ──────────────────────────────────────────────────────── */

/**
 * Junta los trozos con voz en tramos de `tope` segundos como mucho.
 * Cada tramo es `{ piezas: [{a, b}], dur }`: dentro van los trozos uno detrás
 * de otro con `hueco` segundos de silencio entre medias, y lo que había en
 * medio en el audio —los silencios largos— se salta.
 */
function anaTramos(trozos, tope, hueco){
  const out = [];
  let act = null;
  for(const r of trozos){
    const d = r.b - r.a;
    if(!(d > 0)) continue;
    if(act && act.dur + hueco + d <= tope){
      act.piezas.push({ a: r.a, b: r.b });
      act.dur += hueco + d;
    }else{
      act = { piezas: [{ a: r.a, b: r.b }], dur: d };
      out.push(act);
    }
  }
  return out;
}

/**
 * El audio de un tramo, ya montado, y el MAPA para volver: a qué segundo del
 * audio de verdad corresponde cada segundo del tramo. Sin el mapa, los tiempos
 * que da el reconocedor serían del tramo y no servirían para nada.
 */
function anaMontar(pcm, sr, tramo, hueco){
  const h = Math.round(hueco * sr);
  const cortes = tramo.piezas.map(p => {
    const a = Math.max(0, Math.min(pcm.length, Math.round(p.a * sr)));
    const b = Math.max(a, Math.min(pcm.length, Math.round(p.b * sr)));
    return [a, b];
  });
  let n = 0;
  cortes.forEach((c, i) => { n += (c[1] - c[0]) + (i ? h : 0); });
  const out = new Float32Array(n);
  const mapa = [];
  let pos = 0;
  cortes.forEach((c, i) => {
    if(i) pos += h;
    if(c[1] > c[0]) out.set(pcm.subarray(c[0], c[1]), pos);
    mapa.push({ t: pos / sr, a: c[0] / sr, d: (c[1] - c[0]) / sr });
    pos += c[1] - c[0];
  });
  return { pcm: out, mapa: mapa };
}

/** Del segundo del tramo al segundo del audio de verdad. Lo que cae en el
    silencio de entre dos piezas se queda al final de la anterior. */
function anaTiempo(mapa, t){
  if(!mapa || !mapa.length) return +t || 0;
  let p = mapa[0];
  for(const m of mapa){ if(m.t <= t) p = m; else break; }
  return p.a + Math.max(0, Math.min(p.d, t - p.t));
}

/* ── 3 · Las palabras ────────────────────────────────────────────────────── */

const ANA_HASTA_29 = ['cero','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve','diez',
  'once','doce','trece','catorce','quince','dieciseis','diecisiete','dieciocho','diecinueve','veinte',
  'veintiuno','veintidos','veintitres','veinticuatro','veinticinco','veintiseis','veintisiete',
  'veintiocho','veintinueve'];
const ANA_DECENAS = ['','','','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
const ANA_CIENTOS = ['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos',
  'setecientos','ochocientos','novecientos'];

/**
 * Un número, en letras y ya sin tildes: 42 da «cuarenta y dos».
 *
 * El reconocedor escribe los números con cifras y el libreto con letras. Sin
 * esto, «solo cinco minutos» contra «solo 5 minutos» salía como cambio, y un
 * «cuarenta y dos» contra «42» perdía tres palabras de golpe.
 * Devuelve nulo con lo que no sabe decir.
 */
function anaNumero(n){
  n = +n;
  if(!isFinite(n) || n < 0 || n > 999999 || Math.floor(n) !== n) return null;
  if(n < 30) return [ANA_HASTA_29[n]];
  if(n < 100){
    const u = n % 10;
    return u ? [ANA_DECENAS[Math.floor(n / 10)], 'y', ANA_HASTA_29[u]] : [ANA_DECENAS[n / 10]];
  }
  if(n === 100) return ['cien'];
  if(n < 1000){
    const r = n % 100;
    return [ANA_CIENTOS[Math.floor(n / 100)]].concat(r ? anaNumero(r) : []);
  }
  const miles = Math.floor(n / 1000), r = n % 1000;
  return (miles === 1 ? ['mil'] : anaNumero(miles).concat(['mil'])).concat(r ? anaNumero(r) : []);
}

/** Un texto sin sus acotaciones: «(ríe)», «[Música]», «*suspira*». No se dicen,
    así que no se comparan, ni en lo escrito ni en lo oído. */
function anaSinAcotaciones(texto){
  return String(texto == null ? '' : texto).replace(/\[[^\]]*\]|\([^)]*\)|\*[^*]*\*/g, ' ');
}

/**
 * Una palabra escrita como SUENA, para comparar lo que se oye.
 *
 * El reconocedor escribe de oído, y en español muchas letras suenan igual: la
 * hache no suena, la be y la uve son la misma, la elle y la ye también, y la
 * zeta, la ce y la ese —en el doblaje latino— suenan igual. Por eso escribía
 * «adormido» por «ha dormido», «vais» por «bais» o «hoy es» por «oyes», y todo
 * eso salía como un cambio. Lo que suena igual no es un cambio: el actor no
 * puede haberlo dicho distinto.
 *
 * Lo que SÍ suena distinto se queda distinto: «hija» e «hijo», «pero» y
 * «perro» —la erre doble se conserva—, «diez» y «quince».
 */
function anaFonetica(p){
  return String(p == null ? '' : p)
    .replace(/ch/g, '§')              // la «ch» es un sonido propio: se aparta
    .replace(/h/g, '')                // la hache no suena
    .replace(/qu/g, 'k')
    .replace(/c(?=[ei])/g, 's')       // ce, ci, zeta y ese suenan igual
    .replace(/z/g, 's')
    .replace(/c/g, 'k')               // la ce que queda suena como la ka
    .replace(/g(?=[ei])/g, 'j')       // ge y gi suenan como la jota
    .replace(/v/g, 'b')
    .replace(/ll/g, 'i')              // elle, ye e i suenan igual
    .replace(/y/g, 'i')
    .replace(/([bdfjklmnpstx§])\1+/g, '$1');   // «sc» delante de e: una sola ese
}

/** Las palabras de un texto, listas para comparar: sin tildes, sin signos, sin
    acotaciones, con los números en letras y escritas como suenan. */
function anaPalabras(texto){
  const out = [];
  anaSinAcotaciones(texto).split(/[\s\-–—\/]+/).forEach(w => {
    if(!w) return;
    /* Las cifras con su punto de millar -«1.500»- son un número, no dos. */
    const cifras = w.replace(/^[^\d\p{L}]+|[^\d\p{L}]+$/gu, '');
    if(/^\d{1,3}([.,]\d{3})+$/.test(cifras) || /^\d+$/.test(cifras)){
      const letras = anaNumero(parseInt(cifras.replace(/[.,]/g, ''), 10));
      if(letras){ letras.forEach(l => out.push(anaFonetica(l))); return; }
    }
    const p = anaFonetica(karNorm(w));
    if(p) out.push(p);
  });
  return out;
}

/**
 * Dos palabras dichas seguidas, juntas como SUENAN: cuando una acaba con la
 * letra con la que empieza la otra, al hablar se funden en una sola. «De
 * espacio» suena «despacio», «he estado» suena «estado» y «estás segura»
 * suena «estasegura». La erre y la i no se funden: «dar risa» no es «darisa».
 */
function anaUnir(x, y){
  x = x || ''; y = y || '';
  if(!x || !y) return x + y;
  const c = x[x.length - 1];
  return (c === y[0] && /[aeobdfjklmnpstx§]/.test(c)) ? x + y.slice(1) : x + y;
}

/**
 * Junta las palabras que el reconocedor partió, o que partió el libreto.
 *
 * Oye bien, pero corta mal: «está vais» por «estabais», «hoy es» por «oyes»,
 * «adormido» por «ha dormido». Dos palabras seguidas de un lado que juntas son
 * una del otro lado se tratan como una. Solo si juntas son esa palabra y no
 * son ya las dos palabras del otro lado: «de la» contra «de la» no se toca.
 *
 * Y a veces corta por OTRO sitio: «de lospital» por «del hospital», «cerebre
 * be» por «seré breve». Mismas letras, otro corte: dos y dos que juntas suenan
 * igual se juntan en los dos lados. Medido con el oído fiel: la mitad de los
 * avisos falsos eran esto.
 * Devuelve `[escritas, oidas]`, las dos ya juntadas.
 */
function anaJuntar(a, b){
  /* Dos de `lado` que juntas son una de `otro`: fundidas o tal cual, que
     «leer» partido en «le er» también es «leer». */
  const uno = (lado, otro) => {
    const hay = new Set(otro);
    const out = [];
    for(let j = 0; j < lado.length; j++){
      let k = null;
      if(j + 1 < lado.length && !(hay.has(lado[j]) && hay.has(lado[j + 1]))){
        const f = anaUnir(lado[j], lado[j + 1]), t = lado[j] + lado[j + 1];
        k = hay.has(f) ? f : (hay.has(t) ? t : null);
      }
      if(k){ out.push(k); j++; }
      else out.push(lado[j]);
    }
    return out;
  };
  const b1 = uno(b, a);
  const a1 = uno(a, b1);
  /* Dos de `lado` que juntas suenan como dos de `otro` juntas. */
  const dos = (lado, otro) => {
    const juntas = new Set(), tal = new Set();
    for(let i = 0; i + 1 < otro.length; i++){
      juntas.add(anaUnir(otro[i], otro[i + 1]));
      tal.add(otro[i] + ' ' + otro[i + 1]);
    }
    const out = [];
    for(let i = 0; i < lado.length; i++){
      if(i + 1 < lado.length){
        const k = anaUnir(lado[i], lado[i + 1]);
        if(juntas.has(k) && !tal.has(lado[i] + ' ' + lado[i + 1])){ out.push(k); i++; continue; }
      }
      out.push(lado[i]);
    }
    return out;
  };
  return [dos(a1, b1), dos(b1, a1)];
}

/**
 * Si dos palabras son CASI la misma: una letra de más o de menos, nada más.
 *
 * Es el fallo más común del reconocedor: se come una ese final —«esta» por
 * «estás», «puede» por «puedes»— o le sobra una letra —«dejen» por «dejé»—.
 * Cambiar una letra por OTRA no es casi lo mismo: «niño» y «niña», «hijo» e
 * «hija» son cambios de verdad, y un reconocedor bueno no los confunde.
 */
function anaCasi(x, y){
  x = x || ''; y = y || '';
  const c = x.length < y.length ? x : y;
  const l = x.length < y.length ? y : x;
  if(c.length < 2 || l.length !== c.length + 1) return false;
  let i = 0;
  while(i < c.length && c[i] === l[i]) i++;
  return c.slice(i) === l.slice(i + 1);
}

/**
 * Lo que devolvió el reconocedor para un tramo, convertido en palabras sueltas
 * con su tiempo en el AUDIO DE VERDAD: `[{ p, t, txt }]`.
 *
 * `p` es la palabra lista para comparar; `txt`, lo que escribió el reconocedor
 * tal cual, y solo lo lleva la primera cuando una se convierte en varias —«42»
 * en tres—: así lo oído se puede volver a escribir sin repetirlo.
 * Las acotaciones se quitan aunque ocupen varias palabras.
 */
function anaOidas(items, mapa){
  const out = [];
  let cierre = '', abierto = 0;
  (items || []).forEach(it => {
    const crudo = String((it && it.text) || '');
    const ts = (it && it.timestamp) || [];
    /* `+null` es 0: sin mirarlo aparte, una palabra sin tiempo caería en el
       segundo cero del tramo, en el parlamento que no es. */
    if(ts[0] == null || ts[0] === '') return;
    const t0 = +ts[0];
    if(!isFinite(t0)) return;
    const t1 = (ts[1] == null || !isFinite(+ts[1])) ? t0 + 0.2 : Math.max(t0, +ts[1]);
    /* Un paréntesis que el reconocedor abre y no cierra no puede comerse el
       resto del tramo: una acotación son dos o tres palabras, no veinte. */
    if(cierre && ++abierto > ANA.acotacion){ cierre = ''; abierto = 0; }
    let limpio = '';
    for(const ch of crudo){
      if(cierre){ if(ch === cierre){ cierre = ''; abierto = 0; } continue; }
      if(ch === '['){ cierre = ']'; abierto = 0; continue; }
      if(ch === '('){ cierre = ')'; abierto = 0; continue; }
      limpio += ch;
    }
    const ps = anaPalabras(limpio);
    if(!ps.length) return;
    const t = anaTiempo(mapa, (t0 + t1) / 2);
    ps.forEach((p, i) => out.push({ p: p, t: t, txt: i ? '' : limpio.trim() }));
  });
  return out;
}

/* ── 4 · A qué parlamento va cada palabra ────────────────────────────────── */

/**
 * Cuánto se parecen dos listas de palabras: cuántas tienen en común SIN perder
 * el orden, y eso partido por la más larga de las dos.
 *
 * Por la más larga y no por la escrita: así una frase a la que le han añadido
 * media docena de palabras tampoco cuadra, que es un cambio igual que quitarlas.
 * El orden cuenta —las mismas palabras al revés no son la misma frase—.
 *
 * Una palabra CASI igual —`anaCasi`— cuenta media. Y `dif` es cuántas palabras
 * no cuadran: las que faltan, las que sobran y las distintas, con las casi
 * iguales a media. Es lo que decide si se avisa —«una palabra distinta» se
 * entiende; un 88 % no—.
 */
function anaCasar(a0, b0){
  const [a, b] = anaJuntar(a0 || [], b0 || []);
  const m = a.length, n = b.length;
  if(!m || !n) return { comunes: 0, sim: 0, dif: Math.max(m, n) };
  let prev = new Float64Array(n + 1), cur = new Float64Array(n + 1);
  for(let i = 1; i <= m; i++){
    for(let j = 1; j <= n; j++){
      const e = (a[i - 1] === b[j - 1]) ? 1 : (anaCasi(a[i - 1], b[j - 1]) ? ANA.casi : 0);
      cur[j] = Math.max(prev[j], cur[j - 1], e ? prev[j - 1] + e : 0);
    }
    const t = prev; prev = cur; cur = t; cur.fill(0);
  }
  const mas = Math.max(m, n);
  return { comunes: prev[n], sim: prev[n] / mas, dif: mas - prev[n] };
}

/**
 * Lo que se oyó en UN parlamento, y cuánto se parece a lo escrito.
 *
 * `v0` y `v1` son la ventana del parlamento en segundos del audio, y `oidas`
 * todas las palabras oídas, por orden de tiempo.
 *
 * El timecode del libreto no es exacto nunca, así que los bordes de la ventana
 * no se toman al pie de la letra:
 *   · lo que cae BIEN DENTRO —a más de `holgura` de los bordes— es de este
 *     parlamento sí o sí, coincida o no: ahí es donde están los cambios;
 *   · lo que cae cerca de un borde, por dentro o hasta `margen` por fuera, es
 *     suyo solo si le viene bien. Puede ser el final del parlamento de antes,
 *     dicho un poco tarde, o el principio del siguiente.
 * De todos los repartos posibles se queda el que más se parece.
 */
function anaParlamento(escritas, v0, v1, oidas){
  let c0 = -1, c1 = -1, m0 = -1, m1 = -1;
  for(let i = 0; i < oidas.length; i++){
    const t = oidas[i].t;
    if(t < v0 - ANA.margen) continue;
    if(t > v1 + ANA.margen) break;
    if(c0 < 0) c0 = i;
    c1 = i + 1;
    if(t >= v0 + ANA.holgura && t <= v1 - ANA.holgura){ if(m0 < 0) m0 = i; m1 = i + 1; }
  }
  if(c0 < 0) return { sim: 0, oido: '', n: 0, dif: escritas.length };

  let mejor = null;
  const probar = (i0, i1) => {
    const trozo = [];
    for(let i = i0; i < i1; i++) trozo.push(oidas[i].p);
    const c = anaCasar(escritas, trozo);
    /* A igual parecido, el que más palabras casa; y a igual también, el más
       corto, que es el que menos le quita a los vecinos. */
    if(!mejor || c.sim > mejor.sim + 1e-9
       || (Math.abs(c.sim - mejor.sim) <= 1e-9 && (c.comunes > mejor.comunes + 1e-9
           || (Math.abs(c.comunes - mejor.comunes) <= 1e-9 && (i1 - i0) < (mejor.i1 - mejor.i0)))))
      mejor = { sim: c.sim, comunes: c.comunes, dif: c.dif, i0: i0, i1: i1 };
  };
  if(m0 >= 0){
    for(let i0 = c0; i0 <= m0; i0++) for(let i1 = m1; i1 <= c1; i1++) probar(i0, i1);
  }else{
    /* Nada cae bien dentro: o no se dijo, o se dijo pegado a un borde. */
    for(let i0 = c0; i0 <= c1; i0++) for(let i1 = i0; i1 <= c1; i1++) probar(i0, i1);
  }
  const txt = [];
  for(let i = mejor.i0; i < mejor.i1; i++) if(oidas[i].txt) txt.push(oidas[i].txt);
  return { sim: mejor.sim, oido: txt.join(' ').replace(/\s+/g, ' ').trim(), n: mejor.i1 - mejor.i0,
           dif: mejor.dif };
}

/**
 * El capítulo entero. `ventanas` es `[{ si, texto, v0, v1 }]`, en segundos del
 * audio, y `duracion` lo que dura el audio.
 *
 * Devuelve `{ por, fuera, sinTexto }`: el resultado de cada parlamento, cuántos
 * caen FUERA del audio —no se pueden comparar, y no es lo mismo que no haberse
 * dicho— y cuántos no traen nada que decir, que son solo acotaciones.
 */
function anaRepartir(ventanas, oidas, duracion){
  const lista = (oidas || []).slice().sort((a, b) => a.t - b.t);
  const por = {};
  let fuera = 0, sinTexto = 0;
  for(const v of (ventanas || [])){
    if(!v || !isFinite(+v.v0) || !isFinite(+v.v1)) continue;
    if(v.v1 <= 0 || v.v0 >= duracion){ fuera++; continue; }
    const escritas = anaPalabras(v.texto);
    if(!escritas.length){ sinTexto++; continue; }
    const r = anaParlamento(escritas, +v.v0, +v.v1, lista);
    por[v.si] = { sim: +r.sim.toFixed(3), dif: +(+r.dif || 0).toFixed(1), oido: String(r.oido || '').slice(0, 300) };
  }
  return { por: por, fuera: fuera, sinTexto: sinTexto };
}

/* ── 5 · El reparto del trabajo ──────────────────────────────────────────── */

/**
 * Cuántos trabajadores. Uno por núcleo menos el de la página, con tope; en un
 * equipo con poca memoria, dos como mucho —cada uno carga su copia del
 * reconocedor—; y nunca más trabajadores que tramos.
 */
function anaCuantos(nucleos, tramos, memoria, tope){
  let n = Math.floor(+nucleos || 2) - 1;
  if(isFinite(+memoria) && +memoria > 0 && +memoria <= 4) n = Math.min(n, 2);
  /* `tope`: los que admite el oído. Uno grande pesa tanto por copia que con
     más trabajadores no se gana: se pelean por la memoria. */
  n = Math.max(1, Math.min((+tope > 0) ? Math.min(+tope, ANA.trabajadores) : ANA.trabajadores, n));
  return Math.max(1, Math.min(n, Math.floor(+tramos) || 1));
}

/** Cuánto queda, dicho como se dice. Vacío mientras no se pueda saber: un
    «quedan 40 minutos» calculado con el primer tramo asusta y es mentira. */
function anaQueda(hecho, total, segundos){
  if(!(hecho > 0) || !(total > 0) || !(segundos > 0)) return '';
  if(hecho / total < 0.08) return '';
  const resta = Math.max(0, (total - hecho) * (segundos / hecho));
  if(resta < 50) return 'quedan unos ' + (Math.max(1, Math.round(resta / 10)) * 10) + ' s';
  return 'quedan unos ' + Math.max(1, Math.round(resta / 60)) + ' min';
}

/** Dejar respirar a la página sin usar un temporizador: con la pestaña en
    segundo plano el navegador los frena a uno por segundo, y el análisis se
    quedaba parado con solo cambiar de ventana. */
function anaRespiro(){
  return new Promise(r => {
    try{
      const c = new MessageChannel();
      c.port1.onmessage = () => { try{ c.port1.close(); }catch(e){ /* ya estaba cerrado */ } r(); };
      c.port2.postMessage(0);
    }catch(e){ setTimeout(r, 0); }
  });
}

/* Los trabajadores que hay ahora mismo en marcha, para poder pararlos. */
const ANA_ACTIVOS = [];

/**
 * Un trabajador, con sus peticiones numeradas: a cada una, su respuesta.
 *
 * `roto` dice que se CAYÓ —no arrancó, reventó, o dejó de contestar—, que no
 * es lo mismo que un tramo que falla: un trabajador caído no va a contestar
 * nunca más, y seguir mandándole trabajo es esperar para siempre. Por eso al
 * caerse suelta todo lo que tenía pendiente.
 */
function anaTrabajador(url){
  const w = new Worker(url, { type: 'module' });
  const esperas = new Map();
  let sig = 1;
  const tirar = (err) => {
    esperas.forEach(e => { clearTimeout(e.reloj); e.no(err); });
    esperas.clear();
  };
  const yo = {
    cerrado: false,
    roto: false,
    /* `tope`: cuánto se espera la respuesta, en milisegundos. Sin tope, para
       lo que tarda lo que tarde —bajar el modelo depende de la red—. */
    pedir(que, datos, pasar, bajando, tope){
      if(yo.cerrado) return Promise.reject(new Error(yo.roto ? 'el trabajador se ha caído' : 'parado'));
      const id = sig++;
      return new Promise((si, no) => {
        const e = { si: si, no: no, bajando: bajando, reloj: 0 };
        if(tope > 0) e.reloj = setTimeout(() => {
          yo.roto = true;
          yo.cerrar(new Error('el trabajador no contesta'));
        }, tope);
        esperas.set(id, e);
        try{ w.postMessage(Object.assign({ que: que, id: id }, datos || {}), pasar || []); }
        catch(err){ esperas.delete(id); clearTimeout(e.reloj); no(err); }
      });
    },
    cerrar(err){
      if(yo.cerrado) return;
      yo.cerrado = true;
      try{ w.terminate(); }catch(e){ /* ya estaba cerrado */ }
      tirar(err || new Error('parado'));
      const i = ANA_ACTIVOS.indexOf(yo);
      if(i >= 0) ANA_ACTIVOS.splice(i, 1);
    }
  };
  w.onmessage = (ev) => {
    const m = (ev && ev.data) || {};
    const e = esperas.get(m.id);
    if(!e) return;
    if(m.que === 'bajando'){ if(e.bajando) e.bajando(m); return; }
    esperas.delete(m.id);
    clearTimeout(e.reloj);
    if(m.que === 'error') e.no(new Error(m.error || 'el trabajador falló'));
    else e.si(m);
  };
  w.onerror = (ev) => {
    try{ if(ev && ev.preventDefault) ev.preventDefault(); }catch(e){ /* no hay nada que evitar */ }
    yo.roto = true;
    yo.cerrar(new Error((ev && ev.message) || 'el trabajador se ha caído'));
  };
  ANA_ACTIVOS.push(yo);
  return yo;
}

/** Para todo lo que esté transcribiendo. Es lo que hace «Parar». */
function anaParar(){
  ANA_ACTIVOS.slice().forEach(w => w.cerrar());
}

/**
 * Transcribe los tramos y devuelve, de cada uno, lo oído y su mapa.
 *
 * `o`: { oido, idioma, avisa(hechoSeg, totalSeg, cuantos), bajando(m), parado() }.
 * `oido` es la clave de `ANA_OIDOS`; sin ella, el de por defecto.
 * Devuelve nulo si se paró a medias.
 *
 * El primer trabajador arranca solo: es el que baja el modelo la primera vez,
 * y si arrancaran todos a la vez lo bajarían todos. Los demás salen después,
 * ya de la copia guardada, mientras el primero va trabajando.
 * Un tramo que falla se intenta otra vez; si vuelve a fallar, se para y se
 * dice: dar por buenos los parlamentos de ese tramo sería mentir. Un
 * trabajador que se CAE devuelve su tramo a la cola y lo hacen los demás.
 */
async function anaTranscribir(pcm, tramos, o){
  o = o || {};
  const total = tramos.reduce((a, t) => a + t.dur, 0);
  const oido = ANA_OIDOS[anaOido(o.oido)];
  const n = anaCuantos((typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 2,
                       tramos.length,
                       (typeof navigator !== 'undefined' && navigator.deviceMemory) || 0,
                       oido.trabajadores);
  const pide = { lib: KARIA_LIB, modelo: oido.modelo, opciones: oido.opciones || {} };
  const como = { return_timestamps: 'word', language: o.idioma || 'spanish', task: 'transcribe' };
  const hechos = new Array(tramos.length);
  const cola = tramos.map((t, i) => i);
  const intentos = new Array(tramos.length).fill(0);
  const parado = () => !!(o.parado && o.parado());
  let hecho = 0, vivos = 0, roto = null, pendientes = tramos.length;

  /* Un trabajador que se queda sin tramos en la cola NO se va mientras otro
     tenga uno entre manos: si ese otro se cae, su tramo vuelve a la cola y
     alguien tiene que estar ahí para cogerlo. Irse antes lo dejaba sin oír —lo
     cazó una prueba—. Se espera a que cambie algo: un tramo que acaba, que
     vuelve, o un fallo. */
  let aviso = null;
  const cambio = () => { if(aviso){ const a = aviso; aviso = null; a.si(); } };
  const esperarCambio = () => {
    if(!aviso){ let si = null; const p = new Promise(r => { si = r; }); aviso = { p: p, si: si }; }
    return aviso.p;
  };

  const vuelta = async (w) => {
    vivos++;
    try{
      /* `roto`: otro ya falló sin remedio. Seguir sería gastar para nada. */
      while(pendientes > 0 && !parado() && !roto){
        if(!cola.length){ await esperarCambio(); continue; }
        const k = cola.shift();
        const m = anaMontar(pcm, ANA.sr, tramos[k], ANA.hueco);
        let r = null;
        try{
          r = await w.pedir('tramo', { pcm: m.pcm, opciones: como }, [m.pcm.buffer], null, ANA.espera);
        }catch(e){
          if(parado() || roto) return;
          /* Se cayó el trabajador, no el tramo: el tramo vuelve a la cola para
             los demás y este se retira. */
          if(w.roto){ cola.unshift(k); return; }
          if(++intentos[k] >= 2){
            roto = new Error('un tramo del audio no se pudo transcribir: ' + ((e && e.message) || e));
            throw roto;
          }
          cola.push(k);
          continue;
        }
        hechos[k] = { items: r.palabras || [], mapa: m.mapa };
        pendientes--;
        hecho += tramos[k].dur;
        if(o.avisa) o.avisa(hecho, total, vivos);
      }
    }finally{
      vivos--;
      /* Pase lo que pase aquí -acabar, caerse, fallar-, los que esperan tienen
         que enterarse: si no, se quedan esperando para siempre. */
      cambio();
    }
  };

  const mios = [];
  try{
    /* Si NI EL PRIMERO arranca, el fallo es de los trabajadores —el navegador
       no los deja, la red no baja el modelo— y no del audio: se marca, para
       que quien llama pruebe en la propia página en vez de rendirse. Un tramo
       que falla, en cambio, no se marca: repetirlo todo en la página solo
       tardaría más en fallar igual. */
    let primero = null;
    try{
      primero = anaTrabajador(ANA_TRABAJADOR);
      mios.push(primero);
      await primero.pedir('preparar', Object.assign({ avisaDescarga: true }, pide), null,
                          (m) => { if(o.bajando) o.bajando(m); });
    }catch(e){
      if(parado()) return null;
      const err = new Error((e && e.message) || String(e));
      err.sinTrabajadores = true;
      throw err;
    }
    if(parado()) return null;
    if(o.avisa) o.avisa(0, total, 1);
    const tareas = [vuelta(primero)];
    for(let i = 1; i < n; i++){
      tareas.push((async () => {
        let w = null;
        try{
          w = anaTrabajador(ANA_TRABAJADOR);
          mios.push(w);
          await w.pedir('preparar', pide);
        }catch(e){
          /* Uno que no arranca no tira el análisis: los demás siguen y se tarda
             algo más. Lo que sí hay que hacer es no dejarlo colgado. */
          if(w) w.cerrar();
          return;
        }
        await vuelta(w);
      })());
    }
    await Promise.all(tareas);
    if(parado()) return null;
    /* Con un bucle y no con `some`: `some` se salta los huecos de un array, y
       un tramo sin hacer ES un hueco. Con `some` pasaba por bueno. */
    let faltan = 0;
    for(let k = 0; k < tramos.length; k++) if(!hechos[k]) faltan++;
    if(faltan){
      /* Se cayeron todos antes de acabar: el fallo es de los trabajadores, y se
         dice así para que se pruebe en la propia página. */
      const err = new Error('los trabajadores se cayeron y quedaron ' + faltan + ' tramos sin oír');
      err.sinTrabajadores = true;
      throw err;
    }
    return hechos;
  }finally{
    mios.forEach(w => w.cerrar());
  }
}

/**
 * Lo mismo, pero en la propia página y de uno en uno. Es la salida cuando los
 * trabajadores no arrancan —un navegador viejo, una red que no deja—: se tarda
 * más, pero sigue siendo por tramos, que es donde está casi todo el ahorro.
 */
async function anaTranscribirAqui(pcm, tramos, o){
  o = o || {};
  const total = tramos.reduce((a, t) => a + t.dur, 0);
  const como = { return_timestamps: 'word', language: o.idioma || 'spanish', task: 'transcribe' };
  const hechos = [];
  let hecho = 0;
  for(let k = 0; k < tramos.length; k++){
    if(o.parado && o.parado()) return null;
    const m = anaMontar(pcm, ANA.sr, tramos[k], ANA.hueco);
    const out = await karIa.pipe(m.pcm, como);
    hechos.push({ items: (out && out.chunks) || [], mapa: m.mapa });
    hecho += tramos[k].dur;
    if(o.avisa) o.avisa(hecho, total, 1);
    await anaRespiro();
  }
  return hechos;
}

/** Las ventanas de los parlamentos, en segundos del audio. */
function anaVentanas(){
  const out = [];
  for(let si = 0; si < script.length; si++){
    const b = script[si];
    if(!b || b.tcEff == null) continue;
    const texto = (b.lines || []).join(' ');
    if(!texto.trim()) continue;
    const ven = karVentana(si);
    if(!ven) continue;
    out.push({ si: si, texto: texto, v0: karVid(ven[0]), v1: karVid(ven[1]) });
  }
  return out;
}

/** De lo que hay que comparar, qué tramos de audio hacen falta.
    Se busca la voz en el audio entero y se trocea. */
function anaPlan(pcm, sr){
  const energia = anaEnergia(pcm, sr, ANA.paso);
  const duracion = pcm.length / sr;
  const voces = anaVoces(energia, ANA.paso, anaUmbral(energia), duracion);
  const partidas = anaPartir(voces, energia, ANA.paso, ANA.tramo);
  const tramos = anaTramos(partidas, ANA.tramo, ANA.hueco);
  return { tramos: tramos, duracion: duracion,
           voz: tramos.reduce((a, t) => a + t.piezas.reduce((x, p) => x + (p.b - p.a), 0), 0) };
}
