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
       /function stMsg\(t\)\{[\s\S]{0,600}?qcAvance\(t\)/.test(TODO),
       'es el único sitio por el que pasan todas las fases; sin este espejo, '
       + 'desde QC no se ve nada de lo que ya se cuenta');
  t.ok('y el aviso se pinta ANTES de empezar, no al acabar',
       /qcAvance\('⏳ Empezando/.test(TODO),
       'el primer trozo puede tardar un minuto sin decir nada, y es justo donde '
       + 'parece que no hace nada');
  t.ok('pulsar otra vez lo PARA en vez de lanzar otro',
       /if\(typeof COTEJO !== 'undefined' && COTEJO && COTEJO\.trabajando\)\{ cotejarTodo\(\); return; \}/
         .test(TODO),
       'dos cotejos a la vez sobre el mismo capítulo se pisan');

  t.seccion('13 · la sección QC está en el panel de herramientas');
  t.ok('con su título', />QC<\/div>/.test(TODO) || /class="tt">QC</.test(TODO));
  ['tQcAudio', 'tQcCotejar', 'tQcNueva', 'tQcLista'].forEach(id => {
    t.ok('el botón ' + id + ' existe', new RegExp('id="' + id + '"').test(TODO));
    t.ok('y hace algo', new RegExp("\\$t\\('" + id + "'\\)").test(TODO),
         'un botón sin enganchar es peor que no tenerlo');
  });
};
