/* Revisor ASREC · el motor
 *
 * Lee el Excel del guion de doblaje (la hoja «Dialogue List») y revisa cada
 * casilla DIALOGUE con tres ojos:
 *
 *   · las reglas del guion As-Recorded (ASREC) de Netflix: lo que se escribe es
 *     lo que se oye -números con letras, nada de abreviaturas ni símbolos-, la
 *     casilla nunca va vacía, las reacciones van entre paréntesis y en
 *     mayúsculas, la frase que sigue en otra fila se marca con «…» al final y
 *     al principio, y las etiquetas (MAIN TITLE IN DIALOGUE, SENSITIVE
 *     LANGUAGE…) tienen que casar con lo que se dice;
 *   · la ortografía, con el diccionario de LibreOffice y las normas de la RAE
 *     que sigue Netflix para el español (solo, guion, este sin tilde…);
 *   · la gramática que se puede afirmar sin entender la frase: concordancias,
 *     «a el», «haber si», dequeísmo, tildes diacríticas en interrogativas…
 *
 * Y una cosa que ningún corrector de Word hace: comparar el guion consigo
 * mismo. Un nombre con dos guías de pronunciación, «Diosa» y «diosa», un
 * personaje que en una fila se escribe KATHWA y en otra KATHAWA.
 *
 * No toca la red ni el DOM. Lo usan la pantalla (revisor-asrec.html) y las
 * pruebas (pruebas/revisorasrec.prueba.js), que lo sacan del HTML construido.
 */
'use strict';
const RevisorASREC = (() => {

/* ═══ LEER EL EXCEL ═════════════════════════════════════════════════════════
 * Un .xlsx es un zip de XML. El navegador ya sabe descomprimir (deflate-raw),
 * así que no hace falta ninguna biblioteca: se leen el directorio del zip, las
 * cadenas compartidas y las hojas. */

async function inflar(bytes){
  const flujo = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(flujo).arrayBuffer());
}

async function leerZip(buf){
  const u8 = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let fin = -1;
  for(let i = u8.length - 22; i >= Math.max(0, u8.length - 65557); i--)
    if(dv.getUint32(i, true) === 0x06054b50){ fin = i; break; }
  if(fin < 0) throw new Error('NO_ES_XLSX');
  const n = dv.getUint16(fin + 10, true);
  let p = dv.getUint32(fin + 16, true);
  const dec = new TextDecoder('utf-8');
  const entradas = {};
  for(let k = 0; k < n && dv.getUint32(p, true) === 0x02014b50; k++){
    const metodo = dv.getUint16(p + 10, true), tam = dv.getUint32(p + 20, true);
    const ln = dv.getUint16(p + 28, true), le = dv.getUint16(p + 30, true), lc = dv.getUint16(p + 32, true);
    const local = dv.getUint32(p + 42, true);
    const nombre = dec.decode(u8.subarray(p + 46, p + 46 + ln));
    p += 46 + ln + le + lc;
    const ini = local + 30 + dv.getUint16(local + 26, true) + dv.getUint16(local + 28, true);
    entradas[nombre] = { metodo, datos: u8.subarray(ini, ini + tam) };
  }
  return {
    nombres: Object.keys(entradas),
    async texto(nombre){
      const e = entradas[nombre];
      if(!e) return null;
      return dec.decode(e.metodo === 0 ? e.datos : await inflar(e.datos));
    }
  };
}

const ENTIDADES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const desXml = (s) => s
  .replace(/&(#x[0-9a-f]+|#\d+|\w+);/gi, (m, e) => e[0] !== '#' ? (ENTIDADES[e] ?? m)
    : String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)))
  .replace(/_x([0-9A-Fa-f]{4})_/g, (m, h) => String.fromCharCode(parseInt(h, 16)));

function atributos(s){
  const a = {};
  const re = /([\w:]+)\s*=\s*"([^"]*)"/g;
  let m;
  while((m = re.exec(s))) a[m[1]] = desXml(m[2]);
  return a;
}

/** El texto de un <si> o un <is>: todas sus <t>, sin la guía fonética <rPh>. */
function textos(x){
  x = x.replace(/<rPh\b[\s\S]*?<\/rPh>/g, '');
  let s = '', m;
  const re = /<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g;
  while((m = re.exec(x))) s += desXml(m[1]);
  return s;
}

function columna(ref){
  const letras = /^[A-Z]+/.exec(ref);
  let n = 0;
  for(const c of letras ? letras[0] : '') n = n * 26 + c.charCodeAt(0) - 64;
  return n - 1;
}

function leerHoja(xml, compartidas){
  const filas = [];
  const reFila = /<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g;
  let m, anterior = 0;
  while((m = reFila.exec(xml))){
    const a = atributos(m[1]);
    const r = a.r ? +a.r : anterior + 1;
    anterior = r;
    const celdas = [];
    const reC = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let c, col = -1;
    while((c = reC.exec(m[2] || ''))){
      const ca = atributos(c[1]);
      col = ca.r ? columna(ca.r) : col + 1;
      const cuerpo = c[2] || '';
      let v = '';
      if(ca.t === 'inlineStr') v = textos(cuerpo);
      else{
        const vm = /<v>([\s\S]*?)<\/v>/.exec(cuerpo);
        if(vm){ v = desXml(vm[1]); if(ca.t === 's') v = compartidas[+v] ?? ''; }
      }
      celdas[col] = v;
    }
    filas.push({ r, celdas: Array.from(celdas, x => x ?? '') });
  }
  return filas;
}

