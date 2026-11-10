/* CASTING 1, ordenado por talento · especificacion 02, CAST-48
 *
 * Pedido de sala: «que el archivo de Excel, cuando se descargue, en CASTING 1,
 * solamente cuando esté completo todo el casting, se reorganice por el
 * talento, o sea, por el locutor. Si el talento tiene dos personajes, va
 * primero el personaje importante. No cambies las fórmulas, solo la
 * reorganización; el segmento de páginas e intervenciones también se cambia, y
 * el total. Que no afecte ninguna de las demás hojas del documento».
 *
 * Cómo: cada personaje de CASTING 1 es un BLOQUE de filas (la suya y las de
 * debajo sin personaje, donde siguen sus páginas e intervenciones). Los
 * bloques se ordenan por el locutor (alfabético; TODOS, ORIGINAL, EDICION y
 * los vacíos al final) y, del mismo locutor, primero el de más intervenciones
 * (la columna TOTAL). Se mueven como «cortar y pegar» de Excel:
 *   · cada celda va con su fórmula TAL CUAL (las que leen del DESGLOCE o de
 *     CASTING siguen leyendo lo mismo, así el dato va con su fila);
 *   · lo único que se ajusta son las referencias a celdas de CASTING 1 que se
 *     movieron (el TOTAL que suma su propia fila sigue sumando su fila), y las
 *     de otras hojas a CASTING 1, para que esas hojas sigan dando lo mismo;
 *   · las fórmulas arrastradas (compartidas) se escriben enteras antes de
 *     mover, porque una compartida no se puede repartir entre filas sueltas;
 *   · las celdas combinadas dentro de un bloque se mueven con él.
 * Si algo no se puede mover sin cambiar lo que calcula (un rango que coge
 * medio bloque, una combinación entre dos bloques…), NO se ordena y se dice.
 */

/* ── Leer el libro ── */
const corDec = (b) => new TextDecoder().decode(b);
const corEnc = (t) => new TextEncoder().encode(t);
const corDes = (t) => String(t == null ? '' : t).replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&#(\d+);/g, (m, d) => String.fromCharCode(+d)).replace(/&amp;/g, '&');
const corEsc = (t) => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const corAttr = (a, k) => { const m = String(a || '').match(new RegExp('\\b' + k + '="([^"]*)"')); return m ? m[1] : null; };
const corColN = (l) => { let n = 0; for(const ch of l) n = n * 26 + ch.charCodeAt(0) - 64; return n; };
const corColL = (n) => { let s = ''; while(n > 0){ const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = (n - 1 - r) / 26; } return s; };
const corClave = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
const CORD_AL_FINAL = new Set(['', 'TODOS', 'ORIGINAL', 'EDICION', 'X', 'N/A', 'NA', 'VARIOS']);

