/* Base de talentos · especificacion 02
 *
 * La lista de actores de la empresa. Antes el campo de talento era texto libre
 * con una lista de sugerencias: se podia escribir cualquier cosa, y una errata
 * -MARCELA BORDA / MARCELA BORDAS- partia a un actor en dos por toda la
 * ocupacion, los choques y el registro del programa, sin un solo aviso.
 *
 * Ahora solo se admite lo que esta registrado. Con dos excepciones que NO son
 * actores y tienen que seguir pudiendo escribirse, porque significan otra cosa:
 *
 *   ORIGINAL · ese personaje no se dobla, se deja el audio original
 *   TODOS    · lo graban todos los talentos a la vez (ambientes, coros)
 *   X        · ese parlamento no se hace
 *
 * Son marcas de produccion, no personas. Por eso no cuentan como carga de
 * nadie (CAST-22) y por eso la base no las contiene.
 *
 * La base se guarda en dos sitios a proposito:
 *   · en este equipo (IndexedDB), para que valga en TODOS los programas
 *   · en la nube, dentro del programa abierto, para que viaje con el trabajo
 *
 * De donde depende: castNorm, castSimil, idbGet, idbSet, sb, LDB, DDL_UI, fflate
 */

const TAL = { nombres: [], claves: new Set(), ts: 0, origen: '', cargada: false };

/* Las marcas de produccion. No son talentos: son instrucciones. */
const TAL_MARCAS = {
  'ORIGINAL': 'no se dobla · se deja el audio original',
  'TODOS':    'lo graban todos los talentos',
  'X':        'ese parlamento no se hace'
};

/** ¿Lo escrito es una marca de produccion y no una persona? */
function talEsMarca(t){
  const k = castNorm(t);
  return !!TAL_MARCAS[k] || k === 'X ORIGINAL';
}

/** ¿Hay base cargada? Sin base NO se restringe nada: se sigue como siempre. */
function talHayBase(){ return TAL.nombres.length > 0; }

/* ── Leer el Excel de la base ──────────────────────────────────────────── */

/**
 * Los nombres de un .xlsx de una sola columna.
 * Se busca la columna cuya cabecera sea «Nombre»; si no la hay, la primera.
 * Se resuelve la tabla de cadenas compartidas, que es donde Excel guarda de
 * verdad el texto: leer el <v> a pelo daria numeros en vez de nombres.
 */
function talLeerXlsx(buf){
  if(typeof fflate === 'undefined') throw new Error('falta la librería de ZIP');
  const arch = fflate.unzipSync(new Uint8Array(buf));
  const txt = (n) => arch[n] ? new TextDecoder().decode(arch[n]) : '';

  const compartidas = [];
  const ss = txt('xl/sharedStrings.xml');
  if(ss){
    for(const m of ss.matchAll(/<si>([\s\S]*?)<\/si>/g)){
      let s = '';
      for(const t of m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) s += t[1];
      compartidas.push(talDesEsc(s));
    }
  }

  let hoja = txt('xl/worksheets/sheet1.xml');
  if(!hoja){
    const otra = Object.keys(arch).find(n => /^xl\/worksheets\/.*\.xml$/.test(n));
    if(otra) hoja = txt(otra);
  }
  if(!hoja) throw new Error('el archivo no parece un Excel válido');

  // fila -> columna -> texto
  const celdas = new Map();
  for(const m of hoja.matchAll(/<c\s+r="([A-Z]+)(\d+)"([^>]*)>([\s\S]*?)<\/c>/g)){
    const col = m[1], fila = +m[2], attrs = m[3], cuerpo = m[4];
    let v = '';
    if(/t="s"/.test(attrs)){
      const i = (cuerpo.match(/<v>(\d+)<\/v>/) || [])[1];
      if(i != null) v = compartidas[+i] || '';
    }else if(/t="inlineStr"/.test(attrs)){
      for(const t of cuerpo.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)) v += t[1];
      v = talDesEsc(v);
    }else{
      v = talDesEsc((cuerpo.match(/<v>([\s\S]*?)<\/v>/) || [])[1] || '');
    }
    v = String(v).trim();
    if(!v) continue;
    if(!celdas.has(fila)) celdas.set(fila, {});
    celdas.get(fila)[col] = v;
  }
  if(!celdas.size) throw new Error('la hoja está vacía');

  const filas = [...celdas.keys()].sort((a, b) => a - b);
  // la columna: la que tenga «Nombre» de cabecera, o la primera que haya
  let colegida = null, primeraFila = filas[0];
  const cab = celdas.get(primeraFila) || {};
  for(const col in cab) if(castNorm(cab[col]) === 'NOMBRE'){ colegida = col; break; }
  let desde = primeraFila;
  if(colegida) desde = primeraFila + 1;                 // la cabecera no es un nombre
  else {
    const cols = Object.keys(cab).sort();
    colegida = cols[0] || 'A';
  }

  const out = [];
  for(const f of filas){
    if(f < desde) continue;
    const v = (celdas.get(f) || {})[colegida];
    if(v) out.push(v);
  }
  return out;
}
function talDesEsc(s){
  return String(s == null ? '' : s)
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
}

