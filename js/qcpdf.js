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
  tarjeta: [255, 255, 255],
  /* La hoja, blanca. La tarjeta se ve por su borde, no por contraste de
     fondo: un gris de fondo a toda página se lleva tinta en cada copia y en
     una impresora mediocre sale sucio. */
  hoja:    [255, 255, 255],
  plano:   false                 // con color: las pastillas van de su color
};
const QCPDF_GRIS = {
  tinta:   [17, 17, 17],
  suave:   [120, 120, 120],
  tc:      [51, 51, 51],         // #333
  texto:   [51, 51, 51],
  borde:   [218, 218, 218],      // #DADADA
  cabeza:  [242, 242, 242],      // #F2F2F2
  tarjeta: [255, 255, 255],
  hoja:    [255, 255, 255],
  /* Sin color: un informe impreso en blanco y negro con pastillas de color
     saca cuatro grises que no se distinguen, y entonces el tipo no dice nada. */
  plano:   true
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

/** El tipo de corrección, venga como clave -«pegar»- o como etiqueta
    -«Pegar»-: el primero lo escribe la aplicación y el segundo llega en la
    columna de un PDF ajeno. Null si no es ninguno de los cuatro.
    Basta comparar con la clave porque el texto se pasa a minúsculas antes, y
    la etiqueta de cada tipo en minúsculas ES su clave. Comparar también con la
    etiqueta parecía más seguro y era una rama que nunca podía entrar: ninguna
    mutación la ponía en rojo, y eso es lo que la delató. */
function qcpdfTipoDe(v){
  const s = String(v == null ? '' : v).trim().toLowerCase();
  if(!s) return null;
  const tabla = (typeof QC_TIPOS !== 'undefined' && Array.isArray(QC_TIPOS)) ? QC_TIPOS : [];
  return tabla.find(t => t.k === s) || null;
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

/* ── Una celda con lo que cambió marcado ─────────────────────────────────── */

/* Los colores de las marcas: lo que falta -escrito y no oído- en rojo y
   tachado; lo que sobra o es distinto -oído y no escrito- en naranja. En gris
   van igual pero sin color: el tachado y la negrita se ven igual. */
const QCPDF_MARCAS = { f: [220, 38, 38], s: [234, 88, 12], c: [217, 119, 6] };

/** ¿Es una celda de trozos marcados -`[{ t, m }]`- y no un texto? */
function qcpdfEsTrozos(v){ return Array.isArray(v) && v.every(x => x && typeof x.t === 'string'); }

/**
 * Los renglones que ocupan unos trozos en un ancho: cada renglon es una lista
 * de `{ t, m, w }` con su ancho medido. Se parte por palabras, nunca dentro de
 * una; una palabra mas ancha que el renglon va sola en el suyo.
 */
function qcpdfRenglonesTrozos(doc, trozos, ancho){
  const esp = doc.getTextWidth(' ');
  const lineas = [[]];
  let x = 0;
  for(const tr of trozos){
    const palabras = qcpdfTextoSeguro(tr.t).split(/\s+/).filter(Boolean);
    /* Se mide con la letra con la que se va a pintar: lo que sobra va en
       negrita, que es mas ancha, y medido en redonda la palabra siguiente se
       le montaba encima. Se vio en la hoja: «Estuvede viaje». */
    doc.setFont('helvetica', tr.m === 's' ? 'bold' : 'normal');
    for(const w of palabras){
      const anchoW = doc.getTextWidth(w);
      const linea = lineas[lineas.length - 1];
      if(linea.length && x + esp + anchoW > ancho){ lineas.push([]); x = 0; }
      const l2 = lineas[lineas.length - 1];
      l2.push({ t: w, m: tr.m || '', w: anchoW });
      x += (l2.length > 1 ? esp : 0) + anchoW;
    }
  }
  doc.setFont('helvetica', 'normal');
  return lineas.filter(l => l.length);
}

/** Pinta unos renglones de trozos desde (x, y), un renglon cada `alto`. */
function qcpdfPintarTrozos(doc, lineas, x, y, alto, P, tam){
  const esp = doc.getTextWidth(' ');
  for(const linea of lineas){
    let cx = x;
    for(const tr of linea){
      const col = (tr.m && QCPDF_MARCAS[tr.m] && !P.plano) ? QCPDF_MARCAS[tr.m] : P.texto;
      doc.setTextColor(col[0], col[1], col[2]);
      doc.setFont('helvetica', tr.m === 's' ? 'bold' : 'normal');
      doc.text(tr.t, cx, y);
      /* Lo que falta va tachado: se ve tambien en gris y en una fotocopia. */
      if(tr.m === 'f'){
        doc.setDrawColor(col[0], col[1], col[2]); doc.setLineWidth(0.3);
        doc.line(cx, y - tam * 0.12, cx + tr.w, y - tam * 0.12);
      }
      cx += tr.w + esp;
    }
    y += alto;
  }
  doc.setFont('helvetica', 'normal');
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
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.4);
  doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
  doc.text(qcpdfTextoSeguro(d.etiqueta), ix, cy + 3.5);

  /* El conteo en negrita a la derecha y, debajo, la fecha en gris. */
  const derecha = x + ancho;
  let anchoDerecha = 0;
  if(d.conteo){
    doc.setFont('helvetica', 'bold'); doc.setFontSize(10.5);
    doc.setTextColor(P.tinta[0], P.tinta[1], P.tinta[2]);
    const c = qcpdfTextoSeguro(d.conteo);
    doc.text(c, derecha, cy + 9.5, { align: 'right' });
    anchoDerecha = doc.getTextWidth(c);
  }
  if(d.fecha){
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.6);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    const f = qcpdfTextoSeguro(d.fecha);
    doc.text(f, derecha, cy + 15, { align: 'right' });
    anchoDerecha = Math.max(anchoDerecha, doc.getTextWidth(f));
  }

  /* El titulo, en dos pesos sobre el mismo renglon: el programa en negrita y
     el episodio en gris claro detras, como en la hoja que llego de sala. */
  const hueco = iw - (anchoDerecha ? anchoDerecha + 8 : 0);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(21);
  doc.setTextColor(P.tinta[0], P.tinta[1], P.tinta[2]);
  try{ doc.setCharSpace(-0.4); }catch(e){ /* motor viejo: sin tracking */ }
  const fuerte = qcpdfTextoSeguro(d.titulo);
  const ls = doc.splitTextToSize(fuerte, hueco);
  doc.text(ls.slice(0, 2), ix, cy + 14);
  let tx = ix + doc.getTextWidth(ls[ls.length - 1] || '');
  cy += 14 + (ls.length > 1 ? 8 : 0);
  if(d.titulo2){
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    const flojo = ' ' + qcpdfTextoSeguro(d.titulo2);
    /* Si no cabe al lado, baja a su propio renglon antes que salirse. */
    if(tx + doc.getTextWidth(flojo) > ix + hueco){
      cy += 8.5; doc.text(flojo.trim(), ix, cy);
    }else{
      doc.text(flojo, tx, cy);
    }
  }
  try{ doc.setCharSpace(0); }catch(e){ /* se deja como estaba */ }

  if(d.subtitulo){
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8.8);
    doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
    doc.text(doc.splitTextToSize(qcpdfTextoSeguro(d.subtitulo), iw)[0] || '', ix, cy + 5.5);
    cy += 5.5;
  }
  cy += 7;
  if(d.tarjetas && d.tarjetas.length) cy += qcpdfTarjetas(doc, d.tarjetas, ix, cy, iw, P, paso);
  if(d.chips && d.chips.length) cy += qcpdfChips(doc, d.chips, ix, cy, iw, P);
  /* Con poster, el cuerpo no empieza hasta que la tarjeta se acaba. */
  if(conPoster) cy = Math.max(cy, y + 78 + 6);
  return cy;
}

