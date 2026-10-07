/* Producción · lo que viene de DublajeCast · especificacion 09
 *
 * Pedido de sala: «quiero migrar la plataforma de DublajeCast a Dubbipt».
 * Datos y funciones, por fases. Esta es la primera: TRAER LOS DATOS y
 * tenerlos aquí, a la vista, para que lo demás se pueda construir encima.
 *
 * DublajeCast (dubcast.netlify.app) guarda todo en un solo JSON por usuario:
 * series, episodios, personajes, apariciones, talentos con su ficha,
 * castings, estudios, equipo, tráilers, producción (DUBCARDs y entregas) y
 * breakdowns. Aquí ese JSON se trae entero -desde su nube, con la sesión que
 * la propia persona abre en el panel, o desde el archivo que exporta- y se
 * guarda por espacio de trabajo. Lo que no se entiende se copia tal cual: un
 * campo desconocido es un campo que alguien necesita.
 *
 * Y de paso se vierte en lo que Dubbipt ya tiene: los talentos a la base, y
 * los castings al registro de cada programa, para que al abrir un capítulo
 * hereden lo que ya se repartió allí.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: sb, WORKSPACE, idbGet, idbSet, castNorm, castSimil,
 * sbShows, TAL, talCargar, talPoner, talGuardar, castRegCargar,
 * castRegGuardar, dcLeer, castAviso, fallo, esc.
 */

/* ═══ PRODUCCIÓN · LO QUE VIENE DE DUBLAJECAST ═════════════════════════════ */

const PROD = { datos: null, rev: 0, origen: '', donde: '', cuando: 0, cargado: false, ws: null };

/* Las listas que trae DublajeCast. Si falta alguna, se crea vacía. */
const PROD_CLAVES = ['series', 'episodes', 'characters', 'aliases', 'appearances', 'talents', 'castings',
                     'team', 'studios', 'trailers', 'produccion', 'breakdowns', 'entregas', 'trash',
                     'clienteList', 'directorList'];
const PROD_TABLA = 'produccion';

/* Cómo dice DublajeCast cada cosa, y cómo se lee aquí. */
const PROD_ET = {
  genero:   { masculino: 'Masculino', femenino: 'Femenino', no_binario: 'No binario' },
  edad:     { 'niño': 'Niño', adolescente: 'Adolescente', adulto: 'Adulto', mayor: 'Mayor' },
  tono:     { grave: 'Grave', medio: 'Medio', agudo: 'Agudo' },
  estado:   { pendiente: 'Pendiente de revisión', en_curso: 'En curso', completo: 'Completado' },
  fase:     { pre_produccion: 'Preproducción', produccion_activa: 'En producción', completado: 'Finalizado' },
  trailer:  { pendiente: 'Pendiente', en_curso: 'En curso', completo: 'Completado' }
};

/* ── Quién lo ve ─────────────────────────────────────────────────────────
   Pedido de sala: «que solamente el perfil de Casting tenga acceso a esos
   datos y que solo el administrador pueda verlos». Las dos cosas a la vez: el
   perfil de trabajo puesto es Casting Y la cuenta es de administrador. Esto
   esconde la puerta; quien de verdad cierra es la base de datos, con la
   política de `sql/mejora-03-produccion.sql`, que solo deja al administrador. */

/** ¿Puede ver Producción? `modo` y `rol` se pueden pasar para probar; si no, los de ahora. */
function prodPuede(modo, rol){
  const m = (modo !== undefined) ? modo : ((typeof DDL_MODO !== 'undefined') ? DDL_MODO : '');
  const r = (rol !== undefined) ? rol : ((typeof MYROLE !== 'undefined') ? MYROLE : null);
  return m === 'casting' && r === 'admin';
}
const PROD_SIN_PERMISO = '🔒 Producción es solo para el administrador, en el perfil Casting';

/** Enseña o esconde la puerta de Producción según quién y en qué perfil. */
function prodPintarBoton(){
  const b = document.getElementById('btnProduccion');
  if(b) b.style.display = prodPuede() ? '' : 'none';
}

/** Un volcado vacío, con todas las listas. */
function prodVacio(){
  const d = {};
  PROD_CLAVES.forEach(k => { d[k] = []; });
  return d;
}

/**
 * Deja un volcado de DublajeCast como se usa aquí: todas las listas presentes,
 * los nombres recortados, y los personajes con `name` -allí se llaman
 * `canonical_name`-. Las claves que no se conocen se copian tal cual.
 */
function prodNormalizar(p){
  const src = (p && typeof p === 'object' && !Array.isArray(p)) ? p : {};
  const d = prodVacio();
  for(const k in src){
    if(PROD_CLAVES.indexOf(k) >= 0 || /^_/.test(k)) continue;
    d[k] = src[k];
  }
  const limpio = (s) => String(s == null ? '' : s).replace(/\s+/g, ' ').trim();
  for(const k of PROD_CLAVES){
    const v = src[k];
    d[k] = Array.isArray(v) ? v.filter(x => x != null).map(x => (x && typeof x === 'object') ? Object.assign({}, x) : x) : [];
  }
  d.characters = d.characters.map(c => {
    const n = limpio(c.canonical_name || c.name);
    return Object.assign({}, c, { name: n, canonical_name: n });
  });
  d.talents = d.talents.map(t => Object.assign({}, t, { name: limpio(t.name || t.nombre) }));
  d.series = d.series.map(s => Object.assign({}, s, { name: limpio(s.name || s.title) }));
  d.episodes = d.episodes.map(e => Object.assign({}, e, { title: limpio(e.title) }));
  d.trailers = d.trailers.map(t => Object.assign({}, t, { title: limpio(t.title) }));
  return d;
}

