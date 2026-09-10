/* Genera los iconos de Dubbipt: una D grande, en pixel art moderno.
 *
 *   node herramientas/icono.js
 *
 * Se hace con un script y no a mano para que sea REPETIBLE: si mañana hay que
 * cambiar un color o el grosor de la letra, se toca aqui y salen los cinco
 * archivos otra vez iguales entre si. Un icono editado a mano en cinco tamanos
 * acaba siendo cinco iconos distintos.
 *
 * No usa ninguna libreria: el PNG se escribe a mano con el zlib que ya trae
 * Node. Son cuatro trozos -IHDR, IDAT, IEND- y un CRC.
 *
 * ── Por que asi ────────────────────────────────────────────────────────────
 *
 * · PIXEL DE VERDAD. El dibujo se define en una rejilla pequena (la D mide 13
 *   por 14 casillas) y cada casilla se pinta como un bloque. No hay
 *   suavizado: los bordes quedan duros, que es lo que hace que parezca pixel
 *   art y no una letra escalada.
 *
 * · MODERNO, no retro. Tres tonos de verde -luz arriba, base, sombra abajo-,
 *   una sombra proyectada de una casilla, y un fondo con bandas verticales en
 *   vez de un color plano. Eso es lo que separa el pixel art de hoy del de
 *   1985: mismo grano, mejor iluminacion.
 *
 * · ZONA SEGURA. Android recorta los iconos «maskable» con una mascara
 *   redonda: solo se garantiza el circulo central del 80 %. Por eso el icono
 *   maskable se genera aparte, con la D mas pequena, en vez de arriesgarse a
 *   que le corten el pico de arriba a la izquierda.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const RAIZ = path.join(__dirname, '..');

/* ── La D, casilla por casilla ──────────────────────────────────────────────
   Las esquinas van escalonadas: asi se finge una curva sin suavizar nada, que
   es como se dibuja una curva en pixel art. Es simetrica arriba y abajo. */
const D = [
  '..###########..',
  '..############.',
  '..###.....####.',
  '..###......####',
  '..###.......###',
  '..###.......###',
  '..###.......###',
  '..###.......###',
  '..###.......###',
  '..###.......###',
  '..###......####',
  '..###.....####.',
  '..############.',
  '..###########..'
];
const G_ANCHO = D[0].length;      // 15
const G_ALTO = D.length;          // 14

/* ── Colores ───────────────────────────────────────────────────────────── */
const C = {
  fondoAlto:  [0x2C, 0x21, 0x68],   // morado de la aplicacion, arriba
  fondoBajo:  [0x17, 0x11, 0x39],   // y abajo
  banda:      [0xFF, 0xFF, 0xFF, 8],// bandas verticales, muy tenues
  luz:        [0xA7, 0xF3, 0xC4],   // borde de arriba de la letra
  base:       [0x4A, 0xDE, 0x80],   // el verde de la aplicacion
  sombra:     [0x22, 0xC5, 0x5E],   // borde de abajo
  proyectada: [0x0A, 0x06, 0x1A]    // la sombra que tira la letra
};

const lleno = (x, y) => (y >= 0 && y < G_ALTO && x >= 0 && x < G_ANCHO && D[y][x] === '#');

/**
 * Pinta el icono en una rejilla de `n` por `n` casillas y lo devuelve como
 * matriz de colores. `n` mayor = mas margen alrededor de la letra.
 */
function rejilla(n){
  const px = [];
  const dx = Math.floor((n - G_ANCHO) / 2);
  const dy = Math.floor((n - G_ALTO) / 2);

  for(let y = 0; y < n; y++){
    px[y] = [];
    for(let x = 0; x < n; x++){
      // fondo: degradado a bandas, no continuo
      const k = y / (n - 1);
      const f = [0, 1, 2].map(i => Math.round(C.fondoAlto[i] * (1 - k) + C.fondoBajo[i] * k));
      // textura muy tenue en diagonal. Con bandas verticales de +6 se veian
      // como rayas y distraian de la letra; asi solo se nota de cerca.
      if((x + y) % 4 === 0) for(let i = 0; i < 3; i++) f[i] = Math.min(255, f[i] + 3);
      px[y][x] = f;
    }
  }

  const pon = (x, y, c) => { if(y >= 0 && y < n && x >= 0 && x < n) px[y][x] = c.slice(0, 3); };

  /* La sombra: cada casilla de la letra cae una casilla abajo y a la derecha,
     y solo donde no hay letra. Con la condicion al reves -mirando la casilla
     de ARRIBA a la izquierda- salian puntos oscuros dispersos en vez de un
     borde continuo, y debajo del asta aparecia un lunar suelto. */
  for(let y = 0; y < G_ALTO; y++)
    for(let x = 0; x < G_ANCHO; x++)
      if(lleno(x, y) && !lleno(x + 1, y + 1)) pon(dx + x + 1, dy + y + 1, C.proyectada);

  // y ahora la letra, con su luz arriba y su sombra abajo
  for(let y = 0; y < G_ALTO; y++){
    for(let x = 0; x < G_ANCHO; x++){
      if(!lleno(x, y)) continue;
      let c = C.base;
      if(!lleno(x, y - 1)) c = C.luz;
      else if(!lleno(x, y + 1)) c = C.sombra;
      pon(dx + x, dy + y, c);
    }
  }
  return px;
}

/**
 * Estira la rejilla al tamano final. Cada casilla ocupa un rectangulo de
 * pixeles enteros -sin suavizado-, y los rectangulos se calculan por
 * redondeo, asi que como mucho se diferencian en un pixel entre ellos.
 */
