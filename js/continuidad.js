/* Continuidades original · especificacion 09, PRO-58
 *
 * Pedido de sala: «quiero colocar una sección en cada uno de los programas de
 * Casting que diga Continuidades original; te voy a pasar los libretos en
 * original para que saque una tabla de continuidades como esta; esta tabla
 * se saca de los libretos en original».
 *
 * Cada programa de Casting tiene la pestaña «Continuidades original». Se
 * suben los libretos en original -el dialogue list de Netflix, .xlsx, uno o
 * varios a la vez- y sale la tabla de continuidad de personajes:
 *   · lo que se CUENTA del libreto, igual que en la tabla de sala: las
 *     intervenciones de cada personaje en cada episodio (eventos del dialogue
 *     list, incluidos los [REACTION]; sin WALLA, rótulos, fotografía principal
 *     ni título), si en ese episodio solo se le oye (todo OFF), las palabras
 *     (TOTAL WORD COUNT BY CHARACTER de la hoja Word Count Summary) y las de
 *     otro idioma, el primer y el último TC, en cuántos episodios sale, su
 *     debut y su última aparición, y una categoría propuesta;
 *   · lo que se ESCRIBE leyendo el guion -nombre completo, categoría si la
 *     propuesta no vale, descripción, idiomas y notas-, editable en la tabla
 *     y guardado con el programa;
 *   · los incidentales aparte, y alertas que salen solas: cues que parecen el
 *     mismo personaje (ROBERT / ROBERTO), cambios de nombre entre versiones
 *     (Change List), ausencias, episodios solo de voz, canciones, diálogo en
 *     otro idioma y episodios que faltan.
 * Y se descarga en Excel con sus hojas: Continuidad, Incidentales, Alertas y
 * notas, Fuentes y Detalle por episodio.
 *
 * Se guarda en el almacén, en la carpeta del programa (`<programa>/
 * continuidad.json`), con copia en el equipo.
 *
 * De donde depende: XLSX (SheetJS, para leer), fflate (para escribir el
 * Excel), castNorm, castSimil, sb, idbGet, idbSet, csEsc, csIco, csRepintar,
 * castAviso, ioDescargar, fallo.
 */

/* ═══ CONTINUIDADES ORIGINAL ═════════════════════════════════════════════ */

const CONT = { datos: {}, cargando: {} };

/* Lo que va en el dialogue list y no es un personaje. */
const CONT_FUERA = new Set(['WALLA', 'GRAPHICS INSERTS', 'PRINCIPAL PHOTOGRAPHY', 'MAIN TITLE']);
const CONT_CATEGORIAS = ['Protagonista', 'Principal', 'Recurrente', 'Invitado', 'Incidental'];
/* Palabras que hacen de un cue un incidental: «MALE CLUB GOER», «FEMALE STUDENT 3», «SECURITY GUARD». */
const CONT_GENERICOS = /\b(MALE|FEMALE|MAN|WOMAN|MEN|WOMEN|BOY|GIRL|GUY|KID|KIDS|CHILD|BABY|STUDENTS?|GOERS?|PARTYGOERS?|WORKERS?|GUARDS?|OFFICERS?|POLICE|SECURITY|NEIGHBOU?RS?|DRIVERS?|VOICES?|ANNOUNCER|REPORTER|NEWSREADER|CROWD|WAITERS?|WAITRESS|NURSES?|PARAMEDICS?|BARTENDER|BOUNCER|CASHIER|CLERK|RECEPTIONIST|SENIOR|JUNIOR|PASSERBY|PEDESTRIAN|CUSTOMER|PATRON|FAN|FANS|TEEN|TEENAGER|RADIO|TV|DJ|MC|ATTENDANT|PILOT|SOLDIER|PRISONER|INMATE|DOCTOR|CHEF|HOST|POLICEMAN|POLICEWOMAN|RUNNER|GANGSTERS?|THUGS?|DEALER|BODYGUARD|BROWSER|PLAYERS?|REFEREE|PROTESTERS?|COUNSELL?OR|DELIVERY|SKINNY|OLD|YOUNG|TALL|SMALL|BIG)\b/;

/** ¿Este cue es un incidental? Genérico o con número al final; los que tienen nombre («DR. LUIS MORA», «MR. SMITH»), no. */
function contEsIncidental(cue){
  const c = String(cue == null ? '' : cue).toUpperCase().trim();
  if(!c) return false;
  if(/^(DR|MR|MRS|MS|MISS|PROF|DETECTIVE|DET|OFFICER|SGT|CAPTAIN|CAPT|UNCLE|AUNT|AUNTIE|GOGO|MAMA|PAPA)\.?\s+[A-Z]/.test(c) && !/\d$/.test(c) && !/\b(MALE|FEMALE)\b/.test(c)) return false;
  return CONT_GENERICOS.test(c) || /\s\d+$/.test(c) || /'S\s/.test(c);      // «ANA'S FRIEND»
}

/** El número de episodio: el de Project Info o, si no, el del nombre del archivo («…Episode3…», «E03»). */
function contNumeroEp(info, archivo){
  const n = parseInt(info && (info['EPISODE #'] != null ? info['EPISODE #'] : info['EPISODE']), 10);
  if(isFinite(n) && n > 0) return n;
  const a = String(archivo || '');
  const m = a.match(/episode\s*_?(\d+)/i) || a.match(/\bE(?:P)?\s*_?(\d{1,3})\b/i) || a.match(/(\d{1,3})(?!.*\d)/);
  return m ? parseInt(m[1], 10) : null;
}

/** Dónde está cada columna, por su nombre en la cabecera. */
function contColumnas(cab, nombres){
  const c = (cab || []).map(x => String(x == null ? '' : x).toUpperCase().trim());
  const out = {};
  for(const k in nombres){
    const buscados = nombres[k];
    out[k] = c.findIndex(h => buscados.some(b => (b instanceof RegExp) ? b.test(h) : h === b));
  }
  return out;
}

