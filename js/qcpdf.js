/* Informes de QC en PDF · especificacion 09
 *
 * Un PDF A4 limpio, con el aire de las hojas de Apple: fondo blanco, Helvetica,
 * esquinas redondeadas y la tabla dentro de una tarjeta. Lo usan dos sitios:
 *
 *   - el libreto, para entregar las correcciones apuntadas en QC
 *   - el convertidor del dashboard, para rehacer un informe que llega feo
 *
 * El motor se baja cuando hace falta y no antes: son 350 kB que la mayoria de
 * las sesiones no toca, y esto se abre en salas con la red justa.
 *
 * Todo en milimetros, que es como se piensa una hoja. A4 son 210 x 297.
 */
'use strict';

const QCPDF_LIB = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';

/* La paleta. Dos juegos: el de color y el de escala de grises, que se pide
   cuando el informe lleva un poster y tiene que salir en blanco y negro. */
const QCPDF_COLOR = {
  tinta:   [17, 17, 17],
  suave:   [110, 110, 115],
  tc:      [0, 102, 204],        // #0066CC
  texto:   [58, 58, 60],
  borde:   [235, 235, 240],      // #EBEBF0
  cabeza:  [250, 250, 252],      // #FAFAFC
  tarjeta: [255, 255, 255]
};
const QCPDF_GRIS = {
  tinta:   [17, 17, 17],
  suave:   [120, 120, 120],
  tc:      [51, 51, 51],         // #333
  texto:   [51, 51, 51],
  borde:   [218, 218, 218],      // #DADADA
  cabeza:  [242, 242, 242],      // #F2F2F2
  tarjeta: [255, 255, 255]
};

/** Baja jsPDF una sola vez. Se inyecta un <script> en vez de importarlo porque
    la libreria es UMD y la CSP de produccion no deja `eval`. */
let _qcpdfCargando = null;
function qcpdfCargar(){
  if(window.jspdf && window.jspdf.jsPDF) return Promise.resolve(window.jspdf.jsPDF);
  if(_qcpdfCargando) return _qcpdfCargando;
  _qcpdfCargando = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = QCPDF_LIB;
    s.onload = () => {
      if(window.jspdf && window.jspdf.jsPDF) res(window.jspdf.jsPDF);
      else rej(new Error('jsPDF se bajó pero no quedó donde se esperaba'));
    };
    s.onerror = () => { _qcpdfCargando = null; rej(new Error('no se pudo bajar el motor de PDF (cdnjs.cloudflare.com)')); };
    document.head.appendChild(s);
  });
  return _qcpdfCargando;
}

/* ── Medidas de la hoja ──────────────────────────────────────────────────── */

const QCPDF_HOJA = { w: 210, h: 297 };

/** Las medidas que se van encogiendo hasta que el informe cabe en dos hojas.
    El primer paso es el que se querria siempre; del ultimo no se baja. */
const QCPDF_PASOS = [
  { fuente: 9.5, fila: 6.2,  margen: 16, cab: 4.6 },
  { fuente: 9.0, fila: 5.6,  margen: 15, cab: 4.3 },
  { fuente: 8.5, fila: 5.1,  margen: 14, cab: 4.1 },
  { fuente: 8.0, fila: 4.7,  margen: 13, cab: 3.9 },
  { fuente: 7.5, fila: 4.3,  margen: 12, cab: 3.7 }
];

/** Cuanto ocupa de ancho cada columna, repartiendo el hueco disponible.
    Los pesos los manda quien llama; se normalizan aqui para que sumen el
    ancho util, pase lo que pase con los que vengan. */
function qcpdfAnchos(cols, util){
  const pesos = cols.map(c => (isFinite(+c.peso) && +c.peso > 0) ? +c.peso : 1);
  const tot = pesos.reduce((a, b) => a + b, 0);
  return pesos.map(p => util * (p / tot));
}

/* ── Texto que el PDF sepa escribir ─────────────────────────────────────── */

/* Las tipografias de serie de un PDF escriben WinAnsi, o sea Latin-1 y un
   puñado de signos tipograficos. Lo que no esta ahi no sale... y no sale MUDO:
   se lleva por delante el renglon entero. Medido en el navegador: una
   correccion marcada con «✓» salia COMPLETAMENTE VACIA en el informe.
   Cualquier emoji que alguien escriba en un comentario haria lo mismo, asi que
   esto no es el arreglo de un caracter, es una red debajo de todos. */
const QCPDF_WINANSI = new Set([
  0x20AC, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021, 0x02C6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017D, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022,
  0x2013, 0x2014, 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x017E, 0x0178
]);
/* Los que tienen una traduccion que se entiende mejor que un hueco. */
const QCPDF_CAMBIOS = {
  '✓':'OK', '✔':'OK', '✗':'x', '✘':'x', '✘':'x',
  '→':'->', '←':'<-', '⇒':'=>', ' ':' ',
  '≤':'<=', '≥':'>=', '×':'x', '′':"'", '″':'"'
};

