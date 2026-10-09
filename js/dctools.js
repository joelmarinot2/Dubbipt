/* DUBCARDs, Breakdowns y Pegado de casting, dentro de Dubbipt · especificacion 09, PRO-38
 *
 * Pedido de sala: «quiero que las herramientas de dubcards, breakdowns,
 * producción y tráiler estén dentro de Dubbipt, que no sea un link».
 * Producción y Tráilers ya eran de Dubbipt (castingvistas.js). DUBCARDs,
 * Breakdowns y Pegado de casting abrían DublajeCast; ahora se usan aquí:
 *
 *   · El procesado es el MISMO de DublajeCast: su código, copiado tal cual
 *     de dublajecast/index.html (líneas de DC_CREW a bdPrint), con tres
 *     cambios para Dubbipt: fflate en vez de JSZip para leer y escribir
 *     Word, el pdf.js que ya carga Dubbipt, y Groq y OpenRouter por el proxy
 *     /api/llm del sitio (la CSP de Dubbipt no deja llamarlos directo).
 *   · La interfaz es nueva, sin React, con el aspecto de la vista de Casting.
 *   · Los breakdowns se guardan donde los guarda DublajeCast (su lista
 *     `breakdowns`), así se ven en los dos sitios. La clave de API se guarda
 *     en este equipo con la misma clave de almacenamiento que DublajeCast.
 *   · Pegado de casting es una página aparte (dctools/pegado-casting.html,
 *     la misma que DublajeCast lleva dentro) que se abre aquí, en un marco.
 *
 * Todo va dentro de una función para que sus nombres (safe, lev, normN…)
 * no choquen con los de Dubbipt. Hacia fuera: DCT.html(vista), DCT.cablear(raiz, vista).
 * De donde depende: XLSX, fflate, pdfjsLib, csIco, csEditar, csDatos, csRepintar,
 * dcxEntrada, castAviso, PROD.
 */

/* ═══ HERRAMIENTAS DE DUBLAJECAST EN DUBBIPT ══════════════════════════════════ */

const DCT = (function(){
'use strict';

/* ── Lo que el código de DublajeCast toma de su propio archivo ── */
const safe=v=>String(v==null?"":v);
function lev(a,b){if(!a.length)return b.length;if(!b.length)return a.length;const r=[...Array(b.length+1).keys()];for(let i=1;i<=a.length;i++){let p=i;for(let j=1;j<=b.length;j++){const v=a[i-1]===b[j-1]?r[j-1]:1+Math.min(r[j-1],r[j],p);r[j-1]=p;p=v;}r[b.length]=p;}return r[b.length];}
const normN=n=>safe(n).toLowerCase().replace(/[áä]/g,"a").replace(/[éë]/g,"e").replace(/[íï]/g,"i").replace(/[óö]/g,"o").replace(/[úü]/g,"u").replace(/ñ/g,"n").replace(/\([^)]*\)/g,"").replace(/\s+/g," ").trim();
const simN=(a,b)=>{const na=normN(a),nb=normN(b),mx=Math.max(na.length,nb.length);return mx?Math.round((1-lev(na,nb)/mx)*100):100;};
function extractEpNum(fn){const b=String(fn||"").replace(/\.(xlsx|xlsm|xls|csv)$/i,"");const m=b.match(/[st]\d{1,2}\s*[ex]\s*0*(\d{1,3})/i)||b.match(/(?:^|[^a-z])(?:ep|episodio|cap(?:itulo)?)[\s._-]*0*(\d{1,3})(?!\d)/i)||b.match(/(?:^|[\s._\-#(])0*(\d{1,3})(?=$|[\s._\-)])/);return m?parseInt(m[1],10):null;}
async function readFileBuffer(file){
  try{
    if(!file)throw new Error("Archivo vacío");
    if(file.size===0)throw new Error("«"+file.name+"» está vacío (0 bytes)");
    return await file.arrayBuffer();
  }catch(e){
    const nm=(e&&e.name)||"";const msg=(e&&e.message)||String(e);
    if(nm==="NotReadableError"||/could not be read|permission|NotReadable/i.test(msg))
      throw new Error("No se pudo leer «"+file.name+"»: el archivo está abierto en Excel o bloqueado por Windows/OneDrive. Ciérralo y vuelve a subirlo.");
    if(nm==="NotFoundError")throw new Error("«"+file.name+"» ya no está en esa carpeta (se movió o renombró). Vuelve a seleccionarlo.");
    throw new Error("No se pudo leer «"+file.name+"»: "+msg);
  }
}

/* ── El código de DublajeCast (copiado; ver arriba) ─────────────────────── */
const DC_CREW=[
  {rol:'Dirección de Doblaje',nombre:'Wilfredo Hueso'},
  {rol:'Mezcla de Sonido',nombre:'Edwin Rodriguez'},
  {rol:'Traducción',nombre:'María Carmela Yépez'},
  {rol:'Adaptación',nombre:'Diana Perilla'},
  {rol:'Grabación',nombre:'Sara Peláez'},
  {rol:'Dirección de Casting',nombre:'Henry Perez'},
  {rol:'Asistente de Doblaje',nombre:'Joel Marino'},
  {rol:'Detección de Lipsync',nombre:'Camila Santacruz Dulce'},
  {rol:'Supervisión de Producción',nombre:'Flor García'},
  {rol:'Gestión de Proyectos',nombre:'Juan Camilo Forero'},
  {rol:'Gestión de Operaciones',nombre:'Natalia Aparicio'},
  {rol:'Mánager de Estudio',nombre:'Andrea Nieto'},
];
const DC_KW=['MALE','FEMALE','GIRL','BOY','MAN','WOMAN','CHILD','NIÑO','NIÑA','HOMBRE','MUJER','EXTRA','ADDITIONAL','CROWD','PEOPLE','PERSON','BACKGROUND','BG','TRANSEUNTE','PASANTE','ANCIANO','ANCIANA','JOVEN','ADULTO','ADULTA','KID','TEENS','TEEN','WIFE','WALLA','NONE','DOCTOR','NURSE','GUARD','SOLDIER','DRIVER','WAITER','WAITRESS','VENDOR','SERVANT','WORKER','OFFICER','THIEF','VILLAGER','NEIGHBOR','PASSENGER','PILOT','REPORTER','ANNOUNCER','COACH','REFEREE','JUDGE','LAWYER','PRISONER','TOURIST','STRANGER','THUG','GANGSTER','CONSTABLE','BUSINESSMAN','BUSINESSWOMAN','HOSTAGE','FIGHTER','POLICE','POLICEMAN','POLICEWOMAN','DETECTIVE','CAPTAIN','MINION','HENCHMAN','GOON','BANDIT','BUTLER','MAID','CHEF','COOK','CLERK','SHOPKEEPER','MERCHANT','BEGGAR','BYSTANDER','ONLOOKER','SPECTATOR','FAN','STUDENT','TEACHER','CUSTOMER','CLIENT','PATIENT','VICTIM','WITNESS','SUSPECT','CRIMINAL','ROBBER','ATTENDANT','RECEPTIONIST','INTERN','SECRETARY','GATEKEEPER','TOWNSPERSON','TOWNSFOLK','CITIZEN','RESIDENT','INHABITANT','GRUNT','LACKEY','FODDER','RUFFIAN','PUNK','ROGUE','HUNTER','ARCHER','WARRIOR','KNIGHT','SWORDSMAN','ASSASSIN','MERCENARY','PIRATE','NINJA','SAMURAI','MONK','PRIEST'];
DC_KW.push("GRUPO","MIXTO","AMBIENTE","MULTITUD","VOCES","GRÁFICA","GRAFICA","GRÁFICAS","GRAFICAS","INSERTO","INSERTOS","LETRERO","LETREROS","CARTEL","RÓTULO","ROTULO","TÍTULO","TITULO","TEXTO","TEXTOS");
const DC_KW_RE=new RegExp("(^|\\s)("+DC_KW.join("|")+")(\\s|\\d|$)","i");
/* Valores de la columna de actor que NO son un talento (se muestran, pero no cuentan para Netflix ni para alertas) */
const DC_PSEUDO=new Set(["edicion","edición","original","todos","todas","none","walla","x","n/a","na","sin asignar","-","—","por definir","tbd"]);
const dcIsPseudo=t=>DC_PSEUDO.has(dcNorm(t));
const dcIsAdic=n=>{
  const t=(n||"").trim();
  if(!t)return true;
  if(DC_KW_RE.test(t.toUpperCase()))return true;
  if(/\d/.test(t))return true;
  if(/'S\s/i.test(t))return true;
  if(/\b(IN TV|ON TV|ON PHONE|IN CROWD|ON SCREEN|ON RADIO)\b/i.test(t))return true;
  return false;
};
const dcTc=s=>(s||"").toLowerCase().replace(/(^|[^\p{L}\p{N}])(\p{L})/gu,(m,p,c)=>p+c.toUpperCase()); // mayúscula inicial también tras acentos (Garzón, no GarzóN)
const dcEpNum=cap=>{const m=(cap||"").match(/\d{2,3}/g);return m?parseInt(m[m.length-1],10):0;};
const dcFmtEp=cap=>{const m=(cap||"").match(/\d{2,3}/g);return m?m[m.length-1]:cap;};
const dcSplitRows=data=>{
  const princ=data.filter(r=>r.tipo==="Principal").sort((a,b)=>a.personaje.localeCompare(b.personaje));
  const tm=new Set(princ.filter(r=>!r.pseudo).map(r=>r.talentoKey).filter(Boolean));
  const adicNorm=[],adicComp=[];
  data.filter(r=>r.tipo==="Adicional").sort((a,b)=>a.talento.localeCompare(b.talento))
    .forEach(r=>(r.talentoKey&&tm.has(r.talentoKey)?adicComp:adicNorm).push(r));
  return{princ,adicNorm,adicComp};
};
const dcMk=(bg,fg,bold)=>({fill:{patternType:"solid",fgColor:{rgb:bg},bgColor:{indexed:64}},font:{color:{rgb:fg},bold:!!bold,sz:10},alignment:{vertical:"center"},border:{top:{style:"thin",color:{rgb:"FFCBD5E1"}},bottom:{style:"thin",color:{rgb:"FFCBD5E1"}},left:{style:"thin",color:{rgb:"FFCBD5E1"}},right:{style:"thin",color:{rgb:"FFCBD5E1"}}}});
const dcSetCell=(ws,r,c,val,style,cw)=>{
  const addr=XLSX.utils.encode_cell({r,c});
  ws[addr]={v:String(val??""),t:"s",s:style};
  if(cw)cw[c]=Math.max(cw[c]||4,String(val??"").length+3);
};
const dcBuildCrewSheet=()=>{
  const ws={};const cw=[4,30,30];let row=0;
  for(let c=0;c<3;c++)dcSetCell(ws,row,c,c===0?"🎬 Equipo de Producción":"",dcMk("FF1F3864","FFFFFFFF",true),cw);
  row++;
  ["#","Rol","Nombre"].forEach((h,c)=>dcSetCell(ws,row,c,h,dcMk("FF1E3A5F","FFFFFFFF",true),cw));
  row++;
  const st=dcMk("FFD9E2F3","FF000000");
  DC_CREW.forEach((cr,i)=>{[i+1,cr.rol,cr.nombre].forEach((v,c)=>dcSetCell(ws,row,c,v,st,cw));row++;});
  ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:row-1,c:2}});
  ws["!cols"]=cw.map(w=>({wch:Math.min(w,40)}));
  return ws;
};
/* ── Planificador: plan de copiado para la herramienta Dub Talent List de Netflix ── */
const dcNorm=s=>(s||"").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/\s+/g," ").trim();
const dcCastMap=en=>{const m=new Map();en.data.filter(r=>r.tipo==="Principal").forEach(r=>m.set(dcNorm(r.personaje),r));return m;};
const dcAdicSet=en=>{const m=new Map();en.data.filter(r=>r.tipo==="Adicional"&&r.talento&&!r.pseudo).forEach(r=>{const k=dcNorm(r.talento);if(!m.has(k))m.set(k,r.talento);});return m;};
// Diferencia src → tgt. Costo: crear=2, eliminar=1, reasignar=1
const dcDiff=(src,tgt)=>{
  const sC=dcCastMap(src),tC=dcCastMap(tgt);const keep=[],reassign=[],del=[],add=[];
  tC.forEach((r,k)=>{if(sC.has(k)){const s0=sC.get(k);if(dcNorm(s0.talento)===dcNorm(r.talento))keep.push(r);else reassign.push({personaje:r.personaje,antes:s0.talento||"Sin asignar",ahora:r.talento||"Sin asignar"});}else add.push(r);});
  sC.forEach((r,k)=>{if(!tC.has(k))del.push(r);});
  const sA=dcAdicSet(src),tA=dcAdicSet(tgt);const aKeep=[],aDel=[],aAdd=[];
  tA.forEach((v,k)=>(sA.has(k)?aKeep:aAdd).push(v));sA.forEach((v,k)=>{if(!tA.has(k))aDel.push(v);});
  const cost=del.length+reassign.length+add.length*2+aDel.length+aAdd.length*2;
  return{keep,reassign,del,add,aKeep,aDel,aAdd,cost};
};
// Para cada episodio (salvo el primero) elige el episodio previo que minimiza ediciones
const dcBuildPlans=sorted=>{sorted.forEach((en,i)=>{if(i===0){en.plan=null;return;}let best=null;for(let j=0;j<i;j++){const d=dcDiff(sorted[j],en);if(!best||d.cost<best.cost)best={...d,srcCap:sorted[j].cap};}en.plan=best;});};
// Alertas: mismo talento escrito distinto o nombres muy parecidos (evita duplicados en Netflix)
const dcWarnings=sorted=>{
  const variants=new Map();
  sorted.forEach(en=>en.data.forEach(r=>{if(!r.talento||r.pseudo)return;const k=dcNorm(r.talento);if(!variants.has(k))variants.set(k,new Set());variants.get(k).add(r.talento);}));
  const warns=[];variants.forEach(set=>{if(set.size>1)warns.push("✏️ Mismo talento escrito distinto: "+[...set].join("  ↔  "));});
  const keys=[...variants.keys()];
  for(let i=0;i<keys.length;i++)for(let j=i+1;j<keys.length;j++){const a=keys[i],b=keys[j];if(a.length>=6&&b.length>=6&&Math.abs(a.length-b.length)<=2&&lev(a,b)<=2)warns.push('🔍 Nombres muy parecidos (¿posible duplicado en Netflix?): "'+[...variants.get(a)][0]+'" ↔ "'+[...variants.get(b)][0]+'"');}
  return warns;
};
// Filas de la matriz Personaje × Episodio (celda = talento; cambio de talento marcado)
const dcMatrixRows=eps=>{
  const rows=new Map();
  eps.forEach((en,ei)=>{en.data.filter(r=>r.tipo==="Principal").forEach(r=>{const k=dcNorm(r.personaje);if(!rows.has(k))rows.set(k,{name:r.personaje,byEp:{}});rows.get(k).byEp[ei]=r.talento||"—";});});
  return[...rows.values()].sort((a,b)=>Object.keys(b.byEp).length-Object.keys(a.byEp).length||a.name.localeCompare(b.name)).map(r=>{const base=Object.values(r.byEp).find(t=>t&&t!=="—")||"";return{...r,base,changed:eps.map((_,ei)=>{const v=r.byEp[ei];return!!(v&&v!=="—"&&dcNorm(v)!==dcNorm(base));})};});
};
// Bloque "Plan de copiado" dentro de la hoja de cada capítulo
const dcWritePlanBlock=(ws,en,row,cw)=>{
  const band=(txt,bg,fg)=>{for(let c=0;c<5;c++)dcSetCell(ws,row,c,c===0?txt:"",dcMk(bg,fg||"FFFFFFFF",true),cw);row++;};
  band("📋 PLAN DE COPIADO — Netflix Dub Talent List","FF1F3864");
  if(!en.plan){const nP=dcCastMap(en).size,nA=dcAdicSet(en).size;dcSetCell(ws,row,0,"🆕 Primer episodio: crear todo ("+nP+" principales + "+nA+" adicionales + crew). Luego usa COPY de este episodio para los siguientes.",dcMk("FFFFEB9C","FF000000",true),cw);row+=2;return row;}
  const pl=en.plan;
  dcSetCell(ws,row,0,"1️⃣ COPY desde episodio:",dcMk("FFFFFFFF","FF000000",true),cw);dcSetCell(ws,row,1,pl.srcCap,dcMk("FFD9E2F3","FF1F3864",true),cw);row++;
  dcSetCell(ws,row,0,"✅ Se mantienen: "+pl.keep.length+" personajes (no tocar)",dcMk("FF92D050","FF000000"),cw);row++;
  if(pl.reassign.length){band("⚠️ 2️⃣ REASIGNAR TALENTO ("+pl.reassign.length+")","FFED7D31");["Personaje","Talento en fuente","Talento correcto"].forEach((hd,c)=>dcSetCell(ws,row,c,hd,dcMk("FFF1F5F9","FF475569",true),cw));row++;pl.reassign.forEach(r=>{[r.personaje,r.antes,r.ahora].forEach((v,c)=>dcSetCell(ws,row,c,v,dcMk("FFFFE4CC","FF000000"),cw));row++;});}
  if(pl.del.length){band("🗑️ 3️⃣ ELIMINAR del pegado ("+pl.del.length+")","FFC00000");pl.del.forEach(r=>{dcSetCell(ws,row,0,r.personaje,dcMk("FFFFC7CE","FF000000"),cw);row++;});}
  if(pl.add.length){band("➕ 4️⃣ CREAR nuevos ("+pl.add.length+")","FF10B981");["Personaje","Talento"].forEach((hd,c)=>dcSetCell(ws,row,c,hd,dcMk("FFF1F5F9","FF475569",true),cw));row++;pl.add.forEach(r=>{[r.personaje,r.talento||"Sin asignar"].forEach((v,c)=>dcSetCell(ws,row,c,v,dcMk("FFD1FAE5","FF000000"),cw));row++;});}
  dcSetCell(ws,row,0,"👥 Additional Cast → quitar "+pl.aDel.length+" · agregar "+pl.aAdd.length,dcMk("FFB8CCE4","FF000000",true),cw);row++;
  pl.aDel.forEach(t=>{dcSetCell(ws,row,0,"🗑️ "+t,dcMk("FFFFC7CE","FF000000"),cw);row++;});
  pl.aAdd.forEach(t=>{dcSetCell(ws,row,0,"➕ "+t,dcMk("FFD1FAE5","FF000000"),cw);row++;});
  row++;return row;
};
// Hoja: Matriz Personaje × Episodio
const dcBuildMatrixSheet=eps=>{
  const ws={};const cw=[30,...eps.map(()=>22)];let row=0;
  for(let c=0;c<=eps.length;c++)dcSetCell(ws,row,c,c===0?"🧩 Matriz de Recurrencia":"",dcMk("FF1F3864","FFFFFFFF",true),cw);row++;
  ["Personaje",...eps.map(e=>"EP "+dcFmtEp(e.cap))].forEach((hd,c)=>dcSetCell(ws,row,c,hd,dcMk("FF1E3A5F","FFFFFFFF",true),cw));row++;
  dcMatrixRows(eps).forEach(r=>{dcSetCell(ws,row,0,r.name,dcMk("FFD9E2F3","FF000000",true),cw);eps.forEach((_,ei)=>{const v=r.byEp[ei]??"";dcSetCell(ws,row,ei+1,v,r.changed[ei]?dcMk("FFFFE4CC","FF9A3412",true):dcMk("FFFFFFFF","FF000000"),cw);});row++;});
  ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:Math.max(row-1,1),c:eps.length}});ws["!cols"]=cw.map(w=>({wch:Math.min(w,30)}));return ws;
};
// Hoja: Alertas + checklist antes de Submit en Netflix
const DC_CHECKLIST=["☐ Nombre del estudio ingresado en la pestaña de temporada","☐ Logo del partner en PNG con altura mínima de 400px","☐ Al menos 1 registro en Cast con nombre localizado por episodio","☐ Sin círculos blancos vacíos (campos requeridos faltantes) en ningún episodio","☐ Orden de los registros verificado (el orden de la herramienta = orden en créditos)","☐ Additional Cast: solo nombres de talento (sin personajes)","⚠️ RECUERDA: después de Submit los campos NO son editables"];
const dcBuildAlertSheet=warnings=>{
  const ws={};const cw=[90];let row=0;
  dcSetCell(ws,row,0,"⚠️ ALERTAS — Nombres de talento",dcMk("FFED7D31","FFFFFFFF",true),cw);row++;
  if(warnings.length)warnings.forEach(w=>{dcSetCell(ws,row,0,w,dcMk("FFFFF3CD","FF92400E"),cw);row++;});
  else{dcSetCell(ws,row,0,"✅ Sin alertas: todos los nombres de talento son consistentes",dcMk("FFD1FAE5","FF166534"),cw);row++;}
  row++;dcSetCell(ws,row,0,"📌 CHECKLIST antes de Submit en Netflix",dcMk("FF1F3864","FFFFFFFF",true),cw);row++;
  DC_CHECKLIST.forEach(t=>{dcSetCell(ws,row,0,t,dcMk("FFD9E2F3","FF000000"),cw);row++;});
  ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:row-1,c:0}});ws["!cols"]=[{wch:90}];return ws;
};
const dcBuildSheet=(en,opts)=>{
  const withPlan=!opts||opts.plan!==false;
  const{princ,adicNorm,adicComp}=dcSplitRows(en.data);
  const ws={};const cw=[4,30,30,12,25];let row=0;
  const HDR=["#","Personaje","Talento","Tipo","Nota"];
  const writeHeader=label=>{
    for(let c=0;c<5;c++)dcSetCell(ws,row,c,c===0?label:"",dcMk("FF1F3864","FFFFFFFF",true),cw);
    row++;
    HDR.forEach((h,c)=>dcSetCell(ws,row,c,h,dcMk("FF1E3A5F","FFFFFFFF",true),cw));
    row++;
  };
  const writeRows=(rows,fn)=>{rows.forEach((r,i)=>{const{cells,style}=fn(r,i);cells.forEach((v,c)=>dcSetCell(ws,row,c,v,style,cw));row++;});row++;};
  if(withPlan)row=dcWritePlanBlock(ws,en,row,cw); // plan de copiado dentro de la misma hoja del capítulo
  writeHeader("📽️ "+en.cap);
  writeRows(princ,(r,i)=>{
    const rec=r.prevEps&&r.prevEps.length?"🔁 EP "+r.prevEps.map(dcFmtEp).join(", EP "):"";
    return{cells:[i+1,r.personaje,r.talento||"Sin asignar","Principal",rec],style:r.talento?dcMk("FF92D050","FF000000"):dcMk("FFFFC7CE","FF000000")};
  });
  writeHeader("👥 Adicionales");
  writeRows(adicNorm,(r,i)=>({cells:[i+1,r.personaje,r.talento||"Sin asignar","Adicional",""],style:r.talento?dcMk("FFFFEB9C","FF000000"):dcMk("FFFFC7CE","FF000000")}));
  writeHeader("⚠️ Adicionales compartidos");
  writeRows(adicComp,(r,i)=>({cells:[i+1,r.personaje,r.talento||"Sin asignar","Adicional","⚠️ Compartido"],style:dcMk("FFB8CCE4","FF000000")}));
  ws["!ref"]=XLSX.utils.encode_range({s:{r:0,c:0},e:{r:row-1,c:4}});
  ws["!cols"]=cw.map(w=>({wch:Math.min(w,40)}));
  return ws;
};

