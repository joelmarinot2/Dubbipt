/* Con cuántos talentos se puede hacer el capítulo · especificacion 02, CAST-50
 *
 * Pedido de sala: «quiero que me sugieras en cada episodio de casting con
 * cuántos talentos puedo rellenar todo el capítulo».
 *
 * Un talento puede hacer varios personajes mientras no choquen entre sí, y
 * qué es chocar ya lo dice js/castchoques.js (CAST-49: hablan seguidos, salen
 * a 4 minutos o menos por timecode —1 si cambió la escena—, o sin timecode en la misma escena o
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
 * Y el género (CAST-51, js/castgenero.js): un personaje de hombre y uno de
 * mujer no van al mismo talento, y a un talento hombre no se le proponen
 * personajes de mujer (ni al revés). Si el género de alguno no se sabe, no
 * se filtra. El tipo de voz no lo sabe nadie: eso lo decide quien reparte.
 *
 * Y los talentos de RELLENO (CAST-51): los que ya tienen talento pero hacen
 * poco en el capítulo («Eduard Pineda solo tiene 2 líneas con un
 * personaje»): qué personajes sin talento podría hacer además, sin que se
 * crucen con lo suyo ni entre ellos, y de su género.
 *
 * Es un script clásico: comparte el ámbito global con index.html y usa
 * chqContexto / chqCruce de js/castchoques.js.
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

/**
 * El grafo con el género: dos personajes de género distinto (los dos sabidos) tampoco pueden ir al mismo talento.
 * `generos`: 'H', 'M' o '' por personaje, en el orden de g.nodos. No toca `g`; devuelve uno nuevo que comparte los nodos.
 */