/** Las pastillas con la cuenta de cada tipo. De un vistazo se sabe si hay que
    volver a llamar al actor o si basta con pegar un take que ya existe. */
function qcpdfChips(doc, chips, x, y, ancho, P){
  const h = 7.4;
  let cx = x;
  let cy = y;
  doc.setFontSize(8);
  for(const c of chips){
    doc.setFont('helvetica', 'bold');
    const nTxt = String(c.n);
    doc.setFont('helvetica', 'normal');
    const et = qcpdfTextoSeguro(c.et);
    const w = 4.2 + 2.6 + doc.getTextWidth(nTxt + ' ' + et) + 5.5;
    if(cx + w > x + ancho){ cx = x; cy += h + 2.4; }
    qcpdfRect(doc, cx, cy, w, h, h / 2, P.tarjeta, P.borde);
    /* El punto de color, que es lo que se busca primero. En escala de grises
       se pinta igual pero en su gris: sin el, las pastillas son todas iguales. */
    const pc = P.plano ? P.texto : (c.rgb || P.texto);
    doc.setFillColor(pc[0], pc[1], pc[2]);
    doc.circle(cx + 4.2, cy + h / 2, 1.25, 'F');
    doc.setTextColor(P.tinta[0], P.tinta[1], P.tinta[2]);
    doc.setFont('helvetica', 'bold');
    doc.text(nTxt, cx + 6.9, cy + h / 2 + 1.5);
    const wn = doc.getTextWidth(nTxt);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(P.texto[0], P.texto[1], P.texto[2]);
    doc.text(et, cx + 6.9 + wn + 1.6, cy + h / 2 + 1.5);
    cx += w + 2.4;
  }
  return (cy - y) + h + 7;
}