/** ¿Esto es un volcado de DublajeCast? Un JSON cualquiera no lo es. */
function prodEsVolcado(p){
  if(!p || typeof p !== 'object' || Array.isArray(p)) return false;
  if(/^dublajecast/i.test(String(p._version || ''))) return true;
  return ['series', 'episodes', 'talents', 'castings'].filter(k => Array.isArray(p[k])).length >= 2;
}

/** Cuánto hay de cada cosa. */
function prodResumen(d){
  const n = (k) => (d && Array.isArray(d[k])) ? d[k].length : 0;
  return { series: n('series'), episodios: n('episodes'), personajes: n('characters'), talentos: n('talents'),
           castings: n('castings'), apariciones: n('appearances'), estudios: n('studios'), equipo: n('team'),
           trailers: n('trailers'), produccion: n('produccion'), breakdowns: n('breakdowns') };
}

/** Los índices por id, con los ids como texto: en el JSON van unas veces como número y otras como texto. */
function prodIndices(d){
  const por = (lista) => { const m = {}; (lista || []).forEach(x => { if(x && x.id != null) m[String(x.id)] = x; }); return m; };
  const agrupa = (lista, campo) => { const m = {}; (lista || []).forEach(x => { if(!x) return; const k = String(x[campo]); (m[k] = m[k] || []).push(x); }); return m; };
  return {
    serie: por(d.series), ep: por(d.episodes), char: por(d.characters), talent: por(d.talents), studio: por(d.studios),
    epsPorSerie: agrupa(d.episodes, 'series_id'),
    castingsPorEp: agrupa(d.castings, 'episode_id'),
    aparicionesPorEp: agrupa(d.appearances, 'episode_id'),
    trailersPorSerie: agrupa(d.trailers, 'series_id')
  };
}

/* ── Fechas, alertas y plazos (como los calcula DublajeCast) ───────────── */

/** «AAAA-MM-DD» o «DD/MM/AAAA» como fecha LOCAL a medianoche, o nulo. */
function prodFecha(s){
  const t = String(s == null ? '' : s).trim();
  let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m) return new Date(+m[3], +m[2] - 1, +m[1]);
  return null;
}

/** Días que faltan para una fecha (negativo: ya pasó), o nulo si no hay fecha. `hoy` se puede fijar para probar. */
function prodDias(fecha, hoy){
  const d = prodFecha(fecha);
  if(!d) return null;
  const h = hoy ? new Date(hoy) : new Date();
  h.setHours(0, 0, 0, 0); d.setHours(0, 0, 0, 0);
  return Math.round((d - h) / 86400000);
}

/** La entrega a Miami: avisa si está por vencer o vencida, salvo que la producción ya esté en marcha. */
function prodAlertaMiami(fecha, fase, hoy){
  if(!fecha || fase === 'produccion_activa' || fase === 'completado') return null;
  const dias = prodDias(fecha, hoy);
  if(dias == null) return null;
  if(dias < 0) return { nivel: 'vencida', dias: dias, texto: 'Miami vencida hace ' + Math.abs(dias) + ' d' };
  if(dias <= 3) return { nivel: 'pronto', dias: dias, texto: dias === 0 ? 'Miami hoy' : 'Miami en ' + dias + ' d' };
  return null;
}

/** La DUBCARD: igual, salvo que no haga falta o el capítulo esté finalizado. */
function prodAlertaDubcard(fecha, formato, fase, hoy){
  if(!fecha || formato === 'No necesita DUBCARD' || fase === 'completado') return null;
  const dias = prodDias(fecha, hoy);
  if(dias == null) return null;
  if(dias < 0) return { nivel: 'vencida', dias: dias, texto: 'DUBCARD vencida hace ' + Math.abs(dias) + ' d' };
  if(dias <= 3) return { nivel: 'pronto', dias: dias, texto: dias === 0 ? 'DUBCARD hoy' : 'DUBCARD en ' + dias + ' d' };
  return null;
}

/** El plazo de un tráiler o teaser. */
function prodPlazo(deadline, status, hoy){
  if(status === 'completo') return { nivel: 'hecho', texto: 'Completado', dias: null };
  if(!deadline) return { nivel: 'sin', texto: 'Sin fecha', dias: null };
  const dias = prodDias(deadline, hoy);
  if(dias == null) return { nivel: 'sin', texto: 'Sin fecha', dias: null };
  if(dias < 0) return { nivel: 'vencido', texto: 'Vencido hace ' + Math.abs(dias) + ' d', dias: dias };
  if(dias === 0) return { nivel: 'urgente', texto: 'Hoy', dias: 0 };
  if(dias === 1) return { nivel: 'urgente', texto: 'Mañana', dias: 1 };
  if(dias <= 2) return { nivel: 'urgente', texto: dias + ' días', dias: dias };
  if(dias <= 5) return { nivel: 'aviso', texto: dias + ' días', dias: dias };
  return { nivel: 'ok', texto: dias + ' días', dias: dias };
}