function cmConGeneros(g, generos){
  if(!generos || !generos.some(Boolean)) return g;
  const ady = g.ady.map(s => new Set(s)), soloGenero = new Set();
  for(let a = 0; a < g.nodos.length; a++){
    for(let b = a + 1; b < g.nodos.length; b++){
      if(!generos[a] || !generos[b] || generos[a] === generos[b] || ady[a].has(b)) continue;
      ady[a].add(b); ady[b].add(a); soloGenero.add(a + '|' + b);
    }
  }
  return { nodos: g.nodos, ady: ady, soloGenero: soloGenero };
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
  const g0 = o.grafo || cmGrafo(personajes, ctx), n = g0.nodos.length;
  /* El género (CAST-51): `generos[i]` del personaje i; `generoTal(nombre)` del talento. */
  const generos = o.generos || null, generoTal = o.generoTal || (() => '');
  const g = cmConGeneros(g0, generos);
  const r = { personajes: n, minimo: 0, exacto: true, cota: 0, juntos: [], porGenero: false, grupos: [], conChoques: g0.ady.filter(s => s.size).length,
              ahora: 0, sinTalento: 0, conLoRepartido: { nuevos: 0, propuestas: [] } };
  if(!n) return r;

  /* 1 · desde cero: cuántos, como poco. Lo caro se guarda en `o.cache` (mientras no cambien el libreto ni los géneros). */
  let color;
  if(o.cache && o.cache.paso1){ Object.assign(r, o.cache.paso1.r); color = o.cache.paso1.color; }
  else{
    color = cmDsatur(g, null, null);
    let k = Math.max(...color) + 1;
    const clique = cmCliqueGrande(g);
    r.cota = Math.max(1, clique.length);
    r.juntos = clique.map(i => g.nodos[i].display);
    r.porGenero = !!g.soloGenero && clique.some((a, x) => clique.some((b, y) => y > x && g.soloGenero.has(Math.min(a, b) + '|' + Math.max(a, b))));
    r.exacto = k === r.cota;
    while(k > r.cota){
      const t = cmCon(g, k - 1, o.presupuesto || CM_PRESUPUESTO);
      if(t.colores){ color = t.colores; k--; r.exacto = k === r.cota; continue; }
      r.exacto = !!t.no;
      break;
    }
    r.minimo = k;
    if(o.cache) o.cache.paso1 = { color: color, r: { cota: r.cota, juntos: r.juntos, porGenero: r.porGenero, exacto: r.exacto, minimo: r.minimo } };
  }
  r.grupos = cmGrupos(g, color);

  /* 2 · con lo que ya está repartido: los que faltan, ¿caben en los talentos que hay? */
  const talentos = [], deTal = new Map(), fijos = new Map();
  g.nodos.forEach((p, i) => {
    const t = String(p.talento || '').trim();
    if(!t) { r.sinTalento++; return; }
    const kt = norm(t);
    if(!deTal.has(kt)){ deTal.set(kt, talentos.length); talentos.push({ nombre: t, ints: 0, genero: generoTal(t) || '' }); }
    const c = deTal.get(kt);
    talentos[c].ints += p.ints;
    fijos.set(i, c);
  });
  r.ahora = talentos.length;
  if(r.sinTalento){
    const carga = talentos.map(t => t.ints);
    /* Entre los talentos que no chocan y son de su género, el que menos líneas lleva (que no cargue todo uno);
       si no cabe en ninguno, uno nuevo. Entre dos nuevos, el género ya lo separa el grafo. */
    let ultimo = talentos.length;
    const col = cmDsatur(g, fijos, (i, libres) => {
      const vale = libres.filter(c => c >= talentos.length || cgCasanSi(talentos[c].genero, generos && generos[i]));
      let c = vale.slice().sort((a, b) => (carga[a] || 0) - (carga[b] || 0) || a - b)[0];
      if(c == null){ c = Math.max(ultimo, ...libres.map(x => x + 1)); }
      if(c >= ultimo) ultimo = c + 1;
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

/** ¿Casan dos géneros? Si alguno no se sabe, sí. */
function cgCasanSi(a, b){ return !a || !b || a === b; }

/**
 * Los talentos de RELLENO y lo que podrían hacer además (CAST-51). `g`: el grafo SIN géneros (lo que choca en el
 * tiempo), con el talento puesto en cada nodo. `opts`: { tope (líneas: hasta aquí es relleno), norm, generos (por nodo),
 * generoTal(nombre) }. Devuelve, de menos líneas a más:
 * [{ talento, genero, ints, personajes: [display], puede: [nodo], tambien: [{ nodo, cruzaCon: [display] }], noGenero: [nodo] }]
 * `puede`: personajes sin talento que no se cruzan con lo suyo NI entre ellos (los de más líneas primero); `tambien`:
 * los que tampoco se cruzan con lo suyo, pero sí con alguno de `puede` (o uno u otro); `noGenero`: los que cabrían
 * por tiempo pero son del otro género.
 */
function cmRelleno(g, opts){
  const o = opts || {}, norm = o.norm || ((s) => String(s || '').trim().toUpperCase()), tope = o.tope == null ? 10 : o.tope;
  const generos = o.generos || [], generoTal = o.generoTal || (() => '');
  const por = new Map(), libres = [];
  g.nodos.forEach((p, i) => {
    const t = String(p.talento || '').trim();
    if(!t){ libres.push(i); return; }
    const k = norm(t);
    if(!por.has(k)) por.set(k, { talento: t, idx: [], ints: 0 });
    const e = por.get(k); e.idx.push(i); e.ints += p.ints;
  });
  const out = [];
  for(const e of por.values()){
    if(e.ints > tope) continue;
    const gt = generoTal(e.talento) || '';
    const r = { talento: e.talento, genero: gt, ints: e.ints, personajes: e.idx.map(i => g.nodos[i].display), puede: [], tambien: [], noGenero: [] };
    const caben = libres.filter(j => !e.idx.some(i => g.ady[i].has(j))).sort((a, b) => g.nodos[b].ints - g.nodos[a].ints);
    const elegidos = [];
    for(const j of caben){
      if(!cgCasanSi(gt, generos[j])){ r.noGenero.push(g.nodos[j]); continue; }
      /* Entre ellos tampoco: dos del mismo género que se cruzan, o de géneros distintos, no van los dos. */
      const malos = elegidos.filter(x => g.ady[x].has(j) || !cgCasanSi(generos[x], generos[j]));
      if(malos.length) r.tambien.push({ nodo: g.nodos[j], cruzaCon: malos.map(x => g.nodos[x].display) });
      else { elegidos.push(j); r.puede.push(g.nodos[j]); }
    }
    out.push(r);
  }
  return out.sort((a, b) => a.ints - b.ints || String(a.talento).localeCompare(String(b.talento), 'es'));
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
  return 'No se puede con menos: ' + ns + (r.porGenero ? ' no pueden compartir talento (se cruzan o son de distinto género)' : ' chocan todos entre sí');
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
  module.exports = { CM_PRESUPUESTO, cmChocan, cmGrafo, cmDsatur, cmCliqueGrande, cmCon, cmConGeneros, cmGrupos, cmSugerir, cgCasanSi, cmRelleno, cmFrase, cmPorQue, cmFraseFaltan };
}
