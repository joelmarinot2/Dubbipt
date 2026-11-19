/* Episodios vinculados: un solo desglose para dos (o más) capítulos · especificacion 02, CAST-56
 *
 * Pedido de sala: «hay un programa, MY PET AND ME, que viene dividido en
 * episodios distintos, pero el desglose final que se exporta trae los dos
 * unidos. Quiero vincular los dos episodios: subir el libreto del 1 y el del
 * 2, y cuando complete los dos, tener solo el desglose general de los dos».
 * Y al preguntarle cómo: «subo el desglose unido, pero tengo que subir dos
 * libretos y dos videos distintos».
 *
 * Cómo viene ese desglose (DES_MY_PET_AND_ME_101.102): en cada hoja (DESGLOCE,
 * CASTING, CASTING 1, PLANILLA) una fila «EPS 101» y debajo los personajes del
 * 101 con sus timecodes y páginas; luego «EPS 102» y los del 102, cada uno con
 * los suyos (los timecodes vuelven a empezar). Un personaje que sale en los dos
 * va dos veces, una en cada episodio, a veces con otro nombre (RORY CRAWFORD /
 * RORY).
 *
 * Lo que hace Dubbipt:
 *   · Cada episodio es un capítulo normal, con SU libreto, SU video y SU
 *     casting (las tarjetas). Nada de eso se mezcla.
 *   · El desglose unido se sube una vez, desde cualquiera de los dos: Dubbipt
 *     ve las filas «EPS …», busca en el programa el capítulo de cada número
 *     y se lo guarda también a los demás. Así el vínculo es el propio archivo:
 *     no hay que marcar nada más.
 *   · Al descargar, desde cualquiera de los dos, sale UN archivo: las filas
 *     de debajo de «EPS 101» con el casting del 101, las de «EPS 102» con el
 *     del 102 (el que no está abierto se lee de lo guardado). COMPLETO solo si
 *     los dos lo están; CASTING 1 se ordena por talento DENTRO de cada
 *     episodio, con sus filas «EPS» en su sitio. El nombre:
 *     DES_MY PET AND ME 101.102_COMPLETO.
 *   · Al subirlo, el casting que ya traiga el archivo se hereda solo en las
 *     filas del episodio abierto.
 *
 * El capítulo de cada «EPS 101» se busca por su número (el 101); si no hay
 * ninguno con ese número y el número es de temporada (101 = temporada 1,
 * episodio 1), por el episodio (el 1).
 *
 * Es un script clásico: comparte el ámbito global con index.html (castClave,
 * castHojaXml, castLeerColumna, CAST_HOJA, CAST_COL_PERSONAJE, fflate, sb,
 * sbEps, idbGet, idbSet, tciNumEp, trnSanear, trnClave…).
 */

/** La fila que abre un episodio: «EPS 101», «EP 102», «EPISODIO 3», «EPISODE 4», «CAP. 5». */
const CV_SECCION_RE = /^\s*(?:EPS?|EPISODIO|EPISODE|CAP(?:ITULO|ÍTULO)?)\.?\s*#?\s*0*(\d{1,4})\s*$/i;

/** El número del episodio de una fila de sección («EPS 101» → '101'), o null si no lo es. */
function cvNumSeccion(nombre){
  const m = String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').match(CV_SECCION_RE);
  return m ? String(parseInt(m[1], 10)) : null;
}

/**
 * Las secciones de una columna de personajes ({ fila: nombre }): [{ num, fila, desde, hasta }], en orden.
 * `desde`..`hasta`: las filas de sus personajes (la última llega hasta el final). null si hay menos de dos:
 * un desglose de un solo episodio no está unido a nada.
 */
function cvSecciones(personajes){
  const filas = Object.keys(personajes || {}).map(Number).filter(f => isFinite(f)).sort((a, b) => a - b);
  const secs = [];
  for(const f of filas){
    const num = cvNumSeccion(personajes[f]);
    if(num != null) secs.push({ num: num, fila: f, desde: f + 1, hasta: Infinity });
  }
  for(let i = 0; i < secs.length - 1; i++) secs[i].hasta = secs[i + 1].fila - 1;
  if(secs.length < 2) return null;
  if(new Set(secs.map(s => s.num)).size !== secs.length) return null;     // dos «EPS 101»: no es un desglose unido
  return secs;
}

/** Las filas de UNA sección: { fila: nombre }. */
function cvFilasDe(personajes, sec){
  const out = {};
  for(const f in (personajes || {})){ const n = +f; if(n >= sec.desde && n <= sec.hasta) out[f] = personajes[f]; }
  return out;
}

/** «101.102» (como lo escribe la empresa en el título). */
function cvNums(secs){ return (secs || []).map(s => s.num).join('.'); }