/**
 * Lee un dialogue list ya pasado a filas: `o.filas` (hoja Dialogue List, con
 * su cabecera), `o.resumen` (Word Count Summary), `o.info` (Project Info,
 * {clave: valor}), `o.cambios` (Change List, opcional) y `o.archivo`.
 * Devuelve el episodio con lo de cada personaje.
 */
function contLeerLista(o){
  const filas = (o && o.filas) || [];
  const col = contColumnas(filas[0], {
    entra: ['IN-TIMECODE', 'IN TIMECODE', 'TC IN', /^IN[- ]?TIME/],
    fuente: ['SOURCE', 'CHARACTER', 'CHARACTER NAME', 'PERSONAJE'],
    transcripcion: ['TRANSCRIPTION'],
    dialogo: ['DIALOGUE', 'DIALOG'],
    etiquetas: ['TAGS', 'TAG'],
    pantalla: ['SOURCE ONSCREEN', 'ONSCREEN', 'ON SCREEN']
  });
  if(col.fuente < 0) throw new Error('«' + (o && o.archivo || 'el archivo') + '» no parece un dialogue list: no tiene la columna SOURCE');
  const per = {};
  for(const f of filas.slice(1)){
    const cue = String(f[col.fuente] == null ? '' : f[col.fuente]).replace(/\s+/g, ' ').trim().toUpperCase();
    if(!cue || CONT_FUERA.has(cue)) continue;
    /* La columna DIALOGUE es la que se dobla: una línea con TRANSCRIPTION «[REACTION]» y diálogo de verdad no es una reacción. */
    const texto = String((col.dialogo >= 0 ? f[col.dialogo] : '') || (col.transcripcion >= 0 ? f[col.transcripcion] : '') || '').trim();
    const tags = String(col.etiquetas >= 0 && f[col.etiquetas] != null ? f[col.etiquetas] : '').toUpperCase();
    const pant = String(col.pantalla >= 0 && f[col.pantalla] != null ? f[col.pantalla] : '').toUpperCase().trim();
    const tc = String(col.entra >= 0 && f[col.entra] != null ? f[col.entra] : '').trim();
    const p = (per[cue] = per[cue] || { intervenciones: 0, reacciones: 0, off: 0, canciones: 0, otroIdioma: 0, palabras: 0, palabrasOtro: 0, primerTC: '', ultimoTC: '' });
    p.intervenciones++;
    if(/^\[REACTION\]$/i.test(texto)) p.reacciones++;
    if(pant === 'OFF') p.off++;
    if(/SONGS? DITTIES|\bSONG\b/.test(tags)) p.canciones++;
    if(/FOREIGN/.test(tags)) p.otroIdioma++;
    if(tc){ if(!p.primerTC || tc < p.primerTC) p.primerTC = tc; if(!p.ultimoTC || tc > p.ultimoTC) p.ultimoTC = tc; }
  }
  const res = (o && o.resumen) || [];
  if(res.length){
    const cr = contColumnas(res[0], { nombre: ['CHARACTER NAME', 'CHARACTER', 'SOURCE'], total: [/^TOTAL WORD COUNT/], otro: [/^FOREIGN/] });
    for(const f of res.slice(1)){
      const cue = String(cr.nombre >= 0 && f[cr.nombre] != null ? f[cr.nombre] : '').replace(/\s+/g, ' ').trim().toUpperCase();
      if(!per[cue]) continue;
      per[cue].palabras = Math.round(+f[cr.total] || 0);
      per[cue].palabrasOtro = cr.otro >= 0 ? Math.round(+f[cr.otro] || 0) : 0;
    }
  }
  /* Cambios de nombre entre versiones: el Change List dice OLD SOURCE → NEW SOURCE. */
  const cambios = [];
  const cl = (o && o.cambios) || [];
  if(cl.length){
    const cc = contColumnas(cl[0], { viejo: ['OLD SOURCE'], nuevo: ['NEW SOURCE'], tc: ['NEW IN-TIMECODE'] });
    if(cc.viejo >= 0 && cc.nuevo >= 0){
      const por = {};
      for(const f of cl.slice(1)){
        const a = String(f[cc.viejo] == null ? '' : f[cc.viejo]).trim().toUpperCase(), b = String(f[cc.nuevo] == null ? '' : f[cc.nuevo]).trim().toUpperCase();
        if(!a || !b || a === b || CONT_FUERA.has(a) || CONT_FUERA.has(b)) continue;
        const k = a + '→' + b;
        (por[k] = por[k] || { de: a, a: b, n: 0, tc: (cc.tc >= 0 && f[cc.tc]) ? String(f[cc.tc]) : '' }).n++;
      }
      for(const k in por) cambios.push(por[k]);
    }
  }
  const info = (o && o.info) || {};
  return {
    ep: contNumeroEp(info, o && o.archivo), archivo: (o && o.archivo) || '',
    titulo: String(info['EPISODE TITLE'] || ''), programa: String(info['SHOW TITLE'] || ''),
    version: [info['PROXY TYPE'] ? String(info['PROXY TYPE']).replace(/_/g, ' ') : '', info['VERSION'] || ''].filter(Boolean).join(' · '),
    fecha: String(info['DATE'] || ''), personajes: per, cambiosNombre: cambios
  };
}

/** De un libro de SheetJS, lo que necesita contLeerLista. */
function contDeLibro(libro, archivo){
  const hoja = (n) => { const k = (libro.SheetNames || []).find(x => x.toUpperCase().trim() === n); return k ? XLSX.utils.sheet_to_json(libro.Sheets[k], { header: 1, defval: '', raw: true }) : []; };
  let filas = hoja('DIALOGUE LIST');
  if(!filas.length && libro.SheetNames && libro.SheetNames.length) filas = XLSX.utils.sheet_to_json(libro.Sheets[libro.SheetNames[0]], { header: 1, defval: '', raw: true });
  const info = {};
  for(const f of hoja('PROJECT INFO')) if(f && f[0] != null && String(f[0]).trim()) info[String(f[0]).trim().toUpperCase()] = f[1];
  const cambios = hoja((libro.SheetNames || []).map(x => x.toUpperCase().trim()).find(x => /^CHANGE LIST( \d+)?$/.test(x)) || '-');
  return contLeerLista({ filas: filas, resumen: hoja('WORD COUNT SUMMARY'), info: info, cambios: cambios, archivo: archivo });
}

