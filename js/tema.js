/* El conversor de colores del tema «vidrio» · especificacion 07, ENT-26
 *
 * Pedido de sala: «quiero cambiar la interfaz gráfica general a esta» (un panel
 * de vidrio claro: fondo pastel, tarjetas blancas, barra y cabeceras en verde
 * petróleo, acentos menta y durazno) y «también haz una interfaz dark».
 *
 * Dubbipt nació oscuro y lleva más de dos mil colores escritos a mano. En vez
 * de reescribirlos, el tema es una CAPA: para cada regla de un CSS, la misma
 * regla solo con sus colores, convertidos. Este archivo es ese conversor, y
 * vale en dos sitios:
 *   · en Node, herramientas/tema.js lo usa para generar tema-claro-auto.css y
 *     tema-oscuro-auto.css a partir del CSS de index.html;
 *   · en el navegador, la app lo usa para el CSS que no está en index.html
 *     como hoja: el del libreto (que es otro documento) y el que se inyecta.
 *
 * Cómo se convierte un color (en HSL), según el modo:
 *   · 'claro': los fondos oscuros pasan a superficies casi blancas; las
 *     líneas, a grises verdosos; el texto claro, a tinta verde petróleo; un
 *     fondo claro (un botón blanco), a relleno petróleo; el verde de la marca,
 *     a esmeralda; los demás tonos conservan el matiz con la claridad dada la
 *     vuelta; las sombras negras, más suaves;
 *   · 'oscuro': las claridades de siempre con otro tinte: negros y grises
 *     teñidos de verde petróleo, y el verde de la marca pasado a menta.
 */

