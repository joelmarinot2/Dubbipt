/* Contract Inventory desde DUBCARDs · especificacion 09, PRO-55 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { INDEX } = require('./ayuda');

exports.nombre = 'DUBCARDs: Contract Inventory, un Word por episodio';

const RAIZ = path.dirname(INDEX);
const PLANTILLA = path.join(RAIZ, 'dctools', 'contract-inventory.docx');
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{2B05}\u{2B55}\u{23E9}-\u{23FA}\u{FE0F}]/u;

/* Lo justo de un .zip para leer la plantilla de verdad: el directorio central y cada archivo, guardado o desinflado. */
function unzip(buf){
  buf = Buffer.from(buf);
  let e = buf.length - 22; while(e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--;
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16);
  const out = {};
  for(let i = 0; i < n; i++){
    const metodo = buf.readUInt16LE(p + 10), tam = buf.readUInt32LE(p + 20), ln = buf.readUInt16LE(p + 28), lx = buf.readUInt16LE(p + 30), lc = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42);
    const nombre = buf.toString('utf8', p + 46, p + 46 + ln);
    const ini = off + 30 + buf.readUInt16LE(off + 26) + buf.readUInt16LE(off + 28);
    const datos = buf.subarray(ini, ini + tam);
    out[nombre] = new Uint8Array(metodo === 8 ? zlib.inflateRawSync(datos) : datos);
    p += 46 + ln + lx + lc;
  }
  return out;
}

function cargar(){
  const V = { avisos: [], bajados: [], zips: [] };
  const ctx = vm.createContext({
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController, atob, btoa, XLSX: {},
    fflate: { strToU8: (t) => new TextEncoder().encode(t), unzipSync: unzip, zipSync: (f) => { V.zips.push(f); return new Uint8Array(4); } },
    localStorage: { _d: {}, getItem(k){ return k in this._d ? this._d[k] : null; }, setItem(k, v){ this._d[k] = String(v); }, removeItem(k){ delete this._d[k]; } },
    castAviso: (t) => V.avisos.push(t), csRepintar(){}, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    URL: { createObjectURL: (b) => { V.bajados.push(b); return 'blob:x'; }, revokeObjectURL(){} },
    document: { createElement: () => ({ click(){}, remove(){}, setAttribute(){} }), body: { appendChild(){} } },
    fetch: async (u) => ({ ok: true, status: 200, arrayBuffer: async () => { const b = fs.readFileSync(path.join(RAIZ, u)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.length); } })
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'dctools.js'), 'utf8') + ';this.DCT = DCT;', ctx);
  V.D = ctx.DCT;
  return V;
}

/* Un episodio procesado, como lo deja dcParseFile: [personaje, talento, tipo]. */
const PSEUDO = new Set(['edicion', 'original', 'todos', 'x']);
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
const ep = (cap, filas) => ({ cap, data: filas.map(([personaje, talento, tipo]) => {
  const pseudo = PSEUDO.has(norm(talento));
  return { personaje, talento: talento || '', talentoKey: pseudo || !talento ? '' : norm(talento), pseudo, tipo: tipo === 'A' ? 'Adicional' : 'Principal' };
}) });

const SERIE = [
  ep('THE WAYANS BROS 213', [['Marlon', 'Juan D Perez'], ['Shawn', 'Sergio Garzon'], ['Pops', 'Alexander Rivera'], ['Narrador', 'Edicion'], ['Norm', 'Harold Leal'], ['Padre', 'Harold Leal'], ['Tc', 'Javier Rodriguez'], ['Gráfica', 'X', 'A'], ['Madre 1', 'Yurany Rubio', 'A']]),
  ep('THE WAYANS BROS 214', [['Marlon', 'Juan D Perez'], ['Shawn', 'Sergio Garzon'], ['Pops', 'Alexander Rivera'], ['Ina', 'Angela M Cano'], ['Grupo Mixto', 'Todos', 'A']]),
  ep('THE WAYANS BROS 215', [['Marlon', 'Juan D Perez'], ['Sahwn', 'Sergio Garzon'], ['Shawn', 'Sergio Garzon'], ['Pops', 'Alexander Rivera'], ['Tc', 'Javier Rodriguez'], ['Toya', 'Sofia Rubio'], ['Mike', 'Gustavo Chajin'], ['Trish', 'Maria Clara Mojica'], ['Don', 'Camilo De Irisarri'], ['Hombre 1', 'Javier Rodriguez', 'A'], ['Amigo 1', 'Original', 'A'], ['Rita', '']])
];