/** Las secciones del desglose de un archivo (su hoja CASTING), o null. */
const _cvSecsDe = (typeof WeakMap === 'function') ? new WeakMap() : null;   // el mismo archivo no se vuelve a abrir
function cvSeccionesDelArchivo(buf){
  if(_cvSecsDe && buf && typeof buf === 'object' && _cvSecsDe.has(buf)) return _cvSecsDe.get(buf);
  const r = cvSeccionesDelArchivoHacer(buf);
  try{ if(_cvSecsDe && buf && typeof buf === 'object') _cvSecsDe.set(buf, r); }catch(e){ /* sin memoria: se abre cada vez */ }
  return r;
}
function cvSeccionesDelArchivoHacer(buf){
  try{
    if(!buf || typeof fflate === 'undefined') return null;
    const arch = fflate.unzipSync(new Uint8Array(buf));
    const xml = new TextDecoder().decode(arch[castHojaXml(arch, CAST_HOJA)]);
    return cvSecciones(castLeerColumna(xml, CAST_COL_PERSONAJE));
  }catch(e){ return null; }
}

/** El número de un capítulo, por su nombre o por el de su Excel. */
function cvNumEp(ep){
  if(!ep) return null;
  const de = (t) => { const n = (typeof tciNumEp === 'function') ? tciNumEp(t || '') : null; return n == null ? null : String(n); };
  return de(ep.name) || de(ep.xls_name) || null;
}

/**
 * El capítulo del programa de cada sección: { '101': ep, '102': ep } (las que no tienen, sin clave).
 * Primero el número tal cual; si ninguno lo lleva y es de temporada (101 → 1), el episodio.
 */
function cvEpisodiosDe(secs, eps){
  const out = {};
  const lista = (eps || []).map(e => ({ ep: e, n: cvNumEp(e) })).filter(x => x.n != null);
  for(const s of (secs || [])){
    let x = lista.find(y => y.n === s.num);
    if(!x && +s.num >= 100){ const corto = String(+s.num % 100); if(corto !== '0') x = lista.find(y => y.n === corto); }
    if(x) out[s.num] = x.ep;
  }
  return out;
}

/** La sección del capítulo abierto (su número), o null si el desglose no es suyo. */
function cvSeccionDe(secs, ep, eps){
  const map = cvEpisodiosDe(secs, eps);
  const s = (secs || []).find(x => map[x.num] && ep && String(map[x.num].id) === String(ep.id));
  return s ? s.num : null;
}

/** El casting de unas tarjetas: { personaje (clave): talento }. */
function cvAsignDe(chars){
  const out = {};
  for(const c of (chars || [])){
    if(!c) continue;
    const t = String(c.talent || '').trim();
    const k = castClave(c.display || c.key || '');
    if(k && t) out[k] = t;
  }
  return out;
}
/** Los de training de un capítulo guardado: { personaje (clave): { tel } }. */
function cvTrainingDe(chars, mapa){
  const out = {}, m = (typeof trnSanear === 'function') ? trnSanear(mapa) : (mapa || {});
  const clave = (t) => (typeof trnClave === 'function') ? trnClave(t) : castClave(t);
  for(const c of (chars || [])){
    if(!c || !c.talent || c.noRec) continue;
    const t = m[clave(c.talent)];
    if(t) out[castClave(c.display || c.key || '')] = { tel: t.tel || '' };
  }
  return out;
}

/** Lo guardado de otro capítulo (sus tarjetas y su training): lo más nuevo entre este equipo y la nube. null si no tiene. */
async function cvDatosDe(ep){
  if(!ep) return null;
  const cuando = (s) => { const t = Date.parse(s || ''); return isFinite(t) ? t : 0; };
  let loc = null, nube = null;
  try{ const c = await idbGet('data:' + ep.id); if(c && c.data) loc = c; }catch(e){ /* sin copia en el equipo */ }
  try{
    if(typeof sb !== 'undefined' && sb && !(typeof window !== 'undefined' && window.OFFLINE)){
      const { data: fila, error } = await sb.from('episode_data').select('data,updated_at').eq('ep_id', ep.id).maybeSingle();
      if(!error && fila && fila.data) nube = { stamp: fila.updated_at, data: fila.data };
    }
  }catch(e){ /* sin conexión: lo del equipo */ }
  const d = (loc && (!nube || cuando(loc.stamp) >= cuando(nube.stamp))) ? loc.data : (nube ? nube.data : null);
  return d && Array.isArray(d.chars) ? d : null;
}

/**
 * Lo que necesita castRellenar de cada sección: [{ num, desde, hasta, fila, asign, delCapitulo, training, ep, abierto, sinCapitulo, sinDatos }].
 * `actual`: lo del capítulo abierto ({ asign, delCapitulo, training }).
 */
