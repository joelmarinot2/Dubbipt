/* DublajeCast entero, dentro de Dubbipt · especificacion 09, PRO-9 y PRO-10
 *
 * Pedido de sala: «quiero traer prácticamente toda la plataforma: que cuando
 * le dé al botón de DublajeCast me abra todas las funciones del programa, y
 * que dentro de los programas estén las herramientas de Dubbipt también».
 *
 * DublajeCast vive copiado en `dublajecast/` (lo trae `local/traer-dublajecast.js`)
 * y aquí se abre a pantalla completa, en un marco del mismo sitio. Su barra
 * «Herramientas de Dubbipt» (`dublajecast/puente.js`) pide cosas con un
 * mensaje; aquí se atienden: abrir el programa o un capítulo en el perfil
 * elegido, crearlo si no existe, la base de talentos, la caja de herramientas
 * y el resumen de Producción.
 *
 * Quién lo ve: lo mismo que Producción (PRO-8), el administrador en el perfil
 * Casting.
 *
 * Es un script clásico, no un módulo: comparte el ámbito global con los
 * <script> en línea de index.html y se carga después de ellos.
 *
 * De donde depende: prodPuede, prodCasarPrograma, prodPanel, PROD_SIN_PERMISO,
 * castNorm, castAviso, sbShows, sbEps, LDB, libView, renderLibrary,
 * precacheShowData, updateBackBtn, refreshTopbar, ponerModo, openEpisode,
 * newShow, talPanel, herramientasPanel, fallo.
 */

/* ═══ DUBLAJECAST ENTERO ════════════════════════════════════════════════════ */

const DCAST = { ruta: './dublajecast/index.html', ov: null, marco: null, pendiente: null };
const DCAST_PERFILES = ['casting', 'qc', 'grabacion'];

/**
 * El capítulo de Dubbipt que corresponde a uno de DublajeCast: primero por
 * título igual; si no, por número, cuando solo un capítulo lleva ese número en
 * el nombre («Episodio 2», «E02», «2 - La boda»). Si hay duda, ninguno.
 */
function dcastCasarCapitulo(numero, titulo, eps){
  const lista = eps || [];
  const t = castNorm(titulo);
  if(t){
    const igual = lista.filter(e => castNorm(e.name) === t);
    if(igual.length === 1) return igual[0];
  }
  const n = parseInt(numero, 10);              // si no es número da NaN, que no casa con nada
  const conNumero = lista.filter(e => (String(e.name || '').match(/\d+/g) || []).some(x => parseInt(x, 10) === n));
  return conNumero.length === 1 ? conNumero[0] : null;
}

/** ¿El mensaje viene de verdad de la DublajeCast que abrimos? Mismo sitio, nuestro marco, y con su firma. */
function dcastMensajeValido(e, marco, origen){
  const o = (origen !== undefined) ? origen : location.origin;
  const d = e && e.data;
  return !!(e && marco && e.origin === o && e.source === marco.contentWindow
            && d && typeof d === 'object' && d.fuente === 'dublajecast' && typeof d.accion === 'string');
}

/** Contesta a la barra de DublajeCast. */
function dcastResponder(datos){
  try{
    if(DCAST.marco && DCAST.marco.contentWindow)
      DCAST.marco.contentWindow.postMessage(Object.assign({ fuente: 'dubbipt' }, datos), location.origin);
  }catch(e){ fallo('dcastResponder · js/dublajecast.js', e); }
}

/** El programa de Dubbipt que corresponde a uno de DublajeCast, o nulo. */
function dcastPrograma(nombre){
  return prodCasarPrograma(nombre, (typeof sbShows === 'function') ? sbShows() : []);
}

/** Lleva Dubbipt a un programa: su lista de capítulos. */
function dcastIrAPrograma(show){
  dcastCerrar();
  try{ document.body.classList.remove('ep-open'); }catch(e){ /* sin clase que quitar */ }
  LDB.browse = true; LDB.showId = show.id; libView = 'eps';
  try{ renderLibrary(); }catch(e){ fallo('renderLibrary · js/dublajecast.js:dcastIrAPrograma', e); }
  try{ precacheShowData(show.id); }catch(e){ /* sin precarga se abre igual, algo más lento */ }
  try{ updateBackBtn(); refreshTopbar(); }catch(e){ /* la barra se repinta en el siguiente paso */ }
}

