/* Producción Casting, como en DublajeCast · especificacion 09, PRO-42
 *
 * Pedido de sala, con una captura: «quiero que la pestaña de producción se
 * vea como la de la captura y que tenga todas las funciones, excepto las
 * casillas de marcar desglose y casting».
 *
 * Es ProduccionCastingView de DublajeCast, sobre los mismos datos (su lista
 * `produccion`, `clienteList`, `directorList`): pestañas en curso /
 * completados; buscador y filtros por cliente, director y alertas; la
 * leyenda de colores; secciones de preproducción y producción activa; cada
 * fila con programa y capítulo editables, cliente y director (con su lista),
 * entrega a Miami, formato y entrega de DUBCARD con sus alertas, Iniciar /
 * Finalizar y eliminar; el archivo de completados, de solo lectura, con
 * «Reabrir»; ordenar por columna; importar y exportar Excel; la API externa
 * de fechas (configurar, probar, aplicar y sincronizar sola); «Reset»; y el
 * botón flotante «Nuevo». Sin las casillas de desglose y casting (sus datos
 * se conservan, y el Excel los sigue llevando).
 *
 * Las funciones puras se copian tal cual de dublajecast/index.html (alertas,
 * fechas, Excel, API externa); la interfaz es nueva, sin React, dentro de una
 * función para que sus nombres no choquen con los de Dubbipt. Todo se guarda
 * en DublajeCast con csEditar. Hacia fuera: CSP.html(datos, vivo), CSP.cablear(raiz).
 * De donde depende: XLSX, csEditar, csDatos, csRepintar, csCabecera, csIco,
 * castAviso, dcxUid, DDL_UI.
 */

/* ═══ PRODUCCIÓN CASTING EN DUBBIPT ══════════════════════════════════════════ */

const CSP = (function(){
'use strict';

/* ── Copiado de DublajeCast ── */
const safe=v=>String(v==null?"":v);
const normN=n=>safe(n).toLowerCase().replace(/[áä]/g,"a").replace(/[éë]/g,"e").replace(/[íï]/g,"i").replace(/[óö]/g,"o").replace(/[úü]/g,"u").replace(/ñ/g,"n").replace(/\([^)]*\)/g,"").replace(/\s+/g," ").trim();
function lev(a,b){if(!a.length)return b.length;if(!b.length)return a.length;const r=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=i;for(let j=1;j<=b.length;j++){const v=a[i-1]===b[j-1]?r[j-1]:1+Math.min(r[j-1],r[j],p);r[j-1]=p;p=v;}r[b.length]=p;}return r[b.length];}
const simN=(a,b)=>{const na=normN(a),nb=normN(b),mx=Math.max(na.length,nb.length);return mx?Math.round((1-lev(na,nb)/mx)*100):100;};
function fuzzyScore(query,text){
  const nq=normN(query),nt=normN(text);
  if(!nq||!nt)return 0;
  if(nt.includes(nq))return 100;                       // substring exacto
  let best=simN(nq,nt);                                // string completo
  const qToks=nq.split(" ").filter(Boolean);
  for(const tok of nt.split(" ")){                     // nombres y apellidos por separado
    if(!tok)continue;
    if(tok.startsWith(nq))best=Math.max(best,95);
    best=Math.max(best,simN(nq,tok));
    for(const qt of qToks){if(qt.length>=3)best=Math.max(best,simN(qt,tok));}
  }
  return best;
}
const API_CFG_KEY="dc_ext_api_cfg_v1";
function getApiCfg(){try{const v=localStorage.getItem(API_CFG_KEY);return v?JSON.parse(v):null;}catch(e){return null;}}
function saveApiCfg(cfg){try{if(cfg)localStorage.setItem(API_CFG_KEY,JSON.stringify(cfg));else localStorage.removeItem(API_CFG_KEY);}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}try{window.dispatchEvent(new Event("dc-apicfg"));}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}}
const API_CFG_DEFAULT={enabled:false,url:"",authType:"none",authKey:"",authValue:"",jsonPath:"",fieldProgram:"programa",fieldChapter:"capitulo",fieldMiami:"fecha_miami",fieldDubcard:"fecha_dubcard",intervalMin:60};

