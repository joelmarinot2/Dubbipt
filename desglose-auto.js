/* ============================================================
 *  desglose-auto.js · Motor de DESGLOSE AUTOMÁTICO de personajes
 *  Entrada:  un guion .pdf (pdf.js) o .docx (mammoth.js)
 *  Salida:   personajes + intervenciones + páginas + escenas,
 *            en una vista editable, lista para guardar en Supabase.
 *
 *  Reemplaza el flujo manual «Subir desglose (.xlsm)».
 *
 *  Requiere en index.html:
 *    <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js"></script>
 *    <script src="https://cdn.jsdelivr.net/npm/mammoth@1.7.2/mammoth.browser.min.js"></script>
 *    <script src="./desglose-auto.js"></script>
 *
 *  API:
 *    const r = await DDLDesglose.fromFile(file, { onProgress });
 *                                                    // {chars, script, scenes, numPages, fullText, sourceType}
 *    DDLDesglose.renderReview(r, { mount, onSave });  // pinta la vista editable
 *    await DDLDesglose.save(episodeId, r, { scriptId });
 *
 *  Flujo recomendado con feedback de carga (ver auditoría UX §02):
 *    DDLDesglose.runWithUI(file, { mount, onSave });
 *      → pinta de inmediato una barra de progreso + filas skeleton en `mount`,
 *        va actualizando "Analizando página X de Y" mientras procesa el guion,
 *        y sustituye por la tabla editable en cuanto hay resultado.
 *      → si hay llmEndpoint configurado, el refinado corre DESPUÉS en segundo
 *        plano (con un indicador secundario) sin bloquear la edición manual.
 *
 *  Opcional (refinado con LLM): DDLDesglose.config.llmEndpoint = '/api/refinar';
 *    Si lo defines, se hace POST {full_text} y se espera JSON
 *    { characters:[{name, talent}] } para fusionar/normalizar nombres.
 *    Sin endpoint, el motor funciona 100% con reglas (sin claves ni costo).
 * ============================================================ */
