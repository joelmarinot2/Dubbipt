/* El género de los talentos y de los personajes, para repartir · especificacion 02, CAST-51
 *
 * Pedido de sala: «identifica si es un talento hombre, y que haga personajes
 * de hombre, y así sucesivamente».
 *
 * El talento: su ficha del directorio de Casting (Casting › Talentos), donde
 * ya se apunta el género. Si no lo tiene, no se sabe y no se filtra nada.
 *
 * El personaje: el desglose no lo dice, así que se busca por orden:
 *   1. lo MARCADO a mano en Dubbipt (H o M, en el panel de Ocupación); se
 *      guarda en el registro del programa y vale para todos sus capítulos;
 *   2. el género del talento que lo hace (o que lo hizo en otro capítulo del
 *      programa, según el registro);
 *   3. el NOMBRE: palabras como MAN, WOMAN, SEÑORA, MADRE, DOCTORA, «EL…» o
 *      «LA…», y nombres de pila corrientes (MARLON, ANA…). Es una pista, no
 *      una certeza: sale marcada como «por el nombre» y se corrige con un clic.
 * Si nada lo dice, el personaje no tiene género conocido y vale para
 * cualquiera.
 *
 * Es un script clásico: comparte el ámbito global con index.html (castNorm,
 * castEsActor, castRegCargar, castRegGuardar, PROD…).
 */

/* Palabras que dicen el género. Se comparan sin tildes y en mayúsculas, palabra entera. */
const CG_HOMBRE = new Set(('MAN MEN GUY GUYS BOY BOYS MALE MR MISTER SIR LORD KING PRINCE DUKE FATHER DAD DADDY POPS GRANDPA GRANDFATHER SON BROTHER BRO ' +
  'HUSBAND BOYFRIEND UNCLE NEPHEW GENTLEMAN POLICEMAN FIREMAN SALESMAN WAITER ACTOR PRIEST MONK BISHOP EMPEROR SULTAN GROOM BUTLER HE ' +
  'HOMBRE HOMBRES SENOR SR DON PADRE PAPA ABUELO HIJO HERMANO ESPOSO MARIDO NOVIO TIO SOBRINO NINO NINOS CHICO CHICOS MUCHACHO REY PRINCIPE ' +
  'DUQUE CABALLERO CURA MONJE EMPERADOR CAMARERO MESERO PROFESOR ENFERMERO ABOGADO JEFE VIEJO ANCIANO SENORITO SACERDOTE').split(' '));
const CG_MUJER = new Set(('WOMAN WOMEN GIRL GIRLS LADY LADIES FEMALE MRS MS MISS MADAM MADAME QUEEN PRINCESS DUCHESS MOTHER MOM MOMMY MUM GRANDMA ' +
  'GRANDMOTHER DAUGHTER SISTER SIS WIFE GIRLFRIEND AUNT NIECE NUN WAITRESS ACTRESS BRIDE HOSTESS EMPRESS MAID SHE ' +
  'MUJER MUJERES SENORA SRA SENORITA SRTA DONA MADRE MAMA ABUELA HIJA HERMANA ESPOSA NOVIA TIA SOBRINA NINA NINAS CHICA CHICAS MUCHACHA REINA ' +
  'PRINCESA DUQUESA DAMA MONJA EMPERATRIZ CAMARERA MESERA DOCTORA PROFESORA ENFERMERA ABOGADA JEFA VIEJA ANCIANA SACERDOTISA').split(' '));