/* ── La tabla ──────────────────────────────────────────────────────────── */

function contSimil(a, b){ return (typeof castSimil === 'function') ? castSimil(a, b) : (a === b ? 1 : 0); }

/**
 * La tabla de continuidad de un programa, a partir de lo leído
 * (`datos.episodios`, por número) y lo escrito a mano (`datos.fichas`, por
 * cue; `alias` junta un cue con otro). Devuelve
 * `{ eps, filas, incidentales, alertas, porEp, fuentes, detalle }`.
 */
function contTabla(datos){
  const episodios = (datos && datos.episodios) || {}, fichas = (datos && datos.fichas) || {};
  const eps = Object.keys(episodios).map(Number).filter(isFinite).sort((a, b) => a - b);
  const destino = (cue) => { let c = cue, n = 0; while(fichas[c] && fichas[c].alias && fichas[c].alias !== c && n++ < 5) c = fichas[c].alias; return c; };
  const por = {};
  for(const n of eps){
    const pers = episodios[n].personajes || {};
    for(const cue0 of Object.keys(pers)){
      const cue = destino(cue0), x = pers[cue0];
      const r = (por[cue] = por[cue] || { cue: cue, alias: [], porEp: {} });
      if(cue0 !== cue && r.alias.indexOf(cue0) < 0) r.alias.push(cue0);
      const e = (r.porEp[n] = r.porEp[n] || { intervenciones: 0, reacciones: 0, off: 0, canciones: 0, otroIdioma: 0, palabras: 0, palabrasOtro: 0, primerTC: '', ultimoTC: '' });
      for(const k of ['intervenciones', 'reacciones', 'off', 'canciones', 'otroIdioma', 'palabras', 'palabrasOtro']) e[k] += +x[k] || 0;
      if(x.primerTC && (!e.primerTC || x.primerTC < e.primerTC)) e.primerTC = x.primerTC;
      if(x.ultimoTC && (!e.ultimoTC || x.ultimoTC > e.ultimoTC)) e.ultimoTC = x.ultimoTC;
    }
  }
  const todos = Object.keys(por).map(k => por[k]);
  for(const r of todos){
    const ns = Object.keys(r.porEp).map(Number).sort((a, b) => a - b);
    r.eps = ns; r.nEps = ns.length; r.debut = ns[0]; r.ultima = ns[ns.length - 1];
    r.total = ns.reduce((s, n) => s + r.porEp[n].intervenciones, 0);
    r.palabras = ns.reduce((s, n) => s + r.porEp[n].palabras, 0);
    r.palabrasOtro = ns.reduce((s, n) => s + r.porEp[n].palabrasOtro, 0);
    r.canciones = ns.reduce((s, n) => s + r.porEp[n].canciones, 0);
    for(const n of ns) r.porEp[n].tipo = (r.porEp[n].off === r.porEp[n].intervenciones) ? 'voz' : 'escena';
    r.incidental = contEsIncidental(r.cue);
  }
  /* La categoría propuesta; la escrita a mano manda. */
  const N = eps.length;
  const conNombre = todos.filter(r => !r.incidental).sort((a, b) => (b.total - a.total) || a.cue.localeCompare(b.cue, 'es'));
  conNombre.forEach((r, i) => {
    let cat;
    if(N >= 2) cat = (r.nEps === N && i < 4) ? 'Protagonista' : ((r.nEps >= Math.max(2, Math.ceil(N / 2)) && r.total >= 100) ? 'Principal' : (r.nEps >= 2 ? 'Recurrente' : 'Invitado'));
    else cat = i < 4 ? 'Protagonista' : (r.total >= 30 ? 'Principal' : 'Invitado');
    r.categoriaAuto = cat;
  });
  for(const r of todos){
    if(r.incidental) r.categoriaAuto = 'Incidental';
    const f = fichas[r.cue] || {};
    r.categoria = CONT_CATEGORIAS.indexOf(f.categoria) >= 0 ? f.categoria : r.categoriaAuto;
    r.personaje = f.personaje || '';
    r.descripcion = f.descripcion || '';
    r.idiomas = f.idiomas || (r.palabrasOtro ? 'Original; ' + r.palabrasOtro + ' palabras en otro idioma' : '');
    r.idiomasAuto = !f.idiomas;
    r.notas = f.notas || '';
    r.showGuide = f.showGuide || '';
  }
  const orden = (a, b) => (CONT_CATEGORIAS.indexOf(a.categoria) - CONT_CATEGORIAS.indexOf(b.categoria)) || (b.total - a.total) || a.cue.localeCompare(b.cue, 'es');
  const filas = todos.filter(r => r.categoria !== 'Incidental').sort(orden);
  const incidentales = todos.filter(r => r.categoria === 'Incidental').sort((a, b) => (a.debut - b.debut) || (b.total - a.total) || a.cue.localeCompare(b.cue, 'es'));

  /* Alertas. */
  const alertas = [];
  const epTxt = (ns) => ns.map(n => 'EP' + n).join(', ');
  // 1) episodios que faltan
  if(N >= 2){
    const faltan = [];
    for(let n = eps[0] + 1; n < eps[N - 1]; n++) if(eps.indexOf(n) < 0) faltan.push(n);
    if(faltan.length) alertas.push({ tipo: 'Episodios sin libreto', donde: epTxt(faltan), detalle: 'No se ha subido el libreto de ' + epTxt(faltan) + ': la continuidad de esos episodios no está.', accion: 'Subir el dialogue list que falta.' });
  }
  // 2) cues que parecen el mismo personaje y nunca coinciden en un episodio
  for(let i = 0; i < conNombre.length; i++) for(let j = i + 1; j < conNombre.length; j++){
    const a = conNombre[i], b = conNombre[j];
    if(a.eps.some(n => b.eps.indexOf(n) >= 0)) continue;
    const pa = a.cue.replace(/[^A-Z0-9]/g, ''), pb = b.cue.replace(/[^A-Z0-9]/g, '');
    const casi = (pa.length >= 4 && pb.length >= 4) && (contSimil(pa, pb) >= 0.83 || ((pa.indexOf(pb) === 0 || pb.indexOf(pa) === 0) && Math.abs(pa.length - pb.length) <= 2));
    if(!casi) continue;
    const queda = a.total >= b.total ? a : b, otro = queda === a ? b : a;
    alertas.push({ tipo: 'Normalización de cue', donde: epTxt(otro.eps), detalle: otro.cue + ' (' + epTxt(otro.eps) + ', ' + otro.total + ' cues) parece el mismo personaje que ' + queda.cue + ' (' + epTxt(queda.eps) + ').', accion: 'Usar ' + queda.cue + ' en el cueing y en el libreto.', juntar: { de: otro.cue, a: queda.cue } });
  }
  // 3) entre versiones (Change List): un cue que ya no está es un cambio de nombre; si sigue, son líneas que cambiaron de personaje
  for(const n of eps){
    const pers = episodios[n].personajes || {}, reas = [];
    for(const c of (episodios[n].cambiosNombre || [])){
      if(!pers[c.de]) alertas.push({ tipo: 'Cambio de nombre entre versiones', donde: 'EP' + n + (c.tc ? ' · ' + String(c.tc).slice(0, 8) : ''), detalle: c.de + ' pasó a llamarse ' + c.a + ' en la versión nueva (' + c.n + ' cue' + (c.n === 1 ? '' : 's') + ').', accion: 'Usar ' + c.a + ' en el cueing y en el libreto.' });
      else reas.push(c);
    }
    if(reas.length) alertas.push({ tipo: 'Líneas que cambiaron de personaje', donde: 'EP' + n, detalle: reas.map(c => c.de + ' → ' + c.a + (c.tc ? ' (' + String(c.tc).slice(0, 8) + ')' : '') + (c.n > 1 ? ' ×' + c.n : '')).join(', ') + '.', accion: 'Comprobar contra la imagen que ahora están bien atribuidas.' });
  }
  // 4) ausencias de personajes con peso
  for(const r of filas){
    if(r.nEps < 3) continue;
    const huecos = eps.filter(n => n > r.debut && n < r.ultima && r.eps.indexOf(n) < 0);
    if(huecos.length) alertas.push({ tipo: 'Ausencia', donde: epTxt(huecos), detalle: r.cue + ' no aparece en ' + epTxt(huecos) + ' (sí antes y después).', accion: 'Tenerlo en cuenta para el plan de convocatorias.' });
  }
  // 5) episodios en los que solo se le oye
  for(const r of filas){
    const voz = r.eps.filter(n => r.porEp[n].tipo === 'voz');
    if(voz.length) alertas.push({ tipo: 'Solo voz (OFF)', donde: epTxt(voz), detalle: r.cue + ': en ' + epTxt(voz) + ' todas sus intervenciones son OFF (voz, teléfono, flashback o archivo).', accion: 'Misma voz de doblaje que en el resto.' });
  }
  // 6) canciones
  const cantan = todos.filter(r => r.canciones);
  if(cantan.length) alertas.push({ tipo: 'Canciones', donde: epTxt(Array.from(new Set([].concat.apply([], cantan.map(r => r.eps.filter(n => r.porEp[n].canciones))))).sort((a, b) => a - b)), detalle: cantan.map(r => r.cue + ' (' + r.canciones + ' cue' + (r.canciones === 1 ? '' : 's') + ' de canción)').join(', ') + '.', accion: 'Definir con el cliente si se canta o se deja en original.' });
  // 7) diálogo en otros idiomas
  const otros = todos.filter(r => r.palabrasOtro).sort((a, b) => b.palabrasOtro - a.palabrasOtro);
  if(otros.length) alertas.push({ tipo: 'Diálogo en otros idiomas', donde: 'Todos', detalle: 'Con FOREIGN DIALOG: ' + otros.slice(0, 8).map(r => r.cue + ' (' + r.palabrasOtro + ' palabras)').join(', ') + (otros.length > 8 ? '…' : '') + '.', accion: 'Confirmar con el cliente el tratamiento del FOREIGN DIALOG antes del casting.' });

  /* Cuántos con nombre e incidentales por episodio. */
  const porEp = {};
  for(const n of eps) porEp[n] = { conNombre: filas.filter(r => r.porEp[n]).length, incidentales: incidentales.filter(r => r.porEp[n]).length };
  const fuentes = eps.map(n => ({ ep: n, archivo: episodios[n].archivo, version: episodios[n].version, fecha: episodios[n].fecha }));
  const detalle = [];
  for(const n of eps) for(const r of filas.concat(incidentales).filter(x => x.porEp[n]).sort((a, b) => b.porEp[n].intervenciones - a.porEp[n].intervenciones)){
    const e = r.porEp[n];
    detalle.push({ ep: n, cue: r.cue, personaje: r.personaje, categoria: r.categoria, tipo: e.tipo === 'voz' ? 'Solo voz (OFF)' : 'En escena', intervenciones: e.intervenciones, reacciones: e.reacciones, palabras: e.palabras, palabrasOtro: e.palabrasOtro, primerTC: e.primerTC, ultimoTC: e.ultimoTC });
  }
  return { eps: eps, filas: filas, incidentales: incidentales, alertas: alertas, porEp: porEp, fuentes: fuentes, detalle: detalle };
}

