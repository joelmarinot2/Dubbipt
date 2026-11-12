/* Con cuántos talentos se puede hacer el capítulo · especificacion 02, CAST-50
 *
 * Pedido de sala: «quiero que me sugieras en cada episodio de casting con
 * cuántos talentos puedo rellenar todo el capítulo».
 *
 * Un talento puede hacer varios personajes mientras no choquen entre sí, y
 * qué es chocar ya lo dice js/castchoques.js (CAST-49: hablan seguidos, salen
 * a 5 minutos o menos por timecode, o sin timecode en la misma escena o
 * página). Así que la pregunta es: ¿en cuántos grupos, como poco, se pueden
 * repartir los personajes, de forma que dentro de cada grupo nadie choque con
 * nadie? Cada grupo es un talento.
 *
 * Es el problema de colorear un grafo (cada personaje, un punto; cada pareja
 * que chocaría, una raya; cada talento, un color). En general es difícil,
 * pero los capítulos tienen decenas de personajes, no miles:
 *   · se reparte primero con el método de siempre para esto (DSatur: el
 *     personaje con más compañeros ya repartidos va antes; a igualdad, el que
 *     más líneas tiene), que da un número que SE PUEDE;
 *   · se busca el grupo más grande de personajes que chocan TODOS entre sí:
 *     ninguno puede compartir talento con otro, así que hacen falta al menos
 *     tantos talentos como personajes tiene ese grupo. Es la explicación de
 *     por qué no se puede con menos;
 *   · si los dos números no coinciden, se prueba con uno menos, con un tope
 *     de trabajo para no congelar la pantalla. Si se acaba el tope, se dice
 *     «unos N» en vez de afirmar que es el mínimo.
 *
 * Y con lo que ya está repartido: los personajes sin talento ¿caben en los
 * talentos que ya tienes (sin choques), o hacen falta más? Se propone a quién
 * podría ir cada uno. Es una sugerencia: no se asigna nada solo.
 *
 * No sabe de géneros ni de tipos de voz (el desglose no los trae): cuenta
 * solo lo que choca en el tiempo. Es un script clásico: comparte el ámbito
 * global con index.html y usa chqContexto / chqCruce de js/castchoques.js.
 */

const CM_PRESUPUESTO = 60000;   // pasos de búsqueda, como mucho, para probar que se puede con menos

/** ¿Chocarían A y B si los hiciera el mismo talento? `ia`, `ib`: sus intervenciones, ordenadas. */
function cmChocan(ia, ib, ctx){
  let x = 0, y = 0, ultimo = null;          // ultimo: { i, de: 'a'|'b' }
  while(x < ia.length || y < ib.length){
    const tomaA = y >= ib.length || (x < ia.length && ia[x] < ib[y]);
    const i = tomaA ? ia[x++] : ib[y++], de = tomaA ? 'a' : 'b';
    if(ultimo && ultimo.de !== de && ultimo.i !== i && chqCruce(ultimo.i, i, ctx).por) return true;
    ultimo = { i: i, de: de };
  }
  return false;
}

/**
 * El grafo de los personajes. `personajes`: [{ key, display, ints }]. Devuelve { nodos, ady } con `ady[i]` el
 * conjunto (Set de índices) de los que chocan con el i.
 */
function cmGrafo(personajes, ctx){
  const nodos = (personajes || []).map(p => ({ key: p.key, display: p.display || p.key, ints: +p.ints || 0, talento: p.talento || '',
    idxs: ((ctx.porClave[p.key]) || []).slice().sort((a, b) => a - b) }));
  const ady = nodos.map(() => new Set());
  for(let a = 0; a < nodos.length; a++){
    if(!nodos[a].idxs.length) continue;
    for(let b = a + 1; b < nodos.length; b++){
      if(!nodos[b].idxs.length) continue;
      if(cmChocan(nodos[a].idxs, nodos[b].idxs, ctx)){ ady[a].add(b); ady[b].add(a); }
    }
  }
  return { nodos: nodos, ady: ady };
}

/**
 * Reparte con DSatur. `fijos`: Map(índice → color) de los que ya tienen talento (no se mueven). `elegir(i, libres)`:
 * qué color usar entre los que no chocan (por defecto, el más bajo). Devuelve el color de cada uno.
 */
