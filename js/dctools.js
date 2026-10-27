/* Dubcards (con el formato Paramount y el Contract Inventory) y Breakdowns, dentro de Dubbipt · especificacion 09, PRO-38
 *
 * Pedido de sala: «quiero que las herramientas de dubcards, breakdowns,
 * producción y tráiler estén dentro de Dubbipt, que no sea un link».
 * Producción y Tráilers ya eran de Dubbipt (castingvistas.js). DUBCARDs,
 * Breakdowns y Pegado de casting abrían Casting; ahora se usan aquí:
 *
 *   · El procesado es el MISMO de Casting: su código, copiado tal cual
 *     de dublajecast/index.html (líneas de DC_CREW a bdPrint), con tres
 *     cambios para Dubbipt: fflate en vez de JSZip para leer y escribir
 *     Word, el pdf.js que ya carga Dubbipt, y Groq y OpenRouter por el proxy
 *     /api/llm del sitio (la CSP de Dubbipt no deja llamarlos directo).
 *   · La interfaz es nueva, sin React, con el aspecto de la vista de Casting.
 *   · Los breakdowns se guardan donde los guarda Casting (su lista
 *     `breakdowns`), así se ven en los dos sitios. La clave de API se guarda
 *     en este equipo con la misma clave de almacenamiento que Casting.
 *   · Pegado de casting se quitó (PRO-57): sala ya no lo usa.
 *
 * Todo va dentro de una función para que sus nombres (safe, lev, normN…)
 * no choquen con los de Dubbipt. Hacia fuera: DCT.html(vista), DCT.cablear(raiz, vista).
 * De donde depende: XLSX, fflate, pdfjsLib, csIco, csEditar, csDatos, csRepintar,
 * dcxEntrada, castAviso, PROD.
 */

/* ═══ HERRAMIENTAS DE DUBLAJECAST EN DUBBIPT ══════════════════════════════════ */

const DCT = (function(){
'use strict';

/* ── Lo que el código de Casting toma de su propio archivo ── */
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

/* ── El código de Casting (copiado; ver arriba) ─────────────────────── */
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
function saveBdCfg(c){try{localStorage.setItem(BD_CFG_KEY,JSON.stringify(c));}catch(e){/* lo mismo que en Casting: sin eso se sigue */}}
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
function bdDecode(buf){const u=new TextDecoder("utf-8").decode(buf);if((u.match(/\uFFFD/g)||[]).length>5){try{return new TextDecoder("windows-1252").decode(buf);}catch(e){/* lo mismo que en Casting: sin eso se sigue */}}return u;}
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
  const res=await fetch(bdEndpoint(cfg,"/models"),{headers:{"Authorization":"Bearer "+cfg.apiKey,[BD_IA_HDR]:"autorizada"}});
  if(!res.ok){let msg="HTTP "+res.status;try{const j=await res.json();msg=(j.error&&(j.error.message||j.error))||j.detail||msg;}catch(e){/* lo mismo que en Casting: sin eso se sigue */}throw new Error(typeof msg==="string"?msg:JSON.stringify(msg));}
  const j=await res.json();const arr=Array.isArray(j.data)?j.data:(Array.isArray(j)?j:[]);
  return arr.map(m=>m.id||m.name).filter(Boolean).sort();
}
/* Llamada con streaming (SSE). Devuelve {text,stop,model,usage}. Soporta Anthropic y APIs compatibles con OpenAI. */
async function bdGenerate({cfg,system,user,onDelta,signal}){
  bdIaComprobar(cfg);   // contenido confidencial (ENT-22): sin permiso no sale nada
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
    headers[BD_IA_HDR]="autorizada";   // el proxy /api/llm no reenvía sin ella (ENT-22)
    if(cfg.provider==="openrouter"){headers["HTTP-Referer"]=location.origin;headers["X-Title"]="Dubbipt";}
  }
  const res=await fetch(url,{method:"POST",headers,body:JSON.stringify(body),signal});
  if(!res.ok){
    let msg="HTTP "+res.status;try{const j=await res.json();msg=(j.error&&(j.error.message||(typeof j.error==="string"?j.error:null)))||j.detail||j.message||msg;}catch(e){/* lo mismo que en Casting: sin eso se sigue */}
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
  if(buf.trim()){for(const line of buf.split("\n")){if(!line.startsWith("data:"))continue;const data=line.slice(5).trim();if(!data||data==="[DONE]")continue;try{handle(JSON.parse(data));}catch(e){/* lo mismo que en Casting: sin eso se sigue */}}}
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
  const done=()=>{setTimeout(()=>{try{fr.remove();}catch(e){/* lo mismo que en Casting: sin eso se sigue */}},1500);};
  fr.onload=()=>{try{try{if(typeof auditar==="function")auditar("imprimir",{recurso:safe(rec&&rec.title||"breakdown")});}catch(_){/* sin registro (ENT-24) */}const w=fr.contentWindow;w.addEventListener("afterprint",done);w.focus();w.print();setTimeout(done,60000);}catch(e){done();}};
  fr.srcdoc=html;
}
/* Vista en pantalla con la misma jerarquía (colores de la app) */
function bdDownload(blob,name){const a=document.createElement("a");a.className="ddl-encima";a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},2000);}
const bdTitle=(name,isMovie,ep)=>"BREAKDOWN_"+safe(name).trim().toUpperCase().replace(/\s+/g,"_")+"_"+(isMovie?"PELICULA":"EP"+String(ep||"").padStart(2,"0"));
const bdSafeName=t=>t.replace(/[\\/:*?"<>|]+/g,"").slice(0,80);

/* ═══ La interfaz, en Dubbipt ════════════════════════════════════════════════ */

const ST = {
  dc: { entries: [], client: null, processed: [], warnings: [], logs: [], busy: false, modo: 'general' },
  pm: { entries: [], eps: [], logs: [], busy: false, cfg: null },
  px: { entries: [], eps: [], logs: [], busy: false, cfg: null },
  bd: { script: null, guide: null, reading: '', name: '', isMovie: false, ep: '', notes: '', withSeries: true, iaForm: null,
        busy: false, live: '', result: null, err: '', abort: null, openId: null, cfgOpen: false, cfgMsg: '', locales: [] }
};
/* Sin emojis en pantalla (PRO-N6): los textos de Casting los traen; aquí se quitan al pintar. */
const SIN_EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE0F}\u{20E3}]/gu;
const limpio = s => String(s == null ? '' : s).replace(SIN_EMOJI, '').replace(/([^\s]) {2,}/g, '$1 ');
const E = s => limpio(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const ico = (n, sz) => (typeof csIco === 'function') ? csIco(n, sz || 14) : '';
const aviso = t => { try{ castAviso(t); }catch(e){ /* sin avisos */ } };
const repintar = () => { try{ csRepintar(); }catch(e){ /* fuera de la vista de Casting */ } };
const lastClient = () => { try{ return JSON.parse(localStorage.getItem(DC_CLIENT_KEY) || 'null'); }catch(e){ return null; } };
const DC_CLIENT_KEY = 'dc_dubcard_client_v1';

/* ── DUBCARDs ─────────────────────────────────────────────────────────────── */

/** Lee un desglose (.xlsm/.xlsx): sus personajes de DESGLOCE y su talento de CASTING. Lo de Casting, tal cual. */
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

/** El nombre del programa: lo que comparten los títulos de los capítulos, sin su número. */
function dcPrograma(processed){
  const names = processed.map(en => en.cap.replace(/[\s_\-]*\d{2,4}\s*$/, '').trim()).filter(Boolean);
  let prog = names[0] || 'PROGRAMA'; names.forEach(nm => { let i = 0; while(i < prog.length && i < nm.length && prog[i].toUpperCase() === nm[i].toUpperCase()) i++; prog = prog.slice(0, i); });
  return (prog.replace(/[\s_\-]+$/, '').trim() || names[0] || 'PROGRAMA').toUpperCase();
}

/** El Excel de DUBCARD, para descargar. Lo de Casting, tal cual. */
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
    const nums = processed.map(en => dcFmtEp(en.cap)).filter(x => x && /^\d+$/.test(x));
    const prog = dcPrograma(processed);
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

/* Las pestañas de Dubcards: la de siempre (Netflix y otras casas), los formatos Paramount (PRO-56) y Pixelogic (PRO-58) y el Contract Inventory, que ya no es una sección aparte (PRO-57). */
const DC_MODOS = [['general', 'Netflix y otras casas'], ['paramount', 'Formato Paramount'], ['pixelogic', 'Formato Pixelogic'], ['contratos', 'Contract Inventory']];
function dcModos(){
  const b = (k, t) => '<button class="cs-pest' + (ST.dc.modo === k ? ' on' : '') + '" data-dct="dcModo" data-v="' + k + '">' + E(t) + '</button>';
  return '<div class="cs-pests dct-modos">' + DC_MODOS.map(m => b(m[0], m[1])).join('') + '</div>';
}

const dcModoClic = el => () => { const v = el.getAttribute('data-v'); ST.dc.modo = DC_MODOS.some(m => m[0] === v) ? v : 'general'; repintar(); };

function dcHtml(){
  if(ST.dc.modo === 'paramount'){ if(!ST.pm.cfg) ST.pm.cfg = pmCfgCargar(); return dcModos() + pmHtml(); }
  if(ST.dc.modo === 'pixelogic'){ if(!ST.px.cfg) ST.px.cfg = pxCfgCargar(); return dcModos() + pxHtml(); }
  if(ST.dc.modo === 'contratos') return dcModos() + ciHtml();
  const S = ST.dc, isNetflix = !S.client || S.client.kind === 'netflix';
  const cli = S.client || lastClient() || { kind: 'netflix', name: 'Netflix' };
  return dcModos() + '<div class="dct">'
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
  if(S.modo === 'paramount'){ pmCablear(raiz); return; }
  if(S.modo === 'pixelogic'){ pxCablear(raiz); return; }
  if(S.modo === 'contratos'){ ciCablear(raiz); return; }
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
    else if(que === 'dcModo') el.onclick = dcModoClic(el);
  });
  if(input) input.onchange = () => { dcAnadir(input.files); input.value = ''; };
}

/* ── Contract Inventory · PRO-55 ─────────────────────────────────────────────
 *
 * Pedido de sala: «replica el formato de Contract Inventory con los capítulos
 * 213 a 222; lo único que cambia es el main cast, el additional cast y la
 * numeración del series title». Después: «que lo pueda hacer dentro de
 * Dubbipt», «que se haga por separado, que uno suba la DUBCARD unida» y «que
 * se pueda poner el espacio del traductor».
 *
 * Es una pestaña de Dubcards (PRO-57; antes, una sección aparte). Se sube la
 * DUBCARD unida (el Excel de la pestaña «Netflix y otras casas»: una hoja por
 * episodio con Principales y Adicionales) y sale un
 * Word por episodio sobre la plantilla (dctools/contract-inventory.docx o la
 * que se suba): el número de «[S2 – Episode [Eps#12]», las dos tablas de
 * reparto y, si se escriben, el contacto, el traductor, el adaptador y el
 * director. Todo lo demás de la plantilla queda tal cual. Las reglas del
 * reparto son las que se acordaron con sala:
 *   · Main cast: los personajes que se marquen (por defecto, los que salen en
 *     la mitad o más de los episodios). Lo demás, a Additional cast, por
 *     orden alfabético de apellido.
 *   · No entran las filas que no son un actor (Edicion, X, Todos, Original…)
 *     ni los personajes sin talento.
 *   · Un actor con varios personajes, en una sola fila: «Norm / Padre». Si uno
 *     es del main cast, la fila va en el main cast.
 *   · Sin la inicial del segundo nombre: «Juan D Perez» es Juan / Perez.
 */
const CI_TPL_URL = './dctools/contract-inventory.docx';
const CI_TPL_NOMBRE = 'Contract Inventory (Deluxe)';
const CI_TPL_KEY = 'dc_ci_tpl_v1';
const CI_MAIN_KEY = 'dc_ci_main_v1';
const CI_EQUIPO_KEY = 'dc_ci_equipo_v1';
/* Los datos del equipo que se pueden cambiar: en qué tabla y fila de la plantilla van. */
const CI_EQUIPO = [
  { k: 'contacto',  t: 'Contacto del estudio', tabla: /Email Address/i, fila: null, celdas: [0] },
  { k: 'correo',    t: 'Correo del contacto',  tabla: /Email Address/i, fila: null, celdas: [1] },
  { k: 'traductor', t: 'Traductor',            tabla: /Dubbing Director/i, fila: /^\s*Translator/i, celdas: [1, 2, 3] },
  { k: 'adaptador', t: 'Adaptador',            tabla: /Dubbing Director/i, fila: /^\s*Adaptor/i, celdas: [1, 2, 3] },
  { k: 'director',  t: 'Director de doblaje',  tabla: /Dubbing Director/i, fila: /^\s*Dubbing Director/i, celdas: [1, 2, 3] }
];
ST.ci = { archivo: '', eps: [], leyendo: false, err: '', main: null, temporada: '', tpl: null, xml: '', equipo: null, busy: false, todos: false };

const ciLeerLocal = k => { try{ return JSON.parse(localStorage.getItem(k) || 'null'); }catch(e){ return null; } };
const ciGuardarLocal = (k, v) => { try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){ /* sin almacén: se usa igual, solo que no se recuerda */ } };

/** «Tc» es una sigla: un nombre de una sola palabra sin vocales va en mayúsculas (TC, DJ). */
const ciPersonaje = n => /^[^\saeiouáéíóúü]+$/i.test(n) ? n.toUpperCase() : n;
/** El mismo personaje escrito dos veces por el mismo actor: igual, con las letras cambiadas de sitio (Sahwn) o casi igual. */
const ciMismoPersonaje = (a, b) => { const x = dcNorm(a), y = dcNorm(b); return x === y || x.split('').sort().join('') === y.split('').sort().join('') || simN(a, b) >= 85; };

/** Nombre y apellido de un talento, sin iniciales sueltas. «Yina De Los Rios» → Yina / De Los Rios; «Maria Clara Mojica» → Maria Clara / Mojica. */
function ciNombre(talento){
  const t = safe(talento).replace(/\./g, ' ').split(/\s+/).filter(x => x.length > 1);
  if(t.length < 2) return { nombre: t[0] || '', apellido: '' };
  const p = t.findIndex((x, i) => i > 0 && /^(de|del|la|las|los|da|das|do|dos|van|von|y)$/i.test(x));
  const corte = p > 0 ? p : t.length - 1;
  return { nombre: t.slice(0, corte).join(' '), apellido: t.slice(corte).join(' ') };
}

/**
 * La DUBCARD unida, leída: una entrada por hoja de episodio, como las deja
 * dcParseFile ({ cap, data }). El capítulo sale del título de la hoja
 * («📽️ THE WAYANS BROS 213») y cada fila con tipo Principal o Adicional es un
 * personaje. Las hojas de Producción, Matriz y Alertas no tienen ninguna y se saltan.
 */