/**
 * Atiende lo que pide la barra. Devuelve qué se hizo, en una palabra, para
 * poder probarlo: 'estado', 'programa', 'capitulo', 'falta', 'crear',
 * 'talentos', 'herramientas', 'produccion', 'permiso' o 'nada'.
 */
async function dcastAtender(d){
  const programa = String(d.programa || '');
  if(!prodPuede()){
    dcastResponder({ tipo: 'aviso', programa: programa, texto: PROD_SIN_PERMISO });
    return 'permiso';
  }
  const perfil = DCAST_PERFILES.indexOf(d.perfil) >= 0 ? d.perfil : null;
  switch(d.accion){
    case 'listo': dcastIr(); return 'listo';
    case 'consulta': {
      const sh = dcastPrograma(programa);
      dcastResponder({ tipo: 'estado', programa: programa, existe: !!sh, nombre: sh ? sh.name : '' });
      return 'estado';
    }
    case 'programa':
    case 'capitulo': {
      const sh = dcastPrograma(programa);
      if(!sh){
        dcastResponder({ tipo: 'aviso', programa: programa, texto: '«' + programa + '» no está en Dubbipt: créalo primero.' });
        return 'falta';
      }
      if(d.accion === 'capitulo'){
        const ep = dcastCasarCapitulo(d.numero, d.titulo, sbEps(sh.id));
        if(!ep){
          dcastResponder({ tipo: 'aviso', programa: programa, texto: 'No encuentro el capítulo ' + (d.numero != null ? d.numero : '') + ' en «' + sh.name + '» de Dubbipt: te abro el programa.' });
          if(perfil) ponerModo(null, perfil);
          dcastIrAPrograma(sh);
          return 'programa';
        }
        dcastCerrar();
        if(perfil) ponerModo(ep.id, perfil);
        LDB.showId = sh.id;
        await openEpisode(ep.id);
        return 'capitulo';
      }
      if(perfil) ponerModo(null, perfil);
      dcastIrAPrograma(sh);
      return 'programa';
    }
    case 'crear': {
      dcastCerrar();
      await newShow();
      const n = document.getElementById('npName');
      if(n){ n.value = programa; try{ n.focus(); }catch(e){ /* sin foco se escribe igual */ } }
      return 'crear';
    }
    case 'talentos':     dcastCerrar(); talPanel(); return 'talentos';
    case 'herramientas': dcastCerrar(); herramientasPanel(); return 'herramientas';
    case 'produccion':   await prodPanel(); return 'produccion';
  }
  return 'nada';
}

/**
 * Lleva DublajeCast a la pantalla pendiente, si ya puede (su gancho `__dcNav`
 * existe cuando la persona ha entrado en su cuenta). Si todavía no, se queda
 * pendiente y se hace al llegar su «listo».
 */
function dcastIr(){
  const p = DCAST.pendiente;
  if(!p) return false;
  let nav = null;
  try{ nav = DCAST.marco && DCAST.marco.contentWindow && DCAST.marco.contentWindow.__dcNav; }catch(e){ nav = null; }
  if(typeof nav !== 'function') return false;
  try{ nav(p.vista, p.serieId, p.epId); DCAST.pendiente = null; return true; }
  catch(e){ fallo('dcastIr · js/dublajecast.js', e, 'DublajeCast no ha podido abrir esa pantalla'); return false; }
}

/**
 * Abre DublajeCast a pantalla completa, y si se dice, en una pantalla suya
 * (`vista`), de un programa (`serieId`) y un capítulo (`epId`) de allí.
 * El marco se carga una vez y se guarda: al volver, sigue donde estaba.
 */