/* ── Guardar y cargar ─────────────────────────────────────────────────── */

function talRutaNube(showId){ return (showId || LDB.showId) + '/base-talentos.json'; }

/** Deja la lista puesta, sin repetidos y sin las marcas de produccion. */
function talPoner(nombres, origen){
  const vistos = new Set(), limpio = [];
  for(const n of (nombres || [])){
    const nombre = String(n || '').replace(/\s+/g, ' ').trim();
    if(!nombre) continue;
    const k = castNorm(nombre);
    if(!k || vistos.has(k)) continue;
    /* Una marca de produccion dentro de la base la haria contar como actor en
       la ocupacion. Se quedan fuera: se admiten igual al escribir. */
    if(talEsMarca(nombre)) continue;
    vistos.add(k); limpio.push(nombre);
  }
  limpio.sort((a, b) => a.localeCompare(b, 'es'));
  TAL.nombres = limpio;
  TAL.claves = vistos;
  TAL.ts = Date.now();
  TAL.origen = origen || TAL.origen || '';
  TAL.cargada = true;
  try{ talPintarLista(); }catch(e){ /* sin lista de sugerencias se escribe igual */ }
  return limpio.length;
}

async function talGuardar(){
  const paq = { nombres: TAL.nombres, ts: TAL.ts, origen: TAL.origen };
  try{ await idbSet('ddl-base-talentos', paq); }catch(e){ /* sin copia local: queda la de la nube */ }
  const id = LDB.showId || (typeof currentEp !== 'undefined' && currentEp && currentEp.showId);
  if(!id) return false;
  try{
    const r = await sb.storage.from('libretos').upload(
      talRutaNube(id), new Blob([JSON.stringify(paq)], { type:'application/json' }), { upsert:true });
    return !r.error;
  }catch(e){ fallo('talGuardar · js/talentos.js:160', e, 'la base no se ha subido a la nube'); return false; }
}

/**
 * Carga la base. Primero la de este equipo -vale para todos los programas- y
 * si no hay, la que estuviera guardada en el programa abierto.
 */
async function talCargar(){
  if(TAL.cargada) return TAL.nombres.length;
  try{
    const c = await idbGet('ddl-base-talentos');
    if(c && c.nombres && c.nombres.length){ talPoner(c.nombres, c.origen); return TAL.nombres.length; }
  }catch(e){ /* no hay copia en este equipo: se busca en la nube */ }
  const id = LDB.showId || (typeof currentEp !== 'undefined' && currentEp && currentEp.showId);
  if(id){
    try{
      const r = await sb.storage.from('libretos').download(talRutaNube(id));
      if(r && r.data){
        const paq = JSON.parse(await r.data.text());
        if(paq && paq.nombres){
          talPoner(paq.nombres, paq.origen);
          try{ await idbSet('ddl-base-talentos', paq); }catch(e){ /* sin copia local; se bajara otra vez */ }
          return TAL.nombres.length;
        }
      }
    }catch(e){ /* el programa no tiene base guardada: se sigue sin restringir */ }
  }
  TAL.cargada = true;
  return 0;
}