/** El texto tal como el PDF lo puede escribir. No cambia palabras: solo los
    signos que la tipografia no sabe dibujar, y nunca por nada en silencio. */
function qcpdfTextoSeguro(s){
  const t = String(s == null ? '' : s);
  let out = '';
  for(const ch of t){
    const c = ch.codePointAt(0);
    if(c === 10 || c === 9){ out += ch; continue; }             // salto y tabulador
    if(c >= 32 && c <= 255){ out += ch; continue; }             // Latin-1, que es casi todo
    if(QCPDF_WINANSI.has(c)){ out += ch; continue; }
    const cambio = QCPDF_CAMBIOS[ch];
    /* Se pone algo visible: un hueco callado haria pensar que el original
       tampoco decia nada ahi. */
    out += (cambio != null) ? cambio : '?';
  }
  return out;
}

/* ── El texto de una celda, partido en renglones ─────────────────────────── */

/** Los renglones que ocupa un texto en un ancho dado.
    Un comentario que llega partido en varias lineas del PDF original se une
    en un parrafo; las notas de «GUION:» van aparte, como parrafo propio. */
function qcpdfParrafos(txt){
  const s = qcpdfTextoSeguro(String(txt == null ? '' : txt).replace(/\r/g, ''));
  if(!s.trim()) return [''];
  /* «GUION:» empieza parrafo aunque venga pegado a lo anterior: es una nota
     del guion, no la continuacion del comentario. */
  const partido = s.replace(/\s*(GUION\s*:)/gi, '\n$1');
  return partido.split(/\n+/).map(p => p.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/* ── Dibujar ─────────────────────────────────────────────────────────────── */

function qcpdfRect(doc, x, y, w, h, r, relleno, borde){
  if(relleno) doc.setFillColor(relleno[0], relleno[1], relleno[2]);
  if(borde) doc.setDrawColor(borde[0], borde[1], borde[2]);
  const modo = (relleno && borde) ? 'FD' : (relleno ? 'F' : 'S');
  doc.setLineWidth(0.25);
  if(r > 0) doc.roundedRect(x, y, w, h, r, r, modo);
  else doc.rect(x, y, w, h, modo);
}

/** Las tarjetas de arriba con los datos de sesion. Devuelve el alto usado. */
function qcpdfTarjetas(doc, tarjetas, x, y, ancho, P, paso){
  if(!tarjetas || !tarjetas.length) return 0;
  const hueco = 3;
  const n = Math.min(tarjetas.length, 4);
  const w = (ancho - hueco * (n - 1)) / n;
  const h = 13;
  tarjetas.slice(0, n).forEach((t, i) => {
    const cx = x + i * (w + hueco);
    qcpdfRect(doc, cx, y, w, h, 2.5, P.cabeza, P.borde);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(6.2);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(qcpdfTextoSeguro(String(t.k || '').toUpperCase()), cx + 3, y + 5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(P.tinta[0], P.tinta[1], P.tinta[2]);
    qcpdfValorTarjeta(doc, qcpdfTextoSeguro(t.v), cx + 3, y + 10, w - 6, paso);
  });
  return h + 6;
}

/** El valor de una tarjeta, entero.
    Se encoge hasta que quepa en un renglon y, si aun no cabe, se parte en dos;
    la tarjeta tiene sitio. Antes se cogia el primer renglon y se tiraba el
    resto: «100 DAYS OF DECEPTION 101» salia como «100 DAYS OF», que es perder
    un dato del original callando. */
function qcpdfValorTarjeta(doc, v, x, y, ancho, paso){
  const s = String(v == null ? '' : v);
  if(!s) return;
  for(let f = paso.fuente - 0.5; f >= 5.4; f -= 0.4){
    doc.setFontSize(f);
    if(doc.splitTextToSize(s, ancho).length <= 1){ doc.text(s, x, y); return; }
  }
  doc.setFontSize(5.4);
  const ls = doc.splitTextToSize(s, ancho);
  doc.text(ls[0], x, y - 1.7);
  /* Dos renglones es lo que hay. Si sobra algo se marca con puntos: un corte
     que no se ve es un dato perdido del que nadie se entera. */
  if(ls[1]) doc.text(ls.length > 2 ? (ls[1] + '…') : ls[1], x, y + 1.3);
}

/** El encabezado: etiqueta pequeña, titulo grande, subtitulo y el conteo a la
    derecha. Con poster, la tarjeta de 52 x 78 mm va a la izquierda. */
function qcpdfEncabezado(doc, d, x, y, ancho, P, paso, conPoster){
  let cy = y;
  let ix = x, iw = ancho;
  if(conPoster){
    const pw = 52, ph = 78;
    qcpdfRect(doc, x, y, pw, ph, 3, P.cabeza, P.borde);
    try{ if(d.poster) doc.addImage(d.poster, 'JPEG', x + 1.2, y + 1.2, pw - 2.4, ph - 2.4); }
    catch(e){ /* sin imagen se queda la tarjeta, que ya dice donde iba */ }
    ix = x + pw + 6; iw = ancho - pw - 6;
  }
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
  doc.text(qcpdfTextoSeguro(String(d.etiqueta || '').toUpperCase()), ix, cy + 3.5);

  /* El conteo, a la derecha y a la misma altura que el titulo. */
  if(d.conteo){
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(qcpdfTextoSeguro(d.conteo), x + ancho, cy + 11, { align: 'right' });
  }

  doc.setFont('helvetica', 'bold'); doc.setFontSize(19);
  doc.setTextColor(P.tinta[0], P.tinta[1], P.tinta[2]);
  try{ doc.setCharSpace(-0.35); }catch(e){ /* motor viejo: sin tracking */ }
  const tit = doc.splitTextToSize(qcpdfTextoSeguro(d.titulo), iw - (d.conteo ? 34 : 0));
  doc.text(tit.slice(0, 2), ix, cy + 12);
  try{ doc.setCharSpace(0); }catch(e){ /* se deja como estaba */ }
  cy += 12 + (tit.length > 1 ? 7 : 0);

  if(d.subtitulo){
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(doc.splitTextToSize(qcpdfTextoSeguro(d.subtitulo), iw)[0] || '', ix, cy + 5);
    cy += 5;
  }
  cy += 6;
  if(d.tarjetas && d.tarjetas.length) cy += qcpdfTarjetas(doc, d.tarjetas, ix, cy, iw, P, paso);
  /* Con poster, el cuerpo no empieza hasta que la tarjeta se acaba. */
  if(conPoster) cy = Math.max(cy, y + 78 + 6);
  return cy;
}

function qcpdfPie(doc, nombre, pag, de, P, margen){
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7);
  doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
  const y = QCPDF_HOJA.h - margen + 5;
  doc.text(qcpdfTextoSeguro(nombre), margen, y);
  doc.text('página ' + pag + ' / ' + de, QCPDF_HOJA.w - margen, y, { align: 'right' });
}

/** Cuanto alto necesita una fila con unas medidas dadas. Se mide ANTES de
    dibujar nada, que es lo que permite no partir ninguna entre hojas. */
function qcpdfAltoFila(doc, fila, cols, anchos, paso){
  doc.setFontSize(paso.fuente);
  let max = paso.fila;
  cols.forEach((c, i) => {
    const parr = qcpdfParrafos(fila[i]);
    doc.setFont('helvetica', c.negrita ? 'bold' : 'normal');
    let n = 0;
    for(const p of parr) n += doc.splitTextToSize(p, anchos[i] - 4).length;
    const alto = 2.6 + n * (paso.fuente * 0.41) + (parr.length - 1) * 1.2;
    if(alto > max) max = alto;
  });
  return max;
}

/** El informe entero con unas medidas. Devuelve cuantas hojas le han hecho
    falta, para poder probar con las siguientes si no cabe. */
function qcpdfPintar(doc, d, paso, medir){
  const P = d.gris ? QCPDF_GRIS : QCPDF_COLOR;
  const m = paso.margen;
  const util = QCPDF_HOJA.w - m * 2;
  const cols = d.columnas || [];
  const anchos = qcpdfAnchos(cols, util);
  const conPoster = !!d.poster;

  let pag = 1;
  let y = qcpdfEncabezado(doc, d, m, m, util, P, paso, conPoster);
  const tope = QCPDF_HOJA.h - m - 8;

  /* La cabecera de la tabla, que se repite en cada hoja. */
  const cabecera = (yy) => {
    qcpdfRect(doc, m, yy, util, paso.cab + 2.4, 0, P.cabeza, P.borde);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(6.4);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    let cx = m;
    cols.forEach((c, i) => {
      doc.text(qcpdfTextoSeguro(String(c.et || '').toUpperCase()), cx + 2, yy + paso.cab);
      cx += anchos[i];
    });
    return yy + paso.cab + 2.4;
  };

  const nuevaHoja = () => {
    pag++;
    if(!medir) doc.addPage();
    y = m;
    y = cabecera(y);
  };

  /* La tarjeta que envuelve la tabla se dibuja por tramos: uno por hoja, y no
     se sabe donde acaba hasta haber colocado las filas, asi que se guarda
     donde empieza y se cierra al cambiar de hoja. */
  let tramoY = y;
  const cerrarTramo = (hasta) => {
    if(medir || hasta <= tramoY) return;
    qcpdfRect(doc, m, tramoY, util, hasta - tramoY, 2.5, null, P.borde);
  };

  y = cabecera(y);
  const filas = d.filas || [];
  for(let i = 0; i < filas.length; i++){
    const f = filas[i];
    /* Un separador de grupo -Mañana / Tarde en los llamados- no es una fila. */
    if(f && f.grupo){
      const alto = paso.fila + 2;
      if(y + alto > tope){ cerrarTramo(y); nuevaHoja(); tramoY = y - paso.cab - 2.4; }
      if(!medir){
        doc.setFont('helvetica', 'bold'); doc.setFontSize(paso.fuente);
        doc.setTextColor(P.tinta[0], P.tinta[1], P.tinta[2]);
        doc.text(qcpdfTextoSeguro(f.grupo), m + 2, y + paso.fila - 1.4);
      }
      y += alto;
      continue;
    }
    const alto = qcpdfAltoFila(doc, f, cols, anchos, paso);
    /* Ninguna fila se corta entre hojas: si no cabe entera, pasa a la siguiente. */
    if(y + alto > tope){ cerrarTramo(y); nuevaHoja(); tramoY = y - paso.cab - 2.4; }
    if(!medir){
      if(i > 0){
        doc.setDrawColor(P.borde[0], P.borde[1], P.borde[2]); doc.setLineWidth(0.2);
        doc.line(m + 1.5, y, m + util - 1.5, y);
      }
      let cx = m;
      cols.forEach((c, j) => {
        const col = (c.clase === 'tc') ? P.tc : (c.clase === 'nombre' ? P.tinta : P.texto);
        doc.setTextColor(col[0], col[1], col[2]);
        doc.setFont('helvetica', c.negrita ? 'bold' : 'normal');
        doc.setFontSize(paso.fuente);
        let ty = y + 2.6 + paso.fuente * 0.30;
        for(const p of qcpdfParrafos(f[j])){
          const ls = doc.splitTextToSize(p, anchos[j] - 4);
          for(const l of ls){ doc.text(l, cx + 2, ty); ty += paso.fuente * 0.41; }
          ty += 1.2;
        }
        cx += anchos[j];
      });
    }
    y += alto;
  }
  cerrarTramo(y);
  if(!medir) for(let p = 1; p <= pag; p++){ doc.setPage(p); qcpdfPie(doc, d.nombreDoc, p, pag, P, m); }
  return pag;
}

/** El informe, encogiendo hasta que quepa en el tope de hojas (dos).
    Se mide con un documento de usar y tirar y solo se pinta el paso bueno: asi
    no queda un PDF con hojas de los intentos anteriores. */
async function qcpdfHacer(d){
  const jsPDF = await qcpdfCargar();
  const topeHojas = isFinite(+d.topeHojas) ? +d.topeHojas : 2;
  let elegido = QCPDF_PASOS[QCPDF_PASOS.length - 1];
  for(const paso of QCPDF_PASOS){
    const prueba = new jsPDF({ unit:'mm', format:'a4', compress:true });
    const hojas = qcpdfPintar(prueba, d, paso, true);
    if(hojas <= topeHojas){ elegido = paso; break; }
  }
  const doc = new jsPDF({ unit:'mm', format:'a4', compress:true });
  qcpdfPintar(doc, d, elegido, false);
  return doc;
}

/** Lo hace y lo descarga. */
async function qcpdfDescargar(d, nombre){
  const doc = await qcpdfHacer(d);
  doc.save(String(nombre || 'informe').replace(/\.pdf$/i, '') + '.pdf');
  return true;
}

/* ── Una imagen en blanco y negro ────────────────────────────────────────── */

/** El poster, pasado a grises. Se hace aqui y no con un filtro del PDF porque
    el informe en escala de grises tiene que poder imprimirse tal cual. */
function qcpdfGrisear(file){
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => {
      try{
        const c = document.createElement('canvas');
        const esc = Math.min(1, 900 / Math.max(im.width, im.height));
        c.width = Math.max(1, Math.round(im.width * esc));
        c.height = Math.max(1, Math.round(im.height * esc));
        const g = c.getContext('2d');
        g.drawImage(im, 0, 0, c.width, c.height);
        const d = g.getImageData(0, 0, c.width, c.height);
        for(let i = 0; i < d.data.length; i += 4){
          /* Luminancia de verdad, no la media: con la media el rojo y el azul
             salen igual de claros y el poster se queda plano. */
          const v = 0.2126*d.data[i] + 0.7152*d.data[i+1] + 0.0722*d.data[i+2];
          d.data[i] = d.data[i+1] = d.data[i+2] = v;
        }
        g.putImageData(d, 0, 0);
        res(c.toDataURL('image/jpeg', 0.86));
      }catch(e){ rej(e); }
      finally{ try{ URL.revokeObjectURL(url); }catch(e){} }
    };
    im.onerror = () => { try{ URL.revokeObjectURL(url); }catch(e){} rej(new Error('no se pudo leer la imagen')); };
    im.src = url;
  });
}

