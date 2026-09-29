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
const { montar, fuentes } = require('./ayuda');

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

exports.pruebas = function(t){

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
  const cuerpoCotejo = TODO.slice(TODO.indexOf('async function cotejarTodo'),
                                  TODO.indexOf('async function cotejarTodo') + 2200);
  t.ok('existe el cotejo', cuerpoCotejo.length > 500);
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
  t.ok('el cotejo publica cuántos hay en total',
       /COTEJO\.total = lista\.length/.test(TODO),
       'sin el total no hay barra: solo «está pensando»');
  t.ok('y por dónde va', /COTEJO\.vistos = n \+ 1/.test(TODO));
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
       /karIa\.error : \(window\._stUltimo \|\| 'no se pudo cotejar'\)/.test(TODO));
  t.ok('stMsg guarda el último aviso para eso', /window\._stUltimo = String\(t\);/.test(TODO));
  t.ok('y si ningún parlamento cayó dentro del audio, se dice que es el desfase',
       /if\(!r\.hechos\)\{[\s\S]{0,200}?ninguno cayó dentro del audio/.test(TODO),
       'con que el mensaje exista no basta: tiene que gobernarlo la cuenta de cotejados. '
       + 'Se vio mutando la condición');

  t.seccion('12g · los diálogos que cambiaron');
  /* Lo que se entrega. Se monta con el `cotejoAviso` de VERDAD, el de los
     planos, para que los umbrales sean los mismos que en la hoja de cues. */
  const w = {};
  const C = montar([['function cotejoDatos(){', '/** Coteja el capítulo entero'],
                    ['/* ═══ QC · LOS DIÁLOGOS QUE CAMBIARON', '/** El panel con la lista']],
                   ['qcCambiosLista', 'qcCambiosCuenta'],
                   { window: w,
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

  t.ok('se pregunta justo después del dispositivo, y antes de los programas',
       /askRoleAtLogin\(\(\)=> perfilAlEntrar\(\(\)=> ensureWorkspace\(\)\)\);/.test(TODO));
  t.ok('al entrar hay que elegir: pulsar fuera no vale',
       /obligatorio: true/.test(TODO)
       && /if\(e\.target === cap && !tx\.obligatorio\) elegir\('grabacion'\)/.test(TODO),
       'un toque de más al entrar dejaba a quien venía a revisar en Grabación sin haberlo pedido');
  t.ok('ni Escape', /if\(e\.key !== 'Escape' \|\| tx\.obligatorio\) return;/.test(TODO));
  t.ok('lo elegido queda como perfil de la sesión', /window\._perfilSesion = m;/.test(TODO),
       'también cuando se cambia desde la barra del libreto: el siguiente capítulo lo hereda');
  t.ok('y al abrir un capítulo ya no se pregunta: se mira la sesión',
       /modoQueToca\(window\._perfilSesion, modoDe\(epId\)\)/.test(TODO));
  t.ok('pase lo que pase con el selector, se sigue a los programas',
       /\.catch\(\(e\)=>\{ fallo\('perfilAlEntrar · index\.html', e\); \}\)\s*\.then\(seguir\);/.test(TODO),
       'un fallo al pintar el selector no puede dejar a nadie en una pantalla vacía');

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
  ['lVid', 'lSeguir', 'btnModoEst'].forEach(id => {
    t.ok('en QC no se ve ' + id, !V.perfilVeLaHerramienta(id, 'qc'));
    t.ok('en Grabación sí se ve ' + id, V.perfilVeLaHerramienta(id, 'grabacion'));
    t.ok('y en Casting también ' + id, V.perfilVeLaHerramienta(id, 'casting'));
  });
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
  t.eq('y el de Seguir', Q.dentro.lSeguir.style.props.display, 'none !important');
  t.eq('y el Video Estudio de la pantalla del capítulo', Q.fuera.btnModoEst.style.props.display, 'none !important',
       'abre el mismo panel por otra puerta');
  t.ok('el timecode deja de prometer el vídeo', Q.tcs.every(x => !('title' in x.atrib)),
       JSON.stringify(Q.tcs.map(x => x.atrib)));
  Q.M.perfilAjustarVideo(Q.doc, 'grabacion');
  t.ok('al volver a Grabación, vuelven los tres',
       !('display' in Q.dentro.lVid.style.props) && !('display' in Q.dentro.lSeguir.style.props)
       && !('display' in Q.fuera.btnModoEst.style.props),
       JSON.stringify([Q.dentro.lVid.style.props, Q.dentro.lSeguir.style.props, Q.fuera.btnModoEst.style.props]));
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
  t.ok('se deja de leer Pro Tools', AB.diario.includes('para Pro Tools'));
  t.ok('y se suelta la pantalla compartida', AB.diario.includes('suelta la pantalla'),
       'sin botón a la vista, seguiría compartiéndose sin nada que lo apague');
  t.ok('y su panel, si estaba abierto', AB.diario.includes('cierra el panel de Pro Tools'));
  t.eq('y dice qué ha cerrado', cerrado.join(','), 'estudio,karaoke,protools');

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

  t.seccion('13 · la sección QC está en el panel de herramientas');
  t.ok('con su título', />QC<\/div>/.test(TODO) || /class="tt">QC</.test(TODO));
  ['tQcAudio', 'tQcCotejar', 'tQcNueva', 'tQcLista'].forEach(id => {
    t.ok('el botón ' + id + ' existe', new RegExp('id="' + id + '"').test(TODO));
    t.ok('y hace algo', new RegExp("\\$t\\('" + id + "'\\)").test(TODO),
         'un botón sin enganchar es peor que no tenerlo');
  });
};
