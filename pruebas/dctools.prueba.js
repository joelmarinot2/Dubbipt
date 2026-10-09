/* DUBCARDs, Breakdowns y Pegado de casting, dentro de Dubbipt · especificacion 09, PRO-38 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { INDEX } = require('./ayuda');

exports.nombre = 'Casting: DUBCARDs, Breakdowns y Pegado, dentro de Dubbipt';

const RAIZ = path.dirname(INDEX);
const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B50}\u{2B06}\u{2B07}\u{2B05}\u{2B55}\u{23E9}-\u{23FA}\u{FE0F}]/u;

/* Un SheetJS de mentira: cada «archivo» lleva ya sus hojas, como filas. */
function xlsxFalso(){
  return {
    read: (bytes) => bytes.buffer.__wb,
    utils: {
      sheet_to_json: (ws) => ws.filas,
      decode_range: () => ({ s: { r: 0, c: 0 } }),
      encode_col: (c) => String.fromCharCode(65 + c),
      encode_cell: ({ r, c }) => String.fromCharCode(65 + c) + (r + 1),
      encode_range: () => 'A1:Z99',
      book_new: () => ({ hojas: [] }),
      book_append_sheet: (wb, ws, n) => wb.hojas.push(n)
    },
    write: (wb) => wb.hojas
  };
}
function desglose(titulo, pers, cast){
  const d = []; for(let i = 0; i < 16; i++) d.push([]); d[8] = ['', '', '', '', '', '', '', titulo]; pers.forEach(p => d.push([p]));
  const c = []; for(let i = 0; i < 11; i++) c.push([]); c.push(['LOCUTOR', '', '', 'NOMBRE DEL ACTOR']); cast.forEach(([p, t]) => c.push([p, '', '', t]));
  const wb = { SheetNames: ['DESGLOCE', 'CASTING'], Sheets: { DESGLOCE: { filas: d, '!ref': 'A1' }, CASTING: { filas: c, '!ref': 'A1' } } };
  const buf = new ArrayBuffer(8);
  return { name: titulo + '.xlsm', size: 8, arrayBuffer: async () => Object.assign(buf, { __wb: wb }) };
}

function cargar(o){
  o = o || {};
  const V = { avisos: [], pintadas: 0, bajados: [], zips: [], editados: [], datos: o.datos || { breakdowns: [] } };
  const ctx = vm.createContext({
    console, Blob, TextDecoder, TextEncoder, setTimeout, clearTimeout, AbortController,
    XLSX: xlsxFalso(),
    fflate: { strToU8: (t) => new TextEncoder().encode(t), zipSync: (f) => { V.zips.push(f); return new Uint8Array(4); }, unzipSync: () => ({ 'word/document.xml': new TextEncoder().encode(o.docxXml || '') }) },
    localStorage: { _d: {}, getItem(k){ return k in this._d ? this._d[k] : null; }, setItem(k, v){ this._d[k] = String(v); } },
    castAviso: (t) => V.avisos.push(t), csRepintar: () => { V.pintadas++; }, csIco: (n) => '<svg data-i="' + n + '"></svg>',
    csDatos: () => ({ datos: V.datos }),
    csEditar: async (cambio, que) => { if(o.sinSesion) return 'sesion'; const r = cambio(V.datos); V.editados.push(que); return r ? 'guardado' : 'igual'; },
    URL: { createObjectURL: (b) => { V.bajados.push(b); return 'blob:x'; }, revokeObjectURL(){} },
    document: { createElement: () => ({ click(){}, remove(){}, setAttribute(){} }), body: { appendChild(){} }, getElementById: () => null },
    fetch: o.fetch || (async () => { throw new Error('sin red'); }),
    location: { origin: 'https://dubbipt.app' }
  });
  vm.runInContext(fs.readFileSync(path.join(RAIZ, 'js', 'dctools.js'), 'utf8') + ';this.DCT = DCT;', ctx);
  V.D = ctx.DCT; V.ctx = ctx;
  return V;
}