/** La sugerencia de reparto para un incidental: con peso, reparto adicional; si no, loop group. */
function contSugerencia(r){ return (r.total >= 10 || r.palabras >= 40) ? 'Reparto adicional (texto con peso)' : 'Loop group / reparto adicional'; }

/* ── Guardar y cargar, con el programa ─────────────────────────────────── */

function contRuta(showId){ return showId + '/continuidad.json'; }

async function contCargar(showId){
  try{ const c = await idbGet('ddl-cont::' + showId); if(c && c.datos) return c.datos; }catch(e){ /* sin copia en el equipo */ }
  try{
    const r = await sb.storage.from('libretos').download(contRuta(showId));
    if(r && r.data){ const d = JSON.parse(await r.data.text()); try{ await idbSet('ddl-cont::' + showId, { datos: d, ts: Date.now() }); }catch(e){ /* sin copia */ } return d; }
  }catch(e){ /* sin nube: vacío */ }
  return { episodios: {}, fichas: {} };
}

async function contGuardar(showId, datos){
  datos.ts = Date.now();
  try{ await idbSet('ddl-cont::' + showId, { datos: datos, ts: datos.ts }); }catch(e){ /* sin copia en el equipo */ }
  try{
    const r = await sb.storage.from('libretos').upload(contRuta(showId), new Blob([JSON.stringify(datos)], { type: 'application/json' }), { upsert: true });
    return !(r && r.error);
  }catch(e){ return false; }
}