exports.pruebas = async function(t){
  t.seccion('1 · los nombres, como en la plantilla');
  {
    const D = cargar().D;
    const f = (n) => { const x = D.ciNombre(n); return x.nombre + ' / ' + x.apellido; };
    t.eq('sin la inicial del segundo nombre', f('Juan D Perez') + ' · ' + f('Sara S. Hueso'), 'Juan / Perez · Sara / Hueso');
    t.eq('el apellido con partícula, entero', f('Yina De Los Rios') + ' · ' + f('Camilo De Irisarri'), 'Yina / De Los Rios · Camilo / De Irisarri');
    t.eq('con tres palabras, el apellido es la última', f('Maria Clara Mojica'), 'Maria Clara / Mojica');
    t.eq('temporada y episodio del series title: 213 es S2 Eps#13', JSON.stringify([D.ciNumero('THE WAYANS BROS 213', ''), D.ciNumero('MI SERIE 12', ''), D.ciNumero('MI SERIE 12', '3')]),
         '[{"temporada":2,"ep":13},{"temporada":1,"ep":12},{"temporada":3,"ep":12}]');
  }

  t.seccion('2 · quién va al main cast y quién al additional');
  {
    const D = cargar().D;
    D.ST.dc.processed = SERIE;
    t.eq('por defecto, los que salen en la mitad o más de los episodios', D.ciMain(SERIE).join(','), 'marlon,shawn,pops,tc');
    const r = D.ciReparto(SERIE[2], D.ciMain(SERIE));
    const fila = (x) => x.nombre + ' ' + x.apellido + '=' + x.personajes;
    t.eq('main cast: los fijos; un adicional del mismo actor va en su fila; Sahwn es Shawn mal escrito', r.main.map(fila).join(' | '),
         'Juan Perez=Marlon | Sergio Garzon=Shawn | Alexander Rivera=Pops | Javier Rodriguez=TC / Hombre 1');
    t.eq('additional cast: el resto, por orden de apellido', r.adicional.map(fila).join(' | '),
         'Gustavo Chajin=Mike | Camilo De Irisarri=Don | Maria Clara Mojica=Trish | Sofia Rubio=Toya');
    t.eq('sin talento no entra, y se dice; Original, Todos, X y Edicion ni se nombran', r.fuera.join(','), 'Rita');
    t.eq('un actor con dos personajes, en una fila', D.ciReparto(SERIE[0], D.ciMain(SERIE)).adicional.map(fila).join(' | '), 'Harold Leal=Norm / Padre | Yurany Rubio=Madre 1');
    D.ST.dc.ci.main = ['marlon'];
    t.eq('lo que se desmarca pasa a additional', D.ciReparto(SERIE[2], D.ciMain(SERIE)).main.map(fila).join(' | '), 'Juan Perez=Marlon');
  }

  t.seccion('3 · el Word, sobre la plantilla de verdad');
  {
    const D = cargar().D;
    const xml = new TextDecoder().decode(unzip(fs.readFileSync(PLANTILLA))['word/document.xml']);
    const texto = (x) => (x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map((s) => s.replace(/<[^>]+>/g, '')).join('|');
    const r = { main: [{ nombre: 'Juan', apellido: 'Perez', personajes: 'Marlon' }], adicional: [{ nombre: 'Ana & Co', apellido: '<Ruiz>', personajes: 'Mujer 1' }] };
    const out = D.ciLlenarXml(xml, r, 2, 13);
    t.ok('cambia solo el número del series title', texto(out).includes('[S2 – Episode [Eps#13]') && !texto(out).includes('Eps#12'));
    t.ok('se quita el reparto de la plantilla', !/Monique|Benavides|Tovar|Mateus/.test(texto(out)));
    t.ok('y entra el nuevo, con lo raro escapado', texto(out).includes('Juan|Perez|Marlon') && out.includes('Ana &amp; Co') && out.includes('&lt;Ruiz&gt;'));
    t.ok('lo demás de la plantilla, tal cual', ['Andrea Nieto', 'Sofía Rey', 'Jesús Rodriguez', 'Wilfredo Hueso', 'Latin American Spanish'].every((s) => texto(out).includes(s)));
    const filas = (x) => (x.match(/<w:tr[\s>]/g) || []).length;
    t.eq('mismas filas que la plantilla', filas(out), filas(xml));
    const muchos = { main: [], adicional: Array.from({ length: 30 }, (_, i) => ({ nombre: 'N' + i, apellido: 'A' + i, personajes: 'P' + i })) };
    const largo = D.ciLlenarXml(xml, muchos, 2, 13);
    t.ok('si no caben, se añaden filas', filas(largo) === filas(xml) + 30 - 26 && texto(largo).includes('N29|A29|P29'));
    let error = '';
    try{ D.ciLlenarXml('<w:document></w:document>', r, 2, 13); }catch(e){ error = e.message; }
    t.ok('una plantilla sin series title se dice, no se inventa', /Eps#/.test(error));
  }

  t.seccion('4 · en pantalla y al descargar');
  {
    const V = cargar(), D = V.D;
    D.ST.dc.processed = SERIE;
    const h = D.html('dubcards');
    t.ok('el panel con la temporada, la plantilla, el main cast y el botón, sin emojis', /Contract Inventory/.test(h) && /data-dct="ciTemp"[^>]*value="2"/.test(h) && /data-dct="ciTplElegir"/.test(h) && /data-k="tc" checked/.test(h) && /data-dct="ciBajar"/.test(h) && !EMOJI.test(h));
    t.ok('los de un solo episodio, escondidos hasta que se piden', !/data-k="toya"/.test(h) && /Ver todos/.test(h));
    const docs = await D.ciDocumentos();
    t.eq('un Word por episodio, con su nombre', docs.map((d) => d.nombre).join(' '),
         'Contract_Inventory_THE_WAYANS_BROS_S2_Eps13.docx Contract_Inventory_THE_WAYANS_BROS_S2_Eps14.docx Contract_Inventory_THE_WAYANS_BROS_S2_Eps15.docx');
    const z = V.zips[2];
    t.ok('cada Word lleva la plantilla entera y su propio reparto', !!z['word/media/image1.png'] && /Eps#15/.test(new TextDecoder().decode(z['word/document.xml'])) && /Mojica/.test(new TextDecoder().decode(z['word/document.xml'])));
  }
};