/* ══════════════════════════════════════════════════════════════
   BREAKDOWNS — análisis de libretos con un modelo de lenguaje (NVIDIA/Groq/OpenRouter gratuitos, Anthropic o endpoint propio)
   - La clave de API y el modelo se guardan sólo en este dispositivo (localStorage); los breakdowns
     generados sí se guardan en los datos de la app (y en la nube si está activa).
   - El libreto en español es la fuente principal; el show guide sólo contexto etiquetado [SHOW GUIDE].
   ══════════════════════════════════════════════════════════════ */
const BD_CFG_KEY="dc_breakdown_cfg_v1";
/* Proveedores de modelos. "openai" = API compatible con OpenAI (chat/completions con streaming SSE).
   NVIDIA no permite llamadas directas desde el navegador (sin CORS): pasa por el proxy /api/llm de este mismo sitio. */
const BD_PROVIDERS={
  nvidia:{l:"NVIDIA NIM — gratis (build.nvidia.com)",kind:"openai",proxy:true,base:"https://integrate.api.nvidia.com/v1",keyUrl:"https://build.nvidia.com/settings/api-keys",defaultModel:"nvidia/nemotron-3-super-120b-a12b",models:["nvidia/nemotron-3-super-120b-a12b","nvidia/nemotron-3-ultra-550b-a55b","nvidia/llama-3.1-nemotron-ultra-253b-v1","moonshotai/kimi-k3","deepseek-ai/deepseek-v4.1-flash","z-ai/glm-5.3","google/gemma-4-31b-it","mistralai/mistral-large-2-instruct"],hint:"Crea una cuenta en build.nvidia.com, genera una API key (créditos gratuitos) y pégala aquí. Pulsa «Ver modelos» para la lista vigente: NVIDIA retira modelos con el tiempo."},
  groq:{l:"Groq — gratis (console.groq.com)",kind:"openai",proxy:true,base:"https://api.groq.com/openai/v1",keyUrl:"https://console.groq.com/keys",defaultModel:"llama-3.3-70b-versatile",models:["llama-3.3-70b-versatile","openai/gpt-oss-120b","qwen/qwen3-32b"],hint:"Plan gratuito con límites por minuto; muy rápido. Pulsa «Ver modelos» para la lista vigente."},
  openrouter:{l:"OpenRouter — modelos gratuitos (:free)",kind:"openai",proxy:true,base:"https://openrouter.ai/api/v1",keyUrl:"https://openrouter.ai/settings/keys",defaultModel:"nvidia/nemotron-3-super-120b-a12b:free",models:["nvidia/nemotron-3-super-120b-a12b:free","nvidia/nemotron-3-ultra-550b-a55b:free","google/gemma-4-31b-it:free","nvidia/nemotron-3.5-lightning:free"],hint:"Los modelos con sufijo :free no consumen saldo (con límites). Pulsa «Ver modelos» y filtra por :free para la lista vigente."},
  anthropic:{l:"Anthropic (Claude) — de pago",kind:"anthropic",proxy:false,base:"https://api.anthropic.com",keyUrl:"https://console.anthropic.com/settings/keys",defaultModel:"claude-opus-5-5",models:["claude-opus-5-5","claude-sonnet-5-5","claude-haiku-4-5"],hint:"Mejor calidad de análisis; cada breakdown consume créditos."},
  custom:{l:"Otro endpoint compatible con OpenAI",kind:"openai",proxy:false,base:"",keyUrl:"",defaultModel:"",models:[],hint:"URL base terminada en /v1 (p. ej. http://localhost:11434/v1 para Ollama). Debe permitir CORS."}
};
const BD_DEFAULT_CFG={provider:"nvidia",apiKey:"",model:BD_PROVIDERS.nvidia.defaultModel,effort:"high",baseUrl:"",temperature:0.3};
function getBdCfg(){try{const v=localStorage.getItem(BD_CFG_KEY);const c={...BD_DEFAULT_CFG,...(v?JSON.parse(v):{})};if(!BD_PROVIDERS[c.provider])c.provider="nvidia";return c;}catch(e){return{...BD_DEFAULT_CFG};}}
function saveBdCfg(c){try{localStorage.setItem(BD_CFG_KEY,JSON.stringify(c));}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}}
const bdProviderLabel=cfg=>(BD_PROVIDERS[cfg.provider]||BD_PROVIDERS.custom).l.split(" — ")[0]+" · "+(cfg.model||"");
/* URL del endpoint según proveedor (NVIDIA vía proxy del propio sitio) */
function bdEndpoint(cfg,path){
  const pr=BD_PROVIDERS[cfg.provider]||BD_PROVIDERS.custom;
  if(pr.proxy)return"/api/llm?provider="+encodeURIComponent(cfg.provider)+"&path="+encodeURIComponent(path);
  const base=(cfg.provider==="custom"?(cfg.baseUrl||""):pr.base).replace(/\/+$/,"");
  return base+path;
}