function aPixeles(px, n, lado){
  const buf = Buffer.alloc(lado * lado * 4);
  const borde = (i) => Math.round(i * lado / n);
  for(let gy = 0; gy < n; gy++){
    const y0 = borde(gy), y1 = borde(gy + 1);
    for(let gx = 0; gx < n; gx++){
      const x0 = borde(gx), x1 = borde(gx + 1);
      const c = px[gy][gx];
      for(let y = y0; y < y1; y++){
        for(let x = x0; x < x1; x++){
          const o = (y * lado + x) * 4;
          buf[o] = c[0]; buf[o+1] = c[1]; buf[o+2] = c[2]; buf[o+3] = 255;
        }
      }
    }
  }
  return buf;
}

/* ── Escribir un PNG sin librerias ─────────────────────────────────────── */

const TABLA_CRC = (() => {
  const t = new Int32Array(256);
  for(let n = 0; n < 256; n++){
    let c = n;
    for(let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();
function crc32(buf){
  let c = 0xFFFFFFFF;
  for(let i = 0; i < buf.length; i++) c = TABLA_CRC[(c ^ buf[i]) & 0xFF] ^ (c >>> 8);
  return (c ^ 0xFFFFFFFF) >>> 0;
}
function trozo(tipo, datos){
  const largo = Buffer.alloc(4); largo.writeUInt32BE(datos.length, 0);
  const cuerpo = Buffer.concat([Buffer.from(tipo, 'ascii'), datos]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(cuerpo), 0);
  return Buffer.concat([largo, cuerpo, crc]);
}
function png(rgba, lado){
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(lado, 0); ihdr.writeUInt32BE(lado, 4);
  ihdr[8] = 8;    // 8 bits por canal
  ihdr[9] = 6;    // color con transparencia (RGBA)
  // cada renglon lleva delante su byte de filtro; 0 = sin filtro
  const conFiltro = Buffer.alloc((lado * 4 + 1) * lado);
  for(let y = 0; y < lado; y++){
    conFiltro[y * (lado * 4 + 1)] = 0;
    rgba.copy(conFiltro, y * (lado * 4 + 1) + 1, y * lado * 4, (y + 1) * lado * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    trozo('IHDR', ihdr),
    trozo('IDAT', zlib.deflateSync(conFiltro, { level: 9 })),
    trozo('IEND', Buffer.alloc(0))
  ]);
}

/* ── Los cinco archivos ────────────────────────────────────────────────── */

/* `rej` es el lado de la rejilla: cuanto mas grande, mas margen deja la letra.
   La D mide 15 casillas de ancho, asi que con rejilla 18 ocupa el 83 % y con
   rejilla 26 el 58 %. */
const ICONOS = [
  { archivo: 'icon-512.png',       lado: 512, rej: 20, para: 'el icono normal' },
  { archivo: 'icon-192.png',       lado: 192, rej: 20, para: 'el icono normal, pequeno' },
  { archivo: 'apple-touch-icon.png', lado: 180, rej: 21, para: 'iOS, que redondea las esquinas' },
  { archivo: 'favicon-64.png',     lado: 64,  rej: 17, para: 'la pestana del navegador' },
  { archivo: 'icon-512-mask.png',  lado: 512, rej: 26, para: 'Android, que recorta en circulo' }
];

let total = 0;
const hechos = {};
for(const ic of ICONOS){
  const px = rejilla(ic.rej);
  const buf = png(aPixeles(px, ic.rej, ic.lado), ic.lado);
  hechos[ic.archivo] = buf;
  fs.writeFileSync(path.join(RAIZ, ic.archivo), buf);
  const ocupa = Math.round(100 * G_ANCHO / ic.rej);
  console.log('  ' + ic.archivo.padEnd(22) + String(ic.lado).padStart(4) + ' px'
    + ' · la D ocupa el ' + String(ocupa).padStart(2) + ' %'
    + ' · ' + String(Math.round(buf.length / 1024)).padStart(3) + ' KB'
    + '  (' + ic.para + ')');
  total++;
}
/* ── El favicon de la pestaña, incrustado en index.html ──────────────────
 *
 * Va en base64 dentro del HTML a propósito: así aparece al instante, sin una
 * petición más. Pero eso significa que el icono vive en DOS sitios, y dos
 * copias a mano se separan siempre —de hecho estaban separadas: los archivos
 * PNG tenían el icono nuevo y la pestaña seguía con el viejo—.
 *
 * Por eso lo escribe este mismo script: una sola fuente, cero deriva.
 */
const HTML = path.join(RAIZ, 'index.html');
let html = fs.readFileSync(HTML, 'utf8');
let puestos = 0;
for(const tam of [64, 32]){
  const buf = png(aPixeles(rejilla(17), 17, tam), tam);
  const uri = 'data:image/png;base64,' + buf.toString('base64');
  const re = new RegExp('(<link rel="icon" type="image/png" sizes="' + tam + 'x' + tam
                        + '" href=")data:image/png;base64,[^"]*(">)');
  if(re.test(html)){ html = html.replace(re, '$1' + uri + '$2'); puestos++; }
  else console.log('  OJO: no encontré el <link> del favicon de ' + tam + 'px en index.html');
}
if(puestos){
  fs.writeFileSync(HTML, html, 'utf8');
  console.log('  index.html' .padEnd(24) + '     · ' + puestos + ' favicon(s) incrustados al día');
}

console.log('\n  ' + total + ' iconos generados');