/** El formato de DUBCARD que le toca a un capítulo: el suyo, o el que manda el cliente. */
function prodFormatoDubcard(ep, serie){
  if(ep && ep.formato_dubcard) return ep.formato_dubcard;
  const req = (ep && ep.requiere_dubcard != null) ? ep.requiere_dubcard : (serie ? serie.requiere_dubcard : undefined);
  if(req === false) return 'No necesita DUBCARD';
  const cliente = String((ep && ep.cliente) || (serie && serie.cliente) || '');
  return /netflix/i.test(cliente) ? 'BACKLOT' : 'Excel';
}

/** Las alertas de un capítulo, las dos. */
function prodAlertasEp(ep, serie, hoy){
  const out = [];
  const m = prodAlertaMiami(ep && ep.fecha_miami, ep && ep.fase, hoy);
  const dc = prodAlertaDubcard(ep && ep.fecha_dubcard, prodFormatoDubcard(ep, serie), ep && ep.fase, hoy);
  if(m) out.push(m);
  if(dc) out.push(dc);
  return out;
}

/* ── La ficha de un talento ─────────────────────────────────────────────── */

/** La ficha de un talento por su nombre, como se dice: «Femenino · Adulto · Agudo». Vacío si no se sabe nada. */
function prodFicha(nombre){
  if(!PROD.datos || !nombre) return null;
  const k = castNorm(nombre);
  const t = PROD.datos.talents.find(x => castNorm(x.name) === k);
  return t || null;
}
function prodFichaTexto(t){
  if(!t) return '';
  const partes = [PROD_ET.genero[t.genero] || '', PROD_ET.edad[t.edad_aparente] || '', PROD_ET.tono[t.tono_de_voz] || ''].filter(Boolean);
  if(t.registro) partes.push(String(t.registro));
  return partes.join(' · ');
}

/* ── Casar los programas de allí con los de aquí ───────────────────────── */

/** El programa de Dubbipt que corresponde a una serie de DublajeCast: por nombre exacto, o el que más se le parezca. */
function prodCasarPrograma(nombre, shows){
  const n = castNorm(nombre);
  if(!n) return null;
  const lista = shows || [];
  const exacto = lista.find(s => castNorm(s.name) === n);
  if(exacto) return exacto;
  let mejor = null;
  for(const s of lista){
    const p = castSimil(castNorm(s.name), n);
    if(p >= 0.82 && (!mejor || p > mejor.p)) mejor = { s: s, p: p };
  }
  return mejor ? mejor.s : null;
}

/**
 * Vierte lo traído en lo que Dubbipt ya tiene:
 *
 *   · los talentos, a la base (solo se suman: nada se quita);
 *   · los castings, al registro de cada programa que case por nombre, para
 *     que al abrir un capítulo se hereden. Lo que el registro ya decía
 *     distinto se respeta: lo de aquí manda, y se cuenta.
 */
async function prodAplicar(d){
  const out = { talentosNuevos: 0, programasCasados: [], programasSinCasar: [], registros: 0, conflictos: 0 };
  try{
    if(typeof talCargar === 'function') await talCargar();
    const antes = new Set(TAL.claves);
    talPoner(TAL.nombres.concat(d.talents.map(t => t.name).filter(Boolean)), TAL.origen || 'DublajeCast');
    out.talentosNuevos = TAL.nombres.filter(n => !antes.has(castNorm(n))).length;
    if(out.talentosNuevos) await talGuardar();
  }catch(e){ fallo('talentos · js/produccion.js:prodAplicar', e, 'los talentos de DublajeCast no se han sumado a la base'); }

  const shows = (typeof sbShows === 'function') ? sbShows() : [];
  const ix = prodIndices(d);
  for(const s of d.series){
    const show = prodCasarPrograma(s.name, shows);
    if(!show){ out.programasSinCasar.push(s.name); continue; }
    out.programasCasados.push(s.name + (castNorm(s.name) === castNorm(show.name) ? '' : ' → ' + show.name));
    try{
      const reg = await castRegCargar(show.id);
      reg.personajes = reg.personajes || {};
      let tocado = false;
      for(const e of (ix.epsPorSerie[String(s.id)] || [])){
        const nomEp = e.title || ('Capítulo ' + e.episode_number);
        for(const c of (ix.castingsPorEp[String(e.id)] || [])){
          const per = ix.char[String(c.character_id)], tal = ix.talent[String(c.talent_id)];
          if(!per || !tal || !per.name || !tal.name) continue;
          const clave = castNorm(per.name);
          if(!clave) continue;
          const ya = reg.personajes[clave];
          if(ya && ya.talent && castNorm(ya.talent) !== castNorm(tal.name)){ out.conflictos++; continue; }
          const eps = (ya && Array.isArray(ya.episodios)) ? ya.episodios.slice() : [];
          if(eps.indexOf(nomEp) < 0) eps.push(nomEp);
          reg.personajes[clave] = { display: per.name, talent: tal.name, episodios: eps, ts: (ya && ya.ts) || Date.now(), de: 'DublajeCast' };
          out.registros++; tocado = true;
        }
      }
      if(tocado) await castRegGuardar(show.id, reg);
    }catch(e){ fallo('registro · js/produccion.js:prodAplicar', e, 'el casting de «' + s.name + '» no se ha apuntado en el registro'); }
  }
  return out;
}