function dcastAbrir(vista, serieId, epId){
  if(typeof vista === 'string' && vista)
    DCAST.pendiente = { vista: vista, serieId: (serieId != null ? serieId : null), epId: (epId !== undefined ? epId : undefined) };
  if(!prodPuede()){ castAviso(PROD_SIN_PERMISO); try{ prodPintarBoton(); }catch(e){ /* sin botón que esconder */ } return false; }
  if(!DCAST.ov){
    const ov = document.createElement('div');
    /* `.ddl-encima`: se puede abrir con un libreto delante (desde el puente del casting) y no debe esconderse. */
    ov.id = 'dcastOv'; ov.className = 'dcast-ov ddl-encima';
    ov.innerHTML = '<div class="dcast-barra">'
      + '<b>DublajeCast</b><span class="dcast-sub">dentro de Dubbipt · entra con tu cuenta de DublajeCast</span>'
      + '<button class="dcast-b" id="dcastProd" title="El resumen de lo traído: programas con sus alertas, talentos con ficha y tráilers">' + (typeof csIco === 'function' ? csIco('produccion', 14) : '') + '<span>Producción</span></button>'
      + '<button class="dcast-b" id="dcastRecargar" title="Volver a cargar DublajeCast" aria-label="Volver a cargar DublajeCast">' + (typeof csIco === 'function' ? csIco('actualizar', 14) : '') + '</button>'
      + '<button class="dcast-b dcast-volver" id="dcastVolver">' + (typeof csIco === 'function' ? csIco('cerrar', 14) : '') + '<span>Volver a Dubbipt</span></button>'
      + '</div>';
    const marco = document.createElement('iframe');
    marco.className = 'dcast-marco'; marco.title = 'DublajeCast';
    marco.src = DCAST.ruta;
    ov.appendChild(marco);
    document.body.appendChild(ov);
    DCAST.ov = ov; DCAST.marco = marco;
    ov.querySelector('#dcastVolver').onclick = dcastCerrar;
    ov.querySelector('#dcastRecargar').onclick = () => { try{ marco.contentWindow.location.reload(); }catch(e){ marco.src = DCAST.ruta; } };
    ov.querySelector('#dcastProd').onclick = () => { prodPanel(); };
  }
  DCAST.ov.style.display = '';
  document.body.classList.add('dcast-abierto');
  dcastIr();
  return true;
}

/* ── La interfaz compartida: Programas y capítulos con lo de DublajeCast ── */

/** Los datos de DublajeCast: en vivo si su pantalla está abierta y con sesión; si no, lo traído a Producción. */
function dcastDatos(){
  try{
    const w = DCAST.marco && DCAST.marco.contentWindow;
    if(w && typeof w.__dcDatos === 'function'){
      const v = w.__dcDatos();
      if(v && typeof v === 'object') return { datos: prodNormalizar(v), vivo: true };
    }
  }catch(e){ /* sin acceso al marco: lo traído */ }
  return { datos: PROD.datos, vivo: false };
}

/** El programa de DublajeCast que corresponde a uno de Dubbipt. */
function dcastSerieDe(show, d){
  if(!show || !d) return null;
  return d.series.find(s => prodCasarPrograma(s.name, [show]) === show) || null;
}

/**
 * El capítulo de DublajeCast que corresponde a uno de Dubbipt, por su nombre:
 * título igual o, si no, el número que lleve el nombre, cuando solo uno casa.
 */
function dcastEpDeDc(nombre, dcEps){
  const lista = dcEps || [];
  const t = castNorm(nombre);
  if(t){
    const igual = lista.filter(e => castNorm(e.title) === t);
    if(igual.length === 1) return igual[0];
  }
  const nums = (String(nombre == null ? '' : nombre).match(/\d+/g) || []).map(x => parseInt(x, 10));
  const c = lista.filter(e => nums.indexOf(parseInt(e.episode_number, 10)) >= 0);
  return c.length === 1 ? c[0] : null;
}

/**
 * El casting de un capítulo de Dubbipt: los personajes que salen en él en
 * DublajeCast, con sus líneas y su talento, y lo que el registro del programa
 * en Dubbipt dice para ese capítulo. Si los dos dicen talentos distintos, se
 * marca (`choca`) y manda el de Dubbipt, como al traer (PRO-5).
 */