/* Reglas del breakdown (texto del departamento, se envía tal cual como instrucciones del sistema) */
const BD_RULES=`Actúa como analista profesional de libretos para doblaje en español latino, trabajando para los departamentos de casting, dirección y técnica.
Analiza el siguiente libreto y genera un BREAKDOWN estructurado, siguiendo estrictamente las reglas indicadas a continuación.
En episodios 1 de series y en películas, casi siempre se adjuntará un SHOW GUIDE.
El show guide solo debe usarse como apoyo narrativo y contextual, nunca como autoridad lingüística, fonética o terminológica.
Toda información proveniente del show guide debe estar claramente etiquetada.
________________________________________
FORMATO DEL DOCUMENTO
El documento debe titularse exactamente así:
BREAKDOWN_(NOMBRE DE LA SERIE O PELÍCULA)_(NÚMERO DEL EPISODIO)
________________________________________
PASO 1. IDENTIFICACIÓN DEL FORMATO
Determina si el libreto corresponde a:
•	Película, o
•	Serie (si el título contiene numeración como EP1, E01, 101, etc.).
________________________________________
SI ES UNA SERIE (exceptuando si es el ep 1)
PASO 2. ALCANCE
•	Analiza únicamente el episodio entregado.
•	No redactes un resumen general de la serie.
•	El análisis debe ceñirse estrictamente a los eventos del episodio.
________________________________________
PASO 3. CONTENIDO OBLIGATORIO
________________________________________
1. RESUMEN DEL EPISODIO
•	Redacta un resumen claro, conciso y narrativo del episodio analizado.
•	Basado exclusivamente en el libreto en español.
•	Enfocado en:
o	Hechos narrativos
o	Conflicto del episodio
o	Desarrollo de los acontecimientos
•	No adelantar información que el episodio no revela explícitamente.
Si el show guide aporta contexto de intención, tono o función del episodio, agregar al final:
[SHOW GUIDE]
Lectura de intención narrativa o función del episodio dentro de la serie.
________________________________________
2. PERSONAJES (CRITERIO SELECTIVO)
Incluye únicamente personajes que:
•	Presenten un cambio narrativo, emocional o funcional, o
•	Sean críticos o determinantes dentro del episodio.
•	Que se encuentre en la tabla de personajes de Show Guide
Para cada personaje incluido, especifica obligatoriamente:
•	Quién es: cómo se presenta en este episodio.
•	Qué rol cumple: función dramática concreta.
•	Aspecto relevante: cambio, revelación o rasgo que deba tenerse en cuenta.
Si el show guide amplía o resignifica al personaje:
[SHOW GUIDE]
Función real en la serie, arco narrativo o subtexto que aún no es evidente.
Personajes sin cambios relevantes
Si existen personajes que continúan sin cambios:
•	No los describas individualmente.
•	Incluye una lista titulada:
Personajes de continuidad (sin cambios relevantes)
Indicando:
•	Nombre del personaje.
•	Rol ultra breve (máximo una línea).
________________________________________
SI ES UNA PELÍCULA
PASO 2. CONTENIDO OBLIGATORIO
________________________________________
1. RESUMEN DE LA PELÍCULA
•	Redacta un resumen extenso y detallado de la película completa.
•	Debe incluir:
o	Trama general
o	Desarrollo narrativo
o	Evolución de personajes principales
•	No dividir por actos ni episodios.
•	No incluir criterios de casting ni dirección.
Si el show guide aporta intención temática o conceptual:
[SHOW GUIDE]
Contexto narrativo o conceptual de la película.

________________________________________
2. PERSONAJES (CRITERIO SELECTIVO)
Incluye únicamente personajes que:
•	Presenten un cambio narrativo, emocional o funcional, o
•	Sean críticos o determinantes dentro del episodio.
•	Que se encuentre en la tabla de personajes de Show Guide
Para cada personaje incluido, especifica obligatoriamente:
•	Quién es: cómo se presenta en este episodio.
•	Qué rol cumple: función dramática concreta.
•	Aspecto relevante: cambio, revelación o rasgo que deba tenerse en cuenta.
Si el show guide amplía o resignifica al personaje:
[SHOW GUIDE]
Función real en la serie, arco narrativo o subtexto que aún no es evidente.
Personajes sin cambios relevantes
Si existen personajes que continúan sin cambios:
•	No los describas individualmente.
•	Incluye una lista titulada:
Personajes de continuidad (sin cambios relevantes)
Indicando:
•	Nombre del personaje.
•	Rol ultra breve (máximo una línea).

________________________________________
REGLAS GENERALES
•	El libreto en español es la fuente principal y manda.
•	El show guide solo aporta contexto narrativo, nunca corrige al libreto.
•	Toda información del show guide debe estar claramente marcada con:
[SHOW GUIDE]
•	Usar lenguaje:
o	Técnico
o	Claro
o	Orientado a producción
•	No realizar:
o	Análisis actorales
o	Interpretaciones subjetivas
o	Opiniones personales
•	Mantener:
o	Formato limpio
o	Estructura jerárquica
o	Consistencia terminológica
________________________________________
REGLAS ADICIONALES OBLIGATORIAS
•	NO inventes ni propongas pronunciaciones de personajes ni de nombres propios. No incluyas guías fonéticas ni transcripciones. Escribe cada nombre exactamente como aparece en el libreto.
•	No inventes hechos, personajes ni datos que no estén en el libreto o en el show guide.
•	Si no se adjuntó show guide, no incluyas secciones [SHOW GUIDE].
•	FORMATO DE SALIDA (obligatorio, estructura jerárquica con esta sintaxis exacta):
o	Primera línea: "# BREAKDOWN_(NOMBRE)_(EPISODIO)".
o	Secciones con "## " y numeradas en orden de aparición: "## 1. RESUMEN GENERAL DE LA SERIE" (sólo si los DATOS DE ENTRADA lo piden), "## 2. RESUMEN DEL EPISODIO" (o "RESUMEN DE LA PELÍCULA"), "## 3. PERSONAJES", "## 4. PERSONAJES DE CONTINUIDAD (SIN CAMBIOS RELEVANTES)".
o	Dentro de PERSONAJES, cada personaje es un subtítulo "### NOMBRE DEL PERSONAJE" seguido de tres líneas: "**Quién es:** …", "**Qué rol cumple:** …", "**Aspecto relevante:** …".
o	Los aportes del show guide van en una línea propia que empieza por "[SHOW GUIDE] ".
o	Los personajes de continuidad van como lista: "- NOMBRE — rol ultra breve".
o	No uses tablas ni otros símbolos de Markdown distintos de los indicados.
•	LOS RESÚMENES (serie, episodio o película) SE REDACTAN SIEMPRE EN PROSA: uno o varios párrafos corridos, con oraciones completas y conectadas. Está PROHIBIDO usar viñetas, guiones, listas o enumeraciones dentro de los resúmenes.
•	Redacta en español latino neutro.
•	RESUMEN GENERAL DE LA SERIE (sólo si los DATOS DE ENTRADA lo piden): es una excepción explícita a la regla "no redactes un resumen general de la serie". Inclúyelo como sección aparte, titulada exactamente "RESUMEN GENERAL DE LA SERIE", inmediatamente después del título y antes del resumen del episodio. Extensión: 5 a 8 líneas con premisa, protagonistas y situación general hasta este episodio. Fuentes, en este orden: show guide (etiquetar [SHOW GUIDE]), breakdowns anteriores de la misma serie adjuntos como contexto, y lo que el libreto establece. Si no hay show guide ni breakdowns anteriores, indícalo en una línea y limítate a lo que el libreto deja claro. No adelantes nada que estas fuentes no revelen.`;

