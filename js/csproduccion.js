/* Producción Casting, como en Casting · especificacion 09, PRO-42
 *
 * Pedido de sala, con una captura: «quiero que la pestaña de producción se
 * vea como la de la captura y que tenga todas las funciones, excepto las
 * casillas de marcar desglose y casting».
 *
 * Es ProduccionCastingView de Casting, sobre los mismos datos (su lista
 * `produccion`, `clienteList`, `directorList`): pestañas en curso /
 * completados; buscador y filtros por cliente, director y alertas; la
 * leyenda de colores; secciones de preproducción y producción activa; cada
 * fila con programa y capítulo editables, cliente y director (con su lista),
 * entrega a Miami, formato y entrega de DUBCARD con sus alertas, Iniciar /
 * Finalizar y eliminar; el archivo de completados, de solo lectura, con
 * «Reabrir»; ordenar por columna; importar y exportar Excel; «Reset»; y el
 * botón flotante «Nuevo». Sin la API externa ni «Sincronizar fechas»: se
 * quitaron a pedido de sala. Sin las casillas de desglose y casting (sus datos
 * se conservan, y el Excel los sigue llevando).
 *
 * Las funciones puras se copian tal cual de dublajecast/index.html (alertas,
 * fechas, Excel); la interfaz es nueva, sin React, dentro de una
 * función para que sus nombres no choquen con los de Dubbipt. Todo se guarda
 * en Casting con csEditar. Hacia fuera: CSP.html(datos, vivo), CSP.cablear(raiz).
 * De donde depende: XLSX, csEditar, csDatos, csRepintar, csCabecera, csIco,
 * castAviso, dcxUid, DDL_UI.
 */

/* ═══ PRODUCCIÓN CASTING EN DUBBIPT ══════════════════════════════════════════ */