function ciLeerDubcard(wb){
  const eps = [];
  wb.SheetNames.forEach(nombre => {
    const filas = XLSX.utils.sheet_to_json(wb.Sheets[nombre], { header: 1, defval: '' }) || [];
    let cap = '';
    const data = [];
    filas.forEach(f => {
      const a = safe(f[0]).trim();
      if(!cap && /^\P{L}*\u{1F4FD}/u.test(a)) cap = a.replace(/^[^\p{L}\p{N}]+/u, '').trim();
      const tipo = safe(f[3]).trim(), personaje = safe(f[1]).trim();
      if(!personaje || (tipo !== 'Principal' && tipo !== 'Adicional')) return;
      let talento = safe(f[2]).trim();
      if(/^sin asignar$/i.test(talento)) talento = '';
      const pseudo = !!talento && dcIsPseudo(talento);
      data.push({ personaje, talento, talentoKey: pseudo || !talento ? '' : dcNorm(talento), pseudo, tipo });
    });
    if(data.length) eps.push({ cap: cap || nombre, data });
  });
  return eps.sort((a, b) => dcEpNum(a.cap) - dcEpNum(b.cap));
}

/** Los personajes que pueden ir al main cast: principales con un actor de verdad, con en cuántos episodios salen. */
function ciCandidatos(eps){
  const m = new Map();
  eps.forEach(en => {
    const vistos = new Set();
    en.data.forEach((r, i) => {
      if(r.tipo !== 'Principal' || !r.talento || r.pseudo) return;
      const k = dcNorm(r.personaje);
      if(vistos.has(k)) return; vistos.add(k);
      if(!m.has(k)) m.set(k, { k, nombre: ciPersonaje(r.personaje), n: 0, pos: 0 });
      const c = m.get(k); c.n++; c.pos += i / Math.max(1, en.data.length);
    });
  });
  /* Los que salen en más episodios primero; a igualdad, los que van antes en la hoja. */
  return [...m.values()].sort((a, b) => b.n - a.n || a.pos / a.n - b.pos / b.n || a.nombre.localeCompare(b.nombre));
}

/** El main cast marcado; si no se ha tocado, el que se usó la última vez con este programa o, si no, los que salen en la mitad o más de los episodios. */
function ciMain(eps){
  const S = ST.ci, cands = ciCandidatos(eps);
  if(Array.isArray(S.main)) return S.main.filter(k => cands.some(c => c.k === k));
  const guardado = (ciLeerLocal(CI_MAIN_KEY) || {})[dcPrograma(eps)];
  if(Array.isArray(guardado)) return cands.filter(c => guardado.includes(c.k)).map(c => c.k);
  return cands.filter(c => eps.length < 2 || c.n * 2 >= eps.length).map(c => c.k);
}

/** Temporada y episodio del series title: 213 es la temporada 2, episodio 13. Con números de una o dos cifras, la temporada la dice quien la escribe. */
function ciNumero(cap, temporada){
  const num = parseInt(dcFmtEp(cap), 10) || 0;
  const t = parseInt(temporada, 10);
  if(num >= 100) return { temporada: t > 0 ? t : Math.floor(num / 100), ep: num % 100 };
  return { temporada: t > 0 ? t : 1, ep: num };
}

/** El reparto de un episodio, ya como va en el Word: { main, adicional, fuera }. */
function ciReparto(en, mainKeys){
  const orden = k => { const i = mainKeys.indexOf(k); return i < 0 ? Infinity : i; };
  const actores = new Map(), fuera = [];
  en.data.forEach(r => {
    if(!r.talento){ fuera.push(r.personaje); return; }
    if(r.pseudo) return;
    const k = r.talentoKey || dcNorm(r.talento);
    if(!actores.has(k)) actores.set(k, { talento: r.talento, pers: [], main: Infinity });
    const a = actores.get(k), pk = dcNorm(r.personaje);
    const esMain = r.tipo === 'Principal' && mainKeys.includes(pk);
    const p = { nombre: ciPersonaje(r.personaje), main: esMain, orden: orden(pk) };
    if(esMain) a.main = Math.min(a.main, p.orden);
    const igual = a.pers.findIndex(x => ciMismoPersonaje(x.nombre, p.nombre));
    if(igual < 0) a.pers.push(p);
    else if(esMain && !a.pers[igual].main) a.pers[igual] = p;
  });
  const fila = a => { const n = ciNombre(a.talento); return { nombre: n.nombre, apellido: n.apellido,
    personajes: a.pers.slice().sort((x, y) => (y.main - x.main) || (x.orden - y.orden)).map(x => x.nombre).join(' / ') }; };
  const todos = [...actores.values()];
  const main = todos.filter(a => a.main < Infinity).sort((a, b) => a.main - b.main).map(fila);
  const adicional = todos.filter(a => a.main === Infinity).map(fila)
    .sort((a, b) => dcNorm(a.apellido).localeCompare(dcNorm(b.apellido)) || dcNorm(a.nombre).localeCompare(dcNorm(b.nombre)));
  return { main, adicional, fuera };
}