/* Decodificación de texto con respaldo a Windows-1252 (libretos antiguos) */
function bdDecode(buf){const u=new TextDecoder("utf-8").decode(buf);if((u.match(/\uFFFD/g)||[]).length>5){try{return new TextDecoder("windows-1252").decode(buf);}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}}return u;}
/* pdf.js cargado bajo demanda; el worker se sirve como blob (los workers deben ser del mismo origen) */
async function bdLoadPdfJs(){
  /* Dubbipt: el pdf.js que ya carga la aplicación, con su worker. */
  if(typeof pdfjsLib !== 'undefined' && pdfjsLib) return pdfjsLib;
  throw new Error('No se pudo cargar el lector de PDF');
}
/* Texto de un libreto: .txt/.md, .docx (Word) o .pdf */
async function bdExtractText(file){
  const name=safe(file.name).toLowerCase();const buf=await readFileBuffer(file);
  if(/\.(txt|md|text)$/.test(name))return bdDecode(buf);
  if(/\.docx$/.test(name)){
    /* Dubbipt: fflate en vez de JSZip. */
    if(typeof fflate==="undefined")throw new Error("No se pudo cargar el lector de Word");
    const arch=fflate.unzipSync(new Uint8Array(buf));const f=arch["word/document.xml"];if(!f)throw new Error("El .docx no contiene word/document.xml");
    const xml=new DOMParser().parseFromString(new TextDecoder().decode(f),"application/xml");
    const W="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const out=[];const paras=xml.getElementsByTagNameNS(W,"p");
    for(const p of paras){let t="";const walk=nd=>{for(const c of nd.childNodes){if(c.nodeType!==1)continue;const ln=c.localName;if(ln==="t")t+=c.textContent;else if(ln==="tab")t+="\t";else if(ln==="br"||ln==="cr")t+="\n";else walk(c);}};walk(p);out.push(t);}
    return out.join("\n");
  }
  if(/\.pdf$/.test(name)){
    const pdfjs=await bdLoadPdfJs();const doc=await pdfjs.getDocument({data:buf}).promise;let text="";
    for(let i=1;i<=doc.numPages;i++){const page=await doc.getPage(i);const c=await page.getTextContent();let line="";c.items.forEach(it=>{if(!it.str&&!it.hasEOL)return;line+=it.str;if(it.hasEOL){text+=line+"\n";line="";}else line+=" ";});if(line.trim())text+=line+"\n";text+="\n";}
    return text;
  }
  if(/\.doc$/.test(name))throw new Error("Formato .doc antiguo no soportado: guárdalo como .docx o .pdf");
  throw new Error("Formato no soportado: usa .docx, .pdf o .txt");
}
/* Lista de modelos disponibles del proveedor (GET /models) */
async function bdListModels(cfg){
  const pr=BD_PROVIDERS[cfg.provider]||BD_PROVIDERS.custom;
  if(pr.kind==="anthropic")return pr.models.slice();
  const res=await fetch(bdEndpoint(cfg,"/models"),{headers:{"Authorization":"Bearer "+cfg.apiKey}});
  if(!res.ok){let msg="HTTP "+res.status;try{const j=await res.json();msg=(j.error&&(j.error.message||j.error))||j.detail||msg;}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}throw new Error(typeof msg==="string"?msg:JSON.stringify(msg));}
  const j=await res.json();const arr=Array.isArray(j.data)?j.data:(Array.isArray(j)?j:[]);
  return arr.map(m=>m.id||m.name).filter(Boolean).sort();
}
/* Llamada con streaming (SSE). Devuelve {text,stop,model,usage}. Soporta Anthropic y APIs compatibles con OpenAI. */
async function bdGenerate({cfg,system,user,onDelta,signal}){
  const pr=BD_PROVIDERS[cfg.provider]||BD_PROVIDERS.custom;
  const model=cfg.model||pr.defaultModel;
  const isAnthropic=pr.kind==="anthropic";
  let url,headers,body;
  if(isAnthropic){
    url=bdEndpoint(cfg,"/v1/messages");
    body={model,max_tokens:32000,stream:true,system,messages:[{role:"user",content:user}]};
    headers={"Content-Type":"application/json","x-api-key":cfg.apiKey,"anthropic-version":"2023-06-01","anthropic-dangerous-direct-browser-access":"true"};
    if(/^claude-(opus|sonnet)-5-5/.test(model)){body.output_config={effort:cfg.effort||"high"};body.fallbacks="default";headers["anthropic-beta"]="server-side-fallback-2026-07-01";}
  }else{
    if(cfg.provider==="custom"&&!cfg.baseUrl)throw new Error("Configura la URL base del endpoint");
    url=bdEndpoint(cfg,"/chat/completions");
    body={model,stream:true,temperature:Number(cfg.temperature)||0.3,max_tokens:8192,messages:[{role:"system",content:system},{role:"user",content:user}]};
    headers={"Content-Type":"application/json","Authorization":"Bearer "+cfg.apiKey,"Accept":"text/event-stream"};
    if(cfg.provider==="openrouter"){headers["HTTP-Referer"]=location.origin;headers["X-Title"]="Dubbipt";}
  }
  const res=await fetch(url,{method:"POST",headers,body:JSON.stringify(body),signal});
  if(!res.ok){
    let msg="HTTP "+res.status;try{const j=await res.json();msg=(j.error&&(j.error.message||(typeof j.error==="string"?j.error:null)))||j.detail||j.message||msg;}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}
    if(typeof msg!=="string")msg=JSON.stringify(msg);
    if(res.status===401||res.status===403)msg="Clave de API inválida, revocada o sin permiso ("+msg+")";
    else if(res.status===429)msg="Límite de uso alcanzado — espera un momento y vuelve a intentar ("+msg+")";
    else if(res.status===404&&!isAnthropic)msg="Modelo o ruta no encontrados: revisa el nombre del modelo ("+msg+")";
    else if(res.status===413)msg="El libreto es demasiado grande para el proveedor ("+msg+")";
    throw new Error(msg);
  }
  const ctype=res.headers.get("content-type")||"";
  if(!/event-stream/.test(ctype)){
    // Respuesta sin streaming (algunos endpoints): leer el JSON completo
    const j=await res.json();
    if(isAnthropic){const text=(j.content||[]).filter(b=>b.type==="text").map(b=>b.text).join("");if(onDelta)onDelta(text);return{text,stop:j.stop_reason,model:j.model||model,usage:j.usage||null};}
    const ch=(j.choices&&j.choices[0])||{};const text=(ch.message&&ch.message.content)||"";if(onDelta)onDelta(text);return{text,stop:ch.finish_reason,model:j.model||model,usage:j.usage||null};
  }
  const reader=res.body.getReader();const dec=new TextDecoder();let buf="",text="",stop=null,served=model,usage=null;
  const handle=ev=>{
    if(isAnthropic){
      if(ev.type==="content_block_delta"&&ev.delta&&ev.delta.type==="text_delta"){text+=ev.delta.text;if(onDelta)onDelta(text);}
      else if(ev.type==="message_start"&&ev.message&&ev.message.model)served=ev.message.model;
      else if(ev.type==="message_delta"){if(ev.delta&&ev.delta.stop_reason)stop=ev.delta.stop_reason;if(ev.usage)usage=ev.usage;}
      else if(ev.type==="error")throw new Error((ev.error&&ev.error.message)||"Error de la API");
    }else{
      if(ev.error)throw new Error(ev.error.message||JSON.stringify(ev.error));
      if(ev.model)served=ev.model;if(ev.usage)usage=ev.usage;
      const ch=ev.choices&&ev.choices[0];if(!ch)return;
      const piece=(ch.delta&&ch.delta.content)||(ch.message&&ch.message.content)||"";
      if(piece){text+=piece;if(onDelta)onDelta(text);}
      if(ch.finish_reason)stop=ch.finish_reason;
    }
  };
  while(true){
    const{value,done}=await reader.read();if(done)break;buf+=dec.decode(value,{stream:true});let idx;
    while((idx=buf.indexOf("\n\n"))>=0){
      const chunk=buf.slice(0,idx);buf=buf.slice(idx+2);
      for(const line of chunk.split("\n")){
        if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(!data||data==="[DONE]")continue;
        let ev;try{ev=JSON.parse(data);}catch(e){continue;}
        handle(ev);
      }
    }
  }
  if(buf.trim()){for(const line of buf.split("\n")){if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(!data||data==="[DONE]")continue;try{handle(JSON.parse(data));}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}}}
  // Modelos "razonadores" pueden envolver su pensamiento en <think>…</think>: se descarta
  text=text.replace(/<think>[\s\S]*?<\/think>\s*/g,"").trim();
  if(stop==="length")stop="max_tokens";
  if(stop==="content_filter")stop="refusal";
  return{text,stop,model:served,usage};
}
/* Word (.docx) mínimo generado con JSZip: título y encabezados en negrita */
/* ── Estructura del breakdown ──
   bdParse convierte el texto generado en bloques: h1/h2/h3, párrafos, viñetas, campos "**Etiqueta:** valor" y
   notas [SHOW GUIDE]. Tolera salidas sin "#" (encabezados en MAYÚSCULAS). */