/* Nombres de pila corrientes (inglés y español). Los que valen para los dos (ALEX, SAM, ANDREA…) no están. */
const CG_NOMBRES_H = new Set(('JOHN JAMES ROBERT MICHAEL WILLIAM DAVID RICHARD JOSEPH THOMAS CHARLES DANIEL MATTHEW ANTHONY MARK DONALD STEVEN PAUL ' +
  'ANDREW JOSHUA KENNETH KEVIN BRIAN GEORGE EDWARD RONALD TIMOTHY JASON JEFFREY RYAN JACOB GARY NICHOLAS ERIC JONATHAN STEPHEN LARRY JUSTIN ' +
  'SCOTT BRANDON BENJAMIN SAMUEL FRANK GREGORY RAYMOND PATRICK JACK DENNIS JERRY TYLER AARON HENRY ADAM DOUGLAS NATHAN PETER ZACHARY KYLE ' +
  'WALTER HAROLD CARL ARTHUR GERALD ROGER KEITH LAWRENCE TERRY SEAN SHAWN CHRISTIAN ETHAN AUSTIN JOE ALBERT JESSE WILLIE BILLY BRUCE NOAH ' +
  'MARLON LUKE MAX OSCAR HARRY LEO FRED TOM TONY MIKE STEVE BOB BEN DAN NICK JAKE MATT DAVE JIM BILL HANK HUGO IVAN VICTOR ' +
  'JUAN JOSE LUIS CARLOS JORGE PEDRO MANUEL FRANCISCO ANTONIO MIGUEL RAFAEL FERNANDO ALEJANDRO RICARDO EDUARDO DIEGO JAVIER SERGIO ' +
  'ANDRES PABLO RAUL ROBERTO ALBERTO ENRIQUE ARTURO MARIO ERNESTO GUILLERMO HECTOR IGNACIO JAIME JULIO MARCOS MARTIN NICOLAS ' +
  'RAMON RODRIGO SANTIAGO SEBASTIAN TOMAS VICENTE GABRIEL EMILIO FELIPE GONZALO JOAQUIN LORENZO MATEO MAURICIO OCTAVIO ORLANDO ' +
  'RENE SALVADOR CESAR ESTEBAN FEDERICO GUSTAVO ADRIAN AGUSTIN ALFONSO ALFREDO ALVARO ARMANDO BRUNO DARIO EDUARD').split(' '));
const CG_NOMBRES_M = new Set(('MARY PATRICIA JENNIFER LINDA ELIZABETH BARBARA SUSAN JESSICA SARAH KAREN NANCY LISA BETTY MARGARET SANDRA ASHLEY ' +
  'KIMBERLY EMILY DONNA MICHELLE DOROTHY CAROL AMANDA MELISSA DEBORAH STEPHANIE REBECCA SHARON LAURA CYNTHIA KATHLEEN AMY SHIRLEY ANGELA ' +
  'HELEN ANNA BRENDA PAMELA NICOLE EMMA SAMANTHA KATHERINE CHRISTINE DEBRA RACHEL CAROLYN JANET CATHERINE MARIA HEATHER DIANE JULIE JOYCE ' +
  'VICTORIA KELLY CHRISTINA LAUREN JOAN EVELYN OLIVIA JUDITH MEGAN CHERYL MARTHA ANDREA FRANCES HANNAH JACQUELINE ANN GLORIA JEAN KATHRYN ' +
  'ALICE TERESA SARA JANICE DORIS MADISON JULIA GRACE JUDY ABIGAIL MARIE DENISE BEVERLY AMBER THERESA MARILYN DANIELLE DIANA BRITTANY ' +
  'NATALIE SOPHIA ROSE ISABELLA ALEXIS KAYLA CHARLOTTE MIA LILY ZOE CHLOE ELLA LUCY RUBY KATE JANE MEG BETH AMBER SALLY MOLLY POLLY ' +
  'ANA LUCIA CARMEN JOSEFA ISABEL DOLORES PILAR TERESA ROSA CRISTINA MARTA ANTONIA FRANCISCA MERCEDES LUISA ELENA CONCEPCION ROSARIO ' +
  'PAULA BEATRIZ JULIANA RAQUEL SILVIA VERONICA MONICA ALICIA PATRICIA ROCIO INES MARGARITA SOFIA VALERIA CAMILA DANIELA GABRIELA ' +
  'FERNANDA ALEJANDRA MARIANA NATALIA XIMENA ADRIANA CLAUDIA LORENA LETICIA GUADALUPE ESPERANZA YOLANDA ESTELA FABIOLA MIRIAM ' +
  'REBECA RAMONA ROSALIA SUSANA VALENTINA YINA HELENA').split(' '));

/* Lo marcado a mano y lo del registro del programa, en memoria (el panel se pinta sin esperar a nada). */
const CG = { show: null, marcas: {}, antes: {}, cargando: false, talMemo: { datos: null, n: -1, mapa: new Map() } };

/** Las palabras de un nombre, comparables. */
function cgPalabras(s){
  return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);
}

/** El género que dice el NOMBRE de un personaje: 'H', 'M' o '' si no lo dice (o dice las dos cosas). */
function cgDeNombre(nombre){
  const p = cgPalabras(nombre);
  if(!p.length) return '';
  let h = false, m = false;
  for(const w of p){ if(CG_HOMBRE.has(w)) h = true; if(CG_MUJER.has(w)) m = true; }
  if(p[0] === 'EL') h = true;
  if(p[0] === 'LA') m = true;
  if(!h && !m){ if(CG_NOMBRES_H.has(p[0])) h = true; else if(CG_NOMBRES_M.has(p[0])) m = true; }
  return h === m ? '' : (h ? 'H' : 'M');
}

