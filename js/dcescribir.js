/* Editar DublajeCast desde Dubbipt · especificacion 09, PRO-13
 *
 * Pedido de sala: «quiero que importes todos los programas de DublajeCast;
 * también que se pueda ver el casting, el reparto y los episodios, y que se
 * puedan hacer todas las funciones que se hacían en DublajeCast». Y después:
 * «que se pueda editar cada nombre y cada episodio de los programas, que en
 * cada episodio o cada programa haya un cambiador de talento, que quede
 * registrado quién cambió».
 *
 * Aquí está lo que CAMBIA datos de DublajeCast: asignar o quitar un talento,
 * cambiar el de un personaje en todo el programa, marcar principales, el
 * estado, la fase, las fechas y la DUBCARD de un capítulo, los datos de un
 * programa, la ficha de un talento y los tráilers. Todo se escribe en SU nube
 * -la misma fila que lee DublajeCast-, con el control de revisión de siempre
 * (dcEscribir): si alguien guardó mientras tanto, se vuelve a leer y se repite
 * una vez. Los registros se escriben como los escribe DublajeCast: los mismos
 * campos, sus ids, los nombres de talento en mayúsculas.
 *
 * Las transformaciones son puras -reciben el JSON de DublajeCast y lo
 * cambian- y devuelven si cambiaron algo; guardar es aparte (dcxGuardar).
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: castNorm, dcSesion, dcLeer, dcEscribir, prodNormalizar,
 * prodGuardar, PROD.
 */

/* ═══ EDITAR DUBLAJECAST DESDE DUBBIPT ══════════════════════════════════════ */

const DCX = { ultimoUid: 0, guardando: false, escrito: 0 };

/** Un id como los de DublajeCast: único aunque haya varias pestañas o equipos a la vez. */
function dcxUid(){
  let n = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  if(n <= DCX.ultimoUid) n = DCX.ultimoUid + 1;
  DCX.ultimoUid = n;
  return n;
}

function dcxLista(p, k){ if(!Array.isArray(p[k])) p[k] = []; return p[k]; }
function dcxMismo(a, b){ return a != null && b != null && String(a) === String(b); }
/** Un nombre de talento como lo guarda DublajeCast: en mayúsculas y sin espacios de más. */
function dcxNombreTalento(n){ return String(n == null ? '' : n).toUpperCase().replace(/\s+/g, ' ').trim(); }

/** El talento con ese nombre (sin mayúsculas ni acentos); si no existe y se pide, se crea. */
function dcxTalentoPorNombre(p, nombre, crear){
  const n = castNorm(nombre);
  if(!n) return null;
  const t = dcxLista(p, 'talents').find(x => castNorm(x.name) === n);
  if(t || !crear) return t || null;
  const nuevo = { id: dcxUid(), name: dcxNombreTalento(nombre) };
  p.talents.push(nuevo);
  return nuevo;
}

/**
 * El talento de un personaje en un capítulo. Con nombre vacío se quita.
 * Un nombre que no está en la base se da de alta, como hace DublajeCast.
 */
function dcxAsignar(p, epId, charId, nombre){
  const cs = dcxLista(p, 'castings');
  const i = cs.findIndex(c => dcxMismo(c.episode_id, epId) && dcxMismo(c.character_id, charId));
  if(!castNorm(nombre)){
    if(i < 0) return false;
    cs.splice(i, 1);
    return true;
  }
  const t = dcxTalentoPorNombre(p, nombre, true);
  if(i >= 0){
    if(dcxMismo(cs[i].talent_id, t.id)) return false;
    cs[i] = Object.assign({}, cs[i], { talent_id: t.id });
    return true;
  }
  cs.push({ id: dcxUid(), character_id: charId, talent_id: t.id, episode_id: epId });
  return true;
}

/**
 * Cambiar el talento de un personaje en todos los capítulos de un programa
 * donde ya lo tenía (si `deId` se da, solo donde tenía ese talento). Como el
 * «Reasignar» de DublajeCast: no crea asignaciones donde no las había.
 */
function dcxReasignar(p, serieId, charId, deId, nombre){
  const t = dcxTalentoPorNombre(p, nombre, true);
  if(!t) return false;
  const eps = new Set(dcxLista(p, 'episodes').filter(e => dcxMismo(e.series_id, serieId)).map(e => String(e.id)));
  let n = 0;
  p.castings = dcxLista(p, 'castings').map(c => {
    if(!dcxMismo(c.character_id, charId) || !eps.has(String(c.episode_id))) return c;
    if(deId != null && !dcxMismo(c.talent_id, deId)) return c;
    if(dcxMismo(c.talent_id, t.id)) return c;
    n++;
    return Object.assign({}, c, { talent_id: t.id });
  });
  return n > 0;
}