/** Todas las hojas del libro, por nombre y en orden. */
async function leerLibro(buf){
  const zip = await leerZip(buf);
  const wb = await zip.texto('xl/workbook.xml');
  if(!wb) throw new Error('NO_ES_XLSX');
  const rels = (await zip.texto('xl/_rels/workbook.xml.rels')) || '';
  const destino = {};
  for(const m of rels.matchAll(/<Relationship\b([^>]*)\/?>/g)){
    const a = atributos(m[1]);
    destino[a.Id] = a.Target.startsWith('/') ? a.Target.slice(1) : 'xl/' + a.Target.replace(/^\.\//, '');
  }
  const ssXml = (await zip.texto('xl/sharedStrings.xml')) || '';
  const compartidas = [];
  for(const m of ssXml.matchAll(/<si\b[^>]*>([\s\S]*?)<\/si>|<si\b[^>]*\/>/g)) compartidas.push(m[1] ? textos(m[1]) : '');
  const hojas = [];
  for(const m of wb.matchAll(/<sheet\b([^>]*)\/?>/g)){
    const a = atributos(m[1]);
    const ruta = destino[a['r:id']] || destino[Object.keys(a).find(k => /:id$/.test(k)) && a[Object.keys(a).find(k => /:id$/.test(k))]];
    const xml = ruta ? await zip.texto(ruta) : null;
    hojas.push({ nombre: a.name || '', filas: xml ? leerHoja(xml, compartidas) : [] });
  }
  return hojas;
}

/* Cómo se llama cada columna. Se casa la casilla ENTERA: «SOURCE ONSCREEN» no
   es la columna del personaje, ni «DIALOG WORD COUNT» la del diálogo. */
const COLUMNAS = {
  tcIn:     ['IN TIMECODE', 'TIMECODE IN', 'IN TC', 'TC IN', 'TC'],
  tcOut:    ['OUT TIMECODE', 'TIMECODE OUT', 'OUT TC', 'TC OUT'],
  source:   ['SOURCE', 'CHARACTER', 'CHARACTER NAME', 'PERSONAJE'],
  dialogo:  ['DIALOGUE', 'DIALOG', 'DIÁLOGO', 'DIALOGO'],
  anot:     ['ANNOTATIONS', 'ANNOTATION', 'NOTES', 'ANOTACIONES'],
  tags:     ['TAGS', 'TAG', 'ETIQUETAS'],
  pantalla: ['SOURCE ONSCREEN', 'ONSCREEN', 'ON SCREEN']
};
const cabecera = (s) => String(s || '').toUpperCase().replace(/[_\-]+/g, ' ').replace(/\s+/g, ' ').trim();

/** De las hojas, la lista de diálogos ya ordenada en filas con nombre. */
function extraerGuion(hojas){
  const conCab = (h) => {
    for(let i = 0; i < Math.min(h.filas.length, 15); i++)
      if(h.filas[i].celdas.some(c => COLUMNAS.dialogo.includes(cabecera(c)))) return i;
    return -1;
  };
  let hoja = hojas.find(h => /^dialogue\s*list$/i.test(h.nombre.trim()) && conCab(h) >= 0)
          || hojas.find(h => conCab(h) >= 0);
  if(!hoja) throw new Error('SIN_DIALOGUE');
  const ic = conCab(hoja);
  const cab = hoja.filas[ic].celdas.map(cabecera);
  const col = {};
  for(const k in COLUMNAS) col[k] = cab.findIndex(c => COLUMNAS[k].includes(c));
  const filas = [];
  for(const f of hoja.filas.slice(ic + 1)){
    const v = (k) => col[k] >= 0 ? String(f.celdas[col[k]] ?? '') : '';
    if(f.celdas.every(c => !String(c).trim())) continue;
    filas.push({ fila: f.r, tcIn: v('tcIn').trim(), tcOut: v('tcOut').trim(), source: v('source'),
                 dialogo: v('dialogo'), anot: v('anot'), tags: v('tags'), pantalla: v('pantalla').trim() });
  }
  const info = {};
  const pi = hojas.find(h => /project\s*info/i.test(h.nombre));
  if(pi) for(const f of pi.filas) if(f.celdas[0]) info[String(f.celdas[0]).trim().toUpperCase()] = String(f.celdas[1] ?? '').trim();
  return { hoja: hoja.nombre, filas, info, faltan: Object.keys(col).filter(k => col[k] < 0) };
}

/* ═══ EL DICCIONARIO ═══════════════════════════════════════════════════════ */

const VOS_SUELTAS = new Set(['vosotros', 'vosotras', 'vuestro', 'vuestra', 'vuestros', 'vuestras', 'os', 'sois']);
const VOS_FORMA = /(áis|éis|ais|eis|ís|steis|[aeií]d|[aeí]os|[aei]d(me|te|le|les|lo|los|la|las|nos|selo|sela|selos|selas))$/u;

/** `base`: las palabras correctas en todo el español. `extra`: las que solo
 *  trae el diccionario de España (casi todas, formas de «vosotros»). */
function crearDiccionario(base, extra, propias){
  const B = new Set(base), E = new Set(extra || []), P = new Set();
  const directo = (w) => B.has(w) || E.has(w) || P.has(w) || P.has(w.toLowerCase());
  /* Al diccionario le faltan femeninos y plurales: trae «arquero» pero no
     «arqueras», y «pandilla» solo como verbo. Si existe la forma masculina o
     la singular, la palabra se da por buena. */
  const tiene = (w) => directo(w)
    || /[aeiouáéíóú]s$/.test(w) && !/stes$/.test(w) && directo(w.slice(0, -1))
    || /[^aeiouáéíóú]es$/.test(w) && directo(w.slice(0, -2))
    || /as?$/.test(w) && directo(w.replace(/a(s?)$/, 'o$1'))
    || /oras?$/.test(w) && directo(w.replace(/a(s?)$/, '$1'));
  const d = {
    tamano: B.size + E.size,
    propias: P,
    poner(w){ w = String(w).trim(); if(w) P.add(w); },
    quitar(w){ P.delete(w); },
    /** ¿Está bien escrita? Mira también la versión en minúscula, para la
     *  primera palabra de la frase y los gritos en mayúsculas. */
    tiene(w){
      if(tiene(w)) return true;
      const l = w.toLowerCase();
      if(l !== w && tiene(l)) return true;
      /* «PERO» en un grito, o «Ahora» al principio de la frase. */
      return false;
    },
    esVos(w){
      const l = w.toLowerCase();
      if(VOS_SUELTAS.has(l)) return true;
      return E.has(l) && !B.has(l) && VOS_FORMA.test(l);
    }
  };
  if(propias) for(const w of propias) d.poner(w);
  return d;
}

const LETRAS = 'abcdefghijklmnñopqrstuvwxyzáéíóúü';
const TILDE = { a: 'á', e: 'é', i: 'í', o: 'ó', u: 'ú', á: 'a', é: 'e', í: 'i', ó: 'o', ú: 'u', ü: 'u', n: 'ñ', ñ: 'n' };
const sinTildes = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Las variantes con o sin tildes (y ñ) de una palabra: el error más común. */
function variantesTilde(w){
  const out = new Set();
  for(let i = 0; i < w.length; i++){
    const t = TILDE[w[i]];
    if(t) out.add(w.slice(0, i) + t + w.slice(i + 1));
    /* A veces sobra una tilde y falta otra: «ésta» por «está». */
    if(t) for(let j = i + 1; j < w.length; j++){
      const u = TILDE[w[j]];
      if(u) out.add(w.slice(0, i) + t + w.slice(i + 1, j) + u + w.slice(j + 1));
    }
  }
  out.delete(w);
  return Array.from(out);
}

/** Sugerencias: primero lo que solo cambia en tildes, después una edición. */
function sugerir(dic, w){
  const minus = w.toLowerCase();
  const mayus = w[0] !== minus[0];
  const vistas = new Set();
  const primero = [], resto = [];
  const probar = (c, lista) => { if(c !== minus && !vistas.has(c) && dic.tiene(c)){ vistas.add(c); lista.push(c); } };
  for(const v of variantesTilde(minus)) probar(v, primero);
  for(let i = 0; i <= minus.length; i++){
    const a = minus.slice(0, i), b = minus.slice(i);
    if(b) probar(a + b.slice(1), resto);
    if(b.length > 1) probar(a + b[1] + b[0] + b.slice(2), resto);
    for(const c of LETRAS){
      if(b) probar(a + c + b.slice(1), resto);
      probar(a + c + b, resto);
    }
  }
  /* Separadas: «aveces» → «a veces». */
  for(let i = 1; i < minus.length; i++){
    const x = minus.slice(0, i), y = minus.slice(i);
    if((x.length > 1 || 'aoyeu'.includes(x)) && y.length > 1 && dic.tiene(x) && dic.tiene(y)) resto.push(x + ' ' + y);
  }
  resto.sort((p, q) => (q[0] === minus[0]) - (p[0] === minus[0]) || Math.abs(p.length - minus.length) - Math.abs(q.length - minus.length));
  const todo = primero.concat(resto).slice(0, 5);
  return mayus ? todo.map(s => s[0].toUpperCase() + s.slice(1)) : todo;
}

/* ═══ LAS REGLAS ═══════════════════════════════════════════════════════════
 * El catálogo que ve la persona en la pestaña «Reglas». Cada hallazgo apunta a
 * una de estas, y se pueden apagar una a una. */

const CATEGORIAS = {
  asrec:      'Formato ASREC',
  puntuacion: 'Puntuación',
  ortografia: 'Ortografía',
  gramatica:  'Gramática',
  coherencia: 'Coherencia del guion',
  etiquetas:  'Etiquetas',
  estructura: 'Personajes y timecodes'
};

/* Las citas entre comillas son de las dos guías de Netflix: el As Recorded
   Dubbing Script Scope of Work y la Spanish (Latin America & Spain) Timed
   Text Style Guide. */
const R = {
  vacio:         ['asrec', 'Casilla de diálogo vacía', 'Guía ASR: «Rows with empty DIALOGUE column are not allowed». Se borra la fila o se escribe lo que se oye; si es una reacción, entre paréntesis: (GESTO).'],
  numeros:       ['asrec', 'Números', 'Guía de español: del 1 al 10 con letras, y también «cien» y «mil»; con letras al empezar la frase (salvo fechas y cifras largas); 2000 sin separador; 50 000 con espacio duro; decimales con punto en Latinoamérica (2.50) y con coma en España (2,50); las monedas, mejor con letras.'],
  abreviatura:   ['asrec', 'Abreviaturas', 'Guía de español: «Sr.» o «Dra.» solo justo delante de un nombre propio; solo, se escribe entero («¿Cuándo viene la señorita?»). Estados Unidos se abrevia «EE. UU.».'],
  simbolos:      ['asrec', 'Símbolos', 'Los símbolos que se dicen (&, @, +, =…) van con palabras. La guía ASR admite a propósito \\ ^ < > | para marcar pausas o indicaciones, y la de español admite # en etiquetas (#Amigos): esos no se avisan. La «/» tiene su propia regla.'],
  guiaPronunciacion:['asrec', 'Guía de pronunciación en el diálogo', 'Regla del estudio: la pronunciación entre paréntesis o corchetes («Kathawa (katáwa)») es un error y se quita del guion. Ojo: la guía ASR de Netflix sí permite escribirla junto al nombre; si un cliente la acepta, apaga esta regla. Mientras esté encendida no se avisa de nombres sin guía ni de guías distintas.'],
  barra:         ['asrec', 'Barra «/» en el diálogo', 'Regla del estudio: la «/» para marcar una pausa es un error. Ojo: la guía ASR de Netflix sí la permite; si un cliente la acepta, apaga esta regla.'],
  mayusSostenidas:['asrec', 'Palabras en MAYÚSCULAS', 'Guía ASR: el diálogo va «in sentence case […] Do not use ALL CAPS». Las siglas (ONU, FBI) sí van en mayúsculas.'],
  reaccionSigno: ['asrec', 'Reacción sin paréntesis', 'Guía ASR: las reacciones y esfuerzos van entre ( ), [ ] o { }, «There are no exceptions to this rule».'],
  reaccionBorde: ['asrec', 'Evento que empieza o termina en reacción', 'Guía ASR: «Do not time events to begin or end with a reaction or effort». El evento se cronometra con la primera y la última palabra.'],
  reaccionMayus: ['asrec', 'Reacciones escritas igual', 'Todas las reacciones del guion se escriben del mismo modo: si casi todas van en mayúsculas, (GESTO), las demás también.'],
  reaccionIngles:['asrec', 'Reacciones en inglés', 'En el guion en español las reacciones van en español: (RISA), no (LAUGHS).'],
  reaccionEstilo:['asrec', 'Signos de las reacciones', 'Todas las reacciones del guion se marcan con el mismo signo: paréntesis, corchetes o llaves, sin mezclar.'],
  contTres:      ['asrec', 'Continuación sin «…» al principio', 'Guía de español: «Do not use ellipses or dashes when an ongoing sentence is split between two or more continuous subtitles» y «do not use an ellipsis at the beginning of the second subtitle, unless the pause (2 seconds or more) was caused by an interruption». La continuación no empieza con «…» («Algunos tenemos que pensar» / «en esas cosas.»), salvo que otro personaje la haya interrumpido. «¿…» al volver a abrir una pregunta partida es estilo del estudio.'],
  contFin:       ['asrec', 'Interrupción: «…» al final', 'Guía de español: si otro personaje interrumpe la frase, «…» al final del evento cortado y al principio del que la retoma («Te iba a decir que…» / «¡No quiero saberlo!» / «…ya firmé el divorcio.»).'],
  contIni:       ['asrec', 'Interrupción: «…» al principio', 'Guía de español: la fila que retoma una frase después de que hable otro personaje empieza con «…».'],
  sinFinal:      ['asrec', 'Falta la puntuación final', 'Guía ASR: «proper punctuation, even if a sentence is split across multiple events». Si la frase no sigue en la fila siguiente, termina con su signo.'],
  preguntaPartida:['asrec', 'Pregunta o exclamación partida', 'Regla del estudio: la pregunta que sigue en el evento siguiente se cierra en cada evento y se vuelve a abrir, para que cada uno se lea entero: «¿Creen que se ganarán nuestra admiración…?» / «¿…y conseguirán su independencia?». Ojo: la guía de español de Netflix (para subtítulos) la abre una vez y la cierra una vez («¿Te ha…» / «disparado?»); si un cliente lo pide así, apaga esta regla.'],
  contMayus:     ['asrec', 'Continuación en mayúscula', 'La fila que continúa una frase que la anterior no cerró sigue en minúscula: «en esas cosas», no «En esas cosas».'],
  contSobra:     ['asrec', '«…» al principio sin continuación', 'Si la fila anterior del personaje ya cerró la frase con punto, «?» o «!», la siguiente no empieza con «…» (salvo que la haya interrumpido otro personaje).'],
  inicioMinus:   ['asrec', 'Empieza en minúscula', 'Guía ASR: el diálogo va «in sentence case». Empieza con mayúscula salvo que continúe la frase anterior.'],
  repetida:      ['asrec', 'Línea repetida', 'El mismo personaje dice exactamente lo mismo pocas filas después. Puede ser intencionado; la guía ASR pide quitar los eventos «redundant, or unnecessary».'],

  invisible:     ['puntuacion', 'Caracteres invisibles', 'Espacios de ancho cero, guiones blandos o espacios duros fuera de su sitio (la guía de español los pide en «50 000» y «15 %»).'],
  tresPuntos:    ['puntuacion', 'Tres puntos en vez de «…»', 'Guía de español: «use the single smart character (U+2026) as opposed to three dots».'],
  espacios:      ['puntuacion', 'Espacios dobles o sobrantes', 'Ni dobles espacios, ni espacios al principio o al final de la casilla, ni saltos de línea dentro.'],
  espacioSigno:  ['puntuacion', 'Espacios junto a los signos', 'Sin espacio antes de , . : ? ! ) ni después de ¿ ¡ (; con espacio después de , : y del punto.'],
  suspensivos:   ['puntuacion', 'Espacios junto a «…»', 'Guía de español: «…» seguido de espacio para una pausa dentro de la frase, y sin espacio al empezar a mitad de frase. Sin espacio antes de «…» ni coma delante.'],
  signosPares:   ['puntuacion', 'Signos de apertura y cierre', 'En español la pregunta y la exclamación se abren y se cierran: ¿…? ¡…!. Y todo paréntesis que se abre, se cierra.'],
  puntoTrasSigno:['puntuacion', 'Punto después de ? o !', 'Guía de español: «A period should never follow a closing question/exclamation mark».'],
  puntoYComa:    ['puntuacion', 'Punto y coma', 'Guía de español: «Do not use semicolons, punto y coma (;)».'],
  dobleSigno:    ['puntuacion', '¿? y ¡! juntos', 'Guía de español: no se juntan «?!»: «¡¿Cómo dices?!» debe ser «¿Cómo dices?» o «¡Cómo dices!».'],
  peroComa:      ['puntuacion', 'Coma después de «pero»', 'Guía de español (RAE): «Pero ¿dónde vas a estas horas?», sin coma antes de la pregunta o la exclamación.'],
  mayusPunto:    ['puntuacion', 'Mayúscula después de punto', 'Después de punto, y de «?» o «!» que cierran la frase, se escribe mayúscula.'],
  comillas:      ['puntuacion', 'Comillas', 'Guía de español: comillas dobles " " sin espacios, simples \' \' dentro de otras, y el punto después de las comillas: "Regresa mañana". Y la raya «—», no dos guiones.'],

  diccionario:   ['ortografia', 'Palabras que no están en el diccionario', 'Guía ASR: «should not have any spelling or typing errors unless they are intentional». Diccionario de español de LibreOffice; los nombres propios y las guías de pronunciación no se revisan.'],
  rae2010:       ['ortografia', 'Tildes que ya no se escriben', 'Según la Ortografía de la RAE (2010), que sigue Netflix: «solo», «este», «guion», «fue», «dio», «rio» sin tilde.'],
  pegadas:       ['ortografia', 'Palabras que van separadas', '«a veces», «tal vez», «o sea», «por favor», «de repente», «a través»…'],
  interrogativa: ['ortografia', 'Tilde en qué, cómo, dónde…', 'Los interrogativos y exclamativos llevan tilde: ¿Qué…?, ¿Cómo…?, ¿Dónde…?, ¡Cuánto…!'],
  diacritica:    ['ortografia', 'Tilde diacrítica (tú, mí, él, sé, sí, más)', 'Avisos probables, no seguros: tú/tu, mí/mi, él/el, sé/se, sí/si, más/mas, dé/de.'],
  vosotros:      ['ortografia', 'Formas de «vosotros» en latino', 'En un doblaje latinoamericano se usa «ustedes»: «ustedes saben», no «vosotros sabéis».'],

  todo:          ['gramatica', 'Concordancia con «todo»', '«todos tus esfuerzos», no «todo tus esfuerzos».'],
  contraccion:   ['gramatica', '«a el» y «de el»', 'Se contraen en «al» y «del», salvo con el pronombre: «a él», «de él».'],
  haberImpers:   ['gramatica', '«haber» impersonal', '«había muchas personas», no «habían»; «hubo», no «hubieron».'],
  homofonos:     ['gramatica', 'Homófonos', '«a ver» / «haber», «hecho» / «echo», «has» / «haz», «vaya» / «valla», «ay» / «hay», «a» / «ha».'],
  dequeismo:     ['gramatica', 'Dequeísmo y queísmo', '«creo que», no «creo de que»; «me di cuenta de que», no «me di cuenta que».'],
  comaVerbo:     ['gramatica', 'Coma entre el verbo y lo que sigue', 'RAE: no se separa con coma el verbo de su complemento: «Yo no sé cómo se le habrá ocurrido», no «Yo no sé, cómo…». Se mira también cuando la frase sigue en la fila siguiente.'],
  asiQue:        ['gramatica', 'Coma después de «así que»', '«Así que no me culpen», sin coma: «así que» no es un inciso.'],
  repeticion:    ['gramatica', 'Palabra repetida', '«de de», «que que»… Si es intencionado («no, no»), lleva coma.'],
  posesivo:      ['gramatica', '«detrás mío», «cerca tuyo»', 'En la norma culta: «detrás de mí», «cerca de ti».'],

  guias:         ['coherencia', 'Guías de pronunciación distintas', 'Guía ASR: la grafía fonética va entre ( ) o [ ] junto al nombre bien escrito. Y el mismo nombre lleva siempre la misma guía, escrita igual: «Makwathi (matwáti)».'],
  sinGuia:       ['coherencia', 'Nombre sin su guía de pronunciación', 'El nombre lleva guía en unas filas y en otras no.'],
  variantes:     ['coherencia', 'Un nombre escrito de dos maneras', 'Dos nombres casi iguales que probablemente son el mismo: «Kathawa» y «Kathwa».'],
  mayusculas:    ['coherencia', 'Mayúsculas inconsistentes', 'Un nombre común en mayúscula en unas filas y en minúscula en otras («Diosa» / «diosa»). La RAE lo quiere en minúscula; días y meses, siempre en minúscula.'],

  titulo:        ['etiquetas', 'MAIN TITLE IN DIALOGUE', 'Si se dice el título de la serie, la fila lleva la etiqueta MAIN TITLE IN DIALOGUE; si no se dice, no la lleva.'],
  sensible:      ['etiquetas', 'SENSITIVE LANGUAGE', 'Insultos y palabrotas llevan la etiqueta SENSITIVE LANGUAGE.'],
  anotacion:     ['etiquetas', 'Anotaciones y CONTEXT', 'Una anotación va con su etiqueta (CONTEXT…), y la etiqueta CONTEXT con su anotación.'],

  personaje:     ['estructura', 'Nombre del personaje', 'Guía ASR: «Every event should be attributed to the correct character». La columna SOURCE no va vacía, sin espacios sobrantes, y un personaje se escribe siempre igual.'],
  unPersonaje:   ['estructura', 'Un evento, un personaje', 'Guía ASR: «Do not list multiple characters in the same event». Si dicen lo mismo a la vez, se duplica el evento, uno por personaje.'],
  walla:         ['estructura', 'WALLA y NONE', 'Guía ASR: el personaje de murmullo empieza por WALLA y lo demás va tras «-» o «:» (WALLA - MERCADO); NONE solo para texto en pantalla.'],
  pantalla:      ['estructura', 'SOURCE ONSCREEN', 'Valores válidos: ON, OFF, ON_OFF, OFF_ON.'],
  timecode:      ['estructura', 'Timecodes', 'Formato HH:MM:SS:FF, la entrada antes que la salida y las filas en orden.']
};
/* De dónde sale cada regla, para que nadie tome una costumbre por una norma.
   «Netflix ASR»: la guía del As-Recorded Dubbing Script; «Netflix ES»: la
   guía de estilo de español (Latinoamérica y España); «RAE»: la Ortografía y
   la gramática de la Academia; «guion»: el guion comparado consigo mismo. */
const FUENTE = {
  guiaPronunciacion: 'estudio', barra: 'estudio', vacio: 'Netflix ASR', numeros: 'Netflix ES', abreviatura: 'Netflix ES', simbolos: 'Netflix ASR', mayusSostenidas: 'Netflix ASR',
  reaccionSigno: 'Netflix ASR', reaccionBorde: 'Netflix ASR', reaccionMayus: 'guion', reaccionIngles: 'guion', reaccionEstilo: 'guion',
  contTres: 'Netflix ES', contFin: 'Netflix ES', contIni: 'Netflix ES', contMayus: 'RAE', contSobra: 'guion', preguntaPartida: 'estudio', sinFinal: 'Netflix ASR', inicioMinus: 'Netflix ASR', repetida: 'Netflix ASR',
  invisible: 'Netflix ES', tresPuntos: 'Netflix ES', espacios: 'guion', espacioSigno: 'RAE', suspensivos: 'Netflix ES', signosPares: 'RAE',
  puntoTrasSigno: 'Netflix ES', puntoYComa: 'Netflix ES', dobleSigno: 'Netflix ES', peroComa: 'Netflix ES', mayusPunto: 'RAE', comillas: 'Netflix ES',
  diccionario: 'Netflix ASR', rae2010: 'RAE', pegadas: 'RAE', interrogativa: 'RAE', diacritica: 'RAE', vosotros: 'Netflix ES',
  todo: 'RAE', contraccion: 'RAE', haberImpers: 'RAE', homofonos: 'RAE', dequeismo: 'RAE', asiQue: 'RAE', comaVerbo: 'RAE', repeticion: 'RAE', posesivo: 'RAE',
  guias: 'Netflix ASR', sinGuia: 'guion', variantes: 'guion', mayusculas: 'RAE', titulo: 'Netflix ASR', sensible: 'Netflix ASR', anotacion: 'Netflix ASR',
  personaje: 'Netflix ASR', unPersonaje: 'Netflix ASR', walla: 'Netflix ASR', pantalla: 'Netflix ASR', timecode: 'Netflix ASR'
};
const REGLAS = Object.fromEntries(Object.entries(R).map(([id, [cat, titulo, desc]]) => [id, { id, cat, titulo, desc, fuente: FUENTE[id] || 'guion' }]));

/* ═══ UTILIDADES DE TEXTO ═══════════════════════════════════════════════════ */

/* \b de JavaScript no entiende de tildes: «está» tendría un borde antes de la
   «á». Esto es un borde de palabra de verdad, con letras de cualquier idioma. */
const L = '\\p{L}\\p{N}';
const BORDE = `(?:(?<![${L}])(?=[${L}])|(?<=[${L}])(?![${L}]))`;
const re = (src, flags = 'giu') => new RegExp(src.replace(/\\b/g, BORDE), flags);

const REACCION_ES = new Set(('gesto gestos bullicio risa risas ríe rie carcajada carcajadas llanto llora sollozo solloza grito gritos grita ' +
  'suspiro suspira jadeo jadea jadeos esfuerzo esfuerzos tos tose respira respiración respiraciones beso besos murmullo murmullos ' +
  'murmura quejido quejidos gemido gemidos gime exclamación reacción reacciones resoplido gruñido gruñe silbido silba tararea ' +
  'canturrea bostezo bosteza estornudo hipo susurro susurra golpe dolor sorpresa asombro risita risitas inaudible ininteligible').split(' '));
const REACCION_EN = /^(laughs?|laughing|laughter|chuckles?|giggles?|sighs?|gasps?|grunts?|groans?|screams?|screaming|cries|crying|sobs?|sobbing|efforts?|reactions?|breathing|breathes|panting|pants|coughs?|indistinct|walla|mumbles?|hums?|whispers?|shouts?|yells?|sniffs?|sniffles|kiss|kisses|exhales?|inhales?|scoffs?|moans?|non-?verbal|clears throat|yawns?|sneezes?)$/i;

/* Las que, escritas solas y sin paréntesis, solo pueden ser una reacción
   («Gesto.»). «Llora.» o «Grita.» también son órdenes: esas no entran. */
const REACCION_SUELTA = new Set('gesto gestos bullicio risa risas jadeo jadeos esfuerzo esfuerzos tos suspiro suspiros gemido gemidos quejido quejidos murmullo murmullos reacción reacciones carcajada carcajadas sollozo sollozos llanto'.split(' '));
const NUMEROS = 'cero uno dos tres cuatro cinco seis siete ocho nueve diez'.split(' ');
const ROMANO = /^(?=[IVXLCDM]+$)M{0,3}(CM|CD|D?C{0,3})(XC|XL|L?X{0,3})(IX|IV|V?I{0,3})$/;

/** ¿La casilla entera es una reacción? «(GESTO)», «[BULLICIO]», «(GESTOS) (RISA)». */
const esReaccion = (t) => /^\s*(?:[(\[{][^()\[\]{}]*[)\]}]\s*)+$/.test(t);

/* La guía de pronunciación: una palabra y, entre ( ) o [ ], cómo se dice.
   «Kathawa (katáwa)». Una sola palabra dentro y con alguna minúscula: lo de
   dentro de «(GESTO)» es una reacción, y «(en voz baja)» es una acotación. */
const RE_GUIA = /([\p{L}][\p{L}'’\-]*)(\s*)[(\[]([\p{L}'’\-·]*\p{Ll}[\p{L}'’\-·]*(?: [\p{L}'’\-·]+){0,3})[)\]]/gu;
/* «(en voz baja)» es una acotación, no una guía: lleva palabras de las de
   siempre. Una guía son sílabas sueltas: «(sá-to ji déo)», «(kum só-ji)». */