/* ── Guardar y cargar ───────────────────────────────────────────────────── */

function prodWs(){ return (typeof WORKSPACE !== 'undefined' && WORKSPACE && WORKSPACE.id) ? WORKSPACE.id : null; }
function prodClaveLocal(){ return 'ddl-produccion::' + (prodWs() || 'sin-espacio'); }

/** ¿El error es que la tabla no existe todavía? Entonces se guarda en el almacén. */
function prodSinTabla(e){
  const m = String((e && (e.message || e.code || e.hint)) || e || '');
  return /42P01|PGRST205|does not exist|Could not find the table|schema cache|relation .* does not exist/i.test(m);
}

async function prodUid(){
  try{ const { data } = await sb.auth.getSession(); return (data && data.session && data.session.user && data.session.user.id) || null; }
  catch(e){ return null; }
}
function prodRutaAlmacen(uid){ return '_diag/' + uid + '/produccion.json'; }

/**
 * Guarda lo que hay. Primero en el equipo; luego en la tabla `produccion`
 * del espacio de trabajo -compartida con quien lo tenga-; y si la tabla no
 * existe todavía (hay que correr `sql/mejora-03-produccion.sql` una vez), en
 * el almacén, en la carpeta de este usuario. Devuelve `{ ok, donde, causa }`.
 */
async function prodGuardar(){
  if(!PROD.datos) return { ok: false, donde: '', causa: 'no hay datos que guardar' };
  const paquete = { datos: PROD.datos, rev: PROD.rev, origen: PROD.origen, cuando: PROD.cuando };
  try{ await idbSet(prodClaveLocal(), paquete); }catch(e){ /* sin copia en el equipo: queda la nube */ }
  const ws = prodWs();
  if(!ws) return { ok: true, donde: 'equipo', causa: 'sin espacio de trabajo elegido: solo en este equipo' };
  try{
    const fila = { workspace_id: ws, data: PROD.datos, rev: (PROD.rev || 0) + 1, updated_at: new Date().toISOString() };
    const { error } = await sb.from(PROD_TABLA).upsert(fila);
    if(!error){ PROD.rev = fila.rev; PROD.donde = 'tabla'; return { ok: true, donde: 'tabla', causa: '' }; }
    if(!prodSinTabla(error)) return { ok: false, donde: '', causa: error.message || String(error) };
  }catch(e){ if(!prodSinTabla(e)) return { ok: false, donde: '', causa: String((e && e.message) || e) }; }
  try{
    const uid = await prodUid();
    if(!uid) return { ok: false, donde: '', causa: 'sin sesión' };
    const r = await sb.storage.from('libretos').upload(prodRutaAlmacen(uid),
      new Blob([JSON.stringify(paquete)], { type: 'application/json' }), { upsert: true });
    if(r && r.error) return { ok: false, donde: '', causa: r.error.message || String(r.error) };
    PROD.donde = 'almacen';
    return { ok: true, donde: 'almacen', causa: 'la tabla «produccion» no existe todavía: guardado en la carpeta de este usuario' };
  }catch(e){ return { ok: false, donde: '', causa: String((e && e.message) || e) }; }
}

/** Carga lo guardado: la nube manda; si no llega, lo del equipo. Devuelve el resumen o nulo. */
async function prodCargar(fuerza){
  if(PROD.cargado && !fuerza && PROD.ws === prodWs()) return PROD.datos ? prodResumen(PROD.datos) : null;
  PROD.ws = prodWs();
  let local = null;
  try{ local = await idbGet(prodClaveLocal()); }catch(e){ local = null; }
  const pon = (datos, rev, origen, cuando, donde) => {
    PROD.datos = prodNormalizar(datos); PROD.rev = +rev || 0; PROD.origen = origen || ''; PROD.cuando = +cuando || 0; PROD.donde = donde;
  };
  if(prodWs()){
    try{
      const { data, error } = await sb.from(PROD_TABLA).select('data, rev, updated_at').eq('workspace_id', prodWs()).maybeSingle();
      if(!error && data && data.data){
        pon(data.data, data.rev, (local && local.origen) || 'DublajeCast', Date.parse(data.updated_at) || 0, 'tabla');
        PROD.cargado = true;
        try{ await idbSet(prodClaveLocal(), { datos: PROD.datos, rev: PROD.rev, origen: PROD.origen, cuando: PROD.cuando }); }catch(e){ /* sin copia */ }
        return prodResumen(PROD.datos);
      }
      if(error && !prodSinTabla(error)) fallo('produccion · js/produccion.js:prodCargar', error);
      if(!error || prodSinTabla(error)){
        const uid = await prodUid();
        if(uid){
          const r = await sb.storage.from('libretos').download(prodRutaAlmacen(uid));
          if(r && r.data){
            const paq = JSON.parse(await r.data.text());
            if(paq && paq.datos){
              pon(paq.datos, paq.rev, paq.origen, paq.cuando, 'almacen');
              PROD.cargado = true;
              try{ await idbSet(prodClaveLocal(), paq); }catch(e){ /* sin copia */ }
              return prodResumen(PROD.datos);
            }
          }
        }
      }
    }catch(e){ /* sin nube: lo del equipo */ }
  }
  if(local && local.datos){ pon(local.datos, local.rev, local.origen, local.cuando, 'equipo'); PROD.cargado = true; return prodResumen(PROD.datos); }
  PROD.cargado = true;
  return null;
}