/** Cambia los campos permitidos de un registro, si cambian. */
function dcxCambiarCampos(lista, id, cambios, permitidos){
  const i = lista.findIndex(x => dcxMismo(x.id, id));
  if(i < 0) return false;
  const nuevo = Object.assign({}, lista[i]);
  let hay = false;
  for(const k of permitidos){
    if(!(k in cambios)) continue;
    const v = cambios[k];
    if(nuevo[k] === v) continue;
    nuevo[k] = v; hay = true;
  }
  if(hay) lista[i] = nuevo;
  return hay;
}

const DCX_CAMPOS_EP = ['title', 'status', 'fase', 'fecha_miami', 'fecha_dubcard', 'formato_dubcard'];
const DCX_CAMPOS_SERIE = ['name', 'status', 'cliente', 'director'];
const DCX_CAMPOS_TALENTO = ['name', 'genero', 'edad_aparente', 'tono_de_voz', 'registro', 'email'];
const DCX_CAMPOS_TRAILER = ['title', 'type', 'etapa', 'series_id', 'deadline', 'status'];

function dcxEpisodio(p, epId, cambios){ return dcxCambiarCampos(dcxLista(p, 'episodes'), epId, cambios, DCX_CAMPOS_EP); }
/** El programa: estado, cliente, director y nombre (un nombre vacío no se pone). */
function dcxSerie(p, serieId, cambios){
  const c = Object.assign({}, cambios);
  if('name' in c){ c.name = String(c.name == null ? '' : c.name).replace(/\s+/g, ' ').trim(); if(!c.name) delete c.name; }
  return dcxCambiarCampos(dcxLista(p, 'series'), serieId, c, DCX_CAMPOS_SERIE);
}
function dcxPersonaje(p, charId, cambios){ return dcxCambiarCampos(dcxLista(p, 'characters'), charId, cambios, ['tipo']); }

/** La ficha de un talento. El nombre, como lo guarda DublajeCast; uno que ya tenga otro, no. */
function dcxTalento(p, talentoId, cambios){
  const c = Object.assign({}, cambios);
  if('name' in c){
    c.name = dcxNombreTalento(c.name);
    if(!c.name) delete c.name;
    else if(dcxLista(p, 'talents').some(t => !dcxMismo(t.id, talentoId) && castNorm(t.name) === castNorm(c.name)))
      throw new Error('ya hay un talento que se llama «' + c.name + '»');
  }
  return dcxCambiarCampos(dcxLista(p, 'talents'), talentoId, c, DCX_CAMPOS_TALENTO);
}

/** Un talento nuevo, con su ficha. Si ya existe con ese nombre, no se repite. */
function dcxTalentoNuevo(p, ficha){
  const nombre = dcxNombreTalento(ficha && ficha.name);
  if(!nombre) return false;
  if(dcxTalentoPorNombre(p, nombre, false)) throw new Error('ya hay un talento que se llama «' + nombre + '»');
  const t = { id: dcxUid(), name: nombre };
  for(const k of DCX_CAMPOS_TALENTO) if(k !== 'name' && ficha[k]) t[k] = ficha[k];
  dcxLista(p, 'talents').push(t);
  return true;
}

function dcxTrailerNuevo(p, datos){
  const titulo = String((datos && datos.title) || '').trim();
  if(!titulo) return false;
  const t = { id: dcxUid(), title: titulo, type: datos.type === 'teaser' ? 'teaser' : 'trailer', status: 'pendiente' };
  for(const k of ['etapa', 'series_id', 'deadline']) if(datos[k] != null && datos[k] !== '') t[k] = datos[k];
  dcxLista(p, 'trailers').push(t);
  return true;
}
/**
 * El cambiador de talento: en los episodios dados, donde estaba `deId`, pasa a
 * estar el talento `nombre` (si no existe, se da de alta). Para cambiarlo en
 * un episodio o en todo un programa de una vez.
 */
function dcxCambiarTalento(p, epIds, deId, nombre){
  const t = dcxTalentoPorNombre(p, nombre, true);
  if(!t || dcxMismo(t.id, deId)) return false;
  const eps = new Set((epIds || []).map(String));
  let n = 0;
  p.castings = dcxLista(p, 'castings').map(c => {
    if(!eps.has(String(c.episode_id)) || !dcxMismo(c.talent_id, deId)) return c;
    n++;
    return Object.assign({}, c, { talent_id: t.id });
  });
  return n > 0;
}