async function cvPrepararSecciones(secs, epAbierto, eps, actual){
  const map = cvEpisodiosDe(secs, eps);
  const out = [];
  for(const s of secs){
    const x = Object.assign({}, s, { asign: {}, delCapitulo: [], training: {}, ep: map[s.num] || null, abierto: false, sinCapitulo: false, sinDatos: false });
    if(!x.ep) x.sinCapitulo = true;
    else if(epAbierto && String(x.ep.id) === String(epAbierto.id)){
      x.abierto = true; x.asign = Object.assign({}, actual.asign || {}); x.delCapitulo = actual.delCapitulo || []; x.training = actual.training || {};
    }else{
      const d = await cvDatosDe(x.ep);
      if(!d) x.sinDatos = true;
      else{ x.asign = cvAsignDe(d.chars); x.delCapitulo = d.chars.map(c => (c && (c.display || c.key)) || '').filter(Boolean); x.training = cvTrainingDe(d.chars, d.training); }
    }
    out.push(x);
  }
  return out;
}

/** Dónde espera el desglose unido un episodio que aún no existe en el programa (dentro de la carpeta del programa). */
function cvFormatoPathVinc(showId, num){ return showId + '/vinculo-' + num + '/formato-casting.xlsm'; }

/**
 * Guarda el desglose unido también en los otros capítulos vinculados. Devuelve { guardados: [nombre], faltan: [num] }.
 * Para los números que todavía no tienen capítulo, se deja guardado por número: cuando se cree (con su libreto y su
 * video) y su nombre lleve ese número, lo encuentra solo (castFuente).
 */
async function cvGuardarEnLosDemas(buf, nombreArchivo, secs, epAbierto, eps, showId){
  const map = cvEpisodiosDe(secs, eps), out = { guardados: [], faltan: [] };
  for(const s of secs){
    const ep = map[s.num];
    if(!ep){
      out.faltan.push(s.num);
      try{ await idbSet('ddl-formato-vinc::' + showId + '::' + s.num, { buf: buf, name: nombreArchivo, ts: Date.now() }); }catch(e){ /* solo en la nube */ }
      try{ await sb.storage.from('libretos').upload(cvFormatoPathVinc(showId, s.num), new Blob([buf]), { upsert: true }); }catch(e){ /* lo tendrá este equipo */ }
      continue;
    }
    if(epAbierto && String(ep.id) === String(epAbierto.id)) continue;
    try{ await idbSet('ddl-formato-ep::' + ep.id, { buf: buf, name: nombreArchivo, ts: Date.now() }); }catch(e){ /* solo en la nube */ }
    try{
      const r = await sb.storage.from('libretos').upload(castFormatoPathEp(showId, ep.id), new Blob([buf]), { upsert: true });
      if(r && r.error) throw r.error;
      out.guardados.push(ep.name || s.num);
    }catch(e){
      out.guardados.push((ep.name || s.num) + ' (solo en este equipo)');
      try{ if(typeof fallo === 'function') fallo('cvGuardarEnLosDemas · js/castvinculo.js', e, 'el otro episodio no lo tendrá en otros equipos hasta subirlo de nuevo'); }catch(x){ /* sin registro */ }
    }
  }
  return out;
}

/** El casting que ya trae el archivo, solo de las filas de una sección: { personaje: actor }. */
function cvCastingDeSeccion(trae, personajes, sec){
  if(!sec) return trae;
  const deAqui = new Set(Object.values(cvFilasDe(personajes, sec)).map(n => castClave(n)));
  const out = {};
  for(const p in (trae || {})) if(deAqui.has(castClave(p))) out[p] = trae[p];
  return out;
}

/** El desglose unido que espera a este capítulo (subido desde otro antes de crearlo), o null. */
const _cvSinVinc = new Set();
async function cvFormatoEsperando(showId, ep){
  const n = cvNumEp(ep);
  if(!showId || !n) return null;
  const clave = showId + '::' + n;
  try{ const c = await idbGet('ddl-formato-vinc::' + clave); if(c && c.buf) return { buf: c.buf, name: c.name || 'desglose unido' }; }catch(e){ /* a la nube */ }
  if(_cvSinVinc.has(clave)) return null;                    // ya se miró en esta sesión: no hay
  try{
    const r = await sb.storage.from('libretos').download(cvFormatoPathVinc(showId, n));
    if(r && r.data){
      const buf = await r.data.arrayBuffer();
      if(!cvSeccionesDelArchivo(buf)) return null;
      try{ await idbSet('ddl-formato-vinc::' + clave, { buf: buf, name: 'desglose unido', ts: Date.now() }); }catch(e){ /* se bajará otra vez */ }
      return { buf: buf, name: 'desglose unido' };
    }
  }catch(e){ /* sin conexión */ }
  _cvSinVinc.add(clave);
  return null;
}

/** «EPS 101 + EPS 102» para los avisos. */
function cvFrase(secs){ return (secs || []).map(s => 'EPS ' + s.num).join(' + '); }

if(typeof module !== 'undefined' && module.exports){
  module.exports = { CV_SECCION_RE, cvNumSeccion, cvSecciones, cvFilasDe, cvNums, cvSeccionesDelArchivo, cvNumEp, cvEpisodiosDe, cvSeccionDe,
                     cvAsignDe, cvTrainingDe, cvDatosDe, cvPrepararSecciones, cvGuardarEnLosDemas, cvCastingDeSeccion, cvFrase, cvFormatoPathVinc, cvFormatoEsperando };
}