// Normaliza una fecha de cualquier formato común a YYYY-MM-DD
function normDate(v){
  if(v==null||v==="")return"";
  const s=String(v).trim();
  // ISO o YYYY-MM-DD (posible con hora)
  let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if(m)return m[1]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[3]).padStart(2,"0");
  // DD/MM/YYYY o DD-MM-YYYY
  m=s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if(m)return m[3]+"-"+String(m[2]).padStart(2,"0")+"-"+String(m[1]).padStart(2,"0");
  // MM/DD/YYYY (heurística: si el primero >12 ya lo cubrió arriba)
  const d=new Date(s);
  if(!isNaN(d.getTime()))return d.toISOString().slice(0,10);
  return"";
}

// Obtiene un valor de un objeto por ruta con puntos ("data.entregas")
function getByPath(obj,path){
  if(!path)return obj;
  return path.split(".").reduce((o,k)=>(o&&o[k]!==undefined)?o[k]:undefined,obj);
}

// Parsea CSV simple a array de objetos
function parseCSV(text){
  const lines=text.trim().split(/\r?\n/);if(lines.length<2)return[];
  const split=l=>{const out=[];let cur="",q=false;for(let i=0;i<l.length;i++){const c=l[i];if(c==='"'){q=!q;}else if(c===","&&!q){out.push(cur);cur="";}else cur+=c;}out.push(cur);return out.map(x=>x.trim().replace(/^"|"$/g,""));};
  const headers=split(lines[0]);
  return lines.slice(1).map(l=>{const cells=split(l);const o={};headers.forEach((h,i)=>o[h]=cells[i]||"");return o;});
}

// Descarga y normaliza las filas de la API externa
async function fetchExternalRows(cfg){
  const headers={};let url=cfg.url;
  if(cfg.authType==="header"&&cfg.authKey)headers[cfg.authKey]=cfg.authValue;
  if(cfg.authType==="query"&&cfg.authKey){const sep=url.includes("?")?"&":"?";url+=sep+encodeURIComponent(cfg.authKey)+"="+encodeURIComponent(cfg.authValue);}
  const res=await fetch(url,{headers,cache:"no-store"});
  if(!res.ok)throw new Error("HTTP "+res.status+" "+res.statusText);
  const ct=(res.headers.get("content-type")||"").toLowerCase();
  const text=await res.text();
  let arr;
  if(ct.includes("json")||text.trim().startsWith("{")||text.trim().startsWith("[")){
    let data=JSON.parse(text);
    data=getByPath(data,cfg.jsonPath);
    arr=Array.isArray(data)?data:(data?[data]:[]);
  }else{
    arr=parseCSV(text);
  }
  return arr.map(row=>({
    programa:String(getByPath(row,cfg.fieldProgram)??"").trim(),
    capitulo:String(getByPath(row,cfg.fieldChapter)??"").trim(),
    fecha_miami:normDate(getByPath(row,cfg.fieldMiami)),
    fecha_dubcard:normDate(getByPath(row,cfg.fieldDubcard))
  })).filter(r=>r.programa);
}

// Empareja capítulo externo con el interno (tolerante a formatos)
function chapterMatches(internalCap,externalCap){
  const a=normN(internalCap),b=normN(externalCap);
  if(!b)return false;
  if(a===b)return true;
  // Película
  if(/pelicula|movie|film|largometraje/.test(a)&&/pelicula|movie|film|largometraje/.test(b))return true;
  // Comparar por número de episodio
  // Se compara el ÚLTIMO número (en "Temporada 2 Ep 5" el episodio es 5) y, si ambos traen temporada, también la temporada
  const numsA=a.match(/\d+/g)||[],numsB=b.match(/\d+/g)||[];
  const na=numsA[numsA.length-1],nb=numsB[numsB.length-1];
  if(na&&nb&&parseInt(na,10)===parseInt(nb,10)){
    if(numsA.length>1&&numsB.length>1&&parseInt(numsA[0],10)!==parseInt(numsB[0],10))return false;
    return true;
  }
  return false;
}

// Calcula qué filas de producción se actualizarían (dry-run / preview)
function computeExternalUpdates(rows,produccion){
  const updates=[];
  (rows||[]).forEach(ext=>{
    let match=null,bestSc=0,secondSc=0;
    (produccion||[]).forEach(pr=>{if(!chapterMatches(pr.capitulo,ext.capitulo))return;const sc=fuzzyScore(ext.programa,pr.programa);if(sc>bestSc){secondSc=bestSc;bestSc=sc;match=pr;}else if(sc>secondSc)secondSc=sc;});
    if(!match||bestSc<85||(bestSc<100&&bestSc-secondSc<10))return; // sin candidato claro: no tocar fechas
    const change={};
    if(ext.fecha_miami&&ext.fecha_miami!==match.fecha_miami)change.fecha_miami=ext.fecha_miami;
    if(ext.fecha_dubcard&&ext.fecha_dubcard!==match.fecha_dubcard)change.fecha_dubcard=ext.fecha_dubcard;
    if(Object.keys(change).length)updates.push({id:match.id,programa:match.programa,capitulo:match.capitulo,...change,_prev:{fecha_miami:match.fecha_miami,fecha_dubcard:match.fecha_dubcard}});
  });
  return updates;
}
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