function dcxTrailer(p, id, cambios){ return dcxCambiarCampos(dcxLista(p, 'trailers'), id, cambios, DCX_CAMPOS_TRAILER); }
function dcxTrailerBorrar(p, id){
  const l = dcxLista(p, 'trailers'), antes = l.length;
  p.trailers = l.filter(t => !dcxMismo(t.id, id));
  return p.trailers.length !== antes;
}

/* ── Capítulos repetidos y personajes con dos talentos ──────────────────────
   Pedido de sala: «también quiero que fusiones los capítulos repetidos y que
   me preguntes si hay alguna inconsistencia de que un personaje tenga dos
   talentos diferentes». */

/**
 * Lo que choca al fusionar: personajes que en el capítulo que se queda y en
 * los repetidos tienen talentos distintos. Para preguntar cuál vale.
 * Devuelve [{ charId, opciones: [talentId…] }].
 */
function dcxConflictosFusion(p, keepId, dupIds){
  const todos = new Set([String(keepId)].concat((dupIds || []).map(String)));
  const por = {};
  for(const c of dcxLista(p, 'castings')){
    if(!todos.has(String(c.episode_id)) || c.talent_id == null) continue;
    const k = String(c.character_id);
    const l = (por[k] = por[k] || { charId: c.character_id, opciones: [] });
    if(!l.opciones.some(t => dcxMismo(t, c.talent_id))){
      if(dcxMismo(c.episode_id, keepId)) l.opciones.unshift(c.talent_id); else l.opciones.push(c.talent_id);
    }
  }
  return Object.keys(por).map(k => por[k]).filter(x => x.opciones.length > 1);
}

/**
 * Fusionar capítulos repetidos: lo de los repetidos pasa al que se queda.
 *  · Personajes: los que solo estaban en un repetido pasan, con sus líneas;
 *    los que estaban en los dos se quedan con las líneas mayores (es el mismo
 *    capítulo subido dos veces, no dos mitades).
 *  · Talentos: los que solo estaban en un repetido pasan; si chocan, el que
 *    se haya elegido (`elegidos[charId]`), o el del que se queda.
 *  · Datos del capítulo (título, fase, fechas…): los que le falten al que se
 *    queda, del repetido.
 *  · Los repetidos van a la papelera de DublajeCast, como cuando se borra un
 *    capítulo allí: se pueden restaurar desde su papelera.
 */
function dcxFusionarEpisodios(p, keepId, dupIds, elegidos){
  const eps = dcxLista(p, 'episodes');
  const keep = eps.find(e => dcxMismo(e.id, keepId));
  if(!keep) return false;
  const dups = new Set((dupIds || []).filter(id => !dcxMismo(id, keepId) && eps.some(e => dcxMismo(e.id, id))).map(String));
  if(!dups.size) return false;
  const el = elegidos || {};
  const esDup = (x) => dups.has(String(x.episode_id));
  const apps = dcxLista(p, 'appearances'), cast = dcxLista(p, 'castings');
  /* Lo de los repetidos, por personaje. */
  const dupApp = {}, dupCast = {};
  for(const a of apps) if(esDup(a)){
    const k = String(a.character_id);
    if(!dupApp[k] || (+a.line_count || 0) > (+dupApp[k].line_count || 0)) dupApp[k] = a;
  }
  for(const c of cast) if(esDup(c)) (dupCast[String(c.character_id)] = dupCast[String(c.character_id)] || []).push(c);
  /* Personajes. */
  const enKeep = new Set();
  const nuevasApps = apps.filter(a => !esDup(a)).map(a => {
    if(!dcxMismo(a.episode_id, keepId)) return a;
    const k = String(a.character_id); enKeep.add(k);
    const d = dupApp[k];
    return (d && (+d.line_count || 0) > (+a.line_count || 0)) ? Object.assign({}, a, { line_count: d.line_count }) : a;
  });
  for(const k of Object.keys(dupApp)) if(!enKeep.has(k)) nuevasApps.push(Object.assign({}, dupApp[k], { id: dcxUid(), episode_id: keep.id }));
  /* Talentos. */
  const conKeep = new Set();
  const nuevosCast = cast.filter(c => !esDup(c)).map(c => {
    if(!dcxMismo(c.episode_id, keepId)) return c;
    const k = String(c.character_id); conKeep.add(k);
    return (el[k] != null && !dcxMismo(c.talent_id, el[k])) ? Object.assign({}, c, { talent_id: el[k] }) : c;
  });
  for(const k of Object.keys(dupCast)) if(!conKeep.has(k)){
    const c0 = dupCast[k][0];
    nuevosCast.push({ id: dcxUid(), character_id: c0.character_id, talent_id: el[k] != null ? el[k] : c0.talent_id, episode_id: keep.id });
  }
  /* Los datos del capítulo que le falten. */
  const nuevoKeep = Object.assign({}, keep);
  for(const e of eps) if(dups.has(String(e.id)))
    for(const k of ['title', 'fase', 'status', 'fecha_miami', 'fecha_dubcard', 'formato_dubcard', 'studio_id', 'cliente', 'director'])
      if((nuevoKeep[k] == null || nuevoKeep[k] === '') && e[k] != null && e[k] !== '') nuevoKeep[k] = e[k];
  /* A la papelera, como en DublajeCast. */
  const papelera = eps.filter(e => dups.has(String(e.id))).map(e => ({
    kind: 'episode', at: Date.now(), label: 'Fusionado en Ep. ' + (keep.episode_number != null ? keep.episode_number : '') + ': ' + (e.title || ('Ep. ' + e.episode_number)),
    data: { episodes: [e], appearances: apps.filter(a => dcxMismo(a.episode_id, e.id)), castings: cast.filter(c => dcxMismo(c.episode_id, e.id)) }
  }));
  p.trash = papelera.concat(Array.isArray(p.trash) ? p.trash : []).slice(0, 50);
  p.episodes = eps.filter(e => !dups.has(String(e.id))).map(e => (e === keep ? nuevoKeep : e));
  p.appearances = nuevasApps;
  p.castings = nuevosCast;
  return true;
}