/* ── Validar lo que se escribe ─────────────────────────────────────────── */

/**
 * ¿Se puede poner esto como talento?
 *
 * Devuelve { ok, nombre, tipo, motivo, cerca }. `nombre` viene YA como esta
 * escrito en la base: asi una erratilla de acentos o de mayusculas no crea un
 * actor nuevo. `cerca` son los parecidos, para poder ofrecerlos.
 */
function talValidar(txt){
  const t = String(txt == null ? '' : txt).replace(/\s+/g, ' ').trim();
  if(!t) return { ok:true, nombre:'', tipo:'vacio' };
  const k = castNorm(t);
  if(TAL_MARCAS[k] || k === 'X ORIGINAL')
    return { ok:true, nombre:(k === 'X ORIGINAL' ? 'X ORIGINAL' : k), tipo:'marca' };
  // sin base no se restringe: la aplicacion tiene que seguir sirviendo
  if(!talHayBase()) return { ok:true, nombre:t, tipo:'libre' };
  for(const n of TAL.nombres) if(castNorm(n) === k) return { ok:true, nombre:n, tipo:'talento' };
  return { ok:false, nombre:t, tipo:'desconocido',
           motivo:'«' + t + '» no está en la base de talentos',
           cerca: talCerca(t, 4) };
}

/** Los nombres de la base mas parecidos a lo escrito. */
function talCerca(txt, cuantos){
  const k = castNorm(txt);
  if(!k) return [];
  const con = [];
  for(const n of TAL.nombres){
    const nk = castNorm(n);
    let s = castSimil(k, nk);
    if(nk.indexOf(k) === 0) s = Math.max(s, 0.9);        // lo escrito es el principio
    else if(nk.indexOf(k) > 0) s = Math.max(s, 0.75);
    /* El liston alto a proposito. Con 0,5 salian cuatro apellidos que solo
       compartian «PEREZ», y una sugerencia que no es la buena estorba mas que
       no sugerir nada: te hace dudar de la base en vez de mirar lo que has
       escrito. Mejor ninguna que cuatro al azar. */
    if(s >= 0.65) con.push({ n:n, s:s });
  }
  con.sort((a, b) => b.s - a.s);
  return con.slice(0, cuantos || 4).map(x => x.n);
}

/** Lo que va en la lista de sugerencias: la base + las marcas. */
function talSugerencias(){
  return TAL.nombres.concat(Object.keys(TAL_MARCAS));
}

/* ── Personajes que NUNCA se doblan ───────────────────────────────────── */

/*
 * No son personajes: son renglones de produccion que el desglose trae siempre
 * y que nunca se graban. Van marcados con X, que es lo que significa «este
 * parlamento no se hace». Antes habia que acordarse a mano en cada capitulo.
 */
const CHAR_SIEMPRE_X = new Set(['PRINCIPAL PHOTOGRAPHY', 'MAIN TITLE', 'BURNEDIN SUBS',
                                'BURNED IN SUBS', 'BURNT IN SUBS', 'BURNED-IN SUBS']);

/** ¿Este personaje es de los que nunca se doblan? */
function talSiempreX(nombre){
  return CHAR_SIEMPRE_X.has(castNorm(nombre));
}

/**
 * Pone X a los que nunca se doblan. Solo los que estan VACIOS: lo que haya
 * escrito una persona no se toca nunca (CAST-N1), ni siquiera para esto.
 * Devuelve los nombres que ha marcado.
 */