/** Las hojas del libro: [{ nombre, ruta }]. */
function corHojas(arch){
  const wb = arch['xl/workbook.xml'] ? corDec(arch['xl/workbook.xml']) : '', rels = arch['xl/_rels/workbook.xml.rels'] ? corDec(arch['xl/_rels/workbook.xml.rels']) : '';
  const rs = (rels.match(/<Relationship\b[^>]*>/g) || []);
  return [...wb.matchAll(/<sheet\b([^>]*)\/?>/g)].map(m => {
    const rid = corAttr(m[1], 'r:id'), rel = rs.find(x => corAttr(x, 'Id') === rid), t = rel ? corAttr(rel, 'Target') : null;
    return { nombre: corDes(corAttr(m[1], 'name')), ruta: t ? (/^\//.test(t) ? t.replace(/^\/+/, '') : 'xl/' + t) : null };
  }).filter(h => h.ruta && arch[h.ruta]);
}
function corCompartidos(arch){
  if(!arch['xl/sharedStrings.xml']) return [];
  return (corDec(arch['xl/sharedStrings.xml']).match(/<si>[\s\S]*?<\/si>/g) || []).map(si => corDes((si.match(/<t[^>]*>([\s\S]*?)<\/t>/g) || []).map(x => x.replace(/<[^>]+>/g, '')).join('')));
}

/** Las filas de una hoja: { antes, despues, filas: Map(n → { attrs, celdas: [{ col, colN, attrs, cuerpo }] }) }. */
function corLeerHoja(xml){
  const i = xml.indexOf('<sheetData'), j = xml.indexOf('</sheetData>');
  if(i < 0) return null;
  const abre = xml.indexOf('>', i);
  if(xml[abre - 1] === '/') return { antes: xml.slice(0, i), despues: xml.slice(abre + 1), filas: new Map() };
  const cuerpo = xml.slice(abre + 1, j), filas = new Map();
  let nf = 0;
  for(const m of cuerpo.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)){
    const r = +corAttr(m[1], 'r') || nf + 1; nf = r;
    const celdas = [];
    let nc = 0;
    for(const c of (m[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)){
      const ref = corAttr(c[1], 'r'), col = ref ? ref.replace(/\d+/g, '') : corColL(nc + 1);
      nc = corColN(col);
      celdas.push({ col: col, colN: nc, attrs: c[1].replace(/\s*\br="[^"]*"/, ''), cuerpo: c[2] == null ? null : c[2] });
    }
    filas.set(r, { attrs: m[1].replace(/\s*\br="[^"]*"/, ''), celdas: celdas });
  }
  return { antes: xml.slice(0, i), despues: xml.slice(j + '</sheetData>'.length), filas: filas };
}
function corEscribirHoja(h){
  const cuerpo = [...h.filas.keys()].sort((a, b) => a - b).map(r => {
    const f = h.filas.get(r);
    const cs = f.celdas.slice().sort((a, b) => a.colN - b.colN).map(c => '<c r="' + c.col + r + '"' + c.attrs + (c.cuerpo == null ? '/>' : '>' + c.cuerpo + '</c>')).join('');
    return '<row r="' + r + '"' + f.attrs + (cs ? '>' + cs + '</row>' : '/>');
  }).join('');
  return h.antes + '<sheetData>' + cuerpo + '</sheetData>' + h.despues;
}
/** El texto que enseña una celda (su valor guardado). */
function corTexto(c, comp){
  if(!c || c.cuerpo == null) return '';
  const t = corAttr(c.attrs, 't'), v = c.cuerpo.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/);
  if(t === 's') return v ? (comp[+v[1]] || '') : '';
  if(t === 'inlineStr'){ const x = c.cuerpo.match(/<t[^>]*>([\s\S]*?)<\/t>/g); return x ? corDes(x.map(y => y.replace(/<[^>]+>/g, '')).join('')) : ''; }
  return v ? corDes(v[1]) : '';
}

/* ── Las referencias de una fórmula ── */
/* Una referencia A1 (con hoja o sin ella, con $ o sin ellos, sola o rango), fuera de los textos entre comillas. */
const CORD_RE_REF = /(^|[^A-Za-z0-9_.$'!\]])((?:'(?:[^']|'')+'|[A-Za-z_À-ſ][A-Za-z0-9_.À-ſ]*)!)?(\$?)([A-Z]{1,3})(\$?)(\d+)(?::(\$?)([A-Z]{1,3})(\$?)(\d+))?(?![A-Za-z0-9_(!])/g;
/** Recorre las referencias de una fórmula: `fn({ hoja, c1, r1, c2, r2, abs })` devuelve el texto nuevo o null para dejarla. */
function corMapRefs(formula, fn){
  return String(formula).split(/("(?:[^"]|"")*")/).map((trozo, i) => i % 2 ? trozo : trozo.replace(CORD_RE_REF, (todo, pre, hoja, dc1, c1, dr1, r1, dc2, c2, dr2, r2) => {
    const nombre = hoja ? hoja.slice(0, -1).replace(/^'|'$/g, '').replace(/''/g, "'") : null;
    const x = fn({ hoja: nombre, c1: c1, r1: +r1, c2: c2 || c1, r2: r2 ? +r2 : +r1, rango: !!c2, abs: { c1: dc1, r1: dr1, c2: dc2 || '', r2: dr2 || '' } });
    if(x == null) return todo;
    return pre + (hoja || '') + x;
  })).join('');
}
const corRefTexto = (o, r1, r2, d) => {
  d = d || { f: 0, c: 0 };
  const col = (c, abs) => abs ? c : corColL(corColN(c) + d.c);
  const a = o.abs.c1 + col(o.c1, o.abs.c1) + o.abs.r1 + r1;
  return o.rango ? a + ':' + o.abs.c2 + col(o.c2, o.abs.c2) + o.abs.r2 + r2 : a;
};
/** Una fórmula compartida escrita para otra celda: sus referencias relativas se desplazan como lo haría Excel. */
function corDesplazar(formula, dFila, dCol){
  return corMapRefs(formula, (o) => {
    const r1 = o.abs.r1 ? o.r1 : o.r1 + dFila, r2 = o.abs.r2 || (!o.rango && o.abs.r1) ? o.r2 : o.r2 + dFila;
    return corRefTexto(o, r1, o.rango ? r2 : r1, { f: dFila, c: dCol });
  });
}

/** Escribe enteras las fórmulas compartidas de una hoja (las de `cuales(si, maestraTexto)`), quitando el «shared». */
function corDescompartir(h, cuales){
  const maestras = {};
  h.filas.forEach((f, r) => f.celdas.forEach(c => {
    const m = c.cuerpo && c.cuerpo.match(/<f\b([^>]*)>([\s\S]*?)<\/f>/);
    if(m && corAttr(m[1], 't') === 'shared' && corAttr(m[1], 'ref') != null) maestras[corAttr(m[1], 'si')] = { r: r, colN: c.colN, texto: corDes(m[2]) };
  }));
  let n = 0;
  h.filas.forEach((f, r) => f.celdas.forEach(c => {
    const m = c.cuerpo && c.cuerpo.match(/<f\b([^>]*?)(?:\/>|>([\s\S]*?)<\/f>)/);
    if(!m || corAttr(m[1], 't') !== 'shared') return;
    const si = corAttr(m[1], 'si'), ma = maestras[si];
    if(!ma || !cuales(si, ma.texto)) return;
    const texto = corDesplazar(ma.texto, r - ma.r, c.colN - ma.colN);
    c.cuerpo = c.cuerpo.replace(m[0], '<f>' + corEsc(texto) + '</f>');
    n++;
  }));
  return n;
}

/* ── Ordenar CASTING 1 ── */
/**
 * Ordena CASTING 1 por locutor. `o.actorDe(personaje)`: el actor que tiene
 * ahora ese personaje (lo recién escrito en CASTING), por si los valores
 * guardados de CASTING 1 son de antes. Devuelve { hecho, motivo?, bloques, orden }.
 */
function corOrdenarCasting1(arch, o){
  o = o || {};
  const hojas = corHojas(arch), hoja = hojas.find(x => /^CASTING 1$/i.test(x.nombre.trim()));
  if(!hoja) return { hecho: false, motivo: 'el libro no tiene hoja CASTING 1' };
  const comp = corCompartidos(arch);
  const H = corLeerHoja(corDec(arch[hoja.ruta]));
  if(!H) return { hecho: false, motivo: 'no se pudo leer CASTING 1' };
  const celda = (r, col) => { const f = H.filas.get(r); return f ? f.celdas.find(c => c.col === col) : null; };
  const txt = (r, col) => corTexto(celda(r, col), comp).replace(/\s+/g, ' ').trim();

  /* La cabecera: PERSONAJE y LOCUTOR en la misma fila; TOTAL, en esa o en las dos de debajo. */
  let cab = null;
  for(const r of [...H.filas.keys()].sort((a, b) => a - b)){
    if(r > 60) break;
    const cs = H.filas.get(r).celdas, p = cs.find(c => corClave(corTexto(c, comp)) === 'PERSONAJE'), l = cs.find(c => corClave(corTexto(c, comp)) === 'LOCUTOR');
    if(p && l){ cab = { r: r, p: p.col, l: l.col }; break; }
  }
  if(!cab) return { hecho: false, motivo: 'CASTING 1 no tiene la cabecera PERSONAJE / LOCUTOR' };
  let colTotal = null;
  for(let r = cab.r; r <= cab.r + 2 && !colTotal; r++){ const f = H.filas.get(r); const c = f && f.celdas.find(x => corClave(corTexto(x, comp)) === 'TOTAL'); if(c) colTotal = c.col; }
  const conAlgo = (r) => { const f = H.filas.get(r); return !!f && f.celdas.some(c => corTexto(c, comp).trim() !== ''); };

  /* Los bloques: la fila de cada personaje y las de debajo sin personaje. */
  const ultima = Math.max(0, ...H.filas.keys());
  const bloques = [];
  let hueco = false;                                                       // ya hubo una fila vacía después del último personaje
  for(let r = cab.r + 1; r <= ultima; r++){
    const p = txt(r, cab.p);
    if(p && /^TOTAL\b/i.test(p)) break;                                   // una fila de totales al pie: ahí acaba la tabla
    if(p){ bloques.push({ desde: r, hasta: r, personaje: p, i: bloques.length }); hueco = false; }
    else if(!conAlgo(r)) hueco = true;
    else if(bloques.length && !hueco) bloques[bloques.length - 1].hasta = r;   // sus páginas e intervenciones, seguidas
  }
  /* Las filas vacías entre dos personajes van con el de arriba; las del final, no. */
  for(let k = 0; k < bloques.length - 1; k++) bloques[k].hasta = bloques[k + 1].desde - 1;
  if(bloques.length < 2) return { hecho: false, motivo: 'CASTING 1 tiene menos de dos personajes', bloques: bloques.length };
  const ini = bloques[0].desde, fin = bloques[bloques.length - 1].hasta;

  for(const b of bloques){
    const act = o.actorDe ? o.actorDe(b.personaje) : null;
    b.locutor = String(act != null && String(act).trim() ? act : txt(b.desde, cab.l)).replace(/\s+/g, ' ').trim();
    b.total = colTotal ? (parseFloat(String(txt(b.desde, colTotal)).replace(',', '.')) || 0) : 0;
  }
  const orden = bloques.slice().sort((a, b) => {
    const ka = corClave(a.locutor), kb = corClave(b.locutor), fa = CORD_AL_FINAL.has(ka) ? 1 : 0, fb = CORD_AL_FINAL.has(kb) ? 1 : 0;
    return (fa - fb) || ka.localeCompare(kb, 'es') || (b.total - a.total) || (a.i - b.i);
  });
  if(orden.every((b, k) => b === bloques[k])) return { hecho: true, igual: true, bloques: bloques.length, orden: orden.map(b => b.personaje) };

  /* Dónde va cada fila. */
  let pos = ini;
  for(const b of orden){ b.nuevo = pos; b.d = pos - b.desde; pos += b.hasta - b.desde + 1; }
  const bloqueDe = (r) => bloques.find(b => r >= b.desde && r <= b.hasta) || null;
  const nueva = (r) => { const b = bloqueDe(r); return b ? r + b.d : r; };
  /** Un rango de filas de CASTING 1, movido. null si no se puede sin cambiar lo que coge. */
  const moverRango = (r1, r2) => {
    if(r2 < ini || r1 > fin) return [r1, r2];
    if(r1 <= ini && r2 >= fin) return [r1, r2];                                 // coge toda la tabla: da lo mismo
    if(r1 === r2) return [nueva(r1), nueva(r1)];
    const b1 = bloqueDe(r1), b2 = bloqueDe(r2);
    if(b1 && b1 === b2) return [r1 + b1.d, r2 + b1.d];
    return null;
  };
  let problema = null;
  const remapear = (formula, propia) => corMapRefs(formula, (x) => {
    const esta = x.hoja == null ? propia : corClave(x.hoja) === corClave(hoja.nombre);
    if(!esta) return null;
    const m = moverRango(x.r1, x.r2);
    if(!m){ problema = problema || ('una fórmula coge solo una parte de la tabla de CASTING 1 (' + (x.hoja ? x.hoja + '!' : '') + x.c1 + x.r1 + ':' + x.c2 + x.r2 + ')'); return null; }
    if(m[0] === x.r1 && m[1] === x.r2) return null;
    return corRefTexto(x, m[0], m[1]);
  });
  const nombreRe = new RegExp("(^|[^A-Za-z0-9_])('?)" + hoja.nombre.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + "\\2!", 'i');

  /* 1 · Las fórmulas compartidas de CASTING 1, y las de otras hojas que la miran, enteras. */
  corDescompartir(H, () => true);
  const otras = [];
  for(const h of hojas){
    if(h === hoja) continue;
    const xml = corDec(arch[h.ruta]);
    if(!nombreRe.test(corDes(xml))) continue;
    const L = corLeerHoja(xml);
    if(!L) continue;
    corDescompartir(L, (si, texto) => nombreRe.test(texto));
    otras.push({ h: h, L: L });
  }
  /* 2 · Las referencias. */
  const cambiarFormulas = (L, propia) => L.filas.forEach(f => f.celdas.forEach(c => {
    if(!c.cuerpo) return;
    c.cuerpo = c.cuerpo.replace(/(<f\b[^>]*>)([\s\S]*?)(<\/f>)/, (m, a, t, z) => {
      const nuevo = remapear(corDes(t), propia);
      let a2 = a;
      const ref = corAttr(a, 'ref');
      if(propia && ref && corAttr(a, 't') === 'array'){
        const mm = ref.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
        if(mm){ const rr = moverRango(+mm[2], +(mm[4] || mm[2])); if(!rr) problema = problema || 'una fórmula matricial cruza dos personajes'; else a2 = a.replace(/\bref="[^"]*"/, 'ref="' + mm[1] + rr[0] + (mm[3] ? ':' + mm[3] + rr[1] : '') + '"'); }
      }
      return a2 + (nuevo === corDes(t) ? t : corEsc(nuevo)) + z;
    });
  }));
  cambiarFormulas(H, true);
  otras.forEach(x => cambiarFormulas(x.L, false));
  /* Los nombres definidos que miran CASTING 1 (áreas de impresión, etc.). */
  let wbx = corDec(arch['xl/workbook.xml']);
  wbx = wbx.replace(/(<definedName\b[^>]*>)([\s\S]*?)(<\/definedName>)/g, (m, a, t, z) => { const n = remapear(corDes(t), false); return a + (n === corDes(t) ? t : corEsc(n)) + z; });
  /* 3 · Las celdas combinadas, la validación y los formatos condicionales de CASTING 1. */
  const moverSqref = (sq, estricto) => sq.split(/\s+/).map(rg => {
    const mm = rg.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
    if(!mm) return rg;
    const rr = moverRango(+mm[2], +(mm[4] || mm[2]));
    if(!rr){ if(estricto) problema = problema || ('las celdas combinadas ' + rg + ' cruzan dos personajes'); return rg; }
    return mm[1] + rr[0] + (mm[3] ? ':' + mm[3] + rr[1] : '');
  }).join(' ');
  H.despues = H.despues
    .replace(/(<mergeCell\b[^>]*\bref=")([^"]+)(")/g, (m, a, r, z) => a + moverSqref(r, true) + z)
    .replace(/(<(?:dataValidation|conditionalFormatting|hyperlink)\b[^>]*\b(?:sqref|ref)=")([^"]+)(")/g, (m, a, r, z) => a + moverSqref(r, false) + z);
  if(problema) return { hecho: false, motivo: problema, bloques: bloques.length };

  /* 4 · Mover las filas, con sus celdas tal cual. */
  const filas = new Map();
  H.filas.forEach((f, r) => filas.set(nueva(r), f));
  H.filas = filas;
  /* El locutor que enseña cada fila, el de ahora (la fórmula, igual). */
  if(o.actorDe) for(const b of orden){
    const c = (H.filas.get(b.nuevo) || { celdas: [] }).celdas.find(x => x.col === cab.l);
    if(c && c.cuerpo && /<f\b/.test(c.cuerpo) && b.locutor && corAttr(c.attrs, 't') === 'str')
      c.cuerpo = /<v>[\s\S]*?<\/v>|<v\/>/.test(c.cuerpo) ? c.cuerpo.replace(/<v>[\s\S]*?<\/v>|<v\/>/, '<v>' + corEsc(b.locutor) + '</v>') : c.cuerpo + '<v>' + corEsc(b.locutor) + '</v>';
  }
  arch[hoja.ruta] = corEnc(corEscribirHoja(H));
  otras.forEach(x => { arch[x.h.ruta] = corEnc(corEscribirHoja(x.L)); });
  arch['xl/workbook.xml'] = corEnc(wbx);
  /* La cadena de cálculo apunta a las celdas de antes: fuera (Excel la rehace al abrir). */
  if(arch['xl/calcChain.xml']){
    delete arch['xl/calcChain.xml'];
    if(arch['[Content_Types].xml']) arch['[Content_Types].xml'] = corEnc(corDec(arch['[Content_Types].xml']).replace(/<Override\b[^>]*calcChain[^>]*\/>/g, ''));
    if(arch['xl/_rels/workbook.xml.rels']) arch['xl/_rels/workbook.xml.rels'] = corEnc(corDec(arch['xl/_rels/workbook.xml.rels']).replace(/<Relationship\b[^>]*calcChain[^>]*\/>/g, ''));
  }
  return { hecho: true, bloques: bloques.length, orden: orden.map(b => b.personaje + ' (' + (b.locutor || '-') + ')'), otrasHojas: otras.map(x => x.h.nombre) };
}