/**
 * Fusiona dos programas: todo lo del repetido pasa al que se queda, como
 * hace DublajeCast al juntar proyectos. Sus capítulos -y con ellos sus
 * personajes y castings-, sus tráilers y lo que lleve su `series_id`; las
 * filas de producción, que van por nombre, cambian de nombre (si el que se
 * queda ya tiene ese capítulo, sobra la del repetido). Lo que le falte al
 * que se queda (cliente, director…) se toma del repetido, y el repetido va
 * a la papelera. Los capítulos con el mismo número quedan repetidos, para
 * fusionarlos después preguntando lo que choque.
 */
function dcxFusionarSeries(p, keepId, dupId){
  const series = dcxLista(p, 'series');
  const keep = series.find(s => dcxMismo(s.id, keepId)), dup = series.find(s => dcxMismo(s.id, dupId));
  if(!keep || !dup || keep === dup) return false;
  const nom = (s) => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/\s+/g, ' ').trim();
  for(const k of Object.keys(p)){
    if(k === 'series' || k === 'trash' || !Array.isArray(p[k])) continue;
    p[k] = p[k].map(x => (x && typeof x === 'object' && dcxMismo(x.series_id, dup.id)) ? Object.assign({}, x, { series_id: keep.id }) : x);
  }
  if(Array.isArray(p.produccion)){
    const deKeep = new Set(p.produccion.filter(r => r && nom(r.programa) === nom(keep.name)).map(r => String(r.capitulo)));
    p.produccion = p.produccion.filter(r => !(r && nom(r.programa) === nom(dup.name) && deKeep.has(String(r.capitulo))))
      .map(r => (r && nom(r.programa) === nom(dup.name)) ? Object.assign({}, r, { programa: keep.name }) : r);
  }
  const nuevoKeep = Object.assign({}, keep);
  for(const k of ['cliente', 'director', 'studio_id', 'type', 'requiere_dubcard', 'formato_dubcard'])
    if((nuevoKeep[k] == null || nuevoKeep[k] === '') && dup[k] != null && dup[k] !== '') nuevoKeep[k] = dup[k];
  p.trash = [{ kind: 'series', at: Date.now(), label: dup.name + ' (fusionado en ' + keep.name + ')', data: { series: [dup] } }]
    .concat(Array.isArray(p.trash) ? p.trash : []).slice(0, 50);
  p.series = series.filter(s => s !== dup).map(s => (s === keep ? nuevoKeep : s));
  return true;
}

/** Los relevos que alguien ya dijo que son a propósito: no se vuelven a preguntar. */
function dcxRelevosAceptados(){
  const l = PROD.datos && PROD.datos.relevosAceptados;
  return Array.isArray(l) ? l : [];
}
function dcxAceptarRelevo(clave){
  if(!clave) return false;
  if(!PROD.datos) PROD.datos = prodNormalizar({});
  const l = dcxRelevosAceptados();
  if(l.indexOf(clave) >= 0) return false;
  PROD.datos.relevosAceptados = l.concat([clave]);
  try{ Promise.resolve(prodGuardar()).catch(() => { /* se guardará con el siguiente cambio */ }); }
  catch(e){ /* queda en memoria */ }
  return true;
}