/** Lo de un programa, ya cargado; si aún no, se pide y se repinta al llegar. */
function contDe(show){
  if(!show) return null;
  const k = String(show.id);
  if(CONT.datos[k]) return CONT.datos[k];
  if(!CONT.cargando[k]){
    CONT.cargando[k] = true;
    contCargar(show.id).then(d => { CONT.datos[k] = d || { episodios: {}, fichas: {} }; CONT.cargando[k] = false; if(typeof csRepintar === 'function') csRepintar(); })
      .catch(() => { CONT.datos[k] = { episodios: {}, fichas: {} }; CONT.cargando[k] = false; });
  }
  return null;
}

/** Sube uno o varios dialogue lists: cada uno, a su episodio (el mismo episodio otra vez, lo pisa). */
async function contSubir(show, archivos){
  if(!show || !archivos || !archivos.length) return { hechos: [], fallos: [] };
  const datos = CONT.datos[String(show.id)] || await contCargar(show.id);
  datos.episodios = datos.episodios || {}; datos.fichas = datos.fichas || {};
  const hechos = [], fallos = [];
  for(const f of Array.from(archivos)){
    try{
      const libro = XLSX.read(new Uint8Array(await f.arrayBuffer()), { type: 'array' });
      const ep = contDeLibro(libro, f.name);
      if(!ep.ep) throw new Error('no se sabe de qué episodio es');
      if(!Object.keys(ep.personajes).length) throw new Error('no trae ningún personaje');
      datos.episodios[ep.ep] = ep;
      hechos.push('EP' + ep.ep);
    }catch(e){ fallos.push(f.name + ': ' + ((e && e.message) || e)); }
  }
  CONT.datos[String(show.id)] = datos;
  const ok = hechos.length ? await contGuardar(show.id, datos) : true;
  castAviso((hechos.length ? 'Continuidades: ' + hechos.join(', ') + ' leído' + (hechos.length === 1 ? '' : 's') : 'No se leyó ningún libreto')
    + (fallos.length ? ' · no se pudo: ' + fallos.join('; ') : '') + (ok ? '' : ' · guardado solo en este equipo: no se pudo subir a la nube'));
  if(typeof csRepintar === 'function') csRepintar();
  return { hechos: hechos, fallos: fallos };
}

/** Lo que se escribe a mano de un personaje: nombre, categoría, descripción, idiomas, notas, o juntarlo con otro cue. */
async function contFicha(show, cue, campo, valor){
  const datos = CONT.datos[String(show.id)];
  if(!datos || !cue) return false;
  datos.fichas = datos.fichas || {};
  const f = (datos.fichas[cue] = datos.fichas[cue] || {});
  const v = String(valor == null ? '' : valor).trim();
  if(v) f[campo] = v; else delete f[campo];
  if(!Object.keys(f).length) delete datos.fichas[cue];
  await contGuardar(show.id, datos);
  if(typeof csRepintar === 'function') csRepintar();
  return true;
}

async function contQuitarEp(show, n){
  const datos = CONT.datos[String(show.id)];
  if(!datos || !datos.episodios || !datos.episodios[n]) return false;
  delete datos.episodios[n];
  await contGuardar(show.id, datos);
  if(typeof csRepintar === 'function') csRepintar();
  return true;
}

/* ── Lo que se pinta ───────────────────────────────────────────────────── */

function contEsc(s){ return (typeof csEsc === 'function') ? csEsc(s) : String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); }
function contIco(n, t){ return (typeof csIco === 'function') ? csIco(n, t) : ''; }