exports.pruebas = async function(t){
  t.seccion('1 · DUBCARDs: el procesado de DublajeCast, aquí');
  {
    const V = cargar(), D = V.D;
    D.ST.dc.entries = [
      { file: desglose('MI SERIE 101', ['ANA', 'LEO', 'MALE SOLDIER 1', 'TODOS'], [['ANA', 'Luz Mar'], ['LEO', 'Pepe Gil'], ['MALE SOLDIER 1', 'Carlos Ruiz'], ['TODOS', 'TODOS']]), name: 'a.xlsm', cap: 'MI SERIE 101' },
      { file: desglose('MI SERIE 102', ['ANA', 'LEO', 'RITA'], [['ANA', 'Luz Mar'], ['LEO', 'Juan Sol'], ['RITA', '']]), name: 'b.xlsm', cap: 'MI SERIE 102' }];
    D.ST.dc.client = { kind: 'netflix', name: 'Netflix' };
    await D.dcProcesar();
    const p = D.ST.dc.processed;
    t.eq('cada episodio con sus personajes y su talento de la hoja CASTING, principales y adicionales', p.map(e => e.cap + ':' + e.data.map(r => r.personaje + '=' + (r.talento || '-') + '/' + r.tipo[0]).join(',')).join(' || '),
         'MI SERIE 101:Ana=Luz Mar/P,Leo=Pepe Gil/P,Male Soldier 1=Carlos Ruiz/A,Todos=Todos/P || MI SERIE 102:Ana=Luz Mar/P,Leo=Juan Sol/P,Rita=-/P');
    t.eq('el plan de copiado de Netflix: copiar del anterior, reasignar, crear y quitar', JSON.stringify({ src: p[1].plan.srcCap, re: p[1].plan.reassign.map(x => x.personaje + ':' + x.antes + '>' + x.ahora), add: p[1].plan.add.map(x => x.personaje), del: p[1].plan.del.map(x => x.personaje) }),
         '{"src":"MI SERIE 101","re":["Leo:Pepe Gil>Juan Sol"],"add":["Rita"],"del":["Todos"]}');
    const h = D.html('dubcards');
    t.ok('en pantalla: el plan, la matriz, cada episodio y «Descargar Excel», sin emojis', /Plan de copiado/.test(h) && /Matriz de recurrencia/.test(h) && /MI SERIE 102/.test(h) && /data-dct="dcBajar"/.test(h) && !EMOJI.test(h), (h.match(EMOJI) || [''])[0]);
    const botones = [];
    D.cablear({ querySelector: () => null, querySelectorAll: () => [{ getAttribute: (k) => k === 'data-dct' ? 'dcBajar' : null, set onclick(f){ botones.push(f); } }] }, 'dubcards');
    botones[0]();
    t.eq('el Excel: Producción, Matriz y Alertas de Netflix, y una hoja por episodio', V.bajados.length + ' ' + V.avisos.slice(-1)[0], '1 ⬇ DUBCARD_MI SERIE_101-102.xlsx');
    D.ST.dc.client = { kind: 'otro', name: 'Disney' };
    t.ok('para otra casa, sin el plan de Netflix', !/Plan de copiado/.test(D.html('dubcards')) && /Principales/.test(D.html('dubcards')));
  }
  {
    const V = cargar(), D = V.D;
    D.ST.dc.entries = [{ file: { name: 'roto.xlsm', size: 8, arrayBuffer: async () => Object.assign(new ArrayBuffer(8), { __wb: { SheetNames: ['OTRA'], Sheets: {} } }) }, name: 'roto.xlsm', cap: 'X' }];
    await D.dcProcesar();
    t.ok('un archivo sin DESGLOCE se dice y no se procesa', D.ST.dc.processed.length === 0 && D.ST.dc.logs.some(l => /No encontré hoja DESGLOCE/.test(l.msg)));
  }

  t.seccion('2 · Breakdowns');
  {
    const V = cargar(), D = V.D;
    t.eq('NVIDIA, Groq y OpenRouter por el proxy de este sitio; Anthropic, directo', ['nvidia', 'groq', 'openrouter', 'anthropic'].map(p => D.bdEndpoint({ provider: p }, '/chat/completions')).join(' '),
         '/api/llm?provider=nvidia&path=%2Fchat%2Fcompletions /api/llm?provider=groq&path=%2Fchat%2Fcompletions /api/llm?provider=openrouter&path=%2Fchat%2Fcompletions https://api.anthropic.com/chat/completions');
    await D.bdMakeDocx('# BREAKDOWN_X_EP01\n## RESUMEN\nTexto.');
    t.ok('el Word se arma con fflate, no con JSZip', V.zips.length === 1 && 'word/document.xml' in V.zips[0] && /BREAKDOWN_X_EP01/.test(new TextDecoder().decode(V.zips[0]['word/document.xml'])));
    t.eq('el breakdown en pantalla, con su jerarquía', D.bdDocHtml('# T\n## RESUMEN\n**Edad:** 30\n- uno'), '<div class="bd-doc"><div class="bd-h1">T</div><div class="bd-h2">RESUMEN</div><div class="bd-f"><b>Edad:</b> 30</div><ul><li>uno</li></ul></div>');
    const h = D.html('breakdowns');
    t.ok('sin clave, se pide; y el libreto, el show guide, la serie y el episodio', /Falta la clave de API/.test(h) && /data-k="script"/.test(h) && /data-k="guide"/.test(h) && /data-dct="bdNombre"/.test(h) && /data-dct="bdGenerar" disabled/.test(h) && !EMOJI.test(h));
  }
  {
    const rec = { id: 'b1', title: 'BREAKDOWN_X_EP01', name: 'X', ep: '1', createdAt: '2026-10-10T00:00:00Z', model: 'm', text: '# BREAKDOWN_X_EP01' };
    const V = cargar();
    t.eq('se guarda donde lo guarda DublajeCast (su lista de breakdowns), y se apunta', (await V.D.bdGuardar(rec)) + ' ' + V.datos.breakdowns.length + ' ' + V.editados[0], 'nube 1 Breakdown guardado: BREAKDOWN_X_EP01');
    const S = cargar({ sinSesion: true });
    t.eq('sin sesión en DublajeCast, se queda en este equipo y se dice', (await S.D.bdGuardar(rec)) + ' ' + S.D.bdGuardados().length + ' ' + S.avisos.some(a => /se queda en este equipo/.test(a)), 'equipo 1 true');
    t.ok('y se ve en la lista, marcado', /solo en este equipo/.test(S.D.html('breakdowns')));
  }
  {
    /* Generar, de punta a punta, con un proveedor de mentira que contesta sin streaming. */
    const V = cargar({ fetch: async (url, init) => ({ ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => ({ model: 'modelo-x', choices: [{ message: { content: '# BREAKDOWN_MI_SERIE_EP03\n## RESUMEN DEL EPISODIO\nAlgo.' }, finish_reason: 'stop' }] }), _url: url }) });
    V.ctx.localStorage.setItem('dc_breakdown_cfg_v1', JSON.stringify({ provider: 'groq', apiKey: 'k', model: 'modelo-x' }));
    Object.assign(V.D.ST.bd, { script: { name: 'lib.docx', text: 'x'.repeat(300), chars: 300 }, name: 'Mi serie', ep: '3', isMovie: false });
    t.ok('con libreto, nombre, episodio y clave, se puede generar', /data-dct="bdGenerar">/.test(V.D.html('breakdowns')));
    const botones = [];
    V.D.cablear({ querySelector: () => null, querySelectorAll: () => [{ getAttribute: (k) => k === 'data-dct' ? 'bdGenerar' : null, set onclick(f){ botones.push(f); } }] }, 'breakdowns');
    botones[0](); await new Promise(r => setTimeout(r, 10));
    const res = V.D.ST.bd.result;
    t.eq('genera, se guarda y se ve', res && (res.title + ' · ' + res.model + ' · ' + V.datos.breakdowns.length), 'BREAKDOWN_MI_SERIE_EP03 · modelo-x · 1');
    t.ok('con Word, .txt e imprimir', /data-dct="bdWord"/.test(V.D.html('breakdowns')) && /data-dct="bdTxt"/.test(V.D.html('breakdowns')) && /data-dct="bdImprimir"/.test(V.D.html('breakdowns')));
  }

  t.seccion('3 · Pegado de casting, y dónde está todo');
  {
    const V = cargar();
    const h = V.D.html('pegado');
    t.ok('Pegado de casting se abre aquí, en un marco, con su página', /<iframe class="dct-marco" title="Pegado de casting" src="\.\/dctools\/pegado-casting\.html"/.test(h) && fs.existsSync(path.join(RAIZ, 'dctools', 'pegado-casting.html')));
    t.eq('una sección que no es de estas, nada', V.D.html('ocupacion'), '');
  }
  const HTML = fs.readFileSync(INDEX, 'utf8'), SW = fs.readFileSync(path.join(RAIZ, 'sw.js'), 'utf8'), CV = fs.readFileSync(path.join(RAIZ, 'js', 'castingvistas.js'), 'utf8');
  t.ok('el archivo, cargado y en la caché, con la página de Pegado', /<script src="\.\/js\/dctools\.js"><\/script>/.test(HTML) && /'\.\/js\/dctools\.js'/.test(SW) && /'\.\/dctools\/pegado-casting\.html'/.test(SW));
  t.ok('la vista de Casting las pinta y las engancha, en vez de abrir DublajeCast', /if\(typeof DCT !== 'undefined' && DCT && typeof DCT\.html === 'function'\)\{ const h = DCT\.html\(sec\.v\); if\(h\) return h; \}/.test(CV) && /DCT\.cablear\(vista, CS\.vista\)/.test(CV));
  const DCTJS = fs.readFileSync(path.join(RAIZ, 'js', 'dctools.js'), 'utf8');
  t.ok('sin JSZip ni React: lo de Dubbipt', !/new JSZip|JSZip\.loadAsync|React\.|useState/.test(DCTJS));
};