/** El pie: a la izquierda la nota de uso o el nombre del documento, y a la
    derecha el nombre corto con la hoja. */
function qcpdfPie(doc, d, pag, de, P, margen){
  doc.setFont('helvetica', 'normal'); doc.setFontSize(7.2);
  doc.setTextColor(P.suave[0], P.suave[1], P.suave[2]);
  const y = QCPDF_HOJA.h - margen + 5;
  doc.text(qcpdfTextoSeguro(d.nota || d.nombreDoc), margen, y);
  const der = qcpdfTextoSeguro(d.nombreDoc) + (de > 1 ? ('  ·  página ' + pag + ' / ' + de) : '');
  doc.text(der, QCPDF_HOJA.w - margen, y, { align: 'right' });
}

/** La pastilla de un tipo: el nombre sobre su fondo suave, con su color.
    Viene del tipo tal como se apunto; si no se reconoce, no se pinta nada, que
    es mejor que una pastilla en blanco sin decir de que. */
function qcpdfPastilla(doc, valor, x, y, ancho, altoFila, P, paso){
  const t = qcpdfTipoDe(valor);
  if(!t) return;
  const et = qcpdfTextoSeguro(t.et);
  const pt = Math.max(6, paso.fuente - 1.4);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(pt);
  const w = Math.min(ancho, doc.getTextWidth(et) + 6.4);
  /* Nunca más alta que la fila: medida a ojo se salía por abajo, se metía en
     la fila siguiente y el nombre del tipo salía cortado por la mitad. */
  const h = Math.max(3.2, Math.min(paso.fila - 0.8, pt * 0.3528 + 1.9));
  /* Y pegada arriba, no centrada en la fila: un comentario de tres renglones
     dejaría la pastilla flotando en medio, lejos del renglón al que pertenece. */
  y = y + Math.max(0.6, (Math.min(altoFila, paso.fila) - h) / 2);
  /* En escala de grises la pastilla se queda en gris: con el color puesto, un
     informe impreso en blanco y negro saca cuatro grises que no distinguen. */
  const fondo = P.plano ? P.cabeza : t.suave;
  const tinta = P.plano ? P.texto : t.rgb;
  doc.setFillColor(fondo[0], fondo[1], fondo[2]);
  doc.roundedRect(x, y, w, h, h / 2, h / 2, 'F');
  doc.setTextColor(tinta[0], tinta[1], tinta[2]);
  /* La línea base cae a media altura más la mitad de lo que levanta la letra:
     centrarla por el alto de la caja la deja mirando hacia abajo. */
  doc.text(et, x + w / 2, y + h / 2 + pt * 0.3528 * 0.35, { align: 'center' });
}

/** Cuanto alto necesita una fila con unas medidas dadas. Se mide ANTES de
    dibujar nada, que es lo que permite no partir ninguna entre hojas. */
