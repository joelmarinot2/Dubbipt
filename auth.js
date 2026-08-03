/* ============================================================
 *  auth.js · Módulo de Autenticación (Login + Registro + guarda de ruta)
 *  Reemplaza el ingreso por estudio/anónimo por cuentas reales.
 *
 *  Requiere:  window.SUPA (de config.js) y el SDK de Supabase ya cargado
 *             (<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>)
 *
 *  Uso en index.html (ver README):
 *      <script src="./config.js"></script>
 *      <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
 *      <script src="./auth.js"></script>
 *      ...
 *      DDLAuth.onReady((user) => bootApp(user));   // arranca la app YA autenticado
 * ============================================================ */
(function () {
  'use strict';

  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const MIN_PASS = 8;

  // Si el SDK de Supabase o la config no cargaron, no revientes en silencio:
  // define un DDLAuth inerte para que index.html muestre el motivo en pantalla.
  if (!window.supabase || !window.SUPA) {
    window.DDLAuth = { onReady() {}, _error: 'Falta window.supabase o window.SUPA' };
    console.error('[auth] No se puede iniciar:', window.DDLAuth._error);
    return;
  }

  // Cliente propio para el login (se expone como window.sb para el resto de la app).
  const sb = window.supabase.createClient(window.SUPA.url, window.SUPA.anonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  window.sb = sb;

  let readyCb = null;
  let booted = false;

  const DDLAuth = {
    client: sb,
    user: null,
    profile: null,
    onReady(cb) { readyCb = cb; return DDLAuth; },
    async signOut() {
      await sb.auth.signOut();
      location.reload();
    }
  };
  window.DDLAuth = DDLAuth;

  /* ---------- estilos mínimos (reutiliza tu paleta) ---------- */
  const css = `
  #authGate{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;padding:20px;
    background:radial-gradient(1100px 560px at 80% -10%,rgba(167,139,250,.14),transparent 60%),#150F30}
  #authGate .card{width:100%;max-width:390px;background:#1E1740;border:1px solid #3a2f6b;
    border-radius:16px;padding:26px 24px 22px;box-shadow:0 24px 60px rgba(0,0,0,.45)}
  #authGate .brand{display:flex;align-items:center;gap:12px;margin-bottom:18px}
  #authGate .mk{width:40px;height:40px;border-radius:11px;display:grid;place-items:center;
    background:linear-gradient(135deg,#A78BFA,#7C5CE0);color:#160f33;font-weight:700;
    font-family:'Space Grotesk',sans-serif}
  #authGate h2{font-family:'Space Grotesk',sans-serif;font-size:18px;color:#EFECFB}
  #authGate .tabs{display:flex;gap:6px;background:#191238;border:1px solid #2c2358;border-radius:11px;
    padding:4px;margin-bottom:16px}
  #authGate .tabs button{flex:1;border:0;background:transparent;color:#B4ADD9;padding:9px;border-radius:8px;
    font-family:'Space Grotesk',sans-serif;font-weight:600;cursor:pointer;font-size:13.5px}
  #authGate .tabs button.on{background:#2E2560;color:#EFECFB}
  #authGate label{display:block;font-size:12px;color:#B4ADD9;margin:12px 0 5px}
  #authGate input{width:100%;background:#191238;border:1px solid #2c2358;border-radius:10px;
    padding:11px 13px;color:#EFECFB;font-family:'Inter',sans-serif;font-size:14px;outline:none}
  #authGate input:focus{border-color:#A78BFA}
  #authGate .go{width:100%;margin-top:18px;border:0;border-radius:11px;padding:12px;cursor:pointer;
    background:linear-gradient(135deg,#A78BFA,#7C5CE0);color:#160f33;font-weight:700;
    font-family:'Space Grotesk',sans-serif;font-size:14px}
  #authGate .go:disabled{opacity:.6;cursor:default}
  #authGate .msg{margin-top:12px;font-size:12.5px;min-height:16px}
  #authGate .msg.err{color:#F472B6}
  #authGate .msg.ok{color:#4ADE80}
  #authGate .hint{color:#7d76a8;font-size:11.5px;margin-top:8px;line-height:1.5}
  .authOut{position:fixed;top:12px;right:12px;z-index:50;background:#1E1740;border:1px solid #3a2f6b;
    color:#B4ADD9;border-radius:10px;padding:7px 11px;font-size:12px;cursor:pointer;font-family:'Space Grotesk',sans-serif}
  .authOut:hover{color:#EFECFB;border-color:#A78BFA}`;
  const style = document.createElement('style'); style.textContent = css; document.head.appendChild(style);

  /* ---------- UI del gate ---------- */
  function renderGate() {
    let g = document.getElementById('authGate');
    if (g) return g;
    g = document.createElement('div');
    g.id = 'authGate';
    g.innerHTML = `
      <div class="card">
        <div class="brand"><div class="mk">DD</div><h2>Desglose Digital</h2></div>
        <div class="tabs">
          <button id="tabLogin" class="on">Entrar</button>
          <button id="tabReg">Crear cuenta</button>
        </div>

        <div id="paneLogin">
          <label>Correo</label>
          <input id="aEmail" type="email" autocomplete="username" placeholder="tu@estudio.com">
          <label>Contraseña</label>
          <input id="aPass" type="password" autocomplete="current-password" placeholder="········">
          <button id="btnLogin" class="go">Entrar</button>
        </div>

        <div id="paneReg" style="display:none">
          <label>Nombre</label>
          <input id="rName" type="text" placeholder="Tu nombre">
          <label>Correo</label>
          <input id="rEmail" type="email" autocomplete="username" placeholder="tu@estudio.com">
          <label>Contraseña <span style="opacity:.6">(mín. ${MIN_PASS})</span></label>
          <input id="rPass" type="password" autocomplete="new-password" placeholder="········">
          <button id="btnReg" class="go">Crear cuenta</button>
          <p class="hint">Al registrarte entras como <b>miembro</b>. Un administrador puede
             elevarte a <i>casting</i> o <i>admin</i> desde Supabase.</p>
        </div>

        <div class="msg" id="aMsg"></div>
      </div>`;
    document.body.appendChild(g);

    const $ = (id) => g.querySelector('#' + id);
    const msg = (t, cls) => { const m = $('aMsg'); m.textContent = t || ''; m.className = 'msg ' + (cls || ''); };
    const show = (login) => {
      $('paneLogin').style.display = login ? '' : 'none';
      $('paneReg').style.display = login ? 'none' : '';
      $('tabLogin').classList.toggle('on', login);
      $('tabReg').classList.toggle('on', !login);
      msg('');
    };
    $('tabLogin').onclick = () => show(true);
    $('tabReg').onclick = () => show(false);

    // ---- validación de cliente ----
    function validate(email, pass, name) {
      if (name !== undefined && !name.trim()) return 'Escribe tu nombre.';
      if (!EMAIL_RE.test(email)) return 'Correo no válido.';
      if ((pass || '').length < MIN_PASS) return `La contraseña debe tener al menos ${MIN_PASS} caracteres.`;
      return null;
    }

    // ---- Login ----
    $('btnLogin').onclick = async () => {
      const email = $('aEmail').value.trim(), pass = $('aPass').value;
      const bad = validate(email, pass);
      if (bad) return msg(bad, 'err');
      const btn = $('btnLogin'); btn.disabled = true; btn.textContent = 'Entrando…';
      const { error } = await sb.auth.signInWithPassword({ email, password: pass });
      btn.disabled = false; btn.textContent = 'Entrar';
      if (error) return msg(traducir(error.message), 'err');
      // el listener onAuthStateChange se encarga de arrancar la app
    };
    $('aPass').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('btnLogin').click(); });

    // ---- Registro ----
    $('btnReg').onclick = async () => {
      const name = $('rName').value, email = $('rEmail').value.trim(), pass = $('rPass').value;
      const bad = validate(email, pass, name);
      if (bad) return msg(bad, 'err');
      const btn = $('btnReg'); btn.disabled = true; btn.textContent = 'Creando…';
      const { data, error } = await sb.auth.signUp({
        email, password: pass,
        options: { data: { full_name: name.trim(), role: 'member' } }
      });
      btn.disabled = false; btn.textContent = 'Crear cuenta';
      if (error) return msg(traducir(error.message), 'err');
      if (data.session) { msg('Cuenta creada ✓', 'ok'); }      // auto-confirm activo → entra solo
      else { msg('Revisa tu correo para confirmar la cuenta.', 'ok'); } // si pides confirmación por email
    };
    return g;
  }

  function traducir(m) {
    m = (m || '').toLowerCase();
    if (m.includes('invalid login')) return 'Correo o contraseña incorrectos.';
    if (m.includes('already registered')) return 'Ese correo ya tiene cuenta. Inicia sesión.';
    if (m.includes('password should be')) return `La contraseña debe tener al menos ${MIN_PASS} caracteres.`;
    if (m.includes('email not confirmed')) return 'Confirma tu correo antes de entrar.';
    if (m.includes('rate limit')) return 'Demasiados intentos. Espera un momento.';
    return 'No se pudo completar. ' + (m || '');
  }

  function removeGate() { const g = document.getElementById('authGate'); if (g) g.remove(); }

  function addSignOut() {
    if (document.querySelector('.authOut')) return;
    const b = document.createElement('button');
    b.className = 'authOut'; b.textContent = '⏻ Salir';
    b.onclick = () => DDLAuth.signOut();
    document.body.appendChild(b);
  }

  async function loadProfile(user) {
    try {
      const { data } = await sb.from('profiles').select('*').eq('id', user.id).single();
      return data || null;
    } catch (e) { return null; }
  }

  /* ---------- guarda de ruta: nada arranca sin sesión ---------- */
  async function gate(session) {
    if (!session || !session.user) {
      booted = false;
      DDLAuth.user = null; DDLAuth.profile = null;
      const g = document.querySelector('.authOut'); if (g) g.remove();
      renderGate();
      return;
    }
    // hay sesión válida
    DDLAuth.user = session.user;
    DDLAuth.profile = await loadProfile(session.user);
    removeGate();
    addSignOut();
    if (!booted) {
      booted = true;
      if (typeof readyCb === 'function') readyCb(session.user, DDLAuth.profile);
    }
  }

  // Reacciona a login/logout/refresh de token.
  sb.auth.onAuthStateChange((_evt, session) => gate(session));

  // Estado inicial al cargar la página.
  (async () => {
    const { data: { session } } = await sb.auth.getSession();
    gate(session);
  })();
})();
