/* Los datos de Casting, antes de DublajeCast · especificacion 09, PRO-9, PRO-10 y PRO-49
 *
 * Pedido de sala: «desvincula DublajeCast de Dubbipt, pero mantén todos los
 * datos que hay». DublajeCast ya no se abre dentro de Dubbipt ni se escribe
 * en su nube: los datos de Casting (programas, capítulos, personajes,
 * talentos, castings, tráilers, producción) son de Dubbipt y viven en
 * Producción (js/produccion.js), en la nube de Dubbipt. Lo que queda aquí
 * es cómo se casan esos datos con la biblioteca de Dubbipt: el programa y el
 * capítulo que corresponden, y las filas del casting de un capítulo. La
 * copia de DublajeCast (dublajecast/) sigue publicada, pero suelta.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: PROD, prodCasarPrograma, prodIndices, castNorm, castAviso.
 */

/* ═══ DUBLAJECAST ENTERO ═══════════════════════════════════════════════════ */

const DCAST = { ov: null, marco: null };

/**
 * El capítulo de Dubbipt que corresponde a uno de DublajeCast: primero por
 * título igual; si no, por número, cuando solo un capítulo lleva ese número en
 * el nombre («Episodio 2», «E02», «2 - La boda»). Si hay duda, ninguno.
 */
function dcastCasarCapitulo(numero, titulo, eps){
  const lista = eps || [];
  const t = castNorm(titulo);
  if(t){
    const igual = lista.filter(e => castNorm(e.name) === t);
    if(igual.length === 1) return igual[0];
  }
  const n = parseInt(numero, 10);              // si no es número da NaN, que no casa con nada
  const conNumero = lista.filter(e => (String(e.name || '').match(/\d+/g) || []).some(x => parseInt(x, 10) === n));
  return conNumero.length === 1 ? conNumero[0] : null;
}

/** DublajeCast ya no se abre dentro de Dubbipt (PRO-49): se dice, y nada más. */
function dcastAbrir(){
  castAviso('DublajeCast ya no está enlazado con Dubbipt: todo el casting se hace aquí, con los datos de Dubbipt');
  return false;
}

/* ── La interfaz compartida: Programas y capítulos con los datos de Casting ── */

/** Los datos de Casting: los de Producción, de la nube de Dubbipt. (`vivo` queda por compatibilidad: ya nunca.) */
function dcastDatos(){
  return { datos: PROD.datos, vivo: false };
}

const DCAST_SERIES = (typeof WeakMap === 'function') ? new WeakMap() : null;
function dcastSerieDe(show, d){
  if(!show || !d) return null;
  /* Casar por nombre (parecidos incluidos) cuesta; se recuerda por juego de datos y programa. */
  let m = DCAST_SERIES && DCAST_SERIES.get(d);
  if(DCAST_SERIES && !m){ m = new Map(); DCAST_SERIES.set(d, m); }
  const k = String(show.id) + '|' + String(show.name || '');
  if(m && m.has(k)) return m.get(k);
  const r = d.series.find(s => prodCasarPrograma(s.name, [show]) === show) || null;
  if(m) m.set(k, r);
  return r;
}

/**
 * El capítulo de DublajeCast que corresponde a uno de Dubbipt, por su nombre:
 * título igual o, si no, el número que lleve el nombre, cuando solo uno casa.
 */
function dcastEpDeDc(nombre, dcEps, programa){
  const lista = dcEps || [];
  const t = castNorm(nombre);
  if(t){
    const igual = lista.filter(e => castNorm(e.title) === t);
    if(igual.length === 1) return igual[0];
  }
  /* Los números del nombre del programa no son el del capítulo: en «100 Days
     of Deception 3» el capítulo es el 3, no el 100 (pedido de sala: «en 100
     Days of Deception no me deja entrar a hacer el casting»). */
  const nums = dcastNumerosDe(nombre, programa);
  const c = lista.filter(e => nums.indexOf(parseInt(e.episode_number, 10)) >= 0);
  return c.length === 1 ? c[0] : null;
}

/**
 * Las filas del casting de un capítulo: los personajes que salen en él en
 * DublajeCast (`dcEp`), con sus líneas y su talento, y lo que el registro de
 * Dubbipt dice para el capítulo que se llama `nombreEp`. Por líneas.
 */
function dcastFilasCasting(d, dcEp, registro, nombreEp){
  const filas = {};
  const fila = (nombre) => { const k = castNorm(nombre); return (filas[k] = filas[k] || { personaje: nombre, lineas: 0, dc: '', dubbipt: '', principal: false }); };
  if(d && dcEp){
    const ix = prodIndices(d);
    for(const a of (ix.aparicionesPorEp[String(dcEp.id)] || [])){
      const ch = ix.char[String(a.character_id)]; if(!ch || !ch.name) continue;
      const f = fila(ch.name); f.lineas = +a.line_count || 0; f.principal = ch.tipo === 'principal'; f.charId = ch.id;
    }
    for(const c of (ix.castingsPorEp[String(dcEp.id)] || [])){
      const ch = ix.char[String(c.character_id)], tal = ix.talent[String(c.talent_id)];
      if(!ch || !ch.name) continue;
      const f = fila(ch.name); f.dc = tal ? tal.name : ''; f.charId = ch.id;
    }
  }
  const nEp = castNorm(nombreEp);
  /* La foto del capítulo casteado en Dubbipt: TODOS sus personajes, con sus
     líneas y su talento (o sin él). En uno que no está en DublajeCast es
     todo su casting. */
  const caps = (nEp && registro && registro.capitulos) || {};
  for(const nombre of Object.keys(caps)){
    if(castNorm(nombre) !== nEp) continue;
    const fp = (caps[nombre] && caps[nombre].personajes) || {};
    for(const k in fp){
      const x = fp[k];
      if(!x) continue;
      const f = fila(x.display || k);
      if(!f.lineas) f.lineas = +x.lineas || 0;
      if(x.talent) f.dubbipt = x.talent;
    }
  }
  const pers = (nEp && registro && registro.personajes) || {};
  for(const k in pers){
    const p = pers[k];
    if(!p || !(p.episodios || []).some(n => castNorm(n) === nEp)) continue;
    const f = fila(p.display || k);
    if(!f.dubbipt) f.dubbipt = p.talent || '';
  }
  return Object.keys(filas).map(k => {
    const f = filas[k];
    return Object.assign(f, { talento: f.dubbipt || f.dc, choca: !!(f.dubbipt && f.dc && castNorm(f.dubbipt) !== castNorm(f.dc)) });
  }).sort((a, b) => (b.lineas - a.lineas) || a.personaje.localeCompare(b.personaje, 'es'));
}

/**
 * Los números del nombre de un capítulo que pueden ser el suyo: todos, menos
 * los que vienen del nombre del programa (cada uno, una vez). Si no queda
 * ninguno, todos: «Episodio 100» de «100 Days of Deception» es el 100.
 */
function dcastNumerosDe(nombre, programa){
  const todos = (String(nombre == null ? '' : nombre).match(/\d+/g) || []).map(x => parseInt(x, 10));
  const delProg = (String(programa == null ? '' : programa).match(/\d+/g) || []).map(x => parseInt(x, 10));
  if(!delProg.length) return todos;
  const quedan = todos.slice();
  for(const n of delProg){ const i = quedan.indexOf(n); if(i >= 0) quedan.splice(i, 1); }
  return quedan.length ? quedan : todos;
}

function dcastCerrar(){ /* ya no hay marco que cerrar (PRO-49) */ }

/* ═══ FIN DE DUBLAJECAST ENTERO ═══ */