function cmDsatur(g, fijos, elegir){
  const n = g.nodos.length, color = new Array(n).fill(-1), vec = g.ady.map(() => new Set());
  const poner = (i, c) => { color[i] = c; for(const j of g.ady[i]) vec[j].add(c); };
  if(fijos) for(const [i, c] of fijos) poner(i, c);
  let usados = 0;
  for(const c of color) if(c >= usados) usados = c + 1;
  for(let paso = 0; paso < n; paso++){
    let mejor = -1;
    for(let i = 0; i < n; i++){
      if(color[i] >= 0) continue;
      if(mejor < 0) { mejor = i; continue; }
      const s = vec[i].size - vec[mejor].size, d = g.ady[i].size - g.ady[mejor].size;
      if(s > 0 || (s === 0 && (d > 0 || (d === 0 && g.nodos[i].ints > g.nodos[mejor].ints)))) mejor = i;
    }
    if(mejor < 0) break;
    const libres = [];
    for(let c = 0; c < usados; c++) if(!vec[mejor].has(c)) libres.push(c);
    let c = libres.length ? (elegir ? elegir(mejor, libres, color) : libres[0]) : usados;
    if(c >= usados) usados = c + 1;
    poner(mejor, c);
  }
  return color;
}

/** El grupo más grande que se encuentra de personajes que chocan TODOS entre sí (cota por abajo). */
function cmCliqueGrande(g){
  const n = g.nodos.length;
  let mejor = [];
  const orden = [...Array(n).keys()].sort((a, b) => g.ady[b].size - g.ady[a].size || g.nodos[b].ints - g.nodos[a].ints);
  for(const ini of orden){
    if(g.ady[ini].size + 1 <= mejor.length) continue;
    const grupo = [ini];
    let cand = [...g.ady[ini]].sort((a, b) => g.ady[b].size - g.ady[a].size);
    while(cand.length){
      const v = cand.shift();
      grupo.push(v);
      cand = cand.filter(w => g.ady[v].has(w));
    }
    if(grupo.length > mejor.length) mejor = grupo;
  }
  return mejor;
}

/**
 * ¿Se puede con k talentos? Búsqueda con vuelta atrás (DSatur), con tope de pasos.
 * Devuelve { colores } si se puede, { no: true } si está probado que no, o { sinSaber: true } si se acabó el tope.
 */
function cmCon(g, k, presupuesto){
  const n = g.nodos.length, color = new Array(n).fill(-1);
  const cuenta = g.ady.map(() => new Map());       // para cada uno: color de vecino → cuántos
  let pasos = 0, agotado = false;
  const satur = (i) => cuenta[i].size;
  const poner = (i, c) => { color[i] = c; for(const j of g.ady[i]) cuenta[j].set(c, (cuenta[j].get(c) || 0) + 1); };
  const quitar = (i) => { const c = color[i]; color[i] = -1; for(const j of g.ady[i]){ const v = cuenta[j].get(c) - 1; if(v) cuenta[j].set(c, v); else cuenta[j].delete(c); } };
  const buscar = (hechos, usados) => {
    if(hechos === n) return true;
    if(++pasos > presupuesto){ agotado = true; return false; }
    let v = -1;
    for(let i = 0; i < n; i++){
      if(color[i] >= 0) continue;
      if(v < 0 || satur(i) > satur(v) || (satur(i) === satur(v) && g.ady[i].size > g.ady[v].size)) v = i;
    }
    const tope = Math.min(k, usados + 1);           // un color nuevo vale lo mismo que cualquier otro nuevo
    for(let c = 0; c < tope; c++){
      if(cuenta[v].has(c)) continue;
      poner(v, c);
      if(buscar(hechos + 1, Math.max(usados, c + 1))) return true;
      quitar(v);
      if(agotado) return false;
    }
    return false;
  };
  if(buscar(0, 0)) return { colores: color.slice() };
  return agotado ? { sinSaber: true } : { no: true };
}

/** Los grupos de un reparto (color por personaje): cada uno, sus personajes (los de más líneas primero); los grupos, los de más líneas primero. */
function cmGrupos(g, color){
  const por = new Map();
  color.forEach((c, i) => { if(c < 0) return; if(!por.has(c)) por.set(c, []); por.get(c).push(g.nodos[i]); });
  return [...por.entries()].map(([c, ps]) => ({ color: c, personajes: ps.sort((a, b) => b.ints - a.ints), ints: ps.reduce((s, p) => s + p.ints, 0) }))
    .sort((a, b) => b.ints - a.ints);
}

/**
 * La sugerencia para un capítulo. `personajes`: [{ key, display, ints, talento }] —solo los que necesitan un actor;
 * `talento` vacío si aún no lo tienen—. `norm`: cómo se comparan dos nombres de talento.
 * Devuelve {
 *   minimo, exacto (¿probado que es el mínimo?), cota (no se puede con menos de esto), juntos (los que chocan todos entre sí),
 *   grupos (un reparto con `minimo` talentos), personajes, conChoques (cuántos personajes tienen alguno con quien chocar),
 *   ahora (talentos distintos ya puestos), sinTalento,
 *   conLoRepartido: { nuevos (talentos que harían falta además de los que hay), propuestas: [{ key, display, ints, talento | nuevo }] }
 * }
 */
