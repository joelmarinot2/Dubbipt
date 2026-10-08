/* Editar DublajeCast desde Dubbipt · especificacion 09, PRO-13
 *
 * Pedido de sala: «quiero que importes todos los programas de DublajeCast;
 * también que se pueda ver el casting, el reparto y los episodios, y que se
 * puedan hacer todas las funciones que se hacían en DublajeCast».
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

const DCX_CAMPOS_EP = ['status', 'fase', 'fecha_miami', 'fecha_dubcard', 'formato_dubcard'];
const DCX_CAMPOS_SERIE = ['status', 'cliente', 'director'];
const DCX_CAMPOS_TALENTO = ['name', 'genero', 'edad_aparente', 'tono_de_voz', 'registro', 'email'];
const DCX_CAMPOS_TRAILER = ['title', 'type', 'etapa', 'series_id', 'deadline', 'status'];

function dcxEpisodio(p, epId, cambios){ return dcxCambiarCampos(dcxLista(p, 'episodes'), epId, cambios, DCX_CAMPOS_EP); }
function dcxSerie(p, serieId, cambios){ return dcxCambiarCampos(dcxLista(p, 'series'), serieId, cambios, DCX_CAMPOS_SERIE); }
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
function dcxTrailer(p, id, cambios){ return dcxCambiarCampos(dcxLista(p, 'trailers'), id, cambios, DCX_CAMPOS_TRAILER); }
function dcxTrailerBorrar(p, id){
  const l = dcxLista(p, 'trailers'), antes = l.length;
  p.trailers = l.filter(t => !dcxMismo(t.id, id));
  return p.trailers.length !== antes;
}

/* ── Guardar ────────────────────────────────────────────────────────────── */

/**
 * Lee lo último de DublajeCast, aplica `cambio` y lo escribe. Si alguien
 * guardó entre medias, vuelve a leer y repite UNA vez: el cambio se aplica
 * sobre lo nuevo, no sobre lo viejo. Sin sesión del puente, lanza un error
 * con `sinSesion`. Devuelve { cambiado }.
 */
async function dcxGuardar(cambio){
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
        dcxLocal(p);
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
function dcxLocal(p){
  PROD.datos = prodNormalizar(p);
  PROD.cuando = Date.now();
  if(!PROD.origen) PROD.origen = 'DublajeCast';
  DCX.escrito = Date.now();
  try{ Promise.resolve(prodGuardar()).catch(() => { /* la copia en la nube de Dubbipt se intenta en el siguiente cambio */ }); }
  catch(e){ /* sin guardar aquí, DublajeCast ya lo tiene */ }
}

/* ═══ FIN DE EDITAR DUBLAJECAST DESDE DUBBIPT ═══ */