(function () {
  'use strict';

  const cfg = { llmEndpoint: null };

  // ---------- utilidades ----------
  const TC_RE   = /^\s*\d{1,2}\s*[:;.]\s*\d{2}([:;.]\d{1,2}){0,2}/;      // 01:07, 01:07:15:03
  const SCENE_RE = /^\s*(?:\d+[\s.\-]*)?(INT\.?\/EXT\.?|INT\.?|EXT\.?|EST\.?|ESCENA|SCENE|SEQ(?:UENCE|UENCIA)?)\b[\s.:\-]/i;
  const PARENS  = /\s*[\(\[][^)\]]*[\)\]]\s*$/;   // "(V.O.)" "(OFF)" "[CONT'D]" al final
  const NO_REC  = new Set(['ORIGINAL', 'TODOS', 'X', 'N/A', 'NA', 'AMBIENTE', 'INSERTO']);
  const PALETTE = ['#A78BFA','#3FD0EE','#F0A35E','#F472B6','#4ADE80','#FACC15','#60A5FA','#FB7185'];

  function normChar(ch) { const d = ch.normalize('NFD'); return (d[0] || ch).toUpperCase(); }
  function norm(s) { let r = ''; for (const ch of String(s || '')) r += normChar(ch); return r.replace(/[^A-Z0-9 ]/g, '').replace(/\s+/g, ' ').trim(); }
  function charColor(name) { let h = 0; const s = String(name || ''); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return PALETTE[h % PALETTE.length]; }
  function esc(s) { return String(s).replace(/[&<>"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[m])); }
  function emit(onProgress, patch) { if (typeof onProgress === 'function') { try { onProgress(patch); } catch (e) { /* silencioso: un listener roto no debe tumbar el motor */ } } }

  // mapea errores técnicos (Supabase / red / PDF) a mensajes en español con una acción clara
  function friendlyError(err) {
    const raw = (err && (err.message || err.error_description || err.details)) || String(err || '');
    const m = raw.toLowerCase();
    if (m.includes('duplicate key') || m.includes('unique constraint')) return 'Ya existe un registro igual — puede que esto ya se haya guardado antes. Actualiza la página e inténtalo de nuevo.';
    if (m.includes('row-level security') || m.includes('permission denied') || m.includes('rls')) return 'No tienes permiso para guardar este cambio. Revisa tu sesión o pide acceso al administrador.';
    if (m.includes('jwt') || m.includes('session') || m.includes('not authenticated') || m.includes('401')) return 'Tu sesión expiró. Vuelve a iniciar sesión e inténtalo de nuevo.';
    if (m.includes('rate limit') || m.includes('429')) return 'Demasiados intentos seguidos. Espera un momento y vuelve a intentar.';
    if (m.includes('failed to fetch') || m.includes('networkerror') || m.includes('offline')) return 'No se pudo conectar — revisa tu conexión a internet y vuelve a intentar.';
    return 'No se pudo guardar el desglose. Vuelve a intentar; si el problema sigue, contacta a soporte.';
  }

  // ---------- 1) EXTRACCIÓN DE TEXTO ----------
  // PDF → líneas con número de página (reagrupando fragmentos por baseline).
  async function extractPdf(buf, onProgress) {
    const doc = await pdfjsLib.getDocument({
      data: buf,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true
    }).promise;
    const numPages = doc.numPages;
    const lines = [];      // {text, page}
    for (let p = 1; p <= numPages; p++) {
      emit(onProgress, { stage: 'extract', current: p, total: numPages, label: 'Leyendo página' });
      const tc = await doc.getPage(p).then(pg => pg.getTextContent());
      const groups = new Map();
      tc.items.forEach(it => {
        const y = it.transform[5], k = Math.round(y / 3);
        let g = groups.get(k); if (!g) { g = { y, items: [] }; groups.set(k, g); }
        g.items.push(it);
      });
      [...groups.values()].sort((a, b) => b.y - a.y).forEach(g => {
        g.items.sort((a, b) => a.transform[4] - b.transform[4]);
        const text = g.items.map(i => i.str).join(' ').replace(/\s+/g, ' ').trim();
        if (text) lines.push({ text, page: p });
      });
    }
    return { lines, numPages, fullText: lines.map(l => l.text).join('\n') };
  }

  // DOCX → párrafos. Word no tiene "páginas" reales: estimamos ~1800 chars/página.
  // mammoth no reporta avance por página, así que marcamos "indeterminado" mientras convierte.
  async function extractDocx(buf, onProgress) {
    emit(onProgress, { stage: 'extract', indeterminate: true, label: 'Leyendo documento de Word…' });
    const { value: html } = await mammoth.convertToHtml({ arrayBuffer: buf });
    const div = document.createElement('div'); div.innerHTML = html;
    const lines = []; let chars = 0;
    div.querySelectorAll('p, h1, h2, h3, li').forEach(el => {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim();
      if (!text) return;
      chars += text.length + 1;
      lines.push({ text, page: Math.max(1, Math.ceil(chars / 1800)) });
    });
    const numPages = lines.length ? lines[lines.length - 1].page : 1;
    emit(onProgress, { stage: 'extract', current: numPages, total: numPages, label: 'Leyendo página' });
    return { lines, numPages, fullText: lines.map(l => l.text).join('\n') };
  }

  // ---------- 2) DETECCIÓN DE CABECERAS / ESCENAS ----------
  function boilerplate(lines) {
    // renglones cortos que se repiten en muchas páginas = encabezado/pie
    const freq = new Map(), pages = new Set();
    for (const l of lines) {
      pages.add(l.page);
      if (l.text.length > 60) continue;
      freq.set(l.text, (freq.get(l.text) || 0) + 1);
    }
    const min = Math.max(3, Math.ceil(pages.size * 0.6));
    const set = new Set();
    for (const [t, c] of freq) if (c >= min) set.add(t);
    return set;
  }

  // ¿esta línea abre el parlamento de un personaje?  → devuelve {name, dialogue} o null
  function cueOf(text) {
    if (TC_RE.test(text) || SCENE_RE.test(text)) return null;
    const colon = text.search(/[:：]/);
    let head = colon >= 0 ? text.slice(0, colon) : text;
    let dialogue = colon >= 0 ? text.slice(colon + 1).trim() : '';
    head = head.replace(PARENS, '').trim();               // quita "(V.O.)" final
    if (head.length < 2 || head.length > 48) return null;
    if (!/[A-ZÁÉÍÓÚÜÑ]/.test(head)) return null;
    // el nombre debe ir en MAYÚSCULAS (los diálogos normales, no)
    if (head !== head.toUpperCase()) return null;
    // sin dos puntos, exige que TODA la línea sea el nombre (pocas palabras),
    // así "HOLA, ¿CÓMO ESTÁS?" gritado en un diálogo no se confunde con cabecera
    if (colon < 0) {
      const words = head.split(/\s+/).filter(Boolean);
      if (words.length > 6) return null;
      if (/[.!?¡¿]/.test(head)) return null;
    }
    return { name: head.trim(), dialogue };
  }

  function sceneOf(text, counter) {
    if (!SCENE_RE.test(text)) return null;
    const label = text.replace(/\s+/g, ' ').trim().slice(0, 80);
    return { id: counter, label };
  }

  // ---------- 3) MOTOR: líneas → personajes + script ----------
  function analyze(lines, numPages) {
    const skip = boilerplate(lines);
    const scenes = [];
    let scnCounter = 0, curScene = null, cur = null;
    const script = [];                       // bloques de intervención
    const byKey = {};                        // key → personaje agregado

    for (const l of lines) {
      const t = l.text;
      if (!t || skip.has(t)) continue;

      const scn = sceneOf(t, scnCounter);
      if (scn) { scnCounter++; curScene = scn; scenes.push({ id: scn.id, label: scn.label, page: l.page }); continue; }

      const cue = cueOf(t);
      if (cue) {
        const key = norm(cue.name);
        if (!key) { if (cur) cur.lines.push(t); continue; }
        cur = { idx: script.length, key, display: cue.name.trim(), page: l.page, scene: curScene ? curScene.id : null, lines: [] };
        if (cue.dialogue) cur.lines.push(cue.dialogue);
        script.push(cur);

        const c = byKey[key] || (byKey[key] = {
          key, display: cur.display, talent: '', variants: new Set([cur.display]),
          pageMap: new Map(), scenes: new Set(), totalInts: 0
        });
        c.variants.add(cur.display);
        c.pageMap.set(l.page, (c.pageMap.get(l.page) || 0) + 1);
        if (curScene) c.scenes.add(curScene.id);
        c.totalInts++;
        continue;
      }
      if (cur) cur.lines.push(t);            // diálogo que continúa
    }

    // consolidar personajes a la forma que ya usa la app
    const chars = Object.values(byKey).map(c => {
      const pages = [...c.pageMap.entries()].sort((a, b) => a[0] - b[0]).map(([p, ints]) => ({ p, ints }));
      return {
        key: c.key,
        display: [...c.variants].sort((a, b) => a.length - b.length)[0], // variante más corta y limpia
        talent: '',
        pages,
        scenes: [...c.scenes].sort((a, b) => a - b),
        totalInts: c.totalInts,
        noRec: NO_REC.has(c.key),
        color: charColor(c.key)
      };
    }).sort((a, b) => b.totalInts - a.totalInts || a.display.localeCompare(b.display, 'es'));

    return { chars, script, scenes, numPages };
  }

  // ---------- 4) (opcional) refinado con LLM ----------
  async function refineWithLLM(result, fullText, onProgress) {
    if (!cfg.llmEndpoint) return result;
    emit(onProgress, { stage: 'refine', indeterminate: true, label: 'Afinando nombres con IA…' });
    try {
      const res = await fetch(cfg.llmEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ full_text: fullText.slice(0, 60000) })
      });
      const j = await res.json();                 // { characters:[{name, talent}] }
      if (!j || !Array.isArray(j.characters)) return result;
      // el LLM solo normaliza nombres/talentos; los conteos/páginas siguen siendo del parser
      const byNorm = {}; result.chars.forEach(c => byNorm[c.key] = c);
      j.characters.forEach(ch => {
        const k = norm(ch.name); const c = byNorm[k];
        if (c) { if (ch.name) c.display = ch.name; if (ch.talent) c.talent = ch.talent; }
      });
    } catch (e) { console.warn('[desglose] LLM no disponible, se usa solo el parser:', e.message); }
    emit(onProgress, { stage: 'refine', done: true });
    return result;
  }

  // ---------- 5) API pública: extracción + análisis completos ----------
  async function fromFile(file, opts) {
    opts = opts || {};
    const onProgress = opts.onProgress;
    const buf = await file.arrayBuffer();
    const isDocx = /\.docx$/i.test(file.name) || file.type.includes('word');
    const src = isDocx ? await extractDocx(buf, onProgress) : await extractPdf(buf.slice(0), onProgress);
    emit(onProgress, { stage: 'analyze', indeterminate: true, label: 'Detectando personajes…' });
    let result = analyze(src.lines, src.numPages);
    emit(onProgress, { stage: 'analyze', done: true });
    result.fullText = src.fullText;
    result.sourceType = isDocx ? 'docx' : 'pdf';
    result.name = file.name;
    result = await refineWithLLM(result, src.fullText, onProgress);
    return result;
  }

  // ---------- 6) UI compartida: toasts + modal de confirmación ----------
  const UI = (function () {
    let toastBox = null;
    function box() {
      if (toastBox && document.body.contains(toastBox)) return toastBox;
      toastBox = document.createElement('div');
      toastBox.setAttribute('role', 'status');
      toastBox.setAttribute('aria-live', 'polite');
      toastBox.style.cssText = 'position:fixed;top:14px;right:14px;z-index:11000;display:flex;flex-direction:column;gap:8px;max-width:340px;font-family:Inter,sans-serif';
      document.body.appendChild(toastBox);
      return toastBox;
    }
    function toast(msg, opt) {
      opt = opt || {};
      const el = document.createElement('div');
      el.style.cssText = 'animation:ddlrevToastIn .2s ease-out;background:#191c20;border:1px solid #2c3036;border-left:3px solid ' +
        (opt.err ? '#F472B6' : '#4ADE80') + ';border-radius:8px;padding:11px 13px;display:flex;align-items:center;gap:10px;' +
        'box-shadow:0 8px 24px rgba(0,0,0,.4);color:#f2f3f5;font-size:13px';
      el.innerHTML = '<span>' + (opt.err ? '⚠️' : '✓') + '</span><span style="flex:1;line-height:1.4">' + esc(msg) + '</span>';
      if (opt.actionLabel) {
        const b = document.createElement('button');
        b.textContent = opt.actionLabel;
        b.style.cssText = 'background:transparent;border:1px solid #3a3f46;color:#c7c9cd;font-size:12px;font-weight:600;padding:5px 10px;border-radius:6px;cursor:pointer';
        b.onclick = () => { try { if (typeof opt.onAction === 'function') opt.onAction(); } finally { el.remove(); } };
        el.appendChild(b);
      }
      box().appendChild(el);
      setTimeout(() => { if (el.parentNode) el.remove(); }, opt.duration || (opt.actionLabel ? 5500 : 3800));
    }
    function confirmModal(cfg2) {
      cfg2 = cfg2 || {};
      return new Promise((resolve) => {
        const ov = document.createElement('div');
        ov.style.cssText = 'position:fixed;inset:0;z-index:11500;background:rgba(8,9,11,.7);backdrop-filter:blur(3px);display:flex;align-items:center;justify-content:center;padding:20px;font-family:Inter,sans-serif';
        const itemsHtml = (cfg2.items || []).map(it =>
          '<div style="display:flex;justify-content:space-between;align-items:center;background:#1c1e22;border-radius:8px;padding:9px 12px;font-size:13px;color:#f2f3f5;margin-bottom:6px">' +
          '<span>' + esc(it.label) + (it.meta ? '<small style="color:#6b7280;margin-left:6px">· ' + esc(it.meta) + '</small>' : '') + '</span>' +
          (it.onCancel ? '<button type="button" data-cancel-idx="' + it.idx + '" style="background:transparent;border:1px solid #3a3f46;color:#c7c9cd;font-size:11px;padding:4px 9px;border-radius:6px;cursor:pointer">Cancelar</button>' : '') +
          '</div>').join('');
        ov.innerHTML =
          '<div role="alertdialog" aria-modal="true" style="width:min(420px,94vw);background:#15171a;border:1px solid #2c3036;border-radius:12px;padding:22px">' +
          '<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px"><span style="font-size:18px;color:#FBBF24">⚠</span>' +
          '<span style="font-size:15px;font-weight:700;color:#f2f3f5">' + esc(cfg2.title || 'Confirmar') + '</span></div>' +
          (cfg2.body ? '<p style="font-size:12.5px;color:#9CA3AF;line-height:1.5;margin:0 0 16px">' + esc(cfg2.body) + '</p>' : '') +
          (itemsHtml ? '<div style="max-height:220px;overflow:auto;margin-bottom:16px">' + itemsHtml + '</div>' : '') +
          '<div style="display:flex;justify-content:flex-end;gap:10px">' +
          '<button type="button" class="ddlrev-cf-cancel" style="background:transparent;border:1px solid #3a3f46;color:#c7c9cd;font-size:13px;font-weight:600;padding:9px 16px;border-radius:8px;cursor:pointer">' + esc(cfg2.cancelLabel || 'Cancelar') + '</button>' +
          '<button type="button" class="ddlrev-cf-go" style="background:' + (cfg2.danger ? '#F43F5E' : '#22C55E') + ';border:none;color:' + (cfg2.danger ? '#2b0410' : '#06210f') + ';font-size:13px;font-weight:700;padding:9px 16px;border-radius:8px;cursor:pointer">' + esc(cfg2.confirmLabel || 'Confirmar') + '</button>' +
          '</div></div>';
        document.body.appendChild(ov);
        const done = (v) => { ov.remove(); resolve(v); };
        ov.addEventListener('click', (e) => { if (e.target === ov) done(false); });
        ov.querySelector('.ddlrev-cf-cancel').onclick = () => done(false);
        ov.querySelector('.ddlrev-cf-go').onclick = () => done(true);
        ov.addEventListener('keydown', (e) => { if (e.key === 'Escape') done(false); });
        if (cfg2.onItemCancel) {
          ov.querySelectorAll('[data-cancel-idx]').forEach(btn => {
            btn.addEventListener('click', () => { cfg2.onItemCancel(+btn.dataset.cancelIdx); btn.closest('div').remove(); });
          });
        }
        const goBtn = ov.querySelector('.ddlrev-cf-go'); if (goBtn) goBtn.focus();
      });
    }
    return { toast, confirmModal };
  })();

  // ---------- 7) VISTA EDITABLE (con skeleton, progreso, toasts y confirmaciones) ----------
  function renderReview(result, opts) {
    opts = opts || {};
    const mount = opts.mount || document.body;
    const rows = result.chars;
    rows.forEach(c => { if (c._origDisplay === undefined) c._origDisplay = c.display; }); // para "Cancelar" por fila en la fusión

    const total = rows.reduce((s, c) => s + c.totalInts, 0);
    const wrap = document.createElement('div');
    wrap.className = 'ddlrev';
    wrap.innerHTML = `
      <style>
      @keyframes ddlrevToastIn{from{transform:translateY(-10px);opacity:0}to{transform:translateY(0);opacity:1}}
      .ddlrev{background:#15171a;border:1px solid #23262b;border-radius:14px;padding:16px;margin:14px 0;font-family:'Inter',sans-serif}
      .ddlrev .rh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
      .ddlrev .rh h3{font-family:'Inter',sans-serif;font-weight:700;color:#f2f3f5;font-size:16px}
      .ddlrev .rh .k{color:#9CA3AF;font-size:12.5px}
      .ddlrev table{width:100%;border-collapse:collapse;font-size:13.5px}
      .ddlrev th{color:#9CA3AF;text-align:left;font-weight:600;padding:6px 8px;border-bottom:1px solid #23262b;font-size:12px}
      .ddlrev td{padding:6px 8px;border-bottom:1px solid #1c1e22;color:#f2f3f5;vertical-align:middle}
      .ddlrev td .dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;vertical-align:middle}
      .ddlrev input{background:#101215;border:1px solid #23262b;border-radius:8px;padding:6px 9px;color:#f2f3f5;
        font-family:'Inter',sans-serif;font-size:13px;width:100%;outline:none}
      .ddlrev input:focus{border-color:#4ADE80}
      .ddlrev .num{font-family:'JetBrains Mono',ui-monospace,monospace;color:#c7c9cd;text-align:center}
      .ddlrev .del{background:transparent;border:0;color:#6b7280;cursor:pointer;font-size:15px}
      .ddlrev .del:hover{color:#F472B6}
      .ddlrev .actions{display:flex;gap:10px;margin-top:14px;align-items:center}
      .ddlrev .save{border:0;border-radius:9px;padding:10px 16px;cursor:pointer;font-weight:700;
        font-family:'Inter',sans-serif;background:#22C55E;color:#06210f}
      .ddlrev .save:disabled{opacity:.6;cursor:default}
      .ddlrev .msg{color:#4ADE80;font-size:12.5px;align-self:center}
      .ddlrev .refining{display:${result._refining ? 'flex' : 'none'};align-items:center;gap:6px;color:#9CA3AF;font-size:12px}
      </style>
      <div class="rh">
        <h3>🎭 Desglose automático</h3>
        <span class="k">${rows.length} personajes · ${total} intervenciones · ${result.scenes.length} escenas · ${result.numPages} pág.</span>
        <span class="refining" id="rvRefining">✨ Afinando nombres con IA…</span>
      </div>
      <div style="overflow:auto">
      <table><thead><tr>
        <th style="width:34%">Personaje</th><th style="width:30%">Talento</th>
        <th style="width:12%">Intervenc.</th><th style="width:10%">Págs.</th><th style="width:9%">Escenas</th><th></th>
      </tr></thead><tbody id="rvBody"></tbody></table>
      </div>
      <div class="actions">
        <button class="save" id="rvSave">💾 Guardar desglose</button>
        <span class="msg" id="rvMsg"></span>
      </div>`;
    mount.innerHTML = ''; mount.appendChild(wrap);
    const body = wrap.querySelector('#rvBody');

    function draw() {
      body.innerHTML = '';
      rows.sort((a, b) => b.totalInts - a.totalInts || a.display.localeCompare(b.display, 'es'));
      rows.forEach((c, i) => {
        const tr = document.createElement('tr');
        tr.innerHTML =
          `<td><span class="dot" style="background:${c.color}"></span>
             <input value="${esc(c.display)}" data-f="display" data-i="${i}" style="width:calc(100% - 20px)" aria-label="Nombre del personaje"></td>
           <td><input value="${esc(c.talent || '')}" placeholder="sin asignar" data-f="talent" data-i="${i}" aria-label="Talento asignado a ${esc(c.display)}"></td>
           <td class="num">${c.totalInts}</td>
           <td class="num">${c.pages.length}</td>
           <td class="num">${c.scenes ? c.scenes.length : 0}</td>
           <td><button class="del" data-i="${i}" title="Quitar" aria-label="Quitar a ${esc(c.display)}">✕</button></td>`;
        body.appendChild(tr);
      });
    }
    draw();

    // edición en vivo (renombrar a un nombre existente = fusiona al guardar, con confirmación previa)
    body.addEventListener('input', (e) => {
      const t = e.target; if (!t.dataset.f) return;
      rows[+t.dataset.i][t.dataset.f] = t.value;
    });

    // quitar fila: confirmación solo para personajes "caros" de perder; el resto, con Deshacer
    body.addEventListener('click', (e) => {
      const btn = e.target.closest('.del'); if (!btn) return;
      const i = +btn.dataset.i, row = rows[i];
      const risky = row.totalInts >= 15 || !!row.talent;
      const doRemove = () => {
        const removed = rows.splice(i, 1)[0];
        draw();
        if (!risky) {
          UI.toast('Personaje quitado: ' + removed.display, {
            actionLabel: 'Deshacer',
            onAction: () => { rows.splice(i, 0, removed); draw(); }
          });
        }
      };
      if (risky) {
        UI.confirmModal({
          title: 'Quitar personaje',
          body: '«' + row.display + '» tiene ' + row.totalInts + ' intervención' + (row.totalInts === 1 ? '' : 'es') +
            (row.talent ? ' y ya tiene talento asignado (' + row.talent + ')' : '') + '. Esta acción es difícil de deshacer una vez guardada.',
          confirmLabel: 'Quitar', cancelLabel: 'Cancelar', danger: true
        }).then(ok => { if (ok) doRemove(); });
      } else {
        doRemove();
      }
    });

    // fusiona filas con el mismo nombre normalizado (por si renombraron)
    function consolidate() {
      const map = {};
      for (const c of rows) {
        const k = norm(c.display); c.key = k;
        if (!map[k]) { map[k] = c; continue; }
        const m = map[k];
        // fusionar páginas
        const pm = new Map(m.pages.map(p => [p.p, p.ints]));
        c.pages.forEach(p => pm.set(p.p, (pm.get(p.p) || 0) + p.ints));
        m.pages = [...pm.entries()].sort((a, b) => a[0] - b[0]).map(([p, ints]) => ({ p, ints }));
        m.scenes = [...new Set([...(m.scenes || []), ...(c.scenes || [])])].sort((a, b) => a - b);
        m.totalInts += c.totalInts;
        if (!m.talent && c.talent) m.talent = c.talent;
      }
      const out = Object.values(map);
      out.forEach(c => { c.color = charColor(c.key); c.noRec = NO_REC.has(norm(c.talent)); });
      return out.sort((a, b) => b.totalInts - a.totalInts || a.display.localeCompare(b.display, 'es'));
    }

    // detecta qué filas se fusionarían SIN aplicar el cambio (para poder pedir confirmación antes)
    function previewMerges() {
      const byKey = {};
      rows.forEach(c => { (byKey[norm(c.display)] = byKey[norm(c.display)] || []).push(c); });
      return Object.values(byKey).filter(group => group.length > 1);
    }

    async function doSave() {
      const msg = wrap.querySelector('#rvMsg');
      const btn = wrap.querySelector('#rvSave');
      btn.disabled = true; btn.textContent = 'Guardando…'; msg.style.color = '#4ADE80'; msg.textContent = '';
      result.chars = consolidate();
      try {
        if (typeof opts.onSave === 'function') await opts.onSave(result);
        msg.textContent = '✓ Guardado';
        UI.toast('Desglose guardado');
      } catch (err) {
        console.error('[desglose] error al guardar', err);
        msg.style.color = '#F472B6'; msg.textContent = friendlyError(err);
      }
      btn.disabled = false; btn.textContent = '💾 Guardar desglose';
    }

    wrap.querySelector('#rvSave').onclick = async () => {
      const merges = previewMerges();
      if (!merges.length) { await doSave(); return; }
      // varios grupos posibles: se listan todos, y "Cancelar" en un ítem solo revierte esa fila
      const items = [];
      merges.forEach(group => {
        const primary = group[0];
        group.slice(1).forEach(dup => {
          items.push({ label: dup.display, meta: dup.totalInts + ' int. → se unirá con «' + primary.display + '»', idx: items.length, row: dup });
        });
      });
      const ok = await UI.confirmModal({
        title: merges.length === 1 && merges[0].length === 2 ? 'Confirmar fusión de personajes' : (rows.length && merges.reduce((s, g) => s + g.length, 0)) + ' personajes se combinarán al guardar',
        body: (merges.reduce((s, g) => s + g.length, 0)) + ' filas comparten el mismo nombre y se combinarán en ' + merges.length + ' personaje' + (merges.length === 1 ? '' : 's') + ' al guardar.',
        items,
        confirmLabel: 'Fusionar y guardar', cancelLabel: 'Cancelar todo',
        onItemCancel: (idx) => {
          // deshace el renombre de esa fila (vuelve a su nombre original) para sacarla del grupo de fusión
          const it = items[idx]; if (!it) return;
          it.row.display = it.row._origDisplay;
          draw();
        }
      });
      if (ok) await doSave();
    };
    return wrap;
  }

  // ---------- 8) ORQUESTACIÓN CON UI: progreso + skeleton + refinado en 2º plano ----------
  // Pinta de inmediato el estado de carga en `mount`, procesa el archivo mostrando
  // avance real ("Analizando página X de Y"), y sustituye por la tabla editable
  // en cuanto hay resultado — sin esperar al refinado por IA, que sigue en 2º plano.
  async function runWithUI(file, opts) {
    opts = opts || {};
    const mount = opts.mount || document.body;
    mount.innerHTML = `
      <style>
      @keyframes ddlrevSpin{to{transform:rotate(360deg)}}
      @keyframes ddlrevShimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}
      .ddlrev-load{background:#15171a;border:1px solid #23262b;border-radius:14px;padding:20px;margin:14px 0;font-family:'Inter',sans-serif}
      .ddlrev-load .lh{display:flex;align-items:center;gap:10px;margin-bottom:12px}
      .ddlrev-load .spin{width:18px;height:18px;border:3px solid #23262b;border-top-color:#4ADE80;border-radius:50%;animation:ddlrevSpin .8s linear infinite}
      .ddlrev-load .lt{color:#f2f3f5;font-size:14px;font-weight:600}
      .ddlrev-load .lprog{height:6px;background:#23262b;border-radius:99px;overflow:hidden;margin-bottom:6px}
      .ddlrev-load .lprog i{display:block;height:100%;width:0%;background:linear-gradient(90deg,#16A34A,#4ADE80);border-radius:99px;transition:width .3s ease}
      .ddlrev-load .lpct{font-family:'JetBrains Mono',monospace;font-size:11.5px;color:#4ADE80}
      .ddlrev-skel-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;margin-top:16px}
      .ddlrev-skel{background:#101215;border:1px solid #1c1e22;border-radius:10px;padding:13px 14px}
      .ddlrev-skel i{display:block;height:11px;border-radius:6px;background:linear-gradient(90deg,#1c1e22 25%,#23262b 37%,#1c1e22 63%);background-size:400% 100%;animation:ddlrevShimmer 1.4s ease infinite;margin-bottom:8px}
      .ddlrev-skel i.w60{width:60%} .ddlrev-skel i.w40{width:40%;height:9px} .ddlrev-skel i.w80{width:80%;height:9px}
      </style>
      <div class="ddlrev-load">
        <div class="lh"><div class="spin" aria-hidden="true"></div><span class="lt" id="ddlrevLoadLabel">Leyendo guion…</span></div>
        <div class="lprog"><i id="ddlrevLoadBar"></i></div>
        <div class="lpct" id="ddlrevLoadPct"></div>
        <div class="ddlrev-skel-grid" id="ddlrevSkelGrid" role="status" aria-live="polite" aria-label="Analizando guion, preparando lista de personajes"></div>
      </div>`;
    const labelEl = mount.querySelector('#ddlrevLoadLabel'), barEl = mount.querySelector('#ddlrevLoadBar'), pctEl = mount.querySelector('#ddlrevLoadPct');
    const skelGrid = mount.querySelector('#ddlrevSkelGrid');
    for (let i = 0; i < 6; i++) {
      const s = document.createElement('div'); s.className = 'ddlrev-skel';
      s.innerHTML = '<i class="w60"></i><i class="w40"></i><i class="w80"></i>';
      skelGrid.appendChild(s);
    }

    function onProgress(p) {
      if (!mount.isConnected) return; // el usuario navegó fuera mientras procesaba
      if (p.stage === 'extract') {
        if (p.indeterminate) { labelEl.textContent = p.label || 'Leyendo guion…'; barEl.style.width = '0%'; pctEl.textContent = ''; }
        else { labelEl.textContent = (p.label || 'Leyendo página') + '…'; const pct = p.total ? Math.round(100 * p.current / p.total) : 0; barEl.style.width = pct + '%'; pctEl.textContent = p.current + ' / ' + p.total; }
      } else if (p.stage === 'analyze') {
        labelEl.textContent = p.done ? 'Personajes detectados' : 'Detectando personajes…';
        if (!p.done) { barEl.style.width = '100%'; pctEl.textContent = ''; }
      }
    }

    let result;
    try {
      result = await fromFile.call(null, file, { onProgress: (p) => {
        // el refinado por IA se maneja aparte (no debe bloquear el pintado de la tabla)
        if (p.stage !== 'refine') onProgress(p);
      }});
    } catch (err) {
      mount.innerHTML = `<div class="ddlrev-load" role="alert" style="border-color:#F472B6">
        <div class="lt" style="color:#F472B6;margin-bottom:6px">No se pudo analizar el guion</div>
        <div style="color:#9CA3AF;font-size:13px;line-height:1.5">${esc(friendlyError(err))}</div>
      </div>`;
      throw err;
    }

    // si hay LLM configurado, el refinado corre en 2º plano: pintamos la tabla YA con lo que hay.
    const wantsRefine = !!cfg.llmEndpoint;
    if (wantsRefine) result._refining = true;
    const wrap = renderReview(result, opts);
    if (wantsRefine) {
      refineWithLLM(result, result.fullText).then(() => {
        result._refining = false;
        const badge = wrap.querySelector('#rvRefining'); if (badge) badge.style.display = 'none';
        // vuelve a pintar solo si el usuario no ha guardado ya (el mount sigue siendo el mismo wrap)
        if (mount.contains(wrap)) renderReview(result, opts);
      }).catch(() => { result._refining = false; });
    }
    return result;
  }

  // ---------- 9) GUARDAR EN SUPABASE ----------
  async function save(episodeId, result, extra) {
    extra = extra || {};
    const sb = window.sb;
    if (!sb) throw new Error('No hay conexión a Supabase (window.sb).');

    // guion procesado (texto fuente) — permite re-desglosar sin re-subir
    let scriptId = extra.scriptId || null;
    if (!scriptId && result.fullText) {
      const { data, error } = await sb.from('scripts').insert({
        episode_id: episodeId, name: result.name || 'guion',
        source_type: result.sourceType || 'pdf',
        num_pages: result.numPages, full_text: result.fullText
      }).select('id').single();
      if (!error && data) scriptId = data.id;
    }

    // desglose estructurado (chars + escenas + meta) — 1 por capítulo (upsert)
    const data = {
      chars: result.chars.map(c => ({
        key: c.key, display: c.display, talent: c.talent || '',
        pages: c.pages, scenes: c.scenes || [], totalInts: c.totalInts,
        noRec: c.noRec, color: c.color
      })),
      scenes: result.scenes,
      // libreto compacto: {k:key, p:página, s:escena, t:texto} — para la vista de lectura
      script: (result.script || []).map(b => ({ k: b.key, p: b.page, s: b.scene, t: (b.lines || []).join(' ') })),
      meta: { engine: 'regex', model: cfg.llmEndpoint ? 'llm-refined' : 'rules', version: 'v12', numPages: result.numPages }
    };
    const { error } = await sb.from('breakdowns')
      .upsert({ episode_id: episodeId, script_id: scriptId, data, edited: !!extra.edited },
              { onConflict: 'episode_id' });
    if (error) throw error;
    return { scriptId };
  }

  // cargar un desglose ya guardado (para abrir el capítulo sin re-procesar)
  async function load(episodeId) {
    const sb = window.sb; if (!sb) return null;
    const { data } = await sb.from('breakdowns').select('data').eq('episode_id', episodeId).single();
    return data ? data.data : null;
  }

  window.DDLDesglose = { config: cfg, fromFile, analyze, renderReview, runWithUI, save, load, charColor, norm, friendlyError };
})();
