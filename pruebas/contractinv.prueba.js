/* Contract Inventory desde la DUBCARD unida · especificacion 09, PRO-55 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const zlib = require('zlib');
const { INDEX } = require('./ayuda');

exports.nombre = 'Contract Inventory: un Word por episodio desde la DUBCARD unida';

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
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController, atob, btoa,
    /* Un SheetJS de mentira: el «archivo» lleva ya sus hojas, como filas. */
    XLSX: { read: (bytes) => bytes.buffer.__wb, utils: { sheet_to_json: (ws) => ws.filas } },
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
    D.ST.ci.eps = SERIE;
    t.eq('por defecto, los que salen en la mitad o más de los episodios', D.ciMain(SERIE).join(','), 'marlon,shawn,pops,tc');
    const r = D.ciReparto(SERIE[2], D.ciMain(SERIE));
    const fila = (x) => x.nombre + ' ' + x.apellido + '=' + x.personajes;
    t.eq('main cast: los fijos; un adicional del mismo actor va en su fila; Sahwn es Shawn mal escrito', r.main.map(fila).join(' | '),
         'Juan Perez=Marlon | Sergio Garzon=Shawn | Alexander Rivera=Pops | Javier Rodriguez=TC / Hombre 1');
    t.eq('additional cast: el resto, por orden de apellido', r.adicional.map(fila).join(' | '),
         'Gustavo Chajin=Mike | Camilo De Irisarri=Don | Maria Clara Mojica=Trish | Sofia Rubio=Toya');
    t.eq('sin talento no entra, y se dice; Original, Todos, X y Edicion ni se nombran', r.fuera.join(','), 'Rita');
    t.eq('un actor con dos personajes, en una fila', D.ciReparto(SERIE[0], D.ciMain(SERIE)).adicional.map(fila).join(' | '), 'Harold Leal=Norm / Padre | Yurany Rubio=Madre 1');
    D.ST.ci.main = ['marlon'];
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

  t.seccion('4 · el equipo: contacto, traductor, adaptador y director');
  {
    const D = cargar().D;
    const xml = new TextDecoder().decode(unzip(fs.readFileSync(PLANTILLA))['word/document.xml']);
    t.eq('se lee lo que trae la plantilla', JSON.stringify(D.ciEquipoDe(xml)),
         '{"contacto":"Andrea Nieto","correo":"Andrea@centauro.com","traductor":"Sofía Rey","adaptador":"Jesús Rodriguez","director":"Wilfredo Hueso"}');
    const r = { main: [], adicional: [] };
    const out = D.ciLlenarXml(xml, r, 2, 13, { traductor: 'Ana Gómez', adaptador: 'Luis Paz', director: 'Wilfredo Hueso', contacto: 'Andrea Nieto', correo: 'a@b.co' });
    t.eq('y se escribe lo nuevo, en las tres columnas', JSON.stringify(D.ciEquipoDe(out)),
         '{"contacto":"Andrea Nieto","correo":"a@b.co","traductor":"Ana Gómez","adaptador":"Luis Paz","director":"Wilfredo Hueso"}');
    const texto = (x) => (x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map((s) => s.replace(/<[^>]+>/g, '')).join('|');
    t.ok('Translator, tres veces; y Sofía Rey ya no está', texto(out).includes('Translator|Ana Gómez|Ana Gómez|Ana Gómez') && !texto(out).includes('Sofía Rey'));
    t.ok('el Studio no se toca', texto(out).includes('Centauro Comunicaciones'));
  }

  t.seccion('5 · la DUBCARD unida: se sube, se lee y se baja');
  {
    const V = cargar(), D = V.D;
    const hoja = (titulo, filas) => ({ filas: [['📋 PLAN DE COPIADO'], ['Personaje', 'Talento'], ['Ana', 'Luz'], ['📽️ ' + titulo], ['#', 'Personaje', 'Talento', 'Tipo', 'Nota']].concat(filas.map((f, i) => [String(i + 1)].concat(f))) });
    const wb = { SheetNames: ['Producción', 'Matriz', 'THE WAYANS BROS 214', 'THE WAYANS BROS 213'], Sheets: {
      'Producción': { filas: [['🎬 Equipo de Producción'], ['#', 'Rol', 'Nombre'], ['1', 'Dirección de Doblaje', 'Wilfredo Hueso']] },
      'Matriz': { filas: [['🧩 Matriz de Recurrencia'], ['Personaje', 'EP 213'], ['Marlon', 'Juan D Perez']] },
      'THE WAYANS BROS 213': hoja('THE WAYANS BROS 213', [['Marlon', 'Juan D Perez', 'Principal', ''], ['Narrador', 'Edicion', 'Principal', ''], ['Rita', 'Sin asignar', 'Principal', ''], ['Madre 1', 'Yurany Rubio', 'Adicional', '']]),
      'THE WAYANS BROS 214': hoja('THE WAYANS BROS 214', [['Marlon', 'Juan D Perez', 'Principal', '🔁 EP 213'], ['Grupo Mixto', 'Todos', 'Adicional', '']]) } };
    const buf = Object.assign(new ArrayBuffer(8), { __wb: wb });
    await D.ciCargarDubcard({ name: 'DUBCARD_THE WAYANS BROS_213-214.xlsx', size: 8, arrayBuffer: async () => buf });
    const C = D.ST.ci;
    t.eq('una entrada por hoja de episodio, en orden; Producción y Matriz se saltan', C.eps.map((e) => e.cap + ':' + e.data.length).join(' '), 'THE WAYANS BROS 213:4 THE WAYANS BROS 214:2');
    t.eq('«Sin asignar» es sin talento; Edicion y Todos no son actores', D.ciReparto(C.eps[0], D.ciMain(C.eps)).fuera.join(',') + ' · ' + C.eps[0].data.filter((r) => r.pseudo).length, 'Rita · 1');
    const h = D.html('contratos');
    t.ok('la sección: la DUBCARD, la temporada, la plantilla, el equipo, el main cast y el botón, sin emojis', /DUBCARD_THE WAYANS BROS_213-214\.xlsx · 2 episodios/.test(h) && /data-dct="ciTemp"[^>]*value="2"/.test(h) && /data-dct="ciTplElegir"/.test(h)
      && /data-k="traductor" value="Sofía Rey"/.test(h) && /data-k="marlon" checked/.test(h) && /data-dct="ciBajar"/.test(h) && !EMOJI.test(h), (h.match(EMOJI) || [''])[0]);
    t.ok('ya no está dentro de DUBCARDs', !/data-dct="ciBajar"/.test(D.html('dubcards')));
    const vacia = cargar().D;
    t.ok('sin DUBCARD, solo se pide subirla', /la DUBCARD unida/.test(vacia.html('contratos')) && !/data-dct="ciBajar"/.test(vacia.html('contratos')));
    C.equipo.traductor = 'Ana Gómez';
    const docs = await D.ciDocumentos();
    t.eq('un Word por episodio, con su nombre', docs.map((d) => d.nombre).join(' '), 'Contract_Inventory_THE_WAYANS_BROS_S2_Eps13.docx Contract_Inventory_THE_WAYANS_BROS_S2_Eps14.docx');
    const z = new TextDecoder().decode(V.zips[1]['word/document.xml']);
    t.ok('cada Word lleva la plantilla entera, su número, su reparto y el traductor escrito', !!V.zips[1]['word/media/image1.png'] && /Eps#14/.test(z) && /Perez/.test(z) && /Ana Gómez/.test(z) && !/Sofía Rey/.test(z));
    const otra = cargar().D;
    await otra.ciCargarDubcard({ name: 'notas.xlsx', size: 8, arrayBuffer: async () => Object.assign(new ArrayBuffer(8), { __wb: { SheetNames: ['Hoja1'], Sheets: { Hoja1: { filas: [['hola']] } } } }) });
    t.ok('un Excel que no es una DUBCARD se dice', /no tiene hojas de episodio/.test(otra.ST.ci.err));
  }
};