/* ── Traer ─────────────────────────────────────────────────────────────── */

/**
 * Trae un volcado entero: lo deja como se usa aquí, lo vierte en la base y en
 * los registros, y lo guarda. `origen` dice de dónde vino. Devuelve
 * `{ resumen, efectos, guardado }`.
 */
async function prodImportar(payload, origen){
  if(!prodPuede()) throw new Error(PROD_SIN_PERMISO);
  if(!prodEsVolcado(payload)) throw new Error('eso no es un volcado de DublajeCast: no trae series, capítulos, talentos ni castings');
  PROD.datos = prodNormalizar(payload);
  PROD.origen = origen || 'DublajeCast';
  PROD.cuando = Date.now();
  PROD.cargado = true; PROD.ws = prodWs();
  const resumen = prodResumen(PROD.datos);
  const efectos = await prodAplicar(PROD.datos);
  const guardado = await prodGuardar();
  return { resumen: resumen, efectos: efectos, guardado: guardado };
}

/** Desde la nube de DublajeCast, con la sesión que la persona abrió en su panel. */
async function prodImportarDesdeDublajeCast(){
  const p = await dcLeer();
  return prodImportar(p, 'DublajeCast · ' + new Date().toLocaleDateString('es'));
}

/** Desde el archivo que exporta DublajeCast (dublajecast_backup_….json). */
async function prodImportarArchivo(file){
  const txt = await file.text();
  let p = null;
  try{ p = JSON.parse(txt); }catch(e){ throw new Error('«' + file.name + '» no es un JSON'); }
  return prodImportar(p, 'archivo ' + file.name);
}

/** Lo traído, en un JSON que DublajeCast también entiende. */
function prodExportarJson(){
  if(!PROD.datos) return null;
  return JSON.stringify(Object.assign({ _version: 'dublajecast_v2', _exportedAt: new Date().toISOString(), _de: 'Dubbipt' }, PROD.datos), null, 2);
}

/** El resumen de una importación, en un renglón. */
function prodResumenTexto(r){
  const s = r.resumen, e = r.efectos || {}, g = r.guardado || {};
  let t = '📦 Traído de DublajeCast: ' + s.series + ' programa' + (s.series === 1 ? '' : 's') + ', ' + s.episodios + ' capítulo' + (s.episodios === 1 ? '' : 's')
    + ', ' + s.talentos + ' talento' + (s.talentos === 1 ? '' : 's') + ', ' + s.castings + ' asignaciones';
  if(s.trailers) t += ', ' + s.trailers + ' tráiler' + (s.trailers === 1 ? '' : 's');
  if(e.talentosNuevos) t += ' · ' + e.talentosNuevos + ' talento' + (e.talentosNuevos === 1 ? '' : 's') + ' nuevo' + (e.talentosNuevos === 1 ? '' : 's') + ' en la base';
  if(e.registros) t += ' · ' + e.registros + ' asignaciones al registro de ' + e.programasCasados.length + ' programa' + (e.programasCasados.length === 1 ? '' : 's');
  if(e.conflictos) t += ' (' + e.conflictos + ' se respetan como estaban aquí)';
  if(e.programasSinCasar && e.programasSinCasar.length) t += ' · sin programa aquí: ' + e.programasSinCasar.slice(0, 4).join(', ') + (e.programasSinCasar.length > 4 ? '…' : '');
  if(g.donde === 'almacen') t += ' · guardado en este usuario: para compartirlo con el equipo, corre sql/mejora-03-produccion.sql una vez';
  else if(g.ok === false) t += ' · ⚠️ no se pudo guardar en la nube: ' + g.causa;
  return t;
}

/* ── El panel ──────────────────────────────────────────────────────────── */

let prodVista = 'programas', prodAbierta = null, prodBuscar = '';