const CSP = (function(){
'use strict';

/* ── Copiado de Casting ── */
const safe=v=>String(v==null?"":v);
const PC_DUBCARD_OPTS=["BACKLOT","Plataforma Padlot","Excel","PNG","No necesita DUBCARD"];
const PC_FASE_LABELS={"pre_produccion":"Pre-producción","produccion_activa":"En Producción","completado":"Finalizado"};

/* "YYYY-MM-DD" se interpreta como fecha LOCAL (new Date("YYYY-MM-DD") es UTC y en América cae en el día anterior) */
function parseLocalDate(s){const m=/^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(String(s||"").trim());if(m)return new Date(+m[1],+m[2]-1,+m[3]);const d=new Date(s);return d;}
function calcMiamiAlert(fecha,fase){
  // Miami delivery is considered done when production is active — no alert needed
  if(!fecha||fase==="produccion_activa"||fase==="completado")return null;
  const today=new Date();today.setHours(0,0,0,0);
  const d=parseLocalDate(fecha);if(isNaN(d))return null;d.setHours(0,0,0,0);
  const diff=Math.round((d-today)/86400000);
  if(diff<0)return{color:"#FB7185",bg:"rgba(255,77,125,0.15)",glow:"0 0 8px rgba(255,77,125,0.5)",label:`Vencida ${Math.abs(diff)}d`};
  if(diff<=3)return{color:"#FB923C",bg:"rgba(255,140,66,0.15)",glow:"0 0 8px rgba(255,140,66,0.5)",label:diff===0?"Hoy":diff+"d"};
  return null;
}
function calcDubcardAlert(fecha,formato,fase){
  if(!fecha||formato==="No necesita DUBCARD"||fase==="completado")return null;
  const today=new Date();today.setHours(0,0,0,0);
  const d=parseLocalDate(fecha);if(isNaN(d))return null;d.setHours(0,0,0,0);
  const diff=Math.round((d-today)/86400000);
  if(diff<0)return{color:"#FBBF24",bg:"rgba(255,204,0,0.12)",glow:"0 0 8px rgba(255,204,0,0.5)",label:`Vencida ${Math.abs(diff)}d`};
  if(diff<=3)return{color:"#C4B5FD",bg:"rgba(180,91,255,0.15)",glow:"0 0 8px rgba(180,91,255,0.5)",label:diff===0?"Hoy":diff+"d"};
  return null;
}

function parseExcelDate(val){
  if(!val)return"";
  if(val instanceof Date){if(isNaN(val))return"";return val.getFullYear()+"-"+String(val.getMonth()+1).padStart(2,"0")+"-"+String(val.getDate()).padStart(2,"0");}
  if(typeof val==="number"){if(!isFinite(val)||val<1||val>2958465)return"";try{const utcDays=Math.floor(val-25569);return new Date(utcDays*86400000).toISOString().slice(0,10);}catch(e){return"";}}
  const s=String(val).trim();
  const m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(m)return`${m[3]}-${m[2].padStart(2,"0")}-${m[1].padStart(2,"0")}`;
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  return"";
}
function parseBool(val){
  if(typeof val==="boolean")return val;
  if(typeof val==="number")return val!==0;
  return["true","sí","si","yes","1","x","✓"].includes(String(val).trim().toLowerCase());
}

/* ═══ La interfaz, en Dubbipt ════════════════════════════════════════════════ */

const ST = { tab: 'en_curso', buscar: '', cliente: '', director: '', alerta: '', sortBy: null, sortDir: 'asc', lista: null, listaItems: [] };
const E = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ico = (n, sz) => (typeof csIco === 'function') ? csIco(n, sz || 13) : '';
const aviso = t => { try{ castAviso(t); }catch(e){ /* sin avisos */ } };
const repintar = () => { try{ csRepintar(); }catch(e){ /* fuera de la vista de Casting */ } };
const datos = () => { try{ return (typeof csDatos === 'function') ? csDatos().datos : null; }catch(e){ return null; } };
const nuevoId = () => (typeof dcxUid === 'function') ? dcxUid() : Date.now() * 1000 + Math.floor(Math.random() * 1000);
const mismo = (a, b) => String(a) === String(b);

/** Un cambio en Casting, como sus acciones PRODUCCION/…: lee, cambia y guarda (con la sesión de Casting). */
function editar(cambio, que){
  if(typeof csEditar !== 'function'){ aviso('Sin conexión con Casting'); return Promise.resolve('error'); }
  return csEditar(p => { if(!Array.isArray(p.produccion)) p.produccion = []; return cambio(p); }, que || null);
}
function actualizar(id, campos, que){
  return editar(p => {
    const i = p.produccion.findIndex(r => mismo(r.id, id));
    if(i < 0) return false;
    const nuevo = Object.assign({}, p.produccion[i], campos);
    if(JSON.stringify(nuevo) === JSON.stringify(p.produccion[i])) return false;
    p.produccion[i] = nuevo;
    return true;
  }, que);
}
function upd(row, campo, val){
  const c = { [campo]: val };
  if(campo === 'cliente' && String(val).toLowerCase().includes('netflix')) c.formato_dubcard = 'BACKLOT';
  return actualizar(row.id, c);
}

/** Las filas con su fase (por omisión, preproducción, como en Casting). */
function filas(d){ return ((d && d.produccion) || []).map(r => Object.assign({ fase: 'pre_produccion' }, r)); }

function alertas(row){ return { m: calcMiamiAlert(row.fecha_miami, row.fase), d: calcDubcardAlert(row.fecha_dubcard, row.formato_dubcard, row.fase) }; }
function esVencida(a){ return !!((a.m && a.m.label.startsWith('Vencida')) || (a.d && a.d.label.startsWith('Vencida'))); }

/** Buscar, filtrar y ordenar: lo de Casting. */
function aplicar(rows){
  let r = rows.slice();
  const q = ST.buscar.trim().toLowerCase();
  if(q) r = r.filter(x => ['programa', 'capitulo', 'cliente', 'director'].some(k => String(x[k] || '').toLowerCase().includes(q)));
  if(ST.cliente) r = r.filter(x => x.cliente === ST.cliente);
  if(ST.director) r = r.filter(x => x.director === ST.director);
  if(ST.alerta) r = r.filter(x => { const a = alertas(x); return ST.alerta === 'vencida' ? esVencida(a) : ((!!a.m || !!a.d) && !esVencida(a)); });
  if(ST.sortBy){
    const k = ST.sortBy;
    r.sort((a, b) => { const va = a[k] == null ? '' : a[k], vb = b[k] == null ? '' : b[k]; const c = String(va).localeCompare(String(vb), 'es', { sensitivity: 'base' }); return ST.sortDir === 'asc' ? c : -c; });
  }
  return r;
}

/** El color de la fila, por sus propias alertas. */
function colorFila(row, locked){
  if(locked) return 'cp-fila-hecha';
  const a = alertas(row);
  if(esVencida(a)) return 'cp-fila-vencida';
  if(a.m) return 'cp-fila-miami';
  if(a.d) return 'cp-fila-dubcard';
  return 'cp-fila-normal';
}

function opcionesDirector(d){
  const team = ((d && d.team) || []).filter(t => t.role === 'Director').map(t => t.name);
  return team.concat(((d && d.directorList) || []).filter(x => team.indexOf(x) < 0));
}

function chipAlerta(a){ return a ? '<span class="cp-alerta" style="color:' + a.color + ';background:' + a.bg + '">' + E(a.label) + '</span>' : ''; }

function celdaFecha(row, campo, locked, extra){
  if(locked) return '<span class="cp-tenue">' + E(row[campo] || '—') + '</span>';
  return '<input type="date" class="cp-fecha" data-pc="fecha" data-id="' + E(row.id) + '" data-c="' + campo + '" value="' + E(row[campo] || '') + '"' + (extra || '') + '>';
}

function sel(campo, row, ops, vacio){
  const v = row[campo] || '';
  const lista = ops.slice();
  if(v && lista.indexOf(v) < 0) lista.push(v);
  return '<select class="cp-sel" data-pc="sel" data-id="' + E(row.id) + '" data-c="' + campo + '"><option value="">' + E(vacio) + '</option>'
    + lista.map(o => '<option value="' + E(o) + '"' + (o === v ? ' selected' : '') + '>' + E(o) + '</option>').join('') + '</select>';
}

function filaHtml(row, locked, d){
  const a = alertas(row), miamiHecha = row.fase === 'produccion_activa';
  const ed = (campo, ph, bold) => locked ? '<div class="cp-txt' + (bold ? ' cp-b' : '') + '">' + E(row[campo] || '—') + '</div>'
    : '<input class="cp-edit' + (bold ? ' cp-b' : '') + '" data-pc="txt" data-id="' + E(row.id) + '" data-c="' + campo + '" value="' + E(row[campo] || '') + '" placeholder="' + E(ph) + '">';
  return '<tr class="cp-fila ' + colorFila(row, locked) + '">'
    + '<td class="cp-prog">' + ed('programa', 'Programa', true) + ed('capitulo', 'Capítulo', false) + '</td>'
    + '<td>' + (locked ? '<span class="cp-tenue">' + E(row.cliente || '—') + '</span>' : '<div class="cp-con-lista">' + sel('cliente', row, (d && d.clienteList) || [], '— Cliente —') + '<button class="cp-gear" data-pc="lista" data-v="cliente" title="Gestionar la lista de clientes">' + ico('editar', 12) + '</button></div>') + '</td>'
    + '<td>' + (locked ? '<span class="cp-tenue">' + E(row.director || '—') + '</span>' : '<div class="cp-con-lista">' + sel('director', row, opcionesDirector(d), '— Director —') + '<button class="cp-gear" data-pc="lista" data-v="director" title="Gestionar la lista de directores">' + ico('editar', 12) + '</button></div>') + '</td>'
    + '<td class="cp-fechas">' + (miamiHecha ? celdaFecha(row, 'fecha_miami', locked, ' style="opacity:.45"') + '<span class="cp-entregada">' + ico('hecho', 10) + 'Entregada</span>'
        : celdaFecha(row, 'fecha_miami', locked) + chipAlerta(a.m)) + '</td>'
    + '<td>' + (locked ? '<span class="cp-tenue">' + E(row.formato_dubcard || '—') + '</span>'
        : '<select class="cp-sel" data-pc="sel" data-id="' + E(row.id) + '" data-c="formato_dubcard">' + PC_DUBCARD_OPTS.map(o => '<option value="' + E(o) + '"' + ((row.formato_dubcard || 'Excel') === o ? ' selected' : '') + '>' + E(o) + '</option>').join('') + '</select>') + '</td>'
    + '<td class="cp-fechas">' + (row.formato_dubcard === 'No necesita DUBCARD' ? '<i class="cp-tenue">N/A</i>' : celdaFecha(row, 'fecha_dubcard', locked) + chipAlerta(a.d)) + '</td>'
    + '<td class="cp-acc">' + (locked
        ? '<button class="cs-b cp-reabrir" data-pc="reabrir" data-id="' + E(row.id) + '">' + ico('actualizar', 12) + '<span>Reabrir</span></button>'
        : '<button class="cs-b ' + (row.fase === 'produccion_activa' ? 'cp-finalizar' : 'cp-iniciar') + '" data-pc="fase" data-id="' + E(row.id) + '" title="' + (row.fase === 'produccion_activa' ? 'Finalizar' : 'Iniciar: marca la entrega a Miami como hecha') + '">'
          + (row.fase === 'produccion_activa' ? ico('hecho', 12) + '<span>Finalizar</span>' : ico('entrar', 12) + '<span>Iniciar</span>') + '</button>'
          + '<button class="cs-b cs-b-icono cs-borrar" data-pc="borrar" data-id="' + E(row.id) + '" title="Eliminar">' + ico('cerrar', 12) + '</button>') + '</td>'
    + '</tr>';
}

function th(campo, texto){
  if(!campo) return '<th>' + E(texto) + '</th>';
  const on = ST.sortBy === campo;
  return '<th class="cp-ord' + (on ? ' on' : '') + '" data-pc="orden" data-v="' + campo + '">' + E(texto) + (on ? (ST.sortDir === 'asc' ? ' ▲' : ' ▼') : '') + '</th>';
}
const CABECERA = () => '<thead><tr>' + th('programa', 'Programa / cap.') + th('cliente', 'Cliente') + th('director', 'Director') + th('fecha_miami', 'Entrega Miami') + th(null, 'Formato DUBCARD') + th('fecha_dubcard', 'Entrega DUBCARD') + th(null, '') + '</tr></thead>';

function listaHtml(){
  const t = ST.lista === 'director' ? 'Lista de directores' : 'Lista de clientes';
  return '<div class="cs-tr-ov" data-pc="fondo"><div class="cs-tr-form cp-modal" role="dialog" aria-modal="true" aria-label="' + t + '"><div class="cs-tr-form-t">' + t + '</div>'
    + '<div class="cp-fila-add"><input id="cpListaNuevo" placeholder="Agregar nuevo…"><button class="cs-b cs-pri" data-pc="listaAdd">' + ico('mas', 13) + '<span>Agregar</span></button></div>'
    + (ST.listaItems.length ? '<div class="cp-lista">' + ST.listaItems.map((x, i) => '<div class="cp-lista-it"><span>' + E(x) + '</span><button class="cs-b cs-b-icono cs-borrar" data-pc="listaQuitar" data-i="' + i + '" title="Quitar">' + ico('cerrar', 12) + '</button></div>').join('') + '</div>'
      : '<div class="cp-tenue">Lista vacía: agrega el primero arriba.</div>')
    + '<div class="cs-tr-form-b"><button class="cs-b" data-pc="cerrar">Cancelar</button><button class="cs-b cs-pri" data-pc="listaGuardar">Guardar lista</button></div></div></div>';
}


function html(d, vivo){
  const all = filas(d);
  const enCurso = all.filter(r => r.fase !== 'completado'), hechos = all.filter(r => r.fase === 'completado');
  const pre = aplicar(enCurso.filter(r => r.fase === 'pre_produccion')), activa = aplicar(enCurso.filter(r => r.fase === 'produccion_activa')), fin = aplicar(hechos);
  const unicos = (k) => Array.from(new Set(enCurso.map(r => r[k]).filter(Boolean))).sort();
  const hayFiltros = !!(ST.buscar || ST.cliente || ST.director || ST.alerta);
  const fsel = (k, todos, ops) => '<select class="cp-fsel" data-pc="filtro" data-c="' + k + '"><option value="">' + E(todos) + '</option>' + ops.map(o => '<option value="' + E(o[0]) + '"' + (ST[k] === o[0] ? ' selected' : '') + '>' + E(o[1]) + '</option>').join('') + '</select>';
  const seccion = (rows, cls, t) => rows.length ? '<tr class="cp-sec ' + cls + '"><td colspan="7">' + E(t) + ' <i>(' + rows.length + ')</i></td></tr>' + rows.map(r => filaHtml(r, false, d)).join('') : '';
  const cab = (typeof csCabecera === 'function')
    ? csCabecera('Producción Casting', '<span class="cp-c-curso">' + enCurso.length + ' en curso</span> · <span class="cp-c-hecho">' + hechos.length + ' completados</span> · ' + all.length + ' total', vivo)
    : '<div class="cs-cab"><div class="cs-cab-t"><h2>Producción Casting</h2></div></div>';
  const botones = '<div class="cp-bots">'
    + '<button class="cs-b" data-pc="importar" title="Importar registros desde un Excel">' + ico('subir', 13) + '<span>Excel</span></button><input type="file" id="cpImportar" accept=".xlsx,.xls" hidden>'
    + '<button class="cs-b" data-pc="exportar" title="Exportar todos los registros a Excel">' + ico('bajar', 13) + '<span>Excel</span></button>'
    + '<button class="cs-b cs-borrar" data-pc="reset" title="Limpiar todos los registros">' + ico('borrar', 13) + '<span>Reset</span></button></div>';
  return cab + botones
    + '<div class="cs-pests cp-tabs"><button class="cs-pest' + (ST.tab === 'en_curso' ? ' on' : '') + '" data-pc="tab" data-v="en_curso">En curso <b>' + enCurso.length + '</b></button>'
    +   '<button class="cs-pest' + (ST.tab === 'completados' ? ' on' : '') + '" data-pc="tab" data-v="completados">Completados <b>' + hechos.length + '</b></button></div>'
    + '<div class="cp-filtros"><label class="cs-buscar cp-buscar">' + ico('buscar', 14) + '<input type="text" id="cpBuscar" data-pc="buscar" placeholder="Buscar programa, capítulo, cliente, director…" value="' + E(ST.buscar) + '" autocomplete="off"></label>'
    +   fsel('cliente', 'Todos los clientes', unicos('cliente').map(x => [x, x])) + fsel('director', 'Todos los directores', unicos('director').map(x => [x, x]))
    +   fsel('alerta', 'Todas las alertas', [['vencida', 'Solo vencidas'], ['urgente', 'Solo urgentes (<3d)']])
    +   (hayFiltros ? '<button class="cs-b cs-borrar" data-pc="limpiar">' + ico('cerrar', 12) + '<span>Limpiar filtros</span></button><span class="cp-tenue">' + (ST.tab === 'en_curso' ? pre.length + activa.length : fin.length) + ' resultado(s)</span>' : '') + '</div>'
    + (ST.tab === 'en_curso' && enCurso.length ? '<div class="cp-leyenda"><span class="cp-ley cp-ley-normal"><i></i>Sin alerta</span><span class="cp-ley cp-ley-miami"><i></i>Miami urgente (&lt;3d)</span><span class="cp-ley cp-ley-dubcard"><i></i>DUBCARD urgente (&lt;3d)</span><span class="cp-ley cp-ley-vencida"><i></i>Vencida (muestra días)</span></div>' : '')
    + (ST.tab === 'en_curso'
        ? (!enCurso.length ? '<div class="cs-nada">Sin proyectos activos. Pulsa «Nuevo» para agregar el primero.</div>'
          : '<div class="cp-tabla-w"><table class="cp-tabla">' + CABECERA() + '<tbody>'
            + seccion(pre, 'cp-sec-pre', 'Preproducción') + seccion(activa, 'cp-sec-activa', 'Producción activa')
            + (!pre.length && !activa.length ? '<tr><td colspan="7" class="cs-nada">' + (hayFiltros ? 'Sin resultados: prueba con otros filtros' : 'Sin registros activos') + '</td></tr>' : '')
            + '</tbody></table></div>')
        : (!hechos.length ? '<div class="cs-nada">Aún no hay proyectos finalizados.</div>'
          : '<div class="cp-tabla-w cp-archivo"><div class="cp-archivo-t">Archivo · solo lectura (' + hechos.length + ')</div><table class="cp-tabla">' + CABECERA() + '<tbody>'
            + fin.map(r => filaHtml(r, true, d)).join('') + (!fin.length ? '<tr><td colspan="7" class="cs-nada">Sin resultados para los filtros aplicados</td></tr>' : '') + '</tbody></table></div>'))
    + '<button class="cp-nuevo" data-pc="nuevo" title="Agregar un programa">' + ico('mas', 15) + '<span>Nuevo</span></button>'
    + (ST.lista ? listaHtml() : '');
}

/* ── Las acciones ─────────────────────────────────────────────────────────── */

function nuevo(){
  const r = { id: nuevoId(), programa: '', capitulo: '', desglose_provisional: false, casting_completo: false, cliente: '', director: '', fecha_miami: '', formato_dubcard: 'Excel', fecha_dubcard: '', fase: 'pre_produccion' };
  ST.tab = 'en_curso';
  return editar(p => { p.produccion.unshift(r); return true; }, 'Producción: registro nuevo');
}
function avanzar(row){
  const next = row.fase === 'pre_produccion' ? 'produccion_activa' : 'completado';
  return actualizar(row.id, { fase: next }, next === 'completado' ? 'Producción: finalizado ' + row.programa + ' ' + row.capitulo : 'Producción activa: ' + row.programa + ' ' + row.capitulo + ' (Miami entregada)');
}
function exportar(d){
  const all = filas(d);
  const hdrs = ['Programa', 'Capítulo', 'Desglose', 'Casting completo', 'Cliente', 'Director', 'Fecha Miami', 'Formato DUBCARD', 'Fecha DUBCARD', 'Fase'];
  const ws = XLSX.utils.aoa_to_sheet([hdrs].concat(all.map(r => [r.programa, r.capitulo, r.desglose_provisional ? 'Sí' : 'No', r.casting_completo ? 'Sí' : 'No', r.cliente, r.director, r.fecha_miami, r.formato_dubcard, r.fecha_dubcard, PC_FASE_LABELS[r.fase] || r.fase])));
  const wb = XLSX.utils.book_new(); XLSX.utils.book_append_sheet(wb, ws, 'Producción Casting');
  XLSX.writeFile(wb, 'produccion_casting_' + new Date().toISOString().slice(0, 10) + '.xlsx');
  aviso('Exportado');
}
async function importar(file){
  if(!file) return;
  try{
    const buf = await file.arrayBuffer(); const wb = XLSX.read(buf, { type: 'array' });
    const raw = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
    if(raw.length < 2){ aviso('El archivo está vacío'); return; }
    const FM = { 'Pre-producción': 'pre_produccion', 'En Producción': 'produccion_activa', 'Finalizado': 'completado' };
    let skipped = 0;
    const items = raw.slice(1).map(r => {
      const p = safe(r[0]).trim(); if(!p){ skipped++; return null; }
      const cli = safe(r[4]).trim(), fmtRaw = safe(r[7]).trim();
      const fmt = cli.toLowerCase().includes('netflix') ? 'BACKLOT' : (PC_DUBCARD_OPTS.includes(fmtRaw) ? fmtRaw : 'Excel');
      return { id: nuevoId(), programa: p, capitulo: safe(r[1]).trim(), desglose_provisional: parseBool(r[2]), casting_completo: parseBool(r[3]), cliente: cli, director: safe(r[5]).trim(), fecha_miami: parseExcelDate(r[6]), formato_dubcard: fmt, fecha_dubcard: parseExcelDate(r[8]), fase: FM[safe(r[9]).trim()] || 'pre_produccion' };
    }).filter(Boolean);
    if(items.length) await editar(p => { p.produccion = p.produccion.concat(items); return true; }, 'Producción: ' + items.length + ' importados');
    aviso(items.length + ' importados' + (skipped ? ' · ' + skipped + ' omitidos' : ''));
  }catch(err){ aviso('No se pudo importar: ' + safe(err.message)); }
}


function cablear(raiz){
  if(!raiz) return;
  const d = datos();
  const fila = (id) => filas(d).find(r => mismo(r.id, id));
  raiz.querySelectorAll('[data-pc]').forEach(el => {
    const que = el.getAttribute('data-pc'), id = el.getAttribute('data-id'), c = el.getAttribute('data-c'), v = el.getAttribute('data-v');
    if(que === 'txt') el.onchange = () => { const r = fila(id); if(r) upd(r, c, el.value.trim()); };
    else if(que === 'sel') el.onchange = () => { const r = fila(id); if(r) upd(r, c, el.value); };
    else if(que === 'fecha'){
      el.onchange = () => { const r = fila(id); if(r) upd(r, c, el.value); };
      el.onclick = () => { try{ if(typeof el.showPicker === 'function') el.showPicker(); }catch(err){ /* el navegador abre el suyo */ } };
      el.onkeydown = (ev) => {
        if(ev.key === 'Tab' || ev.key === 'Escape' || ev.key === 'Enter') return;
        ev.preventDefault();
        if(ev.key === 'Backspace' || ev.key === 'Delete'){ el.value = ''; el.onchange(); }
        else try{ if(typeof el.showPicker === 'function') el.showPicker(); }catch(err){ /* el navegador abre el suyo */ }
      };
    }
    else if(que === 'fase') el.onclick = () => { const r = fila(id); if(r) avanzar(r); };
    else if(que === 'reabrir') el.onclick = () => { ST.tab = 'en_curso'; actualizar(id, { fase: 'produccion_activa' }, 'Producción: reabierto'); };
    else if(que === 'borrar') el.onclick = async () => {
      const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal) ? await DDL_UI.confirmModal({ title: 'Eliminar registro', body: '¿Eliminar este registro de producción?', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', danger: true }) : true;
      if(ok) editar(p => { const n = p.produccion.length; p.produccion = p.produccion.filter(r => !mismo(r.id, id)); return p.produccion.length !== n; }, 'Producción: registro eliminado');
    };
    else if(que === 'nuevo') el.onclick = () => { nuevo(); };
    else if(que === 'tab') el.onclick = () => { ST.tab = v; repintar(); };
    else if(que === 'orden') el.onclick = () => { if(ST.sortBy === v) ST.sortDir = ST.sortDir === 'asc' ? 'desc' : 'asc'; else { ST.sortBy = v; ST.sortDir = 'asc'; } repintar(); };
    else if(que === 'filtro') el.onchange = () => { ST[c] = el.value; repintar(); };
    else if(que === 'buscar') el.oninput = () => {
      ST.buscar = el.value; const pos = el.selectionStart; repintar();
      const n = document.getElementById('cpBuscar'); if(n){ try{ n.focus(); n.setSelectionRange(pos, pos); }catch(err){ /* el cursor al final */ } }
    };
    else if(que === 'limpiar') el.onclick = () => { ST.buscar = ''; ST.cliente = ''; ST.director = ''; ST.alerta = ''; repintar(); };
    else if(que === 'exportar') el.onclick = () => { try{ exportar(d); }catch(err){ aviso('No se pudo exportar: ' + err.message); } };
    else if(que === 'importar') el.onclick = () => { const i = raiz.querySelector('#cpImportar'); if(i) i.click(); };
    else if(que === 'reset') el.onclick = async () => {
      const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal) ? await DDL_UI.confirmModal({ title: 'Limpiar todo', body: '¿Limpiar TODOS los registros de producción? No se puede deshacer.', confirmLabel: 'Limpiar', cancelLabel: 'Cancelar', danger: true }) : true;
      if(ok) editar(p => { const n = p.produccion.length; p.produccion = []; return n > 0; }, 'Producción: todos los registros eliminados');
    };
    else if(que === 'lista') el.onclick = () => { ST.lista = v; ST.listaItems = ((d && d[v === 'director' ? 'directorList' : 'clienteList']) || []).slice(); repintar(); };
    else if(que === 'listaAdd') el.onclick = () => { const i = raiz.querySelector('#cpListaNuevo'), x = i ? i.value.trim() : ''; if(x && ST.listaItems.indexOf(x) < 0){ ST.listaItems.push(x); repintar(); } };
    else if(que === 'listaQuitar') el.onclick = () => { ST.listaItems.splice(+el.getAttribute('data-i'), 1); repintar(); };
    else if(que === 'listaGuardar') el.onclick = () => {
      const k = ST.lista === 'director' ? 'directorList' : 'clienteList', items = ST.listaItems.slice();
      ST.lista = null;
      if(typeof csEditar === 'function') csEditar(p => { if(JSON.stringify(p[k] || []) === JSON.stringify(items)) return false; p[k] = items; return true; }, (k === 'directorList' ? 'Lista de directores' : 'Lista de clientes') + ' actualizada');
      repintar();
    };
    else if(que === 'cerrar') el.onclick = () => { ST.lista = null; repintar(); };
    else if(que === 'fondo'){
      el.onclick = (ev) => { if(ev.target === el){ ST.lista = null; repintar(); } };
      el.onkeydown = (ev) => { if(ev.key === 'Escape'){ ST.lista = null; repintar(); } };
    }
  });
  const imp = raiz.querySelector('#cpImportar');
  if(imp) imp.onchange = () => { importar(imp.files && imp.files[0]); imp.value = ''; };
  const ov = raiz.querySelector('.cs-tr-ov');
  if(ov){ const i = ov.querySelector('input'); if(i) try{ i.focus(); }catch(e){ /* sin foco */ } }
}


return { html: html, cablear: cablear, ST: ST, filas: filas, aplicar: aplicar, colorFila: colorFila };
})();

/* ═══ FIN DE PRODUCCIÓN CASTING EN DUBBIPT ═══ */

