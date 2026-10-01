/* QC · las correcciones del capítulo · especificacion 01
 *
 * Lo que se apunta al revisar: donde, quien, y que hay que arreglar. Es lo que
 * despues se entrega como informe, asi que manda una regla por encima de todo:
 *
 *     una correccion la apunta una PERSONA
 *
 * El cotejo automatico -transcribir el programa y compararlo con el libreto-
 * señala SITIOS donde sospechar, y eso vive aparte, en `_cotejo`. Aqui no
 * entra solo. Un informe firmado con lo que creyo oir una maquina no vale, y
 * esa frontera es justo lo que se prueba abajo.
 */
'use strict';
const { montar, fuentes, karNormReal } = require('./ayuda');

exports.nombre = 'QC: las correcciones del capítulo, y de quién son';

const RECORTES = [
  ['/* ═══ QC · CONTROL DE CALIDAD', '/** El panel de las correcciones']
];
const EXPORTA = ['QC_TIPOS', 'QC_TIPO_POR_DEFECTO', 'qcTipo', 'qcTipoSugerido', 'qcCuentaTipos',
                 'qcMeta', 'qcMetaCargar', 'qcMetaParaGuardar',
                 'qcNum', 'qcDatos', 'qcSanUna', 'qcCargar', 'qcParaGuardar', 'qcOrden', 'qcApuntar',
                 'qcQuitar', 'qcMarcar', 'qcPendientes', 'qcLeerTC', 'QC_TOPE',
                 'verVentana: () => window'];

function armar(){
  const window_ = {};
  const M = montar(RECORTES, EXPORTA, { window: window_, console: { warn: () => {}, log: () => {} } });
  M._w = window_;
  return M;
}