function prodEsc(s){ return (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/</g, '&lt;'); }
function prodEtiqueta(mapa, k){ return (mapa && mapa[k]) || (k ? String(k) : ''); }
function prodColorAlerta(nivel){
  return nivel === 'vencida' || nivel === 'vencido' ? '#FB7185' : (nivel === 'urgente' ? '#F97316' : (nivel === 'pronto' || nivel === 'aviso' ? '#FBBF24' : (nivel === 'hecho' || nivel === 'ok' ? '#4ADE80' : '#8892a6')));
}

/** Las filas de los programas, con sus capítulos y alertas. */
function prodHtmlProgramas(d, hoy){
  const ix = prodIndices(d);
  const f = castNorm(prodBuscar);
  const series = d.series.filter(s => !f || castNorm(s.name).indexOf(f) >= 0 || castNorm(s.cliente || '').indexOf(f) >= 0)
    .sort((a, b) => (a.status === 'completo') - (b.status === 'completo') || String(a.name).localeCompare(String(b.name), 'es'));
  if(!series.length) return '<div class="meta-nota">Ningún programa' + (f ? ' con «' + prodEsc(prodBuscar) + '»' : '') + '.</div>';
  return series.map(s => {
    const eps = (ix.epsPorSerie[String(s.id)] || []).slice().sort((a, b) => (+a.episode_number || 0) - (+b.episode_number || 0));
    const alertas = []; eps.forEach(e => prodAlertasEp(e, s, hoy).forEach(a => alertas.push(Object.assign({ ep: e }, a))));
    const peor = alertas.sort((a, b) => a.dias - b.dias)[0];
    const abierta = prodAbierta === String(s.id);
    const hechos = eps.filter(e => e.status === 'completo').length;
    return '<div class="prod-prog' + (abierta ? ' abierta' : '') + '" data-id="' + prodEsc(s.id) + '">'
      + '<div class="prod-cab">'
      +   '<b>' + prodEsc(s.name) + '</b>'
      +   (s.cliente ? '<span class="prod-chip">' + prodEsc(s.cliente) + '</span>' : '')
      +   '<span class="prod-chip">' + prodEsc(prodEtiqueta(PROD_ET.estado, s.status)) + '</span>'
      +   '<span class="prod-chip">' + eps.length + ' cap.' + (hechos ? ' · ' + hechos + ' hechos' : '') + '</span>'
      +   (s.director ? '<span class="prod-chip">Dir. ' + prodEsc(s.director) + '</span>' : '')
      +   (peor ? '<span class="prod-chip" style="color:' + prodColorAlerta(peor.nivel) + ';border-color:' + prodColorAlerta(peor.nivel) + '">⚠ ' + prodEsc(peor.texto) + ' · cap. ' + prodEsc(peor.ep.episode_number) + '</span>' : '')
      +   '<span class="prod-flecha">' + (abierta ? '▾' : '▸') + '</span>'
      + '</div>'
      + (abierta
          ? '<div class="prod-eps">' + (eps.length ? eps.map(e => {
              const al = prodAlertasEp(e, s, hoy);
              const nCast = (ix.castingsPorEp[String(e.id)] || []).length;
              return '<div class="prod-ep">'
                + '<span class="prod-num">' + prodEsc(e.episode_number != null ? e.episode_number : '—') + '</span>'
                + '<span class="prod-tit">' + prodEsc(e.title || '') + '</span>'
                + '<span class="prod-chip">' + prodEsc(prodEtiqueta(PROD_ET.estado, e.status)) + '</span>'
                + (e.fase ? '<span class="prod-chip">' + prodEsc(prodEtiqueta(PROD_ET.fase, e.fase)) + '</span>' : '')
                + '<span class="prod-chip">' + prodEsc(prodFormatoDubcard(e, s)) + (e.fecha_dubcard ? ' · ' + prodEsc(e.fecha_dubcard) : '') + '</span>'
                + (e.fecha_miami ? '<span class="prod-chip">Miami ' + prodEsc(e.fecha_miami) + '</span>' : '')
                + (nCast ? '<span class="prod-chip">' + nCast + ' voces</span>' : '')
                + al.map(a => '<span class="prod-chip" style="color:' + prodColorAlerta(a.nivel) + ';border-color:' + prodColorAlerta(a.nivel) + '">' + prodEsc(a.texto) + '</span>').join('')
                + '</div>';
            }).join('') : '<div class="meta-nota">Sin capítulos.</div>') + '</div>'
          : '')
      + '</div>';
  }).join('');
}