function bdParse(text){
  const lines=String(text||"").replace(/\r/g,"").split("\n");const blocks=[];let para=[];
  const flush=()=>{if(para.length){blocks.push({t:"p",x:para.join(" ")});para=[];}};
  const caps=s=>s.length<=90&&s===s.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]{3}/.test(s);
  for(const raw of lines){
    const s=raw.trim();if(!s){flush();continue;}let m;
    if((m=s.match(/^(#{1,3})\s+(.*)$/))){flush();blocks.push({t:"h"+m[1].length,x:m[2].replace(/\*\*/g,"").trim()});continue;}
    if(/^BREAKDOWN_/.test(s)){flush();blocks.push({t:"h1",x:s.replace(/\*\*/g,"")});continue;}
    if((m=s.match(/^\[SHOW GUIDE\]\s*:?\s*(.*)$/i))){flush();blocks.push({t:"guide",x:m[1]});continue;}
    if((m=s.match(/^\*\*([^*]{2,40}?)\s*:?\*\*\s*:?\s*(.*)$/))||(m=s.match(/^(Quién es|Qué rol cumple|Aspecto relevante|Rol)\s*:\s*(.*)$/i))){flush();blocks.push({t:"field",k:m[1].trim(),x:m[2].trim()});continue;}
    if((m=s.match(/^[•\-*]\s+(.*)$/))){flush();blocks.push({t:"li",x:m[1]});continue;}
    if(caps(s)){flush();blocks.push({t:/^\d+\.\s/.test(s)||/^(RESUMEN|PERSONAJES|FICHA)/.test(s)?"h2":"h3",x:s});continue;}
    para.push(s);
  }
  flush();
  for(let i=0;i<blocks.length-1;i++){if(blocks[i].t==="guide"&&!blocks[i].x&&blocks[i+1].t==="p"){blocks[i].x=blocks[i+1].x;blocks.splice(i+1,1);}}
  return blocks;
}
/* Los resúmenes deben ir en prosa: si el modelo devolvió viñetas dentro de un resumen, se unen en un párrafo */
function bdNormalize(text){
  const lines=String(text||"").replace(/\r/g,"").split("\n");const out=[];let inSum=false,buf=[];
  const isHead=s=>/^#{1,3}\s/.test(s)||(s.length<=90&&s===s.toUpperCase()&&/[A-ZÁÉÍÓÚÑ]{3}/.test(s)&&!/^[•\-*]/.test(s));
  const flush=()=>{if(buf.length){out.push(buf.map(x=>{x=x.trim();return/[.!?…]$/.test(x)?x:x+".";}).join(" "));buf=[];}};
  for(const raw of lines){
    const s=raw.trim();
    if(isHead(s)){flush();inSum=/RESUMEN (GENERAL DE LA SERIE|DEL EPISODIO|DE LA PEL[ÍI]CULA)/i.test(s);out.push(raw);continue;}
    if(inSum&&/^[•\-*]\s+/.test(s)){buf.push(s.replace(/^[•\-*]\s+/,"").replace(/\*\*/g,""));continue;}
    if(inSum&&/^\d+[.)]\s+/.test(s)){buf.push(s.replace(/^\d+[.)]\s+/,""));continue;}
    flush();out.push(raw);
  }
  flush();return out.join("\n");
}
const bdInlineHtml=(s,esc)=>esc(s).replace(/\*\*([^*]+)\*\*/g,"<b>$1</b>");
/* Word (.docx) con jerarquía: título, secciones, subtítulos de personaje, campos en negrita, notas de show guide */
async function bdMakeDocx(text){
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const run=(t,o)=>{o=o||{};return'<w:r><w:rPr>'+(o.b?"<w:b/>":"")+(o.i?"<w:i/>":"")+(o.c?'<w:color w:val="'+o.c+'"/>':"")+'<w:sz w:val="'+(o.sz||22)+'"/></w:rPr><w:t xml:space="preserve">'+esc(t)+'</w:t></w:r>';};
  const inline=(s,o)=>s.split(/(\*\*[^*]+\*\*)/).filter(Boolean).map(p=>{const m=p.match(/^\*\*([^*]+)\*\*$/);return m?run(m[1],{...o,b:true}):run(p,o);}).join("");
  const par=(inner,o)=>{o=o||{};return'<w:p><w:pPr>'+(o.ind?'<w:ind w:left="'+o.ind+'" w:hanging="280"/>':"")+'<w:spacing w:before="'+(o.before||0)+'" w:after="'+(o.after||80)+'"/>'+(o.keep?"<w:keepNext/>":"")+'</w:pPr>'+inner+'</w:p>';};
  const body=bdParse(text).map(b=>{
    if(b.t==="h1")return par(run(b.x,{b:true,sz:34}),{after:200,keep:true});
    if(b.t==="h2")return par(run(b.x,{b:true,sz:26}),{before:240,after:100,keep:true});
    if(b.t==="h3")return par(run(b.x,{b:true,sz:23,c:"0066CC"}),{before:160,after:40,keep:true});
    if(b.t==="field")return par(run(b.k+": ",{b:true})+inline(b.x),{after:40});
    if(b.t==="li")return par(run("•  ")+inline(b.x),{ind:420,after:40});
    if(b.t==="guide")return par(run("[SHOW GUIDE] ",{b:true,c:"0066CC",sz:20})+inline(b.x,{i:true,c:"3A3A3C",sz:20}),{after:100});
    return par(inline(b.x),{after:120});
  }).join("");
  const doc='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'+body+'<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>';
  const ct='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>';
  const rels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>';
  const docRels='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>';
  const styles='<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:docDefaults><w:rPrDefault><w:rPr><w:rFonts w:ascii="Helvetica" w:hAnsi="Helvetica" w:cs="Arial"/><w:sz w:val="22"/><w:lang w:val="es-419"/></w:rPr></w:rPrDefault><w:pPrDefault><w:pPr><w:spacing w:line="276" w:lineRule="auto"/></w:pPr></w:pPrDefault></w:docDefaults></w:styles>';
  /* Dubbipt: fflate en vez de JSZip. */
  const u=fflate.strToU8;
  const z=fflate.zipSync({"[Content_Types].xml":u(ct),"_rels/.rels":u(rels),"word/document.xml":u(doc),"word/_rels/document.xml.rels":u(docRels),"word/styles.xml":u(styles)});
  return new Blob([z],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"});
}
/* Impresión / PDF (A4) con estética Apple: fondo blanco, Helvetica/SF, tarjetas con borde #EBEBF0, azul #0066CC, pie con nombre y página X / Y */
function bdPrintHtml(rec){
  const esc=s=>String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
  const blocks=bdParse(rec.text);const chars=blocks.filter(b=>b.t==="h3").length;
  const cards=[];let cur=null;const open=title=>{cur={title,items:[]};cards.push(cur);};
  blocks.forEach(b=>{if(b.t==="h1")return;if(b.t==="h2"){open(b.x);return;}if(!cur)open("");cur.items.push(b);});
  const inner=items=>{let out="",ul=false;const closeUl=()=>{if(ul){out+="</ul>";ul=false;}};
    items.forEach(b=>{if(b.t==="li"){if(!ul){out+="<ul>";ul=true;}out+="<li>"+bdInlineHtml(b.x,esc)+"</li>";return;}closeUl();
      if(b.t==="h3")out+="<h3>"+esc(b.x)+"</h3>";else if(b.t==="field")out+='<p class="f"><b>'+esc(b.k)+":</b> "+bdInlineHtml(b.x,esc)+"</p>";
      else if(b.t==="guide")out+='<div class="guide"><b>SHOW GUIDE</b> '+bdInlineHtml(b.x,esc)+"</div>";else out+="<p>"+bdInlineHtml(b.x,esc)+"</p>";});
    closeUl();return out;};
  const sub=[rec.name?esc(rec.name):"",rec.isMovie?"Película":(rec.ep?"Episodio "+esc(rec.ep):""),new Date(rec.createdAt).toLocaleDateString("es",{day:"2-digit",month:"long",year:"numeric"})].filter(Boolean).join(" · ");
  return '<!DOCTYPE html><html lang="es"><head><meta charset="utf-8"><title>'+esc(rec.title)+'</title><style>'
    +'@page{size:A4;margin:16mm 14mm 20mm}@page{@bottom-right{content:"página " counter(page) " / " counter(pages);font:8pt Helvetica,Arial,sans-serif;color:#86868b}@bottom-left{content:"'+esc(rec.title).replace(/"/g,"")+'";font:8pt Helvetica,Arial,sans-serif;color:#86868b}}'
    +'html,body{margin:0;padding:0;background:#fff}body{font-family:-apple-system,"SF Pro Text","Helvetica Neue",Helvetica,"TeX Gyre Heros","Liberation Sans",Arial,sans-serif;color:#1d1d1f;-webkit-print-color-adjust:exact;print-color-adjust:exact}'
    +'.hd{display:flex;justify-content:space-between;align-items:flex-end;gap:16px;margin:0 0 14px}.kicker{font-size:8.5pt;color:#86868b;text-transform:uppercase;letter-spacing:.06em;margin:0 0 3px}'
    +'h1{font-size:21pt;font-weight:700;letter-spacing:-0.025em;margin:0 0 4px;line-height:1.1;word-break:break-word}.sub{font-size:10pt;color:#86868b;margin:0}'
    +'.count{font-size:9.5pt;color:#1d1d1f;background:#F5F5F7;border:1px solid #EBEBF0;border-radius:999px;padding:5px 11px;white-space:nowrap}'
    +'.card{border:1px solid #EBEBF0;border-radius:12px;padding:11px 14px 8px;margin:0 0 10px;box-shadow:0 1px 3px rgba(0,0,0,.04);break-inside:avoid}'
    +'h2{font-size:12pt;font-weight:700;letter-spacing:-0.01em;margin:0 0 6px;padding:0 0 6px;border-bottom:1px solid #F0F0F4}'
    +'h3{font-size:10.5pt;font-weight:700;color:#0066CC;margin:8px 0 2px;break-after:avoid}'
    +'p{font-size:10pt;line-height:1.45;margin:0 0 6px}.f{margin:0 0 3px}.f b{color:#1d1d1f}'
    +'ul{margin:0 0 6px 16px;padding:0}li{font-size:10pt;line-height:1.4;margin:0 0 2px}'
    +'.guide{background:#F5F5F7;border-left:3px solid #0066CC;border-radius:6px;padding:6px 10px;margin:4px 0 8px;font-size:9.5pt;color:#3a3a3c;font-style:italic}.guide b{color:#0066CC;font-style:normal;font-size:8pt;letter-spacing:.04em;margin-right:4px}'
    +'.ft{margin-top:12px;font-size:8pt;color:#86868b;display:flex;justify-content:space-between;gap:12px}'
    +'</style></head><body>'
    +'<div class="hd"><div><p class="kicker">Breakdown · '+(rec.isMovie?"Película":"Serie")+'</p><h1>'+esc(rec.title)+'</h1><p class="sub">'+sub+'</p></div>'+(chars?'<div class="count">'+chars+' personaje'+(chars===1?"":"s")+'</div>':"")+'</div>'
    +cards.map(c=>'<div class="card">'+(c.title?"<h2>"+esc(c.title)+"</h2>":"")+inner(c.items)+"</div>").join("")
    +'<div class="ft"><span>'+esc(rec.title)+'</span><span>'+(rec.model?esc(rec.model)+" · ":"")+esc(new Date(rec.createdAt).toLocaleString("es"))+'</span></div>'
    +'</body></html>';
}
function bdPrint(rec){
  const html=bdPrintHtml(rec);
  const fr=document.createElement("iframe");fr.className="ddl-encima";fr.setAttribute("aria-hidden","true");fr.style.cssText="position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(fr);
  const done=()=>{setTimeout(()=>{try{fr.remove();}catch(e){/* lo mismo que en DublajeCast: sin eso se sigue */}},1500);};
  fr.onload=()=>{try{const w=fr.contentWindow;w.addEventListener("afterprint",done);w.focus();w.print();setTimeout(done,60000);}catch(e){done();}};
  fr.srcdoc=html;
}
/* Vista en pantalla con la misma jerarquía (colores de la app) */
function bdDownload(blob,name){const a=document.createElement("a");a.className="ddl-encima";a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
const bdTitle=(name,isMovie,ep)=>"BREAKDOWN_"+safe(name).trim().toUpperCase().replace(/\s+/g,"_")+"_"+(isMovie?"PELICULA":"EP"+String(ep||"").padStart(2,"0"));
const bdSafeName=t=>t.replace(/[\\/:*?"<>|]+/g,"").slice(0,80);

/* ═══ La interfaz, en Dubbipt ════════════════════════════════════════════════ */

const ST = {
  dc: { entries: [], client: null, processed: [], warnings: [], logs: [], busy: false },
  bd: { script: null, guide: null, reading: '', name: '', isMovie: false, ep: '', notes: '', withSeries: true,
        busy: false, live: '', result: null, err: '', abort: null, openId: null, cfgOpen: false, cfgMsg: '', locales: [] },
  pg: { completa: false }
};
/* Sin emojis en pantalla (PRO-N6): los textos de DublajeCast los traen; aquí se quitan al pintar. */
const SIN_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/gu;
const limpio = s => String(s == null ? '' : s).replace(SIN_EMOJI, '').replace(/([^\s]) {2,}/g, '$1 ');
const E = s => limpio(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ico = (n, sz) => (typeof csIco === 'function') ? csIco(n, sz || 14) : '';
const aviso = t => { try{ castAviso(t); }catch(e){ /* sin avisos */ } };
const repintar = () => { try{ csRepintar(); }catch(e){ /* fuera de la vista de Casting */ } };
const lastClient = () => { try{ return JSON.parse(localStorage.getItem(DC_CLIENT_KEY) || 'null'); }catch(e){ return null; } };
const DC_CLIENT_KEY = 'dc_dubcard_client_v1';

/* ── DUBCARDs ─────────────────────────────────────────────────────────────── */

/** Lee un desglose (.xlsm/.xlsx): sus personajes de DESGLOCE y su talento de CASTING. Lo de DublajeCast, tal cual. */
async function dcParseFile(en, addLog){
  addLog('📂 ' + en.name);
  try{
    const bytes = new Uint8Array(await readFileBuffer(en.file));
    const wb = XLSX.read(bytes, { type: 'array', bookVBA: true });
    addLog('  Hojas: ' + wb.SheetNames.join(', '));
    const dsName = wb.SheetNames.find(x => x.trim().toUpperCase().includes('DESGLO'));
    const csName = wb.SheetNames.find(x => x.trim().toUpperCase().includes('CASTING'));
    if(!dsName){ addLog('  ❌ No encontré hoja DESGLOCE', 'err'); return null; }
    if(!csName){ addLog('  ❌ No encontré hoja CASTING', 'err'); return null; }
    const opts = { header: 1, defval: '' };
    const dr = XLSX.utils.sheet_to_json(wb.Sheets[dsName], opts) || [];
    const cr = XLSX.utils.sheet_to_json(wb.Sheets[csName], opts) || [];
    const dOff = XLSX.utils.decode_range(wb.Sheets[dsName]['!ref'] || 'A1').s, cOff = XLSX.utils.decode_range(wb.Sheets[csName]['!ref'] || 'A1').s;
    const dcell = (r, c) => { const row = dr[r - dOff.r]; return row && row[c - dOff.c] != null ? row[c - dOff.c].toString().trim() : ''; };
    const ccell = (r, c) => { const row = cr[r - cOff.r]; return row && row[c - cOff.c] != null ? row[c - cOff.c].toString().trim() : ''; };
    const titulo = dcell(8, 7) || en.cap;
    addLog('  📋 "' + titulo + '"', 'ok');
    const personajes = []; for(let r = 16; r < dr.length + dOff.r; r++){ const v = dcell(r, 0); if(v) personajes.push(v); }
    let talentCol = -1, charCol = 0, hdrRow = 11;
    for(let r = cOff.r; r < Math.min(cOff.r + 15, cr.length + cOff.r) && talentCol < 0; r++){
      const row = cr[r - cOff.r] || [];
      for(let ci = 0; ci < row.length; ci++){ const v = (row[ci] || '').toString().toUpperCase(); if(v.includes('NOMBRE DEL ACTOR')){ talentCol = ci + cOff.c; hdrRow = r; const ic = row.findIndex(x => /^(LOCUTOR|PERSONAJE)/i.test((x || '').toString().trim())); charCol = ic >= 0 ? ic + cOff.c : 0; break; } }
    }
    if(talentCol < 0){ addLog('  ⚠️ Sin columna NOMBRE DEL ACTOR — uso columna D y personaje en A', 'err'); talentCol = 3; }
    else addLog('  🔎 CASTING: personaje en ' + XLSX.utils.encode_col(charCol) + ', talento en ' + XLSX.utils.encode_col(talentCol), 'ok');
    const castMap = new Map(), castList = [];
    for(let r = hdrRow + 1; r < cr.length + cOff.r; r++){ const ch = ccell(r, charCol), t = ccell(r, talentCol); if(!ch) continue; castList.push({ ch, t }); const k = dcNorm(ch); if(!castMap.has(k) || (t && !castMap.get(k))) castMap.set(k, t); }
    const keys = [...castMap.keys()];
    const lookup = p => { const k = dcNorm(p); if(castMap.has(k)) return { t: castMap.get(k), how: 'exacto' }; let best = null, bs = 0; keys.forEach(kk => { const sc = simN(p, kk); if(sc > bs){ bs = sc; best = kk; } }); return best && bs >= 85 ? { t: castMap.get(best), how: 'similar' } : { t: '', how: 'sin fila' }; };
    const base = personajes.length ? personajes : castList.map(x => x.ch);
    if(!personajes.length) addLog('  ⚠️ DESGLOCE sin personajes desde la fila 17: uso la lista de CASTING', 'err');
    let nExact = 0, nSim = 0, nMiss = 0;
    const data = base.map(p => {
      const { t, how } = lookup(p); if(how === 'exacto') nExact++; else if(how === 'similar') nSim++; else nMiss++;
      const pseudo = !!t && dcIsPseudo(t);
      return { personaje: dcTc(p), talento: dcTc(t), talentoKey: pseudo ? '' : dcNorm(t), pseudo, tipo: dcIsAdic(p) ? 'Adicional' : 'Principal' };
    });
    addLog('  👤 ' + base.length + ' personajes | 🎭 ' + data.filter(r => r.talento && !r.pseudo).length + ' talentos | ' + nExact + ' exactos' + (nSim ? ' · ' + nSim + ' por similitud' : '') + (nMiss ? ' · ' + nMiss + ' sin talento en CASTING' : ''), nMiss ? 'err' : 'ok');
    castList.filter(x => !base.some(p => dcNorm(p) === dcNorm(x.ch))).slice(0, 8).forEach(x => addLog('  ℹ️ En CASTING pero no en DESGLOCE: ' + x.ch + (x.t ? ' → ' + x.t : ''), ''));
    addLog('  ✅ ' + data.length + ' procesados', 'ok');
    return { cap: titulo, data };
  }catch(e){ addLog('  ❌ ' + e.message, 'err'); return null; }
}

/** Procesa los archivos subidos: recurrencia, plan de copiado de Netflix y alertas. */
async function dcProcesar(){
  const S = ST.dc;
  if(S.busy || !S.entries.length) return;
  S.busy = true; S.logs = []; S.processed = []; S.warnings = []; repintar();
  const addLog = (msg, cls) => S.logs.push({ msg, cls });
  try{
    const results = [];
    for(const en of S.entries){ const parsed = await dcParseFile(en, addLog); if(parsed) results.push(Object.assign({}, en, parsed)); }
    const sorted = results.sort((a, b) => dcEpNum(a.cap) - dcEpNum(b.cap));
    const seen = {};
    sorted.forEach(en => {
      const princ = en.data.filter(r => r.tipo === 'Principal');
      princ.forEach(r => { r.prevEps = (seen[r.personaje.toLowerCase()] || []).slice(); });
      princ.forEach(r => { const k = r.personaje.toLowerCase(); if(!seen[k]) seen[k] = []; seen[k].push(en.cap); });
    });
    dcBuildPlans(sorted);
    S.warnings = dcWarnings(sorted);
    S.processed = sorted;
    addLog(sorted.length ? '✔ Procesamiento completado' : 'Sin archivos válidos', sorted.length ? 'ok' : 'err');
  }finally{ S.busy = false; repintar(); }
}

/** El Excel de DUBCARD, para descargar. Lo de DublajeCast, tal cual. */
function dcDescargar(){
  const S = ST.dc, processed = S.processed, isNetflix = !S.client || S.client.kind === 'netflix';
  if(!processed.length){ aviso('Primero procesa los archivos'); return; }
  try{
    const wb2 = XLSX.utils.book_new();
    const usedNames = [];
    if(isNetflix){
      XLSX.utils.book_append_sheet(wb2, dcBuildCrewSheet(), 'Producción');
      if(processed.length > 1) XLSX.utils.book_append_sheet(wb2, dcBuildMatrixSheet(processed), 'Matriz');
      XLSX.utils.book_append_sheet(wb2, dcBuildAlertSheet(S.warnings), 'Alertas Netflix');
    }
    processed.forEach(en => {
      const ws = dcBuildSheet(en, { plan: isNetflix });
      const sn = en.cap.replace(/[:\\\/?*\[\]]/g, '').slice(0, 28);
      let fn = sn, k = 1;
      while(usedNames.includes(fn)) fn = sn.slice(0, 24) + '_' + k++;
      usedNames.push(fn);
      XLSX.utils.book_append_sheet(wb2, ws, fn);
    });
    const out = XLSX.write(wb2, { bookType: 'xlsx', type: 'array', cellStyles: true });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const caps = processed.map(en => en.cap);
    const nums = processed.map(en => dcFmtEp(en.cap)).filter(x => x && /^\d+$/.test(x));
    const names = caps.map(c => c.replace(/[\s_\-]*\d{2,4}\s*$/, '').trim()).filter(Boolean);
    let prog = names[0] || 'PROGRAMA'; names.forEach(nm => { let i = 0; while(i < prog.length && i < nm.length && prog[i].toUpperCase() === nm[i].toUpperCase()) i++; prog = prog.slice(0, i); });
    prog = (prog.replace(/[\s_\-]+$/, '').trim() || names[0] || 'PROGRAMA').toUpperCase();
    const fname = ('DUBCARD_' + prog + '_' + (nums.length ? nums.join('-') : new Date().toISOString().slice(0, 10))).replace(/[\\/:*?"<>|]+/g, '') + '.xlsx';
    bdDownload(blob, fname);
    aviso('⬇ ' + fname);
  }catch(e){ aviso('Error: ' + e.message); }
}

function dcTabla(label, rows, headers, rowFn){
  return '<div class="dct-sec"><div class="dct-sec-t">' + E(label) + ' (' + rows.length + ')</div>'
    + (rows.length ? '<div class="dct-tabla-w"><table class="dct-tabla"><thead><tr>' + ['#'].concat(headers).map(h => '<th>' + E(h) + '</th>').join('') + '</tr></thead><tbody>'
      + rows.map((r, i) => { const x = rowFn(r); return '<tr style="background:' + x.bg + '"><td>' + (i + 1) + '</td>' + x.cells.map(v => '<td>' + E(v == null ? '' : v) + '</td>').join('') + '</tr>'; }).join('')
      + '</tbody></table></div>' : '')
    + '</div>';
}

function dcPlanHtml(en){
  const pl = en.plan;
  const chip = (cls, t) => '<span class="dct-chip dct-chip-' + cls + '">' + E(t) + '</span>';
  const sub = t => '<div class="dct-sub">' + E(t) + '</div>';
  if(!pl) return '<div class="dct-plan"><div class="dct-plan-t">Plan de copiado — Netflix Dub Talent List</div><div class="dct-tenue"><b>Primer episodio:</b> créalo completo en la herramienta (' + dcCastMap(en).size + ' principales + ' + dcAdicSet(en).size + ' talentos adicionales + crew). Luego usa el botón <b>Copy</b> de Netflix a nivel de episodio para los siguientes.</div></div>';
  return '<div class="dct-plan"><div class="dct-plan-t">Plan de copiado — Netflix Dub Talent List</div>'
    + '<div class="dct-plan-paso">1. En Netflix: pulsa COPY en «' + E(pl.srcCap) + '» y PASTE en este episodio</div>'
    + sub('Se mantienen sin cambios (' + pl.keep.length + ') — no toques nada')
    + (pl.reassign.length ? sub('2. Reasignar talento (' + pl.reassign.length + ') — mismo personaje, otro actor') + '<div>' + pl.reassign.map(r => chip('re', r.personaje + ': ' + r.antes + ' → ' + r.ahora)).join('') + '</div>' : '')
    + (pl.del.length ? sub('3. Eliminar del pegado (' + pl.del.length + ')') + '<div>' + pl.del.map(r => chip('del', r.personaje)).join('') + '</div>' : '')
    + (pl.add.length ? sub('4. Crear nuevos (' + pl.add.length + ')') + '<div>' + pl.add.map(r => chip('add', r.personaje + ' — ' + (r.talento || 'Sin asignar'))).join('') + '</div>' : '')
    + ((pl.aDel.length || pl.aAdd.length) ? sub('Additional Cast (solo talentos): quitar ' + pl.aDel.length + ' · agregar ' + pl.aAdd.length) + '<div>' + pl.aDel.map(t => chip('del', t)).join('') + pl.aAdd.map(t => chip('add', t)).join('') + '</div>' : sub('Additional Cast: idéntico al episodio fuente'))
    + '<div class="dct-tenue">Total de ediciones tras el paste: ' + (pl.reassign.length + pl.del.length + pl.add.length + pl.aDel.length + pl.aAdd.length) + ' (vs. crear ' + (dcCastMap(en).size + dcAdicSet(en).size) + ' registros desde cero)</div></div>';
}

function dcMatrizHtml(eps){
  const rows = dcMatrixRows(eps);
  return '<div class="dct-sec"><div class="dct-sec-t">Matriz de recurrencia (personaje × episodio)</div><div class="dct-matriz"><table><thead><tr><th>Personaje</th>' + eps.map(e => '<th>' + E(dcFmtEp(e.cap)) + '</th>').join('') + '</tr></thead><tbody>'
    + rows.map(r => '<tr><td class="dct-mz-n">' + E(r.name) + '</td>' + eps.map((_, ei) => '<td class="' + (r.changed[ei] ? 'dct-mz-cambia' : '') + '">' + E(r.byEp[ei] == null ? '' : r.byEp[ei]) + '</td>').join('') + '</tr>').join('')
    + '</tbody></table></div></div>';
}

function dcHtml(){
  const S = ST.dc, isNetflix = !S.client || S.client.kind === 'netflix';
  const cli = S.client || lastClient() || { kind: 'netflix', name: 'Netflix' };
  return '<div class="dct">'
    + '<div class="dct-drop" data-dct="dcElegir">' + ico('subir', 22) + '<b>Haz clic o arrastra los desgloses de cada episodio</b><span>.xlsm · .xlsx · .xls · varios a la vez (hojas DESGLOCE + CASTING)</span>'
    +   '<input type="file" id="dctDcFiles" multiple accept=".xlsm,.xlsx,.xls" hidden></div>'
    + (S.entries.length ? '<div class="dct-lista">' + S.entries.map((e, i) => '<div class="dct-arch"><span class="dct-arch-n">' + E(e.name) + '</span>'
        + '<input value="' + E(e.cap) + '" placeholder="Capítulo" data-dct="dcCap" data-i="' + i + '"><button class="cs-b cs-b-icono cs-borrar" data-dct="dcQuitar" data-i="' + i + '" title="Quitar">' + ico('cerrar', 13) + '</button></div>').join('') + '</div>'
      + '<div class="dct-cliente"><span>Cliente:</span>'
      +   '<label><input type="radio" name="dctCli" data-dct="dcCli" value="netflix"' + (cli.kind !== 'otro' ? ' checked' : '') + '> Netflix <i>(formato completo: Producción, Matriz, Alertas y plan de copiado)</i></label>'
      +   '<label><input type="radio" name="dctCli" data-dct="dcCli" value="otro"' + (cli.kind === 'otro' ? ' checked' : '') + '> Otra casa</label>'
      +   '<input type="text" id="dctCliNombre" data-dct="dcCliNombre" placeholder="Nombre del cliente" value="' + E(cli.kind === 'otro' ? cli.name || '' : '') + '"' + (cli.kind === 'otro' ? '' : ' hidden') + '></div>'
      + '<button class="cs-b cs-pri dct-ancho" data-dct="dcProcesar"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Procesando…' : ico('actualizar', 14) + '<span>Procesar</span>') + '</button>' : '')
    + (S.logs.length ? '<div class="dct-log">' + S.logs.map(l => '<div class="dct-log-' + (l.cls || 'n') + '">' + E(l.msg) + '</div>').join('') + '</div>' : '')
    + (S.processed.length ? '<button class="cs-b cs-pri dct-ancho dct-bajar" data-dct="dcBajar">' + ico('bajar', 14) + '<span>Descargar Excel</span></button>'
      + (isNetflix && S.warnings.length ? '<div class="dct-alertas"><b>Revisa antes de cargar en Netflix</b> (evita crear talentos duplicados):' + S.warnings.map(w => '<div>' + E(w) + '</div>').join('') + '</div>' : '')
      + (isNetflix && S.processed.length > 1 ? dcMatrizHtml(S.processed) : '')
      + S.processed.map(en => {
          const sp = dcSplitRows(en.data);
          return '<div class="dct-ep"><div class="dct-ep-t">' + E(en.cap) + '</div>'
            + (isNetflix ? dcPlanHtml(en) : '')
            + (isNetflix ? dcTabla('Equipo de producción', DC_CREW, ['Rol', 'Nombre'], r => ({ cells: [r.rol, r.nombre], bg: '#e0e7ff' })) : '')
            + dcTabla('Principales', sp.princ, ['Personaje', 'Talento', 'Nota'], r => ({ cells: [r.personaje, r.talento || 'Sin asignar', r.prevEps && r.prevEps.length ? 'Repite: EP ' + r.prevEps.map(dcFmtEp).join(', EP ') : ''], bg: r.talento ? '#bbf7d0' : '#fecaca' }))
            + dcTabla('Adicionales', sp.adicNorm, ['Personaje', 'Talento', 'Nota'], r => ({ cells: [r.personaje, r.talento || 'Sin asignar', ''], bg: r.talento ? '#fef08a' : '#fecaca' }))
            + dcTabla('Adicionales compartidos', sp.adicComp, ['Personaje', 'Talento', 'Nota'], r => ({ cells: [r.personaje, r.talento, 'Compartido'], bg: '#ddd6fe' }))
            + '</div>';
        }).join('') : '')
    + '</div>';
}

function dcAnadir(files){
  const S = ST.dc;
  Array.from(files || []).filter(f => /\.(xlsm|xlsx|xls)$/i.test(f.name)).forEach(f => {
    if(!S.entries.find(e => e.name === f.name)) S.entries.push({ file: f, name: f.name, cap: f.name.replace(/\.[^.]+$/, ''), data: [] });
  });
  repintar();
}

function dcCablear(raiz){
  const S = ST.dc;
  const q = s => raiz.querySelector(s);
  const input = q('#dctDcFiles');
  raiz.querySelectorAll('[data-dct]').forEach(el => {
    const que = el.getAttribute('data-dct'), i = +el.getAttribute('data-i');
    if(que === 'dcElegir'){
      el.onclick = (ev) => { if(ev.target !== input && input) input.click(); };
      el.ondragover = (ev) => { ev.preventDefault(); };
      el.ondrop = (ev) => { ev.preventDefault(); dcAnadir(ev.dataTransfer && ev.dataTransfer.files); };
    }
    else if(que === 'dcCap') el.oninput = () => { if(S.entries[i]) S.entries[i].cap = el.value; };
    else if(que === 'dcQuitar') el.onclick = () => { S.entries.splice(i, 1); repintar(); };
    else if(que === 'dcCli') el.onchange = () => {
      const otro = el.value === 'otro', n = q('#dctCliNombre');
      if(n) n.hidden = !otro;
      S.client = { kind: otro ? 'otro' : 'netflix', name: otro ? (n ? n.value.trim() : '') : 'Netflix' };
      try{ localStorage.setItem(DC_CLIENT_KEY, JSON.stringify(S.client)); }catch(e){ /* sin almacén */ }
    };
    else if(que === 'dcCliNombre') el.oninput = () => { S.client = { kind: 'otro', name: el.value.trim() }; try{ localStorage.setItem(DC_CLIENT_KEY, JSON.stringify(S.client)); }catch(e){ /* sin almacén */ } };
    else if(que === 'dcProcesar') el.onclick = () => {
      if(!S.client) S.client = lastClient() || { kind: 'netflix', name: 'Netflix' };
      if(S.client.kind === 'otro' && !S.client.name){ aviso('Escribe el nombre del cliente'); return; }
      dcProcesar().catch(e => aviso('No se pudo procesar: ' + e.message));
    };
    else if(que === 'dcBajar') el.onclick = () => dcDescargar();
  });
  if(input) input.onchange = () => { dcAnadir(input.files); input.value = ''; };
}

/* ── Breakdowns ───────────────────────────────────────────────────────────── */

/** Los breakdowns guardados: los de DublajeCast y los de este equipo que aún no subieron. */
function bdGuardados(){
  let dc = [];
  try{ const d = (typeof csDatos === 'function') ? csDatos().datos : null; dc = (d && Array.isArray(d.breakdowns)) ? d.breakdowns : []; }catch(e){ dc = []; }
  const ids = new Set(dc.map(b => String(b.id)));
  return dc.concat(ST.bd.locales.filter(b => !ids.has(String(b.id)))).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Guarda un breakdown donde los guarda DublajeCast (su lista `breakdowns`). Sin sesión, se queda en este equipo y se dice. */
async function bdGuardar(rec){
  ST.bd.locales.push(rec);
  if(typeof csEditar !== 'function') return 'equipo';
  const r = await csEditar(p => { if(!Array.isArray(p.breakdowns)) p.breakdowns = []; if(p.breakdowns.some(b => String(b.id) === String(rec.id))) return false; p.breakdowns.push(rec); return true; }, 'Breakdown guardado: ' + rec.title);
  if(r === 'guardado' || r === 'igual'){ ST.bd.locales = ST.bd.locales.filter(b => b.id !== rec.id); return 'nube'; }
  aviso('El breakdown se queda en este equipo: entra en DublajeCast para guardarlo con los demás');
  return 'equipo';
}

function bdId(){ return 'bd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

async function bdLeer(file, kind){
  const B = ST.bd;
  if(!file) return;
  B.reading = kind; B.err = ''; repintar();
  try{
    const text = (await bdExtractText(file)).replace(/\r/g, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
    if(text.length < 200) throw new Error('«' + file.name + '» casi no tiene texto legible (' + text.length + ' caracteres). Si es un PDF escaneado, necesita OCR.');
    const rec = { name: file.name, text: text, chars: text.length };
    if(kind === 'script'){
      B.script = rec; B.result = null; B.live = '';
      const base = file.name.replace(/\.(docx|pdf|txt|md)$/i, ''); const num = extractEpNum(base);
      if(!B.name){ B.name = base.replace(/[_\-.]+/g, ' ').replace(/\b(ep|episodio|cap(itulo)?|e)\s*0*\d{1,3}\b.*$/i, '').replace(/\b\d{3}\b.*$/, '').replace(/\s+/g, ' ').trim(); }
      if(num != null){ B.ep = String(num); B.isMovie = false; } else B.isMovie = true;
    }else B.guide = rec;
    aviso('✓ ' + file.name + ' leído: ' + text.length.toLocaleString('es') + ' caracteres');
  }catch(e){ B.err = (e && e.message) || String(e); }
  finally{ B.reading = ''; repintar(); }
}

function bdPuede(){ const B = ST.bd, cfg = getBdCfg(); return !!(B.script && cfg.apiKey && B.name.trim() && (B.isMovie || B.ep) && !B.busy); }

async function bdGenerar(){
  const B = ST.bd, cfg = getBdCfg();
  if(!bdPuede()) return;
  B.busy = true; B.err = ''; B.live = ''; B.result = null;
  const ctrl = new AbortController(); B.abort = ctrl;
  repintar();
  const title = bdTitle(B.name, B.isMovie, B.ep);
  const wantSeries = B.withSeries && !B.isMovie;
  const prev = wantSeries ? bdGuardados().filter(b => !b.isMovie && normN(b.name) === normN(B.name) && String(b.ep) !== String(B.ep)).sort((a, b) => Number(a.ep) - Number(b.ep)).slice(-8)
    .map(b => { const t = String(b.text || ''); const m = t.match(/RESUMEN DEL EPISODIO[\s\S]*?(?=\n\s*(?:#+\s*)?(?:\d+\.\s*)?PERSONAJES|$)/i); return '— Episodio ' + b.ep + ': ' + (m ? m[0].replace(/^RESUMEN DEL EPISODIO\s*/i, '') : t).replace(/^#+\s*/gm, '').trim().slice(0, 1500); }) : [];
  const user = ['DATOS DE ENTRADA', 'Título del documento esperado: ' + title, 'Formato: ' + (B.isMovie ? 'PELÍCULA' : 'SERIE — episodio ' + B.ep + (String(B.ep) === '1' ? ' (episodio 1)' : '')), 'Nombre: ' + B.name.trim(), 'Show guide adjunto: ' + (B.guide ? 'SÍ' : 'NO'),
    wantSeries ? 'Incluir RESUMEN GENERAL DE LA SERIE: SÍ (sección aparte tras el título; breakdowns anteriores adjuntos: ' + prev.length + ')' : '', B.notes.trim() ? 'Indicaciones adicionales del departamento: ' + B.notes.trim() : '', '',
    '=== LIBRETO EN ESPAÑOL (FUENTE PRINCIPAL) · archivo: ' + B.script.name + ' ===', B.script.text,
    B.guide ? '\n=== SHOW GUIDE (SÓLO CONTEXTO · etiquetar como [SHOW GUIDE]) · archivo: ' + B.guide.name + ' ===\n' + B.guide.text : '',
    prev.length ? '\n=== CONTEXTO: RESÚMENES DE BREAKDOWNS ANTERIORES DE ESTA SERIE (sólo para el resumen general) ===\n' + prev.join('\n\n') : '', '', 'Genera ahora el BREAKDOWN siguiendo estrictamente las reglas.'].join('\n');
  const t0 = Date.now();
  let ultimo = 0;
  const enVivo = (txt) => {
    B.live = txt;
    if(Date.now() - ultimo < 250) return;
    ultimo = Date.now();
    const el = document.getElementById('dctBdVivo'), n = document.getElementById('dctBdVivoN');
    if(el){ el.textContent = txt; el.scrollTop = el.scrollHeight; }
    if(n) n.textContent = txt.length.toLocaleString('es') + ' caracteres generados';
  };
  try{
    const r = await bdGenerate({ cfg: cfg, system: BD_RULES, user: user, onDelta: enVivo, signal: ctrl.signal });
    if(r.stop === 'refusal') throw new Error('El modelo declinó generar este análisis. Revisa el contenido o intenta con otro modelo.');
    let text = bdNormalize(r.text.trim()); if(!text) throw new Error('La API devolvió una respuesta vacía');
    if(r.stop === 'max_tokens') text += '\n\n[AVISO: la respuesta se cortó por longitud máxima; vuelve a generar con un libreto más corto]';
    const rec = { id: bdId(), title: title, name: B.name.trim(), isMovie: B.isMovie, ep: B.isMovie ? '' : String(B.ep), createdAt: new Date().toISOString(), model: r.model, seconds: Math.round((Date.now() - t0) / 1000),
                  inputChars: B.script.chars + (B.guide ? B.guide.chars : 0), scriptFile: B.script.name, guideFile: B.guide ? B.guide.name : '', usage: r.usage || null, text: text };
    B.result = rec;
    aviso('✓ Breakdown generado en ' + rec.seconds + ' s');
    B.busy = false; B.abort = null;
    await bdGuardar(rec);
  }catch(e){ B.err = (e && e.name === 'AbortError') ? 'Generación cancelada' : ((e && e.message) || String(e)); }
  finally{ B.busy = false; B.abort = null; repintar(); }
}

/** El breakdown en pantalla: lo que DublajeCast pinta con BdDoc. */
function bdDocHtml(text){
  const inline = s => E(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  let out = '', ul = false;
  const cierra = () => { if(ul){ out += '</ul>'; ul = false; } };
  bdParse(text).forEach(b => {
    if(b.t === 'li'){ if(!ul){ out += '<ul>'; ul = true; } out += '<li>' + inline(b.x) + '</li>'; return; }
    cierra();
    if(b.t === 'h1') out += '<div class="bd-h1">' + E(b.x) + '</div>';
    else if(b.t === 'h2') out += '<div class="bd-h2">' + E(b.x) + '</div>';
    else if(b.t === 'h3') out += '<div class="bd-h3">' + E(b.x) + '</div>';
    else if(b.t === 'field') out += '<div class="bd-f"><b>' + E(b.k) + ':</b> ' + inline(b.x) + '</div>';
    else if(b.t === 'guide') out += '<div class="bd-guia"><b>SHOW GUIDE</b> ' + inline(b.x) + '</div>';
    else out += '<p>' + inline(b.x) + '</p>';
  });
  cierra();
  return '<div class="bd-doc">' + out + '</div>';
}

function bdResultadoHtml(rec, cerrar){
  return '<div class="dct-res"><div class="dct-res-cab"><b>' + E(rec.title) + '</b>'
    + '<button class="cs-b" data-dct="bdCopiar" data-id="' + E(rec.id) + '">Copiar</button>'
    + '<button class="cs-b cs-pri" data-dct="bdWord" data-id="' + E(rec.id) + '">' + ico('bajar', 13) + '<span>Word (.docx)</span></button>'
    + '<button class="cs-b" data-dct="bdTxt" data-id="' + E(rec.id) + '">.txt</button>'
    + '<button class="cs-b" data-dct="bdImprimir" data-id="' + E(rec.id) + '">Imprimir</button>'
    + (cerrar ? '<button class="cs-b cs-b-icono" data-dct="bdVer" data-id="' + E(rec.id) + '" title="Ocultar">' + ico('cerrar', 13) + '</button>' : '') + '</div>'
    + '<div class="dct-tenue">' + E(new Date(rec.createdAt).toLocaleString('es')) + ' · ' + E(rec.model || '') + (rec.seconds ? ' · ' + rec.seconds + ' s' : '') + (rec.inputChars ? ' · ' + rec.inputChars.toLocaleString('es') + ' caracteres de entrada' : '') + (rec.scriptFile ? ' · ' + E(rec.scriptFile) : '') + (rec.guideFile ? ' + ' + E(rec.guideFile) : '') + '</div>'
    + bdDocHtml(rec.text) + '</div>';
}

function bdConfigHtml(){
  const cfg = getBdCfg(), pr = BD_PROVIDERS[cfg.provider] || BD_PROVIDERS.custom;
  return '<div class="dct-cfg"><div class="dct-sec-t">Configuración del modelo</div>'
    + '<label>Proveedor<select id="dctBdProv">' + Object.keys(BD_PROVIDERS).map(k => '<option value="' + k + '"' + (k === cfg.provider ? ' selected' : '') + '>' + E(BD_PROVIDERS[k].l) + '</option>').join('') + '</select></label>'
    + '<div class="dct-tenue">' + E(pr.hint || '') + (pr.keyUrl ? ' Obtén la clave en ' + E(pr.keyUrl.replace(/^https:\/\//, '')) + '.' : '') + (pr.proxy ? ' Las llamadas pasan por el proxy de este sitio (/api/llm).' : '') + '</div>'
    + (cfg.provider === 'custom' ? '<label>URL base (termina en /v1)<input id="dctBdBase" value="' + E(cfg.baseUrl || '') + '" placeholder="https://mi-servidor/v1"></label><div class="dct-tenue">Ojo: Dubbipt solo deja conectar con los proveedores de la lista; un endpoint propio puede quedar bloqueado.</div>' : '')
    + '<label>Clave de API<input id="dctBdClave" type="password" autocomplete="off" value="' + E(cfg.apiKey || '') + '" placeholder="clave"></label>'
    + '<label>Modelo<input id="dctBdModelo" list="dctBdModelos" value="' + E(cfg.model || '') + '" placeholder="' + E(pr.defaultModel || 'nombre del modelo') + '"><datalist id="dctBdModelos">' + (pr.models || []).map(m => '<option value="' + E(m) + '">').join('') + '</datalist></label>'
    + '<div class="dct-tenue">La clave se guarda sólo en este equipo. Cada breakdown consume la cuota de tu cuenta en el proveedor.</div>'
    + (ST.bd.cfgMsg ? '<div class="' + (ST.bd.cfgMsg.charAt(0) === '✓' ? 'dct-ok' : 'dct-mal') + '">' + E(ST.bd.cfgMsg.replace(/^[✓✗] ?/, '')) + '</div>' : '')
    + '<div class="dct-fila"><button class="cs-b" data-dct="bdProbar">Probar conexión</button><button class="cs-b" data-dct="bdCfgCerrar">Cancelar</button><button class="cs-b cs-pri" data-dct="bdCfgGuardar">Guardar</button></div></div>';
}

function bdHtml(){
  const B = ST.bd, cfg = getBdCfg(), saved = bdGuardados();
  const drop = (kind, rec, label, hint) => '<div class="dct-drop dct-drop-p' + (rec ? ' dct-drop-ok' : '') + '" data-dct="bdElegir" data-k="' + kind + '"><b>' + (B.reading === kind ? 'Leyendo…' : (rec ? ico('hecho', 13) + ' ' + E(rec.name) : label)) + '</b>'
    + '<span>' + (rec ? rec.chars.toLocaleString('es') + ' caracteres · clic para cambiar' : hint) + '</span><input type="file" id="dctBd_' + kind + '" accept=".docx,.pdf,.txt,.md" hidden></div>';
  return '<div class="dct">'
    + '<div class="dct-fila dct-cab2"><span class="dct-tenue">Análisis de libretos para casting, dirección y técnica · ' + saved.length + ' guardado' + (saved.length === 1 ? '' : 's') + '</span>'
    +   '<button class="cs-b" data-dct="bdCfg">' + ico('dubcards', 13) + '<span>' + E(cfg.apiKey ? bdProviderLabel(cfg) : 'Configurar clave de API') + '</span></button></div>'
    + (B.cfgOpen ? bdConfigHtml() : '')
    + (!cfg.apiKey && !B.cfgOpen ? '<div class="dct-alertas">Falta la clave de API del proveedor de modelos. Configúrala: puedes usar una gratuita (NVIDIA, Groq u OpenRouter) o Anthropic.</div>' : '')
    + '<div class="dct-caja">'
    +   '<div class="dct-fila">' + drop('script', B.script, 'Libreto en español (obligatorio)', 'Clic o arrastra · .docx, .pdf o .txt') + drop('guide', B.guide, 'Show guide (opcional)', 'Sólo contexto · se etiqueta [SHOW GUIDE]') + '</div>'
    +   '<div class="dct-fila">'
    +     '<label class="dct-crece">Serie o película<input data-dct="bdNombre" value="' + E(B.name) + '" placeholder="Nombre exacto"></label>'
    +     '<label>Formato<select data-dct="bdFormato"><option value="serie"' + (B.isMovie ? '' : ' selected') + '>Serie</option><option value="pelicula"' + (B.isMovie ? ' selected' : '') + '>Película</option></select></label>'
    +     (B.isMovie ? '' : '<label>Episodio<input type="number" min="1" data-dct="bdEp" value="' + E(B.ep) + '" placeholder="N°" style="width:90px"></label>')
    +   '</div>'
    +   '<label>Indicaciones adicionales (opcional)<input data-dct="bdNotas" value="' + E(B.notes) + '" placeholder="p. ej. enfocarse en los personajes nuevos de esta temporada"></label>'
    +   (B.isMovie ? '' : '<label class="dct-check"><input type="checkbox" data-dct="bdSerie"' + (B.withSeries ? ' checked' : '') + '> Incluir <b>resumen general de la serie</b> (usa el show guide y los breakdowns anteriores de esta serie)</label>')
    +   '<div class="dct-fila"><span class="dct-tenue dct-crece">' + (B.script ? 'Título: ' + E(bdTitle(B.name, B.isMovie, B.ep)) + ' · ' + E(bdProviderLabel(cfg)) : 'Sube el libreto para empezar. Los nombres se escriben tal cual aparecen; nunca se inventan pronunciaciones.') + '</span>'
    +     (B.busy ? '<button class="cs-b cs-borrar" data-dct="bdCancelar">Cancelar</button>' : '<button class="cs-b cs-pri" data-dct="bdGenerar"' + (bdPuede() ? '' : ' disabled') + '>Generar breakdown</button>') + '</div>'
    +   (B.err ? '<div class="dct-mal">' + E(B.err) + '</div>' : '')
    + '</div>'
    + (B.busy ? '<div class="dct-caja"><div class="dct-vivo-t">Analizando el libreto… <span id="dctBdVivoN">' + (B.live ? B.live.length.toLocaleString('es') + ' caracteres generados' : '(el modelo está leyendo; puede tardar unos minutos)') + '</span></div><pre id="dctBdVivo" class="dct-vivo">' + E(B.live) + '</pre></div>' : '')
    + (B.result && !B.busy ? bdResultadoHtml(B.result, false) : '')
    + '<div class="cs-rep-sec">Breakdowns guardados</div>'
    + (saved.length ? '<div class="dct-lista">' + saved.map(b => '<div><div class="dct-arch"><span class="dct-arch-n"><b>' + E(b.title) + '</b><i>' + E(new Date(b.createdAt).toLocaleString('es')) + ' · ' + E(b.model || '') + (b.guideFile ? ' · con show guide' : '') + (ST.bd.locales.some(x => x.id === b.id) ? ' · solo en este equipo' : '') + '</i></span>'
          + '<button class="cs-b" data-dct="bdVer" data-id="' + E(b.id) + '">' + (B.openId === b.id ? 'Ocultar' : 'Ver') + '</button>'
          + '<button class="cs-b cs-pri" data-dct="bdWord" data-id="' + E(b.id) + '">Word</button>'
          + '<button class="cs-b cs-b-icono cs-borrar" data-dct="bdBorrar" data-id="' + E(b.id) + '" title="Eliminar">' + ico('borrar', 13) + '</button></div>'
          + (B.openId === b.id ? bdResultadoHtml(b, true) : '') + '</div>').join('') + '</div>'
      : '<div class="cs-nada">Aún no hay breakdowns guardados.</div>')
    + '</div>';
}

function bdCablear(raiz){
  const B = ST.bd;
  const busca = id => bdGuardados().concat(B.result ? [B.result] : []).find(b => String(b.id) === String(id));
  raiz.querySelectorAll('[data-dct]').forEach(el => {
    const que = el.getAttribute('data-dct'), id = el.getAttribute('data-id');
    if(que === 'bdElegir'){
      const k = el.getAttribute('data-k'), input = el.querySelector('input[type=file]');
      el.onclick = (ev) => { if(ev.target !== input && input) input.click(); };
      el.ondragover = (ev) => ev.preventDefault();
      el.ondrop = (ev) => { ev.preventDefault(); bdLeer(ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0], k); };
      if(input) input.onchange = () => { bdLeer(input.files && input.files[0], k); input.value = ''; };
    }
    else if(que === 'bdNombre') el.oninput = () => { B.name = el.value; };
    else if(que === 'bdEp') el.oninput = () => { B.ep = el.value; };
    else if(que === 'bdNotas') el.oninput = () => { B.notes = el.value; };
    else if(que === 'bdFormato') el.onchange = () => { B.isMovie = el.value === 'pelicula'; repintar(); };
    else if(que === 'bdSerie') el.onchange = () => { B.withSeries = !!el.checked; };
    else if(que === 'bdGenerar') el.onclick = () => { bdGenerar().catch(e => { B.err = e.message; repintar(); }); };
    else if(que === 'bdCancelar') el.onclick = () => { if(B.abort) B.abort.abort(); };
    else if(que === 'bdCfg') el.onclick = () => { B.cfgOpen = !B.cfgOpen; B.cfgMsg = ''; repintar(); };
    else if(que === 'bdCfgCerrar') el.onclick = () => { B.cfgOpen = false; B.cfgMsg = ''; repintar(); };
    else if(que === 'bdCfgGuardar' || que === 'bdProbar') el.onclick = async () => {
      const v = s => { const x = raiz.querySelector(s); return x ? x.value.trim() : ''; };
      const prov = v('#dctBdProv') || 'nvidia', pr = BD_PROVIDERS[prov] || BD_PROVIDERS.custom;
      const cfg = Object.assign({}, getBdCfg(), { provider: prov, apiKey: v('#dctBdClave'), model: v('#dctBdModelo') || pr.defaultModel || '', baseUrl: v('#dctBdBase') });
      if(que === 'bdCfgGuardar'){ saveBdCfg(cfg); B.cfgOpen = false; B.cfgMsg = ''; aviso('✓ Configuración guardada'); repintar(); return; }
      if(!cfg.apiKey){ B.cfgMsg = 'Pega primero la clave'; repintar(); return; }
      B.cfgMsg = 'Probando…'; repintar();
      try{ const r = await bdGenerate({ cfg: cfg, system: 'Responde únicamente con la palabra OK.', user: 'Prueba de conexión.' }); B.cfgMsg = '✓ Conexión correcta · modelo ' + r.model + ' · respuesta: ' + String(r.text).slice(0, 40); }
      catch(e){ B.cfgMsg = '✗ ' + ((e && e.message) || e); }
      repintar();
    };
    else if(que === 'bdProvCambio') { /* sin uso */ }
    else if(que === 'bdVer') el.onclick = () => { B.openId = (B.openId === id) ? null : id; repintar(); };
    else if(que === 'bdCopiar') el.onclick = () => { const b = busca(id); if(b && navigator.clipboard) navigator.clipboard.writeText(b.text).then(() => aviso('✓ Copiado'), () => aviso('No se pudo copiar')); };
    else if(que === 'bdWord') el.onclick = async () => { const b = busca(id); if(!b) return; try{ bdDownload(await bdMakeDocx(b.text), bdSafeName(b.title) + '.docx'); }catch(e){ aviso('✗ ' + e.message); } };
    else if(que === 'bdTxt') el.onclick = () => { const b = busca(id); if(b) bdDownload(new Blob([b.text], { type: 'text/plain;charset=utf-8' }), bdSafeName(b.title) + '.txt'); };
    else if(que === 'bdImprimir') el.onclick = () => { const b = busca(id); if(b) bdPrint(b); };
    else if(que === 'bdBorrar') el.onclick = async () => {
      const b = busca(id); if(!b) return;
      const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal) ? await DDL_UI.confirmModal({ title: 'Eliminar breakdown', body: '¿Eliminar el breakdown «' + b.title + '»?', confirmLabel: 'Eliminar', cancelLabel: 'Cancelar', danger: true }) : true;
      if(!ok) return;
      B.locales = B.locales.filter(x => String(x.id) !== String(id));
      if(B.openId === id) B.openId = null;
      if(typeof csEditar === 'function') await csEditar(p => { const l = Array.isArray(p.breakdowns) ? p.breakdowns : []; const n = l.length; p.breakdowns = l.filter(x => String(x.id) !== String(id)); return p.breakdowns.length !== n; }, 'Breakdown eliminado: ' + b.title);
      repintar();
    };
  });
  const prov = raiz.querySelector('#dctBdProv');
  if(prov) prov.onchange = () => { const c = getBdCfg(); const np = BD_PROVIDERS[prov.value]; saveBdCfg(Object.assign({}, c, { provider: prov.value, model: (np && np.defaultModel) || '' })); B.cfgMsg = ''; repintar(); };
}

/* ── Pegado de casting ────────────────────────────────────────────────────── */

const PEGADO_RUTA = './dctools/pegado-casting.html';
function pgHtml(){
  return '<div class="dct dct-pegado' + (ST.pg.completa ? ' dct-pegado-completa' : '') + '">'
    + '<div class="dct-fila dct-cab2"><span class="dct-tenue dct-crece">Herramienta de pegado y armado de casting</span>'
    + '<button class="cs-b" data-dct="pgCompleta">' + (ST.pg.completa ? 'Restaurar' : 'Pantalla completa') + '</button></div>'
    + '<iframe class="dct-marco" title="Pegado de casting" src="' + PEGADO_RUTA + '" sandbox="allow-scripts allow-downloads allow-same-origin allow-modals"></iframe></div>';
}
function pgCablear(raiz){
  const b = raiz.querySelector('[data-dct="pgCompleta"]');
  if(b) b.onclick = () => { ST.pg.completa = !ST.pg.completa; repintar(); };
}

/* ── Hacia fuera ──────────────────────────────────────────────────────────── */

const TITULOS = { dubcards: ['DUBCARDs', 'Procesador de casting: el plan de copiado de Netflix, la matriz de recurrencia y sus alertas'],
                  breakdowns: ['Breakdowns', 'Análisis de libretos con un modelo de lenguaje'],
                  pegado: ['Pegado de casting', 'Rellena la columna del actor de un desglose con el reparto vigente'] };

function html(vista){
  const t = TITULOS[vista];
  if(!t) return '';
  const cab = '<div class="cs-cab"><div class="cs-cab-t"><h2>' + E(t[0]) + '</h2><div class="cs-cab-sub">' + E(t[1]) + '</div></div></div>';
  try{
    if(vista === 'dubcards') return cab + dcHtml();
    if(vista === 'breakdowns') return cab + bdHtml();
    return cab + pgHtml();
  }catch(e){ return cab + '<div class="cs-nada">No se pudo pintar: ' + E(e.message) + '</div>'; }
}
function cablear(raiz, vista){
  if(!raiz) return;
  if(vista === 'dubcards') dcCablear(raiz);
  else if(vista === 'breakdowns') bdCablear(raiz);
  else if(vista === 'pegado') pgCablear(raiz);
}

return { html: html, cablear: cablear, ST: ST, dcParseFile: dcParseFile, dcProcesar: dcProcesar, bdDocHtml: bdDocHtml, bdGuardados: bdGuardados, bdGuardar: bdGuardar,
         bdEndpoint: bdEndpoint, BD_PROVIDERS: BD_PROVIDERS, bdMakeDocx: bdMakeDocx, bdExtractText: bdExtractText, dcSplitRows: dcSplitRows };
})();

/* ═══ FIN DE HERRAMIENTAS DE DUBLAJECAST EN DUBBIPT ═══ */