const TEMA = (function(){
/* ── Colores ─────────────────────────────────────────────────────────────── */

function aHsl(r, g, b){
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2;
  let h = 0, s = 0;
  if(mx !== mn){
    const d = mx - mn;
    s = l > 0.5 ? d / (2 - mx - mn) : d / (mx + mn);
    h = mx === r ? ((g - b) / d + (g < b ? 6 : 0)) : mx === g ? ((b - r) / d + 2) : ((r - g) / d + 4);
    h *= 60;
  }
  return { h: h, s: s, l: l };
}
function deHsl(h, s, l){
  h = ((h % 360) + 360) % 360 / 360;
  const f = (p, q, t) => { t = (t + 1) % 1; return t < 1 / 6 ? p + (q - p) * 6 * t : t < 1 / 2 ? q : t < 2 / 3 ? p + (q - p) * (2 / 3 - t) * 6 : p; };
  if(s === 0){ const v = Math.round(l * 255); return [v, v, v]; }
  const q = l < 0.5 ? l * (1 + s) : l + s - l * s, p = 2 * l - q;
  return [f(p, q, h + 1 / 3), f(p, q, h), f(p, q, h - 1 / 3)].map(x => Math.round(x * 255));
}
const hex2 = (n) => n.toString(16).padStart(2, '0');
const lim = (x, a, b) => Math.max(a, Math.min(b, x));
/** Interpola: x en [x0,x1] → [y0,y1]. */
const tramo = (x, x0, x1, y0, y1) => y0 + (y1 - y0) * lim((x - x0) / (x1 - x0), 0, 1);

/** Lee un color literal. Devuelve { r, g, b, a } o null. */
function leerColor(t){
  t = t.trim().toLowerCase();
  if(t === 'white') return { r: 255, g: 255, b: 255, a: 1 };
  if(t === 'black') return { r: 0, g: 0, b: 0, a: 1 };
  let m = t.match(/^#([0-9a-f]{3,8})$/);
  if(m){
    let x = m[1];
    if(x.length === 3 || x.length === 4) x = x.split('').map(c => c + c).join('');
    if(x.length !== 6 && x.length !== 8) return null;
    return { r: parseInt(x.slice(0, 2), 16), g: parseInt(x.slice(2, 4), 16), b: parseInt(x.slice(4, 6), 16), a: x.length === 8 ? parseInt(x.slice(6, 8), 16) / 255 : 1 };
  }
  m = t.match(/^rgba?\(\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*[, ]\s*([\d.]+)\s*(?:[,/]\s*([\d.]+%?)\s*)?\)$/);
  if(m){
    let a = m[4] == null ? 1 : (/%$/.test(m[4]) ? parseFloat(m[4]) / 100 : parseFloat(m[4]));
    return { r: +m[1], g: +m[2], b: +m[3], a: a };
  }
  return null;
}
function escribirColor(rgb, a){
  const [r, g, b] = rgb;
  if(a >= 0.999) return '#' + hex2(r) + hex2(g) + hex2(b);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + (+a.toFixed(3)) + ')';
}

/* La tinta y las superficies del tema: un verde petróleo muy oscuro y blancos apenas verdosos. */
const TONO = 168;            // el matiz de los neutros
const TONO_VERDE = 166;      // la esmeralda de la marca

/** ¿De qué familia es? 'neutro', 'verde' u 'otro'. */
function familia(c){
  if(c.s < 0.28 || c.l < 0.035 || c.l > 0.975) return 'neutro';
  /* Los violetas apagados del tema viejo (#191238, #ECE9FB, #8B84B0…) eran sus neutros. */
  if(c.h >= 225 && c.h <= 285 && (c.l < 0.30 || c.l > 0.85 || c.s < 0.45)) return 'neutro';
  if(c.h >= 80 && c.h <= 165) return 'verde';
  return 'otro';
}

/**
 * Convierte un color. `uso`: 'fondo', 'texto', 'borde', 'sombra' u 'otro'.
 * Devuelve el texto CSS del color nuevo.
 */
function convertir(col, uso, modo){
  if(modo === 'oscuro') return convertirOscuro(col, uso);
  const c = aHsl(col.r, col.g, col.b), fam = familia(c), L = c.l;
  let h = c.h, s = c.s, l = L, a = col.a;
  if(uso === 'otro') uso = (fam === 'neutro' ? (L < 0.35 ? 'fondo' : 'texto') : 'texto');

  if(uso === 'sombra'){
    if(fam === 'neutro'){
      if(L > 0.6) return escribirColor([255, 255, 255], a);                 // un brillo blanco sigue blanco
      return escribirColor(deHsl(TONO, 0.5, 0.12), a * 0.3);               // la sombra negra, más suave
    }
    if(fam === 'verde') return escribirColor(deHsl(TONO_VERDE, 0.6, 0.38), a);
    return escribirColor(deHsl(h, Math.min(s, 0.85), lim(L, 0.4, 0.6)), a);
  }

  if(fam === 'neutro'){
    h = TONO;
    if(uso === 'fondo'){
      if(L < 0.14){ l = tramo(L, 0.03, 0.14, 0.962, 1); s = 0.30; }          // superficies
      else if(L < 0.35){ l = tramo(L, 0.14, 0.35, 0.935, 0.86); s = 0.20; }  // rellenos suaves, al pasar por encima
      else if(L < 0.6){ l = 1 - L; s = 0.12; }
      else { l = tramo(L, 0.6, 1, 0.20, 0.13); s = 0.45; }                   // un fondo claro: relleno petróleo
    }else if(uso === 'borde'){
      if(L < 0.14){ l = 0.90; s = 0.20; }
      else if(L < 0.35){ l = tramo(L, 0.14, 0.35, 0.87, 0.79); s = 0.18; }
      else if(L < 0.6){ l = 1 - L; s = 0.12; }
      else { l = 0.24; s = 0.35; }
    }else{                                                                    // texto
      if(L >= 0.85){ l = 0.135; s = 0.45; }                                   // la tinta
      else if(L >= 0.6){ l = tramo(L, 0.6, 0.85, 0.40, 0.27); s = 0.18; }     // atenuado
      else if(L >= 0.4){ l = tramo(L, 0.4, 0.6, 0.47, 0.40); s = 0.10; }      // tenue
      else { l = 0.975; s = 0.35; }                                           // texto oscuro: iba sobre un relleno
    }
    return escribirColor(deHsl(h, s, l), a);
  }

  if(fam === 'verde'){
    h = TONO_VERDE;
    if(uso === 'fondo'){
      if(L < 0.2){ l = 0.94; s = 0.45; }                                      // un panel verde oscuro: menta pálida
      else if(L <= 0.72){ l = tramo(L, 0.4, 0.72, 0.30, 0.26); s = 0.62; }    // relleno esmeralda
      else { l = 0.90; s = 0.5; }
      /* Un velo verde (con transparencia) tiñe; con el relleno profundo teñiría de más. */
      if(a < 0.6 && L >= 0.2){ l = 0.36; s = 0.6; }
    }else if(uso === 'borde'){
      if(L < 0.25){ l = 0.82; s = 0.35; }
      else { l = 0.36; s = 0.55; }
    }else{
      if(L < 0.25){ l = 0.97; s = 0.6; }                                      // texto sobre relleno verde
      else { l = 0.27; s = 0.72; }
    }
    return escribirColor(deHsl(h, s, l), a);
  }

  /* Otros tonos: ámbar, rojo, rosa, violeta, azul. */
  s = Math.min(s, 0.88);
  if(uso === 'fondo'){
    if(L < 0.25){ l = 0.945; s = Math.min(s, 0.7); }
    else if(L <= 0.72){ l = Math.min(L, 0.5); if(a < 0.6) l = Math.min(L, 0.45); }
    else l = L;
  }else if(uso === 'borde'){
    if(L < 0.25){ l = 0.85; s = Math.min(s, 0.6); }
    else if(L > 0.5) l = lim(1 - L + 0.1, 0.38, 0.6);
  }else{
    if(L < 0.3) l = 0.97;
    else l = lim(1 - L, 0.28, 0.44);
    /* El ámbar y el amarillo, sobre blanco, solo se leen bastante más oscuros (y vivos, para no quedar pardos). */
    if(h >= 30 && h <= 68){ l = Math.min(l, 0.30); s = Math.max(s, 0.88); }
  }
  return escribirColor(deHsl(h, s, l), a);
}

/**
 * La versión oscura del diseño: las claridades de siempre, con otro tinte. Los
 * neutros (negros y grises) se tiñen de verde petróleo; el verde de la marca
 * pasa a menta; lo demás se queda como estaba.
 */
function convertirOscuro(col, uso){
  const c = aHsl(col.r, col.g, col.b), fam = familia(c), L = c.l, a = col.a;
  if(fam === 'neutro'){
    if(L > 0.975 || (L < 0.035 && uso === 'sombra')) return escribirColor([col.r, col.g, col.b], a);
    /* Los fondos y las líneas, más teñidos cuanto más oscuros; el texto, apenas. */
    const s = L < 0.3 ? 0.32 : L < 0.6 ? 0.16 : 0.22;
    return escribirColor(deHsl(TONO, s, L), a);
  }
  if(fam === 'verde'){
    /* #22C55E → un esmeralda vivo; #4ADE80 → menta. */
    return escribirColor(deHsl(162, lim(c.s * 0.92, 0.5, 0.75), L < 0.2 ? L : lim(L + 0.06, 0.2, 0.8)), a);
  }
  return escribirColor([col.r, col.g, col.b], a);
}

/** ¿Un fondo que es un RELLENO (un botón de color, o claro)? Su texto va en blanco. */
function esRelleno(col){
  if(!col || col.a < 0.6) return false;
  const c = aHsl(col.r, col.g, col.b), fam = familia(c);
  return fam === 'neutro' ? c.l > 0.6 : (c.l >= 0.2 && c.l <= 0.72);
}

/* ── El CSS ──────────────────────────────────────────────────────────────── */

const RE_COLOR = /#[0-9a-fA-F]{3,8}\b|rgba?\([^()]*\)|\b(?:white|black)\b/g;
const USO = (prop) => {
  const p = prop.toLowerCase();
  if(/^(box-shadow|text-shadow|filter|backdrop-filter)$/.test(p) || /shadow/.test(p)) return 'sombra';
  if(/^(color|fill|stroke|caret-color|-webkit-text-fill-color|-webkit-text-stroke(-color)?|text-decoration(-color)?|text-emphasis-color)$/.test(p)) return 'texto';
  if(/^background/.test(p) || p === 'accent-color' || p === 'scrollbar-color') return 'fondo';
  if(/^(border|outline|column-rule)/.test(p)) return 'borde';
  if(/^--/.test(p)){
    if(/bg|panel|inset|card|surface|fondo/.test(p)) return 'fondo';
    if(/line|hair|border|borde/.test(p)) return 'borde';
    if(/ink|text|fg|tinta/.test(p)) return 'texto';
    if(/glow|shadow/.test(p)) return 'sombra';
    return 'otro';
  }
  return 'otro';
};

/** Convierte los colores de un valor. Null si no lleva ninguno (o lleva una imagen: esa no se repite). */
function convertirValor(prop, valor, blancoForzado, modo){
  if(/url\(/i.test(valor)) return null;
  let hubo = false;
  const uso = USO(prop);
  const nuevo = valor.replace(RE_COLOR, (t) => {
    const c = leerColor(t);
    if(!c) return t;
    hubo = true;
    if(blancoForzado) return '#ffffff';
    return convertir(c, uso, modo);
  });
  return hubo ? nuevo : null;
}

/** Parte un bloque de declaraciones («a:b; c:d») respetando paréntesis y comillas. */
function declaraciones(cuerpo){
  const out = [];
  let d = 0, cur = '', q = null;
  for(let i = 0; i < cuerpo.length; i++){
    const ch = cuerpo[i];
    if(q){ cur += ch; if(ch === q && cuerpo[i - 1] !== '\\') q = null; continue; }
    if(ch === '"' || ch === "'"){ q = ch; cur += ch; continue; }
    if(ch === '/' && cuerpo[i + 1] === '*'){ const f = cuerpo.indexOf('*/', i + 2); i = f < 0 ? cuerpo.length : f + 1; continue; }
    if(ch === '(') d++; else if(ch === ')') d--;
    if(ch === ';' && d === 0){ out.push(cur); cur = ''; } else cur += ch;
  }
  if(cur.trim()) out.push(cur);
  return out.map(x => { const k = x.indexOf(':'); return k < 0 ? null : { prop: x.slice(0, k).trim(), valor: x.slice(k + 1).trim() }; }).filter(x => x && x.prop);
}

/** El primer color de un valor de fondo (sólido, o el primero de un degradado). */
function primerColor(valor){
  const m = valor.match(RE_COLOR);
  return m ? leerColor(m[0]) : null;
}

/** Las declaraciones de color de una regla, convertidas. */
function reglaConvertida(cuerpo, modo){
  const ds = declaraciones(cuerpo);
  /* ¿La regla pinta un relleno? Entonces su texto, en blanco. */
  let relleno = false;
  if(modo !== 'oscuro') for(const d of ds) if(/^background(-color|-image)?$/i.test(d.prop) && !/url\(/i.test(d.valor) && esRelleno(primerColor(d.valor))) relleno = true;
  const out = [];
  for(const d of ds){
    const imp = /!important\s*$/.test(d.valor);
    const v = d.valor.replace(/\s*!important\s*$/, '');
    const blanco = relleno && /^(color|-webkit-text-fill-color)$/i.test(d.prop);
    const n = convertirValor(d.prop, v, blanco, modo);
    if(n != null && n === v) continue;                              // igual que estaba: no hace falta repetirlo
    if(n != null) out.push(d.prop + ':' + n + (imp ? ' !important' : ''));
  }
  return out;
}

/** «a, b» con un prefijo delante de cada selector («P a, P b»); en html y :root, el prefijo los sustituye. */
function conPrefijo(sel, prefijo){
  const partes = [];
  let d = 0, cur = '';
  for(const ch of sel){
    if(ch === '(' || ch === '[') d++; else if(ch === ')' || ch === ']') d--;
    if(ch === ',' && d === 0){ partes.push(cur); cur = ''; } else cur += ch;
  }
  partes.push(cur);
  return partes.map(x => {
    x = x.replace(/\s+/g, ' ').trim();
    if(/^(html|:root)(?![\w-])/.test(x)) return prefijo + x.replace(/^(html|:root)/, '');
    return prefijo + ' ' + x;
  }).join(',');
}

/**
 * Recorre un CSS y devuelve su capa de colores. `op.oscuroSi`: una expresión; las reglas cuyo selector la
 * cumple se convierten SIEMPRE con el modo oscuro (el Video Estudio, que es un panel oscuro en los dos temas).
 */
function capa(css, modo, op){
  op = op || {};
  let out = '';
  let i = 0;
  const n = css.length;
  while(i < n){
    /* saltar blancos y comentarios */
    if(/\s/.test(css[i])){ i++; continue; }
    if(css.startsWith('/*', i)){ const f = css.indexOf('*/', i + 2); i = f < 0 ? n : f + 2; continue; }
    const j = css.indexOf('{', i);
    if(j < 0) break;
    const pto = css.indexOf(';', i);
    if(pto >= 0 && pto < j){ i = pto + 1; continue; }             // @import, @charset…
    const sel = css.slice(i, j).replace(/\/\*[\s\S]*?\*\//g, '').trim();
    /* el cierre de este bloque */
    let d = 0, k = j;
    for(; k < n; k++){
      if(css.startsWith('/*', k)){ const f = css.indexOf('*/', k + 2); k = f < 0 ? n : f + 1; continue; }
      if(css[k] === '"' || css[k] === "'"){ const q = css[k]; k++; while(k < n && css[k] !== q){ if(css[k] === '\\') k++; k++; } continue; }
      if(css[k] === '{') d++;
      else if(css[k] === '}'){ d--; if(d === 0) break; }
    }
    const cuerpo = css.slice(j + 1, k);
    i = k + 1;
    if(/^@(media|supports|layer|container)\b/i.test(sel)){
      const dentro = capa(cuerpo, modo, op);
      if(dentro) out += sel + '{\n' + dentro + '}\n';
    }else if(/^@(-webkit-)?keyframes\b/i.test(sel)){
      const dentro = capa(cuerpo, modo, op);
      if(dentro) out += sel + '{\n' + dentro + '}\n';
    }else if(/^@/.test(sel)){
      /* @font-face, @page…: sin colores que convertir */
    }else{
      const ds = reglaConvertida(cuerpo, (op.oscuroSi && op.oscuroSi.test(sel)) ? 'oscuro' : modo);
      if(ds.length) out += (op.prefijo ? conPrefijo(sel, op.prefijo) : sel.replace(/\s+/g, ' ')) + '{' + ds.join(';') + '}\n';
    }
  }
  return out;
}


return { convertir: convertir, convertirOscuro: convertirOscuro, leerColor: leerColor, capa: capa, conPrefijo: conPrefijo, familia: familia, aHsl: aHsl, esRelleno: esRelleno, convertirValor: convertirValor, declaraciones: declaraciones };
})();

/** La capa de colores de un CSS: sus reglas, solo con los colores, convertidos a `modo` ('claro' u 'oscuro'). */
function temaCapa(css, modo, opciones){ return TEMA.capa(css, modo, opciones); }

/**
 * Para un CSS que el código inyecta en la ventana principal: sus dos capas, cada una atada a su tema
 * (html[data-tema="claro"] …, html[data-tema="oscuro"] …), para que cambie con el botón sin recargar.
 */
function temaDosCapas(css){
  return TEMA.capa(css, 'claro', { prefijo: 'html[data-tema="claro"]' }) + TEMA.capa(css, 'oscuro', { prefijo: 'html[data-tema="oscuro"]' });
}

/* El libreto es otro documento (un marco o una ventana) con su propio CSS y su propio botón claro/oscuro.
   Lleva la misma paleta: sus colores pasados al verde petróleo y la menta (con las claridades que tenía, así
   vale para sus dos modos), y la barra de arriba en verde petróleo, como la de la aplicación. */
const TEMA_LIBRETO_MANO = [
  /* La barra: verde petróleo; lo que lleva dentro, vidrio claro sobre oscuro. */
  'html body .lh{ background:linear-gradient(180deg,#143c36,#0c2b27) !important; box-shadow:0 10px 28px rgba(4,20,17,.28) !important; }',
  'html body .lh .lbk, html body .lh .goto, html body .lh .conn, html body .lh #lScope, html body .lh #lVid,',
  'html body .lh > button:not(.lbk):not(#lVid):not(#lScope):not(#lFree){ background:rgba(255,255,255,.10) !important; color:#eafaf5 !important; }',
  'html body .lh .goto span, html body .lh .goto input, html body .lh .conn, html body .lh .conn *, html body .lh #lVid *{ color:#eafaf5 !important; }',
  'html body .lh .lbk:hover, html body .lh #lScope:hover, html body .lh #lVid:hover,',
  'html body .lh > button:not(.lbk):not(#lVid):not(#lScope):not(#lFree):hover{ background:rgba(143,230,205,.26) !important; }',
  'html body .lh #lCharSel{ background:rgba(0,0,0,.30) !important; color:#8fe6cd !important; }',
  'html body .lh > button.on:not(#lSeguir){ background:#8fe6cd !important; color:#06231e !important; box-shadow:0 0 0 3px rgba(143,230,205,.18), 0 0 16px rgba(143,230,205,.5) !important; }',
  'html body .lh #lSeguir{ background:rgba(255,255,255,.10) !important; color:#eafaf5 !important; }',
  'html body .lh #lSeguir.on{ background:#8fe6cd !important; color:#06231e !important; }',
  'html body .lh #lSeguir *{ color:inherit !important; }',
  'html body .lh svg{ stroke:currentColor; }',
  'html body .lh #lConn{ background:rgba(255,255,255,.10) !important; color:#eafaf5 !important; border-color:transparent !important; }',
  'html body .lh #lConn *{ color:inherit !important; }',
  'html body.light .pgsep span{ background:#e3eeeb !important; color:#4b635e !important; border-color:rgba(18,48,43,.10) !important; }',
  'html body.light .pgsep::before, html body.light .pgsep::after{ background:rgba(18,48,43,.10) !important; }',
  /* En su modo claro: el pie y los separadores de página, claros también. */
  'html body.light .lbar{ background:rgba(255,255,255,.92) !important; border-top:1px solid rgba(18,48,43,.10) !important; }',
  'html body.light .lbar span{ color:#5e736f !important; }',
  'html body.light .lbar button:not(.act){ color:#12302b !important; border-color:rgba(18,48,43,.16) !important; background:transparent !important; }',
  'html body .lbar button.act{ background:#0c2b27 !important; border-color:#0c2b27 !important; color:#ffffff !important; }',
  'html body.dark .lbar button.act{ background:#8fe6cd !important; border-color:#8fe6cd !important; color:#06231e !important; }',
  'html body.light{ background:#f1f6f5 !important; }'
].join('\n');
let _temaLibretoMemo = null;
/** El CSS de tema del libreto, para añadir detrás del suyo. Se calcula una vez. */
function temaLibretoCss(css){
  const k = String(css).length;
  if(!_temaLibretoMemo || _temaLibretoMemo.k !== k) _temaLibretoMemo = { k: k, css: TEMA.capa(css, 'oscuro') + '\n' + TEMA_LIBRETO_MANO };
  return _temaLibretoMemo.css;
}

if(typeof module !== 'undefined' && module.exports){ module.exports = TEMA; Object.assign(module.exports, { temaCapa: temaCapa, temaDosCapas: temaDosCapas, temaLibretoCss: temaLibretoCss, TEMA_LIBRETO_MANO: TEMA_LIBRETO_MANO }); }