function dcastCastingDe(show, ep, d, registro){
  const out = { serie: null, dcEp: null, filas: [] };
  const filas = {};
  const fila = (nombre) => { const k = castNorm(nombre); return (filas[k] = filas[k] || { personaje: nombre, lineas: 0, dc: '', dubbipt: '', principal: false }); };
  if(d){
    out.serie = dcastSerieDe(show, d);
    if(out.serie){
      out.dcEp = dcastEpDeDc(ep.name, d.episodes.filter(e => String(e.series_id) === String(out.serie.id)));
      if(out.dcEp){
        const ix = prodIndices(d);
        for(const a of (ix.aparicionesPorEp[String(out.dcEp.id)] || [])){
          const ch = ix.char[String(a.character_id)]; if(!ch || !ch.name) continue;
          const f = fila(ch.name); f.lineas = +a.line_count || 0; f.principal = ch.tipo === 'principal';
        }
        for(const c of (ix.castingsPorEp[String(out.dcEp.id)] || [])){
          const ch = ix.char[String(c.character_id)], tal = ix.talent[String(c.talent_id)];
          if(!ch || !ch.name) continue;
          fila(ch.name).dc = tal ? tal.name : '';
        }
      }
    }
  }
  const nEp = castNorm(ep.name);
  const pers = (registro && registro.personajes) || {};
  for(const k in pers){
    const p = pers[k];
    if(!p || !(p.episodios || []).some(n => castNorm(n) === nEp)) continue;
    fila(p.display || k).dubbipt = p.talent || '';
  }
  out.filas = Object.keys(filas).map(k => {
    const f = filas[k];
    return Object.assign(f, { talento: f.dubbipt || f.dc, choca: !!(f.dubbipt && f.dc && castNorm(f.dubbipt) !== castNorm(f.dc)) });
  }).sort((a, b) => (b.lineas - a.lineas) || a.personaje.localeCompare(b.personaje, 'es'));
  return out;
}

/** La tabla del casting de un capítulo. */
function dcastCastingHtml(c, vivo, cuando){
  const e = (s) => (typeof esc === 'function') ? esc(String(s == null ? '' : s)) : String(s == null ? '' : s).replace(/</g, '&lt;');
  if(!c.filas.length)
    return '<div class="et-cast-vacio">' + (c.serie ? (c.dcEp ? 'Este capítulo no tiene personajes en DublajeCast todavía.' : 'No encuentro este capítulo en «' + e(c.serie.name) + '» de DublajeCast.') : 'Sin casting: este programa no está en lo traído de DublajeCast.') + '</div>';
  const asignados = c.filas.filter(f => f.talento).length;
  return '<div class="et-cast-cab">' + asignados + ' de ' + c.filas.length + ' personajes con talento'
      + ' · <span class="et-cast-de">' + (vivo ? 'DublajeCast en vivo' : ('lo traído de DublajeCast' + (cuando ? ' el ' + e(new Date(cuando).toLocaleDateString('es')) : ''))) + '</span></div>'
    + '<div class="et-cast-tabla">'
    + c.filas.map(f => '<div class="et-cast-fila' + (f.talento ? '' : ' falta') + (f.choca ? ' choca' : '') + '">'
        + '<span class="et-cast-per">' + (f.principal ? '<i class="et-cast-prin" title="Principal">' + (typeof csIco === 'function' ? csIco('estrella', 12) : '') + '</i>' : '') + e(f.personaje) + '</span>'
        + '<span class="et-cast-lin">' + (f.lineas ? f.lineas + ' lín.' : '') + '</span>'
        + '<span class="et-cast-tal">' + (f.talento ? e(f.talento) : 'sin asignar')
        + (f.choca ? ' <small title="En DublajeCast pone otro talento: manda el de Dubbipt">' + (typeof csIco === 'function' ? csIco('aviso', 12) : '') + ' en DublajeCast: ' + e(f.dc) + '</small>' : '') + '</span>'
        + '</div>').join('')
    + '</div>';
}