/* El Word, por texto: así no hace falta un DOM y la prueba ve lo mismo que el navegador. */
const ciEsc = s => safe(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const ciTexto = x => (x.match(/<w:t(?:\s[^>]*)?>[^<]*<\/w:t>/g) || []).map(t => t.replace(/<[^>]+>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')).join('');
const ciCeldas = tr => tr.match(/<w:tc[\s>][\s\S]*?<\/w:tc>/g) || [];
const ciFilas = tbl => tbl.match(/<w:tr[\s>][\s\S]*?<\/w:tr>/g) || [];
const ciTablas = xml => xml.match(/<w:tbl[\s>][\s\S]*?<\/w:tbl>/g) || [];
const ciRPr = tc => (tc.match(/<w:r(?:\s[^>]*)?>\s*(<w:rPr>[\s\S]*?<\/w:rPr>)/) || [])[1] || '';

/** Una celda con otro texto: conserva su formato y el del texto modelo. */
function ciCelda(tc, texto, rPr){
  const run = texto ? '<w:r>' + rPr + '<w:t xml:space="preserve">' + ciEsc(texto) + '</w:t></w:r>' : '';
  let hecho = false;
  const out = tc.replace(/<w:p(?:\s[^>]*?)?(?<!\/)>[\s\S]*?<\/w:p>|<w:p(?:\s[^>]*?)?\/>/g, p => {
    if(hecho) return '';
    hecho = true;
    if(/\/>$/.test(p) && !/<\/w:p>$/.test(p)) return p.replace(/\/>$/, '>') + run + '</w:p>';
    return p.replace(/<w:r[\s>][\s\S]*?<\/w:r>|<w:r\/>|<w:proofErr[^>]*\/>/g, '').replace(/<\/w:p>$/, run + '</w:p>');
  });
  return hecho ? out : out.replace(/<\/w:tc>$/, '<w:p>' + run + '</w:p></w:tc>');
}

/** Una fila con otros textos en las celdas que se digan (las demás, tal cual). Cada celda conserva su propio formato. */
function ciFila(tr, valores, rPrs){
  let c = 0;
  return tr.replace(/<w:tc[\s>][\s\S]*?<\/w:tc>/g, tc => {
    const i = c++;
    if(!(i in valores)) return tc;
    return ciCelda(tc, valores[i] || '', (rPrs && rPrs[i]) || ciRPr(tc));
  });
}

/** Una tabla de reparto rellena: debajo de la fila «First Name», una fila por actor; si no caben, se añaden. */
function ciTabla(tbl, filas){
  const trs = ciFilas(tbl);
  const iCab = trs.findIndex(tr => /First Name/i.test(ciTexto(tr)));
  const datos = trs.slice(iCab + 1);
  if(iCab < 0 || !datos.length) throw new Error('La plantilla no tiene la tabla de reparto como se espera');
  const rPr = ciCeldas(datos[0]).map(ciRPr);
  rPr.forEach((x, i) => { if(!x) rPr[i] = rPr[0] || ''; });
  while(datos.length < filas.length) datos.push(datos[datos.length - 1]);
  const nuevas = datos.map((tr, i) => {
    const f = filas[i];
    return ciFila(tr, f ? [f.nombre, f.apellido, '', '', f.personajes, ''] : ['', '', '', '', '', ''], rPr);
  });
  const ini = tbl.indexOf(datos[0]), fin = tbl.lastIndexOf('</w:tr>') + '</w:tr>'.length;
  return tbl.slice(0, ini) + nuevas.join('') + tbl.slice(fin);
}

/** Dónde va un dato del equipo: la tabla y la fila de la plantilla. La del contacto es la fila de debajo de «Email Address». */
function ciDondeEquipo(xml, campo){
  const tbl = ciTablas(xml).find(t => campo.tabla.test(ciTexto(t)));
  if(!tbl) return null;
  const trs = ciFilas(tbl);
  const i = campo.fila ? trs.findIndex(tr => campo.fila.test(ciTexto(ciCeldas(tr)[0] || ''))) : trs.findIndex(tr => /Email Address/i.test(ciTexto(tr))) + 1;
  return i > 0 && trs[i] ? { tbl, tr: trs[i] } : null;
}

/** Lo que la plantilla trae escrito en el contacto, el traductor, el adaptador y el director. */
function ciEquipoDe(xml){
  const out = {};
  CI_EQUIPO.forEach(c => { const d = ciDondeEquipo(xml, c); out[c.k] = d ? ciTexto(ciCeldas(d.tr)[c.celdas[0]] || '').trim() : ''; });
  return out;
}

/** El document.xml de la plantilla, con la numeración, el reparto de un episodio y, si se da, el equipo. */
function ciLlenarXml(xml, reparto, temporada, ep, equipo){
  let titulo = false;
  xml = xml.replace(/(<w:t(?:\s[^>]*)?>)([^<]*Eps#\s*\d+[^<]*)(<\/w:t>)/, (m, a, t, b) => {
    titulo = true;
    return a + t.replace(/S\d+/, 'S' + temporada).replace(/Eps#\s*\d+/, 'Eps#' + ep) + b;
  });
  if(!titulo) throw new Error('La plantilla no tiene el «Eps#» del series title');
  if(equipo) CI_EQUIPO.forEach(c => {
    if(equipo[c.k] == null) return;
    const d = ciDondeEquipo(xml, c);
    if(!d) return;
    const v = {}; c.celdas.forEach(i => { v[i] = safe(equipo[c.k]).trim(); });
    const nuevaFila = ciFila(d.tr, v), nuevaTbl = d.tbl.replace(d.tr, () => nuevaFila);
    xml = xml.replace(d.tbl, () => nuevaTbl);
  });
  const reparto2 = ciTablas(xml).filter(t => /First Name/i.test(ciTexto(t)) && /Character/i.test(ciTexto(t)));
  if(reparto2.length < 2) throw new Error('La plantilla no tiene las tablas de Main cast y Additional cast');
  const main = ciTabla(reparto2[0], reparto.main), adic = ciTabla(reparto2[1], reparto.adicional);
  xml = xml.replace(reparto2[0], () => main);
  return xml.replace(reparto2[1], () => adic);
}

/** Los bytes de la plantilla: la que se subió o la incluida. */
async function ciPlantilla(){
  const S = ST.ci;
  if(!S.tpl){ const g = ciLeerLocal(CI_TPL_KEY); if(g && g.b64) S.tpl = { nombre: g.nombre, bytes: Uint8Array.from(atob(g.b64), c => c.charCodeAt(0)) }; }
  if(S.tpl) return S.tpl.bytes;
  const res = await fetch(CI_TPL_URL);
  if(!res.ok) throw new Error('No se pudo cargar la plantilla (' + res.status + ')');
  return new Uint8Array(await res.arrayBuffer());
}

/** El document.xml de la plantilla en uso, leído una vez. */
async function ciXml(){
  const S = ST.ci;
  if(S.xml) return S.xml;
  const f = fflate.unzipSync(await ciPlantilla())['word/document.xml'];
  if(!f) throw new Error('La plantilla no es un Word (.docx)');
  S.xml = new TextDecoder().decode(f);
  return S.xml;
}

/** El equipo de este programa: lo que se escribió la última vez, o lo que trae la plantilla. */
function ciEquipo(){
  const S = ST.ci;
  if(S.equipo) return S.equipo;
  const g = (ciLeerLocal(CI_EQUIPO_KEY) || {})[S.eps.length ? dcPrograma(S.eps) : ''];
  const base = S.xml ? ciEquipoDe(S.xml) : {};
  S.equipo = Object.assign({}, base, g || {});
  return S.equipo;
}

/** Un Word por episodio: [{ nombre, n, bytes }]. */
async function ciDocumentos(){
  const S = ST.ci, eps = S.eps, mainKeys = ciMain(eps);
  const tpl = fflate.unzipSync(await ciPlantilla());
  const xml = await ciXml(), equipo = ciEquipo();
  const prog = dcPrograma(eps).replace(/\s+/g, '_');
  return eps.map(en => {
    const n = ciNumero(en.cap, S.temporada);
    const files = Object.assign({}, tpl, { 'word/document.xml': fflate.strToU8(ciLlenarXml(xml, ciReparto(en, mainKeys), n.temporada, n.ep, equipo)) });
    return { nombre: ('Contract_Inventory_' + prog + '_S' + n.temporada + '_Eps' + n.ep).replace(/[\\/:*?"<>|]+/g, '') + '.docx', n, bytes: fflate.zipSync(files) };
  });
}

/** Sube la DUBCARD unida y la lee. */
async function ciCargarDubcard(file){
  const S = ST.ci;
  if(!file) return;
  if(!/\.(xlsx|xlsm|xls)$/i.test(file.name)){ aviso('Sube la DUBCARD en Excel (.xlsx)'); return; }
  S.leyendo = true; S.err = ''; repintar();
  try{
    const wb = XLSX.read(new Uint8Array(await readFileBuffer(file)), { type: 'array' });
    const eps = ciLeerDubcard(wb);
    if(!eps.length) throw new Error('no tiene hojas de episodio con Principales y Adicionales. ¿Es la DUBCARD de la pestaña «Netflix y otras casas»?');
    Object.assign(S, { archivo: file.name, eps, main: null, temporada: '', equipo: null, todos: false });
    try{ await ciXml(); }catch(e){ S.err = e.message; }
  }catch(e){ S.err = 'No se pudo leer «' + file.name + '»: ' + e.message; }
  finally{ S.leyendo = false; repintar(); }
}

const CI_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
/** Descarga los Word: uno suelto, o todos en un .zip. Se recuerdan el main cast y el equipo de este programa. */
async function ciDescargar(){
  const C = ST.ci;
  if(!C.eps.length){ aviso('Primero sube la DUBCARD'); return; }
  if(C.busy) return;
  C.busy = true; repintar();
  try{
    const docs = await ciDocumentos(), prog = dcPrograma(C.eps);
    const g = ciLeerLocal(CI_MAIN_KEY) || {}; g[prog] = ciMain(C.eps); ciGuardarLocal(CI_MAIN_KEY, g);
    const e = ciLeerLocal(CI_EQUIPO_KEY) || {}; e[prog] = ciEquipo(); ciGuardarLocal(CI_EQUIPO_KEY, e);
    if(docs.length === 1){ bdDownload(new Blob([docs[0].bytes], { type: CI_DOCX }), docs[0].nombre); aviso('⬇ ' + docs[0].nombre); return; }
    const zip = {}; docs.forEach(d => { zip[d.nombre] = d.bytes; });
    const eps = docs.map(d => d.n.ep);
    const nombre = ('Contract_Inventory_' + prog.replace(/\s+/g, '_') + '_S' + docs[0].n.temporada + '_Eps' + eps[0] + '-' + eps[eps.length - 1]).replace(/[\\/:*?"<>|]+/g, '') + '.zip';
    bdDownload(new Blob([fflate.zipSync(zip, { level: 0 })], { type: 'application/zip' }), nombre);
    aviso('⬇ ' + nombre + ' (' + docs.length + ' Word)');
  }catch(e){ aviso('No se pudo armar el Contract Inventory: ' + e.message); }
  finally{ C.busy = false; repintar(); }
}

/** Subir otra plantilla: tiene que ser .docx y tener el series title y las dos tablas. */
async function ciSubirPlantilla(file){
  const C = ST.ci;
  if(!file) return;
  if(!/\.docx$/i.test(file.name)){ aviso(/\.doc$/i.test(file.name) ? 'Ábrela en Word y guárdala como .docx (el .doc antiguo no se puede leer aquí)' : 'La plantilla tiene que ser un Word .docx'); return; }
  try{
    const bytes = new Uint8Array(await readFileBuffer(file));
    const f = fflate.unzipSync(bytes)['word/document.xml'];
    if(!f) throw new Error('no es un Word (.docx)');
    const xml = new TextDecoder().decode(f);
    ciLlenarXml(xml, { main: [], adicional: [] }, 1, 1);
    C.tpl = { nombre: file.name, bytes }; C.xml = xml; C.equipo = null;
    let b = ''; for(let i = 0; i < bytes.length; i += 0x8000) b += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    ciGuardarLocal(CI_TPL_KEY, { nombre: file.name, b64: btoa(b) });
    aviso('Plantilla: ' + file.name);
  }catch(e){ aviso('Esa plantilla no sirve: ' + e.message); }
  repintar();
}

function ciHtml(){
  const C = ST.ci, eps = C.eps;
  const subir = '<div class="dct-drop' + (eps.length ? ' dct-drop-ok' : '') + '" data-dct="ciElegir">' + ico('subir', 22)
    + '<b>' + (C.leyendo ? 'Leyendo…' : eps.length ? E(C.archivo) + ' · ' + eps.length + ' episodios' : 'Haz clic o arrastra la DUBCARD unida') + '</b>'
    + '<span>' + (eps.length ? 'Pulsa para cambiarla' : 'El Excel de la pestaña «Netflix y otras casas» (DUBCARD_PROGRAMA_213-214-….xlsx), con una hoja por episodio') + '</span>'
    + '<input type="file" id="dctCiDub" accept=".xlsx,.xlsm,.xls" hidden></div>';
  const err = C.err ? '<div class="dct-mal">' + E(C.err) + '</div>' : '';
  if(!eps.length) return '<div class="dct">' + subir + err + '</div>';
  const cands = ciCandidatos(eps), mainKeys = ciMain(eps);
  /* Con varios episodios, los de un solo episodio no suelen ser fijos: se esconden salvo que se pidan. */
  const vis = cands.filter(c => C.todos || eps.length < 2 || c.n > 1 || mainKeys.includes(c.k));
  const n0 = ciNumero(eps[0].cap, C.temporada);
  const tpl = C.tpl || ciLeerLocal(CI_TPL_KEY), equipo = ciEquipo();
  const filas = rows => rows.length ? '<div class="dct-tabla-w"><table class="dct-tabla"><thead><tr><th>First Name</th><th>Last Name</th><th>Character(s)</th></tr></thead><tbody>'
    + rows.map(r => '<tr style="background:#e5e7eb"><td>' + E(r.nombre) + '</td><td>' + E(r.apellido) + '</td><td>' + E(r.personajes) + '</td></tr>').join('') + '</tbody></table></div>' : '<div class="dct-tenue">Nadie</div>';
  return '<div class="dct">' + subir + err
    + '<div class="dct-caja dct-ci">'
    + '<div class="dct-fila dct-cab2">'
    +   '<label>Temporada<input type="number" min="1" data-dct="ciTemp" value="' + E(C.temporada || n0.temporada) + '" style="width:80px"></label>'
    +   '<div class="dct-crece dct-tenue">Plantilla: <b>' + E(tpl ? tpl.nombre : CI_TPL_NOMBRE) + '</b></div>'
    +   '<button class="cs-b" data-dct="ciTplElegir">' + ico('subir', 13) + '<span>Usar otra plantilla (.docx)</span></button>'
    +   (tpl ? '<button class="cs-b" data-dct="ciTplQuitar">' + ico('cerrar', 13) + '<span>Volver a la incluida</span></button>' : '')
    +   '<input type="file" id="dctCiTpl" accept=".docx" hidden></div>'
    + '<div class="dct-sub">Equipo: va igual en todos los episodios (se recuerda por programa)</div>'
    + '<div class="dct-fila dct-ci-equipo">' + CI_EQUIPO.map(c => '<label class="dct-crece">' + E(c.t) + '<input type="text" data-dct="ciEquipo" data-k="' + c.k + '" value="' + E(equipo[c.k] || '') + '"></label>').join('') + '</div>'
    + '<div class="dct-sub">Main cast: marca los personajes fijos (los demás van a Additional cast)</div>'
    + '<div class="dct-ci-main">' + vis.map(c => '<label class="dct-check"><input type="checkbox" data-dct="ciMain" data-k="' + E(c.k) + '"' + (mainKeys.includes(c.k) ? ' checked' : '') + '> '
        + E(c.nombre) + ' <i>' + c.n + '/' + eps.length + '</i></label>').join('')
    +   (vis.length < cands.length || C.todos ? '<button class="cs-b" data-dct="ciTodos">' + E(C.todos ? 'Solo los que se repiten' : 'Ver todos (' + cands.length + ')') + '</button>' : '') + '</div>'
    + eps.map(en => {
        const n = ciNumero(en.cap, C.temporada), r = ciReparto(en, mainKeys);
        return '<details class="dct-ci-ep"><summary>' + E(en.cap) + ' · S' + n.temporada + ' – Episode ' + n.ep + ' · ' + r.main.length + ' main · ' + r.adicional.length + ' additional'
          + (r.fuera.length ? ' · <span class="dct-mal">' + r.fuera.length + ' sin talento</span>' : '') + '</summary>'
          + '<div class="dct-sub">Main cast</div>' + filas(r.main)
          + '<div class="dct-sub">Additional cast</div>' + filas(r.adicional)
          + (r.fuera.length ? '<div class="dct-mal">Sin talento, no entran: ' + E(r.fuera.join(', ')) + '</div>' : '')
          + '</details>';
      }).join('')
    + '<button class="cs-b cs-pri dct-ancho" data-dct="ciBajar"' + (C.busy ? ' disabled' : '') + '>' + (C.busy ? 'Armando…' : ico('bajar', 14) + '<span>Descargar Contract Inventory (' + eps.length + ' Word)</span>') + '</button>'
    + '</div></div>';
}

function ciCablear(raiz){
  const C = ST.ci, q = s => raiz.querySelector(s);
  const dub = q('#dctCiDub'), tpl = q('#dctCiTpl');
  raiz.querySelectorAll('[data-dct]').forEach(el => {
    const que = el.getAttribute('data-dct');
    if(que === 'ciElegir'){
      el.onclick = (ev) => { if(ev.target !== dub && dub) dub.click(); };
      el.ondragover = (ev) => { ev.preventDefault(); };
      el.ondrop = (ev) => { ev.preventDefault(); ciCargarDubcard(ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]); };
    }
    else if(que === 'dcModo') el.onclick = dcModoClic(el);
    else if(que === 'ciTemp') el.onchange = () => { C.temporada = String(el.value || '').trim(); repintar(); };
    /* Al escribir no se repinta (se perdería el foco); solo se apunta. */
    else if(que === 'ciEquipo') el.oninput = () => { ciEquipo()[el.getAttribute('data-k')] = el.value; };
    else if(que === 'ciMain') el.onchange = () => {
      const k = el.getAttribute('data-k'), cands = ciCandidatos(C.eps).map(c => c.k);
      const sel = new Set(ciMain(C.eps));
      if(el.checked) sel.add(k); else sel.delete(k);
      C.main = cands.filter(x => sel.has(x));
      repintar();
    };
    else if(que === 'ciTodos') el.onclick = () => { C.todos = !C.todos; repintar(); };
    else if(que === 'ciTplElegir') el.onclick = () => { if(tpl) tpl.click(); };
    else if(que === 'ciTplQuitar') el.onclick = () => {
      C.tpl = null; C.xml = ''; C.equipo = null;
      try{ localStorage.removeItem(CI_TPL_KEY); }catch(e){ /* sin almacén */ }
      ciXml().catch(e => { C.err = e.message; }).then(repintar);
    };
    else if(que === 'ciBajar') el.onclick = () => { ciDescargar(); };
  });
  if(dub) dub.onchange = () => { const f = dub.files && dub.files[0]; dub.value = ''; ciCargarDubcard(f); };
  if(tpl) tpl.onchange = () => { const f = tpl.files && tpl.files[0]; tpl.value = ''; ciSubirPlantilla(f); };
}

/* ── DUBCARD en formato Paramount (PRO-56) ─────────────────────────────────
   Pedido de sala, con el DUBCARD entregado de «Big John's Bosh Family» 101 y
   el desglose de ese episodio: «en la sección de DUBCARD, otra sección que sea
   DUBCARD formato Paramount; se tiene que entregar así, partiendo de los
   archivos del presupuesto». Se suben los desgloses (.xlsm, con su hoja
   CASTING) y sale, por episodio, la plantilla de Paramount: título de la
   serie, idioma, número y título del episodio, créditos técnicos y el reparto
   -el personaje en CHARACTER si es un nombre propio, en TRANSLATION si es un
   papel traducido («Doctora», «Hombre bingo 1»)-, en orden alfabético. Lo que
   no es un talento (ORIGINAL, TODOS, X…) no entra. Todo se puede corregir
   antes de descargar, y los créditos y la serie se recuerdan en este equipo. */

const PM_KEY = 'dc_paramount_v1';
const PM_CREDITOS = [['supervisor', 'Creative Supervisor'], ['estudio', 'Dubbing Studio'], ['colaboracion', 'In Collaboration with'],
  ['director', 'Dubbing Director'], ['estudioMezcla', 'Mixing Studio'], ['mezcla', 'Mixer'], ['ingeniero', 'Sound Engineer'], ['editor', 'Editor'], ['adaptador', 'Adaptor']];
const PM_CFG_BASE = { serie: '', serieTrad: '', idioma: 'Versión en español latinoamericano',
  creditos: { supervisor: 'Henry Perez', estudio: 'Centauro Comunicacions', colaboracion: '', director: '', estudioMezcla: '', mezcla: 'Edwin Rodriguez', ingeniero: '', editor: '', adaptador: '' } };
function pmCfgCargar(){
  let g = null;
  try{ g = JSON.parse(localStorage.getItem(PM_KEY) || 'null'); }catch(e){ g = null; }
  const c = Object.assign({}, PM_CFG_BASE, g || {});
  c.creditos = Object.assign({}, PM_CFG_BASE.creditos, (g && g.creditos) || {});
  return c;
}
function pmCfgGuardar(c){ try{ localStorage.setItem(PM_KEY, JSON.stringify(c)); }catch(e){ /* sin almacén: vale para esta vez */ } }

/* Palabras de un papel en español («Hombre de barba», «Doctora»): esos van en TRANSLATION. */
const PM_ES = new Set(('DE DEL LA LAS LOS EL Y CON EN SIN POR PARA AL UN UNA UNO '
  + 'HOMBRE HOMBRES MUJER MUJERES NINO NINA NINOS NINAS CHICO CHICA CHICOS CHICAS SENOR SENORA SENORITA VOZ VOCES GRUPO '
  + 'COMENTARISTA DOCTOR DOCTORA ENTREVISTADOR ENTREVISTADORA PRESENTADOR PRESENTADORA TAXISTA GRAFICA GRAFICAS GORDA GORDO '
  + 'POLICIA MESERO MESERA CAMARERO CAMARERA ENFERMERO ENFERMERA NARRADOR NARRADORA REPORTERO REPORTERA PERIODISTA LOCUTOR LOCUTORA '
  + 'CONDUCTOR CONDUCTORA VENDEDOR VENDEDORA CLIENTE CLIENTA GUARDIA SOLDADO JUEZ JUEZA ARBITRO MEDICO MEDICA PROFESOR PROFESORA '
  + 'MAESTRO MAESTRA ESTUDIANTE ALUMNO ALUMNA ANCIANO ANCIANA JOVEN BEBE MAMA PAPA MADRE PADRE ABUELO ABUELA TIO TIA HERMANO HERMANA '
  + 'AMIGO AMIGA VECINO VECINA CHOFER PILOTO OPERADOR OPERADORA RECEPCIONISTA SECRETARIA SECRETARIO JEFE JEFA GERENTE EMPLEADO EMPLEADA '
  + 'TRABAJADOR TRABAJADORA PUBLICO MULTITUD AMBIENTE INSERTO TEXTO LETRERO CARTEL ROTULO ANUNCIO ESPOSA ESPOSO NOVIA NOVIO HIJO HIJA '
  + 'CAJERO CAJERA CANTANTE BAILARIN BAILARINA AFICIONADO AFICIONADA PERSONA GENTE ESPECTADOR ESPECTADORA ENTRENADOR ENTRENADORA '
  + 'LUCHADOR LUCHADORA BOXEADOR ANFITRION ANFITRIONA INVITADO INVITADA').split(' '));
const pmSinTildes = s => String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '');
/** ¿El nombre del personaje es un papel traducido (va en TRANSLATION) y no un nombre propio (CHARACTER)? */
function pmEsTraduccion(nombre){
  const t = String(nombre == null ? '' : nombre).trim();
  if(!t) return false;
  if(/\d/.test(t) || /[áéíóúñü]/i.test(t)) return true;
  return pmSinTildes(t).toUpperCase().split(/[^A-Z]+/).filter(Boolean).some(w => PM_ES.has(w));
}
/** «BIG JOHN» → «Big John»; «JOHN'S» → «John's». */
const pmPropio = s => String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase().replace(/(^|[\s\-.])(\p{L})/gu, (m, p, c) => p + c.toUpperCase());
/** «COMENTARISTA DE LA PELEA» → «Comentarista de la pelea». */
const pmFrase = s => { const t = String(s == null ? '' : s).replace(/\s+/g, ' ').trim().toLowerCase(); return t.charAt(0).toUpperCase() + t.slice(1); };
/** Un título en inglés: «MEET THE FISHERS» → «Meet the Fishers». */
const PM_MENUDAS = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'of', 'in', 'on', 'at', 'to', 'for', 'by', 'with', 'from', 'vs']);
const pmTituloIngles = s => pmPropio(s).split(' ').map((w, i) => (i && PM_MENUDAS.has(w.toLowerCase())) ? w.toLowerCase() : w).join(' ');

/**
 * Lo que el DUBCARD necesita de un desglose, de sus filas (como las da
 * SheetJS con header:1): el título, el director, el técnico y el reparto de
 * la hoja CASTING. `desglose` (la hoja DESGLOCE) solo por si CASTING no trae título.
 */
function pmDatosDeHojas(casting, desglose){
  const filas = Array.isArray(casting) ? casting : [];
  const txt = v => String(v == null ? '' : v).replace(/\s+/g, ' ').trim();
  const tras = (fila, i) => { for(let j = i + 1; j < fila.length; j++) if(txt(fila[j])) return txt(fila[j]); return ''; };
  let titulo = '', director = '', tecnico = '', cab = -1, colP = 0, colT = 3, colL = -1;
  for(let r = 0; r < Math.min(filas.length, 20) && cab < 0; r++){
    const f = filas[r] || [];
    for(let i = 0; i < f.length; i++){
      const v = pmSinTildes(txt(f[i])).toUpperCase();
      if(!v) continue;
      if(/^DIRECTOR\b/.test(v) && !director) director = tras(f, i);
      else if(/^TECNICO\b/.test(v) && !tecnico) tecnico = tras(f, i);
      else if(/^TITULO\b/.test(v) && !titulo && !/ESPANOL/.test(v)) titulo = tras(f, i);
      else if(v.indexOf('NOMBRE DEL ACTOR') >= 0){
        cab = r; colT = i; const p = f.findIndex(x => /^(LOCUTOR|PERSONAJE)/i.test(txt(x))); colP = p >= 0 ? p : 0;
        colL = f.findIndex(x => /^(REAL|LINEAS|LOOPS|INTERVENCIONES)$/.test(pmSinTildes(txt(x)).toUpperCase()));
      }
    }
  }
  if(!titulo && Array.isArray(desglose) && desglose[8]) titulo = txt(desglose[8][7]);
  const reparto = [], vistos = new Map();
  for(let r = cab + 1; cab >= 0 && r < filas.length; r++){
    const f = filas[r] || [], p = txt(f[colP]), t = txt(f[colT]), l = colL >= 0 ? (parseInt(f[colL], 10) || 0) : 0;
    if(!p) continue;
    const k = pmSinTildes(p).toUpperCase();
    if(vistos.has(k)){ const x = vistos.get(k); if(!x.talento && t) x.talento = t; x.lineas += l; continue; }
    const x = { personaje: p, talento: t, lineas: l };
    vistos.set(k, x); reparto.push(x);
  }
  return { titulo: titulo, director: director, tecnico: tecnico, reparto: reparto, sinCabecera: cab < 0 };
}

/** De un libro de SheetJS: sus hojas CASTING (la de ese nombre, si hay varias) y DESGLOCE. */
function pmDatosDeLibro(wb){
  const nombres = (wb && wb.SheetNames) || [];
  const cs = nombres.find(n => n.trim().toUpperCase() === 'CASTING') || nombres.find(n => /CASTING/i.test(n));
  const ds = nombres.find(n => /DESGLO/i.test(n));
  if(!cs) return null;
  const filas = n => n ? (XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '' }) || []) : [];
  return pmDatosDeHojas(filas(cs), filas(ds));
}

/**
 * El episodio para el DUBCARD: número y título (del título del desglose,
 * quitando la serie si se conoce), créditos del desglose y el reparto en
 * orden, sin lo que no es un talento.
 */
function pmEpisodio(datos, archivo, serie){
  const tit = String(datos.titulo || '').replace(/\s+/g, ' ').trim();
  const m = tit.match(/(\d{1,4})\s*$/);
  let numero = m ? m[1] : '';
  if(!numero){ const n = extractEpNum(archivo); numero = n != null ? String(n) : ''; }
  let resto = m ? tit.slice(0, m.index).trim() : tit;
  const s = String(serie || '').trim();
  if(s && pmSinTildes(resto).toUpperCase().indexOf(pmSinTildes(s).toUpperCase()) === 0) resto = resto.slice(s.length).trim();
  else if(s) resto = '';
  const filas = [], fuera = [];
  for(const x of datos.reparto){
    if(x.talento && dcIsPseudo(x.talento)){ fuera.push(pmFrase(x.personaje) + ' (' + x.talento.toUpperCase() + ')'); continue; }
    const trad = pmEsTraduccion(x.personaje);
    filas.push({ nombre: trad ? pmFrase(x.personaje) : pmPropio(x.personaje), col: trad ? 'C' : 'B', actor: pmPropio(x.talento) });
  }
  pmOrdenar(filas);
  return { archivo: archivo || '', tituloDesglose: tit, numero: numero, titulo: resto ? pmTituloIngles(resto) : '', tituloTrad: '',
           director: pmPropio(datos.director), tecnico: pmPropio(datos.tecnico), filas: filas, fuera: fuera, serieAdivinada: s ? '' : resto };
}
const pmOrdenar = filas => filas.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { sensitivity: 'base' }));

/* ── El Excel, a mano con fflate: SheetJS sin estilos no da el formato ── */

const pmX = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const PM_ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="5"><font><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><b/><sz val="15"/><name val="Calibri"/><family val="2"/></font>'
  + '<font><b/><sz val="11"/><name val="Calibri"/><family val="2"/></font><font><sz val="12"/><name val="Book Antiqua"/><family val="1"/></font><font><sz val="10"/><name val="Book Antiqua"/><family val="1"/></font></fonts>'
  + '<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFD9D9D9"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color auto="1"/></left><right style="thin"><color auto="1"/></right><top style="thin"><color auto="1"/></top><bottom style="thin"><color auto="1"/></bottom><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="9">'
  +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>'
  +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
  +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment horizontal="left"/></xf>'
  +   '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>'
  +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'
  +   '<xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'
  +   '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'
  +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

/** La hoja de un episodio, en XML: la plantilla de Paramount, celda a celda. */
function pmHojaXml(ep, cfg){
  const filas = [];
  const fila = (n, celdas, alto) => filas.push('<row r="' + n + '"' + (alto ? ' ht="' + alto + '" customHeight="1"' : '') + '>' + celdas.join('') + '</row>');
  const c = (ref, v, s) => {
    if(v === '' || v == null) return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : '') + '/>';
    if(typeof v === 'number') return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : '') + '><v>' + v + '</v></c>';
    return '<c r="' + ref + '"' + (s ? ' s="' + s + '"' : '') + ' t="inlineStr"><is><t xml:space="preserve">' + pmX(v) + '</t></is></c>';
  };
  const cr = cfg.creditos || {};
  const num = /^\d+$/.test(String(ep.numero || '')) ? +ep.numero : (ep.numero || '');
  fila(1, [c('A1', '***PLEASE COPY THIS TEMPLATE AND ADD A NEW TAB FOR EACH EPISODE***', 1)], 45.95);
  fila(2, [c('A2', 'SERIES TITLE:', 2), c('B2', cfg.serie || '', 3)]);
  fila(3, [c('A3', 'TRANSLATED SERIES TITLE (IF APPLICABLE):', 2), c('B3', cfg.serieTrad || '', 3)]);
  fila(4, [c('A4', 'LANGUAGE VERSION (Must be written in localized language)', 2), c('B4', cfg.idioma || '', 3)]);
  fila(5, [c('A5', 'EPISODE NUMBER', 2), c('B5', num, 3)]);
  fila(6, [c('A6', 'EPISODE TITLE', 2), c('B6', ep.titulo || '', 3)]);
  fila(7, [c('A7', 'TRANSLATED EPISODE TITLE ', 2), c('B7', ep.tituloTrad || '', 3)]);
  fila(9, [c('A9', 'Technical Credits (if applicable)', 2)]);
  fila(10, [c('A10', 'TITLE', 4), c('B10', 'TRANSLATIONS FOR TITLES LISTED IN THE "TITLE" COLUMN', 4), c('C10', 'NAME TO APPEAR IN CREDITS ', 4), c('D10', 'NAME IN ROMAN LETTERS (if applicable)', 4)], 32.1);
  PM_CREDITOS.forEach((k, i) => {
    const n = 11 + i;
    const nombre = k[0] === 'director' ? (cr.director || ep.director || '') : k[0] === 'ingeniero' ? (cr.ingeniero || ep.tecnico || '') : (cr[k[0]] || '');
    fila(n, [c('A' + n, k[1], 5), c('B' + n, '', 8), c('C' + n, nombre, 6), c('D' + n, '', 8)], 15.75);
  });
  fila(23, [c('A23', 'Cast information', 2)]);
  fila(24, [c('A24', 'ORIGINAL ACTOR', 4), c('B24', 'CHARACTER', 4), c('C24', 'TRANSLATION', 4), c('D24', 'NAME TO APPEAR IN CREDITS (Local Voice Actor)', 4), c('E24', 'NAME IN ROMAN LETTERS (if applicable)', 4)], 33.75);
  (ep.filas || []).forEach((x, i) => {
    const n = 25 + i;
    fila(n, [c('A' + n, '', 7), c('B' + n, x.col === 'B' ? x.nombre : '', 7), c('C' + n, x.col === 'C' ? x.nombre : '', 7), c('D' + n, x.actor || '', 7), c('E' + n, '', 7)]);
  });
  const ult = 24 + Math.max(1, (ep.filas || []).length);
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<dimension ref="A1:E' + ult + '"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>'
    + '<cols><col min="1" max="1" width="49.375" customWidth="1"/><col min="2" max="2" width="36.375" customWidth="1"/><col min="3" max="3" width="43.875" customWidth="1"/>'
    + '<col min="4" max="4" width="35.5" customWidth="1"/><col min="5" max="5" width="35.875" customWidth="1"/></cols>'
    + '<sheetData>' + filas.join('') + '</sheetData><mergeCells count="1"><mergeCell ref="A1:E1"/></mergeCells>'
    + '<pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/></worksheet>';
}