/** La pestaña «Continuidades original» de un programa. */
function contHtml(p){
  if(!p.show) return '<div class="cs-nada">Para las continuidades, el programa tiene que estar en Dubbipt: créalo con «Crear en Dubbipt» y vuelve aquí.</div>';
  const datos = contDe(p.show);
  if(!datos) return '<div class="cs-nada">Cargando las continuidades…</div>';
  const t = contTabla(datos);
  const subir = '<button class="cs-b cs-pri" data-ct="subir">' + contIco('subir', 14) + '<span>Subir libretos en original</span></button>';
  const cab = '<div class="cs-cast-cab ct-cab"><span>' + (t.eps.length ? t.eps.length + ' episodio' + (t.eps.length === 1 ? '' : 's') + ' leído' + (t.eps.length === 1 ? '' : 's') + ': ' : 'Sube el dialogue list en original de cada episodio (.xlsx de Netflix). Puedes subir varios a la vez.') + '</span>'
    + t.fuentes.map(f => '<span class="ct-ep" title="' + contEsc(f.archivo) + '">EP' + f.ep + (f.version ? ' · ' + contEsc(f.version) : '') + '<button class="ct-x" data-ct="quitarEp" data-v="' + f.ep + '" title="Quitar este episodio">' + contIco('cerrar', 11) + '</button></span>').join('')
    + '<span class="ct-bots">' + subir + (t.eps.length ? '<button class="cs-b" data-ct="excel">' + contIco('bajar', 14) + '<span>Descargar Excel</span></button>' : '') + '</span></div>';
  if(!t.eps.length) return cab;
  const leyenda = '<div class="ct-leyenda"><span class="ct-cel ct-escena">12</span> Aparece en escena <span class="ct-cel ct-voz">12</span> Solo voz (OFF): teléfono, flashback, archivo</div>';
  const celdas = (r) => t.eps.map(n => r.porEp[n] ? '<td class="ct-cel ct-' + r.porEp[n].tipo + '">' + r.porEp[n].intervenciones + '</td>' : '<td class="ct-cel"></td>').join('');
  const opc = (r) => '<select data-ct="ficha" data-cue="' + contEsc(r.cue) + '" data-campo="categoria">' + CONT_CATEGORIAS.map(c => '<option' + (c === r.categoria ? ' selected' : '') + '>' + c + '</option>').join('') + '</select>';
  const entrada = (r, campo, valor, ph) => '<input type="text" data-ct="ficha" data-cue="' + contEsc(r.cue) + '" data-campo="' + campo + '" value="' + contEsc(valor) + '" placeholder="' + contEsc(ph) + '">';
  const tabla = '<div class="ct-envoltura"><table class="ct-tabla"><thead><tr><th>#</th><th>Cue</th><th>Personaje</th><th>Categoría</th><th>Descripción</th><th>Idioma(s)</th>'
    + t.eps.map(n => '<th>EP' + n + '</th>').join('') + '<th>Nº ep.</th><th>Debut</th><th>Última</th><th>Interv.</th><th>Palabras</th><th>Notas de continuidad</th></tr></thead><tbody>'
    + t.filas.map((r, i) => '<tr><td class="ct-n">' + (i + 1) + '</td><td class="ct-cue"><b>' + contEsc(r.cue) + '</b>' + (r.alias.length ? '<small>también ' + contEsc(r.alias.join(', ')) + '</small>' : '') + '</td>'
        + '<td>' + entrada(r, 'personaje', r.personaje, 'Nombre completo') + '</td><td class="ct-cat-' + r.categoria.toLowerCase() + '">' + opc(r) + '</td>'
        + '<td>' + entrada(r, 'descripcion', r.descripcion, 'Quién es (del guion)') + '</td><td>' + entrada(r, 'idiomas', r.idiomasAuto ? '' : r.idiomas, r.idiomas || 'Idioma(s) / habla') + '</td>'
        + celdas(r) + '<td class="ct-num">' + r.nEps + '</td><td class="ct-num">EP' + r.debut + '</td><td class="ct-num">EP' + r.ultima + '</td><td class="ct-num"><b>' + r.total + '</b></td><td class="ct-num">' + r.palabras + '</td>'
        + '<td>' + entrada(r, 'notas', r.notas, 'Apodos, muertes, relaciones…') + '</td></tr>').join('')
    + '<tr class="ct-resumen"><td></td><td colspan="5">Personajes con nombre por episodio</td>' + t.eps.map(n => '<td class="ct-num">' + t.porEp[n].conNombre + '</td>').join('') + '<td colspan="6"></td></tr>'
    + '<tr class="ct-resumen"><td></td><td colspan="5">Incidentales por episodio</td>' + t.eps.map(n => '<td class="ct-num">' + t.porEp[n].incidentales + '</td>').join('') + '<td colspan="6"></td></tr>'
    + '</tbody></table></div>';
  const alertas = '<div class="cs-caja cs-caja-hist"><div class="cs-caja-t">' + contIco('aviso', 14) + 'Alertas y notas (' + t.alertas.length + ')</div>'
    + (t.alertas.length ? t.alertas.map(a => '<div class="cs-linea ct-alerta"><span class="cs-linea-t"><b>' + contEsc(a.tipo) + '</b> · ' + contEsc(a.donde) + ' — ' + contEsc(a.detalle) + ' <i class="cs-tenue">' + contEsc(a.accion) + '</i></span>'
        + (a.juntar ? '<button class="cs-b" data-ct="juntar" data-de="' + contEsc(a.juntar.de) + '" data-a="' + contEsc(a.juntar.a) + '">Juntar con ' + contEsc(a.juntar.a) + '</button>' : '') + '</div>').join('')
      : '<div class="cs-nada">Nada que revisar.</div>') + '</div>';
  const inc = '<details class="ct-mas"><summary>Incidentales (' + t.incidentales.length + ')</summary><div class="ct-envoltura"><table class="ct-tabla"><thead><tr><th>Debut</th><th>Cue</th><th>Descripción</th><th>Episodios</th><th>Interv.</th><th>Palabras</th><th>Sugerencia de reparto</th></tr></thead><tbody>'
    + t.incidentales.map(r => '<tr><td class="ct-num">EP' + r.debut + '</td><td class="ct-cue"><b>' + contEsc(r.cue) + '</b></td><td>' + entrada(r, 'descripcion', r.descripcion, 'Quién es') + '</td><td>' + r.eps.map(n => 'EP' + n).join(', ') + '</td><td class="ct-num">' + r.total + '</td><td class="ct-num">' + r.palabras + '</td><td>' + contEsc(contSugerencia(r)) + '</td></tr>').join('')
    + '</tbody></table></div></details>';
  return cab + leyenda + tabla + alertas + inc;
}

/** Engancha los controles de la pestaña. `p`: el programa que se mira. */
function contCablear(raiz, p){
  if(!raiz || !p || !p.show) return;
  raiz.querySelectorAll('[data-ct]').forEach(el => {
    const que = el.getAttribute('data-ct'), at = (k) => el.getAttribute('data-' + k);
    if(que === 'subir') el.onclick = () => {
      const i = document.createElement('input');
      i.type = 'file'; i.multiple = true; i.accept = '.xlsx,.xls';
      i.onchange = () => { if(i.files && i.files.length) contSubir(p.show, i.files).catch(e => fallo('contSubir · js/continuidad.js', e, 'los libretos no se han podido leer')); };
      i.click();
    };
    else if(que === 'excel') el.onclick = () => contDescargar(p);
    else if(que === 'quitarEp') el.onclick = () => { contQuitarEp(p.show, at('v')).catch(e => fallo('contQuitarEp · js/continuidad.js', e)); };
    else if(que === 'ficha') el.onchange = () => { contFicha(p.show, at('cue'), at('campo'), el.value).catch(e => fallo('contFicha · js/continuidad.js', e, 'no se ha podido guardar')); };
    else if(que === 'juntar') el.onclick = () => { contFicha(p.show, at('de'), 'alias', at('a')).catch(e => fallo('contFicha · js/continuidad.js', e, 'no se ha podido juntar')); };
  });
}