function talMarcarSiempreX(){
  const puestos = [];
  for(const k in charIdx){
    const c = charIdx[k];
    if(!c) continue;
    if(c.talent && String(c.talent).trim()) continue;
    if(!talSiempreX(c.display || k)) continue;
    c.talent = 'X';
    c.noRec = true;
    c.heredado = false;               // no viene de otro capitulo: es una regla fija
    try{
      const raw = (window._charsRaw || []).find(x => x.key === k);
      if(raw){ raw.talent = 'X'; raw.noRec = true; raw.heredado = false; }
    }catch(e){ fallo('talMarcarSiempreX · js/talentos.js:264', e, 'la X puede perderse al reabrir el capitulo'); }
    puestos.push(c.display || k);
  }
  return puestos;
}

/* ── La lista de sugerencias del campo de talento ─────────────────────── */

function talPintarLista(){
  let dl = document.getElementById('talList');
  if(!dl){
    dl = document.createElement('datalist');
    dl.id = 'talList';
    document.body.appendChild(dl);
  }
  const esc2 = (s) => String(s).replace(/"/g, '&quot;');
  dl.innerHTML = talSugerencias()
    .map(t => '<option value="' + esc2(t) + '">'
              + (TAL_MARCAS[castNorm(t)] ? esc2(TAL_MARCAS[castNorm(t)]) : '') + '</option>')
    .join('');
}

/* ── El panel ─────────────────────────────────────────────────────────── */

let talFiltro = '';
function talPanel(){
  const viejo = document.getElementById('talOv'); if(viejo) viejo.remove();
  const ov = document.createElement('div');
  ov.id = 'talOv'; ov.className = 'modo-cap';
  const esc2 = (s) => (typeof esc === 'function') ? esc(String(s)) : String(s);
  const f = castNorm(talFiltro);
  const lista = TAL.nombres.filter(n => !f || castNorm(n).includes(f));

  ov.innerHTML = '<div class="modo-caja" style="max-width:560px;text-align:left">'
    + '<div class="modo-tit">Base de talentos</div>'
    + '<div class="modo-sub" style="margin-bottom:8px">'
    +   (TAL.nombres.length ? TAL.nombres.length + ' actores registrados' : 'Todavía sin base')
    + '</div>'
    + '<div class="meta-nota">Solo se puede repartir a quien esté aquí. Es lo que impide que '
    +   'una errata —<b>MARCELA BORDA</b> y <b>MARCELA BORDAS</b>— parta a un actor en dos por toda '
    +   'la ocupación y los choques.<br><br>'
    +   '<b>ORIGINAL</b>, <b>TODOS</b> y <b>X</b> se pueden escribir siempre: no son actores, son '
    +   'marcas de producción. ORIGINAL es que no se dobla; TODOS, que lo graban todos; X, que ese '
    +   'parlamento no se hace.'
    + (TAL.nombres.length ? '' : '<br><br><b>Mientras no haya base, no se restringe nada</b> y el '
        + 'campo de talento sigue siendo libre.')
    + '</div>'
    + '<div class="io-tit">Añadir uno</div>'
    + '<div class="io-rej" style="margin-bottom:12px">'
    +   '<input id="talNuevo" type="text" placeholder="Nombre y apellido…" autocomplete="off" '
    +     'style="flex:1;min-width:150px;background:#11131a;color:#e7ebf3;border:1px solid #2b3040;'
    +     'border-radius:9px;padding:8px 10px;font-size:13px">'
    +   '<button class="io-b" id="talMas">➕ Añadir</button>'
    + '</div>'
    + '<div class="io-tit">La lista entera</div>'
    + '<div class="io-rej" style="margin-bottom:12px">'
    +   '<button class="io-b" id="talIn">⬆ Importar del Excel</button>'
    +   (TAL.nombres.length ? '<button class="io-b" id="talFuera">🗑 Vaciar la base</button>' : '')
    + '</div>'
    + (TAL.origen ? '<div class="meta-nota" style="margin-bottom:10px">De <b>' + esc2(TAL.origen) + '</b></div>' : '')
    + (TAL.nombres.length
        ? '<div class="io-tit">Registrados</div>'
          + '<input id="talBuscar" type="text" placeholder="Buscar un nombre…" value="' + esc2(talFiltro) + '" '
          + 'style="width:100%;box-sizing:border-box;background:#11131a;color:#e7ebf3;border:1px solid #2b3040;'
          + 'border-radius:9px;padding:8px 10px;font-size:13px;margin-bottom:8px">'
          + '<div id="talLista" style="max-height:230px;overflow:auto;border:1px solid #23262b;border-radius:9px;padding:6px 8px">'
          + (lista.length
              ? lista.map(n => '<div style="font-size:13px;color:#e7ebf3;padding:3px 0">' + esc2(n) + '</div>').join('')
              : '<div style="font-size:13px;color:#8892a6;padding:3px 0">(ninguno se parece a eso)</div>')
          + '</div>'
        : '')
    + '<div class="dud-btns"><button class="modo-op dud-b dud-ok" id="talCerrar">Cerrar</button></div></div>';
  document.body.appendChild(ov);

  const cerrar = () => { talFiltro = ''; ov.remove(); };
  ov.querySelector('#talCerrar').onclick = cerrar;
  ov.addEventListener('click', e => { if(e.target === ov) cerrar(); });

  const buscar = ov.querySelector('#talBuscar');
  if(buscar) buscar.oninput = () => {
    talFiltro = buscar.value;
    const pos = buscar.selectionStart;
    talPanel();
    const b2 = document.querySelector('#talOv #talBuscar');
    if(b2){ b2.focus(); try{ b2.setSelectionRange(pos, pos); }catch(e){ /* el cursor se va al final: da igual */ } }
  };

  /* Añadir uno a mano. Importar el Excel entero REEMPLAZA la base; esto solo
     suma, que es lo que hace falta cuando entra un actor nuevo a mitad de
     temporada y nadie va a rehacer el archivo por una línea. */
  {
    const campo = ov.querySelector('#talNuevo');
    const meter = async () => {
      const v = campo.value.trim();
      if(!v) return;
      const r = talAnadir(v);
      if(!r.ok){ castAviso('❌ ' + r.motivo); campo.focus(); return; }
      await talGuardar();
      castAviso(r.yaEstaba ? ('Ya estaba: ' + r.nombre)
                           : ('🎭 Talento creado: ' + r.nombre + ' · ' + TAL.nombres.length + ' en la base'));
      talFiltro = '';
      talPanel();
      const c2 = document.querySelector('#talOv #talNuevo'); if(c2) c2.focus();
      try{ renderCards(); }catch(e){ /* no hay tarjetas que repintar */ }
    };
    ov.querySelector('#talMas').onclick = meter;
    campo.addEventListener('keydown', e => { if(e.key === 'Enter'){ e.preventDefault(); meter(); } });
  }

  ov.querySelector('#talIn').onclick = () => {
    let inp = document.getElementById('talFile');
    if(!inp){
      inp = document.createElement('input');
      inp.type = 'file'; inp.id = 'talFile'; inp.accept = '.xlsx,.xlsm,.xls';
      inp.style.display = 'none';
      document.body.appendChild(inp);
      inp.addEventListener('change', async function(){
        const f2 = this.files && this.files[0];
        this.value = '';
        if(f2) await talImportar(f2);
      });
    }
    inp.click();
  };

  const fuera = ov.querySelector('#talFuera');
  if(fuera) fuera.onclick = async () => {
    const ok = (typeof DDL_UI !== 'undefined' && DDL_UI.confirm)
      ? await DDL_UI.confirm('¿Vaciar la base de talentos?',
          'Se queda sin restricción: el campo de talento vuelve a ser libre. Los repartos ya hechos no se tocan.')
      : confirm('¿Vaciar la base de talentos?');
    if(!ok) return;
    talPoner([], '');
    TAL.origen = '';
    await talGuardar();
    talPanel();
    castAviso('Base de talentos vaciada · el campo vuelve a ser libre');
  };
}

/** Trae la base de un Excel y la deja guardada. */
async function talImportar(file){
  try{
    const buf = await file.arrayBuffer();
    const nombres = talLeerXlsx(buf);
    if(!nombres.length){
      castAviso('❌ No encontré ningún nombre en ese archivo');
      return 0;
    }
    const antes = TAL.nombres.length;
    const n = talPoner(nombres, file.name);
    await talGuardar();
    const fuera = nombres.length - n;
    castAviso('🎭 ' + n + ' talentos en la base'
      + (antes ? ' (antes había ' + antes + ')' : '')
      + (fuera ? ' · ' + fuera + ' repetidos o marcas de producción, fuera' : ''));
    try{ if(document.getElementById('talOv')) talPanel(); }catch(e){ /* el panel ya se cerro */ }
    try{ renderCards(); }catch(e){ fallo('renderCards · js/talentos.js:391', e); }
    return n;
  }catch(e){
    castAviso('❌ No se pudo leer la base: ' + (e.message || e));
    return 0;
  }
}

/* ── Repartir desde el libreto ────────────────────────────────────────── */

/*
 * La barra de talento dentro del libreto abierto.
 *
 * Cuando abres un personaje en modo casting estas leyendo SUS parlamentos, que
 * es justo el momento en que decides quien lo hace. Tener que volver a las
 * tarjetas para escribirlo rompe la lectura y te hace perder el sitio. Aqui se
 * reparte sin salir.
 *
 * El libreto vive en un iframe del mismo origen, asi que se le habla
 * directamente; pero su documento se reconstruye entero cada vez que se abre,
 * y por eso esto se vuelve a llamar desde renderLibretoChips.
 */
function talBarraLibreto(){
  if(typeof pop2 === 'undefined' || !pop2 || !pop2.doc) return;
  const barra = pop2.doc.getElementById('lTal');
  if(!barra) return;
  const c = (typeof DDL_MODO !== 'undefined' && DDL_MODO === 'casting' && pop2.key)
    ? charIdx[pop2.key] : null;
  if(!c){ barra.style.display = 'none'; barra.innerHTML = ''; return; }

  const esc2 = (s) => (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s);
  const tal = (c.talent && String(c.talent).trim()) || '';
  const marca = tal && talEsMarca(tal) ? (TAL_MARCAS[castNorm(tal)] || '') : '';
  barra.style.display = 'flex';
  /* Sin el nombre del personaje: ya sale en la cuenta, a la izquierda de esta
     misma banda. Repetirlo detrás de la palabra «Talento» hacía leer «TALENTO
     MELODIE GODBY» como si el actor se llamara igual que el personaje. */
  barra.innerHTML =
      '<span class="lt-et">Talento</span>'
    + '<input id="lTalIn" type="text" list="lTalList" autocomplete="off" '
    +   'placeholder="' + (talHayBase() ? 'Talento de la base…' : 'Nombre del talento…') + '" '
    +   'value="' + esc2(tal) + '" aria-label="Talento para ' + esc2(c.display || '') + '">'
    + '<button id="lTalOk" class="ok">Guardar</button>'
    + (tal ? '<button id="lTalNo" title="Quitar el talento">Quitar</button>' : '')
    + (marca ? '<span class="lt-marca">' + esc2(marca) + '</span>' : '')
    + '<datalist id="lTalList">'
    +   talSugerencias().map(t => '<option value="' + esc2(t) + '"></option>').join('')
    + '</datalist>';

  const inp = barra.querySelector('#lTalIn');
  const guardar = async (valor) => {
    const v = talValidar(valor);
    if(!v.ok){
      inp.classList.add('mal');
      // el aviso trae el botón de crearlo: es aquí donde te enteras de que falta
      talAvisarDesconocido(v, (nombre)=> guardar(nombre));
      try{ inp.focus(); inp.select(); }catch(e){ /* el campo ya no esta: el aviso ya salio */ }
      return false;
    }
    await talAsignar(pop2.key, v.nombre);
    talBarraLibreto();
    return true;
  };
  barra.querySelector('#lTalOk').onclick = () => guardar(inp.value);
  const quitar = barra.querySelector('#lTalNo');
  if(quitar) quitar.onclick = () => guardar('');
  inp.addEventListener('input', () => inp.classList.remove('mal'));
  inp.addEventListener('keydown', (e) => {
    if(e.key === 'Enter'){ e.preventDefault(); guardar(inp.value); }
    if(e.key === 'Escape'){ e.preventDefault(); talBarraLibreto(); }
  });
}

/**
 * Pone un talento a un personaje, venga de donde venga.
 *
 * Es el MISMO camino que usa la tarjeta: el historial para deshacer, la copia
 * cruda -sin la cual applyCharMerges lo pierde al reabrir-, el aviso de choque,
 * el registro del programa y la nube. Tener dos caminos para esto garantiza que
 * un dia uno se olvide de un paso.
 */
async function talAsignar(key, valor){
  const c = charIdx[key];
  if(!c) return false;
  const val = String(valor == null ? '' : valor).trim();
  if(val === (c.talent || '')) return true;
  try{ castHistPush(castFoto([key]), (c.talent ? 'talento de ' : 'asignar talento a ') + (c.display || key)); }catch(e){ /* sin deshacer, pero el reparto se hace */ }
  c.talent = val;
  try{ c.noRec = NO_REC.has(norm(val)); }catch(e){ c.noRec = false; }
  try{
    const raw = (window._charsRaw || []).find(x => x.key === key);
    if(raw){ raw.talent = val; raw.noRec = c.noRec; }
  }catch(e){ fallo('talAsignar · js/talentos.js:482', e, 'el talento puede perderse al reabrir el capitulo'); }
  try{ castVerificar(key, true); }catch(e){ /* se queda en naranja: es solo el aviso */ }   // escrito a mano
  if(val) try{ castAvisarChoque(key); }catch(e){ /* el choque se vuelve a mirar al repintar */ }
  /* Asignar a mano deja el personaje cerrado, asi que su tarjeta se va a
     «Personajes completados». Se apaga primero: ver adonde fue lo que acabas
     de tocar es la diferencia entre «ya esta» y «se ha borrado». */
  const repintar = () => { try{ renderCards(); }catch(e){ fallo('renderCards · js/talentos.js:471', e); } };
  if(val && typeof castSalirTarjeta === 'function') castSalirTarjeta(key, repintar);
  else repintar();
  /* Repintar ANTES de subir a la nube. Si se deja para despues, la barra se
     queda enseñando lo que tecleaste -«marcela borda»- hasta que responde el
     servidor, y parece que no ha cogido el nombre bueno. */
  try{ talBarraLibreto(); }catch(e){ /* el libreto no esta abierto */ }
  try{
    if(typeof currentEp !== 'undefined' && currentEp && currentEp.id)
      await epDataUpsert(currentEp.id, currentEp.showId);
  }catch(e){ fallo('epDataUpsert · js/talentos.js:475', e, 'puede que esto no se haya guardado en la nube'); }
  try{ castRegAnotarPronto(); }catch(e){ /* el registro se apunta en el siguiente reparto */ }
  castAviso(val ? ('Talento asignado: ' + (c.display || key) + ' → ' + val)
                : ('Talento quitado a ' + (c.display || key)));
  return true;
}

/* ── Crear un talento ─────────────────────────────────────────────────── */

/**
 * Mete un nombre nuevo en la base. Devuelve { ok, nombre, motivo, yaEstaba }.
 *
 * `nombre` vuelve como queda GUARDADO: si ya estaba escrito de otra manera
 * -otras mayusculas, otra tilde-, se devuelve el que ya habia. Dos escrituras
 * del mismo actor son un actor, no dos.
 */
function talAnadir(nombre){
  const t = String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').trim();
  if(t.length < 2) return { ok:false, motivo:'Un nombre de al menos dos letras' };
  if(talEsMarca(t))
    return { ok:false, motivo:'«' + t + '» es una marca de producción, no un actor. '
                             + 'Se puede escribir siempre, sin estar en la base.' };
  if(!/\p{L}/u.test(t)) return { ok:false, motivo:'Un nombre lleva letras' };
  const k = castNorm(t);
  for(const n of TAL.nombres) if(castNorm(n) === k) return { ok:true, nombre:n, yaEstaba:true };
  TAL.nombres.push(t);
  TAL.nombres.sort((a, b) => a.localeCompare(b, 'es'));
  TAL.claves.add(k);
  TAL.ts = Date.now();
  TAL.cargada = true;
  try{ talPintarLista(); }catch(e){ /* sin sugerencias se escribe igual */ }
  return { ok:true, nombre:t, yaEstaba:false };
}

/**
 * Crear un talento preguntando antes, que es como debe hacerse desde el campo
 * de reparto.
 *
 * La base existe para que una errata no parta a un actor en dos. Si crear uno
 * fuera un clic sin mas, la errata pasaria a ser un clic: se escribe MARCELA
 * BORDAS, no esta, se crea, y ya hay dos MARCELAS en la base para siempre. Por
 * eso lo PARECIDO se ensena primero y bien visible: casi siempre la respuesta
 * correcta es «no, queria ese otro».
 *
 * Devuelve el nombre ya guardado, o null si no se creo.
 */
async function talCrearPreguntando(nombre){
  const t = String(nombre == null ? '' : nombre).replace(/\s+/g, ' ').trim();
  const cerca = talCerca(t, 4);
  let ok = true;
  if(typeof DDL_UI !== 'undefined' && DDL_UI.confirmModal){
    ok = await DDL_UI.confirmModal({
      title: 'Crear el talento «' + t + '»',
      body: cerca.length
        ? 'Ojo: en la base ya hay alguien parecido. Si lo que pasa es que te has '
          + 'equivocado al teclear, cancela y elige el de la lista — dos escrituras del '
          + 'mismo actor lo parten en dos por toda la ocupación y los choques.'
        : 'Se añade a la base de la empresa y podrás repartirlo en todos los programas.',
      items: cerca.map(n => ({ label: n, meta: 'ya está en la base' })),
      confirmLabel: 'Crear «' + t + '»',
      cancelLabel: 'Cancelar',
      danger: cerca.length > 0
    });
  }
  if(!ok) return null;
  const r = talAnadir(t);
  if(!r.ok){ castAviso('❌ ' + r.motivo); return null; }
  await talGuardar();
  castAviso(r.yaEstaba ? ('Ya estaba en la base: ' + r.nombre)
                       : ('🎭 Talento creado: ' + r.nombre + ' · ' + TAL.nombres.length + ' en la base'));
  try{ if(document.getElementById('talOv')) talPanel(); }catch(e){ /* el panel ya no esta */ }
  return r.nombre;
}

/**
 * El aviso de «ese nombre no esta», con el boton para crearlo ahi mismo.
 * Es el momento en que te enteras de que falta, asi que es donde tiene que
 * poder arreglarse; mandarte al panel y volver es perder el hilo.
 * `alCrear` se llama con el nombre ya guardado.
 */
function talAvisarDesconocido(v, alCrear){
  const msg = v.motivo + (v.cerca && v.cerca.length ? ' · ¿querías ' + v.cerca.join(', ') + '?' : '');
  if(typeof DDL_UI !== 'undefined' && DDL_UI.toast){
    DDL_UI.toast(msg, { kind:'err', duration: 9000,
      actionLabel: '➕ Crear talento',
      onAction: async () => {
        const nombre = await talCrearPreguntando(v.nombre);
        if(nombre && typeof alCrear === 'function') alCrear(nombre);
      } });
  }else castAviso('❌ ' + msg);
}