const ST = { tab: 'en_curso', buscar: '', cliente: '', director: '', alerta: '', sortBy: null, sortDir: 'asc', lista: null, listaItems: [], api: false, apiPrev: null, apiBusy: false, apiCfg: null };
const E = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ico = (n, sz) => (typeof csIco === 'function') ? csIco(n, sz || 13) : '';
const aviso = t => { try{ castAviso(t); }catch(e){ /* sin avisos */ } };
const repintar = () => { try{ csRepintar(); }catch(e){ /* fuera de la vista de Casting */ } };
const datos = () => { try{ return (typeof csDatos === 'function') ? csDatos().datos : null; }catch(e){ return null; } };
const nuevoId = () => (typeof dcxUid === 'function') ? dcxUid() : Date.now() * 1000 + Math.floor(Math.random() * 1000);
const mismo = (a, b) => String(a) === String(b);

/** Un cambio en DublajeCast, como sus acciones PRODUCCION/…: lee, cambia y guarda (con la sesión de DublajeCast). */
function editar(cambio, que){
  if(typeof csEditar !== 'function'){ aviso('Sin conexión con DublajeCast'); return Promise.resolve('error'); }
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

/** Las filas con su fase (por omisión, preproducción, como en DublajeCast). */
function filas(d){ return ((d && d.produccion) || []).map(r => Object.assign({ fase: 'pre_produccion' }, r)); }

function alertas(row){ return { m: calcMiamiAlert(row.fecha_miami, row.fase), d: calcDubcardAlert(row.fecha_dubcard, row.formato_dubcard, row.fase) }; }
function esVencida(a){ return !!((a.m && a.m.label.startsWith('Vencida')) || (a.d && a.d.label.startsWith('Vencida'))); }

/** Buscar, filtrar y ordenar: lo de DublajeCast. */
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

function apiHtml(){
  const c = ST.apiCfg || getApiCfg() || API_CFG_DEFAULT;
  const v = (k) => E(c[k] == null ? '' : c[k]);
  const pv = ST.apiPrev;
  return '<div class="cs-tr-ov" data-pc="fondo"><div class="cs-tr-form cp-modal cp-api" role="dialog" aria-modal="true" aria-label="Conectar API externa de fechas"><div class="cs-tr-form-t">Conectar API externa de fechas</div>'
    + '<div class="cp-tenue">Lee fechas de entrega desde tu API y las ancla a los capítulos existentes (empareja por nombre de programa + capítulo). JSON o CSV. Solo actualiza fechas; no crea ni borra capítulos.</div>'
    + '<label class="cp-check"><input type="checkbox" id="cpApi_enabled"' + (c.enabled ? ' checked' : '') + '> Sincronización automática activada</label>'
    + '<label>URL del endpoint<input id="cpApi_url" value="' + v('url') + '" placeholder="https://api.tucliente.com/entregas"></label>'
    + '<label>Autenticación<select id="cpApi_authType">' + [['none', 'Ninguna'], ['header', 'Header (token)'], ['query', 'Parámetro en la URL']].map(o => '<option value="' + o[0] + '"' + ((c.authType || 'none') === o[0] ? ' selected' : '') + '>' + o[1] + '</option>').join('') + '</select></label>'
    + '<div class="cs-tr-campos cs-tr-2"><label>Nombre<input id="cpApi_authKey" value="' + v('authKey') + '" placeholder="Authorization / api_key"></label><label>Valor<input id="cpApi_authValue" type="password" autocomplete="off" value="' + v('authValue') + '" placeholder="Bearer xxxxx"></label></div>'
    + '<details class="cp-det"><summary>Mapeo de campos</summary><div class="cs-tr-campos cs-tr-2">'
    +   '<label>Programa<input id="cpApi_fieldProgram" value="' + v('fieldProgram') + '"></label><label>Capítulo<input id="cpApi_fieldChapter" value="' + v('fieldChapter') + '"></label>'
    +   '<label>Fecha Miami<input id="cpApi_fieldMiami" value="' + v('fieldMiami') + '"></label><label>Fecha DUBCARD<input id="cpApi_fieldDubcard" value="' + v('fieldDubcard') + '"></label></div>'
    +   '<label>Ruta al arreglo (opcional, p. ej. «data.entregas»)<input id="cpApi_jsonPath" value="' + v('jsonPath') + '"></label></details>'
    + '<label>Frecuencia (minutos, mínimo 5)<input id="cpApi_intervalMin" type="number" min="5" value="' + v('intervalMin') + '"></label>'
    + '<button class="cs-b" data-pc="apiProbar"' + (ST.apiBusy ? ' disabled' : '') + '>' + (ST.apiBusy ? 'Probando…' : 'Probar y previsualizar') + '</button>'
    + (pv && pv.error ? '<div class="cp-mal">' + E(pv.error) + '</div>' : '')
    + (pv && !pv.error ? '<div class="cp-prev"><b>Se leyeron ' + pv.rows + ' registro(s) · ' + pv.updates.length + ' para actualizar</b>'
        + pv.updates.slice(0, 20).map(u => '<div>' + E(u.programa + ' · ' + u.capitulo) + (u.fecha_miami ? ' · Miami: ' + E(u.fecha_miami) : '') + (u.fecha_dubcard ? ' · DUBCARD: ' + E(u.fecha_dubcard) : '') + '</div>').join('') + '</div>' : '')
    + '<div class="cs-tr-form-b">' + (getApiCfg() ? '<button class="cs-b cs-borrar" data-pc="apiQuitar">Desconectar</button>' : '') + '<button class="cs-b" data-pc="cerrar">Cancelar</button>'
    +   (pv && !pv.error && pv.updates.length ? '<button class="cs-b" data-pc="apiAplicar">Aplicar ahora</button>' : '') + '<button class="cs-b cs-pri" data-pc="apiGuardar">Guardar</button></div></div></div>';
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
    + '<button class="cs-b" data-pc="sincronizar" title="Traer fechas de la API externa ahora">' + ico('actualizar', 13) + '<span>Sincronizar fechas</span></button>'
    + '<button class="cs-b" data-pc="api" title="Configurar la conexión con la API externa">' + ico('externo', 13) + '<span>API</span></button>'
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
    + (ST.lista ? listaHtml() : '') + (ST.api ? apiHtml() : '');
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

/** Trae las fechas de la API externa y las aplica (lo de useExternalDateSync de DublajeCast). */
async function sincronizar(verbose){
  const cfg = getApiCfg();
  if(!cfg || !cfg.enabled || !cfg.url){ if(verbose) aviso('Configura primero la API externa'); return { ok: false }; }
  try{
    const rows = await fetchExternalRows(cfg);
    const d = datos();
    const updates = computeExternalUpdates(rows, d ? d.produccion : []);
    if(updates.length) await aplicarFechas(updates);
    else if(verbose) aviso('Sin cambios: las fechas ya están al día (' + rows.length + ' registros leídos)');
    try{ localStorage.setItem(API_CFG_KEY, JSON.stringify(Object.assign({}, cfg, { lastSync: Date.now(), lastResult: updates.length + ' actualizadas / ' + rows.length + ' leídas' }))); }catch(e){ /* sin almacén */ }
    return { ok: true, updates: updates.length, read: rows.length };
  }catch(e){
    const em = (e && e.message) || String(e);
    const msg = /Failed to fetch|NetworkError|CORS|Content Security|violates/i.test(em) ? 'No se pudo conectar: la API debe permitir CORS, y Dubbipt solo conecta con los sitios que permite su política de seguridad' : em;
    if(verbose) aviso('API externa: ' + msg);
    return { ok: false, error: msg };
  }
}
function aplicarFechas(updates){
  const map = {}; (updates || []).forEach(u => { map[String(u.id)] = u; });
  return editar(p => {
    let hubo = false;
    p.produccion = p.produccion.map(r => {
      const u = map[String(r.id)]; if(!u) return r;
      const n = Object.assign({}, r);
      if(u.fecha_miami !== undefined) n.fecha_miami = u.fecha_miami;
      if(u.fecha_dubcard !== undefined) n.fecha_dubcard = u.fecha_dubcard;
      hubo = true; return n;
    });
    return hubo;
  }, updates.length + ' fecha(s) actualizada(s) desde la API externa');
}
function apiLeer(raiz){
  const v = (k) => { const i = raiz.querySelector('#cpApi_' + k); return i ? (i.type === 'checkbox' ? !!i.checked : String(i.value || '').trim()) : ''; };
  return { enabled: v('enabled'), url: v('url'), authType: v('authType') || 'none', authKey: v('authKey'), authValue: v('authValue'), jsonPath: v('jsonPath'),
           fieldProgram: v('fieldProgram') || 'programa', fieldChapter: v('fieldChapter') || 'capitulo', fieldMiami: v('fieldMiami') || 'fecha_miami', fieldDubcard: v('fieldDubcard') || 'fecha_dubcard',
           intervalMin: Math.max(5, Number(v('intervalMin')) || 60) };
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
    else if(que === 'sincronizar') el.onclick = () => { sincronizar(true); };
    else if(que === 'api') el.onclick = () => { ST.api = true; ST.apiPrev = null; ST.apiCfg = null; repintar(); };
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
    else if(que === 'cerrar') el.onclick = () => { ST.lista = null; ST.api = false; repintar(); };
    else if(que === 'fondo'){
      el.onclick = (ev) => { if(ev.target === el){ ST.lista = null; ST.api = false; repintar(); } };
      el.onkeydown = (ev) => { if(ev.key === 'Escape'){ ST.lista = null; ST.api = false; repintar(); } };
    }
    else if(que === 'apiProbar') el.onclick = async () => {
      const c2 = apiLeer(raiz); ST.apiCfg = c2;
      if(!c2.url){ aviso('Ingresa la URL primero'); return; }
      if(!/^https:\/\//i.test(c2.url)){ aviso('La URL debe usar https:// (la clave viajaría en claro)'); return; }
      ST.apiBusy = true; ST.apiPrev = null; repintar();
      try{ const rows = await fetchExternalRows(c2); const dd = datos(); ST.apiPrev = { rows: rows.length, updates: computeExternalUpdates(rows, dd ? dd.produccion : []) }; }
      catch(e){ const m = (e && e.message) || String(e); ST.apiPrev = { error: /Failed to fetch|NetworkError|CORS|Content Security|violates/i.test(m) ? 'No se pudo conectar. Causas comunes: la API no permite CORS desde el navegador, la URL es incorrecta, falta la clave, o el sitio no está entre los que permite la política de seguridad de Dubbipt.' : m }; }
      finally{ ST.apiBusy = false; repintar(); }
    };
    else if(que === 'apiGuardar') el.onclick = () => { saveApiCfg(apiLeer(raiz)); ST.api = false; aviso('Conexión guardada'); arrancarSync(); repintar(); };
    else if(que === 'apiAplicar') el.onclick = () => { const pv = ST.apiPrev; saveApiCfg(apiLeer(raiz)); ST.api = false; if(pv && pv.updates && pv.updates.length) aplicarFechas(pv.updates); repintar(); };
    else if(que === 'apiQuitar') el.onclick = () => { saveApiCfg(null); ST.api = false; aviso('API desconectada'); arrancarSync(); repintar(); };
  });
  const imp = raiz.querySelector('#cpImportar');
  if(imp) imp.onchange = () => { importar(imp.files && imp.files[0]); imp.value = ''; };
  const ov = raiz.querySelector('.cs-tr-ov');
  if(ov){ const i = ov.querySelector('input'); if(i) try{ i.focus(); }catch(e){ /* sin foco */ } }
}

/* La sincronización automática con la API externa, como en DublajeCast: a los segundos de abrir y cada `intervalMin`. */
const SYNC = { t0: null, iv: null };
function arrancarSync(){
  if(SYNC.t0) clearTimeout(SYNC.t0); if(SYNC.iv) clearInterval(SYNC.iv);
  SYNC.t0 = SYNC.iv = null;
  const cfg = getApiCfg();
  if(!cfg || !cfg.enabled || !cfg.url) return false;
  const mins = Math.max(5, Number(cfg.intervalMin) || 60);
  SYNC.t0 = setTimeout(() => { if(datos()) sincronizar(false); }, 8000);
  SYNC.iv = setInterval(() => { if(datos()) sincronizar(false); }, mins * 60000);
  return true;
}

return { html: html, cablear: cablear, ST: ST, filas: filas, aplicar: aplicar, colorFila: colorFila, computeExternalUpdates: computeExternalUpdates, sincronizar: sincronizar, arrancarSync: arrancarSync };
})();

/* ═══ FIN DE PRODUCCIÓN CASTING EN DUBBIPT ═══ */

/* La sincronización con la API externa, si está configurada en este equipo (fuera de la sección: las pruebas no la arrancan). */
if(typeof window !== 'undefined' && !window.__cspSync){ window.__cspSync = true; try{ CSP.arrancarSync(); }catch(e){ /* sin API configurada */ } }