/** Los talentos con su ficha y en qué han salido. */
function prodHtmlTalentos(d){
  const ix = prodIndices(d);
  const f = castNorm(prodBuscar);
  const papeles = {};
  d.castings.forEach(c => {
    const t = String(c.talent_id), e = ix.ep[String(c.episode_id)], s = e ? ix.serie[String(e.series_id)] : null, p = ix.char[String(c.character_id)];
    if(!s || !p) return;
    const m = (papeles[t] = papeles[t] || {});
    (m[s.name] = m[s.name] || new Set()).add(p.name);
  });
  const lista = d.talents.filter(t => t.name && (!f || castNorm(t.name).indexOf(f) >= 0)).sort((a, b) => a.name.localeCompare(b.name, 'es'));
  if(!lista.length) return '<div class="meta-nota">Ningún talento' + (f ? ' con «' + prodEsc(prodBuscar) + '»' : '') + '.</div>';
  return lista.map(t => {
    const pp = papeles[String(t.id)] || {};
    const progs = Object.keys(pp).sort((a, b) => a.localeCompare(b, 'es'));
    return '<div class="prod-tal"><div><b>' + prodEsc(t.name) + '</b>'
      + (prodFichaTexto(t) ? ' <span class="prod-ficha">' + prodEsc(prodFichaTexto(t)) + '</span>' : ' <span class="prod-ficha" style="opacity:.55">sin ficha</span>')
      + (t.email ? ' <span class="prod-ficha">' + prodEsc(t.email) + '</span>' : '') + '</div>'
      + (progs.length ? '<div class="prod-papeles">' + progs.slice(0, 6).map(n => prodEsc(n) + ': ' + prodEsc([...pp[n]].slice(0, 4).join(', ')) + (pp[n].size > 4 ? '…' : '')).join(' · ') + (progs.length > 6 ? ' · y ' + (progs.length - 6) + ' más' : '') + '</div>' : '')
      + '</div>';
  }).join('');
}

/** Los tráilers y teasers con su plazo. */
function prodHtmlTrailers(d, hoy){
  const ix = prodIndices(d);
  const lista = d.trailers.slice().map(t => Object.assign({ plazo: prodPlazo(t.deadline, t.status, hoy) }, t))
    .sort((a, b) => ((a.plazo.dias == null) - (b.plazo.dias == null)) || ((a.plazo.dias || 0) - (b.plazo.dias || 0)));
  if(!lista.length) return '<div class="meta-nota">Ningún tráiler ni teaser.</div>';
  return lista.map(t => {
    const s = ix.serie[String(t.series_id)];
    return '<div class="prod-ep">'
      + '<span class="prod-chip">' + prodEsc(t.type === 'teaser' ? 'Teaser' : 'Tráiler') + (t.etapa ? ' · ' + prodEsc(t.etapa) : '') + '</span>'
      + '<span class="prod-tit"><b>' + prodEsc(t.title || '(sin título)') + '</b>' + (s ? ' · ' + prodEsc(s.name) : '') + '</span>'
      + (t.received_at ? '<span class="prod-chip">recibido ' + prodEsc(t.received_at) + '</span>' : '')
      + (t.deadline ? '<span class="prod-chip">entrega ' + prodEsc(t.deadline) + '</span>' : '')
      + '<span class="prod-chip" style="color:' + prodColorAlerta(t.plazo.nivel) + ';border-color:' + prodColorAlerta(t.plazo.nivel) + '">' + prodEsc(t.plazo.texto) + '</span>'
      + '</div>';
  }).join('');
}

/** Lo que hay guardado y de dónde vino. */
function prodHtmlDatos(){
  const r = PROD.datos ? prodResumen(PROD.datos) : null;
  const donde = { tabla: 'en la nube del espacio de trabajo', almacen: 'en la carpeta de este usuario (la tabla «produccion» no existe todavía: corre sql/mejora-03-produccion.sql para compartirlo)', equipo: 'solo en este equipo' }[PROD.donde] || '';
  return (r
      ? '<div class="meta-nota">' + r.series + ' programas · ' + r.episodios + ' capítulos · ' + r.personajes + ' personajes · ' + r.talentos + ' talentos · '
        + r.castings + ' asignaciones · ' + r.apariciones + ' apariciones · ' + r.estudios + ' estudios · ' + r.trailers + ' tráilers · ' + r.produccion + ' filas de producción · ' + r.breakdowns + ' breakdowns'
        + (PROD.origen ? '<br>De <b>' + prodEsc(PROD.origen) + '</b>' : '') + (PROD.cuando ? ' · ' + new Date(PROD.cuando).toLocaleString('es') : '')
        + (donde ? '<br>Guardado ' + donde + '.' : '') + '</div>'
      : '<div class="meta-nota">Todavía no hay nada traído. Tráelo de DublajeCast con tu sesión, o desde el archivo que exporta (<b>dublajecast_backup_….json</b>).</div>')
    + '<div class="io-rej" style="margin-top:10px">'
    +   '<button class="io-b" id="prodTraer">⇄ Traer de DublajeCast</button>'
    +   '<button class="io-b" id="prodArchivo">⬆ Importar un JSON exportado</button>'
    +   (r ? '<button class="io-b" id="prodBajar">⬇ Exportar JSON</button>' : '')
    + '</div>'
    + '<div class="meta-nota" style="margin-top:10px">Traer vuelve a cargar todo lo de allí y lo guarda aquí. Los talentos se suman a la base; los castings van al registro de cada programa que se llame igual aquí. Lo que ya estaba repartido en Dubbipt no se pisa.</div>';
}