/**
 * Dentro de un programa, con el perfil Casting: en cada capítulo, el botón
 * «🎭» con su casting, y en la cabecera, abrir el programa en DublajeCast.
 * Se pinta después de la lista, sin esperar: si la lista cambia mientras
 * tanto, lo que ya no está no se toca.
 */
async function dcastPintarCastings(grid, sh, eps){
  if(!grid || !sh || !prodPuede()) return 0;
  try{ await prodCargar(); }catch(e){ /* sin nube, lo del equipo */ }
  const { datos, vivo } = dcastDatos();
  let registro = null;
  try{ registro = await castRegCargar(sh.id); }catch(e){ registro = null; }
  if(LDB.showId !== sh.id) return 0;                       // ya se está en otro programa
  const serie = dcastSerieDe(sh, datos);
  const cab = document.getElementById('epsHead');
  if(cab && serie && !cab.querySelector('.dcast-prog')){
    const b = document.createElement('button');
    b.className = 'dcast-prog'; b.innerHTML = (typeof csIco === 'function' ? csIco('externo', 14) : '') + '<span>El programa en DublajeCast</span>';
    b.title = 'Abre «' + serie.name + '» en DublajeCast, con todas sus herramientas';
    b.onclick = () => dcastAbrir('series', serie.id);
    cab.appendChild(b);
  }
  let n = 0;
  for(const ep of (eps || [])){
    const fila = grid.querySelector('.et-row[data-ep="' + String(ep.id).replace(/"/g, '') + '"]');
    if(!fila || fila.querySelector('.et-castb')) continue;
    const c = dcastCastingDe(sh, ep, datos, registro);
    if(!c.filas.length && !c.dcEp) continue;
    const asignados = c.filas.filter(f => f.talento).length;
    const b = document.createElement('button');
    b.className = 'et-castb' + (c.filas.some(f => f.choca) ? ' choca' : '');
    b.innerHTML = (typeof csIco === 'function' ? csIco('talentos', 13) : '') + '<span>' + asignados + '/' + c.filas.length + '</span>';
    b.title = 'El casting de este capítulo';
    const celda = fila.querySelector('.et-chars') || fila;
    celda.appendChild(b);
    b.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const abierta = fila.nextElementSibling && fila.nextElementSibling.classList && fila.nextElementSibling.classList.contains('et-cast');
      if(abierta){ fila.nextElementSibling.remove(); b.classList.remove('on'); return; }
      const panel = document.createElement('div');
      panel.className = 'et-cast';
      panel.innerHTML = dcastCastingHtml(c, vivo, PROD.cuando)
        + '<div class="et-cast-btns">'
        +   '<button class="et-cast-ir">' + (typeof csIco === 'function' ? csIco('entrar', 14) : '') + '<span>Entrar al capítulo · herramientas de Dubbipt</span></button>'
        +   (c.dcEp ? '<button class="et-cast-dc">' + (typeof csIco === 'function' ? csIco('externo', 14) : '') + '<span>Casting en DublajeCast</span></button>' : '')
        + '</div>';
      fila.parentNode.insertBefore(panel, fila.nextSibling);
      b.classList.add('on');
      panel.querySelector('.et-cast-ir').onclick = () => openEpisode(ep.id);
      const dc = panel.querySelector('.et-cast-dc');
      if(dc) dc.onclick = () => dcastAbrir('casting', c.serie.id, c.dcEp.id);
    });
    n++;
  }
  return n;
}

/** Esconde DublajeCast sin cerrarlo: lo que se estaba haciendo allí sigue igual al volver. */
function dcastCerrar(){
  if(DCAST.ov) DCAST.ov.style.display = 'none';
  try{ document.body.classList.remove('dcast-abierto'); }catch(e){ /* sin clase que quitar */ }
}

window.addEventListener('message', (e) => {
  if(!dcastMensajeValido(e, DCAST.marco)) return;
  dcastAtender(e.data).catch(err => fallo('dcastAtender · js/dublajecast.js', err, 'Dubbipt no ha podido hacer lo que pedía DublajeCast'));
});

/* ═══ FIN DE DUBLAJECAST ENTERO ═══ */