const NO_GUIA = /(^|\s)(en|de|del|la|el|los|las|un|una|a|al|con|por|para|que|se|su|voz|baja|alta|sin|lo|le|y|o|muy|como)(?=\s|$)/i;
const RE_PALABRA = /[\p{L}]+(?:['’\-][\p{L}]+)*/gu;
const ES_MAYUS = /^\p{Lu}/u;

/** El texto con las guías y los paréntesis tapados por espacios, para que la
 *  ortografía y la gramática no los lean. Las posiciones no cambian. */
function tapar(t){
  return t.replace(RE_GUIA, (m, w, esp, g) => /\s/.test(g) && NO_GUIA.test(g) ? m : w + esp + ' '.repeat(g.length + 2))
          .replace(/[(\[{][^()\[\]{}]*[)\]}]/g, (m) => ' '.repeat(m.length));
}

function guiasDe(t){
  const out = [];
  for(const m of t.matchAll(RE_GUIA)){
    if(/\s/.test(m[3]) && NO_GUIA.test(m[3])) continue;
    out.push({ termino: m[1], guia: m[3], espacio: m[2], desde: m.index, hasta: m.index + m[0].length });
  }
  return out;
}

/** Las palabras con su posición y si abren frase. */
function palabras(t){
  const out = [];
  for(const m of t.matchAll(RE_PALABRA)){
    const antes = t.slice(0, m.index).replace(/[\s¿¡«“"'(\[—–-]+$/u, '');
    const inicio = antes === '' || /[.?!]$/.test(antes);
    out.push({ w: m[0], desde: m.index, hasta: m.index + m[0].length, inicio, tras: antes === '…' });
  }
  return out;
}

function distancia(a, b){
  if(Math.abs(a.length - b.length) > 2) return 9;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i].concat(new Array(b.length).fill(0)));
  for(let j = 1; j <= b.length; j++) d[0][j] = j;
  for(let i = 1; i <= a.length; i++) for(let j = 1; j <= b.length; j++){
    d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    if(i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d[i][j] = Math.min(d[i][j], d[i - 2][j - 2] + 1);
  }
  return d[a.length][b.length];
}

const titulo = (s) => s.toLowerCase().replace(/(^|[\s'-])\p{Ll}/gu, (m) => m.toUpperCase());
const conMayus = (s, como) => ES_MAYUS.test(como) ? s[0].toUpperCase() + s.slice(1) : s;

/* ═══ LISTAS ════════════════════════════════════════════════════════════════ */

const RAE2010 = {
  'sólo': 'solo', 'éste': 'este', 'ésta': 'esta', 'éstos': 'estos', 'éstas': 'estas', 'ése': 'ese', 'ésa': 'esa',
  'ésos': 'esos', 'ésas': 'esas', 'aquél': 'aquel', 'aquélla': 'aquella', 'aquéllos': 'aquellos', 'aquéllas': 'aquellas',
  'guión': 'guion', 'guiónes': 'guiones', 'truhán': 'truhan', 'fié': 'fie', 'fió': 'fio', 'lió': 'lio', 'rió': 'rio',
  'crié': 'crie', 'crió': 'crio', 'frió': 'frio', 'pió': 'pio', 'huí': 'hui', 'guié': 'guie', 'guió': 'guio',
  'fué': 'fue', 'fuí': 'fui', 'dió': 'dio', 'vió': 'vio', 'ví': 'vi', 'tí': 'ti', 'fé': 'fe', 'dí': 'di', 'ó': 'o'
};
const PEGADAS = {
  'aveces': 'a veces', 'talvez': 'tal vez', 'osea': 'o sea', 'porfavor': 'por favor', 'apesar': 'a pesar',
  'deacuerdo': 'de acuerdo', 'sinembargo': 'sin embargo', 'almenos': 'al menos', 'nadamas': 'nada más',
  'nadamás': 'nada más', 'enserio': 'en serio', 'derrepente': 'de repente', 'envez': 'en vez', 'através': 'a través',
  'atravéz': 'a través', 'atravez': 'a través', 'haiga': 'haya', 'nose': 'no sé', 'asique': 'así que', 'sobretodo': 'sobre todo',
  'aparte': null, 'entonses': 'entonces', 'haci': 'así', 'ahi': 'ahí', 'asi': 'así', 'aun asi': 'aun así', 'mas bien': 'más bien'
};
const SENSIBLES = /^(idiotas?|imbéciles?|estúpid[oa]s?|zorras?|put[oa]s?|mierdas?|carajo|cabr[oó]n(es|as?)?|pendej[oa]s?|joder|jodid[oa]s?|jódete|coño|gilipollas|cojones|culer[oa]s?|perras?|bastard[oa]s?|malparid[oa]s?|vergas?|ching(a|ar|ada|ado|ue|uen|ón)|pinches?|maricas?|maric[oó]n(es)?|puñetas?|cretin[oa]s?|tarad[oa]s?|maldit[oa] sea)$/i;
const DIAS_MESES = new Set('lunes martes miércoles jueves viernes sábado domingo enero febrero marzo abril mayo junio julio agosto septiembre setiembre octubre noviembre diciembre'.split(' '));
const INTERROGATIVOS = { que: 'qué', quien: 'quién', quienes: 'quiénes', como: 'cómo', cuando: 'cuándo', donde: 'dónde',
  adonde: 'adónde', cual: 'cuál', cuales: 'cuáles', cuanto: 'cuánto', cuanta: 'cuánta', cuantos: 'cuántos', cuantas: 'cuántas' };
const NO_NOMBRE = new Set('young old man men woman women male female gang member boy girl kid child guard officer voice walla crowd all narrator priest doctor nurse police policeman main title graphics inserts on screen text song lyrics and the of s mr mrs miss lady sir little big elder younger older brother sister mother father son daughter wife husband villager villagers people group man\'s'.split(' '));

/* Concordancia de «todo»: género (m/f/?) y número (s/p). */
const DET = { el: 'ms', la: 'fs', los: 'mp', las: 'fp', mi: '?s', tu: '?s', su: '?s', mis: '?p', tus: '?p', sus: '?p',
  este: 'ms', esta: 'fs', estos: 'mp', estas: 'fp', ese: 'ms', esa: 'fs', esos: 'mp', esas: 'fp', aquel: 'ms', aquella: 'fs',
  aquellos: 'mp', aquellas: 'fp', nuestro: 'ms', nuestra: 'fs', nuestros: 'mp', nuestras: 'fp', vuestro: 'ms', vuestra: 'fs',
  vuestros: 'mp', vuestras: 'fp', ustedes: '?p', ellos: 'mp', ellas: 'fp', nosotros: 'mp', nosotras: 'fp', vosotros: 'mp', vosotras: 'fp' };
const TODO = { todo: 'ms', toda: 'fs', todos: 'mp', todas: 'fp' };

const PARTICIPIO = '(?:visto|hecho|dicho|puesto|vuelto|escrito|roto|abierto|muerto|cubierto|resuelto|sido|estado|ido|\\p{L}+[aií]do)';

const VERBO_SABER = 'sé|sabe|sabes|sabemos|saben|sabía|sabías|sabían|pregunto|pregunta|preguntó|preguntan|entiendo|entiende|imagino|imagina|dime|dígame|explícame|explíqueme|averigua|averigüe|recuerdo|recuerda';

/* Las reglas que se pueden decir con una expresión. `s`: la corrección. */
const EXPRESIONES = [
  { id: 'contraccion', sev: 'error', re: re('\\b([Aa]) el\\b(?!\\s*\\p{Lu})', 'gu'), msg: '«a el» se contrae en «al» (o, si es el pronombre, «a él»).', s: (m) => m[1] + 'l / ' + m[1] + ' él' },
  { id: 'contraccion', sev: 'error', re: re('\\b([Dd])e el\\b(?!\\s*\\p{Lu})', 'gu'), msg: '«de el» se contrae en «del» (o, si es el pronombre, «de él»).', s: (m) => m[1] + 'el / ' + m[1] + 'e él' },
  { id: 'haberImpers', sev: 'aviso', re: re('\\b(habían|hubieron|habrán|habrían|hayan|hubieran|hubiesen)\\s+(muchos|muchas|varios|varias|demasiados|demasiadas|pocos|pocas|unos|unas|algunos|algunas|tantos|tantas|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez|cientos|miles|personas|problemas|cosas)\\b'),
    msg: '«haber» impersonal no tiene plural: «había muchas», «hubo varios».', s: (m) => ({ habían: 'había', hubieron: 'hubo', habrán: 'habrá', habrían: 'habría', hayan: 'haya', hubieran: 'hubiera', hubiesen: 'hubiese' })[m[1].toLowerCase()] + ' ' + m[2] },
  { id: 'homofonos', sev: 'error', re: re('\\bhaber si\\b'), msg: '«a ver si» (de «ver»), no «haber si».', s: () => 'a ver si' },
  { id: 'homofonos', sev: 'error', re: re('\\bvamos haber\\b'), msg: '«vamos a ver», no «vamos haber».', s: () => 'vamos a ver' },
  { id: 'homofonos', sev: 'error', re: re('\\bha ver\\b'), msg: '«a ver», no «ha ver».', s: () => 'a ver' },
  { id: 'homofonos', sev: 'error', re: re('\\ba ver (' + PARTICIPIO + ')\\b'), msg: 'Con participio es el verbo: «haber».', s: (m) => 'haber ' + m[1] },
  { id: 'homofonos', sev: 'error', re: re('\\b(he|has|ha|hemos|han|había|habías|habían|habíamos|haber|habría|habrías|habrían|hubiera|hubieras|hubieran|hubiese|haya|hayas|hayan|hayamos|habré|habrá)\\s+echo\\b'), msg: 'Del verbo «hacer»: «hecho», con hache.', s: (m) => m[1] + ' hecho' },
  { id: 'homofonos', sev: 'error', re: re('\\bhecho de menos\\b'), msg: '«echar de menos»: «echo de menos», sin hache.', s: () => 'echo de menos' },
  { id: 'homofonos', sev: 'error', re: re('\\bhaz\\s+(' + PARTICIPIO + ')\\b'), msg: 'Con participio es «has» (de «haber»); «haz» es de «hacer».', s: (m) => 'has ' + m[1] },
  { id: 'homofonos', sev: 'aviso', re: re('\\bhas\\s+(lo|la|los|las|le|les|me|nos|algo|eso|esto|caso|silencio|clic)\\b'), msg: 'Si es una orden es «haz» (de «hacer»).', s: (m) => 'haz ' + m[1] },
  { id: 'homofonos', sev: 'aviso', re: re('(?<!\\b(?:la|una|esa|esta|aquella|gran|alta|de la)\\s)\\b[Vv]alla\\b'), msg: '¿«vaya» (de «ir» o exclamación)? «valla» es una cerca.', s: (m) => conMayus('vaya', m[0]) },
  { id: 'homofonos', sev: 'aviso', re: re('¡\\s*([Hh])ay\\b(?=\\s*[,!]|\\s+(?:de mí|no)\\b)'), msg: 'La exclamación es «¡Ay!»; «hay» es de «haber».', s: (m) => '¡' + (m[1] === 'H' ? 'A' : 'a') + 'y' },
  { id: 'homofonos', sev: 'error', re: re('\\b(va|vas|vamos|van|voy|iba|ibas|iban|íbamos)\\s+ha\\b'), msg: 'Es la preposición: «va a», sin hache.', s: (m) => m[1] + ' a' },
  { id: 'homofonos', sev: 'aviso', re: re('\\b(me|te|se|nos|les)\\s+a\\s+(' + PARTICIPIO + ')\\b'), msg: 'Con participio es el verbo: «ha».', s: (m) => m[1] + ' ha ' + m[2] },
  { id: 'dequeismo', sev: 'aviso', re: re('\\b(pienso|piensas|piensa|pensamos|piensan|pensé|pensó|creo|crees|cree|creemos|creen|creí|creyó|opino|opina|supongo|supone|imagino|imagina|parece|pareció|considero)\\s+de\\s+que\\b'), msg: 'Dequeísmo: sobra el «de».', s: (m) => m[1] + ' que' },
  { id: 'dequeismo', sev: 'aviso', re: re('\\b((?:me|te|se|nos)\\s+(?:di|diste|dio|dimos|dieron|doy|das|da|damos|dan)\\s+cuenta|(?:estoy|estás|está|estamos|están|estaba|estaban|estuve)\\s+segur[oa]s?|(?:me|te|se|nos)\\s+(?:acuerdo|acuerdas|acuerda|acordamos|acuerdan|acordé|acordó|enteré|enteró|enteramos|enteraron)|a pesar)\\s+que\\b'), msg: 'Queísmo: aquí falta el «de».', s: (m) => m[1] + ' de que' },
  { id: 'dequeismo', sev: 'sugerencia', re: re('\\b(creo|crees|cree|creemos|creen|creí|creyó|creían|pienso|piensas|piensa|piensan|supongo|supone|suponen|imagino|imaginas|imagina|imaginan)\\s+(se|me|te|nos|le|les|lo|la|los|las)\\s+(\\p{L}+(?:rá|rán|rás|ré|remos|ría|rían|rías|ríamos))\\b'),
    msg: '¿Falta el «que»? En el diálogo lo normal es «creen que se ganarán».', s: (m) => m[1] + ' que ' + m[2] + ' ' + m[3] },
  { id: 'comaVerbo', sev: 'aviso', re: re('\\b(' + VERBO_SABER + '),(?=\\s+(?:qué|cómo|dónde|cuándo|quién|quiénes|cuál|cuáles|cuánto|cuánta|cuántos|cuántas|por qué|si)\\b)', 'giu'),
    msg: 'Sobra la coma: el verbo no se separa de lo que sigue («no sé cómo…»).', s: (m) => m[1] },
  { id: 'asiQue', sev: 'aviso', re: re('\\b([Aa])sí que,'), msg: 'Después de «así que» no va coma.', s: (m) => m[1] + 'sí que' },
  { id: 'posesivo', sev: 'sugerencia', re: re('\\b(detrás|delante|encima|debajo|cerca|enfrente|alrededor|dentro|fuera)\\s+(mío|mía|tuyo|tuya|suyo|suya|nuestro|nuestra)\\b'),
    msg: 'En la norma culta: «detrás de mí», «cerca de ti».', s: (m) => m[1] + ' de ' + ({ mío: 'mí', mía: 'mí', tuyo: 'ti', tuya: 'ti', suyo: 'él', suya: 'ella', nuestro: 'nosotros', nuestra: 'nosotras' })[m[2].toLowerCase()] },
  { id: 'diacritica', sev: 'aviso', re: re('(?<![,;]\\s)\\bmas\\b', 'gu'), msg: '¿«más» (cantidad)? «mas» sin tilde solo significa «pero».', s: () => 'más' },
  { id: 'diacritica', sev: 'aviso', re: re('\\b([Tt])u\\b(?=\\s*(?:[.,;:!?)]|$)|\\s+(?:eres|estás|tienes|sabes|puedes|quieres|vas|haces|dijiste|fuiste|serás|tendrás|misma|mismo|también|tampoco|no|sí|ya|nunca|siempre|lo|me|nos|le|les|y)\\b)', 'gu'), msg: 'Si es el pronombre, lleva tilde: «tú».', s: (m) => m[1] + 'ú' },
  { id: 'diacritica', sev: 'aviso', re: re('\\b([Tt])ú\\s+(madre|padre|hermano|hermana|hermanos|hermanas|casa|vida|gente|clan|familia|nombre|corazón|culpa|hijo|hija|hijos|hijas|amigo|amiga|pueblo|tierra|hermandad|esposo|esposa|marido|mujer|cara|voz|sangre|poder|cuerpo|alma|padres|madre)\\b', 'gu'), msg: 'Delante de un nombre es el posesivo, sin tilde: «tu».', s: (m) => m[1] + 'u ' + m[2] },
  { id: 'diacritica', sev: 'aviso', re: re('\\b(a|para|de|por|en|sin|contra|hacia|entre|sobre|ante|tras|hasta|según|excepto|salvo)\\s+mi\\b(?=\\s*(?:[.,;:!?…)]|$)|\\s+(?:me|misma|mismo|también|tampoco|no|y|o|solo|sola)\\b)', 'giu'), msg: 'Después de preposición, el pronombre lleva tilde: «mí».', s: (m) => m[1] + ' mí' },
  { id: 'diacritica', sev: 'aviso', re: re('\\b([Ee])l\\b(?=\\s*(?:[.,;:!?)]|$))', 'gu'), msg: 'El artículo no cierra frase: si es el pronombre, lleva tilde, «él».', s: (m) => m[1] === 'E' ? 'Él' : 'él' },
  { id: 'diacritica', sev: 'aviso', re: re('\\b([Nn]o|[Yy]o|[Yy]a|[Ll]o|[Nn]i)\\s+se\\b(?=\\s*(?:[.,;:!?]|$)|\\s+(?:qué|que|quién|cómo|dónde|cuándo|cuál|cuánto|si|nada|bien|hacer)\\b)', 'gu'), msg: 'Si es del verbo «saber», lleva tilde: «sé».', s: (m) => m[1] + ' sé' },
  { id: 'diacritica', sev: 'aviso', re: re('\\b(que|eso|claro|pues|ahora|ella|él|yo|tú|esto|así|creo que|dijo que)\\s+si\\b(?=\\s*(?:[.,;:!?]|$))', 'giu'), msg: 'Si es afirmación, lleva tilde: «sí».', s: (m) => m[1] + ' sí' },
  { id: 'diacritica', sev: 'aviso', re: /(^|[¡¿]\s*|[.!?]\s+)([Ss])i(?=\s*[,!.])/gu, msg: 'Si es afirmación, lleva tilde: «Sí».', s: (m) => m[1] + m[2] + 'í' },
  { id: 'diacritica', sev: 'sugerencia', re: re('\\bque\\s+(me|te|le|les|nos|se)\\s+de\\b'), msg: 'Si es del verbo «dar», lleva tilde: «dé».', s: (m) => 'que ' + m[1] + ' dé' },
  { id: 'interrogativa', sev: 'sugerencia', re: re('\\b(sé|sabes|sabe|sabemos|saben|sabía|saber|dime|dinos|pregunto|preguntó|entiendo|imagina)\\s+(que|como|donde|cuando|quien|cuanto)\\s+(hacer|decir|pensar|creer|sentir|esperar|ir|responder|contestar)\\b'),
    msg: 'Pregunta indirecta: el interrogativo lleva tilde.', s: (m) => m[1] + ' ' + INTERROGATIVOS[m[2].toLowerCase()] + ' ' + m[3] },
  { id: 'interrogativa', sev: 'aviso', re: re('(?<!\\b(?:el|un|su|los|sus|ese|este|tu|mi|del)\\s)\\b[Pp]orqué\\b'), msg: '«porqué» es un sustantivo («el porqué»). Para preguntar: «por qué».', s: () => 'por qué' },
  { id: 'comillas', sev: 'sugerencia', re: /[«»]/g, msg: 'La guía de Netflix para el español usa comillas dobles " ".', s: () => '"' },
  { id: 'comillas', sev: 'aviso', re: /\.(["”»])(?=\s*$)/gu, msg: 'El punto va después de las comillas: "Regresa mañana".', s: (m) => m[1] + '.' },
  { id: 'comillas', sev: 'aviso', re: /--/g, msg: 'Dos guiones: la raya es «—».', s: () => '—' },
  { id: 'simbolos', sev: 'aviso', re: /[&@+=*~_£]|#(?![\p{L}\p{N}])/gu, msg: 'Símbolo: escríbelo con palabras, como se pronuncia.' },
  { id: 'puntoYComa', sev: 'aviso', re: /;/g, msg: 'La guía de Netflix no usa punto y coma: pon punto o coma.', s: () => '. / ,' },
  { id: 'dobleSigno', sev: 'aviso', re: /[?!]{2,}|[¿¡]{2,}/g, msg: 'No se juntan «?» y «!»: elige el que mejor va con la entonación.', s: (m) => m[0][0] },
  { id: 'peroComa', sev: 'aviso', re: re('\\b([Pp]ero),\\s*(?=[¿¡])', 'gu'), msg: 'Sin coma entre «pero» y la pregunta o la exclamación: «Pero ¿dónde vas?».', s: (m) => m[1] + ' ' },
  { id: 'abreviatura', sev: 'aviso', re: /\bEE(?!\. UU\.)\W{0,3}UU\b\.?/gu, msg: 'Estados Unidos se abrevia «EE. UU.» (con punto y espacio).', s: () => 'EE. UU.' },
  { id: 'abreviatura', sev: 'aviso', re: re('\\b(Sr|Sra|Srta|Sres|Dr|Dra|Ud|Uds|Vd|Vds|Lic|Ing|Prof|Profa|Gral|Cap|Sto|Sta)\\.(?!\\s*\\p{Lu})', 'gu'), msg: 'La abreviatura solo va justo delante de un nombre propio; sola, se escribe entera.',
    s: (m) => ({ Sr: 'señor', Sra: 'señora', Srta: 'señorita', Sres: 'señores', Dr: 'doctor', Dra: 'doctora', Ud: 'usted', Uds: 'ustedes', Vd: 'usted', Vds: 'ustedes', Lic: 'licenciado', Ing: 'ingeniero', Prof: 'profesor', Profa: 'profesora', Gral: 'general', Cap: 'capitán', Sto: 'santo', Sta: 'santa' })[m[1]] }
];

/* ═══ REVISAR ═══════════════════════════════════════════════════════════════ */

/**
 * @param guion   lo que devuelve extraerGuion
 * @param dic     lo que devuelve crearDiccionario (o null: sin ortografía)
 * @param op      { variante: 'auto'|'latam'|'es', apagadas: Set de ids,
 *                  contexto: lo que devuelve contexto() de otro guion }
 * @returns { hallazgos, terminos, variante, filas }
 */
function revisar(guion, dic, op = {}){
  const apagadas = op.apagadas || new Set();
  const ctx = op.contexto || null;
  const filas = guion.filas;
  const hall = [];
  const poner = (f, id, sev, msg, desde, hasta, sug, extra) => {
    if(apagadas.has(id)) return;
    hall.push(Object.assign({ fila: f.fila, i: f.i, regla: id, cat: REGLAS[id].cat, sev, msg,
      desde: desde ?? -1, hasta: hasta ?? -1, sug: sug ?? '' }, extra || {}));
  };
  filas.forEach((f, i) => { f.i = i; });

  /* La variante: si en el guion hay «ustedes» y casi nada de «vosotros», es
     latino. Se puede forzar desde la pantalla. */
  const todo = filas.map(f => f.dialogo).join('\n');
  let variante = op.variante || 'auto';
  if(variante === 'auto'){
    const ust = (todo.match(re('\\bustedes\\b')) || []).length;
    const vos = (todo.match(re('\\b(vosotros|vosotras|vuestr[oa]s?|sois|habéis|tenéis|queréis|podéis)\\b')) || []).length;
    variante = vos > ust ? 'es' : 'latam';
  }

  /* ── Lo que se sabe del guion entero antes de mirar fila a fila ── */

  const hablan = filas.filter(f => f.dialogo.trim() && !esReaccion(f.dialogo));
  const conTres = hablan.filter(f => /^\s*…/.test(f.dialogo)).length;
  const estiloSuspensivos = conTres >= 2 || !!(ctx && ctx.estiloSuspensivos);   // el guion marca las continuaciones con «…»

  /* Nombres que vienen de la columna SOURCE. */
  const nombres = new Set();
  for(const f of filas) for(const t of f.source.replace(/'s\b/gi, '').split(/[^\p{L}]+/u))
    if(t.length > 2 && !NO_NOMBRE.has(t.toLowerCase())) nombres.add(titulo(t));
  if(ctx) for(const n of ctx.nombres) nombres.add(n);

  /* Guías de pronunciación: término → { guía → filas }. */
  const guias = new Map();
  for(const f of filas) for(const g of guiasDe(f.dialogo)){
    if(!guias.has(g.termino)) guias.set(g.termino, new Map());
    const m = guias.get(g.termino);
    if(!m.has(g.guia)) m.set(g.guia, []);
    m.get(g.guia).push({ f, g });
  }

  /* Palabras en mayúscula que no están en el diccionario: los nombres propios
     del guion. Y el uso de mayúscula/minúscula de cada palabra común. */
  const propios = new Map();     // Nombre → [{f, desde, hasta}]
  const caja = new Map();        // palabra en minúscula → { may: [...], min: n }
  const tapados = filas.map(f => tapar(f.dialogo));
  filas.forEach((f, i) => {
    for(const p of palabras(tapados[i])){
      if(p.w.length < 2 || p.w === p.w.toUpperCase()) continue;
      const may = ES_MAYUS.test(p.w);
      const minus = p.w.toLowerCase();
      if(may && (!dic || !dic.tiene(minus)) && !p.inicio){
        if(!propios.has(p.w)) propios.set(p.w, []);
        propios.get(p.w).push({ f, desde: p.desde, hasta: p.hasta });
      }
      if(p.inicio || p.tras) continue;
      if(!caja.has(minus)) caja.set(minus, { may: [], min: 0 });
      if(may) caja.get(minus).may.push({ f, p }); else caja.get(minus).min++;
    }
  });
  for(const t of guias.keys()) if(!propios.has(t)) propios.set(t, []);
  const esNombre = (w) => propios.has(w) || guias.has(w) || nombres.has(w) || (dic && dic.propias.has(w)) || !!(ctx && ctx.propios.has(w));

  /* ── Fila a fila ── */

  /* La intervención anterior o siguiente del mismo personaje: la que puede
     continuar su frase. Hasta ocho filas y diez segundos de hueco (en los
     guiones reales la continuación llega en menos de cuatro; más lejos ya es
     otra frase). `entre`: lo que dicen otros personajes por medio, es decir,
     quién lo interrumpe. */
  const segundos = (tc) => { const m = /^(\d+):(\d+):(\d+)[:;.](\d+)$/.exec(tc || ''); return m ? +m[1] * 3600 + +m[2] * 60 + +m[3] + +m[4] / 30 : null; };
  const vecina = (i, dir) => {
    const entre = [];
    for(let j = i + dir, n = 0; j >= 0 && j < filas.length && n < 8; j += dir, n++){
      const g = filas[j];
      if(!g.dialogo.trim() || esReaccion(g.dialogo)) continue;
      if(g.source.trim() !== filas[i].source.trim()){ entre.push(g); continue; }
      const [a, b] = dir > 0 ? [filas[i], g] : [g, filas[i]];
      const hueco = segundos(b.tcIn) - segundos(a.tcOut);
      if(segundos(a.tcOut) != null && segundos(b.tcIn) != null && hueco > 10) return null;
      return { f: g, entre: dir > 0 ? entre : entre.reverse() };
    }
    return null;
  };
  const siguiente = (i, dir) => { const v = vecina(i, dir); return v && v.f; };
  /* Las marcas de pausa que admite la guía ASR (/ \ ^ < > |) no son
     puntuación: el principio y el final de la frase se miran sin ellas. */
  const final = (t) => t.replace(/[\s»”"')\]\/\\^<>|]+$/u, '').slice(-1);
  const primeraLetra = (t) => { const m = /^[\s¿¡«“"(\[—–\/\\^<>|-]*(\p{L})/u.exec(t); return m ? m[1] : ''; };

  let reaccParen = 0, reaccCorch = 0;
  const reacciones = [];
  const sueltos = [];   // signos sin pareja, para casarlos con la fila vecina

  filas.forEach((f, i) => {
    const t = f.dialogo;
    const tt = tapados[i];

    if(!t.trim()){ poner(f, 'vacio', 'error', 'La casilla de diálogo está vacía. Si no se habla, escribe la reacción: (GESTO).', -1, -1, '(GESTO)'); return; }

    /* Caracteres que no se ven. */
    for(const m of t.matchAll(/[\u200B-\u200D\u2060\uFEFF\u00AD]+/g))
      poner(f, 'invisible', 'error', 'Hay ' + m[0].length + ' carácter(es) invisible(s) (espacio de ancho cero o similar).', m.index, m.index + m[0].length, 'borrar');
    for(const m of t.matchAll(/[\u00A0\u2000-\u200A\u202F\u3000]/g)){
      /* «50 000», «15 %», «6:00 p. m.»: ahí la guía pide el espacio duro. */
      if(m[0] === '\u00A0' && (/\p{N}/u.test(t[m.index - 1] || '') || /^[%€$\p{N}]|^m\./u.test(t.slice(m.index + 1)))) continue;
      poner(f, 'invisible', 'aviso', 'Espacio especial (duro o fino) en vez de un espacio normal.', m.index, m.index + 1, 'espacio normal');
    }

    /* Espacios. */
    if(/^\s/.test(t) || /\s$/.test(t)){
      const m = /^\s+/.exec(t);
      poner(f, 'espacios', 'aviso', 'Sobran espacios al ' + (m ? 'principio' : 'final') + ' de la casilla.', m ? 0 : t.trimEnd().length, m ? m[0].length : t.length);
    }
    for(const m of t.matchAll(/(?<=\S) {2,}(?=\S)/g)) poner(f, 'espacios', 'error', 'Espacio doble.', m.index, m.index + m[0].length, ' ');
    if(/[\r\n]/.test(t.trim())) poner(f, 'espacios', 'sugerencia', 'Salto de línea dentro de la casilla.', -1, -1);

    /* Reacciones. */
    const pelado = t.trim().replace(/[.!…]+$/u, '');
    if(!/[()\[\]{}]/.test(t) && pelado && pelado.split(/[\s,]+/).every(x => REACCION_SUELTA.has(x.toLowerCase()) || REACCION_EN.test(x)))
      poner(f, 'reaccionSigno', 'error', 'Una reacción va entre paréntesis, corchetes o llaves.', 0, t.length, '(' + pelado.toUpperCase() + ')');
    for(const m of t.matchAll(/([(\[{])([^()\[\]{}]*)([)\]}])/g)){
      const dentro = m[2].trim();
      if(!dentro) continue;
      /* «Kathawa (katáwa)» es una guía de pronunciación, no una reacción. */
      if(/^[\p{L}'’\-·]*\p{Ll}[\p{L}'’\-·]*$/u.test(dentro) && /\p{L}\s*$/u.test(t.slice(0, m.index))
         && !REACCION_ES.has(dentro.toLowerCase())) continue;
      const partes = dentro.toLowerCase().split(/[\s,;/]+/);
      const esR = partes.every(x => REACCION_ES.has(x) || REACCION_EN.test(x)) || REACCION_EN.test(dentro) || dentro === dentro.toUpperCase() && /\p{Lu}/u.test(dentro);
      if(!esR) continue;
      if(m[1] === '(') reaccParen++; else reaccCorch++;
      f._signo = f._signo || m[1];
      reacciones.push({ f, m, dentro, mayus: dentro === dentro.toUpperCase() });
      if(REACCION_EN.test(dentro) || partes.every(x => REACCION_EN.test(x)))
        poner(f, 'reaccionIngles', 'aviso', 'Reacción en inglés: «' + dentro + '».', m.index, m.index + m[0].length, '(GESTO) / (RISA)…');
      /* El evento se cronometra con la primera y la última palabra: si el
         texto empieza o acaba en una reacción, el tiempo también. */
      const resto = (t.slice(0, m.index) + t.slice(m.index + m[0].length)).replace(/[(\[{][^()\[\]{}]*[)\]}]/g, '');
      if(/\p{L}/u.test(resto) && (!t.slice(0, m.index).trim() || !t.slice(m.index + m[0].length).replace(/[.!?…]/g, '').trim()))
        poner(f, 'reaccionBorde', 'sugerencia', 'El evento ' + (t.slice(0, m.index).trim() ? 'termina' : 'empieza') + ' con una reacción: revisa que el timing vaya de la primera a la última palabra.', m.index, m.index + m[0].length);
    }

    /* Números, como los pide la guía de español. */
    for(const m of tt.matchAll(/\p{N}+(?:[.,]\p{N}+|[\u00A0 ]\p{N}{3}(?!\p{N}))*/gu)){
      const s = m[0], ini = m.index, fin = ini + s.length;
      const antes = tt.slice(0, ini), despues = tt.slice(fin);
      if(/^:\p{N}|^\s*(?:a|p)\.\s?m\./u.test(despues) || /\p{N}:$/u.test(antes)) continue;   // una hora
      const fecha = re('^\\s+de\\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre)\\b', 'iu').test(despues);
      const digitos = s.replace(/\D/g, '');
      const seps = s.match(/[.,\u00A0 ]/g) || [];
      const grupos = s.split(/[.,\u00A0 ]/);
      const abre = /^[\s¿¡"“«(—–-]*$/u.test(antes) || /[.?!]\s+[¿¡"“«]*$/u.test(antes);
      if(!seps.length && digitos.length <= 2 && +digitos <= 10 && !fecha)
        poner(f, 'numeros', 'aviso', 'Del 1 al 10, los números van con letras.', ini, fin, conMayus(NUMEROS[+digitos], abre ? 'A' : 'a'));
      else if(s === '100' || s === '1000')
        poner(f, 'numeros', 'aviso', '«' + (s === '100' ? 'cien' : 'mil') + '» se escribe con letras.', ini, fin, s === '100' ? 'cien' : 'mil');
      else if(abre && digitos.length <= 2 && !fecha)
        poner(f, 'numeros', 'aviso', 'Al empezar la frase, el número va con letras.', ini, fin);
      if(seps.length && grupos.slice(1).every(g => g.length === 3)){
        if(digitos.length === 4) poner(f, 'numeros', 'aviso', 'Con cuatro cifras, sin separador: «' + digitos + '».', ini, fin, digitos);
        else if(seps.some(c => c !== '\u00A0')) poner(f, 'numeros', 'aviso', 'Desde cinco cifras, grupos de tres con espacio duro: «' + grupos.join(' ') + '».', ini, fin, grupos.join('\u00A0'));
      }else if(seps.length === 1 && grupos[1].length <= 2){
        if(variante === 'latam' && seps[0] === ',') poner(f, 'numeros', 'aviso', 'En Latinoamérica el decimal va con punto: «' + grupos.join('.') + '».', ini, fin, grupos.join('.'));
        if(variante === 'es' && seps[0] === '.') poner(f, 'numeros', 'aviso', 'En España el decimal va con coma: «' + grupos.join(',') + '».', ini, fin, grupos.join(','));
      }else if(!seps.length && digitos.length >= 5)
        poner(f, 'numeros', 'aviso', 'Desde cinco cifras, grupos de tres con espacio duro.', ini, fin, digitos.replace(/\B(?=(\d{3})+$)/g, '\u00A0'));
      const unidad = /^( ?)(%|km|cm|mm|m|kg|g|l|ml)(?![\p{L}])/u.exec(despues);
      if(unidad && unidad[1] !== '\u00A0') poner(f, 'numeros', 'sugerencia', 'Entre la cifra y «' + unidad[2] + '», un espacio duro: «' + s + ' ' + unidad[2] + '».', ini, fin + unidad[0].length);
    }
    for(const m of tt.matchAll(/[$€]/g)){
      const mal = variante === 'es' && m[0] === '$' || variante === 'latam' && m[0] === '€';
      poner(f, 'numeros', mal ? 'aviso' : 'sugerencia', mal ? 'Moneda de la otra variante: ' + (m[0] === '$' ? 'en España, euros.' : 'en Latinoamérica, dólares o la moneda local.')
        : 'Las monedas, mejor con letras («' + (m[0] === '$' ? 'dólares' : 'euros') + '»).', m.index, m.index + 1, m[0] === '$' ? 'dólares' : 'euros');
    }

    /* Dos personajes en el mismo evento: «- ¿Vienes? - Ya voy.». */
    if(/^\s*[-–—]\s+\S[\s\S]*?(?:\n|\s)[-–—]\s+\S/.test(t))
      poner(f, 'unPersonaje', 'aviso', 'Parece que hablan dos personajes en el mismo evento (guiones de diálogo): cada uno en su evento.', -1, -1);

    /* «Kathawa (katáwa)»: la guía de pronunciación se quita, con su espacio. */
    for(const g of guiasDe(t)){
      const ini = g.desde + g.termino.length;
      poner(f, 'guiaPronunciacion', 'error', 'Guía de pronunciación «' + t.slice(ini, g.hasta).trim() + '» en el diálogo: se quita del guion.', ini, g.hasta, 'borrar');
    }

    /* La «/» de pausa: la guía ASR la permite, el estudio no. Se propone
       quitarla con sus espacios, para que no quede un espacio doble. */
    for(const m of t.matchAll(/\s*\/+\s*/g)){
      const borde = m.index === 0 || m.index + m[0].length >= t.length;
      poner(f, 'barra', 'error', 'Barra «/» en el diálogo: no se marcan pausas con «/».', m.index, m.index + m[0].length, borde ? 'borrar' : ' ');
    }

    /* Puntos suspensivos. */
    for(const m of t.matchAll(/\.{3,}|…{2,}|…\.+|\.+…|\.\.(?!\.)/g))
      poner(f, 'tresPuntos', 'error', m[0] === '...' ? 'Tres puntos: usa el carácter «…».' : 'Puntos suspensivos mal escritos: «' + m[0] + '».', m.index, m.index + m[0].length, '…');
    for(const m of t.matchAll(/(?<=\S)[ \u00A0]+…/g))
      poner(f, 'suspensivos', 'aviso', 'Sin espacio antes de «…».', m.index, m.index + m[0].length, '…');
    for(const m of t.matchAll(/[,;:]…|…[,;]/g))
      poner(f, 'suspensivos', 'aviso', 'Coma o punto y coma pegados a «…»: sobra uno de los dos.', m.index, m.index + m[0].length, '…');
    for(const m of t.matchAll(/(?<=\p{L})…(?=\p{L})/gu))
      poner(f, 'suspensivos', 'sugerencia', 'Falta un espacio después de «…».', m.index, m.index + 1, '… ');

    /* Espacios junto a los signos. */
    for(const m of t.matchAll(/(?<=\S) +([,.;:?!)\]»”])/g))
      if(!(m[1] === '.' && t[m.index + m[0].length] === '.'))
        poner(f, 'espacioSigno', 'error', 'Sobra el espacio antes de «' + m[1] + '».', m.index, m.index + m[0].length, m[1]);
    for(const m of t.matchAll(/([¿¡(\[«“]) +/g))
      poner(f, 'espacioSigno', 'error', 'Sobra el espacio después de «' + m[1] + '».', m.index, m.index + m[0].length, m[1]);
    for(const m of tt.matchAll(/([,;:])(?=[\p{L}¿¡])/gu))
      poner(f, 'espacioSigno', 'error', 'Falta el espacio después de «' + m[1] + '».', m.index, m.index + 1, m[1] + ' ');
    for(const m of tt.matchAll(/(?<=\p{Ll}{2})([.?!])(?=[\p{L}¿¡«])/gu))
      poner(f, 'espacioSigno', 'aviso', 'Falta el espacio después de «' + m[1] + '».', m.index, m.index + 1, m[1] + ' ');
    for(const m of t.matchAll(/[?!]\./g))
      poner(f, 'puntoTrasSigno', 'error', 'Después de «' + m[0][0] + '» no va punto.', m.index, m.index + 2, m[0][0]);
    for(const m of tt.matchAll(/([.?!])\s+(\p{Ll})/gu))
      poner(f, 'mayusPunto', m[1] === '.' ? 'aviso' : 'sugerencia', 'Después de «' + m[1] + '» va mayúscula.', m.index + m[0].length - 1, m.index + m[0].length, m[2].toUpperCase());

    /* ¿? ¡! (): cada uno con su pareja. */
    const pila = [];
    const sinPareja = [];
    for(let k = 0; k < t.length; k++){
      const c = t[k];
      if(c === '¿' || c === '¡' || c === '(' || c === '[') pila.push({ c, k });
      else if(c === '?' || c === '!'){
        const j = pila.map(x => x.c).lastIndexOf(c === '?' ? '¿' : '¡');
        const j2 = j >= 0 ? j : pila.map(x => x.c).lastIndexOf(c === '?' ? '¡' : '¿');
        if(j2 >= 0 && pila.slice(j2 + 1).every(x => x.c === '¿' || x.c === '¡')) pila.splice(j2, 1);
        else if(!(k > 0 && (t[k - 1] === '?' || t[k - 1] === '!'))) sinPareja.push({ c, k });
      }else if(c === ')' || c === ']'){
        const j = pila.map(x => x.c).lastIndexOf(c === ')' ? '(' : '[');
        if(j >= 0) pila.splice(j, 1); else sinPareja.push({ c, k });
      }
    }
    sueltos[i] = { abre: pila, cierra: sinPareja };

    /* Interrogativos sin tilde: la primera palabra de ¿…? o ¡…!. */
    for(const m of tt.matchAll(/([¿¡])\s*(?:(?:y|e|o|pero|entonces|bueno|pues|a|de|en|para|por|con|desde|hasta|hacia|sin)\s+)*(\p{L}+)(\s+que)?/giu)){
      const w = m[2].toLowerCase();
      const ini = m.index + m[0].lastIndexOf(m[2]);
      if(m[1] === '¿' && w === 'porque') poner(f, 'interrogativa', 'aviso', 'Para preguntar es «por qué», separado y con tilde.', ini, ini + m[2].length, conMayus('por qué', m[2]));
      else if(m[1] === '¿' && w === 'por' && m[3]) poner(f, 'interrogativa', 'aviso', 'Para preguntar es «por qué», con tilde.', ini, ini + m[2].length + m[3].length, conMayus('por qué', m[2]));
      else if(INTERROGATIVOS[w] && (m[1] === '¿' || /^(quien|quienes|cuanto|cuanta|cuantos|cuantas)$/.test(w)))
        poner(f, 'interrogativa', w === 'que' || m[1] === '¡' ? 'sugerencia' : 'aviso',
          'Si es interrogativo o exclamativo, lleva tilde: «' + INTERROGATIVOS[w] + '».', ini, ini + m[2].length, conMayus(INTERROGATIVOS[w], m[2]));
    }

    /* Las expresiones. */
    for(const r of EXPRESIONES){
      r.re.lastIndex = 0;
      for(const m of tt.matchAll(r.re)){
        poner(f, r.id, r.sev, r.msg, m.index, m.index + m[0].length, r.s ? r.s(m) : '');
      }
    }

    /* «todo tus», «toda las». */
    for(const m of tt.matchAll(re('\\b(todo|toda|todos|todas)\\s+(\\p{L}+)'))){
      const a = TODO[m[1].toLowerCase()], b = DET[m[2].toLowerCase()];
      if(!b) continue;
      const genero = b[0] !== '?' ? b[0] : a[0];
      const bien = { ms: 'todo', fs: 'toda', mp: 'todos', fp: 'todas' }[genero + b[1]];
      if(bien !== m[1].toLowerCase())
        poner(f, 'todo', 'error', 'Falta concordancia: «' + bien + ' ' + m[2].toLowerCase() + '».', m.index, m.index + m[0].length, conMayus(bien, m[1]) + ' ' + m[2]);
    }

    /* Palabra repetida. */
    for(const m of tt.matchAll(re('\\b(\\p{L}+)\\s+(\\1)\\b'))){
      const w = m[1].toLowerCase();
      const enfasis = /^(no|sí|si|ya|ay|eh|oh|ja|je|muy|más|bla|tan|ven|vamos|corre|rápido|bien|claro|vale|mira|oye|espera|basta|adiós|hola|nunca|jamás|pum|toc)$/.test(w);
      poner(f, 'repeticion', enfasis ? 'sugerencia' : 'error', enfasis ? 'Repetición enfática: lleva coma («' + w + ', ' + w + '»).' : 'Palabra repetida: «' + m[1] + ' ' + m[2] + '».',
        m.index, m.index + m[0].length, enfasis ? m[1] + ', ' + m[2] : m[1]);
    }

    /* Ortografía. */
    for(const p of palabras(tt)){
      const w = p.w, minus = w.toLowerCase();
      if(RAE2010[minus] && !(minus === 'ó' && /^\p{N}/u.test(tt.slice(p.hasta).trim()))){
        poner(f, 'rae2010', 'aviso', 'Sin tilde según la RAE (2010): «' + RAE2010[minus] + '».', p.desde, p.hasta, conMayus(RAE2010[minus], w));
        continue;
      }
      if(PEGADAS[minus] !== undefined){
        if(PEGADAS[minus] && !(minus === 'sobretodo' && /\b(un|el|su|mi|tu|este)\s+$/iu.test(tt.slice(0, p.desde))))
          poner(f, 'pegadas', minus === 'sobretodo' ? 'sugerencia' : 'error', minus === 'sobretodo' ? '«sobre todo» (adverbio) va separado; «sobretodo» es un abrigo.' : 'Se escribe «' + PEGADAS[minus] + '».', p.desde, p.hasta, conMayus(PEGADAS[minus], w));
        continue;
      }
      if(variante === 'latam' && dic && dic.esVos(w)){
        poner(f, 'vosotros', 'aviso', 'Forma de «vosotros» en un doblaje latinoamericano (se usa «ustedes»).', p.desde, p.hasta);
        continue;
      }
      if(!dic || w.length < 2) continue;
      if(/['’]/.test(w)) continue;
      /* «¡NO!»: la guía ASR no admite MAYÚSCULAS sostenidas. Una sigla (ONU,
         FBI) no está en el diccionario en minúscula, y se deja. */
      if(w === w.toUpperCase() && !ROMANO.test(w) && dic.tiene(minus) && !esNombre(titulo(w))){
        poner(f, 'mayusSostenidas', 'aviso', 'Palabra en MAYÚSCULAS: el diálogo va en minúscula normal.', p.desde, p.hasta, p.inicio ? titulo(w) : minus);
        continue;
      }
      const partes = w.split('-');
      if(partes.every(x => dic.tiene(x))) continue;
      if(dic.tiene(w)) continue;
      const may = ES_MAYUS.test(w);
      if(w === w.toUpperCase()) continue;   // una sigla: ONU, FBI
      if(may){
        /* Un nombre propio, salvo que sea una palabra común sin su tilde:
           «Aqui» → «Aquí». */
        const tildes = variantesTilde(minus).filter(v => dic.tiene(v));
        if(tildes.length && !esNombre(w)){ poner(f, 'diccionario', 'error', 'Falta o sobra una tilde.', p.desde, p.hasta, tildes.map(v => conMayus(v, w)).join(' · '), { palabra: w }); continue; }
        /* En mitad de la frase es un nombre propio. Al principio puede ser
           una palabra mal escrita: se revisa como las demás. */
        if(!p.inicio || esNombre(w)) continue;
      }
      const s = sugerir(dic, w);
      const soloTilde = s.length && sinTildes(s[0].toLowerCase()) === sinTildes(minus);
      const pret = /(aste|iste)s$/.test(minus) && dic.tiene(minus.slice(0, -1));
      if(may && !s.length && !pret) continue;
      const bien = conMayus(minus.slice(0, -1), w);
      poner(f, 'diccionario', soloTilde || pret ? 'error' : may ? 'sugerencia' : 'aviso',
        pret ? 'El pretérito de «tú» no lleva -s: «' + bien + '».' : soloTilde ? 'Falta o sobra una tilde: «' + s[0] + '».'
          : '«' + w + '» no está en el diccionario.' + (may ? ' ¿Es un nombre propio?' : ''),
        p.desde, p.hasta, pret ? bien : s.join(' · '), { palabra: w });
    }

    /* Etiquetas. */
    const tags = f.tags.toUpperCase();
    if(f.anot.trim() && !tags.trim()) poner(f, 'anotacion', 'sugerencia', 'Hay una anotación pero ninguna etiqueta (¿CONTEXT?).', -1, -1, 'CONTEXT');
    if(/\bCONTEXT\b/.test(tags) && !f.anot.trim()) poner(f, 'anotacion', 'aviso', 'Etiqueta CONTEXT sin anotación que la explique.', -1, -1);
    const sens = palabras(tt).find(p => SENSIBLES.test(p.w));
    if(sens && !/SENSITIVE/.test(tags)) poner(f, 'sensible', 'aviso', '«' + sens.w + '»: falta la etiqueta SENSITIVE LANGUAGE.', sens.desde, sens.hasta, 'SENSITIVE LANGUAGE');
  });

  /* ── Lo que solo se ve mirando las filas vecinas ──
     La puntuación de una intervención depende de la de antes y la de
     después: si la frase sigue en otra fila, si alguien la interrumpe, si la
     anterior ya la había cerrado. */

  const ultimo = (t) => final(t.trim().replace(/\s*[(\[][^()\[\]]*\p{Ll}[^()\[\]]*[)\]]$/u, ''));   // sin la guía final
  /* ¿La frase de `a` sigue en `b`? No, si `a` la cerró con punto, «?» o «!».
     Sí, si `b` empieza con «…» o en minúscula, si `a` termina en coma (una
     coma nunca cierra una frase), o si `a` se queda sin cerrar (dos puntos o
     sin signo) y `b` no empieza otra frase. */
  const sigue = (a, b) => !/[.?!]/.test(ultimo(a.dialogo)) && (/^\s*[¿¡]?\s*…/.test(b.dialogo) || /^\p{Ll}/u.test(primeraLetra(b.dialogo)) || ultimo(a.dialogo) === ','
    || /[,;:]|\p{L}/u.test(ultimo(a.dialogo)) && !/^\p{Lu}/u.test(primeraLetra(b.dialogo.replace(/^\s*…\s*/, ''))));
  const quien = (g) => g.source.trim() + ' (fila ' + g.fila + ')';
  /* «¿…y conseguirán…?» o «¿y conseguirán…?»: abre otra vez lo que venía de antes. */
  const abreSeguida = (g) => { const m = /^\s*([¿¡])\s*(…|\p{Ll})/u.exec(g.dialogo); return m && m[1]; };

  filas.forEach((f, i) => {
    const t = f.dialogo;
    if(!t.trim() || esReaccion(t)) return;
    const tr = t.trim();
    const A = vecina(i, -1), S = vecina(i, 1);
    const ant = A && A.f, sig = S && S.f;
    const fin = ultimo(tr);
    const hasta = t.replace(/[\s\/\\^<>|]+$/, '').length;
    const empiezaTres = /^[¿¡]?\s*…/.test(tr);
    const letra = primeraLetra(tr.replace(/^([¿¡]?)\s*…\s*/, '$1'));
    const sigCont = sig && sigue(f, sig);
    const antCont = ant && sigue(ant, f);
    const corteSig = S && S.entre.length ? S.entre[0] : null;     // quien habla antes de que siga
    const corteAnt = A && A.entre.length ? A.entre[A.entre.length - 1] : null;
    const vecinas = (...gs) => ({ vecinas: gs.filter(Boolean).map(g => g.i) });

    /* El final. Si la frase sigue en la fila siguiente, puede quedarse sin
       signo («Algunos tenemos que pensar» / «en esas cosas.»): la guía de
       español no pone «…» al partir una frase. Solo si la interrumpe otro
       personaje, «…» al cortar y al retomar. Si no sigue, su punto, su «?» o
       su «!». Los dos puntos sí pueden quedarse al final: anuncian lo que sigue. */
    if(sigCont && corteSig && fin !== '…' && fin !== ':')
      poner(f, 'contFin', 'aviso', 'La interrumpe ' + quien(corteSig) + ' y la frase sigue en la fila ' + sig.fila + ': termina esta con «…».',
        hasta - 1, hasta, /[,;:.]/.test(t[hasta - 1]) ? '…' : t[hasta - 1] + '…', vecinas(corteSig, sig));
    else if(!sigCont && !/[.?!…:;,]/.test(fin) && fin !== ':'){
      const otro = filas.slice(i + 1).find(g => g.dialogo.trim() && !esReaccion(g.dialogo));
      const cortada = otro && otro.source.trim() !== f.source.trim();
      poner(f, 'sinFinal', 'aviso', 'Falta la puntuación al final de la intervención' + (cortada ? ' (o «…» si la corta ' + quien(otro) + ')' : '') + '.',
        hasta - 1, hasta, t[hasta - 1] + '.', vecinas(cortada && otro));
    }else if(!sigCont && /[,;:]/.test(fin) && sig !== null){
      /* Termina en coma y lo siguiente que dice empieza otra frase. */
      poner(f, 'sinFinal', 'aviso', 'Termina en «' + fin + '» pero la fila ' + (sig ? sig.fila : '') + ' empieza otra frase: cierra esta con su signo o con «…».',
        hasta - 1, hasta, '.', vecinas(sig));
    }

    /* «Ah, yo no sé,» / «cómo se le habrá ocurrido…»: la coma que separa el
       verbo de lo que sigue en la fila siguiente. */
    if(sigCont && re('\\b(' + VERBO_SABER + '),\\s*$', 'iu').test(t.replace(/[\s\/\\^<>|]+$/, ''))
       && re('^\\s*(?:qué|cómo|dónde|cuándo|quién|quiénes|cuál|cuáles|cuánto|cuánta|cuántos|cuántas|por qué|si)\\b', 'iu').test(sig.dialogo))
      poner(f, 'comaVerbo', 'aviso', 'Sobra la coma: el verbo no se separa de lo que sigue en la fila ' + sig.fila + '.', hasta - 1, hasta, 'borrar', vecinas(sig));

    /* Estilo del estudio: la pregunta (o la exclamación) que sigue en el
       evento siguiente se cierra en cada evento y se vuelve a abrir, para que
       cada evento se lea entero:
         «¿Creen que se ganarán nuestra admiración…?» / «¿…y conseguirán su independencia?»
       Eso es lo correcto. Se avisa la forma contraria: abierta en un evento y
       cerrada en otro. */
    const signo = (c) => c === '¿' || c === '?' ? 'pregunta' : 'exclamación';
    const PAR = { '¿': '?', '¡': '!' };
    const partidaAnt = ant && abreSeguida(f) && /…\s*[?!]$/.test(ant.dialogo.replace(/[\s\/\\^<>|]+$/, ''));
    const abiertos = sueltos[i] ? sueltos[i].abre.filter(x => PAR[x.c]) : [];
    if(abiertos.length && sig){
      const c = abiertos[abiertos.length - 1].c;
      const misma = abreSeguida(sig) === c || sigue(f, sig) && sueltos[sig.i] && sueltos[sig.i].cierra.some(x => x.c === PAR[c]);
      const ult = t[hasta - 1];
      if(misma) poner(f, 'preguntaPartida', 'aviso', 'La ' + signo(c) + ' sigue en la fila ' + sig.fila + ': cierra aquí con «…' + PAR[c] + '» (y en esa se vuelve a abrir con «' + c + '…»).',
        hasta - 1, hasta, (/[…,;:.]/.test(ult) ? '' : ult) + '…' + PAR[c], vecinas(sig));
    }
    const cerrados = sueltos[i] ? sueltos[i].cierra.filter(x => x.c === '?' || x.c === '!') : [];
    let reabre = false;
    if(cerrados.length && ant && !abreSeguida(f) && sigue(ant, f)){
      const c = cerrados[0].c === '?' ? '¿' : '¡';
      if(sueltos[ant.i] && sueltos[ant.i].abre.some(x => x.c === c)){
        reabre = true;
        const k0 = t.length - t.trimStart().length, m = /^\s*…\s*/.exec(t);
        poner(f, 'preguntaPartida', 'aviso', 'Viene de la ' + signo(c) + ' de la fila ' + ant.fila + ': vuelve a abrirla aquí con «' + c + '…».',
          m ? m.index : k0, m ? m.index + m[0].length : k0 + 1, m ? c + '…' : c + '…' + t[k0], vecinas(ant));
      }
    }

    /* El principio. La continuación de una frase no empieza con «…» (guía de
       español: «do not use an ellipsis at the beginning of the second
       subtitle, unless the pause … was caused by an interruption»). Solo la
       que retoma la frase después de que hable otro personaje. «¿…» o «¡…»
       al volver a abrir una pregunta partida es el estilo del estudio. */
    if(empiezaTres && !/^[¿¡]/.test(tr) && ant && antCont && !corteAnt && !reabre){
      const m = /^…\s*/.exec(tr);
      poner(f, 'contTres', 'aviso', 'Continúa la frase de la fila ' + ant.fila + ': la continuación no empieza con «…» (solo si la interrumpe otro personaje).',
        t.indexOf('…'), t.indexOf('…') + m[0].length, 'borrar', vecinas(ant));
    }
    if(!empiezaTres && /^\p{Ll}/u.test(letra)){
      if(antCont && corteAnt)
        poner(f, 'contIni', 'aviso', 'Retoma la frase de la fila ' + ant.fila + ' después de que hable ' + quien(corteAnt) + ': empieza con «…».',
          0, 1, '…' + tr[0], vecinas(ant, corteAnt));
      else if(!antCont)
        poner(f, 'inicioMinus', 'aviso', ant && /[.?!]$/.test(ultimo(ant.dialogo))
          ? 'La fila ' + ant.fila + ' cerró la frase: esta empieza con mayúscula.'
          : 'La intervención empieza en minúscula.', 0, 1, tr[0].toUpperCase(), vecinas(ant));
    }
    if(!empiezaTres && ant && !corteAnt && /[,]|\p{L}/u.test(ultimo(ant.dialogo))){
      const m = /^([\s¿¡]*)(\p{L}+)/u.exec(t);
      if(m && ES_MAYUS.test(m[2]) && m[2] !== m[2].toUpperCase() && dic && dic.tiene(m[2].toLowerCase()) && !esNombre(m[2]) && !/^[¿¡]/.test(m[1].trim()))
        poner(f, 'contMayus', 'aviso', 'Continúa la frase de la fila ' + ant.fila + ' (que no la cerró): sigue en minúscula.',
          m[1].length, m[1].length + m[2].length, m[2].toLowerCase(), vecinas(ant));
    }
    if(empiezaTres && ant){
      const cierre = ultimo(ant.dialogo);
      const m = /^([¿¡]?\s*…\s*[¿¡]?)(\p{L}+)/u.exec(tr);
      /* «…Lo despiadada»: la frase venía de antes, así que sigue en minúscula. */
      if(m && /[,;:…]|\p{L}/u.test(cierre) && ES_MAYUS.test(m[2]) && m[2] !== m[2].toUpperCase()
         && dic && dic.tiene(m[2].toLowerCase()) && !esNombre(m[2]))
        poner(f, 'contMayus', 'aviso', 'Continúa la frase de la fila ' + ant.fila + ': sigue en minúscula.',
          m[1].length, m[1].length + m[2].length, m[2].toLowerCase(), vecinas(ant));
      /* «…» al principio cuando la anterior ya había cerrado con punto. */
      if(/[.?!]/.test(cierre) && !corteAnt && !partidaAnt)
        poner(f, 'contSobra', 'aviso', 'La fila ' + ant.fila + ' ya cerró la frase con «' + cierre + '»: sobra el «…» del principio.',
          t.indexOf('…'), t.indexOf('…') + /^…\s*/.exec(t.slice(t.indexOf('…')))[0].length, 'borrar', vecinas(ant));
    }

    /* Repetida pocas filas después. */
    if(tr.length > 8) for(let j = i + 1; j < Math.min(filas.length, i + 16); j++){
      if(filas[j].source.trim() === f.source.trim() && filas[j].dialogo.trim() === tr){
        poner(filas[j], 'repetida', 'sugerencia', 'Repite exactamente la fila ' + f.fila + ' del mismo personaje.', -1, -1);
        break;
      }
    }
  });

  /* Signos que abren en una fila y cierran en la siguiente («¿Acaso…» /
     «…lo sabes?») no son error. */
  filas.forEach((f, i) => {
    const s = sueltos[i];
    if(!s) return;
    const sig = siguiente(i, 1), ant = siguiente(i, -1);
    /* «¡Les quitan» / «la oportunidad» / «de ser súbditos…!»: se sigue la
       frase fila a fila hasta encontrar el cierre (o el principio). */
    const enLaFrase = (dir, c) => {
      let a = filas[i], b = siguiente(i, dir);
      for(let n = 0; b && n < 6; n++){
        if(!(dir > 0 ? sigue(a, b) : sigue(b, a))) return false;
        if(sueltos[b.i] && sueltos[b.i][dir > 0 ? 'cierra' : 'abre'].some(x => x.c === c)) return true;
        a = b; b = siguiente(b.i, dir);
      }
      return false;
    };
    for(const a of s.abre){
      const par = { '¿': '?', '¡': '!', '(': ')', '[': ']' }[a.c];
      if(enLaFrase(1, par)) continue;
      if(sig && sigue(f, sig) && abreSeguida(sig) === a.c) continue;   // lo avisa preguntaPartida en la fila siguiente
      poner(f, 'signosPares', 'error', 'Se abre «' + a.c + '» y no se cierra.', a.k, a.k + 1, par);
    }
    for(const c of s.cierra){
      const par = { '?': '¿', '!': '¡', ')': '(', ']': '[' }[c.c];
      if(enLaFrase(-1, par)) continue;
      poner(f, 'signosPares', 'error', 'Se cierra «' + c.c + '» sin haberse abierto («' + par + '»).', c.k, c.k + 1, par);
    }
  });

  /* ── El guion comparado consigo mismo ── */

  /* Reacciones con signos distintos. */
  /* Reacciones en mayúsculas y en minúsculas: manda lo que haga el guion. */
  const enMayus = reacciones.filter(x => x.mayus).length;
  if(enMayus && enMayus < reacciones.length){
    const mayoria = enMayus * 2 >= reacciones.length;
    for(const x of reacciones) if(x.mayus !== mayoria)
      poner(x.f, 'reaccionMayus', 'aviso', 'El resto de reacciones del guion van en ' + (mayoria ? 'mayúsculas' : 'minúsculas') + '.', x.m.index, x.m.index + x.m[0].length,
        x.m[1] + (mayoria ? x.dentro.toUpperCase() : x.dentro.toLowerCase()) + x.m[3]);
  }
  if(reaccParen && reaccCorch){
    const mayoria = reaccParen >= reaccCorch ? '(' : '[';
    for(const f of filas) if(f._signo && (f._signo === '(') !== (mayoria === '('))
      poner(f, 'reaccionEstilo', 'aviso', 'El guion marca casi todas las reacciones con «' + (mayoria === '(' ? '( )' : '[ ]') + '».', -1, -1);
  }

  /* Guías distintas para el mismo nombre. */
  const terminos = [];
  /* Si las guías son un error, no tiene sentido pedir que estén ni que sean iguales. */
  const sinGuias = !apagadas.has('guiaPronunciacion');
  const primera = (usos) => { const f = usos.reduce((a, u) => !a || u.f.i < a.i ? u.f : a, null); return f ? { fila: f.fila, tc: f.tcIn } : null; };
  const escRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for(const [termino, m] of guias){
    const lista = Array.from(m.entries()).map(([guia, usos]) => ({ guia, usos })).sort((a, b) => b.usos.length - a.usos.length);
    const total = lista.reduce((n, x) => n + x.usos.length, 0);
    let sinGuia = [];
    const reT = re('\\b' + termino.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b(?!\\s*[(\\[])', 'gu');
    for(const f of filas){ reT.lastIndex = 0; for(const x of f.dialogo.matchAll(reT)) sinGuia.push({ f, desde: x.index, hasta: x.index + termino.length }); }
    terminos.push({ termino, guias: lista.map(x => ({ guia: x.guia, veces: x.usos.length })), veces: total, sinGuia: sinGuia.length,
                    primera: primera(lista.flatMap(x => x.usos).concat(sinGuia)) });
    /* Con un guion cargado de referencia, la guía buena es la suya. */
    const deRef = !sinGuias && ctx && ctx.guias.get(termino);
    if(deRef) for(const x of lista) if(x.guia !== deRef) for(const u of x.usos)
      poner(u.f, 'guias', 'aviso', 'En el guion, «' + termino + '» se escribe «' + termino + ' (' + deRef + ')».', u.g.desde, u.g.hasta, termino + ' (' + deRef + ')');
    if(lista.length > 1 && !sinGuias){
      const resumen = lista.map(x => '«(' + x.guia + ')» ×' + x.usos.length).join(', ');
      const soloCaja = new Set(lista.map(x => x.guia.toLowerCase())).size === 1;
      for(const x of lista.slice(1)) for(const u of x.usos)
        poner(u.f, 'guias', 'aviso', (soloCaja ? 'La guía de «' + termino + '» se escribe con mayúsculas distintas: ' : '«' + termino + '» tiene guías distintas: ') + resumen + '.',
          u.g.desde, u.g.hasta, termino + ' (' + lista[0].guia + ')');
    }
    if(!sinGuias && sinGuia.length && (total >= sinGuia.length || deRef))
      for(const u of sinGuia) poner(u.f, 'sinGuia', 'sugerencia', '«' + termino + '» lleva guía en ' + total + ' filas y aquí no.', u.desde, u.hasta, termino + ' (' + lista[0].guia + ')');
  }
  for(const [w, usos] of propios) if(!guias.has(w)) terminos.push({ termino: w, guias: [], veces: usos.length, sinGuia: usos.length, primera: primera(usos) });
  /* Nombres que en el guion de referencia llevan guía y aquí aparecen sin ella. */
  if(ctx && !sinGuias) for(const [termino, g] of ctx.guias){
    if(guias.has(termino)) continue;
    const reT = re('\\b' + escRe(termino) + '\\b(?!\\s*[(\\[])', 'gu');
    for(const f of filas) for(const x of f.dialogo.matchAll(reT))
      poner(f, 'sinGuia', 'sugerencia', 'En el guion, «' + termino + '» lleva su guía: «' + termino + ' (' + g + ')».', x.index, x.index + termino.length, termino + ' (' + g + ')');
  }

  /* Nombres casi iguales. */
  const cuenta = new Map();
  for(const tm of terminos) cuenta.set(tm.termino, tm.veces + tm.sinGuia * (tm.guias.length ? 1 : 0));
  if(ctx) for(const [w, n] of ctx.cuenta) cuenta.set(w, (cuenta.get(w) || 0) + n);
  const lista = Array.from(cuenta.keys()).filter(w => w.length >= 4);
  const parecidos = (a, b) => {
    if(a[0].toLowerCase() !== b[0].toLowerCase()) return false;
    if(a + 's' === b || b + 's' === a || a + 'es' === b || b + 'es' === a) return false;
    if(dic && dic.tiene(a.toLowerCase()) && dic.tiene(b.toLowerCase())) return false;
    return distancia(a.toLowerCase(), b.toLowerCase()) <= (Math.min(a.length, b.length) >= 7 ? 2 : 1);
  };
  const avisados = new Set();
  for(let x = 0; x < lista.length; x++) for(let y = x + 1; y < lista.length; y++){
    const a = lista[x], b = lista[y];
    if(!parecidos(a, b)) continue;
    const [raro, comun] = cuenta.get(a) < cuenta.get(b) ? [a, b] : [b, a];
    if(avisados.has(raro)) continue;
    avisados.add(raro);
    const reR = re('\\b' + raro + '\\b', 'gu');
    for(const f of filas) for(const m of f.dialogo.matchAll(reR))
      poner(f, 'variantes', 'aviso', '¿«' + raro + '» o «' + comun + '»? En el guion aparecen las dos (' + cuenta.get(raro) + ' / ' + cuenta.get(comun) + ').', m.index, m.index + raro.length, comun);
  }
  /* Contra los nombres de la columna SOURCE. */
  for(const w of lista){
    if(nombres.has(w) || avisados.has(w)) continue;
    const n = Array.from(nombres).find(s => s.length >= 4 && parecidos(w, s) && !cuenta.has(s));
    if(!n) continue;
    const reW = re('\\b' + w + '\\b', 'gu');
    for(const f of filas) for(const m of f.dialogo.matchAll(reW))
      poner(f, 'variantes', 'aviso', '¿«' + w + '» o «' + n + '», como se llama el personaje en la columna SOURCE?', m.index, m.index + w.length, n);
  }

  /* Mayúsculas inconsistentes. */
  for(const [minus, c] of caja){
    if(!c.may.length) continue;
    if(!dic || !dic.tiene(minus)) continue;
    const cap = minus[0].toUpperCase() + minus.slice(1);
    if(guias.has(cap) || nombres.has(cap) || minus === 'dios') continue;
    if(DIAS_MESES.has(minus)){
      for(const u of c.may) poner(u.f, 'mayusculas', 'aviso', 'Los días y los meses van en minúscula.', u.p.desde, u.p.hasta, minus);
      continue;
    }
    if(!c.min) continue;
    for(const u of c.may)
      poner(u.f, 'mayusculas', 'aviso', '«' + u.p.w + '» va en mayúscula aquí y en minúscula en otras ' + c.min + ' fila(s). Si es nombre común, en minúscula (RAE).', u.p.desde, u.p.hasta, minus);
  }

  /* El título de la serie y su etiqueta. */
  const tituloSerie = (guion.info['SHOW TITLE'] || '').trim();
  if(tituloSerie){
    const reTit = re('\\b' + tituloSerie.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'giu');
    for(const f of filas){
      reTit.lastIndex = 0;
      const m = reTit.exec(f.dialogo);
      const lleva = /MAIN\s*TITLE/i.test(f.tags);
      if(m && !lleva) poner(f, 'titulo', 'aviso', 'Se dice el título de la serie («' + tituloSerie + '») y falta la etiqueta MAIN TITLE IN DIALOGUE.', m.index, m.index + m[0].length, 'MAIN TITLE IN DIALOGUE');
      if(!m && lleva && f.dialogo.trim()) poner(f, 'titulo', 'aviso', 'Lleva la etiqueta MAIN TITLE IN DIALOGUE pero no dice «' + tituloSerie + '».', -1, -1);
    }
  }

  /* Personajes, pantalla y timecodes. */
  const personajes = new Map();
  const conEspacios = new Map();
  for(const f of filas){
    const s = f.source;
    if(!s.trim()){ poner(f, 'personaje', 'error', 'Falta el nombre del personaje (columna SOURCE).', -1, -1, '', { donde: 'source' }); continue; }
    if(s !== s.trim() || /\s{2,}/.test(s)){
      if(!conEspacios.has(s)) conEspacios.set(s, []);
      conEspacios.get(s).push(f);
    }
    const k = s.trim().replace(/\s+/g, ' ');
    if(!personajes.has(k)) personajes.set(k, []);
    personajes.get(k).push(f);
    if(f.pantalla && !/^(ON|OFF|ON_OFF|OFF_ON)$/i.test(f.pantalla)) poner(f, 'pantalla', 'aviso', 'Valor raro en SOURCE ONSCREEN: «' + f.pantalla + '».', -1, -1, 'ON / OFF / ON_OFF / OFF_ON', { donde: 'pantalla' });
  }
  /* Un evento, un personaje; WALLA delante y separado; NONE solo para lo que
     se lee en pantalla. Un aviso por nombre, en su primera fila. */
  for(const [k, fs] of personajes){
    const K = k.toUpperCase(), cuantas = fs.length > 1 ? ' (y en ' + (fs.length - 1) + ' filas más)' : '';
    if(/\s*[\/&+,]\s*|\s(?:Y|AND|E)\s/.test(K))
      poner(fs[0], 'unPersonaje', 'aviso', '«' + k + '» parece llevar varios personajes: cada evento va a un solo personaje' + cuantas + '.', -1, -1, '', { donde: 'source' });
    if(/\bWALLA\b/.test(K) && !/^WALLA\b/.test(K))
      poner(fs[0], 'walla', 'aviso', 'El personaje del murmullo empieza por WALLA' + cuantas + '.', -1, -1, 'WALLA - ' + k.replace(/\s*\bWALLA\b\s*/i, ' ').trim(), { donde: 'source' });
    else if(/^WALLA\s+[^\s\-:]/.test(K))
      poner(fs[0], 'walla', 'aviso', 'Después de WALLA va «-» o «:» antes del resto' + cuantas + '.', -1, -1, k.replace(/^(WALLA)\s+/i, '$1 - '), { donde: 'source' });
    if(K === 'NONE') for(const f of fs)
      if(f.dialogo.trim() && !/SCREEN|GRAPHIC|INSERT|TEXT|TITLE|FORCED|\bFN\b/i.test(f.tags))
        poner(f, 'walla', 'aviso', 'NONE es solo para texto en pantalla, y esta fila no lleva etiqueta de texto en pantalla.', -1, -1, '', { donde: 'source' });
  }

  /* Un aviso por nombre, en su primera fila: el mismo espacio repetido en
     cuarenta filas es un solo arreglo. */
  for(const [s, fs] of conEspacios)
    poner(fs[0], 'personaje', 'aviso', 'Espacios sobrantes en el personaje «' + s.replace(/ /g, '·') + '»' + (fs.length > 1 ? ' (y en ' + (fs.length - 1) + ' filas más)' : '') + '.', -1, -1, s.trim().replace(/\s+/g, ' '), { donde: 'source' });

  /* KATHWA WOMAN 2 / KATHAWA WOMAN 2: se compara palabra por palabra, para
     que YERUMA MAN y YERUMA WOMAN no parezcan el mismo. */
  const fichas = (s) => s.toUpperCase().replace(/'S\b/g, '').split(/[^\p{L}\d]+/u).filter(Boolean);
  const casiIgual = (a, b) => {
    const x = fichas(a), y = fichas(b);
    if(x.length !== y.length) return false;
    let distintas = 0;
    for(let k = 0; k < x.length; k++){
      if(x[k] === y[k]) continue;
      if(++distintas > 1 || /\d/.test(x[k] + y[k]) || NO_NOMBRE.has(x[k].toLowerCase()) || NO_NOMBRE.has(y[k].toLowerCase())) return false;
      if(Math.min(x[k].length, y[k].length) < 4 || distancia(x[k], y[k]) > (Math.min(x[k].length, y[k].length) >= 7 ? 2 : 1)) return false;
    }
    return distintas === 1;
  };
  /* Se agrupan sin el número: «KATHWA WOMAN 1» y «KATHWA WOMAN 2» son el
     grupo «KATHWA WOMAN», y la forma rara es la del grupo que menos filas
     tiene, aunque no exista un «KATHAWA WOMAN 1» con el que emparejarla. */
  const esqueleto = (s) => fichas(s).filter(t => !/\d/.test(t)).join(' ');
  const grupos = new Map();
  for(const [k, fs] of personajes){
    const e = esqueleto(k);
    if(!grupos.has(e)) grupos.set(e, { nombres: [], filas: 0 });
    grupos.get(e).nombres.push(k);
    grupos.get(e).filas += fs.length;
  }
  const ge = Array.from(grupos.keys());
  for(let x = 0; x < ge.length; x++) for(let y = x + 1; y < ge.length; y++){
    if(!casiIgual(ge[x], ge[y])) continue;
    const [raro, comun] = grupos.get(ge[x]).filas < grupos.get(ge[y]).filas ? [ge[x], ge[y]] : [ge[y], ge[x]];
    const fr = fichas(raro), fc = fichas(comun);
    const k = fr.findIndex((t, n) => t !== fc[n]);
    for(const nombre of grupos.get(raro).nombres){
      const bien = nombre.replace(re('\\b' + fr[k] + '\\b', 'giu'), fc[k]);
      for(const f of personajes.get(nombre))
        poner(f, 'personaje', 'aviso', '«' + fr[k] + '» aquí y «' + fc[k] + '» en el resto del guion (' + grupos.get(raro).filas + ' fila(s) frente a ' + grupos.get(comun).filas + ').', -1, -1, bien, { donde: 'source' });
    }
  }
  const tcN = (s) => { const m = /^(\d{2}):(\d{2}):(\d{2})[:;.](\d{2,3})$/.exec(s); return m ? [+m[1], +m[2], +m[3], +m[4]] : null; };
  const menor = (a, b) => { for(let k = 0; k < 4; k++) if(a[k] !== b[k]) return a[k] < b[k]; return false; };
  let previo = null;
  for(const f of filas){
    const a = tcN(f.tcIn), b = tcN(f.tcOut);
    if(!a) { poner(f, 'timecode', 'error', f.tcIn ? 'Timecode de entrada mal escrito: «' + f.tcIn + '».' : 'Falta el timecode de entrada.', -1, -1, 'HH:MM:SS:FF', { donde: 'tc' }); continue; }
    if(f.tcOut && !b) poner(f, 'timecode', 'error', 'Timecode de salida mal escrito: «' + f.tcOut + '».', -1, -1, 'HH:MM:SS:FF', { donde: 'tc' });
    if(b && !menor(a, b)) poner(f, 'timecode', 'error', 'La salida (' + f.tcOut + ') no es posterior a la entrada (' + f.tcIn + ').', -1, -1, '', { donde: 'tc' });
    if(a[1] > 59 || a[2] > 59) poner(f, 'timecode', 'error', 'Minutos o segundos por encima de 59: «' + f.tcIn + '».', -1, -1, '', { donde: 'tc' });
    if(previo && menor(a, previo.a)) poner(f, 'timecode', 'aviso', 'Fuera de orden: empieza antes que la fila ' + previo.f.fila + ' (' + previo.f.tcIn + ').', -1, -1, '', { donde: 'tc' });
    previo = { a, f };
  }

  /* Un hallazgo por sitio y regla: dos reglas que ven lo mismo no se suman. */
  const vistos = new Set();
  const unicos = hall.filter(h => { const k = h.i + '|' + h.regla + '|' + h.desde + '|' + h.msg; if(vistos.has(k)) return false; vistos.add(k); return true; });
  const orden = { error: 0, aviso: 1, sugerencia: 2 };
  unicos.sort((a, b) => a.i - b.i || (a.desde < 0) - (b.desde < 0) || a.desde - b.desde || orden[a.sev] - orden[b.sev]);
  terminos.sort((a, b) => b.veces - a.veces || a.termino.localeCompare(b.termino, 'es'));
  for(const f of filas) delete f._signo;
  return { hallazgos: unicos, terminos, variante, filas, estiloSuspensivos, nombres };
}

/** Lo que un guion ya revisado enseña para revisar otro texto: sus nombres,
 *  la guía de pronunciación de cada uno, el título y cómo marca las
 *  continuaciones. */
function contexto(res, guion){
  const guias = new Map(), propios = new Set(), cuenta = new Map();
  for(const t of res.terminos){
    propios.add(t.termino);
    cuenta.set(t.termino, t.veces + (t.guias.length ? t.sinGuia : 0));
    if(t.guias.length) guias.set(t.termino, t.guias[0].guia);
  }
  return { nombres: new Set(res.nombres), guias, propios, cuenta, estiloSuspensivos: res.estiloSuspensivos, info: (guion && guion.info) || {} };
}

/**
 * Un texto suelto, el que se escribe en «Probar un diálogo». Cada línea es un
 * evento, y las continuaciones e interrupciones se miran entre líneas. Si la
 * línea empieza por «NOMBRE:» (en mayúsculas), ese es quien habla; si no,
 * habla el mismo de la línea anterior. Lo que solo tiene sentido en el Excel (timecodes, columna
 * SOURCE, filas repetidas) no se revisa.
 * @returns lo mismo que revisar(), más `lineas`: [{ desde, texto }], dónde
 *          empieza cada evento dentro del texto.
 */
function revisarTexto(texto, dic, op = {}){
  const lineas = [];
  let pos = 0, quien = op.personaje || 'PRUEBA';
  for(const crudo of String(texto ?? '').split('\n')){
    const l = crudo.replace(/\r$/, '');
    const m = /^(\s*([\p{Lu}\d][\p{Lu}\d'’ .\-]{0,39}?)\s*:\s*)(\S.*)$/u.exec(l);
    if(m && /\p{Lu}{2}/u.test(m[2])){ quien = m[2].trim(); lineas.push({ desde: pos + m[1].length, texto: m[3], personaje: quien }); }
    else if(l.trim()) lineas.push({ desde: pos, texto: l, personaje: quien });
    pos += crudo.length + 1;
  }
  const filas = lineas.map((l, k) => ({ fila: k + 1, tcIn: '', tcOut: '', source: l.personaje, dialogo: l.texto,
                                        anot: '', tags: op.tags || '', pantalla: '' }));
  const apagadas = new Set(op.apagadas || []);
  for(const id of ['timecode', 'personaje', 'pantalla', 'repetida', 'walla', 'anotacion']) apagadas.add(id);
  const info = op.info || (op.contexto && op.contexto.info) || {};
  const res = revisar({ filas, info, hoja: '' }, dic, { variante: op.variante, apagadas, contexto: op.contexto });
  res.lineas = lineas;
  return res;
}

/* ═══ EXPORTAR: un .xlsx sin bibliotecas ═══════════════════════════════════
 * Un zip sin comprimir (método 0) con lo mínimo que pide Excel. */

const CRC = (() => { const t = new Uint32Array(256); for(let n = 0; n < 256; n++){ let c = n; for(let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(b){ let c = 0xFFFFFFFF; for(let i = 0; i < b.length; i++) c = CRC[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; }

function zip(archivos){
  const enc = new TextEncoder();
  const partes = [], centro = [];
  let pos = 0;
  for(const [nombre, texto] of archivos){
    const n = enc.encode(nombre), d = enc.encode(texto), crc = crc32(d);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
    partes.push(new Uint8Array(h.buffer), n, d);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, d.length, true); c.setUint32(24, d.length, true); c.setUint16(28, n.length, true);
    c.setUint32(42, pos, true);
    centro.push(new Uint8Array(c.buffer), n);
    pos += 30 + n.length + d.length;
  }
  const tamCentro = centro.reduce((s, x) => s + x.length, 0);
  const e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, archivos.length, true); e.setUint16(10, archivos.length, true);
  e.setUint32(12, tamCentro, true); e.setUint32(16, pos, true);
  return new Blob(partes.concat(centro, [new Uint8Array(e.buffer)]), { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}

const xmlEsc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])
  .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');

/** Un libro con una hoja por cada tabla: [{ nombre, filas: [[...]], anchos }]. */
function xlsx(hojas){
  const col = (n) => { let s = ''; n++; while(n){ const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); } return s; };
  const archivos = [
    ['[Content_Types].xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + hojas.map((h, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>'],
    ['_rels/.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
    ['xl/workbook.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + hojas.map((h, i) => '<sheet name="' + xmlEsc(h.nombre.slice(0, 31)) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>'],
    ['xl/_rels/workbook.xml.rels', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + hojas.map((h, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
    ['xl/styles.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf/></cellStyleXfs><cellXfs count="3"><xf/><xf fontId="1" applyFont="1"/><xf applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf></cellXfs></styleSheet>']
  ];
  hojas.forEach((h, i) => {
    const cols = (h.anchos || []).map((w, k) => '<col min="' + (k + 1) + '" max="' + (k + 1) + '" width="' + w + '" customWidth="1"/>').join('');
    const filas = h.filas.map((f, r) => '<row r="' + (r + 1) + '">' + f.map((v, c) =>
      typeof v === 'number' ? '<c r="' + col(c) + (r + 1) + '"' + (r ? '' : ' s="1"') + '><v>' + v + '</v></c>'
      : '<c r="' + col(c) + (r + 1) + '" t="inlineStr" s="' + (r ? 2 : 1) + '"><is><t xml:space="preserve">' + xmlEsc(v) + '</t></is></c>').join('') + '</row>').join('');
    archivos.push(['xl/worksheets/sheet' + (i + 1) + '.xml', '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
      + (cols ? '<cols>' + cols + '</cols>' : '') + '<sheetData>' + filas + '</sheetData>' + (h.filas.length > 1 ? '<autoFilter ref="A1:' + col(h.filas[0].length - 1) + h.filas.length + '"/>' : '') + '</worksheet>']);
  });
  return zip(archivos);
}

/* «YOUNG GURUAMMA», «KATHAWA WOMAN 3», «AMAR'S MALE GANG MEMBER 1»: todo en
   mayúsculas, sin signos de frase. «¡NO!» o «(GESTO)» no lo son. */
const esNombreSuelto = (l) => /^[\p{Lu}\d][\p{Lu}\d'’ .\-]{1,40}:?$/u.test(l.trim()) && /\p{Lu}{2}/u.test(l) && !/\p{Ll}/u.test(l);

/**
 * El texto que sale de leer una captura, ordenado para «Probar un diálogo»:
 *  · fuera los timecodes, los ON / OFF y las líneas sin letras;
 *  · «...» pasa a «…»: en una imagen no se distinguen;
 *  · «BHAVANI Ya recuperamos los clanes.» pasa a «BHAVANI: Ya recuperamos…»;
 *  · una línea que empieza en minúscula y sigue a otra sin cerrar es la misma
 *    casilla partida en dos: se juntan. Una continuación de verdad empieza
 *    con «…».
 */
function limpiarCaptura(texto){
  const out = [];
  let nombre = '';   // «BHAVANI» solo en su línea: el diálogo viene debajo
  for(let l of String(texto ?? '').split(/\r?\n/)){
    l = l.replace(/\b\d{1,2}[:;.]\d{2}[:;.]\d{2}[:;.]\d{2}\b/g, ' ')
         .replace(/(?:^|\s)(?:ON|OFF|ON_OFF|OFF_ON)(?=\s|$)/g, ' ')
         .replace(/\.\s?\.\s?\./g, '…').replace(/[‘’`´]/g, "'")
         .replace(/\s+/g, ' ').trim();
    if(!/\p{L}/u.test(l)) continue;
    if(esNombreSuelto(l)){ nombre = l.replace(/\s*:$/, ''); continue; }
    if(nombre){ l = nombre + ': ' + l; nombre = ''; out.push(l); continue; }
    const m = /^([\p{Lu}][\p{Lu}\d'’ .\-]{1,40}?)\s+(?=[(\[]|[¿¡«"…]?\p{Lu}?\p{Ll})/u.exec(l);
    if(m && /\p{Lu}{2}/u.test(m[1]) && !/[:]$/.test(m[1])) l = m[1].trim() + ': ' + l.slice(m[0].length);
    const previa = out[out.length - 1];
    if(previa && /^\p{Ll}/u.test(l) && !/[.?!…:]$/.test(previa)) out[out.length - 1] = previa + ' ' + l;
    else out.push(l);
  }
  return out.join('\n');
}

/* Las cabeceras que se reconocen en una captura, sin tildes ni signos. */
const CAB_PERSONAJE = new Set(['SOURCE', 'PERSONAJE', 'PERSONAJES', 'CHARACTER', 'CHARACTERNAME', 'NOMBRE', 'SPEAKER']);
const DOBLES = new Set(['SOURCE+ONSCREEN', 'CHARACTER+NAME', 'FN+TREATMENT', 'FN+POSITION', 'IN+TIMECODE', 'OUT+TIMECODE', 'TC+IN', 'TC+OUT']);
const CAB_DIALOGO = new Set(['DIALOGUE', 'DIALOG', 'DIALOGO', 'DIALOGOS', 'TEXTO', 'TRADUCCION', 'ADAPTACION', 'DOBLAJE', 'LINEA']);

/**
 * Una captura de una tabla (el Excel, la herramienta de doblaje), convertida
 * en eventos «PERSONAJE: diálogo». Solo se queda con esas dos columnas: los
 * timecodes, la transcripción en inglés, las anotaciones o las etiquetas se
 * quedan fuera.
 *
 * @param palabras  [{ text, bbox: { x0, y0, x1, y1 } }] de Tesseract
 * @param dic       el diccionario (para saber qué columna está en español)
 * @param rayas     alturas (y) de las líneas horizontales de la tabla, si
 *                  las hay: separan las filas aunque una casilla ocupe varias
 *                  líneas de texto
 * @returns { eventos: [{ personaje, dialogo }], texto, como } o null si la
 *          imagen no parece una tabla (entonces se usa limpiarCaptura)
 */
function ordenarCaptura(palabras, dic, rayas){
  const ws = (palabras || []).map(p => ({ t: String(p.text || '').trim(), x0: p.bbox.x0, y0: p.bbox.y0, x1: p.bbox.x1, y1: p.bbox.y1 }))
    .filter(w => w.t && w.x1 > w.x0 && w.y1 > w.y0);
  if(ws.length < 2) return null;
  const alturas = ws.map(w => w.y1 - w.y0).sort((a, b) => a - b);
  const alto = alturas[Math.floor(alturas.length / 2)];
  const cx = (w) => (w.x0 + w.x1) / 2, cy = (w) => (w.y0 + w.y1) / 2;
  const norma = (s) => sinTildes(s).toUpperCase().replace(/[^A-Z]/g, '');

  /* Palabras en líneas: se solapan en vertical. */
  const enLineas = (lista) => {
    const ls = [];
    for(const w of lista.slice().sort((a, b) => cy(a) - cy(b))){
      const l = ls.find(x => Math.abs(cy(w) - x.cy) < alto * 0.55);
      if(l){ l.ws.push(w); l.cy = (l.cy * (l.ws.length - 1) + cy(w)) / l.ws.length; l.y0 = Math.min(l.y0, w.y0); l.y1 = Math.max(l.y1, w.y1); }
      else ls.push({ ws: [w], cy: cy(w), y0: w.y0, y1: w.y1 });
    }
    for(const l of ls){ l.ws.sort((a, b) => a.x0 - b.x0); l.texto = l.ws.map(w => w.t).join(' '); }
    return ls.sort((a, b) => a.cy - b.cy);
  };

  /* 1. Columnas por la cabecera. */
  let colP = null, colD = null, desde = -Infinity, como = '';
  for(const l of enLineas(ws)){
    /* Una palabra, una cabecera; salvo las de dos palabras conocidas: «SOURCE
       ONSCREEN» no es la columna del personaje. Juntar por cercanía fundiría
       columnas pegadas, como «OUT-TIMECODE» y «SOURCE». */
    const celdas = [];
    for(const w of l.ws){
      const c = celdas[celdas.length - 1];
      if(c && w.x0 - c.x1 < alto * 1.6 && DOBLES.has(norma(c.t) + '+' + norma(w.t))){ c.t += ' ' + w.t; c.x1 = w.x1; }
      else celdas.push({ t: w.t, x0: w.x0, x1: w.x1 });
    }
    const tipo = (c) => CAB_PERSONAJE.has(norma(c.t)) ? 'p' : CAB_DIALOGO.has(norma(c.t)) ? 'd' : '';
    if(!celdas.some(c => tipo(c) === 'p') || !celdas.some(c => tipo(c) === 'd')) continue;
    /* El límite entre columnas, a medio camino entre una cabecera y la siguiente. */
    const lim = celdas.map((c, k) => k + 1 < celdas.length ? celdas[k + 1].x0 - alto * 0.4 : Infinity);
    const k = (t) => celdas.findIndex(c => tipo(c) === t);
    const rango = (i) => [i ? lim[i - 1] : -Infinity, lim[i]];
    colP = rango(k('p')); colD = rango(k('d'));
    desde = l.y1; como = 'cabecera';
    break;
  }

  /* 2. Sin cabecera: columnas por los huecos verticales. */
  if(!colP){
    const ancho = Math.max(...ws.map(w => w.x1)) + 1;
    const lleno = new Uint8Array(Math.ceil(ancho));
    for(const w of ws) for(let x = Math.floor(w.x0); x < w.x1; x++) lleno[x] = 1;
    const hueco = Math.max(alto * 1.5, ancho * 0.015);
    const cols = [];
    let ini = -1, vacio = 0;
    for(let x = 0; x <= lleno.length; x++){
      if(x < lleno.length && lleno[x]){ if(ini < 0) ini = x; vacio = 0; }
      else if(ini >= 0 && (++vacio >= hueco || x === lleno.length)){ cols.push([ini, x - vacio + 1]); ini = -1; vacio = 0; }
    }
    if(cols.length < 2) return null;
    const datos = cols.map(([a, b]) => {
      const de = ws.filter(w => cx(w) >= a && cx(w) <= b);
      const letras = de.filter(w => /\p{L}/u.test(w.t));
      const mayus = letras.filter(w => !/\p{Ll}/u.test(w.t)).length / (letras.length || 1);
      const largas = letras.filter(w => w.t.replace(/[^\p{L}]/gu, '').length >= 3);
      const es = dic ? largas.filter(w => dic.tiene(w.t.replace(/[^\p{L}]/gu, '').toLowerCase())).length / (largas.length || 1) : 0;
      const tc = de.filter(w => /^\d{1,2}[:;.]\d{2}/.test(w.t)).length / (de.length || 1);
      return { rango: [a, b], n: letras.length, mayus, es, tc, minus: letras.filter(w => /\p{Ll}/u.test(w.t)).length };
    });
    const nombres = datos.filter(d => d.n && d.mayus >= 0.7 && d.tc < 0.5).sort((a, b) => b.n - a.n);
    const textos = datos.filter(d => d.minus >= 2 && d.tc < 0.5).sort((a, b) => b.es - a.es || b.minus - a.minus);
    if(!textos.length) return null;
    colD = textos[0].rango;
    colP = nombres.length ? nombres[0].rango : null;
    como = 'columnas';
  }

  /* Con cabecera se mira dónde empieza la palabra: el texto va alineado a la
     izquierda de su columna. Sin cabecera, su centro. */
  const dentro = (w, r) => r && (como === 'cabecera' ? w.x0 : cx(w)) >= r[0] && (como === 'cabecera' ? w.x0 : cx(w)) < r[1] && w.y0 >= desde;
  const lineasP = colP ? enLineas(ws.filter(w => dentro(w, colP))).filter(l => /\p{Lu}{2}/u.test(l.texto) && !/\p{Ll}/u.test(l.texto)) : [];
  const lineasD = enLineas(ws.filter(w => dentro(w, colD)));
  if(!lineasD.length) return null;

  /* 3. Cada línea de diálogo, a su fila. Con las rayas de la tabla, la fila
     es la franja entre dos rayas; sin ellas, el nombre más cercano en
     vertical (las celdas pueden ir arriba o abajo). */
  const franjas = (rayas || []).filter(y => y > desde).sort((a, b) => a - b);
  const franja = (y) => franjas.filter(r => r <= y).length;
  const eventos = [];
  /* Si en una franja caben dos personajes, las rayas no son las de las filas. */
  const fiable = franjas.length >= 2 && lineasP.length && new Set(lineasP.map(l => franja(l.cy))).size === lineasP.length;
  if(fiable){
    const porFranja = new Map();
    for(const l of lineasP){ const f = franja(l.cy); if(!porFranja.has(f)) porFranja.set(f, { personaje: [], dialogo: [], y: l.cy }); porFranja.get(f).personaje.push(l.texto); }
    for(const l of lineasD){ const f = franja(l.cy); if(!porFranja.has(f)) porFranja.set(f, { personaje: [], dialogo: [], y: l.cy }); porFranja.get(f).dialogo.push(l.texto); }
    for(const [, e] of Array.from(porFranja.entries()).sort((a, b) => a[0] - b[0])) eventos.push({ personaje: e.personaje.join(' '), dialogo: e.dialogo.join(' ') });
  }else if(lineasP.length){
    const evs = lineasP.map(l => ({ personaje: l.texto, cy: l.cy, dialogo: [] }));
    for(const l of lineasD){
      let mejor = 0;
      for(let k = 1; k < evs.length; k++){
        const dk = Math.abs(evs[k].cy - l.cy), dm = Math.abs(evs[mejor].cy - l.cy);
        /* Empate: si la línea empieza en minúscula sigue a la anterior. */
        if(dk < dm - alto * 0.2 || Math.abs(dk - dm) <= alto * 0.2 && !/^\p{Ll}/u.test(l.texto)) mejor = k;
      }
      evs[mejor].dialogo.push(l.texto);
    }
    for(const e of evs) eventos.push({ personaje: e.personaje, dialogo: e.dialogo.join(' ') });
  }else{
    for(const l of lineasD) eventos.push({ personaje: '', dialogo: l.texto });
  }

  const limpio = (t) => t.replace(/\.\s?\.\s?\./g, '…').replace(/[‘’`´]/g, "'").replace(/\s+([,.;:?!…)\]])/g, '$1').replace(/([¿¡(\[])\s+/g, '$1').replace(/\s+/g, ' ').trim();
  const fuera = eventos.map(e => ({ personaje: limpio(e.personaje).replace(/\s*:$/, ''), dialogo: arreglarInicio(limpio(e.dialogo), dic) })).filter(e => /\p{L}/u.test(e.dialogo));
  if(!fuera.length) return null;
  return {
    eventos: fuera, como,
    texto: fuera.map(e => e.personaje ? e.personaje + ': ' + e.dialogo : e.dialogo).join('\n')
  };
}

/* El nombre del personaje en la línea de una tarjeta: «● FUKUDA ▾ On».
   Lo que no es el nombre (el punto de color, la flecha, la etiqueta On/Off)
   el lector lo devuelve como basura de una o dos letras: «@», «e», «v», «~». */
const RE_TC = /\d{1,2}[:;.]\d{2}[:;.]\d{2}[:;.]\d{2}/;
const ETIQUETA_TARJETA = /^\W{0,3}#|^\W{0,3}(foreign dialog|context|main title|episode title|sensitive language|song|lyrics|music|on-?screen text|graphics?|forced narrative|burned|narrative)\b/i;
function nombreDeLinea(t){
  const fichas = t.replace(/[●•◉○◦·*®©°▾▼▿⌄˅|[\](){}]/g, ' ').split(/\s+/).filter(Boolean)
    .filter(x => !/^(on|off|on_off|off_on)$/i.test(x));
  const nombre = [], resto = [];
  for(const x of fichas){
    if(/^[\p{Lu}\d][\p{Lu}\d'’.\-]*$/u.test(x) && /\p{Lu}/u.test(x) && (nombre.length || /\p{Lu}{2}/u.test(x))) nombre.push(x);
    else resto.push(x);
  }
  if(!nombre.length || resto.some(x => x.replace(/[^\p{L}\d]/gu, '').length > 2)) return '';
  return nombre.join(' ').replace(/[.\-]+$/, '');
}

/**
 * Una captura de la herramienta de guiones de Netflix: una tarjeta por
 * evento, con los timecodes arriba, el personaje («FUKUDA ▾ On»), la línea de
 * diálogo en letra grande y, tras una raya, las etiquetas («# Foreign Dialog»)
 * y las anotaciones («speaks Japanese»). Solo se queda con el personaje y su
 * línea.
 *
 * @param lineas  [{ text, bbox }] de Tesseract (data.lines)
 * @param dic     el diccionario: una anotación en inglés no es diálogo
 * @param rayas   alturas de las líneas horizontales (la raya bajo el diálogo)
 * @returns { eventos, texto, como: 'tarjetas' } o null si no son tarjetas
 */
/* La primera palabra en mayúsculas cuando el resto no lo está es casi
   siempre un error de lectura: «OÍ que se sumó» es «Oí que se sumó». */
function arreglarInicio(t, dic){
  const m = /^([¿¡«"…]*)(\p{Lu}{2,3})(?=[\s,.;:!?…])/u.exec(t);
  if(!m || !dic || !/\p{Ll}{3}/u.test(t.slice(m[0].length))) return t;
  const w = m[2][0] + m[2].slice(1).toLowerCase();
  return dic.tiene(w.toLowerCase()) ? m[1] + w + t.slice(m[0].length) : t;
}

function ordenarTarjetas(lineas, dic, rayas){
  const ls = (lineas || []).map(l => ({ t: String(l.text || '').replace(/\s+/g, ' ').trim(), y0: l.bbox.y0, y1: l.bbox.y1, h: l.bbox.y1 - l.bbox.y0 }))
    .filter(l => l.t).sort((a, b) => a.y0 - b.y0);
  /* Tarjetas: hay líneas que solo llevan timecodes («00:36:43:06 - 00:36:45:15
     02:09 0781»). En un Excel el timecode comparte línea con el diálogo. */
  const soloTc = (t) => RE_TC.test(t) && /^[\d:;.,\s\-–—|]+$/.test(t);
  if(!ls.some(l => soloTc(l.t)) || !ls.some(l => nombreDeLinea(l.t))) return null;
  const rs = (rayas || []).slice().sort((a, b) => a - b);
  const rayaEntre = (a, b) => rs.some(y => y > a && y < b);
  const espanol = (t) => {
    const ws = (t.match(/\p{L}{3,}/gu) || []);
    return !dic || !ws.length ? 1 : ws.filter(w => dic.tiene(w.toLowerCase())).length / ws.length;
  };
  const eventos = [];
  let ev = null, fase = 'fuera', finDialogo = 0;
  for(const l of ls){
    if(soloTc(l.t)){ ev = { personaje: '', dialogo: [], tc: (RE_TC.exec(l.t) || [''])[0] }; eventos.push(ev); fase = 'nombre'; continue; }
    if(/^\W*\d{1,6}\W*$/.test(l.t)) continue;                       // el número del evento
    const nombre = nombreDeLinea(l.t);
    /* Un nombre abre la tarjeta. Con el diálogo empezado, solo si su letra es
       más pequeña (un «OK» en mayúsculas es diálogo). */
    const hDialogo = ev && fase === 'dialogo' ? Math.max(0, ...ev.dialogo.map(x => x.h)) : 0;
    if(nombre && (fase !== 'dialogo' || (hDialogo && l.h < hDialogo * 0.85))){
      if(!ev || fase !== 'nombre'){ ev = { personaje: '', dialogo: [], tc: '' }; eventos.push(ev); }
      ev.personaje = nombre; fase = 'dialogo'; finDialogo = l.y1;
      continue;
    }
    if(fase !== 'dialogo') continue;
    /* Hasta la raya, las etiquetas o las anotaciones, todo es candidato. */
    const mayor = Math.max(0, ...ev.dialogo.map(x => x.h));
    const nota = ETIQUETA_TARJETA.test(l.t) || /^[✎✏✐🖉🖊&]/u.test(l.t) || /^[Zz2]\s+\p{Ll}/u.test(l.t)
      || (ev.dialogo.length && rayaEntre(finDialogo, l.y0))
      || (mayor && l.h < mayor * 0.8 && espanol(l.t) < 0.3);
    if(nota){ fase = 'notas'; continue; }
    ev.dialogo.push(l); finDialogo = l.y1;
  }
  /* La línea de diálogo es la de letra grande. Encima, en pequeño y tachada,
     la herramienta enseña la versión anterior: esa no se revisa. */
  for(const e of eventos){
    const mayor = Math.max(0, ...e.dialogo.map(x => x.h));
    e.dialogo = e.dialogo.filter(x => x.h >= mayor * 0.82).map(x => x.t);
  }
  const limpio = (t) => t.replace(/\.\s?\.\s?\./g, '…').replace(/[‘’`´]/g, "'").replace(/\s+([,.;:?!…)\]])/g, '$1').replace(/([¿¡(\[])\s+/g, '$1').trim();
  const fuera = eventos.map(e => ({ personaje: e.personaje, dialogo: arreglarInicio(limpio(e.dialogo.join(' ')), dic), tc: e.tc })).filter(e => e.personaje && /\p{L}/u.test(e.dialogo));
  if(!fuera.length) return null;
  return { eventos: fuera, como: 'tarjetas', texto: fuera.map(e => e.personaje + ': ' + e.dialogo).join('\n') };
}

return { leerLibro, extraerGuion, crearDiccionario, sugerir, revisar, revisarTexto, contexto, limpiarCaptura, ordenarCaptura, ordenarTarjetas, xlsx, REGLAS, CATEGORIAS,
         _interno: { tapar, guiasDe, palabras, esReaccion, distancia, variantesTilde, leerZip } };
})();

if(typeof module !== 'undefined' && module.exports) module.exports = RevisorASREC;