/* ── Guardar ────────────────────────────────────────────────────────────── */

/**
 * Lee lo último de DublajeCast, aplica `cambio` y lo escribe. Si alguien
 * guardó entre medias, vuelve a leer y repite UNA vez: el cambio se aplica
 * sobre lo nuevo, no sobre lo viejo. Sin sesión del puente, lanza un error
 * con `sinSesion`. Devuelve { cambiado }.
 */
async function dcxGuardar(cambio, entrada){
  if(DCX.guardando) throw new Error('ya se está guardando otro cambio: espera un momento');
  DCX.guardando = true;
  try{
    const u = await dcSesion();
    if(!u){ const e = new Error('sin sesión en DublajeCast'); e.sinSesion = true; throw e; }
    for(let intento = 0; intento < 2; intento++){
      const p = JSON.parse(JSON.stringify(await dcLeer()));
      if(!cambio(p)) return { cambiado: false };
      try{
        await dcEscribir(p);
        dcxLocal(p, entrada);
        return { cambiado: true };
      }catch(e){
        if(intento || !/cambió los datos/.test(String(e && e.message))) throw e;
      }
    }
    return { cambiado: false };
  }finally{
    DCX.guardando = false;
  }
}

/** Lo escrito, también aquí: Producción lo guarda y se pinta ya, sin esperar a DublajeCast. */
function dcxLocal(p, entrada){
  const historial = dcxHistorial(), relevos = dcxRelevosAceptados();
  PROD.datos = (typeof prodConservarPropio === 'function') ? prodConservarPropio(prodNormalizar(p), PROD.datos) : prodNormalizar(p);
  /* Lo que es solo de Dubbipt (quién cambió qué, los relevos aceptados) no viene de DublajeCast: se conserva. */
  if(relevos.length) PROD.datos.relevosAceptados = relevos;
  PROD.datos.historialDubbipt = entrada ? [entrada].concat(historial).slice(0, DCX_HISTORIAL) : historial;
  PROD.cuando = Date.now();
  if(!PROD.origen) PROD.origen = 'DublajeCast';
  DCX.escrito = Date.now();
  try{ Promise.resolve(prodGuardar()).catch(() => { /* la copia en la nube de Dubbipt se intenta en el siguiente cambio */ }); }
  catch(e){ /* sin guardar aquí, DublajeCast ya lo tiene */ }
}

/* ── Quién cambió qué ───────────────────────────────────────────────────
   Cada cambio hecho desde aquí queda apuntado: cuándo, quién -la persona que
   ha entrado en Dubbipt- y qué. Se guarda con Producción, por espacio de
   trabajo (no en DublajeCast, que tira las claves que no conoce al combinar),
   y se ve en el programa, en el episodio y en el Dashboard. */

const DCX_HISTORIAL = 500;

/** Quién está haciendo el cambio: su nombre en Dubbipt, o su correo. */
function dcxQuien(){
  try{
    if(typeof sbUser !== 'undefined' && sbUser){
      const m = sbUser.user_metadata || {};
      return String(m.full_name || sbUser.email || 'sin nombre').trim();
    }
  }catch(e){ /* sin sesión no hay nombre */ }
  return 'sin sesión';
}

/** Un apunte del historial. `ctx` dice dónde: programa, episodio y sus ids. */
function dcxEntrada(que, ctx){
  return Object.assign({ cuando: new Date().toISOString(), quien: dcxQuien(), que: String(que || '') }, ctx || {});
}

/** Todo lo apuntado, lo último primero. */
function dcxHistorial(){
  const h = PROD.datos && PROD.datos.historialDubbipt;
  return Array.isArray(h) ? h : [];
}

/** Apuntar un cambio que no pasa por DublajeCast (renombrar en Dubbipt, importar). */
function dcxRegistrar(entrada){
  if(!entrada) return false;
  if(!PROD.datos) PROD.datos = prodNormalizar({});
  PROD.datos.historialDubbipt = [entrada].concat(dcxHistorial()).slice(0, DCX_HISTORIAL);
  try{ Promise.resolve(prodGuardar()).catch(() => { /* se guardará con el siguiente cambio */ }); }
  catch(e){ /* sin guardar, queda en memoria hasta el siguiente */ }
  return true;
}

/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT ═══ */
