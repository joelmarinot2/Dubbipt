/* Los choques de reparto: un talento con dos personajes que salen cerca · especificacion 02, CAST-49
 *
 * Pedido de sala: «mejora la parte de los choques de personajes en Casting.
 * Ten en cuenta el contexto de la escena y las páginas, pero guíate más por el
 * timecode: si sale 5 minutos antes o después, se choca».
 * Y después (CAST-52): «reduce el tiempo de 5 a 4 minutos. Y analiza la
 * escena: si la escena ya se acabó, el tiempo mínimo es de 1 minuto».
 *
 * Antes un choque era solo «el mismo actor con dos personajes que hablan a
 * menos de 4 líneas». Se quedaba corto: dos personajes del mismo actor que
 * salen a un minuto, con otros hablando en medio, no avisaban, y en sala el
 * actor tenía que hacer las dos voces en el mismo rato.
 *
 * La regla, por orden de lo que manda:
 *   0. LA ESCENA YA SE ACABÓ (entre los dos hay un encabezado de escena: INT.,
 *      EXT., ESC., ESCENA…): el margen baja a 1 MINUTO. Con timecode, choque
 *      solo si salen a 1 minuto o menos; sin timecode, solo si hablan
 *      seguidos. Lo demás no cuenta: la escena terminó y hay tiempo de
 *      cambiar de voz.
 *   1. HABLAN SEGUIDOS (a 4 líneas o menos), en la misma escena: choque
 *      siempre. No le da tiempo a cambiar de voz, diga lo que diga el
 *      timecode (que puede traer una errata).
 *   2. EL TIMECODE, si los dos lo tienen: choque si salen a 4 minutos o menos,
 *      antes o después. Si están a más, NO es choque aunque compartan página.
 *   3. SIN TIMECODE (el libreto no lo trae, o todavía no ha salido ninguno):
 *      choque si salen en la misma escena o en la misma página o la de al
 *      lado.
 * Las escenas solo se saben si el libreto trae sus encabezados; si no, se
 * aplican 1, 2 y 3 como si todo fuera una escena.
 * De cada pareja se da el cruce MÁS CERCANO, con su timecode, sus páginas y si
 * es la misma escena, y cuántas veces se cruzan (las que tendría que cambiar
 * de voz). Un aviso por pareja, no por línea.
 *
 * El tiempo de una intervención es su timecode o, si no trae, el de la
 * anterior (el libreto no pone uno en cada línea). Antes del primer timecode
 * no hay tiempo: no se inventa un cero, que haría chocar a todo el mundo.
 *
 * Aquí no se pinta nada ni se lee nada de la aplicación: entran los datos del
 * libreto y sale la lista. Es un script clásico: comparte el ámbito global.
 */

const CHQ_SEG = 240;        // 4 minutos, antes o después (CAST-52; antes eran 5)
const CHQ_SEG_ESCENA = 60;  // si la escena ya se acabó entre los dos: 1 minuto (CAST-52)
const CHQ_LINEAS = 4;       // a esta distancia o menos, hablan seguidos
const CHQ_PAGINAS = 1;      // sin timecode: la misma página o la de al lado

/* Un encabezado de escena: en mayúsculas y al principio del renglón. En minúsculas no («Escena difícil» es diálogo). */
const CHQ_ESCENA_RE = /^\s*(?:\d+[\s.\-]*)?(?:INT\.?\s*\/\s*EXT|INT|EXT|EST|ESC|ESCENA|SCENE|SEQ|SEQUENCE|SECUENCIA)\b(?:$|[.:\s\d\-–—])/;

/** El tiempo (en segundos) de cada intervención: el suyo o el de la anterior; null antes del primer timecode. */
function chqTiempos(script){
  const out = [];
  let ultimo = null;
  for(const b of (script || [])){
    if(b && b.tcSec != null && isFinite(+b.tcSec)) ultimo = +b.tcSec;
    out.push(ultimo);
  }
  return out;
}

/**
 * La escena de cada intervención (0, 1, 2…), o null si el libreto no trae encabezados de escena (menos de dos).
 * El encabezado suele quedar pegado al final de lo que dice el personaje anterior: la escena nueva empieza en la
 * intervención siguiente. Si es lo primero de un bloque, empieza en ese bloque.
 */