/* ── Leer el informe que entra ───────────────────────────────────────────── */

/** Los renglones de un PDF, con la posicion de cada trozo de texto.
    Hace falta la X para saber de que columna es cada cosa: el texto suelto no
    lleva esa informacion y un comentario con un timecode dentro se colaria en
    la columna del timecode. */
async function qcpdfLeerPdf(buf){
  const doc = await pdfjsLib.getDocument({
    data: buf,
    cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/standard_fonts/'
  }).promise;
  const hojas = [];
  for(let p = 1; p <= doc.numPages; p++){
    const pg = await doc.getPage(p);
    const tc = await pg.getTextContent();
    const trozos = (tc.items || [])
      .filter(it => it && String(it.str || '').trim())
      .map(it => ({ t: String(it.str), x: it.transform[4], y: it.transform[5] }));
    hojas.push(qcpdfRenglones(trozos));
  }
  return hojas;
}

/** Agrupa los trozos en renglones por su altura, y cada renglon de izquierda a
    derecha. La tolerancia es generosa a proposito: dentro de un mismo renglon
    las letras no caen todas a la misma altura exacta. */
function qcpdfRenglones(trozos){
  const filas = [];
  for(const it of trozos){
    let f = filas.find(r => Math.abs(r.y - it.y) <= 2.6);
    if(!f){ f = { y: it.y, cel: [] }; filas.push(f); }
    f.cel.push(it);
  }
  filas.sort((a, b) => b.y - a.y);                 // en un PDF, la Y crece hacia arriba
  filas.forEach(f => f.cel.sort((a, b) => a.x - b.x));
  return filas;
}