exports.pruebas = async function(t){

  t.seccion('1 · apuntar una corrección');
  const M = armar();
  t.eq('empieza sin ninguna', M.qcDatos().length, 0);
  const c = M.qcApuntar(3940, 'GRÁFICA', 'Repetir, se come la última sílaba', 7);
  t.ok('devuelve la corrección', !!c);
  t.eq('con su tiempo', c.tcSec, 3940);
  t.eq('su personaje', c.quien, 'GRÁFICA');
  t.eq('su comentario', c.texto, 'Repetir, se come la última sílaba');
  t.eq('y el parlamento del que salió', c.si, 7);
  t.ok('nace sin resolver', c.hecha === false);
  t.ok('y con identificador propio', !!c.id && c.id.length > 3, String(c.id));
  t.eq('queda guardada', M.qcDatos().length, 1);

  t.seccion('2 · sin comentario no hay corrección');
  /* El tiempo y el personaje los rellena el programa solo. Lo unico que no
     puede inventar es QUE hay que arreglar, asi que sin eso no se apunta:
     una fila vacia en el informe no dice nada a quien lo recibe. */
  const M2 = armar();
  t.eq('vacío, no', M2.qcApuntar(100, 'PHILIP', '', 1), null);
  t.eq('solo espacios, tampoco', M2.qcApuntar(100, 'PHILIP', '   ', 1), null);
  t.eq('y no se cuela ninguna', M2.qcDatos().length, 0);
  t.ok('pero sin personaje SÍ se apunta',
       !!M2.qcApuntar(100, '', 'Ruido de sala en toda la escena', 1),
       'a veces la corrección es del ambiente, no de nadie');

  t.seccion('3 · marcar resuelta, y volver atrás');
  const M3 = armar();
  const a = M3.qcApuntar(10, 'A', 'una', 0);
  const b = M3.qcApuntar(20, 'B', 'otra', 1);
  t.eq('las dos pendientes', M3.qcPendientes(), 2);
  t.ok('se marca', M3.qcMarcar(a.id, true));
  t.eq('queda una pendiente', M3.qcPendientes(), 1);
  t.ok('y se puede desmarcar', M3.qcMarcar(a.id, false));
  t.eq('vuelven a ser dos', M3.qcPendientes(), 2,
       'una corrección mal marcada como resuelta se pierde para siempre si no hay vuelta');
  t.eq('marcar una que no existe no hace nada', M3.qcMarcar('noexiste', true), false);
  t.eq('y siguen las dos', M3.qcDatos().length, 2);
  t.ok('quitar la de en medio deja la otra', M3.qcQuitar(b.id) && M3.qcDatos().length === 1);
  t.eq('y la que queda es la primera', M3.qcDatos()[0].id, a.id);
  t.eq('quitar una que no existe no rompe', M3.qcQuitar('noexiste'), false);

  t.seccion('4 · por tiempo, que es el orden en que se revisa');
  const M4 = armar();
  M4.qcApuntar(300, 'C', 'tercera', 3);
  M4.qcApuntar(100, 'A', 'primera', 1);
  M4.qcApuntar(200, 'B', 'segunda', 2);
  t.eq('ordenadas', M4.qcOrden().map(x => x.texto).join(' '), 'primera segunda tercera');
  t.eq('y el cajón NO se reordena por detrás', M4.qcDatos()[0].texto, 'tercera',
       'ordenar al enseñar es una cosa; cambiarle el orden a lo guardado, otra');

  /* Una correccion sin tiempo -del ambiente, del mezclado- va al final, no
     delante de todo. Caso propio: con `Infinity` mal puesto se colaria arriba. */
  const sinTC = M4.qcApuntar(null, '', 'revisar la mezcla entera', null);
  t.ok('sin tiempo se apunta igual', !!sinTC);
  t.eq('y va al final', M4.qcOrden()[3].texto, 'revisar la mezcla entera');

  t.seccion('5 · lo que se guarda y lo que vuelve');
  const M5 = armar();
  M5.qcApuntar(3940, 'GRÁFICA', 'Repetir', 7);
  const guardado = M5.qcParaGuardar();
  t.eq('sale una', guardado.length, 1);
  const M6 = armar();
  M6.qcCargar(guardado);
  t.eq('y vuelve entera', M6.qcDatos().length, 1);
  t.eq('con su comentario', M6.qcDatos()[0].texto, 'Repetir');
  t.eq('y su tiempo', M6.qcDatos()[0].tcSec, 3940);
  t.eq('sin nada que guardar, nada se sube', armar().qcParaGuardar(), null,
       'un `[]` en cada capítulo engorda el registro de la nube sin decir nada');

  t.seccion('6 · lo que llega de la nube ha pasado por otras manos');
  /* Otras versiones, otro navegador, alguien tocando el JSON. Si no cuadra,
     fuera: una correccion a medias en el informe es peor que no tenerla. */
  const M7 = armar();
  M7.qcCargar([
    { texto: 'buena', tcSec: 10 },
    null,
    'una cadena suelta',
    { texto: '' },                                  // sin comentario
    { texto: 'tiempo imposible', tcSec: -5 },
    { texto: 'tiempo que no es número', tcSec: 'ayer' }
  ]);
  const ks = M7.qcDatos().map(x => x.texto);
  t.eq('solo pasan las que valen', ks.length, 3, ks.join(' · '));
  t.ok('la buena está', ks.indexOf('buena') >= 0);
  t.ok('las de tiempo malo pasan SIN tiempo, no con uno inventado',
       M7.qcDatos().filter(x => x.texto !== 'buena').every(x => x.tcSec === undefined),
       JSON.stringify(M7.qcDatos()));
  t.ok('a la que le falta identificador se le pone uno',
       M7.qcDatos().every(x => !!x.id), JSON.stringify(M7.qcDatos().map(x => x.id)));
  t.eq('y no se cargan más de las que caben', armar().qcCargar(
         new Array(M.QC_TOPE + 50).fill(0).map((_, i) => ({ texto: 'c' + i }))).length, M.QC_TOPE);

  t.seccion('7 · el comentario largo se recorta, no se tira');
  const M8 = armar();
  const largo = M8.qcApuntar(1, 'A', 'x'.repeat(5000), 0);
  t.ok('se apunta', !!largo);
  t.ok('pero acotado', largo.texto.length <= 600, String(largo.texto.length));

  t.seccion('8 · «sin tiempo» no es «el minuto cero»');
  /* La trampa que se comio dos comprobaciones al escribir esto: `+null` es 0 y
     `+''` es 0, asi que `isFinite(+v)` da por bueno lo que no hay. Cada uno con
     su caso, porque se cuelan de uno en uno. */
  t.eq('nulo no es número', M.qcNum(null), null);
  t.eq('vacío tampoco', M.qcNum(''), null);
  t.eq('ni un espacio', M.qcNum('   '), null);
  t.eq('ni un sí', M.qcNum(true), null, 'true se convierte en 1 sin avisar');
  t.eq('ni un no', M.qcNum(false), null, 'y false en 0, que es el minuto cero');
  t.eq('ni una palabra', M.qcNum('ayer'), null);
  t.eq('el cero SÍ es un número', M.qcNum(0), 0,
       'hay correcciones en el primer segundo: tirarlas sería peor');
  t.eq('y un número, número', M.qcNum(3940), 3940);
  t.eq('escrito como texto, también', M.qcNum('3940'), 3940);

  t.seccion('9 · el timecode que se escribe a mano');
  t.eq('con fotogramas', M.qcLeerTC('01:05:40:12', null), 3940);
  t.eq('sin fotogramas', M.qcLeerTC('01:05:40', null), 3940);
  t.eq('vacío se queda con el que había', M.qcLeerTC('', 999), 999);
  t.eq('y una errata también', M.qcLeerTC('lo que sea', 999), 999,
       'mandar la corrección al minuto cero por un dedazo es peor que no cambiarla');
  t.eq('sin nada donde caer, nulo', M.qcLeerTC('lo que sea', null), null);

  t.seccion('9b · el tipo de corrección: se sugiere y manda quien apunta');
  /* Los cuatro tipos piden acciones distintas del estudio: con Falta hay que
     volver a llamar al actor y con Pegar basta un take que ya existe. */
  const MT = armar();
  t.eq('«Falta el take. Pegar.» es Pegar', MT.qcTipoSugerido('Falta el take. Pegar.'), 'pegar',
       'gana la acción que hay que hacer, no la palabra con la que empieza la frase');
  t.eq('pero «Falta el take.» es Falta', MT.qcTipoSugerido('Falta el take.'), 'falta',
       'las dos frases empiezan igual y piden cosas distintas: por eso se sugiere, no se decide');
  t.eq('«Cambiar por: …» es Cambiar', MT.qcTipoSugerido('Cambiar por: «Mike el blanquito».'), 'cambiar');
  t.eq('«Faltan gritos.» es Falta', MT.qcTipoSugerido('Faltan gritos.'), 'falta');
  t.eq('«Mejorar vocalización.» es Ajuste', MT.qcTipoSugerido('Mejorar vocalización.'), 'ajuste');
  t.eq('y lo que no encaja también', MT.qcTipoSugerido('cualquier cosa'), 'ajuste',
       'Ajuste es el más inofensivo: no convoca a nadie');

  /* Manda quien apunta: si elige un tipo, se guarda el suyo. */
  const elegido = MT.qcApuntar(10, 'A', 'Falta el take. Pegar.', 0, 'falta');
  t.eq('el tipo elegido a mano gana a la sugerencia', elegido.tipo, 'falta');
  const sugerido = MT.qcApuntar(20, 'A', 'Falta el take. Pegar.', 1);
  t.eq('y sin elegir, se sugiere', sugerido.tipo, 'pegar');

  const raro = MT.qcApuntar(30, 'A', 'x', 2, 'loquesea');
  t.eq('un tipo que no existe cae al de por defecto', raro.tipo, 'ajuste',
       'guardarlo a medias dejaría una corrección sin etiqueta en el informe');

  /* El botón de guardar tiene que pasar el tipo SOLO si se eligió a mano. Si
     le pasa siempre el suyo, la sugerencia queda muerta: el borrador nace en
     «Ajuste» y todo se guardaría como Ajuste. Se mira en el código porque el
     panel no se prueba, y es justo donde se rompería sin que nada avisara. */
  const FUENTE = require('./ayuda').fuentes().map(f => f.src).join('\n');
  t.ok('y el panel solo manda el tipo cuando se ha elegido a mano',
       /qcApuntar\(seg, b\.quien, b\.texto, b\.si, \(b\.tipoManual \? b\.tipo : null\)\)/.test(FUENTE),
       'pasarle siempre `b.tipo` dejaría la sugerencia muerta: todo saldría Ajuste');
  t.ok('y se marca como elegido a mano al pulsar', /tipoManual = true/.test(FUENTE));

  t.seccion('9c · los contadores de arriba del informe');
  const MC = armar();
  MC.qcApuntar(1, 'A', 'Falta gesto.', 0);
  MC.qcApuntar(2, 'A', 'Faltan gritos.', 1);
  MC.qcApuntar(3, 'A', 'Cambiar por: otra cosa.', 2);
  const cuenta = {};
  MC.qcCuentaTipos().forEach(x => { cuenta[x.k] = x.n; });
  t.eq('dos faltas', cuenta.falta, 2, JSON.stringify(MC.qcCuentaTipos()));
  t.eq('un cambiar', cuenta.cambiar, 1);
  t.ok('y los que no tienen ninguna no salen', !('pegar' in cuenta) && !('ajuste' in cuenta),
       'una pastilla en cero no dice nada y quita sitio');
  t.eq('sin correcciones, ninguna pastilla', armar().qcCuentaTipos().length, 0);
  t.ok('cada tipo lleva su color', MT.QC_TIPOS.every(x => /^#[0-9A-Fa-f]{6}$/.test(x.hex)
        && Array.isArray(x.rgb) && x.rgb.length === 3),
       JSON.stringify(MT.QC_TIPOS.map(x => x.hex)));

  t.seccion('9d · quién revisa y qué estudio hace los cambios');
  /* Es un documento que se entrega: sin nombre no se sabe a quién preguntar y
     sin estudio no se sabe quién tiene que arreglarlo. */
  const MM = armar();
  t.eq('empiezan vacíos', MM.qcMeta().revisor + '|' + MM.qcMeta().estudio, '|');
  t.eq('sin nada, no se sube nada', MM.qcMetaParaGuardar(), null,
       'dos cadenas vacías en cada capítulo engordan el registro sin decir nada');
  MM.qcMetaCargar({ revisor: '  Pamela H  ', estudio: 'Estudio Bogotá' });
  t.eq('se limpian los espacios', MM.qcMeta().revisor, 'Pamela H');
  t.eq('y se guarda el estudio', MM.qcMetaParaGuardar().estudio, 'Estudio Bogotá');
  t.eq('con solo uno de los dos, también se sube',
       armar().qcMetaCargar({ revisor: 'Pamela H' }) && armar().qcMetaCargar({ revisor: 'x' }).revisor, 'x');
  MM.qcMetaCargar({ revisor: 'x'.repeat(500) });
  t.ok('un nombre larguísimo se acota', MM.qcMeta().revisor.length <= 90,
       String(MM.qcMeta().revisor.length));
  MM.qcMetaCargar('no soy un objeto');
  t.eq('y lo que no es un objeto no rompe nada', MM.qcMeta().revisor, '');

  t.seccion('10 · el cotejo automático NO apunta correcciones');
  /* La frontera. `cotejarTodo` escribe en `_cotejo`, que es «sospecha», y nunca
     en `_qc`, que es «lo que firmo». Si un dia alguien cruza esa linea, el
     informe pasa a llevar lo que creyo oir una maquina. */
  const TODO = fuentes().map(f => f.src).join('\n');
  /* El cuerpo ENTERO, hasta el panel de los planos: con un trozo de largo
     fijo, lo que se añadiera al final de la función quedaría sin mirar. */
  const cuerpoCotejo = TODO.slice(TODO.indexOf('async function cotejarTodo'),
                                  TODO.indexOf('/* ── El panel de los planos'));
  t.ok('existe el cotejo', cuerpoCotejo.length > 3000, String(cuerpoCotejo.length));
  t.eq('y no toca las correcciones', (cuerpoCotejo.match(/qcApuntar|_qc\b/g) || []).length, 0,
       'el reconocedor señala dónde mirar; quien firma el informe es una persona');
  t.ok('QC lo llama, eso sí', /cotejarTodo\(\)/.test(TODO));

  t.seccion('11 · las correcciones viajan con el capítulo');
  t.eq('se guardan en los dos sitios donde se sube el capítulo',
       (TODO.match(/qc: qcParaGuardar\(\)/g) || []).length, 2,
       'hay dos caminos de subida; si solo se toca uno, se pierden según cómo guardes');
  t.eq('y los dos nombres, en los mismos dos sitios',
       (TODO.match(/qcMeta: qcMetaParaGuardar\(\)/g) || []).length, 2);
  t.ok('y se cargan al abrirlo', /qcCargar\(d\.qc\)/.test(TODO));
  t.ok('los nombres también, con el último escrito de respaldo',
       /qcMetaCargar\(d\.qcMeta \|\| qcMetaUltima\(\)\)/.test(TODO),
       'casi siempre revisa la misma persona: volver a teclearlo en cada capítulo sobra');

  t.seccion('12 · el audio del programa llega al reconocedor');
  /* `karIaPreparar` lee `studio.dlgUrl` y ese campo no lo escribia NADIE, asi
     que Whisper oia siempre el video aunque cargaras otra pista. */
  t.ok('el reconocedor prefiere la pista de diálogos', /studio\.dlgUrl \|\| studio\.url/.test(TODO));
  t.ok('y ahora alguien la pone', /studio\.dlgUrl = URL\.createObjectURL\(file\)/.test(TODO),
       'sin esto se cotejaría el vídeo, no el audio que acabas de cargar');
  t.ok('olvidando el audio preparado antes', /karIa\.pcm = null/.test(TODO),
       'si se queda el de antes, se coteja el capítulo nuevo contra la voz del anterior');

  t.seccion('12b · el cotejo dice por dónde va');
  /* Llego de sala: «no se si esta haciendo algo». El cotejo tarda minutos -baja
     el modelo de voz, descodifica el audio y luego va parlamento a parlamento-
     y avisaba por `stMsg`, que escribe en el panel del Video Estudio: desde QC
     eso no se ve. Son tres cables y si se corta uno se vuelve a quedar mudo. */
  /* En milésimas del audio ya oído, no en parlamentos: los tramos se reparten
     entre varios trabajadores y acaban desordenados, y lo único que avanza de
     forma pareja es el audio. */
  t.ok('el análisis publica cuánto hay en total',
       /COTEJO\.total = 1000; COTEJO\.fase = 'cotejando';/.test(TODO),
       'sin el total no hay barra: solo «está pensando»');
  t.ok('y por dónde va', /COTEJO\.vistos = Math\.round\(1000 \* hecho \/ total\);/.test(TODO));
  t.ok('lo que el cotejo cuenta se espeja en la barra de QC',
       /function stMsg\(t\)\{[\s\S]{0,1400}?qcAvance\(t\)/.test(TODO),
       'es el único sitio por el que pasan todas las fases; sin este espejo, '
       + 'desde QC no se ve nada de lo que ya se cuenta');
  /* Pero SOLO mientras coteja. Sin esta condicion se espejaba cualquier aviso
     del Video Estudio, y llego de sala «Sin medio cargado» colgado en la
     barra, en los tres perfiles. */
  t.ok('y solo mientras el cotejo trabaja',
       /function stMsg\(t\)\{[\s\S]{0,1400}?COTEJO\.trabajando\) qcAvance\(t\)/.test(TODO),
       'un aviso de otra pantalla puesto en una barra que es de otra cosa');
  t.ok('la fila del avance es solo del perfil QC',
       /function qcAvance\(txt\)\{[\s\S]{0,700}?DDL_MODO\) !== 'qc'\)\{[\s\S]{0,160}?remove\(\)/
         .test(TODO),
       'en Grabación y en Casting esa fila no tiene nada que decir y ocupa sitio');
  t.ok('y el aviso se pinta ANTES de empezar, no al acabar',
       /qcAvance\('⏳ Empezando/.test(TODO),
       'el primer trozo puede tardar un minuto sin decir nada, y es justo donde '
       + 'parece que no hace nada');
  t.ok('pulsar otra vez lo PARA en vez de lanzar otro',
       /if\(typeof COTEJO !== 'undefined' && COTEJO && COTEJO\.trabajando\)\{ cotejarTodo\(\); return; \}/
         .test(TODO),
       'dos cotejos a la vez sobre el mismo capítulo se pisan');

  t.seccion('12c · en cada fase, solo las herramientas de cada quien');
  /* Pedido de sala. Antes el cajon lo traia TODO en las tres fases -solo en QC
     se escondia lo de escribir-, asi que quien repartia tenia delante los
     botones de cotejar y quien grababa los de QC. */
  const P = montar([['/* De quién es cada herramienta del cajón.', '/**\n * Deja en el cajón']],
                   ['PERFIL_CAJON_DE', 'perfilVeLaHerramienta'],
                   { window: {}, console: { warn: () => {}, log: () => {} } });
  const DE = P.PERFIL_CAJON_DE;
  const ve = P.perfilVeLaHerramienta;

  /* Que la tabla esté bien no basta: hay que APLICARLA. Sin esto, la mutación
     de enseñar todo en todas las fases no ponía nada en rojo. */
  t.ok('quien graba ve lo de marcar', ve('tEdit', 'grabacion'));
  t.ok('y NO ve lo de QC', !ve('tQcCotejar', 'grabacion'));
  t.ok('quien revisa ve lo de QC', ve('tQcCotejar', 'qc'));
  t.ok('y NO ve lo de marcar', !ve('tEdit', 'qc'));
  t.ok('quien reparte no ve ni lo uno ni lo otro',
       !ve('tEdit', 'casting') && !ve('tQcCotejar', 'casting'));
  t.ok('pero los tres ven lo de leer',
       ve('tFind', 'grabacion') && ve('tFind', 'qc') && ve('tFind', 'casting'),
       'sin esto el libreto no se podría ni recorrer');
  /* Y que el cajón PREGUNTE. Esto va sobre el código porque es el cable entre
     la decisión y los botones, y ahí no llega ninguna prueba de las de arriba:
     la tabla puede estar perfecta y el cajón no mirarla. Se vio mutándolo. */
  t.ok('y el cajón pregunta por ahí antes de esconder nada',
       /b\.style\.display = perfilVeLaHerramienta\(id, m\) \? '' : 'none';/.test(TODO),
       'la tabla puede estar perfecta y el cajón enseñarlo todo igual');

  const escriben = ['tEdit', 'tPause', 'tUnpause', 'tAccent', 'tClear', 'tDraw', 'tComp', 'tRec'];
  escriben.forEach(id => t.eq('escribir en el libreto es de quien graba: ' + id, DE[id], 'grabacion',
    'quien revisa o reparte no marca pausas ni da por grabada una intervención'));

  const deQc = ['tQcAudio', 'tQcCotejar', 'tQcNueva', 'tQcLista', 'tQcPdf'];
  deQc.forEach(id => t.eq('cotejar y apuntar es de quien revisa: ' + id, DE[id], 'qc'));

  /* Y lo de LEER Y MOVERSE no tiene dueño: si lo tuviera, el libreto no se
     podria ni recorrer en las otras dos fases. */
  ['tScope', 'tTheme', 'tPgGo', 'tFontDn', 'tFontUp', 'tGo', 'tFind', 'tPron', 'tDict', 'tHide']
    .forEach(id => t.ok('leer y moverse es de todos: ' + id, !(id in DE),
      'con dueño, en las otras fases el libreto no se podría ni recorrer'));

  /* El titulo de un grupo se quita mirando lo que le queda debajo, NO por su
     nombre: con los nombres a mano, mover un titulo dejaba un encabezado
     encabezando el vacio y nadie se enteraba. */
  t.ok('el título de un grupo vacío se quita mirando su grupo',
       /if\(h\.classList && h\.classList\.contains\('tt'\)\) break;/.test(TODO)
       && /t\.style\.display = algoVivo \? '' : 'none';/.test(TODO));
  t.eq('y no por su nombre', (TODO.match(/nombre === 'marcar'/g) || []).length, 0,
       'ir por nombres se rompe en silencio al cambiar un título de sitio');
  /* «Leer» tiene que existir como grupo propio: antes Buscar, Pronunciaciones y
     Significado vivian bajo «Marcar», asi que al quitarle a QC lo de marcar se
     quedaban sin titulo o se iban con el. */
  t.ok('«Leer» es un grupo propio en el cajón', />Leer<\/div>/.test(TODO),
       'antes buscar y pronunciaciones vivían bajo «Marcar», que no es lo que son');

  t.seccion('12d · el audio del premix empieza donde el libreto dice');
  /* Llego de sala: «la opcion de cotejar no funciona». Uno de los tres motivos:
     sin «TC de inicio», un parlamento en 01:05:40 se busca en el segundo 3940
     de un MP3 de 45 minutos, fuera del audio, y no hay nada que cotejar. */
  const A = montar([['/** El primer timecode del guion', '/**\n * El aviso de por dónde va el cotejo']],
                   ['qcPrimerTc', 'qcInicioSupuesto'],
                   { script: [{}, { tcEff: 3612.2 }, { tcEff: 3620 }], window: {},
                     console: { warn: () => {}, log: () => {} } });
  t.eq('el primer tiempo del guion, saltando lo que no lo tiene', A.qcPrimerTc(), 3612.2);
  t.eq('con el desfase a cero y el guion en la hora, se supone la hora en punto',
       A.qcInicioSupuesto(3612.2, 0), 3600,
       'los programas empiezan en la hora en punto y el primer parlamento unos segundos después');
  t.eq('a las diez, las diez', A.qcInicioSupuesto(36005, 0), 36000);
  t.eq('si alguien ya puso un desfase, NO se toca', A.qcInicioSupuesto(3612.2, 3595), null,
       'pisar lo que alguien puso a mano es peor que suponer mal');
  t.eq('si el guion empieza en cero, el cero es correcto', A.qcInicioSupuesto(12.5, 0), null);
  t.eq('sin guion, nada', A.qcInicioSupuesto(null, 0), null);
  t.eq('con un tiempo que no es número, nada', A.qcInicioSupuesto('ayer', 0), null);

  t.seccion('12e · el reconocedor lee el audio del Blob, no por fetch');
  /* El segundo motivo, comprobado en dubbipt.vercel.app: la CSP no lleva blob:
     en connect-src, asi que fetch(blob:) se cae con «Failed to fetch». El
     cotejo nunca arranco en produccion, ni con el video ni con la pista. */
  t.ok('el vídeo se guarda como Blob además de como URL', /studio\.blob = blob;/.test(TODO));
  t.ok('y la pista de diálogos también', /studio\.dlgBlob = file;/.test(TODO));
  t.ok('el reconocedor lee el Blob directo',
       /const blob = studio\.dlgUrl \? studio\.dlgBlob : studio\.blob;[\s\S]{0,200}?await blob\.arrayBuffer\(\)/.test(TODO),
       'fetch(blob:) lo prohíbe la CSP de producción');
  t.ok('y solo hace fetch de lo que es una URL de verdad',
       /: await \(await fetch\(fuente\)\)\.arrayBuffer\(\);/.test(TODO),
       'el audio bajado de la nube sigue siendo una URL https');

  t.seccion('12f · cuando el cotejo falla, se dice la CAUSA');
  /* El tercer motivo: el error real se producia y lo tapaba mi genérico. */
  t.ok('se enseña karIa.error o el último aviso, no un genérico',
       /karIa\.error : \(window\._stUltimo \|\| 'no se pudo analizar'\)/.test(TODO));
  t.ok('stMsg guarda el último aviso para eso', /window\._stUltimo = String\(t\);/.test(TODO));
  t.ok('y si ningún parlamento cayó dentro del audio, se dice que es el desfase',
       /if\(!r\.hechos\)\{[\s\S]{0,200}?ninguno cayó dentro del audio/.test(TODO),
       'con que el mensaje exista no basta: tiene que gobernarlo la cuenta de cotejados. '
       + 'Se vio mutando la condición');

  t.seccion('12g · los diálogos que cambiaron');
  /* Lo que se entrega. Se monta con el `cotejoAviso` de VERDAD, el de los
     planos, para que los umbrales sean los mismos que en la hoja de cues. */
  const w = {};
  const C = montar([['/* ── 0 · Con qué se escucha', '/* ── 1 · Dónde hay voz'],
                    /* Las palabras del análisis, las de verdad: las marcas se cuelgan de ellas. */
                    ['/* ── 3 · Las palabras', '/* ── 4 · A qué parlamento'],
                    ['/* Desde cuánto parecido se avisa.', '/** El tiempo que ha tardado'],
                    ['/* ═══ QC · LOS DIÁLOGOS QUE CAMBIARON', '/** El panel con la lista']],
                   ['qcCambiosLista', 'qcCambiosCuenta', 'qcTrozosEscrito', 'qcTrozosOido', 'qcTrozosHtml', 'qcGraficasCuenta'],
                   { window: w, esc: (x) => String(x).replace(/</g, '&lt;'), karNorm: karNormReal(), ANA: { acotacion: 6, casi: 0.5 },
                     script: [ { tcEff: 3700, key: 'A', lines: ['Hola.'] },
                               { tcEff: 3650, key: 'B', lines: ['Adiós', 'amigo'] },
                               /* Antes que el de arriba en TIEMPO aunque vaya después en el
                                  guion: es lo que separa «por tiempo» de «por orden». */
                               { tcEff: 3600, key: 'A', lines: ['Regular'] },
                               { tcEff: 3900, key: 'C', lines: ['Sin cotejar'] },
                               { tcEff: 3950, key: 'A', lines: ['Justo'] },
                               { tcEff: 3960, key: 'A', lines: ['Casi'] } ],
                     charIdx: { A: { display: 'ANA' }, B: { display: 'BETO' } },
                     console: { warn: () => {}, log: () => {} } });
  w._cotejo = { 0: { sim: 0.95, oido: 'hola' },          // cuadra
                1: { sim: 0.30, oido: 'otra cosa' },     // no cuadra
                2: { sim: 0.60, oido: 'mas o menos' },   // dudoso
                4: { sim: 0.45, oido: 'x' },             // el borde: dudoso
                5: { sim: 0.72, oido: 'y' } };           // el borde: cuadra
  const cam = C.qcCambiosLista();
  t.eq('salen los que no cuadran y los dudosos, y nada más', cam.length, 3,
       JSON.stringify(cam.map(c => c.si + ':' + c.nivel)));
  t.eq('por tiempo, no por orden del guion', cam.map(c => c.si).join(','), '2,1,4',
       'el 2 va después en el guion pero suena antes; el informe se lee en orden de escucha');
  const beto = cam.find(c => c.si === 1);
  t.eq('con su personaje', beto.quien, 'BETO');
  t.eq('lo escrito, junto', beto.escrito, 'Adiós amigo');
  t.eq('lo oído, tal cual', beto.oido, 'otra cosa');
  t.eq('y su veredicto', beto.nivel + '/' + beto.et, 'mal/no cuadra');
  t.eq('el 45 % ya es dudoso, no «no cuadra»', cam[2].nivel, 'dudoso',
       'los umbrales son los de la hoja de cues: 0,45 y 0,72');
  t.ok('el que cuadra NO sale', !cam.some(c => c.si === 0));
  t.ok('el que no se cotejó tampoco', !cam.some(c => c.si === 3),
       'no cotejado no es lo mismo que cambiado');
  const cnt = C.qcCambiosCuenta(cam);
  t.eq('la cuenta', cnt.mal + '/' + cnt.dudosos + '/' + cnt.total, '1/2/3');
  t.eq('sin cotejo, lista vacía', (w._cotejo = {}, C.qcCambiosLista().length), 0);
  /* Lo oído con un oído fiel avisa por palabras: una distinta en una frase
     larga es un 95 %, y por parecido habría pasado por buena. */
  w._cotejo = { 0: { sim: 0.95, dif: 1, o: 'fiel', oido: 'hola' },
                1: { sim: 0.97, dif: 0.5, o: 'fiel', oido: 'adios amigos' },
                2: { sim: 0.9, dif: 2, o: 'rapido', oido: 'regular' } };
  const camF = C.qcCambiosLista();
  t.eq('con el oído fiel, una palabra distinta sale en la lista', camF.map(c => c.si + ':' + c.nivel).join(','), '0:dudoso',
       'la lista, la hoja de cues y el informe usan el mismo `cotejoAviso`');

  t.seccion('12g2 · los leves y los sin comprobar van aparte, y lo que cambió se marca');
  /* Pedido de sala con el informe de Dofus: los cambios leves -conectores,
     palabras casi iguales- y los parlamentos muy cortos de los que no se oyó
     nada no cuentan como cambio, y en el texto se marca qué palabra cambió. */
  w._cotejo = { 1: { sim: 0.3, dif: 2, pesada: 2, o: 'fiel', oido: 'otra cosa', me: 'ff', mo: 'ss' },     // no cuadra
                2: { sim: 0.9, dif: 1, pesada: 0, o: 'fiel', oido: 'regular pues', me: 'i', mo: 'is' },  // leve
                4: { sim: 0, dif: 1, pesada: 1, n: 0, corto: true, o: 'fiel', oido: '', me: 'f', mo: '' }, // sin comprobar
                5: { sim: 0.5, dif: 0.5, pesada: 0, o: 'fiel', oido: 'casis', me: 'c', mo: 'c' } };        // leve (casi)
  const camL = C.qcCambiosLista();
  t.eq('cada uno con su nivel', camL.map(c => c.si + ':' + c.nivel).join(','), '2:leve,1:mal,4:sin,5:leve');
  const cntL = C.qcCambiosCuenta(camL);
  t.eq('solo los que cuentan cuentan: leves y sin comprobar, aparte', [cntL.mal, cntL.dudosos, cntL.leves, cntL.sin, cntL.total].join('/'), '1/0/2/1/1');
  t.eq('el sin comprobar lo dice', camL.find(c => c.si === 4).et, 'sin comprobar');
  t.eq('en lo escrito, la palabra que no se oyó va marcada como que falta',
       JSON.stringify(camL.find(c => c.si === 1).escritoTrozos), '[{"t":"Adiós","m":"f"},{"t":"amigo","m":"f"}]');
  t.eq('y en lo oído, la que sobra', JSON.stringify(camL.find(c => c.si === 2).oidoTrozos), '[{"t":"regular","m":""},{"t":"pues","m":"s"}]');
  t.eq('la casi igual, como casi, en los dos lados', camL.find(c => c.si === 5).escritoTrozos[0].m + camL.find(c => c.si === 5).oidoTrozos[0].m, 'cc');
  /* Las marcas se cuelgan de las palabras tal como están escritas: las
     acotaciones y los signos no se compararon y van sin marca. */
  t.eq('las acotaciones no se enseñan y no descolocan las marcas de las demás',
       JSON.stringify(C.qcTrozosEscrito('(JADEA) ¿Tú? Bueno.', 'fi')), '[{"t":"¿Tú?","m":"f"},{"t":"Bueno.","m":""}]',
       'pedido de sala: obviar todo lo que esté entre paréntesis, también la pronunciación «(pernúru)»');
  t.ok('y lo escrito llano va también sin ellas',
       /const escrito = \(\(typeof anaSinAcotaciones === 'function'\) \? anaSinAcotaciones\(crudo\) : crudo\)/.test(TODO)
       && /escritoTrozos: qcTrozosEscrito\(crudo, av\.me\),/.test(TODO));
  t.eq('un número que son varias palabras se lleva la peor de sus marcas',
       JSON.stringify(C.qcTrozosEscrito('Son 1.500', 'iif')), '[{"t":"Son","m":""},{"t":"1.500","m":"f"}]');
  t.eq('si el texto ya no es el que se analizó, sin marcas', C.qcTrozosEscrito('Otra frase distinta', 'fi'), null,
       'mejor nada que una marca en la palabra que no es');
  t.eq('lo oído sin sus marcas tampoco se marca', C.qcTrozosOido('a b c', 'is'), null);
  t.eq('en HTML, cada marca con su clase', C.qcTrozosHtml([{ t: 'Hola', m: '' }, { t: 'amigo', m: 'f' }, { t: 'x', m: 's' }, { t: 'y', m: 'c' }]),
       'Hola <mark class="qc-falta">amigo</mark> <mark class="qc-sobra">x</mark> <mark class="qc-casi">y</mark>');
  t.eq('y sin trozos, el texto llano', C.qcTrozosHtml(null, 'a < b'), 'a &lt; b');
  t.eq('sin gráficas en este libreto', C.qcGraficasCuenta(), 0);
  t.ok('el panel enseña los leves y los sin comprobar plegados, aparte de los cambios',
       /<details class="qc-grupo"><summary>' \+ levesL\.length/.test(TODO) && /<details class="qc-grupo"><summary>' \+ sinL\.length/.test(TODO)
       && /\+ \(cambios\.length \? cambios\.map\(item\)\.join\(''\)/.test(TODO),
       'la lista de arriba son solo los cambios: los leves no se mezclan con ellos');
  t.ok('y explica las marcas', /<mark class="qc-falta">Tachado<\/mark>, lo escrito que no se oyó; <mark class="qc-sobra">naranja<\/mark>/.test(TODO));
  t.ok('al volver de la nube, las marcas y lo que decide el nivel vuelven con el resultado',
       /if\(typeof r\.me === 'string' && \/\^\[icfs\]\*\$\/\.test\(r\.me\)\) c\.me = r\.me;/.test(TODO)
       && /if\(r\.corto === true\) c\.corto = true;/.test(TODO));

  t.seccion('12h · nada se apunta solo como corrección');
  /* QC-2: el reconocedor señala; quien firma es una persona. Desde la lista
     de cambios se ABRE el formulario con lo oído de pista, y ella escribe. */
  t.ok('el botón de la lista abre el formulario, no apunta',
       /pop2\._qcNueva = \{ si: c\.si, tcSec: c\.tcSec, quien: c\.quien,[\s\S]{0,120}?qcPanel\(false\);/.test(TODO));
  const cuerpoCambios = TODO.slice(TODO.indexOf('function qcCambiosPanel'), TODO.indexOf('async function qcInformeCambios'));
  t.eq('y en todo el panel de cambios no hay ni un qcApuntar',
       (cuerpoCambios.match(/qcApuntar\(/g) || []).length, 0);

  t.seccion('12i · el perfil se elige en la pantalla inicial, después del dispositivo');
  /* Pedido de sala. Se preguntaba al abrir cada capitulo, y quien viene a
     hacer QC viene a hacer QC toda la sesion. */
  const almacen = {};
  const MO = montar([['/* Los perfiles que hay, y lo que cada uno saca', 'function ponerModo(epId, m){']],
                    ['DDL_MODOS', 'modoValido', 'modoQueToca'],
                    { window: {},
                      localStorage: { getItem: k => (k in almacen ? almacen[k] : null),
                                      setItem: (k, v) => { almacen[k] = String(v); } },
                      console: { warn: () => {}, log: () => {} } });
  t.eq('son tres perfiles', MO.DDL_MODOS.join(','), 'grabacion,qc,casting');
  t.eq('manda el de la sesión', MO.modoQueToca('qc', 'casting'), 'qc',
       'quien entra a hacer QC abre todos los capítulos en QC, tengan lo que tengan guardado de otro día');
  t.eq('sin sesión, decide el guardado del capítulo', MO.modoQueToca('', 'casting'), 'casting');
  t.eq('sin ninguno de los dos, hay que preguntar', MO.modoQueToca('', ''), '');
  t.eq('un perfil que no existe no cuenta como sesión', MO.modoQueToca('loquesea', 'qc'), 'qc');
  t.eq('ni como guardado', MO.modoQueToca(undefined, 'loquesea'), '');

  t.ok('se pregunta lo primero, antes que el dispositivo y antes de los programas',
       /perfilAlEntrar\(\(\)=> perfilDispositivo\(DDL_MODO, \(\)=> ensureWorkspace\(\)\)\);/.test(TODO),
       'solo Grabación necesita dispositivo: preguntarlo antes era preguntárselo también a QC y a Casting');
  t.ok('al entrar hay que elegir: pulsar fuera no vale',
       /obligatorio: true/.test(TODO)
       && /if\(e\.target === cap && !tx\.obligatorio\) elegir\(alSalir\)/.test(TODO),
       'un toque de más al entrar dejaba a quien venía a revisar en Grabación sin haberlo pedido');
  t.ok('al abrir un capítulo, salir sin elegir sigue siendo Grabación',
       /const alSalir = \('alSalir' in tx\) \? tx\.alSalir : 'grabacion';/.test(TODO));
  t.ok('pero cambiar de perfil y salir sin elegir deja el que había',
       /preguntarModo\(currentEp\.name, DDL_MODO, \{ alSalir: '', marcaActual: true \}\)/.test(TODO),
       'antes caía en Grabación: quien abría el selector desde QC y pulsaba fuera se encontraba grabando');
  t.ok('ni Escape', /if\(e\.key !== 'Escape' \|\| tx\.obligatorio\) return;/.test(TODO));
  t.ok('lo elegido queda como perfil de la sesión', /window\._perfilSesion = m;/.test(TODO),
       'también cuando se cambia desde la barra del libreto: el siguiente capítulo lo hereda');
  t.ok('y al abrir un capítulo ya no se pregunta: se mira la sesión',
       /modoQueToca\(window\._perfilSesion, modoDe\(epId\)\)/.test(TODO));
  t.ok('pase lo que pase con el selector, se sigue a los programas',
       /\.catch\(\(e\)=>\{ fallo\('perfilAlEntrar · index\.html', e\); \}\)\s*\.then\(seguir\);/.test(TODO),
       'un fallo al pintar el selector no puede dejar a nadie en una pantalla vacía');

  t.seccion('12i2 · el perfil, en la barra de arriba');
  /* Pedido de sala: «agrega un botón para cambiar entre modos en la barra de
     navegación». Se corre el código de verdad con un documento de mentira que
     tiene lo justo: el botón, su etiqueta y su menú. */
  {
    const R_MODOS = ['/* Los perfiles que hay, y lo que cada uno saca', 'function ponerModo(epId, m){'];
    const R_NAV = ['/** Cambia de modo sobre la marcha.', '/* ═══ EL DISPOSITIVO EN LA BARRA DE ARRIBA'];
    const clases = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c),
      contains: c => s.has(c), toggle: (c, v) => { if(v === undefined ? !s.has(c) : v) s.add(c); else s.delete(c); } }; };
    const doc = { foco: null, oyentes: {}, els: {},
      getElementById(id){ return this.els[id] || null; },
      addEventListener(ev, f){ (this.oyentes[ev] = this.oyentes[ev] || []).push(f); },
      querySelectorAll(){ return []; } };
    const el = (id) => ({ id: id, dataset: {}, attrs: {}, style: {}, textContent: '', innerHTML: '', classList: clases(),
      setAttribute(k, v){ this.attrs[k] = String(v); }, getAttribute(k){ return this.attrs[k]; },
      querySelector(){ return null; }, querySelectorAll(){ return []; }, focus(){ doc.foco = this.id; } });
    doc.body = el('body');
    ['tbPerfil', 'tbPerfilEt', 'tbPerfilMenu', 'envoltorio'].forEach(id => { doc.els[id] = el(id); });
    doc.els.tbPerfil.parentNode = doc.els.envoltorio;
    const ultimo = (ev) => doc.oyentes[ev][doc.oyentes[ev].length - 1];
    const monta = (o) => {
      o = o || {};
      const X = { cambios: [], avisos: [], directos: 0, preguntas: [] };
      X.M = montar([R_MODOS, R_NAV],
        ['cambiarModo', 'perfilCambiarA', 'perfilNavPintar', 'perfilNavAbrir', 'perfilNavAbierto'],
        { document: doc, window: {}, console: { warn: () => {}, log: () => {} },
          localStorage: { getItem: () => null, setItem: () => {} },
          DDL_MODO: o.modo || 'grabacion',
          currentEp: ('ep' in o) ? o.ep : { id: 'ep1', name: 'Capítulo 1' },
          ponerModo: (ep, m) => X.cambios.push([ep, m]),
          DDL_UI: { toast: (m) => X.avisos.push(m) }, fallo: () => {},
          libretoDirecto: () => { X.directos++; return true; },
          isTalent: () => !!o.actor, closeUserMenu: () => {},
          perfilDispositivo: (m) => { X.dispositivo = m; },
          preguntarModo: async (n, s, tx) => { X.preguntas.push([n, s, tx]); return o.responde; } });
      return X;
    };
    doc.body.classList.add('ep-open');
    const A = monta({ modo: 'grabacion' });
    t.eq('elegir otro perfil lo pone, en el capítulo abierto', A.M.perfilCambiarA('qc') + '|' + JSON.stringify(A.cambios),
         'true|[["ep1","qc"]]');
    t.eq('y lo dice', A.avisos.join(), 'Perfil: QC');
    t.eq('pasar a QC con el capítulo delante lleva a su libreto', A.directos, 1);
    t.eq('y pone el dispositivo de acuerdo con la tarea nueva', A.dispositivo, 'qc');
    const B = monta({ modo: 'qc' });
    t.eq('elegir el que ya está no hace nada', B.M.perfilCambiarA('qc') + '|' + B.cambios.length + '|' + B.avisos.length, 'false|0|0');
    t.eq('ni lo que no es un perfil', monta().M.perfilCambiarA('sordo'), false);
    const C = monta({ ep: null });
    C.M.perfilCambiarA('casting');
    t.eq('sin capítulo abierto se cambia el de la sesión', JSON.stringify(C.cambios), '[[null,"casting"]]',
         'en Programas o en la lista de capítulos no había manera de cambiarlo');
    doc.body.classList.remove('ep-open');
    const D = monta();
    D.M.perfilCambiarA('qc');
    t.eq('con el capítulo cargado pero sin estar en él, no se abre ningún libreto', D.directos, 0);

    const E = monta({ modo: 'qc', responde: '' });
    await E.M.cambiarModo();
    t.eq('cambiar desde el libreto y salir sin elegir no cambia nada', E.cambios.length, 0,
         'antes caía en Grabación');
    t.eq('marcando el que está puesto', JSON.stringify(E.preguntas[0].slice(1)), '["qc",{"alSalir":"","marcaActual":true}]');
    const F = monta({ modo: 'qc', responde: 'casting' });
    await F.M.cambiarModo();
    t.eq('y eligiendo, cambia', JSON.stringify(F.cambios), '[["ep1","casting"]]');

    const G = monta({ modo: 'qc' });
    G.M.perfilNavPintar();
    t.eq('el botón dice el perfil puesto', doc.els.tbPerfilEt.textContent + '|' + doc.els.tbPerfil.dataset.modo, 'QC|qc');
    t.eq('también a quien no ve la pantalla', doc.els.tbPerfil.attrs['aria-label'], 'Perfil: QC. Cambiar de perfil');
    const menu = doc.els.tbPerfilMenu.innerHTML;
    t.eq('el menú trae los tres', (menu.match(/role="menuitemradio"/g) || []).length, 3);
    t.ok('marcado solo el puesto', (menu.match(/aria-checked="true"/g) || []).length === 1
         && /data-m="qc" aria-checked="true"/.test(menu), menu.slice(0, 300));
    t.eq('se ve', doc.els.envoltorio.style.display, '');
    monta({ actor: true }).M.perfilNavPintar();
    t.eq('en la tablet del actor no sale', doc.els.envoltorio.style.display, 'none');

    const H = monta({ modo: 'qc' });
    const ev = { stopPropagation: () => {} };
    H.M.perfilNavAbrir(ev);
    t.ok('pulsarlo abre el menú', H.M.perfilNavAbierto() && doc.els.tbPerfil.attrs['aria-expanded'] === 'true');
    H.M.perfilNavAbrir(ev);
    t.ok('pulsarlo otra vez lo cierra', !H.M.perfilNavAbierto() && doc.els.tbPerfil.attrs['aria-expanded'] === 'false');
    H.M.perfilNavAbrir(ev);
    ultimo('click')();
    t.ok('pulsar fuera lo cierra', !H.M.perfilNavAbierto());
    H.M.perfilNavAbrir(ev);
    doc.foco = null;
    ultimo('keydown')({ key: 'Escape', preventDefault: () => {} });
    t.ok('Escape lo cierra y devuelve el foco al botón', !H.M.perfilNavAbierto() && doc.foco === 'tbPerfil');
    t.eq('y nada de eso cambia el perfil', H.cambios.length, 0);

    const PAGINA = require('fs').readFileSync(require('./ayuda').INDEX, 'utf8').replace(/\r\n/g, '\n');
    const barra = PAGINA.slice(PAGINA.indexOf('<div id="topbar">'), PAGINA.indexOf('<div class="epline" id="epLine"'));
    t.ok('el botón va en la barra de arriba, a la derecha', barra.indexOf('<div class="tb-right">') >= 0
         && barra.indexOf('id="tbPerfil"') > barra.indexOf('<div class="tb-right">'));
    t.ok('y se repinta cada vez que cambia el perfil', /try\{ perfilNavPintar\(\); \}catch\(e\)\{ fallo\('perfilNavPintar · index\.html:ponerModo'/.test(TODO));
    t.ok('el botón de la pantalla del capítulo dice los tres perfiles',
         /if\(bm\)\{ bm\.style\.display = ''; bm\.textContent = DDL_MODO_ET\[m\] \|\| m; \}/.test(TODO),
         'decía «Grabación» también en QC');
  }

  t.seccion('12i2b · el dispositivo, en la barra de arriba');
  /* Pedido de sala: «quiero un botón de cambiar de dispositivo también». */
  {
    const R_DISP = ['/* ═══ EL DISPOSITIVO EN LA BARRA DE ARRIBA', '/* ═══ QC ENTRA DIRECTO AL LIBRETO'];
    const clases = () => { const s = new Set(); return { add: c => s.add(c), remove: c => s.delete(c),
      contains: c => s.has(c), toggle: (c, v) => { if(v === undefined ? !s.has(c) : v) s.add(c); else s.delete(c); } }; };
    const doc = { foco: null, oyentes: {}, els: {},
      getElementById(id){ return this.els[id] || null; },
      addEventListener(ev, f){ (this.oyentes[ev] = this.oyentes[ev] || []).push(f); },
      querySelectorAll(){ return []; } };
    const el = (id) => ({ id: id, dataset: {}, attrs: {}, style: {}, textContent: '', innerHTML: '', classList: clases(),
      setAttribute(k, v){ this.attrs[k] = String(v); }, getAttribute(k){ return this.attrs[k]; },
      querySelector(){ return null; }, querySelectorAll(){ return []; }, focus(){ doc.foco = this.id; } });
    ['tbDisp', 'tbDispEt', 'tbDispIc', 'tbDispMenu'].forEach(id => { doc.els[id] = el(id); });
    const ultimo = (ev) => doc.oyentes[ev][doc.oyentes[ev].length - 1];
    const monta = (o) => {
      o = o || {};
      const X = { diario: [], avisos: [], guardado: {}, sync: Object.assign({ isOn: false, channel: null, role: null }, o.sync || {}) };
      X.M = montar([R_DISP],
        ['dispCambiarA', 'dispResincronizar', 'dispNavPintar', 'dispNavAbrir', 'dispNavAbierto', 'rol: () => DEVROLE',
         'perfilDispositivo', 'perfilUsaDispositivo', 'dispSoltar', 'ponRol: (r) => { DEVROLE = r; }'],
        { document: doc, DEVROLE: ('rol' in o) ? o.rol : 'pc', sync: X.sync, DDL_MODO: o.modo || 'grabacion',
          TP: X.tp = o.tp || { on: false },
          /* Como el de verdad: deja puesto el papel elegido y luego sigue. */
          askRoleAtLogin: (cb) => { X.diario.push('preguntar dispositivo'); X.alElegir = (r) => { X.M.ponRol(r); cb(); }; },
          localStorage: { setItem: (k, v) => { X.guardado[k] = v; }, getItem: () => null },
          syncDisconnect: () => { X.diario.push('cortar'); X.sync.isOn = false; X.sync.channel = null; X.sync.role = null; },
          applyDeviceRole: () => X.diario.push('aplicar'), autoSync: () => X.diario.push('conectar'),
          DDL_UI: { toast: (m) => X.avisos.push(m) }, fallo: () => {},
          closeUserMenu: () => {}, perfilNavCerrar: () => X.diario.push('cerrar perfil') });
      return X;
    };
    const A = monta({ rol: 'pc', sync: { isOn: true, channel: {}, role: 'pc' } });
    t.eq('elegir otro dispositivo lo pone', A.M.dispCambiarA('tablet') + '|' + A.M.rol(), 'true|tablet');
    t.eq('cortando la sincronía y volviéndola a abrir con el papel nuevo', A.diario.join(','), 'aplicar,cortar,conectar',
         'el otro equipo tiene que enterarse de quién es cada uno');
    t.eq('y el papel de la sincronía es el nuevo', A.sync.role, 'tablet',
         'cortar la sincronía borra el papel: ponerlo antes de cortar lo dejaba vacío');
    t.eq('se recuerda', A.guardado.ddl_role, 'tablet');
    t.eq('y se dice', A.avisos.join(), 'Este dispositivo: Tablet · Director');
    const B = monta({ rol: 'pc' });
    B.M.dispCambiarA('talent');
    t.eq('sin sincronía en marcha no hay nada que cortar', B.diario.join(','), 'aplicar,conectar');
    const R = monta({ rol: 'tablet', sync: { isOn: true, channel: {}, role: 'talent' } });
    t.eq('elegido en la pantalla de espera del actor, también se reabre la sincronía',
         R.M.dispResincronizar() + '|' + R.diario.join(',') + '|' + R.sync.role, 'true|cortar,conectar|tablet',
         'antes cambiaba el papel sin avisar al otro equipo');
    t.ok('y es lo que hace ese botón al elegir',
         /askRoleAtLogin\(\(\)=>\{ try\{ dispResincronizar\(\); \}/.test(TODO));
    t.eq('sin papel no hay nada que sincronizar', monta({ rol: null }).M.dispResincronizar(), false);
    const C = monta({ rol: 'tablet' });
    t.eq('elegir el que ya es no hace nada', C.M.dispCambiarA('tablet') + '|' + C.diario.length + '|' + C.avisos.length, 'false|0|0');
    t.eq('ni lo que no es un dispositivo', monta().M.dispCambiarA('nevera'), false);

    const P = monta({ rol: 'talent' });
    P.M.dispNavPintar();
    t.eq('el botón dice qué equipo es', doc.els.tbDispEt.textContent + '|' + doc.els.tbDisp.dataset.disp, 'Tablet · Actor|talent');
    t.eq('también a quien no ve la pantalla', doc.els.tbDisp.attrs['aria-label'], 'Este dispositivo: Tablet · Actor. Cambiar de dispositivo');
    t.ok('con su dibujo', /<svg/.test(doc.els.tbDispIc.innerHTML));
    const menu = doc.els.tbDispMenu.innerHTML;
    t.eq('el menú trae los tres, también la tablet del actor', (menu.match(/role="menuitemradio"/g) || []).length, 3,
         'la ventana vieja de Sincronizar solo ofrecía tablet y escritorio');
    t.ok('marcado solo el que es', (menu.match(/aria-checked="true"/g) || []).length === 1 && /data-d="talent" aria-checked="true"/.test(menu));
    monta({ rol: null }).M.dispNavPintar();
    t.eq('sin elegir, lo dice', doc.els.tbDispEt.textContent + '|' + doc.els.tbDisp.attrs['aria-label'],
         'Dispositivo|Sin dispositivo elegido. Cambiar de dispositivo');

    const H = monta();
    const ev = { stopPropagation: () => {} };
    H.M.dispNavAbrir(ev);
    t.ok('pulsarlo abre el menú', H.M.dispNavAbierto() && doc.els.tbDisp.attrs['aria-expanded'] === 'true');
    t.ok('y cierra el del perfil, que no se pisen', H.diario.includes('cerrar perfil'));
    H.M.dispNavAbrir(ev);
    t.ok('pulsarlo otra vez lo cierra', !H.M.dispNavAbierto());
    H.M.dispNavAbrir(ev);
    ultimo('click')();
    t.ok('pulsar fuera lo cierra', !H.M.dispNavAbierto());
    H.M.dispNavAbrir(ev);
    doc.foco = null;
    ultimo('keydown')({ key: 'Escape', preventDefault: () => {} });
    t.ok('Escape lo cierra y devuelve el foco al botón', !H.M.dispNavAbierto() && doc.foco === 'tbDisp');

    t.seccion('12i2c · solo Grabación lleva dispositivo');
    /* Pedido de sala: «QC y Casting no tienen que tener dispositivos: pregunta
       al principio de cada sesión qué tarea va a realizar, y si elige
       Grabación, sí despliega el formato de elegir dispositivo». */
    doc.els.envoltorioDisp = el('envoltorioDisp');
    doc.els.tbDisp.parentNode = doc.els.envoltorioDisp;
    t.ok('Grabación lleva dispositivo; QC y Casting no',
         monta().M.perfilUsaDispositivo('grabacion') && !monta().M.perfilUsaDispositivo('qc') && !monta().M.perfilUsaDispositivo('casting'));
    {
      let seguido = 0;
      const G = monta({ rol: null, modo: 'grabacion' });
      t.eq('elegir Grabación sin dispositivo lo pregunta', G.M.perfilDispositivo('grabacion', () => seguido++), 'preguntar');
      t.eq('con la pantalla de siempre, y sin seguir todavía', G.diario.join(',') + '|' + seguido, 'preguntar dispositivo|0');
      G.alElegir('tablet');
      t.eq('al elegirlo, sincroniza con su papel y sigue', G.diario.includes('conectar') + '|' + seguido, 'true|1');
    }
    {
      let seguido = 0;
      const G = monta({ rol: 'tablet', modo: 'grabacion' });
      t.eq('Grabación con dispositivo ya elegido no vuelve a preguntar', G.M.perfilDispositivo('grabacion', () => seguido++) + '|' + seguido, 'ya|1');
    }
    {
      let seguido = 0;
      const tp = { on: true };
      const Q = monta({ rol: 'tablet', modo: 'qc', tp: tp, sync: { isOn: true, channel: {}, role: 'tablet' } });
      t.eq('QC suelta el dispositivo', Q.M.perfilDispositivo('qc', () => seguido++) + '|' + Q.M.rol() + '|' + seguido, 'sin|null|1');
      t.ok('sin sincronía, que en un equipo solo no hace falta', Q.diario.includes('cortar') && Q.sync.role === null);
      t.eq('ni trackpad', tp.on, false);
      t.ok('y con la vista de un equipo solo', Q.diario.includes('aplicar'));
      t.ok('sin preguntar nada', !Q.diario.includes('preguntar dispositivo'));
    }
    {
      const C = monta({ rol: null, modo: 'casting' });
      t.eq('Casting sin dispositivo se queda así, sin tocar nada', C.M.perfilDispositivo('casting') + '|' + C.diario.length, 'sin|0');
    }
    monta({ rol: 'pc', modo: 'qc' }).M.dispNavPintar();
    t.eq('en QC el botón del dispositivo no sale', doc.els.envoltorioDisp.style.display, 'none');
    monta({ rol: null, modo: 'casting' }).M.dispNavPintar();
    t.eq('ni en Casting', doc.els.envoltorioDisp.style.display, 'none');
    monta({ rol: 'pc', modo: 'grabacion' }).M.dispNavPintar();
    t.eq('en Grabación, sí', doc.els.envoltorioDisp.style.display, '');
    t.ok('cambiar de perfil lo repinta', /try\{ dispNavPintar\(\); \}catch\(e\)\{ fallo\('dispNavPintar · index\.html:ponerModo'/.test(TODO));
    t.ok('y abrir un capítulo pone el dispositivo de acuerdo con su perfil',
         /const ajustar = \(m\) => \{ try\{ perfilDispositivo\(m\); \}/.test(TODO)
         && /if\(toca\)\{ ponerModo\(epId, toca\); ajustar\(toca\); return toca; \}/.test(TODO));

    const PAGINA = require('fs').readFileSync(require('./ayuda').INDEX, 'utf8').replace(/\r\n/g, '\n');
    const barra = PAGINA.slice(PAGINA.indexOf('<div id="topbar">'), PAGINA.indexOf('<div class="epline" id="epLine"'));
    t.ok('va en la barra de arriba, junto al del perfil', barra.indexOf('id="tbDisp"') > barra.indexOf('id="tbPerfil"')
         && barra.indexOf('id="tbPerfil"') > 0);
    t.ok('abrir el del perfil cierra el del dispositivo', /try\{ dispNavCerrar\(\); \}catch\(x\)/.test(TODO));
    t.ok('los dos se repintan cada vez que cambia el dispositivo',
         /try\{ dispNavPintar\(\); \}catch\(e\)\{ fallo\('dispNavPintar · index\.html:applyDeviceRole'/.test(TODO)
         && /try\{ perfilNavPintar\(\); \}catch\(e\)\{ fallo\('perfilNavPintar · index\.html:applyDeviceRole'/.test(TODO),
         'el del perfil se esconde en la tablet del actor');
    t.ok('el aviso «Escritorio Listo» se retira: el botón ya lo dice', /#topbar \.tb-dev\{ display:none; \}/.test(PAGINA));
    /* En el móvil, con los dos botones, la fila no cabía y la página se
       ensanchaba; y el menú del dispositivo, colgado de su botón, se salía por
       la derecha. Se vio en el navegador a 375 px. */
    const movil = PAGINA.slice(PAGINA.indexOf('@media(max-width:720px){\n  #topbar{ flex-wrap:wrap; gap:10px; }'));
    const movil1 = movil.slice(0, movil.indexOf('\n}') + 2);
    t.ok('en el móvil el dispositivo se queda con su dibujo', /#topbar #tbDispEt\{ display:none; \}/.test(movil1), movil1.slice(0, 200));
    t.ok('los menús cuelgan de la fila, no del botón', /#topbar \.tb-perfil-w\{ position:static; \}/.test(movil1)
         && /#topbar \.tb-perfil-menu\{ left:auto; right:0; width:min\(300px, calc\(100vw - 32px\)\); \}/.test(movil1));
    t.ok('y la fila puede partirse en dos', /#topbar \.tb-right\{ flex-wrap:wrap; justify-content:flex-end; \}/.test(movil1));
  }

  t.seccion('12i3 · QC entra directo al libreto, y cada caja con el color de su personaje');
  /* Pedido de sala: «no quiero ver las tarjetas de personajes, quiero ingresar
     de una vez al libreto» -en QC-, «y que cada caja de personaje tenga un
     reborde del color del personaje». */
  {
    const R_DIRECTO = ['/* ═══ QC ENTRA DIRECTO AL LIBRETO', '/**\n * Se llama al terminar de abrir un capítulo.'];
    const libro = (o) => {
      o = o || {};
      const abiertos = [];
      const host = ('host' in o) ? o.host : { style: { display: 'none' } };
      const M = montar([R_DIRECTO], ['libretoDirecto', 'PERFIL_DIRECTO'],
        { DDL_MODO: o.modo || 'qc', script: ('script' in o) ? o.script : [{ key: 'A' }],
          document: { getElementById: (id) => (id === 'libInline' ? host : null) },
          openLibretoInline: (k) => abiertos.push(k) });
      return { M: M, abiertos: abiertos };
    };
    const Q = libro();
    t.eq('en QC se abre el libreto completo', Q.M.libretoDirecto() + '|' + JSON.stringify(Q.abiertos), 'true|[null]');
    t.eq('también la primera vez, sin libreto creado todavía', libro({ host: null }).M.libretoDirecto(), true);
    t.eq('con el libreto ya a la vista no se vuelve a abrir', libro({ host: { style: { display: 'block' } } }).M.libretoDirecto(), false);
    t.eq('en Grabación no', libro({ modo: 'grabacion' }).M.libretoDirecto(), false);
    t.eq('ni en Casting: el pedido era para QC', libro({ modo: 'casting' }).M.libretoDirecto(), false);
    t.eq('sin libreto cargado, nada', libro({ script: [] }).M.libretoDirecto(), false);
    t.ok('al abrir un capítulo, en cuanto se sabe el perfil',
         /Promise\.resolve\(modoAlAbrir\(currentEp\.id, currentEp\.name\)\)\s*\.then\(\(\)=>\{ try\{ libretoDirecto\(\);/.test(TODO));
    t.ok('también por los otros dos caminos de abrir',
         /fallo\('libretoDirecto · index\.html:openEpisodeFromJson'/.test(TODO)
         && /fallo\('libretoDirecto · index\.html:openEpisodeLegacy'/.test(TODO));

    /* El reborde cuelga del perfil puesto en la raíz del libreto. */
    const attrs = {};
    const P = montar([['function perfilPintar(){', '/** ¿Lleva vídeo este perfil? */']], ['perfilPintar'],
      { pop2: { doc: { documentElement: { setAttribute: (k, v) => { attrs[k] = v; } }, getElementById: () => null } },
        DDL_MODO: 'qc' });
    P.perfilPintar();
    t.eq('el libreto sabe en qué perfil está, aunque no tenga barra', attrs['data-perfil'], 'qc',
         'en la raíz y no en el body: cambiar el tema reescribe las clases del body');
    t.ok('y en QC cada caja lleva el reborde del color de su personaje',
         /html\[data-perfil="qc"\] body #lBlocks \.blk\.blk:not\(\.narr\)\{\s*border:1px solid color-mix\(in srgb, var\(--pc,#5FC85A\) 38%, transparent\) !important;/.test(TODO),
         'sutil, pedido de sala: a 2 px y a color entero cada caja gritaba');
    t.ok('la del personaje resaltado, algo más marcada',
         /html\[data-perfil="qc"\] body #lBlocks \.blk\.blk\.mine:not\(\.narr\)\{\s*border-color:color-mix\(in srgb, var\(--pc,#5FC85A\) 70%, transparent\) !important;/.test(TODO));
    t.ok('y pesa más que el resaltado del tema claro, que le ponía su azul',
         /body\.light #lBlocks \.blk\.mine:not\(\.rec\)\{/.test(TODO),
         'si esa regla cambia, hay que volver a mirar el reborde con el tema claro');
    t.ok('el color es el de cada caja: cada una trae el de su personaje',
         /data-pg="'\+b\.page\+'" style="--pc:'\+bcolor\+'"/.test(TODO));
  }

  t.seccion('12i4 · en QC, A− y A+ agrandan el libreto entero; y las herramientas se esconden');
  /* Pedido de sala: «los botones de agrandar letra no sirven en QC porque
     agrandan solo el personaje que se seleccione, pero como no se selecciona
     ningún personaje entonces no agranda». Y «que se pueda ocultar las
     herramientas que tiene QC y solo ver el libreto». */
  {
    const R_LETRA = ['/** ¿Se prefieren las herramientas de QC escondidas?', '/* De quién es cada herramienta del cajón.'];
    const conLetra = (o) => {
      o = o || {};
      const guardado = Object.assign({}, o.guardado || {});
      const vars = {}, clases = new Set(o.clases || []);
      const M = montar([R_LETRA], ['qcSinHerramientas', 'qcSinHerramientasPoner', 'qcFs', 'qcFsPoner', 'letraDeTodo', 'QC_FS_DEFECTO'], {
        DDL_MODO: o.modo || 'qc',
        localStorage: { getItem: (k) => (k in guardado ? guardado[k] : null), setItem: (k, v) => { guardado[k] = String(v); } },
        pop2: { doc: { documentElement: { style: { setProperty: (k, v) => { vars[k] = v; } } },
                       body: { classList: { toggle: (c, on) => { if(on) clases.add(c); else clases.delete(c); } } } } },
        libSyncHeadH: () => { M._medida = (M._medida || 0) + 1; } });
      M._guardado = guardado; M._vars = vars; M._clases = clases;
      return M;
    };
    const L = conLetra();
    t.eq('en QC los botones de la letra son del libreto entero', L.letraDeTodo(), true);
    t.eq('en Grabación, del personaje abierto, como siempre', conLetra({ modo: 'grabacion' }).letraDeTodo(), false);
    t.eq('la letra de QC empieza en la de siempre, 16', L.qcFs(), 16);
    t.eq('y se pone en el libreto entero por --qcfs', (L.qcFsPoner(20), L._vars['--qcfs']), '20px');
    t.eq('se recuerda en el aparato', L._guardado['ddl_qc_fs'], '20');
    t.eq('y se lee de ahí', conLetra({ guardado: { ddl_qc_fs: '24' } }).qcFs(), 24);
    t.eq('una guardada absurda no vale', conLetra({ guardado: { ddl_qc_fs: '900' } }).qcFs(), 16);
    t.eq('con tope por arriba y por abajo', L.qcFsPoner(500) + ' ' + L.qcFsPoner(2), '60 13');
    t.ok('la regla manda sobre TODAS las cajas de QC, incluida la del personaje abierto y el área escalada',
         /html\[data-perfil="qc"\] body #lBlocks \.blk \.tx,\s*html\[data-perfil="qc"\] body\.fixedlay #lBlocks \.blk \.tx,\s*html\[data-perfil="qc"\] body\.fixedlay #lBlocks \.blk\.mine \.tx\{\s*font-size:var\(--qcfs,16px\) !important;/.test(TODO));
    t.ok('los botones de la letra preguntan si son de todo antes de tocar el personaje abierto',
         /const letra = \(arriba\)=>\{\s*if\(letraDeTodo\(\)\)\{\s*qcFsPoner\(arriba \? libFsUp\(qcFs\(\)\) : libFsDn\(qcFs\(\)\)\);/.test(TODO));
    t.ok('y al abrir el libreto se pone la letra de QC guardada', /try\{ qcFsPoner\(qcFs\(\)\); \}catch/.test(TODO));
    t.ok('y el botón lo dice: en QC es la letra, no la del personaje',
         /tit\('lFontUp', m === 'qc' \? 'Letra más grande' : 'Letra del personaje más grande'\);/.test(TODO));

    t.eq('las herramientas empiezan a la vista', L.qcSinHerramientas(), false);
    L.qcSinHerramientasPoner(true);
    t.ok('esconderlas pone la clase y se recuerda', L._clases.has('sinherr') && L._guardado['ddl_qc_sinherr'] === '1');
    t.eq('y se vuelve a medir la barra de arriba, que cambia de alto', L._medida, 1);
    L.qcSinHerramientasPoner(false);
    t.ok('sacarlas la quita', !L._clases.has('sinherr') && L._guardado['ddl_qc_sinherr'] === '0');
    t.eq('lo recordado se lee', conLetra({ guardado: { ddl_qc_sinherr: '1' } }).qcSinHerramientas(), true);
    t.ok('la barra de QC lleva el botón de esconderla y la pestaña de volver a verla',
         /\+ \(m === 'qc' \? '<button class="lp-ocultar" id="lpOcultar"/.test(TODO) && /\+ \(m === 'qc' \? '<button id="lpVer"/.test(TODO));
    t.ok('al pintar la barra se aplica lo recordado, y solo en QC',
         /d\.body\.classList\.toggle\('sinherr', m === 'qc' && qcSinHerramientas\(\)\);/.test(TODO));
    t.ok('escondidas, de la barra solo queda la pestaña',
         /html\[data-perfil="qc"\] body\.sinherr \.lperfil > :not\(#lpVer\)\{ display:none !important; \}/.test(TODO));
  }

  t.seccion('12j · QC no lleva vídeo');
  /* Pedido de sala: «quita la opcion de video en QC y todas las herramientas
     de video». El video no tiene un dueño unico -lo llevan Grabacion y
     Casting-, asi que no cabe en la tabla de dueños: se dice que perfiles NO
     lo llevan. */
  const R_TABLA = ['/* De quién es cada herramienta del cajón.', '/**\n * Deja en el cajón'];
  const R_VIDEO = ['/**\n * Quita lo que es vídeo en los perfiles', '/* ═══ QC · CONTROL DE CALIDAD'];
  const V = montar([R_TABLA], ['PERFIL_SIN_VIDEO', 'PERFIL_VIDEO', 'perfilLlevaVideo', 'perfilVeLaHerramienta'],
                   { window: {}, console: { warn: () => {}, log: () => {} } });
  t.eq('QC no lo lleva', V.perfilLlevaVideo('qc'), false);
  t.eq('Grabación sí', V.perfilLlevaVideo('grabacion'), true);
  t.eq('Casting también', V.perfilLlevaVideo('casting'), true,
       'solo se pidió quitarlo de QC: quitarlo de más es romperle la sala a quien graba');
  t.eq('y un perfil que no se sabe cuál es no lo pierde', V.perfilLlevaVideo(undefined), true,
       'ante la duda se deja como estaba');
  ['lVid', 'btnModoEst'].forEach(id => {
    t.ok('en QC no se ve ' + id, !V.perfilVeLaHerramienta(id, 'qc'));
    t.ok('en Grabación sí se ve ' + id, V.perfilVeLaHerramienta(id, 'grabacion'));
    t.ok('y en Casting también ' + id, V.perfilVeLaHerramienta(id, 'casting'));
  });
  /* «Seguir» salió de QC con el vídeo y volvió a pedido de sala: en QC sigue al
     contador de Pro Tools leído de la pantalla, que no necesita vídeo. */
  t.ok('Seguir se ve en los tres perfiles', ['qc', 'grabacion', 'casting'].every(m => V.perfilVeLaHerramienta('lSeguir', m)),
       'es el seguimiento de QC: se lee de la pantalla, no del vídeo');
  t.eq('y ya no cuenta como herramienta de vídeo', V.PERFIL_VIDEO.indexOf('lSeguir'), -1);
  t.ok('lo de QC sigue siendo de QC', V.perfilVeLaHerramienta('tQcCotejar', 'qc')
       && !V.perfilVeLaHerramienta('tQcCotejar', 'grabacion'),
       'la tabla del vídeo no puede llevarse por delante la de los dueños');
  t.ok('y leer sigue siendo de todos', V.perfilVeLaHerramienta('tFind', 'qc'));

  /* Un DOM de mentira con lo unico que se le toca a cada boton: el estilo en
     linea, con su prioridad, que es justo lo que decide si se ve o no. */
  const boton = () => {
    const b = { style: { props: {},
      setProperty(k, v, p){ b.style.props[k] = v + (p ? ' !' + p : ''); },
      removeProperty(k){ delete b.style.props[k]; } },
      atrib: {},
      setAttribute(k, v){ b.atrib[k] = v; },
      removeAttribute(k){ delete b.atrib[k]; } };
    return b;
  };
  const conVideo = (estado) => {
    const e = Object.assign({ estudio: false, karaoke: false, tcp: null }, estado || {});
    const dentro = { lVid: boton(), lSeguir: boton() };           // la barra del libreto
    const fuera = { btnModoEst: boton() };                        // la pantalla del capítulo
    const tcs = [boton(), boton()];
    tcs.forEach(x => { x.atrib.title = 'Clic: saltar el video aquí'; });
    const diario = [];
    const M = montar([R_TABLA, R_VIDEO],
      ['perfilAjustarVideo', 'perfilPistaDelTc', 'perfilSoltarVideo'], {
        window: {},
        document: { getElementById: (id) => {
          if(id === 'tcpOv') return e.panelPt ? { remove: () => diario.push('cierra el panel de Pro Tools') } : null;
          return fuera[id] || null;
        } },
        libPintarSeguir: () => diario.push('viste Seguir'),
        studioStripOn: () => e.estudio,
        studioToggleStrip: () => { e.estudio = !e.estudio; diario.push('estudio → ' + (e.estudio ? 'abierto' : 'cerrado')); },
        karWinAbierta: () => e.karaoke,
        karWinCerrar: () => { e.karaoke = false; diario.push('cierra el karaoke'); },
        TCP: e.tcp,
        tcpParar: () => diario.push('para Pro Tools'),
        tcpSoltar: () => diario.push('suelta la pantalla'),
        fallo: (d) => diario.push('fallo: ' + d),
        console: { warn: () => {}, log: () => {} }
      });
    const doc = { getElementById: (id) => dentro[id] || null,
                  querySelectorAll: (s) => (s === '.bhead .tc' ? tcs : []) };
    return { M, doc, dentro, fuera, tcs, diario, e };
  };

  const Q = conVideo();
  Q.M.perfilAjustarVideo(Q.doc, 'qc');
  t.eq('en QC se esconde el botón Vídeo', Q.dentro.lVid.style.props.display, 'none !important',
       'la barra del libreto impone su display con !important: sin prioridad, el botón se queda a la vista');
  t.ok('pero Seguir NO se esconde', !('display' in Q.dentro.lSeguir.style.props),
       JSON.stringify(Q.dentro.lSeguir.style.props));
  t.eq('y el Video Estudio de la pantalla del capítulo', Q.fuera.btnModoEst.style.props.display, 'none !important',
       'abre el mismo panel por otra puerta');
  t.ok('el timecode deja de prometer el vídeo', Q.tcs.every(x => !('title' in x.atrib)),
       JSON.stringify(Q.tcs.map(x => x.atrib)));
  Q.M.perfilAjustarVideo(Q.doc, 'grabacion');
  t.ok('al volver a Grabación, vuelven los dos',
       !('display' in Q.dentro.lVid.style.props) && !('display' in Q.fuera.btnModoEst.style.props),
       JSON.stringify([Q.dentro.lVid.style.props, Q.fuera.btnModoEst.style.props]));
  t.ok('y Seguir se vuelve a vestir', Q.diario.includes('viste Seguir'),
       'sin su display en línea cae en el círculo de 34 px, con la etiqueta saliéndose');
  t.ok('y el timecode vuelve a decir lo suyo',
       Q.tcs.every(x => x.atrib.title === 'Clic: saltar el video aquí'));
  t.eq('la pista, en QC, vacía', Q.M.perfilPistaDelTc('qc'), '');

  /* Sin libreto abierto -la pantalla de las tarjetas- el boton de fuera se
     atiende igual. */
  const SL = conVideo();
  let roto = null;
  try{ SL.M.perfilAjustarVideo(null, 'qc'); }catch(e){ roto = e.message; }
  t.eq('sin libreto abierto no revienta', roto, null);
  t.eq('y el botón de la pantalla del capítulo se esconde igual',
       SL.fuera.btnModoEst.style.props.display, 'none !important',
       'es justo donde vive: con el libreto cerrado');

  t.seccion('12k · al entrar en QC se cierra lo que de vídeo hubiera abierto');
  /* Esconder el boton no basta: el panel se quedaria desplegado sin nada con
     que cerrarlo. */
  const AB = conVideo({ estudio: true, karaoke: true, tcp: { on: true, stream: {} }, panelPt: true });
  const cerrado = AB.M.perfilSoltarVideo('qc');
  t.eq('se cierra el estudio', AB.e.estudio, false);
  t.ok('y el karaoke', AB.diario.includes('cierra el karaoke'));
  /* La lectura de Pro Tools NO se suelta: es el seguimiento de QC, y cortarla
     obligaría a volver a compartir la pantalla justo al entrar. */
  t.ok('la lectura de Pro Tools sigue', !AB.diario.includes('para Pro Tools') && !AB.diario.includes('suelta la pantalla'),
       'es el seguimiento de QC: el navegador no deja recordar el permiso de compartir');
  t.ok('ni se le cierra su panel', !AB.diario.includes('cierra el panel de Pro Tools'));
  t.eq('y dice qué ha cerrado', cerrado.join(','), 'estudio,karaoke');

  const CE = conVideo({ estudio: false });
  CE.M.perfilSoltarVideo('qc');
  t.eq('con el estudio CERRADO no se toca', CE.diario.filter(x => /estudio/.test(x)).length, 0,
       'el mando es un interruptor: tocarlo cerrado sería abrirlo');
  t.eq('y sigue cerrado', CE.e.estudio, false);

  const GR = conVideo({ estudio: true, karaoke: true, tcp: { on: true } });
  t.eq('al entrar en Grabación no se cierra nada', GR.M.perfilSoltarVideo('grabacion').length, 0);
  t.eq('el estudio sigue abierto', GR.e.estudio, true);
  t.eq('y nada se ha tocado', GR.diario.length, 0, JSON.stringify(GR.diario));

  /* Los cables. La tabla y las funciones pueden estar perfectas y no llamarlas
     nadie: es lo que paso con el cajon, y se vio mutando. */
  t.ok('cambiar de perfil suelta el vídeo', /try\{ perfilSoltarVideo\(m\); \}/.test(TODO));
  t.ok('y esconde los botones aunque no haya libreto abierto',
       /try\{ perfilAjustarVideo\(null, m\); \}/.test(TODO),
       'la barra del perfil no se pinta sin libreto, y el botón de la pantalla del capítulo vive fuera');
  t.ok('la barra del perfil también lo hace al pintarse',
       /perfilAjustarCajon\(d, m\);\s*perfilAjustarVideo\(d, m\);/.test(TODO),
       'el libreto se reconstruye entero al abrirlo y sus botones nacen a la vista');
  t.ok('el timecode pregunta al pintarse', /'<span class="tc"'\+pistaTc\+'>'/.test(TODO));
  t.eq('y ya no lo lleva escrito a fuego',
       (TODO.match(/title="Clic: saltar el video aquí"/g) || []).length, 0);

  /* Ningun aviso de QC puede mandar a una pantalla que QC no lleva. Se miran
     las CADENAS, no los comentarios: los comentarios cuentan la historia y
     ahi el Video Estudio sale con todo derecho. */
  const sinComentarios = (s) => s.replace(/\/\*[\s\S]*?\*\//g, ' ').replace(/(^|\s)\/\/[^\n]*/g, '$1');
  const deQC = sinComentarios(TODO.slice(TODO.indexOf('async function qcCargarAudio'),
                                         TODO.indexOf('/* ═══ GUION DE WORD EN TABLA')));
  t.ok('se ha recortado lo de QC', deQC.length > 3000, String(deQC.length));
  const cadenas = deQC.match(/'(?:[^'\\\n]|\\.)*'/g) || [];
  t.ok('y tiene avisos que mirar', cadenas.length > 40, String(cadenas.length));
  t.eq('ningún aviso de QC manda al Video Estudio',
       cadenas.filter(c => /video estudio|v[ií]deo/i.test(c)).join(' | '), '',
       'mandar a quien revisa a un botón que no tiene es dejarle sin salida');
  t.ok('y el aviso del final del cotejo dice dónde mirar según el perfil',
       /!perfilLlevaVideo\(DDL_MODO\)\) \? '«≠ Cambios»' : '«📋 Cues»';/.test(TODO),
       '«📋 Cues» es del Video Estudio');

  t.seccion('12l · dónde empieza el audio, corregido desde QC');
  /* Vivia solo en el Video Estudio. Sin esto, al quitar el video de QC quien
     revisa se quedaba sin donde arreglar un cotejo que mira en otro sitio. */
  const conInicio = (inicio, cotejo) => {
    const w = { _cotejo: cotejo || {} };
    const e = { tc0: inicio || 0, puestos: [], marcas: new Map([[1, 'x']]), cola: [1, 2], cache: new Map([[1, 'y']]) };
    const M = montar([['/* ═══ QC · CONTROL DE CALIDAD', '/** El panel de las correcciones'],
                      ['/* ═══ QC · DÓNDE EMPIEZA EL AUDIO', '/** El panel donde se corrige']],
      ['qcInicioTexto', 'qcInicioLeer', 'qcInicioPoner'], {
        window: w,
        studioTc0: () => e.tc0,
        studioSetTc0: (v, guarda) => { e.tc0 = v; e.puestos.push([v, guarda]); },
        qcTC: (s) => 'TC' + s,
        karIa: { marcas: e.marcas, cola: e.cola, hechos: 7 },
        kar: { cache: e.cache },
        fallo: () => {},
        console: { warn: () => {}, log: () => {} }
      });
    return { M, w, e };
  };
  const I0 = conInicio(0);
  t.eq('se lee con fotogramas', I0.M.qcInicioLeer('01:00:00:00'), 3600);
  t.eq('y sin ellos', I0.M.qcInicioLeer('00:59:50'), 3590);
  t.eq('el cero vale', I0.M.qcInicioLeer('00:00:00:00'), 0, 'hay audios que empiezan en cero');
  t.eq('vacío no es un inicio', I0.M.qcInicioLeer(''), null);
  t.eq('una errata tampoco', I0.M.qcInicioLeer('a las diez'), null,
       'una errata no puede mover el audio de sitio');
  t.eq('y se enseña el que vale', conInicio(3590).M.qcInicioTexto(), 'TC3590');

  const I1 = conInicio(0, { 0: { sim: 0.3 }, 1: { sim: 0.9 } });
  const r1 = I1.M.qcInicioPoner(3590);
  t.eq('se cambia', r1 && r1.cambio, true);
  t.eq('al que se pidió', I1.e.tc0, 3590);
  t.eq('guardándolo', JSON.stringify(I1.e.puestos), '[[3590,true]]');
  t.eq('y lo cotejado caduca', Object.keys(I1.w._cotejo).length, 0,
       'cada parlamento se buscó en el trozo de audio que decía el inicio de antes');
  t.eq('diciendo cuántos eran', r1.caducados, 2);
  t.eq('con las marcas de palabra del reconocedor', I1.e.marcas.size + I1.e.cache.size + I1.e.cola.length, 0);

  const I2 = conInicio(3590, { 0: { sim: 0.3 } });
  const r2 = I2.M.qcInicioPoner(3590);
  t.eq('guardar el MISMO no cambia nada', r2 && r2.cambio, false);
  t.eq('ni borra lo cotejado', Object.keys(I2.w._cotejo).length, 1,
       'abrir el panel y darle a Guardar sin tocar nada no puede costar un cotejo de diez minutos');
  t.eq('ni escribe', I2.e.puestos.length, 0);

  const I3 = conInicio(3590, { 0: { sim: 0.3 } });
  [null, '', '   ', 'ayer', -5, true].forEach(malo => {
    t.eq('lo que no vale no se pone: ' + JSON.stringify(malo), I3.M.qcInicioPoner(malo), null);
  });
  t.eq('y no ha tocado el inicio', I3.e.tc0, 3590);
  t.eq('ni lo cotejado', Object.keys(I3.w._cotejo).length, 1);
  const r3 = I3.M.qcInicioPoner(0);
  t.eq('pero el cero SÍ se puede poner', r3 && r3.cambio && I3.e.tc0 === 0, true);

  /* El panel no se prueba -es DOM-, pero sus tres promesas se miran en el
     codigo, que es donde se romperian sin que nada avisara. */
  t.ok('con una errata el panel vuelve con lo tecleado',
       /qcInicioPanel\('No se entiende ese timecode[^']*', puesto\); return;/.test(TODO),
       'repintar no puede borrarle a nadie lo que acaba de escribir');
  const atajos = (TODO.match(/\['#qcIniHora', '#qcIniCero'\]\.forEach\(s => \{[\s\S]*?\n  \}\);/) || [''])[0];
  t.ok('los atajos existen', atajos.length > 80, String(atajos.length));
  t.eq('y rellenan, no guardan', (atajos.match(/guardar\(|qcInicioPoner\(/g) || []).length, 0,
       'guardar caduca el cotejo, y eso no se hace con un toque de más');
  t.ok('lo borrado se borra también en la nube', /if\(r\.caducados\) qcGuardado\(\);/.test(TODO),
       'si no, al reabrir el capítulo resucita el cotejo medido con el inicio de antes');
  t.ok('al cargar el audio se dice SIEMPRE el inicio que vale',
       /' · se supone que empieza en ' : ' · empieza en '\)\s*\+ qcTC\(studioTc0\(\)\)/.test(TODO),
       'el que viene puesto de antes es el que más engaña');
  t.ok('y si nada cayó dentro del audio, se abre donde se arregla',
       /if\(!r\.hechos\)\{[\s\S]{0,900}?qcInicioPanel\(queHaPasado\)/.test(TODO));
  t.ok('el botón de la barra enseña el inicio', /h\.inicio && ini \? \('<b class="lp-tc">'/.test(TODO));

  t.seccion('12m · el aviso de la barra no se pierde ni engaña');
  /* La fila del avance cuelga de la barra del perfil, y repintar la barra se
     la llevaba: el «412 comparados» del final se escribia y se borraba en la
     linea siguiente. */
  t.ok('la fila se aparta antes de repintar la barra',
       /const avance = barra\.querySelector\('#qcAvance'\);\s*if\(avance && avance\.parentNode\) avance\.parentNode\.removeChild\(avance\);/.test(TODO));
  t.ok('y se vuelve a colgar después, solo en QC',
       /if\(avance && m === 'qc'\) barra\.appendChild\(avance\);/.test(TODO),
       'en los otros dos perfiles esa fila no pinta nada');
  t.ok('la barra y la tira salen solo mientras trabaja',
       /\+ \(!activo \? '<span class="qc-av-hueco"><\/span>'/.test(TODO),
       'un aviso terminado con la tira moviéndose dice que sigue en ello');
  t.ok('y un aviso terminado se puede quitar', /id="qcAvFuera"/.test(TODO)
       && /fuera\.onclick = \(\)=>\{ const c = d\.getElementById\('qcAvance'\); if\(c\) c\.remove\(\); \};/.test(TODO));

  t.seccion('12n · la barra de arriba, también: solo las herramientas de cada quien');
  /* Pedido de sala, el mismo de 12c. El cajon ya lo cumplia, pero la barra de
     arriba seguia enseñando en QC y en Casting el lapiz, el pincel, el
     engranaje entero y «✓ Pagina grabada»: lo de marcar, por otra puerta. */
  const R_BARRA = ['/**\n * Deja en la barra de arriba SOLO', '/**\n * Quita lo que es vídeo en los perfiles'];
  const PB = montar([R_TABLA],
    ['PERFIL_BARRA_DE', 'PERFIL_ENGRANAJE_DE', 'PERFIL_CON_CAJON', 'PERFIL_CAJON_DE',
     'perfilVeLaHerramienta', 'perfilVeEnLaBarra'],
    { window: {}, console: { warn: () => {}, log: () => {} } });
  const TRES = ['grabacion', 'qc', 'casting'];
  const DE_LA_BARRA = ['lTablet', 'lDraw', 'lBrushFab', 'lRec'];
  const DEL_ENGRANAJE = ['gmDone', 'gmEdit', 'gmPause', 'gmUnpause', 'gmAccent', 'gmClear',
                         'gmComp', 'gmSplit', 'gmMerge'];

  DE_LA_BARRA.forEach(id => {
    t.eq('marcar es de quien graba, esté el botón donde esté: ' + id, PB.PERFIL_BARRA_DE[id], 'grabacion');
    t.ok('quien graba lo ve: ' + id, PB.perfilVeLaHerramienta(id, 'grabacion'));
    t.ok('quien revisa no: ' + id, !PB.perfilVeLaHerramienta(id, 'qc'));
    t.ok('y quien reparte tampoco: ' + id, !PB.perfilVeLaHerramienta(id, 'casting'));
  });
  DEL_ENGRANAJE.forEach(id => {
    t.eq('lo que actúa sobre la caja es de quien graba: ' + id, PB.PERFIL_ENGRANAJE_DE[id], 'grabacion');
    t.ok('quien graba lo ve: ' + id, PB.perfilVeLaHerramienta(id, 'grabacion'));
    t.ok('quien revisa no: ' + id, !PB.perfilVeLaHerramienta(id, 'qc'));
    t.ok('y quien reparte tampoco: ' + id, !PB.perfilVeLaHerramienta(id, 'casting'));
  });
  t.eq('en la barra no hay más dueños que esos', Object.keys(PB.PERFIL_BARRA_DE).sort().join(','),
       DE_LA_BARRA.slice().sort().join(','),
       'un botón de leer con dueño desaparece de las otras dos fases');
  t.eq('ni en el engranaje', Object.keys(PB.PERFIL_ENGRANAJE_DE).sort().join(','),
       DEL_ENGRANAJE.slice().sort().join(','));

  /* El engranaje y los colores NO son de marcar: son como se ve el libreto. */
  TRES.forEach(m => {
    t.ok('el engranaje se queda en ' + m, PB.perfilVeLaHerramienta('lGear', m),
         'dentro viven los colores, y su panel se coloca midiendo dónde está el botón');
    t.ok('y los colores también en ' + m, PB.perfilVeLaHerramienta('gmColors', m),
         'es una preferencia de vista, no una herramienta de marcar');
  });
  ['lBack', 'lGoto', 'lScope', 'lCharSel', 'lTheme', 'lFontDn', 'lFontUp', 'lFind', 'lPron', 'lHide',
   'lGear', 'lGearMenu', 'gmColors']
    .forEach(id => t.ok('leer, moverse y la vista no tienen dueño: ' + id,
      !(id in PB.PERFIL_BARRA_DE) && !(id in PB.PERFIL_ENGRANAJE_DE) && !(id in PB.PERFIL_CAJON_DE),
      'con dueño, en las otras fases el libreto no se podría ni recorrer'));
  t.ok('las tablas nuevas no se llevan por delante la del cajón',
       PB.perfilVeLaHerramienta('tQcCotejar', 'qc') && !PB.perfilVeLaHerramienta('tQcCotejar', 'grabacion')
       && PB.perfilVeLaHerramienta('tEdit', 'grabacion') && !PB.perfilVeLaHerramienta('tEdit', 'qc'));
  t.ok('ni la del vídeo', !PB.perfilVeLaHerramienta('lVid', 'qc') && PB.perfilVeLaHerramienta('lVid', 'casting'));

  /* El lapiz tiene dos oficios: en rol tablet abre el cajon de la derecha, que
     en QC trae las herramientas de QC. Donde hay cajon no se esconde. */
  t.eq('el lápiz es el único que hace de puerta del cajón', PB.PERFIL_CON_CAJON.join(','), 'lTablet');
  t.eq('en escritorio, en QC, el lápiz se va', PB.perfilVeEnLaBarra('lTablet', 'qc', false), false);
  t.eq('y en Casting', PB.perfilVeEnLaBarra('lTablet', 'casting', false), false);
  t.eq('con cajón, en QC, se queda', PB.perfilVeEnLaBarra('lTablet', 'qc', true), true,
       'es la puerta del cajón, que en QC trae las herramientas de QC');
  t.eq('y en Casting', PB.perfilVeEnLaBarra('lTablet', 'casting', true), true);
  t.eq('en Grabación se ve con cajón', PB.perfilVeEnLaBarra('lTablet', 'grabacion', true), true);
  t.eq('y sin él', PB.perfilVeEnLaBarra('lTablet', 'grabacion', false), true);
  ['lDraw', 'lBrushFab', 'lRec'].forEach(id => {
    t.eq('el cajón no salva a lo demás: ' + id, PB.perfilVeEnLaBarra(id, 'qc', true), false,
         'la excepción es del lápiz, no de todo lo que haya en la barra');
  });

  /* Un DOM de mentira, como el del video, con lo que aqui ademas se toca: las
     clases -la del cajon en el cuerpo, la del menu- y pulsar un boton. */
  const pieza = (clases) => {
    const e = boton();
    const cl = new Set(clases || []);
    e.clases = cl;
    e.classList = {
      contains: (c) => cl.has(c),
      add: (c) => { cl.add(c); },
      remove: (c) => { cl.delete(c); },
      toggle: (c, on) => {
        const pon = (on === undefined) ? !cl.has(c) : !!on;
        if(pon) cl.add(c); else cl.delete(c);
        return pon;
      }
    };
    e.pulsado = 0;
    e.click = () => { e.pulsado++; if(e.alPulsar) e.alPulsar(); };
    return e;
  };
  const DE_LEER = ['lBack', 'lScope', 'lTheme', 'lFontDn', 'lFontUp', 'lFind', 'lPron', 'lHide'];
  const conBarra = (opciones) => {
    const o = Object.assign({ cajon: false, sin: [] }, opciones || {});
    const piezas = {};
    DE_LA_BARRA.concat(DEL_ENGRANAJE, DE_LEER, ['lGear', 'lGearMenu', 'gmColors'])
      .filter(id => o.sin.indexOf(id) < 0)
      .forEach(id => { piezas[id] = pieza(); });
    const cuerpo = pieza(o.cajon ? ['haschips', 'dark'] : ['deskchips', 'dark']);
    const doc = { body: cuerpo, getElementById: (id) => piezas[id] || null, querySelectorAll: () => [] };
    const M = montar([R_TABLA, R_BARRA], ['perfilAjustarBarra'], {
      window: {}, pop2: { doc: doc }, fallo: () => {}, console: { warn: () => {}, log: () => {} }
    });
    const escondidos = () => Object.keys(piezas).filter(id => 'display' in piezas[id].style.props).sort();
    return { M, doc, piezas, cuerpo, escondidos };
  };
  const LO_DE_MARCAR = DE_LA_BARRA.concat(DEL_ENGRANAJE).sort();

  ['qc', 'casting'].forEach(m => {
    const E = conBarra();
    E.M.perfilAjustarBarra(E.doc, m);
    DE_LA_BARRA.concat(DEL_ENGRANAJE).forEach(id => {
      t.eq('en ' + m + ' se esconde ' + id, E.piezas[id].style.props.display, 'none !important',
           'la barra impone su display con !important: sin prioridad, el botón se queda a la vista');
    });
    t.eq('y en ' + m + ' no se esconde NADA más', E.escondidos().join(','), LO_DE_MARCAR.join(','),
         'leer, moverse, el engranaje y los colores son de los tres perfiles');
    t.ok('el menú se queda sin lo de la caja en ' + m, E.piezas.lGearMenu.clases.has('sin-caja'),
         'sin herramientas de caja, «Caja seleccionada: ninguna» no dice nada');
    t.eq('y el engranaje dice lo que tiene en ' + m, E.piezas.lGear.atrib.title, 'Colores del libreto',
         'prometer «herramientas de la caja» donde no las hay es mandar a buscar lo que no está');
    t.eq('también a quien no lo ve, en ' + m, E.piezas.lGear.atrib['aria-label'], 'Colores del libreto');
    t.eq('y el menú igual en ' + m, E.piezas.lGearMenu.atrib['aria-label'], 'Colores del libreto');

    E.M.perfilAjustarBarra(E.doc, 'grabacion');
    t.eq('al volver de ' + m + ' a Grabación vuelve todo', E.escondidos().join(','), '',
         JSON.stringify(E.escondidos()));
    t.ok('y el menú vuelve a hablar de la caja', !E.piezas.lGearMenu.clases.has('sin-caja'));
    t.eq('y el engranaje a decir lo suyo', E.piezas.lGear.atrib.title, 'Herramientas de la caja seleccionada');
    t.eq('con su etiqueta', E.piezas.lGear.atrib['aria-label'], 'Herramientas de la caja seleccionada');
    t.eq('y la del menú', E.piezas.lGearMenu.atrib['aria-label'], 'Herramientas de la caja seleccionada');
  });

  const EG = conBarra();
  EG.M.perfilAjustarBarra(EG.doc, 'grabacion');
  t.eq('en Grabación no se esconde nada', EG.escondidos().join(','), '');
  t.ok('ni se toca el menú', !EG.piezas.lGearMenu.clases.has('sin-caja'));

  /* Rol tablet: con el cajon, el lapiz se queda y lo demas se va igual. */
  ['qc', 'casting'].forEach(m => {
    const C = conBarra({ cajon: true });
    C.M.perfilAjustarBarra(C.doc, m);
    t.ok('con cajón, en ' + m + ' el lápiz se queda', !('display' in C.piezas.lTablet.style.props),
         JSON.stringify(C.piezas.lTablet.style.props));
    t.eq('y lo demás se va igual en ' + m, C.escondidos().join(','),
         LO_DE_MARCAR.filter(id => id !== 'lTablet').join(','));
  });
  /* Y si venia escondido de antes -el libreto no se reconstruye al cambiar de
     perfil-, con cajon se le DEVUELVE, no basta con no tocarlo. */
  const CV = conBarra({ cajon: true });
  CV.piezas.lTablet.style.setProperty('display', 'none', 'important');
  CV.M.perfilAjustarBarra(CV.doc, 'qc');
  t.ok('con cajón, un lápiz que venía escondido vuelve', !('display' in CV.piezas.lTablet.style.props));

  /* Lo que falte no puede tirar lo demas: la tablet del actor, el libreto a
     medio montar, o un boton que mañana se quite de la plantilla. */
  const F = conBarra({ sin: ['lBrushFab', 'lGear', 'lGearMenu', 'gmSplit'] });
  let rotoB = null;
  try{ F.M.perfilAjustarBarra(F.doc, 'qc'); }catch(e){ rotoB = e.message; }
  t.eq('si falta un botón no revienta', rotoB, null);
  t.eq('y los que sí están se esconden', F.piezas.lRec.style.props.display, 'none !important');
  t.eq('hasta el último', F.piezas.gmMerge.style.props.display, 'none !important');
  let rotoN = null;
  try{ F.M.perfilAjustarBarra(null, 'qc'); F.M.perfilAjustarBarra({}, 'qc'); }catch(e){ rotoN = e.message; }
  t.eq('y sin libreto abierto tampoco', rotoN, null);

  /* La plantilla. La tabla va por nombres, asi que cada entrada del engranaje
     tiene que llevar el suyo: una sin nombre no la puede esconder nadie, y una
     herramienta de caja nueva sin dueño saldria en las tres fases. */
  const menuTxt = TODO.slice(TODO.indexOf('<div class="gmenu" id="lGearMenu"'), TODO.indexOf('id="gmHint"'));
  const entradas = menuTxt.match(/<button class="gm-b[^>]*>/g) || [];
  t.ok('el menú del engranaje tiene entradas que mirar', entradas.length >= 10, String(entradas.length));
  const nombres = entradas.map(x => (x.match(/\sid="([^"]+)"/) || [])[1] || '');
  t.eq('todas llevan nombre', nombres.filter(x => !x).length, 0,
       'una entrada sin nombre no la puede esconder nadie: ' + entradas.filter(x => !/\sid="/.test(x)).join(' '));
  t.eq('y la única sin dueño es Colores',
       nombres.filter(id => !(id in PB.PERFIL_ENGRANAJE_DE)).join(','), 'gmColors',
       'una herramienta de caja nueva sin dueño saldría en QC y en Casting');
  DEL_ENGRANAJE.forEach(id => t.ok('está en el menú: ' + id, nombres.indexOf(id) >= 0,
    'un dueño de algo que no existe no esconde nada'));
  DE_LA_BARRA.concat(['lGear']).forEach(id => t.ok('está en el libreto: ' + id,
    new RegExp('<button[^>]*\\sid="' + id + '"').test(TODO)));
  t.ok('sin lo de la caja, el menú calla la cabecera y la pista',
       /\.gmenu\.sin-caja \.gm-head, \.gmenu\.sin-caja \.gm-hint\{ display:none !important; \}/.test(TODO),
       'la pista la repinta gearSync a cada caja que se toca: tiene que mandar la hoja de estilos');
  /* Los colores no pueden depender de que haya una caja elegida: en QC y en
     Casting son lo unico del menu, y ahi nadie elige caja para marcar. */
  t.ok('los colores se abren sin caja elegida',
       /if\(b\.id === 'gmColors'\)\{ gearToggle\(false\); try\{ libColorsPanel\(\); \}catch\(err\)\{ console\.error\(err\); \} return; \}\s*if\(b\.disabled\) return;/.test(TODO),
       'si la guarda de la caja fuera antes, en QC el botón no haría nada');
  t.ok('y nunca se quedan apagados',
       /if\(btn\.id === 'gmColors'\)\{ btn\.disabled = false; return; \}/.test(TODO));

  /* Los cables. Se vio con el cajon: la tabla perfecta y nadie mirandola. */
  t.ok('la barra del perfil ajusta la de arriba al pintarse',
       /perfilAjustarVideo\(d, m\);\s*perfilAjustarBarra\(d, m\);/.test(TODO),
       'el libreto se reconstruye entero al abrirlo y sus botones nacen a la vista');
  t.ok('y pregunta por el cajón en el propio libreto',
       /const conCajon = !!\(d\.body && d\.body\.classList && d\.body\.classList\.contains\('haschips'\)\);/.test(TODO));

  t.seccion('12o · al entrar en un perfil que no marca se suelta lo de marcar');
  /* Esconder el boton no basta: con el pincel puesto se seguiria pintando sobre
     el libreto, y con la pausa armada cada toque dejaria una, sin nada delante
     con que apagarlo. Lo mismo que con el video en 12k. */
  const conMarcas = (estado) => {
    const e = Object.assign({ pincel: false, clase: false, modo: null, editando: false,
                              abiertas: [], sin: [], sinLibreto: false, rompe: '' }, estado || {});
    const diario = [];
    const piezas = {};
    ['lpDone', 'tEdit', 'tPause', 'tUnpause', 'tAccent', 'gmEdit']
      .filter(id => e.sin.indexOf(id) < 0)
      .forEach(id => { piezas[id] = pieza(['on']); });
    const cuerpo = pieza(e.clase ? ['dark', 'drawmode'] : ['dark']);
    const p2 = { _draw: { on: e.pincel }, markMode: e.modo, editMode: e.editando, doc: null };
    if(piezas.lpDone) piezas.lpDone.alPulsar = () => {
      diario.push('pulsa Listo'); p2._draw.on = false; cuerpo.classList.remove('drawmode');
    };
    if(piezas.tEdit) piezas.tEdit.alPulsar = () => { diario.push('pulsa Editar del cajón'); p2.editMode = false; };
    const cajas = e.abiertas.map(a => {
      const tx = pieza();
      tx.atrib.contenteditable = 'true';
      tx.innerText = a.texto;
      tx.closest = (s) => (s === '.blk'
        ? { getAttribute: (k) => (k === 'data-si' ? (a.si == null ? null : String(a.si)) : null) }
        : null);
      return tx;
    });
    const doc = { body: cuerpo, getElementById: (id) => piezas[id] || null,
                  querySelectorAll: (s) => (s === '.blk .tx[contenteditable="true"]'
                    ? cajas.filter(c => c.atrib.contenteditable === 'true') : []) };
    if(!e.sinLibreto) p2.doc = doc;
    const M = montar([R_TABLA, R_BARRA], ['perfilSoltarMarcar'], {
      window: {}, pop2: p2,
      setMarkMode: (x) => {
        if(e.rompe === 'marcas') throw new Error('no hay libreto');
        diario.push('desarma: ' + x); p2.markMode = x;
      },
      saveEditBox: () => diario.push('guarda la caja del cajón'),
      syncSendMark: (si, marca) => diario.push('guarda ' + si + ': ' + marca.text),
      LIB_ICON: { edit: '[lápiz]' },
      fallo: (d) => diario.push('fallo: ' + d),
      console: { warn: () => {}, log: () => {} }
    });
    return { M, p2, doc, piezas, cuerpo, cajas, diario };
  };

  ['qc', 'casting'].forEach(m => {
    const P = conMarcas({ pincel: true, clase: true });
    const s = P.M.perfilSoltarMarcar(m);
    t.eq('al entrar en ' + m + ' se apaga el pincel', P.p2._draw.on, false,
         'sin botón a la vista seguiría pintando sobre el libreto');
    t.ok('por su propio «Listo»', P.diario.includes('pulsa Listo'),
         'es quien suelta los dedos a medio trazo');
    t.ok('y se va su barra de colores', !P.cuerpo.clases.has('drawmode'));
    t.eq('y lo dice', s.join(','), 'pincel');
  });

  const PS = conMarcas({ pincel: true, clase: true, sin: ['lpDone'] });
  PS.M.perfilSoltarMarcar('qc');
  t.eq('sin el botón «Listo» el pincel se apaga igual', PS.p2._draw.on, false);
  t.ok('y su barra se va igual', !PS.cuerpo.clases.has('drawmode'));
  const PV = conMarcas({ pincel: false, clase: true });
  t.eq('una barra del pincel que se quedó puesta también se quita',
       PV.M.perfilSoltarMarcar('qc').join(',') + '|' + PV.cuerpo.clases.has('drawmode'), 'pincel|false');
  const PO = conMarcas({ pincel: true, clase: false });
  t.eq('y un pincel encendido sin su barra, también',
       PO.M.perfilSoltarMarcar('qc').join(',') + '|' + PO.p2._draw.on, 'pincel|false');

  ['pause', 'unpause', 'accent'].forEach(modo => {
    const A = conMarcas({ modo: modo });
    const s = A.M.perfilSoltarMarcar('casting');
    t.eq('se desarma lo que estuviera armado: ' + modo, A.p2.markMode, null,
         'cada toque en una palabra seguiría dejando una marca');
    t.ok('pasando por donde se desarma siempre: ' + modo, A.diario.includes('desarma: null'));
    t.ok('y se apagan sus botones del cajón: ' + modo,
         ['tPause', 'tUnpause', 'tAccent'].every(id => !A.piezas[id].clases.has('on')),
         'al volver a Grabación saldrían encendidos sin estarlo');
    t.eq('y lo dice: ' + modo, s.join(','), 'marcas');
  });

  const ED = conMarcas({ editando: true });
  const sEd = ED.M.perfilSoltarMarcar('qc');
  t.eq('se sale del modo de editar del cajón', ED.p2.editMode, false,
       'tocar una caja la abriría para escribir');
  t.ok('por su propio botón, que guarda lo que hubiera abierto', ED.diario.includes('pulsa Editar del cajón'));
  t.eq('sin guardar dos veces', ED.diario.filter(x => /guarda/.test(x)).length, 0, JSON.stringify(ED.diario));
  t.eq('y lo dice', sEd.join(','), 'edicion');
  const EDS = conMarcas({ editando: true, sin: ['tEdit'] });
  EDS.M.perfilSoltarMarcar('qc');
  t.eq('sin ese botón se sale igual', EDS.p2.editMode, false);
  t.ok('y se guarda lo abierto', EDS.diario.includes('guarda la caja del cajón'));

  const CJ = conMarcas({ abiertas: [{ si: 2, texto: '  lo que se estaba escribiendo ' }, { si: 7, texto: 'otra' }] });
  const sCj = CJ.M.perfilSoltarMarcar('qc');
  t.ok('las cajas abiertas desde el engranaje se cierran',
       CJ.cajas.every(c => c.atrib.contenteditable === 'false'), JSON.stringify(CJ.cajas.map(c => c.atrib)));
  t.ok('y lo tecleado SE GUARDA', CJ.diario.includes('guarda 2: lo que se estaba escribiendo'),
       'cambiar de perfil no puede costarle a nadie lo que acaba de escribir — ' + JSON.stringify(CJ.diario));
  t.ok('en todas', CJ.diario.includes('guarda 7: otra'));
  t.ok('el botón del engranaje deja de decir «Guardar»',
       !CJ.piezas.gmEdit.clases.has('on') && CJ.piezas.gmEdit.innerHTML === '[lápiz] Editar',
       String(CJ.piezas.gmEdit.innerHTML));
  t.eq('y lo dice', sCj.join(','), 'cajas');
  const CS = conMarcas({ abiertas: [{ si: null, texto: 'sin caja' }] });
  CS.M.perfilSoltarMarcar('qc');
  t.ok('una caja que no dice cuál es se cierra', CS.cajas[0].atrib.contenteditable === 'false');
  t.eq('pero no se guarda a ciegas', CS.diario.filter(x => /^guarda/.test(x)).length, 0,
       'guardarla en el parlamento que no es sería peor que perderla');

  const TD = conMarcas({ pincel: true, clase: true, modo: 'accent', editando: true,
                         abiertas: [{ si: 4, texto: 'a medias' }] });
  t.eq('todo a la vez, se suelta todo', TD.M.perfilSoltarMarcar('qc').join(','), 'pincel,marcas,edicion,cajas');

  /* Un paso que falla no puede dejar los demas sin hacer. */
  const RT = conMarcas({ pincel: true, clase: true, modo: 'pause', editando: true, rompe: 'marcas',
                         abiertas: [{ si: 4, texto: 'a medias' }] });
  let rotoM = null, sRt = [];
  try{ sRt = RT.M.perfilSoltarMarcar('qc'); }catch(e){ rotoM = e.message; }
  t.eq('si un paso falla no revienta', rotoM, null);
  t.eq('los demás se hacen igual', sRt.join(','), 'pincel,edicion,cajas');
  t.ok('y el fallo se oye', RT.diario.some(x => /^fallo: las marcas/.test(x)), JSON.stringify(RT.diario));

  /* Y en Grabacion no se toca NADA: es quien marca. */
  const GB = conMarcas({ pincel: true, clase: true, modo: 'pause', editando: true,
                         abiertas: [{ si: 4, texto: 'a medias' }] });
  t.eq('al entrar en Grabación no se suelta nada', GB.M.perfilSoltarMarcar('grabacion').length, 0);
  t.eq('el pincel sigue puesto', GB.p2._draw.on && GB.cuerpo.clases.has('drawmode'), true);
  t.eq('la pausa, armada', GB.p2.markMode, 'pause');
  t.eq('el modo de editar, encendido', GB.p2.editMode, true);
  t.eq('la caja, abierta', GB.cajas[0].atrib.contenteditable, 'true');
  t.eq('y nada se ha tocado', GB.diario.length, 0, JSON.stringify(GB.diario));

  const NA = conMarcas();
  t.eq('sin nada encendido, en QC no se toca nada',
       NA.M.perfilSoltarMarcar('qc').length + NA.diario.length, 0, JSON.stringify(NA.diario));
  t.ok('ni se apagan botones que nadie encendió', NA.piezas.tPause.clases.has('on') && NA.piezas.gmEdit.clases.has('on'),
       'el diario vacío no basta: apagar una clase no deja rastro en él');
  const SL2 = conMarcas({ pincel: true, sinLibreto: true });
  let rotoS = null, sSl = null;
  try{ sSl = SL2.M.perfilSoltarMarcar('qc'); }catch(e){ rotoS = e.message; }
  t.eq('sin libreto abierto no revienta', rotoS, null);
  t.eq('y no suelta nada', (sSl || []).length, 0);
  t.eq('ni da un fallo que no lo es', SL2.diario.join(' | '), '',
       'al entrar, el perfil se elige ANTES de abrir ningún libreto: avisaría de cuatro fallos cada vez');

  t.ok('cambiar de perfil suelta lo de marcar', /try\{ perfilSoltarMarcar\(m\); \}/.test(TODO),
       'la función puede estar perfecta y no llamarla nadie');
  const cuerpoPoner = TODO.slice(TODO.indexOf('function ponerModo(epId, m){'),
                                 TODO.indexOf('function ponerModo(epId, m){') + 1800);
  t.ok('y lo hace ANTES de pintar la barra',
       cuerpoPoner.indexOf('perfilSoltarMarcar(m)') > 0
       && cuerpoPoner.indexOf('perfilSoltarMarcar(m)') < cuerpoPoner.indexOf('perfilPintar()'),
       'primero se apaga lo que hubiera encendido y luego se esconden sus botones');

  t.seccion('12n · «Cotejar» pasa a llamarse «Analizar cambios»');
  /* Pedido de sala. Se mira la barra de verdad, y que no quede ninguna puerta
     con el nombre viejo: dos nombres para lo mismo es preguntarse si son dos
     cosas. */
  const PH = montar([['const PERFIL_HERRAMIENTAS = {', '/** La pista que se enseña']], ['PERFIL_HERRAMIENTAS'], {});
  const bQc = PH.PERFIL_HERRAMIENTAS.qc.find(h => h.id === 'pQcCotejar');
  t.eq('en la barra de QC', bQc && bQc.et, '🔎 Analizar cambios');
  t.ok('en el cajón', />🔎 Analizar cambios<\/button>/.test(TODO) && /id="tQcCotejar"[^>]*>🔎 Analizar cambios</.test(TODO));
  t.eq('y ningún botón ni aviso con el nombre viejo',
       (TODO.match(/«Cotejar»|>🔎 Cotejar<|>🔎 Transcribir y comparar</g) || []).length, 0);
  /* Se vio mirando el panel de resultados: la clase de las pastillas del TIPO
     la lleva también el texto de cada fila, y sin acotar la regla cada texto
     salía como una pastilla, dos por renglón, y el «(nada)» de un oído vacío
     se partía letra a letra. */
  t.ok('las pastillas del tipo, solo dentro de su selector',
       /\.qc-tsel \.qc-t\{display:inline-flex/.test(TODO) && /\.qc-tsel \.qc-t i\{width:7px/.test(TODO),
       'la misma clase la lleva el texto de las listas');
  t.eq('y ninguna regla suelta que pinte pastillas en las listas',
       (TODO.match(/\n\.qc-t\{display:inline-flex|\n\.qc-t i\{/g) || []).length, 0);

  t.seccion('12o · al acabar el análisis se entrega el PDF, solo');
  /* Pedido de sala: «al finalizar me entregue tambien un PDF». */
  const conQc = (o) => {
    o = o || {};
    const avisos = [], diario = [];
    const M = montar([['/** Analizar cambios: oye el audio', '/* ═══ QC · LOS DIÁLOGOS QUE CAMBIARON']], ['qcCotejar'], {
      cotejarTodo: async () => { diario.push('analiza'); return ('r' in o) ? o.r : { hechos: 72, mal: 3, dudosos: 13, segundos: 50, fuera: o.fuera || 0 }; },
      studio: o.sinAudio ? {} : { dlgUrl: 'blob:x', dur: 290 },
      COTEJO: { trabajando: !!o.trabajando, parado: !!o.parado },
      qcAvance: (m) => avisos.push(m),
      karIa: { error: o.error || null },
      window: { _stUltimo: '' },
      qcTC: (s) => 'TC' + s, qcPrimerTc: () => 3600, qcInicioTexto: () => '01:00:00:00',
      qcInicioPanel: () => diario.push('panel del inicio'),
      qcCambiosLista: () => [],
      perfilPintar: () => {},
      qcCambiosPanel: () => diario.push('panel de cambios'),
      qcInformeCambios: async (op) => { diario.push('pdf'); diario.op = op; return o.pdf || { ok: true, causa: '' }; },
      cotejoTardo: (s) => s + ' s',
      fallo: () => {}, console: { warn: () => {}, log: () => {} }
    });
    return { M, avisos, diario };
  };
  {
    const Q = conQc();
    await Q.M.qcCotejar();
    t.eq('se analiza y se entrega el PDF, una vez', Q.diario.filter(x => x === 'pdf').length, 1);
    t.ok('callado: el aviso lo pone quien analizó', Q.diario.op && Q.diario.op.callado === true,
         'si no, el «informe descargado» taparía el resumen del análisis');
    t.ok('con lo que tardó, para ponerlo en el informe', Q.diario.op && Q.diario.op.analisis && Q.diario.op.analisis.segundos === 50);
    t.ok('el resultado se enseña también sin cambios', Q.diario.includes('panel de cambios'),
         '«todo coincide» también es un resultado: sin panel parecía que no había pasado nada');
    const fin = Q.avisos[Q.avisos.length - 1];
    t.ok('y la barra lo cuenta todo', /72 analizados en 50 s/.test(fin) && /informe PDF descargado/.test(fin), fin);
  }
  {
    const Q = conQc({ pdf: { ok: false, causa: 'sin papel' } });
    await Q.M.qcCotejar();
    const fin = Q.avisos[Q.avisos.length - 1];
    t.ok('si el PDF falla se dice, con la causa y dónde volver a pedirlo',
         /no se pudo crear: sin papel/.test(fin) && /«≠ Cambios»/.test(fin), fin);
  }
  {
    const Q = conQc({ fuera: 12 });
    await Q.M.qcCotejar();
    t.ok('los que caen fuera del audio se dicen', /12 fuera del audio/.test(Q.avisos[Q.avisos.length - 1]),
         'no se han comparado, y no es lo mismo que coincidir');
  }
  {
    const Q = conQc({ r: null, parado: true });
    await Q.M.qcCotejar();
    t.ok('parado no es un fallo, y no entrega nada', !Q.diario.includes('pdf') && /parado/i.test(Q.avisos[Q.avisos.length - 1]));
  }
  {
    const Q = conQc({ r: null, error: 'sin red' });
    await Q.M.qcCotejar();
    t.ok('si no se pudo analizar, se dice por qué y no hay PDF',
         !Q.diario.includes('pdf') && /No se pudo analizar: sin red/.test(Q.avisos[Q.avisos.length - 1]));
  }
  {
    const Q = conQc({ r: { hechos: 0, mal: 0, dudosos: 0, segundos: 3 } });
    await Q.M.qcCotejar();
    t.ok('si nada cayó en el audio, a corregir el inicio y sin PDF',
         Q.diario.includes('panel del inicio') && !Q.diario.includes('pdf'),
         'un informe de un audio que no es de este capítulo no se entrega');
  }
  {
    const Q = conQc({ sinAudio: true });
    await Q.M.qcCotejar();
    t.ok('sin audio no se empieza', !Q.diario.includes('analiza') && /Carga primero el audio/.test(Q.avisos[0]));
  }

  t.seccion('12p · el informe de cambios, también cuando no hay cambios');
  const conInforme = (o) => {
    o = o || {};
    const avisos = [], bajados = [];
    const M = montar([['/** Con qué audio se analizó', '/* ═══ GUION DE WORD EN TABLA']], ['qcInformeCambios', 'qcAudioNombre'], {
      qcCambiosLista: () => o.lista || [],
      window: { _cotejo: ('cotejo' in o) ? o.cotejo : { 0: { sim: 1 }, 1: { sim: 1 }, 2: { sim: 1 } } },
      currentEp: { name: '101', showId: 's' }, shows: [{ id: 's', name: 'The Wayans Bros' }],
      qcMeta: () => ({ revisor: 'Pamela H', estudio: 'Estudio Bogotá' }),
      qcTC: (s) => 'TC' + s, studioTc0: () => 3600,
      studio: o.studio || { dlgUrl: 'blob:x', dlgNombre: 'premix 101.mp3', name: 'video.mp4' },
      qcpdfDeCambios: (l, op) => ({ lista: l, op: op, nombreDoc: 'Cambios · x' }),
      qcpdfDescargar: async (d) => { if(o.falla) throw new Error('jsPDF no carga'); bajados.push(d); return true; },
      cotejoTardo: (s) => Math.round(s) + ' s',
      fallo: () => {},
      qcAvance: (m) => avisos.push(m),
      console: { warn: () => {}, log: () => {} }
    });
    return { M, avisos, bajados };
  };
  {
    const I = conInforme();
    const r = await I.M.qcInformeCambios({ callado: true, analisis: { segundos: 49.6 } });
    t.ok('sin cambios también se entrega', r.ok && I.bajados.length === 1,
         'ese PDF es la constancia de que el capítulo se analizó y cuadra');
    t.eq('diciendo cuántos se analizaron', I.bajados[0].op.analizados, 3);
    t.eq('y cuánto tardó', I.bajados[0].op.tardo, '50 s');
    t.eq('con el audio que se analizó, no el vídeo', I.bajados[0].op.audio, 'premix 101.mp3');
    t.eq('callado: sin ni un aviso', I.avisos.length, 0);
  }
  {
    const I = conInforme({ cotejo: {} });
    const r = await I.M.qcInformeCambios({});
    t.ok('lo que no se analizó no tiene informe', !r.ok && I.bajados.length === 0);
    t.ok('y se dice qué hacer', /«Analizar cambios»/.test(I.avisos[0] || ''), JSON.stringify(I.avisos));
  }
  {
    const I = conInforme({ falla: true });
    const r = await I.M.qcInformeCambios({ callado: true });
    t.ok('si el PDF no se puede hacer, se devuelve la causa', !r.ok && /jsPDF no carga/.test(r.causa));
  }
  {
    const I = conInforme({ studio: { name: 'capitulo.mp4' } });
    t.eq('sin premix cargado, el nombre del medio del estudio', I.M.qcAudioNombre(), 'capitulo.mp4');
  }
  t.ok('el premix recuerda su nombre al cargarse', /studio\.dlgNombre = String\(\(file && file\.name\) \|\| ''\);/.test(TODO),
       'sin esto el pie del informe decía el nombre del vídeo, o nada');

  t.seccion('12s · con qué oído: en la barra, en su panel, en el informe y en la nube');
  /* Pedido de sala: «la transcripción aún no es tan fiel, mejora cómo escucha». */
  {
    const lista = PH.PERFIL_HERRAMIENTAS.qc.map(h => h.id);
    t.eq('el oído, justo detrás de «Analizar cambios»', lista[lista.indexOf('pQcCotejar') + 1], 'pQcOido');
    t.ok('y abre su panel', /q\('pQcOido'\);\s*if\(b\) b\.onclick = \(\)=> qcOidoPanel\(\);/.test(TODO));
    t.ok('el botón dice qué oído está puesto', /h\.oido && oidoNombre \? \('<b class="lp-tc">'/.test(TODO));
    const I = conInforme();
    await I.M.qcInformeCambios({ callado: true });
    t.eq('sin saber con qué oído se oyó, el informe no se lo inventa', I.bajados[0] && I.bajados[0].op.oido, '');
    const I2 = (() => {
      const avisos = [], bajados = [];
      const M = montar([['/** Con qué audio se analizó', '/* ═══ GUION DE WORD EN TABLA']], ['qcInformeCambios'], {
        qcCambiosLista: () => [], window: { _cotejo: { 0: { sim: 1, o: 'fiel' } } },
        currentEp: { name: '101' }, shows: [], qcMeta: () => ({}), qcTC: (s) => 'TC' + s, studioTc0: () => 0,
        studio: {}, cotejoOidoUsado: () => 'fiel',
        qcpdfDeCambios: (l, op) => ({ op: op, nombreDoc: 'x' }),
        qcpdfDescargar: async (d) => { bajados.push(d); return true; },
        cotejoTardo: (s) => s + ' s', fallo: () => {}, qcAvance: (m) => avisos.push(m),
        console: { warn: () => {}, log: () => {} } });
      return { M, bajados };
    })();
    await I2.M.qcInformeCambios({ callado: true });
    t.eq('el informe lleva el oído', I2.bajados[0] && I2.bajados[0].op.oido, 'fiel');
  }
  {
    const V = montar([['/* ═══ QC · CON QUÉ OÍDO SE ANALIZA', '/** El panel para elegir el oído.']],
                     ['qcVozCargada', 'qcOidoTarda'],
                     { karIa: { pcm: new Float32Array(3), sr: 16000 },
                       anaPlan: (() => { const f = () => { f.veces++; return { voz: 1500 }; }; f.veces = 0; return f; })() });
    t.eq('lo que tarda, sin decimales: menos de un minuto', V.qcOidoTarda(42), 'menos de un minuto');
    t.eq('y en minutos redondos', V.qcOidoTarda(754), 'unos 13 min');
    t.eq('un minuto es un minuto', V.qcOidoTarda(61), 'un minuto');
    t.eq('y lo que no es tiempo, menos de uno', V.qcOidoTarda(NaN), 'menos de un minuto');
    t.eq('la voz del audio cargado', V.qcVozCargada(), 1500);
    t.eq('y se busca una sola vez por audio', V.qcVozCargada(), 1500);
    const V2 = montar([['/* ═══ QC · CON QUÉ OÍDO SE ANALIZA', '/** El panel para elegir el oído.']],
                      ['qcVozCargada'], { karIa: { pcm: null }, anaPlan: () => { throw new Error('no debería'); } });
    t.eq('sin audio, cero, y sin buscar nada', V2.qcVozCargada(), 0);
  }
  {
    let veces = 0;
    const karIa = { pcm: new Float32Array(3), sr: 16000 };
    const V = montar([['/* ═══ QC · CON QUÉ OÍDO SE ANALIZA', '/** El panel para elegir el oído.']],
                     ['qcVozCargada'], { karIa: karIa, anaPlan: () => { veces++; return { voz: 10 * veces }; } });
    V.qcVozCargada(); V.qcVozCargada();
    t.eq('buscar la voz, una vez', veces, 1, 'en un capítulo entero cuesta un momento, y el panel se repinta al elegir');
    karIa.pcm = new Float32Array(5);
    t.eq('y otra si cambia el audio', V.qcVozCargada(), 20);
  }
  {
    /* La carga desde la nube, con el código de verdad de `epDataAplicar`. */
    const ini = TODO.indexOf('  window._cotejo = {};\n  try{\n    const src = (d.cotejo');
    const fin = TODO.indexOf('  try{ qcCargar(d.qc)', ini);
    t.ok('la carga del análisis está donde se espera', ini > 0 && fin > ini);
    const cargar = new Function('window', 'd', 'ANA_OIDOS', TODO.slice(ini, fin));
    const w = {};
    cargar(w, { cotejo: { 3: { sim: 0.95, dif: 1, o: 'fiel', oido: 'x' }, 4: { sim: 1, o: 'sordo', dif: -2 },
                          5: { sim: 0.7 }, x: { sim: 1 } } }, { fiel: {}, rapido: {}, muyfiel: {} });
    t.eq('vuelve con su cuenta de palabras y su oído', JSON.stringify(w._cotejo[3]), '{"sim":0.95,"oido":"x","dif":1,"o":"fiel"}',
         'sin esto, al volver a abrir el capítulo el aviso de «una palabra distinta» desaparecía');
    t.eq('un oído que no existe, o una cuenta que no es cuenta, no se cargan', JSON.stringify(w._cotejo[4]), '{"sim":1,"oido":""}');
    t.eq('lo de antes, como antes', JSON.stringify(w._cotejo[5]), '{"sim":0.7,"oido":""}');
    t.ok('y lo que no es un parlamento, fuera', !('x' in w._cotejo));
  }

  t.seccion('12q · el audio se descodifica una vez, y ya a 16 kHz');
  /* Antes se descodificaba al cargarlo -para la onda- y OTRA VEZ al analizar,
     las dos a la frecuencia del equipo, 48 kHz en estéreo: un capítulo de 45
     minutos es más de un giga solo para tirarlo. */
  t.ok('se pide al navegador directamente a 16 kHz',
       /function karIaA16k\(ab\)\{\s*const off = new OfflineAudioContext\(1, 16000, 16000\);/.test(TODO));
  const cuerpoDlg = TODO.slice(TODO.indexOf('async function karAudioDialogos'), TODO.indexOf('function karLimpiar'));
  t.ok('al cargar el premix se descodifica con eso', /await karIaA16k\(await file\.arrayBuffer\(\)\)/.test(cuerpoDlg));
  t.ok('y de ahí sale ya el audio del reconocedor', /karIa\.pcm = karIaMono\(buf\);/.test(cuerpoDlg),
       'sin esto se volvía a descodificar entero al pulsar «Analizar cambios»');
  t.eq('una sola descodificación al cargar', (cuerpoDlg.match(/decodeAudioData|karIaA16k\(/g) || []).length, 1);

  t.seccion('12r · siguiendo a Pro Tools, la corrección va donde suena');
  /* Pedido de sala: seguimiento en QC por captura de pantalla. Y lo que da en
     QC: apuntar la corrección en el timecode que marca el contador AL PULSAR,
     no en el principio del parlamento, que puede estar diez segundos antes. */
  const conBorrador = (o) => montar([['/** Siguiendo a Pro Tools, el timecode que marca AHORA', '/** El tiempo, como lo escribe el resto de la casa.']],
    ['qcTcAhora', 'qcBorrador'], {
      tcpActivo: () => !!o.pt, tcpFuente: () => o.pt,
      studio: { cur: ('cur' in o) ? o.cur : 2 },
      libActiveSi: () => 0,
      script: [{ key: 'ANA', tcEff: 3600 }, { key: 'BETO', tcEff: 3610 }, { key: 'CARLA', tcEff: 3720 }],
      charIdx: { ANA: { display: 'ANA' }, BETO: { display: 'BETO' }, CARLA: { display: 'CARLA' } },
      QC_TIPO_POR_DEFECTO: 'ajuste', console: { warn: () => {}, log: () => {} } });
  const BP = conBorrador({ pt: 3725.44 }).qcBorrador();
  t.eq('con Pro Tools leyéndose, el timecode de AHORA', BP.tcSec, 3725.44,
       'el principio del parlamento puede estar diez segundos antes del fallo');
  t.eq('y el parlamento que SUENA, no el que se tocó', BP.si + ' ' + BP.quien, '2 CARLA');
  const BS = conBorrador({ pt: null }).qcBorrador();
  t.eq('sin seguir, lo de siempre: el parlamento seleccionado y su tiempo', BS.si + ' ' + BS.tcSec + ' ' + BS.quien, '0 3600 ANA');
  const BN = conBorrador({ pt: 3725.44, cur: -1 }).qcBorrador();
  t.eq('siguiendo pero sin parlamento sonando, el tiempo de ahora igual', BN.tcSec + ' ' + BN.si, '3725.44 0');
  /* El libreto se marca con adelanto (SEG_ADELANTO): en las últimas décimas de
     un parlamento el marcado ya es el siguiente. La corrección va al que SUENA. */
  const conSuena = (o) => montar([['function stCurBlock(t){', '/* ═══ EL LIBRETO SIGUE AL VÍDEO'],
                                   ['/** Siguiendo a Pro Tools, el timecode que marca AHORA', '/** El tiempo, como lo escribe el resto de la casa.']],
    ['qcBorrador'], {
      tcpActivo: () => true, tcpFuente: () => o.pt,
      studio: { cur: o.cur },
      libActiveSi: () => 0,
      script: [{ key: 'ANA', tcEff: 3600 }, { key: 'BETO', tcEff: 3610 }, { key: 'CARLA', tcEff: 3720 }],
      charIdx: { ANA: { display: 'ANA' }, BETO: { display: 'BETO' }, CARLA: { display: 'CARLA' } },
      QC_TIPO_POR_DEFECTO: 'ajuste', console: { warn: () => {}, log: () => {} } });
  const BA = conSuena({ pt: 3719.9, cur: 2 }).qcBorrador();
  t.eq('a una décima del siguiente, ya marcado, la corrección va al que todavía suena', BA.si + ' ' + BA.quien, '1 BETO');
  const BB = conSuena({ pt: 3599, cur: 0 }).qcBorrador();
  t.eq('antes del primero, el marcado', BB.si, 0);
  t.ok('el botón de coger el tiempo dice «ahora» cuando se sigue a Pro Tools',
       /\(qcTcAhora\(\) != null\s*\? '<button id="qcTcAqui" title="Coger el timecode que marca Pro Tools ahora mismo">ahora<\/button><\/div>'/.test(TODO));
  t.ok('y coger el tiempo no le quita al borrador el tipo elegido a mano',
       /tipo: b\.tipo \|\| b2\.tipo, tipoManual: !!b\.tipoManual \};/.test(TODO),
       'antes se perdía y volvía la sugerencia');
  t.ok('el parlamento que suena se recuadra también sin la tira de vídeo',
       /if\(node\)\{ try\{ studioInjectCurCss\(\); \}catch\(e\)\{[^}]*\} node\.classList\.add\('stcur'\); \}/.test(TODO),
       'el estilo solo se ponía al abrir la tira: en QC la clase se ponía y no se veía nada');
  t.ok('el botón Seguir pregunta por lo que enseña, no por el estado a secas',
       /if\(seguirEncendido\(\)\)\{ stSeguirPoner\(false\); return; \}/.test(TODO));
  t.ok('y entrar en QC no apaga la lectura de Pro Tools',
       !/function perfilSoltarVideo[\s\S]{0,900}?tcpParar\(\)/.test(TODO));

  t.seccion('13 · la sección QC está en el panel de herramientas');
  t.ok('con su título', />QC<\/div>/.test(TODO) || /class="tt">QC</.test(TODO));
  ['tQcAudio', 'tQcCotejar', 'tQcNueva', 'tQcLista'].forEach(id => {
    t.ok('el botón ' + id + ' existe', new RegExp('id="' + id + '"').test(TODO));
    t.ok('y hace algo', new RegExp("\\$t\\('" + id + "'\\)").test(TODO),
         'un botón sin enganchar es peor que no tenerlo');
  });
};