function chqEscenas(script){
  const out = [];
  let n = 0, vistos = 0;
  for(const b of (script || [])){
    const lineas = (b && Array.isArray(b.lines)) ? b.lines : [];
    let despues = false;
    for(let j = 0; j < lineas.length; j++){
      if(!CHQ_ESCENA_RE.test(String(lineas[j] || ''))) continue;
      vistos++;
      if(j === 0) n++; else despues = true;
    }
    out.push(n);
    if(despues) n++;
  }
  return vistos >= 2 ? out : null;
}

/** Lo que hace falta del libreto para buscar choques. Se calcula una vez por pasada. */
function chqContexto(script, porClave){
  return { script: script || [], porClave: porClave || {}, tiempos: chqTiempos(script), escenas: chqEscenas(script) };
}

/** Dos intervenciones (posiciones i < j del libreto): ¿chocan?, y por qué. */
function chqCruce(i, j, ctx){
  const s = ctx.script, a = s[i] || {}, b = s[j] || {};
  const ta = ctx.tiempos[i], tb = ctx.tiempos[j];
  const c = {
    i: i, j: j, dist: j - i,
    seg: (ta != null && tb != null) ? Math.abs(tb - ta) : null,
    tcA: ta != null ? ta : null, tcB: tb != null ? tb : null,
    pagA: a.page != null ? a.page : null, pagB: b.page != null ? b.page : null,
    escena: ctx.escenas ? ctx.escenas[i] === ctx.escenas[j] : null,
    por: null
  };
  if(c.escena === false){
    /* La escena ya se acabó: 1 minuto. Sin timecode, solo si hablan seguidos. */
    if(c.seg != null){ if(c.seg <= CHQ_SEG_ESCENA) c.por = c.dist <= CHQ_LINEAS ? 'seguido' : 'tc'; }
    else if(c.dist <= CHQ_LINEAS) c.por = 'seguido';
  }
  else if(c.dist <= CHQ_LINEAS) c.por = 'seguido';
  else if(c.seg != null){ if(c.seg <= CHQ_SEG) c.por = 'tc'; }      // con timecode, manda el timecode
  else if(c.escena === true) c.por = 'escena';
  else if(c.pagA != null && c.pagB != null && Math.abs(c.pagB - c.pagA) <= CHQ_PAGINAS) c.por = 'pagina';
  return c;
}

const CHQ_ORDEN = { seguido: 0, tc: 1, escena: 2, pagina: 3 };
/** ¿x es peor (más cerca) que y? */
function chqPeor(x, y){
  if(CHQ_ORDEN[x.por] !== CHQ_ORDEN[y.por]) return CHQ_ORDEN[x.por] < CHQ_ORDEN[y.por];
  const mx = (x.por === 'tc') ? x.seg : x.dist, my = (y.por === 'tc') ? y.seg : y.dist;
  return mx !== my ? mx < my : x.dist < y.dist;
}

/**
 * Los choques de UN talento. `personajes`: [{ key, display }] (los que hace). Devuelve, por pareja que choca,
 * { a, b, aKey, bKey, por, dist, seg, tcA, tcB, pagA, pagB, pagina, escena, veces }, lo peor primero.
 * `a` es quien habla antes en el cruce más cercano.
 */