/** El género de un talento, de su ficha del directorio de Casting: 'H', 'M' o ''. */
function cgDeTalento(nombre){
  const t = String(nombre == null ? '' : nombre).trim();
  if(!t) return '';
  let d = null;
  try{ d = (typeof PROD !== 'undefined' && PROD && PROD.datos) ? PROD.datos : null; }catch(e){ d = null; }
  const lista = (d && Array.isArray(d.talents)) ? d.talents : [];
  const M = CG.talMemo;
  if(M.datos !== d || M.n !== lista.length){
    M.datos = d; M.n = lista.length; M.mapa = new Map();
    for(const x of lista){
      if(!x || !x.name) continue;
      const g = x.genero === 'masculino' ? 'H' : x.genero === 'femenino' ? 'M' : '';
      if(g) M.mapa.set(castNorm(x.name), g);
    }
  }
  return M.mapa.get(castNorm(t)) || '';
}

/**
 * El género de un personaje del capítulo: { g: 'H'|'M'|'', de: 'marcado'|'talento'|'antes'|'nombre'|'' }.
 * `c`: { key, display, talent }.
 */
function cgDePersonaje(c){
  if(!c) return { g: '', de: '' };
  const clave = castNorm(c.display || c.key);
  const marca = CG.marcas[clave];
  if(marca && (marca.g === 'H' || marca.g === 'M')) return { g: marca.g, de: 'marcado' };
  const t = c.talent ? String(c.talent).trim() : '';
  if(t && (typeof castEsActor !== 'function' || castEsActor(t))){ const g = cgDeTalento(t); if(g) return { g: g, de: 'talento' }; }
  const prev = CG.antes[clave];
  if(prev){ const g = cgDeTalento(prev); if(g) return { g: g, de: 'antes' }; }
  const n = cgDeNombre(c.display || c.key);
  return n ? { g: n, de: 'nombre' } : { g: '', de: '' };
}

/** ¿Pueden ir juntos (el mismo talento) dos géneros? Si alguno no se sabe, sí. */
function cgCasan(a, b){ return !a || !b || a === b; }
/** «hombre», «mujer», o '' */
function cgPalabra(g){ return g === 'H' ? 'hombre' : g === 'M' ? 'mujer' : ''; }

/** Trae del registro del programa lo marcado y quién hizo a cada personaje antes. Repinta al acabar. */
async function cgCargar(showId, alAcabar){
  if(!showId || CG.cargando) return false;
  CG.cargando = true;
  try{
    const reg = (typeof castRegCargar === 'function') ? await castRegCargar(showId) : null;
    CG.show = showId;
    CG.marcas = Object.assign({}, (reg && reg.generos) || {});
    CG.antes = {};
    for(const k in ((reg && reg.personajes) || {})){ const x = reg.personajes[k]; if(x && x.talent) CG.antes[k] = x.talent; }
  }catch(e){ CG.show = showId; /* sin registro: solo lo que dice el nombre */ }
  finally{ CG.cargando = false; }
  /* Sin el directorio de Casting no se sabe el género de los talentos: se pide una vez. */
  try{ if(typeof PROD !== 'undefined' && !PROD.cargado && typeof prodCargar === 'function') await prodCargar(); }catch(e){ /* sin directorio */ }
  if(typeof alAcabar === 'function') try{ alAcabar(); }catch(e){ /* el panel se pinta la próxima vez */ }
  return true;
}
/** ¿Hay que traer lo del programa? (otro programa, o aún no se ha traído) */
function cgHaceFalta(showId){ return !!showId && CG.show !== showId && !CG.cargando; }

/** Marca a mano el género de un personaje ('H', 'M', o '' para quitar la marca). Se guarda en el registro del programa. */
async function cgMarcar(showId, nombre, g){
  const clave = castNorm(nombre);
  if(!clave) return false;
  const v = (g === 'H' || g === 'M') ? { g: g, ts: Date.now() } : { g: '', ts: Date.now() };
  CG.marcas[clave] = v;
  if(!showId || typeof castRegCargar !== 'function' || typeof castRegGuardar !== 'function') return false;
  const reg = await castRegCargar(showId);
  reg.generos = Object.assign({}, reg.generos || {});
  reg.generos[clave] = v;
  return castRegGuardar(showId, reg);
}

if(typeof module !== 'undefined' && module.exports){
  module.exports = { CG, CG_HOMBRE, CG_MUJER, CG_NOMBRES_H, CG_NOMBRES_M, cgPalabras, cgDeNombre, cgDeTalento, cgDePersonaje, cgCasan, cgPalabra, cgCargar, cgHaceFalta, cgMarcar };
}
