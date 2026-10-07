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

const DCAST = { ruta: './dublajecast/index.html', ov: null, marco: null };
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

/** Abre DublajeCast a pantalla completa. El marco se carga una vez y se guarda: al volver, sigue donde estaba. */
function dcastAbrir(){
  if(!prodPuede()){ castAviso(PROD_SIN_PERMISO); try{ prodPintarBoton(); }catch(e){ /* sin botón que esconder */ } return false; }
  if(!DCAST.ov){
    const ov = document.createElement('div');
    /* `.ddl-encima`: se puede abrir con un libreto delante (desde el puente del casting) y no debe esconderse. */
    ov.id = 'dcastOv'; ov.className = 'dcast-ov ddl-encima';
    ov.innerHTML = '<div class="dcast-barra">'
      + '<b>🎬 DublajeCast</b><span class="dcast-sub">dentro de Dubbipt · entra con tu cuenta de DublajeCast</span>'
      + '<button class="dcast-b" id="dcastProd" title="El resumen de lo traído: programas con sus alertas, talentos con ficha y tráilers">📦 Producción</button>'
      + '<button class="dcast-b" id="dcastRecargar" title="Volver a cargar DublajeCast">⟳</button>'
      + '<button class="dcast-b dcast-volver" id="dcastVolver">✕ Volver a Dubbipt</button>'
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
  return true;
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