function qcpdfAltoFila(doc, fila, cols, anchos, paso){
  doc.setFontSize(paso.fuente);
  let max = paso.fila;
  cols.forEach((c, i) => {
    /* La pastilla y el circulo no crecen: no pueden mandar sobre el alto. */
    if(c.clase === 'tipo' || c.clase === 'marca') return;
    doc.setFont('helvetica', c.negrita ? 'bold' : 'normal');
    let n = 0, parr = [''];
    if(qcpdfEsTrozos(fila[i])) n = qcpdfRenglonesTrozos(doc, fila[i], anchos[i] - 4).length;
    else{
      parr = qcpdfParrafos(fila[i]);
      for(const p of parr) n += doc.splitTextToSize(p, anchos[i] - 4).length;
    }
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

  /* La hoja, en gris muy claro con las tarjetas en blanco: es lo que separa la
     tabla del papel y lo que hace que se lea como una ficha y no como un
     listado. Se pinta en cada hoja, asi que va dentro de `hojaFondo`. */
  const hojaFondo = () => {
    if(medir) return;
    doc.setFillColor(P.hoja[0], P.hoja[1], P.hoja[2]);
    doc.rect(0, 0, QCPDF_HOJA.w, QCPDF_HOJA.h, 'F');
  };
  hojaFondo();
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
    hojaFondo();
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
    /* Un aviso a todo lo ancho -«sin cambios»- tampoco es una fila: no tiene
       columnas, y va centrado para que no se lea como una celda suelta. */
    if(f && f.aviso){
      doc.setFont('helvetica', 'normal'); doc.setFontSize(paso.fuente + 0.6);
      const ls = doc.splitTextToSize(qcpdfTextoSeguro(f.aviso), util - 12);
      const alto = 7 + ls.length * (paso.fuente * 0.45);
      if(y + alto > tope){ cerrarTramo(y); nuevaHoja(); tramoY = y - paso.cab - 2.4; }
      if(!medir){
        doc.setFillColor(P.tarjeta[0], P.tarjeta[1], P.tarjeta[2]);
        doc.rect(m, y, util, alto, 'F');
        doc.setTextColor(P.texto[0], P.texto[1], P.texto[2]);
        let ty = y + 3.5 + paso.fuente * 0.34;
        for(const l of ls){ doc.text(l, m + util / 2, ty, { align: 'center' }); ty += paso.fuente * 0.45; }
      }
      y += alto;
      continue;
    }
    /* Un separador de grupo -Mañana / Tarde en los llamados- no es una fila. */
    if(f && f.grupo){
      const alto = paso.fila + 2;
      if(y + alto > tope){ cerrarTramo(y); nuevaHoja(); tramoY = y - paso.cab - 2.4; }
      if(!medir){
        doc.setFillColor(P.tarjeta[0], P.tarjeta[1], P.tarjeta[2]);
        doc.rect(m, y, util, alto, 'F');
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
      /* La tarjeta es blanca sobre hoja gris, y su borde se traza al final; si
         el fondo no se pusiera fila a fila, por dentro se vería el gris. */
      doc.setFillColor(P.tarjeta[0], P.tarjeta[1], P.tarjeta[2]);
      doc.rect(m, y, util, alto, 'F');
      if(i > 0){
        doc.setDrawColor(P.borde[0], P.borde[1], P.borde[2]); doc.setLineWidth(0.2);
        doc.line(m + 1.5, y, m + util - 1.5, y);
      }
      let cx = m;
      cols.forEach((c, j) => {
        /* La columna del tipo no es texto: es una pastilla de color. */
        if(c.clase === 'tipo'){
          qcpdfPastilla(doc, f[j], cx + 2, y, anchos[j] - 4, alto, P, paso);
          cx += anchos[j];
          return;
        }
        /* Y la del circulo se deja vacia a proposito: se marca a mano cuando
           la correccion queda resuelta, y por eso es un circulo y no un texto. */
        if(c.clase === 'marca'){
          doc.setDrawColor(P.borde[0], P.borde[1], P.borde[2]); doc.setLineWidth(0.35);
          /* A la altura del primer renglón, como la pastilla: es de la fila,
             no del centro del párrafo más largo. */
          doc.circle(cx + anchos[j] / 2, y + Math.min(alto, paso.fila) / 2, 1.85, 'S');
          cx += anchos[j];
          return;
        }
        const col = (c.clase === 'tc') ? P.tc : (c.clase === 'nombre' ? P.tinta : P.texto);
        doc.setTextColor(col[0], col[1], col[2]);
        doc.setFont('helvetica', c.negrita ? 'bold' : 'normal');
        doc.setFontSize(paso.fuente);
        let ty = y + 2.6 + paso.fuente * 0.30;
        /* Una celda con lo que cambio marcado se pinta palabra a palabra. */
        if(qcpdfEsTrozos(f[j])){
          qcpdfPintarTrozos(doc, qcpdfRenglonesTrozos(doc, f[j], anchos[j] - 4), cx + 2, ty, paso.fuente * 0.41, P, paso.fuente);
          cx += anchos[j];
          return;
        }
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
  if(!medir) for(let p = 1; p <= pag; p++){ doc.setPage(p); qcpdfPie(doc, d, p, pag, P, m); }
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
  /* «Tipo» se pinta como pastilla de color, venga del original o lo pongamos
     nosotros: es lo que se busca de un vistazo en la hoja. */
  if(/^tipo$|^type$/.test(s)) return { et: et, peso: 0.85, clase:'tipo' };
  if(/comment|observaci|nota/.test(s)) return { et: et, peso: 3.2, clase:'texto' };
  if(/salida/.test(s)) return { et: et, peso: 1.0, clase:'texto' };
  if(/units|duration|track/.test(s)) return { et: et, peso: 0.8, clase:'texto' };
  return { et: et, peso: 1.4, clase:'texto' };
}

/** El informe leido, listo para pintar. No se cambia NI UNA palabra: ni
    mayusculas, ni erratas, ni abreviaturas. Solo se decide como se ve.
    `opts`: { titulo, episodio, revisor, estudio, poster }. */
function qcpdfDeInforme(inf, opts){
  opts = opts || {};
  const llamado = qcpdfEsLlamado(inf);
  let columnas = inf.columnas.map(qcpdfPintaColumna);
  let filas = inf.filas.map(f => (f && f.grupo) ? f : f.slice());
  const tiene = (re) => columnas.some(c => re.test(String(c.et).toLowerCase()));

  if(llamado){
    /* Un llamado se agrupa por turno y lleva dos columnas en blanco para
       rellenar a mano, que es como se usa en sala. */
    filas = qcpdfPorTurno(filas);
    if(!tiene(/salida/)) columnas = columnas.concat([{ et:'Salida', peso:1.0, clase:'texto' }]);
    if(!tiene(/observaci/)) columnas = columnas.concat([{ et:'Observaciones', peso:2.2, clase:'texto' }]);
  }else{
    /* Un informe de QC lleva el tipo de correccion. Si el original no lo trae,
       se DEDUCE del comentario y se añade: es lo que permite contarlos arriba.
       Deducir no es cambiar el texto -el comentario sigue intacto-, pero sí es
       una lectura nuestra, y por eso solo se hace cuando no venía. */
    if(!tiene(/^tipo$|^type$/)){
      const iCom = columnas.findIndex(c => /comment|observaci|nota/.test(String(c.et).toLowerCase()));
      if(iCom >= 0 && typeof qcTipoSugerido === 'function'){
        columnas = columnas.concat([{ et:'Tipo', peso:0.85, clase:'tipo' }]);
        filas = filas.map(f => (f && f.grupo) ? f : f.concat([qcTipoSugerido(f[iCom])]));
      }
    }
    /* Y el circulo para ir marcando lo que queda resuelto. */
    columnas = columnas.concat([{ et:'', peso:0.35, clase:'marca' }]);
    filas = filas.map(f => (f && f.grupo) ? f : f.concat(['']));
  }

  const sinGrupo = filas.filter(f => f && !f.grupo);
  const cuantas = sinGrupo.length;
  const base = String(inf.nombre || 'informe').replace(/\.pdf$/i, '');
  const iTipo = columnas.findIndex(c => c.clase === 'tipo');
  const chips = (!llamado && iTipo >= 0 && typeof qcCuentaTipos === 'function')
                  ? qcCuentaTipos(sinGrupo.map(f => ({ tipo: qcpdfClaveTipo(f[iTipo]) })))
                  : [];
  const pie = [];
  if(opts.revisor) pie.push('QC: ' + opts.revisor);
  if(opts.estudio) pie.push('Cambios: ' + opts.estudio);
  return {
    etiqueta: llamado ? 'Llamado de actores' : 'Control de calidad',
    titulo: opts.titulo || base,
    titulo2: opts.episodio ? ('Episodio ' + opts.episodio) : '',
    subtitulo: pie.length ? pie.join('   ·   ') : (opts.subtitulo || ''),
    conteo: cuantas + (llamado ? (' llamado' + (cuantas === 1 ? '' : 's'))
                               : (' correcci' + (cuantas === 1 ? 'ón' : 'ones'))),
    fecha: opts.fecha || qcpdfFechaHoy(),
    tarjetas: inf.tarjetas || [],
    chips: chips,
    columnas: columnas,
    filas: filas,
    nombreDoc: base,
    nota: llamado ? 'Rellenar la salida y las observaciones a mano.'
                  : 'Marcar el círculo cuando la corrección quede resuelta.',
    gris: !!opts.poster,
    poster: opts.poster || null,
    topeHojas: 2
  };
}

/** El informe de los diálogos que cambiaron: lo escrito frente a lo oído.
    `lista` sale de qcCambiosLista(). `opts`: { programa, episodio, revisor,
    estudio, desfase, audio, oido, analizados, tardo, fecha }.
    Lleva SIEMPRE las dos columnas -escrito y oído-: lo que oyó el reconocedor
    es una pista, no una prueba, y quien lee tiene que poder juzgar. Y dice con
    qué audio y qué inicio se cotejó, porque de eso depende todo lo demás. */
function qcpdfDeCambios(lista, opts){
  opts = opts || {};
  const todos = lista || [];
  /* Los cambios de verdad primero; los leves y los sin comprobar, aparte al
     final, cada grupo con su rotulo, y NO cuentan como cambio. Pedido de sala. */
  /* Por importancia, no por tiempo: lo primero del informe es lo que mas
     importa. Pedido de sala. Lo que no cuenta sigue por tiempo. */
  const porPrioridad = (typeof qcPorPrioridad === 'function') ? qcPorPrioridad
    : (x) => x.slice().sort((a, b) => ((b.prioridad || 0) - (a.prioridad || 0)) || ((+a.sim || 0) - (+b.sim || 0)));
  const cambios = porPrioridad(todos.filter(c => c.nivel === 'mal' || c.nivel === 'dudoso'));
  const leves = todos.filter(c => c.nivel === 'leve');
  const sin = todos.filter(c => c.nivel === 'sin');
  const l = cambios;
  const fila = (c) => [
    (typeof qcTC === 'function' ? qcTC(c.tcSec) : ''),
    c.quien || '',
    /* Con lo que cambio marcado palabra a palabra, si el analisis lo trae. */
    (Array.isArray(c.escritoTrozos) && c.escritoTrozos.length) ? c.escritoTrozos : (c.escrito || ''),
    /* Lo no oído se dice: una celda en blanco parece que se olvidó. */
    (c.oido && String(c.oido).trim())
      ? ((Array.isArray(c.oidoTrozos) && c.oidoTrozos.length) ? c.oidoTrozos : c.oido) : '(nada)',
    /* El veredicto y, debajo, que tipo de cambio es. */
    Math.round((+c.sim || 0) * 100) + ' % · ' + (c.et || (c.nivel === 'mal' ? 'no cuadra' : 'dudoso')) + (c.tipo ? ('\n' + c.tipo) : '')
  ];
  const filas = [];
  /* Arriba, cuantos de cada tipo. Solo si el analisis trae los tipos: uno
     de antes no los trae y no hay nada que decir. */
  const cuenta = new Map();
  cambios.forEach(c => { const k = c.tipoG || c.tipo; if(k) cuenta.set(k, (cuenta.get(k) || 0) + 1); });
  if(cuenta.size){
    const resumen = [...cuenta.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => n + ' ' + k).join(' · ');
    filas.push({ grupo: 'Por importancia · ' + resumen });
  }
  cambios.forEach(c => filas.push(fila(c)));
  if(leves.length){
    filas.push({ grupo: 'Cambios leves · conectores y palabras casi iguales · no cuentan como cambio' });
    leves.forEach(c => filas.push(fila(c)));
  }
  if(sin.length){
    filas.push({ grupo: 'Sin comprobar · parlamentos muy cortos de los que no se oyó nada claro · no cuentan' });
    sin.forEach(c => filas.push(fila(c)));
  }
  const mal = l.filter(c => c.nivel === 'mal').length;
  const dud = l.filter(c => c.nivel === 'dudoso').length;
  /* Cuántos parlamentos se analizaron en total. Nunca menos que los cambios
     que se enseñan: un «3 cambios de 2» no lo cree nadie. */
  const analizados = (isFinite(+opts.analizados) && +opts.analizados > 0)
                       ? Math.max(todos.length, Math.floor(+opts.analizados)) : 0;
  const prog = String(opts.programa || 'Diálogos que cambiaron');
  const base = (prog + (opts.episodio ? (' ' + opts.episodio) : '')).replace(/[\\/:*?"<>|]/g, '-').trim();
  const pie = [];
  if(opts.revisor) pie.push('QC: ' + opts.revisor);
  if(opts.estudio) pie.push('Cambios: ' + opts.estudio);
  if(opts.audio)   pie.push('Audio: ' + opts.audio);
  if(opts.desfase) pie.push('Inicio: ' + opts.desfase);
  /* Con qué oído: de eso depende cuánto fiarse de la columna «Oído». */
  if(opts.oido)    pie.push('Oído: ' + opts.oido);
  if(opts.tardo)   pie.push('Análisis: ' + opts.tardo);
  return {
    etiqueta: 'Diálogos que cambiaron',
    titulo: prog,
    titulo2: opts.episodio ? ('Episodio ' + opts.episodio) : '',
    subtitulo: pie.join('   ·   '),
    conteo: l.length + ' cambio' + (l.length === 1 ? '' : 's')
            + (analizados ? (' de ' + analizados + ' parlamento' + (analizados === 1 ? '' : 's')) : ''),
    fecha: opts.fecha || qcpdfFechaHoy(),
    tarjetas: [],
    /* Cuántos se analizaron y cuántos coinciden van SIEMPRE que se sepa: es lo
       que dice el informe cuando no hay cambios, y lo que da la medida cuando
       los hay. Las de los cambios, solo si tienen algo: una en cero no dice nada. */
    chips: [ analizados ? { k:'analizados', et:'Analizados', n:analizados, rgb:[71, 85, 105] } : null,
             analizados ? { k:'coinciden',  et:'Coinciden',  n:analizados - todos.length, rgb:[22, 163, 74] } : null,
             mal ? { k:'mal',    et:'No cuadran', n:mal, rgb:[220, 38, 38] }  : null,
             dud ? { k:'dudoso', et:'Dudosos',    n:dud, rgb:[217, 119, 6] } : null,
             leves.length ? { k:'leve', et:'Leves', n:leves.length, rgb:[37, 99, 235] } : null,
             sin.length ? { k:'sin', et:'Sin comprobar', n:sin.length, rgb:[100, 116, 139] } : null,
             (isFinite(+opts.graficas) && +opts.graficas > 0) ? { k:'graficas', et:'Gráficas (no se doblan)', n:+opts.graficas, rgb:[100, 116, 139] } : null ].filter(Boolean),
    /* Los anchos salen de lo que tiene que CABER en un renglón, no de repartir
       a ojo: un timecode en negrita pide unos 25 mm y «41 % · no cuadra» unos
       31. Con menos se partían -«01:00:40:0» arriba y «7» abajo-, que se vio
       mirando la hoja y no en ninguna prueba. */
    columnas: [
      { et:'Timecode',     peso:1.3,  clase:'tc', negrita:true },
      { et:'Actor',        peso:1.05, clase:'nombre', negrita:true },
      { et:'Escrito',      peso:2.25, clase:'texto' },
      { et:'Oído',    peso:2.25, clase:'texto' },
      { et:'Coincidencia', peso:1.55, clase:'texto' }
    ],
    /* Sin cambios no se entrega una tabla vacía, que parece un informe roto:
       se dice con todas las letras que se analizó y que coincide. */
    filas: filas.length ? filas
         : [{ aviso: analizados
                ? ('Sin cambios: ' + (analizados === 1 ? 'el parlamento analizado coincide'
                     : ('los ' + analizados + ' parlamentos analizados coinciden')) + ' con el libreto.')
                : 'Sin cambios que señalar.' }],
    nombreDoc: 'Cambios · ' + base,
    nota: 'Lo «oído» es lo que creyó entender el reconocedor: una pista, no una prueba. Comprobar cada uno.',
    gris: false,
    poster: null,
    /* Cuatro hojas y no dos: dos columnas de texto por fila ocupan el doble, y
       encoger hasta 7,5 pt para que quepa en dos lo haría ilegible. Es un
       informe de trabajo, y se lee en sala. */
    topeHojas: 4
  };
}

/** La clave de un tipo, venga como clave o como etiqueta. Null si no lo es. */
function qcpdfClaveTipo(v){
  const t = qcpdfTipoDe(v);
  return t ? t.k : null;
}

/** La fecha de hoy, escrita como se lee. */
function qcpdfFechaHoy(d){
  const f = (d instanceof Date) ? d : new Date();
  const mes = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto',
               'septiembre','octubre','noviembre','diciembre'][f.getMonth()];
  return f.getDate() + ' de ' + mes + ' de ' + f.getFullYear();
}

/** El informe de las correcciones apuntadas en QC.
    `opts`: { programa, episodio, revisor, estudio, fecha }. El programa va en
    negrita y el episodio detras en gris, que es como se lee de un vistazo. */
function qcpdfDeCorrecciones(lista, titulo, subtitulo, opts){
  opts = opts || {};
  const filas = (lista || []).map(c => [
    (typeof qcTC === 'function' ? qcTC(c.tcSec) : ''),
    c.quien || '',
    /* Una palabra y no un simbolo: el visto no existe en la tipografia de un
       PDF de serie y se llevaba el comentario entero por delante. */
    (c.hecha ? 'RESUELTA · ' : '') + c.texto,
    c.tipo || '',
    ''                                     // el circulo, que se marca a mano
  ]);
  const prog = String(opts.programa || titulo || 'Control de calidad');
  const base = (prog + (opts.episodio ? (' ' + opts.episodio) : ''))
                 .replace(/[\\/:*?"<>|]/g, '-').trim();
  /* Quien revisa y que estudio arregla: es un documento que se entrega, y sin
     esos dos nombres no se sabe a quien preguntar ni quien tiene que hacerlo. */
  const pie = [];
  if(opts.revisor) pie.push('QC: ' + opts.revisor);
  if(opts.estudio) pie.push('Cambios: ' + opts.estudio);
  return {
    etiqueta: 'Control de calidad',
    titulo: prog,
    titulo2: opts.episodio ? ('Episodio ' + opts.episodio) : '',
    subtitulo: pie.length ? pie.join('   ·   ') : (subtitulo || ''),
    conteo: filas.length + ' correcci' + (filas.length === 1 ? 'ón' : 'ones'),
    fecha: opts.fecha || qcpdfFechaHoy(),
    tarjetas: [],
    chips: (typeof qcCuentaTipos === 'function') ? qcCuentaTipos(lista || []) : [],
    columnas: [
      { et:'Timecode',   peso:1.05, clase:'tc', negrita:true },
      { et:'Actor',      peso:1.15, clase:'nombre', negrita:true },
      { et:'Comentario', peso:3.1,  clase:'texto' },
      { et:'Tipo',       peso:0.85, clase:'tipo' },
      { et:'',           peso:0.35, clase:'marca' }
    ],
    filas: filas,
    nombreDoc: 'QC · ' + base,
    nota: 'Marcar el círculo cuando la corrección quede resuelta.',
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
    + ((typeof prodPuede === 'function' && prodPuede())
        ? '<button class="herr-it" id="herrProd">'
          + '<span class="herr-ic">🎬</span>'
          + '<span class="herr-tx"><b>Producción</b>'
          + '<i>Lo que viene de DublajeCast: programas y capítulos con sus entregas y '
          + 'DUBCARDs, talentos con su ficha y tráilers con su plazo.</i></span></button>'
        : '')
    + '<div class="herr-fb"><button id="herrX">Cerrar</button></div>'
    + '</div>';
  document.body.appendChild(ov);
  ov.addEventListener('click', (e)=>{ if(e.target === ov) ov.remove(); });
  const x = ov.querySelector('#herrX'); if(x) x.onclick = ()=> ov.remove();
  const c = ov.querySelector('#herrConv');
  if(c) c.onclick = ()=>{ ov.remove(); qcConvPanel(); };
  const p = ov.querySelector('#herrProd');
  if(p) p.onclick = ()=>{ ov.remove(); prodPanel(); };
}

/* Lo que se ha soltado, esperando a convertirse. */
const QCCONV = { archivos: [], poster: null, trabajando: false, revisor: '', estudio: '' };

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
  /* Los dos nombres se quedan: casi siempre revisa la misma persona y lo
     arregla el mismo estudio, y volver a teclearlos en cada tanda sobra. */
}

function qcConvPintar(){
  const ov = document.getElementById('convOv'); if(!ov) return;
  const esc_ = (typeof esc === 'function') ? esc : (s)=> String(s == null ? '' : s);
  const l = QCCONV.archivos;
  ov.innerHTML = '<div class="dlgcard">'
    + '<div class="herr-h">Convertidor PDF QC</div>'
    + '<div class="herr-sub">No se cambia ni una palabra: mayúsculas, erratas y '
      + 'abreviaturas salen tal cual. Solo cambia cómo se ve.</div>'
    /* Los dos nombres del informe. Se piden aquí y no al final porque forman
       parte de lo que se entrega, igual que las correcciones. */
    + '<div class="conv-meta">'
      + '<label><span>Revisa</span><input id="convRev" type="text" placeholder="quién hace el QC" value="'
        + esc_(QCCONV.revisor || '') + '"></label>'
      + '<label><span>Estudio</span><input id="convEst" type="text" placeholder="quién hace los cambios" value="'
        + esc_(QCCONV.estudio || '') + '"></label>'
      + '</div>'
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
  /* Se leen sin repintar: repintar en cada tecla mataria el cursor. */
  { const r = ov.querySelector('#convRev'), e2 = ov.querySelector('#convEst');
    if(r) r.oninput = ()=>{ QCCONV.revisor = r.value.trim().slice(0, 90); };
    if(e2) e2.oninput = ()=>{ QCCONV.estudio = e2.value.trim().slice(0, 90); }; }
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
      const d = qcpdfDeInforme(inf, { poster: QCCONV.poster ? QCCONV.poster.dato : null,
                                      revisor: QCCONV.revisor, estudio: QCCONV.estudio });
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