/* ── El Excel, con sus hojas y sus colores ─────────────────────────────── */

const CONT_ESTILO = { normal: 0, titulo: 1, cab: 2, escena: 3, voz: 4, fino: 5, negrita: 6, protagonista: 7, principal: 8, recurrente: 9, invitado: 10, incidental: 11 };

function contXmlEsc(s){ return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ''); }
function contColLetra(i){ let s = ''; i++; while(i > 0){ const m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }

/** Una hoja: filas de celdas {v, s} (o valores sueltos), anchos y lo combinado. */
function contHojaXml(h){
  const filas = h.filas.map((f, ri) => '<row r="' + (ri + 1) + '">' + f.map((c, ci) => {
    if(c == null || c === '') return '';
    const cel = (typeof c === 'object') ? c : { v: c }, ref = contColLetra(ci) + (ri + 1), s = cel.s ? ' s="' + cel.s + '"' : '';
    if(cel.v === '' || cel.v == null) return cel.s ? '<c r="' + ref + '"' + s + '/>' : '';
    return (typeof cel.v === 'number') ? '<c r="' + ref + '"' + s + '><v>' + cel.v + '</v></c>' : '<c r="' + ref + '"' + s + ' t="inlineStr"><is><t xml:space="preserve">' + contXmlEsc(cel.v) + '</t></is></c>';
  }).join('') + '</row>').join('');
  const cols = (h.anchos || []).length ? '<cols>' + h.anchos.map((w, i) => '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>').join('') + '</cols>' : '';
  const fijo = h.fijar ? '<sheetViews><sheetView workbookViewId="0"><pane xSplit="' + h.fijar[0] + '" ySplit="' + h.fijar[1] + '" topLeftCell="' + contColLetra(h.fijar[0]) + (h.fijar[1] + 1) + '" activePane="bottomRight" state="frozen"/></sheetView></sheetViews>' : '';
  const comb = (h.combinar || []).length ? '<mergeCells count="' + h.combinar.length + '">' + h.combinar.map(m => '<mergeCell ref="' + m + '"/>').join('') + '</mergeCells>' : '';
  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' + fijo + cols + '<sheetData>' + filas + '</sheetData>' + comb + '</worksheet>';
}

const CONT_ESTILOS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<fonts count="5"><font><sz val="10"/><name val="Calibri"/></font><font><b/><sz val="14"/><color rgb="FF1F3864"/><name val="Calibri"/></font><font><b/><sz val="10"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font><font><sz val="9"/><color rgb="FF595959"/><name val="Calibri"/></font><font><b/><sz val="10"/><name val="Calibri"/></font></fonts>'
  + '<fills count="10"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + ['FF1F3864', 'FFC6EFCE', 'FFFFE699', 'FFFCE4D6', 'FFFFF2CC', 'FFE2EFDA', 'FFEDEDED', 'FFF2F2F2'].map(c => '<fill><patternFill patternType="solid"><fgColor rgb="' + c + '"/><bgColor indexed="64"/></patternFill></fill>').join('') + '</fills>'
  + '<borders count="2"><border/><border><left style="thin"><color rgb="FFD9D9D9"/></left><right style="thin"><color rgb="FFD9D9D9"/></right><top style="thin"><color rgb="FFD9D9D9"/></top><bottom style="thin"><color rgb="FFD9D9D9"/></bottom></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="12">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="1" applyBorder="1"><alignment vertical="top" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="1" fillId="0" borderId="0" applyFont="1"/>'
  + '<xf numFmtId="0" fontId="2" fillId="2" borderId="1" applyFont="1" applyFill="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>'
  + '<xf numFmtId="0" fontId="4" fillId="3" borderId="1" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf>'
  + '<xf numFmtId="0" fontId="4" fillId="4" borderId="1" applyFont="1" applyFill="1"><alignment horizontal="center"/></xf>'
  + '<xf numFmtId="0" fontId="3" fillId="0" borderId="0" applyFont="1"><alignment wrapText="1" vertical="top"/></xf>'
  + '<xf numFmtId="0" fontId="4" fillId="0" borderId="1" applyFont="1"><alignment vertical="top"/></xf>'
  + [5, 6, 7, 8, 9].map(f => '<xf numFmtId="0" fontId="0" fillId="' + f + '" borderId="1" applyFill="1"><alignment vertical="top"/></xf>').join('')
  + '</cellXfs></styleSheet>';

/** El Excel entero de un programa, como la tabla de sala: cinco hojas. Devuelve los bytes del .xlsx. */
function contXlsx(t, programa){
  const E = CONT_ESTILO, cab = (l) => l.map(v => ({ v: v, s: E.cab }));
  const catEst = (c) => E[String(c || '').toLowerCase()] || E.normal;
  const epsCab = t.eps.map(n => 'EP' + n);
  const cont = [
    [{ v: (programa || 'Programa') + ' · Tabla de continuidad de personajes' + (t.eps.length ? ' (EP' + t.eps[0] + (t.eps.length > 1 ? '–EP' + t.eps[t.eps.length - 1] : '') + ')' : ''), s: E.titulo }],
    [{ v: 'Fuente: dialogue lists en original (' + t.fuentes.map(f => 'EP' + f.ep + (f.version ? ' ' + f.version : '')).join(', ') + '). Las celdas EP muestran el número de intervenciones (cues) del personaje. Hecha con Dubbipt.', s: E.fino }],
    [{ v: 'Leyenda:', s: E.fino }, '', { v: 'Aparece en escena', s: E.escena }, '', '', { v: 'Solo voz (OFF): teléfono, flashback, archivo', s: E.voz }],
    [],
    cab(['#', 'Cue', 'Personaje', 'Categoría', 'Descripción', 'Idioma(s) / habla'].concat(epsCab, ['Nº de episodios', 'Debut', 'Última aparición', 'Total intervenciones', 'Total palabras', 'Notas de continuidad']))
  ];
  t.filas.forEach((r, i) => cont.push([i + 1, { v: r.cue, s: E.negrita }, r.personaje, { v: r.categoria, s: catEst(r.categoria) }, r.descripcion, r.idiomas]
    .concat(t.eps.map(n => r.porEp[n] ? { v: r.porEp[n].intervenciones, s: r.porEp[n].tipo === 'voz' ? E.voz : E.escena } : { v: '', s: E.normal }),
            [r.nEps, 'EP' + r.debut, 'EP' + r.ultima, r.total, r.palabras, r.notas + (r.alias.length ? (r.notas ? ' ' : '') + '(También como ' + r.alias.join(', ') + '.)' : '')])));
  cont.push(['', '', { v: 'Personajes con nombre por episodio', s: E.negrita }, '', '', ''].concat(t.eps.map(n => t.porEp[n].conNombre)));
  cont.push(['', '', { v: 'Incidentales por episodio', s: E.negrita }, '', '', ''].concat(t.eps.map(n => t.porEp[n].incidentales)));
  const nCol = 12 + t.eps.length;
  const inc = [cab(['Episodio', 'Cue', 'Descripción', 'Intervenciones', 'Palabras', 'Sugerencia de reparto'])];
  for(const r of t.incidentales) for(const n of r.eps) inc.push(['EP' + n, { v: r.cue, s: E.negrita }, r.descripcion, r.porEp[n].intervenciones, r.porEp[n].palabras, contSugerencia(r)]);
  const ale = [cab(['#', 'Tipo', 'Episodio / TC', 'Detalle', 'Acción sugerida'])].concat(t.alertas.map((a, i) => [i + 1, { v: a.tipo, s: E.negrita }, a.donde, a.detalle, a.accion]));
  const fue = [cab(['Archivo', 'Episodio', 'Versión / fecha', 'Uso'])].concat(t.fuentes.map(f => [f.archivo, 'EP' + f.ep, [f.version, f.fecha].filter(Boolean).join(' · '), 'Cues, intervenciones, TCs, palabras, etiquetas']),
    [[], [{ v: 'Criterios', s: E.negrita }],
     ['Intervenciones = número de eventos (cues) del personaje en el Dialogue List, incluidos los [REACTION]. No se cuentan WALLA, GRAPHICS INSERTS, PRINCIPAL PHOTOGRAPHY ni MAIN TITLE.'],
     ['Palabras = TOTAL WORD COUNT BY CHARACTER de la hoja Word Count Summary de cada dialogue list.'],
     ['Solo voz = en ese episodio todas sus intervenciones son OFF.'],
     ['Categoría propuesta: Protagonista (en todos los episodios y entre los 4 con más intervenciones), Principal (en la mitad o más), Recurrente (2 o más), Invitado (1, con nombre), Incidental (genérico o numerado). La escrita a mano manda.']]);
  const det = [cab(['Episodio', 'Cue (dialog list)', 'Personaje', 'Categoría', 'Tipo de aparición', 'Intervenciones', 'Solo [REACTION]', 'Palabras (total)', 'Palabras en otro idioma', 'Primer TC', 'Último TC'])]
    .concat(t.detalle.map(x => ['EP' + x.ep, { v: x.cue, s: E.negrita }, x.personaje, { v: x.categoria, s: catEst(x.categoria) }, x.tipo, x.intervenciones, x.reacciones, x.palabras, x.palabrasOtro, x.primerTC, x.ultimoTC]));
  const hojas = [
    { nombre: 'Continuidad', filas: cont, anchos: [4, 18, 22, 13, 50, 24].concat(t.eps.map(() => 6), [10, 9, 10, 12, 10, 48]), fijar: [3, 5], combinar: ['A1:' + contColLetra(nCol - 1) + '1', 'A2:' + contColLetra(nCol - 1) + '2'] },
    { nombre: 'Incidentales', filas: inc, anchos: [9, 26, 50, 13, 10, 32], fijar: [0, 1] },
    { nombre: 'Alertas y notas', filas: ale, anchos: [4, 28, 18, 80, 48], fijar: [0, 1] },
    { nombre: 'Fuentes', filas: fue, anchos: [70, 9, 34, 44] },
    { nombre: 'Detalle por episodio', filas: det, anchos: [9, 24, 22, 13, 18, 13, 13, 13, 13, 12, 12], fijar: [2, 1] }
  ];
  const u = (s) => fflate.strToU8(s);
  const arch = {
    '[Content_Types].xml': u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
      + hojas.map((h, i) => '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>').join('') + '</Types>'),
    '_rels/.rels': u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'),
    'xl/workbook.xml': u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>'
      + hojas.map((h, i) => '<sheet name="' + contXmlEsc(h.nombre) + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>').join('') + '</sheets></workbook>'),
    'xl/_rels/workbook.xml.rels': u('<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
      + hojas.map((h, i) => '<Relationship Id="rId' + (i + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>').join('')
      + '<Relationship Id="rId' + (hojas.length + 1) + '" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'),
    'xl/styles.xml': u(CONT_ESTILOS_XML)
  };
  hojas.forEach((h, i) => { arch['xl/worksheets/sheet' + (i + 1) + '.xml'] = u(contHojaXml(h)); });
  return fflate.zipSync(arch, { level: 6 });
}

function contDescargar(p){
  const datos = p && p.show && CONT.datos[String(p.show.id)];
  if(!datos) return false;
  const t = contTabla(datos);
  const nombre = String(p.nombre || 'Programa').replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, '_');
  ioDescargar(nombre + '_Continuidad_Personajes' + (t.eps.length ? '_EP' + t.eps[0] + (t.eps.length > 1 ? '-EP' + t.eps[t.eps.length - 1] : '') : '') + '.xlsx',
              contXlsx(t, p.nombre), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  return true;
}

/* ═══ FIN DE CONTINUIDADES ORIGINAL ═══ */