function cmSugerir(personajes, ctx, opts){
  const o = opts || {}, norm = o.norm || ((s) => String(s || '').trim().toUpperCase());
  const g = o.grafo || cmGrafo(personajes, ctx), n = g.nodos.length;
  const r = { personajes: n, minimo: 0, exacto: true, cota: 0, juntos: [], grupos: [], conChoques: g.ady.filter(s => s.size).length,
              ahora: 0, sinTalento: 0, conLoRepartido: { nuevos: 0, propuestas: [] } };
  if(!n) return r;

  /* 1 · desde cero: cuántos, como poco */
  let color = cmDsatur(g, null, null);
  let k = Math.max(...color) + 1;
  const clique = cmCliqueGrande(g);
  r.cota = Math.max(1, clique.length);
  r.juntos = clique.map(i => g.nodos[i].display);
  r.exacto = k === r.cota;
  while(k > r.cota){
    const t = cmCon(g, k - 1, o.presupuesto || CM_PRESUPUESTO);
    if(t.colores){ color = t.colores; k--; r.exacto = k === r.cota; continue; }
    r.exacto = !!t.no;
    break;
  }
  r.minimo = k;
  r.grupos = cmGrupos(g, color);

  /* 2 · con lo que ya está repartido: los que faltan, ¿caben en los talentos que hay? */
  const talentos = [], deTal = new Map(), fijos = new Map();
  g.nodos.forEach((p, i) => {
    const t = String(p.talento || '').trim();
    if(!t) { r.sinTalento++; return; }
    const kt = norm(t);
    if(!deTal.has(kt)){ deTal.set(kt, talentos.length); talentos.push({ nombre: t, ints: 0 }); }
    const c = deTal.get(kt);
    talentos[c].ints += p.ints;
    fijos.set(i, c);
  });
  r.ahora = talentos.length;
  if(r.sinTalento){
    const carga = talentos.map(t => t.ints);
    /* Entre los talentos que no chocan, el que menos líneas lleva (que no cargue todo uno); si no cabe en ninguno, uno nuevo. */
    const col = cmDsatur(g, fijos, (i, libres) => {
      const c = libres.slice().sort((a, b) => (carga[a] || 0) - (carga[b] || 0) || a - b)[0];
      carga[c] = (carga[c] || 0) + g.nodos[i].ints;
      return c;
    });
    const nuevos = new Map();
    g.nodos.forEach((p, i) => {
      if(fijos.has(i)) return;
      const c = col[i];
      if(c < talentos.length) r.conLoRepartido.propuestas.push({ key: p.key, display: p.display, ints: p.ints, talento: talentos[c].nombre });
      else {
        if(!nuevos.has(c)) nuevos.set(c, nuevos.size + 1);
        r.conLoRepartido.propuestas.push({ key: p.key, display: p.display, ints: p.ints, nuevo: nuevos.get(c) });
      }
    });
    r.conLoRepartido.nuevos = nuevos.size;
    r.conLoRepartido.propuestas.sort((a, b) => (a.nuevo || 0) - (b.nuevo || 0) || b.ints - a.ints);
  }
  return r;
}

/** La frase principal: «Con 7 talentos se puede hacer todo el capítulo sin choques». */
function cmFrase(r){
  if(!r || !r.personajes) return '';
  const t = (n) => n + ' talento' + (n === 1 ? '' : 's');
  return (r.exacto ? 'Con ' + t(r.minimo) : 'Con unos ' + t(r.minimo)) + ' se puede hacer todo el capítulo sin choques';
}
/** Por qué no se puede con menos (solo si está probado y el grupo que choca entero lo explica). */
function cmPorQue(r){
  if(!r || !r.exacto || r.juntos.length < 2 || r.juntos.length !== r.minimo) return '';
  const ns = r.juntos.slice(0, 6).map(x => '«' + x + '»').join(', ') + (r.juntos.length > 6 ? '…' : '');
  return 'No se puede con menos: ' + ns + ' chocan todos entre sí';
}
/** Lo de los que faltan por repartir. */
function cmFraseFaltan(r){
  if(!r || !r.sinTalento) return '';
  const p = r.sinTalento + ' personaje' + (r.sinTalento === 1 ? '' : 's') + ' sin talento';
  if(!r.ahora) return '';
  return r.conLoRepartido.nuevos
    ? 'Con lo ya repartido, ' + p + ': hacen falta ' + r.conLoRepartido.nuevos + ' talento' + (r.conLoRepartido.nuevos === 1 ? '' : 's') + ' más'
    : 'Con lo ya repartido, ' + p + ': caben en los talentos que ya tienes, sin choques';
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { CM_PRESUPUESTO, cmChocan, cmGrafo, cmDsatur, cmCliqueGrande, cmCon, cmGrupos, cmSugerir, cmFrase, cmPorQue, cmFraseFaltan };
}