/** Los datos de sesion que Pro Tools pone arriba. Se buscan por su nombre y no
    por su sitio: cada version del programa los coloca distinto. */
const QCPDF_SESION = [
  ['Session Name', /session\s*name/i],
  ['Sample Rate', /sample\s*rate/i],
  ['Bit Depth', /bit\s*depth/i],
  ['Timecode Format', /time\s*code\s*format|timecode\s*format/i]
];
function qcpdfDatosSesion(filas){
  const out = [];
  const texto = filas.map(f => f.cel.map(c => c.t).join(' ').replace(/\s+/g, ' ').trim());
  for(const [et, re] of QCPDF_SESION){
    for(const l of texto){
      if(!re.test(l)) continue;
      const v = l.replace(/^.*?(?::|\t)\s*/, '').trim();
      if(v && !re.test(v)){ out.push({ k: et, v: v }); break; }
    }
  }
  return out;
}

/** El renglon que hace de cabecera de la tabla y donde empieza cada columna.
    Se acepta con DOS palabras conocidas: con una sola, cualquier comentario que
    diga «name» se llevaria la tabla por delante. */
const QCPDF_CABEZAS = /^(#|location|time\s*reference|units|name|comments?|start|end|duration|track|salida|observaciones)$/i;
function qcpdfCabecera(filas){
  for(let i = 0; i < filas.length; i++){
    const cel = filas[i].cel;
    const buenas = cel.filter(c => QCPDF_CABEZAS.test(c.t.trim()));
    if(buenas.length >= 2)
      return { i: i, cols: buenas.map(c => ({ et: c.t.trim(), x: c.x })) };
  }
  return null;
}

/** De que columna es un trozo: de la ultima que empieza a su izquierda.
    Por su inicio y no por el mas cercano: el texto de una celda se alinea a la
    izquierda y crece hacia la derecha, asi que el centro enseguida cae mas
    cerca de la columna siguiente. */
function qcpdfColumnaDe(x, cols){
  let k = 0;
  for(let i = 0; i < cols.length; i++) if(x >= cols[i].x - 6) k = i;
  return k;
}

/** El informe entero: datos de sesion, columnas y filas.
    Un renglon cuya PRIMERA columna viene vacia es la continuacion del anterior
    -un comentario partido-, y se le pega al de arriba en vez de abrir fila. */
function qcpdfLeerInforme(hojas, nombre){
  const todas = [].concat.apply([], hojas);
  const cab = qcpdfCabecera(todas);
  if(!cab) return null;
  const cols = cab.cols;
  const filas = [];
  /* Solo desde la cabecera hacia abajo, y saltandose las cabeceras repetidas
     que trae cada hoja. */
  for(const hoja of hojas){
    const desde = (hoja === hojas[0]) ? cab.i + 1 : 0;
    for(let i = desde; i < hoja.length; i++){
      const cel = hoja[i].cel;
      if(cel.filter(c => QCPDF_CABEZAS.test(c.t.trim())).length >= 2) continue;
      const fila = new Array(cols.length).fill('');
      for(const c of cel){
        const k = qcpdfColumnaDe(c.x, cols);
        fila[k] = (fila[k] ? fila[k] + ' ' : '') + c.t;
      }
      /* El numero de hoja del PDF de origen, pegado y solo: se ignora. */
      const soloUna = fila.filter(Boolean).length === 1;
      if(soloUna && /^\s*\d{1,3}\s*$/.test(fila.join('')) ) continue;
      if(!fila.join('').trim()) continue;
      const primera = fila[0].trim();
      if(!primera && filas.length){
        /* Continuacion: cada trozo a su columna, pegado a lo que ya habia. */
        const ult = filas[filas.length - 1];
        for(let k = 0; k < cols.length; k++)
          if(fila[k].trim()) ult[k] = (ult[k] ? ult[k] + '\n' : '') + fila[k].trim();
        continue;
      }
      filas.push(fila.map(s => s.trim()));
    }
  }
  return { tarjetas: qcpdfDatosSesion(todas), columnas: cols.map(c => c.et), filas: filas, nombre: nombre };
}

/** ¿Es un llamado de actores? Se decide por lo que traen las columnas, no por
    el nombre del archivo, que lo pone cada estudio como quiere. */
function qcpdfEsLlamado(inf){
  if(!inf) return false;
  const c = inf.columnas.join(' ').toLowerCase();
  return /actor|talento|llamado|call/.test(c) || /salida|observaciones/.test(c);
}

/** El reparto de un llamado en Mañana y Tarde, por la hora de la primera
    columna que traiga una. Antes de las 14:00 es mañana. */
function qcpdfPorTurno(filas){
  const hora = (f) => {
    for(const c of f){
      const m = String(c || '').match(/(\d{1,2})\s*[:.]\s*(\d{2})/);
      if(m) return (+m[1]) + (+m[2]) / 60;
    }
    return null;
  };
  const man = [], tar = [], sin = [];
  for(const f of filas){
    const h = hora(f);
    if(h == null) sin.push(f);
    else if(h < 14) man.push(f);
    else tar.push(f);
  }
  const out = [];
  if(man.length){ out.push({ grupo:'Mañana' }); man.forEach(f => out.push(f)); }
  if(tar.length){ out.push({ grupo:'Tarde' }); tar.forEach(f => out.push(f)); }
  sin.forEach(f => out.push(f));
  return out;
}

/* ── De lo leido a lo que se pinta ───────────────────────────────────────── */

/** Que pinta tiene cada columna. El timecode en azul y negrita, el nombre en
    negrita, el comentario en gris oscuro y ancho, que es donde va el texto. */
function qcpdfPintaColumna(et){
  const s = String(et || '').trim().toLowerCase();
  if(s === '#' || /^n[.º°]?$/.test(s)) return { et: et, peso: 0.35, clase:'texto' };
  if(/location|time\s*ref|^start$|^end$|timecode|tiempo|hora/.test(s))
    return { et: et, peso: 1.15, clase:'tc', negrita: true };
  if(/name|nombre|personaje|actor|talento/.test(s))
    return { et: et, peso: 1.45, clase:'nombre', negrita: true };
  if(/comment|observaci|nota/.test(s)) return { et: et, peso: 3.2, clase:'texto' };
  if(/salida/.test(s)) return { et: et, peso: 1.0, clase:'texto' };
  if(/units|duration|track/.test(s)) return { et: et, peso: 0.8, clase:'texto' };
  return { et: et, peso: 1.4, clase:'texto' };
}

/** El informe leido, listo para pintar. No se cambia NI UNA palabra: ni
    mayusculas, ni erratas, ni abreviaturas. Solo se decide como se ve. */
function qcpdfDeInforme(inf, opts){
  opts = opts || {};
  const llamado = qcpdfEsLlamado(inf);
  let columnas = inf.columnas.map(qcpdfPintaColumna);
  let filas = inf.filas;
  if(llamado){
    /* Un llamado se agrupa por turno y lleva dos columnas en blanco para
       rellenar a mano, que es como se usa en sala. */
    filas = qcpdfPorTurno(filas);
    const tiene = (re) => columnas.some(c => re.test(String(c.et).toLowerCase()));
    if(!tiene(/salida/)) columnas = columnas.concat([{ et:'Salida', peso:1.0, clase:'texto' }]);
    if(!tiene(/observaci/)) columnas = columnas.concat([{ et:'Observaciones', peso:2.2, clase:'texto' }]);
  }
  const cuantas = filas.filter(f => f && !f.grupo).length;
  const base = String(inf.nombre || 'informe').replace(/\.pdf$/i, '');
  return {
    etiqueta: llamado ? 'Llamado de actores' : 'Control de calidad',
    titulo: opts.titulo || base,
    subtitulo: opts.subtitulo || '',
    conteo: cuantas + (llamado ? (' llamado' + (cuantas === 1 ? '' : 's'))
                               : (' correcci' + (cuantas === 1 ? 'ón' : 'ones'))),
    tarjetas: inf.tarjetas || [],
    columnas: columnas,
    filas: filas,
    nombreDoc: base,
    gris: !!opts.poster,
    poster: opts.poster || null,
    topeHojas: 2
  };
}

/** El informe de las correcciones apuntadas en QC, del capitulo abierto. */
function qcpdfDeCorrecciones(lista, titulo, subtitulo){
  const filas = (lista || []).map(c => [
    (typeof qcTC === 'function' ? qcTC(c.tcSec) : ''),
    c.quien || '',
    /* Una palabra y no un símbolo: los «✓» no existen en la tipografía de un
       PDF de serie y se llevaban el comentario entero por delante. */
    (c.hecha ? 'RESUELTA · ' : '') + c.texto
  ]);
  const base = String(titulo || 'Control de calidad').replace(/[\/:*?"<>|]/g, '-');
  return {
    etiqueta: 'Control de calidad',
    titulo: titulo || 'Control de calidad',
    subtitulo: subtitulo || '',
    conteo: filas.length + ' correcci' + (filas.length === 1 ? 'ón' : 'ones'),
    tarjetas: [],
    columnas: [
      { et:'Tiempo',     peso:1.15, clase:'tc', negrita:true },
      { et:'Personaje',  peso:1.45, clase:'nombre', negrita:true },
      { et:'Corrección', peso:3.2,  clase:'texto' }
    ],
    filas: filas,
    nombreDoc: base,
    gris: false,
    poster: null,
    topeHojas: 2
  };
}

/* ── Los paneles del dashboard ───────────────────────────────────────────── */

/* Estos viven en el documento de fuera, no dentro del libreto, asi que llevan
   la clase `.modo-cap`: sin ella `body.ddlov` los esconderia con el libreto
   abierto y el boton no haria nada. */

/** La caja de herramientas: lo que no depende de ningun capitulo. */
function herramientasPanel(){
  const viejo = document.getElementById('herrOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'herrOv'; ov.className = 'dlgov modo-cap';
  ov.innerHTML = '<div class="dlgcard">'
    + '<div class="herr-h">Herramientas</div>'
    + '<div class="herr-sub">No dependen de ningún capítulo ni programa.</div>'
    + '<button class="herr-it" id="herrConv">'
      + '<span class="herr-ic">⤓</span>'
      + '<span class="herr-tx"><b>Convertidor PDF QC</b>'
      + '<i>Coge informes de QC o llamados de actores y los rehace en A4 limpio, '
      + 'sin cambiar ni una palabra. Un PDF por cada uno.</i></span></button>'
    + '<div class="herr-fb"><button id="herrX">Cerrar</button></div>'
    + '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e)=>{ if(e.target === ov) ov.remove(); });
  const x = ov.querySelector('#herrX'); if(x) x.onclick = ()=> ov.remove();
  const c = ov.querySelector('#herrConv');
  if(c) c.onclick = ()=>{ ov.remove(); qcConvPanel(); };
}

/* Lo que se ha soltado, esperando a convertirse. */
const QCCONV = { archivos: [], poster: null, trabajando: false };

/** El convertidor. Se sueltan PDF -y un poster si lo hay- y sale un PDF nuevo
    por cada uno. El poster no se convierte: hace que los demas salgan en
    escala de grises y se pega en la primera hoja. */
function qcConvPanel(){
  const viejo = document.getElementById('convOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'convOv'; ov.className = 'dlgov modo-cap';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e)=>{ if(e.target === ov && !QCCONV.trabajando) qcConvCerrar(); });
  qcConvPintar();
}

function qcConvCerrar(){
  const ov = document.getElementById('convOv'); if(ov) ov.remove();
  QCCONV.archivos = []; QCCONV.poster = null; QCCONV.trabajando = false;
}

function qcConvPintar(){
  const ov = document.getElementById('convOv'); if(!ov) return;
  const esc_ = (typeof esc === 'function') ? esc : (s)=> String(s == null ? '' : s);
  const l = QCCONV.archivos;
  ov.innerHTML = '<div class="dlgcard">'
    + '<div class="herr-h">Convertidor PDF QC</div>'
    + '<div class="herr-sub">No se cambia ni una palabra: mayúsculas, erratas y '
      + 'abreviaturas salen tal cual. Solo cambia cómo se ve.</div>'
    + '<div class="conv-zona" id="convZona">'
      + '<b>Suelta aquí los PDF</b><i>o pulsa para buscarlos · A4, máximo 2 hojas</i></div>'
    + '<input type="file" id="convIn" accept="application/pdf,.pdf,image/*" multiple style="display:none">'
    + (QCCONV.poster
        ? '<div class="conv-post">🖼 <b>' + esc_(QCCONV.poster.nombre) + '</b>'
          + '<i>el informe saldrá en escala de grises</i>'
          + '<button class="conv-q" id="convQuitaPost" title="Quitar">✕</button></div>'
        : '')
    + (l.length
        ? '<div class="conv-lista">' + l.map((f, i) =>
            '<div class="conv-it">'
            + '<span class="conv-n">' + esc_(f.nombre) + '</span>'
            + '<span class="conv-st ' + (f.estado || '') + '">' + esc_(f.msg || 'en espera') + '</span>'
            + (f.listo ? '<button class="conv-dl" data-i="' + i + '" title="Descargar otra vez">⤓</button>' : '')
            + '<button class="conv-q" data-i="' + i + '" title="Quitar">✕</button>'
            + '</div>').join('') + '</div>'
        : '<div class="conv-vacio">Todavía no has soltado ningún PDF.</div>')
    + '<div class="herr-fb">'
      + '<button class="conv-go" id="convGo"' + (l.length && !QCCONV.trabajando ? '' : ' disabled') + '>'
        + (QCCONV.trabajando ? 'Convirtiendo…' : ('Convertir' + (l.length > 1 ? ' todos' : ''))) + '</button>'
      + '<button id="convX"' + (QCCONV.trabajando ? ' disabled' : '') + '>Cerrar</button>'
    + '</div></div>';
  qcConvEnganchar(ov);
}

function qcConvEnganchar(ov){
  const zona = ov.querySelector('#convZona');
  const inp = ov.querySelector('#convIn');
  if(zona && inp){
    zona.onclick = ()=> inp.click();
    inp.onchange = ()=>{ qcConvAnadir(inp.files); inp.value = ''; };
    ['dragenter','dragover'].forEach(ev => zona.addEventListener(ev, (e)=>{
      e.preventDefault(); e.stopPropagation(); zona.classList.add('sobre'); }));
    ['dragleave','drop'].forEach(ev => zona.addEventListener(ev, (e)=>{
      e.preventDefault(); e.stopPropagation(); zona.classList.remove('sobre'); }));
    zona.addEventListener('drop', (e)=>{ qcConvAnadir(e.dataTransfer && e.dataTransfer.files); });
  }
  const x = ov.querySelector('#convX'); if(x) x.onclick = ()=>{ if(!QCCONV.trabajando) qcConvCerrar(); };
  const go = ov.querySelector('#convGo'); if(go) go.onclick = ()=> qcConvTodos();
  const qp = ov.querySelector('#convQuitaPost');
  if(qp) qp.onclick = ()=>{ QCCONV.poster = null; qcConvPintar(); };
  Array.prototype.slice.call(ov.querySelectorAll('.conv-q[data-i]')).forEach(b => b.onclick = ()=>{
    QCCONV.archivos.splice(+b.dataset.i, 1); qcConvPintar();
  });
  Array.prototype.slice.call(ov.querySelectorAll('.conv-dl')).forEach(b => b.onclick = ()=>{
    const f = QCCONV.archivos[+b.dataset.i];
    if(f && f.doc) f.doc.save(String(f.nombre).replace(/\.pdf$/i, '') + ' · QC.pdf');
  });
}

/** Lo soltado: los PDF a la lista, una imagen al poster. */
async function qcConvAnadir(files){
  const l = Array.prototype.slice.call(files || []);
  for(const f of l){
    if(/^image\//.test(f.type) || /\.(jpe?g|png|webp)$/i.test(f.name)){
      QCCONV.poster = { nombre: f.name, dato: null };
      try{ QCCONV.poster.dato = await qcpdfGrisear(f); }
      catch(e){ QCCONV.poster = null; }
      continue;
    }
    if(!/pdf/i.test(f.type) && !/\.pdf$/i.test(f.name)) continue;
    QCCONV.archivos.push({ nombre: f.name, file: f, estado:'', msg:'en espera', listo:false, doc:null });
  }
  qcConvPintar();
}

/** Convierte todos, uno detras de otro, contando lo que pasa con cada uno.
    De uno en uno a proposito: dos PDF grandes a la vez dejan la pestaña
    congelada, y aqui se trabaja con el actor esperando. */
async function qcConvTodos(){
  if(QCCONV.trabajando) return;
  QCCONV.trabajando = true; qcConvPintar();
  for(const f of QCCONV.archivos){
    if(f.listo) continue;
    f.estado = ''; f.msg = 'leyendo…'; qcConvPintar();
    try{
      const buf = await f.file.arrayBuffer();
      const hojas = await qcpdfLeerPdf(buf);
      const inf = qcpdfLeerInforme(hojas, f.nombre);
      if(!inf){ f.estado = 'mal'; f.msg = 'no encuentro la tabla'; continue; }
      if(!inf.filas.length){ f.estado = 'mal'; f.msg = 'la tabla está vacía'; continue; }
      f.msg = 'dibujando…'; qcConvPintar();
      const d = qcpdfDeInforme(inf, { poster: QCCONV.poster ? QCCONV.poster.dato : null });
      f.doc = await qcpdfHacer(d);
      f.listo = true; f.estado = 'ok';
      f.msg = inf.filas.length + ' filas · listo';
      /* Se descarga solo: es lo que se ha pedido al pulsar «Convertir». El
         boton de al lado queda para volver a bajarlo sin repetir el trabajo. */
      f.doc.save(String(f.nombre).replace(/\.pdf$/i, '') + ' · QC.pdf');
    }catch(e){
      f.estado = 'mal';
      f.msg = 'falló: ' + ((e && e.message) || e);
      try{ if(typeof fallo === 'function') fallo('qcConvTodos · js/qcpdf.js', e, 'ese PDF no se ha podido convertir'); }
      catch(e2){ /* sin el registro de fallos, ya lo dice la fila */ }
    }
    qcConvPintar();
  }
  QCCONV.trabajando = false; qcConvPintar();
}