/** El panel de Producción: programas y capítulos con sus alertas, talentos con ficha, tráilers, y de dónde viene todo. */
async function prodPanel(){
  const viejo = document.getElementById('prodOv'); if(viejo) viejo.remove();
  if(!prodPuede()){ castAviso(PROD_SIN_PERMISO); prodPintarBoton(); return; }
  try{ await prodCargar(); }catch(e){ /* sin nube se enseña lo del equipo */ }
  const d = PROD.datos;
  const hoy = new Date();
  const pest = (k, txt) => '<button class="prod-pest' + (prodVista === k ? ' on' : '') + '" data-v="' + k + '">' + txt + '</button>';
  const r = d ? prodResumen(d) : null;
  const html = '<div class="modo-caja" role="dialog" aria-modal="true" style="max-width:860px;text-align:left">'
    + '<div class="modo-tit">Producción</div>'
    + '<div class="modo-sub" style="margin-bottom:8px">' + (r ? r.series + ' programas · ' + r.episodios + ' capítulos · ' + r.talentos + ' talentos' : 'Lo que viene de DublajeCast') + '</div>'
    + '<div class="prod-pests">' + pest('programas', '🎬 Programas') + pest('talentos', '🎭 Talentos') + pest('trailers', '🎞 Tráilers') + pest('datos', '📦 Datos') + '</div>'
    + (d && (prodVista === 'programas' || prodVista === 'talentos')
        ? '<input id="prodBuscar" type="text" placeholder="Buscar…" value="' + prodEsc(prodBuscar) + '" style="width:100%;box-sizing:border-box;background:#11131a;color:#e7ebf3;border:1px solid #2b3040;border-radius:9px;padding:8px 10px;font-size:13px;margin:8px 0">'
        : '')
    + '<div class="prod-cuerpo">'
    +   (prodVista === 'datos' || !d ? prodHtmlDatos()
         : prodVista === 'programas' ? prodHtmlProgramas(d, hoy)
         : prodVista === 'talentos' ? prodHtmlTalentos(d)
         : prodHtmlTrailers(d, hoy))
    + '</div>'
    + '<div class="dud-msg" id="prodMsg" style="min-height:18px;margin-top:8px;font-size:12.5px"></div>'
    + '<div class="dud-btns"><button class="modo-op dud-b" id="prodCerrar">Cerrar</button></div></div>';
  const ov = document.createElement('div');
  ov.id = 'prodOv'; ov.className = 'modo-cap'; ov.innerHTML = html;
  document.body.appendChild(ov);
  const cerrar = () => ov.remove();
  ov.querySelector('#prodCerrar').onclick = cerrar;
  ov.addEventListener('click', (e) => { if(e.target === ov) cerrar(); });
  const msg = (t, mal) => { const m = ov.querySelector('#prodMsg'); if(m){ m.textContent = t; m.style.color = mal ? '#ff9b9b' : '#8892a6'; } };
  ov.querySelectorAll('.prod-pest').forEach(b => { b.onclick = () => { prodVista = b.dataset.v; prodBuscar = ''; prodPanel(); }; });
  ov.querySelectorAll('.prod-cab').forEach(c => { c.onclick = () => { const id = c.parentNode.dataset.id; prodAbierta = (prodAbierta === id) ? null : id; prodPanel(); }; });
  const bus = ov.querySelector('#prodBuscar');
  if(bus) bus.oninput = () => { prodBuscar = bus.value; const pos = bus.selectionStart; prodPanel(); const b2 = document.querySelector('#prodOv #prodBuscar'); if(b2){ b2.focus(); try{ b2.setSelectionRange(pos, pos); }catch(e){ /* el cursor al final */ } } };
  const traer = ov.querySelector('#prodTraer');
  if(traer) traer.onclick = async () => {
    traer.disabled = true;
    try{
      const u = (typeof dcSesion === 'function') ? await dcSesion() : null;
      if(!u){ msg('Primero entra en DublajeCast desde «⇄ DublajeCast», en la barra de casting, y vuelve aquí.', true); traer.disabled = false; return; }
      msg('Leyendo DublajeCast…');
      const r2 = await prodImportarDesdeDublajeCast();
      castAviso(prodResumenTexto(r2));
      prodVista = 'programas'; prodPanel();
    }catch(e){ msg('No se pudo traer: ' + (e && e.message ? e.message : e), true); traer.disabled = false; }
  };
  const arch = ov.querySelector('#prodArchivo');
  if(arch) arch.onclick = () => {
    let inp = document.getElementById('prodFile');
    if(!inp){
      inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'prodFile'; inp.accept = '.json,application/json'; inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', async function(){
        const f = this.files && this.files[0]; this.value = '';
        if(!f) return;
        try{ const r2 = await prodImportarArchivo(f); castAviso(prodResumenTexto(r2)); prodVista = 'programas'; prodPanel(); }
        catch(e){ castAviso('⚠️ No se pudo importar: ' + (e && e.message ? e.message : e)); }
      });
    }
    inp.click();
  };
  const bajar = ov.querySelector('#prodBajar');
  if(bajar) bajar.onclick = () => {
    const txt = prodExportarJson(); if(!txt) return;
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([txt], { type: 'application/json' }));
    a.download = 'dublajecast_backup_' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };
  return ov;
}

/* ═══ FIN DE PRODUCCIÓN ════════════════════════════════════════════════════ */
