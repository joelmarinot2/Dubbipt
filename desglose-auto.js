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
 *    const r = await DDLDesglose.fromFile(file);      // {chars, script, scenes, numPages, fullText, sourceType}
 *    DDLDesglose.renderReview(r, { mount, onSave });  // pinta la vista editable
 *    await DDLDesglose.save(episodeId, r, { scriptId });
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

  // ---------- 1) EXTRACCIÓN DE TEXTO ----------
  // PDF → líneas con número de página (reagrupando fragmentos por baseline).
  async function extractPdf(buf) {
    const doc = await pdfjsLib.getDocument({
      data: buf,
      cMapUrl: 'https://unpkg.com/pdfjs-dist@3.11.174/cmaps/', cMapPacked: true
    }).promise;
    const numPages = doc.numPages;
    const lines = [];      // {text, page}
    for (let p = 1; p <= numPages; p++) {
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
  async function extractDocx(buf) {
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
  async function refineWithLLM(result, fullText) {
    if (!cfg.llmEndpoint) return result;
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
    return result;
  }

  // ---------- 5) API pública ----------
  async function fromFile(file) {
    const buf = await file.arrayBuffer();
    const isDocx = /\.docx$/i.test(file.name) || file.type.includes('word');
    const src = isDocx ? await extractDocx(buf) : await extractPdf(buf.slice(0));
    let result = analyze(src.lines, src.numPages);
    result.fullText = src.fullText;
    result.sourceType = isDocx ? 'docx' : 'pdf';
    result.name = file.name;
    result = await refineWithLLM(result, src.fullText);
    return result;
  }

  // ---------- 6) VISTA EDITABLE ----------
  function renderReview(result, opts) {
    opts = opts || {};
    const mount = opts.mount || document.body;
    const rows = result.chars;

    const total = rows.reduce((s, c) => s + c.totalInts, 0);
    const wrap = document.createElement('div');
    wrap.className = 'ddlrev';
    wrap.innerHTML = `
      <style>
      .ddlrev{background:#1E1740;border:1px solid #3a2f6b;border-radius:14px;padding:16px;margin:14px 0}
      .ddlrev .rh{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:12px}
      .ddlrev .rh h3{font-family:'Space Grotesk',sans-serif;color:#EFECFB;font-size:16px}
      .ddlrev .rh .k{color:#B4ADD9;font-size:12.5px}
      .ddlrev table{width:100%;border-collapse:collapse;font-size:13.5px}
      .ddlrev th{color:#B4ADD9;text-align:left;font-weight:600;padding:6px 8px;border-bottom:1px solid #2c2358;font-size:12px}
      .ddlrev td{padding:6px 8px;border-bottom:1px solid #241C4E;color:#EFECFB;vertical-align:middle}
      .ddlrev td .dot{display:inline-block;width:9px;height:9px;border-radius:3px;margin-right:7px;vertical-align:middle}
      .ddlrev input{background:#191238;border:1px solid #2c2358;border-radius:8px;padding:6px 9px;color:#EFECFB;
        font-family:'Inter',sans-serif;font-size:13px;width:100%;outline:none}
      .ddlrev input:focus{border-color:#A78BFA}
      .ddlrev .num{font-family:ui-monospace,monospace;color:#C4B5FD;text-align:center}
      .ddlrev .del{background:transparent;border:0;color:#7d76a8;cursor:pointer;font-size:15px}
      .ddlrev .del:hover{color:#F472B6}
      .ddlrev .actions{display:flex;gap:10px;margin-top:14px}
      .ddlrev .save{border:0;border-radius:10px;padding:10px 16px;cursor:pointer;font-weight:700;
        font-family:'Space Grotesk',sans-serif;background:linear-gradient(135deg,#A78BFA,#7C5CE0);color:#160f33}
      .ddlrev .msg{color:#4ADE80;font-size:12.5px;align-self:center}
      </style>
      <div class="rh">
        <h3>🎭 Desglose automático</h3>
        <span class="k">${rows.length} personajes · ${total} intervenciones · ${result.scenes.length} escenas · ${result.numPages} pág.</span>
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
             <input value="${esc(c.display)}" data-f="display" data-i="${i}" style="width:calc(100% - 20px)"></td>
           <td><input value="${esc(c.talent || '')}" placeholder="sin asignar" data-f="talent" data-i="${i}"></td>
           <td class="num">${c.totalInts}</td>
           <td class="num">${c.pages.length}</td>
           <td class="num">${c.scenes ? c.scenes.length : 0}</td>
           <td><button class="del" data-i="${i}" title="Quitar">✕</button></td>`;
        body.appendChild(tr);
      });
    }
    draw();

    // edición en vivo (renombrar a un nombre existente = fusiona al guardar)
    body.addEventListener('input', (e) => {
      const t = e.target; if (!t.dataset.f) return;
      rows[+t.dataset.i][t.dataset.f] = t.value;
    });
    body.addEventListener('click', (e) => {
      if (!e.target.classList.contains('del')) return;
      rows.splice(+e.target.dataset.i, 1); draw();
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

    wrap.querySelector('#rvSave').onclick = async () => {
      const msg = wrap.querySelector('#rvMsg');
      result.chars = consolidate();
      const btn = wrap.querySelector('#rvSave'); btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        if (typeof opts.onSave === 'function') await opts.onSave(result);
        msg.textContent = '✓ Guardado';
      } catch (err) {
        msg.style.color = '#F472B6'; msg.textContent = 'Error: ' + (err.message || err);
      }
      btn.disabled = false; btn.textContent = '💾 Guardar desglose';
    };
    return wrap;
  }

  // ---------- 7) GUARDAR EN SUPABASE ----------
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
      meta: { engine: 'regex', model: cfg.llmEndpoint ? 'llm-refined' : 'rules', version: 'v11', numPages: result.numPages }
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

  window.DDLDesglose = { config: cfg, fromFile, analyze, renderReview, save, load, charColor, norm };
})();