function chqDeTalento(personajes, ctx){
  const ps = (personajes || []).map(p => ({ key: p.key, display: p.display, idxs: ((ctx.porClave[p.key]) || []).slice().sort((x, y) => x - y) }))
    .filter(p => p.idxs.length);
  const out = [];
  for(let x = 0; x < ps.length; x++){
    for(let y = x + 1; y < ps.length; y++){
      const A = ps[x], B = ps[y];
      /* Las intervenciones de los dos, en el orden del libreto: cada cambio de uno a otro es un cruce. */
      const pts = [];
      for(const i of A.idxs) pts.push({ i: i, p: A });
      for(const i of B.idxs) pts.push({ i: i, p: B });
      pts.sort((m, n) => m.i - n.i);
      let mejor = null, veces = 0;
      for(let n = 1; n < pts.length; n++){
        const u = pts[n - 1], v = pts[n];
        if(u.p === v.p || u.i === v.i) continue;
        const c = chqCruce(u.i, v.i, ctx);
        if(!c.por) continue;
        veces++;
        if(!mejor || chqPeor(c, mejor)){ c.de = u.p; c.a_ = v.p; mejor = c; }
      }
      if(!mejor) continue;
      out.push({ a: mejor.de.display, b: mejor.a_.display, aKey: mejor.de.key, bKey: mejor.a_.key,
                 por: mejor.por, dist: mejor.dist, seg: mejor.seg, tcA: mejor.tcA, tcB: mejor.tcB,
                 pagA: mejor.pagA, pagB: mejor.pagB, pagina: mejor.pagB, escena: mejor.escena, veces: veces });
    }
  }
  return out.sort((m, n) => chqPeor(m, n) ? -1 : (chqPeor(n, m) ? 1 : 0));
}

/** «01:02:10» */
function chqHora(seg){
  const s = Math.max(0, Math.floor(+seg || 0)), dos = (n) => String(n).padStart(2, '0');
  return dos(Math.floor(s / 3600)) + ':' + dos(Math.floor(s / 60) % 60) + ':' + dos(s % 60);
}
/** «35 s», «2 min 10 s», «5 min» */
function chqDura(seg){
  const s = Math.max(0, Math.round(+seg || 0)), m = Math.floor(s / 60), r = s % 60;
  return m ? (m + ' min' + (r ? ' ' + r + ' s' : '')) : (s + ' s');
}

/** Dónde es el cruce: timecodes, páginas y si es la misma escena. '' si no se sabe nada. */
function chqDonde(ch){
  const trozos = [];
  if(ch.tcA != null && ch.tcB != null) trozos.push(chqHora(ch.tcA) === chqHora(ch.tcB) ? 'TC ' + chqHora(ch.tcA) : 'TC ' + chqHora(ch.tcA) + ' y ' + chqHora(ch.tcB));
  if(ch.pagA != null && ch.pagB != null) trozos.push(ch.pagA === ch.pagB ? 'pág. ' + ch.pagA : 'págs. ' + ch.pagA + ' y ' + ch.pagB);
  else if(ch.pagina != null) trozos.push('pág. ' + ch.pagina);
  if(ch.escena === true && ch.por !== 'escena') trozos.push('misma escena');
  if(ch.escena === false) trozos.push('cambia de escena');
  return trozos.join(' · ');
}

/** Un choque, dicho en una frase (texto sin HTML: quien lo pinta lo escapa). */
function chqTexto(ch){
  if(!ch) return '';
  const quien = '«' + ch.a + '» y «' + ch.b + '»', donde = chqDonde(ch);
  let t;
  if(ch.por === 'tc') t = quien + (Math.round(ch.seg) === 0 ? ' salen en el mismo timecode' : ' salen a ' + chqDura(ch.seg));
  else if(ch.por === 'escena') t = quien + ' salen en la misma escena, sin timecode';
  else if(ch.por === 'pagina') t = quien + (ch.pagA === ch.pagB ? ' salen en la misma página' : ' salen en páginas seguidas') + ', sin timecode';
  else t = quien + ' hablan seguidos (a ' + ch.dist + ' línea' + (ch.dist === 1 ? '' : 's') + ')';
  if(donde) t += ' · ' + donde;
  if(ch.veces > 1) t += ' · se cruzan ' + ch.veces + ' veces';
  return t;
}
/** ¿Hablan seguidos? (lo más grave: no le da tiempo a cambiar de voz) */
function chqSeguido(ch){ return !!ch && (ch.por === 'seguido' || (ch.por == null && ch.dist != null && ch.dist <= CHQ_LINEAS)); }

if(typeof module !== 'undefined' && module.exports){
  module.exports = { CHQ_SEG, CHQ_SEG_ESCENA, CHQ_LINEAS, CHQ_PAGINAS, CHQ_ESCENA_RE, chqTiempos, chqEscenas, chqContexto, chqCruce, chqPeor, chqDeTalento,
                     chqHora, chqDura, chqDonde, chqTexto, chqSeguido };
}
