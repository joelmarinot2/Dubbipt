/* La salud del servidor · especificacion 06, SYN-18 y SYN-19
 *
 * Lo que pasó en sala (8 de octubre de 2026): el servidor de Supabase del
 * proyecto se quedó sin memoria (instancia NANO, 434 MB usados de ~512 y
 * 1,08 GB comprometidos), lo marcó «Unhealthy» y nadie podía entrar. Y cada
 * pantalla abierta de Dubbipt reintentaba conectarse cada 2-4 segundos, sin
 * parar: 391 errores de Realtime en la última hora, que solo empeoraban.
 *
 * Esto vigila: cuando las respuestas del servidor son suyas -5xx, tiempo
 * agotado, gateway- dos veces seguidas, Dubbipt
 *   · deja de insistir: lo de fondo (refrescar la biblioteca, reconectar lo
 *     en vivo) se para mientras tanto (saludPausa);
 *   · lo dice con un aviso, sin asustar: lo que se haga se queda en este
 *     equipo y se sube al volver;
 *   · lo vuelve a probar solo, cada vez más espaciado (15 s, 30 s, 1 min…
 *     hasta 5 min), con una consulta mínima;
 *   · al volver, quita el aviso, lo dice y se pone al día una vez.
 * Un fallo de la red de ESTE equipo (sin conexión) no es del servidor: de
 * eso ya se ocupa el modo sin conexión.
 *
 * De donde depende: window.SUPA, DDL_UI, libAutoRefresh, _libAutoAt.
 */

/* ═══ LA SALUD DEL SERVIDOR ══════════════════════════════════════════════ */

const SALUD = { mal: false, fallos: 0, intento: 0, desde: 0, proxima: 0, prueba: null };
const SALUD_UMBRAL = 2;              // fallos del servidor seguidos para darlo por caído
const SALUD_TOPE_MS = 300000;        // como mucho, una prueba cada 5 minutos

/** ¿Este fallo es del servidor y no de la red de este equipo ni de un permiso? `r` es un error o una respuesta. */
function saludEsDelServidor(r){
  if(!r) return false;
  const st = +(r.status || (r.error && r.error.status) || 0);
  if(st >= 500) return true;
  if(st && st < 500) return false;
  const enLinea = (typeof navigator === 'undefined' || navigator.onLine !== false);
  const m = String(r.message || (r.error && r.error.message) || (typeof r === 'string' ? r : '')).toLowerCase();
  if(/gateway|time-?out|timed out|upstream|service unavailable|bad gateway|\b5\d\d\b/.test(m)) return true;
  return enLinea && /failed to fetch|networkerror|load failed|fetch failed/.test(m);
}

/** Cuánto esperar antes de la prueba número `n`: 15 s, 30 s, 1 min… hasta 5 min. */
function saludEspera(n){
  return Math.min(SALUD_TOPE_MS, 15000 * Math.pow(2, Math.max(0, (Math.floor(+n) || 1) - 1)));
}

/** Lo que devolvió una llamada: si es un fallo del servidor cuenta; si salió bien, el servidor está bien. */
function saludNota(r){
  if(saludEsDelServidor(r) || (r && r.error && saludEsDelServidor(r.error))) return saludFallo();
  if(r && !r.error && !(+r.status >= 500)) saludBien();
  return SALUD.mal;
}

function saludFallo(){
  SALUD.fallos++;
  if(!SALUD.mal && SALUD.fallos >= SALUD_UMBRAL){
    SALUD.mal = true; SALUD.desde = Date.now(); SALUD.intento = 0;
    saludProgramar();
  }
  return SALUD.mal;
}

function saludBien(){
  SALUD.fallos = 0;
  if(!SALUD.mal) return false;
  SALUD.mal = false; SALUD.intento = 0; SALUD.proxima = 0;
  clearTimeout(SALUD.prueba); SALUD.prueba = null;
  saludPintar();
  try{ if(typeof DDL_UI !== 'undefined' && DDL_UI.toast) DDL_UI.toast('El servidor vuelve a responder'); }catch(e){ /* sin aviso, igual */ }
  try{ if(typeof libAutoRefresh === 'function'){ if(typeof _libAutoAt !== 'undefined') _libAutoAt = 0; libAutoRefresh(); } }catch(e){ /* se pondrá al día en el siguiente repaso */ }
  return true;
}

/** ¿Hay que dejar de insistir con lo de fondo? */
function saludPausa(){ return SALUD.mal; }

function saludProgramar(){
  clearTimeout(SALUD.prueba);
  SALUD.intento++;
  const ms = saludEspera(SALUD.intento);
  SALUD.proxima = Date.now() + ms;
  SALUD.prueba = setTimeout(saludProbar, ms);
  saludPintar();
}

/** Una prueba mínima: ¿contesta el inicio de sesión y la base de datos? */
async function saludSano(){
  const cfg = (typeof window !== 'undefined' && window.SUPA) || {};
  if(!cfg.url || !cfg.anonKey) return false;
  const pedir = async (ruta) => {
    const ctl = (typeof AbortController === 'function') ? new AbortController() : null;
    const t = ctl ? setTimeout(() => ctl.abort(), 12000) : null;
    try{ return await fetch(cfg.url + ruta, { headers: { apikey: cfg.anonKey, Authorization: 'Bearer ' + cfg.anonKey }, signal: ctl ? ctl.signal : undefined, cache: 'no-store' }); }
    finally{ if(t) clearTimeout(t); }
  };
  try{
    const a = await pedir('/auth/v1/health');
    if(!a || !a.ok) return false;
    const b = await pedir('/rest/v1/shows?select=id&limit=1');
    return !!b && b.status < 500;
  }catch(e){ return false; }
}

async function saludProbar(){
  SALUD.prueba = null;
  if(await saludSano()) saludBien();
  else if(SALUD.mal) saludProgramar();
  return !SALUD.mal;
}

/** El aviso: abajo, encima de todo, sin tapar el trabajo. */
function saludPintar(){
  if(typeof document === 'undefined') return;
  let el = document.getElementById('saludAviso');
  if(!SALUD.mal){ if(el) el.remove(); return; }
  if(!el){
    el = document.createElement('div');
    el.id = 'saludAviso'; el.className = 'ddl-encima salud-aviso'; el.setAttribute('role', 'status');
    document.body.appendChild(el);
  }
  const s = Math.max(0, Math.round((SALUD.proxima - Date.now()) / 1000));
  const cuando = s >= 60 ? Math.round(s / 60) + ' min' : s + ' s';
  el.innerHTML = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l10 18H2z"/><path d="M12 10v4"/><path d="M12 17.5v.01"/></svg>'
    + '<span><b>El servidor de Dubbipt no responde ahora mismo.</b> Lo que hagas se queda en este equipo y se sube cuando vuelva. Se vuelve a probar en ' + cuando + '.</span>'
    + '<button type="button" id="saludProbar">Probar ahora</button>';
  const b = el.querySelector('#saludProbar');
  if(b) b.onclick = async () => { b.disabled = true; b.textContent = 'Probando…'; clearTimeout(SALUD.prueba); if(!(await saludProbar())){ b.disabled = false; b.textContent = 'Probar ahora'; } };
}

/* ═══ FIN DE LA SALUD DEL SERVIDOR ═══ */