/** El nombre de una hoja: el número del episodio, sin lo que Excel no admite y sin repetirse. */
function pmNombresHojas(eps){
  const usados = new Set();
  return eps.map((ep, i) => {
    const base = (String(ep.numero || '').replace(/[\\\/?*\[\]:]/g, '').trim() || 'Episodio ' + (i + 1)).slice(0, 28);
    let n = base, k = 2;
    while(usados.has(n.toUpperCase())) n = base + ' (' + k++ + ')';
    usados.add(n.toUpperCase());
    return n;
  });
}

/** Los archivos del .xlsx (ruta → texto): una hoja por episodio. */
function pmArchivosXlsx(eps, cfg){
  const nombres = pmNombresHojas(eps);
  const f = {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + eps.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
      + '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<bookViews><workbookView/></bookViews><sheets>' + nombres.map((n, i) => '<sheet name="' + pmX(n) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + eps.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (eps.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': PM_ESTILOS
  };
  eps.forEach((ep, i) => { f['xl/worksheets/sheet' + (i + 1) + '.xml'] = pmHojaXml(ep, cfg); });
  return f;
}

/** El nombre del archivo, como el de Paramount: «BigJohnsBoshFamily_101_dubcard_es.xlsx». */
function pmNombreArchivo(serie, eps){
  const s = pmSinTildes(serie).replace(/['’`]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join('') || 'Serie';
  const nums = eps.map(e => String(e.numero || '').trim()).filter(Boolean);
  return s + '_' + (nums.length ? nums.join('-') : 'episodio') + '_dubcard_es.xlsx';
}

/** Descarga el DUBCARD de un episodio. Devuelve el nombre del archivo (o null); `callado`, sin aviso. */
function pmDescargar(eps, callado){
  const S = ST.pm;
  if(!eps.length){ aviso('Primero procesa los desgloses'); return null; }
  if(!String(S.cfg.serie || '').trim()){ aviso('Escribe el título de la serie (SERIES TITLE)'); return null; }
  try{
    const f = pmArchivosXlsx(eps, S.cfg), z = {};
    for(const k of Object.keys(f)) z[k] = fflate.strToU8(f[k]);
    const blob = new Blob([fflate.zipSync(z, { level: 6 })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const nombre = pmNombreArchivo(S.cfg.serie, eps);
    bdDownload(blob, nombre);
    if(!callado) aviso('Descargado: ' + nombre);
    return nombre;
  }catch(e){ aviso('No se pudo armar el DUBCARD: ' + e.message); return null; }
}

/**
 * Paramount los quiere por separado: un archivo por capítulo (pedido de sala,
 * «van separados por capítulos, un archivo diferente cada uno»). Se bajan uno
 * tras otro, con una pausa para que el navegador no se salte ninguno; la
 * primera vez puede pedir permiso para descargar varios archivos.
 */
async function pmDescargarVarios(eps){
  const S = ST.pm;
  if(!eps.length){ aviso('Primero procesa los desgloses'); return []; }
  if(!String(S.cfg.serie || '').trim()){ aviso('Escribe el título de la serie (SERIES TITLE)'); return []; }
  const hechos = [];
  for(let i = 0; i < eps.length; i++){
    if(i) await new Promise(r => setTimeout(r, S.pausa == null ? 700 : S.pausa));
    pmOrdenar(eps[i].filas);
    const n = pmDescargar([eps[i]], true);
    if(n) hechos.push(n);
  }
  if(hechos.length) aviso(hechos.length + (hechos.length === 1 ? ' DUBCARD descargado: ' : ' DUBCARDs descargados, uno por episodio: ') + hechos.join(', '));
  return hechos;
}

/** La serie, si el título del desglose empieza por el nombre de un programa que ya conoce Dubbipt o Casting (el más largo), escrita como en el desglose. */
function pmSerieConocida(titulo){
  const orig = String(titulo == null ? '' : titulo).replace(/\s+/g, ' ').trim(), t = pmSinTildes(orig).toUpperCase();
  let nombres = [];
  try{ if(typeof sbShows === 'function') nombres = nombres.concat(sbShows().map(s => s && s.name)); }catch(e){ /* sin programas de Dubbipt */ }
  try{ const d = (typeof csDatos === 'function') ? csDatos().datos : null; if(d && Array.isArray(d.series)) nombres = nombres.concat(d.series.map(s => s && s.name)); }catch(e){ /* sin Casting */ }
  let mejor = '';
  for(const n of nombres){
    const k = pmSinTildes(n).toUpperCase().replace(/\s+/g, ' ').trim();
    if(k && k.length > mejor.length && t.indexOf(k) === 0 && t.length > k.length && /[\s\-_:]/.test(t.charAt(k.length))) mejor = orig.slice(0, k.length);
  }
  return mejor;
}

/** Lee los desgloses subidos. */
async function pmProcesar(){
  const S = ST.pm;
  if(S.busy || !S.entries.length) return;
  if(!S.cfg) S.cfg = pmCfgCargar();
  S.busy = true; S.logs = []; S.eps = []; repintar();
  try{
    for(const en of S.entries){
      try{
        const wb = XLSX.read(new Uint8Array(await readFileBuffer(en.file)), { type: 'array', bookVBA: true });
        const d = pmDatosDeLibro(wb);
        if(!d){ S.logs.push({ msg: en.name + ': no tiene hoja CASTING', cls: 'err' }); continue; }
        if(d.sinCabecera){ S.logs.push({ msg: en.name + ': la hoja CASTING no tiene la columna NOMBRE DEL ACTOR', cls: 'err' }); continue; }
        if(!S.cfg.serie){ const s = pmSerieConocida(d.titulo); if(s){ S.cfg.serie = s; pmCfgGuardar(S.cfg); } }
        const ep = pmEpisodio(d, en.name, S.cfg.serie);
        if(!S.cfg.serie && ep.serieAdivinada){ S.cfg.serie = ep.serieAdivinada; pmCfgGuardar(S.cfg); ep.titulo = ''; }
        S.eps.push(ep);
        const sin = ep.filas.filter(x => !x.actor).length;
        S.logs.push({ msg: en.name + ': episodio ' + (ep.numero || '?') + ' · ' + ep.filas.length + ' personajes' + (ep.fuera.length ? ' · ' + ep.fuera.length + ' fuera (no son talentos)' : '') + (sin ? ' · ' + sin + ' sin actor' : ''), cls: sin ? 'err' : 'ok' });
      }catch(e){ S.logs.push({ msg: en.name + ': ' + e.message, cls: 'err' }); }
    }
    S.eps.sort((a, b) => (parseInt(a.numero, 10) || 0) - (parseInt(b.numero, 10) || 0));
  }finally{ S.busy = false; repintar(); }
}

function pmHtml(){
  const S = ST.pm, cfg = S.cfg, cr = cfg.creditos;
  const campo = (k, et, v, ph) => '<label>' + E(et) + '<input type="text" data-dct="pmCfg" data-k="' + k + '" value="' + E(v || '') + '"' + (ph ? ' placeholder="' + E(ph) + '"' : '') + ' autocomplete="off"></label>';
  return '<div class="dct">'
    + '<div class="dct-drop" data-dct="pmElegir">' + ico('subir', 22) + '<b>Haz clic o arrastra los desgloses (presupuesto) de cada episodio</b><span>.xlsm · .xlsx · varios a la vez (hoja CASTING con el NOMBRE DEL ACTOR)</span>'
    +   '<input type="file" id="dctPmFiles" multiple accept=".xlsm,.xlsx,.xls" hidden></div>'
    + (S.entries.length ? '<div class="dct-lista">' + S.entries.map((e, i) => '<div class="dct-arch"><span class="dct-arch-n">' + E(e.name) + '</span><button class="cs-b cs-b-icono cs-borrar" data-dct="pmQuitar" data-i="' + i + '" title="Quitar">' + ico('cerrar', 13) + '</button></div>').join('') + '</div>' : '')
    + '<div class="dct-pm-cfg"><div class="dct-sec-t">Serie y créditos técnicos <i>(se recuerdan en este equipo)</i></div>'
    +   '<div class="dct-pm-campos">' + campo('serie', 'Series title', cfg.serie, "BIG JOHN'S BOSH FAMILY") + campo('serieTrad', 'Translated series title', cfg.serieTrad, 'Si aplica') + campo('idioma', 'Language version', cfg.idioma) + '</div>'
    +   '<div class="dct-pm-campos">' + PM_CREDITOS.map(k => campo('cr.' + k[0], k[1], cr[k[0]], k[0] === 'director' || k[0] === 'ingeniero' ? 'El del desglose' : '')).join('') + '</div></div>'
    + (S.entries.length ? '<button class="cs-b cs-pri dct-ancho" data-dct="pmProcesar"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Procesando…' : ico('actualizar', 14) + '<span>Procesar</span>') + '</button>' : '')
    + (S.logs.length ? '<div class="dct-log">' + S.logs.map(l => '<div class="dct-log-' + (l.cls || 'n') + '">' + E(l.msg) + '</div>').join('') + '</div>' : '')
    + (S.eps.length ? (S.eps.length > 1 ? '<button class="cs-b cs-pri dct-ancho dct-bajar" data-dct="pmBajarTodo">' + ico('bajar', 14) + '<span>Descargar los ' + S.eps.length + ' DUBCARDs (un archivo por episodio)</span></button>' : '')
      + S.eps.map((ep, i) => '<div class="dct-ep dct-pm-ep"><div class="dct-pm-cab"><div class="dct-ep-t">' + E(ep.tituloDesglose || ep.archivo) + '</div>'
          + '<button class="cs-b cs-pri" data-dct="pmBajar" data-i="' + i + '">' + ico('bajar', 14) + '<span>Descargar DUBCARD ' + E(ep.numero) + '</span></button></div>'
          + '<div class="dct-pm-campos">'
          +   '<label>Episode number<input type="text" data-dct="pmEp" data-i="' + i + '" data-k="numero" value="' + E(ep.numero) + '"></label>'
          +   '<label>Episode title<input type="text" data-dct="pmEp" data-i="' + i + '" data-k="titulo" value="' + E(ep.titulo) + '" placeholder="Meet the Fishers"></label>'
          +   '<label>Translated episode title<input type="text" data-dct="pmEp" data-i="' + i + '" data-k="tituloTrad" value="' + E(ep.tituloTrad) + '" placeholder="Si aplica"></label></div>'
          + '<div class="dct-tabla-w"><table class="dct-pm-tabla"><thead><tr><th>#</th><th>Personaje</th><th>Columna</th><th>Actor (name to appear in credits)</th><th></th></tr></thead><tbody>'
          + ep.filas.map((x, j) => '<tr' + (x.actor ? '' : ' class="dct-pm-sin"') + '><td>' + (j + 1) + '</td>'
              + '<td><input type="text" data-dct="pmFila" data-i="' + i + '" data-j="' + j + '" data-k="nombre" value="' + E(x.nombre) + '"></td>'
              + '<td><select data-dct="pmFila" data-i="' + i + '" data-j="' + j + '" data-k="col"><option value="B"' + (x.col === 'B' ? ' selected' : '') + '>Character (nombre propio)</option><option value="C"' + (x.col === 'C' ? ' selected' : '') + '>Translation (papel traducido)</option></select></td>'
              + '<td><input type="text" data-dct="pmFila" data-i="' + i + '" data-j="' + j + '" data-k="actor" value="' + E(x.actor) + '" placeholder="Sin actor"></td>'
              + '<td><button class="cs-b cs-b-icono cs-borrar" data-dct="pmFilaQuitar" data-i="' + i + '" data-j="' + j + '" title="Quitar esta fila">' + ico('cerrar', 12) + '</button></td></tr>').join('')
          + '</tbody></table></div>'
          + (ep.fuera.length ? '<div class="dct-tenue">No entran (no son talentos): ' + E(ep.fuera.join(', ')) + '</div>' : '')
          + '</div>').join('') : '')
    + '</div>';
}

function pmAnadir(files){
  const S = ST.pm;
  Array.from(files || []).filter(f => /\.(xlsm|xlsx|xls)$/i.test(f.name)).forEach(f => { if(!S.entries.find(e => e.name === f.name)) S.entries.push({ file: f, name: f.name }); });
  repintar();
}

function pmCablear(raiz){
  const S = ST.pm;
  const input = raiz.querySelector('#dctPmFiles');
  raiz.querySelectorAll('[data-dct]').forEach(el => {
    const que = el.getAttribute('data-dct'), i = +el.getAttribute('data-i'), j = +el.getAttribute('data-j'), k = el.getAttribute('data-k');
    if(que === 'pmElegir'){
      el.onclick = (ev) => { if(ev.target !== input && input) input.click(); };
      el.ondragover = (ev) => { ev.preventDefault(); };
      el.ondrop = (ev) => { ev.preventDefault(); pmAnadir(ev.dataTransfer && ev.dataTransfer.files); };
    }
    else if(que === 'dcModo') el.onclick = dcModoClic(el);
    else if(que === 'pmQuitar') el.onclick = () => { S.entries.splice(i, 1); repintar(); };
    else if(que === 'pmCfg') el.oninput = () => {
      if(k.indexOf('cr.') === 0) S.cfg.creditos[k.slice(3)] = el.value; else S.cfg[k] = el.value;
      pmCfgGuardar(S.cfg);
    };
    else if(que === 'pmProcesar') el.onclick = () => { pmProcesar().catch(e => aviso('No se pudo procesar: ' + e.message)); };
    else if(que === 'pmEp') el.oninput = () => { if(S.eps[i]) S.eps[i][k] = el.value; };
    else if(que === 'pmFila'){
      const fn = () => { const x = S.eps[i] && S.eps[i].filas[j]; if(x) x[k] = el.value; };
      if(el.tagName === 'SELECT') el.onchange = fn; else el.oninput = fn;
    }
    else if(que === 'pmFilaQuitar') el.onclick = () => { if(S.eps[i]){ S.eps[i].filas.splice(j, 1); repintar(); } };
    else if(que === 'pmBajar') el.onclick = () => { if(S.eps[i]){ pmOrdenar(S.eps[i].filas); pmDescargar([S.eps[i]]); } };
    else if(que === 'pmBajarTodo') el.onclick = () => { pmDescargarVarios(S.eps.slice()).catch(e => aviso('No se pudieron descargar: ' + e.message)); };
  });
  if(input) input.onchange = () => { pmAnadir(input.files); input.value = ''; };
}

/* ── DUBCARD en formato Pixelogic (PRO-58) ─────────────────────────────────
   Pedido de sala, con el presupuesto de «Final Table» 103 y el archivo que se
   entregó: «en la sección de Dubcards, un nuevo tipo que sea Pixelogic».
   Del mismo desglose que Paramount (hoja CASTING) sale, por episodio, el
   «Contract Inventory» de Pixelogic: los datos del proyecto, los créditos
   técnicos con nombre y apellido separados, y el reparto. Como en la entrega:
     · Una fila por actor. Si hace un personaje con nombre, va con él (el de
       más líneas, si tiene varios; se puede cambiar); si solo hace papeles
       genéricos (CHEF 3A, REPORTER 3A…), va sin personaje: voces adicionales.
     · Los personajes, en orden alfabético; después las voces adicionales, por
       actor. ORIGINAL, TODOS y lo que no es un talento no entra.
     · M.C. (reparto principal) y Adulto/Menor se marcan a mano y se recuerdan
       por serie, para el siguiente episodio.
     · El nombre del archivo: Serie_S1_E0003_<sufijo de entrega>.xlsx. */

const PX_KEY = 'dc_pixelogic_v1';
const PX_TIPOS = ['AUDIO DESCRIPTION', 'LIP SYNC DUBBING', 'VOICE OVER'];
const PX_DERECHOS = ['All rights excluding theatrical', 'All rights including theatrical'];
const PX_PRODUCTOS = ['Feature', 'Episodic'];
const PX_CREDITOS = [['traductor', 'Translator', true], ['adaptador', 'Adaptor', true], ['director', 'Dubbing Director', true], ['ingeniero', 'Recording Engineer', false],
  ['mezcla', 'Mixer', false], ['produccion', 'Production', false], ['adNarrador', 'AD Narrator', true], ['adTraductor', 'AD Translator', true], ['adDirector', 'AD Director', true]];
const PX_CFG_BASE = { serie: '', serieTrad: '', alpha: '', tipo: 'LIP SYNC DUBBING', derechos: '', idioma: 'Spanish (Latin American)', cliente: 'Amazon Prime Video',
  producto: 'Episodic', totalEps: '', idLengua: 'LAS', estudio: 'Centauro Comunicaciones', estudioEn: 'Centauro Communications',
  sufijo: 'OV_FP_DDO_PROHQ_HD_SDR_239_LAS_178_MOS_20',
  creditos: { traductor: '', adaptador: '', director: '', ingeniero: '', mezcla: 'Edwin Rodriguez', produccion: '', adNarrador: '', adTraductor: '', adDirector: '' },
  memoria: {} };
function pxCfgCargar(){
  let g = null;
  try{ g = JSON.parse(localStorage.getItem(PX_KEY) || 'null'); }catch(e){ g = null; }
  const c = Object.assign({}, PX_CFG_BASE, g || {});
  c.creditos = Object.assign({}, PX_CFG_BASE.creditos, (g && g.creditos) || {});
  c.memoria = Object.assign({}, (g && g.memoria) || {});
  return c;
}
function pxCfgGuardar(c){ try{ localStorage.setItem(PX_KEY, JSON.stringify(c)); }catch(e){ /* sin almacén: vale para esta vez */ } }

/** Lo que se recuerda de una serie: quién es reparto principal, quién es menor y qué personaje lleva cada actor. */
function pxMemoria(cfg, serie){
  const k = pmSinTildes(serie).toUpperCase().replace(/\s+/g, ' ').trim() || '-';
  const m = cfg.memoria[k] || (cfg.memoria[k] = {});
  m.mc = m.mc || {}; m.menor = m.menor || {}; m.eleccion = m.eleccion || {};
  return m;
}
const pxClave = s => pmSinTildes(s).toUpperCase().replace(/\s+/g, ' ').trim();
/** «CHEF 3G» → «Chef 3G»: como pmPropio, sin bajar la letra del número del papel. */
const pxPropio = s => pmPropio(s).replace(/(\d)(\p{L})(?![\p{L}])/gu, (m, d, l) => d + l.toUpperCase());
/** ¿Un niño por el nombre del papel? («Young Song-Yi», «Niña 1»): solo una sugerencia, se cambia a mano. */
const pxMenor = s => /(^|[\s\-])(YOUNG|LITTLE|KID|KIDS|CHILD|BOY|GIRL|BABY|TEEN|TEENAGE|NINO|NINA|NINOS|NINAS|BEBE|PEQUENO|PEQUENA)($|[\s\-\d])/.test(pxClave(s));
/** «Luis D Martinez» → ['Luis', 'D Martinez']: lo mismo que hacen las fórmulas de la plantilla (hasta el primer espacio). */
function pxPartes(nombre){
  const t = String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').trim(), i = t.indexOf(' ');
  return i < 0 ? [t, ''] : [t.slice(0, i), t.slice(i + 1)];
}

/**
 * El episodio para Pixelogic, de lo que se leyó del desglose (pmDatosDeHojas):
 * temporada y episodio (103 es la 1, episodio 3), la serie y una fila por actor.
 */
function pxEpisodio(datos, archivo, serie, cfg){
  const tit = String(datos.titulo || '').replace(/\s+/g, ' ').trim();
  const m = tit.match(/(\d{1,4})\s*$/);
  let numero = m ? m[1] : '';
  if(!numero){ const n = extractEpNum(archivo); numero = n != null ? String(n) : ''; }
  let resto = m ? tit.slice(0, m.index).trim() : tit;
  const s = String(serie || '').trim();
  const serieAdivinada = s ? '' : (resto ? pmTituloIngles(resto) : '');
  const n = ciNumero(numero, '');
  const mem = pxMemoria(cfg, s || serieAdivinada);
  const actores = new Map(), fuera = [];
  for(const x of datos.reparto){
    if(!x.talento){ fuera.push(pxPropio(x.personaje) + ' (sin actor)'); continue; }
    if(dcIsPseudo(x.talento)){ fuera.push(pxPropio(x.personaje) + ' (' + x.talento.toUpperCase() + ')'); continue; }
    const k = pxClave(x.talento);
    if(!actores.has(k)) actores.set(k, { actor: pmPropio(x.talento), papeles: [], adicionales: [] });
    const a = actores.get(k);
    (dcIsAdic(x.personaje) ? a.adicionales : a.papeles).push({ nombre: pxPropio(x.personaje), lineas: x.lineas || 0 });
  }
  const filas = [];
  actores.forEach((a, k) => {
    const opciones = a.papeles.slice().sort((p, q) => q.lineas - p.lineas).map(p => p.nombre);
    const recordado = mem.eleccion[k];
    const personaje = recordado != null && (recordado === '' || opciones.indexOf(recordado) >= 0) ? recordado : (opciones[0] || '');
    const pk = pxClave(personaje);
    filas.push({ actor: a.actor, opciones: opciones, personaje: personaje, trad: personaje,
                 mc: !!(personaje && mem.mc[pk]), menor: personaje ? (mem.menor[pk] != null ? !!mem.menor[pk] : pxMenor(personaje)) : !!mem.menor['@' + k],
                 otros: a.papeles.map(p => p.nombre).filter(p => p !== personaje).concat(a.adicionales.map(p => p.nombre)) });
  });
  pxOrdenar(filas);
  return { archivo: archivo || '', tituloDesglose: tit, numero: numero, temporada: String(n.temporada || 1), episodio: String(n.ep || ''),
           titulo: n.ep ? 'Episode ' + n.ep : '', tituloTrad: n.ep ? 'Episodio ' + n.ep : '', titleId: '',
           director: pmPropio(datos.director), tecnico: pmPropio(datos.tecnico), filas: filas, fuera: fuera, serieAdivinada: serieAdivinada };
}
/** Primero los personajes (por nombre), después las voces adicionales (por actor). */
const pxOrdenar = filas => filas.sort((a, b) => (!a.personaje - !b.personaje)
  || (a.personaje ? a.personaje.localeCompare(b.personaje, 'es', { sensitivity: 'base' }) : a.actor.localeCompare(b.actor, 'es', { sensitivity: 'base' })));

/* ── El Excel: «Contract Inventory» y «List Items», con el formato de la entrega ── */

const PX_B = '<border><left style="thin"><color indexed="64"/></left><right style="thin"><color indexed="64"/></right><top style="thin"><color indexed="64"/></top><bottom style="thin"><color indexed="64"/></bottom><diagonal/></border>';
const PX_ESTILOS = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="9">'
  +   '<font><sz val="11"/><name val="Arial"/><family val="2"/></font>'                                   // 0 cuerpo
  +   '<font><sz val="10"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'               // 1 cabecera del proyecto
  +   '<font><sz val="11"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>'               // 2 LAS
  +   '<font><b/><sz val="11"/><name val="Arial"/><family val="2"/></font>'                                // 3 títulos de tabla
  +   '<font><b/><sz val="12"/><color rgb="FF000000"/><name val="Calibri"/><family val="2"/><scheme val="minor"/></font>' // 4 nombre / apellido
  +   '<font><sz val="12"/><name val="Calibri"/><family val="2"/></font>'                                  // 5 créditos
  +   '<font><sz val="9"/><color rgb="FF333333"/><name val="Arial"/><family val="2"/></font>'              // 6 «Con las voces de»
  +   '<font><b/><sz val="12"/><name val="Calibri"/><family val="2"/></font>'                              // 7 List Items, títulos
  +   '<font><sz val="12"/><name val="Calibri"/><family val="2"/></font>'                                  // 8 List Items
  + '</fonts>'
  + '<fills count="6"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  +   '<fill><patternFill patternType="solid"><fgColor rgb="FFBFBFBF"/><bgColor indexed="64"/></patternFill></fill>'
  +   '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFF00"/><bgColor indexed="64"/></patternFill></fill>'
  +   '<fill><patternFill patternType="solid"><fgColor rgb="FFBFBFBF"/><bgColor indexed="64"/></patternFill></fill>'
  +   '<fill><patternFill patternType="solid"><fgColor rgb="FFFFFFFF"/><bgColor indexed="64"/></patternFill></fill></fills>'
  + '<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border>' + PX_B + '</borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="17">'
  +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'                                                                                                              // 0
  +   '<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" wrapText="1"/></xf>' // 1 etiqueta del proyecto
  +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" wrapText="1"/></xf>'              // 2 su valor
  +   '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" wrapText="1"/></xf>'                             // 3 texto suelto
  +   '<xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" vertical="center" wrapText="1"/></xf>'            // 4 LAS
  +   '<xf numFmtId="0" fontId="3" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'               // 5 título amarillo
  +   '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'               // 6 título gris
  +   '<xf numFmtId="0" fontId="4" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'               // 7 nombre / apellido
  +   '<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" wrapText="1"/></xf>'             // 8 crédito
  +   '<xf numFmtId="0" fontId="5" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="left" wrapText="1"/></xf>' // 9 crédito resaltado
  +   '<xf numFmtId="0" fontId="6" fillId="3" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment wrapText="1"/></xf>'               // 10 cabecera de tarjeta
  +   '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'                                                                                               // 11 reparto
  +   '<xf numFmtId="0" fontId="5" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf>'          // 12 M.C.
  +   '<xf numFmtId="0" fontId="0" fillId="5" borderId="1" xfId="0" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center"/></xf>'                        // 13 Adulto / Menor
  +   '<xf numFmtId="0" fontId="7" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="center" wrapText="1"/></xf>'                           // 14 List Items, título
  +   '<xf numFmtId="0" fontId="8" fillId="0" borderId="0" xfId="0" applyFont="1" applyAlignment="1"><alignment horizontal="left" wrapText="1"/></xf>'                             // 15 List Items
  +   '<xf numFmtId="0" fontId="3" fillId="4" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/>'                                                                  // 16 M.C. (título)
  + '</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';

/** Una celda: texto, número, vacía (con su estilo) o fórmula con el valor ya calculado. */
function pxCelda(ref, v, s){
  const st = s ? ' s="' + s + '"' : '';
  if(v && typeof v === 'object') return '<c r="' + ref + '"' + st + ' t="str"><f>' + pmX(v.f) + '</f><v>' + pmX(v.v) + '</v></c>';
  if(v === '' || v == null) return '<c r="' + ref + '"' + st + '/>';
  if(typeof v === 'number') return '<c r="' + ref + '"' + st + '><v>' + v + '</v></c>';
  return '<c r="' + ref + '"' + st + ' t="inlineStr"><is><t xml:space="preserve">' + pmX(v) + '</t></is></c>';
}
const pxNum = v => /^\d+$/.test(String(v == null ? '' : v).trim()) ? +String(v).trim() : String(v == null ? '' : v).trim();

/** La hoja «Contract Inventory» de un episodio, celda a celda como la entrega. */
function pxHojaXml(ep, cfg){
  const filas = [], c = pxCelda, cr = cfg.creditos || {};
  const fila = (n, celdas, alto) => filas.push('<row r="' + n + '"' + (alto ? ' ht="' + alto + '" customHeight="1"' : '') + '>' + celdas.join('') + '</row>');
  const cab = [['PROJECT TITLE (ENGLISH)', cfg.serie], ['PROJECT TITLE (TRANSLATED)', cfg.serieTrad], ['ALPHA', cfg.alpha], ['TYPE', cfg.tipo], ['RIGHTS', cfg.derechos],
    ['LANGUAGE', cfg.idioma], ['CLIENT', cfg.cliente], ['PRODUCT TYPE', cfg.producto], ['SEASON NUMBER', pxNum(ep.temporada)], ['EPISODE NUMBER', pxNum(ep.episodio)],
    ['TOTAL NUMBER OF EPISODES', pxNum(cfg.totalEps)]];
  cab.forEach((x, i) => fila(i + 1, [c('A' + (i + 1), x[0], 1), c('B' + (i + 1), '', 2), c('C' + (i + 1), x[1] == null ? '' : x[1], 2)], i ? 14.85 : 0));
  fila(13, [c('B13', 'Language Identifier', 3), c('C13', cfg.idLengua || '', 4)], 15);
  fila(15, [c('B15', 'Technical Credits', 3)]);
  fila(16, [c('B16', 'Description', 5), c('C16', 'Translation', 6), c('D16', 'First Name to appear in Credits', 7), c('E16', 'Last Name to appear in Credits', 7), c('F16', 'Legal Name', 5)], 16.5);
  const linea = (n, et, s, tr, nombre, apellido, legal) => fila(n, [c('B' + n, et, s), c('C' + n, tr || '', 8), c('D' + n, nombre || '', 8), c('E' + n, apellido || '', 8), c('F' + n, legal || '', 8)], 15.75);
  linea(17, 'Show', 8, '', cfg.serie);
  linea(18, 'Title ID', 8, '', ep.titleId);
  linea(19, 'Title', 8, ep.tituloTrad, ep.titulo);
  linea(20, 'Version', 8);
  linea(21, 'Studio', 9, cfg.estudio, cfg.estudioEn, '', cfg.estudio);
  linea(22, 'In Collaboration with Pixelogic Media', 8);
  PX_CREDITOS.forEach((k, i) => {
    const nombre = k[0] === 'director' ? (cr.director || ep.director || '') : k[0] === 'ingeniero' ? (cr.ingeniero || ep.tecnico || '') : (cr[k[0]] || '');
    const p = pxPartes(nombre);
    linea(23 + i, k[1], k[2] ? 9 : 8, '', p[0], p[1], nombre.replace(/\s+/g, ' ').trim());
  });
  fila(34, [c('B34', 'Talent', 3), c('C34', 'Con las voces de', 10), c('D34', 'Voces adicionales', 10)]);
  fila(35, [c('A35', 'M.C.', 16), c('B35', 'Character Name', 5), c('C35', 'Translation', 6), c('D35', 'First Name to appear in Credits', 6),
            c('E35', 'Last Name to appear in Credits', 6), c('F35', 'Legal Name', 5), c('G35', 'Adult or Minor', 5)], 30);
  (ep.filas || []).forEach((x, i) => {
    const n = 36 + i, p = pxPartes(x.actor);
    fila(n, [c('A' + n, x.personaje && x.mc ? 'X' : '', 12), c('B' + n, x.personaje || '', 11), c('C' + n, x.personaje ? (x.trad || x.personaje) : '', 11),
             c('D' + n, { f: 'LEFT(F' + n + ', FIND(" ", F' + n + ') - 1)', v: p[0] }, 11), c('E' + n, { f: 'MID(F' + n + ', FIND(" ", F' + n + ') + 1, LEN(F' + n + '))', v: p[1] }, 11),
             c('F' + n, x.actor || '', 11), c('G' + n, x.menor ? 'Menor' : 'Adulto', 13)], 15.75);
  });
  const ult = 35 + Math.max(1, (ep.filas || []).length);
  const merges = cab.map((_, i) => '<mergeCell ref="A' + (i + 1) + ':B' + (i + 1) + '"/>').join('');
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<dimension ref="A1:G' + ult + '"/><sheetViews><sheetView tabSelected="1" workbookViewId="0"/></sheetViews><sheetFormatPr defaultColWidth="9" defaultRowHeight="12.75"/>'
    + '<cols><col min="1" max="1" width="4.625" customWidth="1"/><col min="2" max="2" width="25.125" customWidth="1"/><col min="3" max="3" width="32.125" customWidth="1"/>'
    + '<col min="4" max="4" width="27.125" customWidth="1"/><col min="5" max="5" width="33.625" customWidth="1"/><col min="6" max="6" width="77.875" customWidth="1"/>'
    + '<col min="7" max="7" width="15.375" customWidth="1"/></cols>'
    + '<sheetData>' + filas.join('') + '</sheetData><mergeCells count="' + cab.length + '">' + merges + '</mergeCells>'
    + '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>';
}

/** La hoja «List Items»: los valores que admite la plantilla (protegida, como la original). */
function pxListasXml(){
  const filas = [];
  let n = 2;
  [['TYPE', PX_TIPOS], ['RIGHTS', PX_DERECHOS], ['PRODUCT TYPE', PX_PRODUCTOS]].forEach(g => {
    filas.push('<row r="' + n + '" ht="15.75" customHeight="1">' + pxCelda('B' + n, g[0], 14) + '</row>'); n++;
    g[1].forEach(v => { filas.push('<row r="' + n + '" ht="15.75" customHeight="1">' + pxCelda('B' + n, v, 15) + '</row>'); n++; });
    n++;
  });
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
    + '<dimension ref="B2:B' + (n - 2) + '"/><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultColWidth="9" defaultRowHeight="14.25"/>'
    + '<cols><col min="1" max="1" width="3.125" customWidth="1"/><col min="2" max="2" width="27" customWidth="1"/></cols>'
    + '<sheetData>' + filas.join('') + '</sheetData><sheetProtection sheet="1"/>'
    + '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/></worksheet>';
}

/** Los archivos del .xlsx de un episodio (ruta → texto). */
function pxArchivosXlsx(ep, cfg){
  const hojas = ['Contract Inventory', 'List Items'];
  return {
    '[Content_Types].xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
      + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
      + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
      + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + hojas.map((_, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('')
      + '</Types>',
    '_rels/.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    'xl/workbook.xml': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
      + '<bookViews><workbookView/></bookViews><sheets>' + hojas.map((n, i) => '<sheet name="' + n + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets>'
      + '<calcPr calcId="191028" fullCalcOnLoad="1"/></workbook>',
    'xl/_rels/workbook.xml.rels': '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + hojas.map((_, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>',
    'xl/styles.xml': PX_ESTILOS,
    'xl/worksheets/sheet1.xml': pxHojaXml(ep, cfg),
    'xl/worksheets/sheet2.xml': pxListasXml()
  };
}

/** «Final Table», temporada 1, episodio 3 → «Final_Table_S1_E0003_OV_FP_DDO_PROHQ_HD_SDR_239_LAS_178_MOS_20.xlsx». */
function pxNombreArchivo(cfg, ep){
  const s = pmSinTildes(cfg.serie).replace(/['’`]/g, '').split(/[^A-Za-z0-9]+/).filter(Boolean).join('_') || 'Serie';
  const t = parseInt(ep.temporada, 10) || 1, e = parseInt(ep.episodio, 10) || 0;
  const suf = String(cfg.sufijo || '').trim().replace(/^_+|_+$/g, '').replace(/[\\/:*?"<>|\s]+/g, '_');
  return s + '_S' + t + '_E' + String(e).padStart(4, '0') + (suf ? '_' + suf : '') + '.xlsx';
}

/** Lo que se marcó a mano en un episodio queda para los siguientes de la misma serie. */
function pxRecordar(ep, cfg){
  const mem = pxMemoria(cfg, cfg.serie);
  for(const x of ep.filas){
    const ka = pxClave(x.actor);
    if(x.opciones && x.opciones.length) mem.eleccion[ka] = x.personaje || '';
    if(x.personaje){ const k = pxClave(x.personaje); if(x.mc) mem.mc[k] = 1; else delete mem.mc[k]; mem.menor[k] = x.menor ? 1 : 0; }
    else mem.menor['@' + ka] = x.menor ? 1 : 0;
  }
  pxCfgGuardar(cfg);
}

/** Descarga el DUBCARD de un episodio. Devuelve el nombre del archivo (o null); `callado`, sin aviso. */
function pxDescargar(ep, callado){
  const S = ST.px;
  if(!ep){ aviso('Primero procesa los desgloses'); return null; }
  if(!String(S.cfg.serie || '').trim()){ aviso('Escribe el título del proyecto (PROJECT TITLE)'); return null; }
  try{
    pxOrdenar(ep.filas);
    pxRecordar(ep, S.cfg);
    const f = pxArchivosXlsx(ep, S.cfg), z = {};
    for(const k of Object.keys(f)) z[k] = fflate.strToU8(f[k]);
    const blob = new Blob([fflate.zipSync(z, { level: 6 })], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const nombre = pxNombreArchivo(S.cfg, ep);
    bdDownload(blob, nombre);
    if(!callado) aviso('Descargado: ' + nombre);
    return nombre;
  }catch(e){ aviso('No se pudo armar el DUBCARD: ' + e.message); return null; }
}

/** Un archivo por episodio, uno tras otro (como Paramount). */
async function pxDescargarVarios(eps){
  const S = ST.px;
  if(!eps.length){ aviso('Primero procesa los desgloses'); return []; }
  if(!String(S.cfg.serie || '').trim()){ aviso('Escribe el título del proyecto (PROJECT TITLE)'); return []; }
  const hechos = [];
  for(let i = 0; i < eps.length; i++){
    if(i) await new Promise(r => setTimeout(r, S.pausa == null ? 700 : S.pausa));
    const n = pxDescargar(eps[i], true);
    if(n) hechos.push(n);
  }
  if(hechos.length) aviso(hechos.length + (hechos.length === 1 ? ' DUBCARD descargado: ' : ' DUBCARDs descargados, uno por episodio: ') + hechos.join(', '));
  return hechos;
}

/** Lee los desgloses subidos. */
async function pxProcesar(){
  const S = ST.px;
  if(S.busy || !S.entries.length) return;
  if(!S.cfg) S.cfg = pxCfgCargar();
  S.busy = true; S.logs = []; S.eps = []; repintar();
  try{
    for(const en of S.entries){
      try{
        const wb = XLSX.read(new Uint8Array(await readFileBuffer(en.file)), { type: 'array', bookVBA: true });
        const d = pmDatosDeLibro(wb);
        if(!d){ S.logs.push({ msg: en.name + ': no tiene hoja CASTING', cls: 'err' }); continue; }
        if(d.sinCabecera){ S.logs.push({ msg: en.name + ': la hoja CASTING no tiene la columna NOMBRE DEL ACTOR', cls: 'err' }); continue; }
        if(!S.cfg.serie){ const s = pmSerieConocida(d.titulo); if(s){ S.cfg.serie = pmTituloIngles(s); pxCfgGuardar(S.cfg); } }
        const ep = pxEpisodio(d, en.name, S.cfg.serie, S.cfg);
        if(!S.cfg.serie && ep.serieAdivinada){ S.cfg.serie = ep.serieAdivinada; pxCfgGuardar(S.cfg); }
        S.eps.push(ep);
        const prin = ep.filas.filter(x => x.personaje).length;
        S.logs.push({ msg: en.name + ': temporada ' + ep.temporada + ', episodio ' + (ep.episodio || '?') + ' · ' + prin + ' personajes · ' + (ep.filas.length - prin) + ' voces adicionales'
          + (ep.fuera.length ? ' · ' + ep.fuera.length + ' fuera (no son talentos)' : ''), cls: 'ok' });
      }catch(e){ S.logs.push({ msg: en.name + ': ' + e.message, cls: 'err' }); }
    }
    S.eps.sort((a, b) => ((+a.temporada || 0) - (+b.temporada || 0)) || ((+a.episodio || 0) - (+b.episodio || 0)));
  }finally{ S.busy = false; repintar(); }
}

function pxHtml(){
  const S = ST.px, cfg = S.cfg, cr = cfg.creditos;
  const campo = (k, et, v, ph) => '<label>' + E(et) + '<input type="text" data-dct="pxCfg" data-k="' + k + '" value="' + E(v || '') + '"' + (ph ? ' placeholder="' + E(ph) + '"' : '') + ' autocomplete="off"></label>';
  const lista = (k, et, v, ops) => '<label>' + E(et) + '<select data-dct="pxCfg" data-k="' + k + '"><option value=""' + (v ? '' : ' selected') + '>(vacío)</option>'
    + ops.map(o => '<option' + (o === v ? ' selected' : '') + '>' + E(o) + '</option>').join('') + '</select></label>';
  return '<div class="dct">'
    + '<div class="dct-drop" data-dct="pxElegir">' + ico('subir', 22) + '<b>Haz clic o arrastra los desgloses (presupuesto) de cada episodio</b><span>.xlsm · .xlsx · varios a la vez (hoja CASTING con el NOMBRE DEL ACTOR)</span>'
    +   '<input type="file" id="dctPxFiles" multiple accept=".xlsm,.xlsx,.xls" hidden></div>'
    + (S.entries.length ? '<div class="dct-lista">' + S.entries.map((e, i) => '<div class="dct-arch"><span class="dct-arch-n">' + E(e.name) + '</span><button class="cs-b cs-b-icono cs-borrar" data-dct="pxQuitar" data-i="' + i + '" title="Quitar">' + ico('cerrar', 13) + '</button></div>').join('') + '</div>' : '')
    + '<div class="dct-pm-cfg"><div class="dct-sec-t">Proyecto <i>(se recuerda en este equipo)</i></div>'
    +   '<div class="dct-pm-campos">' + campo('serie', 'Project title (English)', cfg.serie, 'Final Table') + campo('serieTrad', 'Project title (translated)', cfg.serieTrad, 'Si aplica')
    +     campo('alpha', 'Alpha', cfg.alpha) + lista('tipo', 'Type', cfg.tipo, PX_TIPOS) + lista('derechos', 'Rights', cfg.derechos, PX_DERECHOS) + campo('idioma', 'Language', cfg.idioma)
    +     campo('cliente', 'Client', cfg.cliente) + lista('producto', 'Product type', cfg.producto, PX_PRODUCTOS) + campo('totalEps', 'Total number of episodes', cfg.totalEps, '12')
    +     campo('idLengua', 'Language identifier', cfg.idLengua) + campo('sufijo', 'Final del nombre del archivo', cfg.sufijo) + '</div>'
    +   '<div class="dct-sec-t">Créditos técnicos</div>'
    +   '<div class="dct-pm-campos">' + campo('estudio', 'Studio', cfg.estudio) + campo('estudioEn', 'Studio (inglés)', cfg.estudioEn)
    +     PX_CREDITOS.map(k => campo('cr.' + k[0], k[1], cr[k[0]], k[0] === 'director' || k[0] === 'ingeniero' ? 'El del desglose' : 'Nombre Apellido')).join('') + '</div></div>'
    + (S.entries.length ? '<button class="cs-b cs-pri dct-ancho" data-dct="pxProcesar"' + (S.busy ? ' disabled' : '') + '>' + (S.busy ? 'Procesando…' : ico('actualizar', 14) + '<span>Procesar</span>') + '</button>' : '')
    + (S.logs.length ? '<div class="dct-log">' + S.logs.map(l => '<div class="dct-log-' + (l.cls || 'n') + '">' + E(l.msg) + '</div>').join('') + '</div>' : '')
    + (S.eps.length ? (S.eps.length > 1 ? '<button class="cs-b cs-pri dct-ancho dct-bajar" data-dct="pxBajarTodo">' + ico('bajar', 14) + '<span>Descargar los ' + S.eps.length + ' DUBCARDs (un archivo por episodio)</span></button>' : '')
      + S.eps.map((ep, i) => '<div class="dct-ep dct-pm-ep"><div class="dct-pm-cab"><div class="dct-ep-t">' + E(ep.tituloDesglose || ep.archivo) + '</div>'
          + '<button class="cs-b cs-pri" data-dct="pxBajar" data-i="' + i + '">' + ico('bajar', 14) + '<span>Descargar S' + E(ep.temporada) + ' E' + E(ep.episodio) + '</span></button></div>'
          + '<div class="dct-pm-campos">'
          +   '<label>Season number<input type="text" data-dct="pxEp" data-i="' + i + '" data-k="temporada" value="' + E(ep.temporada) + '"></label>'
          +   '<label>Episode number<input type="text" data-dct="pxEp" data-i="' + i + '" data-k="episodio" value="' + E(ep.episodio) + '"></label>'
          +   '<label>Title (English)<input type="text" data-dct="pxEp" data-i="' + i + '" data-k="titulo" value="' + E(ep.titulo) + '" placeholder="Episode 3"></label>'
          +   '<label>Title (translation)<input type="text" data-dct="pxEp" data-i="' + i + '" data-k="tituloTrad" value="' + E(ep.tituloTrad) + '" placeholder="Episodio 3"></label>'
          +   '<label>Title ID<input type="text" data-dct="pxEp" data-i="' + i + '" data-k="titleId" value="' + E(ep.titleId) + '" placeholder="Si aplica"></label></div>'
          + '<div class="dct-tabla-w"><table class="dct-pm-tabla"><thead><tr><th>#</th><th title="Reparto principal (main cast)">M.C.</th><th>Personaje</th><th>Translation</th><th>Actor (legal name)</th><th>Adulto o menor</th><th></th></tr></thead><tbody>'
          + ep.filas.map((x, j) => '<tr><td>' + (j + 1) + '</td>'
              + '<td><input type="checkbox" data-dct="pxMc" data-i="' + i + '" data-j="' + j + '"' + (x.mc ? ' checked' : '') + (x.personaje ? '' : ' disabled') + '></td>'
              + '<td><select data-dct="pxPapel" data-i="' + i + '" data-j="' + j + '">' + x.opciones.map(o => '<option' + (o === x.personaje ? ' selected' : '') + '>' + E(o) + '</option>').join('')
              +   '<option value=""' + (x.personaje ? '' : ' selected') + '>(voces adicionales)</option></select>'
              +   (x.otros.length ? '<div class="dct-tenue">También hace: ' + E(x.otros.join(', ')) + '</div>' : '') + '</td>'
              + '<td><input type="text" data-dct="pxFila" data-i="' + i + '" data-j="' + j + '" data-k="trad" value="' + E(x.personaje ? x.trad : '') + '"' + (x.personaje ? '' : ' disabled') + '></td>'
              + '<td><input type="text" data-dct="pxFila" data-i="' + i + '" data-j="' + j + '" data-k="actor" value="' + E(x.actor) + '"></td>'
              + '<td><select data-dct="pxMenor" data-i="' + i + '" data-j="' + j + '"><option value="0"' + (x.menor ? '' : ' selected') + '>Adulto</option><option value="1"' + (x.menor ? ' selected' : '') + '>Menor</option></select></td>'
              + '<td><button class="cs-b cs-b-icono cs-borrar" data-dct="pxFilaQuitar" data-i="' + i + '" data-j="' + j + '" title="Quitar esta fila">' + ico('cerrar', 12) + '</button></td></tr>').join('')
          + '</tbody></table></div>'
          + (ep.fuera.length ? '<div class="dct-tenue">No entran (no son talentos): ' + E(ep.fuera.join(', ')) + '</div>' : '')
          + '</div>').join('') : '')
    + '</div>';
}

function pxAnadir(files){
  const S = ST.px;
  Array.from(files || []).filter(f => /\.(xlsm|xlsx|xls)$/i.test(f.name)).forEach(f => { if(!S.entries.find(e => e.name === f.name)) S.entries.push({ file: f, name: f.name }); });
  repintar();
}

function pxCablear(raiz){
  const S = ST.px;
  const input = raiz.querySelector('#dctPxFiles');
  raiz.querySelectorAll('[data-dct]').forEach(el => {
    const que = el.getAttribute('data-dct'), i = +el.getAttribute('data-i'), j = +el.getAttribute('data-j'), k = el.getAttribute('data-k');
    const x = () => S.eps[i] && S.eps[i].filas[j];
    if(que === 'pxElegir'){
      el.onclick = (ev) => { if(ev.target !== input && input) input.click(); };
      el.ondragover = (ev) => { ev.preventDefault(); };
      el.ondrop = (ev) => { ev.preventDefault(); pxAnadir(ev.dataTransfer && ev.dataTransfer.files); };
    }
    else if(que === 'dcModo') el.onclick = dcModoClic(el);
    else if(que === 'pxQuitar') el.onclick = () => { S.entries.splice(i, 1); repintar(); };
    else if(que === 'pxCfg'){
      const fn = () => { if(k.indexOf('cr.') === 0) S.cfg.creditos[k.slice(3)] = el.value; else S.cfg[k] = el.value; pxCfgGuardar(S.cfg); };
      if(el.tagName === 'SELECT') el.onchange = fn; else el.oninput = fn;
    }
    else if(que === 'pxProcesar') el.onclick = () => { pxProcesar().catch(e => aviso('No se pudo procesar: ' + e.message)); };
    else if(que === 'pxEp') el.oninput = () => { if(S.eps[i]) S.eps[i][k] = el.value; };
    else if(que === 'pxFila') el.oninput = () => { const f = x(); if(f) f[k] = el.value; };
    else if(que === 'pxMc') el.onchange = () => { const f = x(); if(f) f.mc = !!el.checked; };
    else if(que === 'pxMenor') el.onchange = () => { const f = x(); if(f) f.menor = el.value === '1'; };
    else if(que === 'pxPapel') el.onchange = () => {
      const f = x(); if(!f) return;
      const mem = pxMemoria(S.cfg, S.cfg.serie), pk = pxClave(el.value);
      f.personaje = el.value; f.trad = el.value;
      f.mc = !!(el.value && mem.mc[pk]);
      if(el.value) f.menor = mem.menor[pk] != null ? !!mem.menor[pk] : pxMenor(el.value);
      pxOrdenar(S.eps[i].filas); repintar();
    };
    else if(que === 'pxFilaQuitar') el.onclick = () => { if(S.eps[i]){ S.eps[i].filas.splice(j, 1); repintar(); } };
    else if(que === 'pxBajar') el.onclick = () => { if(S.eps[i]){ pxDescargar(S.eps[i]); repintar(); } };
    else if(que === 'pxBajarTodo') el.onclick = () => { pxDescargarVarios(S.eps.slice()).then(repintar).catch(e => aviso('No se pudieron descargar: ' + e.message)); };
  });
  if(input) input.onchange = () => { pxAnadir(input.files); input.value = ''; };
}

/* ── Contenido confidencial: la IA externa, bloqueada (ENT-22) ─────────────
   Pedido de sala: «es contenido de Netflix y hay políticas de
   confidencialidad; sería muy grave que se filtren datos de guiones o de
   casting». Generar un breakdown manda el libreto entero a una IA de fuera
   (Groq, OpenRouter, NVIDIA, Anthropic): el texto sale de Dubbipt, y los
   modelos gratuitos pueden guardar o usar lo que reciben. Por eso viene
   BLOQUEADO. Un administrador lo puede permitir para UN proveedor, con la
   referencia de la autorización escrita del cliente; queda en los datos de
   Casting, en la nube (quién, cuándo, qué proveedor y qué autorización) y en
   el historial, y se puede volver a bloquear. Sin ese permiso no sale nada:
   lo comprueba la propia llamada (bdGenerate), no solo la pantalla, y el
   proxy /api/llm exige la cabecera que solo pone esta llamada. */

const BD_IA_HDR = 'x-dubbipt-ia';
/** El permiso vigente ({ proveedor, autorizacion, quien, cuando }) o null si está bloqueada. */
function bdIaPermiso(){
  try{
    const d = (typeof csDatos === 'function') ? csDatos().datos : null;
    const a = d && d.ajustes && d.ajustes.iaExterna;
    return (a && a.permitida === true && a.proveedor && BD_PROVIDERS[a.proveedor]) ? a : null;
  }catch(e){ return null; }
}
/** Antes de mandar nada: sin permiso, o con otro proveedor, no sale el texto. */
function bdIaComprobar(cfg){
  const a = bdIaPermiso();
  if(!a) throw new Error('La IA externa está bloqueada: los libretos son confidenciales. Un administrador puede permitirla para un cliente que lo haya autorizado por escrito.');
  if(!cfg || cfg.provider !== a.proveedor) throw new Error('Solo está autorizado «' + BD_PROVIDERS[a.proveedor].l + '». Cámbialo en la configuración del modelo.');
  return a;
}
/** Permitir (para un proveedor y con la autorización escrita del cliente) o volver a bloquear. */
async function bdIaCambiar(permitir, proveedor, autorizacion){
  const quien = (typeof dcxQuien === 'function') ? dcxQuien() : '', cuando = new Date().toISOString();
  const valor = permitir ? { permitida: true, proveedor: proveedor, autorizacion: String(autorizacion || '').trim(), quien: quien, cuando: cuando } : { permitida: false, quien: quien, cuando: cuando };
  const que = permitir ? 'IA externa permitida para breakdowns: ' + BD_PROVIDERS[proveedor].l + ' · autorización: ' + valor.autorizacion : 'IA externa bloqueada de nuevo';
  if(typeof csEditar !== 'function') return 'error';
  return csEditar(p => { p.ajustes = Object.assign({}, p.ajustes || {}, { iaExterna: valor }); return true; }, que);
}
const BD_IA_GRATIS = new Set(['nvidia', 'groq', 'openrouter']);
function bdIaHtml(){
  const B = ST.bd, a = bdIaPermiso(), f = B.iaForm;
  if(a) return '<div class="dct-ia dct-ia-ok"><div><b>IA externa permitida</b> para breakdowns: solo <b>' + E(BD_PROVIDERS[a.proveedor].l) + '</b>.'
    + ' Autorización: ' + E(a.autorizacion) + ' · ' + E(a.quien || '') + ', ' + E(new Date(a.cuando).toLocaleString('es')) + '.'
    + ' El libreto se envía a ese proveedor al generar.</div><button class="cs-b" data-dct="bdIaBloquear">Volver a bloquear</button></div>';
  if(!f) return '<div class="dct-ia"><div><b>IA externa bloqueada · contenido confidencial</b>'
    + '<p>Los libretos de Netflix y de otros clientes con acuerdo de confidencialidad no se envían a servicios de IA de terceros (Groq, OpenRouter, NVIDIA, Anthropic): el texto saldría de Dubbipt, y los modelos gratuitos pueden guardar o usar lo que reciben. Los breakdowns ya guardados se pueden ver y descargar.</p></div>'
    + '<button class="cs-b" data-dct="bdIaPedir">Permitir para un cliente que lo autorizó…</button></div>';
  return '<div class="dct-ia dct-caja"><b>Permitir la IA externa para breakdowns</b>'
    + '<p class="dct-tenue">Solo si el cliente lo autorizó <b>por escrito</b> para este proveedor. Queda apuntado quién lo permitió, cuándo y con qué autorización.</p>'
    + '<label>Proveedor autorizado<select data-dct="bdIaProv">' + Object.keys(BD_PROVIDERS).filter(k => k !== 'custom').map(k => '<option value="' + k + '"' + (f.proveedor === k ? ' selected' : '') + '>' + E(BD_PROVIDERS[k].l) + (BD_IA_GRATIS.has(k) ? ' · gratuito: puede guardar o usar lo que recibe' : '') + '</option>').join('') + '</select></label>'
    + '<label>Autorización escrita del cliente (quién y referencia)<input data-dct="bdIaAut" value="' + E(f.autorizacion || '') + '" placeholder="p. ej. Correo de Netflix (Ana Pérez) del 12/10/2026, ref. 4471"></label>'
    + '<label class="dct-check"><input type="checkbox" data-dct="bdIaConfirmo"' + (f.confirmo ? ' checked' : '') + '> Confirmo que el cliente autorizó por escrito enviar sus libretos a este proveedor.</label>'
    + (f.err ? '<div class="dct-mal">' + E(f.err) + '</div>' : '')
    + '<div class="dct-fila"><button class="cs-b" data-dct="bdIaCancelar">Cancelar</button><button class="cs-b cs-pri" data-dct="bdIaPermitir">Permitir</button></div></div>';
}

/* ── Breakdowns ───────────────────────────────────────────────────────────── */

/** Los breakdowns guardados: los de Casting y los de este equipo que aún no subieron. */
function bdGuardados(){
  let dc = [];
  try{ const d = (typeof csDatos === 'function') ? csDatos().datos : null; dc = (d && Array.isArray(d.breakdowns)) ? d.breakdowns : []; }catch(e){ dc = []; }
  const ids = new Set(dc.map(b => String(b.id)));
  return dc.concat(ST.bd.locales.filter(b => !ids.has(String(b.id)))).slice().sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Guarda un breakdown donde los guarda Casting (su lista `breakdowns`). Sin sesión, se queda en este equipo y se dice. */
async function bdGuardar(rec){
  ST.bd.locales.push(rec);
  if(typeof csEditar !== 'function') return 'equipo';
  const r = await csEditar(p => { if(!Array.isArray(p.breakdowns)) p.breakdowns = []; if(p.breakdowns.some(b => String(b.id) === String(rec.id))) return false; p.breakdowns.push(rec); return true; }, 'Breakdown guardado: ' + rec.title);
  if(r === 'guardado' || r === 'igual'){ ST.bd.locales = ST.bd.locales.filter(b => b.id !== rec.id); return 'nube'; }
  aviso('El breakdown se queda en este equipo: entra en Casting para guardarlo con los demás');
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

function bdPuede(){ const B = ST.bd, cfg = getBdCfg(), a = bdIaPermiso(); return !!(a && cfg.provider === a.proveedor && B.script && cfg.apiKey && B.name.trim() && (B.isMovie || B.ep) && !B.busy); }

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

/** El breakdown en pantalla: lo que Casting pinta con BdDoc. */
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
    + '<label>Proveedor<select id="dctBdProv">' + Object.keys(BD_PROVIDERS).filter(k => { const a = bdIaPermiso(); return !a || k === a.proveedor; }).map(k => '<option value="' + k + '"' + (k === cfg.provider ? ' selected' : '') + '>' + E(BD_PROVIDERS[k].l) + '</option>').join('') + '</select></label>'
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
  const ia = bdIaPermiso();
  return '<div class="dct">'
    + bdIaHtml()
    + (!ia ? '' : '<div class="dct-fila dct-cab2"><span class="dct-tenue">Análisis de libretos para casting, dirección y técnica · ' + saved.length + ' guardado' + (saved.length === 1 ? '' : 's') + '</span>'
    +   '<button class="cs-b" data-dct="bdCfg">' + ico('dubcards', 13) + '<span>' + E(cfg.apiKey ? bdProviderLabel(cfg) : 'Configurar clave de API') + '</span></button></div>'
    + (B.cfgOpen ? bdConfigHtml() : '')
    + (!cfg.apiKey && !B.cfgOpen ? '<div class="dct-alertas">Falta la clave de API del proveedor autorizado. Configúrala.</div>' : '')
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
    + (B.result && !B.busy ? bdResultadoHtml(B.result, false) : ''))
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
    /* ── Contenido confidencial (ENT-22) ── */
    else if(que === 'bdIaPedir') el.onclick = () => { B.iaForm = { proveedor: 'anthropic', autorizacion: '', confirmo: false, err: '' }; repintar(); };
    else if(que === 'bdIaCancelar') el.onclick = () => { B.iaForm = null; repintar(); };
    else if(que === 'bdIaProv') el.onchange = () => { if(B.iaForm) B.iaForm.proveedor = el.value; };
    else if(que === 'bdIaAut') el.oninput = () => { if(B.iaForm) B.iaForm.autorizacion = el.value; };
    else if(que === 'bdIaConfirmo') el.onchange = () => { if(B.iaForm) B.iaForm.confirmo = !!el.checked; };
    else if(que === 'bdIaPermitir') el.onclick = async () => {
      const f = B.iaForm; if(!f) return;
      if(String(f.autorizacion || '').trim().length < 8){ f.err = 'Escribe quién autorizó y la referencia (correo, contrato…)'; repintar(); return; }
      if(!f.confirmo){ f.err = 'Marca la casilla para confirmar la autorización escrita'; repintar(); return; }
      const r = await bdIaCambiar(true, f.proveedor, f.autorizacion);
      if(r === 'error'){ f.err = 'No se pudo guardar el permiso'; repintar(); return; }
      B.iaForm = null;
      const c = getBdCfg(); if(c.provider !== f.proveedor) saveBdCfg(Object.assign({}, c, { provider: f.proveedor, model: (BD_PROVIDERS[f.proveedor] && BD_PROVIDERS[f.proveedor].defaultModel) || '' }));
      repintar();
    };
    else if(que === 'bdIaBloquear') el.onclick = async () => {
      const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal) ? await DDL_UI.confirmModal({ title: 'Volver a bloquear la IA externa', body: 'Los breakdowns dejarán de poder generarse con IA externa hasta que un administrador lo vuelva a permitir.', confirmLabel: 'Bloquear', cancelLabel: 'Cancelar' }) : true;
      if(!ok) return;
      await bdIaCambiar(false);
      if(B.abort) B.abort.abort();
      repintar();
    };
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

/* ── Hacia fuera ──────────────────────────────────────────────────────────── */

const TITULOS = { dubcards: ['Dubcards', 'Las DUBCARD de cada capítulo (Netflix y otras casas, formatos Paramount y Pixelogic) y el Contract Inventory'],
                  breakdowns: ['Breakdowns', 'Análisis de libretos con un modelo de lenguaje · con la IA externa bloqueada salvo autorización escrita del cliente'] };

function html(vista){
  const t = TITULOS[vista];
  if(!t) return '';
  const cab = '<div class="cs-cab"><div class="cs-cab-t"><h2>' + E(t[0]) + '</h2><div class="cs-cab-sub">' + E(t[1]) + '</div></div></div>';
  try{
    if(vista === 'dubcards') return cab + dcHtml();
    return cab + bdHtml();
  }catch(e){ return cab + '<div class="cs-nada">No se pudo pintar: ' + E(e.message) + '</div>'; }
}
function cablear(raiz, vista){
  if(!raiz) return;
  if(vista === 'dubcards') dcCablear(raiz);
  else if(vista === 'breakdowns') bdCablear(raiz);
}

return { html: html, cablear: cablear, ST: ST, dcParseFile: dcParseFile, dcProcesar: dcProcesar, bdDocHtml: bdDocHtml, bdGuardados: bdGuardados, bdGuardar: bdGuardar,
         bdEndpoint: bdEndpoint, BD_PROVIDERS: BD_PROVIDERS, bdIaPermiso: bdIaPermiso, bdIaComprobar: bdIaComprobar, bdIaCambiar: bdIaCambiar, bdGenerate: bdGenerate, bdMakeDocx: bdMakeDocx, bdExtractText: bdExtractText, dcSplitRows: dcSplitRows,
         ciNombre: ciNombre, ciReparto: ciReparto, ciMain: ciMain, ciNumero: ciNumero, ciLlenarXml: ciLlenarXml, ciDocumentos: ciDocumentos,
         ciLeerDubcard: ciLeerDubcard, ciCargarDubcard: ciCargarDubcard, ciEquipoDe: ciEquipoDe,
         pmDatosDeHojas: pmDatosDeHojas, pmEpisodio: pmEpisodio, pmEsTraduccion: pmEsTraduccion, pmArchivosXlsx: pmArchivosXlsx, pmNombreArchivo: pmNombreArchivo, pmProcesar: pmProcesar, pmCfgCargar: pmCfgCargar, pmSerieConocida: pmSerieConocida, pmDescargarVarios: pmDescargarVarios,
         pxEpisodio: pxEpisodio, pxArchivosXlsx: pxArchivosXlsx, pxNombreArchivo: pxNombreArchivo, pxProcesar: pxProcesar, pxCfgCargar: pxCfgCargar, pxDescargarVarios: pxDescargarVarios, pxPartes: pxPartes };
})();

/* ═══ FIN DE HERRAMIENTAS DE DUBLAJECAST EN DUBBIPT ═══ */
